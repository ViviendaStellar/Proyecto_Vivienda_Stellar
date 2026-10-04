# Product Blueprint

**Proyecto:** Vivienda sobre planos
**Entregable grupal, semana 2**
Bootcamp Blockchain, Ruta N BAF, Red Stellar. Octubre de 2026

## 1. Priorización de historias

El problema tiene dos causas: las familias **no saben dónde está su dinero** y **no pueden verificar si la obra avanza**. Elegimos 5 historias que forman el ciclo mínimo de protección: reglas, aporte registrado, retención, certificación y alerta.

| # | Historia de usuario | Qué resuelve |
|---|---|---|
| HU1 | **Constructora:** registrar el proyecto con cada etapa de obra y el porcentaje que se libera al terminarla, con reglas públicas antes de vender la primera unidad. | Define contra qué se verifica y cuándo se libera el dinero. |
| HU2 | **Compradora:** quedar registrada como dueña del aporte de su apartamento desde la primera cuota. | Cada peso queda trazado a una persona y a una unidad. |
| HU3 | **Compradora:** que cada cuota quede retenida y se libere a la constructora solo cuando el interventor certifique la etapa. | El dinero no se mueve sin avance real. |
| HU4 | **Interventor:** certificar la terminación de una etapa con fotos fechadas y reporte técnico que nadie pueda modificar. | Da evidencia objetiva e inalterable del avance. |
| HU5 | **Compradora:** recibir una alerta cuando una etapa supera la fecha comprometida sin certificación. | Permite reaccionar mientras el dinero sigue retenido. |

**Criterios de priorización**

1. **Alineación con el problema:** cada historia ataca la falta de control del dinero o la falta de verificación del avance.
2. **Dependencia habilitadora:** sin HU1 no existe HU4, y sin HU4 no funciona HU3. Las historias que requieren este ciclo base quedan para después.
3. **Reducción del riesgo de pérdida:** la retención condicionada y la alerta de retraso atacan directamente el desvío de recursos y la obra detenida.
4. **No redundancia:** se descartaron historias cubiertas por las elegidas, como ver cuánto he pagado, el registro inalterable de aportes y ver el avance validado.
5. **Cobertura de actores:** participan constructora, compradora e interventor. La fiduciaria actúa como custodio en HU3.
6. **Valor frente a esfuerzo:** se aplazaron historias con alta complejidad legal u operativa, como el reembolso automático, la votación de prórrogas y la retención del último 10%.

## 2. Propuesta de valor

Para **Laura**, que lleva dos años pagando cumplido su primer apartamento con cesantías y ahorros sin ver avance real, la plataforma cambia la confianza por evidencia: su dinero solo se mueve cuando la obra avanza de verdad.

**Qué resultado obtiene**

- Antes de comprar, conoce las etapas de obra y cuánto dinero se libera en cada una (HU1).
- Desde la primera cuota, su aporte queda registrado a su nombre y asociado a su apartamento (HU2).
- Cada cuota queda retenida y solo pasa a la constructora cuando el interventor certifica la etapa con fotos fechadas y un reporte técnico que nadie puede modificar (HU3, HU4).
- Si una etapa se retrasa, recibe una alerta inmediata, mientras su dinero sigue protegido (HU5).

**En qué se diferencia de cómo lo resuelve hoy**

| Hoy | Con la plataforma |
|---|---|
| Confía en la reputación de la constructora. | Confía en reglas públicas y evidencia verificable. |
| La fiduciaria cobra entre 1 y 2% y guarda el dinero, pero no verifica la obra. | El dinero se libera solo contra una certificación de avance. |
| Visita la obra un día al mes y recibe renders que no corresponden a la realidad. | Ve fotos fechadas y certificadas de cada etapa, sin desplazarse. |
| Descubre el problema años después y termina en demandas. | Se entera a tiempo y tiene soporte de cada peso aportado. |

**Por qué la elegiría**

La plataforma no le pide confiar más, sino le permite verificar. Así reduce el triple costo que hoy paga Laura: protege sus ahorros, llega a cualquier reclamo con pruebas en lugar de años de trámites y cambia la angustia por información clara. Lo que en casos como Avi Puerto Colombia tardó nueve años o más en resolverse, aquí se detecta en la misma etapa en que ocurre.

## 3. Flujo de usuario

<p align="center">
  <img src="img/flujo_usuario_v3.svg" alt="Flujo de usuario: la constructora registra el proyecto, la compradora separa y paga, la fiduciaria retiene, la constructora registra el avance con su huella digital, el interventor certifica; si la etapa se certifica a tiempo la plataforma libera el pago y la obra queda verificada, si no alerta a la compradora y el dinero queda protegido; la Superintendencia audita el historial" width="100%">
</p>

