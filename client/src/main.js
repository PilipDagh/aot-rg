import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { io } from 'socket.io-client';

// --- 1. GAME STATE & SETTINGS ---
let gameStarted = false;
let renderDistance = 1000;
let lookSensitivity = 1.0;
let amITitan = false;
let myOwnedTitans = [];
let myActiveTitan = null;

// ODM Resources
let currentGas = 100;
let currentBlades = 3;
let bladeDurability = 100;

// Keybinds
const binds = { forward: 'w', back: 's', left: 'a', right: 'd', jump: ' ', grapple: 'q', shift: 'b', nextTitan: ']', prevTitan: '[' };
const keys = {};

// --- 2. NETWORK SETUP ---
const socket = io(); // Automatically connects to Render URL

// --- 3. THREE.JS SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, renderDistance * 0.5, renderDistance);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Better Lighting
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
hemiLight.position.set(0, 200, 0);
scene.add(hemiLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(100, 200, 50);
scene.add(dirLight);

// --- 4. TEXTURES & ENVIRONMENT ---
const textureLoader = new THREE.TextureLoader();

// Grass Floor
const grassTex = textureLoader.load('https://threejsfundamentals.org/threejs/resources/images/grasslight-big.jpg');
grassTex.wrapS = THREE.RepeatWrapping;
grassTex.wrapT = THREE.RepeatWrapping;
grassTex.repeat.set(100, 100);
const floorMat = new THREE.MeshStandardMaterial({ map: grassTex });
const floorGeo = new THREE.PlaneGeometry(2000, 2000); // Made the floor massive!
const floorMesh = new THREE.Mesh(floorGeo, floorMat);
floorMesh.rotation.x = -Math.PI / 2;
scene.add(floorMesh);

// Giant Circular Walls (With Stone Texture)
const wallTex = textureLoader.load('https://threejsfundamentals.org/threejs/resources/images/wall.jpg');
wallTex.wrapS = THREE.RepeatWrapping;
wallTex.wrapT = THREE.RepeatWrapping;
wallTex.repeat.set(4, 2);
const wallMat = new THREE.MeshStandardMaterial({ map: wallTex });

const buildings = []; // Array for raycasting grapples
const wallRadius = 400;
const wallHeight = 50;
const wallThickness = 10;
const segments = 36;

// --- 5. CANNON.JS PHYSICS SETUP ---
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -20, 0) });
const defaultMaterial = new CANNON.Material('default');
const defaultContactMaterial = new CANNON.ContactMaterial(defaultMaterial, defaultMaterial, { friction: 0.1, restitution: 0.0 });
world.addContactMaterial(defaultContactMaterial);

// Floor Physics
const floorBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane(), material: defaultMaterial });
floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(floorBody);

// Generate Walls
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

// --- 6. PLAYER SETUP ---
const players = {};
const humanSize = new CANNON.Vec3(0.5, 1, 0.5);

const myGeometry = new THREE.BoxGeometry(1, 2, 1);
const myMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff });
const myPlayerMesh = new THREE.Mesh(myGeometry, myMaterial);
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
    document.body.requestPointerLock();
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
    scene.fog.far = renderDistance;
});

document.getElementById('sensitivity').addEventListener('input', (e) => {
    lookSensitivity = e.target.value;
    document.getElementById('sensVal').innerText = lookSensitivity;
});

document.getElementById('mobileToggle').addEventListener('change', (e) => {
    document.getElementById('mobileUI').style.display = e.target.checked ? 'block' : 'none';
});

// --- 8. INPUTS & CAMERA ---
let camAngleX = 0;
let camAngleY = 0;

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

    const abilityKeys = ['1','2','3','4','5','6','7','8','9','0','z','x','c','v'];
    if (amITitan && abilityKeys.includes(key)) socket.emit('useTitanAbility', key);
});

window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

// Mobile Buttons
document.getElementById('btnJump').addEventListener('touchstart', () => keys[binds.jump] = true);
document.getElementById('btnJump').addEventListener('touchend', () => keys[binds.jump] = false);
document.getElementById('btnGrapple').addEventListener('touchstart', () => keys[binds.grapple] = true);
document.getElementById('btnGrapple').addEventListener('touchend', () => keys[binds.grapple] = false);
document.getElementById('btnShift').addEventListener('touchstart', () => { if(myActiveTitan) socket.emit('toggleShift'); });

// --- 9. COMBAT & EATING ---
const raycaster = new THREE.Raycaster();

