/** Casos de uso de la billetera. */
import { connectWallet, disconnectWallet, getWallet } from "../services/wallets/index.js";
import { getState } from "../store/store.js";
import { setWallet } from "../store/actions.js";
import { pickWallet } from "../components/wallet-picker/wallet-picker.js";
import { toast } from "../ui/toast/toast.js";
import { friendlyError, short } from "../ui/format.js";

/**
 * Devuelve la dirección conectada. Si no hay ninguna, abre el selector.
 * Lanza un error con `cancelled: true` si el usuario cierra el selector.
 */
export async function ensureWallet() {
  const { address } = getState();
  if (address) return address;
  const id = await pickWallet();
  const newAddress = await connectWallet(id);
  setWallet(newAddress, id);
  toast.ok("Billetera conectada", `${getWallet(id).label} · ${short(newAddress, 6, 6)}`);
  return newAddress;
}

/** Conecta desde un botón: muestra los errores como aviso. */
export async function connectFromUI() {
  try {
    await ensureWallet();
  } catch (e) {
    if (!e?.cancelled) toast.err("No se pudo conectar", friendlyError(e));
  }
}

export function disconnect() {
  disconnectWallet();
  setWallet(null, null);
  toast.info("Billetera desconectada");
}

export const walletLabel = (id) => getWallet(id)?.label ?? "la billetera";
