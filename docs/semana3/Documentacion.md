# Documentación Grupal — Semana 3: Functional Proof (CO)

**Proyecto:** INN-LOCK (Vivienda sobre planos)  
**Programa:** Blockchain Builders 101 · Blockchain Acceleration Foundation (BAF) & Ruta N · Red Stellar  
**Fecha:** Octubre de 2026  

---

## 1. Front construido

*(Sección a cargo de Anita / Johan Castañeda)*

---

## 2. Decisión técnica: Contratos inteligentes

**Responsable:** Julián Correa  

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

| Integrante | Rol / Responsabilidad en la entrega | Aporte específico |
|---|---|---|
| **Julián Correa** | Decisión técnica (Smart Contracts) | Evaluación y fundamentación técnica de la arquitectura de contratos en Soroban (Opción A vs Opción B). |

*(Los demás integrantes completarán sus datos en esta tabla)*

---

## 4. Bloqueos y siguiente paso

*(Sección a consolidar en conjunto por el equipo)*
