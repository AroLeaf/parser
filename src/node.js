// @ts-check
class ParseError extends Error {}

module.exports = class Node {
  constructor(name, callback) {
    this.name = name;
    this.callback = callback;
  }

  is(callback) {
    this.callback = callback;
    return this;
  }

  parse(tokens) {
    tokens.current ??= 0;

    const ctx = {
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

      ignore(...types) {
        for (const type of types) {
          if (type instanceof Node) {
            try {
              const res = type.parse(this.tokens);
              if (res) return (this.consumed++, res);
            } catch (error) {
              if (!(error instanceof ParseError)) throw error;
            }
          } else if (this.assert(type)) {
            return this.tokens[this.tokens.current++];
          }
        }
        this.tokens.current -= this.consumed;
        return false;
      },
      
      discard(...types) {
        const res = this.ignore(...types);
        if (!res) this.error(this.current());
        return res;
      },
      
      accept(...types) {
        const res = this.ignore(...types);
        if (res) this.children.push(res);
        return res;
      },
      
      expect(...types) {
        const res = this.discard(...types);
        if (res) this.children.push(res);
        return res;
      },
      
      error(token) {
        throw new ParseError(`Unexpected token "${token.raw}"\n    at ${token.type} (${token.line}:${token.col})`);
      }
    }
    
    const res = this.callback(ctx) ?? ctx.children;
    
    return Array.isArray(res) ? {
      type: this.name,
      children: res,
    } : res;
  }
}