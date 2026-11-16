// All art is procedural: every sprite is drawn with canvas paths, gradients
// and arcs. One palette, one night: deep teal water, warm amber light, and
// violet-teal gloom creatures with glowing eyes.

export const PALETTE = {
  waterDeep: '#071423',
  water: '#0b2233',
  waterEdge: '#123a4d',
  sand: '#3d3a2e',
  grass: '#1d3b2a',
  grassLight: '#27523a',
  rock: '#2a3140',
  amber: '#ffb703',
  amberSoft: '#ffd166',
  lightCore: '#fff3d6',
  ink: '#060a12',
  gloom: '#7b5ea7',
  gloomDark: '#4a3573',
  gloomEye: '#8ef1e0',
  danger: '#ff5d5d',
  heart: '#ff6b81',
};

export const WORLD = {
  width: 960,
  height: 540,
  centerX: 480,
  centerY: 270,
  // The island is an ellipse the player stays inside; the lighthouse sits at its heart.
  islandRx: 330,
  islandRy: 185,
  lighthouseR: 26,
};

// Pre-rendered starfield so the sky costs nothing per frame.
export function makeStars(rng, width, height, count = 90) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rng.range(0, width), y: rng.range(0, height * 0.55),
      r: rng.range(0.5, 1.6), tw: rng.range(0, Math.PI * 2),
    });
  }
  return stars;
}

export function drawBackground(ctx, time, stars) {
  const { width, height } = WORLD;
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#04070f');
  sky.addColorStop(0.45, PALETTE.waterDeep);
  sky.addColorStop(1, PALETTE.water);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  for (const s of stars) {
    ctx.globalAlpha = 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(time * 1.4 + s.tw));
    ctx.fillStyle = '#dfe9ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Moon with a soft halo.
  ctx.save();
  const halo = ctx.createRadialGradient(828, 62, 6, 828, 62, 60);
  halo.addColorStop(0, 'rgba(223,233,255,0.5)');
  halo.addColorStop(1, 'rgba(223,233,255,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(760, 0, 140, 130);
  ctx.fillStyle = '#e8eeff';
  ctx.beginPath();
  ctx.arc(828, 62, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c4cfe8';
  ctx.beginPath();
  ctx.arc(820, 56, 5, 0, Math.PI * 2);
  ctx.arc(836, 68, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Water shimmer: a few slow drifting highlight strokes.
  ctx.strokeStyle = 'rgba(80,150,180,0.16)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    const y = 400 + i * 20 + Math.sin(time * 0.6 + i * 1.7) * 3;
    const x = ((time * 12 + i * 130) % (width + 160)) - 80;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 60, y);
    ctx.stroke();
  }
}

export function drawIsland(ctx, time) {
  const { centerX, centerY, islandRx, islandRy } = WORLD;
  // Wet sand rim.
  ctx.fillStyle = PALETTE.sand;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY + 8, islandRx + 14, islandRy + 12, 0, 0, Math.PI * 2);
  ctx.fill();
  // Grass body.
  const g = ctx.createRadialGradient(centerX, centerY, 20, centerX, centerY, islandRx);
  g.addColorStop(0, PALETTE.grassLight);
  g.addColorStop(0.7, PALETTE.grass);
  g.addColorStop(1, '#16301f');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY + 4, islandRx, islandRy, 0, 0, Math.PI * 2);
  ctx.fill();
  // Rocky outcrops.
  ctx.fillStyle = PALETTE.rock;
  for (const [rx, ry, r] of [[-260, -90, 16], [250, 100, 19], [-230, 110, 13], [270, -70, 14], [60, -140, 11], [-90, 140, 12]]) {
    ctx.beginPath();
    ctx.arc(centerX + rx, centerY + ry, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a4356';
    ctx.beginPath();
    ctx.arc(centerX + rx - r * 0.3, centerY + ry - r * 0.3, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.rock;
  }
  // Tufts of glowing night grass.
  ctx.strokeStyle = 'rgba(140,220,170,0.35)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 26; i++) {
    const a = i * 2.4;
    const x = centerX + Math.cos(a) * (90 + (i * 37) % 210);
    const y = centerY + 4 + Math.sin(a) * (50 + (i * 53) % 110);
    const sway = Math.sin(time * 1.2 + i) * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + sway, y - 6, x + sway * 1.6, y - 10);
    ctx.stroke();
  }
  // Warm light pool around the lighthouse.
  const pool = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, 150);
  pool.addColorStop(0, 'rgba(255,183,3,0.20)');
  pool.addColorStop(1, 'rgba(255,183,3,0)');
  ctx.fillStyle = pool;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 150, 0, Math.PI * 2);
  ctx.fill();
}

