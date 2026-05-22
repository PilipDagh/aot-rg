import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { io } from 'socket.io-client';

let gameStarted = false;
let renderDistance = 1000;
let lookSensitivity = 1.0;

// Keybind Config (Ready for customization later)
const binds = { forward: 'w', back: 's', left: 'a', right: 'd', jump: ' ', grapple: 'q', shift: 'b', nextTitan: ']', prevTitan: '[' };

// UI Elements
document.getElementById('playBtn').addEventListener('click', () => {
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('ui').style.display = 'block';
    gameStarted = true;
});

document.getElementById('settingsBtn').addEventListener('click', () => {
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('settingsMenu').style.display = 'flex';
});

document.getElementById('closeSettingsBtn').addEventListener('click', () => {
    document.getElementById('settingsMenu').style.display = 'none';
    document.getElementById('mainMenu').style.display = 'flex';
});

document.getElementById('renderDist').addEventListener('input', (e) => {
    renderDistance = e.target.value;
    document.getElementById('renderVal').innerText = renderDistance;
    camera.far = renderDistance;
    camera.updateProjectionMatrix();
    scene.fog = new THREE.Fog(0x87CEEB, renderDistance * 0.5, renderDistance); // Adds fog so map doesn't just cut off
});

// --- 1. NETWORK SETUP ---
const socket = io();

// --- SPINAL FLUID SYSTEM ---
const fluids = {}; // Store fluid meshes
const fluidGeo = new THREE.CylinderGeometry(0.2, 0.2, 1, 16);
const fluidMat = new THREE.MeshStandardMaterial({ 
    color: 0x00ff00, 
    emissive: 0x00ff00, 
    emissiveIntensity: 0.5 
});

socket.on('updateFluids', (serverFluids) => {
    // Remove old fluids from scene
    Object.values(fluids).forEach(mesh => scene.remove(mesh));
    for (let key in fluids) delete fluids[key];

    // Add new fluids
    Object.keys(serverFluids).forEach(id => {
        const mesh = new THREE.Mesh(fluidGeo, fluidMat);
        mesh.position.set(serverFluids[id].x, serverFluids[id].y, serverFluids[id].z);
        scene.add(mesh);
        fluids[id] = mesh;
    });
});

socket.on('titanAcquired', (titanName) => {
    alert(`YOU INHERITED THE ${titanName.toUpperCase()} TITAN! Press 'B' to shift (Coming in Chunk 4)`);
    // We will add the actual UI for this later!
});

socket.on('systemMessage', (msg) => {
    alert(msg);
});

// --- 2. THREE.JS SCENE SETUP ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(20, 50, 20);
scene.add(light);
scene.add(new THREE.AmbientLight(0x606060));

// --- 3. CANNON.JS PHYSICS SETUP ---
const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -20, 0) // Strong gravity for fast AoT falling
});

// Physics Material (makes the player slide a bit, not stick to walls)
const defaultMaterial = new CANNON.Material('default');
const defaultContactMaterial = new CANNON.ContactMaterial(defaultMaterial, defaultMaterial, {
    friction: 0.1, restitution: 0.0
});
world.addContactMaterial(defaultContactMaterial);

// --- 4. ENVIRONMENT (Floor & Buildings) ---
// Floor Graphics
const floorGeo = new THREE.PlaneGeometry(200, 200);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x228B22 });
const floorMesh = new THREE.Mesh(floorGeo, floorMat);
floorMesh.rotation.x = -Math.PI / 2;
scene.add(floorMesh);

// Floor Physics
const floorBody = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Plane(),
    material: defaultMaterial
});
floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(floorBody);

// --- GIANT CIRCULAR WALLS ---
const wallRadius = 400; // Huge map!
const wallHeight = 50;
const wallThickness = 10;
const segments = 36; // 36 blocks to make a circle

const wallGeo = new THREE.BoxGeometry(wallThickness, wallHeight, (wallRadius * 2 * Math.PI) / segments + 5);
const wallMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brownish stone

