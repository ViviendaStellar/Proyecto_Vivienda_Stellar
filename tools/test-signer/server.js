#!/usr/bin/env node
/* INN-LOCK · Servicio local de firma para pruebas en testnet, SIN Freighter.
   Solo para no tener que cambiar de cuenta en la extensión en cada prueba
   manual. Freighter sigue siendo el proveedor real para producción/demo
   normal; esto es un segundo proveedor ("pruebaLocal") que el frontend
   puede usar solo en testnet + localhost.

   Arranque seguro (las 3 condiciones deben cumplirse, en este orden, antes
   de tocar ninguna llave):
     1. INNLOCK_TEST_SIGNER=1 en el entorno (nunca por defecto).
     2. La red configurada es exactamente testnet (passphrase + RPC + lo que
        responde el propio RPC).
     3. Las 3 identidades son exactamente inn-constructora/inn-interventor/
        inn-admin (ver tools/e2e-testnet/lib/claves.js, que se reutiliza
        tal cual, sin copiarlo).

   Las llaves se piden una sola vez al arrancar, con la CLI de Stellar
   (`stellar keys secret <nombre>`), y quedan SOLO en la variable `llaves`
   de esta función — nunca se exportan, nunca se vuelven a leer de la CLI,
   nunca se imprimen ni se incluyen en ninguna respuesta o error. */
'use strict';
const http = require('node:http');
const path = require('node:path');

const ctx = require(path.join('..', 'e2e-testnet', 'lib', 'sdk.js'));
const { verificarRedTestnet, verificarNombresDeIdentidad } = require(path.join('..', 'e2e-testnet', 'lib', 'seguridad.js'));
const { IDENTIDADES, obtenerKeypair } = require(path.join('..', 'e2e-testnet', 'lib', 'claves.js'));
const listaBlanca = require(path.join(__dirname, 'lib', 'lista-blanca.js'));

const HOST = '127.0.0.1';
const PUERTO = 4181;
const ORIGENES_PERMITIDOS = new Set(['http://localhost:4180', 'http://127.0.0.1:4180']);
const HOSTS_PERMITIDOS = new Set(['localhost:4181', '127.0.0.1:4181']);
const CUERPO_MAXIMO = 64 * 1024; // 64 KB: de sobra para un XDR de esta invocación, chico a propósito

function cabecerasCors(res, origen) {
  res.setHeader('Access-Control-Allow-Origin', origen);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function enviarJson(res, codigo, cuerpo, origen) {
  if (origen) cabecerasCors(res, origen);
  const texto = JSON.stringify(cuerpo);
  res.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(texto) });
  res.end(texto);
}

function enviarError(res, codigo, mensaje, origen) {
  enviarJson(res, codigo, { ok: false, error: mensaje }, origen);
}

/** Valida Host (de este servicio) y Origin (de quien llama) ANTES de leer el cuerpo o tocar cualquier llave. */
function validarOrigenYHost(req) {
  const host = req.headers.host;
  if (!HOSTS_PERMITIDOS.has(host)) {
    return { ok: false, motivo: 'Host no permitido: "' + host + '". Este servicio solo responde en localhost:4181/127.0.0.1:4181.' };
  }
  const origen = req.headers.origin;
  if (!origen || !ORIGENES_PERMITIDOS.has(origen)) {
    return { ok: false, motivo: 'Origin no permitido: "' + (origen || '(sin Origin)') + '". Solo se acepta http://localhost:4180 o http://127.0.0.1:4180.' };
  }
  return { ok: true, origen };
}

function leerCuerpoJson(req) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const partes = [];
    req.on('data', (fragmento) => {
      total += fragmento.length;
      if (total > CUERPO_MAXIMO) { reject(new Error('Cuerpo de la solicitud demasiado grande.')); req.destroy(); return; }
      partes.push(fragmento);
    });
    req.on('end', () => {
      try { resolve(partes.length ? JSON.parse(Buffer.concat(partes).toString('utf8')) : {}); }
      catch (e) { reject(new Error('Cuerpo JSON inválido.')); }
    });
    req.on('error', reject);
  });
}

/** Imprime un resumen legible SIN llaves antes de firmar. */
function registrarResumen(accion, rol, resumen) {
  console.log('[test-signer] ' + accion + ' — rol=' + rol + ' contrato=' + resumen.contrato + ' función=' + resumen.funcion +
    (resumen.projectId ? ' proyecto=' + resumen.projectId : '') + (resumen.hashCronograma ? ' hash=' + resumen.hashCronograma : ''));
}

