#!/usr/bin/env node
/* INN-LOCK · Prueba automatizada de punta a punta de register_project en
   testnet, sin Freighter: firma constructora, interventor y administrador
   POR SEPARADO (3 funciones distintas, llamadas en momentos distintos — no
   hay ningún --auto-sign), el administrador firma último y envía, y al
   final se relee get_project y se compara contra lo que se firmó.

   También corre 5 casos negativos (cuenta equivocada, cronograma
   modificado, firma caducada, registro doble, suma de porcentajes
   incorrecta), cada uno con su mensaje en español.

   SEGURIDAD: se niega a correr si la red no es exactamente testnet, o si
   intentara pedir una llave que no sea de inn-constructora/inn-interventor/
   inn-admin. Las llaves se obtienen de la CLI de Stellar en el momento,
   viven solo en memoria y nunca se imprimen, registran ni escriben a disco.

   Uso: node run.js   (desde tools/e2e-testnet/) */
'use strict';

const ctx = require('./lib/sdk.js');
const { verificarRedTestnet, verificarNombresDeIdentidad } = require('./lib/seguridad.js');
const { IDENTIDADES, obtenerKeypair } = require('./lib/claves.js');
const { construirProyectoMuestra } = require('./lib/proyecto-muestra.js');
const firma = require('./lib/firma.js');

const VENTANA_LARGA = 120960; // ~7 días, igual que el frontend (ver register.js)
const VENTANA_ADMIN = 60; // ~5 minutos
const VENTANA_CORTISIMA_PRUEBA = 2; // ~10s — SOLO para el caso negativo (c), nunca en producción

function linea(titulo) { console.log('\n=== ' + titulo + ' ==='); }

function direccionesDe(kp) {
  return { constructora: kp.constructora.publicKey(), interventor: kp.interventor.publicKey(), administrador: kp.administrador.publicKey() };
}

async function obtenerLas3Llaves() {
  return {
    constructora: obtenerKeypair(ctx.StellarSdk, 'constructora'),
    interventor: obtenerKeypair(ctx.StellarSdk, 'interventor'),
    administrador: obtenerKeypair(ctx.StellarSdk, 'administrador')
  };
}

function compararProyecto(datos, onChain) {
  const checks = [
    ['constructora', datos.constructora, onChain.constructora],
    ['interventor', datos.interventor, onChain.interventor],
    ['administrador', datos.administrador, onChain.administrador],
    ['token', datos.token, onChain.token],
    ['hash_cronograma', datos.hashCronograma, Buffer.from(onChain.hash_cronograma).toString('hex')],
    ['presupuesto_total', datos.presupuestoTotal, String(onChain.presupuesto_total)],
    ['activo', true, onChain.activo],
    ['congelado', false, onChain.congelado],
    ['milestone_count', datos.hitos.length, onChain.milestone_count]
  ];
  let fallas = 0;
  for (const [campo, esperado, real] of checks) {
    const ok = String(esperado) === String(real);
    console.log('  ' + (ok ? '✔' : '✘') + ' ' + campo + ' = ' + real + (ok ? '' : ' (esperado ' + esperado + ')'));
    if (!ok) fallas++;
  }
  if (fallas > 0) throw new Error('get_project no coincide con lo firmado (' + fallas + ' campo(s) distinto(s)).');
  console.log('  ✔ get_project coincide con lo que se firmó.');
}

/** Flujo feliz: constructora → interventor → administrador, cada uno en su propia llamada. Devuelve los datos y el resultado para reutilizarlos en el caso negativo (d). */
async function flujoFeliz() {
  linea('Cuentas y proyecto de muestra');
  const kp = await obtenerLas3Llaves();
  const direcciones = direccionesDe(kp);
  const datos = construirProyectoMuestra(ctx.deployment, direcciones);
  console.log('project_id (uuid nuevo en esta corrida):', datos.projectId);
  console.log('constructora:', direcciones.constructora);
  console.log('interventor :', direcciones.interventor);
  console.log('administrador:', direcciones.administrador);

  const estado = firma.crearEstado(datos);

  linea('ETAPA 1/3 — Constructora firma');
  const sim = await firma.prepararSimulacion(ctx, datos);
  estado.funcXdr = sim.funcXdr;
  estado.entradas = sim.entradas;
  await firma.firmarRol(ctx, estado, 'constructora', kp.constructora, VENTANA_LARGA);
  console.log('Constructora firmó su entrada (1 de 3).');

  linea('ETAPA 2/3 — Interventor firma');
  await firma.firmarRol(ctx, estado, 'interventor', kp.interventor, VENTANA_LARGA);
  console.log('Interventor firmó su entrada (2 de 3).');

  linea('ETAPA 3/3 — Administrador firma y envía');
  const resultado = await firma.firmarYEnviarAdministrador(ctx, estado, kp.administrador, VENTANA_ADMIN);
  console.log('Confirmado en testnet.');
  console.log('tx:', resultado.txHash);
  console.log('Explorador:', resultado.explorerUrl);

  linea('Verificación (get_project)');
  compararProyecto(datos, resultado.proyectoOnChain);

  return { datos, resultado };
}

