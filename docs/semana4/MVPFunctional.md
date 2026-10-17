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

1. **Lo que protegemos es la cuota inicial**, cerca del 30 % del precio. El resto lo financian el banco y la constructora, así que no podemos prometer más.
2. **El valor está en controlar el movimiento del dinero**, no solo en mostrar información.
3. **Las firmas dependen del contenido.** Si cambia el cronograma, cambia su huella y hay que volver a firmar; la app avisa qué rol falta.
4. **Supabase abre por defecto las funciones nuevas a usuarios anónimos.** Lo detectamos con pruebas y lo cerramos con la migración 8.
5. **La independencia del interventor sostiene el modelo.** Por eso su pago debe venir de la constructora y no de INN-LOCK.

### 2.2 Ajustes ordenados por impacto y esfuerzo

| # | Ajuste | Impacto | Esfuerzo | Cuándo |
|:---:|---|:---:|:---:|---|
| 1 | Cambiar "fondos en custodia" por "cuotas iniciales en custodia" en la app | Alto | Bajo | Antes del cierre |
| 2 | Probar registro y recuperación de contraseña con cuentas reales | Medio | Bajo | Antes del cierre |
| 3 | Conectar al front `report_milestone`, `certify_milestone` y `claim_pending` (hoy solo `register_project` va a la red) | Alto | Medio | Pendiente |
| 4 | Mostrar la cobertura del presupuesto: cuotas, crédito constructor y capital propio | Alto | Medio | Pendiente |
| 5 | Billetera propia por usuario en lugar de las tres cuentas de prueba | Alto | Alto | Pendiente |
| 6 | Poner en marcha `services/keeper` y `services/verifier` | Medio | Medio | Pendiente |
| 7 | Conexión con una fiduciaria o un banco | Alto | Alto | Pendiente |

---

## 3. Riesgos y pendientes

### 3.1 Riesgos identificados antes del cierre

| Riesgo | Impacto | Cómo se mitiga |
|---|:---:|---|
| **Custodia de dinero real.** Manejar fondos de terceros exige una entidad regulada | Alto | Operar sobre una fiducia. Consultar a un abogado financiero antes de prometer "custodia" en público |
| **Todo está en Testnet.** El dinero que se mueve no es real | Alto | Decirlo siempre. La salida a Mainnet es otra fase, con auditoría del contrato |
| **Flujo de caja de la constructora.** Cobrar por etapas cambia cómo financia la obra | Alto | Validarlo con constructoras y mostrar la cobertura del presupuesto |
| **El banco decide.** Sin su aceptación, el giro por etapas no se completa | Alto | Piloto con un banco y una constructora a la vez |
| **Independencia del interventor** | Alto | Que lo contrate y pague la constructora, no INN-LOCK |
| **Parte del flujo se simula.** Después del registro, los pasos no van a la red | Medio | Conectarlos (ajuste 3) |
| **Llaves de prueba compartidas** | Medio | Solo existen en Testnet. Migrar a billeteras por usuario (ajuste 5) |
| **Plan gratuito de Supabase**, sin respaldos | Medio | Respaldos y plan de pago antes de cargar datos reales |
| **Datos personales de compradoras** | Medio | Revisar la política de privacidad y la ley de protección de datos |

### 3.2 Qué queda por resolver

- [x] Grabar y subir el video, con su enlace en la sección 1.1.
- [ ] Ajustes 1 y 2, antes del cierre.
- [ ] Conectar a la red los pasos posteriores al registro.
- [ ] Definir con un abogado el esquema de custodia (fiducia u otra entidad regulada).
- [ ] Ejecutar el plan de validación de la sección 4.
- [ ] Billeteras por usuario, keeper, verifier y respaldos de la base de datos.

---

## 4. Plan de validación con usuarios

### 4.1 A quiénes

| Rol | Perfil | Cuántas personas |
|---|---|:---:|
| **Compradora** (usuaria del Problem Brief) | Persona que paga o pagó la cuota inicial de su primera vivienda sobre planos, con cesantías o ahorros, como Laura, de 31 años, en Medellín | 5 |
| Constructora | Quien administra proyectos o desembolsos en una constructora | 3 |
| Interventor | Ingeniero o arquitecto con experiencia en interventoría | 3 |

La compradora es el centro de la validación. Constructora e interventor se incluyen porque sin ellos el dinero no se mueve.

### 4.2 Métodos

1. **Entrevista corta antes de usar el producto**: cómo sigue hoy su obra y su dinero, y cuánta confianza siente (de 1 a 5).
2. **Prueba con el producto**: cada persona resuelve tareas reales en la app publicada (`?demo=1`, y `?chain=testnet` para las firmas), pensando en voz alta y sin ayuda.
3. **Métricas**: tareas completadas sin ayuda, errores, tiempo y escala de usabilidad SUS.
4. **Entrevista corta al final**: confianza después de usarlo y si elegiría un proyecto con INN-LOCK.

### 4.3 Hipótesis y criterio de éxito

| # | Hipótesis | Se cumple si |
|:---:|---|---|
| H1 | La compradora entiende cuánto pagó, cuánto sigue retenido y en qué etapa va la obra | 4 de 5 lo explican bien sin ayuda, en menos de 2 minutos |
| H2 | Ver el dinero retenido y la evidencia certificada aumenta su confianza | La confianza sube al menos 1 punto en 4 de 5 compradoras |
| H3 | Prefiere un proyecto con INN-LOCK frente a uno sin él | 4 de 5 lo eligen |
| H4 | La constructora acepta cobrar por etapas certificadas | 2 de 3 aceptan un piloto |
| H5 | El interventor certifica una etapa con la app sin ayuda | 3 de 3 lo logran |
| H6 | El producto es fácil de usar | SUS de 68 o más y 80 % de tareas sin ayuda |

### 4.4 Cómo se usan los resultados

Una hipótesis que no se cumple se revisa antes de construir más. Los problemas que se repitan en dos o más personas pasan a los ajustes de la sección 2.

El guion completo (tareas por rol, métricas, registro de hallazgos y cronograma de cuatro semanas) está en [`GuionPruebasUsuarios.md`](GuionPruebasUsuarios.md).
