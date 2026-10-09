/* INN-LOCK · Registro de un proyecto en testnet con las 3 firmas en etapas
   (constructora → interventor → administrador), cada una por separado con
   Freighter. Solo funciona en modo testnet; nunca toca ni ve una llave
   secreta: Freighter firma, esta pieza solo arma y guarda XDR público.

   Cómo se resuelve la caducidad de las firmas (ver docs/semana3 para más
   detalle): cada firmante fija SU PROPIO ledger de expiración en el momento
   en que firma (no uno compartido desde el principio). La firma de la
   constructora puede esperar varios DÍAS en localStorage hasta que el
   interventor y el administrador actúen (revisión humana, no un proceso
   automático), así que usa una ventana generosa (7 días); la del
   administrador, que firma y envía casi en el mismo instante, usa una
   ventana corta. No encontramos un tope duro documentado por el protocolo
   para `signatureExpirationLedger` (solo la recomendación de "mantenla
   pequeña" por costo); por eso la estrategia real contra la caducidad no es
   una ventana "infinita", sino: ventana larga + detección con
   `checkAuthEntryReadiness` + que esa persona vuelva a firmar si de verdad
   se le venció (ver `verificarNoCaducadas` más abajo).

   Cómo se evita que las 3 firmas queden sobre invocaciones distintas (y por
   lo tanto con nonces distintos): la invocación se simula UNA sola vez (ver
   `firmarEntradaPropia`, rama `!state.entriesXdr`), en modo "recording". Esa
   simulación es la que genera los 3 `SorobanAuthorizationEntry` con sus
   nonces. A partir de ahí nunca se vuelve a simular: las 3 firmas se van
   acumulando sobre ESE MISMO arreglo de entradas (guardado como
   `state.entriesXdr`), cada firmante solo rellena su propio puesto. Por eso
   el nonce es el mismo para los 3 sin que nadie tenga que coordinarlo a mano.

   Cada firma guardada queda atada al `hashCronograma` con el que se firmó
   (`prepararProyecto` lo fija). Si alguien vuelve a preparar el mismo
   proyecto con datos que producen un hash distinto, se descartan TODAS las
   firmas guardadas y hay que volver a pedirlas desde cero; si el hash es
   igual, se conservan (ver `prepararProyecto`). */
