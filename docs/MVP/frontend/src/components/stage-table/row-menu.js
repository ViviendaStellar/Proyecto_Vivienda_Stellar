/**
 * Menú contextual de una fila. Se monta sobre <body> con posición fija
 * para que la tabla (que tiene desplazamiento horizontal) no lo recorte.
 */
import { syncStage, untrackStage } from "../../features/stages.js";
import { copyText, html, raw } from "../../ui/dom.js";
import { icon } from "../../ui/icons.js";
import { toast } from "../../ui/toast/toast.js";

let menu = null;

export function closeRowMenu() {
  menu?.remove();
  menu = null;
}

const ACTIONS = {
  async sync(nombre) {
    await syncStage(nombre);
  },
  async copy(nombre) {
    if (await copyText(nombre)) toast.info("Nombre copiado", nombre);
  },
  remove(nombre) {
    if (confirm(`¿Quitar “${nombre}” de este panel?\nLos datos guardados en la red no se borran.`)) untrackStage(nombre);
  },
};

export function openRowMenu(anchor, nombre) {
  if (menu?.dataset.owner === nombre) return closeRowMenu();
  closeRowMenu();
  menu = document.createElement("div");
  menu.className = "row-menu";
  menu.setAttribute("role", "menu");
  menu.dataset.owner = nombre;
  menu.innerHTML = html`
    <button type="button" role="menuitem" data-menu="sync">${raw(icon("sync"))} Leer porcentaje de la red</button>
    <button type="button" role="menuitem" data-menu="copy">${raw(icon("copy"))} Copiar nombre</button>
    <hr />
    <button type="button" role="menuitem" data-menu="remove" class="danger">${raw(icon("trash"))} Quitar del panel</button>`;
  document.body.appendChild(menu);

  // Se abre debajo del botón, o encima si no cabe.
  const a = anchor.getBoundingClientRect();
  const m = menu.getBoundingClientRect();
  const below = a.bottom + 6 + m.height <= window.innerHeight - 10;
  menu.style.top = `${Math.max(10, below ? a.bottom + 6 : a.top - 6 - m.height)}px`;
  menu.style.left = `${Math.max(10, a.right - m.width)}px`;

  menu.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-menu]");
    if (!b) return;
    closeRowMenu();
    ACTIONS[b.dataset.menu]?.(nombre);
  });
  menu.querySelector("button").focus();
}

// Cerrar al hacer clic fuera, desplazar, redimensionar o pulsar Escape.
document.addEventListener("click", (ev) => {
  if (menu && !ev.target.closest('.row-menu, [data-act="menu"]')) closeRowMenu();
});
document.addEventListener("keydown", (ev) => ev.key === "Escape" && closeRowMenu());
window.addEventListener("scroll", closeRowMenu, { passive: true });
window.addEventListener("resize", closeRowMenu);
