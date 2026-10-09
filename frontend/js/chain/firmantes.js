/* INN-LOCK · Dos proveedores de firma con la misma interfaz, para que
   register.js no tenga que saber quién firma de verdad:

   - `proveedorFreighter()`: el proveedor real. No hace nada especial — su
     sola presencia le dice a register.js "usa Freighter como siempre".
   - `proveedorPruebaLocal()`: delega la firma al servicio de
     `tools/test-signer/` (un proceso aparte en 127.0.0.1:4181, SOLO
     testnet, SOLO para no tener que cambiar de cuenta en Freighter en cada
     prueba manual). Nunca toca ninguna llave aquí: solo le manda a ESE
     servicio el XDR sin firmar y recibe el XDR ya firmado.

   El resto del flujo (argumentos, hash canónico, verificación del hash
   antes de firmar, orden seguro, errores en español) es idéntico para los
   dos proveedores — vive en register.js, no aquí. */
(function () {
  'use strict';

  const URL_BASE_PRUEBA = 'http://127.0.0.1:4181';

  async function pedir(ruta, cuerpo) {
    let respuesta;
    try {
      respuesta = await fetch(URL_BASE_PRUEBA + ruta, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo)
      });
    } catch (e) {
      throw new Error('No se pudo conectar con el servicio de pruebas (tools/test-signer, ' + URL_BASE_PRUEBA + '). ¿Está corriendo? Mira docs/semana3/ARQUITECTURA_ONCHAIN.md.');
    }
    let json = null;
    try { json = await respuesta.json(); } catch (e) { /* respuesta sin cuerpo JSON */ }
    if (!respuesta.ok || !json || json.ok === false) {
      throw new Error((json && json.error) || ('El servicio de pruebas respondió ' + respuesta.status + '.'));
    }
    return json;
  }

  function proveedorFreighter() {
    return { nombre: 'freighter' };
  }

  function proveedorPruebaLocal() {
    return {
      nombre: 'pruebaLocal',
      async firmarEntrada({ rol, entradaXdr, validUntilLedgerSeq }) {
        const res = await pedir('/firmar-entrada', { rol, entradaXdr, validUntilLedgerSeq });
        return res.entradaFirmadaXdr;
      },
      async firmarTransaccion({ rol, transaccionXdr }) {
        const res = await pedir('/firmar-transaccion', { rol, transaccionXdr });
        return res.transaccionFirmadaXdr;
      }
    };
  }

  /** ¿Está corriendo el servicio de pruebas ahora mismo? Lectura simple (GET /salud), nunca firma nada. */
  async function disponiblePruebaLocal() {
    try {
      const r = await fetch(URL_BASE_PRUEBA + '/salud', { method: 'GET' });
      if (!r.ok) return false;
      const j = await r.json();
      return !!(j && j.ok);
    } catch (e) { return false; }
  }

  window.ChainFirmantes = { proveedorFreighter, proveedorPruebaLocal, disponiblePruebaLocal };
})();
