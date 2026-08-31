import * as THREE from 'three';

// Orbits the camera around a target (the player) based on mouse-drag
// input. Yaw (horizontal) is also what movement direction is computed
// from in Player.js, so "forward" always means "away from the camera",
// same convention as SAO/MMO-style third-person games.
export class OrbitCameraController {
    constructor(camera, input, options = {}) {
        this.camera = camera;
        this.input = input;

        this.distance = options.distance ?? 6;
        this.minDistance = options.minDistance ?? 3;
        this.maxDistance = options.maxDistance ?? 12;

        this.yaw = options.yaw ?? 0;           // radians, around Y axis
        this.pitch = options.pitch ?? 0.4;      // radians, clamped below
        this.minPitch = 0.1;
        this.maxPitch = 1.3;

        this.sensitivity = options.sensitivity ?? 0.005;

        // Smoothed position the camera actually renders from, so quick
        // target movement doesn't feel jittery.
        this._smoothedTarget = new THREE.Vector3();
        this._targetInitialised = false;

        this._bindScroll();
    }

    _bindScroll() {
        window.addEventListener('wheel', (e) => {
            this.distance = THREE.MathUtils.clamp(
                this.distance + e.deltaY * 0.01,
                this.minDistance,
                this.maxDistance
            );
        });
    }

    // targetPosition: THREE.Vector3, usually the player's position
    // (offset upward a bit so the camera looks at chest/head height,
    // not the player's feet).
    update(targetPosition, delta) {
        const { dx, dy } = this.input.consumeMouseDelta();

        this.yaw -= dx * this.sensitivity;
        this.pitch = THREE.MathUtils.clamp(
            this.pitch - dy * this.sensitivity,
            this.minPitch,
            this.maxPitch
        );

        if (!this._targetInitialised) {
            this._smoothedTarget.copy(targetPosition);
            this._targetInitialised = true;
        } else {
            // Exponential smoothing, framerate-independent
            const smoothing = 1 - Math.pow(0.001, delta);
            this._smoothedTarget.lerp(targetPosition, smoothing);
        }

        const offset = new THREE.Vector3(
            Math.sin(this.yaw) * Math.cos(this.pitch),
            Math.sin(this.pitch),
            Math.cos(this.yaw) * Math.cos(this.pitch)
        ).multiplyScalar(this.distance);

        this.camera.position.copy(this._smoothedTarget).add(offset);
        this.camera.lookAt(
            this._smoothedTarget.x,
            this._smoothedTarget.y + 1,
            this._smoothedTarget.z
        );
    }
}
