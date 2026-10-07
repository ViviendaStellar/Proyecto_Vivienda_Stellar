/**
 * Estado global de la aplicación.
 *
 * Reglas:
 * - El estado es inmutable: nunca modifiques `getState()` directamente.
 *   Usa las funciones de actions.js, que llaman a setState.
 * - Los componentes se suscriben con `watch(selector, render)` y solo
 *   se vuelven a pintar cuando cambia lo que seleccionan.
 *
 * El contrato solo permite leer el porcentaje de una etapa. Por eso la lista
 * de etapas, el responsable y las observaciones se guardan en el navegador.
 */
import { CONTRACT_ID } from "../config/env.js";
import { load, save } from "./storage.js";

/** Claves de estado que se guardan en localStorage. */
const PERSISTED = {
  etapas: `obra:${CONTRACT_ID}:etapas`,
  log: `obra:${CONTRACT_ID}:log`,
  project: `obra:${CONTRACT_ID}:proyecto`,
};

/**
 * @typedef {Object} Etapa
 * @property {string} nombre
 * @property {string} responsable
 * @property {number} porcentaje       0 a 100, leído del contrato
 * @property {string} observaciones
 * @property {number} creado           marca de tiempo, define el orden de las fases
 * @property {number} actualizado
 *
 * @typedef {Object} Registro
 * @property {"crear"|"avance"} tipo
 * @property {string} nombre
 * @property {number} [porcentaje]
 * @property {string} hash
 * @property {number} ts
 */

function initialState() {
  const etapas = load(PERSISTED.etapas, []).map((e, i) => ({
    ...e,
    creado: e.creado || e.actualizado || Date.now() - i,
  }));
  return {
    /** @type {Etapa[]} */ etapas,
    /** @type {Registro[]} */ log: load(PERSISTED.log, []),
    project: load(PERSISTED.project, "Mi obra"),
    address: null,
    wallet: null,
    filter: "all",
    query: "",
    sync: { status: "busy", text: "Conectando con la red…" },
  };
}

let state = initialState();
const listeners = new Set();

export const getState = () => state;

/** Aplica un cambio parcial (objeto o función que recibe el estado) y avisa a los suscriptores. */
export function setState(patch) {
  const next = typeof patch === "function" ? patch(state) : patch;
  if (!next) return;
  state = { ...state, ...next };
  for (const key of Object.keys(next)) {
    if (PERSISTED[key]) save(PERSISTED[key], state[key]);
  }
  listeners.forEach((fn) => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Ejecuta `render(valor, estado)` al inicio y cada vez que cambie lo que
 * devuelve `selector`. El selector debe devolver un arreglo de dependencias.
 */
export function watch(selector, render) {
  let prev;
  const run = (s) => {
    const deps = selector(s);
    if (prev && deps.length === prev.length && deps.every((d, i) => d === prev[i])) return;
    prev = deps;
    render(s);
  };
  run(state);
  return subscribe(run);
}
