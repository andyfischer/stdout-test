
export class ArgReader {
    index = 0
    args: string[]

    constructor() {
        this.args = process.argv.slice(2);
    }

    next(lookahead:number = 0) {
        if (this.index + lookahead >= this.args.length)
            return null;
        return this.args[this.index + lookahead];
    }

    consume() {
        const next = this.next();
        this.advance();
        return next;
    }

    advance(dist:number = 1) {
        this.index += dist;
    }

    finished() {
        return this.index >= this.args.length;
    }

    static looksLikeOption(arg:string) {
        return !!/^--.*/.exec(arg);
    }
}
