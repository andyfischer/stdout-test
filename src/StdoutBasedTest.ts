
import * as ChildProcess from 'child_process';
import * as Fs from 'fs';
import * as Path from 'path';

import {readFile, writeFile, fileExists, readDirRecursive, indent} from './Util';
import {getDerivedConfigsForDir} from './ReadConfigs';
import commandLineArgs from './CommandLineArgs';
import {Configs} from './Configs';

require('source-map-support');

type TestResult = TestSuccess | TestFailure;

interface TestSuccess {
    result: 'success'
    testDir: string
}

interface TestFailure {
    result: 'failure'
    testDir: string
    details: string
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

async function runOneTest(testDir:string) : Promise<TestResult> {
    const configs = await getDerivedConfigsForDir(testDir);
    
    let fullCommand = configs.command;
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
        return {
            result: 'failure',
            testDir: testDir,
            details: `Command ${fullCommand} had stderr:\n${shellResult.stderr}`
        };
    }

    if (shellResult.error && !configs.expect_error) {
        return {
            result: 'failure',
            testDir: testDir,
            details: `Command ${fullCommand} had error:\n${shellResult.error}`
        }
    }

    if (configs.expect_error && !shellResult.error) {
        return {
            result: 'failure',
            testDir: testDir,
            details: `Command ${fullCommand} didn't throw an error, but 'expect_error' is on`
        }
    }

    const actualOutput = shellResult.stdout;
    const actualLines = actualOutput.split('\n');

    if (configs.showOutput) {
        console.log("Output:");
        for (const line of actualLines)
            console.log('  ' + line);
    }

    if (configs.acceptOutput) {
        await writeFile(expectedOutputFilename, actualOutput);
        console.log(`Wrote output to: ${expectedOutputFilename}`);
        return {
            result: 'success',
            testDir: testDir
        };
    }

    const expectedOutput = await readFile(expectedOutputFilename);
    const expectedLines = expectedOutput.split('\n');

    for (const lineNumber in actualLines) {
        const actualLine = actualLines[lineNumber];
        const expectedLine = expectedLines[lineNumber];

        if (actualLine !== expectedLine) {
            return {
                result: 'failure',
                testDir: testDir,
                details: `Line ${lineNumber} didn't match expected output:\n`
                    +`Expected: ${expectedLine}\n`
                    +`Actual:   ${actualLine}`
            }
        }
    }

    return {
        result: 'success',
        testDir: testDir
    };
}

export async function run() {

    const configs = commandLineArgs();

    let allTests = [];

    for (const target of configs.targetDirectories) {
        const targetTests = await findTestsForTarget(target);
        allTests = allTests.concat(targetTests);
    }

    const allResults:TestResult[] = await Promise.all(
        allTests.map((dir) =>
            runOneTest(dir)));

    for (const testResult of allResults) {
        if (testResult.result === 'success') {
            console.log('Test passed: '+ testResult.testDir);
        } else if (testResult.result === 'failure') {
            console.log('Test failed: '+ testResult.testDir);
            console.log(indent(testResult.details));
        }
    }
}

function commandLineStart() {
    run()
    .catch((err) => {
        process.exitCode = 1;
        console.log(err);
    });
}

exports.commandLineStart = commandLineStart;
