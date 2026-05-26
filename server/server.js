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
    console.log(`Player connected: ${socket.id}`);

    socket.on('joinGame', (charName) => {
        if (!roster[charName]) return;
        handlePlayerJoin(socket.id, charName);
        
        socket.emit('init', { id: socket.id, players: gameState.players });
        socket.broadcast.emit('playerJoined', gameState.players[socket.id]);
    });

    socket.on('move', (data) => {
        if (gameState.players[socket.id]) {
            gameState.players[socket.id].x = data.x;
            gameState.players[socket.id].z = data.z;
        }
    });

    socket.on('castMove', (data) => {
        const result = handleCombat(socket.id, data.key);
        if (result) {
            io.emit('moveUsed', { attackerId: socket.id, moveName: result.moveName, type: result.type });
        }
    });

    socket.on('disconnect', () => {
        delete gameState.players[socket.id];
        io.emit('gameStateUpdate', gameState);
    });
});

// Game Loop (Syncs HP and Position 20 times a second)
setInterval(() => {
    io.emit('gameStateUpdate', gameState);
}, 50);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`JJK Arena running on port ${PORT}`));