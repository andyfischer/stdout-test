
import * as Fs from 'fs';
import * as Path from 'path';

import {readFile, writeFile, fileExists, readDirRecursive, indent, shell, mkdirp} from './Util';
//import {getDerivedConfigsForDir} from './ReadConfigs';
import commandLineArgs from './CommandLineArgs';
import parseTestFile from './ParseTestFile';

try {
    require('source-map-support');
} catch (e) { }

type TestResult = TestSuccess | TestFailure;

interface TestAccept {
    result: 'accept'
    testDir: string
}

interface TestSuccess {
    result: 'success'
    testDir: string
}

interface TestFailure {
    result: 'failure'
    testDir: string
    details: string
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

    const expectedOutput : string|null = await readFile(expectedOutputFilename).catch(() => null);
    const test = parseTestFile(expectedOutput);

    const originalCommand = configs.command || test.command;
    let actualCommand = originalCommand;

    if (!actualCommand) {
        return {
            result: 'failure',
            testDir: testDir,
            details: `Missing command (use --command flag to set one)`
        };
    }

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
        await mkdirp(testDir);
        await writeFile(expectedOutputFilename, ' $ ' + originalCommand + '\n' + actualOutput);
        console.log(`Saved output to: ${expectedOutputFilename}`);
        return {
            result: 'accept',
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

function reportTestResults(results : TestResult[]) {

    let anyFailed = false;

    for (const testResult of results) {
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

export async function run() {

    const configs = commandLineArgs();

    let allTests = [];

    /*
    for (const target of configs.targetDirectories) {
        const targetTests = await findTestsForTarget(target);
        allTests = allTests.concat(targetTests);
    }
    */

    const results:TestResult[] = await Promise.all(
        configs.targetDirectories.map((dir) => runOneTest(dir))
    );

    reportTestResults(results);
}

function commandLineStart() {
    run()
    .catch((err) => {
        process.exitCode = 1;
        console.log(err);
    });
}

exports.commandLineStart = commandLineStart;
