# Vivienda sobre planos
Tu cuota inicial solo se mueve cuando la obra avanza

---

## Decisión del problema

### Problema elegido

Familias de Colombia pierden el control de sus ahorros cuando pagan cuota inicial de viviendas sobre planos, porque no tienen forma real de verificar si la obra avanza ni dónde se usa su dinero.

**Propuesto por:** Diana Carolina González Díaz

### Por qué elegimos este

- Es la fricción más cara: Se pierden ahorros de toda una vida. En 2026 hay +70.000 viviendas sin entregar en Colombia, con casos documentados de $90 millones como el de Leonor en Barranquilla.
- Pasa en todo el país: Cada año hay nuevos casos documentados en prensa. Entre 2024-2025 la Superintendencia de Industria y Comercio (SIC) recibió +6.000 reclamaciones.
- Regulación lo habilita: El Decreto 0510 de 2026 obliga a fiduciarias a informar clara y completamente a los compradores. Blockchain puede implementar automáticamente esta obligación.
- Blockchain resuelve la raíz: No es solo transparencia; es que la plata no se libere si no hay obra verificada por tercero independiente.

### Propuestas descartadas

*A completar por el equipo durante la fase de debate y selección.*

### Cómo tomamos la decisión

*A definir por el equipo: consenso, votación u otro método.*

---

## Problem Brief

### Encabezado

**Proyecto:** Vivienda sobre planos

**Frase descriptiva:** Tu cuota inicial solo se mueve cuando la obra avanza.

---

### Equipo y roles

| Integrante | Rol | Responsabilidad |
|---|---|---|
| Diana Carolina González Díaz | Product Manager | Coordinación general y decisión del problema |
| Ana María García Arias | Research | Validación de supuestos con fiduciarias |
| Johan Mateo Castañeda Mejía | Product | Diseño del flujo actual y oportunidad |
| Jorge Iván Gómez Restrepo | Technical Lead | Arquitectura blockchain e integración |
| Julián Correa | Design | Experiencia del comprador en aplicación |

**Canal de coordinación:** Slack / WhatsApp grupal

**Responsable de entregas:** Diana Carolina González Díaz

---

### Problema y evidencia

**Enunciado:**

Miles de familias en Colombia pagan durante años la cuota inicial de apartamentos que todavía no existen. No ven en qué se usa su dinero ni si la obra realmente avanza. Cuando el proyecto se atrasa, cambia o nunca arranca, se enteran tarde y terminan en años de demandas sin recuperar sus ahorros.

**Contexto y alcance:**

El problema afecta principalmente a compradores de primera vivienda con subsidios, cesantías o ahorros de toda la vida. En 2026 hay +70.000 viviendas sin entregar en Colombia. Desde 2024 la SIC registra +6.000 reclamaciones anuales por vivienda nueva, y 38 constructoras han sido sancionadas por incumplir. Entre 2025 y 2026, 11 fiduciarias fueron condenadas por incumplir contratos de fiducia.

**Evidencia documentada:**

- Doña Leonor (Barranquilla): Invirtió $90 millones en 2014. Debía recibir el apartamento en 2016. En 2023 seguía sin casa.
- Acierto Inmobiliario: Aproximadamente 14.000 compradores en su historia con reclamos documentados (Semana, agosto 2025).
- Falso proyecto Antioquia: 200 familias estafadas por $500 millones (El Tiempo, septiembre 2026).
- Constructora Santander: 200 familias pagaron el valor total sin recibir nada. $5.000 millones en riesgo (Infobea, 2024).
- Decreto 0510 (2026): Gobierno expide nuevas reglas que exigen a fiduciarias informar clara y completamente a los compradores.

---

### Usuario y actores

**Usuario principal: Laura, 31 años**

Auxiliar contable en Medellín. Compra su primer apartamento en Bello usando cesantías y ahorros. Lleva dos años pagando cumplido sin ver avance real, solo recibe renders del proyecto.

**Cómo lo resuelve hoy y qué le cuesta:**

