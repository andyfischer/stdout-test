
import {ParsedTestFile} from './ParseTestFile';

export interface TestSuccess {
    result: 'success'
}

export interface TestFailure {
    result: 'failure'
    details: string
}

type TestResult = TestSuccess | TestFailure;

export default interface Test {
    testDir: string
    expectedTxtFilename: string
    expected: ParsedTestFile | null
    originalCommand: string
    command: string
    result: TestResult

    actualLines: string[]
    actualStderrLines: string[]
    actualExitCode: number
}
