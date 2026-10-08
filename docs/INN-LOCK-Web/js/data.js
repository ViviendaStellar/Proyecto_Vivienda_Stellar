/* INN-LOCK · Datos de demostración
   Todo el contenido es ficticio y se genera localmente (sin servicios externos).
   Cuando exista el backend / contratos Soroban, este módulo se reemplaza por llamadas a la API. */
(function () {
  'use strict';

  const DEMO_TODAY = new Date('2026-10-08T12:00:00');

  /* ---------- utilidades de datos ---------- */
  function rng(seed) { // mulberry32
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function txHash(seed) {
    const r = rng(seed * 7919 + 13); let s = '';
    for (let i = 0; i < 64; i++) s += Math.floor(r() * 16).toString(16);
    return s;
  }
  const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };

  /* ---------- fases de obra ---------- */
  const PHASES = [
    { key: 'prel', name: 'Preliminares y licencias', pct: 8, icon: 'file-check-2',
      acts: ['Cerramiento y campamento de obra', 'Descapote y localización', 'Instalación de redes provisionales', 'Estudios de suelos y topografía', 'Replanteo y control de niveles'] },
    { key: 'cim', name: 'Excavación y cimentación', pct: 14, icon: 'layers',
      acts: ['Excavación mecánica y entibado', 'Pilotaje y vigas de cimentación', 'Fundida de placa de contrapiso', 'Impermeabilización de sótanos', 'Muros de contención'] },
    { key: 'est', name: 'Estructura', pct: 30, icon: 'building-2',
      acts: ['Armado de acero de refuerzo', 'Fundida de columnas y pantallas', 'Fundida de placas de entrepiso', 'Encofrado y desencofrado', 'Pruebas de resistencia de concreto', 'Fundida de escaleras y ascensores'] },
    { key: 'mam', name: 'Mampostería y cubierta', pct: 12, icon: 'blocks',
      acts: ['Levante de muros de fachada', 'Mampostería interior', 'Dinteles y alfajías', 'Impermeabilización de cubierta', 'Pañetes y revoques'] },
    { key: 'ins', name: 'Instalaciones técnicas', pct: 12, icon: 'zap',
      acts: ['Redes hidrosanitarias', 'Redes eléctricas y datos', 'Red contra incendios', 'Montaje de ascensores', 'Gas domiciliario y ventilación'] },
    { key: 'aca', name: 'Acabados', pct: 16, icon: 'hammer',
      acts: ['Enchapes y pisos', 'Carpintería de madera y metálica', 'Pintura de interiores', 'Aparatos sanitarios y grifería', 'Cocinas integrales', 'Ventanería y vidrios'] },
    { key: 'ent', name: 'Zonas comunes y entrega', pct: 8, icon: 'flag',
      acts: ['Zonas verdes y paisajismo', 'Salón social y gimnasio', 'Pruebas finales y puesta en marcha', 'Recibo de servicios públicos', 'Entrega de unidades a propietarios'] }
  ];

  const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  /* Genera el calendario de obra mes a mes y el estado de cada hito. */
  function buildMonths(proj) {
    const months = []; let n = 0; const rand = rng(proj.seed);
    proj.phaseMonths.forEach((count, pi) => {
      const ph = PHASES[pi];
      for (let k = 0; k < count; k++) {
        n++;
        const date = addMonths(new Date(proj.start + 'T12:00:00'), n - 1);
        const tranche = ph.pct / count; // % del presupuesto
        const acts = [];
        for (let a = 0; a < 3; a++) acts.push(ph.acts[(k + a * 2 + Math.floor(rand() * 2)) % ph.acts.length]);
        months.push({
          n, phase: ph.key, phaseName: ph.name, icon: ph.icon,
          label: MONTH_NAMES[date.getMonth()] + ' ' + date.getFullYear(),
          year: date.getFullYear(), month: date.getMonth(),
          tranchePct: tranche, activities: [...new Set(acts)],
          deviation: (rand() - 0.5) * 3.2, // desviación vs plan (puntos %)
          photos: 14 + Math.floor(rand() * 22), videos: Math.floor(rand() * 4)
        });
      }
    });
    let cum = 0;
    months.forEach((m) => {
      cum += m.tranchePct; m.plannedCum = cum;
      if (m.n < proj.currentMonth - 1) m.status = 'desembolsado';
      else if (m.n === proj.currentMonth - 1) m.status = proj.pendingReview ? 'revision' : 'desembolsado';
      else if (m.n === proj.currentMonth) m.status = 'en_curso';
      else m.status = 'pendiente';
      if (m.status === 'desembolsado') {
        m.actualCum = Math.max(0, Math.min(100, m.plannedCum + (m.n >= 4 ? m.deviation - proj.drift : 0)));
        m.tx = txHash(proj.seed * 100 + m.n);
        const rel = addMonths(new Date(proj.start + 'T12:00:00'), m.n); rel.setDate(4 + Math.floor(rand() * 6));
        m.releasedOn = rel.toISOString().slice(0, 10);
        m.ledger = 51200000 + proj.seed * 90000 + m.n * 17311;
      }
      if (m.status === 'revision') m.actualCum = Math.max(0, m.plannedCum - proj.drift - 0.6);
      m.reviewer = proj.interventor;
    });
    // Un hito pasado con observaciones resueltas (historial para la demo)
    if (months[3]) months[3].history = [
      { t: 'observado', by: 'interventor', text: 'Faltan ensayos de resistencia a 28 días de la primera fundida. Se solicita adjuntar el informe del laboratorio.' },
      { t: 'subsanado', by: 'constructora', text: 'Se adjunta informe del laboratorio acreditado ONAC. Resistencia: 28.4 MPa (≥ 28 MPa de diseño).' },
      { t: 'aprobado', by: 'interventor', text: 'Observaciones subsanadas. Hito aprobado y desembolso autorizado.' }
    ];
    return months;
  }

  /* ---------- constructoras ---------- */
  const CONSTRUCTORAS = [
    {
      id: 'c1', name: 'Cimientos & Desarrollos S.A.S.', short: 'Cimientos & Desarrollos', nit: '901.482.115-3',
      rep: 'Carolina Mejía Ortiz', repRole: 'Representante legal', city: 'Medellín', founded: 2012,
      delivered: 14, units: 1830, sqm: '212.400', email: 'legal@cimientosydesarrollos.co', phone: '+57 604 555 0142',
      rating: 4.8, colors: ['#1450C8', '#12A8F0'],
      about: 'Constructora antioqueña con más de una década desarrollando vivienda de mediana y alta gama. Certificada en gestión de calidad ISO 9001 y con encargo fiduciario en todos sus proyectos.',
      docs: [
        { key: 'camara', req: true, title: 'Certificado de Cámara de Comercio', sub: 'Existencia y representación legal', issuer: 'Cámara de Comercio de Medellín', number: 'CE-2026-448201', issued: '2026-09-20', expires: '2026-10-20', size: '412 KB', pages: 6 },
        { key: 'rut', req: true, title: 'Registro Único Tributario (RUT)', sub: 'DIAN · Responsabilidades actualizadas', issuer: 'DIAN', number: 'NIT 901.482.115-3', issued: '2026-02-14', expires: null, size: '188 KB', pages: 4 },
        { key: 'poliza', req: true, title: 'Póliza de seguro de cumplimiento', sub: 'Cumplimiento + RC extracontractual + todo riesgo construcción', issuer: 'Seguros Bolívar', number: 'POL-CUM-9021874', issued: '2026-03-15', expires: '2027-03-15', size: '1.2 MB', pages: 18, insured: 7680000000 },
        { key: 'planos', req: true, title: 'Planos del proyecto', sub: 'Arquitectónicos, estructurales y de instalaciones', issuer: 'Curaduría Urbana 2', number: 'Versión 3.2 · 55 planos', issued: '2026-01-20', expires: null, size: '48.6 MB', pages: 55 },
        { key: 'licencia', req: true, title: 'Licencia de construcción', sub: 'Resolución de curaduría urbana', issuer: 'Curaduría Urbana 2 Medellín', number: 'LC-2025-0842', issued: '2025-08-12', expires: '2027-08-12', size: '2.4 MB', pages: 22 },
        { key: 'fiducia', req: false, title: 'Encargo fiduciario / contrato de custodia', sub: 'Patrimonio autónomo del proyecto', issuer: 'Fiduciaria Andina', number: 'FA-PA-2025-117', issued: '2025-10-02', expires: null, size: '3.1 MB', pages: 41 },
        { key: 'fin', req: false, title: 'Estados financieros auditados', sub: 'Cierre 2025 · Revisor fiscal', issuer: 'Revisoría Fiscal RF&A', number: 'EEFF-2025', issued: '2026-03-30', expires: '2027-03-30', size: '5.2 MB', pages: 64 }
      ]
    },
    {
      id: 'c2', name: 'Arquitectura y Obra Andina Ltda.', short: 'Arquitectura Andina', nit: '830.117.904-1',
      rep: 'Julián Pardo Vega', repRole: 'Gerente general', city: 'Bogotá D.C.', founded: 2008,
      delivered: 22, units: 3120, sqm: '388.900', email: 'juridica@andinaobra.co', phone: '+57 601 555 0188',
      rating: 4.6, colors: ['#0B2A6F', '#1450C8'],
      about: 'Firma bogotana especializada en proyectos residenciales verticales de la zona norte de la capital, con certificación EDGE de construcción sostenible.',
      docs: [
        { key: 'camara', req: true, title: 'Certificado de Cámara de Comercio', sub: 'Existencia y representación legal', issuer: 'Cámara de Comercio de Bogotá', number: 'CE-2026-771002', issued: '2026-08-21', expires: '2026-09-20', size: '398 KB', pages: 5 },
        { key: 'rut', req: true, title: 'Registro Único Tributario (RUT)', sub: 'DIAN · Responsabilidades actualizadas', issuer: 'DIAN', number: 'NIT 830.117.904-1', issued: '2026-04-02', expires: null, size: '176 KB', pages: 4 },
        { key: 'poliza', req: true, title: 'Póliza de seguro de cumplimiento', sub: 'Cumplimiento + RC extracontractual + todo riesgo construcción', issuer: 'Sura Seguros', number: 'POL-CUM-7740312', issued: '2026-03-01', expires: '2027-03-01', size: '1.1 MB', pages: 16, insured: 10400000000 },
        { key: 'planos', req: true, title: 'Planos del proyecto', sub: 'Arquitectónicos, estructurales y de instalaciones', issuer: 'Curaduría Urbana 5', number: 'Versión 2.0 · 48 planos', issued: '2026-02-11', expires: null, size: '41.9 MB', pages: 48, status: 'revision' },
        { key: 'licencia', req: true, title: 'Licencia de construcción', sub: 'Resolución de curaduría urbana', issuer: 'Curaduría Urbana 5 Bogotá', number: 'LC-2026-0215', issued: '2026-01-27', expires: '2028-01-27', size: '2.1 MB', pages: 19 },
        { key: 'fiducia', req: false, title: 'Encargo fiduciario / contrato de custodia', sub: 'Patrimonio autónomo del proyecto', issuer: 'Fiduciaria Capital', number: 'FC-PA-2026-033', issued: '2026-02-20', expires: null, size: '2.8 MB', pages: 37 },
        { key: 'fin', req: false, title: 'Estados financieros auditados', sub: 'Cierre 2025 · Revisor fiscal', issuer: 'Deloitte & Touche Ltda.', number: 'EEFF-2025', issued: '2026-03-28', expires: '2027-03-28', size: '6.0 MB', pages: 72 }
      ]
    },
    {
      id: 'c3', name: 'Costa Verde Constructores S.A.', short: 'Costa Verde', nit: '806.552.390-7',
      rep: 'María Fernanda Ospino', repRole: 'Presidente', city: 'Cartagena', founded: 2005,
      delivered: 31, units: 4650, sqm: '541.300', email: 'contacto@costaverde.co', phone: '+57 605 555 0107',
      rating: 4.9, colors: ['#0A8F8F', '#12A8F0'],
      about: 'Referente en vivienda turística y residencial del Caribe colombiano. Más de 30 proyectos entregados a tiempo y sin litigios con compradores.',
      docs: [
        { key: 'camara', req: true, title: 'Certificado de Cámara de Comercio', sub: 'Existencia y representación legal', issuer: 'Cámara de Comercio de Cartagena', number: 'CE-2026-125567', issued: '2026-10-01', expires: '2026-10-31', size: '405 KB', pages: 7 },
        { key: 'rut', req: true, title: 'Registro Único Tributario (RUT)', sub: 'DIAN · Responsabilidades actualizadas', issuer: 'DIAN', number: 'NIT 806.552.390-7', issued: '2026-01-19', expires: null, size: '181 KB', pages: 4 },
        { key: 'poliza', req: true, title: 'Póliza de seguro de cumplimiento', sub: 'Cumplimiento + RC extracontractual + todo riesgo construcción', issuer: 'Allianz Seguros', number: 'POL-CUM-5512980', issued: '2026-01-10', expires: '2027-01-10', size: '1.3 MB', pages: 20, insured: 12300000000 },
        { key: 'planos', req: true, title: 'Planos del proyecto', sub: 'Arquitectónicos, estructurales y de instalaciones', issuer: 'Curaduría Urbana 1', number: 'Versión 4.1 · 71 planos', issued: '2025-04-30', expires: null, size: '63.2 MB', pages: 71 },
        { key: 'licencia', req: true, title: 'Licencia de construcción', sub: 'Resolución de curaduría urbana', issuer: 'Curaduría Urbana 1 Cartagena', number: 'LC-2025-0377', issued: '2025-03-14', expires: '2027-03-14', size: '2.6 MB', pages: 25 },
        { key: 'fiducia', req: false, title: 'Encargo fiduciario / contrato de custodia', sub: 'Patrimonio autónomo del proyecto', issuer: 'Fiduciaria Bancolombia', number: 'FB-PA-2025-061', issued: '2025-05-12', expires: null, size: '3.4 MB', pages: 44 },
        { key: 'fin', req: false, title: 'Estados financieros auditados', sub: 'Cierre 2025 · Revisor fiscal', issuer: 'KPMG Colombia', number: 'EEFF-2025', issued: '2026-03-25', expires: '2027-03-25', size: '7.4 MB', pages: 88 }
      ]
    }
  ];

  /* ---------- interventores ---------- */
  const INTERVENTORES = [
    { id: 'i1', name: 'Ing. Ricardo Salazar', firm: 'Salazar & Asociados · Interventoría', license: 'Mat. Prof. 05202-318877 ANT', email: 'ricardo@salazarinterventoria.co' },
    { id: 'i2', name: 'Ing. Paola Barrios', firm: 'Interventoría Caribe S.A.S.', license: 'Mat. Prof. 13202-224019 BLV', email: 'paola@interventoriacaribe.co' }
  ];

  /* ---------- proyectos ---------- */
  const PROJECTS_RAW = [
    {
      id: 'p1', seed: 11, name: 'Torres del Parque', tagline: 'Dos torres frente al Parque Lineal de El Poblado',
      city: 'Medellín', zone: 'El Poblado', address: 'Cra. 43A # 12 Sur - 50', lat: 6.2005, lng: -75.5712,
      constructora: 'c1', interventor: 'i1', status: 'En construcción',
      description: 'Complejo residencial de dos torres de 28 pisos con apartamentos de 58 a 112 m², balcones amplios y vista abierta al Valle de Aburrá. Cuenta con zonas sociales de 4.200 m², coworking, gimnasio, piscina cubierta y certificación de construcción sostenible.',
      towers: 2, floors: 28, units: 224, sold: 171, parking: 280, area: '58 – 112 m²', priceFrom: 485000000, strata: 6,
      budget: 38400000000, start: '2025-11-01', months: 24, phaseMonths: [2, 3, 7, 3, 3, 4, 2], currentMonth: 12, pendingReview: true, drift: 1.4,
      amenities: ['Piscina cubierta', 'Gimnasio', 'Coworking', 'Salón social', 'Zona BBQ', 'Pet park', 'Bicicletero', 'Seguridad 24/7', 'Lobby doble altura', 'Terraza panorámica'],
      typologies: [
        { name: 'Tipo A · 2 alcobas', area: 58, beds: 2, baths: 2, parking: 1, price: 485000000 },
        { name: 'Tipo B · 3 alcobas', area: 82, beds: 3, baths: 2, parking: 2, price: 652000000 },
        { name: 'Tipo C · 3 alcobas + estudio', area: 112, beds: 3, baths: 3, parking: 2, price: 884000000 }
      ],
      planos: [
        { name: 'Planos arquitectónicos', n: 24, v: '3.2', date: '2026-01-20', size: '21.4 MB' },
        { name: 'Planos estructurales', n: 14, v: '3.1', date: '2026-01-20', size: '12.9 MB' },
        { name: 'Planos hidrosanitarios', n: 8, v: '3.0', date: '2026-01-18', size: '6.2 MB' },
        { name: 'Planos eléctricos y de datos', n: 9, v: '3.0', date: '2026-01-18', size: '8.1 MB' }
      ], scene: { sky: 0, floors: 12, towers: 2 }
    },
    {
      id: 'p2', seed: 23, name: 'Altos de Chicó', tagline: 'Vivienda boutique en el corazón del norte de Bogotá',
      city: 'Bogotá D.C.', zone: 'Chicó Norte', address: 'Cl. 98 # 9A - 41', lat: 4.6786, lng: -74.0475,
      constructora: 'c2', interventor: 'i1', status: 'En construcción',
      description: 'Torre única de 22 pisos con apartamentos de diseño de 64 a 145 m², terrazas privadas y acabados de primera. Ubicada a pasos de parques, restaurantes y universidades, con acceso directo a vías principales.',
      towers: 1, floors: 22, units: 66, sold: 38, parking: 112, area: '64 – 145 m²', priceFrom: 720000000, strata: 6,
      budget: 52000000000, start: '2026-03-01', months: 20, phaseMonths: [2, 3, 5, 2, 3, 3, 2], currentMonth: 8, pendingReview: true, drift: 0.8,
      amenities: ['Spa y sauna', 'Gimnasio', 'Salón de eventos', 'Cine privado', 'Terraza BBQ', 'Lobby con concierge', 'Parqueadero de visitantes', 'Domótica'],
      typologies: [
        { name: 'Tipo 1 · 2 alcobas', area: 64, beds: 2, baths: 2, parking: 1, price: 720000000 },
        { name: 'Tipo 2 · 3 alcobas', area: 98, beds: 3, baths: 3, parking: 2, price: 1090000000 },
        { name: 'Penthouse dúplex', area: 145, beds: 4, baths: 4, parking: 3, price: 1650000000 }
      ],
      planos: [
        { name: 'Planos arquitectónicos', n: 20, v: '2.0', date: '2026-02-11', size: '18.8 MB' },
        { name: 'Planos estructurales', n: 12, v: '2.0', date: '2026-02-11', size: '11.0 MB' },
        { name: 'Planos hidrosanitarios', n: 8, v: '2.0', date: '2026-02-10', size: '5.4 MB' },
        { name: 'Planos eléctricos y de datos', n: 8, v: '2.0', date: '2026-02-10', size: '6.7 MB' }
      ], scene: { sky: 1, floors: 14, towers: 1 }
    },
    {
      id: 'p3', seed: 37, name: 'Mirador del Mar', tagline: 'Tres torres con vista directa a la bahía de Cartagena',
      city: 'Cartagena', zone: 'Bocagrande', address: 'Av. San Martín # 7 - 120', lat: 10.4012, lng: -75.5547,
      constructora: 'c3', interventor: 'i2', status: 'En construcción',
      description: 'Conjunto de tres torres frente al mar Caribe con apartamentos de 52 a 130 m². Piscina infinita, club de playa y vistas despejadas. Ideal para vivienda y renta turística, con operador hotelero opcional.',
      towers: 3, floors: 24, units: 288, sold: 244, parking: 340, area: '52 – 130 m²', priceFrom: 560000000, strata: 6,
      budget: 61500000000, start: '2025-06-01', months: 30, phaseMonths: [2, 4, 9, 4, 4, 5, 2], currentMonth: 17, pendingReview: false, drift: 0.3,
      amenities: ['Piscina infinita', 'Club de playa', 'Spa', 'Gimnasio', 'Zona de coworking', 'Parque infantil', 'Marina privada', 'Operador hotelero'],
      typologies: [
        { name: 'Suite · 1 alcoba', area: 52, beds: 1, baths: 1, parking: 1, price: 560000000 },
        { name: 'Tipo B · 2 alcobas', area: 78, beds: 2, baths: 2, parking: 1, price: 790000000 },
        { name: 'Tipo C · 3 alcobas', area: 130, beds: 3, baths: 3, parking: 2, price: 1320000000 }
      ],
      planos: [
        { name: 'Planos arquitectónicos', n: 30, v: '4.1', date: '2025-04-30', size: '28.1 MB' },
        { name: 'Planos estructurales', n: 18, v: '4.0', date: '2025-04-30', size: '16.2 MB' },
        { name: 'Planos hidrosanitarios', n: 11, v: '4.0', date: '2025-04-28', size: '8.3 MB' },
        { name: 'Planos eléctricos y de datos', n: 12, v: '4.0', date: '2025-04-28', size: '10.6 MB' }
      ], scene: { sky: 2, floors: 18, towers: 3 }
    }
  ];

  const PROJECTS = PROJECTS_RAW.map((p) => {
    p.monthsData = buildMonths(p);
    p.end = addMonths(new Date(p.start + 'T12:00:00'), p.months).toISOString().slice(0, 10);
    return p;
  });

  /* ---------- usuarios de demostración ---------- */
  const USERS = [
    { id: 'u-admin', role: 'admin', name: 'Laura Gómez', title: 'Administradora de plataforma', email: 'admin@inn-lock.co', password: 'demo1234', projects: ['p1', 'p2', 'p3'] },
    { id: 'u-comp', role: 'comprador', name: 'Andrés Restrepo', title: 'Comprador · Apto. 1204 Torre A', email: 'comprador@inn-lock.co', password: 'demo1234', projects: ['p1'], unit: { code: 'Torre A · Apto. 1204', area: 82, price: 652000000, paid: 195600000, plan: '30% cuota inicial · 70% crédito hipotecario', next: '2026-11-05', nextAmount: 6520000, installments: [24, 17], beds: 3, baths: 2, parking: 2 } },
    { id: 'u-cons', role: 'constructora', name: 'Carolina Mejía', title: 'Representante legal · Cimientos & Desarrollos', email: 'constructora@inn-lock.co', password: 'demo1234', projects: ['p1'], company: 'c1' },
    { id: 'u-int', role: 'interventor', name: 'Ricardo Salazar', title: 'Interventor · Salazar & Asociados', email: 'interventor@inn-lock.co', password: 'demo1234', projects: ['p1', 'p2'], interventor: 'i1' }
  ];

  const ROLES = {
    admin: { label: 'Administrador', desc: 'Gestiona la plataforma, proyectos y usuarios', icon: 'user-cog' },
    comprador: { label: 'Comprador', desc: 'Sigue tu inversión y el avance de tu proyecto', icon: 'key-round' },
    constructora: { label: 'Constructora', desc: 'Carga evidencias y gestiona tus desembolsos', icon: 'hard-hat' },
    interventor: { label: 'Interventor', desc: 'Audita el avance y autoriza los desembolsos', icon: 'clipboard-check' }
  };

  /* ---------- registro de auditoría inicial ---------- */
  const SEED_LOG = [
    { d: '2026-10-06T16:42', who: 'Salazar & Asociados', role: 'interventor', pid: 'p1', text: 'Visita de obra registrada · Torre B piso 14', icon: 'clipboard-check' },
    { d: '2026-10-05T10:15', who: 'Cimientos & Desarrollos', role: 'constructora', pid: 'p1', text: 'Cargó evidencias del mes de septiembre (23 fotos, 2 videos)', icon: 'camera' },
    { d: '2026-10-03T09:02', who: 'Salazar & Asociados', role: 'interventor', pid: 'p2', text: 'Revisó el informe de avance de septiembre', icon: 'file-text' },
    { d: '2026-09-24T14:30', who: 'Cimientos & Desarrollos', role: 'constructora', pid: 'p1', text: 'Actualizó el Certificado de Cámara de Comercio', icon: 'file-check-2' },
    { d: '2026-09-04T11:20', who: 'Contrato inteligente', role: 'sistema', pid: 'p1', text: 'Desembolso de hito liberado a la constructora (simulado)', icon: 'link-2' },
    { d: '2026-08-12T08:45', who: 'Laura Gómez', role: 'admin', pid: 'p3', text: 'Validó la póliza de cumplimiento actualizada', icon: 'shield-check' }
  ];

  window.INNLOCK = { DEMO_TODAY, PROJECTS, CONSTRUCTORAS, INTERVENTORES, USERS, ROLES, PHASES, SEED_LOG, txHash, addMonths, MONTH_NAMES };
})();
