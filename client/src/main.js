import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { io } from 'socket.io-client';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'; // Added for realistic models later!

// --- 1. GAME STATE & SETTINGS ---
let gameStarted = false;
let renderDistance = 1000;
let lookSensitivity = 1.0;
let amITitan = false;
let myOwnedTitans = [];
let myActiveTitan = null;

let currentGas = 100;
let currentBlades = 3;
let bladeDurability = 100;

const binds = { forward: 'w', back: 's', left: 'a', right: 'd', jump: ' ', grapple: 'q', shift: 'b', nextTitan: ']', prevTitan: '[' };
const keys = {};

// --- 2. NETWORK SETUP ---
const socket = io(); 

// --- 3. THREE.JS SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, renderDistance * 0.4, renderDistance);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
hemiLight.position.set(0, 200, 0);
scene.add(hemiLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(100, 200, 50);
dirLight.castShadow = true;
scene.add(dirLight);

// --- 4. TEXTURES & THE CITY ENVIRONMENT ---
const textureLoader = new THREE.TextureLoader();
const grassTex = textureLoader.load('https://threejsfundamentals.org/threejs/resources/images/grasslight-big.jpg');
grassTex.wrapS = THREE.RepeatWrapping; grassTex.wrapT = THREE.RepeatWrapping; grassTex.repeat.set(100, 100);
const floorMat = new THREE.MeshStandardMaterial({ map: grassTex });
const floorGeo = new THREE.PlaneGeometry(2000, 2000);
const floorMesh = new THREE.Mesh(floorGeo, floorMat);
floorMesh.rotation.x = -Math.PI / 2;
scene.add(floorMesh);

const buildings = []; 
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -20, 0) });
const defaultMaterial = new CANNON.Material('default');
const defaultContactMaterial = new CANNON.ContactMaterial(defaultMaterial, defaultMaterial, { friction: 0.1, restitution: 0.0 });
world.addContactMaterial(defaultContactMaterial);

const floorBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane(), material: defaultMaterial });
floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(floorBody);

// Generate Giant Walls
const wallTex = textureLoader.load('https://threejsfundamentals.org/threejs/resources/images/wall.jpg');
wallTex.wrapS = THREE.RepeatWrapping; wallTex.wrapT = THREE.RepeatWrapping; wallTex.repeat.set(4, 2);
const wallMat = new THREE.MeshStandardMaterial({ map: wallTex });
const wallRadius = 400; const wallHeight = 50; const wallThickness = 10; const segments = 36;

for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * wallRadius;
    const z = Math.sin(angle) * wallRadius;
    const wGeo = new THREE.BoxGeometry(wallThickness, wallHeight, (wallRadius * 2 * Math.PI) / segments + 5);
    const wMesh = new THREE.Mesh(wGeo, wallMat);
    wMesh.position.set(x, wallHeight / 2, z);
    wMesh.rotation.y = -angle;
    scene.add(wMesh);
    buildings.push(wMesh);

    const wBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Box(new CANNON.Vec3(wallThickness/2, wallHeight/2, ((wallRadius * 2 * Math.PI) / segments + 5)/2)),
        position: new CANNON.Vec3(x, wallHeight / 2, z),
        material: defaultMaterial
    });
    wBody.quaternion.setFromEuler(0, -angle, 0);
    world.addBody(wBody);
}

// GENERATE THE CITY (150 Buildings inside the walls)
const buildingMats = [
    new THREE.MeshStandardMaterial({ color: 0x8B4513 }), // Brown
    new THREE.MeshStandardMaterial({ color: 0xA9A9A9 }), // Grey
    new THREE.MeshStandardMaterial({ color: 0xD2B48C })  // Tan
];