| Etapa | Rol | Entra en | Qué hace |
|---|---|:---:|---|
| Entrada | 🏗️ Constructora | Registrar proyecto | Registra licencia, matrícula, apartamentos, etapas de obra, fecha y porcentaje de cada etapa (deben sumar cien), interventor y fiduciaria. Sin un campo, no recibe dinero |
| Aporte | 👩 Compradora | Pasos 1 y 2 | Revisa etapas, fechas y porcentajes. Separa con arras: queda a su nombre el derecho sobre el apartamento, no la propiedad, que llega con la escritura. Luego paga sus cuotas |
| Aporte | 🏦 Fiduciaria | Paso 3 | Recibe arras y cuotas y las mantiene retenidas. No entrega nada a la constructora sin una etapa certificada |
| Verificación | 🏗️ Constructora | Paso 4 | Termina la etapa y registra el avance: la huella digital (hash) de fotos y documentos queda en la red, así nadie puede alterarlos después |
| Verificación | 🦺 Interventor | Paso 5 | Visita la obra y certifica la etapa con fotos fechadas y reporte técnico. La certificación emitida no se puede modificar |
| Verificación | 💻 Plataforma | Paso 6 | Si la etapa se certificó a tiempo, libera solo el porcentaje pactado. Si venció el plazo, alerta a la compradora y el dinero sigue retenido |
| Salida | ⚖️ Superintendencia | Paso 7 | Revisa el historial del proyecto cuando lo necesita |

**Cómo se encadenan.** Ningún rol puede saltarse al anterior: sin cuota no hay retención, sin obra no hay certificación y sin certificación no hay pago.

**Salida.** El ciclo se repite en cada etapa. Si la obra avanzó, la compradora ve qué etapa se certificó y con qué evidencia salió su dinero. Si se detuvo, conserva todo lo no liberado.

## 4. Alcance del MVP

El MVP es un piloto en la red de pruebas de Stellar: un proyecto de cuatro etapas con compradoras de prueba. Busca comprobar una sola idea: si la plata solo sale cuando la interventoría certifica el avance, la compradora protege sus ahorros y sabe en qué va la obra.

**Dentro: funcionalidad central**

1. **Registrar el proyecto** (HU1, entrada). La constructora sube licencia, matrícula, etapas, fechas, desembolsos y las fotos que exigirá como prueba.

<p align="center">
  <img src="img/registro_proyecto_v2.svg" alt="Pantalla para registrar el proyecto con etapas, fechas, desembolso y fotos exigidas" width="90%">
</p>

2. **Registrar a la compradora** (HU2, paso 1) y su derecho sobre el apartamento.
3. **Retener arras y cuotas** en la fiduciaria (HU3, pasos 2 y 3).
4. **Reportar el avance** (HU4, paso 4) con fotos de la obra, informe y huella digital (hash).

<p align="center">
  <img src="img/reporte_avance_v1.svg" alt="Pantalla para reportar el avance de obra con la foto, el informe y la huella digital" width="90%">
</p>

5. **Certificar y liberar** el porcentaje pactado (HU3 y HU4, pasos 5 y 6).
6. **Alertar** a la compradora si una etapa se vence (HU5, paso 6).

**Fuera: funcionalidad deseable**

| Funcionalidad | Por qué después |
|---|---|
| Reembolso automático | Requiere validación legal con las fiduciarias |
| Votación de prórrogas | No cambia la protección básica |
| Retención del último 10% | Depende de la escrituración final |
| Panel para la Superintendencia | El historial ya se puede consultar en la red |

**Cómo sabremos que funciona**

1. Ningún desembolso sale sin una certificación previa.
2. La compradora ve cuánto aportó, cuánto sigue retenido y qué evidencia justificó cada salida.
3. Una etapa vencida genera la alerta al día siguiente.

**Por qué el recorte entrega valor.** Las seis funciones atacan las dos causas del problema: la plata que no se ve y el avance que no se verifica. Lo que queda fuera no cambia el resultado: si la obra se detiene, la compradora conserva lo no liberado.

## 5. Lean Canvas