1. Confía en la reputación de la constructora: riesgo total si la constructora quiebra o miente.
2. Paga comisiones a una fiduciaria: 1-2% del proyecto más impotencia, ya que el fiduciario solo guarda dinero y no verifica obra.
3. Pide visitas periódicas a la obra: solo ve un día lo que pasó en 30 días, con renders que no corresponden a la realidad.
4. Si todo falla: años de trámites costosos, abogados, y muchas veces sin recuperar nada.

El costo real es triple: dinero (ahorros de vida entera), tiempo (años de demandas) y angustia emocional. En casos como Avi Puerto Colombia (2014-2023), las familias esperan 9 años o más.

**Demás actores en el flujo:**

| Actor | Rol actual | Qué controla |
|---|---|---|
| Constructora | Ejecuta la obra y captura clientes | Cronograma, calidad, fotos de avance |
| Fiduciaria | Guarda el dinero y gestiona pagos | Saldos y transferencias; NO verifica obra |
| Interventor | Supervisa la obra | Fotografías y reportes de avance (datos dispersos) |
| Superintendencia de Industria y Comercio | Regula y sanciona | Recibe reclamos cuando es demasiado tarde |
| Comprador | Paga por etapas sin certeza | Nada; solo recibe promesas |

---

### Flujo actual de valor

**Cómo se mueve el dinero hoy:**

1. **Compra (sala de ventas):** Laura ve renders y firma un documento (separación o encargo fiduciario) que no entiende completamente.

2. **Transferencia a fiduciaria:** La cuota inicial sale de su cuenta hacia la fiduciaria. Comienza a pagar mensualmente.

3. **Control fiduciario:** La fiduciaria solo guarda dinero. No valida si la obra avanza ni verifica calidad de construcción.

4. **Pagos automáticos a constructora:** Mensualmente la constructora recibe dinero de la fiduciaria sin condición verificable alguna.

5. **Obra sin transparencia:** Laura no sabe si la obra está en cimientos, estructura o acabados. Solo recibe renders idénticos mes tras mes.

6. **Retrasos sin recourse:** Si hay retrasos, la constructora cambia fechas, Laura sigue pagando arriendo, y la fiduciaria no puede intervenir.

7. **Resultado:** Demandas, años de trámites, pérdida de ahorros o nada.

**Ganadores y perdedores hoy:**

- Ganan: Constructora (dinero rápido sin verificación), Fiduciaria (comisión sin riesgo)
- Pierden: Laura y 70.000 familias (ahorros, tiempo, confianza)

**Normativa aplicable:** El Decreto 0510 (2026) obliga a fiduciarias a informar clara y completamente, pero no existe sistema que lo haga posible de forma automática e inalterable.

---

### Fricciones identificadas

| Fricción | Paso | Causa raíz | A quién afecta |
|---|---|---|---|
| Asimetría de información | Mientras espera la obra | Constructora controla qué foto muestra; fiduciaria solo guarda dinero | Laura y 70.000 familias |
| Dinero desacoplado de obra | Durante toda la construcción | Pagos automáticos sin verificación de avance | Comprador/familia |
| Sistemas dispersos | Permanentemente | Constructora, fiduciaria e interventor usan sistemas separados | Todos los actores |
| Contrato confuso | Firma inicial | Laura firma separación o encargo sin entenderlo | Compradores primerizos |
| Detección tardía de fraude | Años después del pago | Si proyecto es falso o constructor desaparece, se descubre muy tarde | Comprador/familia |

---

### Oportunidad e hipótesis

**Oportunidad priorizada:**

Implementar un registro transparente e inalterable donde la plata se libera solo si el interventor verifica el avance de obra con evidencia concreta (fotos, reportes). Esto detecta problemas en tiempo real, no 2 años después.

**Por qué esta oportunidad:**

- Es donde se pierden los ahorros de toda una vida.
- Afecta a 70.000+ familias anualmente en Colombia.
- El Decreto 0510 ya lo exige; blockchain lo hace posible de forma automática.

**Hipótesis inicial:**

