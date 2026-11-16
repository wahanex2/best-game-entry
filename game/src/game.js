// Gloamkeeper: the game itself. A state machine (menu, playing, draft,
// paused, won, lost) around one fixed-timestep loop: the keeper moves and
// shoots, the gloom advances in waves, the lighthouse must survive them all.
import { WORLD, makeStars, drawBackground, drawIsland, drawLighthouse, drawPlayer, drawEnemy, drawBolt, drawOrb, drawPickup, drawVignette } from './art.js';
import { spawnEnemy, spawnPoint, updateEnemy, separate } from './enemies.js';
import { TOTAL_WAVES, hpScaleFor, spawnIntervalFor, buildQueue, waveCount, waveName } from './waves.js';
import { drawDraft } from './upgrades.js';

export const PHASE = {
  MENU: 'menu',
  PLAYING: 'playing',
  DRAFT: 'draft',
  PAUSED: 'paused',
  WON: 'won',
  LOST: 'lost',
};

const KEEPER_START = { x: WORLD.centerX, y: WORLD.centerY + 110 };

export function createGame({ canvas, input, audio, hud, effects, rng }) {
  const ctx = canvas.getContext('2d');
  const stars = makeStars(rng, WORLD.width, WORLD.height);

  const state = {
    phase: PHASE.MENU,
    time: 0,
    beamAngle: 0,
    wave: 0,
    score: 0,
    embers: 0,
    kills: 0,
    waveKills: 0,
    waveTotal: 0,
    spawnQueue: [],
    spawnTimer: 0,
    intermission: 0,
    draftCards: [],
    taken: {},
    stats: null, // the keeper's build (see resetRun)
    player: null,
    lightHp: 0,
    lightMax: 0,
    enemies: [],
    bolts: [],
    orbs: [],
    pickups: [],
    loseReason: null,
    bossSpawned: false,
  };

  function freshStats() {
    return {
      damage: 12, fireInterval: 0.22, shots: 1, pierce: 0,
      moveSpeed: 235, maxHp: 100, hp: 100,
      dashCdMax: 2.6, crit: 0.05, boltSize: 1, boltSpeed: 520,
      magnetR: 70, shield: false, thorns: 0,
      lightHp: 120, lightMax: 120,
    };
  }

  function resetRun() {
    state.stats = freshStats();
    state.player = {
      x: KEEPER_START.x, y: KEEPER_START.y,
      hp: state.stats.maxHp,
      aim: -Math.PI / 2,
      fireCd: 0,
      dashCd: 0, dashCdMax: state.stats.dashCdMax,
      dashTime: 0, dashDx: 0, dashDy: 0,
      invuln: 0, hurtCd: 0, moving: false,
      shieldUp: false,
    };
    state.lightHp = state.stats.lightMax;
    state.lightMax = state.stats.lightMax;
    state.enemies = [];
    state.bolts = [];
    state.orbs = [];
    state.pickups = [];
    state.wave = 0;
    state.score = 0;
    state.embers = 0;
    state.kills = 0;
    state.taken = {};
    state.bossSpawned = false;
    state.loseReason = null;
    effects.clear();
    syncHud();
  }

  function syncHud() {
    hud.setLight(state.lightHp, state.lightMax);
    hud.setHp(state.player ? state.player.hp : state.stats.maxHp, state.stats.maxHp);
    hud.setWave(Math.max(1, state.wave), TOTAL_WAVES);
    hud.setScore(state.score);
    hud.setEmbers(state.embers);
    hud.setKills(state.kills);
    hud.setDash(state.player ? 1 - state.player.dashCd / state.player.dashCdMax : 1);
  }

  function startWave(wave) {
    state.wave = wave;
    state.spawnQueue = buildQueue(wave, rng);
    state.waveTotal = waveCount(wave);
    state.waveKills = 0;
    state.spawnTimer = 0.6;
    state.bossSpawned = false;
    state.player.shieldUp = state.stats.shield;
    hud.banner(waveName(wave), wave === TOTAL_WAVES ? 'Defeat the Herald of the Gloom' : `Wave ${wave} of ${TOTAL_WAVES} — hold the light`);
    if (wave === TOTAL_WAVES) audio.bossRoar();
    else audio.waveStart();
    syncHud();
  }

  function startGame() {
    resetRun();
    state.phase = PHASE.PLAYING;
    hud.hideOverlay();
    hud.hideDraft();
    startWave(1);
  }

  function endGame(won, reason = null) {
    state.phase = won ? PHASE.WON : PHASE.LOST;
    state.loseReason = reason;
    hud.hideBanner();
    if (won) {
      state.score += 1000;
      audio.win();
    } else {
      audio.lose();
    }
    hud.showOverlay(won ? 'win' : 'lose', {
      score: state.score, wave: state.wave, kills: state.kills, embers: state.embers, reason,
    });
    syncHud();
  }

  function openDraft() {
    state.phase = PHASE.DRAFT;
    hud.hideBanner();
    state.draftCards = drawDraft(rng, state.taken);
    hud.showDraft(state.draftCards, (card) => pickUpgrade(card));
    audio.upgrade();
  }

  function pickUpgrade(card) {
    if (state.phase !== PHASE.DRAFT) return;
    card.apply(state.stats, {
      healPlayer: (n) => { state.player.hp = Math.min(state.stats.maxHp, state.player.hp + n); },
    });
    state.taken[card.id] = (state.taken[card.id] || 0) + 1;
    // The stats object owns lighthouse numbers; mirror them onto the run.
    state.lightMax = state.stats.lightMax;
    state.lightHp = state.stats.lightHp;
    state.player.dashCdMax = state.stats.dashCdMax;
    hud.hideDraft();
    audio.click();
    state.phase = PHASE.PLAYING;
    startWave(state.wave + 1);
  }

  function fireBolts() {
    const p = state.player;
    const s = state.stats;
    const n = s.shots;
    const spread = 0.09;
    for (let i = 0; i < n; i++) {
      const offset = (i - (n - 1) / 2) * spread;
      const a = p.aim + offset;
      state.bolts.push({
        x: p.x + Math.cos(a) * 20, y: p.y + Math.sin(a) * 20,
        vx: Math.cos(a) * s.boltSpeed, vy: Math.sin(a) * s.boltSpeed,
        damage: s.damage, pierce: s.pierce, size: s.boltSize,
        crit: rng.chance(s.crit),
        hitIds: new Set(),
        life: 1.1,
      });
    }
    effects.sparks(p.x + Math.cos(p.aim) * 22, p.y + Math.sin(p.aim) * 22, '#ffd166');
    audio.shoot();
  }

  function damageEnemy(e, amount, crit) {
    e.hp -= amount;
    e.flash = 0.12;
    effects.floatText(e.x, e.y - e.radius - 4, String(Math.round(amount)), crit ? '#ffd166' : '#fff3d6', crit ? 18 : 14);
    if (e.hp <= 0 && !e.dead) killEnemy(e);
    else audio.hit();
  }

  function killEnemy(e) {
    e.dead = true;
    state.kills += 1;
    state.waveKills += 1;
    state.score += e.score;
    effects.explosion(e.x, e.y, e.color);
    effects.addShake(e.boss ? 10 : 2);
    if (e.boss) audio.bigDie();
    else audio.enemyDie();
    if (e.splits > 0) {
      for (let i = 0; i < e.splits; i++) {
        const angle = (i / e.splits) * Math.PI * 2;
        const mite = spawnEnemy('mite', e.x + Math.cos(angle) * 14, e.y + Math.sin(angle) * 14, rng, hpScaleFor(state.wave));
        state.enemies.push(mite);
      }
    }
    for (let i = 0; i < e.ember; i++) {
      state.pickups.push({
        kind: 'ember', x: e.x + rng.range(-14, 14), y: e.y + rng.range(-14, 14),
        vx: rng.range(-30, 30), vy: rng.range(-30, 30),
        seed: rng.range(0, 6), life: 12, value: 5,
      });
    }
    if (!e.boss && rng.chance(0.04)) {
      state.pickups.push({ kind: 'heart', x: e.x, y: e.y, vx: 0, vy: 0, seed: rng.range(0, 6), life: 12 });
    }
    if (e.boss) {
      effects.floatText(e.x, e.y - 50, 'THE HERALD FALLS', '#ffd166', 24);
    }
    syncHud();
  }

  function damagePlayer(amount, fromX, fromY) {
    const p = state.player;
    if (p.invuln > 0 || p.hurtCd > 0 || state.phase !== PHASE.PLAYING) return;
    if (p.shieldUp) {
      p.shieldUp = false;
      effects.burst(p.x, p.y, { count: 14, color: '#8ef1e0', speed: 150, life: 0.4, size: 3 });
      effects.floatText(p.x, p.y - 24, 'WARDED', '#8ef1e0', 16);
      p.hurtCd = 0.5;
      return;
    }
    p.hp -= amount;
    p.hurtCd = 0.6;
    effects.addShake(5);
    effects.burst(p.x, p.y, { count: 10, color: '#ff5d5d', speed: 140, life: 0.4, size: 3 });
    audio.hurt();
    if (p.hp <= 0) {
      p.hp = 0;
      endGame(false, 'keeper');
    }
    syncHud();
  }

  function damageLighthouse(amount, x, y) {
    state.lightHp -= amount;
    state.stats.lightHp = state.lightHp;
    effects.addShake(4);
    effects.burst(x, y, { count: 10, color: '#ffb703', speed: 130, life: 0.45, size: 3 });
    effects.floatText(WORLD.centerX, WORLD.centerY - 70, `-${amount}`, '#ff5d5d', 16);
    audio.lighthouseHit();
    if (state.lightHp <= 0) {
      state.lightHp = 0;
      endGame(false, 'light');
    }
    syncHud();
  }

  function insideIsland(x, y) {
    const dx = (x - WORLD.centerX) / WORLD.islandRx;
    const dy = (y - (WORLD.centerY + 4)) / WORLD.islandRy;
    return dx * dx + dy * dy <= 1;
  }

  function clampToIsland(p) {
    if (insideIsland(p.x, p.y)) return;
    // Pull back toward the centre until inside the ellipse.
    for (let i = 0; i < 8 && !insideIsland(p.x, p.y); i++) {
      p.x += (WORLD.centerX - p.x) * 0.12;
      p.y += (WORLD.centerY + 4 - p.y) * 0.12;
    }
  }

  function step(dt) {
    // Pause freezes the world: particles, the beam and the banner timer all
    // stop behind the overlay instead of running on while paused.
    if (state.phase === PHASE.PAUSED) return;
    state.time += dt;
    state.beamAngle += dt * 0.35;
    effects.step(dt);
    hud.stepBanner(dt);

    if (state.phase === PHASE.MENU || state.phase === PHASE.WON || state.phase === PHASE.LOST) return;
    if (state.phase === PHASE.DRAFT) return;

    const p = state.player;
    const s = state.stats;
    const keys = input.state;

    // --- Keeper movement & dash.
    const move = input.axis();
    p.moving = move.x !== 0 || move.y !== 0;
    if (p.dashTime > 0) {
      p.dashTime -= dt;
      p.x += p.dashDx * 640 * dt;
      p.y += p.dashDy * 640 * dt;
      effects.emberTrail(p.x, p.y);
    } else {
      p.x += move.x * s.moveSpeed * dt;
      p.y += move.y * s.moveSpeed * dt;
    }
    clampToIsland(p);
    // Keep out of the lighthouse stone.
    const dl = Math.hypot(p.x - WORLD.centerX, p.y - WORLD.centerY);
    if (dl < WORLD.lighthouseR + 12) {
      const a = Math.atan2(p.y - WORLD.centerY, p.x - WORLD.centerX);
      p.x = WORLD.centerX + Math.cos(a) * (WORLD.lighthouseR + 12);
      p.y = WORLD.centerY + Math.sin(a) * (WORLD.lighthouseR + 12);
    }
    p.aim = Math.atan2(keys.mouseY - p.y, keys.mouseX - p.x);
    p.fireCd = Math.max(0, p.fireCd - dt);
    p.dashCd = Math.max(0, p.dashCd - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.hurtCd = Math.max(0, p.hurtCd - dt);
    if ((input.wasPressed('Space') || input.wasPressed('ShiftLeft') || input.wasPressed('ShiftRight')) && p.dashCd <= 0 && p.moving) {
      p.dashCd = p.dashCdMax;
      p.dashTime = 0.16;
      p.invuln = 0.3;
      p.dashDx = move.x;
      p.dashDy = move.y;
      audio.dash();
    }
    if (keys.firing && p.fireCd <= 0) {
      p.fireCd = s.fireInterval;
      fireBolts();
    }

    // --- Spawning.
    if (state.spawnQueue.length > 0) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        state.spawnTimer = spawnIntervalFor(state.wave);
        const kind = state.spawnQueue.shift();
        const pt = spawnPoint(rng, p.x, p.y);
        const e = spawnEnemy(kind, pt.x, pt.y, rng, hpScaleFor(state.wave));
        if (e.boss) {
          state.bossSpawned = true;
          hud.banner('THE HERALD', 'Slay it before the light dies', 2.6);
        }
        state.enemies.push(e);
      }
    }

    // --- Enemies.
    const lighthouse = { x: WORLD.centerX, y: WORLD.centerY };
    for (const e of state.enemies) {
      const events = updateEnemy(e, dt, { lighthouse, player: p, time: state.time });
      for (const ev of events) {
        if (ev.type === 'gnaw') damageLighthouse(ev.damage, ev.x, ev.y);
        else if (ev.type === 'shoot') {
          const a = Math.atan2(ev.ty - ev.y, ev.tx - ev.x);
          state.orbs.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * ev.speed, vy: Math.sin(a) * ev.speed, damage: ev.damage, seed: rng.range(0, 6), life: 4 });
        } else if (ev.type === 'spawn') {
          state.enemies.push(spawnEnemy(ev.kind, ev.x + rng.range(-20, 20), ev.y + rng.range(-20, 20), rng, hpScaleFor(state.wave)));
        } else if (ev.type === 'ring') {
          for (let i = 0; i < ev.count; i++) {
            const a = (i / ev.count) * Math.PI * 2 + state.time;
            state.orbs.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * ev.speed, vy: Math.sin(a) * ev.speed, damage: ev.damage, seed: rng.range(0, 6), life: 4 });
          }
          audio.bossRoar();
        }
      }
      // Touch damage.
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < e.radius + 12) {
        if (s.thorns > 0) damageEnemy(e, s.thorns, false);
        damagePlayer(e.touch, e.x, e.y);
      }
      if (state.phase !== PHASE.PLAYING) return;
    }
    separate(state.enemies);
    state.enemies = state.enemies.filter((e) => !e.dead);

    // --- Bolts.
    for (const b of state.bolts) {
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      for (const e of state.enemies) {
        if (e.dead || b.hitIds.has(e.id)) continue;
        if (Math.hypot(e.x - b.x, e.y - b.y) < e.radius + 4 * b.size) {
          b.hitIds.add(e.id);
          damageEnemy(e, b.damage * (b.crit ? 2 : 1), b.crit);
          effects.sparks(b.x, b.y, '#ffd166');
          if (b.hitIds.size > b.pierce) { b.life = 0; break; }
        }
      }
    }
    state.bolts = state.bolts.filter((b) => b.life > 0 && b.x > -40 && b.x < WORLD.width + 40 && b.y > -40 && b.y < WORLD.height + 40);
    state.enemies = state.enemies.filter((e) => !e.dead);

    // --- Enemy orbs.
    for (const o of state.orbs) {
      o.life -= dt;
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      if (Math.hypot(o.x - p.x, o.y - p.y) < 13) {
        o.life = 0;
        damagePlayer(o.damage, o.x, o.y);
      } else if (Math.hypot(o.x - WORLD.centerX, o.y - WORLD.centerY) < WORLD.lighthouseR) {
        o.life = 0;
        damageLighthouse(o.damage, o.x, o.y);
      }
      if (state.phase !== PHASE.PLAYING) return;
    }
    state.orbs = state.orbs.filter((o) => o.life > 0);

    // --- Pickups.
    for (const pk of state.pickups) {
      pk.life -= dt;
      pk.x += pk.vx * dt;
      pk.y += pk.vy * dt;
      pk.vx *= 0.9; pk.vy *= 0.9;
      const d = Math.hypot(pk.x - p.x, pk.y - p.y);
      if (d < s.magnetR) {
        pk.x += ((p.x - pk.x) / (d || 1)) * 260 * dt;
        pk.y += ((p.y - pk.y) / (d || 1)) * 260 * dt;
      }
      if (d < 20) {
        pk.life = 0;
        if (pk.kind === 'ember') {
          state.embers += 1;
          state.score += pk.value;
          effects.floatText(pk.x, pk.y - 8, `+${pk.value}`, '#ffb703', 13);
          audio.pickup();
        } else {
          p.hp = Math.min(s.maxHp, p.hp + 30);
          effects.floatText(pk.x, pk.y - 8, '+30 HP', '#ff6b81', 15);
          audio.heart();
        }
        syncHud();
      }
    }
    state.pickups = state.pickups.filter((pk) => pk.life > 0);

    // --- Wave cleared?
    if (state.spawnQueue.length === 0 && state.enemies.length === 0) {
      if (state.wave >= TOTAL_WAVES) {
        endGame(true);
      } else {
        const bonus = 50 * state.wave;
        state.score += bonus;
        effects.floatText(WORLD.centerX, WORLD.centerY - 100, `WAVE CLEAR +${bonus}`, '#ffd166', 20);
        syncHud();
        openDraft();
      }
    }
    syncHud();
  }

  function draw() {
    ctx.save();
    if (effects.shake > 0) {
      ctx.translate((Math.random() - 0.5) * effects.shake, (Math.random() - 0.5) * effects.shake);
    }
    drawBackground(ctx, state.time, stars);
    drawIsland(ctx, state.time);
    // Pickups under everything else on the ground.
    for (const pk of state.pickups) drawPickup(ctx, pk, state.time);
    // Enemies sorted by y so nearer ones overlap correctly.
    const sorted = [...state.enemies].sort((a, b) => a.y - b.y);
    for (const e of sorted) drawEnemy(ctx, e, state.time);
    drawLighthouse(ctx, state.time, Math.max(0, state.lightHp / state.lightMax), state.beamAngle);
    if (state.player) drawPlayer(ctx, state.player, state.player.aim, state.time);
    for (const b of state.bolts) drawBolt(ctx, b);
    for (const o of state.orbs) drawOrb(ctx, o, state.time);
    effects.draw(ctx);
    ctx.restore();
    drawVignette(ctx);
    // Low-light warning pulse.
    if (state.phase === PHASE.PLAYING && state.lightHp / state.lightMax < 0.3) {
      ctx.fillStyle = `rgba(255,60,60,${0.05 + 0.05 * Math.sin(state.time * 5)})`;
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    }
  }

  function pauseToggle() {
    if (state.phase === PHASE.PLAYING) {
      state.phase = PHASE.PAUSED;
      hud.showOverlay('paused');
    } else if (state.phase === PHASE.PAUSED) {
      state.phase = PHASE.PLAYING;
      hud.hideOverlay();
    }
  }

  // Public surface: the main loop, menus and the scripted self-check use these.
  return {
    state,
    startGame,
    pickUpgrade,
    pauseToggle,
    step,
    draw,
    resetRun,
    startWave,
    damagePlayer,
    damageLighthouse,
    killEnemy,
    spawnEnemyAt(kind, x, y) {
      const e = spawnEnemy(kind, x, y, rng, hpScaleFor(Math.max(1, state.wave)));
      state.enemies.push(e);
      return e;
    },
  };
}
