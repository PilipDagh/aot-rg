const ROSTER = {
    Yuji: { hpMax: 760, ultMax: 777, color: 0xff69b4, 
      Q: { name: "Manji Kick", type: "melee", dmg: 167, cd: 1000 }, 
      E: { name: "Black Flash", type: "melee", dmg: 176, cd: 2000 }, 
      R: { name: "Sukuna Transform", type: "buff", dmg: 0, cd: 0, cost: 777 } 
    },
    Gojo: { hpMax: 750, ultMax: 300, color: 0x87ceeb, 
      Q: { name: "Reversal Red", type: "projectile", dmg: 128, cd: 5000, speed: 45 }, 
      E: { name: "Lapse Blue", type: "projectile", dmg: 107, cd: 4000, speed: 35 }, 
      R: { name: "Blindfold Off", type: "domain", dmg: 100, cd: 10000, cost: 300, radius: 45 } 
    },
    Megumi: { hpMax: 666, ultMax: 600, color: 0x2f4f4f, 
      Q: { name: "Nue", type: "projectile", dmg: 138, cd: 5000, speed: 40 }, 
      E: { name: "Divine Dog", type: "melee", dmg: 118, cd: 7000 }, 
      R: { name: "Chimera Shadow Garden", type: "domain", dmg: 150, cd: 12000, cost: 600, radius: 35 } 
    },
    Todo: { hpMax: 670, ultMax: 400, color: 0x8b4513, 
      Q: { name: "Boogie Woogie", type: "swap", dmg: 5, cd: 1000 }, 
      E: { name: "Rock Throw", type: "projectile", dmg: 97, cd: 1000, speed: 50 }, 
      R: { name: "Brotherly Love", type: "buff", dmg: 0, cd: 8000, cost: 400 } 
    },
    Hakari: { hpMax: 700, ultMax: 300, color: 0xffd700, 
      Q: { name: "Reserve Ball", type: "projectile", dmg: 96, cd: 2000, speed: 38 }, 
      E: { name: "Shutter Door", type: "melee", dmg: 143, cd: 4000 }, 
      R: { name: "Jackpot Domain", type: "domain-heal", dmg: 0, cd: 15000, cost: 300, radius: 25 } 
    },
    Yuta: { hpMax: 787, ultMax: 500, color: 0xbc8f8f, 
      Q: { name: "Sword Slash", type: "melee", dmg: 110, cd: 1500 }, 
      E: { name: "Rika Manifest", type: "buff", dmg: 0, cd: 10000 }, 
      R: { name: "Pure True Love", type: "beam", dmg: 256, cd: 4000, cost: 500 } 
    },
    Choso: { hpMax: 720, ultMax: 500, color: 0x800000, 
      Q: { name: "Blood Strike", type: "melee", dmg: 189, cd: 3000 }, 
      E: { name: "Piercing Blood", type: "beam", dmg: 89, cd: 4000 }, 
      R: { name: "Supernova", type: "aoe", dmg: 200, cd: 8000, cost: 500, radius: 30 } 
    },
    Mahito: { hpMax: 990, ultMax: 600, color: 0x48d1cc, 
      Q: { name: "Idle Transfiguration", type: "melee", dmg: 300, cd: 5000 }, 
      E: { name: "Soul Worm", type: "projectile", dmg: 132, cd: 5000, speed: 30 }, 
      R: { name: "ISBODK Transform", type: "buff", dmg: 0, cd: 0, cost: 600 } 
    },
    Jogo: { hpMax: 777, ultMax: 500, color: 0xff4500, 
      Q: { name: "Lava Slash", type: "melee", dmg: 101, cd: 1200 }, 
      E: { name: "Magma Shot", type: "projectile", dmg: 78, cd: 1700, speed: 32 }, 
      R: { name: "Maximum Meteor", type: "aoe", dmg: 234, cd: 9000, cost: 500, radius: 40 } 
    },
    Dagon: { hpMax: 445, ultMax: 445, color: 0x1e90ff, 
      Q: { name: "Crunch", type: "melee", dmg: 67, cd: 700 }, 
      E: { name: "Spit", type: "projectile", dmg: 75, cd: 900, speed: 42 }, 
      R: { name: "Domain Expansion", type: "domain", dmg: 120, cd: 11000, cost: 445, radius: 35 } 
    },
    Naoya: { hpMax: 650, ultMax: 400, color: 0xccff00, 
      Q: { name: "M1", type: "melee", dmg: 89, cd: 700 }, 
      E: { name: "Bleedout", type: "melee", dmg: 138, cd: 1670 }, 
      R: { name: "Projection Barrage", type: "melee-dash", dmg: 200, cd: 6000, cost: 400 } 
    },
    Takaba: { hpMax: 690, ultMax: 700, color: 0xff00ff, 
      Q: { name: "Pop a Joke", type: "buff", dmg: 0, cd: 800 }, 
      E: { name: "Wife-Fi", type: "aoe", dmg: 50, cd: 3000, radius: 20 }, 
      R: { name: "Truck Kun", type: "projectile", dmg: 500, cd: 12000, cost: 700, speed: 55 } 
    },
    Junpei: { hpMax: 550, ultMax: 670, color: 0x4b0082, 
      Q: { name: "Slow Motion Punch", type: "melee", dmg: 43, cd: 690 }, 
      E: { name: "Finger Penetrate", type: "melee", dmg: 67, cd: 1700 }, 
      R: { name: "Moon Dregs", type: "aoe", dmg: 250, cd: 8000, cost: 670, radius: 28 } 
    },
    Nanami: { hpMax: 870, ultMax: 500, color: 0xdaa520, 
      Q: { name: "Ratio Black Flash", type: "melee", dmg: 195, cd: 3500 }, 
      E: { name: "Slow Strike", type: "melee", dmg: 293, cd: 5700 }, 
      R: { name: "Overtime", type: "buff", dmg: 0, cd: 15000, cost: 500 } 
    },
    Nobara: { hpMax: 600, ultMax: 400, color: 0xdc143c, 
      Q: { name: "Nail Projectile", type: "projectile", dmg: 101, cd: 1300, speed: 48 }, 
      E: { name: "Bear Trap", type: "melee", dmg: 137, cd: 3000 }, 
      R: { name: "Resonance", type: "aoe", dmg: 300, cd: 7000, cost: 400, radius: 25 } 
    },
    Panda: { hpMax: 1000, ultMax: 300, color: 0xffffff, 
      Q: { name: "M1", type: "melee", dmg: 69, cd: 700 }, 
      E: { name: "Barrage", type: "melee", dmg: 150, cd: 3000 }, 
      R: { name: "Gorilla Core", type: "buff", dmg: 0, cd: 0, cost: 300 } 
    },
    Toji: { hpMax: 900, ultMax: 300, color: 0x333333, 
      Q: { name: "Sword M1", type: "melee", dmg: 89, cd: 600 }, 
      E: { name: "Worm Bite", type: "melee", dmg: 298, cd: 5000 }, 
      R: { name: "Swap Weapons", type: "buff", dmg: 0, cd: 1000, cost: 300 } 
    },
    Mei Mei: { hpMax: 800, ultMax: 400, color: 0x008080, 
      Q: { name: "Crow Strike", type: "projectile", dmg: 157, cd: 2000, speed: 40 }, 
      E: { name: "Crow Barrage", type: "projectile", dmg: 300, cd: 6000, speed: 42 }, 
      R: { name: "Bird Strike", type: "projectile", dmg: 500, cd: 10000, cost: 400, speed: 60 } 
    },
    Geto: { hpMax: 1200, ultMax: 500, color: 0xffd700, 
      Q: { name: "M1", type: "melee", dmg: 111, cd: 1400 }, 
      E: { name: "Summon Curse", type: "aoe", dmg: 31, cd: 5000, radius: 15 }, 
      R: { name: "Maximum Uzumaki", type: "beam", dmg: 400, cd: 12000, cost: 500 } 
    },
    Urame: { hpMax: 1000, ultMax: 500, color: 0xf0f8ff, 
      Q: { name: "Iceberg", type: "aoe", dmg: 115, cd: 3000, radius: 22 }, 
      E: { name: "Ice Ball", type: "projectile", dmg: 89, cd: 2000, speed: 36 }, 
      R: { name: "Frost Calm", type: "aoe", dmg: 250, cd: 9000, cost: 500, radius: 35 } 
    },
    Miwa: { hpMax: 760, ultMax: 300, color: 0xb0c4de, 
      Q: { name: "Sword M1", type: "melee", dmg: 99, cd: 500 }, 
      E: { name: "Simple Domain", type: "aoe", dmg: 50, cd: 5000, radius: 15 }, 
      R: { name: "Batto Sword Drawing", type: "melee-dash", dmg: 300, cd: 8000, cost: 300 } 
    }
  };
  
  
  class GameLogic {
    constructor() {
      this.players = {};
      this.projectiles = [];
      this.arenaRadius = 130;
    }
  
  
    addPlayer(id, name, characterName) {
      const charData = ROSTER[characterName] || ROSTER.Yuji;
      this.players[id] = {
        id,
        name,
        character: characterName,
        hp: charData.hpMax,
        hpMax: charData.hpMax,
        ult: 0,
        ultMax: charData.ultMax,
        color: charData.color,
        x: (Math.random() - 0.5) * 60,
        y: 0,
        z: (Math.random() - 0.5) * 60,
        dirX: 0,
        dirZ: -1,
        isDead: false,
        cooldowns: { Q: 0, E: 0, R: 0 },
        buffedUntil: 0,
        isTransformed: false
      };
      return this.players[id];
    }
  
  
    removePlayer(id) {
      delete this.players[id];
    }
  
  
    updatePlayerPosition(id, data) {
      const p = this.players[id];
      if (!p || p.isDead) return;
      
      p.x = data.x;
      p.z = data.z;
      p.dirX = data.dirX;
      p.dirZ = data.dirZ;
  
  
      const dist = Math.sqrt(p.x * p.x + p.z * p.z);
      if (dist > this.arenaRadius) {
        p.x = (p.x / dist) * this.arenaRadius;
        p.z = (p.z / dist) * this.arenaRadius;
      }
    }
  
  
    handleAbility(id, key, emitVfx, emitDamage, emitKilled) {
      const p = this.players[id];
      if (!p || p.isDead) return;
  
  
      const charData = ROSTER[p.character];
      const move = charData[key];
      if (!move) return;
  
  
      const now = Date.now();
      if (p.cooldowns[key] && now < p.cooldowns[key]) return;
      if (key === 'R' && p.ult < move.cost) return;
  
  
      if (key === 'R') {
        p.ult = 0;
      } else {
        p.cooldowns[key] = now + (p.character === 'Hakari' && p.buffedUntil > now ? move.cd * 0.3 : move.cd);
      }
  
  
      emitVfx({ casterId: id, type: move.type, key, dirX: p.dirX, dirZ: p.dirZ, radius: move.radius || 5 });
  
  
      let finalDmg = move.dmg;
      if (p.buffedUntil > now) finalDmg *= 1.4;
  
  
      if (move.type === "melee" || move.type === "melee-dash") {
        const range = move.type === "melee-dash" ? 35 : 8;
        for (let targetId in this.players) {
          if (targetId === id) continue;
          const target = this.players[targetId];
          if (target.isDead) continue;
  
  
          const dx = target.x - p.x;
          const dz = target.z - p.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
  
  
          if (dist <= range) {
            const dot = (dx / dist) * p.dirX + (dz / dist) * p.dirZ;
            if (dot > 0.5) { 
              this.damagePlayer(p, target, finalDmg, emitDamage, emitKilled);
            }
          }
        }
      } 
      else if (move.type === "projectile") {
        this.projectiles.push({
          id: Math.random().toString(36).substring(2, 9),
          casterId: id,
          x: p.x,
          z: p.z,
          vx: p.dirX * (move.speed || 30),
          vz: p.dirZ * (move.speed || 30),
          dmg: finalDmg,
          radius: 3,
          life: 3000
        });
      } 
      else if (move.type === "beam") {
        for (let targetId in this.players) {
          if (targetId === id) continue;
          const target = this.players[targetId];
          if (target.isDead) continue;
  
  
          const dx = target.x - p.x;
          const dz = target.z - p.z;
          const projection = dx * p.dirX + dz * p.dirZ;
  
  
          if (projection > 0 && projection < 80) {
            const perpX = dx - projection * p.dirX;
            const perpZ = dz - projection * p.dirZ;
            const offAxisDist = Math.sqrt(perpX * perpX + perpZ * perpZ);
            if (offAxisDist < 6) {
              this.damagePlayer(p, target, finalDmg, emitDamage, emitKilled);
            }
          }
        }
      } 
      else if (move.type === "aoe" || move.type === "domain" || move.type === "domain-heal") {
        if (move.type === "domain-heal") {
          p.hp = p.hpMax;
          p.buffedUntil = now + 8000;
        }
        for (let targetId in this.players) {
          if (targetId === id) continue;
          const target = this.players[targetId];
          if (target.isDead) continue;
  
  
          const dx = target.x - p.x;
          const dz = target.z - p.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
  
  
          if (dist <= (move.radius || 25)) {
            this.damagePlayer(p, target, finalDmg, emitDamage, emitKilled);
          }
        }
      } 
      else if (move.type === "swap") {
        let targets = Object.values(this.players).filter(t => t.id !== id && !t.isDead);
        if (targets.length > 0) {
          let target = targets[Math.floor(Math.random() * targets.length)];
          let tempX = p.x, tempZ = p.z;
          p.x = target.x; p.z = target.z;
          target.x = tempX; target.z = tempZ;
          this.damagePlayer(p, target, finalDmg, emitDamage, emitKilled);
        }
      } 
      else if (move.type === "buff") {
        p.buffedUntil = now + 7000;
        if (p.character === 'Yuji' || p.character === 'Mahito' || p.character === 'Panda') {
          p.isTransformed = true;
          setTimeout(() => { p.isTransformed = false; }, 7000);
        }
      }
    }
  
  
    updateProjectiles(dt, emitDamage, emitKilled) {
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const proj = this.projectiles[i];
        proj.life -= dt * 1000;
        proj.x += proj.vx * dt;
        proj.z += proj.vz * dt;
  
  
        let destroyed = proj.life <= 0;
        const caster = this.players[proj.casterId];
  
  
        if (!destroyed && caster) {
          for (let targetId in this.players) {
            if (targetId === proj.casterId) continue;
            const target = this.players[targetId];
            if (target.isDead) continue;
  
  
            const dx = target.x - proj.x;
            const dz = target.z - proj.z;
            if (Math.sqrt(dx * dx + dz * dz) < (proj.radius + 2)) {
              this.damagePlayer(caster, target, proj.dmg, emitDamage, emitKilled);
              destroyed = true;
              break;
            }
          }
        }
  
  
        if (destroyed) {
          this.projectiles.splice(i, 1);
        }
      }
    }
  
  
    damagePlayer(caster, target, amount, emitDamage, emitKilled) {
      if (target.isDead) return;
      target.hp -= Math.floor(amount);
      emitDamage({ targetId: target.id, amount: Math.floor(amount), x: target.x, z: target.z });
  
  
      if (caster) {
        caster.ult = Math.min(caster.ultMax, caster.ult + Math.floor(amount * 0.8));
      }
  
  
      if (target.hp <= 0) {
        target.hp = 0;
        target.isDead = true;
        emitKilled({ victimId: target.id, killerName: caster ? caster.name : "Arena" });
        
        setTimeout(() => {
          target.hp = target.hpMax;
          target.ult = 0;
          target.isDead = false;
          target.x = (Math.random() - 0.5) * 80;
          target.z = (Math.random() - 0.5) * 80;
        }, 3000);
      }
    }
  }
  
  
  module.exports = { GameLogic, ROSTER };
  
  