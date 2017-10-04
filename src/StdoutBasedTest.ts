
import * as Fs from 'fs-extra';
import * as Path from 'path';

import {readFile, writeFile, readDirRecursive, indent, shell} from './Util';
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

async function isDirectory(file:string) {
    try {
        return (await Fs.stat(file)).isDirectory();
    } catch (err) {
        return false;
    }
}

async function isFile(file:string) {
    try {
        return (await Fs.stat(file)).isFile();
    } catch (err) {
        return false;
    }
}

function isValidTestFilename(filename:string) {
    return filename.endsWith('.test') || Path.basename(filename) === 'test';
}

async function findTestsForDir(dir:string): Promise<string[]> {
    const tests = [];

    if (!await isDirectory(dir)) {
        return [];
    }

    for (const file of await readDirRecursive(dir)) {
        if (isFile(file) && isValidTestFilename(file))
            tests.push(file);
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
        const configs = await getDerivedConfigsForDir(test.expectedTxtFilename);

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
    await Fs.ensureDir(test.testDir);
    await writeFile(test.expectedTxtFilename, testBackToExpectedString(test));
    console.log(`Saved output to: ${test.expectedTxtFilename}`);
}

async function runOneTestFile(filename:string) : Promise<Test> {
    const test : Test = {
        expectedTxtFilename: filename,
        testDir: Path.dirname(filename),
        expected: null,
        originalCommand: null,
        command: null,
        result: null,
        actualLines: [],
        actualStderrLines: [],
        actualExitCode: null
    };

    const args = commandLineArgs();

    await loadExpectedFile(test);
    await loadCommand(test);
    await runTestCommand(test);

    if (args.showOutput) {
        console.log("Output:");
        for (const line of test.actualLines)
            console.log('  ' + line);
    }

    if (args.accept || args.capture) {
        await acceptOutput(test);
        return test;
    }

    checkOutput(test);

    if (args.backfix && !test.result.success) {

        console.log('Test failed: '+ test.expectedTxtFilename);
        console.log(indent(test.result.message));
        console.log('Attempting to backfix: '+ test.expectedTxtFilename);

        const backfix = await backfixOutput({
            actualLine: test.result.actualLine,
            desiredLine: test.result.expectedLine,
            stack: test.actualTraceLines[test.result.lineNumber].stack
        });

        if (backfix.result.success) {
            test.result.success = true;
        } else {
            console.log("Backfix failed for: "+test.expectedTxtFilename);
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
            console.log('Test passed: '+ test.expectedTxtFilename);
        } else {
            console.log('Test failed: '+ test.expectedTxtFilename);
            console.log(indent(test.result.message));
            anyFailed = true;
        }
    }

    if (anyFailed) {
        process.exitCode = -1;
    }
}

export async function capture() {
    const args = commandLineArgs();

    if (args.files.length !== 1) {
        throw new UsageError("Expected a single filename argument, when using --capture flag");
    }

    await runOneTestFile(args.files[0]);
}

export async function run() {

    const args = commandLineArgs();

    if (args.help) {
        console.log(await readFile(__dirname + '/../help/main.txt'));
        return;
    }

    if (args === null) {
        return;
    }

    if (args.capture) {
        await capture();
        return;
    }

    let allTestFiles = [];

    for (const file of args.files) {
        if (!await Fs.exists(file)) {
            if (await Fs.exists(file + '.test')) {
                allTestFiles.push(file + '.test');
                continue;
            }

            if (args.accept) {
                // It's okay that this file doesn't exist, we'll create it.
                if (isValidTestFilename(file))
                    allTestFiles.push(file);
                else
                    allTestFiles.push(file + '.test');

                continue;
            }

            throw new UsageError("File not found: "+file);
        }

        if (await isDirectory(file)) {
            allTestFiles = allTestFiles.concat(await findTestsForDir(file));
            continue;
        }

        allTestFiles.push(file);
    }

    const tests:Test[] = await Promise.all(
        allTestFiles.map(runOneTestFile)
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
