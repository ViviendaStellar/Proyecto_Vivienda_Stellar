// INN-LOCK · Pruebas unitarias del JSON canónico, el hash del cronograma, el
// constructor de argumentos de register_project y la invalidación de firmas
// (por cambio de hash o por caducidad). Nunca toca la red ni Freighter: la
// prueba de caducidad usa el SDK real de Stellar (cargado desde
// frontend/js/vendor/stellar.js) solo para firmar offline con una cuenta de
// prueba generada en memoria y descartada al terminar — eso no es una
// cuenta de rol ni toca ninguna llave del proyecto.
// Uso: node frontend/js/chain/__tests__/run.js
'use strict';
const crypto = require('node:crypto');
const path = require('node:path');

const ChainUuid = require(path.join(__dirname, '..', 'uuid.js'));
const ChainHash = require(path.join(__dirname, '..', 'hash.js'));
const ChainCanonical = require(path.join(__dirname, '..', 'canonical.js'));
const ChainArgs = require(path.join(__dirname, '..', 'args.js'));

// register.js no es UMD (fija window.ChainRegister directo): para probar su
// lógica de invalidación de firmas en Node, simulamos "window" y
// "localStorage" con un Map en memoria antes de cargarlo. Nunca toca el SDK
// de Stellar ni Freighter porque solo llamamos a prepararProyecto().
global.window = global;
const almacen = new Map();
global.localStorage = {
  getItem: (k) => (almacen.has(k) ? almacen.get(k) : null),
  setItem: (k, v) => almacen.set(k, String(v)),
  removeItem: (k) => almacen.delete(k)
};
global.window.ChainCanonical = ChainCanonical;
require(path.join(__dirname, '..', 'register.js'));
const ChainRegister = global.ChainRegister;

// Carga el SDK real (el mismo bundle que usa el navegador) para la prueba de
// caducidad. Solo se usa para construir y verificar firmas offline — ningún
// bloque de esta prueba llama a la red ni a Freighter.
global.self = global;
require(path.join(__dirname, '..', '..', 'vendor', 'stellar.js'));
const StellarSdk = global.StellarSdk;

let pass = 0, fail = 0;
async function ok(name, fn) {
  try { await fn(); pass++; console.log('  ✔', name); }
  catch (e) { fail++; console.log('  ✘', name, '→', e.message); }
}
function eq(a, b, msg) {
  const sa = JSON.stringify(a), sb = JSON.stringify(b);
  if (sa !== sb) throw new Error((msg || '') + ' esperado ' + sb + ', obtenido ' + sa);
}
function throws(fn, msg) {
  try { fn(); } catch (e) { return; }
  throw new Error(msg || 'se esperaba que lanzara un error y no lo hizo');
}

const PROYECTO = {
  projectId: '550e8400-e29b-41d4-a716-446655440000',
  constructora: 'GCYQDJ6UO3EHEL4GXLVMGTVTJEOV3OTWDJQPGSFTHPS2BCLRLT4OYRJS',
  interventor: 'GAGEYZHS5LQPGQSK5YNQBCR6RKUJLSPO7ET4K76UJXZJUH6QZZ5PWEIW',
  administrador: 'GBP3BRO5XE3EG7YVSE74OQVFCK4XCOOCWCGXHTFEBTBLZCQ576EVMI7M',
  token: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
  presupuestoTotal: '1000000000',
  hitos: [
    { deadline: 1001000, percentageBps: 1700 },
    { deadline: 1002000, percentageBps: 1700 },
    { deadline: 1003000, percentageBps: 1700 },
    { deadline: 1004000, percentageBps: 1700 },
    { deadline: 1005000, percentageBps: 1700 },
    { deadline: 1006000, percentageBps: 1500 }
  ]
};

