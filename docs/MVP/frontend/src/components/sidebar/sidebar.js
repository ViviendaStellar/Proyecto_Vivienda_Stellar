/**
 * Menú lateral: marca, nombre del proyecto, navegación, red y billetera.
 * En pantallas pequeñas se abre con cualquier botón [data-action="open-menu"].
 */
import "./sidebar.css";
import { getState, watch } from "../../store/store.js";
import { setProject } from "../../store/actions.js";
import { connectFromUI, disconnect, walletLabel } from "../../features/wallet.js";
import { CONTRACT_ID, NETWORK_LABEL, explorerContract } from "../../config/env.js";
import { $, $$, copyText, html, raw } from "../../ui/dom.js";
import { icon } from "../../ui/icons.js";
import { short } from "../../ui/format.js";
import { toast } from "../../ui/toast/toast.js";

const NAV = [
  { id: "resumen", label: "Resumen", icon: "grid" },
  { id: "etapas", label: "Etapas", icon: "list", count: true },
  { id: "actividad", label: "Actividad", icon: "pulse" },
  { id: "consultar", label: "Consultar en la red", icon: "search" },
];

export function mountSidebar(root) {
  root.innerHTML = html`
    <div class="sb-brand">
      <div class="brand-logo">${raw(icon("logo"))}</div>
      <div>
        <div class="brand-title">Avance de Obra</div>
        <div class="brand-sub">Bitácora en Stellar</div>
      </div>
    </div>

    <div class="sb-project">
      <span class="sb-label eyebrow">Proyecto</span>
      <button class="project-name" type="button" data-rename title="Cambiar nombre del proyecto">
        <span data-project></span>${raw(icon("edit"))}
      </button>
    </div>

    <nav class="sb-nav" aria-label="Secciones">
      ${raw(NAV.map((n) => html`
        <a href="#${n.id}" class="nav-item" data-nav="${n.id}">
          ${raw(icon(n.icon))}${n.label}${n.count ? raw('<span class="nav-count" data-count>0</span>') : ""}
        </a>`).join(""))}
    </nav>

    <div class="sb-bottom">
      <div class="net-card">
        <div class="net-row"><span class="net-dot"></span>${NETWORK_LABEL}</div>
        <a class="net-contract mono" href="${explorerContract()}" target="_blank" rel="noopener" title="Ver contrato en el explorador">
          Contrato ${short(CONTRACT_ID, 4, 4)} ↗
        </a>
      </div>
      <div class="wallet-card" data-wallet-card>
        <div class="wallet-avatar" data-wallet-avatar></div>
        <div class="wallet-info">
          <span class="wallet-title" data-wallet-title></span>
          <button class="wallet-sub" type="button" data-wallet-sub></button>
        </div>
        <button class="sb-btn" type="button" data-wallet-btn></button>
      </div>
    </div>`;

  const app = root.closest(".app");
  const scrim = app.querySelector(".scrim");

  /* ---------- Render reactivo ---------- */
  watch((s) => [s.project], (s) => ($("[data-project]", root).textContent = s.project));
  watch((s) => [s.etapas.length], (s) => ($("[data-count]", root).textContent = s.etapas.length));
  watch((s) => [s.address, s.wallet], (s) => {
    const on = !!s.address;
    $("[data-wallet-card]", root).classList.toggle("connected", on);
    $("[data-wallet-title]", root).textContent = on ? walletLabel(s.wallet) : "Sin billetera";
    const sub = $("[data-wallet-sub]", root);
    sub.textContent = on ? short(s.address, 6, 6) : "Conéctala para firmar";
    sub.title = on ? "Copiar dirección" : "";
    sub.disabled = !on;
    $("[data-wallet-avatar]", root).innerHTML = on ? s.address.slice(1, 3) : icon("wallet");
    $("[data-wallet-btn]", root).textContent = on ? "Salir" : "Conectar";
  });

  /* ---------- Eventos ---------- */
  $("[data-rename]", root).addEventListener("click", () => {
    const name = prompt("Nombre del proyecto u obra:", $("[data-project]", root).textContent);
    if (name !== null) setProject(name);
  });

  $("[data-wallet-btn]", root).addEventListener("click", (ev) => {
    if (getState().address) disconnect();
    else connectFromUI();
    ev.currentTarget.blur();
  });

  $("[data-wallet-sub]", root).addEventListener("click", async () => {
    const { address } = getState();
    if (address && (await copyText(address))) toast.info("Dirección copiada", short(address, 8, 8));
  });

  /* ---------- Menú móvil ---------- */
  const closeMenu = () => app.classList.remove("menu-open");
  document.addEventListener("click", (ev) => {
    if (ev.target.closest('[data-action="open-menu"]')) app.classList.add("menu-open");
  });
  scrim.addEventListener("click", closeMenu);
  $$(".nav-item", root).forEach((a) => a.addEventListener("click", closeMenu));

  /* ---------- Sección visible ---------- */
  const spy = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!visible) return;
      $$(".nav-item", root).forEach((a) => a.classList.toggle("active", a.dataset.nav === visible.target.id));
    },
    { rootMargin: "-80px 0px -55% 0px" }
  );
  NAV.forEach((n) => {
    const section = document.getElementById(n.id);
    if (section) spy.observe(section);
  });
  $(`[data-nav="${NAV[0].id}"]`, root).classList.add("active");
}
