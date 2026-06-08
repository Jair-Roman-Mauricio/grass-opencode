# Fix v2: el pasto desaparece / se "buguea" al recargar o volver al menú

## Diagnóstico real (por qué el plan anterior no bastó)

El bug **no es de persistencia**: en la captura no se ve ni una sola brizna de pasto,
solo el suelo. Los modelos 3D del pasto **no se renderizan**. Hay 3 fallos de fondo en
`src/renderers/webgl/GrassRenderer.ts`:

1. **Frustum culling con bounding sphere cacheado (causa principal).**
   El pasto es un único `InstancedMesh` que cubre todo el campo. Three.js (r0.160)
   calcula el *bounding sphere* del mesh **una sola vez** —en el primer render, cuando
   `count` todavía es 0 o muy bajo por la animación escalonada— y lo **cachea sin
   recalcularlo** al ir añadiendo instancias. Resultado: la esfera de culling queda
   diminuta (cerca del origen) y, cuando la cámara no mira hacia ahí, **el mesh entero
   se descarta** y el pasto desaparece. Es intermitente y se rompe al recargar/volver al
   menú porque la cámara queda en otra posición (sigue a la cortadora restaurada).

2. **Carga del pasto frágil y dependiente del timing.**
   `initGrassMap()` no crea las briznas; encola tiles con `delay` y los va creando en
   `updateAnimation()` a lo largo de ~2 s, dependiendo del render loop y de
   `performance.now()`. Cualquier desincronía (remontaje en StrictMode, pestaña en
   segundo plano, el culling de arriba) deja el campo a medio poblar o vacío.

3. **Sway en CPU, caro y con deriva.**
   `updateSway()` recorre ~8000 instancias **cada frame** haciendo
   `getMatrixAt → decompose → compose → setMatrixAt`, y **lee su propia rotación ya
   modificada** para volver a sumarle sway → la rotación deriva con el tiempo (el pasto
   se va "acostando"). Es costoso y poco robusto.

## Tecnología recomendada (mejores prácticas Three.js 2025)

Mover el pasto a un enfoque **GPU-driven**, que es lo estándar para campos de pasto:

- **`InstancedMesh` + sway en el *vertex shader*** mediante un uniform `uTime` y atributos
  por instancia (fase/velocidad/altura). El viento se calcula en GPU con `sin()` por
  brizna. Esto elimina por completo el bucle de matrices en CPU (`updateSway`) y la
  deriva, y baja el coste a casi cero (un draw call). Se puede lograr sin material
  custom usando `MeshStandardMaterial` + `onBeforeCompile` para inyectar el sway en el
  `transform`/`begin_vertex`, conservando sombras y luces actuales.
- **Culling correcto:** para un campo pequeño (30×30, un solo draw call) lo robusto y
  barato es `mesh.frustumCulled = false`; alternativamente fijar un `boundingSphere`
  manual que cubra todo el campo. Así el pasto nunca se descarta entero.
- **Carga inmediata:** crear todas las instancias de golpe en `initGrassMap` (son ~8 k,
  se construyen en pocos ms). La animación de "crecer" se vuelve un escalado en el
  shader/uniform, opcional, sin condicionar la *existencia* del pasto.
- (Futuro / no necesario ahora) Para campos mucho mayores: `BatchedMesh` + LOD y
  densidad por distancia. Sobra para 30×30.

> Nota: el frustum culling automático de Three.js es bueno cuando hay **muchos meshes
> separados**; aquí el pasto es **un solo mesh gigante**, por lo que cullearlo es
> "todo o nada" y por eso conviene desactivarlo en este mesh concreto.

## Cambios concretos

### 1. Arreglar culling + carga inmediata — `src/renderers/webgl/GrassRenderer.ts`
- Tras crear `this.instancedMesh`: `this.instancedMesh.frustumCulled = false`.
- En `initGrassMap`, sustituir la cola animada inicial por creación inmediata:
  recorrer las claves de `grass` y llamar `this.createTile(r, c, h)` para cada `h > 0`;
  dejar `this.isAnimating = false` y `this.animationQueue = []`.
- Mantener `animateAreaExpansion()` (la animación al comprar áreas) tal cual: con
  `frustumCulled = false` las instancias nuevas también se ven.

### 2. Sway en GPU — `src/renderers/webgl/GrassRenderer.ts`
- Añadir atributos por instancia: `aPhase`, `aSpeed`, `aAmp` (un
  `InstancedBufferAttribute` por cada uno) en vez de guardarlos en `bladeInfos` para CPU.
- En el material, usar `material.onBeforeCompile`:
  - inyectar `uniform float uTime;` y los `attribute`/`varying` necesarios,
  - en el vertex shader desplazar la punta de la brizna con
    `sin(uTime * aSpeed + aPhase) * aAmp * height` en X/Z (más efecto cuanto más alto el
    vértice, usando `position.y`).
- En `render()` (GameRenderer), actualizar solo `material.uniforms.uTime.value`
  (o un `{ value }` capturado en el closure de `onBeforeCompile`) **una vez por frame**.
- **Eliminar `updateSway()` por CPU** y su llamada en
  `src/renderers/webgl/GameRenderer.ts:153`. `updateTile` (corte) sigue tocando solo la
  escala Y de la instancia cortada, no toda la malla.

### 3. Robustez de ciclo de vida
- `clearAll()` ya elimina y hace `dispose()` del mesh y material: mantener. Verificar
  que tras volver al menú y reentrar se crea un mesh nuevo con `frustumCulled = false`.
- (Opcional, ya cubierto en plan previo) persistir el `grassMap` en el estado guardado
  para que las zonas cortadas se conserven; con este fix v2 el pasto ya **se ve** bien,
  la persistencia es independiente y complementaria.

## Archivos clave
- `src/renderers/webgl/GrassRenderer.ts` — culling off, carga inmediata, sway en shader,
  atributos por instancia, quitar `updateSway` CPU.
- `src/renderers/webgl/GameRenderer.ts` — actualizar uniform `uTime` por frame; quitar
  la llamada a `updateSway`.

## Verificación
1. `cd stone-grass-game && pnpm dev`.
2. Al entrar, el pasto aparece **al instante** y cubre todo el campo.
3. Mover la cortadora a una esquina alejada del origen → el pasto **no desaparece**
   (antes se cullaba el mesh entero).
4. Recargar la página (F5) y volver al menú y reentrar → el pasto siempre se ve.
5. Dejar el juego corriendo varios minutos → el pasto ondea suave y **no se "acuesta"**
   (sin deriva del sway).
6. Comprobar en DevTools/Perf que ya no hay el bucle por-instancia de matrices cada
   frame (CPU más baja con el campo lleno).

## Fuentes
- [How to Make The Fluffiest Grass With Three.js — Codrops](https://tympanus.net/codrops/2025/02/04/how-to-make-the-fluffiest-grass-with-three-js/)
- [Optimizing Instanced Grass in Three.js — three.js forum](https://discourse.threejs.org/t/performance-optimizing-3m-instanced-grass-in-three-js/81286)
- [What's the most performant way to make grass? — three.js forum](https://discourse.threejs.org/t/whats-the-most-performant-way-to-make-grass/39774)
- [Simple instanced grass example — three.js forum](https://discourse.threejs.org/t/simple-instanced-grass-example/26694)
- [Instancing — al-ro.github.io](https://al-ro.github.io/projects/grass/)
