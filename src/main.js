import * as THREE from 'three';
import { InputManager } from './systems/InputManager.js';
import { OrbitCameraController } from './systems/OrbitCameraController.js';
import { CombatSystem } from './systems/CombatSystem.js';
import { LevelManager } from './systems/LevelManager.js';
import { MiniMap } from './systems/MiniMap.js';
import { SaveSystem, saveCheckpoint, applySaveToPlayer } from './systems/SaveSystem.js';
import { Player } from './entities/Player.js';
import { Enemy } from './entities/Enemy.js';

// ---------------------------------------------------------------------
// Suggested structure as the project grows (create these yourself):
//   src/scenes/       - one module per level/zone (Level1.js, Level2.js, ...)
//                        Currently all 3 zones share one scene setup below -
//                        splitting into real per-zone modules (different
//                        geometry/lighting/enemies per zone) is the next
//                        big step, not yet done here.
//   src/shaders/       - your custom vertex/fragment shader GLSL files
//
// Current systems:
//   InputManager           - WASD + mouse-drag orbit + numbered attack keys
//   OrbitCameraController   - mouse-orbit third-person camera
//   CombatSystem             - auto-targets nearest enemy in range on attack press
//   LevelManager              - character-level -> zone unlock thresholds (1/40/105)
//   MiniMap                    - 2D top-down overlay showing player/enemies/POIs
//   SaveSystem                  - localStorage-based checkpoint save (single device only)
//   Player / Enemy                - see their own files
// ---------------------------------------------------------------------

const classSelectScreen = document.getElementById('class-select-screen');
const classOptionButtons = document.querySelectorAll('.class-option');
const tintOptionButtons = document.querySelectorAll('.tint-option');
const startAdventureButton = document.getElementById('start-adventure-button');
const continueSaveButton = document.getElementById('continue-save-button');
const loadingScreen = document.getElementById('loading-screen');
const loadingBar = document.getElementById('loading-bar');
const loadingText = document.getElementById('loading-text');
const hud = document.getElementById('hud');
const hudLevel = document.getElementById('hud-level');
const hudHpBar = document.getElementById('hud-hp-bar');
const creditsButton = document.getElementById('credits-button');
const creditsScreen = document.getElementById('credits-screen');
const creditsClose = document.getElementById('credits-close');
const minimapCanvas = document.getElementById('minimap');
const checkpointToast = document.getElementById('checkpoint-toast');

// --- Class-select / continue-save gate ---------------------------------
// Nothing below this point runs until the player picks a class (or loads
// a save). This is the local stand-in for "register and pick a role" -
// see README for why a real multi-user account system isn't part of
// this build (the LAMP server can't run a backend - see brief section 5).
let pendingSave = null;
let selectedClass = null;
let selectedTint = '#ffffff';

if (SaveSystem.hasSave()) {
    pendingSave = SaveSystem.load();
    continueSaveButton.classList.remove('hidden');
    continueSaveButton.textContent = `Continue as ${pendingSave.characterClass} (Lv. ${pendingSave.level})`;
}

classOptionButtons.forEach((button) => {
    button.addEventListener('click', () => {
        selectedClass = button.dataset.class;
        classOptionButtons.forEach((b) => b.classList.remove('selected'));
        button.classList.add('selected');
        startAdventureButton.classList.remove('hidden');
    });
});

tintOptionButtons.forEach((button) => {
    button.addEventListener('click', () => {
        selectedTint = button.dataset.tint;
        tintOptionButtons.forEach((b) => b.classList.remove('selected'));
        button.classList.add('selected');
    });
});
// Default to the first (white/no tint) swatch being visibly selected
tintOptionButtons[0]?.classList.add('selected');

startAdventureButton.addEventListener('click', () => {
    if (!selectedClass) return;
    startGame(selectedClass, selectedTint, null);
});

continueSaveButton.addEventListener('click', () => {
    startGame(pendingSave.characterClass, pendingSave.tintColor ?? '#ffffff', pendingSave);
});

function startGame(characterClass, tintColor, saveData) {
    classSelectScreen.classList.add('hidden');
    loadingScreen.classList.remove('hidden');
    initGame(characterClass, tintColor, saveData);
}

