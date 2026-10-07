/**
 * Ventana de progreso de una transacción.
 *   const tx = showTxProgress("Registrando etapa", "Freighter");
 *   tx.step(TxStep.SIGN);  // avanza el indicador
 *   tx.close();
 */
import "./tx-progress.css";
import { $$, html, raw } from "../../ui/dom.js";

const STEPS = [
  { title: "Preparar", detail: "Simulando la operación" },
  { title: "Firmar", detail: "Aprueba en {wallet}" },
  { title: "Enviar", detail: "Transmitiendo a la red" },
  { title: "Confirmar", detail: "Esperando el ledger" },
];

let root;

export function showTxProgress(title, walletName = "tu billetera") {
  if (!root) {
    root = document.body.appendChild(document.createElement("div"));
    root.className = "overlay";
  }
  const rows = STEPS.map(
    (s) => html`<li><span class="tx-dot"></span><div><strong>${s.title}</strong><small>${s.detail.replace("{wallet}", walletName)}</small></div></li>`
  ).join("");

  root.innerHTML = html`
    <div class="modal tx-modal" role="dialog" aria-modal="true" aria-labelledby="tx-title" aria-live="polite">
      <h3 id="tx-title">${title}</h3>
      <p class="muted small">No cierres esta ventana.</p>
      <ol class="tx-steps">${raw(rows)}</ol>
    </div>`;

  const items = $$(".tx-steps li", root);
  const step = (n) =>
    items.forEach((li, i) => {
      li.classList.toggle("done", i < n);
      li.classList.toggle("active", i === n);
    });
  step(0);
  root.hidden = false;
  return { step, close: () => (root.hidden = true) };
}
