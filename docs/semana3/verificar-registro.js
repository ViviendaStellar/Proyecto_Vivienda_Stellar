#!/usr/bin/env node
/* INN-LOCK · Verifica que un proyecto quedó registrado en testnet exactamente
   como se esperaba, leyendo el contrato real (get_project y get_milestone 0)
   y comparando contra el estado que exportaste del navegador.

   No hace falta instalar nada: reutiliza el mismo paquete que usa el
   navegador (frontend/js/vendor/stellar.js), solo de lectura, sin firmar
   nada ni tocar ninguna llave.

   Uso:
     1. En testnet-registro.html, sección "Estado guardado (depuración)",
        clic en "Mostrar" y copia ese JSON a un archivo, p. ej. estado.json.
     2. node docs/semana3/verificar-registro.js estado.json
*/
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..', '..');
global.window = global;
global.self = global;
require(path.join(raiz, 'frontend', 'js', 'vendor', 'stellar.js'));
const S = global.StellarSdk;

const deployment = JSON.parse(fs.readFileSync(path.join(raiz, 'contracts', 'escrow', 'deployments', 'testnet.json'), 'utf8'));

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}
function uuidToBytes(uuid) { return hexToBytes(String(uuid).replace(/-/g, '')); }

async function leerSoloLectura(server, fnName, scArgs) {
  const throwaway = S.Keypair.random().publicKey();
  const cuenta = new S.Account(throwaway, '0');
  const contract = new S.Contract(deployment.escrow_contract_id);
  const tx = new S.TransactionBuilder(cuenta, { fee: S.BASE_FEE, networkPassphrase: deployment.network_passphrase })
    .addOperation(contract.call(fnName, ...scArgs))
    .setTimeout(30)
    .build();
  const sim = await server.simulateTransaction(tx);
  if (S.rpc.Api.isSimulationError(sim)) throw new Error(fnName + ': ' + sim.error);
  return S.scValToNative(sim.result.retval);
}

let okCount = 0, failCount = 0;
function comparar(campo, esperado, real) {
  const esperadoTxto = String(esperado);
  const realTxto = String(real);
  if (esperadoTxto === realTxto) { okCount++; console.log('  ✔', campo, '=', realTxto); }
  else { failCount++; console.log('  ✘', campo, '→ esperado', esperadoTxto, ', en cadena', realTxto); }
}

async function main() {
  const rutaEstado = process.argv[2];
  if (!rutaEstado) {
    console.error('Uso: node verificar-registro.js <ruta-al-estado-exportado.json>');
    process.exit(1);
  }
  const estado = JSON.parse(fs.readFileSync(rutaEstado, 'utf8'));

  console.log('Red:', deployment.network, '· contrato:', deployment.escrow_contract_id);
  console.log('Proyecto:', estado.projectId, '\n');

  const server = new S.rpc.Server(deployment.soroban_rpc_url || 'https://soroban-testnet.stellar.org');
  const projectIdScVal = S.nativeToScVal(uuidToBytes(estado.projectId), { type: 'bytes' });

  let proyecto;
  try {
    proyecto = await leerSoloLectura(server, 'get_project', [projectIdScVal]);
  } catch (e) {
    console.error('No se pudo leer get_project:', e.message);
    console.error('¿El administrador ya firmó y envió la transacción? ¿El UUID es correcto?');
    process.exit(1);
  }

  console.log('get_project:');
  comparar('constructora', estado.constructora, proyecto.constructora);
  comparar('interventor', estado.interventor, proyecto.interventor);
  comparar('administrador', estado.administrador, proyecto.administrador);
  comparar('token', estado.token, proyecto.token);
  comparar('presupuesto_total', estado.presupuestoTotal, proyecto.presupuesto_total);
  comparar('hash_cronograma', estado.hashCronograma, Buffer.from(proyecto.hash_cronograma).toString('hex'));
  comparar('activo', true, proyecto.activo);
  comparar('congelado', false, proyecto.congelado);
  comparar('milestone_count', estado.hitos.length, proyecto.milestone_count);

  console.log('\nget_milestone(0):');
  const hito0 = await leerSoloLectura(server, 'get_milestone', [projectIdScVal, S.nativeToScVal(0, { type: 'u32' })]);
  comparar('status del hito 0', 'EnCurso', hito0.status[0]);
  comparar('percentage_bps del hito 0', estado.hitos[0].percentageBps, hito0.percentage_bps);
  comparar('deadline del hito 0', estado.hitos[0].deadline, hito0.deadline);

  console.log('\nResultado:', okCount, 'coinciden,', failCount, 'no coinciden.');
  console.log('Explorador:', deployment.network === 'testnet' ? 'https://stellar.expert/explorer/testnet/contract/' + deployment.escrow_contract_id : '(red no reconocida)');
  if (failCount > 0) process.exit(1);
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
