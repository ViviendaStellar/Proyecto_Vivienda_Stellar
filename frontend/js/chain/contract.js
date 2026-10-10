/* INN-LOCK · Cliente de SOLO LECTURA de contracts/escrow en testnet.
   Simula las funciones get_* para leer el estado real de la red sin firmar
   ni enviar nada (simular no necesita firma). Firmar y enviar funciones que
   cambian estado (deposit, certify_milestone...) queda para el Paso 8. */
(function () {
  'use strict';

  async function sdkReady() {
    await window.ChainConfig.vendorReady;
    const S = window.StellarSdk;
    if (!S) throw new Error('El SDK de Stellar no se cargó (frontend/js/vendor/stellar.js).');
    return S;
  }

  async function readOnly(fnName, scArgs) {
    const S = await sdkReady();
    const cfg = window.ChainConfig;
    if (!cfg.escrowContractId) throw new Error('Falta escrowContractId en la configuración.');

    const server = new S.rpc.Server(cfg.sorobanRpcUrl);
    // Cuenta "de usar y tirar": solo sirve para construir el sobre de la
    // transacción que se va a simular. Nunca se firma ni se envía, así que
    // no necesita existir en la red ni tener fondos.
    const throwawayPublicKey = S.Keypair.random().publicKey();
    const account = new S.Account(throwawayPublicKey, '0');
    const contract = new S.Contract(cfg.escrowContractId);

    const tx = new S.TransactionBuilder(account, { fee: S.BASE_FEE, networkPassphrase: cfg.networkPassphrase })
      .addOperation(contract.call(fnName, ...(scArgs || [])))
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (S.rpc.Api.isSimulationError(sim)) throw new Error('simulación de "' + fnName + '" falló: ' + sim.error);
    if (!sim.result) throw new Error('la simulación de "' + fnName + '" no devolvió resultado.');
    return S.scValToNative(sim.result.retval);
  }

  async function bytes16(uuid) {
    const S = await sdkReady();
    return S.nativeToScVal(window.ChainUuid.uuidToBytes(uuid), { type: 'bytes' });
  }
  async function u32(n) { return (await sdkReady()).nativeToScVal(n, { type: 'u32' }); }

  async function args(...vals) { return Promise.all(vals); }

  window.ChainContract = {
    readOnly,
    async getProject(projectId) { return readOnly('get_project', await args(bytes16(projectId))); },
    async getMilestone(projectId, index) { return readOnly('get_milestone', await args(bytes16(projectId), u32(index))); },
    async getBalance(projectId) { return readOnly('get_balance', await args(bytes16(projectId))); },
    async getContribution(projectId, purchaseId) { return readOnly('get_contribution', await args(bytes16(projectId), bytes16(purchaseId))); },
    async getReport(projectId, index) { return readOnly('get_report', await args(bytes16(projectId), u32(index))); },
    async getCompliance(projectId) { return readOnly('get_compliance', await args(bytes16(projectId))); },
    async getCertification(projectId, index) { return readOnly('get_certification', await args(bytes16(projectId), u32(index))); },
    async getReleasedTotal(projectId) { return readOnly('get_released_total', await args(bytes16(projectId))); },
    async getOverdue(projectId, index) { return readOnly('get_overdue', await args(bytes16(projectId), u32(index))); },
    async getFreeze(projectId) { return readOnly('get_freeze', await args(bytes16(projectId))); },
    async getScheduleRequest(projectId) { return readOnly('get_schedule_request', await args(bytes16(projectId))); }
  };
})();