window.addEventListener('mousedown', (e) => {
    if (!gameStarted || e.button !== 0) return;
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    if (amITitan) {
        // Eat Players
        const intersects = raycaster.intersectObjects(Object.values(players));
        if (intersects.length > 0 && intersects[0].distance < 30) {
            const hitMesh = intersects[0].object;
            const victimId = Object.keys(players).find(key => players[key] === hitMesh);
            if (victimId) socket.emit('eatPlayer', victimId);
        }
    } else {
        // Sword Attack
        if (currentBlades <= 0) return; // Out of blades!
        
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

            let hitPart = 'body';
            if (localY > titanData.height / 2 * 0.6) {
                hitPart = localZ > 0 ? 'nape' : 'eyes';
            } else if (localY < -titanData.height / 2 * 0.2) {
                hitPart = localX < 0 ? 'leftLeg' : 'rightLeg';
            } else {
                hitPart = localX < 0 ? 'leftArm' : 'rightArm';
            }

            socket.emit('attackTitan', { id: titanId, part: hitPart });

            bladeDurability -= 25;
            if (bladeDurability <= 0) {
                currentBlades--;
                bladeDurability = currentBlades > 0 ? 100 : 0;
            }
        }
    }
});

// --- 10. NETWORK LISTENERS ---
const aiTitanMeshes = {};
const aiTitanBodies = {};
const pureMat = new THREE.MeshStandardMaterial({ color: 0x8B0000 });
const abnormalMat = new THREE.MeshStandardMaterial({ color: 0x800080 });

socket.on('currentPlayers', (serverPlayers) => {
    Object.keys(serverPlayers).forEach((id) => {
        if (id !== socket.id) {
            const mesh = new THREE.Mesh(myGeometry, new THREE.MeshStandardMaterial({ color: 0xff0000 }));
            mesh.position.set(serverPlayers[id].x, serverPlayers[id].y, serverPlayers[id].z);
            scene.add(mesh);
            players[id] = mesh;
        }
    });
    document.getElementById('playerCount').innerText = Object.keys(serverPlayers).length;
});

socket.on('newPlayer', (data) => {
    const mesh = new THREE.Mesh(myGeometry, new THREE.MeshStandardMaterial({ color: 0xff0000 }));
    mesh.position.set(data.player.x, data.player.y, data.player.z);
    scene.add(mesh);
    players[data.id] = mesh;
    document.getElementById('playerCount').innerText = Object.keys(players).length + 1;
});

socket.on('playerMoved', (data) => {
    if (players[data.id]) players[data.id].position.set(data.x, data.y, data.z);
});

socket.on('playerDisconnected', (id) => {
    if (players[id]) {
        scene.remove(players[id]);
        delete players[id];
        document.getElementById('playerCount').innerText = Object.keys(players).length + 1;
    }
});

// Titan Shifting Visuals
socket.on('playerShifted', (data) => {
    const isMe = data.id === socket.id;
    const targetMesh = isMe ? myPlayerMesh : players[data.id];

    if (data.isTitan) {
        if (isMe) {
            amITitan = true;
            document.getElementById('odmUI').style.display = 'none';
        }
        
        let scaleMult = 15; let color = 0xffaa00; let mass = 5000;
        switch(data.titanType) {
            case 'Colossal': scaleMult = 60; color = 0x8B0000; mass = 20000; break;
            case 'Armored': scaleMult = 15; color = 0x888888; mass = 10000; break;
            case 'Beast': scaleMult = 17; color = 0x5C4033; mass = 6000; break;
            case 'Jaw': scaleMult = 5; color = 0xDAA520; mass = 2000; break;
            case 'Cart': scaleMult = 4; color = 0xDEB887; mass = 2000; break;
            case 'Female': scaleMult = 14; color = 0xFFC0CB; mass = 4000; break;
            case 'Attack': scaleMult = 15; color = 0xCD853F; mass = 5000; break;
            case 'Warhammer': scaleMult = 15; color = 0xFFFFFF; mass = 6000; break;
            case 'Founding': scaleMult = 100; color = 0xE5E4E2; mass = 50000; break;
        }

        targetMesh.scale.set(scaleMult, data.titanType === 'Cart' ? scaleMult * 0.5 : scaleMult, data.titanType === 'Cart' ? scaleMult * 1.5 : scaleMult);
        targetMesh.material.color.setHex(color);

        if (isMe) {
            playerBody.shapes.forEach(shape => playerBody.removeShape(shape));
            playerBody.addShape(new CANNON.Box(new CANNON.Vec3(0.5 * scaleMult, (data.titanType === 'Cart' ? 0.5 : 1) * scaleMult, (data.titanType === 'Cart' ? 0.75 : 0.5) * scaleMult)));
            playerBody.mass = mass;
            playerBody.updateMassProperties();
        }
    } else {
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
            const geo = new THREE.BoxGeometry(tData.height / 3, tData.height, tData.height / 3);
            const mesh = new THREE.Mesh(geo, tData.type === 'Abnormal' ? abnormalMat : pureMat);
            mesh.userData = { height: tData.height };
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

        aiTitanMeshes[id].visible = true;
        aiTitanMeshes[id].position.set(tData.x, tData.y, tData.z);
        aiTitanBodies[id].position.set(tData.x, tData.y, tData.z);
        
        if (!tData.parts.leftLeg && !tData.parts.rightLeg) {
            aiTitanMeshes[id].position.y = tData.y - (tData.height * 0.25); 
        }
    });
});

