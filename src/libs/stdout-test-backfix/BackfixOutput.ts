
import {writeFile, readFile} from './../../Util';

interface BackfixOutputOperation {
    actualLine: string
    desiredLine: string
    stack: any
    result?: {
        success: boolean
    }
}

export default async function backfixOutput(op:BackfixOutputOperation) : Promise<BackfixOutputOperation> {

    const {tokenize} = require('loose-javascript-parser');

    console.log('backfix: ', op);

    const stackFrame = op.stack[0];

    const sourceFileName = stackFrame.fileName;
    const sourceLines = (await readFile(sourceFileName)).split('\n');
    const offendingLine = sourceLines[stackFrame.lineNumber - 1];
    const tokens = tokenize(offendingLine);

    console.log('tokens = ', tokens);

    op.result = {
        success: false
    }

    return op;
}
