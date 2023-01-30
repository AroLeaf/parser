// @ts-check
const XRegExp = require('xregexp');

class TokenType {
  constructor(name, options) {
    if (typeof options === 'string' || options instanceof RegExp) options = { matches: options };
    this.name = name;
    options?.matches && this.matches(options.matches);
    options?.and && options.and.forEach(p => this.and(p));
    options?.discard && this.discard();
    options?.then && this.then(options.then);
    this.predicates = [];
  }

  matches(regexOrString) {
    this.regex = typeof regexOrString === 'string' 
      ? XRegExp(XRegExp.escape(regexOrString), regexOrString.includes('\n') ? 's' : '') 
      : XRegExp(regexOrString);
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
  constructor(types) {
    this.types = types ? Object.entries(types).map(([name, options]) => new TokenType(name, options)) : [];
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
        type.callback?.(token, match, tokens);
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
      if (!matched) throw new Error(`invalid token\n    at "${input.slice(pos, pos + 32)}" (${line}:${col})`);
    }

    return tokens;
  }
}