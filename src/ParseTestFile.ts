
export interface ParsedTestFile {
    command: string | null
    lines: string[]
    exitCode: number
}

export default function parseTestFile(expectedOutput : string|null) : ParsedTestFile {

    const parsed:ParsedTestFile = {
        command: null,
        lines: [],
        exitCode: 0
    };

    if (!expectedOutput) {
        return parsed;
    }

    for (const line of expectedOutput.split('\n')) {
        if (line[0] === ' ' && (line[1] === '$' || line[1] === '#')) {

            const commandMatch = / \$ (.*)/.exec(line);
            if (commandMatch) {
                parsed.command = commandMatch[1];
                continue;
            }

            const exitCodeMatch = / # exit code: (.*)/.exec(line);
            if (exitCodeMatch) {
                parsed.exitCode = parseInt(exitCodeMatch[1]);
                continue;
            }
        }

        parsed.lines.push(line);
    }

    return parsed;
}
