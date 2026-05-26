const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { GameLogic } = require('./gameLogic');


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});


const PORT = process.env.PORT || 3000;
const game = new GameLogic();


app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.static(path.join(__dirname, '../client')));


io.on('connection', (socket) => {
  socket.on('joinGame', ({ name, character }) => {
    const player = game.addPlayer(socket.id, name, character);
    socket.emit('initSync', { id: socket.id, players: game.players });
    io.emit('playerJoined', player);
  });


  socket.on('playerInput', (data) => {
    game.updatePlayerPosition(socket.id, data);
  });


  socket.on('useAbility', (key) => {
    game.handleAbility(
      socket.id, 
      key, 
      (vfx) => io.emit('vfxTrigger', vfx),
      (dmg) => io.emit('damageDealt', dmg),
      (kill) => io.emit('playerKilled', kill)
    );
  });


  socket.on('disconnect', () => {
    game.removePlayer(socket.id);
    io.emit('playerLeft', socket.id);
  });
});


let lastTime = Date.now();
setInterval(() => {
  const now = Date.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;


  game.updateProjectiles(
    dt, 
    (dmg) => io.emit('damageDealt', dmg),
    (kill) => io.emit('playerKilled', kill)
  );


  io.emit('gameStateUpdate', { players: game.players, projectiles: game.projectiles });
}, 1000 / 45);


server.listen(PORT, () => {
  console.log(`Server listening running on port ${PORT}`);
});

