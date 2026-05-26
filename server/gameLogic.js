// THE ULTIMATE JJK ROSTER
const roster = {
    "Yuji": { hp: 760, ultMax: 777, moves: {
        Q: { name: "Manji Kick", dmg: 167, cd: 1.0, type: "melee" },
        E: { name: "Black Flash", dmg: 176, cd: 2.0, type: "melee" },
        R: { name: "Sukuna Transform", dmg: 0, cd: 0, type: "transform", reqUlt: 777 }
    }},
    "Gojo": { hp: 750, ultMax: 300, moves: {
        Q: { name: "Reversal Red", dmg: 128, cd: 5.0, type: "projectile" },
        E: { name: "Lapse Blue", dmg: 107, cd: 4.0, type: "projectile" },
        R: { name: "Blindfold Off", dmg: 0, cd: 0, type: "transform", reqUlt: 300 }
    }},
    "Megumi": { hp: 666, ultMax: 600, moves: {
        Q: { name: "Nue", dmg: 138, cd: 5.0, type: "projectile" },
        E: { name: "Divine Dog", dmg: 118, cd: 7.0, type: "summon" },
        R: { name: "Chimera Shadow Garden", dmg: 0, cd: 11.0, type: "domain", reqUlt: 600 }
    }},
    "Todo": { hp: 670, ultMax: 400, moves: {
        Q: { name: "Boogie Woogie", dmg: 5, cd: 1.0, type: "swap" },
        E: { name: "Rock Throw", dmg: 97, cd: 1.0, type: "projectile" },
        R: { name: "Brotherly Love!", dmg: 0, cd: 11.0, type: "transform", reqUlt: 400 }
    }},
    "Hakari": { hp: 700, ultMax: 300, moves: {
        Q: { name: "Reserve Ball", dmg: 96, cd: 2.0, type: "projectile" },
        E: { name: "Shutter Door", dmg: 143, cd: 4.0, type: "projectile" },
        R: { name: "Rough Energy", dmg: 146, cd: 2.2, type: "melee", reqUlt: 0 } // Domain triggers if ult is full
    }},
    "Yuta": { hp: 787, ultMax: 500, moves: {
        Q: { name: "Sword Slash", dmg: 110, cd: 1.5, type: "melee" },
        E: { name: "Rika Manifest", dmg: 0, cd: 10.0, type: "buff" },
        R: { name: "Pure True Love", dmg: 256, cd: 4.0, type: "beam", reqUlt: 500 }
    }},
    "Choso": { hp: 720, ultMax: 500, moves: {
        Q: { name: "Blood Strike", dmg: 189, cd: 3.0, type: "melee" },
        E: { name: "Piercing Blood", dmg: 89, cd: 4.0, type: "beam" },
        R: { name: "Transform Ult", dmg: 0, cd: 0, type: "transform", reqUlt: 500 }
    }},
    "Mahito": { hp: 990, ultMax: 600, moves: {
        Q: { name: "Idle Transfiguration", dmg: 300, cd: 5.0, type: "melee" },
        E: { name: "Soul Worm", dmg: 132, cd: 5.0, type: "projectile" },
        R: { name: "ISBODK", dmg: 0, cd: 0, type: "transform", reqUlt: 600 }
    }},
    "Jogo": { hp: 777, ultMax: 500, moves: {
        Q: { name: "Lava Slash", dmg: 101, cd: 1.2, type: "melee" },
        E: { name: "Magma Shot", dmg: 78, cd: 1.7, type: "projectile" },
        R: { name: "Flame Dash", dmg: 87, cd: 2.2, type: "dash", reqUlt: 0 }
    }},
    "Dagon": { hp: 445, ultMax: 445, moves: {
        Q: { name: "Crunch", dmg: 67, cd: 0.7, type: "melee" },
        E: { name: "Spit", dmg: 75, cd: 0.9, type: "projectile" },
        R: { name: "Transform", dmg: 0, cd: 0, type: "transform", reqUlt: 445 }
    }},
    "Naoya": { hp: 650, ultMax: 400, moves: {
        Q: { name: "M1", dmg: 89, cd: 0.7, type: "melee" },
        E: { name: "Bleedout", dmg: 138, cd: 1.67, type: "melee" },
        R: { name: "Projection Barrage", dmg: 200, cd: 5.0, type: "dash", reqUlt: 400 }
    }},
    "Takaba": { hp: 690, ultMax: 700, moves: {
        Q: { name: "Pop a Joke", dmg: 0, cd: 0.8, type: "buff" },
        E: { name: "Wife-Fi", dmg: 50, cd: 3.0, type: "aoe" },
        R: { name: "Truck Kun", dmg: 500, cd: 10.0, type: "projectile", reqUlt: 700 }
    }},
    "Junpei": { hp: 550, ultMax: 670, moves: {
        Q: { name: "Slow Motion Punch", dmg: 43, cd: 0.69, type: "melee" },
        E: { name: "Finger Penetrate", dmg: 67, cd: 1.7, type: "melee" },
        R: { name: "Trash Tornado", dmg: 200, cd: 2.0, type: "aoe", reqUlt: 300 }
    }},
    "Nanami": { hp: 870, ultMax: 500, moves: {
        Q: { name: "Ratio Black Flash", dmg: 195, cd: 3.5, type: "melee" },
        E: { name: "Slow Strike", dmg: 293, cd: 5.7, type: "melee" },
        R: { name: "Overtime", dmg: 0, cd: 20.0, type: "buff", reqUlt: 500 }
    }},
    "Nobara": { hp: 600, ultMax: 400, moves: {
        Q: { name: "Nail Projectile", dmg: 101, cd: 1.3, type: "projectile" },
        E: { name: "Bear Trap", dmg: 137, cd: 3.0, type: "trap" },
        R: { name: "Resonance", dmg: 300, cd: 10.0, type: "target", reqUlt: 400 }
    }},
    "Panda": { hp: 1000, ultMax: 300, moves: {
        Q: { name: "M1", dmg: 69, cd: 0.7, type: "melee" },
        E: { name: "Barrage", dmg: 150, cd: 3.0, type: "melee" },
        R: { name: "Gorilla Core", dmg: 0, cd: 0, type: "transform", reqUlt: 300 }
    }},
    "Toji": { hp: 900, ultMax: 300, moves: {
        Q: { name: "Sword M1", dmg: 89, cd: 0.6, type: "melee" },
        E: { name: "Worm Bite", dmg: 298, cd: 5.0, type: "melee" },
        R: { name: "Swap Weapons", dmg: 0, cd: 3.0, type: "buff", reqUlt: 0 }
    }},
    "Mei Mei": { hp: 800, ultMax: 400, moves: {
        Q: { name: "Crow Strike", dmg: 157, cd: 2.0, type: "projectile" },
        E: { name: "Crow Barrage", dmg: 300, cd: 6.0, type: "projectile" },
        R: { name: "Bird Strike", dmg: 500, cd: 10.0, type: "projectile", reqUlt: 400 }
    }},
    "Geto": { hp: 1200, ultMax: 500, moves: {
        Q: { name: "M1", dmg: 111, cd: 1.4, type: "melee" },
        E: { name: "Summon Curse", dmg: 31, cd: 5.0, type: "summon" },
        R: { name: "Uzumaki", dmg: 400, cd: 10.0, type: "beam", reqUlt: 500 }
    }},
    "Urame": { hp: 1000, ultMax: 500, moves: {
        Q: { name: "Iceberg", dmg: 115, cd: 3.0, type: "aoe" },
        E: { name: "Ice Ball", dmg: 89, cd: 2.0, type: "projectile" },
        R: { name: "Frost Calm", dmg: 250, cd: 8.0, type: "aoe", reqUlt: 500 }
    }},
    "Miwa": { hp: 760, ultMax: 300, moves: {
        Q: { name: "Sword M1", dmg: 99, cd: 0.5, type: "melee" },
        E: { name: "Simple Domain", dmg: 0, cd: 5.0, type: "counter" },
        R: { name: "Batto Sword Drawing", dmg: 300, cd: 8.0, type: "dash", reqUlt: 300 }
    }}
};

