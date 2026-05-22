const gameState = {
  players: {},
  availableTitans: [
      'Attack', 'Female', 'Cart', 'Jaw', 'Colossal', 
      'Beast', 'Warhammer', 'Armored', 'Founding'
  ],
  // Let's spawn one Spinal Fluid syringe at coordinates (0, 1, -15) to start
  spinalFluids: {
      'fluid_1': { x: 0, y: 1, z: -15 }
  }
};

const gameState = {
  players: {},
  availableTitans: ['Attack', 'Female', 'Cart', 'Jaw', 'Colossal', 'Beast', 'Warhammer', 'Armored', 'Founding'],
  spinalFluids: { 'fluid_1': { x: 0, y: 1, z: -15 } },
  maxAiTitans: 41, // Hard cap for AI Titans
  currentAiTitans: 0
};
// (Keep the rest of your gameLogic.js the same)

function rollTitanPower() {
  const available = gameState.availableTitans;
  if (available.length === 0) return null; // All titans are taken!

  const hasFounding = available.includes('Founding');
  const others = available.filter(t => t !== 'Founding');

  // 1. Roll for the Founding Titan (5% chance)
  if (hasFounding) {
      const roll = Math.random(); // Random number between 0.0 and 1.0
      if (roll <= 0.05 || others.length === 0) {
          return 'Founding';
      }
  }

  // 2. If we didn't get Founding, pick equally from the remaining Titans
  if (others.length > 0) {
      const randomIndex = Math.floor(Math.random() * others.length);
      return others[randomIndex];
  }

  return null;
}

function handleDisconnect(playerId) {
  const player = gameState.players[playerId];
  if (player && player.ownedTitans.length > 0) {
      gameState.availableTitans.push(...player.ownedTitans);
      console.log(`Titans returned to pool: ${player.ownedTitans.join(', ')}`);
  }
  delete gameState.players[playerId];
}

module.exports = { gameState, rollTitanPower, handleDisconnect };