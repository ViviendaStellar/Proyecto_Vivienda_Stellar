/** Atajos de DOM. */
export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/** Escapa texto antes de insertarlo en HTML. Úsalo con TODO dato que venga del usuario. */
export const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Etiqueta de plantilla que escapa automáticamente los valores interpolados, salvo los marcados con raw(). */
const RAW = Symbol("raw");
export const raw = (html) => ({ [RAW]: true, html: String(html) });
export function html(strings, ...values) {
  return strings.reduce((out, str, i) => {
    if (i === 0) return str;
    const v = values[i - 1];
    const part = Array.isArray(v)
      ? v.map((x) => (x?.[RAW] ? x.html : esc(x))).join("")
      : v?.[RAW] ? v.html : v === false || v == null ? "" : esc(v);
    return out + part + str;
  }, "");
}

/** Deshabilita o habilita todos los controles de un formulario. */
export function lockForm(form, locked) {
  $$("button, input, select, textarea", form).forEach((el) => (el.disabled = locked));
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
