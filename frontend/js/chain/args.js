/* INN-LOCK · Construye los argumentos de register_project en dos pasos:
   1) buildRegisterProjectArgs: da forma a los datos del proyecto en el orden
      exacto que espera el contrato (función pura, sin el SDK — se puede
      probar con Node sin cargar Freighter ni Stellar SDK).
   2) toScVals: convierte esos datos planos a los ScVal reales con
      window.StellarSdk (necesita el SDK cargado, por eso es solo para el
      navegador).

   Orden de argumentos de `register_project` (igual que en
   contracts/escrow/contracts/escrow/src/lib.rs):
   project_id, constructora, interventor, administrador, token,
   presupuesto_total, hash_cronograma, hitos. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ChainArgs = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * @param {object} project
   * @param {string} project.projectId - UUID (con o sin guiones)
   * @param {string} project.constructora - dirección G...
   * @param {string} project.interventor - dirección G...
   * @param {string} project.administrador - dirección G...
   * @param {string} project.token - dirección C... del token
   * @param {string|number} project.presupuestoTotal - en stroops
   * @param {string} project.hashCronograma - 64 caracteres hex (32 bytes)
   * @param {Array<{deadline:number, percentageBps:number}>} project.hitos
   * @returns datos planos, en el orden exacto del contrato
   */
  function buildRegisterProjectArgs(project) {
    const faltantes = ['projectId', 'constructora', 'interventor', 'administrador', 'token', 'presupuestoTotal', 'hashCronograma', 'hitos']
      .filter((campo) => project[campo] == null);
    if (faltantes.length) throw new Error('Faltan datos del proyecto: ' + faltantes.join(', '));
    if (!Array.isArray(project.hitos) || project.hitos.length < 6 || project.hitos.length > 60) {
      throw new Error('El cronograma debe tener entre 6 y 60 hitos (tiene ' + (project.hitos || []).length + ').');
    }

    return {
      project_id: String(project.projectId),
      constructora: String(project.constructora),
      interventor: String(project.interventor),
      administrador: String(project.administrador),
      token: String(project.token),
      presupuesto_total: String(project.presupuestoTotal),
      hash_cronograma: String(project.hashCronograma),
      hitos: project.hitos.map((h) => ({
        deadline: Number(h.deadline),
        percentage_bps: Number(h.percentageBps != null ? h.percentageBps : h.percentage_bps)
      }))
    };
  }

  /** Convierte los datos planos de buildRegisterProjectArgs a ScVal reales (necesita window.StellarSdk). */
  function toScVals(args, StellarSdk, ChainUuid) {
    const hexToBytes = (hex) => {
      const clean = String(hex).trim();
      const bytes = new Uint8Array(clean.length / 2);
      for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
      return bytes;
    };
    // El `type` de un vec de mapas uniformes NO lleva un arreglo extra por
    // fuera: se aplica el mismo spec de mapa a cada elemento (ver los
    // ejemplos de nativeToScVal en el SDK). Envolverlo en `[...]` produce
    // "Error(Value, UnexpectedType)" al simular — lo confirmé simulando
    // contra el contrato real en testnet antes de dejarlo así.
    const hitosScVal = StellarSdk.nativeToScVal(
      args.hitos.map((h) => ({ deadline: BigInt(h.deadline), percentage_bps: h.percentage_bps })),
      { type: { deadline: ['symbol', 'u64'], percentage_bps: ['symbol', 'u32'] } }
    );
    return [
      StellarSdk.nativeToScVal(ChainUuid.uuidToBytes(args.project_id), { type: 'bytes' }),
      new StellarSdk.Address(args.constructora).toScVal(),
      new StellarSdk.Address(args.interventor).toScVal(),
      new StellarSdk.Address(args.administrador).toScVal(),
      new StellarSdk.Address(args.token).toScVal(),
      StellarSdk.nativeToScVal(BigInt(args.presupuesto_total), { type: 'i128' }),
      StellarSdk.nativeToScVal(hexToBytes(args.hash_cronograma), { type: 'bytes' }),
      hitosScVal
    ];
  }

  return { buildRegisterProjectArgs, toScVals };
});
