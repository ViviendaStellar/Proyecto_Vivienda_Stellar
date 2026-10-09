/* INN-LOCK · Las 3 etapas de firma, cada una su propia función exportada —
   a propósito no hay un solo "firmarTodo()"/--auto-sign: quien use este
   módulo llama a cada etapa por separado y puede hacerlo en momentos
   distintos (run.js las llama una tras otra, pero son independientes).

   Mismo diseño que frontend/js/chain/register.js (una sola simulación en
   modo "recording", las 3 firmas se acumulan sobre esas mismas entradas),
   pero firmando con un Keypair de Node en vez de pedírselo a Freighter. */
'use strict';

function crearEstado(datos) {
  return {
    datos,
    direcciones: { constructora: datos.constructora, interventor: datos.interventor, administrador: datos.administrador },
    funcXdr: null,
    entradas: null,
    firmadoPor: { constructora: false, interventor: false, administrador: false }
  };
}

/** Simula register_project UNA vez (modo "recording") y devuelve las 3 entradas de autorización sin firmar. Calcula el hash canónico del cronograma y lo deja guardado en `datos.hashCronograma` (igual que hace register.js vía prepararProyecto). */
async function prepararSimulacion(ctx, datos) {
  const { StellarSdk: S, ChainArgs, ChainUuid, ChainCanonical, ChainConfig, ChainErrors } = ctx;
  const { hex } = await ChainCanonical.hashProject(datos);
  datos.hashCronograma = hex;
  const args = ChainArgs.buildRegisterProjectArgs(datos);
  const scArgs = ChainArgs.toScVals(args, S, ChainUuid);
  const contract = new S.Contract(ChainConfig.escrowContractId);
  // Cuenta "de usar y tirar" solo para simular: igual que en register.js,
  // nunca puede ser la dirección de uno de los 3 firmantes (si coincidiera,
  // Soroban la trataría como autorización implícita de esa cuenta y no
  // generaría una entrada de autorización separada para ella).
  const cuenta = new S.Account(S.Keypair.random().publicKey(), '0');
  const server = new S.rpc.Server(ChainConfig.sorobanRpcUrl);
  const tx = new S.TransactionBuilder(cuenta, { fee: S.BASE_FEE, networkPassphrase: ChainConfig.networkPassphrase })
    .addOperation(contract.call('register_project', ...scArgs))
    .setTimeout(30)
    .build();
  const sim = await server.simulateTransaction(tx);
  if (S.rpc.Api.isSimulationError(sim)) throw new Error(ChainErrors.traducir(sim.error));
  return { funcXdr: tx.operations[0].func.toXDR('base64'), entradas: sim.result.auth };
}

function encontrarIndice(S, entradas, direccion) {
  return entradas.findIndex((e) => S.inspectAuthEntry(e).address === direccion);
}

function etiquetaPorDireccion(direcciones, direccion) {
  if (direccion === direcciones.constructora) return 'constructora';
  if (direccion === direcciones.interventor) return 'interventor';
  if (direccion === direcciones.administrador) return 'administrador';
  return direccion;
}

function verificarNoCaducadas(S, direcciones, entradas, otros, ledgerActual) {
  for (const dir of otros) {
    const idx = encontrarIndice(S, entradas, dir);
    if (idx === -1) continue;
    const info = S.inspectAuthEntry(entradas[idx]);
    if (!info.signed) continue;
    const listo = S.checkAuthEntryReadiness(entradas[idx], ledgerActual);
    if (listo.expired) {
      const rol = etiquetaPorDireccion(direcciones, dir);
      const err = new Error('La firma de ' + rol + ' caducó, debe firmar de nuevo.');
      err.code = 'FIRMA_CADUCADA';
      err.rolCaducado = rol;
      throw err;
    }
  }
}

/**
 * Firma la entrada de UN rol con su Keypair. `estado.entradas` ya debe
 * existir (ver prepararSimulacion). Si el Keypair no corresponde a la
 * dirección esperada para ese rol, se bloquea con el mismo tipo de mensaje
 * que usa Freighter en el frontend ("Cambia a la cuenta de <rol>").
 */
