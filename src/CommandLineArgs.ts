
import ArgReader from './ArgReader';

export interface Options {
    command?: string
    targetDirectories: string[]
    acceptOutput?: boolean
    showOutput?: boolean
    expect_error?: boolean
    justPrintVersion?: boolean
}

let _parsed:Options|null = null;

export default function get() {
    if (_parsed) {
        return _parsed;
    }

    const reader = new ArgReader();
    const options:Options = {
        targetDirectories: []
    };

    while (!reader.finished()) {
        const next = reader.consume();
        if (next === '--help') {
            console.log(`Usage: ${process.argv[0]} <options> <directories...>`);
            console.log("\nAvailable options:");
            console.log("  --accept        Accept the observed output and save it to disk");
            console.log("  --show          Show the command's full output");
            console.log("  --expect-error  Expect the command to error (exit with non-zero code)");
            return;
        } else if (next === '--accept') {
            options.acceptOutput = true;
            options.showOutput = true;
        } else if (next === '-v' || next === '--version') {
            options.justPrintVersion = true;
        } else if (next === '--show') {
            options.showOutput = true;
        } else if (next === '--expect-error') {
            options.expect_error = true;
        } else if (next === '--command') {
            options.command = reader.consumeRemaining().join(' ');
        } else {
            if (ArgReader.looksLikeOption(next)) {
                console.log("Unrecognized option: " +next);
                return;
            }
            options.targetDirectories.push(next);
        }
    }

    // If no target directories are mentioned, default to 'test' as the target.
    if (options.targetDirectories.length === 0) {
        options.targetDirectories = ['test'];
    }

    _parsed = options;
    return _parsed;
}
