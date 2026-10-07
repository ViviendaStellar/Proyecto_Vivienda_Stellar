/**
 * Cliente genérico de Soroban RPC.
 * Sabe simular y enviar llamadas a cualquier contrato, pero no conoce
 * las funciones de ObraContract (eso vive en obra-contract.js).
 */
import {
  Account,
  BASE_FEE,
  Contract,
  Keypair,
  TransactionBuilder,
  rpc,
  scValToNative,
} from "@stellar/stellar-sdk";
import { CONTRACT_ID, NETWORK_PASSPHRASE, RPC_URL } from "../../config/env.js";
import { signWithCurrentWallet } from "../wallets/index.js";

export const server = new rpc.Server(RPC_URL);
const contract = new Contract(CONTRACT_ID);

// Cuenta efímera para simulaciones de solo lectura: no necesita existir ni billetera.
const readOnlySource = new Account(Keypair.random().publicKey(), "0");

/** Pasos que se informan durante una escritura. */
export const TxStep = Object.freeze({ PREPARE: 0, SIGN: 1, SEND: 2, CONFIRM: 3 });

function buildTx(source, method, args, timeout = 30) {
  return new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(contract.call(method, ...args))
    .setTimeout(timeout)
    .build();
}

/** Ejecuta una función de solo lectura y devuelve su valor en JS nativo. */
export async function simulate(method, args = []) {
  const sim = await server.simulateTransaction(buildTx(readOnlySource, method, args));
  if (rpc.Api.isSimulationError(sim)) throw new Error(sim.error);
  return scValToNative(sim.result.retval);
}

/**
 * Firma y envía una llamada que modifica el estado del contrato.
 * @param {string} address  cuenta que firma
 * @param {(step:number)=>void} onStep  recibe un valor de TxStep
 * @returns {Promise<{hash:string, result:any}>}
 */
export async function invoke(address, method, args = [], onStep = () => {}) {
  onStep(TxStep.PREPARE);
  const account = await server.getAccount(address);
  const prepared = await server.prepareTransaction(buildTx(account, method, args, 60));

  onStep(TxStep.SIGN);
  const signedXdr = await signWithCurrentWallet(prepared.toXDR(), address);

  onStep(TxStep.SEND);
  const sent = await server.sendTransaction(TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE));
  if (sent.status === "ERROR") throw new Error("La red rechazó la transacción.");

  onStep(TxStep.CONFIRM);
  for (let i = 0; i < 30; i++) {
    const res = await server.getTransaction(sent.hash);
    if (res.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return { hash: sent.hash, result: res.returnValue ? scValToNative(res.returnValue) : null };
    }
    if (res.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error("La transacción falló en el ledger.");
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("Tiempo de confirmación agotado.");
}