async function negativoCuentaEquivocada() {
  const kp = await obtenerLas3Llaves();
  const direcciones = direccionesDe(kp);
  const datos = construirProyectoMuestra(ctx.deployment, direcciones);
  const estado = firma.crearEstado(datos);
  const sim = await firma.prepararSimulacion(ctx, datos);
  estado.funcXdr = sim.funcXdr; estado.entradas = sim.entradas;
  try {
    await firma.firmarRol(ctx, estado, 'interventor', kp.constructora, VENTANA_LARGA); // llave de constructora, pretendiendo firmar como interventor
    throw new Error('Debía rechazar una firma de la cuenta equivocada y no lo hizo.');
  } catch (e) {
    if (e.code !== 'CUENTA_INCORRECTA') throw e;
    console.log('  ✔ rechazado como se esperaba: ' + e.message);
  }
}

async function negativoCronogramaModificado() {
  const kp = await obtenerLas3Llaves();
  const direcciones = direccionesDe(kp);
  const datosV1 = construirProyectoMuestra(ctx.deployment, direcciones);
  const estado = firma.crearEstado(datosV1);
  const simV1 = await firma.prepararSimulacion(ctx, datosV1);
  estado.funcXdr = simV1.funcXdr; estado.entradas = simV1.entradas;
  await firma.firmarRol(ctx, estado, 'constructora', kp.constructora, VENTANA_LARGA);
  const entradasFirmadasV1 = estado.entradas.map((e) => e.toXDR('base64'));

  const datosV2 = JSON.parse(JSON.stringify(datosV1));
  datosV2.hitos[0].percentageBps = 1600;
  datosV2.hitos[5].percentageBps = 1600; // sigue sumando 10000, pero ya no es el mismo cronograma

  const { hex: hashV1 } = await ctx.ChainCanonical.hashProject(datosV1);
  const { hex: hashV2 } = await ctx.ChainCanonical.hashProject(datosV2);
  if (hashV1 === hashV2) throw new Error('El hash no cambió al modificar el cronograma (no debería pasar).');
  console.log('  ✔ el hash cambia al modificar el cronograma: ' + hashV1.slice(0, 10) + '… → ' + hashV2.slice(0, 10) + '…');

  const simV2 = await firma.prepararSimulacion(ctx, datosV2);
  const entradasV2 = simV2.entradas.map((e) => e.toXDR('base64'));
  if (JSON.stringify(entradasV2) === JSON.stringify(entradasFirmadasV1)) {
    throw new Error('Las entradas de autorización no cambiaron al modificar el cronograma (deberían).');
  }
  console.log('  ✔ la nueva simulación produce entradas distintas: la firma de constructora sobre la v1 queda descartada y hay que pedirla de nuevo sobre la v2.');
}

