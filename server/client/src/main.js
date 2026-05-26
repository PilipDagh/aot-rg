import * as THREE from 'three';
import { io } from 'socket.io-client';


const ROSTER_NAMES = [
  "Yuji", "Gojo", "Megumi", "Todo", "Hakari", "Yuta", "Choso", "Mahito", 
  "Jogo", "Dagon", "Naoya", "Takaba", "Junpei", "Nanami", "Nobara", 
  "Panda", "Toji", "Mei Mei", "Geto", "Urame", "Miwa"
];


let socket, localId;
let scene, camera, renderer, clock;
let currentCharacterData = null;
const playersMeshes = {};
const ghostTrails = [];
const localInput = { w: false, a: false, s: false, d: false, shift: false };
let targetRotationX = 0, targetRotationY = 0;
let dashCooldown = 0;
const visualProjectiles = [];
const activeVFX = [];
let screenShakeIntensity = 0;


const ui = {
  charSelect: document.getElementById('char-select'),
  charGrid: document.getElementById('char-grid'),
  nameInput: document.getElementById('player-name-input'),
  hud: document.getElementById('hud'),
  hpBar: document.getElementById('hp-bar'),
  hpVal: document.getElementById('hp-val'),
  ultBar: document.getElementById('ult-bar'),
  ultVal: document.getElementById('ult-val'),
  cdDisplay: document.getElementById('cd-display'),
  deathScreen: document.getElementById('death-screen'),
  dmgContainer: document.getElementById('damage-container')
};


function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a0a0a);
  scene.fog = new THREE.FogExp2(0x1a0a0a, 0.015);


  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
  clock = new THREE.Clock();


  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('canvas-container').appendChild(renderer.domElement);


  buildEnvironment();
  setupInputListeners();
  populateCharacterGrid();


  socket = io(window.location.origin);
  setupSocketListeners();


  window.addEventListener('resize', onWindowResize);
  animate();
}


function buildEnvironment() {
  const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
  scene.add(ambientLight);


  const dirLight = new THREE.DirectionalLight(0xff4422, 1.2);
  dirLight.position.set(30, 50, 10);
  scene.add(dirLight);


  const floorGeo = new THREE.PlaneGeometry(300, 300);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);


  const grid = new THREE.GridHelper(300, 60, 0x552222, 0x221111);
  grid.position.y = 0.05;
  scene.add(grid);


  for (let i = 0; i < 48; i++) {
    const w = Math.random() * 12 + 6;
    const h = Math.random() * 35 + 10;
    const d = Math.random() * 12 + 6;
    const boxGeo = new THREE.BoxGeometry(w, h, d);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9 });
    const building = new THREE.Mesh(boxGeo, boxMat);


    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 90 + 25;
    building.position.set(Math.cos(angle) * radius, h / 2, Math.sin(angle) * radius);
    scene.add(building);


    const wireGeo = new THREE.EdgesGeometry(boxGeo);
    const wireMat = new THREE.LineBasicMaterial({ color: 0x444444 });
    const wireframe = new THREE.LineSegments(wireGeo, wireMat);
    wireframe.position.copy(building.position);
    scene.add(wireframe);
  }
}


function createProceduralHumanoid(colorHex) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.5 });
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xff0000, visible: false });


  const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), mat);
  head.position.y = 1.9;
  group.add(head);


  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.4), mat);
  torso.position.y = 1.1;
  group.add(torso);


  const limbGeo = new THREE.BoxGeometry(0.24, 0.8, 0.24);
  const lArm = new THREE.Mesh(limbGeo, mat); lArm.position.set(-0.55, 1.1, 0); group.add(lArm);
  const rArm = new THREE.Mesh(limbGeo, mat); rArm.position.set(0.55, 1.1, 0); group.add(rArm);
  const lLeg = new THREE.Mesh(limbGeo, mat); lLeg.position.set(-0.25, 0.4, 0); group.add(lLeg);
  const rLeg = new THREE.Mesh(limbGeo, mat); rLeg.position.set(0.25, 0.4, 0); group.add(rLeg);


  group.userData = { limbs: { lArm, rArm, lLeg, rLeg }, mat, flashMat };
  
  const flashMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 1.2), flashMat);
  flashMesh.position.y = 1.1;
  group.add(flashMesh);
  group.userData.flashMesh = flashMesh;


  return group;
}


