/**
 * Tabla de etapas: búsqueda, filtros por estado y una fila por fase.
 * Cada fila tiene "Registrar avance" y un menú con más opciones.
 */
import "./stage-table.css";
import { watch } from "../../store/store.js";
import { setFilter, setQuery } from "../../store/actions.js";
import { STATUS_LABEL, statusOf, summary, visibleStages } from "../../store/selectors.js";
import { openDrawer } from "../../ui/drawer/drawer.js";
import { $, $$, html, raw } from "../../ui/dom.js";
import { icon } from "../../ui/icons.js";
import { avatarFor, pad2, timeAgo } from "../../ui/format.js";
import { openRowMenu, closeRowMenu } from "./row-menu.js";

const FILTERS = [
  { key: "all", label: "Todas" },
  { key: "pend", label: "Sin iniciar" },
  { key: "prog", label: "En curso" },
  { key: "done", label: "Terminadas" },
];

function rowTemplate({ etapa: e, fase }, i) {
  const st = statusOf(e.porcentaje);
  const av = avatarFor(e.responsable);
  const obs = e.observaciones && e.observaciones !== "Sin observaciones" ? e.observaciones : "";
  const person = e.responsable
    ? html`<div class="person"><div class="avatar" style="background:${av.color}">${av.initials}</div><span>${e.responsable}</span></div>`
    : `<span class="person-none">Sin asignar</span>`;
  return html`
    <tr style="animation-delay:${i * 30}ms" data-name="${e.nombre}">
      <td class="td-name">
        <div class="st-cell">
          <span class="phase-no ${st}">${pad2(fase)}</span>
          <div>
            <div class="st-title"><span class="st-name">${e.nombre}</span><span class="badge ${st}">${STATUS_LABEL[st]}</span></div>
            <div class="st-obs" title="${obs}">${obs || `Actualizado ${timeAgo(e.actualizado)}`}</div>
          </div>
        </div>
      </td>
      <td class="td-person">${raw(person)}</td>
      <td class="td-progress">
        <div class="progress"><div class="bar ${st}"><i data-w="${e.porcentaje}"></i></div><strong>${e.porcentaje}%</strong></div>
      </td>
      <td class="td-actions">
        <div class="row-actions">
          <button class="btn btn-ghost" type="button" data-act="edit" title="Registrar avance">${raw(icon("up"))}<span class="lbl-long">Registrar avance</span><span class="lbl-short">Avance</span></button>
          <button class="icon-btn" type="button" data-act="menu" aria-label="Más opciones" aria-haspopup="menu">${raw(icon("more"))}</button>
        </div>
      </td>
    </tr>`;
}

export function mountStageTable(root) {
  root.innerHTML = html`
    <div class="card-head">
      <div>
        <h2>Etapas de la obra</h2>
        <p class="muted small">Fases en orden de ejecución · el porcentaje se lee del contrato</p>
      </div>
      <label class="search">
        ${raw(icon("search"))}
        <span class="sr-only">Buscar</span>
        <input type="search" placeholder="Buscar etapa o responsable" data-search />
      </label>
    </div>
    <div class="filter-bar" role="tablist">
      ${raw(FILTERS.map((f) => html`<button type="button" role="tab" data-filter="${f.key}">${f.label} <span data-count="${f.key}">0</span></button>`).join(""))}
    </div>
    <div class="table-wrap">
      <table class="stage-table">
        <thead>
          <tr>
            <th class="eyebrow">Etapa</th>
            <th class="eyebrow">Responsable</th>
            <th class="eyebrow col-progress">Progreso</th>
            <th class="col-actions"><span class="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody data-rows></tbody>
      </table>
    </div>
    <div class="empty" data-empty hidden>
      <div class="empty-ico">${raw(icon("building"))}</div>
      <h3 data-empty-title></h3>
      <p class="muted" data-empty-text></p>
      <button class="btn btn-primary" type="button" data-open="crear" data-empty-cta>${raw(icon("plus"))} Crear primera etapa</button>
    </div>`;

  const body = $("[data-rows]", root);

  /* ---------- Render ---------- */
  watch((s) => [s.etapas], (s) => {
    const { total, counts } = summary(s);
    $$("[data-count]", root).forEach((el) => (el.textContent = el.dataset.count === "all" ? total : counts[el.dataset.count]));
  });

  watch((s) => [s.filter], (s) => {
    $$("[data-filter]", root).forEach((b) => b.classList.toggle("active", b.dataset.filter === s.filter));
  });

  watch((s) => [s.etapas, s.filter, s.query], (s) => {
    closeRowMenu();
    const rows = visibleStages(s);
    const hasRows = rows.length > 0;
    $(".table-wrap", root).hidden = !hasRows;
    $("[data-empty]", root).hidden = hasRows;
    if (!hasRows) {
      const none = s.etapas.length === 0;
      $("[data-empty-title]", root).textContent = none ? "Aún no hay etapas" : "Sin resultados";
      $("[data-empty-text]", root).textContent = none
        ? "Crea la primera etapa para empezar a medir el avance de la obra."
        : "Ninguna etapa coincide con la búsqueda o el filtro.";
      $("[data-empty-cta]", root).hidden = !none;
      body.innerHTML = "";
      return;
    }
    body.innerHTML = rows.map(rowTemplate).join("");
    requestAnimationFrame(() => $$(".bar > i", body).forEach((b) => (b.style.width = `${b.dataset.w}%`)));
  });

  /* ---------- Eventos ---------- */
  $("[data-search]", root).addEventListener("input", (ev) => setQuery(ev.target.value));
  $(".filter-bar", root).addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-filter]");
    if (b) setFilter(b.dataset.filter);
  });
  body.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-act]");
    if (!btn) return;
    const nombre = btn.closest("tr").dataset.name;
    if (btn.dataset.act === "edit") openDrawer("avance", { nombre });
    if (btn.dataset.act === "menu") openRowMenu(btn, nombre);
  });
}
