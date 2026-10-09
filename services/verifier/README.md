# verifier

**Rol:** verifica que las transacciones ya confirmadas en `contracts/escrow` sean consistentes — que el `evidence_hash` certificado coincida con el reportado, que los montos desembolsados cuadren con el cronograma, y que el historial on-chain no se contradiga con lo que la aplicación muestra. No firma ni modifica nada: solo lee y compara.

**Historia de usuario que atiende:** HU4 — *"Interventor: certificar la terminación de una etapa con fotos fechadas y reporte técnico que nadie pueda modificar"* ([ProductBlueprint.md](../../docs/Semana2/ProductBlueprint.md), sección 1): este servicio es lo que hace comprobable esa garantía de "nadie pueda modificar", y es la base para que la Superintendencia (salida del flujo, sección 3) pueda auditar el historial.

Pendiente de implementar (fuera de este paso).
