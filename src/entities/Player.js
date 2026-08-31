import * as THREE from 'three';
import { AssetLoader } from '../systems/AssetLoader.js';

// Maps a class id (from the class-select screen) to its model + texture
// files. All four are Rig_Medium characters - Barbarian is excluded here
// because it's built for Rig_Large and would need a separate animation
// set.
const CLASS_MODELS = {
    knight: { model: './models/player/Knight.glb', texture: './models/player/knight_texture.png' },
    mage: { model: './models/player/Mage.glb', texture: './models/player/mage_texture.png' },
    rogue: { model: './models/player/Rogue.glb', texture: './models/player/rogue_texture.png' },
    ranger: { model: './models/player/Ranger.glb', texture: './models/player/ranger_texture.png' }
};

// Knight uses Rig_Medium - only load animation files for that rig.
// (Barbarian is the one built for Rig_Large - not relevant here.)
//
// General.glb is included specifically because MovementBasic.glb turned
// out to have NO plain standing-idle clip (only Jump_Idle, which looks
// like a mid-air pose when used as a standing idle) - confirmed by
// logging clip names. General.glb is where KayKit puts a proper idle.
const ANIMATION_PATHS = {
    general: './models/animations/Rig_Medium/Rig_Medium_General.glb',
    movementBasic: './models/animations/Rig_Medium/Rig_Medium_MovementBasic.glb',
    combatMelee: './models/animations/Rig_Medium/Rig_Medium_CombatMelee.glb'
};

