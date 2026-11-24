import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x88a9c3);
scene.fog = new THREE.FogExp2(0x88a9c3, 0.008);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 400);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// --- Lighting & Weather ---
const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x3b4d2b, 0.65);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xfff1d6, 2.0);
sunLight.position.set(45, 70, 35);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
const d = 75;
sunLight.shadow.camera.left = -d;
sunLight.shadow.camera.right = d;
sunLight.shadow.camera.top = d;
sunLight.shadow.camera.bottom = -d;
scene.add(sunLight);

// --- Terrain ---
function terrainHeight(x, z) {
  return (
    Math.sin(x * 0.035) * Math.cos(z * 0.035) * 3.2 +
    Math.sin(x * 0.09 + 1.2) * Math.sin(z * 0.08) * 1.1
  );
}

const terrainGeo = new THREE.PlaneGeometry(280, 280, 128, 128);
terrainGeo.rotateX(-Math.PI / 2);
const pos = terrainGeo.attributes.position;
for (let i = 0; i < pos.count; i++) {
  pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
}
terrainGeo.computeVertexNormals();
const terrain = new THREE.Mesh(
  terrainGeo,
  new THREE.MeshStandardMaterial({ color: 0x3f5a36, roughness: 0.92, metalness: 0.05 })
);
terrain.receiveShadow = true;
scene.add(terrain);

// --- Medieval Keep ---
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

  for (const [ox, oz] of [[-7, -7], [7, -7], [-7, 7], [7, 7]]) {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.5, 18, 12), stoneMat);
    tower.position.set(ox, 9, oz);
    tower.castShadow = true;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 4.5, 12), roofMat);
    roof.position.set(ox, 20.2, oz);
    roof.castShadow = true;
    group.add(tower, roof);
  }
  group.position.set(x, baseY - 0.5, z);
  scene.add(group);
}
buildKeep(0, -55);

// --- GLB Asset Manifest Loader with Procedural Fallbacks ---
const gltfLoader = new GLTFLoader();
const loadedGLB = {};

async function loadManifestAssets() {
  try {
    const res = await fetch('./assets/manifest.json');
    if (!res.ok) return;
    const manifest = await res.json();
    const entries = [
      ...Object.entries(manifest.weapons || {}).map(([k, v]) => [`weapon:${k}`, v]),
      ...Object.entries(manifest.characters || {}).map(([k, v]) => [`char:${k}`, v]),
      ...Object.entries(manifest.environment || {}).map(([k, v]) => [`env:${k}`, v])
    ];
    for (const [key, url] of entries) {
      gltfLoader.load(
        url,
        (gltf) => {
          loadedGLB[key] = gltf.scene;
          if (key === 'weapon:longsword' && state.equippedWeapon === 'longsword') {
            equipWeaponMesh('longsword');
          }
          showToast(`Загружена 3D-модель: ${key}`);
        },
        undefined,
        () => { /* Keep procedural mesh if .glb file not added yet */ }
      );
    }
  } catch {
    /* Running without manifest or offline */
  }
}

// --- Environment: Trees & Boulders ---
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.95 });
const leafMat = new THREE.MeshStandardMaterial({ color: 0x2d4c24, roughness: 0.85 });
const rockMat = new THREE.MeshStandardMaterial({ color: 0x676b70, roughness: 0.9 });

for (let i = 0; i < 85; i++) {
  const angle = (i * 2.39996) % (Math.PI * 2);
  const radius = 15 + ((i * 17) % 95);
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

for (let i = 0; i < 24; i++) {
  const angle = (i * 1.7) % (Math.PI * 2);
  const radius = 12 + ((i * 29) % 85);
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1 + (i % 3) * 0.4, 1), rockMat);
  boulder.position.set(x, terrainHeight(x, z) + 0.5, z);
  boulder.castShadow = true;
  boulder.receiveShadow = true;
  scene.add(boulder);
}

