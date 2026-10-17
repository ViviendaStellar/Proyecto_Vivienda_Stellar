# MVP Funcional · INN-LOCK

**Proyecto:** Proyecto Vivienda Stellar (INN-LOCK)
**Qué resuelve:** protege a los compradores de vivienda sobre planos. Las cuotas iniciales quedan en custodia y se liberan a la constructora solo contra el avance de obra de cada mes, certificado por un interventor independiente.

---

## 1. Enlaces y evidencias

### 1.1 Video de demostración

| Evidencia | Enlace |
|---|---|
| Video explicativo (problema y funcionamiento de la app) | https://www.youtube.com/watch?v=W30a7pI1kq8 |

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

- [x] Grabar y subir el video y poner su enlace en la sección 1.1.
- [ ] Conectar `report_milestone`, `certify_milestone` y `claim_pending` al frontend.
- [ ] Ajustar los textos de custodia y mostrar la cobertura del presupuesto.
- [ ] Probar el registro con correo y la recuperación de contraseña con una cuenta real.
- [ ] Definir con un abogado el esquema de custodia (fiducia u otra entidad regulada).
- [ ] Ejecutar las pruebas de usabilidad con compradores, constructoras, interventores y administrador (ver sección 4).
- [ ] Billeteras propias por usuario.
- [ ] Puesta en marcha del keeper y del verifier.
- [ ] Plan de respaldos de la base de datos.

---

## 4. Plan de validación con usuarios

Esta validación busca saber **cómo interactúan los usuarios con la plataforma**: si entienden las pantallas, si completan sus tareas sin ayuda y dónde se confunden o se bloquean. No evalúa el modelo de negocio.

### 4.1 Objetivos

1. Comprobar que cada rol completa sus tareas principales sin ayuda.
2. Medir cuánto tardan y cuántos errores cometen.
3. Detectar textos, botones o pasos que confundan.
4. Medir qué tan clara es la información clave: avance de obra, fondos en custodia, estado de cada hito y estado de las firmas.
5. Priorizar los ajustes de usabilidad antes de la siguiente versión.

### 4.2 Participantes

| Rol en la plataforma | Perfil | Cantidad sugerida |
|---|---|---|
| Comprador | Persona que compró o piensa comprar vivienda sobre planos; no necesita saber de tecnología | 5 |
| Constructora | Persona que administre proyectos o documentación en una constructora | 3 |
| Interventor | Ingeniero o arquitecto con experiencia en interventoría o supervisión técnica | 3 |
| Administrador | Persona del equipo del proyecto con conocimiento de la operación | 1 o 2 |

Con 5 personas por rol se descubren la mayoría de los problemas de usabilidad más comunes. Para constructoras e interventores, 3 son suficientes para una primera ronda.

### 4.3 Entorno de la prueba

- **Versión:** la aplicación publicada en modo demostración (`?demo=1`), con datos ficticios y perfiles ya preparados (el correo y la contraseña se completan solos). Para las tareas con firma en la red, el modo Testnet (`?chain=testnet`) con la billetera Freighter.
- **Dispositivos:** una parte de las personas en computador y otra en celular, porque la interfaz es responsiva.
- **Formato:** presencial o por videollamada con pantalla compartida, de 25 a 30 minutos por persona, grabado con permiso.
- **Quién acompaña:** una persona que guía y otra que toma notas. La que guía no ayuda ni explica, solo lee la tarea y observa.

### 4.4 Método

1. **Bienvenida (2 min).** Se explica que se prueba la plataforma, no a la persona, y se pide permiso para grabar.
2. **Cuestionario inicial (2 min).** Experiencia con apps financieras o inmobiliarias y con billeteras digitales.
3. **Tareas (15 a 20 min).** La persona resuelve cada tarea **pensando en voz alta**. No se le dice dónde hacer clic.
4. **Cuestionario final (5 min).** Escala de usabilidad (SUS) y tres preguntas abiertas.

### 4.5 Tareas por rol

**Comprador**

| # | Tarea | Qué se observa |
|---|---|---|
| C1 | Entrar a la plataforma con su perfil | ¿Entiende cómo elegir el perfil y entrar? |
| C2 | Decir cuánto va avanzado el proyecto y si va al día frente al plan | ¿Encuentra el avance real y la comparación con lo planificado? |
| C3 | Decir cuánto dinero está protegido en custodia y cuánto se ha desembolsado | ¿Entiende la diferencia entre ambos? |
| C4 | Encontrar el próximo hito y su estado | ¿Entiende los estados del hito (en revisión, aprobado, observado)? |
| C5 | Ver cuánto ha pagado y cuál es su próxima cuota | ¿Encuentra "Mi inversión"? |
| C6 | Descargar o abrir su certificado de protección | ¿Encuentra la opción sin ayuda? |
| C7 | Abrir las notificaciones | ¿Entiende qué significan? |

