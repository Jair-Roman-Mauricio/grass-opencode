# Plan: subir la calidad 3D con modelos profesionales GLTF/GLB

## Contexto

El 3D se ve "demasiado simple" porque **todo es geometría primitiva** (cápsulas,
`RoundedBoxGeometry`, cilindros) con **materiales planos** y sin reflejos de entorno,
oclusión ambiental ni tone mapping. El plan procedural anterior ya se aplicó
(`MowerRenderer.ts`, `PlayerRenderer.ts` con cápsulas) pero el techo de calidad de ese
enfoque es bajo. El cartel "Presiona E para bajarte" ya se quitó.

**Decisión:** reemplazar la cortadora y el personaje por **modelos profesionales CC0 en
GLTF/GLB** (personaje con rig + animaciones), descargando los assets, y complementar con
una mejora de calidad de render (environment map + tone mapping) para que los materiales
PBR de los GLTF luzcan bien.

## Assets (CC0 — se descargan a `public/models/`)

- **Personaje (con rig y animaciones):** Quaternius *Ultimate Animated Character Pack*
  (CC0, glTF) — incluye clips Idle, Walk, **Sitting**, etc. → `public/models/character.glb`.
  - https://quaternius.com/packs/ultimatedanimatedcharacter.html
- **Cortadora:** modelo CC0 *riding lawn mower* de Poly Pizza → `public/models/mower.glb`.
  - https://poly.pizza/search/lawn%20mower
- Durante la implementación se intenta `curl` de las URLs directas a `public/models/`.
  Si el entorno bloquea la descarga, el código queda cableado + **fallback procedural**
  (los modelos actuales) y se entregan los links para soltarlos manualmente.
- Añadir `public/models/CREDITS.md` con la atribución CC0.

## Enfoque

### 1. Cargador de modelos — nuevo `src/renderers/webgl/AssetLoader.ts`
- Envuelve `GLTFLoader` (`three/examples/jsm/loaders/GLTFLoader.js`), **precarga y
  cachea** `{ scene, animations }` por nombre. Preferir GLB sin DRACO (evita hostear el
  decoder).
- Exponer `preloadModels(): Promise<void>` que carga cortadora + personaje una sola vez.

### 2. Pantalla de carga — `src/screens/Game3DScreen.tsx`
- Antes de instanciar `WebGLRenderer`, `await AssetLoader.preloadModels()` mostrando un
  estado "Cargando…"; luego construir el mundo. Evita pop-in y condiciones de carrera.

### 3. Cortadora — `MowerRenderer3D.build()`
- Clonar la escena precargada de `mower.glb`, **normalizar** (centrar + escalar al tamaño
  actual ~0.7 de largo, orientar frente a −Z), `traverse` para `castShadow/receiveShadow`.
- Recalcular `seatAnchor` y `steeringWheelPos` desde el bounding box del modelo (u
  offsets afinados al modelo elegido) para sentar al personaje y poner manos al volante.
- Conservar el indicador de carga de pasto (cesto wireframe) como overlay opcional.
- Mantener `build()` con **fallback procedural** si el GLB no cargó.

### 4. Personaje con rig — `PlayerRenderer`
- Cargar `character.glb`; crear `THREE.AnimationMixer`; mapear clips por nombre
  (Idle / Walk / Sitting|Drive).
- Sustituir la animación manual de extremidades:
  - caminar → clip **Walk** (timeScale según `speed`), **Idle** al parar;
  - conducir → clip **Sitting/Drive**;
  - montar/desmontar → **crossfade** entre Walk y Sitting (fade ~0.3 s) mientras se
    mantiene la transición de posición/rotación del grupo de `updateMountDismount`
    (mover el modelo del suelo al asiento y viceversa).
- Normalizar escala/orientación; sombras con `traverse`.
- Conservar la máquina de estados `person` (walk/mount/ride/dismount) y la interfaz
  `group` para no romper `GameRenderer`.

### 5. Integración en `GameRenderer`
- En `render()`: `this.playerRenderer.mixer?.update(dt)` cada frame.
- **Eliminar el hack de pose** (rotaciones de brazos en el branch `ride` de
  `updatePlayer`, ~líneas 288-301) que causaba los brazos hacia arriba: ahora lo cubre
  el clip Sitting.
- Calidad de render en `init()`:
  - `renderer.toneMapping = THREE.ACESFilmicToneMapping`, `toneMappingExposure ≈ 1.0`.
  - `scene.environment = PMREM(RoomEnvironment)`
    (`three/examples/jsm/environments/RoomEnvironment.js` + `PMREMGenerator`) → reflejos
    suaves y GI sobre los materiales PBR de los GLTF.
  - Mantener sol + sombras PCFSoft (suavizar si hace falta).
- (Fuera de alcance por ahora: post-procesado SSAO/bloom; con envmap+tonemapping+GLTF
  ya hay un gran salto. Se puede añadir después.)

## Archivos clave
- Nuevos: `src/renderers/webgl/AssetLoader.ts`, `public/models/mower.glb`,
  `public/models/character.glb`, `public/models/CREDITS.md`.
- `src/renderers/webgl/MowerRenderer.ts` — cargar GLB + anchors + fallback.
- `src/renderers/webgl/PlayerRenderer.ts` — GLB con rig + AnimationMixer + clips.
- `src/renderers/webgl/GameRenderer.ts` — mixer.update, quitar hack de pose, envmap +
  tone mapping.
- `src/screens/Game3DScreen.tsx` — preload + pantalla de carga.
- Sin dependencias nuevas: `GLTFLoader`/`RoomEnvironment`/`PMREMGenerator` vienen con
  `three` 0.160.

## Verificación
1. `cd stone-grass-game && pnpm dev`.
2. Aparece "Cargando…" y luego la cortadora y el personaje se ven como **modelos GLTF
   detallados** (no cajas), con reflejos suaves por el environment map.
3. Caminar reproduce el clip Walk; acercarse + E → **crossfade suave a sentado** en el
   asiento; conduciendo se ve la pose de sentado/volante (**sin brazos hacia arriba**);
   E → desmontar con crossfade de vuelta a caminar.
4. No aparece "Presiona E para bajarte" (ya hecho); sí "subirte" al acercarse.
5. Si faltan los `.glb`, el juego sigue funcionando con los modelos procedurales
   (fallback).
6. FPS aceptable; cortar pasto, depositar y cámara sin regresiones.

## Fuentes
- [Quaternius — Ultimate Animated Character Pack (CC0)](https://quaternius.com/packs/ultimatedanimatedcharacter.html)
- [Quaternius — sitio de assets gratis](https://quaternius.com/)
- [Poly Pizza — búsqueda "lawn mower" (CC0)](https://poly.pizza/search/lawn%20mower)
