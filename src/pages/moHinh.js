/**
 * Specimen detail — paper-stage 3D model with Vietnamese part notes.
 */

import gsap from 'gsap';
import { setupNavbarAuth } from '../utils/authNavbar.js';
import { ChatBox } from '../components/chatBox.js';
import { getModelById, getModelBySlug } from '../api/bioModelApi.js';
import { markModelExplored, addXP, getProgress, updateLastLesson } from '../features/progress/progressService.js';
import { recordViewedModel } from '../features/model/recentModels.js';
import { ModelViewer, resolveModelUrl, parseJsonField } from '../features/model/ModelViewer.js';
import { looksScientific, looksVietnamese } from '../features/model/partNames.js';
import { getEligibleGameStructures } from '../features/model/anatomyStructures.js';
import { FindThePartGame } from '../features/model/findThePartGame.js';
import { physicsQuizModal } from '../features/physics/PhysicsQuizModal.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let viewer = null;
let selectedPartId = null;
let pinFrame = 0;
let pinXTo = null;
let pinYTo = null;
let gameInstance = null;
let isPhysics = false;

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

  const btnGame = document.getElementById('btn-game');
  btnGame?.addEventListener('click', (e) => {
    pulse(e.currentTarget);
    if (!gameInstance || !gameInstance.canPlay()) return;
    if (gameInstance.isActive) {
      if (gameInstance.results.length > 0 && (gameInstance.phase === 'question' || gameInstance.phase === 'feedback')) {
        showGameExitModal();
      } else {
        exitGameMode();
      }
    } else {
      startGameMode();
    }
  });

  document.getElementById('btn-game-continue')?.addEventListener('click', () => {
    hideGameExitModal();
  });

  document.getElementById('btn-game-confirm-exit')?.addEventListener('click', () => {
    hideGameExitModal();
    exitGameMode();
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
      showError('Không tìm thấy mô hình', 'Mẫu vật có thể đã bị ẩn hoặc không tồn tại trên hệ thống.');
      return;
    }

    isPhysics = model.subject === 'PHYSICS';

    renderMeta(model);
    trackProgress(model);

    if (isPhysics) {
      applyPhysicsModeUi(model);
    }

    const url = resolveModelUrl(model.modelUrl);
    if (!url) {
      showError('Mô hình chưa có file 3D', 'Admin cần gắn file .glb trước khi học sinh xem được mẫu này.');
      return;
    }

    viewer = new ModelViewer('canvas-container', {
      onPartClick: isPhysics ? null : handlePartClick,
      onHover: isPhysics ? null : handleHover,
      onLoadProgress: (pct) => {
        const bar = document.getElementById('loading-bar');
        const text = document.getElementById('loading-text');
        if (bar) gsap.to(bar, { width: `${pct}%`, duration: 0.18, ease: 'power1.out', overwrite: 'auto' });
        if (text) text.textContent = `Đang nạp file 3D… ${pct}%`;
      },
      onReady: (parts) => {
        hideLoading();
        if (!isPhysics) {
          renderParts(parts, { animate: true });
          initGameMode(model, parts);
        }
      },
      onError: () => {
        showError('Không tải được file 3D', 'Kiểm tra file trên R2 hoặc CORS, rồi thử lại.');
      },
      onPartsChange: (parts) => {
        if (!isPhysics) renderParts(parts);
      }
    });

    viewer.load(url, {
      slug: model.slug || model.nameEn || model.name || slug || '',
      annotations: model.annotations,
      scale: model.defaultScale,
      rotation: model.defaultRotation,
      cameraPosition: model.cameraPosition
    });
  } catch (err) {
    showError('Không mở được mô hình', err.message || 'Kiểm tra backend rồi thử lại.');
  }
}

