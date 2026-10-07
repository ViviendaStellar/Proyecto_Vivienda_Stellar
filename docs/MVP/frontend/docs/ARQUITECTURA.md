# Arquitectura de la página web

Esta guía explica cómo está organizado el código de la página y dónde hacer cada tipo de cambio. Está pensada para quien se suma al equipo.

## Idea general

La página no usa ningún framework. Es JavaScript moderno con módulos, empaquetado con Vite. El código se divide en capas. Cada capa solo puede importar de las capas que están debajo de ella.

```text
 components/      Lo que se ve. Una carpeta por pieza visual.
     │
 features/        Casos de uso: crear etapa, registrar avance, sincronizar.
     │
 store/           Estado de la aplicación y cálculos derivados.
 services/        Conexión con la red de Stellar y con las billeteras.
     │
 config/  ui/     Configuración y utilidades sin estado.
```

Las reglas que sostienen esta división son tres:

1. **Los componentes no hablan con la red.** Llaman a una función de `features/`.
2. **Nadie modifica el estado directamente.** Todo cambio pasa por `store/actions.js`.
3. **Los componentes no se importan entre sí.** Se comunican a través del estado o del registro de paneles.

## Carpetas

### `src/config/`

[env.js](../src/config/env.js) lee el ID del contrato y la URL del RPC desde `.env`. También define la red y los enlaces al explorador.

### `src/services/`

Todo lo que sale del navegador.

| Archivo | Responsabilidad |
|---|---|
| [stellar/rpc.js](../src/services/stellar/rpc.js) | Simular lecturas y enviar escrituras a cualquier función del contrato. |
| [stellar/obra-contract.js](../src/services/stellar/obra-contract.js) | Una función JavaScript por cada función del contrato. |
| [wallets/index.js](../src/services/wallets/index.js) | Registro de billeteras y firma con la que esté conectada. |
| [wallets/freighter.js](../src/services/wallets/freighter.js) | Adaptador de la extensión Freighter. |
| [wallets/albedo.js](../src/services/wallets/albedo.js) | Adaptador de Albedo. |

Si el contrato cambia, el único archivo que hay que tocar en esta capa es `obra-contract.js`.

### `src/store/`

| Archivo | Responsabilidad |
|---|---|
| [store.js](../src/store/store.js) | Guarda el estado, avisa a quien esté suscrito y persiste en `localStorage`. |
| [actions.js](../src/store/actions.js) | Las únicas funciones que cambian el estado. |
| [selectors.js](../src/store/selectors.js) | Cálculos puros a partir del estado: resumen, filtros, orden de fases. |
| [storage.js](../src/store/storage.js) | Lectura y escritura segura de `localStorage`. |

El estado tiene esta forma:

```js
{
  etapas: [{ nombre, responsable, porcentaje, observaciones, creado, actualizado }],
  log:    [{ tipo: "crear" | "avance", nombre, porcentaje, hash, ts }],
  project: "Mi obra",
  address: null,          // dirección de la billetera conectada
  wallet:  null,          // "freighter" | "albedo"
  filter:  "all",         // "all" | "pend" | "prog" | "done"
  query:   "",
  sync:    { status: "ok" | "busy" | "err", text: "..." },
}
```

Solo `etapas`, `log` y `project` se guardan en el navegador. El contrato no permite listar etapas ni leer el responsable, por eso se guardan localmente. El porcentaje siempre se vuelve a leer de la red.

### `src/features/`

Cada función combina red, estado y avisos al usuario.

| Archivo | Funciones |
|---|---|
| [stages.js](../src/features/stages.js) | `createStage`, `registerProgress`, `syncAll`, `syncStage`, `queryStage`, `trackStage`, `untrackStage` |
| [wallet.js](../src/features/wallet.js) | `ensureWallet`, `connectFromUI`, `disconnect` |

Las funciones que escriben en la red devuelven `true` si todo salió bien. Ellas mismas muestran los errores, así que el componente solo decide si cierra su panel.

### `src/components/`

Cada componente vive en su propia carpeta con su JavaScript y su CSS.

| Componente | Qué muestra |
|---|---|
| `sidebar` | Menú lateral, nombre del proyecto, red y billetera. |
| `topbar` | Ruta, estado de sincronización y botón **Nueva etapa**. |
| `project-hero` | Banner con el estado de la obra y el anillo de avance global. |
| `onboarding` | Guía de tres pasos para quien entra por primera vez. |
| `stats` | Cuatro indicadores de etapas. |
| `stage-table` | Tabla de fases con búsqueda, filtros y menú por fila. |
| `activity` | Historial de transacciones. |
| `query-card` | Consulta gratuita de cualquier etapa. |
| `create-stage-drawer` | Panel para crear una etapa. |
| `progress-drawer` | Panel para registrar avance. |
| `wallet-picker` | Ventana para elegir billetera. |
| `tx-progress` | Ventana con los pasos de una transacción. |

