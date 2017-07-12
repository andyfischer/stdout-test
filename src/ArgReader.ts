
export default class ArgReader {
    index = 0
    args: string[]

    constructor() {
        this.args = process.argv.slice(2);
    }

    next(lookahead:number = 0): string {
        if (this.index + lookahead >= this.args.length)
            return null;
        return this.args[this.index + lookahead];
    }

    consume(): string {
        const next = this.next();
        this.advance();
        return next;
    }

    consumeRemaining(): string[] {
        const remaining = [];
        while (!this.finished()) {
            remaining.push(this.consume());
        }
        return remaining;
    }

    advance(dist:number = 1): void {
        this.index += dist;
    }

    finished():boolean {
        return this.index >= this.args.length;
    }

    static looksLikeOption(arg:string) {
        return !!/^--.*/.exec(arg);
    }
}
