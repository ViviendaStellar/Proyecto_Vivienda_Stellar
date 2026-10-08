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

## Estructura
`css/styles.css` (sistema de diseño, modo claro/oscuro) · `js/data.js` (datos ficticios) · `js/ui.js` (logo, ilustraciones, gráficas, modales) · `js/app.js` (rutas y vistas) · `js/icons.js` (Lucide, licencia ISC) · fuentes Plus Jakarta Sans (OFL).

## Pendiente para la fase blockchain
Reemplazar `data.js` por API y los registros simulados (hash, firmas 2-de-3, huellas de documentos) por transacciones reales Stellar/Soroban. Los datos de demo se guardan solo en `localStorage` (menú de usuario → *Restablecer datos de demo*).
