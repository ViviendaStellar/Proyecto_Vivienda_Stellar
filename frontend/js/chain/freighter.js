/* INN-LOCK · Conexión de SOLO LECTURA con la extensión Freighter.
   Detecta la extensión y lee la cuenta pública conectada. Firmar
   transacciones (signTransaction) se añade en el Paso 8: aquí no se firma
   nada, el usuario sigue teniendo el control total de su llave en Freighter. */
(function () {
  'use strict';

  async function ready() {
    if (window.ChainConfig) await window.ChainConfig.vendorReady;
    return window.freighterApi || null;
  }

  async function isAvailable() {
    const api = await ready();
    if (!api) return false;
    try {
      const r = await api.isConnected();
      return !!(r && (r.isConnected ?? r));
    } catch (e) { return false; }
  }

  /** Pide permiso (si falta) y devuelve la dirección pública (G...) conectada. */
  async function connect() {
    const api = await ready();
    if (!api) throw new Error('Freighter no está disponible. Instala la extensión: https://www.freighter.app');
    const allowed = await api.isAllowed();
    if (!(allowed && allowed.isAllowed)) await api.setAllowed();
    const res = await api.getAddress();
    if (!res || !res.address) throw new Error('No se pudo leer la cuenta de Freighter.');
    return res.address;
  }

  async function getNetwork() {
    const api = await ready();
    if (!api) return null;
    return api.getNetworkDetails ? api.getNetworkDetails() : api.getNetwork();
  }

  window.Freighter = { isAvailable, connect, getNetwork };
})();
