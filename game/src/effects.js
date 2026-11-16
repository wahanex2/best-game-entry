// Particles, floating score text and screen shake: the feedback layer that
// makes every hit, pickup and explosion read at a glance.
export function createEffects() {
  const particles = [];
  const texts = [];
  let shake = 0;

  function burst(x, y, { count = 12, color = '#ffd166', speed = 160, life = 0.5, size = 3, gravity = 0 }) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.9);
      particles.push({
        x, y,
        vx: Math.cos(angle) * v, vy: Math.sin(angle) * v,
        life: life * (0.5 + Math.random() * 0.8), maxLife: life,
        size: size * (0.6 + Math.random() * 0.8),
        color, gravity,
      });
    }
  }

  return {
    get shake() { return shake; },
    burst,
    sparks(x, y, color) { burst(x, y, { count: 6, color, speed: 120, life: 0.3, size: 2 }); },
    explosion(x, y, color = '#ffd166') {
      burst(x, y, { count: 26, color, speed: 220, life: 0.6, size: 4 });
      burst(x, y, { count: 12, color: '#fff3d6', speed: 120, life: 0.35, size: 2.5 });
    },
    emberTrail(x, y) { burst(x, y, { count: 1, color: '#ffb703', speed: 20, life: 0.4, size: 2 }); },
    addShake(amount) { shake = Math.min(14, shake + amount); },
    floatText(x, y, text, color = '#fff3d6', size = 15) {
      texts.push({ x, y, text, color, size, life: 0.9, maxLife: 0.9 });
    },
    step(dt) {
      shake = Math.max(0, shake - dt * 26);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        p.vy += p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.98; p.vy *= 0.98;
      }
      for (let i = texts.length - 1; i >= 0; i--) {
        const t = texts[i];
        t.life -= dt;
        t.y -= 34 * dt;
        if (t.life <= 0) texts.splice(i, 1);
      }
    },
    draw(ctx) {
      for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (const t of texts) {
        ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
        ctx.font = `700 ${t.size}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = t.color;
        ctx.strokeStyle = 'rgba(6,10,18,0.85)';
        ctx.lineWidth = 3;
        ctx.strokeText(t.text, t.x, t.y);
        ctx.fillText(t.text, t.x, t.y);
      }
      ctx.globalAlpha = 1;
    },
    clear() { particles.length = 0; texts.length = 0; shake = 0; },
  };
}
