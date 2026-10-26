// Rebuilds the exact bytes SudoMock signs: sorted keys, no spaces, and
// every character outside printable ASCII written as a lowercase \u escape.
function sudomockSignedBody(value) {
  const short = { '"': '\\"', '\\': '\\\\', '\b': '\\b', '\f': '\\f', '\n': '\\n', '\r': '\\r', '\t': '\\t' };
  const text = (s) => {
    let out = '"';
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      const code = s.charCodeAt(i);
      if (short[ch] !== undefined) out += short[ch];
      else if (code < 0x20 || code >= 0x7f) out += '\\u' + ('000' + code.toString(16)).slice(-4);
      else out += ch;
    }
    return out + '"';
  };
  const encode = (v) => {
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'string') return text(v);
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (typeof v === 'number') return String(v);
    if (Array.isArray(v)) return '[' + v.map(encode).join(',') + ']';
    return '{' + Object.keys(v).sort().map((k) => text(k) + ':' + encode(v[k])).join(',') + '}';
  };
  return encode(value);
}
