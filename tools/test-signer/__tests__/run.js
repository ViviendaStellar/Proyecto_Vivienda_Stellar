// INN-LOCK · Pruebas del servicio tools/test-signer: arranque seguro, Origin
// ajeno, lista blanca reconstruida desde el XDR (contrato distinto, función
// distinta, XDR malformado) y que ninguna llave secreta aparezca jamás en
// la salida del proceso. Toca la red real (verificarRedTestnet) y la CLI
// real de Stellar (para cargar las 3 llaves), igual que tools/e2e-testnet;
// nunca envía una transacción de verdad, solo firma auth entries offline.
// Uso: node __tests__/run.js (desde tools/test-signer/)
'use strict';
const http = require('node:http');
const path = require('node:path');

let pass = 0, fail = 0;
async function ok(name, fn) {
  try { await fn(); pass++; console.log('  ✔', name); }
  catch (e) { fail++; console.log('  ✘', name, '→', e.message); }
}
function eq(a, b, msg) { if (a !== b) throw new Error((msg || '') + ' esperado ' + JSON.stringify(b) + ', obtenido ' + JSON.stringify(a)); }

// --- Vigilancia de fuga de llaves: intercepta TODA la salida de este
// proceso desde este punto en adelante (antes de cargar ninguna llave). ---
const salidaCapturada = [];
const origStdoutWrite = process.stdout.write.bind(process.stdout);
const origStderrWrite = process.stderr.write.bind(process.stderr);
process.stdout.write = function (chunk, ...resto) { salidaCapturada.push(String(chunk)); return origStdoutWrite(chunk, ...resto); };
process.stderr.write = function (chunk, ...resto) { salidaCapturada.push(String(chunk)); return origStderrWrite(chunk, ...resto); };
const PATRON_LLAVE_SECRETA = /\bS[A-Z2-7]{55}\b/; // strkey de una llave secreta Ed25519: S + 55 base32

function solicitud({ method, path: ruta, headers, cuerpo }) {
  return new Promise((resolve, reject) => {
    const datos = cuerpo != null ? JSON.stringify(cuerpo) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port: 4181,
      path: ruta,
      method,
      headers: Object.assign({}, headers, datos ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(datos) } : {})
    }, (res) => {
      let cuerpoResp = '';
      res.on('data', (c) => { cuerpoResp += c; });
      res.on('end', () => {
        let json = null;
        try { json = cuerpoResp ? JSON.parse(cuerpoResp) : null; } catch (e) { /* no era JSON */ }
        resolve({ status: res.statusCode, json, texto: cuerpoResp });
      });
    });
    req.on('error', reject);
    if (datos) req.write(datos);
    req.end();
  });
}

async function construirEntradaDePrueba(S, contractId, functionName) {
  const kp = S.Keypair.random(); // cuenta de usar y tirar, solo para esta prueba
  const invocation = new S.xdr.SorobanAuthorizedInvocation({
    function: S.xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
      new S.xdr.InvokeContractArgs({ contractAddress: new S.Address(contractId).toScAddress(), functionName, args: [] })
    ),
    subInvocations: []
  });
  return S.authorizeInvocation({ signer: kp, validUntilLedgerSeq: 999999999, invocation, networkPassphrase: 'Test SDF Network ; September 2015' });
}

