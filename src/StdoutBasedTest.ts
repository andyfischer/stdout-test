
import * as Fs from 'fs';
import * as Path from 'path';

import {readFile, writeFile, fileExists, readDirRecursive,
        isDirectory, indent, shell, mkdirp} from './Util';
import {getDerivedConfigsForDir} from './ReadConfigs';
import commandLineArgs from './CommandLineArgs';
import parseTestFile, {ParsedTestFile} from './ParseTestFile';
import checkOutput from './CheckOutput';
import Test from './Test';
import backfixOutput from './libs/stdout-test-backfix/BackfixOutput';

import './libs/console-trace-helper/TracedConsole';

try {
    require('source-map-support').install();
} catch (e) { 
}

class UsageError {
    usageError: string

    constructor(message: string) {
        this.usageError = message;
    }
}

async function findTestsForDir(dir:string): Promise<string[]> {
    const tests = [];

    if (!await isDirectory(dir)) {
        return [];
    }

    for (const file of await readDirRecursive(dir)) {
        if (Path.basename(file) === 'expected.txt') {
            tests.push(Path.dirname(file));
        }
    }
    return tests;
}

async function loadExpectedFile(test:Test) : Promise<Test> {
    const args = commandLineArgs();

    const expectedOutput : string|null = await readFile(test.expectedTxtFilename).catch(() => null);
    if (!expectedOutput) {
        return test;
    }
    
    const parsed = parseTestFile(expectedOutput);
    test.expected = parsed;

    return test;
}

async function loadCommand(test: Test) : Promise<Test> {
    const args = commandLineArgs();

    test.originalCommand = args.command || (test.expected && test.expected.command);

    if (!test.originalCommand && args.accept) {
        // When --accept is used and no --command is given, try to find the command
        // in the configs.
        const configs = await getDerivedConfigsForDir(test.testDir);

        if (!configs.default_command) {
            throw new UsageError("Missing command. Use the --command flag to set one, or add "
                            +"'default_command' to a stdout-test.toml config file.");
        }
        test.originalCommand = configs.default_command;
    }

    test.command = test.originalCommand;

    if (test.command) {
        // Template strings
        test.command = test.command.replace(/\{testDir\}/g, test.testDir);
    }

    return test;
}

async function runTestCommand(test: Test) : Promise<Test> {

    const command = test.command;
    const args = commandLineArgs();
    const enableTraces = args.backfix;

    if (!command) {
        test.result = {
            success: false,
            message: `Missing command (use --command flag to set one)`
        };
        return test;
    }

    console.log(`Running: ${command}`);

    const options:any = { };

    if (enableTraces) {
        options.env = {};
        for (const k in process.env) {
            options.env[k] = process.env[k];
        }
        options.env.TRACE_STDOUT = 1;
    }

    const shellResult = await shell(command, options);

    const actualOutput = shellResult.stdout;
    test.actualLines = actualOutput.split('\n');

    if (enableTraces) {
        test.actualTraceLines = test.actualLines.map(line => {
            try {
                return JSON.parse(line)
            } catch (e) {
                return {text: line};
            }
        });
        test.actualLines = test.actualTraceLines.map(line => line.text);
    }

    if (shellResult.stderr) {
        test.actualStderrLines = shellResult.stderr.split('\n');
    }

    if (shellResult.error) {
        test.actualExitCode = shellResult.error.code;
    } else {
        test.actualExitCode = 0;
    }

    return test;
}

function testBackToExpectedString(test:Test) {
    let out = ' $ ' + test.originalCommand + '\n' + test.actualLines.join('\n');
    if (test.actualExitCode !== 0) {
        out += ' # exit code: ' + test.actualExitCode + '\n';
    }
    return out;
}

async function acceptOutput(test:Test) : Promise<void> {
    await mkdirp(test.testDir);
    await writeFile(test.expectedTxtFilename, testBackToExpectedString(test));
    console.log(`Saved output to: ${test.expectedTxtFilename}`);
}

async function runOneTest(test:Test) : Promise<Test> {
    const args = commandLineArgs();

    await loadExpectedFile(test);
    await loadCommand(test);
    await runTestCommand(test);

    if (args.showOutput) {
        console.log("Output:");
        for (const line of test.actualLines)
            console.log('  ' + line);
    }

    if (args.accept) {
        await acceptOutput(test);
        return test;
    }

    checkOutput(test);

    if (args.backfix && !test.result.success) {

        console.log('Test failed: '+ test.testDir);
        console.log(indent(test.result.message));
        console.log('Attempting to backfix: '+ test.testDir);

        const backfix = await backfixOutput({
            actualLine: test.result.actualLine,
            desiredLine: test.result.expectedLine,
            stack: test.actualTraceLines[test.result.lineNumber].stack
        });

        if (backfix.result.success) {
            test.result.success = true;
        } else {
            console.log("Backfix failed for: "+test.testDir);
        }
    }

    return test;
}

function reportTestResults(tests : Test[]) {

    let anyFailed = false;

    for (const test of tests) {
        if (!test.result) {
            console.log("internal error: test has no result: ", test);
            throw new Error("internal error: test has no result: ");
        }

        if (test.result.success) {
            console.log('Test passed: '+ test.testDir);
        } else {
            console.log('Test failed: '+ test.testDir);
            console.log(indent(test.result.message));
            anyFailed = true;
        }
    }

    if (anyFailed) {
        process.exitCode = -1;
    }
}

export async function run() {

    const args = commandLineArgs();

    if (args === null) {
        return;
    }

    let allTestDirs = [];

    for (const targetDir of args.targetDirectories) {
        const tests = await findTestsForDir(targetDir);

        if (tests.length === 0) {
            if (args.accept) {
                // Allow a directory that contains no tests. We'll write expected.txt here.
                allTestDirs.push(targetDir);
            } else {
                throw new Error("No tests found in directory: " + targetDir);
            }
        }

        allTestDirs = allTestDirs.concat(tests);
    }

    const tests:Test[] = await Promise.all(
        allTestDirs.map((dir) => {

            // Normalize directory.. no trailing slash.
            if (dir[dir.length - 1] === '/')
                dir = dir.substr(0, dir.length - 1);

            const test : Test = {
                testDir: dir,
                expectedTxtFilename: Path.join(dir, 'expected.txt'),
                expected: null,
                originalCommand: null,
                command: null,
                result: null,
                actualLines: [],
                actualStderrLines: [],
                actualExitCode: null
            };
            
            return runOneTest(test);
        })
    );

    if (!args.accept) {
        reportTestResults(tests);
    }
}

function commandLineStart() {
    run()
    .catch((err) => {
        process.exitCode = 1;
        if (err.usageError) {
            console.log(err.usageError);
        } else {
            console.log(err);
        }
    });
}

exports.commandLineStart = commandLineStart;
