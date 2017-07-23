

if (process.env.TRACE_STDOUT) {

    const oldConsoleLog = console.log;

    console.log = (...args: string[]) => {

        const msg = {
            msg: args.join(' '),
            stack: null
        }

        oldConsoleLog(JSON.stringify(msg, null, 2));
    }

}
