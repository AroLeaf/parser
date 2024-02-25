export interface Token {
  type: string
  raw: string
  value: string
  line: number
  col: number
}

export interface TokenTypeOptions {
  matches: RegExp | string;
  discard?: boolean;
  and?: ((match: RegExpExecArray) => boolean)[];
  then?: (token: Token) => any;
}

export interface TokenType {
  name: string;
  predicates: ((match: RegExpExecArray) => boolean)[];
  regex?: RegExp;
  _discard?: boolean;
  callback?: (token: Token) => any;
  constructor(name: string, options?: TokenTypeOptions | string | RegExp);
  matches(regex: RegExp | string): this;
  and(predicate: (match: RegExpExecArray) => boolean): this;
  discard(): this;
  then(callback: (token: Token, match: RegExpExecArray, tokens: Token[]) => any): this;
}

export class Lexer {
  types: TokenType[];
  constructor(types?: { [key: string]: TokenTypeOptions | string | RegExp });
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
  ignore(...types: (string | ((token: Token) => boolean) | Node)[]): Parsed;
  discard(...types: (string | ((token: Token) => boolean) | Node)[]): Parsed;
  accept(...types: (string | ((token: Token) => boolean) | Node)[]): Parsed;
  expect(...types: (string | ((token: Token) => boolean) | Node)[]): Parsed;
  error(token: Token, cause: Error): never;
}

export class Node {
  name: string;
  callback?: (ctx: ParserContext) => any;
  constructor(name: string, callback?: (ctx: ParserContext) => any);
  is(callback: (ctx: ParserContext) => any): this;
  parse(tokens: Token[], ctx?: object): Parsed;
}