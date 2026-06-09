import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'

export interface LoadedModel {
  scene: THREE.Group
  animations: THREE.AnimationClip[]
}

// Modelos GLTF a precargar. Vacío: todos los modelos se generan por CÓDIGO
// (procedural en Three.js), no se descargan assets. Si en el futuro se quiere usar
// un .glb, basta añadir su ruta aquí y el renderer correspondiente lo usará.
const MODEL_URLS: Record<string, string> = {}

class AssetLoaderImpl {
  private loader = new GLTFLoader()
  private cache: Record<string, LoadedModel | null> = {}
  private preloaded = false

  /** Precarga todos los modelos una sola vez. Nunca rechaza: los fallos quedan como null. */
  async preloadModels(): Promise<void> {
    if (this.preloaded) return
    await Promise.all(
      Object.entries(MODEL_URLS).map(async ([key, url]) => {
        try {
          const gltf = await this.loader.loadAsync(url)
          this.cache[key] = { scene: gltf.scene, animations: gltf.animations }
        } catch (e) {
          console.warn(`[AssetLoader] no se pudo cargar "${key}" (${url}); se usará fallback procedural.`, e)
          this.cache[key] = null
        }
      })
    )
    this.preloaded = true
  }

  /** Devuelve el modelo cacheado o null si no está disponible. */
  get(key: string): LoadedModel | null {
    return this.cache[key] ?? null
  }

  /**
   * Clona la escena de un modelo para usarla en una instancia nueva.
   * Usa SkeletonUtils.clone para clonar correctamente los modelos con rig
   * (huesos + skinned meshes + morph targets).
   */
  cloneScene(key: string): THREE.Group | null {
    const model = this.cache[key]
    if (!model) return null
    return cloneSkeleton(model.scene) as THREE.Group
  }
}

export const assetLoader = new AssetLoaderImpl()