Si Laura pudiera ver cada mes el avance real de su edificio y saber que su plata solo se libera cuando el interventor confirma cada etapa de obra, tendría control sobre su ahorro y podría detectar un problema a tiempo, antes de perderlo todo.

**Cambios esperados para Laura con la solución:**

- Ve en tiempo real en su celular dónde está su plata y qué etapa está construida.
- Su dinero se libera solo si hay evidencia fotográfica y reporte de interventor.
- Si la obra se frena, ella se entera el mismo día, no meses después.
- El proyecto y sus etapas son públicos, transparentes e inalterables.

---

### Criterio de pertinencia

**¿Por qué blockchain y no una base de datos tradicional o integración de sistemas?**

Blockchain resuelve esto porque crea confianza sin intermediarios y con verificación permanente en tres frentes específicos:

**1. Registro inalterable que todos ven**

Hoy: La constructora controla qué fotos muestra, la fiduciaria guarda saldos que nadie puede auditar, y Laura solo cree promesas.

Con blockchain: Un contrato inteligente registra cada pago, cada foto de obra y cada etapa completada. Comprador, constructora, fiduciaria e interventor ven exactamente lo mismo en tiempo real. Nadie puede cambiar el historial.

Impacto: Elimina la asimetría de información que le cuesta millones a las familias hoy. Cumple automáticamente con el Decreto 0510.

**2. Liberación condicionada (plata por etapas)**

Hoy: La plata sale completa. Si la obra se frena, Laura solo puede reclamar después de perderla.

Con blockchain: Un contrato inteligente libera tokens (dinero digital) solo por etapas verificadas:
- 20% cuando cimientos completados (fotos + reporte interventor)
- 30% cuando estructura completada
- 30% cuando acabados completados
- 20% al cierre

Impacto: La plata sigue a la obra, no al revés. Problemas se detectan en tiempo real, no 2 años después.

**3. Propiedad única e imposible de duplicar**

Hoy: El derecho sobre el apartamento existe en papel (separación, contrato, encargo) confuso. Hay casos de apartamentos vendidos dos veces.

Con blockchain: Cada unidad de vivienda es un token no fungible (NFT) único a nombre de Laura. No se puede duplicar ni ocultar.

Impacto: Laura sabe exactamente qué derecho tiene. Nadie puede engañarla con lo que está comprando.

**Conclusión:**

Blockchain no es magia; es usar estas tres características muy específicas (transparencia, liberación condicionada, propiedad única) para que la plata de la familia siga a la obra de verdad.

---

### Supuestos y riesgos

| Supuesto | Cómo validarlo | Riesgo si es falso |
|---|---|---|
| Las constructoras serias aceptan recibir dinero por etapas | Conversar con 2 constructoras medianas. ¿Les sirve como sello de confianza? | Sistema no se adopta; constructoras exigen dinero anticipado |
| Las fiduciarias ven valor en un registro inalterable | Preguntar cómo reportan hoy avance; qué exige el Decreto 0510 | Fiduciarias no adoptan; siguen con sistemas legacy |
| El avance se puede verificar de forma confiable | Hablar con interventor sobre fotos, reportes por etapa, estándares | Datos de avance son subjetivos o fáciles de falsificar |
| Los compradores confían y pagarían por transparencia | Entrevistar 10 personas que compraron sobre planos | Compradores prefieren precios bajos aunque arriesguen ahorros |
| Los compradores usarían una app para monitorear | Cómo se enteran hoy del avance: WhatsApp, correo, visitas | Compradores no adoptan tecnología; prefieren llamadas |

**Riesgo crítico:** Si las constructoras o fiduciarias no adoptan el sistema, el valor colapsa. La validación de supuestos 1 y 2 es crítica en las primeras 2 semanas.

---

Tu plata avanza al mismo ritmo que tu apartamento.

---

Datos: Superintendencia de Industria y Comercio, Superintendencia Financiera y prensa nacional (2023–2026).

Equipo: Diana Carolina González Díaz, Ana María García Arias, Johan Mateo Castañeda Mejía, Jorge Iván Gómez Restrepo, Julián Correa.

Septiembre 2026
