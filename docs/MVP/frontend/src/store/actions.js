/**
 * Cambios de estado permitidos. Son síncronos y no hablan con la red;
 * la lógica que combina red + estado vive en src/features/.
 */
import { setState } from "./store.js";

/* ---------- Etapas ---------- */
export const addStage = (etapa) => setState((s) => ({ etapas: [...s.etapas, etapa] }));

export const patchStage = (nombre, patch) =>
  setState((s) => ({ etapas: s.etapas.map((e) => (e.nombre === nombre ? { ...e, ...patch } : e)) }));

export const removeStage = (nombre) =>
  setState((s) => ({ etapas: s.etapas.filter((e) => e.nombre !== nombre) }));

/** Actualiza varios porcentajes de una vez; no emite cambios si nada varió. */
export const applyPercentages = (byName) =>
  setState((s) => {
    let changed = false;
    const etapas = s.etapas.map((e) => {
      const pct = byName[e.nombre];
      if (pct === undefined || pct === e.porcentaje) return e;
      changed = true;
      return { ...e, porcentaje: pct, actualizado: Date.now() };
    });
    return changed ? { etapas } : null;
  });

/* ---------- Historial ---------- */
export const addLog = (entry) => setState((s) => ({ log: [entry, ...s.log].slice(0, 100) }));
export const clearLog = () => setState({ log: [] });

/* ---------- Proyecto y vista ---------- */
export const setProject = (project) => setState({ project: project.trim().slice(0, 60) || "Mi obra" });
export const setFilter = (filter) => setState({ filter });
export const setQuery = (query) => setState({ query });

/* ---------- Billetera y red ---------- */
export const setWallet = (address, wallet) => setState({ address, wallet });
export const setSync = (status, text) => setState({ sync: { status, text } });