| Bloque | Contenido |
|---|---|
| **Problema** | Familias de Colombia pierden el control de sus ahorros cuando pagan cuota inicial de viviendas sobre planos. En 2026 hay +70.000 viviendas sin entregar; la SIC registra +6.000 reclamaciones anuales; 38 constructoras sancionadas; 11 fiduciarias condenadas entre 2025 y 2026. No hay forma real de verificar si la obra avanza ni dónde se usa el dinero. |
| **Segmentos de usuarios** | **Primario:** compradores de primera vivienda con cesantías, subsidios o ahorros de toda la vida (ej. Laura, 31 años, auxiliar contable en Medellín comprando en Bello). **Secundarios:** constructoras medianas que quieren un sello de confianza; fiduciarias obligadas por el Decreto 0510 a informar de forma clara; interventores con reportes dispersos. |
| **Propuesta de valor única** | *Tu cuota inicial solo se mueve cuando la obra avanza.* La plataforma reemplaza la confianza en la reputación de la constructora por evidencia verificable: el dinero se libera solo cuando un interventor independiente certifica el avance con fotos fechadas y reporte técnico inalterables. |
| **Solución** | Plataforma sobre la red Stellar: (1) registro público del proyecto con etapas, fechas y porcentajes de liberación que suman 100%; (2) vinculación de cada compradora a su apartamento desde la primera cuota; (3) retención de arras y cuotas en fiduciaria hasta certificación; (4) certificación de etapa con huella digital (hash) de evidencia; (5) liberación automática del porcentaje pactado al certificar; (6) alerta a la compradora cuando la etapa vence sin certificar. |
| **Canales** | Sala de ventas de constructoras (punto de captación natural); alianzas con fiduciarias (obligación informativa del Decreto 0510); entidades que financian con cesantías o subsidios; boca a boca entre compradores de primera vivienda; web móvil como canal de consulta y alertas. |
| **Métricas clave** | 1) Ningún desembolso sale sin una certificación previa. 2) La compradora ve cuánto aportó, cuánto sigue retenido y qué evidencia justificó cada salida. 3) Una etapa vencida genera la alerta al día siguiente. |
| **Ventaja diferencial** | Blockchain no es magia: son tres características muy específicas. (1) **Registro inalterable** que todos ven (constructora, fiduciaria, interventor, compradora); (2) **Liberación condicionada** — la plata sigue a la obra, no al revés; (3) **Propiedad única** por unidad (NFT) — imposible de duplicar ni ocultar. Una base de datos tradicional no da confianza sin intermediarios ni verificación permanente. |
| **Estructura de costos** | Desarrollo de contratos inteligentes e interfaz; integración con fiduciarias y canales de pago (PSE); auditoría y validación de evidencia fotográfica; costos de transacción en Stellar (mínimos comparados con comisiones fiduciarias actuales del 1–2%); soporte y operación del piloto. |
| **Estructura de ingresos** | Comisión SaaS a constructoras por proyecto activado en la plataforma; licencia de uso del módulo de retención condicionada a fiduciarias; fee por cesión de derechos (casos de inversionistas); en etapa madura, porcentaje sobre el ahorro de comisión fiduciaria que la plataforma hace innecesaria o más eficiente. |

## 6. Backlog priorizado (Kanban)

**Tablero:** [Backlog Vivienda Stellar](https://github.com/users/Nany1993/projects/2)

Backlog priorizado del equipo con las historias del ciclo mínimo y las complementarias que atacan capacidades nuevas. Cada tarjeta incluye el enunciado *Como / Quiero / Para*, los criterios de aceptación y el enlace al documento fuente en este repositorio.

### Columnas

| Columna | Contenido |
|---|---|
| **Backlog** | Historias priorizadas listas para planificar |
| **Ready** | Preparadas para arrancar |
| **In progress** | En construcción del piloto |
| **In review** | Con evidencia esperando validación |
| **Done** | Entregadas y verificadas |

### Campos del tablero

- **Columna:** Backlog · Ready · In progress · In review · Done
- **Nivel:** P0 · P1 · P2
- **Responsable:** integrante asignado a la tarjeta
- **Rol:** Constructora · Compradora · Fiduciaria · Interventor

### Tarjetas (8) — 2 por integrante

| Tarjeta | Nivel | Rol | Responsable |
|---|---|---|---|
| HU1 · Registro del proyecto con etapas y reglas de liberación | P0 | Constructora | Johan Castañeda (`dotcom2409`) |
| HU2 · Vinculación de la compradora a su apartamento | P0 | Compradora | Ana María (`Nany1993`) |
| HU3 · Retención de cuotas hasta certificación de etapa | P0 | Compradora | Diana Carolina (`Diana1295Dev`) |
| HU4 · Certificación de etapa con evidencia inalterable | P0 | Interventor | Diana Carolina (`Diana1295Dev`) |
| HU5 · Alerta de retraso cuando la etapa vence sin certificar | P1 | Compradora | Julián Correa (`Slider00`) |
| HU-A03 · Reclamo sobre una certificación | P1 | Compradora | Ana María (`Nany1993`) |
| HU-A04 · Congelamiento de pagos durante un reclamo | P1 | Fiduciaria | Johan Castañeda (`dotcom2409`) |
| HU-D04 · Condiciones de devolución en lenguaje claro | P1 | Compradora | Julián Correa (`Slider00`) |

**Distribución:** 2 tarjetas por integrante. P0 = ciclo mínimo de protección (HU1–HU4); P1 = complementarias priorizadas (HU5, HU-A03, HU-A04, HU-D04).

Las historias diferidas del MVP (reembolso automático, votación de prórrogas, retención del último 10%, agenda del interventor, panel de la Superintendencia, historial para cesión) quedan documentadas en la sección 4 de este documento y no compiten en el tablero activo.

## 7. Arquitectura inicial

<!-- Cómo se conectan las partes (interfaz, lógica, Stellar) y en qué punto entra la red.
     Diagrama simple.
     Extensión: 150 a 300 palabras. -->

## 8. Uso de Stellar y justificación

<!-- Qué componentes de Stellar usaría y por qué cada uno.
     Apoyado en el criterio de pertinencia del Problem Brief.
     Extensión: 150 a 300 palabras. -->
