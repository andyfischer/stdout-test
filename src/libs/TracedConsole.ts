
if (process.env.TRACE_STDOUT) {

    let prevConsoleLog = null;

    const StackTrace = require('stacktrace-js');

    const oldConsoleLog = console.log;

    console.log = (...args: string[]) => {

        prevConsoleLog = (async () => {

            if (prevConsoleLog)
                await prevConsoleLog;

            const trace = await StackTrace.get();

            const msg = {
                msg: args.join(' '),
                stack: trace
            }

            oldConsoleLog(JSON.stringify(msg, null, 2));
        })();
    }

}
