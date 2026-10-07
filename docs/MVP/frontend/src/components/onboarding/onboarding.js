/** Guía de primeros pasos. Se oculta sola cuando los tres pasos están completos. */
import "./onboarding.css";
import { watch } from "../../store/store.js";
import { onboardingSteps } from "../../store/selectors.js";
import { connectFromUI } from "../../features/wallet.js";
import { $, $$, html, raw } from "../../ui/dom.js";

const STEPS = [
  { key: "wallet", title: "Conecta tu billetera", text: "Freighter o Albedo firman cada registro.", button: "Conectar", attr: 'data-action="connect"' },
  { key: "stage", title: "Crea la primera etapa", text: "Por ejemplo, Cimentación o Estructura.", button: "Crear etapa", attr: 'data-open="crear"' },
  { key: "progress", title: "Registra un avance", text: "Indica el porcentaje y una observación.", button: "Registrar", attr: 'data-open="avance"' },
];

export function mountOnboarding(root) {
  root.innerHTML = html`
    <div class="ob-head">
      <div>
        <h3>Primeros pasos</h3>
        <p class="muted small">Completa estos tres pasos para empezar a registrar tu obra.</p>
      </div>
      <div class="ob-progress"><span data-count>0</span> de ${STEPS.length}</div>
    </div>
    <ol class="ob-steps">
      ${raw(STEPS.map((s, i) => `
        <li class="ob-step" data-step="${s.key}">
          <span class="ob-num">${i + 1}</span>
          <div class="ob-text"><strong>${s.title}</strong><span>${s.text}</span></div>
          <button class="btn btn-sm btn-ghost" type="button" ${s.attr}>${s.button}</button>
        </li>`).join(""))}
    </ol>`;

  $('[data-action="connect"]', root).addEventListener("click", connectFromUI);

  watch((s) => [s.address, s.etapas, s.log], (s) => {
    const { done, count, current } = onboardingSteps(s);
    root.hidden = count === STEPS.length;
    $("[data-count]", root).textContent = count;
    $$(".ob-step", root).forEach((li) => {
      li.classList.toggle("done", done[li.dataset.step]);
      li.classList.toggle("current", li.dataset.step === current);
    });
  });
}