for(let i = 0; i < 150; i++) {
    const bWidth = Math.random() * 10 + 10;
    const bHeight = Math.random() * 30 + 10; // 10m to 40m tall
    const bDepth = Math.random() * 10 + 10;
    
    // Random position inside the walls
    const r = Math.random() * (wallRadius - 50);
    const theta = Math.random() * 2 * Math.PI;
    const bx = r * Math.cos(theta);
    const bz = r * Math.sin(theta);

    const bGeo = new THREE.BoxGeometry(bWidth, bHeight, bDepth);
    const bMesh = new THREE.Mesh(bGeo, buildingMats[Math.floor(Math.random() * buildingMats.length)]);
    bMesh.position.set(bx, bHeight / 2, bz);
    scene.add(bMesh);
    buildings.push(bMesh); // Add to grapple targets!

    const bBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Box(new CANNON.Vec3(bWidth/2, bHeight/2, bDepth/2)),
        position: new CANNON.Vec3(bx, bHeight / 2, bz),
        material: defaultMaterial
    });
    world.addBody(bBody);
}

// --- 5. PROCEDURAL ANIMATED HUMANOIDS ---
// This replaces the "Solid Block" with a Head, Torso, Arms, and Legs
function createCharacterModel(colorHex, scaleMultiplier) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: colorHex });
    
    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5 * scaleMultiplier, 0.5 * scaleMultiplier, 0.5 * scaleMultiplier), mat);
    head.position.y = 1.75 * scaleMultiplier;
    group.add(head);
    
    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8 * scaleMultiplier, 1 * scaleMultiplier, 0.4 * scaleMultiplier), mat);
    torso.position.y = 1 * scaleMultiplier;
    group.add(torso);
    
    // Arms
    const armGeo = new THREE.BoxGeometry(0.3 * scaleMultiplier, 1 * scaleMultiplier, 0.3 * scaleMultiplier);
    const leftArm = new THREE.Mesh(armGeo, mat);
    leftArm.position.set(-0.6 * scaleMultiplier, 1 * scaleMultiplier, 0);
    group.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeo, mat);
    rightArm.position.set(0.6 * scaleMultiplier, 1 * scaleMultiplier, 0);
    group.add(rightArm);
    
    // Legs
    const legGeo = new THREE.BoxGeometry(0.35 * scaleMultiplier, 1 * scaleMultiplier, 0.35 * scaleMultiplier);
    const leftLeg = new THREE.Mesh(legGeo, mat);
    leftLeg.position.set(-0.25 * scaleMultiplier, 0.5 * scaleMultiplier, 0);
    group.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeo, mat);
    rightLeg.position.set(0.25 * scaleMultiplier, 0.5 * scaleMultiplier, 0);
    group.add(rightLeg);
    
    // Store parts so we can animate them later!
    group.userData = { leftArm, rightArm, leftLeg, rightLeg, isMoving: false };
    return group;
}

// --- 6. PLAYER SETUP ---
const players = {};
const humanSize = new CANNON.Vec3(0.5, 1, 0.5);

// Create our player using the new animated model!
let myPlayerMesh = createCharacterModel(0x0000ff, 1);
scene.add(myPlayerMesh);

const playerBody = new CANNON.Body({
    mass: 70,
    shape: new CANNON.Box(humanSize),
    position: new CANNON.Vec3(0, 10, 0),
    material: defaultMaterial,
    fixedRotation: true
});
world.addBody(playerBody);

// --- 7. UI & MENUS ---
document.getElementById('playBtn').addEventListener('click', () => {
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('ui').style.display = 'block';
    document.getElementById('odmUI').style.display = 'block';
    document.getElementById('crosshair').style.display = 'block';
    gameStarted = true;
    if (document.getElementById('mobileUI').style.display === 'none') {
        document.body.requestPointerLock();
    }
});

document.getElementById('settingsBtn').addEventListener('click', () => {
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('settingsMenu').style.display = 'flex';
});

document.getElementById('closeSettingsBtn').addEventListener('click', () => {
    document.getElementById('settingsMenu').style.display = 'none';
    document.getElementById('mainMenu').style.display = 'flex';
});

document.getElementById('mobileToggle').addEventListener('change', (e) => {
    document.getElementById('mobileUI').style.display = e.target.checked ? 'block' : 'none';
});

// --- 8. INPUTS, CAMERA & FIXED JOYSTICKS ---
let camAngleX = 0;
let camAngleY = 0;

