/**
 * Specimen detail — paper-stage 3D model with Vietnamese part notes.
 */

import gsap from 'gsap';
import { setupNavbarAuth } from '../utils/authNavbar.js';
import { ChatBox } from '../components/chatBox.js';
import { getModelById, getModelBySlug } from '../api/bioModelApi.js';
import { markModelExplored, addXP, getProgress } from '../features/progress/progressService.js';
import { ModelViewer, resolveModelUrl, parseJsonField } from '../features/model/ModelViewer.js';
import { looksScientific, looksVietnamese } from '../features/model/partNames.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let viewer = null;
let selectedPartId = null;
let pinFrame = 0;
let pinXTo = null;
let pinYTo = null;

document.addEventListener('DOMContentLoaded', () => {
  setupNavbarAuth();
  try {
    new ChatBox();
  } catch (err) {
    console.warn('BioBot init note:', err);
  }
  bindUi();
  playChromeIn();
  loadSpecimen();
});

function bindUi() {
  document.getElementById('btn-reset')?.addEventListener('click', (e) => {
    pulse(e.currentTarget);
    viewer?.resetView();
    selectedPartId = null;
    hideNote();
    syncPartList();
  });

  document.getElementById('btn-explode')?.addEventListener('click', (e) => {
    const next = !viewer?.exploded;
    viewer?.setExploded(next);
    toggleTool(e.currentTarget, next);
  });

  document.getElementById('btn-isolate')?.addEventListener('click', (e) => {
    const next = !viewer?.isolateMode;
    viewer?.setIsolated(next);
    toggleTool(e.currentTarget, next);
  });

  document.getElementById('btn-front')?.addEventListener('click', (e) => {
    pulse(e.currentTarget);
    viewer?.setCameraPreset('front');
  });
  document.getElementById('btn-side')?.addEventListener('click', (e) => {
    pulse(e.currentTarget);
    viewer?.setCameraPreset('side');
  });
  document.getElementById('btn-top')?.addEventListener('click', (e) => {
    pulse(e.currentTarget);
    viewer?.setCameraPreset('top');
  });
  document.getElementById('note-close')?.addEventListener('click', () => {
    viewer?.selectPart(null, { focus: false });
    selectedPartId = null;
    hideNote();
    syncPartList();
  });
}

async function loadSpecimen() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const slug = params.get('slug');

  if (!id && !slug) {
    showError('Thiếu mã mô hình', 'Mở lại từ kho Sinh học để xem mẫu vật.');
    return;
  }

  try {
    const model = slug ? await getModelBySlug(slug) : await getModelById(id);
    if (!model) {
      showError('Không tìm thấy mô hình', 'Mẫu vật có thể đã bị ẩn.');
      return;
    }

    renderMeta(model);
    trackProgress(model);

    const url = resolveModelUrl(model.modelUrl);
    if (!url) {
      showError('Mô hình chưa có file 3D', 'Admin cần gắn file .glb trước khi học sinh xem được mẫu này.');
      return;
    }

    viewer = new ModelViewer('canvas-container', {
      onPartClick: handlePartClick,
      onHover: handleHover,
      onLoadProgress: (pct) => {
        const bar = document.getElementById('loading-bar');
        const text = document.getElementById('loading-text');
        if (bar) gsap.to(bar, { width: `${pct}%`, duration: 0.18, ease: 'power1.out', overwrite: 'auto' });
        if (text) text.textContent = `Đang nạp file 3D… ${pct}%`;
      },
      onReady: (parts) => {
        hideLoading();
        renderParts(parts, { animate: true });
      },
      onError: () => {
        showError('Không tải được file 3D', 'Kiểm tra file trên R2 hoặc CORS, rồi thử lại.');
      },
      onPartsChange: (parts) => renderParts(parts)
    });

    viewer.load(url, {
      annotations: model.annotations,
      scale: model.defaultScale,
      rotation: model.defaultRotation,
      cameraPosition: model.cameraPosition
    });
  } catch (err) {
    showError('Không mở được mô hình', err.message || 'Kiểm tra backend rồi thử lại.');
  }
}

