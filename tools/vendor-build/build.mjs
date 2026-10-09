// Genera frontend/js/vendor/stellar.js a partir de entry.js.
// Uso: npm install && npm run build (desde esta carpeta).
import { build } from 'esbuild';
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const outfile = path.join(here, '..', '..', 'frontend', 'js', 'vendor', 'stellar.js');

const sdkPkg = JSON.parse(readFileSync(path.join(here, 'node_modules', '@stellar', 'stellar-sdk', 'package.json')));
const freighterPkg = JSON.parse(readFileSync(path.join(here, 'node_modules', '@stellar', 'freighter-api', 'package.json')));

const header = `/* INN-LOCK · paquete autocontenido para el modo testnet (sin CDN).
 * Generado con tools/vendor-build (ver ese README para reconstruirlo).
 * Expone window.StellarSdk y window.freighterApi.
 *
 * @stellar/stellar-sdk ${sdkPkg.version} — licencia ${sdkPkg.license}
 * @stellar/freighter-api ${freighterPkg.version} — licencia ${freighterPkg.license}
 */
`;

await build({
  entryPoints: [path.join(here, 'entry.js')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  minify: true,
  outfile,
});

writeFileSync(outfile, header + readFileSync(outfile, 'utf8'));

const { size } = statSync(outfile);
console.log(`Listo: ${outfile}`);
console.log(`Tamaño: ${(size / 1024).toFixed(1)} KB`);
console.log(`stellar-sdk ${sdkPkg.version} (${sdkPkg.license}), freighter-api ${freighterPkg.version} (${freighterPkg.license})`);