// --- Inventory & Equipment ---
const state = {
  hp: 100,
  maxHp: 100,
  stamina: 100,
  gold: 25,
  kills: 0,
  equippedWeapon: 'longsword',
  armorReduction: 0.15,
  inventory: [
    { id: 'longsword', name: 'Длинный меч', type: 'weapon', damage: 22, speed: 0.32, equipped: true },
    { id: 'battleaxe', name: 'Боевой топор', type: 'weapon', damage: 30, speed: 0.46, equipped: false },
    { id: 'warhammer', name: 'Боевой молот', type: 'weapon', damage: 35, speed: 0.52, equipped: false },
    { id: 'plate_cuirass', name: 'Латная кираса (25%)', type: 'armor', defense: 0.25, equipped: false },
    { id: 'potion', name: 'Зелье лечения (+35 HP)', type: 'consumable', count: 2 }
  ]
};

// --- Player Viewmodel ---
const weaponRig = new THREE.Group();
camera.add(weaponRig);
scene.add(camera);

const swordGroup = new THREE.Group();
swordGroup.position.set(0.38, -0.32, -0.55);
swordGroup.rotation.set(-0.25, -0.15, 0.12);
weaponRig.add(swordGroup);

function equipWeaponMesh(weaponId) {
  swordGroup.clear();
  const glb = loadedGLB[`weapon:${weaponId}`];
  if (glb) {
    const clone = glb.clone();
    clone.scale.setScalar(0.55);
    swordGroup.add(clone);
    return;
  }
  const steel = new THREE.MeshStandardMaterial({ color: 0xc2c8d1, metalness: 0.85, roughness: 0.25 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x4b2e1b, roughness: 0.8 });
  const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.22, 8), wood);
  hilt.position.y = -0.02;
  swordGroup.add(hilt);

  if (weaponId === 'longsword') {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.84, 0.015), steel);
    blade.position.y = 0.48;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.04), steel);
    guard.position.y = 0.08;
    swordGroup.add(blade, guard);
  } else if (weaponId === 'battleaxe') {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.72, 8), wood);
    shaft.position.y = 0.32;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.03), steel);
    head.position.set(0.08, 0.58, 0);
    swordGroup.add(shaft, head);
  } else {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.75, 8), wood);
    shaft.position.y = 0.34;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.14), steel);
    head.position.set(0, 0.64, 0);
    swordGroup.add(shaft, head);
  }
}
equipWeaponMesh('longsword');

const shieldGroup = new THREE.Group();
const shieldMesh = new THREE.Mesh(
  new THREE.BoxGeometry(0.38, 0.52, 0.03),
  new THREE.MeshStandardMaterial({ color: 0x6b2c2c, roughness: 0.75 })
);
shieldGroup.add(shieldMesh);
shieldGroup.position.set(-0.42, -0.28, -0.52);
shieldGroup.rotation.set(0, 0.35, 0);
weaponRig.add(shieldGroup);

// --- Knight Mesh Builder (used for Enemies & AI Companion) ---
function createKnightMesh(armorHex, capeHex) {
  const root = new THREE.Group();
  const armorMat = new THREE.MeshStandardMaterial({ color: armorHex, metalness: 0.75, roughness: 0.32 });
  const capeMat = new THREE.MeshStandardMaterial({ color: capeHex, roughness: 0.85 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.95, 0.45), armorMat);
  torso.position.y = 1.25;
  torso.castShadow = true;

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.46, 0.42), armorMat);
  head.position.y = 2.02;
  head.castShadow = true;

  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.08, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x111111 })
  );
  visor.position.set(0, 2.02, 0.21);

  const cape = new THREE.Mesh(new THREE.BoxGeometry(0.66, 1.05, 0.05), capeMat);
  cape.position.set(0, 1.15, -0.26);
  cape.rotation.x = 0.08;

  const sword = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.95, 0.03),
    new THREE.MeshStandardMaterial({ color: 0xd0d5dd, metalness: 0.85, roughness: 0.2 })
  );
  sword.position.set(0.48, 1.25, 0.35);
  sword.rotation.x = Math.PI / 3;

  root.add(torso, head, visor, cape, sword);
  return root;
}

