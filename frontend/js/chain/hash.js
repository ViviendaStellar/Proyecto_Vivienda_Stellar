/* INN-LOCK · Huella SHA-256 (BytesN<32>) para evidencias, motivos y el hash
   del cronograma. Usa la Web Crypto API (SubtleCrypto): no hace falta
   ninguna librería externa. `crypto.subtle` existe igual en el navegador y
   en Node 19+, así que este archivo funciona tal cual con `require()` en
   las pruebas unitarias (ver frontend/js/chain/__tests__/). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ChainHash = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  async function sha256Bytes(data) {
    const buf = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return new Uint8Array(digest);
  }

  function bytesToHex(bytes) {
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function sha256Hex(data) { return bytesToHex(await sha256Bytes(data)); }

  async function sha256File(file) { return sha256Bytes(await file.arrayBuffer()); }

  return { sha256Bytes, sha256Hex, sha256File, bytesToHex };
});