// ---------------------------------------------------------------------
// Everything below only runs once a class is chosen - wrapped in a
// function rather than top-level code so nothing (rendering, asset
// loading) starts before that decision is made.
// ---------------------------------------------------------------------
function initGame(characterClass, tintColor, saveData) {
    // --- Loading manager ---------------------------------------------
    const loadingManager = new THREE.LoadingManager();

    loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
        const pct = Math.round((itemsLoaded / itemsTotal) * 100);
        loadingBar.style.width = `${pct}%`;
        loadingText.textContent = `Loading... ${pct}%`;
    };

    loadingManager.onLoad = () => {
        loadingScreen.classList.add('hidden');
        hud.classList.remove('hidden');
        creditsButton.classList.remove('hidden');
        minimapCanvas.classList.remove('hidden');
    };

    // --- Core scene setup ---------------------------------------------
    const canvas = document.getElementById('app');

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

    const camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    // --- Lighting -------------------------------------------------
    // TODO: swap per zone to match visual identity (forest daylight /
    // crypt torchlight / storm-lit sky throne) - currently one fixed
    // daylight setup regardless of zone.
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(5, 10, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    scene.add(sun);

    // --- Ground (placeholder - swap per zone) ---------------------------
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(60, 60),
        new THREE.MeshStandardMaterial({ color: 0x3a7d44 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // --- A checkpoint "town" marker - walk near it to save ---------------
    // Just a visible marker in-world for now; swap for an actual town
    // structure/prefab later. Position also feeds the minimap POI below.
    const checkpointPosition = new THREE.Vector3(10, 0, 10);
    const checkpointMarker = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 1.5, 0.2, 16),
        new THREE.MeshStandardMaterial({ color: 0xffd24a, emissive: 0x554400 })
    );
    checkpointMarker.position.copy(checkpointPosition);
    checkpointMarker.position.y = 0.1;
    scene.add(checkpointMarker);

    const CHECKPOINT_RADIUS = 3;
    let checkpointCooldown = 0;

    // --- Input / Camera / Player -----------------------------------------
    const input = new InputManager(canvas);
    const cameraController = new OrbitCameraController(camera, input, { distance: 6 });
    const player = new Player(scene, input, characterClass, tintColor);

    if (saveData) {
        applySaveToPlayer(player, saveData);
    }

    // --- Level/zone gating -------------------------------------------
    const levelManager = new LevelManager();
    let currentZoneId = saveData?.currentZoneId ?? 1;
    let highestUnlockedZoneId = levelManager.getHighestUnlockedZone(player.level).id;

    // --- Minimap --------------------------------------------------
    const minimap = new MiniMap(minimapCanvas, {
        worldRange: 60,
        pointsOfInterest: [
            { x: checkpointPosition.x, z: checkpointPosition.z, color: '#ffd24a' }
        ]
    });

    // --- A few test enemies (stand-ins for "bots") -----------------------
    // TODO: give these actual AI (patrol/chase/attack) - right now they're
    // stationary targets, same as the original skeleton.
    const enemies = [
        new Enemy(scene, new THREE.Vector3(3, 0, -3), { maxHp: 30, xpValue: 20 }),
        new Enemy(scene, new THREE.Vector3(-4, 0, -5), { maxHp: 30, xpValue: 20 }),
        new Enemy(scene, new THREE.Vector3(0, 0, -8), { maxHp: 50, xpValue: 35 })
    ];

    const combatSystem = new CombatSystem({
        player,
        enemies,
        scene,
        input,
        onEnemyKilled: () => {
            const newlyUnlocked = levelManager.getHighestUnlockedZone(player.level).id;
            if (newlyUnlocked > highestUnlockedZoneId) {
                highestUnlockedZoneId = newlyUnlocked;
                const zoneInfo = levelManager.getZoneInfo(newlyUnlocked);
                console.log(`Zone unlocked: ${zoneInfo.name} (reached character level ${player.level})`);
                // TODO: show an actual in-game "New Zone Unlocked" banner here
            }
        }
    });

    player.loadModel(loadingManager).catch((err) => {
        console.error('Failed to load player model - check that the file paths in Player.js match your public/models folder exactly (case-sensitive):', err);
    });

    // --- Resize handling ------------------------------------------------
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // --- Credits screen ---------------------------------------------------
    creditsButton.addEventListener('click', () => creditsScreen.classList.remove('hidden'));
    creditsClose.addEventListener('click', () => creditsScreen.classList.add('hidden'));

    // --- HUD update -------------------------------------------------
    function updateHud() {
        hudLevel.textContent = `Lv. ${player.level}`;
        hudHpBar.style.width = `${(player.hp / player.maxHp) * 100}%`;
    }

    // --- Checkpoint / save handling -----------------------------------
    function showCheckpointToast() {
        checkpointToast.classList.remove('hidden');
        checkpointToast.style.opacity = '1';
        clearTimeout(showCheckpointToast._timeout);
        showCheckpointToast._timeout = setTimeout(() => {
            checkpointToast.style.opacity = '0';
            setTimeout(() => checkpointToast.classList.add('hidden'), 400);
        }, 1500);
    }

    function updateCheckpoint(delta) {
        if (checkpointCooldown > 0) {
            checkpointCooldown -= delta;
            return;
        }
        const distance = player.position.distanceTo(checkpointPosition);
        if (distance <= CHECKPOINT_RADIUS) {
            saveCheckpoint(player, currentZoneId, characterClass, tintColor);
            showCheckpointToast();
            checkpointCooldown = 10; // seconds - avoid re-saving every frame while standing there
        }
    }

    // --- Animation loop -----------------------------------------------
    const clock = new THREE.Clock();

    function animate() {
        const delta = Math.min(clock.getDelta(), 0.1);

        player.update(delta, cameraController.yaw);
        combatSystem.update(delta);
        cameraController.update(player.position, delta);
        updateCheckpoint(delta);
        updateHud();
        minimap.render(
            player.position,
            combatSystem.enemies.map((e) => e.position)
        );

        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    }

    animate();
}
