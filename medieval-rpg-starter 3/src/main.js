import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x88a9c3);
scene.fog = new THREE.FogExp2(0x88a9c3, 0.0085);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 400);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Lighting (Day/Night & Weather)
const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x3b4d2b, 0.65);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xfff1d6, 2.0);
sunLight.position.set(45, 70, 35);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 200;
const d = 70;
sunLight.shadow.camera.left = -d;
sunLight.shadow.camera.right = d;
sunLight.shadow.camera.top = d;
sunLight.shadow.camera.bottom = -d;
scene.add(sunLight);

// Procedural Heightmap Terrain
function terrainHeight(x, z) {
  return (
    Math.sin(x * 0.035) * Math.cos(z * 0.035) * 3.2 +
    Math.sin(x * 0.09 + 1.2) * Math.sin(z * 0.08) * 1.1
  );
}

const terrainGeo = new THREE.PlaneGeometry(260, 260, 120, 120);
terrainGeo.rotateX(-Math.PI / 2);
const pos = terrainGeo.attributes.position;
for (let i = 0; i < pos.count; i++) {
  const x = pos.getX(i);
  const z = pos.getZ(i);
  pos.setY(i, terrainHeight(x, z));
}
terrainGeo.computeVertexNormals();
const terrainMat = new THREE.MeshStandardMaterial({ color: 0x3f5a36, roughness: 0.92, metalness: 0.05 });
const terrain = new THREE.Mesh(terrainGeo, terrainMat);
terrain.receiveShadow = true;
scene.add(terrain);

// Medieval Keep Landmark
function buildKeep(x, z) {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x5c6066, roughness: 0.88 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x3a261e, roughness: 0.85 });
  const baseY = terrainHeight(x, z);

  const keep = new THREE.Mesh(new THREE.BoxGeometry(14, 14, 14), stoneMat);
  keep.position.y = 7;
  keep.castShadow = true;
  keep.receiveShadow = true;
  group.add(keep);

  const offsets = [[-7, -7], [7, -7], [-7, 7], [7, 7]];
  for (const [ox, oz] of offsets) {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.5, 18, 12), stoneMat);
    tower.position.set(ox, 9, oz);
    tower.castShadow = true;
    tower.receiveShadow = true;
    group.add(tower);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 4.5, 12), roofMat);
    roof.position.set(ox, 20.2, oz);
    roof.castShadow = true;
    group.add(roof);
  }
  group.position.set(x, baseY - 0.5, z);
  scene.add(group);
}
buildKeep(0, -55);

// Procedural Forest (Placeholder until .glb trees from assets/models/environment/ are loaded)
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.95 });
const leafMat = new THREE.MeshStandardMaterial({ color: 0x2d4c24, roughness: 0.85 });
for (let i = 0; i < 90; i++) {
  const angle = Math.random() * Math.PI * 2;
  const radius = 14 + Math.random() * 95;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  if (Math.hypot(x, z + 55) < 16) continue;
  const y = terrainHeight(x, z);
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 3.4, 7), trunkMat);
  trunk.position.y = 1.7;
  trunk.castShadow = true;
  const crown = new THREE.Mesh(new THREE.ConeGeometry(1.9, 5.2, 8), leafMat);
  crown.position.y = 5.2;
  crown.castShadow = true;
  tree.add(trunk, crown);
  tree.position.set(x, y, z);
  scene.add(tree);
}

// First-person Viewmodel (Sword & Shield; replaceable with .glb via GLTFLoader)
const weaponRig = new THREE.Group();
camera.add(weaponRig);
scene.add(camera);

const steelMat = new THREE.MeshStandardMaterial({ color: 0xbec5ce, metalness: 0.85, roughness: 0.28 });
const gripMat = new THREE.MeshStandardMaterial({ color: 0x3b2618, roughness: 0.8 });

const swordGroup = new THREE.Group();
const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.82, 0.015), steelMat);
blade.position.y = 0.48;
const guard = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.04), steelMat);
guard.position.y = 0.07;
const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.18, 8), gripMat);
hilt.position.y = -0.03;
swordGroup.add(blade, guard, hilt);
swordGroup.position.set(0.38, -0.32, -0.55);
swordGroup.rotation.set(-0.25, -0.15, 0.12);
weaponRig.add(swordGroup);

const shieldGroup = new THREE.Group();
const shieldMesh = new THREE.Mesh(
  new THREE.BoxGeometry(0.38, 0.52, 0.03),
  new THREE.MeshStandardMaterial({ color: 0x6b2c2c, roughness: 0.75 })
);
shieldGroup.add(shieldMesh);
shieldGroup.position.set(-0.42, -0.28, -0.52);
shieldGroup.rotation.set(0, 0.35, 0);
weaponRig.add(shieldGroup);

