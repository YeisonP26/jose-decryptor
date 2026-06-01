function base64urlEncode(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64urlDecode(str) {
  // Add padding if needed
  const padding = 4 - (str.length % 4);
  if (padding !== 4) {
    str += '='.repeat(padding);
  }
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

module.exports = { base64urlEncode, base64urlDecode };
