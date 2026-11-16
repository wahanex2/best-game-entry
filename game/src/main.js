// Boot, the fixed-timestep loop, menu keys, and the deterministic hooks used
// for screenshots (?shot=) and the scripted self-check (?test=1).
import { makeRng } from './rng.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createEffects } from './effects.js';
import { createHud } from './hud.js';
import { createGame, PHASE } from './game.js';
import { TOTAL_WAVES } from './waves.js';

const params = new URLSearchParams(location.search);
const seedParam = Number.parseInt(params.get('seed') || '', 10);
const seed = Number.isFinite(seedParam) ? seedParam : (Date.now() % 2147483647);
const rng = makeRng(seed);

const canvas = document.getElementById('game');
const input = createInput(canvas);
const audio = createAudio();
const effects = createEffects();
const hud = createHud();
const game = createGame({ canvas, input, audio, hud, effects, rng });
const state = game.state;

game.resetRun();
hud.showOverlay('start');
hud.setMuted(audio.muted);
hud.setHint('Hold click to fire · Space to dash');

function startFromMenu() {
  audio.unlock();
  audio.click();
  game.startGame();
}
hud.onPlay(() => {
  if (state.phase === PHASE.PAUSED) game.pauseToggle();
  else startFromMenu();
});

// Audio needs a user gesture: unlock on the first key or pointer press.
const unlockOnce = () => audio.unlock();
window.addEventListener('pointerdown', unlockOnce, { once: true });
window.addEventListener('keydown', unlockOnce, { once: true });

function handleMenuKeys() {
  if (input.wasPressed('KeyM')) {
    const muted = audio.toggleMute();
    hud.setMuted(muted);
  }
  if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
    if (state.phase === PHASE.PLAYING || state.phase === PHASE.PAUSED) game.pauseToggle();
  }
  if (state.phase === PHASE.MENU && (input.wasPressed('Enter') || input.wasPressed('Space'))) {
    startFromMenu();
  }
  if ((state.phase === PHASE.WON || state.phase === PHASE.LOST)
      && (input.wasPressed('KeyR') || input.wasPressed('Enter'))) {
    startFromMenu();
  }
  if (state.phase === PHASE.DRAFT) {
    for (let i = 0; i < 3; i++) {
      if (input.wasPressed(`Digit${i + 1}`) || input.wasPressed(`Numpad${i + 1}`)) {
        const card = state.draftCards[i];
        if (card) game.pickUpgrade(card);
      }
    }
  }
}

// Fixed timestep: 60 updates a second, at most 4 per frame, so the game
// plays the same on a 60 Hz laptop and a 144 Hz monitor.
const STEP = 1 / 60;
let last = performance.now();
let acc = 0;
let drewOnce = false;

function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.25) dt = 0.25;
  handleMenuKeys();
  acc += dt;
  let steps = 0;
  while (acc >= STEP && steps < 4) {
    game.step(STEP);
    acc -= STEP;
    steps++;
  }
  if (steps === 4) acc = 0;
  game.draw();
  input.endFrame();
  drewOnce = true;
}
requestAnimationFrame(frame);

// Debug surface for screenshots, tests and curious players.
window.__game = {
  game, input, audio, hud, state, PHASE,
  start: () => game.startGame(),
  forceWin: () => { state.wave = TOTAL_WAVES; state.spawnQueue = []; state.enemies = []; game.step(STEP); },
  forceDraft: () => { state.spawnQueue = []; state.enemies = []; game.step(STEP); },
};

// --- Screenshot hooks -----------------------------------------------------
// ?shot=start  — title screen over the island at night.
// ?shot=play   — mid-combat: 8 seconds of scripted play with a seeded RNG.
// ?shot=upgrade — the boon draft after wave 1.
// ?shot=end    — the victory screen with a full-run score line.
// Each sets window.__shotReady once a frame has been drawn.
function scriptedPlay(seconds, wave = 1) {
  game.startGame();
  if (wave > 1) {
    // Jump to a busier wave so the shot shows the combat at full boil.
    state.spawnQueue = [];
    state.enemies = [];
    game.startWave(wave);
  }
  const steps = Math.round(seconds / STEP);
  const keys = input.state.keys;
  for (let i = 0; i < steps; i++) {
    const p = state.player;
    if (!p || state.phase !== PHASE.PLAYING) break;
    // Patrol a small circle around the lighthouse and shoot the nearest foe.
    const t = i * STEP;
    const tx = 480 + Math.cos(t * 0.7) * 130;
    const ty = 300 + Math.sin(t * 0.7) * 70;
    keys.clear();
    if (tx < p.x - 8) keys.add('KeyA');
    if (tx > p.x + 8) keys.add('KeyD');
    if (ty < p.y - 8) keys.add('KeyW');
    if (ty > p.y + 8) keys.add('KeyS');
    let best = null; let bestD = Infinity;
    for (const e of state.enemies) {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < bestD) { bestD = d; best = e; }
    }
    if (best) { input.state.mouseX = best.x; input.state.mouseY = best.y; }
    else { input.state.mouseX = 480; input.state.mouseY = 120; }
    input.state.firing = true;
    if (i === Math.round(steps * 0.5)) input.state.pressed.add('Space');
    game.step(STEP);
    input.endFrame();
  }
  keys.clear();
  input.state.firing = false;
  input.state.mouseX = 620;
  input.state.mouseY = 200;
}

