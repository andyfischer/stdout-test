#! /usr/bin/env node

const args = process.argv.slice(2);
console.log("Command line args =", args);

if (args[0] === '--error-exit-code') {
    process.exitCode = -1;
}

console.log("Done");
