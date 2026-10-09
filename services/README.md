# services — capa de lógica y orquestación

Es la capa de en medio del [Blueprint](../docs/Semana2/ProductBlueprint.md) (sección 7): el puente entre la interfaz (`frontend/`) y la red Stellar (`contracts/`). Por ahora son solo carpetas con su rol documentado; el código llega en un paso posterior.

- **[keeper/](keeper/README.md)** — vigila vencimientos de hitos.
- **[verifier/](verifier/README.md)** — verifica que las transacciones on-chain sean correctas.

Ninguno de los dos guarda llaves secretas: actúan como observadores de la red pública, no como firmantes.
