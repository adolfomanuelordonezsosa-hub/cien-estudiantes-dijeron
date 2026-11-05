// Preguntas iniciales. Se pueden cambiar desde el panel de administración (pestaña "Preguntas").
// tipo "colonia": la respuesta es una colonia y se compara con el histórico real de reportes.
// tipo "libre": cualquier respuesta (prevención, mochila de emergencia, etc.).
module.exports = [
  { id: 'q1', tipo: 'colonia', texto: '¿Qué colonia de Tijuana crees que se va a inundar primero con las próximas lluvias?' },
  { id: 'q2', tipo: 'colonia', texto: '¿Qué zona de Tijuana evitarías cruzar cuando llueve fuerte?' },
  { id: 'q3', tipo: 'libre', texto: 'Si empieza a llover fuerte y tu calle se empieza a inundar, ¿qué es lo primero que harías?' },
  { id: 'q4', tipo: 'libre', texto: 'Menciona algo que no puede faltar en una mochila de emergencia para lluvias.' }
];
