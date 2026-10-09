<div align="center">

# 🏗️ INN-LOCK

**Tu cuota inicial solo se mueve cuando la obra avanza**

<img src="https://img.shields.io/badge/HTML%20%C2%B7%20CSS%20%C2%B7%20JS-1A3A6B?style=for-the-badge" alt="HTML, CSS y JS">
<img src="https://img.shields.io/badge/Supabase-0E6B4F?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase">
<img src="https://img.shields.io/badge/Red-Stellar-3B5BDB?style=for-the-badge&logo=stellar&logoColor=white" alt="Stellar">

[**Ver la página publicada**](https://viviendastellar.github.io/Proyecto_Vivienda_Stellar/)

</div>

<br>

## ✅ Requisitos

| Herramienta | Para qué | Descarga |
|---|---|---|
| **Git** | Descargar el proyecto | [git-scm.com](https://git-scm.com/downloads) |
| **Python 3** | Levantar el servidor local | [python.org](https://www.python.org/downloads/) |
| **Un navegador** | Abrir la página | Chrome, Edge o Firefox |

> No hay que instalar librerías ni dependencias: la página ya trae todo lo que necesita.

<br>

## 📥 Instalación

```bash
git clone https://github.com/ViviendaStellar/Proyecto_Vivienda_Stellar.git
cd Proyecto_Vivienda_Stellar/frontend
```

<br>

## ▶️ Cómo correrlo

**1. Levanta el servidor** desde la carpeta `frontend`:

```bash
python -m http.server 4180
```

> En Windows, si `python` no funciona, usa `py -m http.server 4180`.

**2. Abre la página** en el navegador:

| Modo | Dirección | Qué hace |
|---|---|---|
| **Real** | http://localhost:4180 | Inicias sesión con tu cuenta y los datos se guardan en Supabase |
| **Demostración** | http://localhost:4180/?demo=1 | Datos de ejemplo, sin cuenta ni base de datos |

**3. En el modo demostración**, entra con cualquiera de estos perfiles. La contraseña de todos es `demo1234`:

| Perfil | Correo |
|---|---|
| 👩 Comprador | comprador@inn-lock.co |
| 🏗️ Constructora | constructora@inn-lock.co |
| 🦺 Interventor | interventor@inn-lock.co |
| ⚙️ Administrador | admin@inn-lock.co |

Para detener el servidor, presiona `Ctrl + C` en la terminal.
