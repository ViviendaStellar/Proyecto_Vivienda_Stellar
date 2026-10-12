# Documentación Grupal — Semana 3: Functional Proof (CO)

**Proyecto:** INN-LOCK (Vivienda sobre planos)  
**Programa:** Blockchain Builders 101 · Blockchain Acceleration Foundation (BAF) & Ruta N · Red Stellar  
**Fecha:** Octubre de 2026  

---

## 1. Front construido

**Responsable:** Ana María García Arias (`Nany1993`) / Johan Mateo Castañeda (`dotcom2409`)  
**Enlace al despliegue en producción:** [https://viviendastellar.github.io/Proyecto_Vivienda_Stellar/](https://viviendastellar.github.io/Proyecto_Vivienda_Stellar/)

### 1.1 Arquitectura y Enfoque Técnico del Frontend
Para la construcción del frontend de **INN-LOCK**, se optó por una arquitectura web autocontenida desarrollada con tecnologías web estándar (**HTML5 semántico, CSS3 modular y JavaScript Vanilla ES6+**), prescindiendo intencionalmente de frameworks pesados o empaquetadores complejos. Esta decisión garantiza una carga instantánea, portabilidad sin fricción de dependencias en tiempo de ejecución, compatibilidad nativa con dispositivos móviles y la posibilidad de ser servido localmente con un comando simple (`python -m http.server 4180`) o mediante GitHub Pages.

La interfaz incluye soporte completo para **Service Workers** (permitiendo navegación offline), sistema de temas claro/oscuro con variables CSS, renderizado de componentes y modales reactivos, y una biblioteca integrada de micro-interacciones que facilitan la adopción de usuarios tradicionales sin experiencia previa en Web3.

Para la interacción con la blockchain, la capa cliente integra `@stellar/stellar-sdk` y la API de la billetera **Freighter**, soportando dos modalidades desacopladas:
* **Modo Demostración (`?demo=1`):** Diseñado para explorar el flujo de negocio de forma inmediata con perfiles precargados (Comprador, Constructora, Interventor y Administrador), simulando transacciones en memoria local (`localStorage`).
* **Modo Testnet On-Chain (`?chain=testnet`):** Conecta la interfaz directamente al contrato inteligente desplegado en la red de pruebas de Stellar, interactuando con transacciones reales y firmas multifirma.

---

### 1.2 Pantallas Implementadas y Conexión con el MVP (Product Blueprint)

La interfaz gráfica materializa de extremo a extremo las historias de usuario priorizadas en el *Product Blueprint* (Semana 2), articuladas en las siguientes vistas principales:

#### A. Autenticación y Selección de Rol (`#/login`)
Permite iniciar sesión bajo el flujo real con Supabase o alternar instantáneamente entre los 4 roles del ecosistema en modo demostración:
* **Comprador** (`comprador@inn-lock.co`)
* **Constructora** (`constructora@inn-lock.co`)
* **Interventor** (`interventor@inn-lock.co`)
* **Administrador / Fiduciaria** (`admin@inn-lock.co`)

#### B. Asistente de Registro de Proyecto (`#/nuevo` — Vinculado a HU1)
La constructora configura y formaliza las reglas del proyecto antes de recibir aportes, asegurando transparencia absoluta frente a los compradores:
1. **Paso 1 (Datos generales):** Captura nombre, ubicación, licencia urbanística, matrícula inmobiliaria, descripción y render comercial prometido.
2. **Paso 2 (Actores y cumplimiento):** Asignación de la fiduciaria responsable y la firma interventora técnica independiente, junto con la carga de documentos legales (Cámara de Comercio, RUT, pólizas).
3. **Paso 3 (Presupuesto y cronograma):** Desglose del cronograma entre 6 y 60 hitos. El sistema valida en tiempo real que la suma de porcentajes sea exactamente 100% (10.000 bps), que las fechas sean secuenciales y que ningún hito sobrepase el tope porcentual de riesgo. Admite importación masiva desde plantilla Excel/CSV.
4. **Paso 4 (Resumen y solicitud de firmas):** Resumen consolidado que genera la propuesta de proyecto e inicia el ciclo de firmas digitales.

#### C. Bandeja de Solicitudes y Gobernanza Multiactor (`#/solicitudes` — Vinculado a HU1 y HU3)
Permite coordinar el consenso de las tres partes antes de abrir el proyecto a ventas:
* **Vista del Interventor:** Inspecciona el cronograma propuesto, verifica la coherencia técnica de las fases y ejecuta la acción de "Aprobar y firmar" o "Devolver con observaciones".
* **Vista del Administrador:** Una vez que la interventoría aprueba, el administrador valida la documentación legal y ejecuta "Activar proyecto", sellando el cronograma en la red Stellar.

#### D. Tablero de Avance de Obra y Registro de Evidencia (`#/proyecto/:id` — Vinculado a HU3 y HU4)
Esta vista constituye el núcleo de verificación técnica de la plataforma:
* **Curva S y Línea de Tiempo:** Gráfica interactiva de avance financiero y físico planeado vs. real.
* **Módulo de Reporte de Hito (Constructora):** Carga obligatoria de evidencias (mínimo 3 fotografías georreferenciadas e informe técnico en PDF). La interfaz procesa los archivos y calcula su huella criptográfica SHA-256 (`evidence_hash`) antes de someterlos a revisión.
* **Modal de Certificación y Visor Comparativo (Interventor):** El interventor examina la evidencia en alta resolución. Si los trabajos cumplen con las normas técnicas, firma la certificación; si presentan defectos, rechaza con observaciones detalladas para subsanación.
* **Liberación Condicionada de Fondos:** La pantalla refleja el traspaso del dinero en custodia solo tras la certificación técnica aprobada, reflejando desembolsos totales o parciales según el saldo recaudado.

#### E. Módulo "Mi Inversión" y Transparencia para el Comprador (`#/inversion` — Vinculado a HU2, HU3 y HU5)
Diseñado específicamente para empoderar a las familias compradoras:
* **Trazabilidad de cuotas:** Desglose peso a peso de los aportes realizados por el comprador vinculados a su unidad habitacional específica.
* **Bóveda de retención:** Visualización clara de cuánto dinero permanece protegido en el depósito de garantía y cuánto se ha liquidado a la constructora.
* **Verificación de evidencia:** El comprador puede auditar directamente las fotografías certificadas por la interventoría que justificaron cada salida de dinero, contrastándolas contra los renders comerciales prometidos.
* **Alertas visuales de retraso (HU5):** Notificaciones destacadas en caso de que un hito supere su fecha límite pactada sin certificación técnica, garantizando que el usuario conozca la situación mientras sus fondos continúan protegidos.

#### F. Módulo de Gestión de Cronograma y Contingencias
* **Solicitud de Ajustes de Cronograma:** Si surgen imprevistos climáticos o de suministro, la constructora puede solicitar la redistribución de porcentajes y fechas de hitos pendientes. Requiere justificación formal y aprobación obligatoria del interventor para tener validez.
* **Congelamiento Fiduciario:** Panel exclusivo del administrador para pausar preventivamente desembolsos ante disputas legales o incumplimientos parafiscales.

---

## 2. Decisión técnica: Contratos inteligentes

**Responsable:** Julián Correa (`Slider00`)  

### Opción elegida: Opción A — Contrato propio en Soroban (Rust)

Para la implementación de **INN-LOCK**, determinamos el desarrollo de un **contrato inteligente propio en Soroban** (Rust / WASM). Esta decisión se fundamenta directamente en las necesidades operativas y de mitigación de riesgo patrimonial definidas en nuestro *Product Blueprint* (Semana 2).

#### 1. Justificación y correspondencia con el Product Blueprint
El núcleo del producto radica en reemplazar la confianza ciega por verificación criptográfica inmutable. Las primitivas nativas no bastan para cubrir el ciclo mínimo de protección definido:

* **Consenso tripartito y reglas inmutables (HU1 / HU2):** Gobierna el proyecto bajo una regla de consenso estricta entre Constructora, Interventoría y Administrador fiduciario (`register_project`). Fija las reglas y el cronograma antes de recibir el primer aporte, impidiendo alteraciones unilaterales.
* **Custodia condicionada y anclaje de evidencia (HU3 / HU4):** El contrato gestiona una máquina de estados de 6 fases (`Pendiente` → `EnCurso` → `Reportado` → `Observado` → `Certificado` → `Desembolsado`). Sella on-chain el hash SHA-256 de las actas y registros fotográficos de obra (`evidence_hash`), condicionando cada desembolso a la certificación técnica independiente sin intermediarios de confianza.
* **Liquidación proporcional exacta:** Ejecuta pagos automáticos mediante el Stellar Asset Contract (SAC) utilizando aritmética sobre puntos base (bps), calculando pagos parciales y saldos pendientes según la liquidez retenida.
* **Auditoría de retrasos y contingencias (HU5):** Habilita la función pública `check_overdue`, permitiendo que cualquier usuario o servicio indexador marque formalmente el retraso en la red ante vencimiento de plazos, además de permitir congelamiento preventivo (`freeze`).

#### 2. Matriz de decisión técnica frente a la Opción B (Stellar clásico)

| Criterio técnico | Opción A: Contrato Soroban | Opción B: Primitivas Stellar Nativas |
|---|---|---|
| **Lógica condicional ligada a evidencia** | ✅ Valida hashes SHA-256 de fotos y reportes | ❌ Solo admite firmas o fechas estáticas |
| **Gobernanza multipartita dinámica** | ✅ Multi-Auth con flujos de subsanación | ❌ Cuentas multi-sig rígidas sin estados |
| **Desembolsos parciales y saldos** | ✅ Aritmética proporcional acumulada | ❌ Claimable Balances todo-o-nada |
| **Alertas públicas de incumplimiento** | ✅ Marcado descentralizado on-chain | ❌ Depende 100% de servidores externos |

#### Conclusión
Las herramientas nativas de Stellar (*Claimable Balances* y *Time Bounds*) son excelentes para pagos diferidos simples, pero carecen de programabilidad para validar avance de obra y mitigar asimetrías de información. Un contrato propio en Soroban es el único enfoque que garantiza la protección patrimonial que el modelo de vivienda sobre planos exige.

---

## 3. Participación del equipo

| Integrante | Usuario GitHub | Rol en la entrega | Aporte específico |
|---|---|---|---|
| **Johan Mateo Castañeda** | `dotcom2409` | Frontend Core Developer | Arquitectura, diseño responsivo y maquetación de pantallas del flujo principal del MVP. |
| **Ana María García Arias** | `Nany1993` | Documentación de Frontend | Documentación técnica del funcionamiento de la interfaz, vistas de usuario y correspondencia con el Blueprint. |
| **Julián Correa** | `Slider00` | Arquitectura de Smart Contracts | Evaluación técnica, sustentación de gobernanza on-chain y matriz de decisión de contratos en Soroban. |
| **Diana Carolina González** | `Diana1295Dev` | Documentación & DevOps | Estructuración del README del repositorio, guías de instalación y configuración de despliegue. |

---

## 4. Bloqueos y siguiente paso

### Bloqueos identificados durante la semana
1. **Fricción en la simulación multifirma con billeteras Web3:** En el flujo real de Soroban, requerir que tres actores firmen asíncronamente con Freighter en Testnet implicaba alternar constantemente cuentas locales y fondear cada una de ellas, lo que ralentizaba las pruebas manuales de equipo. Para desbloquear el avance del front sin esperar la finalización del backend, se construyó un adaptador dual que permite alternar entre simulación local fluida y transacciones reales on-chain.
2. **Sincronización de nonces en firmas diferidas:** En transacciones con firmas múltiples en Soroban, la expiración de ledgers exige un cálculo preciso de vigencia para evitar que las firmas de la constructora e interventoría caduquen antes de que el administrador autorice la activación.

### Siguiente paso hacia el MVP (Semana 4)
* **Conexión integral del ciclo de obra a Testnet:** Integrar las llamadas on-chain de `report_milestone`, `certify_milestone` y `deposit` directamente desde los botones del panel de control.
* **Suscripción reactiva a eventos del contrato:** Implementar listeners de eventos (`MilestoneReported`, `MilestoneCertified`, `Disbursed`) para actualizar automáticamente el panel del comprador y las barras de avance de obra en tiempo real.