export function drawLighthouse(ctx, time, hpFrac, beamAngle) {
  if (!Number.isFinite(hpFrac)) hpFrac = 1;
  const { centerX: x, centerY: y } = WORLD;
  // Rotating beam: two soft cones sweeping the dark.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const dir of [0, Math.PI]) {
    const a = beamAngle + dir;
    const grad = ctx.createLinearGradient(x, y - 34, x + Math.cos(a) * 420, y - 34 + Math.sin(a) * 420);
    grad.addColorStop(0, 'rgba(255,209,102,0.34)');
    grad.addColorStop(1, 'rgba(255,209,102,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x, y - 34);
    ctx.arc(x, y - 34, 420, a - 0.09, a + 0.09);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Stone base and tower.
  ctx.fillStyle = '#4d5468';
  ctx.beginPath();
  ctx.ellipse(x, y + 16, 30, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  const tower = ctx.createLinearGradient(x - 16, 0, x + 16, 0);
  tower.addColorStop(0, '#8d93a8');
  tower.addColorStop(0.5, '#e8e4da');
  tower.addColorStop(1, '#7c8296');
  ctx.fillStyle = tower;
  ctx.beginPath();
  ctx.moveTo(x - 15, y + 14);
  ctx.lineTo(x - 10, y - 34);
  ctx.lineTo(x + 10, y - 34);
  ctx.lineTo(x + 15, y + 14);
  ctx.closePath();
  ctx.fill();
  // Red bands.
  ctx.fillStyle = '#c14b4b';
  ctx.fillRect(x - 12.5, y - 12, 25, 7);
  ctx.fillRect(x - 11, y - 28, 22, 6);
  // Lamp room.
  ctx.fillStyle = '#2a3140';
  ctx.fillRect(x - 12, y - 48, 24, 14);
  const lampGlow = 0.55 + 0.45 * hpFrac;
  const lamp = ctx.createRadialGradient(x, y - 41, 2, x, y - 41, 26);
  lamp.addColorStop(0, `rgba(255,243,214,${0.85 * lampGlow})`);
  lamp.addColorStop(1, 'rgba(255,183,3,0)');
  ctx.fillStyle = lamp;
  ctx.beginPath();
  ctx.arc(x, y - 41, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.lightCore;
  ctx.beginPath();
  ctx.arc(x, y - 41, 6 + 2 * hpFrac, 0, Math.PI * 2);
  ctx.fill();
  // Roof.
  ctx.fillStyle = '#c14b4b';
  ctx.beginPath();
  ctx.moveTo(x - 14, y - 48);
  ctx.lineTo(x, y - 60);
  ctx.lineTo(x + 14, y - 48);
  ctx.closePath();
  ctx.fill();
  // Cracks show as the light fails.
  if (hpFrac < 0.5) {
    ctx.strokeStyle = 'rgba(20,20,30,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 30);
    ctx.lineTo(x - 2, y - 18);
    ctx.lineTo(x - 7, y - 6);
    ctx.stroke();
  }
}

export function drawPlayer(ctx, p, aimAngle, time) {
  const bob = Math.sin(time * 6) * (p.moving ? 1.5 : 0.5);
  ctx.save();
  ctx.translate(p.x, p.y + bob * 0.3);
  // Dash ghost trail is drawn by the caller through particles; the keeper:
  // a hooded figure with a glowing lantern staff, drawn facing the aim.
  ctx.rotate(aimAngle);
  // Staff.
  ctx.strokeStyle = '#6b5433';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-6, 10);
  ctx.lineTo(16, -4);
  ctx.stroke();
  const glow = ctx.createRadialGradient(18, -5, 1, 18, -5, 16);
  glow.addColorStop(0, 'rgba(255,243,214,0.95)');
  glow.addColorStop(0.4, 'rgba(255,183,3,0.5)');
  glow.addColorStop(1, 'rgba(255,183,3,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(18, -5, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.lightCore;
  ctx.beginPath();
  ctx.arc(18, -5, 4, 0, Math.PI * 2);
  ctx.fill();
  // Cloak body.
  ctx.rotate(-aimAngle);
  const cloak = ctx.createLinearGradient(0, -12, 0, 12);
  cloak.addColorStop(0, '#3b6ea5');
  cloak.addColorStop(1, '#23406b');
  ctx.fillStyle = cloak;
  ctx.beginPath();
  ctx.moveTo(0, -13);
  ctx.quadraticCurveTo(11, -4, 10, 11);
  ctx.quadraticCurveTo(0, 14, -10, 11);
  ctx.quadraticCurveTo(-11, -4, 0, -13);
  ctx.fill();
  // Hood + face glow.
  ctx.fillStyle = '#2c4d7d';
  ctx.beginPath();
  ctx.arc(0, -8, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe9b8';
  ctx.beginPath();
  ctx.arc(Math.cos(aimAngle) * 2, -8 + Math.sin(aimAngle) * 2, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Dash cooldown ring underfoot.
  if (p.dashCd > 0) {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y + 13, 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p.dashCd / p.dashCdMax));
    ctx.stroke();
  }
  // Brief invulnerability shimmer after a dash.
  if (p.invuln > 0) {
    ctx.strokeStyle = 'rgba(142,241,224,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 17 + Math.sin(time * 20) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawGloomBody(ctx, e, time) {
  const wobble = Math.sin(time * 5 + e.wobbleSeed) * 0.08;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.angle + wobble);
  const r = e.radius;
  const body = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.2, 0, 0, r * 1.15);
  body.addColorStop(0, e.color);
  body.addColorStop(1, e.colorDark);
  ctx.fillStyle = body;
  ctx.beginPath();
  // A blobby, many-lobed silhouette.
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const rr = r * (0.88 + 0.18 * Math.sin(a * 3 + e.wobbleSeed));
    const px = Math.cos(a) * rr;
    const py = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  // Spikes.
  ctx.fillStyle = e.colorDark;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + e.wobbleSeed;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a - 0.18) * r * 0.8, Math.sin(a - 0.18) * r * 0.8);
    ctx.lineTo(Math.cos(a) * r * 1.45, Math.sin(a) * r * 1.45);
    ctx.lineTo(Math.cos(a + 0.18) * r * 0.8, Math.sin(a + 0.18) * r * 0.8);
    ctx.closePath();
    ctx.fill();
  }
  // Eyes: glowing, facing travel direction.
  ctx.fillStyle = PALETTE.gloomEye;
  ctx.beginPath();
  ctx.arc(r * 0.35, -r * 0.3, Math.max(1.6, r * 0.14), 0, Math.PI * 2);
  ctx.arc(r * 0.35, r * 0.3, Math.max(1.6, r * 0.14), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Hit flash.
  if (e.flash > 0) {
    ctx.globalAlpha = Math.min(0.8, e.flash * 4);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Boss crown.
  if (e.kind === 'herald') {
    ctx.strokeStyle = PALETTE.amber;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = -2; i <= 2; i++) {
      const x = e.x + i * 10;
      ctx.moveTo(x, e.y - e.radius - 2);
      ctx.lineTo(x + 4, e.y - e.radius - 14);
      ctx.lineTo(x + 8, e.y - e.radius - 2);
    }
    ctx.stroke();
  }
  // Health bar for tougher enemies.
  if (e.maxHp >= 40 && e.hp < e.maxHp) {
    const w = e.radius * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 10, w, 4);
    ctx.fillStyle = '#b8ff9e';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 10, w * Math.max(0, e.hp / e.maxHp), 4);
  }
}

