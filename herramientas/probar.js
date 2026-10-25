#!/usr/bin/env node
/* Pruebas de puntaje, hashes, descifrado y fugas. Solo Node built-in.
   Uso:  node herramientas/probar.js [URL_BASE]
   Con URL_BASE (ej. http://localhost:8123/) revisa los archivos tal como los sirve el
   servidor; sin ella, los lee del disco. Necesita herramientas/fuente.local.json. */
"use strict";
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var assert = require("assert");

var RAIZ = path.join(__dirname, "..");
var BASE = process.argv[2];
var ARCHIVOS = ["index.html", "datos.js", "secretos.js", "logica.js", "juegos.js", "juegos.css"];
var fallas = 0, hechas = 0;
function prueba(nombre, fn) {
  return Promise.resolve().then(fn).then(function () { hechas++; console.log("  ok   " + nombre); },
    function (e) { fallas++; console.log("  FALLA " + nombre + "\n        " + e.message); });
}
function leer(a) {
  if (!BASE) return Promise.resolve(fs.readFileSync(path.join(RAIZ, a), "utf8"));
  return fetch(BASE + a).then(function (r) { if (!r.ok) throw new Error(a + ": HTTP " + r.status); return r.text(); });
}

var fuente = JSON.parse(fs.readFileSync(path.join(__dirname, "fuente.local.json"), "utf8"));
var win = { crypto: globalThis.crypto };
var ctx = vm.createContext({ window: win, TextEncoder: TextEncoder, TextDecoder: TextDecoder, atob: atob });
["datos.js", "secretos.js"].forEach(function (a) { vm.runInContext(fs.readFileSync(path.join(RAIZ, a), "utf8"), ctx); });
var D = win.DATOS, SEC = win.SECRETOS, L = require(path.join(RAIZ, "logica.js"));

function puntajeF1(colocacion) {   // colocacion: id → caja
  return Promise.all(D.fase1.datos.map(function (d) { return colocacion[d.id] ? L.coincide(SEC, "f1:" + d.id, colocacion[d.id]) : false; }))
    .then(function (r) { return { aciertos: r.filter(Boolean).length }; });
}
function correctosF1() { var c = {}; Object.keys(fuente.f1).forEach(function (id) { c[id] = fuente.f1[id].caja; }); return c; }
function f3(marcadas) {            // marcadas: ids de filas tocadas → puntos (misma cuenta que juegos.js)
  return Promise.all(D.fase3.filas.map(function (r) { return L.coincide(SEC, "f3:" + r.id, marcadas.indexOf(r.id) >= 0 ? "mal" : "bien"); }))
    .then(function (rs) {
      var enc = 0, fal = 0;
      D.fase3.filas.forEach(function (r, i) { if (marcadas.indexOf(r.id) >= 0) { if (rs[i]) enc++; else fal++; } });
      return { enc: enc, fal: fal, puntos: L.puntosF3(enc, fal) };
    });
}
var MALAS = Object.keys(fuente.f3).filter(function (k) { return k !== "cierre" && fuente.f3[k].mal; });
var BIENAS = Object.keys(fuente.f3).filter(function (k) { return k !== "cierre" && !fuente.f3[k].mal; });

console.log("Fase 1");
var p = Promise.resolve();
function enSerie(nombre, fn) { p = p.then(function () { return prueba(nombre, fn); }); }