// --- Friendly AI Companion & Villager NPC ---
const companion = {
  mesh: createKnightMesh(0x4b749f, 0x1f4e78),
  pos: new THREE.Vector3(-3, 0, 12),
  hp: 140,
  attackCd: 0
};
scene.add(companion.mesh);

const villager = {
  mesh: createKnightMesh(0x7c6244, 0x4d3b27),
  pos: new THREE.Vector3(6, 0, 6)
};
scene.add(villager.mesh);

// --- Enemy Knights ---
const enemies = [];
function spawnEnemy(x, z) {
  const mesh = createKnightMesh(0x2a2d34, 0x7a1c1c);
  const y = terrainHeight(x, z);
  mesh.position.set(x, y, z);
  scene.add(mesh);
  enemies.push({
    mesh,
    pos: new THREE.Vector3(x, y, z),
    hp: 80,
    maxHp: 80,
    attackCd: 0,
    hitFlash: 0,
    alive: true
  });
}

spawnEnemy(14, -10);
spawnEnemy(-16, -20);
spawnEnemy(4, -36);
spawnEnemy(-10, -45);

// --- Toast & UI Helpers ---
let toastTimer = 0;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  toastTimer = 2.4;
}

function updateHUD() {
  document.getElementById('hpBar').style.width = `${(state.hp / state.maxHp) * 100}%`;
  document.getElementById('hpText').textContent = `${Math.ceil(state.hp)} / ${state.maxHp}`;
  document.getElementById('staminaBar').style.width = `${state.stamina}%`;
  document.getElementById('staminaText').textContent = `${Math.ceil(state.stamina)} / 100`;
  document.getElementById('killsCount').textContent = state.kills;
  document.getElementById('goldCount').textContent = state.gold;
}

function renderInventory() {
  const grid = document.getElementById('invGrid');
  grid.innerHTML = '';
  const activeWeapon = state.inventory.find((i) => i.id === state.equippedWeapon);
  document.getElementById('invStats').textContent =
    `Урон: ${activeWeapon ? activeWeapon.damage : 20} · Броня: ${Math.round(state.armorReduction * 100)}%`;

  for (const item of state.inventory) {
    const div = document.createElement('div');
    div.className = `inv-item ${item.equipped ? 'equipped' : ''}`;
    const meta =
      item.type === 'weapon' ? `Урон ${item.damage}` :
      item.type === 'armor' ? `Защита ${Math.round(item.defense * 100)}%` :
      `Осталось: ${item.count}`;
    div.innerHTML = `
      <div>
        <div class="inv-name">${item.name}</div>
        <div class="inv-meta">${meta}</div>
      </div>
      <div class="inv-badge">${item.equipped ? 'Надето' : ''}</div>
    `;
    div.onclick = () => {
      if (item.type === 'weapon') {
        state.inventory.forEach((x) => { if (x.type === 'weapon') x.equipped = false; });
        item.equipped = true;
        state.equippedWeapon = item.id;
        equipWeaponMesh(item.id);
        showToast(`Экипировано: ${item.name}`);
      } else if (item.type === 'armor') {
        item.equipped = !item.equipped;
        state.armorReduction = item.equipped ? item.defense : 0.15;
        showToast(item.equipped ? 'Надета латная кираса' : 'Кираса снята');
      } else if (item.type === 'consumable' && item.count > 0) {
        item.count--;
        state.hp = Math.min(state.maxHp, state.hp + 35);
        showToast('Использовано зелье (+35 HP)');
      }
      renderInventory();
      updateHUD();
    };
    grid.appendChild(div);
  }
}

