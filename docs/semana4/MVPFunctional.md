# MVP Funcional · INN-LOCK

**Proyecto:** Proyecto Vivienda Stellar (INN-LOCK)
**Qué resuelve:** protege a los compradores de vivienda sobre planos. Las cuotas iniciales quedan en custodia y se liberan a la constructora solo contra el avance de obra de cada mes, certificado por un interventor independiente.

---

## 1. Enlaces y evidencias

### 1.1 Video de demostración

| Evidencia | Enlace |
|---|---|
| Video explicativo (problema y funcionamiento de la app) | **PENDIENTE: pegar aquí el enlace del video una vez grabado y subido** |

### 1.2 Producto en línea

| Evidencia | Enlace |
|---|---|
| Aplicación publicada (GitHub Pages) | https://viviendastellar.github.io/Proyecto_Vivienda_Stellar/ |
| Aplicación conectada a la red de pruebas (modo Testnet) | https://viviendastellar.github.io/Proyecto_Vivienda_Stellar/?chain=testnet |
| Modo demostración (datos de ejemplo, sin registro) | https://viviendastellar.github.io/Proyecto_Vivienda_Stellar/?demo=1 |
| Repositorio | https://github.com/ViviendaStellar/Proyecto_Vivienda_Stellar |

La aplicación tiene dos modos de uso: **real**, conectado a una base de datos Supabase con registro e inicio de sesión, y **demostración**, con datos ficticios guardados solo en el navegador del visitante.

### 1.3 Contrato inteligente propio en Stellar Testnet

| Dato | Valor |
|---|---|
| Red | Stellar Testnet (`Test SDF Network ; September 2015`) |
| Contrato Escrow (Soroban) | `CBS57WMMUYBWCLFGEKOZYWPRAHHBFP432AJ57P5HFWK6DD7GRI5WJOBT` |
| Ver en el explorador | https://stellar.expert/explorer/testnet/contract/CBS57WMMUYBWCLFGEKOZYWPRAHHBFP432AJ57P5HFWK6DD7GRI5WJOBT |
| Token (Stellar Asset Contract, activo nativo) | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| Hash del WASM | `0e4c459b058e8f5359decb6b65cac210c6aee589eefc337f0c6068a3eba5a957` |
| Fecha de despliegue | 9 de octubre de 2026 |
| Código fuente del contrato | [`contracts/escrow`](../../contracts/escrow) |
| Documentación técnica del contrato | [`README_CONTRATO.md`](../../README_CONTRATO.md) |

**Cuentas de prueba (direcciones públicas):**

| Rol | Dirección |
|---|---|
| Constructora | `GCYQDJ6UO3EHEL4GXLVMGTVTJEOV3OTWDJQPGSFTHPS2BCLRLT4OYRJS` |
| Interventor | `GAGEYZHS5LQPGQSK5YNQBCR6RKUJLSPO7ET4K76UJXZJUH6QZZ5PWEIW` |
| Administrador | `GBP3BRO5XE3EG7YVSE74OQVFCK4XCOOCWCGXHTFEBTBLZCQ576EVMI7M` |

### 1.4 Transacciones en Testnet

Cada hash se puede abrir en `https://stellar.expert/explorer/testnet/tx/<hash>`. La lista sale de la consulta pública a Horizon Testnet de las tres cuentas de prueba.

