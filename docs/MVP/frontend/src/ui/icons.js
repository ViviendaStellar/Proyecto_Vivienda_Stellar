/**
 * Iconos SVG de trazo (estilo Lucide). Se usan como `raw(icon("plus"))`
 * dentro de la plantilla html``, o con innerHTML.
 */
const PATHS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  up: '<path d="m5 12 7-7 7 7M12 19V5"/>',
  sync: '<path d="M20 11a8 8 0 0 0-14.9-4M4 4v4h4M4 13a8 8 0 0 0 14.9 4M20 20v-4h-4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  copy: '<path d="M8 4h9a2 2 0 0 1 2 2v11M5 8h9a2 2 0 0 1 2 2v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/>',
  more: '<circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/>',
  ok: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  err: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  wallet: '<path d="M3 7a2 2 0 0 1 2-2h13v4M3 7v10a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2zM16 14h.01"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  grid: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  pulse: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  square: '<circle cx="12" cy="12" r="9"/><path d="M9 9h6v6H9z"/>',
  building: '<path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6"/>',
  logo: '<path d="M7 23h18M10 23V13l6-4 6 4v10M14 23v-5h4v5"/>',
};

export function icon(name, cls = "ico") {
  const viewBox = name === "logo" ? "0 0 32 32" : "0 0 24 24";
  return `<svg viewBox="${viewBox}" class="${cls}" aria-hidden="true">${PATHS[name] ?? ""}</svg>`;
}
