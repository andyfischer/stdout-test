
import ArgReader from './ArgReader';

export interface Options {
    files: string[]
    help?: boolean
    command?: string
    accept?: boolean
    capture?: boolean
    showOutput?: boolean
    expectError?: boolean
    alreadyDone?: boolean
    backfix?: boolean
}

let _parsed:Options|null = null;

export default function get() : Options|null {
    if (_parsed) {
        return _parsed;
    }

    const reader = new ArgReader();
    const options:Options = {
        files: []
    };

    while (!reader.finished()) {
        const next = reader.consume();
        if (next === '--help') {
            options.help = true;

        } else if (next === '--accept' || next === '-a') {
            options.accept = true;
            options.showOutput = true;

        } else if (next === '--capture') {
            options.capture = true;
            options.showOutput = true;
            
        } else if (next === '-v' || next === '--version') {
            console.log(require('../package.json').version);
            return null;

        } else if (next === '--backfix') {
            options.backfix = true;
        } else if (next === '--show') {
            options.showOutput = true;
        } else if (next === '--expect-error') {
            options.expectError = true;
        } else if (next === '--command' || next === '--') {
            options.command = reader.consumeRemaining().join(' ');
        } else {
            if (ArgReader.looksLikeOption(next)) {
                console.log("Unrecognized option: " +next);
                return;
            }
            options.files.push(next);
        }
    }

    // If no files are mentioned, default to 'test' directory.
    if (options.files.length === 0) {
        options.files = ['test'];
    }

    _parsed = options;
    return _parsed;
}