function applyPhysicsModeUi(model) {
  // 1. Ẩn nút "Tách bộ phận"
  const btnExplode = document.getElementById('btn-explode');
  if (btnExplode) btnExplode.style.display = 'none';

  // 2. Ẩn nút "Mờ mạnh hơn"
  const btnIsolate = document.getElementById('btn-isolate');
  if (btnIsolate) btnIsolate.style.display = 'none';

  // 3. Ẩn nút "🎮 Thử thách"
  const btnGame = document.getElementById('btn-game');
  if (btnGame) btnGame.style.display = 'none';

  // 4. Ẩn tiêu đề "Bộ phận" và danh sách liệt kê bộ phận
  const partsHead = document.querySelector('.specimen-parts-head');
  if (partsHead) partsHead.style.display = 'none';

  const partsList = document.getElementById('parts-list');
  if (partsList) partsList.style.display = 'none';

  // 5. Ẩn hộp ghi chú bộ phận
  const partNote = document.getElementById('part-note');
  if (partNote) partNote.style.display = 'none';

  // 6. Cập nhật gợi ý thao tác
  const hintEl = document.querySelector('.specimen-hint');
  if (hintEl) {
    hintEl.textContent = 'Kéo chuột để xoay 360° · Cuộn chuột để phóng to / thu nhỏ mô hình thí nghiệm';
  }

  // 7. Cập nhật nút quay lại trên header và footer
  const backBtn = document.querySelector('header a[href*="sinh-hoc"]');
  if (backBtn) {
    backBtn.href = '/vat-ly';
    backBtn.innerHTML = `<span class="material-symbols-outlined text-[16px]">arrow_back</span> Kho mô hình Vật lý`;
  }
  const bottomBackBtn = document.querySelector('footer a[href*="sinh-hoc"], .specimen-page a[href*="sinh-hoc"]');
  if (bottomBackBtn) {
    bottomBackBtn.href = '/vat-ly';
    bottomBackBtn.textContent = 'Về kho Vật lý';
  }

  // 8. Kích hoạt nút "⚡ Thử thách Quiz 3D" trên Toolbar
  const btnQuiz = document.getElementById('btn-physics-quiz');
  if (btnQuiz) {
    btnQuiz.style.display = 'inline-flex';
    btnQuiz.onclick = () => {
      physicsQuizModal.startQuiz({
        slug: model?.slug,
        id: model?.id,
        modelName: model?.name || 'Mô hình vật lý'
      });
    };
  }

  // 9. Kích hoạt Card Quiz trong Sidebar
  const quizCard = document.getElementById('physics-quiz-card-container');
  if (quizCard) {
    quizCard.style.display = 'block';
    const btnStart = document.getElementById('btn-start-physics-quiz');
    if (btnStart) {
      btnStart.onclick = () => {
        physicsQuizModal.startQuiz({
          slug: model?.slug,
          id: model?.id,
          modelName: model?.name || 'Mô hình vật lý'
        });
      };
    }
  }
}