async function firmarRol(ctx, estado, rol, keypair, ventanaLedgers) {
  const { StellarSdk: S, ChainConfig } = ctx;
  if (!estado.entradas) throw new Error('Todavía no se simuló la invocación (llama primero a prepararSimulacion).');

  const direccion = keypair.publicKey();
  const esperado = estado.direcciones[rol];
  if (direccion !== esperado) {
    const err = new Error('Cambia a la cuenta de ' + rol + ' (se esperaba ' + esperado + ', se usó ' + direccion + ').');
    err.code = 'CUENTA_INCORRECTA';
    throw err;
  }

  const server = new S.rpc.Server(ChainConfig.sorobanRpcUrl);
  const ledgerActual = (await server.getLatestLedger()).sequence;

  const otros = Object.values(estado.direcciones).filter((d) => d !== direccion);
  verificarNoCaducadas(S, estado.direcciones, estado.entradas, otros, ledgerActual);

  const idx = encontrarIndice(S, estado.entradas, direccion);
  if (idx === -1) throw new Error('No se encontró una entrada de autorización para ' + rol + ' en esta invocación.');

  const firmada = await S.authorizeEntry(estado.entradas[idx], keypair, ledgerActual + ventanaLedgers, ChainConfig.networkPassphrase);
  estado.entradas[idx] = firmada;
  estado.firmadoPor[rol] = true;
  return estado;
}

/** Espera a que la transacción quede confirmada (o fallida), sondeando getTransaction. */
async function esperarConfirmacion(server, hash, intentos, esperaMs) {
  intentos = intentos || 20;
  esperaMs = esperaMs || 2000;
  for (let i = 0; i < intentos; i++) {
    const res = await server.getTransaction(hash);
    if (res.status !== 'NOT_FOUND') return res;
    await new Promise((r) => setTimeout(r, esperaMs));
  }
  return { status: 'NOT_FOUND' };
}

/** Último paso: firma la entrada del administrador, arma la transacción con SU cuenta como fuente, la firma, la envía, espera confirmación y relee get_project. */
async function firmarYEnviarAdministrador(ctx, estado, keypairAdmin, ventanaLedgers) {
  await firmarRol(ctx, estado, 'administrador', keypairAdmin, ventanaLedgers);

  const { StellarSdk: S, ChainConfig, ChainErrors, ChainContract } = ctx;
  const server = new S.rpc.Server(ChainConfig.sorobanRpcUrl);
  const func = S.xdr.HostFunction.fromXDR(estado.funcXdr, 'base64');
  const cuentaAdmin = await server.getAccount(keypairAdmin.publicKey());

  const tx = new S.TransactionBuilder(cuentaAdmin, { fee: S.BASE_FEE, networkPassphrase: ChainConfig.networkPassphrase })
    .addOperation(S.Operation.invokeHostFunction({ func, auth: estado.entradas }))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (S.rpc.Api.isSimulationError(sim)) throw new Error(ChainErrors.traducir(sim.error));

  const assembled = S.rpc.assembleTransaction(tx, sim).build();
  assembled.sign(keypairAdmin);

  const sendRes = await server.sendTransaction(assembled);
  if (sendRes.status === 'ERROR') {
    throw new Error(ChainErrors.traducir(sendRes.errorResult ? sendRes.errorResult.toXDR('base64') : 'La red rechazó la transacción.'));
  }

  const resultado = await esperarConfirmacion(server, sendRes.hash);
  if (resultado.status !== 'SUCCESS') {
    throw new Error('La transacción se envió (hash ' + sendRes.hash + ') pero no se confirmó como exitosa (estado: ' + resultado.status + ').');
  }

  const proyectoOnChain = await ChainContract.getProject(estado.datos.projectId);
  return {
    txHash: sendRes.hash,
    explorerUrl: ChainConfig.explorerUrl + '/tx/' + sendRes.hash,
    proyectoOnChain
  };
}

module.exports = {
  crearEstado,
  prepararSimulacion,
  firmarRol,
  firmarYEnviarAdministrador,
  etiquetaPorDireccion
};
