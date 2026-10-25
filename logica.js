/* Lógica pura del juego G1: puntajes, hashes y descifrado.
   No toca el DOM, así se prueba desde Node (herramientas/probar.js).
   Las respuestas correctas no están acá ni en ningún archivo publicado:
   solo hay hashes con sal (secretos.js, generado por herramientas/generar.js). */
(function (raiz) {
  "use strict";
  var L = {};

  /* ---------- puntajes ---------- */
  /* Escala de {minimo, puntos}: devuelve los puntos del tramo más alto que se alcanza. */
  L.puntosPorEscala = function (n, escala) {
    var r = 0;
    escala.forEach(function (p) { if (n >= p.minimo && p.puntos > r) r = p.puntos; });
    return r;
  };
  /* Fase 3: máx(0, mín(3, encontradas − falsos − 1)) */
  L.puntosF3 = function (encontradas, falsos) {
    return Math.max(0, Math.min(3, encontradas - falsos - 1));
  };
  /* Fase 4: 3 si acierta, −1 por pista y −1 por respuesta mal, piso 0.
     El +1 al primer equipo lo anuncia el que conduce: acá no se calcula. */
  L.puntosF4 = function (acerto, pistas, errores, base, costo) {
    if (!acerto) return 0;
    return Math.max(0, base - (pistas + errores) * costo);
  };

  /* ---------- hashes con sal ---------- */
  function subtle() {
    var c = raiz.crypto;
    if (!c || !c.subtle) throw new Error("Este navegador no tiene Web Crypto (hace falta https).");
    return c.subtle;
  }
  function aHex(buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (b) { return (b < 16 ? "0" : "") + b.toString(16); }).join("");
  }
  L.sha256 = function (texto) {
    return subtle().digest("SHA-256", new TextEncoder().encode(texto)).then(aHex);
  };
  /* Qué se hashea: sal | clave de la pregunta | respuesta. Mismo formato en generar.js. */
  L.hashRespuesta = function (sal, pregunta, respuesta) {
    return L.sha256(sal + "|" + pregunta + "|" + respuesta);
  };
  /* ¿Coincide lo elegido con el hash publicado? */
  L.coincide = function (secretos, pregunta, respuesta) {
    return L.hashRespuesta(secretos.sal, pregunta, respuesta).then(function (h) { return h === secretos.hashes[pregunta]; });
  };

  /* ---------- descifrado (AES-GCM, clave por PBKDF2 desde el código del proyector) ---------- */
  L.normalizarCodigo = function (t) { return String(t || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); };
  function deB64(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  L.descifrar = function (secretos, codigo) {
    var c = secretos.cifrado, s = subtle();
    return s.importKey("raw", new TextEncoder().encode(L.normalizarCodigo(codigo)), "PBKDF2", false, ["deriveKey"])
      .then(function (base) {
        return s.deriveKey({ name: "PBKDF2", salt: deB64(c.sal), iterations: c.iteraciones, hash: "SHA-256" },
          base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
      })
      .then(function (k) { return s.decrypt({ name: "AES-GCM", iv: deB64(c.iv) }, k, deB64(c.datos)); })
      .then(function (buf) { return JSON.parse(new TextDecoder().decode(buf)); });
  };

  raiz.LOGICA = L;
  if (typeof module !== "undefined" && module.exports) module.exports = L;
})(typeof window !== "undefined" ? window : globalThis);
