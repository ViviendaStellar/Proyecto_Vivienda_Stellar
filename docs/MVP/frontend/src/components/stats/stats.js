/** Cuatro indicadores: total, sin iniciar, en curso y terminadas. */
import "./stats.css";
import { watch } from "../../store/store.js";
import { summary } from "../../store/selectors.js";
import { $, html, raw } from "../../ui/dom.js";
import { icon } from "../../ui/icons.js";

const CARDS = [
  { key: "total", label: "Total de etapas", icon: "list", tone: "neutral" },
  { key: "pend", label: "Sin iniciar", icon: "square", tone: "brand" },
  { key: "prog", label: "En curso", icon: "clock", tone: "info" },
  { key: "done", label: "Terminadas", icon: "ok", tone: "ok" },
];

export function mountStats(root) {
  root.innerHTML = CARDS.map((c) => html`
    <div class="card stat stat-${c.tone}">
      <div class="stat-ico ico-${c.tone}">${raw(icon(c.icon))}</div>
      <span class="stat-label eyebrow">${c.label}</span>
      <span class="stat-value" data-kpi="${c.key}">0</span>
    </div>`).join("");

  watch((s) => [s.etapas], (s) => {
    const { total, counts } = summary(s);
    const values = { total, ...counts };
    CARDS.forEach((c) => ($(`[data-kpi="${c.key}"]`, root).textContent = values[c.key]));
  });
}
