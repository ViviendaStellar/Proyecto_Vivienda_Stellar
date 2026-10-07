/**
 * Avisos emergentes.
 * Uso: toast.ok("Título", "detalle"), toast.err(...), toast.info(...)
 */
import "./toast.css";
import { html, raw } from "../dom.js";
import { icon } from "../icons.js";

let container;

function show(kind, title, message = "") {
  container ??= Object.assign(document.body.appendChild(document.createElement("div")), {
    className: "toasts",
  });
  container.setAttribute("aria-live", "polite");
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  el.innerHTML = html`${raw(icon(kind))}<div><strong>${title}</strong>${message ? raw(html`<span>${message}</span>`) : ""}</div>`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add("out");
    el.addEventListener("animationend", () => el.remove());
  }, kind === "err" ? 7000 : 4500);
}

export const toast = {
  ok: (title, message) => show("ok", title, message),
  err: (title, message) => show("err", title, message),
  info: (title, message) => show("info", title, message),
};
