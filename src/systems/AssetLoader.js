import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// One shared loader instance per type, both bound to the LoadingManager
// passed in from main.js, so the loading screen accurately tracks
// EVERYTHING being fetched (models + textures), not just some of it.
export class AssetLoader {
    constructor(loadingManager) {
        this.gltfLoader = new GLTFLoader(loadingManager);
        this.textureLoader = new THREE.TextureLoader(loadingManager);
    }

    // Returns a Promise resolving to the full GLTF result object
    // (.scene, .animations, etc.)
    loadGLTF(path) {
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(path, resolve, undefined, reject);
        });
    }

    loadTexture(path) {
        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                path,
                (texture) => {
                    texture.colorSpace = THREE.SRGBColorSpace;
                    texture.flipY = false; // glTF convention - avoids upside-down textures
                    resolve(texture);
                },
                undefined,
                reject
            );
        });
    }

    // KayKit ships animation clips as separate .glb files containing NO
    // mesh, just animation data for a given rig (Rig_Medium/Rig_Large).
    // This loads one and returns its .animations array, ready to hand
    // to an AnimationMixer built from a DIFFERENT model's scene, as
    // long as both share the same underlying bone/rig names.
    async loadAnimationClips(path) {
        const gltf = await this.loadGLTF(path);
        return gltf.animations;
    }

    // Applies a texture to every mesh in a loaded model's scene graph.
    // KayKit characters use a single shared atlas texture per character,
    // so this is a blanket apply, not per-mesh lookup.
    static applyTexture(root, texture) {
        root.traverse((node) => {
            if (node.isMesh) {
                node.material = new THREE.MeshStandardMaterial({ map: texture });
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });
    }
}
