// The gloom: five creature kinds plus the Herald boss. Each kind has its own
// movement and attack behaviour, so later waves feel different, not just
// more numerous. Enemies crawl toward the lighthouse and gnaw it; spitters
// keep their distance and shoot; the Herald spawns skitters and fires rings.
import { WORLD, PALETTE } from './art.js';

export const ENEMY_DEFS = {
  skitter: { hp: 14, speed: 92, radius: 11, damage: 4, score: 10, ember: 1, color: '#8a6bb8', colorDark: '#553d80', touch: 6 },
  crawler: { hp: 30, speed: 52, radius: 15, damage: 8, score: 20, ember: 2, color: '#6f5aa8', colorDark: '#453464', touch: 10 },
  hulk: { hp: 120, speed: 30, radius: 24, damage: 20, score: 50, ember: 5, color: '#5b4a8f', colorDark: '#382a5c', touch: 18 },
  splitter: { hp: 34, speed: 46, radius: 17, damage: 8, score: 25, ember: 2, color: '#9a7bd0', colorDark: '#5f4890', touch: 10, splits: 3 },
  mite: { hp: 8, speed: 110, radius: 8, damage: 3, score: 5, ember: 0, color: '#a98ede', colorDark: '#6a529e', touch: 4 },
  spitter: { hp: 26, speed: 44, radius: 14, damage: 6, score: 30, ember: 2, color: '#4fae9d', colorDark: '#2e6b60', touch: 8, ranged: true },
  herald: { hp: 900, speed: 24, radius: 38, damage: 30, score: 500, ember: 25, color: '#b07fd8', colorDark: '#5e3480', touch: 25, boss: true },
};

let nextId = 1;

export function spawnEnemy(kind, x, y, rng, hpScale = 1) {
  const def = ENEMY_DEFS[kind];
  return {
    id: nextId++,
    kind,
    x, y,
    hp: Math.round(def.hp * hpScale),
    maxHp: Math.round(def.hp * hpScale),
    speed: def.speed * rng.range(0.9, 1.1),
    radius: def.radius,
    damage: def.damage,
    score: def.score,
    ember: def.ember,
    color: def.color,
    colorDark: def.colorDark,
    touch: def.touch,
    ranged: !!def.ranged,
    boss: !!def.boss,
    splits: def.splits || 0,
    angle: 0,
    wobbleSeed: rng.range(0, Math.PI * 2),
    flash: 0,
    gnawCd: 0,
    shootCd: rng.range(0.5, 1.5),
    spawnCd: 3,
    burstCd: 4,
    zigPhase: rng.range(0, Math.PI * 2),
    dead: false,
  };
}

// Pick a spawn point just outside the canvas, biased away from the player's side.
export function spawnPoint(rng, playerX, playerY) {
  const { width, height } = WORLD;
  const side = rng.int(0, 3);
  let x; let y;
  if (side === 0) { x = rng.range(-30, width + 30); y = -30; }
  else if (side === 1) { x = width + 30; y = rng.range(-30, height + 30); }
  else if (side === 2) { x = rng.range(-30, width + 30); y = height + 30; }
  else { x = -30; y = rng.range(-30, height + 30); }
  // Never spawn on top of the player.
  if (Math.hypot(x - playerX, y - playerY) < 180) { x = width - x; y = height - y; }
  return { x, y };
}

// One enemy's movement + attacks for a frame. Returns events the game resolves:
// gnaw (damage to the lighthouse), shoot (spawn an orb), spawn (spawn a skitter).
export function updateEnemy(e, dt, ctx) {
  const { lighthouse, player, time } = ctx;
  const events = [];
  e.flash = Math.max(0, e.flash - dt);
  e.gnawCd = Math.max(0, e.gnawCd - dt);
  e.shootCd = Math.max(0, e.shootCd - dt);

  const dxL = lighthouse.x - e.x;
  const dyL = lighthouse.y - e.y;
  const distL = Math.hypot(dxL, dyL) || 1;
  const dxP = player.x - e.x;
  const dyP = player.y - e.y;
  const distP = Math.hypot(dxP, dyP) || 1;

  // Spitters hold a ring around the lighthouse and shoot at it or the player.
  if (e.ranged) {
    const want = 240;
    const toward = distL > want + 20 ? 1 : distL < want - 20 ? -1 : 0;
    const strafe = Math.sin(time * 0.8 + e.wobbleSeed) > 0 ? 1 : -1;
    const mx = (dxL / distL) * toward + (-dyL / distL) * strafe * 0.6;
    const my = (dyL / distL) * toward + (dxL / distL) * strafe * 0.6;
    const m = Math.hypot(mx, my) || 1;
    e.x += (mx / m) * e.speed * dt;
    e.y += (my / m) * e.speed * dt;
    e.angle = Math.atan2(dyL, dxL);
    if (e.shootCd <= 0 && distL < 420) {
      e.shootCd = 2.4;
      // Aim at the player when close, else at the lighthouse.
      const target = distP < 200 ? player : lighthouse;
      events.push({ type: 'shoot', x: e.x, y: e.y, tx: target.x, ty: target.y, speed: 170, damage: 8 });
    }
    return events;
  }

  // The Herald advances slowly, spawns skitters and fires orb rings.
  if (e.boss) {
    e.spawnCd -= dt;
    e.burstCd -= dt;
    if (e.spawnCd <= 0) {
      e.spawnCd = 4.5;
      events.push({ type: 'spawn', kind: 'skitter', x: e.x, y: e.y });
      events.push({ type: 'spawn', kind: 'skitter', x: e.x, y: e.y });
    }
    if (e.burstCd <= 0) {
      e.burstCd = 5;
      events.push({ type: 'ring', x: e.x, y: e.y, count: 10, speed: 130, damage: 10 });
    }
  }

  // Everyone else walks at the lighthouse, with kind-specific flavour.
  let mx = dxL / distL;
  let my = dyL / distL;
  if (e.kind === 'skitter' || e.kind === 'mite') {
    // Zigzag weave: blend a perpendicular sine into the approach vector.
    const perp = Math.sin(time * 4 + e.zigPhase) * 0.7;
    mx = dxL / distL + (-dyL / distL) * perp;
    my = dyL / distL + (dxL / distL) * perp;
  }
  const m = Math.hypot(mx, my) || 1;
  const reach = WORLD.lighthouseR + e.radius * 0.6;
  if (distL > reach) {
    e.x += (mx / m) * e.speed * dt;
    e.y += (my / m) * e.speed * dt;
  } else if (e.gnawCd <= 0) {
    e.gnawCd = 0.9;
    events.push({ type: 'gnaw', damage: e.damage, x: e.x, y: e.y });
  }
  e.angle = Math.atan2(dyL, dxL);
  return events;
}

// Separation so enemies don't stack into one blob: a cheap O(n^2) push for the
// counts this game runs (rarely more than ~40 alive).
export function separate(enemies) {
  for (let i = 0; i < enemies.length; i++) {
    for (let j = i + 1; j < enemies.length; j++) {
      const a = enemies[i];
      const b = enemies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = (a.radius + b.radius) * 0.8;
      if (d > 0 && d < min) {
        const push = (min - d) / 2;
        const nx = dx / d;
        const ny = dy / d;
        a.x -= nx * push; a.y -= ny * push;
        b.x += nx * push; b.y += ny * push;
      }
    }
  }
}

export { PALETTE };
