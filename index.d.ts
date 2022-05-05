export interface Token {
  type: string
  raw: string
  value: string
  line: number
  col: number
}

declare class TokenType {
  name: string;
  predicates: ((match: RegExpExecArray) => boolean)[];
  regex?: RegExp;
  _discard?: boolean;
  callback?: (token: Token) => any;
  constructor(name?: string);
  matches(regex: RegExp | string): this;
  and(predicate: (match: RegExpExecArray) => boolean): this;
  discard(): this;
  then(callback: (token: Token, match: RegExpExecArray, tokens: Token[]) => any): this;
}

export class Lexer {
  types: TokenType[];
  token(name: string): TokenType;
  parse(input: string): Token[];
}

export interface ParsedNode {
  type: string
  children: any[]
}

export type Parsed = ParsedNode | Parsed[] | false;

export interface ParserContext {
  tokens: Token[];
  children: any[];
  current(): Token | undefined;
  next(): Token | undefined;
  assert(type: string | ((token: Token) => boolean)): boolean;
  accept(type: string | ((token: Token) => boolean) | Node): Parsed;
  expect(type: string | ((token: Token) => boolean) | Node): Parsed;
  discard(count?: number): number;
  error(token: Token): never;
}

export class Node {
  name: string;
  callback?: (ctx: ParserContext) => any;
  constructor(name: string, callback?: (ctx: ParserContext) => any);
  is(callback: (ctx: ParserContext) => any): this;
  parse(tokens: Token[]): Parsed;
}