enSerie("la escala da 15=3, 14=2, 12=2, 11=1, 9=1, 8=0, 0=0", function () {
  [[15, 3], [14, 2], [13, 2], [12, 2], [11, 1], [10, 1], [9, 1], [8, 0], [0, 0]].forEach(function (c) {
    assert.strictEqual(L.puntosPorEscala(c[0], D.fase1.puntaje), c[1], c[0] + " aciertos");
  });
});
enSerie("todo bien = 15 aciertos = 3 puntos", function () {
  return puntajeF1(correctosF1()).then(function (r) { assert.strictEqual(r.aciertos, 15); assert.strictEqual(L.puntosPorEscala(r.aciertos, D.fase1.puntaje), 3); });
});
enSerie("un dato mal = 14 = 2 puntos; 4 mal = 11 = 1; 7 mal = 8 = 0", function () {
  var ids = Object.keys(correctosF1());
  return [[1, 14, 2], [4, 11, 1], [7, 8, 0]].reduce(function (pr, c) {
    return pr.then(function () {
      var col = correctosF1();
      for (var i = 0; i < c[0]; i++) col[ids[i]] = col[ids[i]] === "afuera" ? "viajes" : "afuera";
      return puntajeF1(col).then(function (r) { assert.strictEqual(r.aciertos, c[1]); assert.strictEqual(L.puntosPorEscala(r.aciertos, D.fase1.puntaje), c[2]); });
    });
  }, Promise.resolve());
});
enSerie("sin ubicar cuenta como mal (0 aciertos)", function () { return puntajeF1({}).then(function (r) { assert.strictEqual(r.aciertos, 0); }); });
enSerie("los ids de datos.js coinciden con los de la fuente", function () {
  assert.strictEqual(JSON.stringify(D.fase1.datos.map(function (d) { return d.id; }).sort()), JSON.stringify(Object.keys(fuente.f1).sort()));
  assert.strictEqual(D.fase1.datos.length, 15);
});
enSerie("cuenta de la fuente contra caso-saeta: 4 pasajeros, 4 tarjetas, 4 viajes, 3 afuera", function () {
  var cuenta = {}; Object.keys(fuente.f1).forEach(function (k) { cuenta[fuente.f1[k].caja] = (cuenta[fuente.f1[k].caja] || 0) + 1; });
  assert.deepStrictEqual(cuenta, { viajes: 4, afuera: 3, tarjetas: 4, pasajeros: 4 });
});
enSerie("nada de la tarjeta 0001-4471 en la fase 1", function () {
  D.fase1.datos.forEach(function (d) { assert.ok(d.texto.indexOf("4471") < 0, d.texto); });
});

p = p.then(function () { console.log("Fase 2"); });
enSerie("la escala da 4=3, 3=2, 2=1, 1=0, 0=0", function () {
  [[4, 3], [3, 2], [2, 1], [1, 0], [0, 0]].forEach(function (c) { assert.strictEqual(L.puntosPorEscala(c[0], D.fase2.puntaje), c[1]); });
});
enSerie("las 4 respuestas de la fuente pasan el hash y las otras 8 opciones no", function () {
  return Promise.all(D.fase2.pares.map(function (par) {
    return Promise.all(D.fase2.opciones.map(function (o) { return L.coincide(SEC, "f2:" + par.id, o.id); })).then(function (r) {
      assert.strictEqual(r.filter(Boolean).length, 1, par.id);
      assert.strictEqual(D.fase2.opciones[r.indexOf(true)].id, fuente.f2[par.id].resp);
    });
  }));
});
enSerie("respuestas esperadas de caso-saeta: 1aM, 1aM, MaM, 1a1", function () {
  assert.strictEqual(D.fase2.pares.map(function (x) { return fuente.f2[x.id].resp; }).join(), "1aM,1aM,MaM,1a1");
});

p = p.then(function () { console.log("Fase 3"); });
enSerie("4 filas mal de 10 y son V04, V10, V13, V16", function () { assert.deepStrictEqual(MALAS.sort(), ["V04", "V10", "V13", "V16"]); assert.strictEqual(D.fase3.filas.length, 10); });
enSerie("casos borde de la fórmula máx(0, mín(3, enc − falsos − 1))", function () {
  [[4, 0, 3], [4, 1, 2], [4, 2, 1], [4, 3, 0], [4, 4, 0], [3, 0, 2], [3, 1, 1], [2, 0, 1], [2, 1, 0], [1, 0, 0], [0, 0, 0], [0, 3, 0]].forEach(function (c) {
    assert.strictEqual(L.puntosF3(c[0], c[1]), c[2], c[0] + " enc, " + c[1] + " falsos");
  });
});
enSerie("con los hashes: 4 con 0 falsos = 3", function () { return f3(MALAS).then(function (r) { assert.deepStrictEqual([r.enc, r.fal, r.puntos], [4, 0, 3]); }); });
enSerie("con los hashes: 4 con 1 falso = 2", function () { return f3(MALAS.concat(BIENAS[0])).then(function (r) { assert.deepStrictEqual([r.enc, r.fal, r.puntos], [4, 1, 2]); }); });
enSerie("con los hashes: 3 con 0 falsos = 2; 2 = 1; 1 = 0; ninguna = 0", function () {
  return Promise.all([f3(MALAS.slice(0, 3)), f3(MALAS.slice(0, 2)), f3(MALAS.slice(0, 1)), f3([])]).then(function (r) {
    assert.deepStrictEqual(r.map(function (x) { return x.puntos; }), [2, 1, 0, 0]);
  });
});
enSerie("con los hashes: marcar las 10 = 4 enc, 6 falsos = 0", function () {
  return f3(MALAS.concat(BIENAS)).then(function (r) { assert.deepStrictEqual([r.enc, r.fal, r.puntos], [4, 6, 0]); });
});

