-- INN-LOCK · Migración 6: datos de catálogo (necesarios en todos los entornos)

insert into public.phases (key, name, ref_pct, sort, icon) values
  ('prel', 'Preliminares y licencias',  8, 1, 'file-check-2'),
  ('cim',  'Excavación y cimentación', 14, 2, 'layers'),
  ('est',  'Estructura',               30, 3, 'building-2'),
  ('mam',  'Mampostería y cubierta',   12, 4, 'blocks'),
  ('ins',  'Instalaciones técnicas',   12, 5, 'zap'),
  ('aca',  'Acabados',                 16, 6, 'hammer'),
  ('ent',  'Zonas comunes y entrega',   8, 7, 'flag')
on conflict (key) do nothing;

insert into public.document_types (key, title, subtitle, scope, required, has_expiry, sort) values
  ('camara',   'Certificado de Cámara de Comercio',        'Existencia y representación legal',                          'company', true,  true,  1),
  ('rut',      'Registro Único Tributario (RUT)',          'DIAN · Responsabilidades actualizadas',                      'company', true,  false, 2),
  ('poliza',   'Póliza de seguro de cumplimiento',         'Cumplimiento + RC extracontractual + todo riesgo construcción', 'company', true,  true,  3),
  ('fin',      'Estados financieros auditados',            'Cierre del último año · Revisor fiscal',                     'company', false, true,  4),
  ('licencia', 'Licencia de construcción',                 'Resolución de curaduría urbana (por proyecto)',              'project', true,  true,  5),
  ('planos',   'Planos del proyecto',                      'Arquitectónicos, estructurales y de instalaciones',          'project', true,  false, 6),
  ('fiducia',  'Encargo fiduciario / contrato de custodia', 'Patrimonio autónomo del proyecto',                          'project', true,  false, 7)
on conflict (key) do nothing;
