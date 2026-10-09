/* INN-LOCK · Comprobaciones que deben pasar ANTES de pedir ninguna llave o
   tocar la red. Si algo aquí no coincide EXACTAMENTE con testnet, el script
   se detiene: nunca firma "por si acaso" contra una red que no pudo
   verificar. */
'use strict';

const PASSPHRASE_TESTNET = 'Test SDF Network ; September 2015';

async function verificarRedTestnet(StellarSdk, ChainConfig) {
  if (ChainConfig.networkPassphrase !== PASSPHRASE_TESTNET) {
    throw new Error('SEGURIDAD: el networkPassphrase configurado ("' + ChainConfig.networkPassphrase + '") no es exactamente el de testnet. Me detengo sin tocar ninguna llave.');
  }
  if (!/testnet/i.test(ChainConfig.sorobanRpcUrl)) {
    throw new Error('SEGURIDAD: la URL del RPC ("' + ChainConfig.sorobanRpcUrl + '") no contiene "testnet". Me detengo sin tocar ninguna llave.');
  }
  let red;
  try {
    const server = new StellarSdk.rpc.Server(ChainConfig.sorobanRpcUrl);
    red = await server.getNetwork();
  } catch (e) {
    throw new Error('SEGURIDAD: no se pudo confirmar la red contra el RPC (' + e.message + '). Me detengo sin tocar ninguna llave.');
  }
  if (red.passphrase !== PASSPHRASE_TESTNET) {
    throw new Error('SEGURIDAD: el RPC respondió con un networkPassphrase distinto de testnet ("' + red.passphrase + '"). Me detengo sin tocar ninguna llave.');
  }
}

/** Nunca acepta nombres de identidad por fuera de estos 3 — ni por argumento, ni por variable de entorno. */
function verificarNombresDeIdentidad(IDENTIDADES) {
  const esperados = ['inn-constructora', 'inn-interventor', 'inn-admin'];
  const actuales = Object.values(IDENTIDADES).slice().sort();
  const ok = JSON.stringify(actuales) === JSON.stringify(esperados.slice().sort());
  if (!ok) throw new Error('SEGURIDAD: la configuración interna de nombres de identidad no es exactamente inn-constructora/inn-interventor/inn-admin. Me detengo.');
}

module.exports = { PASSPHRASE_TESTNET, verificarRedTestnet, verificarNombresDeIdentidad };
