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
scene.background = new THREE.Color(0x111111); // Dark Arena Vibe

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(20, 50, 20);
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040));

// The Arena Floor (Concrete)
const floorGeo = new THREE.PlaneGeometry(100, 100);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// --- PLAYER LOGIC ---
const players = {};
let myId = null;

const playerGeo = new THREE.CylinderGeometry(0.5, 0.5, 2, 16);
const myMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const enemyMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });

socket.on('init', (data) => {
    myId = data.id;
    Object.values(data.players).forEach(p => addPlayer(p));
});

socket.on('playerJoined', (p) => addPlayer(p));

socket.on('gameStateUpdate', (state) => {
    Object.values(state.players).forEach(p => {
        if (players[p.id]) {
            // Smooth movement
            players[p.id].mesh.position.set(p.x, 1, p.z);
            
            // Update My UI
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
    const mesh = new THREE.Mesh(playerGeo, p.id === myId ? myMat : enemyMat);
    mesh.position.set(p.x, 1, p.z);
    scene.add(mesh);
    players[p.id] = { mesh, data: p };
}

// --- VISUAL EFFECTS (COMBAT) ---
socket.on('moveUsed', (data) => {
    const attacker = players[data.attackerId];
    if (!attacker) return;

    // Create a flash effect based on the move
    const effectGeo = new THREE.SphereGeometry(2, 16, 16);
    let color = 0xffffff;
    if (data.moveName.includes("Red")) color = 0xff0000;
    if (data.moveName.includes("Blue")) color = 0x0000ff;
    if (data.moveName.includes("Purple")) color = 0xaa00ff;
    if (data.moveName.includes("Blood")) color = 0x8b0000;
    if (data.moveName.includes("Lava")) color = 0xff5500;

    const effectMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.8 });
    const effect = new THREE.Mesh(effectGeo, effectMat);
    effect.position.copy(attacker.mesh.position);
    scene.add(effect);

    // Fade out effect
    let scale = 1;
    const fade = setInterval(() => {
        scale += 0.2;
        effect.scale.set(scale, scale, scale);
        effect.material.opacity -= 0.1;
        if (effect.material.opacity <= 0) {
            scene.remove(effect);
            clearInterval(fade);
        }
    }, 30);
});

// --- CONTROLS & MOVEMENT ---
const keys = { w: false, a: false, s: false, d: false };
let camAngleX = 0;

document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body) {
        camAngleX -= e.movementX * 0.002;
    }
});

window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (keys.hasOwnProperty(k)) keys[k] = true;
    
    // Combat Keys
    if (['q', 'e', 'r'].includes(k)) {
        socket.emit('castMove', { key: k.toUpperCase() });
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
    const speed = 0.2;
    let moved = false;

    // Move relative to camera
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0,1,0), camAngleX);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0,1,0), camAngleX);

    if (keys.w) { myMesh.position.addScaledVector(forward, speed); moved = true; }
    if (keys.s) { myMesh.position.addScaledVector(forward, -speed); moved = true; }
    if (keys.a) { myMesh.position.addScaledVector(right, -speed); moved = true; }
    if (keys.d) { myMesh.position.addScaledVector(right, speed); moved = true; }

    // Keep in bounds
    myMesh.position.x = Math.max(-48, Math.min(48, myMesh.position.x));
    myMesh.position.z = Math.max(-48, Math.min(48, myMesh.position.z));

    if (moved) {
        socket.emit('move', { x: myMesh.position.x, z: myMesh.position.z });
    }

    // Camera follows player
    camera.position.set(
        myMesh.position.x + Math.sin(camAngleX) * 10,
        myMesh.position.y + 5,
        myMesh.position.z + Math.cos(camAngleX) * 10
    );
    camera.lookAt(myMesh.position);

    renderer.render(scene, camera);
}
animate();