| Fecha (UTC) | Operación | Hash |
|---|---|---|
| 09/10/2026 15:11 | Carga del WASM del contrato | [`fdc948d8…c8bae7`](https://stellar.expert/explorer/testnet/tx/fdc948d8733036871f7fac9805cf6961a3358e7859d237ef78a50aa755c8bae7) |
| 09/10/2026 15:11 | Creación (despliegue) del contrato | [`b019e4d4…a2ee`](https://stellar.expert/explorer/testnet/tx/b019e4d4cf185835f8474f923e94451376c2306c06519500afb527281968a2ee) |
| 09/10/2026 15:12 | `register_project`: registro del proyecto con las 3 firmas | [`1e091902…d8d6`](https://stellar.expert/explorer/testnet/tx/1e0919026b506f3dec2abd0dbb8277239be2a63d53cd5e107a86a505020ed8d6) |
| 09/10/2026 15:12 | `deposit`: ingreso de fondos a la custodia | [`5739610a…1e47`](https://stellar.expert/explorer/testnet/tx/5739610a4e61be619d4a1c6aac519b8196026e55e91401208d25d544edd21e47) |
| 09/10/2026 15:13 | `report_milestone`: la constructora reporta el hito | [`2969538c…e541`](https://stellar.expert/explorer/testnet/tx/2969538cc1703581ac860303575f734281005fc2173cc6df3fe2f884023be541) |
| 09/10/2026 15:13 | `certify_milestone`: el interventor certifica el hito | [`a8fc2530…30a9`](https://stellar.expert/explorer/testnet/tx/a8fc25300d15ffcd3c6b21f3e83bd422e7aef9b927ac5b54d355b795c1cf30a9) |
| 09/10/2026 18:45 | `register_project`: otro registro de proyecto | [`b94f384a…641e`](https://stellar.expert/explorer/testnet/tx/b94f384af2301b92bb8bca9ba632a55454fb25a7b997decc9f594ad59695641e) |
| 09/10/2026 19:28 | `register_project`: otro registro de proyecto | [`8c513409…d025`](https://stellar.expert/explorer/testnet/tx/8c513409c8653888bb70f1299ca8a5aaad3c4004ac81eb5efb6ca7dcb93ed025) |
| 09/10/2026 22:26 | `register_project`: otro registro de proyecto | [`28b566f9…f2000`](https://stellar.expert/explorer/testnet/tx/28b566f97bb5453c9dd6d9d045cfa87ace3ff663607fb70b9a01182ef8bf2000) |
| 13/10/2026 23:43 | `vote` (invocación del contrato desde la cuenta administradora) | [`82e6a776…14d3`](https://stellar.expert/explorer/testnet/tx/82e6a77660f65dc60636402435b7dd878b52bd93400ea5834fdd0d0ecf2614d3) |

Las tres primeras cuentas se crearon el 9 de octubre a las 15:10 (transacciones de `create_account`).

### 1.5 Pruebas automatizadas

| Prueba | Cómo ejecutarla | Resultado |
|---|---|---|
| Base de datos (RLS, funciones, almacenamiento) | `cd frontend/supabase/tests && npm test` | 78 correctas, 0 con error |
| Escenario de la aplicación contra una base simulada | `frontend/supabase/tests/e2e/` en el navegador | 29 de 29 verificaciones |
| Lógica de cadena (hash del cronograma, argumentos, firmas) | `node frontend/js/chain/__tests__/run.js` | 16 correctas, 0 con error |
| Punta a punta contra Testnet real | `./e2e-testnet.sh` | Flujo de 3 firmas y 5 casos negativos de seguridad |

---

## 2. Aprendizajes y ajustes priorizados

### 2.1 Aprendizajes

1. **La custodia cubre solo la cuota inicial.** Cerca del 30 % del precio. El resto lo financian el banco y la constructora. Hay que decir con precisión qué protege INN-LOCK, sin prometer más.
2. **Controlar el flujo del dinero, no solo la información, es lo que da valor.** La idea de pagar cada mes contra avance certificado es simple y fácil de explicar a compradores y a constructoras.
3. **Las funciones de base de datos no deben quedar abiertas por defecto.** Supabase concede permisos de ejecución a usuarios anónimos sobre funciones nuevas. Lo detectamos con pruebas y lo cerramos con una migración propia (migración 8).
4. **Las firmas on-chain caducan y dependen del contenido.** Si cambia el cronograma, el hash cambia y las firmas ya recogidas dejan de valer. La aplicación las invalida y avisa de qué rol falta firmar.
5. **Una interfaz saturada no se lee.** En el inicio de sesión había demasiado texto sobre una foto. Lo corregimos poniendo el texto en la parte baja, sobre un degradado, y reduciendo el contenido.
6. **Probar sin infraestructura es posible.** Una base de datos simulada en el navegador y en Node permite correr cientos de comprobaciones sin Docker.
7. **El interventor es el punto sensible.** Su independencia define si el modelo se cree. Por eso su pago debe ser de la constructora y no de INN-LOCK.

### 2.2 Ajustes priorizados

| Prioridad | Ajuste | Motivo | Estado |
|---|---|---|---|
| Alta | Conectar al frontend `report_milestone`, `certify_milestone` y `claim_pending` con transacciones reales en Testnet | Hoy esos pasos se simulan localmente tras el registro | Pendiente |
| Alta | Cambiar los textos "fondos en custodia / presupuesto protegido" por "cuotas iniciales en custodia" | Evitar prometer más de lo que se cubre | Pendiente |
| Alta | Definir y mostrar la **cobertura del presupuesto** (cuotas en custodia, crédito constructor y capital propio) | Responde a la objeción de la constructora sobre su flujo de caja | Pendiente |
| Media | Una billetera propia por usuario, en lugar de las tres cuentas de prueba compartidas | Hoy cualquiera con las llaves de prueba actúa por un rol | Pendiente |
| Media | Poner en marcha `services/keeper` y `services/verifier` | Revisión de plazos vencidos y conciliación entre cadena y base de datos | Pendiente |
| Media | Correo de notificaciones y prueba real de registro y recuperación de contraseña | Aún no se probaron con cuentas reales | Pendiente |
| Baja | Pasarela de pagos y conexión con una fiduciaria o banco | Requiere acuerdos y revisión legal | Pendiente |
| Baja | Plan de respaldos de la base de datos | El plan gratuito no los incluye | Pendiente |

---

## 3. Riesgos y pendientes

### 3.1 Riesgos

| Riesgo | Tipo | Impacto | Cómo se mitiga |
|---|---|---|---|
| **Custodia de dinero real**: manejar fondos de terceros suele requerir una entidad regulada | Legal | Alto | Operar sobre una fiducia o una entidad regulada. Consultar a un abogado financiero y a la Superintendencia Financiera antes de prometer "custodia" en público |
| **Todo está en Testnet**: el dinero que se mueve no es real | Técnico | Alto | Decirlo siempre con claridad. La salida a Mainnet es una fase aparte, con auditoría del contrato |
| **Parte del flujo se simula** (varios pasos tras el registro) | Técnico | Medio | Conectarlos a la cadena (ver ajustes de prioridad alta) |
| **Llaves de prueba compartidas** | Seguridad | Medio | Solo existen en Testnet y no deben usarse en producción. Migrar a billeteras por usuario |
| **Plan gratuito de Supabase**: sin respaldos y con límite de ~50 MB por archivo | Operativo | Medio | Plan de respaldo y migración a un plan de pago antes de usar datos reales |
| **Flujo de caja de la constructora**: liberar por hitos cambia cómo financia la obra | Comercial | Alto | Validar con constructoras. Definir con ellas la cobertura del presupuesto (crédito constructor, capital propio) |
| **El banco decide**: sin su aceptación, el giro por hitos no se completa | Comercial | Alto | Piloto con un banco y una constructora grande a la vez |
| **Independencia del interventor** | Reputacional | Alto | Que lo pague la constructora por contrato directo y no INN-LOCK |
| **Cambios regulatorios** (por ejemplo, el nuevo marco para negocios fiduciarios de 2026) | Legal | Medio | Seguimiento con un abogado. Verificar el texto oficial |
| **Datos personales de compradores** | Legal | Medio | Revisar la política de privacidad y la ley de protección de datos antes de cargar datos reales |

### 3.2 Pendientes

- [ ] Grabar y subir el video, y pegar su enlace en la sección 1.1.
- [ ] Conectar `report_milestone`, `certify_milestone` y `claim_pending` al frontend.
- [ ] Ajustar los textos de custodia y mostrar la cobertura del presupuesto.
- [ ] Probar el registro con correo y la recuperación de contraseña con una cuenta real.
- [ ] Definir con un abogado el esquema de custodia (fiducia u otra entidad regulada).
- [ ] Entrevistar constructoras, compradores, interventores y bancos (ver sección 4).
- [ ] Billeteras propias por usuario.
- [ ] Puesta en marcha del keeper y del verifier.
- [ ] Plan de respaldos de la base de datos.

---

## 4. Plan de validación con usuarios

### 4.1 Objetivo
Comprobar si el problema es real, si la solución (liberar el dinero mes a mes contra avance certificado) es aceptable para cada actor y cuánto estarían dispuestos a pagar por ella.

### 4.2 Hipótesis a validar

| # | Hipótesis | Actor |
|---|---|---|
| H1 | Los compradores de vivienda sobre planos desconfían de no saber si la obra avanza como se prometió | Comprador |
| H2 | Un panel de avance y un certificado de protección influyen en su decisión de compra | Comprador |
| H3 | Una constructora grande acepta que el dinero se libere por hitos si eso le ayuda a vender | Constructora |
| H4 | El flujo de caja por hitos es la principal objeción de las constructoras | Constructora |
| H5 | Los interventores aceptan trabajar dentro de la plataforma con evidencia y firma | Interventor |
| H6 | Los bancos ven valor en un avance certificado y en línea para girar el crédito constructor | Banco |

### 4.3 Con quién

| Grupo | Cantidad sugerida | Cómo contactarlos |
|---|---|---|
| Compradores (o personas que van a comprar sobre planos) | 8 a 10 | Red personal, salas de venta, grupos de compradores |
| Constructoras (preferiblemente de proyectos grandes) | 4 a 5 | Contacto directo, gremios del sector |
| Interventores | 3 a 4 | Firmas de interventoría y supervisión técnica |
| Bancos (crédito constructor y riesgos) | 2 a 3 | Contacto directo con las áreas de construcción y riesgos |

### 4.4 Cómo se hace

1. **Entrevista breve (15 a 20 minutos)** con las preguntas de cada grupo, para entender el problema antes de mostrar nada.
2. **Demostración guiada (10 minutos)** con el modo de demostración, mostrando el flujo del actor entrevistado:
   - comprador: panel de avance, "Mi inversión" y certificado;
   - constructora: registro del proyecto, cronograma y evidencia mensual;
   - interventor: revisión y aprobación o observación de hitos;
   - banco: panel de avance de proyectos financiados.
3. **Preguntas de cierre**: qué falta, qué sobra y cuánto pagarían.

### 4.5 Preguntas clave

**Constructoras**
1. ¿Cómo financias hoy la obra y qué papel tienen las cuotas iniciales?
2. Cuéntame la última vez que un comprador dudó por desconfianza.
3. ¿Qué haces hoy para demostrarle al comprador que la obra avanza?
4. Si el dinero se liberara por avance aprobado por un interventor, ¿qué te preocuparía más?
5. ¿Pagarías por un sello que haga que vendas más rápido? ¿Cuánto valdría?

**Compradores**
1. ¿Qué te da (o te daría) más miedo al comprar sobre planos?
2. ¿Cómo sabes si la obra avanza como te prometieron?
3. ¿Conoces a alguien con un problema con una constructora?
4. Si tu dinero se liberara solo cuando un interventor aprueba el avance, ¿cambiaría tu decisión?
5. ¿Preferirías un proyecto con esta protección aunque fuera algo más caro?

**Bancos**
1. ¿Cómo verifican hoy el avance de obra antes de cada giro y cuánto cuesta?
2. ¿Cuál ha sido el problema más grande en proyectos financiados?
3. ¿Qué tendría que cumplir una plataforma así para que la usen?
4. ¿Quién decide incorporar un proveedor y cuánto tarda?
5. ¿Pagarían por esto y cómo?

### 4.6 Métricas de éxito

| Métrica | Meta propuesta |
|---|---|
| Compradores que dicen que esta protección influiría en su compra | Al menos 6 de 10 |
| Constructoras dispuestas a un piloto en un proyecto | Al menos 2 de 5 |
| Interventores que aceptarían trabajar en la plataforma | Al menos 3 de 4 |
| Bancos que aceptarían una conversación de seguimiento | Al menos 1 de 3 |
| Problemas de usabilidad graves encontrados en la demostración | Registrarlos todos y corregir los que se repitan en 2 o más personas |

### 4.7 Cronograma propuesto

| Semana | Actividad |
|---|---|
| 1 | Preparar guiones, agendar entrevistas y grabar el video |
| 2 | Entrevistas con compradores e interventores |
| 3 | Entrevistas con constructoras y bancos |
| 4 | Análisis de resultados y decisión de ajustes |

### 4.8 Cómo se decidirá
- Si la mayoría de las constructoras rechaza la liberación por hitos por el flujo de caja, se rediseña la cobertura del presupuesto antes de seguir.
- Si los compradores valoran la protección pero no pagarían más, la constructora debe ser quien pague.
- Si los bancos no se interesan, se ajusta la estrategia de entrada, por ejemplo con fiduciarias o con las propias constructoras.
- Cada entrevista se registra con fecha, perfil y las frases textuales más relevantes.
