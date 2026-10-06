/**
 * Island: pixel paint (Lesson 7).
 *
 * The ONLY client-side TypeScript in the lab. It owns one thing Datastar can't express:
 * drawing on a <canvas> with pointer events. Everything else stays in Datastar.
 *
 * Wiring (both one-way, no globals, no shared state):
 *   Datastar → island: reads `data-pen-color`, `data-pen-size` at paint time and watches
 *                      `data-clear-token` (all set by data-attr:* from signals).
 *   island → Datastar: dispatches a `paint-change` CustomEvent; the page's
 *                      data-on:paint-change copies its detail into signals.
 */

const WHITE = '#ffffff';

function initPaint(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width, height } = canvas; // logical pixels; CSS scales them up with image-rendering: pixelated
  const painted = new Set<string>();
  let strokes = 0;
  let drawing = false;

  const emit = () =>
    canvas.dispatchEvent(new CustomEvent('paint-change', { detail: { strokes, pixels: painted.size } }));

  const cellAt = (e: PointerEvent): [number, number] => {
    const r = canvas.getBoundingClientRect();
    return [Math.floor(((e.clientX - r.left) / r.width) * width), Math.floor(((e.clientY - r.top) / r.height) * height)];
  };

  const paintAt = ([x, y]: [number, number]) => {
    const size = Number(canvas.dataset.penSize) || 1;
    const color = canvas.dataset.penColor || '#2a2140';
    ctx.fillStyle = color;
    for (let dx = 0; dx < size; dx++) {
      for (let dy = 0; dy < size; dy++) {
        const px = x + dx;
        const py = y + dy;
        if (px < 0 || py < 0 || px >= width || py >= height) continue;
        ctx.fillRect(px, py, 1, 1);
        if (color.toLowerCase() === WHITE) painted.delete(`${px},${py}`);
        else painted.add(`${px},${py}`);
      }
    }
  };

  const clear = () => {
    ctx.fillStyle = WHITE;
    ctx.fillRect(0, 0, width, height);
    painted.clear();
    strokes = 0;
    emit();
  };

  canvas.addEventListener('pointerdown', (e) => {
    drawing = true;
    canvas.setPointerCapture(e.pointerId);
    strokes += 1;
    paintAt(cellAt(e));
  });
  canvas.addEventListener('pointermove', (e) => {
    if (drawing) paintAt(cellAt(e));
  });
  const end = () => {
    if (!drawing) return;
    drawing = false;
    emit();
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  // Datastar → island: Clear bumps $clearToken, data-attr writes it here, we react.
  new MutationObserver(clear).observe(canvas, { attributes: true, attributeFilter: ['data-clear-token'] });

  clear();
}

document.querySelectorAll<HTMLCanvasElement>('canvas[data-island="paint"]').forEach(initPaint);