// --- Input & Controls ---
const keys = {};
let yaw = 0;
let pitch = 0;
let velocityY = 0;
let isGrounded = true;
let swingTimer = 0;
let isBlocking = false;
let invOpen = false;
let weatherMode = 0;
const playerPos = new THREE.Vector3(0, 5, 18);

const weatherPresets = [
  { name: 'Ясно · День', bg: 0x88a9c3, fog: 0.008, sun: 2.0, hemi: 0.65 },
  { name: 'Туманный рассвет', bg: 0x9b8d7e, fog: 0.022, sun: 1.2, hemi: 0.5 },
  { name: 'Ночная буря', bg: 0x0e1420, fog: 0.018, sun: 0.35, hemi: 0.25 }
];

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyI') {
    invOpen = !invOpen;
    document.getElementById('inventoryModal').classList.toggle('open', invOpen);
    if (invOpen) {
      document.exitPointerLock?.();
      renderInventory();
    }
  }
  if (e.code === 'KeyT') {
    weatherMode = (weatherMode + 1) % weatherPresets.length;
    const p = weatherPresets[weatherMode];
    scene.background.setHex(p.bg);
    scene.fog.color.setHex(p.bg);
    scene.fog.density = p.fog;
    sunLight.intensity = p.sun;
    hemiLight.intensity = p.hemi;
    document.getElementById('weatherLabel').textContent = `Погода: ${p.name} · Спутник рядом`;
  }
  if (e.code === 'KeyE') {
    if (playerPos.distanceTo(villager.pos) < 4.5) {
      showToast('Житель: «Рыцари Чёрного ордена у замка! Возьми 10 золота.»');
      state.gold += 10;
      updateHUD();
    } else {
      const pot = state.inventory.find((i) => i.id === 'potion');
      if (pot && pot.count > 0 && state.hp < state.maxHp) {
        pot.count--;
        state.hp = Math.min(state.maxHp, state.hp + 35);
        showToast('Зелье лечения (+35 HP)');
        updateHUD();
      }
    }
  }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

renderer.domElement.addEventListener('click', () => {
  if (!invOpen && document.pointerLockElement !== renderer.domElement) {
    renderer.domElement.requestPointerLock();
  }
});