(function () {
  'use strict';

  // Ledgers ~5s cada uno. Ver la explicación de arriba sobre por qué estas
  // ventanas son más largas que el "típico" de 12-60 ledgers que recomienda
  // la documentación para flujos automáticos de un solo paso: aquí hay
  // personas reales firmando en momentos distintos.
  const VENTANA_CONSTRUCTORA_LEDGERS = 120960; // ~7 días: su firma espera en localStorage a que revisen interventor/admin
  const VENTANA_INTERVENTOR_LEDGERS = 120960; // ~7 días: igual, puede esperar al administrador
  const VENTANA_ADMINISTRADOR_LEDGERS = 60; // ~5 minutos: firma y envía casi junto

  function claveEstado(projectId) { return 'innlock.chain.register.' + projectId; }

  function obtenerEstado(projectId) {
    try {
      const raw = localStorage.getItem(claveEstado(projectId));
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function guardarEstado(state) {
    localStorage.setItem(claveEstado(state.projectId), JSON.stringify(state));
    return state;
  }

  /**
   * Paso 1: guarda los datos del proyecto y calcula el hash del cronograma.
   * No firma nada. Es seguro llamarla de nuevo con los mismos datos (por
   * ejemplo, cada vez que alguien va a firmar): si el hash del cronograma
   * no cambió desde la última vez, conserva el estado y las firmas que ya
   * haya; si cambió (la constructora editó presupuesto, hitos, etc.),
   * descarta TODAS las firmas guardadas y empieza de cero, porque esas
   * firmas quedaron sobre una invocación que ya no corresponde a los datos
   * actuales.
   */
  async function prepararProyecto(datos) {
    const { json, hex } = await window.ChainCanonical.hashProject(datos);
    const anterior = obtenerEstado(datos.projectId);
    if (anterior && anterior.hashCronograma === hex) return anterior;
    const state = {
      version: 1,
      projectId: datos.projectId,
      constructora: datos.constructora,
      interventor: datos.interventor,
      administrador: datos.administrador,
      token: datos.token,
      presupuestoTotal: String(datos.presupuestoTotal),
      hitos: datos.hitos,
      canonicalJson: json,
      hashCronograma: hex,
      funcXdr: null,
      entriesXdr: null,
      signedBy: { constructora: false, interventor: false, administrador: false },
      status: 'borrador',
      txHash: null,
      confirmedAt: null,
      lastError: null
    };
    return guardarEstado(state);
  }

  /** Recalcula el hash desde los datos guardados y lo compara con el que se firmó originalmente. */
  async function resumenParaFirmar(projectId) {
    const state = obtenerEstado(projectId);
    if (!state) throw new Error('No hay datos guardados para el proyecto ' + projectId + '. Hay que prepararlo primero.');
    const { json, hex } = await window.ChainCanonical.hashProject(state);
    return {
      state,
      hashRecalculado: hex,
      jsonRecalculado: json,
      coincide: hex === state.hashCronograma
    };
  }

  function base64ToBytes(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  function bytesToBase64(bytes) {
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  async function verificarCuenta(direccionEsperada, etiquetaRol) {
    const conectada = await window.Freighter.connect();
    if (conectada !== direccionEsperada) {
      const err = new Error('Cambia a la cuenta de ' + etiquetaRol + ' en Freighter (' + direccionEsperada + '). Ahora mismo tienes conectada ' + conectada + '.');
      err.code = 'CUENTA_INCORRECTA';
      throw err;
    }
    return conectada;
  }

  /** Adapta Freighter a la forma que espera `authorizeEntry` del SDK. */
  function crearFirmanteFreighter(direccionEsperada) {
    return async function firmar(preimage) {
      const preimageXdr = preimage.toXDR('base64');
      const res = await window.freighterApi.signAuthEntry(preimageXdr, {
        networkPassphrase: window.ChainConfig.networkPassphrase,
        address: direccionEsperada
      });
      if (res.error) {
        throw new Error(window.ChainErrors.traducir(res.error.message || JSON.stringify(res.error)));
      }
      if (!res.signedAuthEntry) {
        const err = new Error('No se firmó: se rechazó la ventana de Freighter o se cerró sin aprobar. Puedes intentarlo de nuevo.');
        err.code = 'FIRMA_RECHAZADA';
        throw err;
      }
      return { signature: base64ToBytes(res.signedAuthEntry), publicKey: res.signerAddress || direccionEsperada };
    };
  }

  function encontrarIndicePorDireccion(entradas, StellarSdk, direccion) {
    return entradas.findIndex((e) => StellarSdk.inspectAuthEntry(e).address === direccion);
  }

  /** "constructora" / "interventor" / "administrador" según a quién pertenece la dirección en este proyecto (o la dirección tal cual, si no es ninguno de los 3 roles conocidos). */
  function etiquetaPorDireccion(state, direccion) {
    if (direccion === state.constructora) return 'constructora';
    if (direccion === state.interventor) return 'interventor';
    if (direccion === state.administrador) return 'administrador';
    return direccion;
  }

  /** Lanza un error claro, con el ROL (no la dirección cruda), si alguna de las direcciones ya firmó pero su firma venció. */
  function verificarNoCaducadas(state, entradas, StellarSdk, direcciones, ledgerActual) {
    for (const dir of direcciones) {
      const idx = encontrarIndicePorDireccion(entradas, StellarSdk, dir);
      if (idx === -1) continue;
      const info = StellarSdk.inspectAuthEntry(entradas[idx]);
      if (!info.signed) continue; // todavía no le tocaba firmar
      const listo = StellarSdk.checkAuthEntryReadiness(entradas[idx], ledgerActual);
      if (listo.expired) {
        const rol = etiquetaPorDireccion(state, dir);
        const err = new Error('La firma de ' + rol + ' caducó, debe firmar de nuevo.');
        err.code = 'FIRMA_CADUCADA';
        err.rolCaducado = rol;
        err.direccionCaducada = dir;
        throw err;
      }
    }
  }

  /**
   * Vigencia restante de cada una de las 3 firmas de un proyecto, para
   * mostrar en la ficha ("vence en N ledgers" / "caducada"). Lectura pura
   * (un getLatestLedger), no firma ni envía nada. Devuelve null si el
   * proyecto todavía no tiene ninguna entrada simulada.
   */
  async function vigenciaFirmas(projectId) {
    await window.ChainConfig.vendorReady;
    const S = window.StellarSdk;
    const state = obtenerEstado(projectId);
    if (!state || !state.entriesXdr) return null;
    const entradas = state.entriesXdr.map((x) => S.xdr.SorobanAuthorizationEntry.fromXDR(x, 'base64'));
    const server = new S.rpc.Server(window.ChainConfig.sorobanRpcUrl);
    const ledgerActual = (await server.getLatestLedger()).sequence;
    const roles = { constructora: state.constructora, interventor: state.interventor, administrador: state.administrador };
    const porRol = {};
    for (const rol of Object.keys(roles)) {
      const idx = encontrarIndicePorDireccion(entradas, S, roles[rol]);
      if (idx === -1) { porRol[rol] = null; continue; }
      const info = S.inspectAuthEntry(entradas[idx]);
      if (!info.signed) { porRol[rol] = { firmado: false }; continue; }
      const listo = S.checkAuthEntryReadiness(entradas[idx], ledgerActual);
      porRol[rol] = {
        firmado: true,
        caducada: !!listo.expired,
        ledgersRestantes: listo.expired ? 0 : Math.max(0, info.signatureExpirationLedger - ledgerActual),
        expiraEnLedger: info.signatureExpirationLedger
      };
    }
    return { ledgerActual, roles: porRol };
  }

  /**
   * Firma UNA entrada de autorización para `direccion`. Si todavía no existe
   * la simulación (primera vez, normalmente la constructora), la crea.
   * Reutilizada por las 3 etapas.
   *
   * `proveedor` decide QUIÉN firma de verdad: por defecto (o si se omite)
   * es Freighter, el único proveedor real — exige estar en la cuenta
   * correcta y abre sus ventanas de aprobación. El otro proveedor posible,
   * `window.ChainFirmantes.proveedorPruebaLocal()`, delega la firma al
   * servicio de `tools/test-signer/` (solo testnet + localhost, ver
   * docs/semana3/ARQUITECTURA_ONCHAIN.md): nunca pasa por Freighter ni por
   * esta función de ninguna llave, solo le pide al servicio el XDR ya
   * firmado. El resto del flujo (simulación única, hash, caducidad, orden
   * seguro) es IDÉNTICO para los dos proveedores.
   */
  async function firmarEntradaPropia(projectId, direccion, etiquetaRol, ventanaLedgers, proveedor) {
    await window.ChainConfig.vendorReady;
    const S = window.StellarSdk;
    const state = obtenerEstado(projectId);
    if (!state) throw new Error('No hay datos guardados para el proyecto ' + projectId + '. Hay que prepararlo primero.');
    const esPruebaLocal = proveedor && proveedor.nombre === 'pruebaLocal';

    if (!esPruebaLocal) await verificarCuenta(direccion, etiquetaRol);

    const server = new S.rpc.Server(window.ChainConfig.sorobanRpcUrl);
    let entradas;

    if (!state.entriesXdr) {
      // Primera firma: construye la invocación y simula (modo "recording")
      // para que el host nos diga qué direcciones deben autorizar.
      const args = window.ChainArgs.buildRegisterProjectArgs({
        projectId: state.projectId,
        constructora: state.constructora,
        interventor: state.interventor,
        administrador: state.administrador,
        token: state.token,
        presupuestoTotal: state.presupuestoTotal,
        hashCronograma: state.hashCronograma,
        hitos: state.hitos
      });
      const scArgs = window.ChainArgs.toScVals(args, S, window.ChainUuid);
      const contract = new S.Contract(window.ChainConfig.escrowContractId);
      // Cuenta "de usar y tirar" SOLO para simular (el administrador arma la
      // transacción real con la suya al final). Importante: NO puede ser la
      // dirección de ninguno de los 3 firmantes — si la cuenta de origen
      // coincide con una de las direcciones que debe autorizar, Soroban la
      // da por autorizada "implícitamente" (por ser quien firma el sobre) y
      // NO genera una entrada de autorización separada para ella, así que
      // después no hay nada que firmar para esa persona.
      const cuenta = new S.Account(S.Keypair.random().publicKey(), '0');
      const tx = new S.TransactionBuilder(cuenta, { fee: S.BASE_FEE, networkPassphrase: window.ChainConfig.networkPassphrase })
        .addOperation(contract.call('register_project', ...scArgs))
        .setTimeout(30)
        .build();

      const sim = await server.simulateTransaction(tx);
      if (S.rpc.Api.isSimulationError(sim)) {
        throw new Error(window.ChainErrors.traducir(sim.error));
      }
      entradas = sim.result.auth;
      state.funcXdr = tx.operations[0].func.toXDR('base64');
      state.entriesXdr = entradas.map((e) => e.toXDR('base64'));
      guardarEstado(state);
    } else {
      entradas = state.entriesXdr.map((x) => S.xdr.SorobanAuthorizationEntry.fromXDR(x, 'base64'));
    }

    const ledgerActual = (await server.getLatestLedger()).sequence;

    // Si alguien ya firmó antes que yo, que no se le haya vencido la firma.
    const otros = [state.constructora, state.interventor, state.administrador].filter((d) => d !== direccion);
    verificarNoCaducadas(state, entradas, S, otros, ledgerActual);

    const idx = encontrarIndicePorDireccion(entradas, S, direccion);
    if (idx === -1) throw new Error('No se encontró una entrada de autorización para ' + direccion + ' en esta invocación.');

    const validoHasta = ledgerActual + ventanaLedgers;
    if (esPruebaLocal) {
      const entradaFirmadaXdr = await proveedor.firmarEntrada({ rol: etiquetaRol, entradaXdr: entradas[idx].toXDR('base64'), validUntilLedgerSeq: validoHasta });
      entradas[idx] = S.xdr.SorobanAuthorizationEntry.fromXDR(entradaFirmadaXdr, 'base64');
    } else {
      const firmada = await S.authorizeEntry(entradas[idx], crearFirmanteFreighter(direccion), validoHasta, window.ChainConfig.networkPassphrase);
      entradas[idx] = firmada;
    }

    state.entriesXdr = entradas.map((e) => e.toXDR('base64'));
    guardarEstado(state);

    return { state, entradas };
  }

  async function firmarConstructora(projectId, proveedor) {
    const state0 = obtenerEstado(projectId);
    if (!state0) throw new Error('No hay datos guardados para el proyecto ' + projectId + '.');
    const { state } = await firmarEntradaPropia(projectId, state0.constructora, 'constructora', VENTANA_CONSTRUCTORA_LEDGERS, proveedor);
    state.signedBy.constructora = true;
    state.status = 'firmado_constructora';
    return guardarEstado(state);
  }

  async function firmarInterventor(projectId, proveedor) {
    const state0 = obtenerEstado(projectId);
    if (!state0) throw new Error('No hay datos guardados para el proyecto ' + projectId + '.');
    const { state } = await firmarEntradaPropia(projectId, state0.interventor, 'interventor', VENTANA_INTERVENTOR_LEDGERS, proveedor);
    state.signedBy.interventor = true;
    state.status = 'firmado_interventor';
    return guardarEstado(state);
  }

  /** Espera a que la transacción quede confirmada (o fallida), sondeando getTransaction. */
  async function esperarConfirmacion(server, hash, intentos, esperaMs) {
    intentos = intentos || 15;
    esperaMs = esperaMs || 2000;
    for (let i = 0; i < intentos; i++) {
      const res = await server.getTransaction(hash);
      if (res.status !== 'NOT_FOUND') return res;
      await new Promise((r) => setTimeout(r, esperaMs));
    }
    return { status: 'NOT_FOUND' };
  }

  /** Último paso: firma la entrada del administrador, arma la transacción, la firma, la envía y confirma. */
  async function firmarYEnviarAdministrador(projectId, proveedor) {
    await window.ChainConfig.vendorReady;
    const S = window.StellarSdk;
    const state0 = obtenerEstado(projectId);
    if (!state0) throw new Error('No hay datos guardados para el proyecto ' + projectId + '.');
    const esPruebaLocal = proveedor && proveedor.nombre === 'pruebaLocal';

    const { state, entradas } = await firmarEntradaPropia(projectId, state0.administrador, 'administrador', VENTANA_ADMINISTRADOR_LEDGERS, proveedor);

    const server = new S.rpc.Server(window.ChainConfig.sorobanRpcUrl);
    const direccionAdmin = state.administrador;
    const func = S.xdr.HostFunction.fromXDR(state.funcXdr, 'base64');

    const cuentaAdmin = await server.getAccount(direccionAdmin);
    const freshTx = new S.TransactionBuilder(cuentaAdmin, { fee: S.BASE_FEE, networkPassphrase: window.ChainConfig.networkPassphrase })
      .addOperation(S.Operation.invokeHostFunction({ func, auth: entradas }))
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(freshTx);
    if (S.rpc.Api.isSimulationError(sim)) {
      state.status = 'error';
      state.lastError = window.ChainErrors.traducir(sim.error);
      guardarEstado(state);
      throw new Error(state.lastError);
    }

    const assembled = S.rpc.assembleTransaction(freshTx, sim).build();
    let signedTx;
    if (esPruebaLocal) {
      const transaccionFirmadaXdr = await proveedor.firmarTransaccion({ rol: 'administrador', transaccionXdr: assembled.toXDR() });
      signedTx = new S.Transaction(transaccionFirmadaXdr, window.ChainConfig.networkPassphrase);
    } else {
      const signRes = await window.freighterApi.signTransaction(assembled.toXDR(), {
        networkPassphrase: window.ChainConfig.networkPassphrase,
        address: direccionAdmin
      });
      if (signRes.error) {
        throw new Error(window.ChainErrors.traducir(signRes.error.message || JSON.stringify(signRes.error)));
      }
      signedTx = new S.Transaction(signRes.signedTxXdr, window.ChainConfig.networkPassphrase);
    }
    const sendRes = await server.sendTransaction(signedTx);
    if (sendRes.status === 'ERROR') {
      const mensaje = window.ChainErrors.traducir(sendRes.errorResult ? sendRes.errorResult.toXDR('base64') : 'La red rechazó la transacción.');
      state.status = 'error';
      state.lastError = mensaje;
      guardarEstado(state);
      throw new Error(mensaje);
    }

    const resultado = await esperarConfirmacion(server, sendRes.hash);
    state.signedBy.administrador = true;
    state.txHash = sendRes.hash;

    if (resultado.status !== 'SUCCESS') {
      state.status = 'error';
      state.lastError = 'La transacción se envió (hash ' + sendRes.hash + ') pero no se confirmó como exitosa (estado: ' + resultado.status + ').';
      guardarEstado(state);
      throw new Error(state.lastError);
    }

    state.status = 'confirmado';
    state.confirmedAt = new Date().toISOString();
    guardarEstado(state);

    const proyectoOnChain = await window.ChainContract.getProject(projectId);

    return {
      txHash: sendRes.hash,
      explorerUrl: window.ChainConfig.explorerUrl + '/tx/' + sendRes.hash,
      proyectoOnChain
    };
  }

  window.ChainRegister = {
    VENTANA_CONSTRUCTORA_LEDGERS,
    VENTANA_INTERVENTOR_LEDGERS,
    VENTANA_ADMINISTRADOR_LEDGERS,
    obtenerEstado,
    prepararProyecto,
    resumenParaFirmar,
    vigenciaFirmas,
    etiquetaPorDireccion,
    verificarNoCaducadas,
    firmarConstructora,
    firmarInterventor,
    firmarYEnviarAdministrador
  };
})();