async function main() {
  console.log('Arranque seguro');
  await ok('no arranca sin INNLOCK_TEST_SIGNER=1', async () => {
    delete process.env.INNLOCK_TEST_SIGNER;
    const { arrancar } = require(path.join('..', 'server.js'));
    let lanzo = false;
    try { await arrancar(); }
    catch (e) { lanzo = true; if (!/INNLOCK_TEST_SIGNER/.test(e.message)) throw e; }
    if (!lanzo) throw new Error('debía rechazar arrancar sin la bandera, y no lo hizo');
  });

  process.env.INNLOCK_TEST_SIGNER = '1';
  const { arrancar } = require(path.join('..', 'server.js'));
  const ctx = require(path.join('..', '..', 'e2e-testnet', 'lib', 'sdk.js'));
  const server = await arrancar();

  try {
    console.log('\nOrigin y Host');
    await ok('rechaza un Origin ajeno (https://viviendastellar.github.io) con 403', async () => {
      const r = await solicitud({ method: 'GET', path: '/salud', headers: { Host: 'localhost:4181', Origin: 'https://viviendastellar.github.io' } });
      eq(r.status, 403, 'código de estado');
      if (!/Origin no permitido/.test(r.json.error)) throw new Error('mensaje inesperado: ' + r.json.error);
    });
    await ok('acepta Origin http://localhost:4180 en /salud', async () => {
      const r = await solicitud({ method: 'GET', path: '/salud', headers: { Host: 'localhost:4181', Origin: 'http://localhost:4180' } });
      eq(r.status, 200);
      eq(r.json.ok, true);
    });
    await ok('rechaza un Host distinto aunque el Origin sea válido', async () => {
      const r = await solicitud({ method: 'GET', path: '/salud', headers: { Host: 'evil.example:4181', Origin: 'http://localhost:4180' } });
      eq(r.status, 403);
      if (!/Host no permitido/.test(r.json.error)) throw new Error('mensaje inesperado: ' + r.json.error);
    });

    console.log('\nLista blanca (reconstruida desde el XDR, nunca desde lo que mande el frontend)');
    const CABECERAS_VALIDAS = { Host: 'localhost:4181', Origin: 'http://localhost:4180' };

    await ok('rechaza una entrada que apunta a un contrato distinto del escrow de testnet', async () => {
      const entrada = await construirEntradaDePrueba(ctx.StellarSdk, ctx.ChainConfig.tokenContractId, 'register_project');
      const r = await solicitud({ method: 'POST', path: '/firmar-entrada', headers: CABECERAS_VALIDAS, cuerpo: { rol: 'constructora', entradaXdr: entrada.toXDR('base64'), validUntilLedgerSeq: 1000 } });
      eq(r.status, 403, 'código de estado');
      if (!/Contrato no permitido/.test(r.json.error)) throw new Error('mensaje inesperado: ' + r.json.error);
    });

    await ok('rechaza una entrada que apunta a una función distinta de register_project', async () => {
      const entrada = await construirEntradaDePrueba(ctx.StellarSdk, ctx.ChainConfig.escrowContractId, 'deposit');
      const r = await solicitud({ method: 'POST', path: '/firmar-entrada', headers: CABECERAS_VALIDAS, cuerpo: { rol: 'constructora', entradaXdr: entrada.toXDR('base64'), validUntilLedgerSeq: 1000 } });
      eq(r.status, 403, 'código de estado');
      if (!/Función no permitida/.test(r.json.error)) throw new Error('mensaje inesperado: ' + r.json.error);
    });

    await ok('rechaza un XDR malformado con un mensaje claro (no un error 500)', async () => {
      const r = await solicitud({ method: 'POST', path: '/firmar-entrada', headers: CABECERAS_VALIDAS, cuerpo: { rol: 'constructora', entradaXdr: 'esto-no-es-xdr-valido', validUntilLedgerSeq: 1000 } });
      eq(r.status, 400, 'código de estado');
      if (!/no es un XDR válido/.test(r.json.error)) throw new Error('mensaje inesperado: ' + r.json.error);
    });

    await ok('rechaza una transacción con una operación que no es invokeHostFunction', async () => {
      // Transacción con 1 operación de pago clásico (nunca permitida: no es una invocación al contrato).
      const S = ctx.StellarSdk;
      const kp = S.Keypair.random();
      const cuenta = new S.Account(kp.publicKey(), '0');
      const tx = new S.TransactionBuilder(cuenta, { fee: S.BASE_FEE, networkPassphrase: ctx.ChainConfig.networkPassphrase })
        .addOperation(S.Operation.payment({ destination: kp.publicKey(), asset: S.Asset.native(), amount: '1' }))
        .setTimeout(30)
        .build();
      const r = await solicitud({ method: 'POST', path: '/firmar-transaccion', headers: CABECERAS_VALIDAS, cuerpo: { rol: 'administrador', transaccionXdr: tx.toXDR() } });
      eq(r.status, 400, 'código de estado');
      if (!/Tipo de operación no permitido/.test(r.json.error)) throw new Error('mensaje inesperado: ' + r.json.error);
    });

    await ok('firma correctamente una entrada válida para register_project con el rol correcto', async () => {
      const S = ctx.StellarSdk;
      const deployment = ctx.deployment;
      const direccionConstructora = deployment.accounts.inn_constructora;
      const invocation = new S.xdr.SorobanAuthorizedInvocation({
        function: S.xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
          new S.xdr.InvokeContractArgs({ contractAddress: new S.Address(ctx.ChainConfig.escrowContractId).toScAddress(), functionName: 'register_project', args: [] })
        ),
        subInvocations: []
      });
      // Entrada SIN firmar, para la dirección real de inn-constructora (el servicio debe poder encontrarla y firmarla).
      const credenciales = S.xdr.SorobanCredentials.sorobanCredentialsAddressV2(new S.xdr.SorobanAddressCredentials({
        address: new S.Address(direccionConstructora).toScAddress(),
        nonce: S.xdr.Int64(123456789n),
        signatureExpirationLedger: 0,
        signature: S.xdr.ScVal.scvVoid()
      }));
      const entradaSinFirmar = new S.xdr.SorobanAuthorizationEntry({ credentials: credenciales, rootInvocation: invocation });
      const r = await solicitud({ method: 'POST', path: '/firmar-entrada', headers: CABECERAS_VALIDAS, cuerpo: { rol: 'constructora', entradaXdr: entradaSinFirmar.toXDR('base64'), validUntilLedgerSeq: 999999999 } });
      eq(r.status, 200, 'código de estado · ' + (r.json && r.json.error));
      if (!r.json.entradaFirmadaXdr) throw new Error('no devolvió entradaFirmadaXdr');
      const entradaFirmada = S.xdr.SorobanAuthorizationEntry.fromXDR(r.json.entradaFirmadaXdr, 'base64');
      const info = S.inspectAuthEntry(entradaFirmada);
      if (!info.signed) throw new Error('la entrada devuelta no quedó firmada');
      eq(info.address, direccionConstructora, 'dirección firmante');
    });

  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  console.log('\nFuga de llaves en la salida del servicio');
  await ok('ninguna llave secreta apareció en toda la salida del proceso (arranque + solicitudes)', () => {
    const texto = salidaCapturada.join('');
    const match = texto.match(PATRON_LLAVE_SECRETA);
    if (match) throw new Error('¡se encontró algo con forma de llave secreta en la salida! (' + match[0].slice(0, 4) + '…oculto)');
  });

  console.log('\nResultado:', pass, 'correctas,', fail, 'con error');
  if (fail > 0) process.exit(1);
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
