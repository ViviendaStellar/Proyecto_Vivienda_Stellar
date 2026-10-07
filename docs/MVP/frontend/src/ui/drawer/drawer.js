/**
 * Paneles laterales (drawers).
 *
 * Cada panel se registra con un nombre:
 *   registerDrawer("crear", { element, onOpen })
 * y cualquier parte de la app puede abrirlo:
 *   openDrawer("crear")             desde JS
 *   <button data-open="crear">      desde HTML
 *
 * Así los componentes no se importan entre sí.
 */
import "./drawer.css";

const drawers = new Map();
let active = null;

export function registerDrawer(name, { element, onOpen = () => {}, guard }) {
  drawers.set(name, { element, onOpen, guard });
  element.hidden = true;
  element.addEventListener("click", (ev) => {
    if (ev.target.closest("[data-close]")) closeDrawer();
  });
}

export function openDrawer(name, options = {}) {
  const d = drawers.get(name);
  if (!d) return console.warn(`Panel no registrado: ${name}`);
  // Un panel puede redirigir a otro (por ejemplo, si faltan datos).
  const redirect = d.guard?.(options);
  if (redirect && redirect !== name) return openDrawer(redirect);
  closeDrawer();
  d.element.hidden = false;
  active = d;
  document.body.style.overflow = "hidden";
  d.onOpen(options);
}

export function closeDrawer() {
  if (!active) return;
  active.element.hidden = true;
  active = null;
  document.body.style.overflow = "";
}

export const isDrawerOpen = () => !!active;

// Escape cierra el panel, salvo que haya una ventana modal encima.
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape" && !document.querySelector(".overlay:not([hidden])")) closeDrawer();
});

// Apertura declarativa con data-open="nombre".
document.addEventListener("click", (ev) => {
  const opener = ev.target.closest("[data-open]");
  if (!opener) return;
  ev.preventDefault();
  openDrawer(opener.dataset.open);
});

/**
 * Plantilla común de un panel. `body` y `footer` son HTML ya escapado.
 */
export function drawerTemplate({ id, title, subtitle, iconHtml, iconClass = "ico-brand", body, footer }) {
  return `
    <div class="drawer-scrim" data-close></div>
    <form class="drawer" id="${id}" role="dialog" aria-modal="true" aria-labelledby="${id}-title" novalidate>
      <header class="drawer-head">
        <div class="drawer-ico ${iconClass}">${iconHtml}</div>
        <div>
          <h3 id="${id}-title">${title}</h3>
          <p class="muted small">${subtitle}</p>
        </div>
        <button class="icon-btn" type="button" data-close aria-label="Cerrar">
          <svg viewBox="0 0 24 24" class="ico"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </header>
      <div class="drawer-body">${body}</div>
      <footer class="drawer-foot">${footer}</footer>
    </form>`;
}
