
if (process.env.TRACE_STDOUT) {

    let globalPrevConsoleLog = null;

    const StackTrace = require('stacktrace-js');

    const realConsoleLog = console.log;

    console.log = (...args: string[]) => {

        const linesOut = args.join(' ').split('\n');

        globalPrevConsoleLog = (async () => {

            const prevConsoleLog = globalPrevConsoleLog;

            // Grab the stack trace before entering into a promises callback.
            let trace = await StackTrace.get();
            
            // Make sure order is preserved for all log messages.
            if (prevConsoleLog)
                await prevConsoleLog;

            // Remove this file from the trace.
            trace = trace.filter((traceLine) => 
                !(/TracedConsole\.(js|ts)/.exec(traceLine.fileName))
            );

            for (const line of linesOut) {
                const msg = {
                    text: line,
                    stack: trace
                }

                realConsoleLog(JSON.stringify(msg));
            }
        })();
    }

}