function renderMeta(model) {
  document.title = `${model.name || 'Mô hình 3D'} - BioVerse`;
  setText('model-name', model.name || 'Mô hình 3D');
  setText('model-latin', specimenLatin(model));
  setText('model-category', model.category || 'Sinh học');

  const meta = document.getElementById('model-meta');
  if (meta) {
    const pills = [];
    if (model.grade) pills.push(`Lớp ${model.grade}`);
    if (model.badgeText) pills.push(model.badgeText);
    if (model.viewsCount != null) pills.push(`${model.viewsCount} lượt xem`);
    meta.innerHTML = pills.map((label) => `<span class="specimen-pill">${escapeHtml(label)}</span>`).join('');
  }

  const copy = document.getElementById('model-copy');
  if (!copy) return;
  const facts = asList(parseJsonField(model.funFacts));
  copy.innerHTML = [
    model.description ? `<p>${escapeHtml(model.description)}</p>` : '',
    model.habitat ? `<p><strong>Môi trường sống:</strong> ${escapeHtml(model.habitat)}</p>` : '',
    model.characteristics ? `<p><strong>Đặc điểm:</strong> ${escapeHtml(model.characteristics)}</p>` : '',
    facts.length
      ? `<ul class="specimen-facts">${facts.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
      : ''
  ].join('');
}

function renderParts(parts, { animate = false } = {}) {
  const list = document.getElementById('parts-list');
  const count = document.getElementById('parts-count');
  if (count) count.textContent = String(parts?.length || 0);
  if (!list) return;
  if (!parts?.length) {
    list.innerHTML = '<p class="font-[\'Be_Vietnam_Pro\'] text-sm text-[#5b403e] px-2">Mô hình này chưa tách bộ phận (một khối mesh).</p>';
    return;
  }
  list.innerHTML = parts.map((part) => `
    <button type="button" class="specimen-part${part.id === selectedPartId ? ' is-active' : ''}" data-part-id="${escapeAttr(part.id)}">
      <span class="specimen-part-dot" style="background:${escapeAttr(part.color)}"></span>
      <span class="specimen-part-name">${escapeHtml(part.name)}</span>
      <span class="specimen-part-vis${part.visible ? '' : ' is-off'}" data-vis="${escapeAttr(part.id)}" title="${part.visible ? 'Ẩn bộ phận' : 'Hiện bộ phận'}" role="button">
        <span class="material-symbols-outlined">${part.visible ? 'visibility' : 'visibility_off'}</span>
      </span>
    </button>
  `).join('');

  list.querySelectorAll('[data-part-id]').forEach((row) => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('[data-vis]')) return;
      const part = viewer?.getPart(row.dataset.partId);
      if (!part) return;
      viewer.selectPart(part.id);
      handlePartClick(part, null);
    });
  });
  list.querySelectorAll('[data-vis]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.vis;
      const part = viewer?.getPart(id);
      if (!part) return;
      viewer.setPartVisible(id, !part.visible);
      if (selectedPartId === id && part.visible) {
        selectedPartId = null;
        hideNote();
      }
      renderParts(viewer.getParts());
    });
  });

  if (animate) revealParts(list);
}

function syncPartList() {
  if (viewer) renderParts(viewer.getParts());
}

function handlePartClick(part) {
  selectedPartId = part?.id || null;
  syncPartList();
  if (!part) {
    hideNote();
    return;
  }
  showNote(part);
  startPinFollow(part);
}

function handleHover(part, screen) {
  const tag = document.getElementById('specimen-hover-tag');
  if (!tag) return;
  if (!part || !screen || part.id === selectedPartId) {
    tag.classList.add('hidden');
    return;
  }
  tag.textContent = part.name;
  tag.style.left = `${screen.x}px`;
  tag.style.top = `${screen.y}px`;
  tag.classList.remove('hidden');
}

function showNote(part) {
  const note = document.getElementById('part-note');
  const copy = document.getElementById('model-copy');
  if (!note) return;
  document.getElementById('note-dot')?.style.setProperty('background', part.color);
  setText('note-name', part.name);
  setText('note-latin', part.latin && part.latin !== part.name ? part.latin : '');
  setText('note-loc', part.location || 'Nằm trong khối mô hình.');
  setText('note-desc', part.description || defaultDescription(part));
  setBlock('note-fn-wrap', 'note-fn', part.function);
  note.hidden = false;
  copy?.classList.add('is-collapsed');
  stampNote(note);
  document.querySelector(`[data-part-id="${cssEscape(part.id)}"]`)?.scrollIntoView({ block: 'nearest' });
}

function defaultDescription(part) {
  const pieces = part.meshCount > 1 ? `${part.meshCount} mảnh ghép` : 'một khối liền';
  return `Đây là ${part.name.toLowerCase()}, gồm ${pieces} trong mô hình. Xoay camera hoặc bấm “Tách bộ phận” để nhìn rõ hình dạng.`;
}

function hideNote() {
  const note = document.getElementById('part-note');
  const copy = document.getElementById('model-copy');
  const pin = document.getElementById('specimen-pin');
  if (note) note.hidden = true;
  copy?.classList.remove('is-collapsed');
  pin?.classList.add('hidden');
  cancelAnimationFrame(pinFrame);
}

function startPinFollow(part) {
  const pin = document.getElementById('specimen-pin');
  const label = document.getElementById('pin-label');
  if (!pin || !label) return;
  label.textContent = part.name;
  pin.classList.remove('hidden');
  if (!pinXTo) {
    gsap.set(pin, { x: 0, y: 0 });
    pinXTo = gsap.quickTo(pin, 'x', { duration: reduceMotion ? 0 : 0.28, ease: 'power3.out' });
    pinYTo = gsap.quickTo(pin, 'y', { duration: reduceMotion ? 0 : 0.28, ease: 'power3.out' });
  }
  const tick = () => {
    if (selectedPartId !== part.id) return;
    const pos = viewer?.getPartScreenPosition(part.id);
    if (pos?.visible) {
      const clamped = clampPin(pos.x, pos.y);
      pin.style.left = '0px';
      pin.style.top = '0px';
      pinXTo(clamped.x);
      pinYTo(clamped.y);
      pin.style.visibility = 'visible';
    } else {
      pin.style.visibility = 'hidden';
    }
    pinFrame = requestAnimationFrame(tick);
  };
  cancelAnimationFrame(pinFrame);
  tick();
}

function clampPin(x, y) {
  const stage = document.querySelector('.specimen-stage');
  const sidebar = document.querySelector('.specimen-sidebar');
  const width = stage?.clientWidth || window.innerWidth;
  const height = stage?.clientHeight || window.innerHeight;
  const side = sidebar?.offsetWidth || 0;
  const maxX = Math.max(24, width - side - 28);
  return {
    x: Math.min(maxX, Math.max(16, x + 18)),
    y: Math.min(height - 28, Math.max(16, y - 28))
  };
}

function playChromeIn() {
  if (reduceMotion) return;
  const toolbar = document.querySelector('.specimen-toolbar');
  const sidebar = document.querySelector('.specimen-sidebar');
  const hint = document.querySelector('.specimen-hint');
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  if (toolbar) tl.fromTo(toolbar, { y: -12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.35 }, 0);
  if (sidebar) tl.fromTo(sidebar, { x: 24, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.4 }, 0.05);
  if (hint) tl.fromTo(hint, { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.3 }, 0.12);
}

function revealParts(list) {
  if (reduceMotion || !list?.children?.length) return;
  gsap.fromTo(list.children, { y: 8, autoAlpha: 0 }, {
    y: 0,
    autoAlpha: 1,
    duration: 0.28,
    stagger: { each: 0.03, from: 'start' },
    ease: 'power2.out',
    overwrite: true
  });
}

function stampNote(note) {
  if (reduceMotion) return;
  gsap.fromTo(note, { y: 10, scale: 0.97, autoAlpha: 0 }, {
    y: 0,
    scale: 1,
    autoAlpha: 1,
    duration: 0.32,
    ease: 'power3.out',
    overwrite: true
  });
}

function pulse(el) {
  if (!el || reduceMotion) return;
  gsap.fromTo(el, { scale: 0.96 }, { scale: 1, duration: 0.16, ease: 'power2.out', overwrite: true });
}

function toggleTool(btn, active) {
  btn.classList.toggle('is-active', active);
  btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  pulse(btn);
}

function trackProgress(model) {
  const key = `model-${model.id}`;
  const seen = getProgress().modelsExplored?.includes(key);
  markModelExplored(key);
  if (!seen) addXP(40);
}

function hideLoading() {
  const el = document.getElementById('specimen-loading');
  if (!el) return;
  if (reduceMotion) {
    el.hidden = true;
    return;
  }
  gsap.to(el, {
    autoAlpha: 0,
    duration: 0.28,
    ease: 'power2.out',
    onComplete: () => {
      el.hidden = true;
    }
  });
}

function showError(title, message) {
  const loading = document.getElementById('specimen-loading');
  if (loading) loading.hidden = true;
  const box = document.getElementById('specimen-error');
  if (box) box.hidden = false;
  setText('error-title', title);
  setText('error-text', message);
}

function specimenLatin(model) {
  const candidates = [model.scientificName, model.nameEn];
  return candidates.find((value) => value && (looksVietnamese(value) || looksScientific(value))) || '';
}

function asList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => (typeof item === 'string' ? item : item?.text || item?.fact || '')).filter(Boolean);
  if (typeof value === 'string') return [value];
  return [];
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || '';
}

function setBlock(wrapId, textId, value) {
  const wrap = document.getElementById(wrapId);
  if (!wrap) return;
  wrap.hidden = !value;
  setText(textId, value);
}

function cssEscape(value) {
  if (window.CSS?.escape) return window.CSS.escape(value);
  return String(value).replace(/"/g, '\\"');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}
