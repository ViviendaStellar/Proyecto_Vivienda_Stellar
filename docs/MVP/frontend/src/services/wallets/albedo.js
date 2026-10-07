/** Adaptador para Albedo: firma desde una ventana de albedo.link, sin extensión. */
import albedo from "@albedo-link/intent";
import { NETWORK_NAME } from "../../config/env.js";

export const id = "albedo";
export const label = "Albedo";

export async function isAvailable() {
  return true;
}

export async function connect() {
  const r = await albedo.publicKey({});
  return r.pubkey;
}

export async function sign(xdr, address) {
  const r = await albedo.tx({ xdr, pubkey: address, network: NETWORK_NAME, submit: false });
  return r.signed_envelope_xdr;
}
