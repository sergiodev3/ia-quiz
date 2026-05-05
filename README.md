# IA Quiz — Juego Interactivo de Inteligencia Artificial

Juego educativo tipo plataformer 2D (estilo Mario) para repasar conceptos de Inteligencia Artificial al final de clase. El jugador controla a OrangeRobot, salta y golpea cajas desde abajo para responder preguntas, mientras esquiva robots enemigos.

![Phaser](https://img.shields.io/badge/Phaser-4.1.0-blue) ![Vite](https://img.shields.io/badge/Vite-8.0-purple) ![License](https://img.shields.io/badge/licencia-privado-gray)

---

## Características

- **3 sesiones temáticas** con 3 preguntas cada una
- **Mecánica Mario-style** — salta y golpea la caja de tu respuesta desde abajo
- **Sistema de vidas** — 2 corazones; perder uno por respuesta incorrecta o toque de enemigo
- **Enemigos patrullantes** — robots que dificultan el acceso a las cajas (más veloces en preguntas avanzadas)
- **Efectos de sonido** sintetizados por Web Audio API — sin archivos de audio
- **Animaciones pixel art** — OrangeRobot con estados idle / run / jump / hurt / death
- **Pantalla de menú** con selector de sesión y vista previa del personaje
- **Pantallas de victoria y Game Over** con opciones de reintentar o volver al menú

---

## Sesiones de contenido

| Sesión | Título | Tema |
|--------|--------|------|
| 01 | Tu Tutor Inteligente | De Buscador a Agente — prompts, fórmula CREO, IA como tutor |
| 02 | Cerebro Creativo y de Estudio | NotebookLM, generación de imágenes, flashcards y verificación |
| 03 | El Piloto del Futuro | Alucinaciones, Principio del Piloto, uso ético |

---

## Controles

| Acción | Tecla |
|--------|-------|
| Mover izquierda | `←` o `A` |
| Mover derecha | `→` o `D` |
| Saltar | `↑`, `W` o `Espacio` |
| Seleccionar sesión (menú) | `1`, `2` o `3` |

---

## Stack técnico

- **[Phaser 4.1.0](https://phaser.io/)** — motor de juego 2D con física Arcade
- **[Vite 8](https://vite.dev/)** — bundler y servidor de desarrollo
- **Web Audio API** — síntesis de sonido en tiempo real (sin archivos .mp3/.ogg)
- Assets: *Robot Platform Pack* (OrangeRobot + EnemyRobot 32×32) y *16 Bit School Asset Pack*

---

## Instalación y uso

### Requisitos

- Node.js 18 o superior
- npm

### Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) en el navegador.

### Build para producción

```bash
npm run build
```

Los archivos estáticos quedan en `dist/`. Compatibles con cualquier hosting estático (Vercel, Netlify, GitHub Pages).

### Preview del build

```bash
npm run preview
```

---

## Estructura del proyecto

```
src/
├── main.js               # Configuración de Phaser y lista de escenas
├── style.css             # Estilos mínimos (fondo oscuro, canvas pixel-perfect)
├── data/
│   └── sessions.js       # Contenido: 3 sesiones × 3 preguntas
├── scenes/
│   ├── MenuScene.js      # Pantalla de inicio, selector de sesión, precarga de assets
│   └── GameScene.js      # Toda la lógica de juego
└── assets/
    ├── Robot Platform Pack/   # Spritesheets OrangeRobot y EnemyRobot
    ├── 16 Bit School Asset Pack/  # Tiles de suelo, pizarrón, libreros
    └── diferentes/            # Caja de respuesta (wooden crate)
```

---

## Agregar o editar preguntas

Las preguntas están en [src/data/sessions.js](src/data/sessions.js). Cada pregunta sigue esta estructura:

```js
{
  text: '¿Texto de la pregunta?',
  options: {
    A: 'Opción A',
    B: 'Opción B',
    C: 'Opción C',
  },
  correct: 'B',   // letra de la respuesta correcta
}
```

Para agregar una nueva sesión, añade una clave nueva al objeto `SESSIONS` y registra su key en el array `SESSION_KEYS` de `MenuScene.js`.

---

## Deploy en Vercel

1. Conecta el repositorio en [vercel.com](https://vercel.com)
2. Framework preset: **Vite**
3. Build command: `npm run build`
4. Output directory: `dist`

Vercel detecta Vite automáticamente — no requiere configuración adicional.

---

## Público objetivo

Alumnos de secundaria (~13 años) en sesiones de clase sobre alfabetización en IA. Diseñado para usarse en los últimos 10–15 minutos de clase como repaso interactivo.