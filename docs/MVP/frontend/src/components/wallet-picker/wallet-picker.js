/**
 * Selector de billetera.
 * pickWallet() abre la ventana y resuelve con el id elegido ("freighter" | "albedo").
 * Si el usuario la cierra, rechaza con un error que tiene `cancelled: true`.
 */
import "./wallet-picker.css";
import { WALLETS } from "../../services/wallets/index.js";
import { $, html, raw } from "../../ui/dom.js";
import { icon } from "../../ui/icons.js";

/** Datos visuales de cada billetera. Agrega aquí las nuevas. */
const META = {
  freighter: { letter: "F", desc: "Extensión del navegador", installUrl: "https://freighter.app" },
  albedo: { letter: "A", desc: "Sin instalar nada · se abre en una ventana" },
};

let root;

function render() {
  root = document.createElement("div");
  root.className = "overlay";
  root.hidden = true;
  root.innerHTML = html`
    <div class="modal wallet-modal" role="dialog" aria-modal="true" aria-labelledby="wp-title">
      <button class="icon-btn modal-close" type="button" data-cancel aria-label="Cerrar">${raw(icon("close"))}</button>
      <h3 id="wp-title">Conecta una billetera</h3>
      <p class="muted small">Necesitas una cuenta de Stellar en testnet para firmar.</p>
      <div class="wallet-list">
        ${raw(
          Object.values(WALLETS)
            .map((w) => html`
              <button class="wallet-opt" data-wallet="${w.id}" type="button">
                <span class="wallet-logo ${w.id}">${META[w.id]?.letter ?? w.label[0]}</span>
                <span class="wallet-text">
                  <strong>${w.label}</strong>
                  <span data-desc>${META[w.id]?.desc ?? ""}</span>
                </span>
                ${raw(icon("chevron"))}
              </button>`)
            .join("")
        )}
      </div>
      <p class="hint">Si usas el navegador integrado de VS Code, elige Albedo o abre la página en Chrome, Edge o Firefox.</p>
    </div>`;
  document.body.appendChild(root);
}

/** Revisa qué billeteras están disponibles y marca la recomendada. */
async function checkAvailability(state) {
  const albedoBtn = $('[data-wallet="albedo"]', root);
  albedoBtn?.classList.remove("suggested");
  for (const w of Object.values(WALLETS)) {
    const btn = $(`[data-wallet="${w.id}"]`, root);
    btn.classList.remove("unavailable");
    if (w.id !== "freighter") continue;
    const desc = $("[data-desc]", btn);
    desc.textContent = "Buscando la extensión…";
    const ok = await w.isAvailable();
    state.unavailable[w.id] = !ok;
    btn.classList.toggle("unavailable", !ok);
    desc.textContent = ok ? "Extensión detectada" : "No está en este navegador · toca para instalar";
    albedoBtn?.classList.toggle("suggested", !ok);
  }
}

export function pickWallet() {
  if (!root) render();
  root.hidden = false;
  const state = { unavailable: {} };
  checkAvailability(state);

  return new Promise((resolve, reject) => {
    const finish = (fn, value) => {
      root.hidden = true;
      root.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
      fn(value);
    };
    const cancel = () => finish(reject, Object.assign(new Error("Conexión cancelada."), { cancelled: true }));
    const onKey = (ev) => ev.key === "Escape" && cancel();
    const onClick = (ev) => {
      const opt = ev.target.closest("[data-wallet]");
      if (opt) {
        const id = opt.dataset.wallet;
        if (state.unavailable[id]) {
          window.open(META[id]?.installUrl, "_blank", "noopener");
          $("[data-desc]", opt).textContent = "Instálala, recarga la página y vuelve a intentarlo";
          return;
        }
        return finish(resolve, id);
      }
      if (ev.target === root || ev.target.closest("[data-cancel]")) cancel();
    };
    root.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
  });
}
