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

socket.on('updateOwnedTitans', (titans) => {
    myOwnedTitans = titans;
});

socket.on('youDied', (lostPowers) => {
    if (lostPowers) {
        alert("YOU WERE EATEN! You lost your Titan powers!");
        myOwnedTitans = [];
        myActiveTitan = null;
        document.getElementById('titanUI').style.display = 'none';
    } else {
        console.log("You were eaten!");
    }
    
    // Force un-shift if we were a Titan
    if (amITitan) {
        socket.emit('toggleShift');
    }
    
    // Respawn in the air
    playerBody.position.set(0, 50, 0);
    playerBody.velocity.set(0, 0, 0);
});

socket.on('playerRespawned', (id) => {
    if (players[id]) {
        players[id].position.set(0, 10, 0);
        // If they were a Titan, shrink them back down visually
        players[id].scale.set(1, 1, 1);
    }
});

socket.on('titanAbilityUsed', (data) => {
    // Visual effect: Flash the Titan yellow when they use a move!
    const targetMesh = data.id === socket.id ? myPlayerMesh : players[data.id];
    if (targetMesh) {
        const origColor = targetMesh.material.color.getHex();
        targetMesh.material.color.setHex(0xffff00); // Flash Yellow
        setTimeout(() => {
            targetMesh.material.color.setHex(origColor);
        }, 300);
    }
});

// --- COMBAT SYSTEM (Left Click to Attack) ---
// --- COMBAT SYSTEM (Left Click) ---
window.addEventListener('mousedown', (e) => {
    if (!gameStarted || e.button !== 0) return;

    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    if (amITitan) {
        // EATING LOGIC (You are a Titan)
        // Raycast against other players
        const playerMeshes = Object.values(players);
        const intersects = raycaster.intersectObjects(playerMeshes);

        if (intersects.length > 0 && intersects[0].distance < 30) { // Titans have a long reach
            const hitMesh = intersects[0].object;
            const victimId = Object.keys(players).find(key => players[key] === hitMesh);
            
            if (victimId) {
                console.log("Chomp!");
                socket.emit('eatPlayer', victimId);
            }
        }
    } else {
        // SWORD LOGIC (You are a Human)
        const intersects = raycaster.intersectObjects(Object.values(aiTitanMeshes));



        if (intersects.length > 0 && intersects[0].distance < 20) {
            const hit = intersects[0];
            const titanMesh = hit.object;
            const titanId = Object.keys(aiTitanMeshes).find(key => aiTitanMeshes[key] === titanMesh);
            if (!titanId) return;

            const titanData = titanMesh.userData;
            const localY = hit.point.y - titanMesh.position.y;
            const localX = hit.point.x - titanMesh.position.x;
            const localZ = hit.point.z - titanMesh.position.z;

            const heightHalf = titanData.height / 2;
            let hitPart = 'body';

            if (localY > heightHalf * 0.6) {
                if (localZ > 0) hitPart = 'nape'; else hitPart = 'eyes';
            } else if (localY < -heightHalf * 0.2) {
                if (localX < 0) hitPart = 'leftLeg'; else hitPart = 'rightLeg';
            } else {
                if (localX < 0) hitPart = 'leftArm'; else hitPart = 'rightArm';
            }

            socket.emit('attackTitan', { id: titanId, part: hitPart });

            // Drain Blade Durability
            bladeDurability -= 25; // 4 hits per blade
            if (bladeDurability <= 0) {
                currentBlades--;
                if (currentBlades > 0) {
                    bladeDurability = 100; // Load new blade
                    console.log("Swapped to a new blade!");
                } else {
                    bladeDurability = 0;
                    console.log("OUT OF BLADES!");
                }
            }
        }
    }
});

// Listen for hits to show visual feedback
socket.on('titanHit', (data) => {
    if (data.part === 'nape') {
        // Flash the titan white then hide it (it died)
        if (aiTitanMeshes[data.id]) {
            aiTitanMeshes[data.id].material.color.setHex(0xffffff);
            setTimeout(() => {
                if (aiTitanMeshes[data.id]) aiTitanMeshes[data.id].visible = false;
            }, 100);
        }
    } else {
        // Flash red to show a limb was sliced
        if (aiTitanMeshes[data.id]) {
            const originalColor = aiTitanMeshes[data.id].material.color.getHex();
            aiTitanMeshes[data.id].material.color.setHex(0xff0000);
            setTimeout(() => {
                if (aiTitanMeshes[data.id]) aiTitanMeshes[data.id].material.color.setHex(originalColor);
            }, 200);
        }
    }
});

// --- AI TITAN CLIENT LOGIC ---
const aiTitanMeshes = {};
const aiTitanBodies = {};

const pureMat = new THREE.MeshStandardMaterial({ color: 0x8B0000 }); // Dark Red
const abnormalMat = new THREE.MeshStandardMaterial({ color: 0x800080 }); // Purple

