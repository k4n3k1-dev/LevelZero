import * as THREE from 'three';

export class Enemy {
    constructor(scene, position, options = {}) {
        this.maxHp = options.maxHp ?? 30;
        this.hp = this.maxHp;
        this.xpValue = options.xpValue ?? 20;
        this.isDead = false;

        this.mesh = new THREE.Mesh(
            new THREE.ConeGeometry(0.5, 1.4, 6),
            new THREE.MeshStandardMaterial({ color: 0xdd3333 })
        );
        this.mesh.position.copy(position);
        this.mesh.position.y = 0.7;
        this.mesh.castShadow = true;
        scene.add(this.mesh);

        this._flashTimer = 0;
        this._baseColor = this.mesh.material.color.clone();
    }

    get position() {
        return this.mesh.position;
    }

    takeDamage(amount) {
        if (this.isDead) return;

        this.hp = Math.max(0, this.hp - amount);
        this._flashTimer = 0.15; // brief white flash on hit

        if (this.hp === 0) {
            this.isDead = true;
        }
    }

    update(delta) {
        if (this._flashTimer > 0) {
            this._flashTimer -= delta;
            const flashing = this._flashTimer > 0;
            this.mesh.material.color.set(flashing ? 0xffffff : this._baseColor);
        }
    }

    removeFromScene(scene) {
        scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}