p = p.then(function () { console.log("Fase 4"); });
enSerie("puntaje: 3 limpio, −1 por pista, −1 por error, piso 0, 0 si no acierta", function () {
  var f = function (a, pi, e) { return L.puntosF4(a, pi, e, D.fase4.puntosAcierto, D.fase4.costoPista); };
  assert.strictEqual(f(true, 0, 0), 3); assert.strictEqual(f(true, 1, 0), 2); assert.strictEqual(f(true, 0, 1), 2);
  assert.strictEqual(f(true, 1, 1), 1); assert.strictEqual(f(true, 3, 0), 0); assert.strictEqual(f(true, 3, 2), 0); assert.strictEqual(f(false, 0, 0), 0);
});
enSerie("el hash acepta solo la respuesta (P02) y marca la trampa (P01)", function () {
  return Promise.all(D.pasajeros.map(function (x) {
    return Promise.all([L.coincide(SEC, "f4:resp", x.id), L.coincide(SEC, "f4:trampa", x.id)]);
  })).then(function (r) {
    D.pasajeros.forEach(function (x, i) {
      assert.strictEqual(r[i][0], x.id === "P02", x.id + " resp");
      assert.strictEqual(r[i][1], x.id === "P01", x.id + " trampa");
    });
  });
});

p = p.then(function () { console.log("Cifrado"); });
enSerie("el código correcto descifra (también con minúsculas y guiones)", function () {
  return L.descifrar(SEC, fuente.claveFinal.toLowerCase().split("").join("-")).then(function (o) {
    assert.strictEqual(o.f4.resp, "P02"); assert.strictEqual(o.f4.camino.length, 3); assert.ok(o.f1.a01.porque); assert.ok(o.f3.cierre);
  });
});
enSerie("un código equivocado no descifra", function () {
  return L.descifrar(SEC, "AAAAAA").then(function () { throw new Error("descifró con código malo"); }, function () { /* esperado */ });
});

p = p.then(function () { console.log("Fugas en lo publicado" + (BASE ? " (servido por " + BASE + ")" : " (disco)")); });
var textos = {};
enSerie("se pueden leer los archivos", function () {
  return Promise.all(ARCHIVOS.map(function (a) { return leer(a).then(function (t) { textos[a] = t; }); }));
});
enSerie("ningún «por qué», camino ni cierre aparece en claro", function () {
  var secretos = [];
  ["f1", "f2", "f3"].forEach(function (f) { Object.keys(fuente[f]).forEach(function (k) { if (k === "cierre") secretos.push(fuente[f][k]); else secretos.push(fuente[f][k].porque); }); });
  secretos = secretos.concat(fuente.f4.camino, [fuente.f4.cierre]);
  ARCHIVOS.forEach(function (a) { secretos.forEach(function (s) { assert.ok(textos[a].indexOf(s) < 0, a + " contiene: " + s); }); });
  /* y trozos distintivos, por si alguien reescribe una frase */
  ["no se actualizó", "tenía que quedar en", "Sofía (P08) tiene dos tarjetas", "queda afuera", "Sin clave, hubiéramos"].forEach(function (t) {
    ARCHIVOS.forEach(function (a) { assert.ok(textos[a].indexOf(t) < 0, a + " contiene: " + t); });
  });
});
enSerie("la clave final no aparece en ningún archivo", function () {
  ARCHIVOS.forEach(function (a) { assert.ok(textos[a].indexOf(fuente.claveFinal) < 0, a); });
});
enSerie("no hay campos de respuesta ni modos debug en el código", function () {
  ARCHIVOS.forEach(function (a) {
    assert.ok(!/debug/i.test(textos[a]), a + " menciona debug");
    if (a !== "secretos.js") assert.ok(!/[{,]\s*(porque|respuesta|camino|resp|mal)\s*:\s*["\[tf]/.test(textos[a]), a + " tiene un campo de respuesta");
  });
  assert.ok(!/location\.(hash|search)/.test(textos["juegos.js"]), "juegos.js lee location.hash/search");
});
enSerie("el orden de datos.js no delata las cajas (no hay 3 seguidos de la misma)", function () {
  var cajas = D.fase1.datos.map(function (d) { return fuente.f1[d.id].caja; }), seguidos = 0;
  for (var i = 1; i < cajas.length; i++) { seguidos = cajas[i] === cajas[i - 1] ? seguidos + 1 : 0; assert.ok(seguidos < 2, "tres seguidos en " + i); }
});

p.then(function () {
  console.log("\n" + hechas + " pruebas ok, " + fallas + " fallas.");
  process.exit(fallas ? 1 : 0);
});
