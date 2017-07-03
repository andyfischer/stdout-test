declare function require(arg:string): any;
declare const module: any;
declare const process: any;

const Fs = require('fs');

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
        Fs.readDir(filename, (error, contents) => {
            if (error)
                reject(error);
            else
                resolve(contents.toString());
        });
    });
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
    });
}

export function fileExists(filename:string) : Promise<boolean> {

    return new Promise((resolve, reject) => {
        Fs.exists(filename, (error, exists) => {
            if (error)
                resolve(false);
            else
                resolve(exists);
        });
    });
}
