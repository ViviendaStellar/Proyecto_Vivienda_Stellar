# Avance de Obra · Página web

Interfaz para el contrato `ObraContract` desplegado en Stellar testnet.

## Arranque rápido

```sh
cd frontend
cp .env.example .env
npm install
npm run dev
```

Abre http://localhost:5173 en Chrome, Edge, Brave o Firefox.

Para conectar una billetera y fondear la cuenta, sigue el paso a paso del [README principal](../README.md#5-preparar-una-billetera).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga automática. |
| `npm run build` | Genera la versión final en `dist/`. |
| `npm run preview` | Sirve la versión de `dist/` para revisarla. |

## Configuración

El archivo `.env` define a qué contrato y a qué red se conecta la página:

| Variable | Valor por defecto |
|---|---|
| `VITE_CONTRACT_ID` | `CB3TZ3LS7TDSBKSNFXNY6H6AQE4VO6B522UYL3YARV7HL3AOWPQYO2K7` |
| `VITE_RPC_URL` | `https://soroban-testnet.stellar.org` |

Reinicia `npm run dev` después de cambiarlo.

## Organización del código

```text
src/
├── main.js            Punto de entrada: estilos globales y arranque
├── app.js             Monta cada componente en su lugar de index.html
├── config/            ID del contrato, red y enlaces al explorador
├── services/
│   ├── stellar/       Llamadas al contrato por RPC
│   └── wallets/       Freighter y Albedo
├── store/             Estado, acciones y cálculos derivados
├── features/          Casos de uso: crear, actualizar, sincronizar
├── components/        Una carpeta por pieza visual, con su JS y su CSS
├── ui/                Utilidades: DOM, formato, iconos, avisos, paneles
└── styles/            Variables de diseño y estilos base
```

- [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) explica las capas, el flujo de datos y recetas para agregar componentes, funciones del contrato o billeteras.
- [CONTRIBUTING.md](CONTRIBUTING.md) reúne las reglas para trabajar en equipo.
