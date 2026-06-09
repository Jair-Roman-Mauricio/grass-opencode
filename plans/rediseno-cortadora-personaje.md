# Plan: quitar cartel al montar + rediseñar cortadora/personaje + animaciones

## Contexto

Objetivos pedidos:
1. **Quitar el cartel** "Presiona E para bajarte" que aparece mientras vas montado en la
   cortadora.
2. **Mejorar mucho el modelo 3D** del personaje y de la cortadora, con el look pulido,
   redondeado y tipo "juguete" de la imagen de referencia (cortadora roja brillante,
   ruedas gordas, volante, asiento, personaje limpio sentado al volante).
3. **Mejorar las animaciones** de montar y desmontar.

Estado actual:
- Cartel: `GameRenderer.updateMountHint` (src/renderers/webgl/GameRenderer.ts:618-634)
  pone el texto "subirte"/"bajarte"; el `div#mount-hint` está en
  src/screens/Game3DScreen.tsx:167-179.
- Cortadora: `MowerRenderer3D.build()` (src/renderers/webgl/MowerRenderer.ts) — cajas
  planas (`BoxGeometry`), sin redondeo, sin volante ni asiento.
- Personaje: `PlayerRenderer.build()` (src/renderers/webgl/PlayerRenderer.ts:46-128) —
  cuerpo/brazos/piernas con `BoxGeometry` rectos, cabeza esfera, sombrero.
- Animaciones montar/bajar: `PlayerRenderer.updateMountDismount`
  (src/renderers/webgl/PlayerRenderer.ts:160-230); pose de conducción (brazos) en el
  branch `ride` de `GameRenderer.updatePlayer` (~líneas 288-301).

## Tecnología recomendada (look "juguete" suave)

- **`RoundedBoxGeometry`** (`three/examples/jsm/geometries/RoundedBoxGeometry.js`) para
  carrocería, capó, asiento y bloques — bordes biselados = aspecto suave.
- **`CapsuleGeometry`** (incluida en three 0.160) para brazos, piernas y torso →
  extremidades redondeadas como en la referencia.
- **`TorusGeometry`** para el volante (aro) y tapacubos; **`CylinderGeometry`** de más
  segmentos para ruedas gordas.
- **`MeshStandardMaterial`** rojo plástico brillante (`roughness ~0.35`,
  `metalness ~0.1`); opcional `MeshPhysicalMaterial` con `clearcoat`.
- Mantener escalas actuales (cuerpo ~0.5×0.2×0.7, ruedas ~r0.11, personaje ~0.7 alto)
  para no afectar cámara/físicas/colisiones.

## Cambios concretos

### 1. Quitar el cartel al ir montado — `GameRenderer.updateMountHint`
- En el branch `ride`: `opacity = '0'` y **eliminar** la línea "Presiona E para bajarte".
- Conservar "Presiona E para subirte" al caminar cerca (branch `walk`, `md < 2.5`).

### 2. Rediseño de la cortadora — `MowerRenderer3D.build()`
- Carrocería/capó frontal escalonado con `RoundedBoxGeometry` rojo brillante.
- Asiento (base + respaldo) con `RoundedBoxGeometry` en color contrastante.
- Volante: `TorusGeometry` sobre columna `CylinderGeometry` inclinada, delante del
  asiento; exponer su posición para alinear las manos.
- Ruedas tipo tractor (traseras grandes, delanteras pequeñas), neumático oscuro +
  tapacubos claro.
- Detalles: escape, faro (ya existe), rejilla; redondear deck + disco de corte.
- Canasta de pasto (wireframe + caja translúcida) conservada como indicador de carga,
  reubicada detrás del asiento.
- Exponer `seatAnchor`/`wheelPos` para posicionar personaje y manos.

### 3. Rediseño del personaje — `PlayerRenderer.build()`
- Brazos/piernas/torso con `CapsuleGeometry`; cabeza esfera (proporción cartoon).
- Mantener la estructura de `parts` y pivotes para no romper `animateWalk` ni
  `updateMountDismount`.
- Paleta limpia tipo referencia; **conservar el sombrero** (rediseñado para encajar con
  el cuerpo redondeado).
- Ajustar pivotes de brazos para alcanzar el volante al conducir.

### 4. Pose de conducción — branch `ride` de `GameRenderer.updatePlayer`
- Rotar `lArm`/`rArm` para **agarrar el volante** (usar posición expuesta por la
  cortadora); leve balanceo con `ticks`. Sentar al personaje en `seatAnchor`.

### 5. Animaciones montar/desmontar — `updateMountDismount`
- Montar: (0–0.4) acercarse de lado, (0.4–0.8) subir con un pequeño hop en `y`,
  (0.8–1) girar y sentarse con brazos hacia el volante.
- Desmontar: levantarse, hop al costado y aterrizar en pose de caminar; suavizar lerp y
  orientar mirando fuera de la cortadora.
- Easing ease-out cúbico; `mountDuration` ~0.6–0.8 s.

## Archivos clave
- `src/renderers/webgl/GameRenderer.ts` — cartel, pose al volante, offset sentado.
- `src/renderers/webgl/MowerRenderer.ts` — nuevo modelo + anchors.
- `src/renderers/webgl/PlayerRenderer.ts` — modelo con cápsulas + animaciones.
- Import nuevo: `RoundedBoxGeometry` de `three/examples/jsm/geometries/RoundedBoxGeometry.js`.

## Verificación
1. `cd stone-grass-game && pnpm dev`.
2. Montar (E): no aparece "Presiona E para bajarte"; caminando cerca sí "subirte".
3. Cortadora redondeada/brillante con ruedas gordas, asiento y volante, estilo referencia.
4. Personaje suave y, al conducir, **sujeta el volante** sentado.
5. Montar/desmontar fluido (acercarse → subir con hop → sentarse, y a la inversa).
6. Sin regresiones: caminar, cortar, depositar y cámara igual.

## Decisiones confirmadas
- Carteles: **solo se quita "Presiona E para bajarte"**; se mantiene "Presiona E para
  subirte" al acercarse a la cortadora.
- Personaje: **se conserva el sombrero** (con cuerpo redondeado).
