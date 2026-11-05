# 100 estudiantes dijeron · Cuando El Niño toca la puerta

Juego multijugador en tiempo real (OCUN · UABC Tijuana) inspirado en los concursos de encuesta de la tele, sobre el riesgo por lluvias en las colonias de Tijuana y BC.

## Páginas

| Ruta | Para quién | Qué hace |
|---|---|---|
| `/` | Estudiantes (celular, por QR) | Se registran, contestan la encuesta y juegan a adivinar el tablero |
| `/tv` | Pantalla o laptop del stand | Tablero con voz del conductor, sonidos, ranking en vivo, comparación con el histórico |
| `/admin` | Conductor del equipo | Cambia fases, revela respuestas, pone ✕, carga el histórico, ve el análisis y descarga los datos |

## Cómo se juega

1. **Bienvenida**: la TV muestra el QR. Cada estudiante se registra (apodo, carrera, colonia donde vive).
2. **Encuesta**: todos contestan las preguntas desde su celular (“Preguntamos a 100 estudiantes…”). La TV muestra el avance hacia la meta.
3. **Juego**: en el panel, “Generar desde la encuesta” arma el tablero con las respuestas más votadas (puntos = % de estudiantes que la dijeron). Todos adivinan al mismo tiempo desde su celular, con 3 oportunidades por pregunta. El conductor revela cada respuesta en la TV con la voz y el sonido.
4. **Comparar con histórico**: la TV compara lo que dijeron los estudiantes con las colonias con más reportes reales (¿acertaron o fue pura percepción?).
5. **Ganadores**: podio y, si hay equipos, marcador por equipo.

Las respuestas parecidas se juntan solas (“col. camino berde” = “Camino Verde”).

## Cargar el histórico real

En el diagnóstico (https://diagnosticorosarito.netlify.app/) elige el municipio → colorea por **Reportes históricos** → **Resumen por colonia** → **Descargar tabla (CSV)**. En `/admin` → pestaña **Histórico real**, sube el archivo y revisa qué columnas son colonia y reportes. Todas las colonias del archivo se agregan también al autocompletado.

## Voz del conductor

La TV usa la voz en español del navegador (en Chrome o Edge hay voces de México). Elige la voz y la velocidad en el engrane ⚙ de la esquina.

Para una voz más de concurso, graben a alguien del equipo diciendo estas frases y guarden los archivos en `public/audio/` con estos nombres (`.mp3`, `.wav`, `.ogg` o `.m4a`):

| Archivo | Frase sugerida |
|---|---|
| `bienvenida` | “¡Bienvenidos a 100 estudiantes dijeron! Escanea el código y únete.” |
| `encuesta` | “Preguntamos a 100 estudiantes… ¡contesta desde tu celular!” |
| `pregunta` | “Preguntamos a 100 estudiantes…” (luego la voz del navegador lee la pregunta) |
| `dijeron` | “¡100 estudiantes dijeron!” (suena antes de cada respuesta revelada) |
| `tache` | “¡No está en el tablero!” |
| `comparar` | “¿Acertaron o fue pura percepción? Veamos el histórico real.” |
| `ranking` | “¡Y los que más saben de su colonia son…!” |

Si un archivo no existe, se usa la voz del navegador para esa frase.

## Datos que se guardan (para el análisis)

- **Jugadores**: apodo, carrera, colonia donde vive, equipo, puntos.
- **Respuestas de la encuesta**: cada respuesta y su versión agrupada.
- **Intentos del juego**: cada intento, si fue acierto o ✕, y los puntos.

En `/admin` → **Análisis**: top de respuestas por pregunta, lo que intentaron y no estaba, percepción vs. histórico, top 5 por carrera, dónde viven los participantes y qué porcentaje vive en una colonia con reportes. En **Exportar datos** se descargan los CSV para Excel.

## Subir a Railway

1. Sube esta carpeta a un repositorio nuevo de GitHub.
2. En Railway: **New Project → Deploy from GitHub repo**.
3. En **Variables** agrega:
   - `ADMIN_KEY` = la clave del panel (si no la pones, es `nino2026`).
   - `MONGODB_URI` = tu cadena de conexión de MongoDB Atlas (la misma clase de cadena que ya usan en otros proyectos). Sin esta variable los datos se guardan en archivos y **se pierden en cada redeploy**.
   - Opcional: `MONGODB_DB` (por defecto `cien_estudiantes`).
4. En **Settings → Networking → Generate Domain**. Ese dominio es el que aparece en el QR.

## Probar en tu computadora

```bash
npm install
npm start
```

Abre http://localhost:3000/admin (clave `nino2026`), http://localhost:3000/tv y http://localhost:3000/ en otra pestaña o en tu celular (misma red, con la IP de tu compu).

El servidor no usa más librerías que el driver de MongoDB; el tiempo real va por Server-Sent Events, que aguanta cientos de celulares conectados al mismo tiempo.
