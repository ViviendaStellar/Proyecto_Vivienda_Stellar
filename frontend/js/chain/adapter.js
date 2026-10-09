/* INN-LOCK · Adaptador de cadena: una sola interfaz para el resto de la app.
   Por dentro decide si lee datos simulados (modo 'simulado', como ?demo=1)
   o la testnet real (modo 'testnet', vía chain/contract.js). Escribir
   (deposit, certify_milestone...) llega en el Paso 8. */
(function () {
  'use strict';
  const cfg = window.ChainConfig || { mode: 'simulado', isTestnet: false };

  // En modo simulado no hay una cadena real detrás: se devuelven valores
  // "vacíos" consistentes (nada certificado, saldo cero) en vez de inventar
  // datos on-chain. La demo ya tiene su propio flujo en js/data.js y js/live.js.
  const simulated = {
    async getProject() { return null; },
    async getMilestone() { return null; },
    async getBalance() { return 0; },
    async getContribution() { return 0; },
    async getReport() { return null; },
    async getCompliance() { return true; },
    async getCertification() { return null; },
    async getReleasedTotal() { return 0; },
    async getOverdue() { return null; },
    async getFreeze() { return null; },
    async getScheduleRequest() { return null; }
  };

  const adapter = { mode: cfg.mode, isTestnet: !!cfg.isTestnet };
  Object.keys(simulated).forEach((name) => {
    adapter[name] = (...a) => {
      if (adapter.isTestnet) {
        if (!window.ChainContract) return Promise.reject(new Error('chain/contract.js no está cargado.'));
        return window.ChainContract[name](...a);
      }
      return simulated[name](...a);
    };
  });

  window.ChainAdapter = adapter;
})();