// Spinal Fluids & UI Updates
const fluids = {};
const fluidGeo = new THREE.CylinderGeometry(0.5, 0.5, 2, 16);
const fluidMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 0.8 });

socket.on('updateFluids', (serverFluids) => {
    Object.values(fluids).forEach(mesh => scene.remove(mesh));
    for (let key in fluids) delete fluids[key];

    Object.keys(serverFluids).forEach(id => {
        const mesh = new THREE.Mesh(fluidGeo, fluidMat);
        mesh.position.set(serverFluids[id].x, serverFluids[id].y, serverFluids[id].z);
        scene.add(mesh);
        fluids[id] = mesh;
    });
});

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

socket.on('updateOwnedTitans', (titans) => myOwnedTitans = titans);
socket.on('youDied', (lostPowers) => {
    if (lostPowers) {
        myOwnedTitans = []; myActiveTitan = null;
        document.getElementById('titanUI').style.display = 'none';
    }
    if (amITitan) socket.emit('toggleShift');
    playerBody.position.set(0, 50, 0);
    playerBody.velocity.set(0, 0, 0);
});

socket.on('playerRespawned', (id) => {
    if (players[id]) {
        players[id].position.set(0, 10, 0);
        players[id].scale.set(1, 1, 1);
    }
});

socket.on('titanHit', (data) => {
    if (aiTitanMeshes[data.id]) {
        const origColor = aiTitanMeshes[data.id].material.color.getHex();
        aiTitanMeshes[data.id].material.color.setHex(data.part === 'nape' ? 0xffffff : 0xff0000);
        setTimeout(() => {
            if (aiTitanMeshes[data.id]) aiTitanMeshes[data.id].material.color.setHex(origColor);
        }, 200);
    }
});

// --- 11. MAIN GAME LOOP ---
const timeStep = 1 / 60;
let lastCallTime = performance.now();
let grapplePoint = null;

function animate() {
    requestAnimationFrame(animate);
    if (!gameStarted) return;

    const time = performance.now() / 1000;
    const dt = time - lastCallTime;
    lastCallTime = time;

    world.step(timeStep, dt, 3);

    myPlayerMesh.position.copy(playerBody.position);
    myPlayerMesh.quaternion.copy(playerBody.quaternion);

    // Movement
    const moveSpeed = amITitan ? 20000 : 400; // Titans are heavy, need more force
    if (keys[binds.forward]) playerBody.applyForce(new CANNON.Vec3(0, 0, -moveSpeed), playerBody.position);
    if (keys[binds.back]) playerBody.applyForce(new CANNON.Vec3(0, 0, moveSpeed), playerBody.position);
    if (keys[binds.left]) playerBody.applyForce(new CANNON.Vec3(-moveSpeed, 0, 0), playerBody.position);
    if (keys[binds.right]) playerBody.applyForce(new CANNON.Vec3(moveSpeed, 0, 0), playerBody.position);
    
    if (keys[binds.jump] && Math.abs(playerBody.velocity.y) < 0.1) {
        playerBody.velocity.y = amITitan ? 30 : 15;
    }

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
            currentGas -= 0.2; 
            if (currentGas < 0) currentGas = 0;
        }
    } else {
        grapplePoint = null;
    }

    // Refill Station (Top of the wall)
    if (myPlayerMesh.position.y > 48 && !amITitan) {
        currentGas = 100; currentBlades = 3; bladeDurability = 100;
    }

    // Fluid Pickup
    Object.keys(fluids).forEach(id => {
        if (myPlayerMesh.position.distanceTo(fluids[id].position) < 3.0) {
            socket.emit('collectFluid', id);
            scene.remove(fluids[id]); delete fluids[id];
        }
    });

    // Camera Orbit
    const camDist = amITitan ? 50 : 10;
    const camHeightOffset = amITitan ? 20 : 2;
    const camX = myPlayerMesh.position.x + camDist * Math.sin(camAngleX) * Math.cos(camAngleY);
    const camY = myPlayerMesh.position.y + camHeightOffset + camDist * Math.sin(camAngleY);
    const camZ = myPlayerMesh.position.z + camDist * Math.cos(camAngleX) * Math.cos(camAngleY);

    camera.position.set(camX, camY, camZ);
    camera.lookAt(myPlayerMesh.position.x, myPlayerMesh.position.y + camHeightOffset, myPlayerMesh.position.z);
    playerBody.quaternion.setFromEuler(0, camAngleX, 0);

    // Update UI
    if (!amITitan) {
        document.getElementById('gasVal').innerText = Math.floor(currentGas) + '%';
        document.getElementById('gasVal').style.color = currentGas > 30 ? '#00ff00' : '#ff0000';
        document.getElementById('bladeCount').innerText = currentBlades;
        document.getElementById('bladeDurability').innerText = Math.floor(bladeDurability) + '%';
    }

    socket.emit('playerMovement', { x: myPlayerMesh.position.x, y: myPlayerMesh.position.y, z: myPlayerMesh.position.z });
    renderer.render(scene, camera);
}
animate();