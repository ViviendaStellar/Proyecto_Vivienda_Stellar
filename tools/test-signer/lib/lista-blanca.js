/* INN-LOCK · Lista blanca de lo que este servicio puede firmar.
   NUNCA confía en un "contrato"/"función" que mande el frontend en el
   cuerpo de la solicitud: siempre reconstruye esos datos a partir del XDR
   real (la entrada de autorización o la transacción) con el SDK de
   Stellar, y valida ESO. Si el XDR no se puede interpretar, o el contrato
   o la función no son exactamente los permitidos, rechaza con un mensaje
   claro — nunca firma "por si acaso". */
'use strict';

// Se amplía en pasos futuros cuando el flujo de firmas cubra más funciones.
const FUNCIONES_PERMITIDAS = new Set(['register_project']);

/** A partir de un nodo {contractAddress, functionName, args} (mismo shape en una entrada de autorización y en una operación invokeHostFunction), devuelve {contrato, funcion, args} o lanza si no se puede leer. */
function leerInvocacionContrato(StellarSdk, nodo) {
  const contrato = StellarSdk.Address.fromScAddress(nodo.contractAddress).toString();
  const funcion = nodo.functionName.toString();
  return { contrato, funcion, args: nodo.args };
}

/** Extrae {contrato, funcion, args} de una SorobanAuthorizationEntry ya parseada (xdr.SorobanAuthorizationEntry). */
function datosDesdeEntrada(StellarSdk, entrada) {
  const fn = entrada.rootInvocation.function;
  if (fn.type !== 'sorobanAuthorizedFunctionTypeContractFn') {
    throw new Error('Tipo de función no permitido: "' + fn.type + '" (solo se firman llamadas directas a un contrato).');
  }
  return leerInvocacionContrato(StellarSdk, fn.contractFn);
}

/** Extrae {contrato, funcion, args} de una Transaction ya parseada (xdr.TransactionEnvelope / Transaction), validando que tenga exactamente 1 operación invokeHostFunction. */
function datosDesdeTransaccion(StellarSdk, tx) {
  if (!tx.operations || tx.operations.length !== 1) {
    throw new Error('Esta transacción no tiene exactamente 1 operación (tiene ' + (tx.operations ? tx.operations.length : 0) + '). Solo se firman transacciones de una sola invocación al contrato.');
  }
  const op = tx.operations[0];
  if (op.type !== 'invokeHostFunction') {
    throw new Error('Tipo de operación no permitido: "' + op.type + '" (solo se firman invocaciones a contrato, nunca pagos ni otras operaciones).');
  }
  const func = op.func;
  if (func.type !== 'hostFunctionTypeInvokeContract') {
    throw new Error('Tipo de función no permitido: "' + func.type + '" (no se firma creación de contratos ni carga de Wasm).');
  }
  return leerInvocacionContrato(StellarSdk, func.invokeContract);
}

/** Valida {contrato, funcion} contra la lista blanca. Devuelve {ok:true} o {ok:false, motivo}. */
function validarContraListaBlanca(ctx, datos) {
  if (datos.contrato !== ctx.ChainConfig.escrowContractId) {
    return { ok: false, motivo: 'Contrato no permitido: este servicio solo firma invocaciones al contrato escrow de testnet (' + ctx.ChainConfig.escrowContractId + '), no a "' + datos.contrato + '".' };
  }
  if (!FUNCIONES_PERMITIDAS.has(datos.funcion)) {
    return { ok: false, motivo: 'Función no permitida: "' + datos.funcion + '". Solo se permite: ' + Array.from(FUNCIONES_PERMITIDAS).join(', ') + '.' };
  }
  return { ok: true };
}

/** Para el resumen legible que se registra antes de firmar (nunca incluye llaves). Best-effort: si no puede leer project_id/hash, el resumen sale sin esos campos. */
function resumenParaRegistro(ctx, datos) {
  const resumen = { contrato: datos.contrato, funcion: datos.funcion, projectId: null, hashCronograma: null };
  try {
    if (datos.funcion === 'register_project' && datos.args && datos.args.length >= 7) {
      const bytesId = ctx.StellarSdk.scValToNative(datos.args[0]);
      resumen.projectId = ctx.ChainUuid.bytesToUuid(bytesId);
      const bytesHash = ctx.StellarSdk.scValToNative(datos.args[6]);
      resumen.hashCronograma = Buffer.from(bytesHash).toString('hex');
    }
  } catch (e) { /* el resumen es solo informativo */ }
  return resumen;
}

module.exports = {
  FUNCIONES_PERMITIDAS,
  datosDesdeEntrada,
  datosDesdeTransaccion,
  validarContraListaBlanca,
  resumenParaRegistro
};
