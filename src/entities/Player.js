import * as THREE from 'three';

// Placeholder capsule mesh - swap .mesh for a loaded GLTF model later,
// everything else (movement, stats) is independent of what the mesh
// looks like.
function createPlaceholderMesh() {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.4, 1, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x4488ff })
    );
    body.position.y = 0.9;
    body.castShadow = true;
    group.add(body);

    return group;
}

export class Player {
    constructor(scene, input) {
        this.input = input;

        this.mesh = createPlaceholderMesh();
        this.mesh.position.set(0, 0, 0);
        scene.add(this.mesh);

        // Movement tuning - "snappy/arcade" feel: no acceleration ramp,
        // player is at full speed the instant a key is pressed.
        this.moveSpeed = 5; // units per second
        this.rotationSpeed = 12; // how fast the model turns to face movement direction

        // --- Progression stats ---
        this.level = 1;
        this.xp = 0;
        this.xpToNextLevel = 100;
        this.maxHp = 100;
        this.hp = this.maxHp;

        // Per-attack cooldown tracking, in seconds remaining
        this.attackCooldowns = {
            lightAttack: 0,
            heavyAttack: 0,
            skillAttack: 0
        };
    }

    get position() {
        return this.mesh.position;
    }

    // cameraYaw: the camera controller's current yaw, so "W" always
    // means "move away from the camera" regardless of orbit angle.
    update(delta, cameraYaw) {
        const { forward, back, left, right } = this.input.keys;

        // Tick down cooldowns
        for (const key in this.attackCooldowns) {
            if (this.attackCooldowns[key] > 0) {
                this.attackCooldowns[key] = Math.max(0, this.attackCooldowns[key] - delta);
            }
        }

        const inputVector = new THREE.Vector2(
            (right ? 1 : 0) - (left ? 1 : 0),
            (forward ? 1 : 0) - (back ? 1 : 0)
        );

        if (inputVector.lengthSq() === 0) return;
        inputVector.normalize();

        // Rotate the input vector by the camera's yaw so movement is
        // always relative to where the camera is looking.
        const moveDir = new THREE.Vector3(inputVector.x, 0, -inputVector.y)
            .applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);

        this.mesh.position.addScaledVector(moveDir, this.moveSpeed * delta);

        // Smoothly turn to face the movement direction
        const targetAngle = Math.atan2(moveDir.x, moveDir.z);
        const currentAngle = this.mesh.rotation.y;
        let angleDiff = targetAngle - currentAngle;
        // wrap to [-PI, PI] so it always turns the short way
        angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
        this.mesh.rotation.y += angleDiff * Math.min(1, this.rotationSpeed * delta);
    }

    canAttack(attackName) {
        return this.attackCooldowns[attackName] === 0;
    }

    // Call this when CombatSystem confirms the attack fired, to start
    // its cooldown. Cooldown lengths are a balance decision - tune freely.
    triggerCooldown(attackName) {
        const cooldowns = { lightAttack: 0.4, heavyAttack: 1.0, skillAttack: 3.0 };
        this.attackCooldowns[attackName] = cooldowns[attackName] ?? 0.5;
    }

    gainXp(amount) {
        this.xp += amount;
        while (this.xp >= this.xpToNextLevel) {
            this.xp -= this.xpToNextLevel;
            this.level += 1;
            this.xpToNextLevel = Math.round(this.xpToNextLevel * 1.25);
            this.maxHp += 10;
            this.hp = this.maxHp; // full heal on level-up - change if undesired
        }
    }
}
