/** Panel "Nueva etapa": llama a crear_etapa en el contrato. */
import "./create-stage-drawer.css";
import { getState } from "../../store/store.js";
import { createStage } from "../../features/stages.js";
import { closeDrawer, drawerTemplate, registerDrawer } from "../../ui/drawer/drawer.js";
import { $, $$, html, lockForm, raw } from "../../ui/dom.js";
import { icon } from "../../ui/icons.js";

/** Nombres de fase habituales en una obra. */
const SUGGESTIONS = ["Preliminares", "Cimentación", "Estructura", "Muros", "Instalaciones", "Acabados"];

export function mountCreateStageDrawer(root) {
  root.className = "drawer-wrap";
  root.innerHTML = drawerTemplate({
    id: "form-crear",
    title: "Nueva etapa",
    subtitle: "Se registra en el contrato con 0 % de avance.",
    iconHtml: icon("plus"),
    iconClass: "ico-brand",
    body: html`
      <label class="field">
        <span>Nombre de la etapa</span>
        <input name="nombre" required maxlength="60" placeholder="Ej. Cimentación" autocomplete="off" />
        <small>Usa un nombre único. Lo necesitarás para consultar la etapa.</small>
      </label>
      <div class="field">
        <span>Sugerencias</span>
        <div class="suggest">${raw(SUGGESTIONS.map((s) => html`<button type="button">${s}</button>`).join(""))}</div>
      </div>
      <label class="field">
        <span>Responsable</span>
        <input name="responsable" required maxlength="60" placeholder="Ej. Ing. Laura Pérez" autocomplete="off" />
      </label>
      <div class="notice">${raw(icon("info"))}<span>Al guardar, tu billetera te pedirá firmar. En testnet la comisión se paga con XLM de prueba.</span></div>`,
    footer: html`
      <button class="btn btn-ghost" type="button" data-close>Cancelar</button>
      <button class="btn btn-primary" type="submit">Registrar etapa</button>`,
  });

  const form = $("form", root);

  registerDrawer("crear", {
    element: root,
    onOpen() {
      const existing = new Set(getState().etapas.map((e) => e.nombre.toLowerCase()));
      $$(".suggest button", form).forEach((b) => (b.disabled = existing.has(b.textContent.toLowerCase())));
      setTimeout(() => form.nombre.focus(), 60);
    },
  });

  $(".suggest", form).addEventListener("click", (ev) => {
    const b = ev.target.closest("button");
    if (!b || b.disabled) return;
    form.nombre.value = b.textContent;
    form.responsable.focus();
  });

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!form.reportValidity()) return;
    const nombre = form.nombre.value.trim();
    const responsable = form.responsable.value.trim();
    lockForm(form, true);
    const ok = await createStage({ nombre, responsable });
    lockForm(form, false);
    if (ok) {
      form.reset();
      closeDrawer();
    }
  });
}
