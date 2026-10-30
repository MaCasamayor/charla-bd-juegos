/* Datos del juego G1 «La tarjeta clonada».
   Copia de docs/caso-saeta.md (fuente única). Todo es inventado.
   Si cambia el doc, se cambia acá; el código (juegos.js) no depende de qué datos son.
   Acá NO van las respuestas correctas ni los «por qué»: viven como hashes y cifrado
   en secretos.js (ver herramientas/generar.js). */
window.DATOS = (function () {
  var pasajeros = [
    { id: "P01", nombre: "Juan Pérez", barrio: "Tres Cerritos" },
    { id: "P02", nombre: "Juan Pérez", barrio: "Grand Bourg" },
    { id: "P03", nombre: "Lucía Sosa", barrio: "Centro" },
    { id: "P04", nombre: "Carlos Ruiz", barrio: "Villa San Lorenzo" },
    { id: "P05", nombre: "Ana Gómez", barrio: "Limache" },
    { id: "P06", nombre: "Marta Díaz", barrio: "El Tribuno" },
    { id: "P07", nombre: "Pedro Luna", barrio: "Centro" },
    { id: "P08", nombre: "Sofía Ríos", barrio: "Castañares" }
  ];
  var tarjetas = [
    { id: "0001-1203", pasajero: "P03", tipo: "común" },
    { id: "0001-2587", pasajero: "P04", tipo: "común" },
    { id: "0001-3350", pasajero: "P05", tipo: "jubilado" },
    { id: "0001-4471", pasajero: "P02", tipo: "común" },
    { id: "0001-5126", pasajero: "P06", tipo: "común" },
    { id: "0001-6094", pasajero: "P07", tipo: "común" },
    { id: "0001-7718", pasajero: "P08", tipo: "estudiantil" },
    { id: "0001-8240", pasajero: "P08", tipo: "común" },
    { id: "0001-9032", pasajero: "P01", tipo: "común" }
  ];
  var viajes = [
    ["V01", "07:42", "1B", "0001-1203"], ["V02", "07:48", "3A", "0001-9032"],
    ["V03", "07:55", "5C", "0001-7718"], ["V04", "08:02", "2A", "0001-3350"],
    ["V05", "08:05", "3A", "0001-4471"], ["V06", "08:09", "1B", "0001-6094"],
    ["V07", "08:14", "3A", "0001-4471"], ["V08", "08:14", "7B", "0001-4471"],
    ["V09", "08:20", "5C", "0001-2587"], ["V10", "08:31", "2A", "0001-1203"],
    ["V11", "08:40", "7B", "0001-9032"], ["V12", "08:47", "1B", "0001-5126"],
    ["V13", "09:05", "5C", "0001-7718"], ["V14", "12:10", "2A", "0001-1203"],
    ["V15", "12:30", "3A", "0001-9032"], ["V16", "13:05", "5C", "0001-8240"],
    ["V17", "13:20", "1B", "0001-2587"], ["V18", "17:45", "2A", "0001-1203"],
    ["V19", "18:02", "7B", "0001-9032"], ["V20", "18:30", "1B", "0001-6094"]
  ].map(function (v) { return { id: v[0], hora: v[1], linea: v[2], tarjeta: v[3] }; });

  /* Los 15 datos de la fase 1, en un orden fijo mezclado a propósito: que el orden
     del archivo no delate la caja. La caja correcta está solo en secretos.js. */
  var datosF1 = [
    ["a01", "V11 · 08:40 · 7B · 0001-9032"], ["a02", "El chofer saludó"],
    ["a03", "0001-7718 · estudiantil · P08"], ["a04", "P03 · Lucía Sosa · Centro"],
    ["a05", "V01 · 07:42 · 1B · 0001-1203"], ["a06", "0001-3350 · jubilado · P05"],
    ["a07", "P01 · Juan Pérez · Tres Cerritos"], ["a08", "Llovía a la mañana"],
    ["a09", "V16 · 13:05 · 5C · 0001-8240"], ["a10", "P08 · Sofía Ríos · Castañares"],
    ["a11", "0001-6094 · común · P07"], ["a12", "V12 · 08:47 · 1B · 0001-5126"],
    ["a13", "El colectivo era azul"], ["a14", "0001-8240 · común · P08"],
    ["a15", "P02 · Juan Pérez · Grand Bourg"]
  ].map(function (d) { return { id: d[0], texto: d[1] }; });

  var tarifas = [
    { tipo: "común", precio: "$1.000" }, { tipo: "estudiantil", precio: "$500" }, { tipo: "jubilado", precio: "$0" }
  ];

  return {
    titulo: "La tarjeta clonada",
    storageKey: "charlabd-g1-v4",
    /* Al empezar, el nombre del equipo se publica acá y lo muestra el marcador de las láminas.
       Solo viaja el nombre. Si falla (sin señal), el juego sigue igual. */
    avisoEquipos: "https://ntfy.sh/charla-saeta-equipos-b595994d61",
    fases: 4,
    duraciones: { 1: 300, 2: 300, 3: 300, 4: 300 },   /* segundos por fase */

    cajas: [
      { id: "pasajeros", nombre: "Pasajeros", ayuda: "Personas" },
      { id: "tarjetas", nombre: "Tarjetas", ayuda: "Las tarjetas SAETA" },
      { id: "viajes", nombre: "Viajes", ayuda: "Cada vez que se paga" },
      { id: "afuera", nombre: "Afuera", ayuda: "No se guarda" }
    ],

    pasajeros: pasajeros,
    tarjetas: tarjetas,
    viajes: viajes,
    tarifas: tarifas,

    /* Fase 1: ordenar 15 datos */
    fase1: {
      consigna: "Arrastren cada tarjeta de la bandeja a su caja. Para sacar una de una caja, tóquenla una vez.",
      intro: {
        que: "Tienen 15 datos sueltos de SAETA. Cada uno va en la caja de la tabla donde se guardaría: Pasajeros, Tarjetas o Viajes. Lo que el sistema no necesita guardar va a Afuera.",
        como: [
          "Arrastren cada tarjeta de la bandeja de abajo hasta su caja. También pueden tocar la tarjeta y después la caja.",
          "Para sacar una tarjeta de una caja, tóquenla una vez: vuelve a la bandeja.",
          "Cuando estén seguros, toquen Verificar."
        ],
        puntos: "Hay una sola verificación. Las cajas que no quedaron bien se marcan en rojo, y cada tarjeta que está en una caja equivocada lleva un recuadro rojo. 15 bien = 3 puntos · 12 a 14 = 2 · 9 a 11 = 1."
      },
      puntaje: [ { minimo: 15, puntos: 3 }, { minimo: 12, puntos: 2 }, { minimo: 9, puntos: 1 } ],
      datos: datosF1
    },

    /* Fase 2: conectá el modelo */
    fase2: {
      consigna: "Para cada par, elijan cómo se relacionan: 1 a 1, 1 a muchos o muchos a muchos.",
      intro: {
        que: "Hay 4 pares de partes del sistema. Para cada par, elijan cómo se relacionan: 1 a 1, 1 a muchos o muchos a muchos.",
        como: [
          "Lean la pregunta de ayuda de cada par: piensen cuántos hay de cada lado.",
          "Toquen la opción que eligen. Pueden cambiarla hasta verificar.",
          "Cuando tengan los 4, toquen Verificar."
        ],
        puntos: "Hay una sola verificación. 4 bien = 3 puntos · 3 = 2 · 2 = 1."
      },
      opciones: [ { id: "1a1", nombre: "1 a 1" }, { id: "1aM", nombre: "1 a muchos" }, { id: "MaM", nombre: "muchos a muchos" } ],
      puntaje: [ { minimo: 4, puntos: 3 }, { minimo: 3, puntos: 2 }, { minimo: 2, puntos: 1 } ],
      pares: [
        { id: "pas-tar", a: "Pasajero", b: "Tarjeta", ayuda: "¿Un pasajero puede tener más de una tarjeta? ¿Una tarjeta puede ser de dos pasajeros?" },
        { id: "tar-via", a: "Tarjeta", b: "Viaje", ayuda: "¿Una tarjeta hace muchos viajes? ¿Un viaje se paga con dos tarjetas?" },
        { id: "lin-par", a: "Línea", b: "Parada", ayuda: "¿Una línea pasa por muchas paradas? ¿En una parada paran muchas líneas?" },
        { id: "col-val", a: "Colectivo", b: "Validadora", ayuda: "¿Un colectivo tiene una validadora? ¿Una validadora está en un colectivo?" }
      ],
      notas: "Parada: donde sube la gente. Colectivo: la unidad. Validadora: la máquina del colectivo donde se apoya la tarjeta."
    },

    /* Fase 3: el precio que cambia. La planilla es el dato; cuáles están mal, solo en secretos.js */
    fase3: {
      consigna: "Común: $1.200 · estudiantil: $500 · jubilado: $0. Toquen las filas que quedaron mal.",
      intro: {
        que: "Desde hoy el boleto común cuesta $1.200; el estudiantil sigue en $500 y el de jubilados en $0. Alguien actualizó una planilla vieja, que tiene el precio copiado en cada viaje, y se equivocó.",
        como: [
          "Revisen cada fila: el tipo de boleto y el precio que quedó.",
          "Toquen las filas que quedaron mal. Si tocan una de nuevo, se desmarca.",
          "Cuando estén seguros, toquen Verificar."
        ],
        puntos: "Hay una sola verificación. Cuantas más filas mal encuentren, más puntos (hasta 3). Cada fila bien que marquen como mal resta 1."
      },
      filas: [
        { id: "V04", tarjeta: "0001-3350", tipo: "jubilado", precio: "$1.200" },
        { id: "V09", tarjeta: "0001-2587", tipo: "común", precio: "$1.200" },
        { id: "V10", tarjeta: "0001-1203", tipo: "común", precio: "$1.000" },
        { id: "V11", tarjeta: "0001-9032", tipo: "común", precio: "$1.200" },
        { id: "V12", tarjeta: "0001-5126", tipo: "común", precio: "$1.200" },
        { id: "V13", tarjeta: "0001-7718", tipo: "estudiantil", precio: "$1.200" },
        { id: "V14", tarjeta: "0001-1203", tipo: "común", precio: "$1.200" },
        { id: "V15", tarjeta: "0001-9032", tipo: "común", precio: "$1.200" },
        { id: "V16", tarjeta: "0001-8240", tipo: "común", precio: "$1.000" },
        { id: "V17", tarjeta: "0001-2587", tipo: "común", precio: "$1.200" }
      ]
    },

    /* Fase 4: el misterio */
    fase4: {
      consigna: "SAETA detectó una tarjeta que pagó dos viajes en el mismo minuto, en líneas distintas. Alguien la clonó. ¿A quién hay que avisarle?",
      intro: {
        que: "SAETA detectó una tarjeta que pagó dos viajes en el mismo minuto, en líneas distintas: alguien la clonó. Tienen que encontrar a qué pasajero hay que avisarle.",
        como: [
          "Busquen en las pestañas Viajes, Tarjetas y Pasajeros. En Viajes pueden filtrar por línea, hora o tarjeta.",
          "Si tocan un número de tarjeta o de pasajero, salta a su ficha.",
          "Cuando lo sepan, toquen «Ya sé quién es» y elijan a la persona."
        ],
        puntos: "Acertar = 3 puntos, y +1 al primer equipo que acierta (sale en la pantalla). Cada pista y cada respuesta mal restan 1."
      },
      puntosAcierto: 3,
      costoPista: 1,
      /* Mensaje de la respuesta «trampa»; cuál es, solo el hash en secretos.js */
      mensajeTrampa: "Ese Juan tiene otra tarjeta. ¿Cuál es la clave?",
      mensajeError: "No es esa persona. Probá de nuevo.",
      mensajeAcierto: "¡Correcto! Le avisamos al pasajero indicado.",
      /* Pistas en orden: dicen cómo buscar, no qué se encuentra (eso va cifrado al final) */
      pistas: [
        "Filtrá Viajes por Hora y buscá una hora que aparezca dos veces, con líneas distintas.",
        "Los dos viajes de esa hora se pagaron con la misma tarjeta. Tocá el número de tarjeta.",
        "Tocá el N° de pasajero de esa tarjeta y mirá su ficha en Pasajeros."
      ]
    }
  };
})();