function populateCharacterGrid() {
  ROSTER_NAMES.forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'char-btn';
    btn.innerText = name;
    btn.onclick = () => selectCharacter(name);
    ui.charGrid.appendChild(btn);
  });
}


function selectCharacter(characterName) {
  const nickname = ui.nameInput.value.trim() || "SORCERER";
  ui.charSelect.style.display = 'none';
  ui.hud.style.display = 'flex';
  document.body.requestPointerLock();
  socket.emit('joinGame', { name: nickname, character: characterName });
}


function setupInputListeners() {
  document.addEventListener('keydown', (e) => {
    if (ui.charSelect.style.display !== 'none') return;
    const key = e.key.toLowerCase();
    if (key === 'w') localInput.w = true;
    if (key === 'a') localInput.a = true;
    if (key === 's') localInput.s = true;
    if (key === 'd') localInput.d = true;
    if (e.key === 'Shift') localInput.shift = true;
    if (['q', 'e', 'r'].includes(key)) {
      socket.emit('useAbility', key.toUpperCase());
    }
  });


  document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'w') localInput.w = false;
    if (key === 'a') localInput.a = false;
    if (key === 's') localInput.s = false;
    if (key === 'd') localInput.d = false;
    if (e.key === 'Shift') localInput.shift = false;
  });


  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement !== document.body) return;
    targetRotationY -= e.movementX * 0.0025;
    targetRotationX -= e.movementY * 0.0025;
    targetRotationX = Math.max(-Math.PI / 3, Math.min(Math.PI / 4, targetRotationX));
  });


  document.body.addEventListener('click', () => {
    if (ui.charSelect.style.display === 'none' && document.pointerLockElement !== document.body) {
      document.body.requestPointerLock();
    }
  });
}


function setupSocketListeners() {
  socket.on('initSync', (data) => {
    localId = data.id;
    for (let id in data.players) {
      spawnNetworkPlayer(data.players[id]);
    }
  });


  socket.on('playerJoined', (pData) => {
    if (!playersMeshes[pData.id]) spawnNetworkPlayer(pData);
  });


  socket.on('playerLeft', (id) => {
    if (playersMeshes[id]) {
      scene.remove(playersMeshes[id]);
      delete playersMeshes[id];
    }
  });


  socket.on('gameStateUpdate', (state) => {
    currentCharacterData = state.players[localId];
    updateHUD();


    for (let id in state.players) {
      const serverData = state.players[id];
      let mesh = playersMeshes[id];
      if (!mesh) continue;


      if (id !== localId) {
        mesh.position.set(serverData.x, serverData.y, serverData.z);
        mesh.rotation.y = Math.atan2(serverData.dirX, serverData.dirZ);
      }


      const velocity = serverData.isDead ? 0 : 1; 
      animateHumanoidLimbs(mesh, serverData.isDead, velocity);
    }
  });


  socket.on('vfxTrigger', (data) => {
    triggerVisualVFX(data);
    if (data.key === 'R' || data.type === 'beam' || data.type === 'domain') {
      screenShakeIntensity = 1.2;
    }
  });


  socket.on('damageDealt', (data) => {
    createDamageNumber(data.amount, data.x, data.z);
    const targetMesh = playersMeshes[data.targetId];
    if (targetMesh) {
      targetMesh.userData.flashMesh.visible = true;
      setTimeout(() => { targetMesh.userData.flashMesh.visible = false; }, 150);
    }
  });


  socket.on('playerKilled', (data) => {
    if (data.victimId === localId) {
      ui.deathScreen.style.display = 'flex';
      setTimeout(() => { ui.deathScreen.style.display = 'none'; }, 3000);
    }
  });
}


function spawnNetworkPlayer(pData) {
  const mesh = createProceduralHumanoid(pData.color);
  mesh.position.set(pData.x, pData.y, pData.z);
  scene.add(mesh);
  playersMeshes[pData.id] = mesh;
}


function animateHumanoidLimbs(mesh, isDead, velocity) {
  const limbs = mesh.userData.limbs;
  if (isDead) {
    mesh.rotation.z = Math.PI / 2;
    mesh.position.y = 0.2;
    limbs.lArm.rotation.x = 0; limbs.rArm.rotation.x = 0;
    return;
  }
  
  mesh.rotation.z = 0;
  mesh.position.y = 0;
  if (velocity > 0.1) {
    const time = Date.now() * 0.009;
    limbs.lArm.rotation.x = Math.sin(time) * 0.6;
    limbs.rArm.rotation.x = -Math.sin(time) * 0.6;
    limbs.lLeg.rotation.x = -Math.sin(time) * 0.6;
    limbs.rLeg.rotation.x = Math.sin(time) * 0.6;
  } else {
    limbs.lArm.rotation.x = 0; limbs.rArm.rotation.x = 0;
    limbs.lLeg.rotation.x = 0; limbs.rLeg.rotation.x = 0;
  }
}


