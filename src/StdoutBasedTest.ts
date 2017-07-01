
import {readFile, writeFile, readTomlFile} from './Util';

import * as ChildProcess from 'child_process';
import * as Fs from 'fs';
import * as Path from 'path';

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

    const inputFilename = Path.join(options.testDir, 'input.txt');
    const expectedOutputFilename = Path.join(options.testDir, 'expected.txt');

    await readFile(inputFilename)

    const shellResult = await shell(options.command + ' ' + inputFilename);

    if (shellResult.stderr)
        throw new Error(`Command ${options.command} had stderr:\n${shellResult.stderr}`);

    if (shellResult.error)
        throw new Error(`Command ${options.command} had error:\n${shellResult.error}`);

    const actualOutput = shellResult.stdout;
    console.log(actualOutput);

    if (options.acceptOutput) {
        await writeFile(expectedOutputFilename, actualOutput);
        console.log(`Wrote output to: ${expectedOutputFilename}`);
        return;
    }

    const expectedOutput = await readFile(expectedOutputFilename);
    const actualLines = actualOutput.split('\n');
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

    if (!options.command) {
        throw new Error("Missing 'command'");
    }

    run(options)
    .catch((err) => {
        process.exitCode = 1;
        console.log(err);
    });
}

exports.commandLineStart = commandLineStart;
