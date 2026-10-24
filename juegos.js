/* Juego G1 «La tarjeta clonada», 4 fases. Los datos viven en datos.js (window.DATOS);
   las respuestas correctas solo existen como hashes con sal (secretos.js, window.SECRETOS)
   y los «por qué» van cifrados: se abren al final con el código que muestra el proyector.
   La lógica pura (puntajes, hashes, descifrado) está en logica.js. Todo texto dinámico
   entra con textContent. No hay modos de prueba ni atajos en esta versión. */
(function () {
  "use strict";
  var D = window.DATOS;
  var SEC = window.SECRETOS;
  var L = window.LOGICA;
  var app = document.getElementById("app");
  var barra = document.getElementById("barra");
  var bEquipo = document.getElementById("b-equipo");
  var bReloj = document.getElementById("b-reloj");
  var bPuntos = document.getElementById("b-puntos");
  var anuncio = document.getElementById("anuncio");
  var S;            // estado (se guarda en localStorage)
  var ui;           // estado de pantalla (no se guarda)

  var reducido = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TITULOS = { 1: "Ordenar", 2: "Conectá el modelo", 3: "El precio que cambia", 4: "El misterio" };

  /* ---------- utilidades ---------- */
  function h(tag, attrs) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === "class") e.className = v;
      else if (k === "text") e.textContent = v;
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c === null || c === undefined || c === false) continue;
      e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return e;
  }
  function anunciar(t) { anuncio.textContent = ""; setTimeout(function () { anuncio.textContent = t; }, 30); }
  function mezclar(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function porId(lista, id) { for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i]; return null; }
  function unicos(a) { var r = []; a.forEach(function (x) { if (r.indexOf(x) < 0) r.push(x); }); return r; }
  function pts(n) { return n + (n === 1 ? " punto" : " puntos"); }
  function uiNuevo() { return { filtroAbierto: null, respondiendo: false, mensaje: null, confirmando: false, aviso: "", ocupado: false, error: "", vencidoAnunciado: {}, revelado: null, codigoMal: false }; }

  /* ---------- estado ---------- */
  function nuevo() {
    return {
      equipo: "", fase: "inicio", reinicios: 0,
      inicios: {},   /* inicio de cada fase (ms): recargar no reinicia el reloj */
      f1: { orden: mezclar(D.fase1.datos.map(function (d) { return d.id; })), puestos: {}, sel: null, cerrada: null, res: {}, puntos: 0 },
      f2: { resp: {}, cerrada: null, res: {}, puntos: 0 },
      f3: { marcas: {}, cerrada: null, res: {}, puntos: 0 },
      f4: { tab: "viajes", filtros: { linea: null, hora: null, tarjeta: null }, pistas: 0, errores: 0, destino: null, cerrada: null, puntos: 0 }
    };
  }
  function guardar() {
    try { localStorage.setItem(D.storageKey, JSON.stringify(S)); } catch (e) { /* sin storage: sigue andando */ }
  }
  function cargar() {
    try {
      var raw = localStorage.getItem(D.storageKey);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || !o.inicios || !o.f1 || !o.f2 || !o.f3 || !o.f4 || !Array.isArray(o.f1.orden) || o.f1.orden.length !== D.fase1.datos.length) return null;
      return o;
    } catch (e) { return null; }
  }
  function borrarGuardado() { try { localStorage.removeItem(D.storageKey); } catch (e) { /* nada */ } }

  /* ---------- puntaje ---------- */
  function puntosDe(n) { var f = S["f" + n]; return f.cerrada && f.cerrada !== "tiempo" ? f.puntos : 0; }
  function total() { return puntosDe(1) + puntosDe(2) + puntosDe(3) + puntosDe(4); }

  /* Juzga una lista de respuestas contra los hashes: devuelve {clave: true/false}.
     items: [{ k, pregunta, resp }]; resp vacía = sin responder = mal. */
  function evaluar(items) {
    return Promise.all(items.map(function (it) {
      return it.resp ? L.coincide(SEC, it.pregunta, it.resp) : Promise.resolve(false);
    })).then(function (rs) {
      var res = {};
      items.forEach(function (it, i) { res[it.k] = rs[i]; });
      return res;
    });
  }
  function cuantos(res) { var n = 0; Object.keys(res).forEach(function (k) { if (res[k]) n++; }); return n; }

  /* ---------- reloj ---------- */
  function restante(f) {
    var ini = S.inicios[f];
    if (!ini) return null;
    return D.duraciones[f] - Math.floor((Date.now() - ini) / 1000);
  }
  function vencida(f) { var r = restante(f); return r !== null && r <= 0; }
  /* Si vence el tiempo, la fase cierra con 0 y NO se muestra ninguna solución. */
  function cerrarPorTiempo() {
    var n = S.fase, f = S["f" + n];
    if (f.cerrada) return;
    f.cerrada = "tiempo"; f.puntos = 0; f.sel = null;
    ui.respondiendo = false; ui.mensaje = null;
    render(); anunciar("¡Se acabó el tiempo! Esta fase cierra con 0 puntos.");
  }
  function tick() {
    if (typeof S.fase !== "number") { bReloj.textContent = "--:--"; bReloj.classList.remove("vencido"); return; }
    var f = S["f" + S.fase];
    if (!f.cerrada && vencida(S.fase)) { cerrarPorTiempo(); return; }
    if (f.cerrada) { bReloj.textContent = f.cerrada === "tiempo" ? "¡Tiempo!" : "--:--"; bReloj.classList.toggle("vencido", f.cerrada === "tiempo"); return; }
    var r = restante(S.fase);
    bReloj.textContent = pad(Math.floor(r / 60)) + ":" + pad(r % 60);
    bReloj.classList.remove("vencido");
  }
  function barraActualizar() {
    barra.hidden = S.fase === "inicio";
    bEquipo.textContent = S.equipo;
    bPuntos.textContent = total() + " pts";
    tick();
  }

  /* ---------- render ---------- */
  function render() {
    var tray = app.querySelector(".bandeja");
    var sx = tray ? tray.scrollLeft : 0;
    var sy = window.scrollY;
    app.textContent = "";
    if (S.fase === "inicio") vistaInicio();
    else if (S.fase === 1) vistaF1();
    else if (S.fase === 2) vistaF2();
    else if (S.fase === 3) vistaF3();
    else if (S.fase === 4) vistaF4();
    else vistaFinal();
    if (ui.error) app.insertBefore(h("p", { class: "mensaje mensaje--mal", role: "alert", text: ui.error }), app.firstChild);
    barraActualizar();
    var t2 = app.querySelector(".bandeja");
    if (t2) t2.scrollLeft = sx;
    window.scrollTo(0, sy);
    guardar();
  }
  /* Solo se entra a una fase si la anterior está cerrada; el reloj de cada fase arranca una vez. */
  function cambiarFase(f) {
    if (typeof f === "number" && f > 1 && !S["f" + (f - 1)].cerrada) return;
    if (f === "final" && !S.f4.cerrada) return;
    S.fase = f;
    if (typeof f === "number" && !S.inicios[f]) S.inicios[f] = Date.now();
    ui.filtroAbierto = null; ui.respondiendo = false; ui.mensaje = null; ui.confirmando = false; ui.error = "";
    render(); window.scrollTo(0, 0);
    anunciar(typeof f === "number" ? "Fase " + f + ": " + TITULOS[f] + "." : "Resultado final.");
  }
  function falloCrypto(e) {
    ui.ocupado = false;
    ui.error = "No se pudo verificar en este navegador. Abrí la página con https o pedile ayuda al que conduce.";
    render();
  }

  function pieReiniciar() {
    var pie = h("div", { class: "pie" });
    if (!ui.confirmando) {
      pie.appendChild(h("button", { class: "btn btn--sec btn--chico", type: "button", onclick: function () { ui.confirmando = true; render(); }, text: "Reiniciar" }));
    } else {
      pie.appendChild(h("span", { text: "¿Borrar todo y empezar de cero?" }));
      pie.appendChild(h("button", { class: "btn btn--chico", type: "button", text: "Sí, reiniciar", onclick: function () {
        var r = (S.reinicios || 0) + 1; borrarGuardado(); S = nuevo(); S.reinicios = r; ui = uiNuevo(); render();
      } }));
      pie.appendChild(h("button", { class: "btn btn--sec btn--chico", type: "button", text: "No", onclick: function () { ui.confirmando = false; render(); } }));
    }
    return pie;
  }

  /* Lo que sigue a cerrar una fase: resultado + botón para avanzar. Sin soluciones. */
  function bloqueCierre(n, texto) {
    var f = S["f" + n], tiempo = f.cerrada === "tiempo";
    var res = h("div", { class: "resultado", id: "res-f" + n, tabindex: "-1", "aria-live": "polite" },
      h("div", { class: "grande", text: tiempo ? "Se acabó el tiempo · 0 puntos" : texto + " · " + pts(f.puntos) }));
    if (tiempo) res.appendChild(h("p", { text: "La fase cerró sin verificar. Las soluciones se ven en el proyector al final." }));
    else res.appendChild(h("p", { text: "El celular solo dice bien o mal. Las soluciones se ven en el proyector al final." }));
    var sig = n < D.fases ? n + 1 : "final";
    res.appendChild(h("div", { class: "acciones" }, h("button", { class: "btn", type: "button",
      text: n < D.fases ? "Seguir a la fase " + (n + 1) : "Ver el resultado", onclick: function () { cambiarFase(sig); } })));
    return res;
  }
  function enfocarCierre(n) { var r = document.getElementById("res-f" + n); if (r) { r.focus(); r.scrollIntoView({ block: "start" }); } }
  function insignia(ok) { return h("span", { class: "veredicto veredicto--" + (ok ? "ok" : "mal"), text: ok ? "✔ Bien" : "✘ Mal" }); }
  function encabezado(n) {
    app.appendChild(h("h2", { text: "Fase " + n + " de " + D.fases + " · " + TITULOS[n] }));
  }
  /* Cierra por verificación si todavía hay tiempo; si no, por tiempo. true si siguió normal. */
  function puedeVerificar(n) {
    if (S.fase !== n || S["f" + n].cerrada) return false;
    if (vencida(n)) { cerrarPorTiempo(); return false; }
    return true;
  }

  /* ----- Inicio ----- */
  function vistaInicio() {
    var input = h("input", { id: "nombre", type: "text", maxlength: "30", autocomplete: "off", placeholder: "Ej.: Fila 3" });
    input.value = S.equipo || "";
    var form = h("form", { class: "inicio", onsubmit: function (ev) {
      ev.preventDefault();
      var n = input.value.trim();
      if (!n) { input.focus(); anunciar("Escribí el nombre del equipo."); return; }
      S.equipo = n; cambiarFase(1);
    } },
      h("p", { class: "etiqueta", text: "SAETA · datos inventados" }),
      h("h1", { text: D.titulo }),
      h("p", { text: "Cuatro fases de 5 minutos: ordenar datos, conectar el modelo, corregir una planilla y resolver un misterio. Un celular por equipo." }),
      h("label", { for: "nombre", text: "Nombre del equipo" }),
      input,
      h("div", { class: "acciones" }, h("button", { class: "btn", type: "submit", text: "Empezar" }))
    );
    app.appendChild(form);
  }

  /* ----- Fase 1: ordenar ----- */
  function datoBtn(d) {
    var f1 = S.f1, cerrada = !!f1.cerrada, ver = f1.cerrada === "verificada";
    var ok = ver && f1.res[d.id];
    var cls = "dato" + (ver ? (ok ? " dato--ok dato--fijo" : " dato--mal dato--fijo") : cerrada ? " dato--fijo" : "");
    var b = h(cerrada ? "div" : "button", { class: cls, type: cerrada ? null : "button", "aria-pressed": cerrada ? null : String(f1.sel === d.id) });
    b.appendChild(h("span", { text: d.texto }));
    if (ver) b.appendChild(h("span", { class: "porque" }, insignia(ok)));
    else if (!cerrada) {
      b.addEventListener("click", function () {
        if (f1.puestos[d.id]) { delete f1.puestos[d.id]; f1.sel = null; anunciar("Volvió a la bandeja."); }
        else { f1.sel = f1.sel === d.id ? null : d.id; anunciar(f1.sel ? "Dato elegido. Tocá una caja." : "Dato soltado."); }
        render();
      });
    }
    return b;
  }
  function verificarF1() {
    if (ui.ocupado || !puedeVerificar(1)) return;
    ui.ocupado = true;
    evaluar(D.fase1.datos.map(function (d) { return { k: d.id, pregunta: "f1:" + d.id, resp: S.f1.puestos[d.id] }; })).then(function (res) {
      ui.ocupado = false;
      if (!puedeVerificar(1)) return;
      S.f1.res = res; S.f1.puntos = L.puntosPorEscala(cuantos(res), D.fase1.puntaje);
      S.f1.cerrada = "verificada"; S.f1.sel = null;
      render(); enfocarCierre(1);
    }, falloCrypto);
  }
  function vistaF1() {
    var datos = D.fase1.datos, f1 = S.f1, cerrada = !!f1.cerrada;
    encabezado(1);
    app.appendChild(h("p", { text: D.fase1.consigna }));

    var cajas = h("div", { class: "cajas" });
    D.cajas.forEach(function (c) {
      var lista = h("ul", { class: "caja__lista" });
      var n = 0;
      f1.orden.forEach(function (id) {
        if (f1.puestos[id] === c.id) { n++; lista.appendChild(h("li", null, datoBtn(porId(datos, id)))); }
      });
      var btn = h("button", { class: "caja__btn", type: "button", disabled: cerrada, "aria-label": "Caja " + c.nombre + ", " + n + " datos. Tocá para poner el dato elegido.", onclick: function () {
        if (!f1.sel) { anunciar("Primero tocá un dato de la bandeja."); ui.aviso = "Primero tocá un dato."; avisoF1(); return; }
        f1.puestos[f1.sel] = c.id; f1.sel = null; anunciar("Dato en " + c.nombre + "."); render();
      } }, h("b", { text: c.nombre + " (" + n + ")" }), h("span", { text: c.ayuda }));
      cajas.appendChild(h("section", { class: "caja caja--" + c.id }, btn, lista));
    });
    app.appendChild(cajas);

    var sin = f1.orden.filter(function (id) { return !f1.puestos[id]; });
    app.appendChild(h("p", { class: "etiqueta", id: "aviso-f1", text: cerrada ? "" : (ui.aviso || ("Sin ubicar: " + sin.length + " de " + datos.length)) }));
    ui.aviso = "";
    if (!cerrada) {
      var bandeja = h("div", { class: "bandeja", role: "group", "aria-label": "Bandeja de datos" });
      if (!sin.length) bandeja.appendChild(h("span", { class: "bandeja__vacia", text: "Bandeja vacía. Verificá." }));
      sin.forEach(function (id) { bandeja.appendChild(datoBtn(porId(datos, id))); });
      app.appendChild(bandeja);
      app.appendChild(h("div", { class: "acciones" }, h("button", { class: "btn", type: "button", disabled: ui.ocupado, text: "Verificar", onclick: verificarF1 })));
    } else {
      if (sin.length) {
        app.appendChild(h("p", { text: "Quedaron sin ubicar:" }));
        var ul = h("ul", { class: "sin-ubicar" });
        sin.forEach(function (id) { ul.appendChild(h("li", null, datoBtn(porId(datos, id)))); });
        app.appendChild(ul);
      }
      app.appendChild(bloqueCierre(1, f1.cerrada === "verificada" ? cuantos(f1.res) + " de " + datos.length + " bien" : ""));
    }
    app.appendChild(pieReiniciar());
  }
  function avisoF1() { var a = document.getElementById("aviso-f1"); if (a) a.textContent = "Primero tocá un dato."; }

  /* ----- Fase 2: conectá el modelo ----- */
  function verificarF2() {
    if (ui.ocupado || !puedeVerificar(2)) return;
    ui.ocupado = true;
    evaluar(D.fase2.pares.map(function (p) { return { k: p.id, pregunta: "f2:" + p.id, resp: S.f2.resp[p.id] }; })).then(function (res) {
      ui.ocupado = false;
      if (!puedeVerificar(2)) return;
      S.f2.res = res; S.f2.puntos = L.puntosPorEscala(cuantos(res), D.fase2.puntaje); S.f2.cerrada = "verificada";
      render(); enfocarCierre(2);
    }, falloCrypto);
  }
  function vistaF2() {
    var f2 = S.f2, cerrada = !!f2.cerrada, ver = f2.cerrada === "verificada";
    encabezado(2);
    app.appendChild(h("p", { class: "consigna", text: D.fase2.consigna }));
    var lista = h("div", { class: "pares" });
    D.fase2.pares.forEach(function (p) {
      var grupo = h("div", { class: "opciones-par", role: "group", "aria-label": p.a + " y " + p.b });
      D.fase2.opciones.forEach(function (o) {
        grupo.appendChild(h("button", { class: "opcion", type: "button", disabled: cerrada, "aria-pressed": String(f2.resp[p.id] === o.id), text: o.nombre,
          onclick: function () { f2.resp[p.id] = o.id; render(); anunciar(p.a + " y " + p.b + ": " + o.nombre + "."); } }));
      });
      lista.appendChild(h("section", { class: "ficha par" + (ver ? (f2.res[p.id] ? " par--ok" : " par--mal") : "") },
        h("h3", { text: p.a + " – " + p.b }), h("p", { class: "etiqueta", text: p.ayuda }), grupo, ver ? insignia(f2.res[p.id]) : null));
    });
    app.appendChild(lista);
    app.appendChild(h("p", { class: "etiqueta", text: D.fase2.notas }));
    if (!cerrada) {
      var n = Object.keys(f2.resp).length;
      app.appendChild(h("div", { class: "acciones" }, h("button", { class: "btn", type: "button", disabled: ui.ocupado, text: "Verificar (" + n + " de " + D.fase2.pares.length + " elegidas)", onclick: verificarF2 })));
    } else app.appendChild(bloqueCierre(2, ver ? cuantos(f2.res) + " de " + D.fase2.pares.length + " bien" : ""));
    app.appendChild(pieReiniciar());
  }

  /* ----- Fase 3: el precio que cambia ----- */
  function verificarF3() {
    if (ui.ocupado || !puedeVerificar(3)) return;
    ui.ocupado = true;
    evaluar(D.fase3.filas.map(function (r) { return { k: r.id, pregunta: "f3:" + r.id, resp: S.f3.marcas[r.id] ? "mal" : "bien" }; })).then(function (res) {
      ui.ocupado = false;
      if (!puedeVerificar(3)) return;
      /* res[id] = el equipo juzgó bien esa fila. Marcada y bien juzgada = encontrada; marcada y mal juzgada = falso. */
      var enc = 0, fal = 0;
      D.fase3.filas.forEach(function (r) { if (S.f3.marcas[r.id]) { if (res[r.id]) enc++; else fal++; } });
      S.f3.res = res; S.f3.puntos = L.puntosF3(enc, fal); S.f3.cerrada = "verificada";
      render(); enfocarCierre(3);
    }, falloCrypto);
  }
  function vistaF3() {
    var f3 = S.f3, cerrada = !!f3.cerrada, ver = f3.cerrada === "verificada";
    encabezado(3);
    app.appendChild(h("p", { class: "consigna", text: D.fase3.consigna }));
    var ul = h("ul", { class: "filas filas--planilla" });
    D.fase3.filas.forEach(function (r) {
      var marcada = !!f3.marcas[r.id];
      var cls = "fila-planilla" + (ver ? (f3.res[r.id] ? " fila-planilla--ok" : " fila-planilla--mal") : "");
      var b = h(cerrada ? "div" : "button", { class: cls, type: cerrada ? null : "button", "aria-pressed": cerrada ? null : String(marcada),
        onclick: cerrada ? null : function () { if (marcada) delete f3.marcas[r.id]; else f3.marcas[r.id] = true; render(); anunciar(r.id + (f3.marcas[r.id] ? " marcada como mal." : " sin marcar.")); } },
        h("b", { text: r.id }), h("span", { text: r.tarjeta }), h("span", { text: r.tipo }), h("span", { text: r.precio }),
        h("span", { class: "marca", text: marcada ? "Mal ⚑" : "" }), ver ? insignia(f3.res[r.id]) : null);
      ul.appendChild(h("li", null, b));
    });
    app.appendChild(ul);
    if (!cerrada) {
      var n = Object.keys(f3.marcas).length;
      app.appendChild(h("p", { class: "etiqueta", text: "Marcadas como mal: " + n }));
      app.appendChild(h("div", { class: "acciones" }, h("button", { class: "btn", type: "button", disabled: ui.ocupado, text: "Verificar", onclick: verificarF3 })));
    } else app.appendChild(bloqueCierre(3, ver ? "Planilla revisada" : ""));
    app.appendChild(pieReiniciar());
  }

  /* ----- Fase 4: el misterio ----- */
  var TABS = [ { id: "viajes", nombre: "Viajes" }, { id: "tarjetas", nombre: "Tarjetas" }, { id: "pasajeros", nombre: "Pasajeros" } ];
  var FILTROS = [
    { id: "linea", nombre: "Línea", valores: function () { return unicos(D.viajes.map(function (v) { return v.linea; })).sort(); } },
    { id: "hora", nombre: "Hora", valores: function () { return unicos(D.viajes.map(function (v) { return v.hora; })).sort(); } },
    { id: "tarjeta", nombre: "Tarjeta", valores: function () { return D.tarjetas.map(function (t) { return t.id; }); } }
  ];

  function ir(tab, id) {
    S.f4.tab = tab; S.f4.destino = { tab: tab, id: id }; S.f4.animar = true; ui.filtroAbierto = null;
    render();
    var d = app.querySelector(".fila.destino");
    if (d) { d.scrollIntoView({ block: "center", behavior: reducido ? "auto" : "smooth" }); d.focus({ preventScroll: true }); }
    anunciar("Ficha " + id + " en " + porId(TABS, tab).nombre + ".");
  }
  function fila(tab, id, partes) {
    var dest = S.f4.destino && S.f4.destino.tab === tab && S.f4.destino.id === id;
    var li = h("li", { class: "fila" + (dest ? " destino" : ""), tabindex: dest ? "-1" : null, "aria-current": dest ? "true" : null });
    partes.forEach(function (p) { li.appendChild(p); });
    return li;
  }
  function enlace(tab, id, etiqueta) {
    return h("button", { class: "btn--enlace", type: "button", "aria-label": etiqueta + " " + id + ": ir a su ficha", text: id, onclick: function () { ir(tab, id); } });
  }
  function listaTabla() {
    var f = S.f4.filtros, ul = h("ul", { class: "filas" });
    if (S.f4.tab === "viajes") {
      var vs = D.viajes.filter(function (v) { return (!f.linea || v.linea === f.linea) && (!f.hora || v.hora === f.hora) && (!f.tarjeta || v.tarjeta === f.tarjeta); });
      vs.forEach(function (v) {
        ul.appendChild(fila("viajes", v.id, [h("b", { text: v.id }), h("span", { text: v.hora }), h("span", { text: "Línea " + v.linea }), enlace("tarjetas", v.tarjeta, "Tarjeta")]));
      });
      if (!vs.length) ul.appendChild(h("li", { class: "vacio", text: "Ningún viaje con esos filtros." }));
    } else if (S.f4.tab === "tarjetas") {
      D.tarjetas.forEach(function (t) {
        ul.appendChild(fila("tarjetas", t.id, [h("b", { text: t.id }), h("span", { text: t.tipo }), h("span", { text: "Pasajero" }), enlace("pasajeros", t.pasajero, "Pasajero")]));
      });
    } else {
      D.pasajeros.forEach(function (p) {
        ul.appendChild(fila("pasajeros", p.id, [h("b", { text: p.id }), h("span", { text: p.nombre }), h("span", { text: p.barrio })]));
      });
    }
    return ul;
  }
  function vistaF4() {
    var f4 = S.f4, cerrada = !!f4.cerrada, F = D.fase4;
    encabezado(4);
    app.appendChild(h("p", { class: "consigna", text: F.consigna }));

    var tabs = h("div", { class: "pestanas", role: "tablist", "aria-label": "Tablas" });
    TABS.forEach(function (t) {
      tabs.appendChild(h("button", { class: "pestana", role: "tab", type: "button", id: "tab-" + t.id, "aria-selected": String(f4.tab === t.id), "aria-controls": "panel",
        text: t.nombre, onclick: function () { f4.tab = t.id; f4.destino = null; ui.filtroAbierto = null; f4.animar = true; render(); } }));
    });
    app.appendChild(tabs);

    var panel = h("div", { class: "panel-tabla" + (f4.animar ? " entra" : ""), id: "panel", role: "tabpanel", "aria-labelledby": "tab-" + f4.tab });
    f4.animar = false;
    if (f4.tab === "viajes") {
      var chips = h("div", { class: "chips" });
      FILTROS.forEach(function (fl) {
        var val = f4.filtros[fl.id];
        chips.appendChild(h("button", { class: "chip" + (val ? " chip--activo" : ""), type: "button", "aria-expanded": String(ui.filtroAbierto === fl.id),
          text: fl.nombre + ": " + (val || "todas") + " ▾", onclick: function () { ui.filtroAbierto = ui.filtroAbierto === fl.id ? null : fl.id; render(); } }));
      });
      panel.appendChild(chips);
      if (ui.filtroAbierto) {
        var fl = porId(FILTROS, ui.filtroAbierto);
        var ops = h("div", { class: "opciones", role: "group", "aria-label": "Valores de " + fl.nombre });
        ops.appendChild(h("button", { class: "opcion opcion--limpiar", type: "button", text: "Quitar filtro", onclick: function () { f4.filtros[fl.id] = null; ui.filtroAbierto = null; render(); anunciar("Filtro quitado."); } }));
        fl.valores().forEach(function (v) {
          ops.appendChild(h("button", { class: "opcion", type: "button", "aria-pressed": String(f4.filtros[fl.id] === v), text: v, onclick: function () { f4.filtros[fl.id] = v; ui.filtroAbierto = null; render(); anunciar("Filtro " + fl.nombre + ": " + v + "."); } }));
        });
        panel.appendChild(ops);
      }
    }
    panel.appendChild(listaTabla());
    app.appendChild(panel);

    var pistas = F.pistas;
    if (f4.pistas) {
      var ul = h("ul", { class: "pistas", "aria-live": "polite" });
      for (var i = 0; i < f4.pistas; i++) ul.appendChild(h("li", { text: "Pista " + (i + 1) + ": " + pistas[i] }));
      app.appendChild(ul);
    }
    if (!cerrada) {
      var acciones = h("div", { class: "acciones" });
      acciones.appendChild(h("button", { class: "btn btn--sec", type: "button", disabled: f4.pistas >= pistas.length,
        text: "Pista −" + F.costoPista + (f4.pistas >= pistas.length ? " (no hay más)" : ""), onclick: function () {
          if (f4.pistas < pistas.length) { f4.pistas++; render(); anunciar("Pista " + f4.pistas + ": " + pistas[f4.pistas - 1]); }
        } }));
      acciones.appendChild(h("button", { class: "btn", type: "button", "aria-expanded": String(ui.respondiendo), text: "Ya sé quién es", onclick: function () { ui.respondiendo = !ui.respondiendo; ui.mensaje = null; render(); } }));
      app.appendChild(acciones);
    }
    if (ui.respondiendo && !cerrada) {
      var sec = h("section", { class: "ficha", "aria-label": "Elegí al pasajero" }, h("h3", { text: "¿A quién hay que avisarle?" }), h("p", { class: "etiqueta", text: "Cada respuesta mal resta " + F.costoPista + "." }));
      var rl = h("ul", { class: "respuestas" });
      D.pasajeros.forEach(function (p) {
        rl.appendChild(h("li", null, h("button", { class: "dato", type: "button", disabled: ui.ocupado, text: p.id + " · " + p.nombre + " · " + p.barrio, onclick: function () { responderF4(p.id); } })));
      });
      sec.appendChild(rl);
      app.appendChild(sec);
    }
    if (ui.mensaje && !cerrada) app.appendChild(h("p", { class: "mensaje mensaje--" + (ui.mensaje.ok ? "ok" : "mal"), role: "status", text: ui.mensaje.texto }));
    if (cerrada) {
      var ok = f4.cerrada === "resuelta";
      if (ok) app.appendChild(h("p", { class: "mensaje mensaje--ok", role: "status", text: F.mensajeAcierto }));
      app.appendChild(bloqueCierre(4, ok ? "Misterio resuelto" : ""));
    }
    app.appendChild(pieReiniciar());
  }
  function responderF4(id) {
    if (ui.ocupado || !puedeVerificar(4)) return;
    ui.ocupado = true;
    Promise.all([L.coincide(SEC, "f4:resp", id), L.coincide(SEC, "f4:trampa", id)]).then(function (r) {
      ui.ocupado = false;
      if (!puedeVerificar(4)) return;
      var F = D.fase4, f4 = S.f4;
      if (r[0]) {
        f4.cerrada = "resuelta"; f4.puntos = L.puntosF4(true, f4.pistas, f4.errores, F.puntosAcierto, F.costoPista);
        ui.respondiendo = false; ui.mensaje = null; render(); enfocarCierre(4); anunciar(F.mensajeAcierto);
      } else {
        f4.errores++;
        ui.mensaje = { ok: false, texto: (r[1] ? F.mensajeTrampa : F.mensajeError) + " (−" + F.costoPista + ")" };
        render(); anunciar(ui.mensaje.texto);
      }
    }, falloCrypto);
  }

  /* ----- Final ----- */
  function abrirExplicaciones(codigo) {
    if (ui.ocupado) return;
    ui.ocupado = true;
    L.descifrar(SEC, codigo).then(function (obj) {
      ui.ocupado = false; ui.revelado = obj; ui.codigoMal = false; render();
      anunciar("Explicaciones abiertas.");
    }, function () {
      ui.ocupado = false; ui.codigoMal = true; render(); anunciar("Ese código no es el del proyector.");
    });
  }
  function bloqueCodigo() {
    var input = h("input", { id: "codigo", type: "text", maxlength: "12", autocomplete: "off", autocapitalize: "characters", spellcheck: "false", placeholder: "Código" });
    return h("form", { class: "ficha codigo", onsubmit: function (ev) { ev.preventDefault(); abrirExplicaciones(input.value); } },
      h("h3", { text: "Explicaciones" }),
      h("p", { text: "Cuando el que conduce muestre el código en el proyector, escribanlo acá para ver por qué." }),
      h("label", { for: "codigo", text: "Código del proyector" }), input,
      ui.codigoMal ? h("p", { class: "mensaje mensaje--mal", role: "status", text: "Ese no es el código. Revisen el proyector." }) : null,
      h("div", { class: "acciones" }, h("button", { class: "btn", type: "submit", disabled: ui.ocupado, text: "Ver explicaciones" })));
  }
  function bloqueExplicaciones(R) {
    var cont = h("div", { class: "explicaciones" });
    var NOMBRE_REL = {}; D.fase2.opciones.forEach(function (o) { NOMBRE_REL[o.id] = o.nombre; });

    cont.appendChild(h("h2", { text: "Fase 1 · cada dato en su caja" }));
    var u1 = h("ul", { class: "expl" });
    D.fase1.datos.forEach(function (d) {
      var x = R.f1[d.id];
      u1.appendChild(h("li", null, h("b", { text: d.texto }), h("span", { text: " → " + porId(D.cajas, x.caja).nombre + ". " + x.porque })));
    });
    cont.appendChild(u1);

    cont.appendChild(h("h2", { text: "Fase 2 · el modelo" }));
    var u2 = h("ul", { class: "expl" });
    D.fase2.pares.forEach(function (p) {
      var x = R.f2[p.id];
      u2.appendChild(h("li", null, h("b", { text: p.a + " – " + p.b + ": " + NOMBRE_REL[x.resp] }), h("span", { text: ". " + x.porque })));
    });
    cont.appendChild(u2);

    cont.appendChild(h("h2", { text: "Fase 3 · un solo lugar" }));
    var u3 = h("ul", { class: "expl" });
    D.fase3.filas.forEach(function (r) {
      var x = R.f3[r.id];
      if (x.mal) u3.appendChild(h("li", null, h("b", { text: r.id + " (" + r.tipo + ", " + r.precio + ")" }), h("span", { text: ": " + x.porque })));
    });
    cont.appendChild(u3);
    var tabla = h("table", { class: "tarifas" }, h("caption", { text: "Tabla Tarifas" }), h("tr", null, h("th", { text: "Tipo" }), h("th", { text: "Precio" })));
    D.tarifas.forEach(function (t) {
      tabla.appendChild(h("tr", null, h("td", { text: t.tipo }), h("td", { class: t.tipo === "común" ? "tarifa--cambia" : null, text: t.tipo === "común" ? t.precio + " → $1.200" : t.precio })));
    });
    cont.appendChild(tabla);
    cont.appendChild(h("p", { text: R.f3.cierre }));

    cont.appendChild(h("h2", { text: "Fase 4 · el camino corto" }));
    var ol = h("ol", { class: "camino" });
    R.f4.camino.forEach(function (c) { ol.appendChild(h("li", { text: c })); });
    cont.appendChild(ol);
    cont.appendChild(h("p", { class: "mensaje", text: R.f4.cierre }));
    return cont;
  }
  function vistaFinal() {
    var t = total();
    app.appendChild(h("p", { class: "etiqueta", text: "Resultado de " + S.equipo }));
    app.appendChild(h("div", { class: "final__puntos", "aria-label": t + " puntos", text: String(t) }));
    var partes = [1, 2, 3, 4].map(function (n) { return "Fase " + n + ": " + puntosDe(n) + (S["f" + n].cerrada === "tiempo" ? " (sin tiempo)" : ""); });
    app.appendChild(h("p", { class: "final__desglose", text: partes.join(" · ") }));
    var desc = [];
    if (S.f4.pistas) desc.push(S.f4.pistas + (S.f4.pistas === 1 ? " pista" : " pistas"));
    if (S.f4.errores) desc.push(S.f4.errores + (S.f4.errores === 1 ? " respuesta mal" : " respuestas mal"));
    if (desc.length) app.appendChild(h("p", { class: "final__desglose", text: "Fase 4 con " + desc.join(" y ") + "." }));
    if (S.reinicios) app.appendChild(h("p", { class: "mensaje mensaje--mal", text: "Este equipo reinició el juego " + S.reinicios + (S.reinicios === 1 ? " vez." : " veces.") }));
    app.appendChild(h("p", { class: "mensaje", text: "Díganlo en voz alta para el marcador." }));
    app.appendChild(ui.revelado ? bloqueExplicaciones(ui.revelado) : bloqueCodigo());
    app.appendChild(pieReiniciar());
  }

  /* ---------- arranque ---------- */
  function iniciar() {
    ui = uiNuevo();
    S = cargar() || nuevo();
    if (!L || !SEC || !window.crypto || !window.crypto.subtle) ui.error = "Este navegador no puede verificar respuestas. Abrí la página con https.";
    render();
    setInterval(tick, 1000);
    /* si se recargó con la fase ya vencida, cierra al arrancar */
    tick();
  }
  iniciar();
})();