window.addEventListener('mousedown', (e) => {
  if (invOpen || document.pointerLockElement !== renderer.domElement) return;
  const activeWeapon = state.inventory.find((i) => i.id === state.equippedWeapon);
  if (e.button === 0 && swingTimer <= 0 && state.stamina >= 15) {
    swingTimer = activeWeapon ? activeWeapon.speed : 0.32;
    state.stamina = Math.max(0, state.stamina - 15);
    performPlayerAttack(activeWeapon ? activeWeapon.damage : 22);
  }
  if (e.button === 2) isBlocking = true;
});
window.addEventListener('mouseup', (e) => { if (e.button === 2) isBlocking = false; });
window.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('mousemove', (e) => {
  if (invOpen || document.pointerLockElement !== renderer.domElement) return;
  yaw -= e.movementX * 0.0022;
  pitch = Math.max(-1.4, Math.min(1.4, pitch - e.movementY * 0.0022));
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function performPlayerAttack(damage) {
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const toEnemy = enemy.pos.clone().sub(playerPos);
    toEnemy.y = 0;
    const dist = toEnemy.length();
    if (dist < 3.6 && toEnemy.normalize().dot(new THREE.Vector3(dir.x, 0, dir.z).normalize()) > 0.35) {
      enemy.hp -= damage;
      enemy.hitFlash = 0.15;
      showToast(`Попадание! -${damage} HP (осталось ${Math.max(0, enemy.hp)})`);
      if (enemy.hp <= 0) {
        enemy.alive = false;
        scene.remove(enemy.mesh);
        state.kills += 1;
        state.gold += 15;
        showToast('Вражеский рыцарь повержен! +15 золота');
      }
      updateHUD();
    }
  }
}

// --- Main Loop ---
const clock = new THREE.Clock();
const forward = new THREE.Vector3();
const right = new THREE.Vector3();

loadManifestAssets();
updateHUD();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) document.getElementById('toast').classList.remove('show');
  }

  // Player Movement
  if (!invOpen) {
    const sprinting = (keys['ShiftLeft'] || keys['ShiftRight']) && state.stamina > 5;
    const speed = sprinting ? 12.5 : 7.0;
    if (sprinting && (keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD'])) {
      state.stamina = Math.max(0, state.stamina - 20 * dt);
    } else {
      state.stamina = Math.min(100, state.stamina + 14 * dt);
    }

    forward.set(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
    right.set(Math.cos(yaw), 0, -Math.sin(yaw)).normalize();
    const move = new THREE.Vector3();
    if (keys['KeyW']) move.add(forward);
    if (keys['KeyS']) move.sub(forward);
    if (keys['KeyD']) move.add(right);
    if (keys['KeyA']) move.sub(right);
    if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed * dt);
    playerPos.add(move);
  }

  const groundY = terrainHeight(playerPos.x, playerPos.z) + 1.75;
  if (!invOpen && keys['Space'] && isGrounded) {
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

  // Viewmodel Animation
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

  // Villager idle placement
  villager.pos.y = terrainHeight(villager.pos.x, villager.pos.z);
  villager.mesh.position.copy(villager.pos);

  // AI Companion follows player and fights nearby enemies
  let nearestEnemy = null;
  let nearestDist = 18;
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const dToComp = enemy.pos.distanceTo(companion.pos);
    if (dToComp < nearestDist) {
      nearestDist = dToComp;
      nearestEnemy = enemy;
    }
  }
  const compTarget = nearestEnemy ? nearestEnemy.pos : playerPos.clone().add(new THREE.Vector3(-2.5, 0, 2.5));
  const toCompTarget = compTarget.clone().sub(companion.pos);
  toCompTarget.y = 0;
  if (toCompTarget.length() > 2.2) {
    toCompTarget.normalize();
    companion.pos.addScaledVector(toCompTarget, 4.6 * dt);
    companion.mesh.rotation.y = Math.atan2(toCompTarget.x, toCompTarget.z);
  }
  companion.pos.y = terrainHeight(companion.pos.x, companion.pos.z);
  companion.mesh.position.copy(companion.pos);

  if (companion.attackCd > 0) companion.attackCd -= dt;
  if (nearestEnemy && nearestDist < 2.6 && companion.attackCd <= 0) {
    companion.attackCd = 1.4;
    nearestEnemy.hp -= 12;
    if (nearestEnemy.hp <= 0) {
      nearestEnemy.alive = false;
      scene.remove(nearestEnemy.mesh);
      state.kills += 1;
      state.gold += 15;
      showToast('Спутник добил врага! +15 золота');
    }
  }

  // Enemy Knights AI
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    if (enemy.attackCd > 0) enemy.attackCd -= dt;
    const toPlayer = playerPos.clone().sub(enemy.pos);
    toPlayer.y = 0;
    const dist = toPlayer.length();
    if (dist < 24 && dist > 2.2) {
      toPlayer.normalize();
      enemy.pos.addScaledVector(toPlayer, 3.6 * dt);
      enemy.mesh.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
    } else if (dist <= 2.3 && enemy.attackCd <= 0) {
      enemy.attackCd = 1.6;
      const rawDmg = 14;
      const dmg = isBlocking ? rawDmg * 0.25 : rawDmg * (1 - state.armorReduction);
      state.hp = Math.max(0, state.hp - dmg);
      if (state.hp <= 0) {
        state.hp = state.maxHp;
        playerPos.set(0, 5, 18);
        showToast('Вы пали в бою — возрождение у лагеря');
      }
    }
    enemy.pos.y = terrainHeight(enemy.pos.x, enemy.pos.z);
    enemy.mesh.position.copy(enemy.pos);
  }

  updateHUD();
  renderer.render(scene, camera);
}
animate();
