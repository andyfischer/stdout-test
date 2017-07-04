
import * as ChildProcess from 'child_process';
import * as Fs from 'fs';
import * as Path from 'path';

import {readFile, writeFile, fileExists, readDirRecursive} from './Util';
import {getDerivedConfigsForDir} from './ReadConfigs';
import {ArgReader} from './ArgReader';

require('source-map-support');

interface Options {
    command?: string
    targetDirectories: string[]
    acceptOutput?: boolean
    showOutput?: boolean
}

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

    const shellResult = await shell(fullCommand);

    if (shellResult.stderr) {
        console.log(`Command ${fullCommand} had stderr:\n${shellResult.stderr}`);
        return {result: 'failure'};
    }

    if (shellResult.error) {
        console.log(`Command ${fullCommand} had error:\n${shellResult.error}`);
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

function parseCommandLineArgs() : Options {
    const reader = new ArgReader();
    const options:Options = {
        targetDirectories: []
    };

    while (!reader.finished()) {
        const next = reader.consume();
        if (next === '--help') {
            console.log(`Usage: ${process.argv[0]} <options> <directories...>`);
            console.log('\nAvailable options:');
            console.log('  --accept   Accept the observed output and save it to disk');
            return;
        } else if (next === '--accept') {
            options.acceptOutput = true;
            options.showOutput = true;
        } else if (next === '--show') {
            options.showOutput = true;
        } else if (next === '--command') {
            options.command = reader.consume();
        } else {
            if (ArgReader.looksLikeOption(next)) {
                console.log("Unrecognized option: " +next);
                return;
            }
            options.targetDirectories.push(next);
        }
    }

    // Default to 'test' target directory.
    if (options.targetDirectories.length === 0) {
        options.targetDirectories = ['test'];
    }

    return options;
}

function commandLineStart() {
    const options = parseCommandLineArgs();

    run(options)
    .catch((err) => {
        process.exitCode = 1;
        console.log(err);
    });
}

exports.commandLineStart = commandLineStart;
