/**
 * 2D chemx crop preview — frame atoms into a fixed viewport (pan / zoom),
 * mirroring the admin-models thumbnail crop UX for .chemx uploads.
 */

import { atomColor, atomRadius } from './atomData.js';

const PAD = 0.55;

function atomsOf(kf) {
  if (!kf) return [];
  if (Array.isArray(kf.atoms)) return kf.atoms;
  return Object.values(kf.atoms || {});
}

function bondsOf(kf) {
  return Array.isArray(kf?.bonds) ? kf.bonds : [];
}

function atomPos(atom) {
  return {
    x: Number(atom?.position?.x) || 0,
    y: Number(atom?.position?.z) || 0, // top-down: x–z plane
    r: Math.max(0.22, (atomRadius(atom?.symbol) || 0.5) * 0.55),
    symbol: atom?.symbol || '?',
    id: String(atom?.id || ''),
    color: atom?.color || atomColor(atom?.symbol),
  };
}

export function createChemxCropper(canvas) {
  const state = {
    canvas,
    keyframe: null,
    keyframes: [],
    frameIndex: 0,
    scale: 1,
    minScale: 1,
    offsetX: 0,
    offsetY: 0,
    dragging: false,
    lastX: 0,
    lastY: 0,
  };

  function worldBounds(atoms) {
    if (!atoms.length) {
      return { minX: -2, maxX: 2, minY: -1.5, maxY: 1.5 };
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    atoms.forEach((a) => {
      minX = Math.min(minX, a.x - a.r);
      maxX = Math.max(maxX, a.x + a.r);
      minY = Math.min(minY, a.y - a.r);
      maxY = Math.max(maxY, a.y + a.r);
    });
    return { minX, maxX, minY, maxY };
  }

  function fitToFrame() {
    const atoms = atomsOf(state.keyframe).map(atomPos);
    const b = worldBounds(atoms);
    const w = Math.max(0.5, b.maxX - b.minX) + PAD * 2;
    const h = Math.max(0.5, b.maxY - b.minY) + PAD * 2;
    const sx = state.canvas.width / w;
    const sy = state.canvas.height / h;
    state.minScale = Math.min(sx, sy);
    state.scale = state.minScale;
    const cx = (b.minX + b.maxX) / 2;
    const cy = (b.minY + b.maxY) / 2;
    state.offsetX = state.canvas.width / 2 - cx * state.scale;
    state.offsetY = state.canvas.height / 2 - cy * state.scale;
  }

  function clamp() {
    const atoms = atomsOf(state.keyframe).map(atomPos);
    if (!atoms.length) return;
    const b = worldBounds(atoms);
    const w = (b.maxX - b.minX + PAD * 2) * state.scale;
    const h = (b.maxY - b.minY + PAD * 2) * state.scale;
    if (w <= state.canvas.width) {
      state.offsetX = state.canvas.width / 2 - ((b.minX + b.maxX) / 2) * state.scale;
    } else {
      const left = -b.minX * state.scale + PAD * state.scale;
      const right = state.canvas.width - b.maxX * state.scale - PAD * state.scale;
      state.offsetX = Math.min(left, Math.max(right, state.offsetX));
    }
    if (h <= state.canvas.height) {
      state.offsetY = state.canvas.height / 2 - ((b.minY + b.maxY) / 2) * state.scale;
    } else {
      const top = -b.minY * state.scale + PAD * state.scale;
      const bottom = state.canvas.height - b.maxY * state.scale - PAD * state.scale;
      state.offsetY = Math.min(top, Math.max(bottom, state.offsetY));
    }
  }

  function toScreen(x, y) {
    return {
      x: x * state.scale + state.offsetX,
      y: y * state.scale + state.offsetY,
    };
  }

  function draw() {
    const ctx = state.canvas.getContext('2d');
    const { width, height } = state.canvas;
    ctx.fillStyle = '#1b1c1c';
    ctx.fillRect(0, 0, width, height);

    // subtle grid
    ctx.strokeStyle = 'rgba(253,251,247,0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (!state.keyframe) {
      ctx.fillStyle = 'rgba(253,251,247,0.55)';
      ctx.font = '600 14px "Be Vietnam Pro", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Tải .chemx để xem khung phân tử', width / 2, height / 2);
      return;
    }

    const atoms = atomsOf(state.keyframe).map(atomPos);
    const byId = Object.fromEntries(atoms.map((a) => [a.id, a]));

    bondsOf(state.keyframe).forEach((bond) => {
      const [aId, bId] = bond.atomIds || [];
      const a = byId[String(aId)];
      const b = byId[String(bId)];
      if (!a || !b) return;
      const p1 = toScreen(a.x, a.y);
      const p2 = toScreen(b.x, b.y);
      ctx.strokeStyle = '#fdfbf7';
      ctx.lineWidth = Math.max(2, 3 * (state.scale / 40));
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });

    atoms.forEach((atom) => {
      const p = toScreen(atom.x, atom.y);
      const r = Math.max(10, atom.r * state.scale);
      ctx.beginPath();
      ctx.fillStyle = atom.color;
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2d2d2d';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = atom.symbol === 'H' || atom.symbol === 'C' ? '#1b1c1c' : '#fdfbf7';
      ctx.font = `700 ${Math.max(10, Math.round(r * 0.7))}px "Space Grotesk", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(atom.symbol, p.x, p.y + 0.5);
    });

    // crop frame border
    ctx.strokeStyle = 'rgba(0,134,76,0.85)';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, width - 4, height - 4);
  }

  function setChemx(data) {
    state.keyframes = Array.isArray(data?.keyframes) ? data.keyframes : [];
    state.frameIndex = state.keyframes.length ? state.keyframes.length - 1 : 0;
    state.keyframe = state.keyframes[state.frameIndex] || null;
    if (state.keyframe) fitToFrame();
    draw();
    return {
      frameIndex: state.frameIndex,
      frameCount: state.keyframes.length,
    };
  }

  function setFrameIndex(index) {
    if (!state.keyframes.length) return;
    state.frameIndex = Math.max(0, Math.min(state.keyframes.length - 1, index));
    state.keyframe = state.keyframes[state.frameIndex];
    fitToFrame();
    draw();
  }

  function setZoomFactor(factor) {
    const next = state.minScale * Math.max(1, Math.min(3, Number(factor) || 1));
    const cx = state.canvas.width / 2;
    const cy = state.canvas.height / 2;
    const wx = (cx - state.offsetX) / state.scale;
    const wy = (cy - state.offsetY) / state.scale;
    state.scale = next;
    state.offsetX = cx - wx * state.scale;
    state.offsetY = cy - wy * state.scale;
    clamp();
    draw();
  }

  function zoomFactor() {
    return state.minScale ? state.scale / state.minScale : 1;
  }

  function clear() {
    state.keyframe = null;
    state.keyframes = [];
    state.frameIndex = 0;
    draw();
  }

  function bindPointer() {
    canvas.addEventListener('pointerdown', (event) => {
      if (!state.keyframe) return;
      state.dragging = true;
      state.lastX = event.clientX;
      state.lastY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', (event) => {
      if (!state.dragging) return;
      state.offsetX += event.clientX - state.lastX;
      state.offsetY += event.clientY - state.lastY;
      state.lastX = event.clientX;
      state.lastY = event.clientY;
      clamp();
      draw();
    });
    const stop = () => {
      state.dragging = false;
    };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
    canvas.addEventListener('wheel', (event) => {
      if (!state.keyframe) return;
      event.preventDefault();
      const delta = event.deltaY < 0 ? 0.08 : -0.08;
      setZoomFactor(zoomFactor() + delta);
      canvas.dispatchEvent(new CustomEvent('chemx-zoom', { detail: { factor: zoomFactor() } }));
    }, { passive: false });
  }

  bindPointer();
  draw();

  return {
    setChemx,
    setFrameIndex,
    setZoomFactor,
    zoomFactor,
    clear,
    draw,
    get frameIndex() {
      return state.frameIndex;
    },
    get frameCount() {
      return state.keyframes.length;
    },
  };
}
