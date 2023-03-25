// @ts-check
const util = require('node:util');

class ParseError extends Error {
  constructor(token, options = {}) {
    const message = token
      ? `Unexpected token "${token.raw}"`
      : `Unexpected end of file`;
    super(message);
    this.cause = options.cause;
    this.token = token;
  }

  getStack() {
    return this.cause?.getStack?.() || this.stack;
  }

  [util.inspect.custom]() {
    return this.toString();
  }

  toString() {
    const tokens = [];
    const collect = (err) => {
      if (err.token) tokens.push(err.token);
      if (err.cause) collect(err.cause);
    }
    collect(this);
    return this.getStack().replace(/\n/, '\n' + tokens
      .reverse()
      .map(t => `    at ${t.raw} (${t.line}:${t.col})\n`)
      .join('')
    );
  }
}

module.exports = class Node {
  constructor(name, callback) {
    this.name = name;
    this.callback = callback;
  }

  is(callback) {
    this.callback = callback;
    return this;
  }

  parse(tokens, ctx = {}) {
    tokens.current ??= 0;

    Object.assign(ctx, {
      node: this,
      consumed: 0,
      tokens,
      children: [],
      current() { return this.tokens[this.tokens.current] },
      next() { return this.tokens[this.tokens.current+1] },
      
      assert(type) {
        return !this.current()
          ? false : typeof type === 'string'
          ? this.current().type === type : type(this.current())
      },

      _find(...types) {
        const initial = this.tokens.current;
        let error;
        for (const type of types) {
          if (type instanceof Node) {
            try {
              const res = type.parse(this.tokens);
              if (res) return res;
            } catch (err) {
              if (!(err instanceof ParseError)) throw err;
              error = err;
            }
          } else if (this.assert(type)) {
            return this.tokens[this.tokens.current++];
          } else {
            error = new ParseError(this.current());
          }
          this.tokens.current = initial;
        }
        return error;
      },

      ignore(...types) {
        const res = this._find(...types);
        return res instanceof ParseError ? false : res;
      },
      
      discard(...types) {
        const res = this._find(...types);
        if (res instanceof ParseError) this.error(this.current(), res);
        return res;
      },
      
      accept(...types) {
        const res = this._find(...types);
        if (res instanceof ParseError) return false;
        this.children.push(res);
        return res;
      },
      
      expect(...types) {
        const res = this._find(...types);
        if (res instanceof ParseError) this.error(this.current(), res);
        this.children.push(res);
        return res;
      },
      
      error(token, cause) {
        if (token.line === cause?.token.line && token.col === cause?.token.col) throw cause;
        throw new ParseError(token, { cause });
      }
    });
    
    const res = this.callback(ctx) ?? ctx.children;
    
    const node = Array.isArray(res) ? {
      type: this.name,
      children: res,
    } : res;

    return node;
  }
}