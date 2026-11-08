// Preguntas del juego (cortas, se contestan tocando opciones). Salen de los Excel "Reportes de Riesgo", SOLO Tijuana.
// tablero = respuestas correctas (puntos = % de los reportes del tablero). distractores = opciones que NO están en el tablero.
// exp = lo que dicen los datos; tip = consejo de prevención. Se pueden cambiar en /admin → Preguntas y respuestas.
module.exports = {
  "meta": {
    "fuente": "Reportes de Riesgo (Ciudadanía y Servicios/Dependencias) — solo municipio de Tijuana",
    "reportes": 187
  },
  "preguntas": [
    {
      "id": "q1",
      "tipo": "colonia",
      "texto": "¿Qué colonia tiene más reportes por lluvias?",
      "dato": "Todos los reportes de incidentes por lluvia",
      "exp": "La Morita, Terrazas del Valle y Ribera del Bosque tienen más reportes. Casi todas están en el este de la ciudad, no en el centro",
      "tip": "Antes de que llueva, limpia las coladeras de tu calle y no tires basura",
      "totalReportes": 183,
      "tablero": [
        {
          "texto": "La Morita",
          "reportes": 9,
          "puntos": 28,
          "alias": []
        },
        {
          "texto": "Terrazas del Valle",
          "reportes": 7,
          "puntos": 21,
          "alias": [
            "terrazas valle"
          ]
        },
        {
          "texto": "Ribera del Bosque",
          "reportes": 7,
          "puntos": 21,
          "alias": [
            "riberas del bosque",
            "rivera del bosque"
          ]
        },
        {
          "texto": "Villa del Real Décima Sección",
          "reportes": 5,
          "puntos": 15,
          "alias": [
            "villa del real"
          ]
        },
        {
          "texto": "Palma Real",
          "reportes": 5,
          "puntos": 15,
          "alias": []
        }
      ],
      "distractores": [
        "Zona Río",
        "El Florido",
        "Sánchez Taboada",
        "Zona Centro",
        "Camino Verde"
      ]
    },
    {
      "id": "q2",
      "tipo": "colonia",
      "texto": "¿Qué zona es más peligrosa de cruzar cuando llueve?",
      "dato": "Calles inundadas, arroyos desbordados y autos o personas arrastradas",
      "exp": "En Ribera del Bosque, La Morita y Villa del Real se reportaron más calles inundadas y arrastres",
      "tip": "Nunca cruces agua con corriente: unos 15 cm pueden tumbar a una persona y unos 30 cm pueden mover un carro",
      "totalReportes": 88,
      "tablero": [
        {
          "texto": "Ribera del Bosque",
          "reportes": 7,
          "puntos": 27,
          "alias": [
            "riberas del bosque",
            "rivera del bosque"
          ]
        },
        {
          "texto": "La Morita",
          "reportes": 6,
          "puntos": 23,
          "alias": []
        },
        {
          "texto": "Villa del Real Décima Sección",
          "reportes": 4,
          "puntos": 15,
          "alias": [
            "villa del real"
          ]
        },
        {
          "texto": "Baja California",
          "reportes": 3,
          "puntos": 12,
          "alias": []
        },
        {
          "texto": "Las Torres",
          "reportes": 3,
          "puntos": 12,
          "alias": []
        },
        {
          "texto": "Fidel Velázquez",
          "reportes": 3,
          "puntos": 11,
          "alias": []
        }
      ],
      "distractores": [
        "Zona Río",
        "El Florido",
        "Sánchez Taboada",
        "Zona Centro"
      ]
    },
    {
      "id": "q3",
      "tipo": "colonia",
      "texto": "¿Dónde se han inundado más casas?",
      "dato": "Reportes de casas inundadas",
      "exp": "Palma Real, Campestre Murua y Terrazas del Valle tienen más casas inundadas reportadas",
      "tip": "Si vives en zona baja, sube aparatos y documentos y ten lista una mochila de emergencia",
      "totalReportes": 30,
      "tablero": [
        {
          "texto": "Palma Real",
          "reportes": 4,
          "puntos": 25,
          "alias": []
        },
        {
          "texto": "Campestre Murua",
          "reportes": 3,
          "puntos": 19,
          "alias": [
            "murua",
            "murua campestre"
          ]
        },
        {
          "texto": "Terrazas del Valle",
          "reportes": 3,
          "puntos": 19,
          "alias": [
            "terrazas valle"
          ]
        },
        {
          "texto": "Mirador",
          "reportes": 2,
          "puntos": 13,
          "alias": [
            "el mirador"
          ]
        },
        {
          "texto": "Poblado Ejido Matamoros",
          "reportes": 2,
          "puntos": 12,
          "alias": [
            "ejido matamoros"
          ]
        },
        {
          "texto": "La Morita",
          "reportes": 2,
          "puntos": 12,
          "alias": []
        }
      ],
      "distractores": [
        "Zona Río",
        "El Florido",
        "Sánchez Taboada",
        "Zona Centro"
      ]
    },
    {
      "id": "q4",
      "tipo": "colonia",
      "texto": "¿Dónde hay más derrumbes?",
      "dato": "Derrumbes, deslizamientos y tierra desgastada",
      "exp": "Terrazas del Valle, La Joya, Altiplano y Cañadas del Florido tienen más derrumbes reportados",
      "tip": "Si ves grietas nuevas en paredes o en el terreno, sal de la casa y repórtalo al 911",
      "totalReportes": 18,
      "tablero": [
        {
          "texto": "Terrazas del Valle",
          "reportes": 3,
          "puntos": 34,
          "alias": [
            "terrazas valle"
          ]
        },
        {
          "texto": "La Joya",
          "reportes": 2,
          "puntos": 22,
          "alias": []
        },
        {
          "texto": "Altiplano",
          "reportes": 2,
          "puntos": 22,
          "alias": []
        },
        {
          "texto": "Cañadas del Florido",
          "reportes": 2,
          "puntos": 22,
          "alias": [
            "canadas florido"
          ]
        }
      ],
      "distractores": [
        "Zona Río",
        "El Florido",
        "Sánchez Taboada",
        "Zona Centro",
        "Camino Verde",
        "Libertad"
      ]
    },
    {
      "id": "q5",
      "tipo": "opcion",
      "texto": "¿Qué problema se reporta más cuando llueve?",
      "dato": "Tipos de incidente en los reportes de Tijuana",
      "exp": "Lo que más se reporta son calles inundadas, seguido de casas y negocios con agua",
      "tip": "Si la calle se inunda, no salgas ni manejes: espera a que baje el agua",
      "totalReportes": 190,
      "tablero": [
        {
          "texto": "Calles inundadas",
          "reportes": 70,
          "puntos": 41,
          "alias": []
        },
        {
          "texto": "Casas y negocios inundados",
          "reportes": 34,
          "puntos": 20,
          "alias": []
        },
        {
          "texto": "Personas atrapadas o arrastradas",
          "reportes": 28,
          "puntos": 16,
          "alias": []
        },
        {
          "texto": "Derrumbes y tierra desgastada",
          "reportes": 21,
          "puntos": 12,
          "alias": []
        },
        {
          "texto": "Choques y carros atrapados",
          "reportes": 18,
          "puntos": 11,
          "alias": []
        }
      ],
      "distractores": [
        "Postes y árboles caídos",
        "Arroyos desbordados",
        "Agua contaminada",
        "Apagones",
        "Granizo"
      ]
    },
    {
      "id": "q6",
      "tipo": "colonia",
      "texto": "¿Dónde ha habido más personas en peligro por el agua?",
      "dato": "Personas atrapadas, arrastradas o ahogadas",
      "exp": "En Granjas Sección Tecolote, Delicias y Altiplano se reportaron más personas en peligro por el agua",
      "tip": "Si alguien es arrastrado por el agua, no te metas: llama al 911 y avisa dónde está",
      "totalReportes": 27,
      "tablero": [
        {
          "texto": "Granjas Sección Tecolote",
          "reportes": 3,
          "puntos": 43,
          "alias": [
            "tecolote",
            "granjas tecolote"
          ]
        },
        {
          "texto": "Delicias",
          "reportes": 2,
          "puntos": 29,
          "alias": []
        },
        {
          "texto": "Altiplano",
          "reportes": 2,
          "puntos": 28,
          "alias": []
        }
      ],
      "distractores": [
        "Zona Río",
        "El Florido",
        "Sánchez Taboada",
        "Zona Centro",
        "Camino Verde",
        "Libertad",
        "Playas de Tijuana"
      ]
    }
  ]
};
