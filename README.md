# INN-LOCK

Plataforma que protege a los compradores de vivienda sobre planos: el dinero queda en custodia y se desembolsa a la constructora por hitos de obra, auditados por un interventor independiente.

## Ejecutar el proyecto

**Front-end** (HTML/CSS/JS, sin instalación ni dependencias externas):

```bash
cd frontend
python -m http.server 4180
```

Abre http://localhost:4180

- **Modo real** (por defecto): inicia sesión con tu cuenta; los datos viven en Supabase.
- **Modo demostración:** abre http://localhost:4180/?demo=1 (datos de ejemplo, sin base de datos).

**Base de datos** (Supabase / PostgreSQL), carpeta `frontend/supabase/`:

```bash
cd frontend
supabase link --project-ref <ref>
supabase db push
```

**Pruebas** (sin Docker):

```bash
cd frontend/supabase/tests
npm install
npm test
```

La página publicada está en https://viviendastellar.github.io/Proyecto_Vivienda_Stellar/
