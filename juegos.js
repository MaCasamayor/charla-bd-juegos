/* Juego G1 «La tarjeta clonada». Los datos viven en datos.js (window.DATOS);
   acá no hay ningún dato del caso. Todo texto dinámico entra con textContent.

   Hashes de debug (solo para capturas y pruebas; no tocan el localStorage):
     #debug-fase1   fase 1 con algunos datos ubicados
     #debug-fase1v  fase 1 ya verificada
     #debug-fase2   fase 2 con una pista y la ficha de una tarjeta resaltada
     #debug-final   pantalla final
   Son inofensivos: solo arman un estado de ejemplo en memoria. */
(function () {
  "use strict";
  var D = window.DATOS;
  var app = document.getElementById("app");
  var barra = document.getElementById("barra");
  var bEquipo = document.getElementById("b-equipo");
  var bReloj = document.getElementById("b-reloj");
  var bPuntos = document.getElementById("b-puntos");
  var anuncio = document.getElementById("anuncio");
  var debug = false;
  var S;            // estado
  var ui = { filtroAbierto: null, respondiendo: false, mensaje: null, confirmando: false, aviso: "", vencidoAnunciado: {} };

  var reducido = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  /* ---------- estado ---------- */
  function nuevo() {
    return {
      equipo: "", fase: "inicio", inicioFase: 0,
      f1: { orden: mezclar(D.fase1.datos.map(function (d) { return d.id; })), puestos: {}, sel: null, verificado: false, puntos: 0 },
      f2: { tab: "viajes", filtros: { linea: null, hora: null, tarjeta: null }, pistas: 0, errores: 0, destino: null, resuelto: false, puntos: 0 }
    };
  }
  function guardar() {
    if (debug) return;
    try { localStorage.setItem(D.storageKey, JSON.stringify(S)); } catch (e) { /* sin storage: sigue andando */ }
  }
  function cargar() {
    try {
      var raw = localStorage.getItem(D.storageKey);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || !o.f1 || !o.f2 || !Array.isArray(o.f1.orden) || o.f1.orden.length !== D.fase1.datos.length) return null;
      return o;
    } catch (e) { return null; }
  }
  function borrarGuardado() { try { localStorage.removeItem(D.storageKey); } catch (e) { /* nada */ } }

  /* ---------- puntaje ---------- */
  function aciertos() {
    var n = 0;
    D.fase1.datos.forEach(function (d) { if (S.f1.puestos[d.id] === d.caja) n++; });
    return n;
  }
  function puntosF1(n) {
    var r = 0;
    D.fase1.puntaje.forEach(function (p) { if (n >= p.minimo && p.puntos > r) r = p.puntos; });
    return r;
  }
  function puntosF2() { return S.f2.resuelto ? S.f2.puntos : 0; }
  function total() { return (S.f1.verificado ? S.f1.puntos : 0) + puntosF2(); }

  /* ---------- reloj ---------- */
  function restante() {
    var dur = D.duraciones[S.fase];
    if (!dur || !S.inicioFase) return null;
    return dur - Math.floor((Date.now() - S.inicioFase) / 1000);
  }
  function tick() {
    if (S.fase === 1 || S.fase === 2) {
      var r = restante();
      var v = r !== null && r <= 0;
      bReloj.textContent = v ? "¡Tiempo!" : pad(Math.floor(r / 60)) + ":" + pad(r % 60);
      bReloj.classList.toggle("vencido", v);
      if (v && !ui.vencidoAnunciado[S.fase]) { ui.vencidoAnunciado[S.fase] = true; anunciar("¡Tiempo! Esperen la indicación del presentador."); }
    } else { bReloj.textContent = "--:--"; bReloj.classList.remove("vencido"); }
  }
  function barraActualizar() {
    var visible = S.fase !== "inicio";
    barra.hidden = !visible;
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
    else vistaFinal();
    barraActualizar();
    var t2 = app.querySelector(".bandeja");
    if (t2) t2.scrollLeft = sx;
    window.scrollTo(0, sy);
    guardar();
  }
  function cambiarFase(f) {
    S.fase = f; S.inicioFase = Date.now(); ui.filtroAbierto = null; ui.respondiendo = false; ui.mensaje = null; ui.confirmando = false;
    render(); window.scrollTo(0, 0);
    anunciar(f === 1 ? "Fase 1: ordenar." : f === 2 ? "Fase 2: el misterio." : "Resultado final.");
  }

  function pieReiniciar() {
    var pie = h("div", { class: "pie" });
    if (!ui.confirmando) {
      pie.appendChild(h("button", { class: "btn btn--sec btn--chico", type: "button", onclick: function () { ui.confirmando = true; render(); } , text: "Reiniciar" }));
    } else {
      pie.appendChild(h("span", { text: "¿Borrar todo y empezar de cero?" }));
      pie.appendChild(h("button", { class: "btn btn--chico", type: "button", text: "Sí, reiniciar", onclick: function () {
        var r = (S.reinicios || 0) + 1; borrarGuardado(); S = nuevo(); S.reinicios = r; ui = { filtroAbierto: null, respondiendo: false, mensaje: null, confirmando: false, aviso: "", vencidoAnunciado: {} }; render();
      } }));
      pie.appendChild(h("button", { class: "btn btn--sec btn--chico", type: "button", text: "No", onclick: function () { ui.confirmando = false; render(); } }));
    }
    return pie;
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
      h("p", { text: "Dos fases: ordenar datos y resolver un misterio. Un celular por equipo." }),
      h("label", { for: "nombre", text: "Nombre del equipo" }),
      input,
      h("div", { class: "acciones" }, h("button", { class: "btn", type: "submit", text: "Empezar" }))
    );
    app.appendChild(form);
  }

  /* ----- Fase 1 ----- */
  function datoBtn(d, extra) {
    var ver = S.f1.verificado;
    var ok = S.f1.puestos[d.id] === d.caja;
    var cls = "dato" + (ver ? (ok ? " dato--ok dato--fijo" : " dato--mal dato--fijo") : "");
    var b = h(ver ? "div" : "button", { class: cls, type: ver ? null : "button", "aria-pressed": ver ? null : String(S.f1.sel === d.id) });
    var t = h("span", { text: d.texto });
    b.appendChild(t);
    if (ver) {
      var cajaOk = porId(D.cajas, d.caja).nombre;
      b.appendChild(h("span", { class: "porque", text: (ok ? "Bien. " : "Va en " + cajaOk + ". ") + d.porque }));
    } else {
      b.addEventListener("click", function () {
        if (S.f1.puestos[d.id]) { delete S.f1.puestos[d.id]; S.f1.sel = null; anunciar("Volvió a la bandeja."); }
        else { S.f1.sel = S.f1.sel === d.id ? null : d.id; anunciar(S.f1.sel ? "Dato elegido. Tocá una caja." : "Dato soltado."); }
        render();
      });
    }
    return b;
  }
  function vistaF1() {
    var datos = D.fase1.datos;
    var ver = S.f1.verificado;
    app.appendChild(h("h2", { text: "Fase 1 · Ordenar" }));
    app.appendChild(h("p", { text: D.fase1.consigna }));

    var cajas = h("div", { class: "cajas" });
    D.cajas.forEach(function (c) {
      var lista = h("ul", { class: "caja__lista" });
      var n = 0;
      S.f1.orden.forEach(function (id) {
        if (S.f1.puestos[id] === c.id) { n++; lista.appendChild(h("li", null, datoBtn(porId(datos, id)))); }
      });
      var btn = h("button", { class: "caja__btn", type: "button", disabled: ver, "aria-label": "Caja " + c.nombre + ", " + n + " datos. Tocá para poner el dato elegido.", onclick: function () {
        if (!S.f1.sel) { anunciar("Primero tocá un dato de la bandeja."); ui.aviso = "Primero tocá un dato."; avisoF1(); return; }
        S.f1.puestos[S.f1.sel] = c.id; S.f1.sel = null; anunciar("Dato en " + c.nombre + "."); render();
      } }, h("b", { text: c.nombre + " (" + n + ")" }), h("span", { text: c.ayuda }));
      cajas.appendChild(h("section", { class: "caja caja--" + c.id }, btn, lista));
    });
    app.appendChild(cajas);

    var sin = S.f1.orden.filter(function (id) { return !S.f1.puestos[id]; });
    app.appendChild(h("p", { class: "etiqueta", id: "aviso-f1", text: ver ? "" : (ui.aviso || ("Sin ubicar: " + sin.length + " de " + datos.length)) }));
    ui.aviso = "";
    if (!ver) {
      var bandeja = h("div", { class: "bandeja", role: "group", "aria-label": "Bandeja de datos" });
      if (!sin.length) bandeja.appendChild(h("span", { class: "bandeja__vacia", text: "Bandeja vacía. Verificá." }));
      sin.forEach(function (id) { bandeja.appendChild(datoBtn(porId(datos, id))); });
      app.appendChild(bandeja);
      app.appendChild(h("div", { class: "acciones" }, h("button", { class: "btn", type: "button", text: "Verificar", onclick: function () {
        var n = aciertos(); S.f1.verificado = true; S.f1.puntos = puntosF1(n); S.f1.sel = null;
        render(); var r = document.getElementById("res-f1"); if (r) { r.focus(); r.scrollIntoView({ block: "start" }); }
      } })));
    } else {
      var n = aciertos();
      var sinUb = S.f1.orden.filter(function (id) { return !S.f1.puestos[id]; });
      var res = h("div", { class: "resultado", id: "res-f1", tabindex: "-1", "aria-live": "polite" },
        h("div", { class: "grande", text: n + " de " + datos.length + " bien · " + S.f1.puntos + (S.f1.puntos === 1 ? " punto" : " puntos") }));
      if (sinUb.length) {
        res.appendChild(h("p", { text: "Quedaron sin ubicar:" }));
        var ul = h("ul", { class: "sin-ubicar" });
        sinUb.forEach(function (id) { ul.appendChild(h("li", null, datoBtn(porId(datos, id)))); });
        res.appendChild(ul);
      }
      res.appendChild(h("div", { class: "acciones" }, h("button", { class: "btn", type: "button", text: "Seguir al misterio", onclick: function () { cambiarFase(2); } })));
      app.appendChild(res);
    }
    app.appendChild(pieReiniciar());
  }
  function avisoF1() { var a = document.getElementById("aviso-f1"); if (a) a.textContent = "Primero tocá un dato."; }

  /* ----- Fase 2 ----- */
  var TABS = [ { id: "viajes", nombre: "Viajes" }, { id: "tarjetas", nombre: "Tarjetas" }, { id: "pasajeros", nombre: "Pasajeros" } ];
  var FILTROS = [
    { id: "linea", nombre: "Línea", valores: function () { return unicos(D.viajes.map(function (v) { return v.linea; })).sort(); } },
    { id: "hora", nombre: "Hora", valores: function () { return unicos(D.viajes.map(function (v) { return v.hora; })).sort(); } },
    { id: "tarjeta", nombre: "Tarjeta", valores: function () { return D.tarjetas.map(function (t) { return t.id; }); } }
  ];

  function ir(tab, id) {
    S.f2.tab = tab; S.f2.destino = { tab: tab, id: id }; S.f2.animar = true; ui.filtroAbierto = null;
    render();
    var d = app.querySelector(".fila.destino");
    if (d) { d.scrollIntoView({ block: "center", behavior: reducido ? "auto" : "smooth" }); d.focus({ preventScroll: true }); }
    anunciar("Ficha " + id + " en " + porId(TABS, tab).nombre + ".");
  }
  function fila(tab, id, partes) {
    var dest = S.f2.destino && S.f2.destino.tab === tab && S.f2.destino.id === id;
    var li = h("li", { class: "fila" + (dest ? " destino" : ""), tabindex: dest ? "-1" : null, "aria-current": dest ? "true" : null });
    partes.forEach(function (p) { li.appendChild(p); });
    return li;
  }
  function enlace(tab, id, etiqueta) {
    return h("button", { class: "btn--enlace", type: "button", "aria-label": etiqueta + " " + id + ": ir a su ficha", text: id, onclick: function () { ir(tab, id); } });
  }
  function listaTabla() {
    var f = S.f2.filtros, ul = h("ul", { class: "filas" });
    if (S.f2.tab === "viajes") {
      var vs = D.viajes.filter(function (v) { return (!f.linea || v.linea === f.linea) && (!f.hora || v.hora === f.hora) && (!f.tarjeta || v.tarjeta === f.tarjeta); });
      vs.forEach(function (v) {
        ul.appendChild(fila("viajes", v.id, [h("b", { text: v.id }), h("span", { text: v.hora }), h("span", { text: "Línea " + v.linea }), enlace("tarjetas", v.tarjeta, "Tarjeta")]));
      });
      if (!vs.length) ul.appendChild(h("li", { class: "vacio", text: "Ningún viaje con esos filtros." }));
    } else if (S.f2.tab === "tarjetas") {
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
  function vistaF2() {
    var f2 = S.f2;
    app.appendChild(h("h2", { text: "Fase 2 · El misterio" }));
    app.appendChild(h("p", { class: "consigna", text: D.fase2.consigna }));

    var tabs = h("div", { class: "pestanas", role: "tablist", "aria-label": "Tablas" });
    TABS.forEach(function (t) {
      tabs.appendChild(h("button", { class: "pestana", role: "tab", type: "button", id: "tab-" + t.id, "aria-selected": String(f2.tab === t.id), "aria-controls": "panel",
        text: t.nombre, onclick: function () { f2.tab = t.id; f2.destino = null; ui.filtroAbierto = null; f2.animar = true; render(); } }));
    });
    app.appendChild(tabs);

    var panel = h("div", { class: "panel-tabla" + (f2.animar ? " entra" : ""), id: "panel", role: "tabpanel", "aria-labelledby": "tab-" + f2.tab });
    f2.animar = false;
    if (f2.tab === "viajes") {
      var chips = h("div", { class: "chips" });
      FILTROS.forEach(function (fl) {
        var val = f2.filtros[fl.id];
        chips.appendChild(h("button", { class: "chip" + (val ? " chip--activo" : ""), type: "button", "aria-expanded": String(ui.filtroAbierto === fl.id),
          text: fl.nombre + ": " + (val || "todas") + " ▾", onclick: function () { ui.filtroAbierto = ui.filtroAbierto === fl.id ? null : fl.id; render(); } }));
      });
      panel.appendChild(chips);
      if (ui.filtroAbierto) {
        var fl = porId(FILTROS, ui.filtroAbierto);
        var ops = h("div", { class: "opciones", role: "group", "aria-label": "Valores de " + fl.nombre });
        ops.appendChild(h("button", { class: "opcion opcion--limpiar", type: "button", text: "Quitar filtro", onclick: function () { f2.filtros[fl.id] = null; ui.filtroAbierto = null; render(); anunciar("Filtro quitado."); } }));
        fl.valores().forEach(function (v) {
          ops.appendChild(h("button", { class: "opcion", type: "button", "aria-pressed": String(f2.filtros[fl.id] === v), text: v, onclick: function () { f2.filtros[fl.id] = v; ui.filtroAbierto = null; render(); anunciar("Filtro " + fl.nombre + ": " + v + "."); } }));
        });
        panel.appendChild(ops);
      }
    }
    panel.appendChild(listaTabla());
    app.appendChild(panel);

    // pistas
    var pistas = D.fase2.pistas;
    if (f2.pistas) {
      var ul = h("ul", { class: "pistas", "aria-live": "polite" });
      for (var i = 0; i < f2.pistas; i++) ul.appendChild(h("li", { text: "Pista " + (i + 1) + ": " + pistas[i] }));
      app.appendChild(ul);
    }
    var acciones = h("div", { class: "acciones" });
    if (!f2.resuelto) {
      acciones.appendChild(h("button", { class: "btn btn--sec", type: "button", disabled: f2.pistas >= pistas.length,
        text: "Pista −" + D.fase2.costoPista + (f2.pistas >= pistas.length ? " (no hay más)" : ""), onclick: function () {
          if (f2.pistas < pistas.length) { f2.pistas++; render(); anunciar("Pista " + f2.pistas + ": " + pistas[f2.pistas - 1]); }
        } }));
      acciones.appendChild(h("button", { class: "btn", type: "button", "aria-expanded": String(ui.respondiendo), text: "Ya sé quién es", onclick: function () { ui.respondiendo = !ui.respondiendo; ui.mensaje = null; render(); } }));
    }
    app.appendChild(acciones);

    if (ui.respondiendo && !f2.resuelto) {
      var sec = h("section", { class: "ficha", "aria-label": "Elegí al pasajero" }, h("h3", { text: "¿A quién hay que avisarle?" }), h("p", { class: "etiqueta", text: "Cada respuesta mal resta " + D.fase2.costoPista + "." }));
      var rl = h("ul", { class: "respuestas" });
      D.pasajeros.forEach(function (p) {
        rl.appendChild(h("li", null, h("button", { class: "dato", type: "button", text: p.id + " · " + p.nombre + " · " + p.barrio, onclick: function () { responder(p.id); } })));
      });
      sec.appendChild(rl);
      app.appendChild(sec);
    }
    if (ui.mensaje) app.appendChild(h("p", { class: "mensaje mensaje--" + (ui.mensaje.ok ? "ok" : "mal"), role: "status", text: ui.mensaje.texto }));
    if (f2.resuelto) {
      app.appendChild(h("p", { class: "mensaje mensaje--ok", role: "status", text: D.fase2.mensajeAcierto + " Fase 2: " + f2.puntos + (f2.puntos === 1 ? " punto." : " puntos.") }));
      app.appendChild(h("div", { class: "acciones" }, h("button", { class: "btn", type: "button", text: "Ver resultado final", onclick: function () { cambiarFase("final"); } })));
    }
    app.appendChild(pieReiniciar());
  }
  function responder(id) {
    if (id === D.fase2.respuesta) {
      S.f2.resuelto = true; S.f2.puntos = Math.max(0, D.fase2.puntosAcierto - (S.f2.pistas + (S.f2.errores || 0)) * D.fase2.costoPista);
      ui.respondiendo = false; ui.mensaje = null; render(); anunciar(D.fase2.mensajeAcierto);
    } else {
      S.f2.errores = (S.f2.errores || 0) + 1;
      ui.mensaje = { ok: false, texto: (id === D.fase2.trampa.id ? D.fase2.trampa.mensaje : D.fase2.mensajeError) + " (−" + D.fase2.costoPista + ")" };
      render(); anunciar(ui.mensaje.texto);
    }
  }

  /* ----- Final ----- */
  function vistaFinal() {
    var t = total();
    app.appendChild(h("p", { class: "etiqueta", text: "Resultado de " + S.equipo }));
    app.appendChild(h("div", { class: "final__puntos", "aria-label": t + " puntos", text: String(t) }));
    var desc = [];
    if (S.f2.pistas) desc.push(S.f2.pistas + (S.f2.pistas === 1 ? " pista" : " pistas"));
    if (S.f2.errores) desc.push(S.f2.errores + (S.f2.errores === 1 ? " respuesta mal" : " respuestas mal"));
    app.appendChild(h("p", { class: "final__desglose", text: "Fase 1: " + (S.f1.verificado ? S.f1.puntos : 0) + " · Fase 2: " + puntosF2() + (desc.length ? " (" + desc.join(", ") + ")" : "") }));
    if (S.reinicios) app.appendChild(h("p", { class: "mensaje mensaje--mal", text: "Este equipo reinició el juego " + S.reinicios + (S.reinicios === 1 ? " vez." : " veces.") }));
    app.appendChild(h("p", { class: "mensaje", text: "Díganlo en voz alta para el marcador." }));
    app.appendChild(h("h2", { text: "El camino corto" }));
    var ol = h("ol", { class: "camino" });
    D.fase2.camino.forEach(function (c) { ol.appendChild(h("li", { text: c })); });
    app.appendChild(ol);
    app.appendChild(h("p", { text: D.fase2.cierre }));
    app.appendChild(pieReiniciar());
  }

  /* ---------- arranque ---------- */
  function estadoDebug(hash) {
    var s = nuevo(); s.equipo = "Equipo Debug"; s.inicioFase = Date.now() - 20000;
    var ds = D.fase1.datos;
    if (hash === "#debug-fase1" || hash === "#debug-fase1v") {
      s.fase = 1;
      ds.slice(0, 11).forEach(function (d, i) { s.f1.puestos[d.id] = i === 3 ? "afuera" : d.caja; });
      if (hash === "#debug-fase1v") { s.f1.verificado = true; s.f1.puntos = puntosF1(11 - 1); }
      else s.f1.sel = ds[12].id;
    } else {
      ds.forEach(function (d) { s.f1.puestos[d.id] = d.caja; });
      s.f1.verificado = true; s.f1.puntos = 3;
      if (hash === "#debug-fase2") { s.fase = 2; s.f2.pistas = 1; s.f2.tab = "tarjetas"; s.f2.destino = { tab: "tarjetas", id: "0001-4471" }; }
      else { s.fase = "final"; s.f2.resuelto = true; s.f2.pistas = 1; s.f2.puntos = D.fase2.puntosAcierto - 1; }
    }
    return s;
  }
  function iniciar() {
    var hash = location.hash;
    if (/^#debug-(fase1|fase1v|fase2|final)$/.test(hash)) { debug = true; S = estadoDebug(hash); }
    else S = cargar() || nuevo();
    render();
    setInterval(tick, 1000);
  }
  iniciar();
})();
