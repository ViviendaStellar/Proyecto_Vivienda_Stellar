/**
 * Registro de billeteras.
 * Para agregar una nueva (por ejemplo xBull o Lobstr), crea un archivo
 * con la misma forma que freighter.js (id, label, isAvailable, connect, sign)
 * y agrégalo a WALLETS.
 */
import * as freighter from "./freighter.js";
import * as albedo from "./albedo.js";

export const WALLETS = { [freighter.id]: freighter, [albedo.id]: albedo };

let current = null;

export const getWallet = (id) => WALLETS[id];
export const currentWalletId = () => current?.id ?? null;

/** Conecta la billetera elegida y devuelve la dirección pública. */
export async function connectWallet(id) {
  const wallet = WALLETS[id];
  if (!wallet) throw new Error(`Billetera desconocida: ${id}`);
  const address = await wallet.connect();
  current = wallet;
  return address;
}

export function disconnectWallet() {
  current = null;
}

/** Firma un XDR con la billetera conectada. */
export async function signWithCurrentWallet(xdr, address) {
  if (!current) throw new Error("No hay billetera conectada.");
  return current.sign(xdr, address);
}
