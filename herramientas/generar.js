#!/usr/bin/env node
/* Genera secretos.js (hashes con sal + bloque cifrado) desde herramientas/fuente.local.json.
   Uso:  node herramientas/generar.js
   La fuente NO se publica (está en .gitignore). Si le faltan sal, salClave o claveFinal,
   las inventa, las guarda en la fuente y muestra la clave final por pantalla: esa es
   la que se escribe en el proyector al final del juego.
   Solo módulos de Node (crypto, fs, path). */
"use strict";
var fs = require("fs");
var path = require("path");
var crypto = require("crypto");

var RAIZ = path.join(__dirname, "..");
var FUENTE = path.join(__dirname, "fuente.local.json");
var SALIDA = path.join(RAIZ, "secretos.js");
var ITER = 200000;
var ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sin 0/O/1/I/L para que se pueda tipear

if (!fs.existsSync(FUENTE)) {
  console.error("Falta " + FUENTE + ". Copiá herramientas/fuente.plantilla.json y completalo (ver README).");
  process.exit(1);
}
var f = JSON.parse(fs.readFileSync(FUENTE, "utf8"));

/* Completa lo que falte y lo guarda en la fuente local, así regenerar no cambia la clave. */
var tocada = false;
if (!f.sal) { f.sal = crypto.randomBytes(16).toString("hex"); tocada = true; }
if (!f.salClave) { f.salClave = crypto.randomBytes(16).toString("base64"); tocada = true; }
if (!f.claveFinal) {
  var c = "";
  for (var i = 0; i < 6; i++) c += ALFABETO[crypto.randomInt(ALFABETO.length)];
  f.claveFinal = c; tocada = true;
}
if (tocada) fs.writeFileSync(FUENTE, JSON.stringify(f, null, 2) + "\n");

function hash(pregunta, respuesta) {
  return crypto.createHash("sha256").update(f.sal + "|" + pregunta + "|" + respuesta).digest("hex");
}

/* Respuesta correcta de cada pregunta. Las claves son las mismas que usa juegos.js. */
var hashes = {};
var revelar = { f1: {}, f2: {}, f3: {}, f4: {} };

Object.keys(f.f1).forEach(function (id) {
  hashes["f1:" + id] = hash("f1:" + id, f.f1[id].caja);
  revelar.f1[id] = f.f1[id];
});
Object.keys(f.f2).forEach(function (id) {
  hashes["f2:" + id] = hash("f2:" + id, f.f2[id].resp);
  revelar.f2[id] = f.f2[id];
});
Object.keys(f.f3).forEach(function (id) {
  if (id === "cierre") { revelar.f3.cierre = f.f3.cierre; return; }
  hashes["f3:" + id] = hash("f3:" + id, f.f3[id].mal ? "mal" : "bien");
  revelar.f3[id] = f.f3[id];
});
/* Fase 4: se publica el hash de la respuesta y el de la trampa (otro texto en pantalla). */
hashes["f4:resp"] = hash("f4:resp", f.f4.resp);
hashes["f4:trampa"] = hash("f4:trampa", f.f4.trampa);
revelar.f4 = { resp: f.f4.resp, camino: f.f4.camino, cierre: f.f4.cierre };

/* Todo lo que se explica al final va en un solo bloque AES-GCM. */
var salC = Buffer.from(f.salClave, "base64");
var clave = crypto.pbkdf2Sync(f.claveFinal, salC, ITER, 32, "sha256");
var iv = crypto.randomBytes(12);
var cif = crypto.createCipheriv("aes-256-gcm", clave, iv);
var datos = Buffer.concat([cif.update(JSON.stringify(revelar), "utf8"), cif.final(), cif.getAuthTag()]);

var secretos = {
  sal: f.sal,
  hashes: hashes,
  cifrado: { sal: f.salClave, iteraciones: ITER, iv: iv.toString("base64"), datos: datos.toString("base64") }
};
var cuerpo = "/* GENERADO por herramientas/generar.js: no se edita a mano.\n" +
  "   Solo hashes con sal y un bloque cifrado; no hay respuestas legibles. */\n" +
  "window.SECRETOS = " + JSON.stringify(secretos, null, 2) + ";\n";
fs.writeFileSync(SALIDA, cuerpo);
console.log("Escribí " + SALIDA + " (" + Object.keys(hashes).length + " hashes).");
console.log("Clave final para el proyector: " + f.claveFinal);