// Exact clip names confirmed by console.log against the real files -
// see _setupAnimations(). Update these if you swap animation files.
const CLIP_NAMES = {
    run: 'Running_A',
    attack: 'Melee_1H_Attack_Slice_Horizontal'
    // idle intentionally not hardcoded here - see _setupAnimations,
    // it's picked from whatever General.glb turns out to contain.
};

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
    constructor(scene, input, characterClass = 'knight', tintColor = '#ffffff') {
        this.scene = scene;
        this.input = input;
        this.characterClass = characterClass;
        this.tintColor = tintColor;

        // Visible immediately - swapped out once the real model finishes
        // loading, so there's never a moment with nothing on screen.
        this.mesh = createPlaceholderMesh();
        this.mesh.position.set(0, 0, 0);
        scene.add(this.mesh);

        this.mixer = null;
        this.actions = {}; // populated once animations load - see _setupAnimations
        this._currentAction = null;

        this.moveSpeed = 5;
        this.rotationSpeed = 12;

        this.level = 1;
        this.xp = 0;
        this.xpToNextLevel = 100;
        this.maxHp = 100;
        this.hp = this.maxHp;

        this.attackCooldowns = {
            lightAttack: 0,
            heavyAttack: 0,
            skillAttack: 0
        };

        this._isAttacking = false;
    }

    get position() {
        return this.mesh.position;
    }

    // Call this once after construction, awaited from main.js before the
    // render loop starts (or fire-and-forget if you want the placeholder
    // to show briefly - your call).
    async loadModel(loadingManager) {
        const loader = new AssetLoader(loadingManager);
        const { model, texture: texturePath } = CLASS_MODELS[this.characterClass] ?? CLASS_MODELS.knight;

        const [gltf, texture, generalClips, movementClips, combatClips] = await Promise.all([
            loader.loadGLTF(model),
            loader.loadTexture(texturePath),
            loader.loadAnimationClips(ANIMATION_PATHS.general),
            loader.loadAnimationClips(ANIMATION_PATHS.movementBasic),
            loader.loadAnimationClips(ANIMATION_PATHS.combatMelee)
        ]);

        AssetLoader.applyTexture(gltf.scene, texture, this.tintColor);

        // Swap placeholder for the real model, keeping position/rotation
        const oldPosition = this.mesh.position.clone();
        const oldRotationY = this.mesh.rotation.y;
        this.scene.remove(this.mesh);

        this.mesh = gltf.scene;
        this.mesh.position.copy(oldPosition);
        this.mesh.rotation.y = oldRotationY;
        this.scene.add(this.mesh);

        this._setupAnimations([...generalClips, ...movementClips, ...combatClips]);
    }

    _setupAnimations(clips) {
        this.mixer = new THREE.AnimationMixer(this.mesh);

        console.log('Available animation clips:', clips.map((c) => c.name));

        const findExact = (name) =>
            clips.find((c) => c.name.toLowerCase() === name.toLowerCase());

        // Idle deliberately isn't a single hardcoded name - General.glb's
        // exact idle clip name wasn't confirmed yet, so try the most
        // likely candidates in order, and fall back to a non-Jump melee
        // idle rather than ever picking Jump_Idle by accident.
        const idleClip =
            findExact('Idle') ||
            findExact('Idle_A') ||
            findExact('Melee_Unarmed_Idle');

        const runClip = findExact(CLIP_NAMES.run);
        const attackClip = findExact(CLIP_NAMES.attack);

        if (idleClip) this.actions.idle = this.mixer.clipAction(idleClip);
        if (runClip) this.actions.run = this.mixer.clipAction(runClip);
        if (attackClip) {
            this.actions.attack = this.mixer.clipAction(attackClip);
            this.actions.attack.setLoop(THREE.LoopOnce);
            this.actions.attack.clampWhenFinished = true;
        }

        if (!idleClip || !runClip || !attackClip) {
            console.warn(
                'Missing animation(s):',
                { idleClip: !!idleClip, runClip: !!runClip, attackClip: !!attackClip },
                '- check the clip name list logged above and fix CLIP_NAMES / the idle fallbacks at the top of Player.js.'
            );
        } else {
            console.log('Idle clip resolved to:', idleClip.name);
        }

        this._playAction('idle');
    }

    _playAction(name) {
        const nextAction = this.actions[name];
        if (!nextAction || this._currentAction === nextAction) return;

        if (this._currentAction) {
            this._currentAction.fadeOut(0.15);
        }
        nextAction.reset().fadeIn(0.15).play();
        this._currentAction = nextAction;
    }

    update(delta, cameraYaw) {
        if (this.mixer) this.mixer.update(delta);

        const { forward, back, left, right } = this.input.keys;

        for (const key in this.attackCooldowns) {
            if (this.attackCooldowns[key] > 0) {
                this.attackCooldowns[key] = Math.max(0, this.attackCooldowns[key] - delta);
            }
        }

        const inputVector = new THREE.Vector2(
            (right ? 1 : 0) - (left ? 1 : 0),
            (forward ? 1 : 0) - (back ? 1 : 0)
        );

        const isMoving = inputVector.lengthSq() > 0;

        if (!this._isAttacking) {
            this._playAction(isMoving ? 'run' : 'idle');
        }

        if (!isMoving) return;
        inputVector.normalize();

        const moveDir = new THREE.Vector3(inputVector.x, 0, -inputVector.y)
            .applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);

        this.mesh.position.addScaledVector(moveDir, this.moveSpeed * delta);

        const targetAngle = Math.atan2(moveDir.x, moveDir.z);
        const currentAngle = this.mesh.rotation.y;
        let angleDiff = targetAngle - currentAngle;
        angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
        this.mesh.rotation.y += angleDiff * Math.min(1, this.rotationSpeed * delta);
    }

    canAttack(attackName) {
        return this.attackCooldowns[attackName] === 0;
    }

    // Plays the attack animation once, on top of movement state.
    playAttackAnimation() {
        if (!this.actions.attack) return;
        this._isAttacking = true;
        this._playAction('attack');

        const onFinished = () => {
            this._isAttacking = false;
            this.mixer.removeEventListener('finished', onFinished);
        };
        this.mixer.addEventListener('finished', onFinished);
    }

    triggerCooldown(attackName) {
        const cooldowns = { lightAttack: 0.4, heavyAttack: 1.0, skillAttack: 3.0 };
        this.attackCooldowns[attackName] = cooldowns[attackName] ?? 0.5;
        this.playAttackAnimation();
    }

    gainXp(amount) {
        this.xp += amount;
        while (this.xp >= this.xpToNextLevel) {
            this.xp -= this.xpToNextLevel;
            this.level += 1;
            this.xpToNextLevel = Math.round(this.xpToNextLevel * 1.25);
            this.maxHp += 10;
            this.hp = this.maxHp;
        }
    }
}
