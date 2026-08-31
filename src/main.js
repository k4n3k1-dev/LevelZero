import * as THREE from 'three';
import { InputManager } from './systems/InputManager.js';
import { OrbitCameraController } from './systems/OrbitCameraController.js';
import { CombatSystem } from './systems/CombatSystem.js';
import { Player } from './entities/Player.js';
import { Enemy } from './entities/Enemy.js';

// ---------------------------------------------------------------------
// Suggested structure as the project grows (create these yourself):
//   src/scenes/       - one module per level (Level1.js, Level2.js, ...)
//   src/shaders/       - your custom vertex/fragment shader GLSL files
//
// Current systems (all under src/systems/ and src/entities/):
//   InputManager          - WASD + mouse-drag orbit + numbered attack keys
//   OrbitCameraController  - mouse-orbit third-person camera
//   Player                 - camera-relative movement, level/XP/HP stats
//   Enemy                  - HP, hit-flash, dies at 0 HP
//   CombatSystem            - auto-targets nearest enemy in range on attack press
// ---------------------------------------------------------------------

const loadingScreen = document.getElementById('loading-screen');
const loadingBar = document.getElementById('loading-bar');
const loadingText = document.getElementById('loading-text');
const hud = document.getElementById('hud');
const hudLevel = document.getElementById('hud-level');
const hudHpBar = document.getElementById('hud-hp-bar');
const creditsButton = document.getElementById('credits-button');
const creditsScreen = document.getElementById('credits-screen');
const creditsClose = document.getElementById('credits-close');

// --- Loading manager -----------------------------------------------
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
};

// --- Core scene setup -------------------------------------------------
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

// --- Lighting -----------------------------------------------------
// Replace/extend per level - each level should have its own lighting
// setup to match its visual identity (see project brief).
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(5, 10, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);

// --- Ground (placeholder - swap per level) ---------------------------
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x3a7d44 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// --- Input / Camera / Player -----------------------------------------
const input = new InputManager(canvas);
const cameraController = new OrbitCameraController(camera, input, { distance: 6 });
const player = new Player(scene, input);

// --- A few test enemies so you can try combat immediately -----------
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
    onEnemyKilled: (enemy) => {
        console.log('Enemy killed, player is now level', player.level);
    }
});

// Trigger the loading manager even though nothing is actually being
// loaded yet, so the loading screen resolves on page load. Remove this
// once you're loading real assets (models/textures) through
// loadingManager-bound loaders - onLoad will fire naturally then.
loadingManager.itemStart('bootstrap');
loadingManager.itemEnd('bootstrap');

// --- Resize handling --------------------------------------------------
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Credits screen ---------------------------------------------------
creditsButton.addEventListener('click', () => creditsScreen.classList.remove('hidden'));
creditsClose.addEventListener('click', () => creditsScreen.classList.add('hidden'));

// --- HUD update -----------------------------------------------------
function updateHud() {
    hudLevel.textContent = `Lv. ${player.level}`;
    hudHpBar.style.width = `${(player.hp / player.maxHp) * 100}%`;
}

// --- Animation loop -----------------------------------------------
const clock = new THREE.Clock();

function animate() {
    const delta = Math.min(clock.getDelta(), 0.1); // clamp to avoid huge jumps on tab-switch

    player.update(delta, cameraController.yaw);
    combatSystem.update(delta);
    cameraController.update(player.position, delta);
    updateHud();

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

animate();
