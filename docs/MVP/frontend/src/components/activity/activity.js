/** Historial de transacciones confirmadas, con enlace al explorador. */
import "./activity.css";
import { getState, watch } from "../../store/store.js";
import { clearLog } from "../../store/actions.js";
import { explorerTx } from "../../config/env.js";
import { $, html, raw } from "../../ui/dom.js";
import { icon } from "../../ui/icons.js";
import { timeAgo } from "../../ui/format.js";

const MAX_ITEMS = 25;

function itemTemplate(l) {
  const created = l.tipo === "crear";
  const title = created
    ? html`Se creó la etapa <b>${l.nombre}</b>`
    : html`<b>${l.nombre}</b> avanzó al ${l.porcentaje}%`;
  return html`
    <li>
      <div class="tl-ico ${created ? "ico-brand" : "ico-info"}">${raw(icon(created ? "plus" : "up"))}</div>
      <div>
        <div class="tl-title">${raw(title)}</div>
        <div class="tl-meta">
          <span>${timeAgo(l.ts)}</span>
          ${l.hash ? raw(html`<a href="${explorerTx(l.hash)}" target="_blank" rel="noopener">Ver transacción ↗</a>`) : ""}
        </div>
      </div>
    </li>`;
}

export function mountActivity(root) {
  root.innerHTML = html`
    <div class="card-head compact">
      <h3>Actividad reciente</h3>
      <button class="link" type="button" data-clear>Limpiar</button>
    </div>
    <ol class="timeline" data-list></ol>
    <p class="muted small empty-line" data-empty>Las transacciones confirmadas aparecerán aquí con su enlace al explorador.</p>`;

  const render = (s) => {
    const items = s.log.slice(0, MAX_ITEMS);
    $("[data-list]", root).innerHTML = items.map(itemTemplate).join("");
    $("[data-empty]", root).hidden = items.length > 0;
    $("[data-clear]", root).hidden = items.length === 0;
  };
  watch((s) => [s.log], render);
  setInterval(() => render(getState()), 60_000); // refresca los "hace X min"

  $("[data-clear]", root).addEventListener("click", clearLog);
}
