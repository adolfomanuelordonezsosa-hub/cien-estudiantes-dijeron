# 100 estudiantes dijeron · Cuando El Niño toca la puerta

Juego en el celular (OCUN · UABC Tijuana): ¿qué colonias de Tijuana han sufrido más con las lluvias?
Las respuestas correctas salen de los **reportes históricos de Tijuana** (Excel "Reportes de Riesgo": Ciudadanía + Servicios/Dependencias, 187 reportes, solo municipio de Tijuana).

## Páginas

| Ruta | Para quién | Qué hace |
|---|---|---|
| `/` | Jugadores (celular, por QR) | Bienvenida → Juego → Resultados con Top 10 |
| `/tv` | Pantalla del stand | QR para jugar + Top 10 en vivo con voz cuando alguien entra al top |
| `/admin` | Equipo OCUN | Ranking, ocultar nombres, análisis, editar respuestas, descargar datos |

## Cómo se juega

1. **Bienvenida**: el jugador pone su nombre o apodo (con filtro de groserías), y opcionalmente su carrera y colonia.
2. **Juego**: 4 preguntas, una a la vez. Escribe colonias de Tijuana (con autocompletado). Tiene 3 oportunidades (✕) por pregunta y puede pasar a la siguiente cuando quiera. El reloj corre desde que empieza.
3. **Resultados**: puntos, tiempo, lugar, Top 10 y todas las respuestas correctas con su número de reportes.

Puntos: cada pregunta reparte 100 puntos entre las colonias del tablero según cuántos reportes tiene cada una. Ranking: más puntos gana; si hay empate, gana el más rápido.

## Preguntas y respuestas (del histórico de Tijuana)

| Pregunta | Qué cuenta |
|---|---|
| ¿Qué colonia de Tijuana crees que se va a inundar primero con las próximas lluvias? | Todos los reportes por colonia |
| ¿Qué zona de Tijuana evitarías cruzar cuando llueve fuerte? | Calles inundadas, encharcamientos, pasos a desnivel, arroyos desbordados, personas o autos arrastrados |
| ¿En qué colonia de Tijuana se han inundado más casas por las lluvias? | Viviendas inundadas |
| ¿En qué colonia de Tijuana ha habido más derrumbes o deslizamientos de tierra? | Derrumbes, deslizamientos, erosión |

Están en `data/preguntas.js` y se pueden ajustar desde `/admin` → Preguntas y respuestas.

## Datos que se guardan

- **Partidas**: nombre, carrera, colonia donde vive, puntos por pregunta, tiempo total, lugar.
- **Jugadas**: cada colonia que escribió cada jugador, si estaba o no en el histórico y en qué segundo.

En `/admin` → Análisis: qué % encontró cada colonia (realidad) contra lo que más escribieron (percepción), y las colonias que la gente cree que se inundan pero no tienen tantos reportes. En Exportar datos se bajan los CSV.

## Voz

La TV usa la voz en español del navegador (elige en el engrane ⚙). Para usar grabaciones propias, pon archivos en `public/audio/` con estos nombres: `bienvenida`, `invitacion`, `top`, `primero`, `dijeron` (.mp3, .wav, .ogg o .m4a).

## Variables en Railway

- `MONGODB_URI`: cadena de MongoDB Atlas (sin ella los datos se pierden en cada redeploy).
- `ADMIN_KEY`: clave del panel (por defecto `nino2026`).
