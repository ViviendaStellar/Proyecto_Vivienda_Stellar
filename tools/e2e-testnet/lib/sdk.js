/* INN-LOCK · Reutiliza (no copia) los módulos de frontend/js/chain/ y el
   mismo bundle del SDK de Stellar que usa el navegador, dándoles un
   `window`/`self` mínimo para que corran en Node. Es el mismo truco que ya
   usa docs/semana3/verificar-registro.js. Esta pieza es de SOLO LECTURA de
   configuración: no pide ninguna llave ni toca la red por sí misma. */
'use strict';
const path = require('node:path');
const fs = require('node:fs');

const RAIZ = path.join(__dirname, '..', '..', '..');
const FRONTEND = path.join(RAIZ, 'frontend');

global.window = global;
global.self = global;

require(path.join(FRONTEND, 'js', 'vendor', 'stellar.js'));
const StellarSdk = global.StellarSdk;
if (!StellarSdk) throw new Error('No se pudo cargar frontend/js/vendor/stellar.js');

const ChainUuid = require(path.join(FRONTEND, 'js', 'chain', 'uuid.js'));
const ChainHash = require(path.join(FRONTEND, 'js', 'chain', 'hash.js'));
const ChainCanonical = require(path.join(FRONTEND, 'js', 'chain', 'canonical.js'));
const ChainArgs = require(path.join(FRONTEND, 'js', 'chain', 'args.js'));

global.window.ChainCanonical = ChainCanonical;
global.window.ChainUuid = ChainUuid;

const deployment = JSON.parse(fs.readFileSync(path.join(RAIZ, 'contracts', 'escrow', 'deployments', 'testnet.json'), 'utf8'));

global.window.ChainConfig = {
  mode: 'testnet',
  isTestnet: true,
  networkPassphrase: deployment.network_passphrase,
  sorobanRpcUrl: deployment.soroban_rpc_url || 'https://soroban-testnet.stellar.org',
  escrowContractId: deployment.escrow_contract_id,
  tokenContractId: deployment.token_contract_id,
  explorerUrl: 'https://stellar.expert/explorer/testnet',
  vendorReady: Promise.resolve()
};

require(path.join(FRONTEND, 'js', 'chain', 'errors.js'));
const ChainErrors = global.window.ChainErrors;

require(path.join(FRONTEND, 'js', 'chain', 'contract.js'));
const ChainContract = global.window.ChainContract;

module.exports = {
  StellarSdk,
  ChainUuid,
  ChainHash,
  ChainCanonical,
  ChainArgs,
  ChainErrors,
  ChainContract,
  ChainConfig: global.window.ChainConfig,
  deployment
};
