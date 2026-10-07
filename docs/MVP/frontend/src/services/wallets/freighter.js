/** Adaptador para la extensión Freighter. */
import { getNetwork, isConnected, requestAccess, signTransaction } from "@stellar/freighter-api";
import { NETWORK_PASSPHRASE } from "../../config/env.js";

export const id = "freighter";
export const label = "Freighter";

// La extensión puede tardar en inyectarse en la página; se reintenta unas veces.
export async function isAvailable(attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      if (window.freighter) return true;
      if ((await isConnected()).isConnected) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

export async function connect() {
  if (!(await isAvailable())) {
    throw new Error(
      "Freighter no está instalado en este navegador. Ábrelo en Chrome, Brave, Edge o Firefox con la extensión, o usa Albedo."
    );
  }
  const access = await requestAccess();
  if (access.error) throw new Error(access.error.message || "Acceso denegado");
  const net = await getNetwork();
  if (!net.error && net.networkPassphrase !== NETWORK_PASSPHRASE) {
    throw new Error("Cambia Freighter a la red TESTNET para continuar.");
  }
  return access.address;
}

export async function sign(xdr, address) {
  const signed = await signTransaction(xdr, { networkPassphrase: NETWORK_PASSPHRASE, address });
  if (signed.error) throw new Error(signed.error.message || "Firma rechazada");
  return signed.signedTxXdr;
}
