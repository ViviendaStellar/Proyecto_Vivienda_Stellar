# keeper

**Rol:** vigila los hitos de cada proyecto activo y llama a `check_overdue` en `contracts/escrow` cuando una fecha límite pasa sin certificación. No firma nada (`check_overdue` no exige firma): solo lee el estado del contrato y, si corresponde, dispara la alerta.

**Historia de usuario que atiende:** HU5 — *"Compradora: recibir una alerta cuando una etapa supera la fecha comprometida sin certificación"* ([ProductBlueprint.md](../../docs/Semana2/ProductBlueprint.md), sección 1). El dinero sigue retenido; esto solo avisa a tiempo.

Pendiente de implementar (fuera de este paso).
