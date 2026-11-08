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

1. **Bienvenida**: el jugador crea su **avatar** (mujer, hombre o uno de 8 animales: perro, gato, conejo, oso, panda, zorro, ajolote y mapache; con peinado, ropa, abajo, sombrero y accesorios), escribe **nombre y apellido reales** (en público se ve "Ana G."), dice si es estudiante (si sí, elige su carrera de la lista o la escribe; se unifica sola) y opcionalmente su delegación o colonia. Todo lleva filtro de groserías.
2. **Juego**: 4 preguntas, una a la vez. Escribe colonias de Tijuana (con autocompletado). Tiene 3 oportunidades (✕) por pregunta y puede pasar a la siguiente cuando quiera. El reloj corre desde que empieza.
3. **¡Gracias!**: su avatar, puntos, tiempo y lugar mientras suena la voz (mínimo 4 s); luego pasa solo a los resultados.
4. **Resultados y retroalimentación**: Top 10 con avatares, todas las respuestas correctas con su número de reportes y, por cada pregunta: por qué no estaban sus respuestas (con el número real de reportes de esa colonia), lo que dicen los datos y un consejo de prevención.

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

## Voz de Victor (celulares y TV)

Las frases se graban o suben en `/admin` → **🎙️ Voces** (se guardan en MongoDB; no hay que subir nada a GitHub). Cada frase puede tener varias versiones y el juego elige una al azar. Los nombres se muestran en pantalla; el lugar se dice con las grabaciones "Lugar 1" a "Lugar 10".

Frases: bienvenida, invitación a jugar, sale una pregunta, respuesta correcta, respuesta incorrecta, se acabaron las oportunidades, encontró todas, gracias, entró al Top 10, nuevo primer lugar, **te quitaron el lugar** ("Perdón, campeón, pero hay alguien más gallo que tú"), salió del Top 10, show del trono y "100 estudiantes dijeron". Si una frase no tiene grabación, se puede usar la voz de computadora (casilla en la misma pestaña).

## Pantalla de la TV

Escenario con podio: el 1er lugar se sienta en un trono con corona; cada 70 segundos (y cuando hay nuevo primer lugar) hace su show: camina, busca a alguien mejor, no encuentra a nadie, se pone la corona brillante y se sienta; mientras, todos los demás voltean a verlo. El 2º aplaude, el 3º saluda y brinca, y los del 4 al 10 saludan, miran y brincan. En el engrane ⚙ hay un botón para ver el show cuando quieras.

## Panel

Ranking y partidas · 📊 Dashboard (lo que creen vs. lo que es real por pregunta, partidas por día y hora, puntajes, carreras, dónde viven, contador de personas) · 🎙️ Voces · 👥 Creadores (aparecen al tocar el sello "OCUN · Cuando El Niño toca la puerta" en la página de jugadores) · Preguntas y respuestas · Exportar datos.

## Estilo visual (guía "Estilos · Cuenca Cimarrona")

- Colores: Verde UABC `#00723F`, Ocre UABC `#DD971A`, Verde profundo `#003D24`, Ocre texto `#8A5A00`, Verde claro `#E6F4EC`, Ocre claro `#FFF1D6`
- Letras: Lilita One (marca), Barlow Condensed (títulos), DM Sans (texto)
- Escudo UABC (`public/img/escudo-uabc.png`) tal como está, en el encabezado y el pie de cada página
- Cimarrón guía (`public/img/cimarron.webp`): uno por pantalla, a la izquierda de lo que presenta, entra deslizándose y flota 5 px, con globo de 2 a 4 palabras
- Silueta del Cimarrón como marca de agua en tarjetas (8 %) y encabezados verdes (blanco 10 %)
- Iconos de línea en `public/iconos.js`

## Variables en Railway

- `MONGODB_URI`: cadena de MongoDB Atlas (sin ella los datos se pierden en cada redeploy).
- `ADMIN_KEY`: clave del panel (por defecto `nino2026`).
