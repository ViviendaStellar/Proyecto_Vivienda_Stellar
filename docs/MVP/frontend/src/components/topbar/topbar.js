/** Barra superior: ruta del proyecto, estado de sincronización y acciones principales. */
import "./topbar.css";
import { watch } from "../../store/store.js";
import { syncAll } from "../../features/stages.js";
import { $, html, raw } from "../../ui/dom.js";
import { icon } from "../../ui/icons.js";

export function mountTopbar(root) {
  root.innerHTML = html`
    <button class="icon-btn menu-btn" type="button" data-action="open-menu" aria-label="Abrir menú">${raw(icon("menu"))}</button>
    <div class="crumbs">
      <span class="muted">Proyectos</span>
      ${raw(icon("chevron", "ico crumb-sep"))}
      <strong data-project></strong>
    </div>
    <div class="topbar-actions">
      <span class="sync-state" data-sync><span class="sync-dot"></span><span data-sync-text></span></span>
      <button class="btn btn-ghost" type="button" data-sync-btn title="Volver a leer los porcentajes del contrato">
        ${raw(icon("sync"))}<span class="hide-sm">Sincronizar</span>
      </button>
      <button class="btn btn-accent" type="button" data-open="crear">${raw(icon("plus"))}Nueva etapa</button>
    </div>`;

  watch((s) => [s.project], (s) => ($("[data-project]", root).textContent = s.project));

  const syncBtn = $("[data-sync-btn]", root);
  watch((s) => [s.sync], ({ sync }) => {
    $("[data-sync]", root).className = `sync-state ${sync.status}`;
    $("[data-sync-text]", root).textContent = sync.text;
    syncBtn.disabled = sync.status === "busy";
    syncBtn.classList.toggle("spinning", sync.status === "busy");
  });

  syncBtn.addEventListener("click", () => syncAll());
}
