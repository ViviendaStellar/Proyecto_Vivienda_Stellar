# Historias de usuario

**Diana Carolina González Díaz**
Proyecto: Vivienda sobre planos
Bootcamp Blockchain, Ruta N BAF, Red Stellar. Octubre de 2026

## 1. Alcance

Este documento reúne seis historias de usuario del producto que el equipo está diseñando: una plataforma donde las cuotas del comprador quedan retenidas y se liberan a la constructora por etapas, únicamente cuando un tercero independiente certifica el avance real de la obra.

Los roles provienen de la tabla de actores del Problem Brief. Cada historia describe una acción que la persona necesita poder ejecutar en el producto, redactada de forma concreta y verificable, con un beneficio directo para quien la ejecuta.

## 2. Roles considerados

| Rol | Qué controla hoy, según el Problem Brief | Qué necesita del producto |
|---|---|---|
| Comprador | Nada. Solo recibe promesas | Que su dinero no salga sin obra verificada |
| Interventor | Fotografías y reportes dispersos | Un canal donde su certificación tenga efecto sobre el dinero |
| Constructora | Cronograma, calidad y fotos de avance | Cobrar contra avance real sin depender de gestiones |
| Fiduciaria | Saldos y transferencias, pero no verifica la obra | Un registro de aportes que no dependa de su propia contabilidad |
| Superintendencia de Industria y Comercio | Recibe reclamos cuando ya es tarde | Ver el incumplimiento antes de que llegue la reclamación |

Los cinco roles de la tabla de actores del Problem Brief quedan considerados. No escribí una historia para la fiduciaria porque Johan Mateo ya la cubrió en su propuesta (HU-05, registro inalterable de aportes), y duplicarla restaría cobertura al conjunto del equipo.

## 3. Mis historias de usuario

### Resumen y nivel de backlog

Cada historia se clasifica en uno de cuatro niveles, según lo que ocurre si la solución se entrega sin ella.

| Nivel | Significado |
|---|---|
| Imprescindible | Sin esta historia el producto no resuelve el problema. Su ausencia invalida la solución |
| Debería | El producto funciona sin ella, pero la compradora queda expuesta a un riesgo que sí podíamos evitar |
| Podría | Mejora la adopción o la operación de un actor, sin alterar el resultado para la compradora |
| Queda fuera | Aporta valor institucional, pero no se necesita para demostrar que la solución funciona |

| Orden | Código | Rol | Acción que necesita | Nivel | Por qué ese nivel |
|:---:|:---:|---|---|---|---|
| 1 | HU-D01 | Comprador | Que su cuota quede retenida hasta la certificación de la etapa | Imprescindible | Es el mecanismo que evita la pérdida. Sin ella el producto solo informa y la familia pierde igual |
| 2 | HU-D02 | Interventor | Certificar una etapa adjuntando evidencia fechada | Imprescindible | Es el disparador de la retención. Sin certificación el dinero nunca encuentra la condición que lo libera |
| 3 | HU-D03 | Comprador | Recibir alerta cuando una etapa supera su fecha comprometida | Debería | La retención protege el capital, pero sin alerta la compradora sigue aportando a un proyecto detenido |
| 4 | HU-D04 | Comprador | Consultar las condiciones de devolución de su dinero | Debería | Sin esta historia la compradora conserva el dinero retenido, pero no sabe cómo ni cuándo reclamarlo |
| 5 | HU-D05 | Constructora | Solicitar el desembolso de una etapa ya certificada | Podría | El desembolso puede ejecutarse de forma automática tras la certificación. Esta historia mejora la operación de la constructora, no el resultado de la compradora |
| 6 | HU-D06 | Superintendencia | Auditar el histórico de un proyecto sin pedirlo a las partes | Queda fuera | Convierte al regulador en actor preventivo, pero exige acuerdos institucionales que exceden la primera versión |

### HU-D01. Retención del dinero hasta la verificación

**Rol:** Comprador
**Nivel de backlog:** Imprescindible

> **Como** compradora, **quiero** que cada cuota que pago quede retenida y se libere a la constructora solo cuando el interventor certifique la etapa correspondiente, **para** no perder mis ahorros si la obra se detiene.

**Criterio de aceptación:** ninguna transferencia hacia la constructora se ejecuta sin una certificación de etapa asociada. La compradora puede ver en cualquier momento qué porcentaje de su aporte permanece retenido y qué porcentaje fue liberado, con la etapa que justificó cada liberación.

### HU-D02. Certificación de etapa con evidencia

**Rol:** Interventor
**Nivel de backlog:** Imprescindible