async function manejarFirmarEntrada(req, res, llaves, origen) {
  const cuerpo = await leerCuerpoJson(req);
  const { rol, entradaXdr, validUntilLedgerSeq } = cuerpo || {};
  const kp = llaves[rol];
  if (!kp) return enviarError(res, 400, 'Rol desconocido: "' + rol + '".', origen);

  const S = ctx.StellarSdk;
  let entrada;
  try { entrada = S.xdr.SorobanAuthorizationEntry.fromXDR(String(entradaXdr), 'base64'); }
  catch (e) { return enviarError(res, 400, 'entradaXdr no es un XDR válido de SorobanAuthorizationEntry.', origen); }

  let datos;
  try { datos = listaBlanca.datosDesdeEntrada(S, entrada); }
  catch (e) { return enviarError(res, 400, e.message, origen); }

  const chequeo = listaBlanca.validarContraListaBlanca(ctx, datos);
  if (!chequeo.ok) return enviarError(res, 403, chequeo.motivo, origen);

  const direccionEntrada = S.inspectAuthEntry(entrada).address;
  if (direccionEntrada !== kp.publicKey()) {
    return enviarError(res, 400, 'La entrada de autorización no corresponde a la dirección de "' + rol + '".', origen);
  }

  const ventana = Number(validUntilLedgerSeq);
  if (!Number.isInteger(ventana) || ventana <= 0) return enviarError(res, 400, 'validUntilLedgerSeq inválido.', origen);

  registrarResumen('firmando entrada de autorización', rol, listaBlanca.resumenParaRegistro(ctx, datos));

  const firmada = await S.authorizeEntry(entrada, kp, ventana, ctx.ChainConfig.networkPassphrase);
  return enviarJson(res, 200, { ok: true, entradaFirmadaXdr: firmada.toXDR('base64') }, origen);
}

async function manejarFirmarTransaccion(req, res, llaves, origen) {
  const cuerpo = await leerCuerpoJson(req);
  const { rol, transaccionXdr } = cuerpo || {};
  const kp = llaves[rol];
  if (!kp) return enviarError(res, 400, 'Rol desconocido: "' + rol + '".', origen);

  const S = ctx.StellarSdk;
  let tx;
  try { tx = new S.Transaction(String(transaccionXdr), ctx.ChainConfig.networkPassphrase); }
  catch (e) { return enviarError(res, 400, 'transaccionXdr no es un XDR válido de Transaction.', origen); }

  let datos;
  try { datos = listaBlanca.datosDesdeTransaccion(S, tx); }
  catch (e) { return enviarError(res, 400, e.message, origen); }

  const chequeo = listaBlanca.validarContraListaBlanca(ctx, datos);
  if (!chequeo.ok) return enviarError(res, 403, chequeo.motivo, origen);

  if (tx.source !== kp.publicKey()) {
    return enviarError(res, 400, 'La transacción no tiene a "' + rol + '" como cuenta de origen (quien firma el sobre debe ser quien paga la tarifa).', origen);
  }

  registrarResumen('firmando transacción', rol, listaBlanca.resumenParaRegistro(ctx, datos));

  tx.sign(kp);
  return enviarJson(res, 200, { ok: true, transaccionFirmadaXdr: tx.toXDR() }, origen);
}

async function manejar(req, res, llaves) {
  const validacion = validarOrigenYHost(req);

  if (req.method === 'OPTIONS') {
    if (!validacion.ok) return enviarError(res, 403, validacion.motivo);
    cabecerasCors(res, validacion.origen);
    res.writeHead(204);
    return res.end();
  }
  if (!validacion.ok) return enviarError(res, 403, validacion.motivo);
  const origen = validacion.origen;

  if (req.method === 'GET' && req.url === '/salud') {
    return enviarJson(res, 200, { ok: true, red: 'testnet', identidades: Object.keys(llaves) }, origen);
  }
  if (req.method === 'POST' && req.url === '/firmar-entrada') return manejarFirmarEntrada(req, res, llaves, origen);
  if (req.method === 'POST' && req.url === '/firmar-transaccion') return manejarFirmarTransaccion(req, res, llaves, origen);
  return enviarError(res, 404, 'Ruta no encontrada.', origen);
}

async function arrancar() {
  if (process.env.INNLOCK_TEST_SIGNER !== '1') {
    throw new Error('No arranco: falta INNLOCK_TEST_SIGNER=1 en el entorno (es intencional, para que este servicio nunca quede corriendo por accidente).');
  }
  await verificarRedTestnet(ctx.StellarSdk, ctx.ChainConfig);
  verificarNombresDeIdentidad(IDENTIDADES);

  const llaves = Object.freeze({
    constructora: obtenerKeypair(ctx.StellarSdk, 'constructora'),
    interventor: obtenerKeypair(ctx.StellarSdk, 'interventor'),
    administrador: obtenerKeypair(ctx.StellarSdk, 'administrador')
  });

  const server = http.createServer((req, res) => {
    manejar(req, res, llaves).catch((e) => {
      console.error('[test-signer] error interno:', e.message);
      try { enviarError(res, 500, 'Error interno del servicio.'); } catch (x) { /* la respuesta ya pudo haber empezado */ }
    });
  });

  await new Promise((resolve) => server.listen(PUERTO, HOST, resolve));
  console.log('[test-signer] escuchando en http://' + HOST + ':' + PUERTO + ' — SOLO testnet, SOLO para pruebas locales.');
  console.log('[test-signer] identidades cargadas: ' + Object.keys(llaves).join(', ') + ' (las llaves nunca se imprimen ni se vuelven a leer de la CLI).');
  console.log('[test-signer] Origin permitido: ' + Array.from(ORIGENES_PERMITIDOS).join(', '));
  return server;
}

module.exports = { arrancar, validarOrigenYHost, manejar };

if (require.main === module) {
  arrancar().catch((e) => { console.error('[test-signer] no se pudo arrancar:', e.message); process.exit(1); });
}
