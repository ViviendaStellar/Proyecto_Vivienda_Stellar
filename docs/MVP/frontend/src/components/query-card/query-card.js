/** Consulta gratuita del porcentaje de cualquier etapa, sin billetera. */
import "./query-card.css";
import { isTracked, queryStage, trackStage } from "../../features/stages.js";
import { STATUS_LABEL, statusOf } from "../../store/selectors.js";
import { $, html, lockForm, raw } from "../../ui/dom.js";
import { icon } from "../../ui/icons.js";
import { friendlyError } from "../../ui/format.js";
import { toast } from "../../ui/toast/toast.js";

function resultTemplate(nombre, pct) {
  const st = statusOf(pct);
  return html`
    <div class="qr-top"><strong>${nombre}</strong><span class="badge ${st}">${STATUS_LABEL[st]}</span></div>
    <div class="qr-pct">${pct}%<small>según el contrato</small></div>
    <div class="bar ${st}"><i style="width:${pct}%"></i></div>
    ${pct === 0 ? raw('<p class="hint">Un 0% también aparece si la etapa no existe en el contrato.</p>') : ""}
    ${isTracked(nombre) ? "" : raw(html`<button type="button" class="btn btn-ghost" data-track>${raw(icon("plus"))} Agregar al panel</button>`)}`;
}

export function mountQueryCard(root) {
  root.innerHTML = html`
    <div class="card-head compact">
      <div>
        <h3>Consultar en la red</h3>
        <p class="muted small">Gratis y sin billetera.</p>
      </div>
    </div>
    <form class="query-form" data-form>
      <div class="input-group">
        <label class="sr-only" for="query-name">Nombre de la etapa</label>
        <input class="input" id="query-name" name="nombre" required placeholder="Nombre exacto de la etapa" autocomplete="off" />
        <button class="btn btn-accent" type="submit">Consultar</button>
      </div>
      <div class="query-result" data-result hidden></div>
    </form>`;

  const form = $("[data-form]", root);
  const box = $("[data-result]", root);

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const nombre = form.nombre.value.trim();
    if (!nombre) return;
    lockForm(form, true);
    try {
      const pct = await queryStage(nombre);
      box.innerHTML = resultTemplate(nombre, pct);
      box.hidden = false;
      $("[data-track]", box)?.addEventListener("click", (e) => {
        trackStage(nombre, pct);
        e.currentTarget.remove();
      });
    } catch (e) {
      toast.err("Error en la consulta", friendlyError(e));
    } finally {
      lockForm(form, false);
    }
  });
}