export function drawEnemy(ctx, e, time) {
  drawGloomBody(ctx, e, time);
}

export function drawBolt(ctx, b) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 12);
  grad.addColorStop(0, 'rgba(255,243,214,0.95)');
  grad.addColorStop(0.35, 'rgba(255,209,102,0.6)');
  grad.addColorStop(1, 'rgba(255,183,3,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(b.x, b.y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = PALETTE.lightCore;
  ctx.beginPath();
  ctx.arc(b.x, b.y, 3.4, 0, Math.PI * 2);
  ctx.fill();
}

export function drawOrb(ctx, o, time) {
  const pulse = 1 + Math.sin(time * 10 + o.seed) * 0.2;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const grad = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, 14 * pulse);
  grad.addColorStop(0, 'rgba(190,140,255,0.8)');
  grad.addColorStop(0.5, 'rgba(123,94,167,0.45)');
  grad.addColorStop(1, 'rgba(123,94,167,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(o.x, o.y, 14 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#d9c2ff';
  ctx.beginPath();
  ctx.arc(o.x, o.y, 4.5, 0, Math.PI * 2);
  ctx.fill();
}

export function drawPickup(ctx, p, time) {
  const bob = Math.sin(time * 4 + p.seed) * 3;
  const y = p.y + bob;
  if (p.kind === 'heart') {
    ctx.fillStyle = PALETTE.heart;
    ctx.save();
    ctx.translate(p.x, y);
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.bezierCurveTo(-9, -2, -6, -9, 0, -4);
    ctx.bezierCurveTo(6, -9, 9, -2, 0, 6);
    ctx.fill();
    ctx.restore();
    return;
  }
  // Ember: a flickering amber shard.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const grad = ctx.createRadialGradient(p.x, y, 0, p.x, y, 13);
  grad.addColorStop(0, 'rgba(255,183,3,0.85)');
  grad.addColorStop(1, 'rgba(255,183,3,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(p.x, y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(p.x, y);
  ctx.rotate(Math.PI / 4 + Math.sin(time * 3 + p.seed) * 0.25);
  ctx.fillStyle = PALETTE.amber;
  ctx.fillRect(-4, -4, 8, 8);
  ctx.fillStyle = PALETTE.lightCore;
  ctx.fillRect(-2, -2, 4, 4);
  ctx.restore();
}

export function drawVignette(ctx) {
  const { width, height } = WORLD;
  const v = ctx.createRadialGradient(480, 270, 200, 480, 270, 560);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, width, height);
}
