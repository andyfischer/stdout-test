
import {readFile} from './../../Util';

export const t_lparen = 'lparen';
export const t_rparen = 'rparen';
export const t_lbracket = 'lbracket';
export const t_rbracket = 'rbracket';
export const t_ident = 'ident';
export const t_whitespace = 'whitespace';
export const t_newline = 'newline';
export const t_squoted_str = 'squoted_str';
export const t_dquoted_str = 'dquoted_str';
export const t_slash = 'slash';
export const t_double_slash_comment = 'double_slash_comment';
export const t_unrecognized = 'unrecognized';

const c_A = "A".charCodeAt(0);
const c_Z = "Z".charCodeAt(0);
const c_a = "a".charCodeAt(0);
const c_z = "z".charCodeAt(0);
const c_0 = "0".charCodeAt(0);
const c_9 = "9".charCodeAt(0);
const c_dash = "-".charCodeAt(0);
const c_underscore = "_".charCodeAt(0);
const c_lparen = "(".charCodeAt(0);
const c_rparen = ")".charCodeAt(0);
const c_lbracket = "[".charCodeAt(0);
const c_rbracket = "]".charCodeAt(0);
const c_space = " ".charCodeAt(0);
const c_newline = "\n".charCodeAt(0);
const c_squote = "'".charCodeAt(0);
const c_dquote = "\"".charCodeAt(0);
const c_slash = "/".charCodeAt(0);
const c_backslash = "\\".charCodeAt(0);

function is_letter(c:number) {
    return (c >= c_A && c <= c_Z) || (c >= c_a && c <= c_z);
}

function is_number(c:number) {
    return c >= c_0 && c <= c_9;
}

function is_accepted_in_ident(c:number) {
    if (c === 0)
        return false;

    return is_letter(c) || is_number(c) || c === c_underscore;
}

class StringReader {
    str: string
    index = 0
    isIterator = true
    lineNumber = 0
    charNumber = 1
    indent = 0

    finished() : boolean {
        return this.index >= this.str.length;
    }

    next(lookahead:number = 0) {
        if (this.index+lookahead >= this.str.length)
            return 0;

        return this.str.charCodeAt(this.index+lookahead);
    }

    nextChar(lookahead:number = 0) {
        if (this.index+lookahead >= this.str.length)
            return null;

        return this.str[this.index+lookahead];
    }

    advance(dist:number) {
        this.index += dist;
    }

    position() {
        return this.index;
    }

    getTokenText(token:Token) {
        return this.str.substr(token.startPos, token.endPos - token.startPos);
    }

    consume(match:string, len:number, shouldSaveText:boolean) {

        const startPos = this.position();

        this.advance(len);

        const result:Token = {match:match,
            startPos: startPos,
            endPos: this.position(),
            lineNumber: this.lineNumber,
            charNumber: this.charNumber,
            indent: this.indent,
            text: null
        };

        if (shouldSaveText) {
            result.text = this.getTokenText(result);
        }

        if ((this.charNumber === 1) && (match === t_whitespace)) {
            this.indent = len;
        }

        this.charNumber += len;

        if (match === t_newline) {
            this.lineNumber += 1;
            this.charNumber = 1;
            this.indent = 0;
        }

        return result;
    }

    consumeWhile(match:string, condition:(ch:number)=>boolean) {

        let lookahead = 1;
        while (condition(this.next(lookahead)) && this.next(lookahead) !== 0)
            lookahead += 1;
        return this.consume(match, lookahead, true);
    }
}

export function startStringReader(str:string) {
    const it = new StringReader()
    it.str = str;
    return it;
}

class Token {
    match: string
    startPos: number
    endPos: number
    lineNumber: number
    charNumber: number
    indent: number
    text: string|null
}

function lookahead_whitespace(it:StringReader) {
    let lookahead = 1;
    while (it.next(lookahead) === c_space)
        lookahead += 1;
    return lookahead;
}

function lookahead_quoted(it:StringReader, quoteChar:number) {
    let lookahead = 1;
    let escaped = false;
    
    while (true) {

        const next = it.next(lookahead);
        
        if (next === 0)
            break;

        if (escaped) {
            escaped = false;
        } else {

            if (next === quoteChar) {
                lookahead += 1;
                break;
            }
            
            if (it.next(lookahead) === c_backslash)
                escaped = true;
        }

        lookahead += 1;
    }

    return lookahead;
}

export function nextToken(it:StringReader) : Token {

    const next = it.next();

    switch (next) {
        case c_lparen: return it.consume(t_lparen, 1, false);
        case c_rparen: return it.consume(t_rparen, 1, false);
        case c_lbracket: return it.consume(t_lbracket, 1, false);
        case c_rbracket: return it.consume(t_rbracket, 1, false);
        case c_newline: return it.consume(t_newline, 1, false);
        case c_slash: {
            if (it.next(1) === c_slash) {
                return it.consumeWhile(t_double_slash_comment, (c) => c !== c_newline);
            } else {
                return it.consume(t_slash, 1, false);
            }
        }

        case c_space:
            return it.consume(t_whitespace, lookahead_whitespace(it), false);

        case c_squote:
            return it.consume(t_squoted_str, lookahead_quoted(it, c_squote), true);

        case c_dquote:
            return it.consume(t_dquoted_str, lookahead_quoted(it, c_dquote), true);
    }

    if (is_accepted_in_ident(next)) {
        let lookahead = 1;
        while (is_accepted_in_ident(it.next(lookahead)))
            lookahead += 1;
        return it.consume(t_ident, lookahead, true);
    }

    return it.consume(t_unrecognized, 1, true);
}

export class TokenReader {
    it: StringReader
    _next: Token | null

    constructor(input) {
        this.it = startStringReader(input);
        this.advance();
    }

    finished() : boolean {
        return this._next === null;
    }

    next() : Token|null {
        return this._next;
    }

    advance() {
        if (this.it.finished()) {
            this._next = null;
        } else {
            this._next = nextToken(this.it);
        }
    }

    consume() : Token|null {
        const next = this._next;
        this.advance();
        return next;
    }
}

export function matchToText(match:string) : string {
    switch (match) {
        case t_lparen: return '(';
        case t_rparen: return ')';
        case t_lbracket: return '[';
        case t_rbracket: return ']';
        case t_newline: return '\\n';
    }
}

export function tokenToText(token:Token) : string {
    if (token.text !== null)
        return token.text;

    return matchToText(token.match);
}

async function commandLineRun() {
    const text:string = await readFile(process.argv[2]);

    const reader = new TokenReader(text);

    while (!reader.finished()) {
        console.log(reader.consume());
    }
}

if (!module.parent) {
    require('source-map-support').install();

    commandLineRun()
    .catch((err) => {
        process.exitCode = 1;
        console.log(err);
    });
}

