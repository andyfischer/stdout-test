
export interface ParsedTestFile {
    command: string | null
    expectedLines: string[]
}

export default function parseTestFile(expectedOutput : string|null) : ParsedTestFile {

    if (!expectedOutput) {
        return {
            command: null,
            expectedLines: []
        }
    }

    const expectedLines = expectedOutput.split('\n');

    const parsed:ParsedTestFile = {
        command: null,
        expectedLines: expectedLines
    };

    if (expectedLines[0][0] === ' '
            && expectedLines[0][1] === '$'
            && expectedLines[0][2] === ' ') {

        parsed.command = expectedLines[0].slice(3);
        parsed.expectedLines = expectedLines.slice(1);
    }

    return parsed;
}
