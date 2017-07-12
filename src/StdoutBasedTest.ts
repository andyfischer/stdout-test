
import * as ChildProcess from 'child_process';
import * as Fs from 'fs';
import * as Path from 'path';

import {readFile, writeFile, fileExists, readDirRecursive, indent} from './Util';
//import {getDerivedConfigsForDir} from './ReadConfigs';
import commandLineArgs from './CommandLineArgs';
import parseTestFile from './ParseTestFile';

try {
    require('source-map-support');
} catch (e) {
}

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
    const configs = commandLineArgs();
    
    const expectedOutputFilename = Path.join(testDir, 'expected.txt');
    const test = parseTestFile(await readFile(expectedOutputFilename));

    const originalCommand = configs.command || test.command;
    let actualCommand = originalCommand;

    // Template strings
    actualCommand = actualCommand.replace(/\{testDir\}/g, testDir);

    console.log(`Running: ${actualCommand}`);

    const shellResult = await shell(actualCommand);

    if (shellResult.stderr) {
        return {
            result: 'failure',
            testDir: testDir,
            details: `Command ${actualCommand} had stderr:\n${shellResult.stderr}`
        };
    }

    if (shellResult.error && !configs.expect_error) {

        const exitCode = shellResult.error.code;

        if (exitCode !== 0) {
            return {
                result: 'failure',
                testDir: testDir,
                details: `Command: ${actualCommand}\nExited with non-zero code: ${exitCode}`
            }
        }

        return {
            result: 'failure',
            testDir: testDir,
            details: `Command ${actualCommand} had error:\n${shellResult.error}`
        }
    }

    if (configs.expect_error && !shellResult.error) {
        return {
            result: 'failure',
            testDir: testDir,
            details: `Command ${actualCommand} didn't error, but 'expect_error' is on.`
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
        await writeFile(expectedOutputFilename, ' $ ' + originalCommand + '\n' + actualOutput);
        console.log(`Wrote output to: ${expectedOutputFilename}`);
        return {
            result: 'success',
            testDir: testDir
        };
    }

    for (const lineNumber in actualLines) {
        const actualLine = actualLines[lineNumber];
        const expectedLine = test.expectedLines[lineNumber];

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

    let anyFailed = false;

    for (const testResult of allResults) {
        if (testResult.result === 'success') {
            console.log('Test passed: '+ testResult.testDir);
        } else if (testResult.result === 'failure') {
            console.log('Test failed: '+ testResult.testDir);
            console.log(indent(testResult.details));
            anyFailed = true;
        }
    }

    if (anyFailed) {
        process.exitCode = -1;
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
