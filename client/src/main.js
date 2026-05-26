import * as THREE from 'three';
import { io } from 'socket.io-client';

const socket = io();

// --- UI LOGIC ---
const rosterKeys = ["Yuji", "Gojo", "Megumi", "Todo", "Hakari", "Yuta", "Choso", "Mahito", "Jogo", "Dagon", "Naoya", "Takaba", "Junpei", "Nanami", "Nobara", "Panda", "Toji", "Mei Mei", "Geto", "Urame", "Miwa"];
const rosterDiv = document.getElementById('roster');

rosterKeys.forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'char-btn';
    btn.innerText = name;
    btn.onclick = () => {
        socket.emit('joinGame', name);
        document.getElementById('charSelect').style.display = 'none';
        document.getElementById('gameUI').style.display = 'block';
        document.getElementById('myName').innerText = name;
        document.body.requestPointerLock();
    };
    rosterDiv.appendChild(btn);
});

// --- 3D ARENA SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(20, 50, 20);
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040));

const floorGeo = new THREE.PlaneGeometry(100, 100);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// --- PROCEDURAL CHARACTER MODELS ---
const charColors = {
    "Yuji": 0xff9999, "Gojo": 0x66ccff, "Megumi": 0x003366, "Todo": 0x8b4513,
    "Hakari": 0xffd700, "Yuta": 0xeeeeee, "Choso": 0x8b0000, "Mahito": 0x778899,
    "Jogo": 0xff4500, "Dagon": 0xcd5c5c, "Naoya": 0xeeee00, "Takaba": 0xffffff,
    "Junpei": 0x2f4f4f, "Nanami": 0xf5deb3, "Nobara": 0xd2691e, "Panda": 0xffffff,
    "Toji": 0x222222, "Mei Mei": 0xdda0dd, "Geto": 0x4b0082, "Urame": 0xe0ffff, "Miwa": 0x4682b4
};

function createCharacterModel(charName) {
    const color = charColors[charName] || 0xffffff;
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffccaa });

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), skinMat);
    head.position.y = 1.8;
    group.add(head);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1, 0.4), mat);
    torso.position.y = 1;
    group.add(torso);

    const armGeo = new THREE.BoxGeometry(0.25, 1, 0.25);
    const leftArm = new THREE.Mesh(armGeo, mat);
    leftArm.position.set(-0.55, 1, 0);
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, mat);
    rightArm.position.set(0.55, 1, 0);
    group.add(rightArm);

    const legGeo = new THREE.BoxGeometry(0.3, 1, 0.3);
    const leftLeg = new THREE.Mesh(legGeo, mat);
    leftLeg.position.set(-0.2, 0.5, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, mat);
    rightLeg.position.set(0.2, 0.5, 0);
    group.add(rightLeg);

    group.userData = { leftArm, rightArm, leftLeg, rightLeg, isDead: false };
    return group;
}

// --- PLAYER LOGIC ---
const players = {};
let myId = null;
let amIDead = false;

socket.on('init', (data) => {
    myId = data.id;
    Object.values(data.players).forEach(p => addPlayer(p));
});

socket.on('playerJoined', (p) => addPlayer(p));

socket.on('gameStateUpdate', (state) => {
    Object.values(state.players).forEach(p => {
        if (players[p.id] && !players[p.id].mesh.userData.isDead) {
            players[p.id].mesh.position.set(p.x, 0, p.z);
            
            if (p.id === myId) {
                document.getElementById('hpFill').style.width = `${(p.hp / p.maxHp) * 100}%`;
                document.getElementById('hpText').innerText = `${Math.max(0, p.hp)} / ${p.maxHp} HP`;
                document.getElementById('ultFill').style.width = `${(p.ult / p.maxUlt) * 100}%`;
                document.getElementById('ultText').innerText = `${p.ult} / ${p.maxUlt} ULT`;
            }
        }
    });
});

function addPlayer(p) {
    if (players[p.id]) return;
    const mesh = createCharacterModel(p.charName);
    mesh.position.set(p.x, 0, p.z);
    scene.add(mesh);
    players[p.id] = { mesh, data: p };
}

// --- DEATH & RESPAWN LOGIC ---
socket.on('playerDied', (deadId) => {
    if (players[deadId]) {
        players[deadId].mesh.userData.isDead = true;
        players[deadId].mesh.rotation.x = -Math.PI / 2; // Fall over!
        players[deadId].mesh.position.y = 0.3;
    }
    if (deadId === myId) {
        amIDead = true;
        document.getElementById('deathScreen').style.display = 'flex';
    }
});

socket.on('playerRespawned', (p) => {
    if (players[p.id]) {
        players[p.id].mesh.userData.isDead = false;
        players[p.id].mesh.rotation.x = 0; // Stand back up
        players[p.id].mesh.position.set(p.x, 0, p.z);
    }
    if (p.id === myId) {
        amIDead = false;
        document.getElementById('deathScreen').style.display = 'none';
    }
});

socket.on('playerDisconnected', (id) => {
    if (players[id]) { scene.remove(players[id].mesh); delete players[id]; }
});

// --- VISUAL EFFECTS (VFX ENGINE) ---
const activeEffects = [];

