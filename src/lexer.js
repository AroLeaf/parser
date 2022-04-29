// @ts-check
const XRegExp = require('xregexp');

class TokenType {
  constructor(name = '') {
    this.name = name;
    this.predicates = [];
  }

  matches(regex) {
    if (typeof regex === 'string') regex = XRegExp(XRegExp.escape(regex), regex.includes('\n') ? 's' : '');
    this.regex = XRegExp(regex);
    return this;
  }

  and(predicate) {
    this.predicates.push(predicate);
    return this;
  }

  discard() {
    this._discard = true;
    return this;
  }

  then(callback) {
    this.callback = callback;
    return this;
  }
}

module.exports = class Lexer {
  constructor() {
    this.types = [];
  }

  token(name) {
    const type = new TokenType(name);
    this.types.push(type);
    return type;
  }

  parse(input) {
    const tokens = [];
    let pos = 0;
    let line = 1, col = 1;
    
    while (pos < input.length) {
      const matched = this.types.some(type => {
        const match = XRegExp.exec(input, type.regex, pos, true);
        if (!match || !type.predicates.every(p => p(match))) return false;
        
        const token = {
          type: type.name,
          raw: match[0],
          value: match[1] || match[0],
          line, col,
        };
        type.callback?.(match, token, tokens);
        if (!type._discard) tokens.push(token);
        
        col += match[0].length;
        if (type.regex.dotAll) {
          const split = match[0].split('\n');
          line += split.length - 1;
          if (split.length > 1) col = split.at(-1).length + 1;
        }
        
        pos += match[0].length;
        return true;
      });
      if (!matched) throw new Error(`invalid token\n    at "${input.slice(0, 32)}" (${line}:${col})`);
    }

    return tokens;
  }
}