for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    
    // Calculate position on the circle
    const x = Math.cos(angle) * wallRadius;
    const z = Math.sin(angle) * wallRadius;

    // Three.js Mesh
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    wallMesh.position.set(x, wallHeight / 2, z);
    wallMesh.rotation.y = -angle; // Face inward
    scene.add(wallMesh);

    // Cannon.js Physics Body
    const wallBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Box(new CANNON.Vec3(wallThickness/2, wallHeight/2, ((wallRadius * 2 * Math.PI) / segments + 5)/2)),
        position: new CANNON.Vec3(x, wallHeight / 2, z),
        material: defaultMaterial
    });
    // Convert Three.js Euler rotation to Cannon.js Quaternion
    wallBody.quaternion.setFromEuler(0, -angle, 0);
    world.addBody(wallBody);
}

// Add some "Buildings" to swing from
const buildings = [];
const buildingGeo = new THREE.BoxGeometry(10, 40, 10);
const buildingMat = new THREE.MeshStandardMaterial({ color: 0x888888 });

for(let i = 0; i < 5; i++) {
    const mesh = new THREE.Mesh(buildingGeo, buildingMat);
    mesh.position.set((Math.random() - 0.5) * 100, 20, (Math.random() - 0.5) * 100 - 20);
    scene.add(mesh);
    buildings.push(mesh); // Store for raycasting

    const body = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Box(new CANNON.Vec3(5, 20, 5)),
        position: new CANNON.Vec3(mesh.position.x, mesh.position.y, mesh.position.z),
        material: defaultMaterial
    });
    world.addBody(body);
}

// --- 5. PLAYER SETUP ---
// Player Graphics
const myGeometry = new THREE.BoxGeometry(1, 2, 1);
const myMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff });
const myPlayerMesh = new THREE.Mesh(myGeometry, myMaterial);
scene.add(myPlayerMesh);

let myOwnedTitans = [];
let myActiveTitan = null;
let amITitan = false;

// Base sizes
const humanSize = new CANNON.Vec3(0.5, 1, 0.5);
const titanSize = new CANNON.Vec3(5, 10, 5); // 10x bigger!

// Player Physics
const playerBody = new CANNON.Body({
    mass: 70, // 70kg person
    shape: new CANNON.Box(new CANNON.Vec3(0.5, 1, 0.5)),
    position: new CANNON.Vec3(0, 10, 10), // Start in the air
    material: defaultMaterial,
    fixedRotation: true // Don't tumble like a ragdoll yet
});
world.addBody(playerBody);

// --- 6. INPUTS & ODM GEAR LOGIC ---
const keys = { w: false, a: false, s: false, d: false, space: false, q: false };
window.addEventListener('keydown', (e) => {
    if(e.key === ' ') keys.space = true;
    else keys[e.key.toLowerCase()] = true;
});
window.addEventListener('keyup', (e) => {
    if(e.key === ' ') keys.space = false;
    else keys[e.key.toLowerCase()] = false;
});

const keys = {};
window.addEventListener('keydown', (e) => {
    if(!gameStarted) return;
    const key = e.key.toLowerCase();
    keys[key] = true;

    // Titan Shifting (B)
    if (key === binds.shift && myActiveTitan) {
        socket.emit('toggleShift');
    }
    // Switch Titans ([ and ])
    if (key === binds.nextTitan) socket.emit('switchTitan', 'next');
    if (key === binds.prevTitan) socket.emit('switchTitan', 'prev');
});
window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

let camAngleX = 0; // Left/Right
let camAngleY = 0; // Up/Down

// Mouse Look (For PC)
document.addEventListener('mousemove', (e) => {
    if (!gameStarted || document.pointerLockElement !== document.body) return;
    camAngleX -= e.movementX * 0.002 * lookSensitivity;
    camAngleY -= e.movementY * 0.002 * lookSensitivity;
    // Clamp looking up and down
    camAngleY = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, camAngleY)); 
});

// Click to lock mouse to screen (Standard for 3D PC games)
document.body.addEventListener('click', () => {
    if (gameStarted && document.getElementById('mobileUI').style.display === 'none') {
        document.body.requestPointerLock();
    }
});

