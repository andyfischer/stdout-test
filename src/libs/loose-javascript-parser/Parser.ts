
import {readFile} from './../../Util';

import {
    t_lparen,
    t_rparen,
    t_lbracket,
    t_rbracket,
    t_ident,
    t_whitespace,
    t_newline,
    t_squoted_str,
    t_dquoted_str,
    t_slash,
    t_double_slash_comment,
    t_dot,
    t_semicolon,
    t_unrecognized,
    Token,
    tokenToText,
    tokenize
} from './Tokenizer';

interface NamedTermRef {
    name: string
}

interface IndexedTermRef {
    blockIndex: number
}

type TermRef = NamedTermRef | IndexedTermRef;

interface Term {
    termType: string
    blockIndex: number
    inputs: TermRef[]
    nested: Block | null
    format: string
    parseError: string | null
}

interface Block {
    terms: Term[]
}

class TokenStream {
    tokenList: Token[]
    tokenIndex = 0

    constructor(tokenList:Token[]) {
        this.tokenList = tokenList;
    }

    finished() : boolean {
        return this.tokenIndex >= this.tokenList.length;
    }

    next(lookahead=0) : Token {
        const index = this.tokenIndex + lookahead;
        if (index >= this.tokenList.length)
            return {
                match:'eof',
                startPos: 0,
                endPos: 0,
                lineNumber: 0,
                charNumber: 0,
                indent: 0,
                text: null
            };

        return this.tokenList[index];
    }

    nextIs(match:string, lookahead=0) : boolean {
        return this.next(lookahead).match === match;
    }

    consume(match=null) : void {
        if (match && !this.nextIs(match))
            throw new Error("TokenStream.consume expected: " + match + ", next is: " + this.next().match);

        this.tokenIndex += 1;
    }

    consumeStr(match=0) : string {
        const token = this.next();
        if (token.match === null)
            return '';
        const str = tokenToText(token);
        this.consume(match);
        return str;
    }
}

class Parser {
    tokens: TokenStream
    currentBlock: Block

    constructor(tokens:TokenStream) {
        this.tokens = tokens;
    }

    finished() : boolean {
        return this.tokens.finished();
    }

    next(lookahead=0) {
        return this.tokens.next(lookahead);
    }

    nextIs(match, lookahead=0) {
        return this.tokens.nextIs(match, lookahead);
    }

    consume(match=null) {
        return this.tokens.consume(match);
    }

    consumeStr(match=null) {
        return this.tokens.consumeStr(match);
    }

    nextNonWhitespace() {
        let lookahead = 0;
        while (this.next(lookahead).match === t_whitespace)
            lookahead++;

        return this.next(lookahead);
    }
}

function newTerm() : Term {
    return {
        termType: null,
        blockIndex: -1,
        inputs: [],
        nested: null,
        format: '',
        parseError: null
    }
}

function isInfixOperator(token:Token) : boolean {
    // todo: handle infix operators
    return false;
}

function infixPrecedence(token:Token) : number {
    // todo: handle infix operators
    return 0;
}

function possibleWhitespace(parser:Parser) : string {
    if (parser.tokens.nextIs(t_whitespace))
        return parser.consumeStr();

    return '';
}

function termToRef(term:Term) : TermRef {
    return {blockIndex: term.blockIndex};
}

function postfixExpression(parser:Parser) : Term {

    if (parser.nextIs(t_ident) && parser.nextIs(t_lparen, 1)) {
        // Function call
        const term = newTerm();
        term.termType = 'func_call';
        term.inputs.push({name: parser.consumeStr(t_ident) });

        parser.consume(t_lparen);

        term.format = '$0(' + possibleWhitespace(parser);

        while (!parser.nextIs(t_rparen) && !parser.finished()) {
            if (parser.nextIs(t_whitespace)) {
                term.format += parser.consumeStr();
                continue;
            }

            const input = expression(parser);
            term.inputs.push(termToRef(input));
        }


        parser.consume(t_rparen);
        term.format += ')' + possibleWhitespace(parser);
    }

    throw new Error("postfixExpression - unexpected token: " + tokenToText(parser.next()));
}

function prefixExpression(parser:Parser) : Term {
    return postfixExpression(parser);
}

function infixExpression(parser:Parser, minPrecedence:number) : Term {
    let leftSide : Term = prefixExpression(parser);

    while (true) {
        const next : Token = parser.nextNonWhitespace();

        if (!isInfixOperator(next) || infixPrecedence(next) < minPrecedence) {
            break;
        }
    }

    return leftSide;
}

function expression(parser:Parser) : Term {

    const preFormat = possibleWhitespace(parser);

    const term = infixExpression(parser, 0);

    switch (parser.next().match) {

    default:
        term.parseError = "unexpected token: " + tokenToText(parser.next());
    }

    term.format = preFormat + term.format + possibleWhitespace(parser);

    term.blockIndex = parser.currentBlock.terms.length;
    parser.currentBlock.terms.push(term);

    return term;
}

function statementList(parser:Parser) : Block {

    const block = {
        terms: []
    }

    while (!parser.tokens.finished()) {
        expression(parser);
    }

    return block;
}

export function parse(tokens: TokenStream) : Block {

    const parser = new Parser(tokens);

    return statementList(parser);

    // Function calls
    //   expr lparen inputs[] rparen
    //
    // Dot expressions
    //   ident dot ident
    //
    // String literal

}

async function commandLineRun() {
    const text:string = await readFile(process.argv[2]);

    const tokens:Token[] = tokenize(text);
    const tokenStream = new TokenStream(tokens);
    const block:Block = parse(tokenStream);

    console.log('Terms = ');
    for (const term in block.terms) {
        console.log(JSON.stringify(term, null, 2));
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

