/* INN-LOCK · Puente entre la pantalla real (js/wizard.js, modo demo) y la
   capa de firmas en cadena (js/chain/register.js). Solo se usa cuando el
   modo de cadena es testnet (ver js/chain/config.js); en modo simulado
   (el predeterminado) nada de este archivo se ejecuta y la app funciona
   exactamente como antes del Paso 8.

   Límite conocido de este piloto (ver docs/semana3/ARQUITECTURA_ONCHAIN.md):
   las 3 direcciones que firman son las 3 cuentas de prueba compartidas de
   `window.ChainConfig.testRoles`, sin importar cuál constructora/interventor
   reales estén asignados al proyecto en la demo. Cuando exista un usuario
   por persona (con su propia dirección), esto se reemplaza en la migración
   de base de datos, no antes. */
(function () {
  'use strict';

  function disponible() {
    return !!(window.ChainConfig && window.ChainConfig.isTestnet);
  }

  /** Asegura que el proyecto tenga un id de cadena (UUID) estable. No persiste: quien llama debe hacer ctx.persist() si lo generó. */
  function aseguraIdDeCadena(p) {
    if (!p.reg.chainProjectId) {
      p.reg.chainProjectId = (crypto.randomUUID ? crypto.randomUUID() : ChainUuidAleatorio());
    }
    return p.reg.chainProjectId;
  }

  function ChainUuidAleatorio() {
    // Respaldo por si algún navegador no tiene crypto.randomUUID (poco probable en 2026).
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return window.ChainUuid.bytesToUuid(bytes);
  }

  /** Convierte el porcentaje (0-100, puede tener decimales) de cada hito a puntos base (0-10000) que sumen EXACTO 10000. */
  function hitosABps(monthsData) {
    const bps = monthsData.map((m) => Math.round((Number(m.tranchePct) || 0) * 100));
    const suma = bps.reduce((a, b) => a + b, 0);
    if (bps.length) bps[bps.length - 1] += 10000 - suma; // ajusta el redondeo en el último hito, igual que fixTotal() del asistente
    return bps;
  }

  /** Arma los datos que espera ChainRegister.prepararProyecto a partir de un proyecto del asistente (ver js/wizard.js build()). */
  function datosDeProyecto(p) {
    const direcciones = window.ChainConfig.testRoles;
    const bps = hitosABps(p.monthsData);
    const hitos = p.monthsData.map((m, i) => ({
      deadline: Math.floor(new Date(m.year, m.month, 1, 12, 0, 0).getTime() / 1000),
      percentageBps: bps[i]
    }));
    return {
      projectId: aseguraIdDeCadena(p),
      constructora: direcciones.constructora,
      interventor: direcciones.interventor,
      administrador: direcciones.administrador,
      token: window.ChainConfig.tokenContractId,
      // Simplificación del piloto: se usa el presupuesto (en pesos, tal como
      // lo captura el asistente) directamente como unidades del token de
      // prueba. No hay conversión real a una moneda ni a stroops: el token
      // de testnet no representa dinero real. Documentado en
      // docs/semana3/ARQUITECTURA_ONCHAIN.md.
      presupuestoTotal: String(Math.round(Number(p.budget) || 0)),
      hitos
    };
  }

  /** Lanza un error claro si los datos actuales del proyecto ya no corresponden al hash con el que se firmó la última vez. */
  async function verificarVigente(p) {
    const chainId = aseguraIdDeCadena(p);
    const estado = window.ChainRegister.obtenerEstado(chainId);
    if (!estado) {
      const err = new Error('Este proyecto todavía no tiene datos preparados para firmar en cadena. La constructora debe guardarlo primero (vuelve a intentar el envío).');
      err.code = 'SIN_PREPARAR';
      throw err;
    }
    const datosActuales = datosDeProyecto(p);
    const { hex } = await window.ChainCanonical.hashProject(datosActuales);
    if (hex !== estado.hashCronograma) {
      const err = new Error('Los datos del proyecto cambiaron desde la última firma guardada. Hay que volver a empezar: pide que la constructora lo guarde y firme de nuevo.');
      err.code = 'HASH_DESACTUALIZADO';
      throw err;
    }
    return estado;
  }

  /** ¿Está corriendo tools/test-signer ahora mismo? Solo tiene sentido preguntarlo en testnet; en modo simulado siempre es false. */
  async function disponibleFirmaDePrueba() {
    if (!disponible()) return false;
    return window.ChainFirmantes ? window.ChainFirmantes.disponiblePruebaLocal() : false;
  }

  /** Paso de la constructora: prepara (o reutiliza) los datos y firma su propia entrada. `proveedor` es opcional: por defecto Freighter; pasa `window.ChainFirmantes.proveedorPruebaLocal()` para el botón "Firmar (modo prueba)". */
  async function firmarConstructora(p, proveedor) {
    const datos = datosDeProyecto(p);
    await window.ChainRegister.prepararProyecto(datos);
    const estado = await window.ChainRegister.firmarConstructora(datos.projectId, proveedor);
    return estado;
  }

  /** Paso del interventor: exige que los datos sigan vigentes antes de firmar. */
  async function firmarInterventor(p, proveedor) {
    await verificarVigente(p);
    const chainId = aseguraIdDeCadena(p);
    return window.ChainRegister.firmarInterventor(chainId, proveedor);
  }

  /**
   * Paso del administrador: exige datos vigentes, firma, envía, espera
   * confirmación y relee get_project del contrato para comparar contra lo
   * que se firmó. Solo si todo coincide se devuelve éxito; quien llama debe
   * activar el proyecto en la base de datos SOLO después de esto (ver
   * js/wizard.js solActivate).
   */
  async function firmarYEnviarAdministrador(p, proveedor) {
    const estadoAntes = await verificarVigente(p);
    const chainId = aseguraIdDeCadena(p);
    const resultado = await window.ChainRegister.firmarYEnviarAdministrador(chainId, proveedor);
    const onChain = resultado.proyectoOnChain;
    const hashOnChainHex = Array.from(onChain.hash_cronograma || []).map((b) => b.toString(16).padStart(2, '0')).join('');
    if (hashOnChainHex !== estadoAntes.hashCronograma || !onChain.activo) {
      const err = new Error('La transacción se confirmó, pero lo leído con get_project no coincide con lo que se firmó. No se activa el proyecto en la base de datos; revisa manualmente antes de reintentar.');
      err.code = 'VERIFICACION_FALLIDA';
      err.resultado = resultado;
      throw err;
    }
    return resultado;
  }

  /** El estado crudo guardado por ChainRegister para este proyecto (o null si nunca se preparó). */
  function estadoGuardado(p) {
    const chainId = p.reg.chainProjectId;
    if (!chainId) return null;
    return window.ChainRegister.obtenerEstado(chainId);
  }

  /** Para el botón de reintento tras un fallo al guardar en la base DESPUÉS de una tx confirmada: solo repite si la cadena ya quedó confirmada. */
  function yaConfirmadoEnCadena(p) {
    const estado = estadoGuardado(p);
    return !!(estado && estado.status === 'confirmado');
  }

  window.ChainDemo = {
    disponible,
    disponibleFirmaDePrueba,
    datosDeProyecto,
    verificarVigente,
    firmarConstructora,
    firmarInterventor,
    firmarYEnviarAdministrador,
    estadoGuardado,
    yaConfirmadoEnCadena
  };
})();