// Raycaster for ODM hooks
const raycaster = new THREE.Raycaster();
let grapplePoint = null;

socket.on('titanAcquired', (titanName) => {
  myOwnedTitans.push(titanName);
  myActiveTitan = titanName;
  document.getElementById('titanUI').style.display = 'block';
  document.getElementById('activeTitanName').innerText = titanName;
});

socket.on('titanSwitched', (titanName) => {
  myActiveTitan = titanName;
  document.getElementById('activeTitanName').innerText = titanName;
});

socket.on('playerShifted', (data) => {
  const isMe = data.id === socket.id;
  const targetMesh = isMe ? myPlayerMesh : players[data.id];
  const targetBody = isMe ? playerBody : null; // We only simulate physics for ourselves

  if (data.isTitan) {
      // TRANSFORM INTO TITAN!
      if (isMe) amITitan = true;
      
      // Scale Graphics
      let scaleMult = data.titanType === 'Colossal' ? 30 : 10; // Colossal is huge!
      targetMesh.scale.set(scaleMult, scaleMult, scaleMult);
      targetMesh.material.color.setHex(0xffaa00); // Turn orange/fleshy for now

      // Scale Physics (Only for our local player)
      if (isMe) {
          playerBody.shapes.forEach(shape => playerBody.removeShape(shape));
          playerBody.addShape(new CANNON.Box(new CANNON.Vec3(0.5 * scaleMult, 1 * scaleMult, 0.5 * scaleMult)));
          playerBody.mass = 5000; // Titans are heavy!
          playerBody.updateMassProperties();
      }
  } else {
      // REVERT TO HUMAN
      if (isMe) amITitan = false;
      
      targetMesh.scale.set(1, 1, 1);
      targetMesh.material.color.setHex(isMe ? 0x0000ff : 0xff0000);

      if (isMe) {
          playerBody.shapes.forEach(shape => playerBody.removeShape(shape));
          playerBody.addShape(new CANNON.Box(humanSize));
          playerBody.mass = 70;
          playerBody.updateMassProperties();
      }
  }
});

// Mobile Toggle
document.getElementById('mobileToggle').addEventListener('change', (e) => {
  document.getElementById('mobileUI').style.display = e.target.checked ? 'block' : 'none';
});

// Mobile Action Buttons
document.getElementById('btnJump').addEventListener('touchstart', () => keys[binds.jump] = true);
document.getElementById('btnJump').addEventListener('touchend', () => keys[binds.jump] = false);
document.getElementById('btnGrapple').addEventListener('touchstart', () => keys[binds.grapple] = true);
document.getElementById('btnGrapple').addEventListener('touchend', () => keys[binds.grapple] = false);
document.getElementById('btnShift').addEventListener('touchstart', () => { if(myActiveTitan) socket.emit('toggleShift'); });

