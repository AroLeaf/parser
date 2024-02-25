module.exports = {
  escape(regex) {
    return regex.replace(/[\\\[\]{}()*+?.^$|]/g, '\\$&');
  },

  exec(string, regex, position, sticky) {
    const r = sticky && !regex.sticky ? new RegExp(regex, regex.flags + 'y') : regex;
    if (position !== undefined) r.lastIndex = position;
    return r.exec(string);
  }
}