### `src/ui/`

Utilidades sin estado que usan todos los componentes.

| Archivo | Para qué |
|---|---|
| [dom.js](../src/ui/dom.js) | `$`, `$$`, la plantilla `html` que escapa texto, `raw` y `lockForm`. |
| [format.js](../src/ui/format.js) | Fechas relativas, direcciones cortas, avatares y mensajes de error legibles. |
| [icons.js](../src/ui/icons.js) | Iconos SVG por nombre. |
| [toast/](../src/ui/toast/toast.js) | Avisos emergentes: `toast.ok`, `toast.err`, `toast.info`. |
| [drawer/](../src/ui/drawer/drawer.js) | Registro y apertura de paneles laterales. |

### `src/styles/`

| Archivo | Contenido |
|---|---|
| [tokens.css](../src/styles/tokens.css) | Colores, tipografías, sombras y capas. Incluye el modo oscuro. |
| [base.css](../src/styles/base.css) | Reinicio, tipografía y utilidades como `.card` o `.muted`. |
| [layout.css](../src/styles/layout.css) | Rejilla general de la página. |
| [controls.css](../src/styles/controls.css) | Botones, campos, insignias, barras y ventanas modales. |

## Cómo fluye un registro de avance

```text
1. El usuario pulsa "Guardar avance".
2. progress-drawer.js llama a registerProgress() de features/stages.js.
3. registerProgress() pide la billetera con ensureWallet().
4. Abre la ventana tx-progress y llama a actualizarAvance() de obra-contract.js.
5. rpc.js prepara, firma, envía y confirma la transacción.
6. registerProgress() llama a patchStage() y addLog() de actions.js.
7. store.js avisa a los componentes suscritos.
8. stage-table, stats, project-hero y activity se vuelven a pintar solos.
```

## Cómo se escribe un componente

Todos siguen el mismo molde:

```js
import "./mi-componente.css";
import { watch } from "../../store/store.js";
import { $, html } from "../../ui/dom.js";

export function mountMiComponente(root) {
  // 1. Pintar la estructura fija una sola vez.
  root.innerHTML = html`<h3>Título</h3><p data-total></p>`;

  // 2. Actualizar solo lo que cambia. watch() se ejecuta al inicio
  //    y cada vez que cambia algo de lo que devuelve el selector.
  watch((s) => [s.etapas], (s) => {
    $("[data-total]", root).textContent = s.etapas.length;
  });

  // 3. Escuchar eventos y llamar a features/ o actions/.
}
```

Usa atributos `data-*` para encontrar elementos dentro del componente. Así el CSS puede cambiar de clases sin romper el JavaScript.

## Seguridad: escapar texto

Los nombres de etapa y los responsables los escribe el usuario. Nunca los insertes con `innerHTML` sin escapar.

```js
html`<b>${etapa.nombre}</b>`        // correcto: se escapa solo
html`<div>${raw(icon("plus"))}</div>` // raw() solo para HTML que generaste tú
el.textContent = etapa.nombre        // también correcto
```

## Recetas

### Agregar un componente

1. Crea `src/components/mi-componente/mi-componente.js` y su `.css`.
2. Exporta `mountMiComponente(root)`.
3. Regístralo en el objeto `COMPONENTS` de [app.js](../src/app.js).
4. Pon `<section data-mount="mi-componente"></section>` donde corresponda en [index.html](../index.html).

### Agregar un panel lateral

1. Crea el componente y usa `drawerTemplate()` de `ui/drawer/drawer.js` para la estructura.
2. Llama a `registerDrawer("nombre", { element: root, onOpen })`.
3. Ábrelo desde cualquier parte con `openDrawer("nombre")` o con `data-open="nombre"` en un botón.

### Exponer una función nueva del contrato

1. Agrega la función en Rust en `contracts/hello-world/src/lib.rs` y vuelve a desplegar.
2. Agrega la función JavaScript en [obra-contract.js](../src/services/stellar/obra-contract.js). Usa `simulate()` para lecturas e `invoke()` para escrituras.
3. Crea el caso de uso en `features/`.
4. Llama al caso de uso desde el componente.

### Agregar una billetera

1. Crea `src/services/wallets/mi-billetera.js` con `id`, `label`, `isAvailable()`, `connect()` y `sign(xdr, address)`.
2. Agrégala a `WALLETS` en [wallets/index.js](../src/services/wallets/index.js).
3. Agrega su letra y descripción en `META` dentro de [wallet-picker.js](../src/components/wallet-picker/wallet-picker.js).

### Cambiar colores o tipografía

Edita solo [tokens.css](../src/styles/tokens.css). Todos los componentes usan esas variables.
