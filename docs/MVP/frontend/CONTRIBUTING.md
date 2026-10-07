# Cómo trabajar en equipo en la página

Estas reglas evitan que dos personas se pisen el trabajo. Lee también [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

## Antes de empezar

1. Actualiza tu copia: `git pull`.
2. Crea una rama para tu tarea: `git checkout -b nombre-corto-de-la-tarea`.
3. Arranca la página con `npm run dev` y deja la terminal abierta.

## Reparto del trabajo

Cada componente vive en su propia carpeta dentro de `src/components/`. Si dos personas trabajan en componentes distintos, no deberían tocar los mismos archivos.

Avisa al equipo antes de cambiar estos archivos compartidos, porque afectan a todos:

| Archivo | Por qué es delicado |
|---|---|
| `src/store/store.js` y `actions.js` | Cambian la forma del estado que leen todos los componentes. |
| `src/services/stellar/*` | Cambian cómo se habla con el contrato. |
| `src/styles/tokens.css` | Cambia colores y tipografías de toda la página. |
| `src/app.js` e `index.html` | Definen qué componentes se montan y dónde. |

## Convenciones de código

- **Idioma.** Los textos de la interfaz, los comentarios y la documentación van en español. Los nombres de funciones y variables nuevas van en inglés, salvo los que reflejan el contrato, como `nombre` o `porcentaje`.
- **Archivos.** Nombres en minúsculas con guiones: `stage-table.js`, `progress-drawer.css`.
- **Componentes.** Exportan una función `mountNombre(root)`. Ver el molde en la guía de arquitectura.
- **Estado.** Nunca modifiques `getState()` directamente. Agrega una función en `actions.js`.
- **Red.** Los componentes no importan nada de `services/`. Llaman a una función de `features/`.
- **Texto del usuario.** Insértalo siempre con la plantilla `html` o con `textContent`, nunca concatenado en `innerHTML`.
- **Estilos.** Usa las variables de `tokens.css`. No escribas colores sueltos en los componentes.
- **Selectores.** En JavaScript busca elementos por atributos `data-*`. Deja las clases para el CSS.
- **Formato.** El archivo `.editorconfig` fija dos espacios de sangría y saltos de línea LF. VS Code lo aplica con la extensión EditorConfig.

## Antes de entregar tu cambio

1. Compila sin errores:

   ```sh
   npm run build
   ```

2. Revisa la página en el navegador, en escritorio y con la ventana estrecha como un celular.
3. Abre la consola del navegador con `F12` y confirma que no hay errores en rojo.
4. Si cambiaste algo de la red, prueba crear una etapa y registrar un avance en testnet.
5. Haz commit con un mensaje que diga qué cambió y por qué:

   ```sh
   git add .
   git commit -m "Agrega filtro por responsable en la tabla de etapas"
   git push -u origin nombre-corto-de-la-tarea
   ```

6. Abre un pull request y pide revisión a otra persona del equipo.

## Qué no subir

El archivo `.gitignore` ya excluye estas carpetas y archivos. No los fuerces:

- `node_modules/`, que se regenera con `npm install`.
- `dist/`, que se regenera con `npm run build`.
- `.env`, que es la configuración local de cada persona.

Nunca subas claves secretas de Stellar, las que empiezan con S.
