/** Cálculos derivados del estado. Son funciones puras, fáciles de probar. */

export const STATUS_LABEL = { pend: "Sin iniciar", prog: "En curso", done: "Terminada" };
export const PROJECT_LABEL = { pend: "Obra por iniciar", prog: "Obra en ejecución", done: "Obra terminada" };

/** Estado de una etapa según su porcentaje. */
export const statusOf = (pct) => (pct >= 100 ? "done" : pct > 0 ? "prog" : "pend");

/** Etapas en orden de ejecución (por fecha de creación), con su número de fase. */
export const orderedStages = (s) =>
  [...s.etapas].sort((a, b) => a.creado - b.creado).map((etapa, i) => ({ etapa, fase: i + 1 }));

/** Etapas que pasan el filtro y la búsqueda actuales. */
export function visibleStages(s) {
  const q = s.query.trim().toLowerCase();
  return orderedStages(s).filter(({ etapa }) => {
    if (s.filter !== "all" && statusOf(etapa.porcentaje) !== s.filter) return false;
    return !q || etapa.nombre.toLowerCase().includes(q) || (etapa.responsable || "").toLowerCase().includes(q);
  });
}

/** Indicadores generales del proyecto. */
export function summary(s) {
  const total = s.etapas.length;
  const avg = total ? Math.round(s.etapas.reduce((a, e) => a + e.porcentaje, 0) / total) : 0;
  const counts = { pend: 0, prog: 0, done: 0 };
  s.etapas.forEach((e) => counts[statusOf(e.porcentaje)]++);
  const last = Math.max(0, ...s.etapas.map((e) => e.actualizado || 0));
  const projectStatus = total && avg >= 100 ? "done" : avg > 0 ? "prog" : "pend";
  return { total, avg, counts, last, projectStatus };
}

/** Avance de la guía de primeros pasos. */
export function onboardingSteps(s) {
  const done = {
    wallet: !!s.address,
    stage: s.etapas.length > 0,
    progress: s.etapas.some((e) => e.porcentaje > 0) || s.log.some((l) => l.tipo === "avance"),
  };
  const order = ["wallet", "stage", "progress"];
  return {
    done,
    count: order.filter((k) => done[k]).length,
    current: order.find((k) => !done[k]) ?? null,
  };
}

/** Siguiente etapa sin terminar, útil para preseleccionar formularios. */
export const nextOpenStage = (s) => orderedStages(s).find(({ etapa }) => etapa.porcentaje < 100)?.etapa;
