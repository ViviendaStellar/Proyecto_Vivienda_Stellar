/** Banner del proyecto: nombre, estado de la obra y anillo de avance global. */
import "./project-hero.css";
import { getState, watch } from "../../store/store.js";
import { PROJECT_LABEL, summary } from "../../store/selectors.js";
import { NETWORK_LABEL } from "../../config/env.js";
import { $, html } from "../../ui/dom.js";
import { timeAgo } from "../../ui/format.js";

const RING_LEN = 2 * Math.PI * 52;

export function mountProjectHero(root) {
  root.innerHTML = html`
    <div class="ph-stripe" aria-hidden="true"></div>
    <div class="ph-body">
      <div class="ph-info">
        <span class="ph-status" data-status><span class="ph-status-dot"></span><span data-status-text></span></span>
        <h1 data-project></h1>
        <p>Control de avance por etapas. Cada registro queda firmado y guardado en la red de Stellar, sin posibilidad de alterarse.</p>
        <div class="ph-meta">
          <div><span class="eyebrow">Etapas</span><strong data-total>0</strong></div>
          <div><span class="eyebrow">Último registro</span><strong data-last>—</strong></div>
          <div class="ph-net"><span class="eyebrow">Red</span><strong>${NETWORK_LABEL}</strong></div>
        </div>
      </div>
      <div class="ph-ring" role="img" aria-label="Avance global">
        <svg viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" class="ring-track" />
          <circle cx="60" cy="60" r="52" class="ring-fill" data-ring />
        </svg>
        <div class="ring-center">
          <span class="ring-value" data-avg>0%</span>
          <span class="ring-caption eyebrow">Avance global</span>
        </div>
      </div>
    </div>`;

  watch((s) => [s.project], (s) => ($("[data-project]", root).textContent = s.project));

  const paint = (s) => {
    const { total, avg, last, projectStatus } = summary(s);
    $("[data-status]", root).className = `ph-status ${projectStatus}`;
    $("[data-status-text]", root).textContent = PROJECT_LABEL[projectStatus];
    $("[data-total]", root).textContent = total;
    $("[data-last]", root).textContent = last ? timeAgo(last) : "—";
    $("[data-avg]", root).textContent = `${avg}%`;
    $(".ph-ring", root).setAttribute("aria-label", `Avance global ${avg}%`);
    const ring = $("[data-ring]", root);
    ring.style.strokeDashoffset = RING_LEN * (1 - avg / 100);
    ring.style.opacity = avg > 0 ? 1 : 0; // Evita un punto suelto cuando el avance es 0%.
    ring.classList.toggle("complete", avg >= 100);
  };
  watch((s) => [s.etapas], paint);
  // "Último registro" es relativo al reloj: se refresca cada minuto.
  setInterval(() => paint(getState()), 60_000);
}