ssocket.on('updateAITitans', (serverTitans) => {
    Object.keys(serverTitans).forEach(id => {
        const tData = serverTitans[id];

        if (tData.isDead) {
            if (aiTitanMeshes[id]) aiTitanMeshes[id].visible = false;
            if (aiTitanBodies[id]) aiTitanBodies[id].position.set(0, -1000, 0); // Move physics body away
            return;
        }

        if (!aiTitanMeshes[id]) {
            const geo = new THREE.BoxGeometry(tData.height / 3, tData.height, tData.height / 3);
            const mesh = new THREE.Mesh(geo, tData.type === 'Abnormal' ? abnormalMat : pureMat);
            mesh.userData = { height: tData.height }; // Store height for hitbox math!
            scene.add(mesh);
            aiTitanMeshes[id] = mesh;
            buildings.push(mesh); 

            const body = new CANNON.Body({
                type: CANNON.Body.KINEMATIC,
                shape: new CANNON.Box(new CANNON.Vec3(tData.height / 6, tData.height / 2, tData.height / 6)),
                position: new CANNON.Vec3(tData.x, tData.y, tData.z),
                material: defaultMaterial
            });
            world.addBody(body);
            aiTitanBodies[id] = body;
        }

        aiTitanMeshes[id].visible = true; // Make sure it's visible if it respawned
        aiTitanMeshes[id].position.set(tData.x, tData.y, tData.z);
        aiTitanBodies[id].position.set(tData.x, tData.y, tData.z);
        
        // Visual cue for crawling (lower the mesh if both legs are gone)
        if (!tData.parts.leftLeg && !tData.parts.rightLeg) {
            aiTitanMeshes[id].position.y = tData.y - (tData.height * 0.25); 
        }
    });
});

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
// --- ODM RESOURCES ---
let maxGas = 100;
let currentGas = 100;
let maxBlades = 3;
let currentBlades = 3;
let bladeDurability = 100;

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

// --- INPUTS & KEYBINDS ---
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

    // Titan Abilities (1-0, Z, X, C, V)
    const abilityKeys = ['1','2','3','4','5','6','7','8','9','0','z','x','c','v'];
    if (amITitan && abilityKeys.includes(key)) {
        socket.emit('useTitanAbility', key);
    }
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
    if (isMe) {
        amITitan = true;
        document.getElementById('odmUI').style.display = 'none'; // Hide ODM UI
    }
    
    // --- THE 9 TITANS STATS & VISUALS ---
    let scaleMult = 15; // Default 15m class
    let color = 0xffaa00; // Default fleshy orange
    let mass = 5000;

    switch(data.titanType) {
        case 'Colossal': scaleMult = 60; color = 0x8B0000; mass = 20000; break; // 60m, Dark Red
        case 'Armored': scaleMult = 15; color = 0x888888; mass = 10000; break; // 15m, Grey/Silver Armor
        case 'Beast': scaleMult = 17; color = 0x5C4033; mass = 6000; break; // 17m, Brown Hair
        case 'Jaw': scaleMult = 5; color = 0xDAA520; mass = 2000; break; // 5m, Golden/Fast
        case 'Cart': scaleMult = 4; color = 0xDEB887; mass = 2000; break; // 4m, Light Brown
        case 'Female': scaleMult = 14; color = 0xFFC0CB; mass = 4000; break; // 14m, Pinkish
        case 'Attack': scaleMult = 15; color = 0xCD853F; mass = 5000; break; // 15m, Tan
        case 'Warhammer': scaleMult = 15; color = 0xFFFFFF; mass = 6000; break; // 15m, Pure White
        case 'Founding': scaleMult = 100; color = 0xE5E4E2; mass = 50000; break; // 100m+, Platinum/Bone
    }

    // Apply Graphics
    targetMesh.scale.set(scaleMult, scaleMult, scaleMult);
    
    // If it's the Cart Titan, make it walk on all fours (longer Z axis)
    if (data.titanType === 'Cart') targetMesh.scale.set(scaleMult, scaleMult * 0.5, scaleMult * 1.5);

    targetMesh.material.color.setHex(color);

    // Apply Physics (Only for our local player)
    if (isMe) {
        playerBody.shapes.forEach(shape => playerBody.removeShape(shape));
        
        let shapeVec = new CANNON.Vec3(0.5 * scaleMult, 1 * scaleMult, 0.5 * scaleMult);
        if (data.titanType === 'Cart') shapeVec = new CANNON.Vec3(0.5 * scaleMult, 0.5 * scaleMult, 0.75 * scaleMult);

        playerBody.addShape(new CANNON.Box(shapeVec));
        playerBody.mass = mass;
        playerBody.updateMassProperties();
    }
} else {
    // REVERT TO HUMAN
    if (isMe) {
        amITitan = false;
        document.getElementById('odmUI').style.display = 'block';
    }
    
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
    // ODM GEAR LOGIC (Press Q to grapple)
    if (keys.q && currentGas > 0 && !amITitan) {
        if (!grapplePoint) {
            raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
            const intersects = raycaster.intersectObjects(buildings);
            if (intersects.length > 0) {
                grapplePoint = intersects[0].point;
            }
        }

        if (grapplePoint) {
            const dir = new THREE.Vector3().subVectors(grapplePoint, myPlayerMesh.position).normalize();
            const reelForce = 3000; 
            playerBody.applyForce(new CANNON.Vec3(dir.x * reelForce, dir.y * reelForce, dir.z * reelForce), playerBody.position);
            
            // Drain Gas!
            currentGas -= 0.1; 
            if (currentGas < 0) currentGas = 0;
        }
    } else {
        grapplePoint = null;
    }

    // REFILL STATION: Stand on top of the 50m wall to refill!
    if (myPlayerMesh.position.y > 48 && !amITitan) {
        currentGas = 100;
        currentBlades = maxBlades;
        bladeDurability = 100;
    }

    // Update UI
    if (!amITitan) {
        document.getElementById('gasVal').innerText = Math.floor(currentGas) + '%';
        document.getElementById('gasVal').style.color = currentGas > 30 ? '#00ff00' : '#ff0000';
        document.getElementById('bladeCount').innerText = currentBlades;
        document.getElementById('bladeDurability').innerText = Math.floor(bladeDurability) + '%';
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