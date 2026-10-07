/**
 * Casos de uso de las etapas.
 * Cada función habla con el contrato, actualiza el estado y avisa al usuario.
 * Las que escriben en la red devuelven `true` si todo salió bien.
 */
import { actualizarAvance, crearEtapa, obtenerEtapa } from "../services/stellar/obra-contract.js";
import { getState } from "../store/store.js";
import { addLog, addStage, applyPercentages, patchStage, removeStage, setSync } from "../store/actions.js";
import { showTxProgress } from "../components/tx-progress/tx-progress.js";
import { ensureWallet, walletLabel } from "./wallet.js";
import { toast } from "../ui/toast/toast.js";
import { clock, friendlyError } from "../ui/format.js";

const exists = (nombre) => getState().etapas.some((e) => e.nombre.toLowerCase() === nombre.toLowerCase());

/** Ejecuta una escritura mostrando la ventana de progreso. */
async function withTx(title, errorTitle, run) {
  let tx;
  try {
    const address = await ensureWallet();
    tx = showTxProgress(title, walletLabel(getState().wallet));
    await run(address, tx.step);
    return true;
  } catch (e) {
    if (!e?.cancelled) toast.err(errorTitle, friendlyError(e));
    return false;
  } finally {
    tx?.close();
  }
}

export function createStage({ nombre, responsable }) {
  if (exists(nombre)) {
    toast.err("Etapa duplicada", "Ya existe una etapa con ese nombre.");
    return Promise.resolve(false);
  }
  return withTx("Registrando etapa", "No se creó la etapa", async (address, onStep) => {
    const { hash, result } = await crearEtapa(address, { nombre, responsable }, onStep);
    const now = Date.now();
    addStage({ nombre, responsable, porcentaje: 0, observaciones: "Sin observaciones", creado: now, actualizado: now });
    addLog({ tipo: "crear", nombre, hash, ts: now });
    toast.ok(result || "Etapa creada", `“${nombre}” quedó registrada en la red.`);
  });
}

export function registerProgress({ nombre, porcentaje, observaciones }) {
  const obs = observaciones.trim() || "Sin observaciones";
  return withTx("Guardando avance", "No se guardó el avance", async (address, onStep) => {
    const { hash, result } = await actualizarAvance(address, { nombre, porcentaje, observaciones: obs }, onStep);
    if (result && /inv/i.test(result)) throw new Error(result);
    const now = Date.now();
    patchStage(nombre, { porcentaje, observaciones: obs, actualizado: now });
    addLog({ tipo: "avance", nombre, porcentaje, hash, ts: now });
    if (porcentaje === 100) toast.ok("¡Etapa terminada!", `${nombre} llegó al 100%.`);
    else toast.ok(result || "Avance actualizado", `${nombre}: ${porcentaje}% registrado.`);
  });
}

/** Lee de la red el porcentaje de todas las etapas del panel. */
export async function syncAll({ silent = false } = {}) {
  const { etapas } = getState();
  if (!etapas.length) return setSync("ok", "Conectado a testnet");
  setSync("busy", "Leyendo el contrato…");
  const results = await Promise.allSettled(etapas.map((e) => obtenerEtapa(e.nombre)));
  const byName = {};
  let failed = 0;
  results.forEach((r, i) => (r.status === "fulfilled" ? (byName[etapas[i].nombre] = r.value) : failed++));
  applyPercentages(byName);
  if (failed === etapas.length) {
    setSync("err", "Sin conexión con la red");
    if (!silent) toast.err("Error al sincronizar", "La red no respondió.");
  } else if (failed) {
    setSync("err", `Sincronización parcial · ${clock()}`);
    toast.err("Sincronización parcial", `${failed} etapa(s) no respondieron.`);
  } else {
    setSync("ok", `Sincronizado · ${clock()}`);
    if (!silent) toast.ok("Datos actualizados", "Porcentajes leídos del contrato.");
  }
}

export async function syncStage(nombre) {
  try {
    const pct = await obtenerEtapa(nombre);
    applyPercentages({ [nombre]: pct });
    toast.ok("Leído de la red", `${nombre}: ${pct}%`);
  } catch (e) {
    toast.err("Error al leer", friendlyError(e));
  }
}

/** Consulta una etapa cualquiera, esté o no en el panel. Lanza si la red falla. */
export const queryStage = (nombre) => obtenerEtapa(nombre);

/** Agrega al panel una etapa que existe en el contrato pero no en este navegador. */
export function trackStage(nombre, porcentaje) {
  if (exists(nombre)) return;
  const now = Date.now();
  addStage({ nombre, responsable: "", porcentaje, observaciones: "", creado: now, actualizado: now });
  toast.ok("Etapa agregada", `${nombre} ahora aparece en el panel.`);
}

/** Quita la etapa de este navegador. Los datos en la red no cambian. */
export function untrackStage(nombre) {
  removeStage(nombre);
  toast.info("Etapa quitada del panel", nombre);
}

export const isTracked = (nombre) => getState().etapas.some((e) => e.nombre === nombre);