function renderMeta(model) {
  document.title = `${model.name || 'Mô hình 3D'} - BioVerse`;
  setText('model-name', model.name || 'Mô hình 3D');
  setText('model-latin', specimenLatin(model));
  setText('model-category', model.category || (isPhysics ? 'Vật lý' : 'Sinh học'));

  const meta = document.getElementById('model-meta');
  if (meta) {
    const pills = [];
    if (model.grade) pills.push(`Lớp ${model.grade}`);
    if (model.badgeText) pills.push(model.badgeText);
    if (model.viewsCount != null) pills.push(`${model.viewsCount} lượt xem`);
    meta.innerHTML = pills.map((label) => `<span class="specimen-pill">${escapeHtml(label)}</span>`).join('');
  }

  if (model.subject === 'PHYSICS') {
    const backBtn = document.querySelector('header a[href="/sinh-hoc"]');
    if (backBtn) {
      backBtn.href = '/vat-ly';
      backBtn.innerHTML = `<span class="material-symbols-outlined text-[16px]">arrow_back</span> Kho mô hình Vật lý`;
    }
    const bottomBackBtn = document.querySelector('footer a[href="/sinh-hoc"], .specimen-page a[href="/sinh-hoc"]');
    if (bottomBackBtn) {
      bottomBackBtn.href = '/vat-ly';
      bottomBackBtn.textContent = 'Về kho Vật lý';
    }
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
      ${part.isInternal ? '<span class="text-[10px] font-bold text-amber-700 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-300/50 mr-1.5 shrink-0" title="Cấu trúc giải phẫu bên trong">Bên trong</span>' : ''}
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
    row.addEventListener('mouseenter', () => {
      const partId = row.dataset.partId;
      viewer?.setHoveredPart?.(partId);
    });
    row.addEventListener('mouseleave', () => {
      viewer?.setHoveredPart?.(null);
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
  if (gameInstance && gameInstance.isActive) {
    if (gameInstance.phase === 'question' && !gameInstance.isLocked) {
      if (!part || !part.id) {
        return;
      }
      gameInstance.submitAnswer(part.id, part.name || part.id);
    }
    return;
  }

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
  setBlock('note-learn-wrap', 'note-learn', part.learningNote || part.healthNote);
  const internalBadge = document.getElementById('note-internal-badge');
  if (internalBadge) {
    internalBadge.classList.toggle('hidden', !part.isInternal);
  }
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
  const internalBadge = document.getElementById('note-internal-badge');
  if (note) note.hidden = true;
  if (internalBadge) internalBadge.classList.add('hidden');
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
  recordViewedModel(model);
  updateLastLesson({
    modelId: model.id,
    slug: model.slug,
    name: model.name,
    subject: model.subject === 'CHEMISTRY' ? 'Hóa Học' : 'Sinh Học',
    grade: model.grade || 8,
    icon: 'biotech'
  });
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

/* ============================================================
   FIND THE PART GAME MODE LOGIC & RENDERING
   ============================================================ */

function initGameMode(model, parts) {
  const slug = model.slug || model.nameEn || model.name || new URLSearchParams(window.location.search).get('slug') || '';
  let eligible = getEligibleGameStructures(slug);

  // Fallback: nếu mô hình chưa có trong registry nhưng có nhiều bộ phận mesh tách biệt
  if ((!eligible || eligible.length === 0) && parts?.length >= 3) {
    const seenNames = new Set();
    eligible = parts
      .filter((p) => !p.isInternal)
      .filter((p) => {
        const norm = (p.name || '').trim().toLowerCase();
        if (!norm || seenNames.has(norm)) return false;
        seenNames.add(norm);
        return true;
      })
      .map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        description: p.description,
        function: p.function,
        location: p.location,
        isInternal: p.isInternal,
        game: { findPart: true }
      }));
  }

  const btnGame = document.getElementById('btn-game');
  if (!eligible || eligible.length === 0) {
    if (btnGame) {
      btnGame.disabled = true;
      btnGame.title = 'Thử thách chưa khả dụng cho mô hình này.';
      btnGame.setAttribute('aria-disabled', 'true');
    }
    gameInstance = null;
    return;
  }

  if (btnGame) {
    btnGame.disabled = false;
    btnGame.title = 'Thử thách nhận diện giải phẫu 3D';
    btnGame.removeAttribute('aria-disabled');
  }

  gameInstance = new FindThePartGame({
    structures: eligible,
    modelTitle: model.name || 'Mô hình sinh học',
    maxQuestions: 5,
    onStateChange: handleGameStateChange
  });
}

function startGameMode() {
  if (!gameInstance || !gameInstance.canPlay()) return;

  selectedPartId = null;
  hideNote();
  viewer?.selectPart(null, { focus: false });
  viewer?.setGameMode(true);

  setGameSidebarVisible(true);

  const btnGame = document.getElementById('btn-game');
  if (btnGame) {
    btnGame.classList.add('is-active');
    setText('btn-game-label', '🎮 Đang chơi');
  }

  gameInstance.start();
}

function exitGameMode() {
  if (gameInstance) {
    gameInstance.exit();
  }
}

function setGameSidebarVisible(isGame) {
  const copy = document.getElementById('model-copy');
  const partNote = document.getElementById('part-note');
  const partsHead = document.querySelector('.specimen-parts-head');
  const partsList = document.getElementById('parts-list');
  const gamePanel = document.getElementById('game-panel');

  if (copy) copy.hidden = isGame;
  if (partNote) partNote.hidden = isGame || !selectedPartId;
  if (partsHead) partsHead.hidden = isGame;
  if (partsList) partsList.hidden = isGame;
  if (gamePanel) gamePanel.hidden = !isGame;
}

function showGameExitModal() {
  const modal = document.getElementById('game-exit-modal');
  if (modal) modal.hidden = false;
}

function hideGameExitModal() {
  const modal = document.getElementById('game-exit-modal');
  if (modal) modal.hidden = true;
}

function handleGameStateChange(state) {
  const gamePanel = document.getElementById('game-panel');
  const btnGame = document.getElementById('btn-game');

  if (!state.isActive) {
    setGameSidebarVisible(false);
    if (btnGame) {
      btnGame.classList.remove('is-active');
      setText('btn-game-label', '🎮 Thử thách');
    }
    viewer?.setGameMode(false);
    viewer?.clearGameHighlight();
    syncPartList();
    if (gamePanel) gamePanel.innerHTML = '';
    return;
  }

  if (!gamePanel) return;

  switch (state.phase) {
    case 'question':
      renderGameQuestion(state);
      break;
    case 'feedback':
      renderGameFeedback(state);
      break;
    case 'finished':
      renderGameFinished(state);
      break;
    case 'review':
      renderGameReview(state);
      break;
  }
}

function renderGameQuestion(state) {
  const gamePanel = document.getElementById('game-panel');
  if (!gamePanel) return;

  viewer?.clearGameHighlight();

  const dotsHtml = Array.from({ length: state.total }, (_, i) => {
    let dotClass = 'game-progress-dot';
    if (i < state.results.length) {
      dotClass += state.results[i].isCorrect ? ' is-correct' : ' is-wrong';
    } else if (i === state.index) {
      dotClass += ' is-active';
    }
    return `<span class="${dotClass}" title="Câu ${i + 1}"></span>`;
  }).join('');

  gamePanel.innerHTML = `
    <div class="game-meta-bar">
      <span class="game-step-badge">Câu ${state.index + 1} / ${state.total}</span>
      <span class="game-score-badge">
        <span class="material-symbols-outlined text-[15px]">stars</span>
        <span>${state.score} điểm</span>
      </span>
    </div>

    <div class="game-progress-dots">
      ${dotsHtml}
    </div>

    <div class="game-card">
      <div class="game-prompt-header">🎯 Hãy tìm bộ phận:</div>
      <h3 class="game-target-title">${escapeHtml(state.question.name)}</h3>
      ${state.question.latin ? `<div class="game-target-latin">${escapeHtml(state.question.latin)}</div>` : ''}
      <div class="game-instruction">
        <span class="material-symbols-outlined text-[16px] text-[#db3237]">touch_app</span>
        <span>Click vào đúng vị trí của cơ quan này trên mô hình 3D.</span>
      </div>
    </div>

    <div class="game-actions">
      <button type="button" id="btn-game-quit" class="game-btn-quit">Thoát thử thách</button>
    </div>
  `;

  document.getElementById('btn-game-quit')?.addEventListener('click', () => {
    if (state.results.length > 0) {
      showGameExitModal();
    } else {
      exitGameMode();
    }
  });
}

function renderGameFeedback(state) {
  const gamePanel = document.getElementById('game-panel');
  if (!gamePanel) return;

  const result = state.results[state.results.length - 1];
  if (!result) return;

  viewer?.setGameHighlight({
    correctId: result.targetId,
    wrongId: result.isCorrect ? null : result.selectedId
  });
  viewer?.focusPart(result.targetId);

  const dotsHtml = Array.from({ length: state.total }, (_, i) => {
    let dotClass = 'game-progress-dot';
    if (i < state.results.length) {
      dotClass += state.results[i].isCorrect ? ' is-correct' : ' is-wrong';
    } else if (i === state.index) {
      dotClass += ' is-active';
    }
    return `<span class="${dotClass}" title="Câu ${i + 1}"></span>`;
  }).join('');

  const target = result.targetData || {};

  gamePanel.innerHTML = `
    <div class="game-meta-bar">
      <span class="game-step-badge">Câu ${state.index + 1} / ${state.total}</span>
      <span class="game-score-badge">
        <span class="material-symbols-outlined text-[15px]">stars</span>
        <span>${state.score} điểm</span>
      </span>
    </div>

    <div class="game-progress-dots">
      ${dotsHtml}
    </div>

    <div class="game-feedback ${result.isCorrect ? 'is-correct' : 'is-wrong'}">
      <div class="game-feedback-title">
        <span class="material-symbols-outlined text-[20px]">
          ${result.isCorrect ? 'check_circle' : 'cancel'}
        </span>
        <span>${result.isCorrect ? 'CHÍNH XÁC! (+100 điểm)' : 'CHƯA CHÍNH XÁC'}</span>
      </div>
      <div class="game-feedback-detail">
        ${
          result.isCorrect
            ? `Bạn đã tìm đúng <strong>${escapeHtml(result.targetName)}</strong>.`
            : `Bạn đã chọn: <span class="part-highlight wrong">${escapeHtml(result.selectedName)}</span><br>
               Đáp án đúng: <span class="part-highlight correct">${escapeHtml(result.targetName)}</span>`
        }
      </div>
    </div>

    <div class="game-edu-note">
      <dl class="m-0">
        ${target.latin ? `<dt>Tên khoa học / La-tinh</dt><dd class="italic">${escapeHtml(target.latin)}</dd>` : ''}
        ${target.function ? `<dt>Chức năng sinh học</dt><dd>${escapeHtml(target.function)}</dd>` : ''}
        ${target.description ? `<dt>Vị trí & Cấu tạo</dt><dd>${escapeHtml(target.description)}</dd>` : ''}
        ${target.learningNote ? `<dt>Ghi nhớ / Bệnh lý</dt><dd>${escapeHtml(target.learningNote)}</dd>` : ''}
      </dl>
    </div>

    <div class="game-actions">
      <button type="button" id="btn-game-next" class="game-btn-primary">
        <span>${state.index === state.total - 1 ? 'Xem kết quả' : 'Câu tiếp theo'}</span>
        <span class="material-symbols-outlined text-[18px]">
          ${state.index === state.total - 1 ? 'emoji_events' : 'arrow_forward'}
        </span>
      </button>
    </div>
  `;

  document.getElementById('btn-game-next')?.addEventListener('click', () => {
    gameInstance.nextQuestion();
  });
}

function renderGameFinished(state) {
  const gamePanel = document.getElementById('game-panel');
  if (!gamePanel) return;

  const summary = state.summary;
  viewer?.clearGameHighlight();

  const resultsListHtml = state.results.map((r, i) => `
    <div class="game-summary-item ${r.isCorrect ? 'is-correct' : 'is-wrong'}">
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-[18px] ${r.isCorrect ? 'text-emerald-600' : 'text-rose-600'}">
          ${r.isCorrect ? 'check_circle' : 'cancel'}
        </span>
        <span class="font-bold text-[#1b1c1c]">Câu ${i + 1}: ${escapeHtml(r.targetName)}</span>
      </div>
      <div class="text-[11px] ${r.isCorrect ? 'text-emerald-700 font-semibold' : 'text-rose-700'}">
        ${r.isCorrect ? '+100 đ' : `Chọn: ${escapeHtml(r.selectedName)}`}
      </div>
    </div>
  `).join('');

  gamePanel.innerHTML = `
    <div class="game-finish-card">
      <div class="game-finish-trophy">🏆</div>
      <h3 class="font-['Epilogue'] text-lg font-bold text-[#1b1c1c] m-0">HOÀN THÀNH THỬ THÁCH</h3>
      <p class="text-xs text-[#5b403e] mt-1 mb-2 font-['Be_Vietnam_Pro']">${escapeHtml(summary.modelTitle)}</p>

      <div class="game-finish-score">${summary.score} / ${summary.maxScore}</div>
      <div class="game-finish-pct">${summary.correctCount} / ${summary.total} chính xác (${summary.percentage}%)</div>

      <div class="game-finish-msg">
        <p class="m-0">${escapeHtml(summary.message)}</p>
      </div>

      <div class="game-summary-list">
        ${resultsListHtml}
      </div>

      <div class="game-actions">
        <button type="button" id="btn-game-review" class="game-btn-secondary">
          <span class="material-symbols-outlined text-[18px]">manage_search</span>
          <span>Xem lại đáp án</span>
        </button>
        <button type="button" id="btn-game-replay" class="game-btn-primary">
          <span class="material-symbols-outlined text-[18px]">replay</span>
          <span>Chơi lại</span>
        </button>
        <button type="button" id="btn-game-exit-to-learn" class="game-btn-secondary">
          <span class="material-symbols-outlined text-[18px]">menu_book</span>
          <span>Quay lại học</span>
        </button>
      </div>
    </div>
  `;

  document.getElementById('btn-game-review')?.addEventListener('click', () => {
    gameInstance.startReview(0);
  });

  document.getElementById('btn-game-replay')?.addEventListener('click', () => {
    gameInstance.start();
  });

  document.getElementById('btn-game-exit-to-learn')?.addEventListener('click', () => {
    exitGameMode();
  });
}

function renderGameReview(state) {
  const gamePanel = document.getElementById('game-panel');
  if (!gamePanel) return;

  const currentIdx = state.currentReviewIndex;
  const currentRecord = state.results[currentIdx];
  if (!currentRecord) return;

  const targetStructure = gameInstance?.allStructures?.find((s) => s.id === currentRecord.targetId) || currentRecord.targetData || {};
  const selectedStructure = gameInstance?.allStructures?.find((s) => s.id === currentRecord.selectedId);
  const targetId = targetStructure.id || currentRecord.targetId;
  const targetLabel = targetStructure.name || currentRecord.targetName;
  const selectedLabel = selectedStructure?.name || currentRecord.selectedName;

  viewer?.setGameHighlight({
    correctId: targetId
  });
  viewer?.focusPart(targetId);

  const target = targetStructure;

  const reviewBtnsHtml = state.results.map((r, i) => `
    <button type="button" class="game-review-btn ${i === currentIdx ? 'is-active' : ''}" data-review-idx="${i}">
      <span class="flex items-center gap-1.5">
        <span class="material-symbols-outlined text-[16px] ${r.isCorrect ? 'text-emerald-600' : 'text-rose-600'}">
          ${r.isCorrect ? 'check_circle' : 'cancel'}
        </span>
        <span>Câu ${i + 1}: ${escapeHtml(r.targetName)}</span>
      </span>
      <span class="text-xs ${r.isCorrect ? 'text-emerald-600 font-bold' : 'text-rose-600'}">
        ${r.isCorrect ? 'Đúng' : 'Sai'}
      </span>
    </button>
  `).join('');

  gamePanel.innerHTML = `
    <div class="flex items-center justify-between pb-2 border-b border-gray-200">
      <span class="font-['Space_Grotesk'] text-xs font-bold text-[#db3237] uppercase tracking-wider">
        🔍 Xem lại đáp án
      </span>
      <span class="text-xs text-gray-500 font-semibold font-['Space_Grotesk']">
        ${currentIdx + 1} / ${state.results.length}
      </span>
    </div>

    <div class="game-review-list">
      ${reviewBtnsHtml}
    </div>

    <div class="game-edu-note mt-2">
      <h4 class="font-['Epilogue'] text-sm font-bold text-[#1b1c1c] m-0 mb-1 flex items-center gap-1.5">
        <span class="material-symbols-outlined text-emerald-600 text-[18px]">verified</span>
        <span>${escapeHtml(targetLabel)}</span>
      </h4>
      ${!currentRecord.isCorrect ? `<p class="text-xs text-rose-700 m-0 mb-2">Bạn đã chọn nhầm: <strong>${escapeHtml(selectedLabel)}</strong></p>` : ''}
      <dl class="m-0">
        ${target.latin ? `<dt>Tên khoa học / La-tinh</dt><dd class="italic">${escapeHtml(target.latin)}</dd>` : ''}
        ${target.function ? `<dt>Chức năng sinh học</dt><dd>${escapeHtml(target.function)}</dd>` : ''}
        ${target.description ? `<dt>Vị trí & Cấu tạo</dt><dd>${escapeHtml(target.description)}</dd>` : ''}
        ${target.learningNote ? `<dt>Ghi nhớ / Bệnh lý</dt><dd>${escapeHtml(target.learningNote)}</dd>` : ''}
      </dl>
    </div>

    <div class="game-actions">
      <button type="button" id="btn-game-back-to-summary" class="game-btn-secondary">
        <span class="material-symbols-outlined text-[18px]">arrow_back</span>
        <span>Về bảng kết quả</span>
      </button>
      <button type="button" id="btn-game-review-exit" class="game-btn-primary">
        <span class="material-symbols-outlined text-[18px]">menu_book</span>
        <span>Quay lại học</span>
      </button>
    </div>
  `;

  gamePanel.querySelectorAll('[data-review-idx]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.reviewIdx, 10);
      gameInstance.setReviewIndex(idx);
    });
  });

  document.getElementById('btn-game-back-to-summary')?.addEventListener('click', () => {
    gameInstance.phase = 'finished';
    gameInstance._notify();
  });

  document.getElementById('btn-game-review-exit')?.addEventListener('click', () => {
    exitGameMode();
  });
}

