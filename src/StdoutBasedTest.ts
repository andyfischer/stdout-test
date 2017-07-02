
import * as ChildProcess from 'child_process';
import * as Fs from 'fs';
import * as Path from 'path';

import {readFile, writeFile} from './Util';
import {getDerivedConfigsForDir} from './ReadConfigs';

require('source-map-support');

interface Options {
    command: string
    testDir: string
    acceptOutput?: boolean
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

export async function run(options:Options) {

    const configs = await getDerivedConfigsForDir(options.testDir);
    if (configs.command) {
        options.command = configs.command;
    }

    const inputFilename = Path.join(options.testDir, 'input.txt');
    const expectedOutputFilename = Path.join(options.testDir, 'expected.txt');

    const fullCommand = options.command + ' ' + inputFilename;
    console.log(`Running: ${fullCommand}`);

    const shellResult = await shell(fullCommand);

    if (shellResult.stderr)
        throw new Error(`Command ${fullCommand} had stderr:\n${shellResult.stderr}`);

    if (shellResult.error)
        throw new Error(`Command ${fullCommand} had error:\n${shellResult.error}`);

    const actualOutput = shellResult.stdout;
    const actualLines = actualOutput.split('\n');

    console.log("Output:");
    for (const line of actualLines)
        console.log(line);

    if (options.acceptOutput) {
        await writeFile(expectedOutputFilename, actualOutput);
        console.log(`Wrote output to: ${expectedOutputFilename}`);
        return;
    }

    const expectedOutput = await readFile(expectedOutputFilename);
    const expectedLines = expectedOutput.split('\n');

    for (const lineNumber in actualLines) {
        const actualLine = actualLines[lineNumber];
        const expectedLine = expectedLines[lineNumber];

        if (actualLine !== expectedLine) {
            return Promise.reject(`Line ${lineNumber} didn't match expected output:\n`
                +`Expected: ${expectedLine}\n`
                +`Actual:   ${actualLine}`);
        }
    }

    console.log("Test passed");
}

function commandLineStart() {
    const args = require('yargs')
        .usage('$0 <cmd> [args]')
        .option('command')
        .option('accept', {
            boolean: true
        })
        .help()
        .argv;

    const options:Options = {
        command: args['command'],
        acceptOutput: args['accept'],
        testDir: args._[0]
    };

    run(options)
    .catch((err) => {
        process.exitCode = 1;
        console.log(err);
    });
}

exports.commandLineStart = commandLineStart;