async function negativoFirmaCaducada() {
  const kp = await obtenerLas3Llaves();
  const direcciones = direccionesDe(kp);
  const datos = construirProyectoMuestra(ctx.deployment, direcciones);
  const estado = firma.crearEstado(datos);
  const sim = await firma.prepararSimulacion(ctx, datos);
  estado.funcXdr = sim.funcXdr; estado.entradas = sim.entradas;

  await firma.firmarRol(ctx, estado, 'constructora', kp.constructora, VENTANA_CORTISIMA_PRUEBA);
  console.log('  Constructora firmó con una ventana de ' + VENTANA_CORTISIMA_PRUEBA + ' ledgers (~10s) — SOLO para esta prueba.');

  const server = new ctx.StellarSdk.rpc.Server(ctx.ChainConfig.sorobanRpcUrl);
  const inicio = (await server.getLatestLedger()).sequence;
  console.log('  Esperando a que avancen los ledgers para que esa firma caduque...');
  let actual = inicio;
  while (actual <= inicio + VENTANA_CORTISIMA_PRUEBA) {
    await new Promise((r) => setTimeout(r, 4000));
    actual = (await server.getLatestLedger()).sequence;
  }

  try {
    await firma.firmarRol(ctx, estado, 'interventor', kp.interventor, VENTANA_LARGA);
    throw new Error('Debía rechazar por firma caducada y no lo hizo.');
  } catch (e) {
    if (e.code !== 'FIRMA_CADUCADA') throw e;
    console.log('  ✔ rechazado como se esperaba: ' + e.message);
  }

  await firma.firmarRol(ctx, estado, 'constructora', kp.constructora, VENTANA_LARGA);
  console.log('  ✔ constructora volvió a firmar (solo ella, nadie más tuvo que repetir nada).');
  await firma.firmarRol(ctx, estado, 'interventor', kp.interventor, VENTANA_LARGA);
  console.log('  ✔ interventor firmó sin problema tras la renovación.');
}

async function negativoRegistroDoble(datosYaRegistrado) {
  try {
    await firma.prepararSimulacion(ctx, datosYaRegistrado);
    throw new Error('Debía rechazar el registro doble del mismo proyecto y no lo hizo.');
  } catch (e) {
    if (!/ya está registrado/i.test(e.message)) throw e;
    console.log('  ✔ rechazado como se esperaba: ' + e.message);
  }
}

async function negativoSumaIncorrecta() {
  const kp = await obtenerLas3Llaves();
  const direcciones = direccionesDe(kp);
  const datos = construirProyectoMuestra(ctx.deployment, direcciones);
  datos.hitos[datos.hitos.length - 1].percentageBps -= 1000; // ahora suma 9000, no 10000
  try {
    await firma.prepararSimulacion(ctx, datos);
    throw new Error('Debía rechazar una suma de porcentajes distinta de 10000 y no lo hizo.');
  } catch (e) {
    if (!/no suman exactamente 100/i.test(e.message)) throw e;
    console.log('  ✔ rechazado como se esperaba: ' + e.message);
  }
}

async function main() {
  const reporte = [];
  async function caso(nombre, fn) {
    linea('Caso negativo — ' + nombre);
    try { await fn(); reporte.push([nombre, true, null]); }
    catch (e) { reporte.push([nombre, false, e.message]); console.log('  ✘ FALLÓ:', e.message); }
  }

  linea('Seguridad (antes de pedir ninguna llave)');
  await verificarRedTestnet(ctx.StellarSdk, ctx.ChainConfig);
  verificarNombresDeIdentidad(IDENTIDADES);
  console.log('Red verificada: exactamente testnet.');
  console.log('Identidades permitidas:', Object.values(IDENTIDADES).join(', '));

  let feliz;
  try {
    feliz = await flujoFeliz();
  } catch (e) {
    console.log('\n✘ El flujo feliz (constructora → interventor → administrador) FALLÓ: ' + e.message);
    process.exit(1);
  }

  await caso('(a) firma de una cuenta distinta a la del rol', negativoCuentaEquivocada);
  await caso('(b) cronograma modificado después de firmar', negativoCronogramaModificado);
  await caso('(c) firma caducada (ventana corta solo en la prueba)', negativoFirmaCaducada);
  await caso('(d) registrar dos veces el mismo proyecto', () => negativoRegistroDoble(feliz.datos));
  await caso('(e) suma de porcentajes distinta de 10000', negativoSumaIncorrecta);

  linea('Reporte final');
  console.log('Flujo feliz: ✔ confirmado en testnet.');
  console.log('  tx:', feliz.resultado.txHash);
  console.log('  Explorador:', feliz.resultado.explorerUrl);
  let fallas = 0;
  for (const [nombre, ok, mensaje] of reporte) {
    console.log('  ' + (ok ? '✔' : '✘') + ' ' + nombre + (ok ? '' : ' — ' + mensaje));
    if (!ok) fallas++;
  }
  console.log('\n' + (fallas === 0 ? reporte.length + '/' + reporte.length + ' casos negativos se comportaron como se esperaba.' : fallas + ' caso(s) negativo(s) NO se comportaron como se esperaba.'));
  if (fallas > 0) process.exit(1);
}

main().catch((e) => { console.error('\nERROR:', e.message); process.exit(1); });
