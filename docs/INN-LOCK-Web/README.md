# INN-LOCK · Plataforma de seguridad para compra de vivienda sobre planos

Front-end completo (sin backend todavía). Todo está **autocontenido**: fuentes, íconos, ilustraciones y gráficas se sirven desde esta carpeta, sin CDN ni librerías externas en tiempo de ejecución. Incluye service worker para cargar sin conexión.

## Ejecutar
```
python -m http.server 4180
```
y abrir http://localhost:4180 (también funciona abriendo `index.html` directamente, salvo el modo offline).

## Perfiles de demostración (contraseña `demo1234`)
| Perfil | Correo |
|---|---|
| Administrador | admin@inn-lock.co |
| Comprador | comprador@inn-lock.co |
| Constructora | constructora@inn-lock.co |
| Interventor | interventor@inn-lock.co |

## Pantallas
- **Login** con selección de perfil · **Panel** por rol · **Proyectos**
- **Información** del proyecto (ubicación, descripción, render, tipologías, equipo, mapa)
- **Constructora y legal**: Cámara de Comercio, RUT, póliza, planos, licencia; un documento vencido bloquea los desembolsos
- **Avance de obra** mes a mes (curva S + línea de tiempo) con flujo constructora → interventor
- **Desembolsos** (fondos en custodia, calendario, registro on-chain simulado)
- Comprador: **Mi inversión** · Admin: **Usuarios** y **Auditoría**
- **Registrar proyecto** (constructora): asistente de 4 pasos (datos, documentación, presupuesto y cronograma, resumen). El cronograma se arma en pantalla, con sugerencia automática, o se importa desde la **plantilla Excel/CSV** (`assets/plantilla/`). Validaciones: suma 100 %, fases en orden, tope por hito, actividades por mes.
- **Evidencias del mes**: la constructora adjunta fotos (mín. 3, máx. 8), videos e informe PDF al enviar el hito; el interventor las ve en la tarjeta del mes y en el modal de aprobación, con visor de fotos. Las fotos se guardan reducidas en el navegador (demo).
- **Cambios de cronograma**: una vez activo, el cronograma queda bloqueado. La constructora solicita ajustar los % de los meses pendientes (el total debe conservarse, con motivo obligatorio) y el interventor aprueba o rechaza; queda historial y los meses se marcan «Ajustado».
- **Solicitudes** (interventor y administrador): el interventor aprueba o devuelve el cronograma; el administrador valida y activa el proyecto, que queda bloqueado y visible para compradores.

## Estructura
`css/styles.css` (sistema de diseño, modo claro/oscuro) · `js/data.js` (datos ficticios) · `js/ui.js` (logo, ilustraciones, gráficas, modales) · `js/app.js` (rutas y vistas) · `js/schedule.js` (lector de Excel/CSV, validación y sugerencia de cronograma) · `js/wizard.js` (registro y aprobación de proyectos) · `js/icons.js` (Lucide, licencia ISC) · fuentes Plus Jakarta Sans (OFL).

## Pendiente para la fase blockchain
Reemplazar `data.js` por API y los registros simulados (hash, firmas 2-de-3, huellas de documentos) por transacciones reales Stellar/Soroban. Los datos de demo se guardan solo en `localStorage` (menú de usuario → *Restablecer datos de demo*).
