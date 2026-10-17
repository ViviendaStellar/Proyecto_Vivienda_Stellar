# Guion de pruebas con usuarios · INN-LOCK

Detalle operativo del plan de validación de [`MVPFunctional.md`](MVPFunctional.md#4-plan-de-validación-con-usuarios): objetivos, participantes, entorno, método, tareas por rol, métricas, registro de hallazgos, cuestionario y cronograma.

## 1. Objetivos

1. Comprobar que cada rol completa sus tareas principales sin ayuda.
2. Medir cuánto tardan y cuántos errores cometen.
3. Detectar textos, botones o pasos que confundan.
4. Medir qué tan clara es la información clave: avance de obra, fondos en custodia, estado de cada hito y estado de las firmas.
5. Priorizar los ajustes de usabilidad antes de la siguiente versión.

## 2. Participantes

| Rol en la plataforma | Perfil | Cantidad sugerida |
|---|---|---|
| Comprador | Persona que compró o piensa comprar vivienda sobre planos; no necesita saber de tecnología | 5 |
| Constructora | Persona que administre proyectos o documentación en una constructora | 3 |
| Interventor | Ingeniero o arquitecto con experiencia en interventoría o supervisión técnica | 3 |
| Administrador | Persona del equipo del proyecto con conocimiento de la operación | 1 o 2 |

Con 5 personas por rol se descubren la mayoría de los problemas de usabilidad más comunes. Para constructoras e interventores, 3 son suficientes para una primera ronda.

## 3. Entorno de la prueba

- **Versión:** la aplicación publicada en modo demostración (`?demo=1`), con datos ficticios y perfiles ya preparados (el correo y la contraseña se completan solos). Para las tareas con firma en la red, el modo Testnet (`?chain=testnet`) con la billetera Freighter.
- **Dispositivos:** una parte de las personas en computador y otra en celular, porque la interfaz es responsiva.
- **Formato:** presencial o por videollamada con pantalla compartida, de 25 a 30 minutos por persona, grabado con permiso.
- **Quién acompaña:** una persona que guía y otra que toma notas. La que guía no ayuda ni explica, solo lee la tarea y observa.

## 4. Método

1. **Bienvenida (2 min).** Se explica que se prueba la plataforma, no a la persona, y se pide permiso para grabar.
2. **Cuestionario inicial (2 min).** Experiencia con apps financieras o inmobiliarias y con billeteras digitales.
3. **Tareas (15 a 20 min).** La persona resuelve cada tarea **pensando en voz alta**. No se le dice dónde hacer clic.
4. **Cuestionario final (5 min).** Escala de usabilidad (SUS) y tres preguntas abiertas.

## 5. Tareas por rol

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

## 6. Qué se mide

| Métrica | Cómo se mide | Meta propuesta |
|---|---|---|
| Éxito de la tarea | Completó sin ayuda / con ayuda / no completó | Al menos 80 % completadas sin ayuda |
| Tiempo por tarea | Cronómetro desde que se lee la tarea hasta que la termina | Se fija con la prueba piloto interna (tiempo de una persona del equipo × 2) |
| Errores | Clics equivocados, pantallas visitadas por error, regresos | Menos de 2 errores por tarea |
| Comprensión | Se pregunta: "¿qué entiendes de lo que ves aquí?" en el avance, los fondos y los estados | Al menos 4 de 5 personas lo explican correctamente |
| Satisfacción | Escala SUS (10 preguntas, de 0 a 100) | 68 o más (promedio de referencia) |
| Percepción | "¿Qué tan fácil fue? (1 a 5)" por tarea | Promedio de 4 o más |

## 7. Registro de hallazgos

Cada problema se anota con: tarea, persona, qué pasó, cita textual, pantalla, gravedad y propuesta de ajuste.

| Gravedad | Significado |
|---|---|
| Crítica | La persona no logra completar la tarea |
| Alta | La completa con mucha dificultad o con ayuda |
| Media | Se confunde pero se recupera sola |
| Baja | Molestia menor o sugerencia |

## 8. Cuestionario final

1. Escala SUS (10 afirmaciones, de 1 "muy en desacuerdo" a 5 "muy de acuerdo").
2. ¿Qué fue lo más fácil de usar?
3. ¿Qué fue lo más confuso o difícil?
4. ¿Qué cambiarías o agregarías?

## 9. Cronograma propuesto

| Semana | Actividad |
|---|---|
| 1 | Preparar tareas y cuestionarios, hacer una prueba piloto interna y ajustar |
| 2 | Pruebas con compradores y administrador |
| 3 | Pruebas con constructoras e interventores |
| 4 | Consolidar hallazgos, priorizar ajustes y definir qué se corrige primero |

## 10. Cómo se usarán los resultados

- Los problemas críticos y altos que se repitan en **2 o más personas** pasan a los ajustes de la sección 2 de MVPFunctional.md.
- Las tareas con menos de 80 % de éxito se rediseñan antes de la siguiente prueba.
- Se repite una segunda ronda corta con las pantallas corregidas, para comprobar que el cambio funcionó.
- Los resultados se guardan en esta carpeta, con fecha, perfil de la persona (sin nombre) y los hallazgos.