// Optional GLB Loader Hook (loads ./assets/models/weapons/longsword.glb if present)
const gltfLoader = new GLTFLoader();
gltfLoader.load(
  './assets/models/weapons/longsword.glb',
  (gltf) => {
    swordGroup.clear();
    const model = gltf.scene;
    model.scale.setScalar(0.55);
    swordGroup.add(model);
    document.getElementById('status').textContent = 'Загружена модель longsword.glb';
  },
  undefined,
  () => { /* Fallback procedural sword stays active until user drops .glb files */ }
);

// Player Controller & Combat State
const keys = {};
let yaw = 0;
let pitch = 0;
let velocityY = 0;
let isGrounded = true;
let stamina = 100;
let swingTimer = 0;
let isBlocking = false;
let weatherMode = 0;
const playerPos = new THREE.Vector3(0, 5, 16);

const weatherPresets = [
  { name: 'Ясно · День', bg: 0x88a9c3, fog: 0.008, sun: 2.0, hemi: 0.65 },
  { name: 'Туманный рассвет', bg: 0x9b8d7e, fog: 0.022, sun: 1.2, hemi: 0.5 },
  { name: 'Ночная буря', bg: 0x0e1420, fog: 0.018, sun: 0.35, hemi: 0.25 }
];

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyT') {
    weatherMode = (weatherMode + 1) % weatherPresets.length;
    const p = weatherPresets[weatherMode];
    scene.background.setHex(p.bg);
    scene.fog.color.setHex(p.bg);
    scene.fog.density = p.fog;
    sunLight.intensity = p.sun;
    hemiLight.intensity = p.hemi;
    document.getElementById('weatherLabel').textContent = `Погода: ${p.name}`;
  }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

renderer.domElement.addEventListener('click', () => {
  if (document.pointerLockElement !== renderer.domElement) {
    renderer.domElement.requestPointerLock();
  }
});

window.addEventListener('mousedown', (e) => {
  if (document.pointerLockElement !== renderer.domElement) return;
  if (e.button === 0 && swingTimer <= 0 && stamina >= 15) {
    swingTimer = 0.32;
    stamina = Math.max(0, stamina - 15);
  }
  if (e.button === 2) isBlocking = true;
});
window.addEventListener('mouseup', (e) => {
  if (e.button === 2) isBlocking = false;
});
window.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== renderer.domElement) return;
  yaw -= e.movementX * 0.0022;
  pitch = Math.max(-1.4, Math.min(1.4, pitch - e.movementY * 0.0022));
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
const forward = new THREE.Vector3();
const right = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  const sprinting = (keys['ShiftLeft'] || keys['ShiftRight']) && stamina > 5;
  const speed = sprinting ? 12.5 : 7.0;
  if (sprinting && (keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD'])) {
    stamina = Math.max(0, stamina - 20 * dt);
  } else {
    stamina = Math.min(100, stamina + 14 * dt);
  }
  document.getElementById('staminaBar').style.width = `${stamina}%`;

  forward.set(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
  right.set(Math.cos(yaw), 0, -Math.sin(yaw)).normalize();

  const move = new THREE.Vector3();
  if (keys['KeyW']) move.add(forward);
  if (keys['KeyS']) move.sub(forward);
  if (keys['KeyD']) move.add(right);
  if (keys['KeyA']) move.sub(right);
  if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed * dt);
  playerPos.add(move);

  const groundY = terrainHeight(playerPos.x, playerPos.z) + 1.75;
  if (keys['Space'] && isGrounded) {
    velocityY = 7.5;
    isGrounded = false;
  }
  velocityY -= 20 * dt;
  playerPos.y += velocityY * dt;
  if (playerPos.y <= groundY) {
    playerPos.y = groundY;
    velocityY = 0;
    isGrounded = true;
  }

  camera.position.copy(playerPos);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;

  // Sword swing & shield block animation
  if (swingTimer > 0) {
    swingTimer = Math.max(0, swingTimer - dt);
    const p = Math.sin((1 - swingTimer / 0.32) * Math.PI);
    swordGroup.rotation.set(-0.25 - p * 1.15, -0.15 + p * 0.7, 0.12 + p * 0.45);
  } else {
    swordGroup.rotation.set(-0.25, -0.15, 0.12);
  }
  const targetShieldX = isBlocking ? -0.16 : -0.42;
  const targetShieldY = isBlocking ? -0.16 : -0.28;
  shieldGroup.position.x += (targetShieldX - shieldGroup.position.x) * 12 * dt;
  shieldGroup.position.y += (targetShieldY - shieldGroup.position.y) * 12 * dt;

  renderer.render(scene, camera);
}
animate();
