const gameState = {
  players: {},
  availableTitans: ['Attack', 'Female', 'Cart', 'Jaw', 'Colossal', 'Beast', 'Warhammer', 'Armored', 'Founding'],
  spinalFluids: { 'fluid_1': { x: 0, y: 1, z: -15 } },
  maxAiTitans: 41,
  aiTitans: {}
};

// ... (Keep your rollTitanPower and handleDisconnect functions here) ...

function spawnAITitans() {
  for (let i = 0; i < gameState.maxAiTitans; i++) {
      const isAbnormal = Math.random() < 0.2;
      const height = Math.floor(Math.random() * (108 - 38 + 1)) + 38;
      const angle = Math.random() * Math.PI * 2;
      const distance = 450 + Math.random() * 350; 
      
      gameState.aiTitans['ai_' + i] = {
          id: 'ai_' + i,
          x: Math.cos(angle) * distance,
          y: height / 2,
          z: Math.sin(angle) * distance,
          height: height,
          type: isAbnormal ? 'Abnormal' : 'Pure',
          baseSpeed: isAbnormal ? 1.2 : 0.4,
          speed: isAbnormal ? 1.2 : 0.4,
          targetDir: { x: 0, z: 0 },
          changeDirTimer: 0,
          isDead: false,
          // DISMEMBERMENT SYSTEM
          parts: { leftLeg: true, rightLeg: true, leftArm: true, rightArm: true, eyes: true },
          // Timers run at 10 ticks per second (90 = 9 seconds, 80 = 8 seconds)
          timers: { leftLeg: 0, rightLeg: 0, leftArm: 0, rightArm: 0, eyes: 0 }
      };
  }
}
spawnAITitans();

function updateAILoop() {
  const players = Object.values(gameState.players);

  Object.values(gameState.aiTitans).forEach(titan => {
      if (titan.isDead) return;

      // 1. Process Regen Timers
      if (!titan.parts.eyes) { titan.timers.eyes--; if(titan.timers.eyes <= 0) titan.parts.eyes = true; }
      if (!titan.parts.leftLeg) { titan.timers.leftLeg--; if(titan.timers.leftLeg <= 0) titan.parts.leftLeg = true; }
      if (!titan.parts.rightLeg) { titan.timers.rightLeg--; if(titan.timers.rightLeg <= 0) titan.parts.rightLeg = true; }
      if (!titan.parts.leftArm) { titan.timers.leftArm--; if(titan.timers.leftArm <= 0) titan.parts.leftArm = true; }
      if (!titan.parts.rightArm) { titan.timers.rightArm--; if(titan.timers.rightArm <= 0) titan.parts.rightArm = true; }

      // 2. Adjust Speed & Behavior based on Limbs
      titan.speed = titan.baseSpeed;
      if (!titan.parts.eyes) {
          titan.speed = 0; // Blinded! Stand still.
      } else if (!titan.parts.leftLeg && !titan.parts.rightLeg) {
          titan.speed = titan.baseSpeed * 0.2; // Both legs gone! Crawling.
      }

      // 3. Movement Logic (Only move if speed > 0)
      if (titan.speed > 0) {
          if (titan.type === 'Pure') {
              let nearestPlayer = null;
              let minDist = Infinity;
              players.forEach(p => {
                  const dist = Math.sqrt(Math.pow(p.x - titan.x, 2) + Math.pow(p.z - titan.z, 2));
                  if (dist < minDist) { minDist = dist; nearestPlayer = p; }
              });

              if (nearestPlayer && minDist < 1000) {
                  // If both arms are gone and player is super close, use mouth!
                  if (!titan.parts.leftArm && !titan.parts.rightArm && minDist < 15) {
                      // TODO: Trigger "Eaten by Mouth" logic later!
                  }

                  const dx = nearestPlayer.x - titan.x;
                  const dz = nearestPlayer.z - titan.z;
                  const length = Math.sqrt(dx*dx + dz*dz);
                  titan.x += (dx / length) * titan.speed;
                  titan.z += (dz / length) * titan.speed;
              }
          } else if (titan.type === 'Abnormal') {
              titan.changeDirTimer -= 1;
              if (titan.changeDirTimer <= 0) {
                  const randomAngle = Math.random() * Math.PI * 2;
                  titan.targetDir = { x: Math.cos(randomAngle), z: Math.sin(randomAngle) };
                  titan.changeDirTimer = Math.floor(Math.random() * 50) + 20;
                  titan.baseSpeed = Math.random() > 0.5 ? 2.5 : 0.2; 
              }
              titan.x += titan.targetDir.x * titan.speed;
              titan.z += titan.targetDir.z * titan.speed;
          }
      }
  });
}

// Add a function to handle attacks
function handleTitanHit(titanId, part) {
  const titan = gameState.aiTitans[titanId];
  if (!titan || titan.isDead) return;

  if (part === 'nape') {
      titan.isDead = true;
      console.log(`Titan ${titanId} was killed!`);
      // Respawn it somewhere else after 5 seconds
      setTimeout(() => {
          titan.isDead = false;
          titan.parts = { leftLeg: true, rightLeg: true, leftArm: true, rightArm: true, eyes: true };
          const angle = Math.random() * Math.PI * 2;
          const distance = 450 + Math.random() * 350; 
          titan.x = Math.cos(angle) * distance;
          titan.z = Math.sin(angle) * distance;
      }, 5000);
  } 
  else if (part === 'eyes') { titan.parts.eyes = false; titan.timers.eyes = 80; } // 8 secs
  else if (part === 'leftLeg') { titan.parts.leftLeg = false; titan.timers.leftLeg = 90; } // 9 secs
  else if (part === 'rightLeg') { titan.parts.rightLeg = false; titan.timers.rightLeg = 90; }
  else if (part === 'leftArm') { titan.parts.leftArm = false; titan.timers.leftArm = 90; }
  else if (part === 'rightArm') { titan.parts.rightArm = false; titan.timers.rightArm = 90; }
}

function handlePlayerEaten(attackerId, victimId) {
    const attacker = gameState.players[attackerId];
    const victim = gameState.players[victimId];

    if (attacker && victim && attacker.isTitan) {
        let stolenPowers = [];
        
        // If the victim had Titan powers, steal them!
        if (victim.ownedTitans.length > 0) {
            stolenPowers = [...victim.ownedTitans];
            attacker.ownedTitans.push(...victim.ownedTitans);
            
            // Strip the victim of their powers
            victim.ownedTitans = [];
            victim.activeTitan = null;
            victim.isTitan = false;
        }

        // Reset victim position (Respawn them)
        victim.x = 0;
        victim.y = 10;
        victim.z = 0;

        return { success: true, stolenPowers: stolenPowers };
    }
    return { success: false };
}

// Update your module.exports at the very bottom to include handlePlayerEaten:
module.exports = { gameState, rollTitanPower, handleDisconnect, updateAILoop, handleTitanHit, handlePlayerEaten };
