# Propuesta individual: Fase 1

**Ana María García Arias**
Bootcamp Blockchain · Ruta N BAF · Red Stellar · Septiembre de 2026

---

## El problema

> Plantas termoeléctricas y comercializadores industriales de carbón arriesgan la operación de sus calderas y enfrentan sanciones legales al no poder verificar en tiempo real el origen legal y la calidad exacta de los lotes de carbón que ingresan a su patio de acopio.

---

## ¿Quién lo sufre?

Carlos tiene 42 años y es Jefe de Combustibles y Recepción en una Planta Termoeléctrica. Es el responsable directo de garantizar el suministro constante de carbón de alta calidad para la generación eléctrica y de responder ante las auditorías ambientales y mineras de la compañía.

La situación no es marginal:

- El uso de carbón con parámetros fuera de norma (ej. alto contenido de azufre o cenizas) provoca **abrasión rápida en tuberías y corrosión en calderas**, obligando a paradas de emergencia que cuestan cientos de miles de dólares por día.
- La fiscalización de la **Agencia Nacional de Minería (ANM)** sanciona a empresas compradoras que no acrediten el certificado de origen (RUCOM/Título Minero) ininterrumpido de cada lote.
- Proveedores y mineros pequeños reclaman sistemáticamente que sus muestras de laboratorio son **trocadas o castigadas injustamente** durante la liquidación al no existir una cadena de custodia transparente.

El problema afecta a plantas termoeléctricas de generación térmica, centros de acopio exportadores y grandes consumidores industriales (cementeras, papeleras). Decenas de volquetes ingresan a diario a los patios de recepción. Las planillas físicas y los sistemas en Excel actuales son vulnerables a la alteración de tiquetes de báscula, suplantación de muestras de laboratorio y falsificación de guías de transporte minero.

---

## ¿Cómo se resuelve hoy y qué cuesta?

Hoy la protección de la integridad del combustible descansa en procesos manuales y fragmentados, y ninguno garantiza trazabilidad real.

**1. Revisión manual de guías de transporte.** Operarios en báscula reciben papeles físicos que pueden ser clonados o reeditados. *Cuesta* riesgo de fraude y falta de verificación.

**2. Toma de muestra física tradicional.** Se rotula una bolsa de plástico con un marcador. *Cuesta* riesgo alto de traspapelo o manipulación en laboratorio.

**3. Pilas de acopio mezcladas.** Se descarga el mineral en el patio antes de tener el reporte del laboratorio (24-48 horas de retraso). *Cuesta* daño potencial a calderas si el mineral es incompatible.

**4. Si todo falla:** Paradas de caldera por mal combustible, litigios comerciales por liquidaciones disputadas y sanciones por la autoridad minera.

El costo total se reparte en tres frentes:

| Frente | Qué pierde la planta |
|---|---|
| Financiero | Paradas de planta, multas y daño a infraestructura térmica |
| Operativo | Daño a molinos, tuberías y calderas por abrasión y corrosión |
| Reputacional | Riesgo legal de compra no autorizada y sanciones de la ANM |

---

## ¿Por qué creo que blockchain podría aportar?

Lo que sigue lo planteo como hipótesis y no como conclusión: creo que este caso encaja con los criterios de pertinencia que revisamos en la Sesión 1.

**Varias partes que no confían entre sí necesitan compartir un mismo registro.** En la recepción de carbón intervienen al menos cinco actores con intereses distintos: el proveedor quiere que le paguen bien, la planta quiere combustible limpio, el laboratorio analiza la calidad, la ANM fiscaliza el origen, y Carlos autoriza la liquidación. Hoy cada uno mantiene su propia versión de los hechos en sistemas separados, y el comprador (la planta) es el único que asume el riesgo completo si algo falla. Un registro compartido, donde el laboratorio publique el análisis verificado y la báscula registre el peso inmutablemente, le daría a Carlos la misma información que tienen los demás y al mismo tiempo.

**El histórico no puede alterarse.** Hoy el tiquete de báscula se puede reescribir, la muestra se puede trocar y la guía minera se puede falsificar. Si cada hito quedara registrado de forma inmutable, con fecha y evidencia asociada, la planta podría detectar un problema de calidad en el momento exacto del ingreso y no 48 horas después, cuando el mineral ya fue mezclado en la pila.

**Se elimina un intermediario que concentra la confianza.** La termoeléctrica actúa como juez y parte: guarda los datos, analiza las muestras y dictamina la liquidación. Un registro neutral en Stellar eliminaría la asimetría de confianza entre planta y proveedor.

Lo que **no** afirmo es que la tecnología resuelva el problema por sí sola. El punto más débil de mi hipótesis es el vínculo entre el mundo físico y el registro digital: alguien tiene que certificar que la muestra es representativa del lote, y si esa persona se equivoca o miente, la cadena registrará un dato falso de forma igualmente inmutable. Tampoco sé si los proveedores pequeños tendrán la infraestructura tecnológica para interactuar con la solución. Son preguntas que habría que validar antes de avanzar.

