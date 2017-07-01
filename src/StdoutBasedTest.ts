
import {readFile, writeFile} from './Util';

import * as ChildProcess from 'child_process';
import * as Fs from 'fs';
import * as Path from 'path';

interface Options {
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


export function readDir(dirname) : Promise<string[]> {
    return new Promise((resolve, reject) => {
        Fs.readDir(dirname, (error, contents) => {
            if (error)
                reject(error);
            else
                resolve(contents);
        });
    });
}

export async function run(command, directory, options:Options) {

    const inputFilename = Path.join(directory, 'input.txt');
    const expectedOutputFilename = Path.join(directory, 'expected.txt');

    await readFile(inputFilename)

    const shellResult = await shell(command + ' ' + inputFilename);

    if (shellResult.stderr)
        throw new Error(`Command ${command} had stderr:\n${shellResult.stderr}`);
    if (shellResult.error)
        throw new Error(`Command ${command} had error:\n${shellResult.error}`);

    const actualOutput = shellResult.stdout;
    console.log("actual = ", actualOutput);

    if (options.acceptOutput) {
        await writeFile(expectedOutputFilename, actualOutput);
        return;
    }

    if (!options.acceptOutput) {
        const expectedOutput = await readFile(expectedOutputFilename);
        console.log("expected = ", expectedOutput);
    }
}

function commandLineStart() {
    let args = process.argv.slice(2);
    const options:Options = {};

    if (args[0] === '--accept') {
        options.acceptOutput = true;
        args = args.slice(2);
    }

    run(args[0], args[1], options)
    .catch((err) => {
        process.exitCode = 1;
        console.log(err);
    });
}

exports.commandLineStart = commandLineStart;