function processLocalMovement(dt) {
  const localMesh = playersMeshes[localId];
  if (!localMesh || !currentCharacterData || currentCharacterData.isDead) return;


  const moveVector = new THREE.Vector3();
  const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  camForward.y = 0;
  camForward.normalize();
  
  const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  camRight.y = 0;
  camRight.normalize();


  if (localInput.w) moveVector.add(camForward);
  if (localInput.s) moveVector.sub(camForward);
  if (localInput.d) moveVector.add(camRight);
  if (localInput.a) moveVector.sub(camRight);


  if (moveVector.lengthSq() > 0) {
    moveVector.normalize();
    let currentSpeed = 16;


    if (localInput.shift && dashCooldown <= 0) {
      currentSpeed = 75;
      dashCooldown = 1.2;
      spawnGhostTrail(localMesh, currentCharacterData.color);
    }


    localMesh.position.addScaledVector(moveVector, currentSpeed * dt);
    localMesh.rotation.y = Math.atan2(camForward.x, camForward.z);
  }


  if (dashCooldown > 0) dashCooldown -= dt;


  camera.position.set(localMesh.position.x, localMesh.position.y + 3.5, localMesh.position.z);
  const offset = new THREE.Vector3(0, 0, 7.5).applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(targetRotationX, targetRotationY, 0, 'YXZ')));
  camera.position.add(offset);
  camera.lookAt(localMesh.position.clone().add(new THREE.Vector3(0, 1.5, 0)));


  if (screenShakeIntensity > 0) {
    camera.position.x += (Math.random() - 0.5) * screenShakeIntensity;
    camera.position.y += (Math.random() - 0.5) * screenShakeIntensity;
    screenShakeIntensity -= dt * 3.0;
  }


  socket.emit('playerInput', {
    x: localMesh.position.x,
    z: localMesh.position.z,
    dirX: camForward.x,
    dirZ: camForward.z
  });
}


function spawnGhostTrail(mesh, color) {
  const trailGeo = new THREE.BoxGeometry(0.8, 1.8, 0.6);
  const trailMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.5 });
  const trail = new THREE.Mesh(trailGeo, trailMat);
  trail.position.copy(mesh.position).y += 1.0;
  trail.rotation.copy(mesh.rotation);
  scene.add(trail);
  ghostTrails.push({ mesh: trail, age: 0 });
}


