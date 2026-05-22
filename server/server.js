const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Import EVERYTHING from gameLogic exactly ONCE at the top of the file!
const { 
    gameState, 
    handleDisconnect, 
    rollTitanPower, 
    updateAILoop, 
    handleTitanHit, 
    handlePlayerEaten 
} = require('./gameLogic');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// --- RENDER DEPLOYMENT SETUP ---
// Serve the built frontend files
app.use(express.static(path.join(__dirname, '../client/dist')));
// If a user goes to your website, send them the game!
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// --- MULTIPLAYER NETWORK LOGIC ---
io.on('connection', (socket) => {
    console.log(`A Scout joined the server: ${socket.id}`);
    
    // Create a new player
    gameState.players[socket.id] = {
        x: 0, y: 10, z: 0, // Start slightly in the air
        isTitan: false,
        ownedTitans: [],
        activeTitan: null
    };

    // Send initial game state to the new player
    socket.emit('currentPlayers', gameState.players);
    socket.emit('updateFluids', gameState.spinalFluids);
    
    // Tell everyone else a new player joined
    socket.broadcast.emit('newPlayer', { id: socket.id, player: gameState.players[socket.id] });

    // 1. Movement
    socket.on('playerMovement', (movementData) => {
        if(gameState.players[socket.id]) {
            gameState.players[socket.id].x = movementData.x;
            gameState.players[socket.id].y = movementData.y;
            gameState.players[socket.id].z = movementData.z;
            socket.broadcast.emit('playerMoved', { id: socket.id, ...movementData });
        }
    });

    // 2. Spinal Fluid
    socket.on('collectFluid', (fluidId) => {
        if (gameState.spinalFluids[fluidId]) {
            delete gameState.spinalFluids[fluidId];
            io.emit('updateFluids', gameState.spinalFluids);

            const power = rollTitanPower();
            if (power) {
                gameState.availableTitans = gameState.availableTitans.filter(t => t !== power);
                gameState.players[socket.id].ownedTitans.push(power);
                gameState.players[socket.id].activeTitan = power;
                socket.emit('titanAcquired', power);
                console.log(`Player ${socket.id} acquired the ${power} Titan!`);
            } else {
                socket.emit('systemMessage', "The syringe was empty... All Titans are currently taken!");
            }

            // Respawn fluid after 10 seconds
            setTimeout(() => {
                const newId = 'fluid_' + Math.random().toString(36).substr(2, 9);
                gameState.spinalFluids[newId] = {
                    x: (Math.random() - 0.5) * 50, y: 1, z: (Math.random() - 0.5) * 50
                };
                io.emit('updateFluids', gameState.spinalFluids);
            }, 10000);
        }
    });

    // 3. Titan Shifting & Switching
    socket.on('toggleShift', () => {
        const player = gameState.players[socket.id];
        if (player && player.activeTitan) {
            player.isTitan = !player.isTitan;
            io.emit('playerShifted', { id: socket.id, isTitan: player.isTitan, titanType: player.activeTitan });
        }
    });

    socket.on('switchTitan', (direction) => {
        const player = gameState.players[socket.id];
        if (player && player.ownedTitans.length > 1 && !player.isTitan) {
            let currentIndex = player.ownedTitans.indexOf(player.activeTitan);
            if (direction === 'next') currentIndex = (currentIndex + 1) % player.ownedTitans.length;
            if (direction === 'prev') currentIndex = (currentIndex - 1 + player.ownedTitans.length) % player.ownedTitans.length;
            
            player.activeTitan = player.ownedTitans[currentIndex];
            socket.emit('titanSwitched', player.activeTitan);
        }
    });

    // 4. Combat (Swords & Eating)
    socket.on('attackTitan', (data) => {
        handleTitanHit(data.id, data.part);
        io.emit('titanHit', { id: data.id, part: data.part });
    });

    socket.on('eatPlayer', (victimId) => {
        const result = handlePlayerEaten(socket.id, victimId);
        if (result.success) {
            socket.emit('updateOwnedTitans', gameState.players[socket.id].ownedTitans);
            io.to(victimId).emit('youDied', result.stolenPowers.length > 0);
            io.emit('playerRespawned', victimId);
            if (result.stolenPowers.length > 0) {
                socket.emit('systemMessage', `You ate a shifter! Stolen powers: ${result.stolenPowers.join(', ')}`);
            }
        }
    });

    socket.on('useTitanAbility', (key) => {
        const player = gameState.players[socket.id];
        if (player && player.isTitan) {
            io.emit('titanAbilityUsed', { id: socket.id, key: key, titanType: player.activeTitan });
        }
    });

    // 5. Disconnect
    socket.on('disconnect', () => {
        console.log(`Scout left: ${socket.id}`);
        handleDisconnect(socket.id);
        io.emit('playerDisconnected', socket.id);
    });
});

// --- AI LOOP ---
// Run the AI loop 10 times per second
setInterval(() => {
    updateAILoop();
    io.emit('updateAITitans', gameState.aiTitans);
}, 100);

// --- START SERVER ---
// Render uses process.env.PORT to assign a dynamic port!
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`AoT Server running on port ${PORT}`);
});