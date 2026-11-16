// Keyboard and mouse state. The game reads held keys and edge-triggered
// presses; the mouse position is converted into the canvas's logical
// coordinates by the caller (the canvas is scaled with CSS).
export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const state = {
    keys, pressed,
    mouseX: 0, mouseY: 0,
    firing: false,
    clicked: false,
  };

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    state.mouseX = ((event.clientX - rect.left) / rect.width) * canvas.width;
    state.mouseY = ((event.clientY - rect.top) / rect.height) * canvas.height;
  }

  window.addEventListener('keydown', (event) => {
    if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
    if (!event.repeat) pressed.add(event.code);
    keys.add(event.code);
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => { keys.clear(); pressed.clear(); state.firing = false; });
  canvas.addEventListener('mousemove', toLogical);
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) { state.firing = true; state.clicked = true; }
    toLogical(event);
  });
  window.addEventListener('mouseup', (event) => { if (event.button === 0) state.firing = false; });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    state,
    // Edge-triggered keys are consumed once per frame so one press is one action.
    endFrame() { pressed.clear(); state.clicked = false; },
    has(code) { return keys.has(code); },
    wasPressed(code) { return pressed.has(code); },
    axis() {
      let x = 0; let y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
      return { x, y };
    },
  };
}
