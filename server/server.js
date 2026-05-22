const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { gameState, handleDisconnect } = require('./gameLogic');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" } // Allows our frontend to connect
});

io.on('connection', (socket) => {
    console.log(`A Scout joined the server: ${socket.id}`);
    
    // Titan Shifting (The 'B' key)
    socket.on('toggleShift', () => {
      const player = gameState.players[socket.id];
      if (player && player.activeTitan) {
          player.isTitan = !player.isTitan; // Toggle state
          // Tell everyone this player just transformed!
          io.emit('playerShifted', { 
              id: socket.id, 
              isTitan: player.isTitan, 
              titanType: player.activeTitan 
          });
      }
  });

  const { handleTitanHit, handlePlayerEaten } = require('./gameLogic'); // Update your import!

    // Listen for a Titan eating a player
    socket.on('eatPlayer', (victimId) => {
        const result = handlePlayerEaten(socket.id, victimId);
        
        if (result.success) {
            // Tell the attacker their new powers
            socket.emit('updateOwnedTitans', gameState.players[socket.id].ownedTitans);
            
            // Tell the victim they died
            io.to(victimId).emit('youDied', result.stolenPowers.length > 0);
            
            // Tell everyone else to update the victim's position/state
            io.emit('playerRespawned', victimId);

            if (result.stolenPowers.length > 0) {
                socket.emit('systemMessage', `You ate a shifter! Stolen powers: ${result.stolenPowers.join(', ')}`);
            }
        }
    });

    // Listen for Titan Abilities (1-0, Z-V)
    socket.on('useTitanAbility', (key) => {
        const player = gameState.players[socket.id];
        if (player && player.isTitan) {
            // Broadcast the ability so everyone sees the visual effect
            io.emit('titanAbilityUsed', { id: socket.id, key: key, titanType: player.activeTitan });
        }
    });

  const { handleTitanHit } = require('./gameLogic'); // Make sure to import it at the top!

    // Listen for Sword Slashes
    socket.on('attackTitan', (data) => {
        handleTitanHit(data.id, data.part);
        // Broadcast the hit so clients can play a blood effect or sound
        io.emit('titanHit', { id: data.id, part: data.part });
    });

  // Switching Titans (The [ and ] keys)
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

    // Create a new player
    gameState.players[socket.id] = {
        x: 0, y: 1, z: 0, // Starting position
        isTitan: false,
        ownedTitans: [],
        activeTitan: null
    };

    // Send the current game state to the new player
    socket.emit('currentPlayers', gameState.players);

    // Tell everyone else a new player joined
    socket.broadcast.emit('newPlayer', { id: socket.id, player: gameState.players[socket.id] });

    // Handle player movement
    socket.on('playerMovement', (movementData) => {
        if(gameState.players[socket.id]) {
            gameState.players[socket.id].x = movementData.x;
            gameState.players[socket.id].y = movementData.y;
            gameState.players[socket.id].z = movementData.z;
            // Broadcast new position to all other players
            socket.broadcast.emit('playerMoved', { id: socket.id, ...movementData });
        }
    });

    // Send the current fluids to the new player
    socket.emit('updateFluids', gameState.spinalFluids);

    // Handle picking up Spinal Fluid
    socket.on('collectFluid', (fluidId) => {
        if (gameState.spinalFluids[fluidId]) {
            // 1. Remove the fluid from the map
            delete gameState.spinalFluids[fluidId];
            io.emit('updateFluids', gameState.spinalFluids); // Tell everyone it's gone

            // 2. Roll for a Titan Power
            const power = rollTitanPower();
            
            if (power) {
                // Remove it from the global pool so nobody else can get it
                gameState.availableTitans = gameState.availableTitans.filter(t => t !== power);
                
                // Give it to the player
                gameState.players[socket.id].ownedTitans.push(power);
                gameState.players[socket.id].activeTitan = power;
                
                // Tell the specific player what they got!
                socket.emit('titanAcquired', power);
                console.log(`Player ${socket.id} acquired the ${power} Titan!`);
            } else {
                socket.emit('systemMessage', "The syringe was empty... All Titans are currently taken!");
            }

            // Respawn a new fluid somewhere random after 10 seconds
            setTimeout(() => {
                const newId = 'fluid_' + Math.random().toString(36).substr(2, 9);
                gameState.spinalFluids[newId] = {
                    x: (Math.random() - 0.5) * 50,
                    y: 1,
                    z: (Math.random() - 0.5) * 50
                };
                io.emit('updateFluids', gameState.spinalFluids);
            }, 10000);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Scout left: ${socket.id}`);
        handleDisconnect(socket.id); // This will eventually return their Titan to the pool
        io.emit('playerDisconnected', socket.id);
    });
});

const path = require('path');
// Serve the built frontend files
app.use(express.static(path.join(__dirname, '../client/dist')));
// If a user goes to your website, send them the game!
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

server.listen(3000, () => {
    console.log('AoT Server running on port 3000');
});

const { updateAILoop } = require('./gameLogic');

// Run the AI loop 10 times per second
setInterval(() => {
    updateAILoop();
    io.emit('updateAITitans', gameState.aiTitans);
}, 100);