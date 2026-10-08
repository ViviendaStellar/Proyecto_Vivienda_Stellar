/* INN-LOCK · Cronograma de obra: importación (Excel/CSV), validación y sugerencia automática.
   Sin dependencias: lee .xlsx directamente (ZIP + XML) usando DecompressionStream del navegador. */
(function (root) {
  'use strict';
  const D = root.INNLOCK, PHASES = D.PHASES;
  const MAX_FILE = 5 * 1024 * 1024;

  /* ---------- utilidades ---------- */
  const norm = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const round2 = (n) => Math.round(n * 100) / 100;
  const pad = (n) => String(n).padStart(2, '0');
  const isoDate = (y, m, d) => y + '-' + pad(m) + '-' + pad(d);

  function phaseKey(raw) {
    const s = norm(raw); if (!s) return null;
    const exact = PHASES.find((p) => norm(p.name) === s); if (exact) return exact.key;
    const rules = [['prel', /prelim|licenc|^1\b/], ['cim', /excav|cimen/], ['est', /estruct/], ['mam', /mamposter|cubiert/], ['ins', /instalac|redes tec/], ['aca', /acabad/], ['ent', /zona|entrega|comun/]];
    const hit = rules.find((r) => r[1].test(s)); return hit ? hit[0] : null;
  }
  const phaseIdx = (key) => PHASES.findIndex((p) => p.key === key);

  function parseNumber(v) {
    if (typeof v === 'number') return v;
    let s = String(v == null ? '' : v).replace(/[%$\s]/g, '').replace(/ /g, '');
    if (!s) return NaN;
    if (/,/.test(s) && /\./.test(s)) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    else if (/,/.test(s)) s = s.replace(',', '.');
    return /^-?\d+(\.\d+)?$/.test(s) ? parseFloat(s) : NaN;
  }
  function parseDate(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') { if (v < 20000 || v > 90000) return null; const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 864e5); return isoDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()); }
    const s = String(v).trim(); let m;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return isoDate(+m[1], +m[2], +m[3]);
    if ((m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/))) return isoDate(+m[3], +m[2], +m[1]);
    return null;
  }

  /* ---------- CSV ---------- */
  function parseCSV(text) {
    text = String(text).replace(/^﻿/, '');
    const head = text.split(/\r?\n/).slice(0, 12).join('\n');
    const delim = (head.match(/;/g) || []).length >= (head.match(/,/g) || []).length ? ';' : ',';
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === delim) { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }

  /* ---------- XLSX (ZIP + XML) ---------- */
  async function inflate(bytes) {
    const ds = new DecompressionStream('deflate-raw');
    const out = new Response(new Blob([bytes]).stream().pipeThrough(ds));
    return new Uint8Array(await out.arrayBuffer());
  }
  async function unzip(buf) {
    const u8 = new Uint8Array(buf), dv = new DataView(buf); let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('El archivo no es un Excel (.xlsx) válido.');
    const n = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true); const files = {}, dec = new TextDecoder();
    for (let i = 0; i < n; i++) {
      if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('Archivo Excel dañado.');
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
      const name = dec.decode(u8.subarray(p + 46, p + 46 + nl)); p += 46 + nl + el + cl;
      if (!/^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^/]+\.xml)$/.test(name)) continue;
      const start = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true), data = u8.subarray(start, start + csize);
      files[name] = method === 0 ? dec.decode(data) : method === 8 ? dec.decode(await inflate(data)) : (() => { throw new Error('Compresión no soportada.'); })();
    }
    return files;
  }
  const unxml = (s) => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, c) => String.fromCharCode(+c)).replace(/&amp;/g, '&');
  const colIdx = (ref) => { let n = 0; for (const ch of ref.replace(/\d+/g, '')) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
  function sheetRows(xml, shared) {
    const rows = [];
    (xml.match(/<row\b[\s\S]*?<\/row>/g) || []).forEach((rx) => {
      const rn = +((rx.match(/<row\b[^>]*\br="(\d+)"/) || [])[1] || rows.length + 1), arr = [];
      (rx.match(/<c\b[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) || []).forEach((cx) => {
        const ref = (cx.match(/\br="([A-Z]+\d+)"/) || [])[1]; if (!ref) return;
        const t = (cx.match(/\bt="(\w+)"/) || [])[1], v = (cx.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
        let val = null;
        if (t === 'inlineStr') val = unxml((cx.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || []).map((x) => x.replace(/<[^>]+>/g, '')).join(''));
        else if (v != null) val = t === 's' ? shared[+v] : t === 'str' ? unxml(v) : t === 'b' ? v === '1' : t === 'e' ? null : parseFloat(v);
        arr[colIdx(ref)] = val;
      });
      rows[rn - 1] = arr;
    });
    for (let i = 0; i < rows.length; i++) if (!rows[i]) rows[i] = [];
    return rows;
  }
  async function parseXLSX(buf) {
    const f = await unzip(buf);
    if (!f['xl/workbook.xml']) throw new Error('El archivo no parece un Excel de INN-LOCK.');
    const shared = ((f['xl/sharedStrings.xml'] || '').match(/<si>[\s\S]*?<\/si>/g) || []).map((si) => unxml((si.match(/<t[^>]*>[\s\S]*?<\/t>/g) || []).map((x) => x.replace(/<[^>]+>/g, '')).join('')));
    const rels = {}; (f['xl/_rels/workbook.xml.rels'] || '').replace(/<Relationship\b[^>]*>/g, (m) => { const id = (m.match(/\bId="([^"]+)"/) || [])[1], tg = (m.match(/\bTarget="([^"]+)"/) || [])[1]; if (id && tg) rels[id] = tg.replace(/^\/?(xl\/)?/, ''); return m; });
    const sheets = []; f['xl/workbook.xml'].replace(/<sheet\b[^>]*>/g, (m) => { const name = unxml((m.match(/\bname="([^"]*)"/) || [])[1] || ''), rid = (m.match(/\br:id="([^"]+)"/) || [])[1]; if (rels[rid]) sheets.push({ name, path: 'xl/' + rels[rid] }); return m; });
    const pick = sheets.find((s) => norm(s.name) === 'cronograma') || sheets.find((s) => !/instruc|ejemplo|fases/.test(norm(s.name))) || sheets[0];
    if (!pick || !f[pick.path]) throw new Error('No se encontró la hoja «Cronograma».');
    return sheetRows(f[pick.path], shared);
  }

  /* ---------- interpretación de filas (Excel o CSV) ---------- */
  function interpret(rows) {
    const out = { meta: { name: '', start: null, budget: null }, rows: [], errors: [], warnings: [] };
    let hdr = -1, cols = {};
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] || [], label = norm(r[0]);
      if (/^n.{0,3}\s*mes|^mes$|^no\.? mes/.test(label) && r.some((c) => /fase/.test(norm(c)))) {
        hdr = i; r.forEach((c, j) => { const h = norm(c); if (/fase/.test(h)) cols.phase = j; else if (/%|porcent/.test(h) && !/acumul/.test(h)) cols.pct = j; else if (/actividad/.test(h)) cols.acts = j; else if (/^n.{0,3}\s*mes|^mes$/.test(h)) cols.n = j; });
        break;
      }
      const val = r.slice(1).find((c) => c != null && c !== '');
      if (/nombre.*proyecto/.test(label)) out.meta.name = String(val == null ? '' : val).trim();
      else if (/fecha.*inicio/.test(label)) { out.meta.start = parseDate(val); if (val != null && val !== '' && !out.meta.start) out.warnings.push('La fecha de inicio no tiene un formato válido; complétala en el asistente.'); }
      else if (/presupuesto/.test(label) && !/control|suma/.test(label)) { const b = parseNumber(val); out.meta.budget = isNaN(b) ? null : b; }
    }
    if (hdr < 0 || cols.phase == null || cols.pct == null) { out.errors.push({ msg: 'No se encontró la tabla del cronograma. Use la plantilla de INN-LOCK sin cambiar los títulos de las columnas («N° mes», «Fase de obra», «% del presupuesto»).' }); return out; }
    for (let i = hdr + 1; i < rows.length; i++) {
      const r = rows[i] || [];
      if (!r.some((c) => c != null && String(c).trim() !== '')) { if (out.rows.length) break; else continue; }
      const nRaw = r[cols.n != null ? cols.n : 0], line = i + 1;
      if (/total|suma/.test(norm(nRaw))) break;
      const pctRaw = r[cols.pct], phRaw = r[cols.phase];
      if ((pctRaw == null || pctRaw === '') && (phRaw == null || phRaw === '') && !r[cols.acts]) continue;
      const key = phaseKey(phRaw), pct = parseNumber(pctRaw);
      if (!key) out.errors.push({ line, msg: `Fila ${line}: la fase «${phRaw == null ? '' : phRaw}» no es válida. Elija una de la lista de la plantilla.` });
      if (isNaN(pct)) out.errors.push({ line, msg: `Fila ${line}: el % del presupuesto «${pctRaw == null ? '' : pctRaw}» no es un número.` });
      out.rows.push({ phase: key || PHASES[0].key, pct: isNaN(pct) ? 0 : pct, acts: cols.acts != null && r[cols.acts] != null ? String(r[cols.acts]).replace(/\s*\|\s*|\s*\n\s*/g, '; ').trim() : '', line, bad: !key || isNaN(pct) });
      const n = parseNumber(nRaw); if (!isNaN(n) && n !== out.rows.length) out.warnings.push(`Fila ${line}: el N° de mes (${nRaw}) no coincide con la posición (${out.rows.length}); se usará el orden de las filas.`);
    }
    const tot = out.rows.reduce((s, r) => s + r.pct, 0);
    if (out.rows.length && out.rows.every((r) => r.pct <= 1) && tot > 0.95 && tot < 1.05) { out.rows.forEach((r) => { r.pct = round2(r.pct * 100); }); out.warnings.push('Los porcentajes venían como fracciones (0,04 = 4 %) y se convirtieron automáticamente.'); }
    if (!out.rows.length) out.errors.push({ msg: 'La tabla del cronograma está vacía.' });
    return out;
  }

  async function parseFile(file) {
    if (!file) throw new Error('Selecciona un archivo.');
    if (file.size > MAX_FILE) throw new Error('El archivo supera los 5 MB.');
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ext === 'xlsx') return interpret(await parseXLSX(await file.arrayBuffer()));
    if (ext === 'csv' || ext === 'txt') return interpret(parseCSV(await file.text()));
    throw new Error('Formato no soportado. Sube la plantilla en Excel (.xlsx) o CSV.');
  }

  /* ---------- validación ---------- */
  const capFor = (n) => Math.max(15, round2(200 / Math.max(1, n)));
  function validate(plan) {
    const rows = plan.rows || [], errors = [], warnings = [], n = rows.length, total = round2(rows.reduce((s, r) => s + (+r.pct || 0), 0));
    if (!plan.start || isNaN(Date.parse(plan.start))) errors.push({ msg: 'Indica la fecha de inicio de obra.' });
    if (!(plan.budget > 0)) errors.push({ msg: 'Indica el presupuesto total de la obra.' });
    if (n < 6) errors.push({ msg: `El cronograma tiene ${n} mes(es); el mínimo es 6.` });
    if (n > 60) errors.push({ msg: `El cronograma tiene ${n} meses; el máximo es 60.` });
    if (n && Math.abs(total - 100) > 0.01) errors.push({ msg: `Los porcentajes suman ${total.toLocaleString('es-CO')} %; deben sumar exactamente 100 % (${total > 100 ? 'sobran' : 'faltan'} ${Math.abs(round2(100 - total)).toLocaleString('es-CO')} puntos).`, key: 'sum' });
    const cap = capFor(n); let last = -1;
    rows.forEach((r, i) => {
      if (!(r.pct > 0)) errors.push({ row: i, msg: `Mes ${i + 1}: el % del presupuesto debe ser mayor que 0.` });
      else if (r.pct > cap) errors.push({ row: i, msg: `Mes ${i + 1}: ${r.pct} % supera el tope por hito (${cap} %).` });
      const pi = phaseIdx(r.phase);
      if (pi < 0) errors.push({ row: i, msg: `Mes ${i + 1}: elige una fase.` });
      else { if (pi < last) errors.push({ row: i, msg: `Mes ${i + 1}: la fase «${PHASES[pi].name}» vuelve a una etapa anterior; las fases deben avanzar en orden.` }); last = Math.max(last, pi); }
      if (!String(r.acts || '').trim()) errors.push({ row: i, msg: `Mes ${i + 1}: describe al menos una actividad.` });
    });
    if (n >= 6) {
      PHASES.forEach((p) => { if (!rows.some((r) => r.phase === p.key) && (p.key === 'est' || p.key === 'ent' || p.key === 'cim')) warnings.push(`El cronograma no incluye la fase «${p.name}».`); });
      if (rows[n - 1] && rows[n - 1].phase !== 'ent') warnings.push('El último mes no pertenece a «Zonas comunes y entrega».');
    }
    return { errors, warnings, total, cap, ok: errors.length === 0 };
  }

  /* ---------- sugerencia automática ---------- */
  function suggest(n) {
    n = Math.max(6, Math.min(60, Math.round(n) || 24));
    const cap = capFor(n), pp = PHASES.map((p) => p.pct), raw = pp.map((x) => (x * n) / 100), cnt = raw.map(Math.floor);
    let rest = n - cnt.reduce((a, b) => a + b, 0);
    raw.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (rest > 0) { cnt[i]++; rest--; } });
    // fases sin meses: su porcentaje pasa a la fase siguiente (o a la anterior si es la última)
    for (let i = 0; i < cnt.length; i++) if (!cnt[i]) { let t = cnt.findIndex((c, k) => k > i && c > 0); if (t < 0) t = cnt.map((c, k) => (k < i && c > 0 ? k : -1)).filter((k) => k >= 0).pop(); pp[t] += pp[i]; pp[i] = 0; }
    // respeta el tope por hito moviendo meses desde las fases más holgadas
    for (let guard = 0; guard < 80; guard++) {
      const bad = cnt.findIndex((c, k) => c && pp[k] / c > cap); if (bad < 0) break;
      let give = -1, best = Infinity; cnt.forEach((c, k) => { if (k !== bad && c > 1 && pp[k] / (c - 1) <= cap && pp[k] / c < best) { best = pp[k] / c; give = k; } });
      if (give < 0) break; cnt[give]--; cnt[bad]++;
    }
    const rows = [];
    PHASES.forEach((p, pi) => {
      const c = cnt[pi]; if (!c) return; const base = round2(pp[pi] / c); let acc = 0;
      for (let k = 0; k < c; k++) {
        const pct = k < c - 1 ? base : round2(pp[pi] - acc); acc += pct;
        rows.push({ phase: p.key, pct, acts: [0, 1, 2].map((j) => p.acts[(k + j * 2) % p.acts.length]).filter((a, x, arr) => arr.indexOf(a) === x).join('; ') });
      }
    });
    return rows;
  }

  root.SCHED = { parseFile, parseCSV, parseXLSX, interpret, validate, suggest, phaseKey, capFor, round2, parseDate };
})(typeof window !== 'undefined' ? window : globalThis);