const gameState = {
    players: {},
    projectiles: []
};

function handlePlayerJoin(id, charName) {
    const char = roster[charName];
    gameState.players[id] = {
        id: id,
        charName: charName,
        x: (Math.random() - 0.5) * 40,
        z: (Math.random() - 0.5) * 40,
        hp: char.hp,
        maxHp: char.hp,
        ult: 0,
        maxUlt: char.ultMax,
        cooldowns: { Q: 0, E: 0, R: 0 },
        isDead: false
    };
}

function handleCombat(attackerId, key, targetPos) {
    const p = gameState.players[attackerId];
    if (!p || p.isDead || p.cooldowns[key] > Date.now()) return null;

    const move = roster[p.charName].moves[key];
    if (!move) return null;

    // Check Ult Requirement
    if (move.reqUlt > 0 && p.ult < move.reqUlt) return null;

    // Apply Cooldown
    p.cooldowns[key] = Date.now() + (move.cd * 1000);

    // If it's an Ult, drain the bar
    if (move.reqUlt > 0) p.ult -= move.reqUlt;

    // Process Hit Detection (Simple Distance Check for now)
    let hitPlayers = [];
    Object.values(gameState.players).forEach(enemy => {
        if (enemy.id !== attackerId && !enemy.isDead) {
            const dist = Math.sqrt(Math.pow(enemy.x - p.x, 2) + Math.pow(enemy.z - p.z, 2));
            
            if (move.type === 'melee' && dist < 5) hitPlayers.push(enemy);
            if (move.type === 'aoe' && dist < 15) hitPlayers.push(enemy);
            if (move.type === 'projectile') {
                // Projectiles will be handled by the client visuals, but we register the cast here
                hitPlayers.push(enemy); // Simplified auto-hit for the prototype
            }
        }
    });

    // Apply Damage
    hitPlayers.forEach(enemy => {
        enemy.hp -= move.dmg;
        p.ult = Math.min(p.maxUlt, p.ult + move.dmg); // Gain ult from damage!
        if (enemy.hp <= 0) enemy.isDead = true;
    });

    return { moveName: move.name, type: move.type, dmg: move.dmg, hits: hitPlayers.map(e => e.id) };
}

module.exports = { roster, gameState, handlePlayerJoin, handleCombat };