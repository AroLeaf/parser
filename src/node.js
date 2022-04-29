// @ts-check
function match(token, accepted) {
  if (!token) return false;
  return accepted.some(type => 
    (typeof type === 'string' && token.type === type)
    || (typeof type === 'function' && type(token))
  );
}



module.exports = class Node {
  constructor(name) {
    this.name = name;
    this.structure = [];
    this.callback = node => node;
  }


  accept(...accepted) {
    this.structure.push(ctx => {
      const tokens = ctx.tokens;
      let pos = ctx.pos;
      const out = [];

      for (const type of accepted) {
        if (type instanceof Node) {
          const res = type.parse(tokens, pos);
          if (!res) continue;
          pos = res.pos;
          out.push(res);
        } else if (match(tokens[pos], [type])) {
          out.push(tokens[pos++]);
        }
      }

      return { out, pos };
    });
    return this;
  }


  expect(...expected) {
    this.structure.push(ctx => {
      const tokens = ctx.tokens;
      let pos = ctx.pos;
      const out = [];

      for (const type of expected) {
        if (type instanceof Node) {
          const res = type.parse(tokens, pos);
          if (!res) return false;
          pos = res.pos;
          out.push(res);
        } else if (match(tokens[pos], [type])) {
          out.push(tokens[pos++]);
        } else {
          return false;
        }
      }

      return { out: out.flat(), pos };
    });
    return this;
  }


  acceptAny(...accepted) {
    this.structure.push(ctx => {
      const tokens = ctx.tokens;
      let pos = ctx.pos;

      for (const type of accepted) {
        if (type instanceof Node) {
          const res = type.parse(tokens, pos);
          if (!res) continue;
          pos = res.pos;
          return { out: res, pos };
        } else if (match(tokens[pos], [type])) {
          return { out: [tokens[pos++]], pos };
        }
      }

      return [];
    });
    return this;
  }


  expectAny(...expected) {
    this.structure.push(ctx => {
      const tokens = ctx.tokens;
      let pos = ctx.pos;

      for (const type of expected) {
        if (type instanceof Node) {
          const res = type.parse(tokens, pos);
          if (!res) continue;
          pos = res.pos;
          return { out: res, pos };
        } else if (match(tokens[pos], [type])) {
          return { out: [tokens[pos++]], pos };
        }
      }

      return false;
    });
    return this;
  }


  while(...conditions) {
    const node = new Node();
    this.structure.push(ctx => {
      const tokens = ctx.tokens;
      let pos = ctx.pos;
      const out = [];

      while(match(tokens[pos], conditions)) {
        const res = node.parse(tokens, pos);
        if (!res) return false;
        pos = res.pos;
        out.push(res);
      }

      return { pos, out: out.flat() };
    });
    return node;
  }


  until(...conditions) {
    const node = new Node();
    this.structure.push(ctx => {
      const tokens = ctx.tokens;
      let pos = ctx.pos;
      const out = [];

      while(!match(tokens[pos], conditions)) {
        const res = node.parse(tokens, pos);
        if (!res) return false;
        pos = res.pos;
        out.push(res);
      }

      return { pos, out: out.flat() };
    });
    return node;
  }


  switch() {
    const cases = [];
    let def;

    this.structure.push(ctx => {
      const tokens = ctx.tokens;
      let pos = ctx.pos;

      for (const { when, node } of cases) {
        if (match(tokens[pos], when)) {
          const res = node.parse(tokens, pos);
          if (!res) return false;
          pos = res.pos;
          return { out: res, pos };
        }
      }

      if (def) {
        const res = def.parse(tokens, pos);
        if (!res) return false;
        pos = res.pos;
        return { out: res, pos };
      }

      return false;
    });

    return {
      node: this,
      case(...when) {
        const node = Object.assign(new Node(), {
          break: () => this,
          case(...args) { return this.break().case(...args) },
          default() { return this.break().default() },
        });
        cases.push({ when, node });
        return node;
      },
      default() {
        return def = Object.assign(new Node(), {
          break: () => this,
          case(...args) { return this.break().case(...args) },
          default() { return this.break().default() },
        });
      }
    }
  }


  raw(cb) {
    this.structure.push(cb);
    return this;
  }


  then(callback) {
    this.callback = callback;
  }

  
  parse(tokens, startPos = 0) {
    let pos = startPos;
    const out = [];
    
    for (const step of this.structure) {
      const res = step({ tokens, pos });
      if (!res) return false;
      pos = res.pos;
      out.push(res.out);
    }

    return this.callback(Object.assign(this.name ? {
      type: this.name,
      children: out.flat(),
    } : out.flat(), { pos }));
  }
}