/* INN-LOCK · Configuración de la capa on-chain.
   Resuelve el modo (simulado/testnet), normaliza los datos públicos que ya
   trae js/config.js, y —solo en modo testnet— carga de forma dinámica
   js/vendor/stellar.js (nunca se precarga offline: pesa ~800 KB y solo hace
   falta cuando de verdad se va a hablar con la red). */
(function () {
  'use strict';
  const cfg = window.INNLOCK_CONFIG || {};

  let forced = null;
  try {
    const q = new URLSearchParams(location.search).get('chain');
    if (q === 'testnet' || q === 'simulado') { forced = q; localStorage.setItem('innlock.chain', q); }
    else {
      const saved = localStorage.getItem('innlock.chain');
      if (saved === 'testnet' || saved === 'simulado') forced = saved;
    }
  } catch (e) { /* sin almacenamiento (ej. navegación privada) */ }

  const mode = forced === 'testnet' || forced === 'simulado' ? forced : (cfg.chainMode || 'simulado');
  const isTestnet = mode === 'testnet';

  function loadVendorScript() {
    return new Promise((resolve, reject) => {
      if (window.StellarSdk && window.freighterApi) return resolve();
      const s = document.createElement('script');
      s.src = 'js/vendor/stellar.js';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('No se pudo cargar js/vendor/stellar.js'));
      document.head.appendChild(s);
    });
  }

  window.ChainConfig = {
    mode,
    isTestnet,
    network: cfg.stellarNetwork || 'testnet',
    networkPassphrase: cfg.networkPassphrase || 'Test SDF Network ; September 2015',
    sorobanRpcUrl: cfg.sorobanRpcUrl || 'https://soroban-testnet.stellar.org',
    horizonUrl: cfg.horizonUrl || 'https://horizon-testnet.stellar.org',
    escrowContractId: cfg.escrowContractId || '',
    tokenContractId: cfg.tokenContractId || '',
    explorerUrl: cfg.explorerUrl || 'https://stellar.expert/explorer/testnet',
    testRoles: cfg.testRoles || { constructora: '', interventor: '', administrador: '' },
    // Resuelve cuando el SDK está disponible (de inmediato en modo simulado,
    // donde nunca se necesita); los demás módulos de chain/ lo esperan antes
    // de tocar window.StellarSdk o window.freighterApi.
    vendorReady: isTestnet ? loadVendorScript() : Promise.resolve()
  };
})();
