// INN-LOCK · Cliente «supabase-js» simulado sobre PGlite (Postgres en el navegador) para probar la página completa
// en modo real sin tocar tu proyecto de Supabase. Ejecuta las migraciones reales, RLS incluida.
export function createMockClient(db) {
  let user = null, listener = null, chain = Promise.resolve();
  const blobs = new Map();   // «bucket/ruta» → Blob
  const urls = new Map();
  const lock = (fn) => { const run = chain.then(fn, fn); chain = run.catch(() => {}); return run; };
  const err = (e) => ({ message: e.message, code: e.code || null, details: e.detail || null });

  // Ejecuta una consulta con el rol y el usuario actuales (como lo haría PostgREST)
  function exec(sql, params, asAdmin) {
    return lock(async () => {
      await db.exec(`select set_config('request.jwt.claim.sub', '${user && !asAdmin ? user.id : ''}', false); ${asAdmin ? 'reset role' : user ? 'set role authenticated' : 'set role anon'};`);
      try { return await db.query(sql, params); } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); }
    });
  }
  const ident = (n) => '"' + String(n).replace(/"/g, '""') + '"';

  class Query {
    constructor(table) { this.t = table; this.op = 'select'; this.f = []; this.o = null; this.lim = null; this.rg = null; this.row = null; }
    select() { return this; }
    eq(c, v) { this.f.push([c, '=', v]); return this; }
    is(c, v) { this.f.push([c, 'is', v]); return this; }
    in(c, v) { this.f.push([c, 'in', v]); return this; }
    order(c, o) { this.o = [c, !(o && o.ascending === false)]; return this; }
    limit(n) { this.lim = n; return this; }
    range(a, b) { this.rg = [a, b]; return this; }
    insert(row) { this.op = 'insert'; this.row = row; return this; }
    update(row) { this.op = 'update'; this.row = row; return this; }
    delete() { this.op = 'delete'; return this; }
    then(res, rej) { return this.run().then(res, rej); }
    async run() {
      const params = []; const p = (v) => { params.push(v); return '$' + params.length; };
      const where = this.f.length ? ' where ' + this.f.map(([c, op, v]) => (op === 'is' ? `${ident(c)} is ${v === null ? 'null' : v}` : op === 'in' ? `${ident(c)} = any(${p(v)})` : `${ident(c)} = ${p(v)}`)).join(' and ') : '';
      const tbl = 'public.' + ident(this.t);
      let sql;
      if (this.op === 'select') sql = `select * from ${tbl}${where}${this.o ? ` order by ${ident(this.o[0])} ${this.o[1] ? 'asc' : 'desc'}` : ''}${this.lim != null ? ` limit ${+this.lim}` : ''}${this.rg ? ` limit ${this.rg[1] - this.rg[0] + 1} offset ${this.rg[0]}` : ''}`;
      else if (this.op === 'insert') { const ks = Object.keys(this.row); sql = `insert into ${tbl} (${ks.map(ident).join(',')}) values (${ks.map((k) => p(this.row[k])).join(',')})`; }
      else if (this.op === 'update') { const ks = Object.keys(this.row); sql = `update ${tbl} set ${ks.map((k) => `${ident(k)} = ${p(this.row[k])}`).join(',')}${where}`; }
      else sql = `delete from ${tbl}${where}`;
      try { const r = await exec(sql, params); return { data: this.op === 'select' ? r.rows : null, error: null }; } catch (e) { return { data: null, error: err(e) }; }
    }
  }

  const client = {
    from: (t) => new Query(t),
    async rpc(name, args) {
      const keys = Object.keys(args || {}); const params = keys.map((k) => { const v = args[k]; return v !== null && typeof v === 'object' ? JSON.stringify(v) : v; });
      try { const r = await exec(`select public.${ident(name)}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')}) as v`, params); return { data: r.rows[0] ? r.rows[0].v : null, error: null }; }
      catch (e) { return { data: null, error: err(e) }; }
    },
    auth: {
      async getSession() { return { data: { session: user ? { user } : null } }; },
      async signInWithPassword({ email, password }) {
        const r = await exec(`select id, email from auth.users where lower(email) = lower($1) and encrypted_password = extensions.crypt($2, encrypted_password)`, [email, password], true);
        if (!r.rows.length) return { data: {}, error: { message: 'Invalid login credentials' } };
        user = r.rows[0]; setTimeout(() => listener && listener('SIGNED_IN'), 0); return { data: { user, session: { user } }, error: null };
      },
      async signUp({ email, password, options }) {
        try {
          const r = await exec(`insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
            values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', $1, extensions.crypt($2, extensions.gen_salt('bf')), now(), '{}'::jsonb, $3::jsonb, now(), now()) returning id, email`,
            [email, password, JSON.stringify(options && options.data || {})], true);
          return { data: { user: { ...r.rows[0], identities: [{}] }, session: null }, error: null };   // como con «confirmar correo» activado
        } catch (e) { return { data: {}, error: /duplicate|unique/i.test(e.message) ? { message: 'User already registered' } : err(e) }; }
      },
      async signOut() { user = null; setTimeout(() => listener && listener('SIGNED_OUT'), 0); return { error: null }; },
      onAuthStateChange(cb) { listener = cb; return { data: { subscription: { unsubscribe() {} } } }; },
      async resetPasswordForEmail() { return { error: null }; },
      async updateUser() { return { error: null }; }
    },
    storage: {
      from: (bucket) => ({
        async upload(path, blob, opts) {
          try { await exec(`insert into storage.objects (bucket_id, name, owner) values ($1, $2, $3)`, [bucket, path, user && user.id]); blobs.set(bucket + '/' + path, blob); return { data: { path }, error: null }; }
          catch (e) { return { data: null, error: err(e) }; }
        },
        async createSignedUrls(paths) {
          const r = await exec(`select name from storage.objects where bucket_id = $1 and name = any($2)`, [bucket, paths]); const ok = new Set(r.rows.map((x) => x.name));
          return { data: paths.map((p) => { const b = blobs.get(bucket + '/' + p); if (!ok.has(p) || !b) return { signedUrl: null }; if (!urls.has(bucket + '/' + p)) urls.set(bucket + '/' + p, URL.createObjectURL(b)); return { signedUrl: urls.get(bucket + '/' + p) }; }), error: null };
        },
        async createSignedUrl(path) {
          const r = await exec(`select 1 from storage.objects where bucket_id = $1 and name = $2`, [bucket, path]); const b = blobs.get(bucket + '/' + path);
          if (!r.rows.length || !b) return { data: null, error: { message: 'Object not found' } };
          return { data: { signedUrl: URL.createObjectURL(b) }, error: null };
        },
        getPublicUrl(path) { const b = blobs.get(bucket + '/' + path); return { data: { publicUrl: b ? URL.createObjectURL(b) : '' } }; }
      })
    }
  };
  client._exec = exec;
  return client;
}
