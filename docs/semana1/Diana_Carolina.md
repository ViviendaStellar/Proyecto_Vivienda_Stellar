# Propuesta individual — Fase 1

**Diana Carolina González Díaz**
Bootcamp Blockchain · Ruta N BAF · Red Stellar · Septiembre de 2026

---

## El problema

> Las familias que compran vivienda sobre planos en Colombia pagan durante años una cuota inicial sin poder verificar si la obra avanza ni en qué se está usando su dinero.

---

## ¿Quién lo sufre?

Laura tiene 31 años y es auxiliar contable en Medellín. Hace dos años firmó en una sala de ventas la compra de su primer apartamento en Bello: entregó sus cesantías como cuota inicial y desde entonces paga su cuota mensual sin fallar un solo mes. Cada vez que pregunta cómo va la obra le responden que todo marcha bien y le reenvían el mismo render que vio el primer día. No sabe si el edificio está en cimientos o en acabados, y tampoco tiene claro qué firmó: cree que compró un apartamento, pero el documento dice "encargo fiduciario".

Laura representa a un grupo amplio y concreto: compradores de primera vivienda que financian la cuota inicial con cesantías, subsidios o los ahorros de toda una vida, y que durante dos o tres años entregan dinero a un proyecto que todavía no existe. Son personas sin formación jurídica ni financiera que toman la decisión más cara de su vida con la información que les entrega la sala de ventas.

La situación no es marginal:

- Más de **70.000 viviendas** siguen sin entregarse en Colombia (Cablenoticias, mayo de 2026).
- La SIC recibió más de **6.000 reclamaciones** por vivienda nueva entre 2024 y 2025, y sancionó a **38 constructoras** por más de $5.777 millones.
- La Superintendencia Financiera impuso **45 condenas a 11 fiduciarias** entre 2025 y 2026 por incumplir el contrato de fiducia.

El momento crítico no es la firma ni la entrega: es el intervalo de dos o tres años en el que el dinero ya salió del bolsillo del comprador y la obra sigue siendo una caja cerrada.

---

## ¿Cómo se resuelve hoy y qué cuesta?

Hoy la protección del comprador descansa en tres mecanismos, y ninguno le devuelve visibilidad sobre su dinero.

**1. La fiducia inmobiliaria.** El dinero no va directo a la constructora sino a una fiduciaria que lo administra. En teoría es la garantía; en la práctica la fiduciaria verifica requisitos contractuales —punto de equilibrio, licencias, desembolsos— y no el avance físico de la obra. *Cuesta* entre el 1% y el 2% del valor del proyecto en comisiones, y aun así 11 fiduciarias acumularon 45 condenas entre 2025 y 2026.

**2. La confianza en la marca.** El comprador investiga la reputación de la constructora y asume el riesgo por su cuenta. *Cuesta* el capital completo cuando la empresa se atrasa, quiebra o nunca inicia: en el caso de la constructora Avi, en Puerto Colombia, más de 200 personas pagaron desde 2014 un proyecto donde nunca se levantó una pared.

**3. El seguimiento informal.** Llamadas, mensajes de WhatsApp y visitas a la obra los fines de semana. *Cuesta* tiempo y no resuelve el fondo: una visita muestra un día de los treinta que pasaron, y la información sigue dependiendo de lo que la constructora quiera contar.

Cuando el proyecto falla empieza la ruta de reclamación —SIC, Superintendencia Financiera, Fiscalía, abogados—, que *cuesta* años y dinero adicional con baja probabilidad de recuperar el capital. Doña Leonor, de 75 años, invirtió $90 millones en 2014 en un apartamento cerca de Barranquilla que debía recibir en 2016; en 2023 seguía sin casa y sin su plata.

El costo total se reparte en tres frentes:

| Frente | Qué pierde el comprador |
|---|---|
| Dinero | Comisiones que no compran verificación, más el ahorro completo en riesgo |
| Tiempo | Dos o tres años de incertidumbre y hasta nueve de litigio |
| Esfuerzo | Trámites, desgaste emocional y la imposibilidad de decidir a tiempo |

---

## ¿Por qué creo que blockchain podría aportar?

Mi hipótesis —y la planteo como hipótesis, no como conclusión— es que este caso encaja con dos de los criterios de pertinencia que revisamos en la Sesión 1.

**Varias partes que no confían entre sí necesitan compartir un mismo registro.** En un proyecto sobre planos intervienen al menos cuatro actores con intereses distintos: el comprador busca certeza, la constructora busca liquidez, la fiduciaria busca cumplir el contrato sin asumir riesgo operativo y el interventor certifica el avance. Hoy cada uno mantiene su propia versión de los hechos en sistemas separados, y el comprador —que es quien pone el dinero— es el único sin acceso a ninguno. Un registro compartido, donde el interventor publique el avance verificado y los desembolsos se liberen contra esa verificación, le daría a Laura la misma información que tienen los demás y al mismo tiempo.

**El histórico no puede alterarse.** El avance de obra es hoy un relato que controla quien lo emite: el render se repite, la fecha de entrega se corre y no queda rastro verificable de lo que se prometió en cada momento. Si cada hito quedara registrado de forma inmutable, con fecha y evidencia asociada, el comprador podría detectar la desviación en el mes en que ocurre y no dos años después, cuando ya no hay nada que recuperar.

Lo que **no** afirmo es que la tecnología resuelva el problema por sí sola. El punto más débil de mi hipótesis es el vínculo entre el mundo físico y el registro digital: alguien tiene que certificar que los cimientos están hechos, y si esa persona se equivoca o miente, la cadena registrará un dato falso de forma igualmente inmutable. Tampoco sé si las constructoras aceptarían recibir el dinero contra hitos verificados en lugar de por cronograma, ni si las fiduciarias verían valor o amenaza en un registro que no controlan. Son las tres preguntas que habría que validar antes de avanzar.

Lo que sí me parece sólido es el punto de partida: hay un problema real, con víctimas identificables y cifras públicas, cuyo núcleo es la asimetría de información entre partes que no confían entre sí. Y el Decreto 0510 de 2026 ya obliga a las fiduciarias a informar de forma clara y completa a los compradores, lo que sugiere que la regulación empuja en la misma dirección.

---

## Fuentes consultadas

- Cablenoticias (mayo de 2026) — viviendas sin entregar en Colombia.
- El Heraldo (marzo de 2026) — cifras de la SIC y de la Superintendencia Financiera; declaraciones de la Lonja de Propiedad Horizontal del Atlántico.
- Semana (agosto de 2025) — caso Acierto Inmobiliario.
- El Tiempo (septiembre de 2026) — condena por proyecto falso en Antioquia.
- Infobae (marzo de 2024) — constructora en Santander.
- Pulzo (2023) — caso Avi en Puerto Colombia y otros proyectos señalados.
- Decreto 0510 de 2026 — reglas de información y control para la fiducia inmobiliaria.
