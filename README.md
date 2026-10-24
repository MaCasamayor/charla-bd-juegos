# charla-bd-juegos
Juegos digitales de la charla de Base de Datos (datos inventados).

**G1 «La tarjeta clonada»**: 4 fases de 5 minutos, un celular por equipo. Web estática
(`index.html`, `datos.js`, `juegos.js`, `logica.js`, `secretos.js`, `juegos.css`), sin build
ni dependencias. Para probarla en local: `python3 -m http.server 8000` y abrir
`http://localhost:8000/` (hace falta `localhost` o `https`: la verificación usa Web Crypto).

## Cómo se protegen las respuestas
- Las respuestas correctas **no** están en el código: `secretos.js` guarda solo hashes
  SHA-256 con sal. El celular compara el hash de lo que eligió el equipo.
- Los «por qué», el camino del misterio y el cierre están cifrados con AES-GCM en
  `secretos.js`. Se abren al final, escribiendo en el celular un **código que muestra el
  proyector** (la clave se deriva de ese código con PBKDF2).
- Durante el juego el celular dice solo bien o mal. Si vence el tiempo, la fase cierra
  con 0 y no muestra nada de la solución.
- Sin servidor no hay blindaje total (el que conduce puede pedir ver el celular).

## Regenerar `secretos.js`
La fuente legible está en `herramientas/fuente.local.json` y **no se publica** (está en
`.gitignore`). La plantilla sin respuestas es `herramientas/fuente.plantilla.json`; los
datos salen de `docs/caso-saeta.md` del repo CharlaBD (secciones «Fase 1» a «Fase 4»).

1. Si no tenés la fuente: copiá la plantilla a `herramientas/fuente.local.json` y
   completá las respuestas 🔒 y los «por qué».
2. `node herramientas/generar.js` escribe `secretos.js`, y al final muestra el **código
   del proyector**. Si a la fuente le faltan `sal`, `salClave` o `claveFinal`, las inventa
   y las guarda en la fuente, así regenerar después no cambia el código.
3. Si cambian los datos visibles (ids de los 15 datos de la fase 1, filas de la fase 3,
   pares de la fase 2), también hay que tocar `datos.js` con los mismos ids.
4. `node herramientas/probar.js [URL]` corre los puntajes, los hashes, el descifrado y busca
   fugas en lo publicado (con una URL, revisa lo que sirve el servidor).

Pasos siguientes al regenerar: commitear `secretos.js` (se publica), nunca la fuente.
El código del proyector va en la lámina de la puesta en común, no en el repo.
