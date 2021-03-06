
import {ParsedTestFile} from './ParseTestFile';

export interface TestResult {
    success: boolean
    message?: string
    expectedLine?: string
    actualLine?: string
    lineNumber?: number
}

export default interface Test {
    expectedTxtFilename: string
    testDir: string
    expected: ParsedTestFile | null
    originalCommand: string
    command: string

    actualLines: string[]
    actualTraceLines?: {text:string, stack:any}[]
    actualStderrLines: string[]
    actualExitCode: number

    result: TestResult
}
