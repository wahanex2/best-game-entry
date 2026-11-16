// The upgrade draft: after every cleared wave the player picks 1 of 3.
// Upgrades stack, and the pool mixes offense, defense and lighthouse care,
// so each run's build feels different and every pick is a real trade-off.
export const UPGRADES = [
  { id: 'damage', name: 'Brighter Bolts', icon: '✦', desc: '+35% bolt damage', apply: (s) => { s.damage *= 1.35; } },
  { id: 'firerate', name: 'Quick Lantern', icon: '≫', desc: '+25% fire rate', apply: (s) => { s.fireInterval *= 0.8; } },
  { id: 'multishot', name: 'Twin Flames', icon: '⋔', desc: '+1 bolt per shot', apply: (s) => { s.shots += 1; }, max: 3 },
  { id: 'pierce', name: 'Piercing Light', icon: '→', desc: 'Bolts pierce +1 enemy', apply: (s) => { s.pierce += 1; }, max: 3 },
  { id: 'speed', name: 'Swift Boots', icon: '➤', desc: '+18% move speed', apply: (s) => { s.moveSpeed *= 1.18; } },
  { id: 'maxhp', name: 'Sturdy Cloak', icon: '♥', desc: '+25 max health, heal 25', apply: (s, live) => { s.maxHp += 25; live.healPlayer(25); } },
  { id: 'dash', name: 'Blink Step', icon: '↯', desc: '-35% dash cooldown', apply: (s) => { s.dashCdMax *= 0.65; } },
  { id: 'crit', name: 'Lucky Spark', icon: '✧', desc: '+15% crit chance (2× damage)', apply: (s) => { s.crit += 0.15; } },
  { id: 'bolt', name: 'Heavy Lantern', icon: '●', desc: 'Bigger, faster bolts (+20% size/speed)', apply: (s) => { s.boltSize *= 1.2; s.boltSpeed *= 1.2; } },
  { id: 'magnet', name: 'Ember Charm', icon: '◎', desc: 'Embers fly to you from much further', apply: (s) => { s.magnetR *= 1.8; } },
  { id: 'repair', name: 'Rekindle', icon: '⌂', desc: 'Restore 40 lighthouse light', apply: (s) => { s.lightHp = Math.min(s.lightMax, s.lightHp + 40); } },
  { id: 'lightmax', name: 'Deep Reservoir', icon: '⬢', desc: '+30 max lighthouse light, restore 30', apply: (s) => { s.lightMax += 30; s.lightHp = Math.min(s.lightMax, s.lightHp + 30); } },
  { id: 'shield', name: 'Ward of Dawn', icon: '⛨', desc: 'Block the next hit each wave', apply: (s) => { s.shield = true; } },
  { id: 'thorns', name: 'Burning Mantle', icon: '♨', desc: 'Attackers take 10 damage on touch', apply: (s) => { s.thorns += 10; } },
];

// Draw 3 distinct upgrades the player can still take (respecting max stacks).
export function drawDraft(rng, taken) {
  const available = UPGRADES.filter((u) => !u.max || (taken[u.id] || 0) < u.max);
  const pool = rng.shuffle([...available]);
  return pool.slice(0, 3);
}
