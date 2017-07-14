import * as Path from 'path';
import * as ChildProcess from 'child_process';
import * as Fs from 'fs';

export function readFile(filename:string) : Promise<string> {
    return new Promise((resolve, reject) => {
        Fs.readFile(filename, (error, contents) => {
            if (error)
                reject(error);
            else
                resolve(contents.toString());
        });
    });
}

export function stat(filename:string) : Promise<any> {
    return new Promise((resolve, reject) => {
        Fs.stat(filename, (error, stats) => {
            if (error)
                reject(error);
            else
                resolve(stats);
        });
    });
}

export function readDir(filename:string) : Promise<string[]> {
    return new Promise((resolve, reject) => {
        Fs.readdir(filename, (error, files) => {
            if (error)
                reject(error);
            else {
                resolve(files);
            }
        });
    });
}

export function isDirectory(filename:string) : Promise<boolean> {
    return stat(filename)
    .then((stat) => stat.isDirectory())
    .catch(() => false);
}

export async function readDirRecursive(filename:string) : Promise<string[]> {

    let nextSearch = [filename];
    const found = [];

    while (nextSearch.length > 0) {
        const thisSearch = nextSearch;
        nextSearch = [];

        for (const dir of thisSearch) {
            const dirContents = await readDir(dir);
            for (const file of dirContents) {
                const fullFilename = Path.join(dir, file);
                found.push(fullFilename);
                if (await isDirectory(fullFilename)) {
                    nextSearch.push(fullFilename);
                }
            }
        }
    }

    return found;
}

export async function readTomlFile(filename:string) : Promise<any> {
    const contents = await readFile(filename);
    return require('toml').parse(contents);
}

export function writeFile(filename:string, contents:string) : Promise<void> {
    return new Promise((resolve, reject) => {
        Fs.writeFile(filename, contents, (error, contents) => {
            if (error)
                reject(error);
            else
                resolve();
        });
    }) as any as Promise<void>;
}

export function fileExists(filename:string) : Promise<boolean> {
    return new Promise((resolve, reject) => {
        Fs.exists(filename, (exists) => {
            resolve(exists);
        });
    });
}

export function indent(str:string, indent:string = '  ') {
    return indent + str.replace(/\n/g, '\n' + indent);
}

function mkdir(path:string) : Promise<void> {
    return new Promise((resolve, reject) => {
        Fs.mkdir(path, (error) => {
            if (error)
                reject(error);
            else
                resolve();
        });
    });
}

export async function mkdirp(path:string) {
    if (await fileExists(path))
        return;

    await mkdirp(Path.dirname(path));
    await mkdir(path);
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

