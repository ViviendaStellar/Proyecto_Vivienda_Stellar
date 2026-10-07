/** Formateadores de texto para la interfaz. */

/** Acorta una dirección o hash: GDSAS…HFCX */
export const short = (s, head = 5, tail = 4) => (s ? `${s.slice(0, head)}…${s.slice(-tail)}` : "");

/** Número de fase con dos dígitos: 1 → "01" */
export const pad2 = (n) => String(n).padStart(2, "0");

export function timeAgo(ts) {
  if (!ts) return "—";
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "hace un momento";
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return new Date(ts).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
}

export const clock = (ts = Date.now()) =>
  new Date(ts).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });

const AVATAR_COLORS = ["#d97706", "#2563eb", "#059669", "#7c3aed", "#db2777", "#ea580c", "#0891b2"];
const TITLES = /^(ing|arq|lic|sr|sra|dr|dra)\.?$/i;

/** Iniciales y color estable para el avatar de una persona. */
export function avatarFor(name) {
  const n = String(name || "?").trim();
  const initials =
    n.split(/\s+/).filter((w) => !TITLES.test(w)).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
  let h = 0;
  for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return { initials, color: AVATAR_COLORS[h % AVATAR_COLORS.length] };
}

/** Convierte errores técnicos en mensajes comprensibles. */
export function friendlyError(e) {
  const m = String(e?.message || e);
  if (/not found|404/i.test(m) && /account/i.test(m)) {
    return "La cuenta no existe en testnet. Fondéala con Friendbot antes de firmar.";
  }
  if (/declined|rejected|denied|cancel/i.test(m)) return "Firma cancelada en la billetera.";
  return m.length > 180 ? `${m.slice(0, 180)}…` : m;
}
