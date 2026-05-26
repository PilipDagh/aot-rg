const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { roster, gameState, handlePlayerJoin, handleCombat } = require('./gameLogic');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, '../client/dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../client/dist/index.html')));

io.on('connection', (socket) => {
    socket.on('joinGame', (charName) => {
        if (!roster[charName]) return;
        handlePlayerJoin(socket.id, charName);
        socket.emit('init', { id: socket.id, players: gameState.players });
        socket.broadcast.emit('playerJoined', gameState.players[socket.id]);
    });

    socket.on('move', (data) => {
        if (gameState.players[socket.id] && !gameState.players[socket.id].isDead) {
            gameState.players[socket.id].x = data.x;
            gameState.players[socket.id].z = data.z;
        }
    });

    socket.on('castMove', (data) => {
        const result = handleCombat(socket.id, data.key);
        if (result) {
            // Broadcast the visual effect!
            io.emit('moveUsed', { attackerId: socket.id, moveName: result.moveName, type: result.type, angle: data.angle });
            
            // NEW: HANDLE DEATHS & RESPAWNS
            if (result.killed.length > 0) {
                result.killed.forEach(deadId => {
                    io.emit('playerDied', deadId); // Tell clients to make them fall over
                    
                    // Respawn after 3 seconds
                    setTimeout(() => {
                        if (gameState.players[deadId]) {
                            gameState.players[deadId].hp = gameState.players[deadId].maxHp;
                            gameState.players[deadId].ult = 0;
                            gameState.players[deadId].isDead = false;
                            gameState.players[deadId].x = (Math.random() - 0.5) * 40;
                            gameState.players[deadId].z = (Math.random() - 0.5) * 40;
                            io.emit('playerRespawned', gameState.players[deadId]);
                        }
                    }, 3000);
                });
            }
        }
    });

    socket.on('disconnect', () => {
        delete gameState.players[socket.id];
        io.emit('gameStateUpdate', gameState);
    });
});

setInterval(() => { io.emit('gameStateUpdate', gameState); }, 50);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`JJK Arena running on port ${PORT}`));