// Simple Joystick Logic
function setupJoystick(joyId, stickId, isMovement) {
  const joy = document.getElementById(joyId);
  const stick = document.getElementById(stickId);
  let active = false;
  let origin = { x: 0, y: 0 };

  joy.addEventListener('touchstart', (e) => {
      active = true;
      const touch = e.changedTouches[0];
      origin = { x: touch.clientX, y: touch.clientY };
  });

  joy.addEventListener('touchmove', (e) => {
      if (!active) return;
      e.preventDefault(); // Stop screen scrolling
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - origin.x;
      const deltaY = touch.clientY - origin.y;
      
      // Limit stick movement to 35px
      const distance = Math.min(35, Math.sqrt(deltaX*deltaX + deltaY*deltaY));
      const angle = Math.atan2(deltaY, deltaX);
      
      stick.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`;

      if (isMovement) {
          // Map to WASD
          keys[binds.forward] = deltaY < -10;
          keys[binds.back] = deltaY > 10;
          keys[binds.left] = deltaX < -10;
          keys[binds.right] = deltaX > 10;
      } else {
          // Map to Camera Look
          camAngleX -= (deltaX * 0.001 * lookSensitivity);
          camAngleY -= (deltaY * 0.001 * lookSensitivity);
          camAngleY = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, camAngleY)); 
      }
  });

  joy.addEventListener('touchend', () => {
      active = false;
      stick.style.transform = `translate(0px, 0px)`;
      if (isMovement) {
          keys[binds.forward] = keys[binds.back] = keys[binds.left] = keys[binds.right] = false;
      }
  });
}

setupJoystick('joyLeft', 'stickLeft', true);
setupJoystick('joyRight', 'stickRight', false);

// --- 7. MAIN GAME LOOP ---
const timeStep = 1 / 60;
let lastCallTime = performance.now();

function animate() {
    requestAnimationFrame(animate);

    const time = performance.now() / 1000;
    const dt = time - lastCallTime;
    lastCallTime = time;

    // Step physics world
    world.step(timeStep, dt, 3);

    // Sync Graphics with Physics
    myPlayerMesh.position.copy(playerBody.position);
    myPlayerMesh.quaternion.copy(playerBody.quaternion);

    // Basic WASD Movement (applying force instead of just moving coordinates)
    const moveSpeed = 400;
    if (keys.w) playerBody.applyForce(new CANNON.Vec3(0, 0, -moveSpeed), playerBody.position);
    if (keys.s) playerBody.applyForce(new CANNON.Vec3(0, 0, moveSpeed), playerBody.position);
    if (keys.a) playerBody.applyForce(new CANNON.Vec3(-moveSpeed, 0, 0), playerBody.position);
    if (keys.d) playerBody.applyForce(new CANNON.Vec3(moveSpeed, 0, 0), playerBody.position);
    
    // Jump
    if (keys.space && Math.abs(playerBody.velocity.y) < 0.1) {
        playerBody.velocity.y = 15;
    }

    // ODM GEAR LOGIC (Press Q to grapple)
    if (keys.q) {
        if (!grapplePoint) {
            // Shoot a raycast forward from the camera
            raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
            const intersects = raycaster.intersectObjects(buildings);
            
            if (intersects.length > 0) {
                grapplePoint = intersects[0].point; // We hit a building!
            }
        }

        if (grapplePoint) {
            // Calculate direction from player to grapple point
            const dir = new THREE.Vector3().subVectors(grapplePoint, myPlayerMesh.position).normalize();
            
            // Apply a massive force pulling the player towards the building (The Gas/Reel)
            const reelForce = 3000; 
            playerBody.applyForce(new CANNON.Vec3(dir.x * reelForce, dir.y * reelForce, dir.z * reelForce), playerBody.position);
        }
    } else {
        grapplePoint = null; // Release the hook
    }

    // Advanced Camera Orbit
    const camDist = amITitan ? 40 : 10;
    const camHeightOffset = amITitan ? 15 : 2;

    // Calculate camera position based on angles
    const camX = myPlayerMesh.position.x + camDist * Math.sin(camAngleX) * Math.cos(camAngleY);
    const camY = myPlayerMesh.position.y + camHeightOffset + camDist * Math.sin(camAngleY);
    const camZ = myPlayerMesh.position.z + camDist * Math.cos(camAngleX) * Math.cos(camAngleY);

    camera.position.set(camX, camY, camZ);
    camera.lookAt(myPlayerMesh.position.x, myPlayerMesh.position.y + camHeightOffset, myPlayerMesh.position.z);

    // Make player model rotate to face where the camera is looking
    playerBody.quaternion.setFromEuler(0, camAngleX, 0);

    // Send position to server
    socket.emit('playerMovement', { x: myPlayerMesh.position.x, y: myPlayerMesh.position.y, z: myPlayerMesh.position.z });

    // Check collision with Spinal Fluids
    Object.keys(fluids).forEach(id => {
      const fluidMesh = fluids[id];
      const distance = myPlayerMesh.position.distanceTo(fluidMesh.position);
      
      if (distance < 2.0) { // If player is close enough to grab it
          socket.emit('collectFluid', id);
          // Temporarily hide it on our screen so we don't spam the server
          scene.remove(fluidMesh); 
          delete fluids[id];
      }
  });

    renderer.render(scene, camera);
}
animate();