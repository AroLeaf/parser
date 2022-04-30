// @ts-check
module.exports = class Node {
  constructor(name, callback) {
    this.name = name;
    this.callback = callback;
  }

  is(callback) {
    this.callback = callback;
  }

  parse(tokens) {
    tokens.current ??= 0;

    const ctx = {
      tokens,
      children: [],
      current() { return this.tokens[this.tokens.current] },
      next() { return this.tokens[this.tokens.current+1] },
      assert(type) {
        if (!this.current()) return false;
        return (typeof type === 'string' && this.current().type === type) 
          || (typeof type === 'function' && type(this.current()));
      },
      accept(type) {
        if (type instanceof Node) {
          const res = type.parse(this.tokens);
          if (!res) return false;
          this.children.push(res);
          return res;
        } else if (this.assert(type)) {
          this.children.push(this.current());
          return this.tokens[this.tokens.current++];
        }
        return false;
      },
      expect(type) {
        if (type instanceof Node) {
          const res = type.parse(this.tokens);
          if (!res) this.error(this.current());
          this.children.push(res);
          return res;
        } else if (this.assert(type)) {
          this.children.push(this.current());
          return this.tokens[this.tokens.current++];
        }
        this.error(this.current());
      },
      discard(count = 1) {
        this.children.length -= count;
      },
      error(token) {
        throw new Error(`Unexpected token "${token.raw}"\n    at ${token.type} (${token.row}:${token.col})`);
      }
    }
    
    const res = this.callback(ctx) ?? ctx.children;

    return Array.isArray(res) ? {
      type: this.name,
      children: res,
    } : res;
  }
}