socket.on('moveUsed', (data) => {
    const attacker = players[data.attackerId];
    if (!attacker) return;

    // Make attacker face the direction of the attack
    attacker.mesh.rotation.y = data.angle;

    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0,1,0), data.angle);
    
    // Determine Color based on Move Name
    let color = 0xffffff;
    if (data.moveName.includes("Red") || data.moveName.includes("Blood") || data.moveName.includes("Fire") || data.moveName.includes("Lava")) color = 0xff0000;
    else if (data.moveName.includes("Blue") || data.moveName.includes("Water")) color = 0x0000ff;
    else if (data.moveName.includes("Purple") || data.moveName.includes("Shadow")) color = 0xaa00ff;
    else if (data.moveName.includes("Energy") || data.moveName.includes("Green")) color = 0x00ff00;

    // Generate specific VFX based on move type
    if (data.type === 'projectile') {
        const geo = new THREE.SphereGeometry(1, 16, 16);
        const mat = new THREE.MeshBasicMaterial({ color: color });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(attacker.mesh.position).add(new THREE.Vector3(0, 1, 0));
        scene.add(mesh);
        activeEffects.push({ mesh, type: 'projectile', velocity: forward.multiplyScalar(0.8), life: 60 });
    } 
    else if (data.type === 'beam') {
        const geo = new THREE.CylinderGeometry(0.5, 0.5, 30, 16);
        const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.8 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(attacker.mesh.position).add(new THREE.Vector3(0, 1, 0)).add(forward.clone().multiplyScalar(15));
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), forward);
        scene.add(mesh);
        activeEffects.push({ mesh, type: 'fade', life: 20 });
    } 
    else if (data.type === 'melee') {
        const geo = new THREE.BoxGeometry(4, 0.2, 1);
        const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.8 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(attacker.mesh.position).add(new THREE.Vector3(0, 1, 0)).add(forward.clone().multiplyScalar(2));
        mesh.rotation.y = data.angle;
        scene.add(mesh);
        activeEffects.push({ mesh, type: 'slash', life: 15 });
    } 
    else if (data.type === 'aoe' || data.type === 'domain' || data.type === 'transform') {
        const geo = new THREE.SphereGeometry(data.type === 'domain' ? 30 : 8, 32, 32);
        const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.5, wireframe: data.type === 'domain' });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(attacker.mesh.position);
        scene.add(mesh);
        activeEffects.push({ mesh, type: 'expand', life: 30 });
    }
});

// --- CONTROLS & MOVEMENT ---
const keys = { w: false, a: false, s: false, d: false };
let camAngleX = 0;

document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body) camAngleX -= e.movementX * 0.002;
});

window.addEventListener('keydown', (e) => {
    if (amIDead) return; // Can't do anything if dead!
    const k = e.key.toLowerCase();
    if (keys.hasOwnProperty(k)) keys[k] = true;
    
    if (['q', 'e', 'r'].includes(k)) {
        socket.emit('castMove', { key: k.toUpperCase(), angle: camAngleX });
    }
});

window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (keys.hasOwnProperty(k)) keys[k] = false;
});

// Main Loop
function animate() {
    requestAnimationFrame(animate);
    if (!myId || !players[myId]) return;

    const myMesh = players[myId].mesh;
    
    if (!amIDead) {
        const speed = 0.2;
        let moved = false;

        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0,1,0), camAngleX);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0,1,0), camAngleX);

        if (keys.w) { myMesh.position.addScaledVector(forward, speed); moved = true; }
        if (keys.s) { myMesh.position.addScaledVector(forward, -speed); moved = true; }
        if (keys.a) { myMesh.position.addScaledVector(right, -speed); moved = true; }
        if (keys.d) { myMesh.position.addScaledVector(right, speed); moved = true; }

        myMesh.position.x = Math.max(-48, Math.min(48, myMesh.position.x));
        myMesh.position.z = Math.max(-48, Math.min(48, myMesh.position.z));
        myMesh.rotation.y = camAngleX;

        if (moved) socket.emit('move', { x: myMesh.position.x, z: myMesh.position.z });

        // Walking Animation
        const animSpeed = performance.now() / 150;
        if (moved) {
            myMesh.userData.leftArm.rotation.x = Math.sin(animSpeed) * 0.8;
            myMesh.userData.rightArm.rotation.x = -Math.sin(animSpeed) * 0.8;
            myMesh.userData.leftLeg.rotation.x = -Math.sin(animSpeed) * 0.8;
            myMesh.userData.rightLeg.rotation.x = Math.sin(animSpeed) * 0.8;
        } else {
            myMesh.userData.leftArm.rotation.x = 0; myMesh.userData.rightArm.rotation.x = 0;
            myMesh.userData.leftLeg.rotation.x = 0; myMesh.userData.rightLeg.rotation.x = 0;
        }
    }

    // Process VFX Animations
    for (let i = activeEffects.length - 1; i >= 0; i--) {
        const fx = activeEffects[i];
        fx.life--;
        
        if (fx.type === 'projectile') fx.mesh.position.add(fx.velocity);
        else if (fx.type === 'fade') fx.mesh.material.opacity -= 0.05;
        else if (fx.type === 'slash') { fx.mesh.rotation.y += 0.2; fx.mesh.material.opacity -= 0.06; }
        else if (fx.type === 'expand') { fx.mesh.scale.addScalar(0.1); fx.mesh.material.opacity -= 0.02; }
        
        if (fx.life <= 0) { scene.remove(fx.mesh); activeEffects.splice(i, 1); }
    }

    camera.position.set(myMesh.position.x + Math.sin(camAngleX) * 10, myMesh.position.y + 5, myMesh.position.z + Math.cos(camAngleX) * 10);
    camera.lookAt(myMesh.position);

    renderer.render(scene, camera);
}
animate();