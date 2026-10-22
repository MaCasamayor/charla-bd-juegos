/* Datos del juego G1 «La tarjeta clonada».
   Copia de docs/caso-saeta.md (fuente única). Todo es inventado.
   Si cambia el doc, se cambia acá; el código (juegos.js) no depende de qué datos son. */
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

  var pPas = "Tiene N° de pasajero, nombre y barrio: es una fila de la tabla Pasajeros.";
  var pTar = "Dice el N° de tarjeta, el tipo y a qué pasajero pertenece: es una fila de la tabla Tarjetas.";
  var pVia = "Tiene hora, línea y la tarjeta con la que se pagó: es una fila de la tabla Viajes.";
  var pOut = "El sistema no necesita guardarlo para cobrar un viaje: queda afuera. Si importara, habría que preguntarle al cliente.";

  return {
    titulo: "La tarjeta clonada",
    storageKey: "charlabd-g1-v1",
    duraciones: { 1: 180, 2: 240 },   /* segundos por fase */

    cajas: [
      { id: "pasajeros", nombre: "Pasajeros", ayuda: "Personas" },
      { id: "tarjetas", nombre: "Tarjetas", ayuda: "Las tarjetas SAETA" },
      { id: "viajes", nombre: "Viajes", ayuda: "Cada vez que se paga" },
      { id: "afuera", nombre: "Afuera", ayuda: "No se guarda" }
    ],

    pasajeros: pasajeros,
    tarjetas: tarjetas,
    viajes: viajes,

    /* Fase 1: 15 datos con su caja correcta y el «por qué» */
    fase1: {
      consigna: "Tocá un dato y después la caja donde va. Si te equivocás, tocá el dato de la caja para sacarlo.",
      puntaje: [ { minimo: 15, puntos: 3 }, { minimo: 12, puntos: 2 }, { minimo: 9, puntos: 1 } ],
      datos: [
        { id: "d01", texto: "P01 · Juan Pérez · Tres Cerritos", caja: "pasajeros", porque: pPas },
        { id: "d02", texto: "P02 · Juan Pérez · Grand Bourg", caja: "pasajeros", porque: pPas },
        { id: "d03", texto: "P03 · Lucía Sosa · Centro", caja: "pasajeros", porque: pPas },
        { id: "d04", texto: "P08 · Sofía Ríos · Castañares", caja: "pasajeros", porque: pPas },
        { id: "d05", texto: "0001-6094 · común · P07", caja: "tarjetas", porque: pTar },
        { id: "d06", texto: "0001-7718 · estudiantil · P08", caja: "tarjetas", porque: pTar },
        { id: "d07", texto: "0001-8240 · común · P08", caja: "tarjetas", porque: pTar },
        { id: "d08", texto: "0001-3350 · jubilado · P05", caja: "tarjetas", porque: pTar },
        { id: "d09", texto: "V01 · 07:42 · 1B · 0001-1203", caja: "viajes", porque: pVia },
        { id: "d10", texto: "V11 · 08:40 · 7B · 0001-9032", caja: "viajes", porque: pVia },
        { id: "d11", texto: "V12 · 08:47 · 1B · 0001-5126", caja: "viajes", porque: pVia },
        { id: "d12", texto: "V16 · 13:05 · 5C · 0001-8240", caja: "viajes", porque: pVia },
        { id: "d13", texto: "El colectivo era azul", caja: "afuera", porque: pOut },
        { id: "d14", texto: "Llovía a la mañana", caja: "afuera", porque: pOut },
        { id: "d15", texto: "El chofer saludó", caja: "afuera", porque: pOut }
      ]
    },

    /* Fase 2: el misterio */
    fase2: {
      consigna: "SAETA detectó una tarjeta que pagó dos viajes en el mismo minuto, en líneas distintas. Alguien la clonó. ¿A quién hay que avisarle?",
      respuesta: "P02",                 /* N° de pasajero correcto */
      puntosAcierto: 3,
      costoPista: 1,
      /* Pasajero «trampa»: mismo nombre que la respuesta, otra clave */
      trampa: { id: "P01", mensaje: "Ese Juan tiene otra tarjeta. ¿Cuál es la clave?" },
      mensajeError: "No es esa persona. Probá de nuevo.",
      mensajeAcierto: "¡Correcto! Le avisamos al pasajero indicado.",
      /* Pistas en orden: hora → tarjeta → pasajero */
      pistas: [
        "Filtrá por Hora: a las 08:14 hay dos viajes en líneas distintas.",
        "Los dos viajes de las 08:14 se pagaron con la tarjeta 0001-4471. Tocala.",
        "La tarjeta 0001-4471 es del pasajero P02. Mirá su ficha en Pasajeros."
      ],
      /* Camino corto para la pantalla final */
      camino: [
        "Filtraste Viajes por la hora 08:14: dos viajes, líneas 3A y 7B, con la misma tarjeta.",
        "Seguiste la relación: esa tarjeta, 0001-4471, es del pasajero P02.",
        "La clave (N° de pasajero) distingue a los dos Juan Pérez: el que hay que llamar es el de Grand Bourg."
      ],
      cierre: "Sin clave, hubiéramos llamado al Juan equivocado."
    }
  };
})();
