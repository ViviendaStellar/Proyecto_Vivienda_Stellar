/* INN-LOCK · Conversión entre UUID (los que ya usa Supabase) y BytesN<16>
   (lo que espera contracts/escrow). Un UUID son 32 caracteres hex sin los
   guiones = 16 bytes exactos: no hay cálculo, solo texto -> bytes. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ChainUuid = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function uuidToBytes(uuid) {
    const hex = String(uuid).replace(/-/g, '').toLowerCase();
    if (!/^[0-9a-f]{32}$/.test(hex)) throw new Error('uuidToBytes: "' + uuid + '" no es un UUID válido.');
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    return bytes;
  }

  function bytesToUuid(bytes) {
    if (!bytes || bytes.length !== 16) throw new Error('bytesToUuid: se esperaban 16 bytes.');
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
  }

  return { uuidToBytes, bytesToUuid };
});
