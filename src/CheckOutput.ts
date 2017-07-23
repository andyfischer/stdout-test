
import {ParsedTestFile} from './ParseTestFile';
import Test from './Test';

export default function checkExpectedOutput(test:Test) : Test {
    const actualLines = test.actualLines;
    const expectedLines = test.expected.lines;

    const maxLineNumber = Math.max(actualLines.length, expectedLines.length);

    for (let lineNumber = 0; lineNumber < maxLineNumber; lineNumber++) {
        let actualLine = actualLines[lineNumber];
        let expectedLine = expectedLines[lineNumber];

        if (actualLine !== expectedLine) {
            test.result = {
                result: 'failure',
                details: `Line ${lineNumber} didn't match expected output:\n`
                    +`Expected: ${expectedLine}\n`
                    +`Actual:   ${actualLine}`
            }
            return;
        }
    }

    if (test.actualExitCode !== test.expected.exitCode) {
        if (test.expected.exitCode === 0) {
            test.result = {
                result: 'failure',
                details: `Command: ${test.command}\nExited with non-zero code: ${test.actualExitCode}`
            }
            return test;
        }

        test.result = {
            result: 'failure',
            details: `Command: ${test.command}\nProcess exit code didn't match expected:\n`
                    +`Expected exit code: ${test.expected.exitCode}\n`
                    +`Actual exit code:   ${test.actualExitCode}`
        }
        return test;
    }

    test.result = {
        result: 'success'
    };

    return test;
}
