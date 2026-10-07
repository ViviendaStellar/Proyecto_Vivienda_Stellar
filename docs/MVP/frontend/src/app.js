/**
 * Monta cada componente en su contenedor [data-mount="nombre"] de index.html.
 * Para agregar un componente nuevo:
 *   1. Crea src/components/<nombre>/<nombre>.js con una función mount.
 *   2. Agrégala a COMPONENTS.
 *   3. Pon <div data-mount="<nombre>"></div> donde va en index.html.
 */
import { mountSidebar } from "./components/sidebar/sidebar.js";
import { mountTopbar } from "./components/topbar/topbar.js";
import { mountProjectHero } from "./components/project-hero/project-hero.js";
import { mountOnboarding } from "./components/onboarding/onboarding.js";
import { mountStats } from "./components/stats/stats.js";
import { mountStageTable } from "./components/stage-table/stage-table.js";
import { mountActivity } from "./components/activity/activity.js";
import { mountQueryCard } from "./components/query-card/query-card.js";
import { mountCreateStageDrawer } from "./components/create-stage-drawer/create-stage-drawer.js";
import { mountProgressDrawer } from "./components/progress-drawer/progress-drawer.js";
import { syncAll } from "./features/stages.js";

const COMPONENTS = {
  sidebar: mountSidebar,
  topbar: mountTopbar,
  "project-hero": mountProjectHero,
  onboarding: mountOnboarding,
  stats: mountStats,
  "stage-table": mountStageTable,
  activity: mountActivity,
  "query-card": mountQueryCard,
  "create-stage-drawer": mountCreateStageDrawer,
  "progress-drawer": mountProgressDrawer,
};

export function startApp() {
  document.querySelectorAll("[data-mount]").forEach((el) => {
    const mount = COMPONENTS[el.dataset.mount];
    if (mount) mount(el);
    else console.warn(`Componente sin registrar: ${el.dataset.mount}`);
  });
  // Al abrir, el porcentaje de cada etapa se vuelve a leer del contrato.
  syncAll({ silent: true });
}
