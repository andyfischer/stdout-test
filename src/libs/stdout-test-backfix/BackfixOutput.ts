
interface BackfixOutputOperation {
    actualLine: string
    desiredLine: string
    trace: any
    result?: {
        success: boolean
    }
}

export default async function backfixOutput(op:BackfixOutputOperation) : Promise<BackfixOutputOperation> {

    console.log('backfix: ', op);

    op.result = {
        success: false
    }

    return op;
}
