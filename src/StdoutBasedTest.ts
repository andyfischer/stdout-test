
import * as ChildProcess from 'child_process';
import * as Fs from 'fs';
import * as Path from 'path';

import {readFile, writeFile, fileExists, readDirRecursive} from './Util';
import {getDerivedConfigsForDir} from './ReadConfigs';
import commandLineArgs from './CommandLineArgs';
import {Options} from './Options';

require('source-map-support');

interface TestSuccess {
    result: 'success'
}

interface TestFailure {
    result: 'failure'
}

export function shell(cmd:string, options:any = {})
        : Promise<{error:any, stdout:string, stderr:string}>
{
    return new Promise((resolve, reject) => {
        ChildProcess.exec(cmd, options, (error, stdout, stderr) => {
            resolve({
                error: error,
                stdout: stdout,
                stderr: stderr
            });
        });
    });
}

async function findTestsForTarget(target:string) {
    const tests = [];
    for (const file of await readDirRecursive(target)) {
        if (Path.basename(file) === 'expected.txt') {
            tests.push(Path.dirname(file));
        }
    }
    return tests;
}

async function runOneTest(testDir:string, options:Options) : Promise<TestSuccess | TestFailure> {
    const configs = await getDerivedConfigsForDir(testDir);
    if (configs.command) {
        options.command = configs.command;
    }
    
    let fullCommand = options.command;
    const inputFilename = Path.join(testDir, 'input.txt');

    // Use input file, if it exists.
    if (await fileExists(inputFilename)) {
        fullCommand += ' ' + inputFilename;
    }

    // Template strings
    fullCommand = fullCommand.replace(/\{testDir\}/g, testDir);

    const expectedOutputFilename = Path.join(testDir, 'expected.txt');

    console.log(`Running: ${fullCommand}`);

    console.log("Options: ", options);

    const shellResult = await shell(fullCommand);

    if (shellResult.stderr) {
        console.log(`Command ${fullCommand} had stderr:\n${shellResult.stderr}`);
        return {result: 'failure'};
    }

    if (shellResult.error && !options.expect_error) {
        console.log(`Command ${fullCommand} had error:\n${shellResult.error}`);
        return {result: 'failure'};
    }

    if (options.expect_error && !shellResult.error) {
        console.log(`Command ${fullCommand} didn't throw an error, but 'expect_error' is on`);
        return {result: 'failure'};
    }

    const actualOutput = shellResult.stdout;
    const actualLines = actualOutput.split('\n');

    if (options.showOutput) {
        console.log("Output:");
        for (const line of actualLines)
            console.log('  ' + line);
    }

    if (options.acceptOutput) {
        await writeFile(expectedOutputFilename, actualOutput);
        console.log(`Wrote output to: ${expectedOutputFilename}`);
        return {result: 'success'};
    }

    const expectedOutput = await readFile(expectedOutputFilename);
    const expectedLines = expectedOutput.split('\n');

    for (const lineNumber in actualLines) {
        const actualLine = actualLines[lineNumber];
        const expectedLine = expectedLines[lineNumber];

        if (actualLine !== expectedLine) {
            console.log(`Line ${lineNumber} didn't match expected output:\n`
                +`Expected: ${expectedLine}\n`
                +`Actual:   ${actualLine}`);

            return {result: 'failure'};
        }
    }

    console.log(`Test passed: ${testDir}`);
    return {result: 'success'};
}

export async function run(options:Options) {

    let allTests = [];

    for (const target of options.targetDirectories) {
        const targetTests = await findTestsForTarget(target);
        allTests = allTests.concat(targetTests);
    }

    Promise.all(allTests.map((dir) => runOneTest(dir, options)));
}

function commandLineStart() {
    const options = commandLineArgs();

    run(options)
    .catch((err) => {
        process.exitCode = 1;
        console.log(err);
    });
}

exports.commandLineStart = commandLineStart;
