/** Panel "Registrar avance": llama a actualizar_avance en el contrato. */
import "./progress-drawer.css";
import { getState, watch } from "../../store/store.js";
import { nextOpenStage, orderedStages } from "../../store/selectors.js";
import { registerProgress } from "../../features/stages.js";
import { closeDrawer, drawerTemplate, registerDrawer } from "../../ui/drawer/drawer.js";
import { $, $$, html, lockForm, raw } from "../../ui/dom.js";
import { icon } from "../../ui/icons.js";
import { pad2 } from "../../ui/format.js";
import { toast } from "../../ui/toast/toast.js";

const QUICK = [0, 25, 50, 75, 100];

export function mountProgressDrawer(root) {
  root.className = "drawer-wrap";
  root.innerHTML = drawerTemplate({
    id: "form-avance",
    title: "Registrar avance",
    subtitle: "Actualiza el porcentaje de una etapa.",
    iconHtml: icon("up"),
    iconClass: "ico-info",
    body: html`
      <label class="field">
        <span>Etapa</span>
        <select name="nombre" required></select>
      </label>
      <div class="pct-compare">
        <div><span class="pc-label eyebrow">Actual</span><strong data-current>0%</strong></div>
        ${raw(icon("arrowRight"))}
        <div><span class="pc-label eyebrow">Nuevo</span><strong class="pc-new" data-new>0%</strong></div>
      </div>
      <div class="field">
        <span>Porcentaje de avance</span>
        <input type="range" name="porcentaje" min="0" max="100" step="1" value="0" aria-label="Porcentaje de avance" />
        <div class="quick">${raw(QUICK.map((v) => `<button type="button" data-v="${v}">${v}%</button>`).join(""))}</div>
      </div>
      <label class="field">
        <span>Observaciones</span>
        <textarea name="observaciones" rows="4" maxlength="200" placeholder="Ej. Se completó el colado de zapatas."></textarea>
        <small class="counter"><span data-obs-count>0</span>/200</small>
      </label>`,
    footer: html`
      <button class="btn btn-ghost" type="button" data-close>Cancelar</button>
      <button class="btn btn-primary" type="submit">Guardar avance</button>`,
  });

  const form = $("form", root);
  const select = form.nombre;
  const range = form.porcentaje;

  /* ---------- Opciones del selector ---------- */
  watch((s) => [s.etapas], (s) => {
    const prev = select.value;
    select.innerHTML = orderedStages(s)
      .map(({ etapa, fase }) => html`<option value="${etapa.nombre}">${pad2(fase)} · ${etapa.nombre} (${etapa.porcentaje}%)</option>`)
      .join("");
    if (prev) select.value = prev;
  });

  /* ---------- Sincronía entre controles ---------- */
  const paintRange = () => {
    const v = Number(range.value);
    range.style.setProperty("--p", `${v}%`);
    $("[data-new]", form).textContent = `${v}%`;
    $$(".quick button", form).forEach((b) => b.classList.toggle("active", Number(b.dataset.v) === v));
  };

  const loadStage = () => {
    const e = getState().etapas.find((x) => x.nombre === select.value);
    const current = e?.porcentaje ?? 0;
    $("[data-current]", form).textContent = `${current}%`;
    range.value = current;
    form.observaciones.value = e?.observaciones && e.observaciones !== "Sin observaciones" ? e.observaciones : "";
    $("[data-obs-count]", form).textContent = form.observaciones.value.length;
    paintRange();
  };

  range.addEventListener("input", paintRange);
  select.addEventListener("change", loadStage);
  $(".quick", form).addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-v]");
    if (!b) return;
    range.value = b.dataset.v;
    paintRange();
  });
  form.observaciones.addEventListener("input", () => {
    $("[data-obs-count]", form).textContent = form.observaciones.value.length;
  });

  /* ---------- Apertura ---------- */
  registerDrawer("avance", {
    element: root,
    // Sin etapas no hay nada que actualizar: se abre "Nueva etapa".
    guard() {
      if (getState().etapas.length) return null;
      toast.info("Primero crea una etapa", "Necesitas al menos una etapa para registrar avance.");
      return "crear";
    },
    onOpen({ nombre } = {}) {
      select.value = nombre ?? nextOpenStage(getState())?.nombre ?? select.value;
      loadStage();
      setTimeout(() => range.focus(), 60);
    },
  });

  /* ---------- Envío ---------- */
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!select.value) return toast.err("Selecciona una etapa");
    lockForm(form, true);
    const ok = await registerProgress({
      nombre: select.value,
      porcentaje: Number(range.value),
      observaciones: form.observaciones.value,
    });
    lockForm(form, false);
    if (ok) closeDrawer();
  });
}