---

## Decisión del problema

### Problema elegido

Plantas termoeléctricas y comercializadores industriales de carbón arriesgan la operación de sus calderas y enfrentan sanciones legales al no poder verificar en tiempo real el origen legal y la calidad exacta de los lotes de carbón que ingresan a su patio de acopio.

**Propuesto por:** Ana María García Arias

### Por qué elegimos este

- **Fricción económica y operativa de alto impacto:** El ingreso de carbón fuera de especificación (alto en azufre, humedad o cenizas) destruye molinos y tuberías de calderas, causando paradas no programadas que cuestan cientos de miles de dólares por día.
- **Riesgo regulatorio y de cumplimiento (Compliance):** Las autoridades minero-ambientales (como la ANM) exigen trazabilidad de origen legal de cada tonelada. Un título minero clonado o dudoso expone a la planta a investigaciones por contrabando y minería ilegal.
- **Tiempos muertos entre báscula y laboratorio:** El camión descarga en el patio de acopio en minutos, pero los resultados del análisis de laboratorio tardan entre 24 y 48 horas. Para cuando se detecta el incumplimiento, el mineral ya fue mezclado en la pila.
- **Blockchain resuelve la raíz:** Actúa como un notario imparcial inalterable entre dos partes con intereses financieros opuestos (Comprador/Termoeléctrica vs. Proveedor/Minero), donde ninguno confía en la base de datos privada del otro.

### Propuestas descartadas

- *Notarización genérica de contratos en PDF:* Descartada por ser un caso de uso común sin un nicho operativo con dolor financiero directo.
- *Plataforma de fidelización/puntos para multinivel:* Descartada para priorizar un problema de infraestructura crítica B2B de alto volumen.

### Cómo tomamos la decisión

- Consenso del equipo al identificar la asimetría de información y el alto riesgo operativo en la recepción de combustibles para generación térmica.

---

## Problem Brief

### Encabezado

**Proyecto:** Proof-of-Coal (Trazabilidad de Origen y Calidad de Carbón)

**Frase descriptiva:** Transparencia e inmutabilidad en la cadena de custodia del combustible desde la mina hasta la caldera.

---

### Equipo y roles

| Integrante | Rol | Responsabilidad |
|---|---|---|
| Ana María García Arias | Product / Research | Definición del flujo operativo, reglas de calidad y contexto minero |
| [Nombre Integrante 2] | Product Manager | Coordinación general y estructuración de la propuesta |
| [Nombre Integrante 3] | UX/UI Design | Diseño de la experiencia liviana (WhatsApp / Web) para el proveedor y báscula |
| [Nombre Integrante 4] | Tech Lead / Dev | Integración del contrato inteligente de trazabilidad y anclaje en Stellar |

**Canal de coordinación:** WhatsApp / Slack grupal

**Responsable de entregas:** Ana María García Arias

---

### Problema y evidencia

**Enunciado:**

Una planta termoeléctrica arriesga la operación de sus calderas y enfrenta sanciones legales al no poder verificar en tiempo real el origen legal y la calidad técnica exacta de los lotes de carbón que ingresan a su patio de acopio.

**Contexto y alcance:**

El problema afecta a plantas termoeléctricas de generación térmica, centros de acopio exportadores y grandes consumidores industriales (cementeras, papeleras). Decenas de volquetes ingresan a diario a los patios de recepción. Las planillas físicas y los sistemas en Excel actuales son vulnerables a la alteración de tiquetes de báscula, suplantación de muestras de laboratorio y falsificación de guías de transporte minero.

**Evidencia documentada:**

- **Daños mecánicos por escoriación:** El uso de carbón con parámetros fuera de norma (ej. alto contenido de azufre o cenizas) provoca abrasión rápida en tuberías y corrosión en calderas, obligando a paradas de emergencia en plantas térmicas.
- **Riesgo de investigación por minería ilegal:** La fiscalización de la Agencia Nacional de Minería (ANM) sanciona a empresas compradoras que no acrediten el certificado de origen (RUCOM/Título Minero) ininterrumpido de cada lote.
- **Disputas comerciales recurrentes:** Proveedores y mineros pequeños reclaman sistemáticamente que sus muestras de laboratorio son trocadas o castigadas injustamente durante la liquidación al no existir una cadena de custodia transparente.

---

### Flujo actual de valor

**Cómo se mueve el carbón hoy:**

1. **Despacho en Mina:** El camión carga el mineral y se emite una guía física de transporte.
2. **Llegada a Báscula:** El vehículo se pesa en la planta termoeléctrica. El operador registra el peso en un sistema local y asigna un código manual a la muestra.
3. **Descargue al Patio:** La volqueta descarga el carbón directamente en la pila de consumo.
4. **Procesamiento de Muestra (24-48 horas):** El laboratorio interno o externo procesa la muestra de calidad.
5. **Liquidación y Auditoría:** Días después se cruza el tiquete de báscula con el reporte de laboratorio y la guía minera. Si hay inconsistencias o el azufre supera el límite, la planta ya quemó o mezcló el mineral.

