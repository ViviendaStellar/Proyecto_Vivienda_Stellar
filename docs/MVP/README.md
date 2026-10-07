# Avance de Obra

Registro del avance de una obra de construcción por etapas, guardado en la red de Stellar.

Cada etapa tiene un nombre, un responsable y un porcentaje de avance. Esos datos viven en un contrato inteligente de Soroban, así que nadie puede alterarlos sin dejar rastro. Una página web permite crear etapas, registrar avances y consultarlos.

| Pieza | Carpeta | Tecnología |
|---|---|---|
| Contrato inteligente | [contracts/hello-world/](contracts/hello-world/) | Rust + Soroban SDK |
| Página web | [frontend/](frontend/) | JavaScript + Vite + Stellar SDK |

El contrato ya está desplegado en testnet con este ID:

```
CB3TZ3LS7TDSBKSNFXNY6H6AQE4VO6B522UYL3YARV7HL3AOWPQYO2K7
```

Puedes verlo en el [explorador de Stellar](https://stellar.expert/explorer/testnet/contract/CB3TZ3LS7TDSBKSNFXNY6H6AQE4VO6B522UYL3YARV7HL3AOWPQYO2K7).

---

## Contenido

1. [Qué hace el contrato](#1-qué-hace-el-contrato)
2. [Instalar las herramientas](#2-instalar-las-herramientas)
3. [Descargar el proyecto](#3-descargar-el-proyecto)
4. [Abrir la página web](#4-abrir-la-página-web)
5. [Preparar una billetera](#5-preparar-una-billetera)
6. [Usar la página](#6-usar-la-página)
7. [Compilar y probar el contrato](#7-compilar-y-probar-el-contrato)
8. [Desplegar tu propio contrato](#8-desplegar-tu-propio-contrato)
9. [Usar el contrato desde la terminal](#9-usar-el-contrato-desde-la-terminal)
10. [Estructura del proyecto](#10-estructura-del-proyecto)
11. [Problemas frecuentes](#11-problemas-frecuentes)

---

## 1. Qué hace el contrato

El contrato `ObraContract` tiene tres funciones:

| Función | Parámetros | Devuelve | Para qué sirve |
|---|---|---|---|
| `crear_etapa` | `nombre`, `responsable` | Texto de confirmación | Registra una etapa nueva con 0 % de avance. |
| `actualizar_avance` | `nombre`, `porcentaje`, `observaciones` | Texto de confirmación | Cambia el porcentaje de una etapa. Rechaza valores mayores que 100. |
| `obtener_etapa` | `nombre` | Número de 0 a 100 | Lee el porcentaje de una etapa. Es gratis y no necesita firma. |

`obtener_etapa` devuelve 0 también cuando la etapa no existe.

---

## 2. Instalar las herramientas

Solo necesitas los pasos **2.1** y **2.2** para usar la página web. Los pasos **2.3** y **2.4** son para trabajar con el contrato.

### 2.1 Git

Descárgalo de [git-scm.com](https://git-scm.com/downloads) e instálalo con las opciones por defecto.

### 2.2 Node.js

Instala la versión LTS desde [nodejs.org](https://nodejs.org). La página necesita Node.js 18 o superior.

Comprueba la instalación en una terminal nueva:

```sh
node -v
npm -v
```

### 2.3 Rust

Sigue las instrucciones de [rustup.rs](https://rustup.rs). En Windows, el instalador te pedirá las herramientas de compilación de Visual Studio.

Después agrega el destino que usan los contratos:

```sh
rustup target add wasm32v1-none
```

Los contratos necesitan Rust 1.84 o superior. Compruébalo con `rustc --version`.

### 2.4 Stellar CLI

Sigue la [guía oficial de instalación](https://developers.stellar.org/docs/tools/cli/install-cli). En Windows también puedes usar:

```sh
winget install --id Stellar.StellarCLI
```

Compruébalo con:

```sh
stellar --version
```

---

## 3. Descargar el proyecto

```sh
git clone https://github.com/ViviendaStellar/Proyecto_Vivienda_Stellar.git
cd Proyecto_Vivienda_Stellar/docs/MVP
```

Todos los comandos de esta guía se ejecutan desde la carpeta `docs/MVP`, salvo los de la página web, que se ejecutan desde `docs/MVP/frontend`.

---

## 4. Abrir la página web

1. Entra a la carpeta de la página:

   ```sh
   cd frontend
   ```

2. Crea tu archivo de configuración a partir del ejemplo:

   ```sh
   cp .env.example .env
   ```

   En PowerShell usa `copy .env.example .env`. El ejemplo ya apunta al contrato desplegado, así que no hace falta cambiar nada.

3. Instala las dependencias. Solo hace falta la primera vez:

   ```sh
   npm install
   ```

4. Arranca el servidor de desarrollo:

   ```sh
   npm run dev
   ```

5. Abre http://localhost:5173 en **Chrome, Edge, Brave o Firefox**.

Deja la terminal abierta mientras usas la página. Para detener el servidor pulsa `Ctrl + C`.

> El navegador integrado de VS Code no carga extensiones. Funciona para mirar la página, pero para firmar con Freighter necesitas un navegador normal.

---

## 5. Preparar una billetera

Consultar etapas es gratis y no necesita billetera. Para **crear etapas o registrar avances** necesitas firmar con una cuenta de Stellar que tenga fondos en testnet.

La página acepta dos billeteras. Elige una.

### Opción A: Albedo, sin instalar nada

1. En la página, pulsa **Conectar** y elige **Albedo**.
2. Se abre una ventana de albedo.link. Si el navegador la bloquea, permite las ventanas emergentes para localhost.
3. Crea una cuenta nueva o importa una existente con su clave secreta.
4. Acepta la conexión.

### Opción B: Freighter, extensión del navegador

1. Instala la extensión desde [freighter.app](https://freighter.app).
2. Crea una cuenta nueva o importa una existente.
3. En Freighter, abre el menú de red y elige **Test Net**.
4. Recarga la página, pulsa **Conectar** y elige **Freighter**.

### Fondear la cuenta en testnet

Una cuenta nueva no existe en la red hasta que recibe fondos. En testnet son gratis. Abre esta dirección cambiando `TU_DIRECCION` por la dirección pública de tu cuenta, que empieza con G:

```
https://friendbot.stellar.org/?addr=TU_DIRECCION
```

Si la respuesta dice `"successful": true`, la cuenta ya tiene 10 000 XLM de prueba.

> Nunca compartas tu clave secreta, la que empieza con S. Pégala solo dentro de Freighter o Albedo.

---

## 6. Usar la página

1. **Conecta la billetera** con el botón de la esquina inferior izquierda.
2. **Crea una etapa** con el botón **Nueva etapa**. Escribe el nombre y el responsable, o toca una sugerencia como Cimentación.
3. **Aprueba la firma** en tu billetera. Una ventana muestra los cuatro pasos: preparar, firmar, enviar y confirmar.
4. **Registra el avance** con el botón **Avance** de cada fila. Mueve el deslizador o toca 25, 50, 75 o 100 %, escribe una observación y guarda.
5. **Revisa la actividad reciente**. Cada transacción tiene un enlace para verla en el explorador.
6. **Sincroniza** cuando otra persona haya registrado avances. La página vuelve a leer los porcentajes del contrato.
7. **Consulta en la red** cualquier etapa por su nombre exacto, aunque no esté en tu panel. Si existe, puedes agregarla.

Para cambiar el nombre del proyecto, toca el lápiz junto a **Proyecto** en el menú lateral.

> El contrato no permite listar todas las etapas ni leer el responsable o las observaciones. Por eso la página guarda esos datos en tu navegador. El porcentaje siempre se toma de la red.

---

## 7. Compilar y probar el contrato

Ejecuta estos comandos desde la carpeta raíz del proyecto, no desde `frontend`.

Compilar todos los contratos a WebAssembly:

```sh
stellar contract build
```

El resultado queda en `target/wasm32v1-none/release/hello_world.wasm`. No uses `cargo build` directamente, porque `stellar contract build` agrega la configuración que la red necesita.

Ejecutar las pruebas:

```sh
cargo test
```

Deberías ver `test result: ok. 7 passed`. Las pruebas están en [test.rs](contracts/hello-world/src/test.rs) y comprueban que se crean etapas en 0 %, que el avance se actualiza, que se conserva el responsable, que se rechazan porcentajes mayores a 100 y que las etapas no se mezclan.

Revisa la sección [Problemas frecuentes](#11-problemas-frecuentes) si alguno de estos comandos falla.

---

## 8. Desplegar tu propio contrato

Solo necesitas esto si cambiaste el contrato o quieres una copia propia. Si no, usa el que ya está desplegado.

1. **Crea una identidad** en la terminal y fondéala en testnet. Cambia `mi-cuenta` por el nombre que quieras:

   ```sh
   stellar keys generate mi-cuenta --network testnet --fund
   ```

2. **Compila** el contrato:

   ```sh
   stellar contract build
   ```

3. **Despliégalo**:

   ```sh
   stellar contract deploy \
     --wasm target/wasm32v1-none/release/hello_world.wasm \
     --source-account mi-cuenta \
     --network testnet \
     --alias avance-obra
   ```

   El comando imprime el ID del nuevo contrato, que empieza con C.

4. **Conecta la página** al contrato nuevo. Abre `frontend/.env` y cambia el ID:

   ```
   VITE_CONTRACT_ID=EL_ID_NUEVO
   ```

5. **Reinicia** el servidor de la página con `Ctrl + C` y luego `npm run dev`.

En PowerShell, escribe el comando de despliegue en una sola línea o cambia `\` por un acento grave al final de cada línea.

---

## 9. Usar el contrato desde la terminal

Cambia `mi-cuenta` por tu identidad. Si no desplegaste tu propio contrato, usa el ID publicado en lugar del alias.

Crear una etapa:

```sh
stellar contract invoke --id avance-obra --source-account mi-cuenta --network testnet \
  -- crear_etapa --nombre "Cimentacion" --responsable "Ing. Laura Perez"
```

Registrar un avance:

```sh
stellar contract invoke --id avance-obra --source-account mi-cuenta --network testnet \
  -- actualizar_avance --nombre "Cimentacion" --porcentaje 50 --observaciones "Zapatas coladas"
```

Consultar el avance:

```sh
stellar contract invoke --id avance-obra --source-account mi-cuenta --network testnet \
  -- obtener_etapa --nombre "Cimentacion"
```

Ver todas las funciones disponibles:

```sh
stellar contract invoke --id avance-obra --network testnet -- --help
```

---

## 10. Estructura del proyecto

```text
docs/MVP/
├── Cargo.toml                  Espacio de trabajo de Rust
├── contracts/
│   └── hello-world/
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs          Código del contrato ObraContract
│           └── test.rs         Pruebas del contrato
└── frontend/                   Página web
    ├── index.html              Esqueleto de la página
    ├── .env.example            Configuración de red y contrato
    ├── docs/ARQUITECTURA.md    Cómo está organizado el código
    ├── CONTRIBUTING.md         Reglas para trabajar en equipo
    └── src/
        ├── config/             ID del contrato y red
        ├── services/           Conexión con Stellar y billeteras
        ├── store/              Estado de la aplicación
        ├── features/           Casos de uso: crear, actualizar, sincronizar
        ├── components/         Una carpeta por pieza visual
        ├── ui/                 Utilidades compartidas de interfaz
        └── styles/             Colores, tipografía y estilos base
```

La página está dividida en módulos independientes para que varias personas trabajen a la vez sin pisarse. Antes de cambiar la página, lee [frontend/docs/ARQUITECTURA.md](frontend/docs/ARQUITECTURA.md) y [frontend/CONTRIBUTING.md](frontend/CONTRIBUTING.md).

---

## 11. Problemas frecuentes

**"No se detectó Freighter" o "Freighter no está instalado".**
La página está abierta en un navegador sin la extensión, por ejemplo el de VS Code. Ábrela en Chrome, Edge, Brave o Firefox con Freighter, o elige Albedo.

**"La cuenta no existe en testnet".**
La cuenta no tiene fondos. Fondéala con Friendbot como indica el paso 5.

**"Cambia Freighter a la red TESTNET".**
Freighter está en la red principal. Cámbiala a Test Net desde el menú de red de la extensión.

**La ventana de Albedo no se abre.**
El navegador bloqueó la ventana emergente. Permite las ventanas emergentes para localhost y vuelve a intentarlo.

**Una etapa aparece en 0 % aunque la registré.**
El nombre debe coincidir exactamente, con mayúsculas y tildes. "Cimentación" y "Cimentacion" son etapas distintas.

**`npm` no se reconoce como comando.**
Node.js no está instalado o la terminal se abrió antes de instalarlo. Instálalo y abre una terminal nueva.

**`stellar contract build` dice que falta `wasm32v1-none`.**
Falta el destino de compilación. Ejecuta `rustup target add wasm32v1-none` y vuelve a compilar.

**`cargo test` tarda mucho la primera vez.**
Es normal. La primera ejecución compila todas las dependencias y puede tardar varios minutos. Las siguientes tardan segundos.

---

## Más información

- [Documentación de contratos en Stellar](https://developers.stellar.org/docs/build/smart-contracts/overview)
- [Ejemplos de contratos Soroban](https://github.com/stellar/soroban-examples)
- [Stellar Expert, explorador de testnet](https://stellar.expert/explorer/testnet)