**Constructora**

| # | Tarea | Qué se observa |
|---|---|---|
| K1 | Revisar el estado de sus documentos legales y subir uno vencido | ¿Entiende qué falta y cómo subirlo? |
| K2 | Registrar un proyecto nuevo con el asistente de cuatro pasos | ¿Se pierde en algún paso? ¿Entiende los campos? |
| K3 | Cargar el cronograma con la plantilla de Excel (o armarlo en pantalla) | ¿Entiende los errores de validación (suma 100 %, actividades por mes)? |
| K4 | Subir la evidencia del mes y enviarla a revisión | ¿Entiende qué debe adjuntar y cómo saber que se envió? |
| K5 | Pedir un cambio en el cronograma | ¿Encuentra la opción y entiende su efecto? |
| K6 | (Modo Testnet) Firmar el registro del proyecto con la billetera | ¿Entiende qué está firmando y quién falta por firmar? |

**Interventor**

| # | Tarea | Qué se observa |
|---|---|---|
| I1 | Encontrar los hitos pendientes de revisión | ¿Encuentra la bandeja de revisiones? |
| I2 | Revisar la evidencia de un hito y aprobarlo | ¿Tiene la información que necesita para decidir? |
| I3 | Observar otro hito dejando una nota para la constructora | ¿Entiende el efecto de observar? |
| I4 | Revisar una solicitud de cambio de cronograma | ¿Entiende qué cambia y qué decide? |
| I5 | (Modo Testnet) Certificar un hito con la billetera | ¿Entiende que su firma libera el dinero? |

**Administrador**

| # | Tarea | Qué se observa |
|---|---|---|
| A1 | Revisar y aprobar un proyecto enviado por una constructora | ¿Entiende el estado del proyecto y qué aprueba? |
| A2 | Cambiar el rol de un usuario | ¿Encuentra la sección y entiende los roles? |
| A3 | Asignar una unidad a un comprador | ¿Entiende el procedimiento? |
| A4 | Consultar la auditoría de un movimiento | ¿Encuentra el registro y lo entiende? |

### 4.6 Qué se mide

| Métrica | Cómo se mide | Meta propuesta |
|---|---|---|
| Éxito de la tarea | Completó sin ayuda / con ayuda / no completó | Al menos 80 % completadas sin ayuda |
| Tiempo por tarea | Cronómetro desde que se lee la tarea hasta que la termina | Se fija con la prueba piloto interna (tiempo de una persona del equipo × 2) |
| Errores | Clics equivocados, pantallas visitadas por error, regresos | Menos de 2 errores por tarea |
| Comprensión | Se pregunta: "¿qué entiendes de lo que ves aquí?" en el avance, los fondos y los estados | Al menos 4 de 5 personas lo explican correctamente |
| Satisfacción | Escala SUS (10 preguntas, de 0 a 100) | 68 o más (promedio de referencia) |
| Percepción | "¿Qué tan fácil fue? (1 a 5)" por tarea | Promedio de 4 o más |

### 4.7 Registro de hallazgos

Cada problema se anota con: tarea, persona, qué pasó, cita textual, pantalla, gravedad y propuesta de ajuste.

| Gravedad | Significado |
|---|---|
| Crítica | La persona no logra completar la tarea |
| Alta | La completa con mucha dificultad o con ayuda |
| Media | Se confunde pero se recupera sola |
| Baja | Molestia menor o sugerencia |

### 4.8 Cuestionario final

1. Escala SUS (10 afirmaciones, de 1 "muy en desacuerdo" a 5 "muy de acuerdo").
2. ¿Qué fue lo más fácil de usar?
3. ¿Qué fue lo más confuso o difícil?
4. ¿Qué cambiarías o agregarías?

### 4.9 Cronograma propuesto

| Semana | Actividad |
|---|---|
| 1 | Preparar tareas y cuestionarios, hacer una prueba piloto interna y ajustar |
| 2 | Pruebas con compradores y administrador |
| 3 | Pruebas con constructoras e interventores |
| 4 | Consolidar hallazgos, priorizar ajustes y definir qué se corrige primero |

### 4.10 Cómo se usarán los resultados

- Los problemas críticos y altos que se repitan en **2 o más personas** pasan a la lista de ajustes de prioridad alta (sección 2.2).
- Las tareas con menos de 80 % de éxito se rediseñan antes de la siguiente prueba.
- Se repite una segunda ronda corta con las pantallas corregidas, para comprobar que el cambio funcionó.
- Los resultados se guardan en esta carpeta, con fecha, perfil de la persona (sin nombre) y los hallazgos.