**Ganadores y perdedores hoy:**

- **Ganan:** Proveedores informales o inescrupulosos que logran colar carbón de baja calidad o sin licencia.
- **Pierden:** Carlos y la Termoeléctrica (riesgo de caldera y multas) y el Pequeño Minero Honesto (sufridor de castigos de liquidación que no puede auditar).

---

### Fricciones identificadas

| Fricción | Paso | Causa raíz | A quién afecta |
|---|---|---|---|
| Trazabilidad de origen vulnerable | Ingreso a Báscula | Guías de transporte en papel o PDFs alterables | Termoeléctrica y Autoridad |
| Desacople entre Muestra y Resultado | Análisis de Laboratorio | Retraso de 24-48h y manejo manual del código de muestra | Planta y Proveedor |
| Pila contaminada pre-análisis | Descargue en Patio | El mineral se descarga antes de validar los parámetros de calidad | Jefe de Planta (Carlos) |
| Disputas en la Liquidación | Cierre de Mes | Falta de un registro único y neutral que ambas partes reconozcan | Proveedor y Planta |

---

### Oportunidad e hipótesis

**Oportunidad priorizada:**

Crear el **Sello Inalterable de Cadena de Custodia (Proof-of-Coal)**, que vincula el Titulo Minero de origen, el tiquete de báscula y el código de la muestra de laboratorio en un registro inmutable en la red **Stellar** en el segundo exacto en que la volqueta entra a la planta.

**Por qué esta oportunidad:**

- Protege infraestructura crítica (calderas y molinos) valorada en millones de dólares.
- Cumple automáticamente con los requerimientos de auditoría y trazabilidad minero-ambiental.
- Elimina la fricción de desconfianza en las liquidaciones entre la planta y sus proveedores.

**Hipótesis inicial:**

Si el Jefe de Combustible pudiera congelar en blockchain la huella criptográfica de la guía minera, el peso de báscula y el precinto de la muestra al momento del ingreso, entonces garantizará la trazabilidad legal del combustible y la integridad del reporte de calidad, evitando daños en calderas y disputas de liquidación.

**Cambios esperados para Carlos con la solución:**

- Validación instantánea del título minero e historial del proveedor al ingresar a báscula.
- Registro inalterable del precinto de la muestra (imposible de trocar en el laboratorio).
- Trazabilidad auditable en 1 clic para presentar ante los inspectores de la ANM.

---

### Criterio de pertinencia

**¿Por qué blockchain y no una base de datos tradicional o integración de sistemas?**

Blockchain es estrictamente necesario porque resuelve un problema de **confianza entre actores independientes con intereses económicos opuestos**:

**1. Neutralidad e Imparcialidad (Registro no administrado por una sola parte)**
- *Hoy:* Si la termoeléctrica guarda los datos en su servidor privado (SQL/Oracle), el minero desconfía y piensa que la planta modificó la muestra para cobrarle penalizaciones. Si el minero presenta sus propios papeles, la planta desconfía de su origen.
- *Con Blockchain:* El hash del tiquete, la muestra y el título minero se anclan en la red pública **Stellar**. Ninguna de las dos partes puede modificar la información retroactivamente.

**2. Marca de Tiempo Inalterable (Proof-of-Existence)**
- Se prueba matemáticamente que la muestra fue sellada a la hora exactas del pesaje, evitando que se reemplacen reportes de calidad una vez conocidos los resultados de laboratorio.

**3. Trazabilidad Auditable para Terceros (B2G / Compliance)**
- La Agencia Nacional de Minería o los auditores ambientales no necesitan confiar en la palabra de la empresa; pueden verificar directamente en la blockchain que cada lote recibido proviene de un título minero autorizado.

---

### Supuestos y riesgos

| Supuesto | Cómo validarlo | Riesgo si es falso |
|---|---|---|
| Los proveedores y conductores pueden interactuar con la solución de forma ultra-simple | Implementar interfaz por WhatsApp/SMS con OTP de 1 clic | El sistema falla por resistencia a la tecnología en campo |
| Las termoeléctricas aceptan integrar una API ligera en sus básculas | Entrevistar a jefes de TI/Operaciones de plantas térmicas | La planta no permite conexión con sus software de báscula |
| El laboratorio de calidad acepta asociar sus reportes al hash del precinto | Validar el flujo de muestra con laboratoristas de plantas | Se mantiene la opacidad en el proceso de análisis químico |

**Riesgo crítico:** Resistencia al cambio de los transportadores o personal de báscula si la herramienta es compleja. Por ello, la UX se diseña para interacción de 1 solo clic vía celular (sin crear billeteras ni gestionar claves criptográficas manualmente).

---

Tu combustible sellado, tu caldera segura y tu operación auditable.

---

Equipo: Ana María García Arias, [Integrante 2], [Integrante 3], [Integrante 4].

Septiembre 2026