// PC Mouse Look
document.addEventListener('mousemove', (e) => {
    if (!gameStarted || document.pointerLockElement !== document.body) return;
    camAngleX -= e.movementX * 0.002 * lookSensitivity;
    camAngleY -= e.movementY * 0.002 * lookSensitivity;
    camAngleY = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, camAngleY)); 
});

window.addEventListener('keydown', (e) => {
    if(!gameStarted) return;
    const key = e.key.toLowerCase();
    keys[key] = true;
    if (key === binds.shift && myActiveTitan) socket.emit('toggleShift');
    if (key === binds.nextTitan) socket.emit('switchTitan', 'next');
    if (key === binds.prevTitan) socket.emit('switchTitan', 'prev');
});
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

// FIXED MOBILE JOYSTICKS
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
        e.preventDefault(); // Stops screen from scrolling
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - origin.x;
        const deltaY = touch.clientY - origin.y;
        
        const distance = Math.min(35, Math.sqrt(deltaX*deltaX + deltaY*deltaY));
        const angle = Math.atan2(deltaY, deltaX);
        stick.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`;

        if (isMovement) {
            keys[binds.forward] = deltaY < -10;
            keys[binds.back] = deltaY > 10;
            keys[binds.left] = deltaX < -10;
            keys[binds.right] = deltaX > 10;
        } else {
            camAngleX -= (deltaX * 0.001 * lookSensitivity);
            camAngleY -= (deltaY * 0.001 * lookSensitivity);
            camAngleY = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, camAngleY)); 
        }
    }, { passive: false });

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

// Mobile Buttons
document.getElementById('btnJump').addEventListener('touchstart', () => keys[binds.jump] = true);
document.getElementById('btnJump').addEventListener('touchend', () => keys[binds.jump] = false);
document.getElementById('btnGrapple').addEventListener('touchstart', () => keys[binds.grapple] = true);
document.getElementById('btnGrapple').addEventListener('touchend', () => keys[binds.grapple] = false);
document.getElementById('btnShift').addEventListener('touchstart', () => { if(myActiveTitan) socket.emit('toggleShift'); });

// --- 9. COMBAT ---
const raycaster = new THREE.Raycaster();
window.addEventListener('mousedown', (e) => {
    if (!gameStarted || e.button !== 0) return;
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    if (amITitan) {
        const intersects = raycaster.intersectObjects(Object.values(players).map(p => p.mesh));
        if (intersects.length > 0 && intersects[0].distance < 30) {
            const hitMesh = intersects[0].object.parent; // Because it's a group now
            const victimId = Object.keys(players).find(key => players[key].mesh === hitMesh);
            if (victimId) socket.emit('eatPlayer', victimId);
        }
    } else {
        if (currentBlades <= 0) return; 
        const intersects = raycaster.intersectObjects(Object.values(aiTitanMeshes).map(t => t.children[1])); // Target torso
        if (intersects.length > 0 && intersects[0].distance < 20) {
            const hitMesh = intersects[0].object.parent;
            const titanId = Object.keys(aiTitanMeshes).find(key => aiTitanMeshes[key] === hitMesh);
            if (titanId) socket.emit('attackTitan', { id: titanId, part: 'nape' }); // Simplified for now
        }
    }
});

// --- 10. NETWORK LISTENERS ---
const aiTitanMeshes = {};
const aiTitanBodies = {};

socket.on('currentPlayers', (serverPlayers) => {
    Object.keys(serverPlayers).forEach((id) => {
        if (id !== socket.id) {
            const mesh = createCharacterModel(0xff0000, 1);
            mesh.position.set(serverPlayers[id].x, serverPlayers[id].y, serverPlayers[id].z);
            scene.add(mesh);
            players[id] = { mesh: mesh };
        }
    });
});

socket.on('newPlayer', (data) => {
    const mesh = createCharacterModel(0xff0000, 1);
    mesh.position.set(data.player.x, data.player.y, data.player.z);
    scene.add(mesh);
    players[data.id] = { mesh: mesh };
});

socket.on('playerMoved', (data) => {
    if (players[data.id]) {
        players[data.id].mesh.position.set(data.x, data.y, data.z);
        players[data.id].mesh.userData.isMoving = true; // Trigger animation
        setTimeout(() => { if(players[data.id]) players[data.id].mesh.userData.isMoving = false; }, 100);
    }
});

socket.on('playerDisconnected', (id) => {
    if (players[id]) {
        scene.remove(players[id].mesh);
        delete players[id];
    }
});

// Titan Shifting Visuals
socket.on('playerShifted', (data) => {
    const isMe = data.id === socket.id;
    
    if (isMe) {
        scene.remove(myPlayerMesh);
        if (data.isTitan) {
            amITitan = true;
            let scaleMult = data.titanType === 'Colossal' ? 60 : 15;
            myPlayerMesh = createCharacterModel(0xffaa00, scaleMult);
            
            playerBody.shapes.forEach(shape => playerBody.removeShape(shape));
            playerBody.addShape(new CANNON.Box(new CANNON.Vec3(0.5 * scaleMult, 1 * scaleMult, 0.5 * scaleMult)));
            playerBody.mass = 5000;
        } else {
            amITitan = false;
            myPlayerMesh = createCharacterModel(0x0000ff, 1);
            
            playerBody.shapes.forEach(shape => playerBody.removeShape(shape));
            playerBody.addShape(new CANNON.Box(humanSize));
            playerBody.mass = 70;
        }
        scene.add(myPlayerMesh);
        playerBody.updateMassProperties();
    } else {
        if (players[data.id]) {
            scene.remove(players[data.id].mesh);
            let scaleMult = data.isTitan ? 15 : 1;
            players[data.id].mesh = createCharacterModel(data.isTitan ? 0xffaa00 : 0xff0000, scaleMult);
            scene.add(players[data.id].mesh);
        }
    }
});

// AI Titans
socket.on('updateAITitans', (serverTitans) => {
    Object.keys(serverTitans).forEach(id => {
        const tData = serverTitans[id];

        if (tData.isDead) {
            if (aiTitanMeshes[id]) aiTitanMeshes[id].visible = false;
            if (aiTitanBodies[id]) aiTitanBodies[id].position.set(0, -1000, 0);
            return;
        }

        if (!aiTitanMeshes[id]) {
            // Create an animated procedural Titan!
            const scale = tData.height / 3; 
            const mesh = createCharacterModel(tData.type === 'Abnormal' ? 0x800080 : 0x8B0000, scale);
            scene.add(mesh);
            aiTitanMeshes[id] = mesh;

            const body = new CANNON.Body({
                type: CANNON.Body.KINEMATIC,
                shape: new CANNON.Box(new CANNON.Vec3(0.5 * scale, 1 * scale, 0.5 * scale)),
                position: new CANNON.Vec3(tData.x, tData.y, tData.z),
                material: defaultMaterial
            });
            world.addBody(body);
            aiTitanBodies[id] = body;
        }

        aiTitanMeshes[id].visible = true;
        aiTitanMeshes[id].position.set(tData.x, tData.y, tData.z);
        aiTitanBodies[id].position.set(tData.x, tData.y, tData.z);
        aiTitanMeshes[id].userData.isMoving = true; // Always animate AI
    });
});

// --- 11. MAIN GAME LOOP ---
const timeStep = 1 / 60;
let lastCallTime = performance.now() / 1000;
let grapplePoint = null;

function animate() {
    requestAnimationFrame(animate);
    if (!gameStarted) return;

    const time = performance.now() / 1000;
    const dt = time - lastCallTime;
    lastCallTime = time;

    world.step(timeStep, Math.min(dt, 0.1), 3);

    myPlayerMesh.position.copy(playerBody.position);
    
    // Make player face camera direction
    myPlayerMesh.rotation.y = camAngleX;

    // Movement
    const moveSpeed = amITitan ? 20000 : 400; 
    let isMoving = false;
    
    // Apply force relative to camera angle!
    const forwardVec = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0,1,0), camAngleX);
    const rightVec = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0,1,0), camAngleX);

    if (keys[binds.forward]) { playerBody.applyForce(new CANNON.Vec3(forwardVec.x * moveSpeed, 0, forwardVec.z * moveSpeed), playerBody.position); isMoving = true; }
    if (keys[binds.back]) { playerBody.applyForce(new CANNON.Vec3(-forwardVec.x * moveSpeed, 0, -forwardVec.z * moveSpeed), playerBody.position); isMoving = true; }
    if (keys[binds.left]) { playerBody.applyForce(new CANNON.Vec3(-rightVec.x * moveSpeed, 0, -rightVec.z * moveSpeed), playerBody.position); isMoving = true; }
    if (keys[binds.right]) { playerBody.applyForce(new CANNON.Vec3(rightVec.x * moveSpeed, 0, rightVec.z * moveSpeed), playerBody.position); isMoving = true; }
    
    if (keys[binds.jump] && Math.abs(playerBody.velocity.y) < 0.1) playerBody.velocity.y = amITitan ? 30 : 15;

    // PROCEDURAL ANIMATION (Walking/Swinging Limbs)
    const animSpeed = time * 10;
    
    // Animate Local Player
    if (isMoving) {
        myPlayerMesh.userData.leftArm.rotation.x = Math.sin(animSpeed) * 0.8;
        myPlayerMesh.userData.rightArm.rotation.x = -Math.sin(animSpeed) * 0.8;
        myPlayerMesh.userData.leftLeg.rotation.x = -Math.sin(animSpeed) * 0.8;
        myPlayerMesh.userData.rightLeg.rotation.x = Math.sin(animSpeed) * 0.8;
    } else {
        myPlayerMesh.userData.leftArm.rotation.x = 0; myPlayerMesh.userData.rightArm.rotation.x = 0;
        myPlayerMesh.userData.leftLeg.rotation.x = 0; myPlayerMesh.userData.rightLeg.rotation.x = 0;
    }

    // Animate AI Titans
    Object.values(aiTitanMeshes).forEach(titan => {
        if (titan.userData.isMoving) {
            titan.userData.leftArm.rotation.x = Math.sin(animSpeed * 0.5) * 0.5;
            titan.userData.rightArm.rotation.x = -Math.sin(animSpeed * 0.5) * 0.5;
            titan.userData.leftLeg.rotation.x = -Math.sin(animSpeed * 0.5) * 0.5;
            titan.userData.rightLeg.rotation.x = Math.sin(animSpeed * 0.5) * 0.5;
        }
    });

    // Grapple Logic
    if (keys[binds.grapple] && currentGas > 0 && !amITitan) {
        if (!grapplePoint) {
            raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
            const intersects = raycaster.intersectObjects(buildings);
            if (intersects.length > 0) grapplePoint = intersects[0].point;
        }
        if (grapplePoint) {
            const dir = new THREE.Vector3().subVectors(grapplePoint, myPlayerMesh.position).normalize();
            const reelForce = 4000; 
            playerBody.applyForce(new CANNON.Vec3(dir.x * reelForce, dir.y * reelForce, dir.z * reelForce), playerBody.position);
        }
    } else {
        grapplePoint = null;
    }

    // Camera Orbit
    const camDist = amITitan ? 50 : 10;
    const camHeightOffset = amITitan ? 20 : 2;
    const camX = myPlayerMesh.position.x + camDist * Math.sin(camAngleX) * Math.cos(camAngleY);
    const camY = myPlayerMesh.position.y + camHeightOffset + camDist * Math.sin(camAngleY);
    const camZ = myPlayerMesh.position.z + camDist * Math.cos(camAngleX) * Math.cos(camAngleY);

    camera.position.set(camX, camY, camZ);
    camera.lookAt(myPlayerMesh.position.x, myPlayerMesh.position.y + camHeightOffset, myPlayerMesh.position.z);

    socket.emit('playerMovement', { x: myPlayerMesh.position.x, y: myPlayerMesh.position.y, z: myPlayerMesh.position.z });
    renderer.render(scene, camera);
}
animate();