> **Como** interventor, **quiero** certificar la terminación de una etapa adjuntando fotografías fechadas y el reporte técnico que la respalda, **para** que el desembolso de esa etapa quede habilitado con evidencia que después nadie pueda modificar.

**Criterio de aceptación:** la certificación queda registrada con la identidad del interventor, la fecha y los archivos de evidencia. Una vez emitida no puede editarse ni eliminarse, y habilita de forma automática el desembolso asociado a esa etapa.

### HU-D03. Alerta temprana de retraso

**Rol:** Comprador
**Nivel de backlog:** Debería

> **Como** compradora, **quiero** recibir una alerta en el momento en que una etapa supera la fecha comprometida sin certificación, **para** reaccionar mientras mi dinero todavía está retenido y no dos años después.

**Criterio de aceptación:** el sistema notifica a la compradora el día siguiente al vencimiento de una etapa no certificada, indicando cuántos días de atraso acumula y cuánto de su aporte sigue retenido en ese momento.

### HU-D04. Condiciones de devolución del dinero

**Rol:** Comprador
**Nivel de backlog:** Debería

> **Como** compradora, **quiero** consultar en lenguaje claro qué tipo de contrato firmé y bajo qué condiciones puedo recuperar mi dinero, **para** saber qué derechos tengo antes de seguir pagando.

**Criterio de aceptación:** la plataforma muestra si el documento firmado es una separación, un encargo fiduciario o una promesa de compraventa, junto con las causales de devolución, los plazos aplicables y el monto que la compradora recuperaría si se retira hoy.

### HU-D05. Solicitud de desembolso por etapa

**Rol:** Constructora
**Nivel de backlog:** Podría

> **Como** constructora, **quiero** solicitar el desembolso de una etapa ya certificada y seguir el estado de esa solicitud, **para** planear mi flujo de caja con fechas ciertas y sin gestionar cada pago por teléfono.

**Criterio de aceptación:** la constructora solicita el desembolso únicamente sobre etapas con certificación vigente, y consulta el estado de cada solicitud en los estados solicitado, aprobado o desembolsado, con la fecha de cada cambio.

### HU-D06. Auditoría sin intermediarios

**Rol:** Superintendencia de Industria y Comercio
**Nivel de backlog:** Queda fuera

> **Como** funcionario de la Superintendencia, **quiero** consultar el histórico de certificaciones y desembolsos de un proyecto sin solicitárselo a la constructora ni a la fiduciaria, **para** detectar un incumplimiento antes de que lleguen las reclamaciones de las familias.

**Criterio de aceptación:** el funcionario accede al histórico completo del proyecto con fechas de certificación, montos liberados y etapas vencidas sin certificar, sin requerir autorización de las partes vigiladas.

## 4. La más importante y por qué

### Criterio de ordenamiento

Las historias se ordenaron según el daño que evita cada una. El problema que el equipo eligió no es la falta de información en abstracto: es que el dinero de la familia sale de su cuenta sin que exista obra que lo respalde. Por eso encabezan la lista las historias que intervienen directamente sobre ese movimiento de dinero, siguen las que permiten reaccionar a tiempo y cierran las que ordenan la operación de los demás actores.

### La más importante

**HU-D01, la retención del dinero hasta la verificación**, es la más importante porque es la única que cambia el resultado para la compradora cuando el proyecto falla. Las demás historias mejoran lo que ella sabe; esta cambia lo que ella pierde.

La diferencia es concreta. Una compradora que solo consulta información se entera antes del problema, pero igual ve salir su dinero. Una compradora cuyo aporte permanece retenido conserva el capital no liberado aunque la constructora se detenga. En los casos documentados en el Problem Brief, esa diferencia equivale a los noventa millones de pesos que una familia perdió por completo durante nueve años de reclamación.

### Por qué HU-D02 va inmediatamente después

**HU-D02, la certificación con evidencia**, ocupa el segundo lugar porque sostiene técnicamente a la primera. La retención de HU-D01 necesita un disparador confiable: alguien independiente tiene que afirmar que la etapa se terminó. Sin esa certificación, la retención bloquea el proyecto en lugar de protegerlo, porque el dinero nunca encontraría la condición que lo libera.

Estas dos historias forman el núcleo del producto. Las cuatro restantes amplían su alcance: HU-D03 y HU-D04 le dan a la compradora capacidad de reacción y comprensión de sus derechos, HU-D05 hace viable el modelo para la constructora, que de otro modo no lo adoptaría, y HU-D06 convierte a la autoridad en un actor preventivo y no solo sancionatorio.