async function main() {

console.log('\nUUID <-> BytesN<16>');
await ok('convierte un UUID a 16 bytes y de vuelta sin perder nada', async () => {
  const bytes = ChainUuid.uuidToBytes(PROYECTO.projectId);
  eq(bytes.length, 16, 'longitud');
  eq(ChainUuid.bytesToUuid(bytes), PROYECTO.projectId, 'ida y vuelta');
});
await ok('rechaza un UUID con el formato incorrecto', async () => {
  throws(() => ChainUuid.uuidToBytes('no-es-un-uuid'));
});

console.log('\nJSON canónico y hash del cronograma');
await ok('las claves salen en el orden documentado, sin espacios', async () => {
  const json = ChainCanonical.canonicalJson(PROYECTO);
  const esperado = '{"administrador":"GBP3BRO5XE3EG7YVSE74OQVFCK4XCOOCWCGXHTFEBTBLZCQ576EVMI7M","constructora":"GCYQDJ6UO3EHEL4GXLVMGTVTJEOV3OTWDJQPGSFTHPS2BCLRLT4OYRJS","hitos":[{"deadline":1001000,"percentage_bps":1700},{"deadline":1002000,"percentage_bps":1700},{"deadline":1003000,"percentage_bps":1700},{"deadline":1004000,"percentage_bps":1700},{"deadline":1005000,"percentage_bps":1700},{"deadline":1006000,"percentage_bps":1500}],"interventor":"GAGEYZHS5LQPGQSK5YNQBCR6RKUJLSPO7ET4K76UJXZJUH6QZZ5PWEIW","presupuesto_total":"1000000000","project_id":"550e8400-e29b-41d4-a716-446655440000","token":"CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"}';
  eq(json, esperado, 'JSON canónico');
  if (/\s/.test(json)) throw new Error('el JSON canónico no debería tener espacios');
});
await ok('el orden de las claves no depende del orden en que se arma el objeto de entrada', async () => {
  const mismoProyectoOtroOrden = {
    token: PROYECTO.token,
    hitos: PROYECTO.hitos,
    projectId: PROYECTO.projectId,
    administrador: PROYECTO.administrador,
    presupuestoTotal: PROYECTO.presupuestoTotal,
    constructora: PROYECTO.constructora,
    interventor: PROYECTO.interventor
  };
  eq(ChainCanonical.canonicalJson(mismoProyectoOtroOrden), ChainCanonical.canonicalJson(PROYECTO));
});
await ok('presupuesto_total queda como texto (no pierde precisión en enteros grandes)', async () => {
  const grande = Object.assign({}, PROYECTO, { presupuestoTotal: '123456789012345678' });
  const json = ChainCanonical.canonicalJson(grande);
  if (!json.includes('"presupuesto_total":"123456789012345678"')) throw new Error('no se guardó como texto exacto');
});
await ok('el hash es un SHA-256 real del JSON canónico (se verifica con Node crypto, por fuera de ChainHash)', async () => {
  const { json, hex } = await ChainCanonical.hashProject(PROYECTO);
  const esperado = crypto.createHash('sha256').update(json, 'utf8').digest('hex');
  eq(hex, esperado, 'hash');
  eq(hex.length, 64, 'longitud del hash hex (32 bytes)');
});
await ok('cambiar un solo campo (un porcentaje) cambia el hash', async () => {
  const modificado = JSON.parse(JSON.stringify(PROYECTO));
  modificado.hitos[0].percentageBps = 1600;
  modificado.hitos[5].percentageBps = 1600;
  const a = await ChainCanonical.hashProject(PROYECTO);
  const b = await ChainCanonical.hashProject(modificado);
  if (a.hex === b.hex) throw new Error('el hash no cambió al modificar un hito');
});

console.log('\nConstructor de argumentos de register_project');
await ok('arma los 8 campos en el orden exacto del contrato', async () => {
  const args = ChainArgs.buildRegisterProjectArgs({
    projectId: PROYECTO.projectId,
    constructora: PROYECTO.constructora,
    interventor: PROYECTO.interventor,
    administrador: PROYECTO.administrador,
    token: PROYECTO.token,
    presupuestoTotal: PROYECTO.presupuestoTotal,
    hashCronograma: 'ab'.repeat(32),
    hitos: PROYECTO.hitos
  });
  eq(Object.keys(args), ['project_id', 'constructora', 'interventor', 'administrador', 'token', 'presupuesto_total', 'hash_cronograma', 'hitos'], 'orden de campos');
  eq(args.project_id, PROYECTO.projectId);
  eq(args.hitos.length, 6);
  eq(args.hitos[0], { deadline: 1001000, percentage_bps: 1700 });
});
await ok('rechaza si falta algún dato del proyecto', async () => {
  throws(() => ChainArgs.buildRegisterProjectArgs({ projectId: PROYECTO.projectId }), 'debía exigir los campos faltantes');
});
await ok('rechaza menos de 6 hitos', async () => {
  throws(() => ChainArgs.buildRegisterProjectArgs(Object.assign({}, PROYECTO, {
    hashCronograma: 'ab'.repeat(32), hitos: PROYECTO.hitos.slice(0, 3)
  })));
});
await ok('rechaza más de 60 hitos', async () => {
  const muchos = Array.from({ length: 61 }, (_, i) => ({ deadline: 1000 + i, percentageBps: 100 }));
  throws(() => ChainArgs.buildRegisterProjectArgs(Object.assign({}, PROYECTO, { hashCronograma: 'ab'.repeat(32), hitos: muchos })));
});

console.log('\nInvalidación de firmas guardadas al cambiar el hash (prepararProyecto)');
await ok('conserva el estado y las firmas si los datos no cambiaron', async () => {
  const datos = Object.assign({}, PROYECTO, { projectId: 'firma-test-1' });
  await ChainRegister.prepararProyecto(datos);
  const clave = 'innlock.chain.register.' + datos.projectId;
  const guardado = JSON.parse(global.localStorage.getItem(clave));
  guardado.entriesXdr = ['FIRMA-FALSA-DE-PRUEBA'];
  guardado.signedBy.constructora = true;
  global.localStorage.setItem(clave, JSON.stringify(guardado));

  const s2 = await ChainRegister.prepararProyecto(datos);
  eq(s2.entriesXdr, ['FIRMA-FALSA-DE-PRUEBA'], 'debía conservar la firma cuando el hash no cambia');
  eq(s2.signedBy.constructora, true, 'debía conservar signedBy cuando el hash no cambia');
});
await ok('descarta todas las firmas guardadas si el cronograma cambió', async () => {
  const datos = Object.assign({}, PROYECTO, { projectId: 'firma-test-2' });
  await ChainRegister.prepararProyecto(datos);
  const clave = 'innlock.chain.register.' + datos.projectId;
  const guardado = JSON.parse(global.localStorage.getItem(clave));
  guardado.entriesXdr = ['FIRMA-FALSA-DE-PRUEBA'];
  guardado.signedBy = { constructora: true, interventor: true, administrador: false };
  global.localStorage.setItem(clave, JSON.stringify(guardado));

  const modificado = JSON.parse(JSON.stringify(datos));
  modificado.hitos[0].percentageBps = 1600;
  modificado.hitos[5].percentageBps = 1600;
  const s3 = await ChainRegister.prepararProyecto(modificado);
  eq(s3.entriesXdr, null, 'debía descartar las firmas cuando el hash cambia');
  eq(s3.signedBy, { constructora: false, interventor: false, administrador: false }, 'debía reiniciar signedBy cuando el hash cambia');
});

console.log('\nInvalidación de firmas por caducidad (SDK real, offline, sin red ni Freighter)');
async function firmaDePrueba(validUntilLedgerSeq) {
  // Cuenta "de usar y tirar" generada en memoria solo para esta prueba: no
  // es inn-constructora/inn-interventor/inn-admin ni ninguna llave real.
  const kp = StellarSdk.Keypair.random();
  const invocacion = new StellarSdk.xdr.SorobanAuthorizedInvocation({
    function: StellarSdk.xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
      new StellarSdk.xdr.InvokeContractArgs({
        contractAddress: new StellarSdk.Address('CBS57WMMUYBWCLFGEKOZYWPRAHHBFP432AJ57P5HFWK6DD7GRI5WJOBT').toScAddress(),
        functionName: 'register_project',
        args: []
      })
    ),
    subInvocations: []
  });
  const entrada = await StellarSdk.authorizeInvocation({
    signer: kp,
    validUntilLedgerSeq,
    invocation: invocacion,
    networkPassphrase: 'Test SDF Network ; September 2015'
  });
  return { entrada, direccion: kp.publicKey() };
}
await ok('detecta una firma caducada y señala el ROL (no la dirección cruda)', async () => {
  const { entrada, direccion } = await firmaDePrueba(100);
  const state = { constructora: direccion, interventor: 'OTRA-DIRECCION-INTERVENTOR', administrador: 'OTRA-DIRECCION-ADMIN' };
  let error = null;
  try { ChainRegister.verificarNoCaducadas(state, [entrada], StellarSdk, [direccion], 150); }
  catch (e) { error = e; }
  if (!error) throw new Error('debía lanzar un error de firma caducada y no lanzó nada');
  eq(error.code, 'FIRMA_CADUCADA', 'código de error');
  eq(error.rolCaducado, 'constructora', 'debía identificar el rol, no la dirección');
  eq(error.message, 'La firma de constructora caducó, debe firmar de nuevo.', 'mensaje en español');
});
await ok('no lanza nada si la firma todavía está vigente en el ledger actual', async () => {
  const { entrada, direccion } = await firmaDePrueba(100);
  const state = { constructora: direccion, interventor: 'OTRA-DIRECCION-INTERVENTOR', administrador: 'OTRA-DIRECCION-ADMIN' };
  ChainRegister.verificarNoCaducadas(state, [entrada], StellarSdk, [direccion], 50); // no debe lanzar
});
await ok('etiquetaPorDireccion traduce cada dirección al rol correcto', async () => {
  const state = { constructora: 'DIR-C', interventor: 'DIR-I', administrador: 'DIR-A' };
  eq(ChainRegister.etiquetaPorDireccion(state, 'DIR-C'), 'constructora');
  eq(ChainRegister.etiquetaPorDireccion(state, 'DIR-I'), 'interventor');
  eq(ChainRegister.etiquetaPorDireccion(state, 'DIR-A'), 'administrador');
  eq(ChainRegister.etiquetaPorDireccion(state, 'DIR-DESCONOCIDA'), 'DIR-DESCONOCIDA');
});

console.log('\nResultado:', pass, 'correctas,', fail, 'con error');
if (fail > 0) process.exit(1);

}

main();