const shot = params.get('shot');
if (shot) {
  if (shot === 'play') scriptedPlay(6.5, 4);
  else if (shot === 'upgrade') {
    game.startGame();
    state.score = 420; state.kills = 9; state.embers = 11;
    state.spawnQueue = []; state.enemies = [];
    game.step(STEP);
  } else if (shot === 'end') {
    game.startGame();
    state.score = 6840; state.kills = 187; state.embers = 96;
    state.wave = TOTAL_WAVES;
    state.spawnQueue = []; state.enemies = [];
    game.step(STEP);
  }
  // start: the menu overlay is already up.
  const readyTimer = setInterval(() => {
    if (drewOnce) {
      clearInterval(readyTimer);
      window.__shotReady = true;
    }
  }, 16);
}

// --- Scripted self-check --------------------------------------------------
// ?test=1 runs the real loop through start, play, draft, win, lose and
// restart, and reports window.__testResult = { pass, checks: [...] }.
if (params.get('test') === '1') {
  const checks = [];
  const check = (name, pass, detail = '') => checks.push({ name, pass: !!pass, detail });
  // Honest error capture: runtime errors and rejected promises raised while
  // the scripted run executes are collected and reported as their own check,
  // instead of the run silently claiming success.
  const capturedErrors = [];
  const onError = (event) => { capturedErrors.push(String((event && (event.message || event.reason)) || event)); };
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onError);
  try {
    check('boot shows menu', state.phase === PHASE.MENU && !document.getElementById('overlay').hidden);

    game.startGame();
    check('start begins wave 1', state.phase === PHASE.PLAYING && state.wave === 1);
    check('start stats', state.player.hp === 100 && state.lightHp === 120 && state.score === 0);

    const px0 = state.player.x;
    input.state.keys.add('KeyD');
    for (let i = 0; i < 30; i++) game.step(STEP);
    input.state.keys.clear();
    check('movement', state.player.x > px0 + 20, `x ${px0.toFixed(0)} -> ${state.player.x.toFixed(0)}`);

    input.state.keys.add('KeyD');
    input.state.pressed.add('Space');
    game.step(STEP);
    input.state.keys.clear();
    input.endFrame();
    check('dash triggers', state.player.dashCd > 0, `dashCd ${state.player.dashCd.toFixed(2)}`);

    input.state.firing = true;
    input.state.mouseX = 480; input.state.mouseY = 100;
    let fired = false;
    for (let i = 0; i < 20; i++) { game.step(STEP); if (state.bolts.length > 0) fired = true; }
    input.state.firing = false;
    check('firing spawns bolts', fired);

    let spawned = state.enemies.length > 0;
    for (let i = 0; i < 180 && !spawned; i++) { game.step(STEP); spawned = state.enemies.length > 0; }
    check('wave spawns enemies', spawned, `${state.enemies.length} alive`);

    const kills0 = state.kills; const score0 = state.score;
    const victim = game.spawnEnemyAt('crawler', state.player.x + 60, state.player.y);
    game.killEnemy(victim);
    game.step(STEP);
    check('kill scores', state.kills === kills0 + 1 && state.score > score0, `kills ${state.kills} score ${state.score}`);

    const light0 = state.lightHp;
    game.damageLighthouse(10, 480, 270);
    check('lighthouse takes damage', state.lightHp === light0 - 10, `${light0} -> ${state.lightHp}`);

    state.spawnQueue = []; state.enemies = [];
    game.step(STEP);
    check('wave clear opens draft', state.phase === PHASE.DRAFT && state.draftCards.length === 3);
    check('draft visible in DOM', !document.getElementById('draft').hidden);

    const card = state.draftCards[0];
    game.pickUpgrade(card);
    check('draft pick starts wave 2', state.phase === PHASE.PLAYING && state.wave === 2, `picked ${card.id}`);

    game.pauseToggle();
    const pausedOk = state.phase === PHASE.PAUSED;
    game.pauseToggle();
    check('pause toggles', pausedOk && state.phase === PHASE.PLAYING);

    game.damageLighthouse(99999, 480, 270);
    check('light at zero loses', state.phase === PHASE.LOST, `phase ${state.phase}`);
    check('lose overlay shown', !document.getElementById('overlay').hidden);

    game.startGame();
    check('restart after loss', state.phase === PHASE.PLAYING && state.wave === 1 && state.score === 0 && state.lightHp === 120);

    state.wave = TOTAL_WAVES;
    state.spawnQueue = []; state.enemies = [];
    game.step(STEP);
    check('final wave clear wins', state.phase === PHASE.WON, `phase ${state.phase}`);
    check('win overlay shown', !document.getElementById('overlay').hidden);

    game.startGame();
    check('restart after win', state.phase === PHASE.PLAYING && state.wave === 1 && state.score === 0);

    const sane = Number.isFinite(state.player.x) && Number.isFinite(state.player.y);
    check('positions stay finite', sane);
  } catch (err) {
    checks.push({ name: 'no exception', pass: false, detail: String(err && err.message || err) });
  }
  window.removeEventListener('error', onError);
  window.removeEventListener('unhandledrejection', onError);
  check('no runtime errors during self-check', capturedErrors.length === 0, `${capturedErrors.length} captured`);
  const pass = checks.every((c) => c.pass);
  window.__testResult = { pass, checks };
  // eslint-disable-next-line no-console
  console.log(`[gloamkeeper test] ${pass ? 'PASS' : 'FAIL'} — ${checks.filter((c) => c.pass).length}/${checks.length} checks`);
  for (const c of checks) console.log(`[gloamkeeper test] ${c.pass ? 'ok  ' : 'FAIL'} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
}
