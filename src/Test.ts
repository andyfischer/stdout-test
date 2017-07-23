
import {ParsedTestFile} from './ParseTestFile';

export interface TestResult {
    success: boolean
    message?: string
    expectedLine?: string
    actualLine?: string
    lineNumber?: number
}

export default interface Test {
    testDir: string
    expectedTxtFilename: string
    expected: ParsedTestFile | null
    originalCommand: string
    command: string

    actualLines: string[]
    actualTraceLines?: {text:string}[]
    actualStderrLines: string[]
    actualExitCode: number

    result: TestResult
}
