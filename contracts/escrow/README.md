# 🏗️ INN-LOCK Escrow Contract (Soroban / Stellar)

Este directorio contiene el código fuente, suite de pruebas y scripts de despliegue del contrato inteligente de custodia condicionada (**Conditional Escrow**) para **INN-LOCK**, implementado en **Rust** utilizando el SDK oficial de **Soroban v28** sobre la red **Stellar**.

> 📖 **Para la documentación técnica completa, arquitectura, referencia de API y guía de ejecución**, consulta el documento principal:  
> 👉 [**README_CONTRATO.md**](../../README_CONTRATO.md)

---

## Estructura del Workspace

```text
.
├── Cargo.toml                    # Configuración del workspace de Cargo
├── AGENTS.md                     # Directrices y comandos de compilación/despliegue
├── deployments/
│   └── testnet.json              # Registro de contrato y token desplegados en Testnet
├── docs/
│   ├── ARQUITECTURA_ONCHAIN.md   # Diagrama de capas y flujo de las 3 firmas
│   ├── GUIA_FIRMAS_TESTNET.md    # Guía interactiva de pruebas con Freighter
│   ├── verificar-registro.js     # Script de validación de estado on-chain
│   └── img/                      # Diagramas arquitectónicos en SVG
└── contracts/
    └── escrow/
        ├── Cargo.toml            # Dependencias del crate del contrato
        ├── src/
        │   ├── lib.rs            # Lógica central del contrato inteligente
        │   └── test.rs           # Suite completa de pruebas unitarias
        └── test_snapshots/       # Snapshots de ejecución de tests
```

---

## Comandos Rápidos

```bash
# Agregar target de WebAssembly (solo la primera vez)
rustup target add wasm32v1-none

# Compilar a binario WebAssembly optimizado
stellar contract build

# Ejecutar la suite de pruebas unitarias
cargo test
```

Para detalles del despliegue en Testnet y pruebas E2E, revisa [README_CONTRATO.md](../../README_CONTRATO.md).