function triggerVisualVFX(data) {
  const casterMesh = playersMeshes[data.casterId];
  if (!casterMesh) return;


  const origin = casterMesh.position.clone().add(new THREE.Vector3(0, 1.2, 0));


  if (data.type === "melee" || data.type === "melee-dash") {
    const arcGeo = new THREE.TorusGeometry(3, 0.15, 6, 24, Math.PI);
    const arcMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
    const arc = new THREE.Mesh(arcGeo, arcMat);
    arc.position.copy(origin).add(new THREE.Vector3(data.dirX * 2, 0, data.dirZ * 2));
    arc.rotation.y = Math.atan2(data.dirX, data.dirZ) + Math.PI / 2;
    scene.add(arc);
    activeVFX.push({ mesh: arc, type: 'fade', life: 0.2, maxLife: 0.2 });
  } 
  else if (data.type === "beam") {
    const length = 90;
    const beamGeo = new THREE.CylinderGeometry(1.8, 1.8, length, 12);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.9 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.rotation.x = Math.PI / 2;
    
    const container = new THREE.Group();
    container.position.copy(origin);
    container.add(beam);
    beam.position.set(0, 0, -length / 2);
    container.lookAt(origin.clone().add(new THREE.Vector3(data.dirX, 0, data.dirZ)));
    
    scene.add(container);
    activeVFX.push({ mesh: container, type: 'fade', life: 0.4, maxLife: 0.4 });
  } 
  else if (data.type === "projectile") {
    const ballGeo = new THREE.SphereGeometry(1.2, 12, 12);
    const ballMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const ball = new THREE.Mesh(ballGeo, ballMat);
    ball.position.copy(origin);
    scene.add(ball);
    visualProjectiles.push({ mesh: ball, vx: data.dirX * 40, vz: data.dirZ * 40, life: 2.0 });
  } 
  else if (data.type === "domain" || data.type === "domain-heal" || data.type === "aoe") {
    const radius = data.radius || 25;
    const domGeo = new THREE.SphereGeometry(1, 24, 24);
    const domMat = new THREE.MeshBasicMaterial({ color: data.type === "domain-heal" ? 0x00ff00 : 0xaa00bb, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    const domSphere = new THREE.Mesh(domGeo, domMat);
    domSphere.position.copy(casterMesh.position);
    scene.add(domSphere);
    activeVFX.push({ mesh: domSphere, type: 'grow', life: 0.6, maxLife: 0.6, targetScale: radius });
  }
}


function createDamageNumber(amount, x, z) {
  const div = document.createElement('div');
  div.className = 'dmg-num';
  div.innerText = `-${amount}`;
  ui.dmgContainer.appendChild(div);


  const pos3D = new THREE.Vector3(x, 2.5, z);
  
  const updatePos = () => {
    const proj = pos3D.clone().project(camera);
    if (proj.z > 1) {
      div.style.display = 'none';
      return;
    }
    const screenX = (proj.x * .5 + .5) * window.innerWidth;
    const screenY = (-(proj.y * .5) + .5) * window.innerHeight;
    div.style.left = `${screenX}px`;
    div.style.top = `${screenY}px`;
  };


  updatePos();
  
  let age = 0;
  const numInterval = setInterval(() => {
    age += 0.05;
    pos3D.y += 0.1;
    updatePos();
    if (age >= 0.8) {
      clearInterval(numInterval);
      div.remove();
    }
  }, 50);
}


function updateHUD() {
  if (!currentCharacterData) return;
  ui.hpBar.style.width = `${(currentCharacterData.hp / currentCharacterData.hpMax) * 100}%`;
  ui.hpVal.innerText = `${currentCharacterData.hp}/${currentCharacterData.hpMax}`;
  ui.ultBar.style.width = `${(currentCharacterData.ult / currentCharacterData.ultMax) * 100}%`;
  ui.ultVal.innerText = `${currentCharacterData.ult}/${currentCharacterData.ultMax}`;


  const cdText = [];
  ['Q', 'E', 'R'].forEach(k => {
    const cdTime = currentCharacterData.cooldowns[k];
    const ready = !cdTime || Date.now() >= cdTime;
    cdText.push(`${k}: ${ready ? 'READY' : Math.ceil((cdTime - Date.now()) / 1000) + 's'}`);
  });
  ui.cdDisplay.innerHTML = cdText.map(t => `<span>${t}</span>`).join('');
}


function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}


function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();


  processLocalMovement(dt);


  for (let i = ghostTrails.length - 1; i >= 0; i--) {
    const trail = ghostTrails[i];
    trail.age += dt;
    trail.mesh.material.opacity = 0.5 * (1 - trail.age / 0.4);
    if (trail.age >= 0.4) {
      scene.remove(trail.mesh);
      ghostTrails.splice(i, 1);
    }
  }


  for (let i = visualProjectiles.length - 1; i >= 0; i--) {
    const vp = visualProjectiles[i];
    vp.life -= dt;
    vp.mesh.position.x += vp.vx * dt;
    vp.mesh.position.z += vp.vz * dt;
    if (vp.life <= 0) {
      scene.remove(vp.mesh);
      visualProjectiles.splice(i, 1);
    }
  }


  for (let i = activeVFX.length - 1; i >= 0; i--) {
    const vfx = activeVFX[i];
    vfx.life -= dt;
    const progress = 1 - vfx.life / vfx.maxLife;


    if (vfx.type === 'fade') {
      if (vfx.mesh.material) vfx.mesh.material.opacity = 1 - progress;
      else vfx.mesh.children.forEach(c => c.material.opacity = 1 - progress);
    } 
    else if (vfx.type === 'grow') {
      const scale = progress * vfx.targetScale;
      vfx.mesh.scale.set(scale, scale, scale);
      vfx.mesh.material.opacity = 0.35 * (1 - progress);
    }


    if (vfx.life <= 0) {
      scene.remove(vfx.mesh);
      activeVFX.splice(i, 1);
    }
  }


  renderer.render(scene, camera);
}


init();

