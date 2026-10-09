# tools/vendor-build

Genera `frontend/js/vendor/stellar.js`: un solo archivo autocontenido (sin CDN) que expone `window.StellarSdk` y `window.freighterApi`, igual que ya existe `frontend/js/vendor/supabase.js`. Esta carpeta **no** es parte de la app — solo sirve para reconstruir ese archivo cuando haga falta (por ejemplo, al subir de versión el SDK).

## Paquetes empaquetados

| Paquete | Versión | Licencia |
|---|---|---|
| [`@stellar/stellar-sdk`](https://www.npmjs.com/package/@stellar/stellar-sdk) | 17.2.1 | Apache-2.0 |
| [`@stellar/freighter-api`](https://www.npmjs.com/package/@stellar/freighter-api) | 6.0.1 | Apache-2.0 |

Ambas son compatibles con uso y redistribución; el archivo generado conserva un encabezado con esta misma información.

## Reconstruir el archivo

```bash
cd tools/vendor-build
npm install
npm run build
```

Esto escribe `frontend/js/vendor/stellar.js` (≈ 825 KB, minificado con [esbuild](https://esbuild.github.io/)). `node_modules/` no se sube al repo (ver `.gitignore` de esta carpeta).
