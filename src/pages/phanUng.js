/**
 * Molecular reaction studio: watch a keyframe animation or author one.
 */

import { setupNavbarAuth } from '../utils/authNavbar.js';
import { MoleculeScene } from '../features/reactionAnim/moleculeScene.js';
import { AnimationEngine } from '../features/reactionAnim/animationEngine.js';
import { REACTION_LESSONS, lessonToChemx, DEFAULT_REACTION } from '../features/reactionAnim/lessons.js';
import {
  cloneAtoms,
  cloneBonds,
  framesToChemx,
  downloadChemx,
  readChemxFile,
} from '../features/reactionAnim/chemx.js';
import {
  PALETTE_SYMBOLS,
  BOND_TYPES,
  ATOM_COLORS,
  atomName,
  atomColor,
} from '../features/reactionAnim/atomData.js';
import {
  turnWorkspace,
  stampControl,
  popIn,
  flashSaved,
  revealChips,
  pulseHint,
} from '../features/reactionAnim/uiMotion.js';
import { markModelExplored, updateLastLesson } from '../features/progress/progressService.js';

const MAX_FRAMES = 20;
const HINTS = {
  view: 'Kéo để xoay · Cuộn để phóng to · Bấm Phát để xem nguyên tử tái sắp xếp',
  select: 'Bấm một nguyên tử rồi kéo trên lưới để dời vị trí',
  addAtom: 'Bấm xuống lưới để đặt nguyên tử đang chọn',
  addBond: 'Bấm nguyên tử thứ nhất, rồi nguyên tử thứ hai để nối liên kết',
  breakBond: 'Bấm vào thanh liên kết để cắt',
  deleteAtom: 'Bấm nguyên tử để xóa (các liên kết đi kèm cũng mất)',
};

const state = {
  workspace: 'view',
  chemx: DEFAULT_REACTION,
  lessonId: REACTION_LESSONS[0].id,
  atoms: {},
  bonds: [],
  keyframes: [],
  currentFrame: 0,
  metadata: { name: '', description: '', created: Date.now() },
  editMode: 'select',
  selectedAtom: null,
  selectedAtomType: 'C',
  selectedBondType: 'covalent',
  history: [],
  playing: false,
  previewing: false,
};

let scene;
let engine;
let els = {};

function $(id) {
  return document.getElementById(id);
}

function init() {
  setupNavbarAuth();
  cacheEls();
  bindEvents();
  renderAll();

  try {
    scene = new MoleculeScene('canvas-container', {
      interactive: false,
      onPlaceAtom: handlePlaceAtom,
      onSelectAtom: handleSelectAtom,
      onMoveAtom: handleMoveAtom,
      onDeleteAtom: handleDeleteAtom,
      onAddBond: handleAddBond,
      onBreakBond: handleBreakBond,
      onClearSelection: () => {
        state.selectedAtom = null;
        renderPosDock();
      },
    });
    engine = new AnimationEngine();
    engine.onFrame = (atoms, bonds) => scene.setFrame(atoms, bonds);
    engine.onTime = syncTransport;
    engine.onPlayState = syncPlayButton;
    loadReaction(DEFAULT_REACTION, REACTION_LESSONS[0].id);
  } catch (err) {
    console.error(err);
    showToast('Không mở được khung nhìn 3D. Hãy dùng Chrome hoặc Edge có bật WebGL.');
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get('workspace') === 'edit') switchWorkspace('edit');

  try {
    markModelExplored('reaction');
    updateLastLesson('reaction', 10);
  } catch {
    /* progress is optional */
  }
}

function cacheEls() {
  els = {
    stage: $('rx-stage'),
    rail: $('rx-rail'),
    panel: $('rx-panel'),
    hint: $('rx-hint'),
    chips: $('rx-chips'),
    slider: $('rx-slider'),
    time: $('rx-time'),
    play: $('btn-play'),
    playIcon: $('btn-play-icon'),
    reset: $('btn-reset'),
    posdock: $('rx-posdock'),
    drop: $('rx-drop'),
    toast: $('rx-toast'),
    file: $('rx-file'),
    tabView: $('tab-view'),
    tabEdit: $('tab-edit'),
  };
}

function bindEvents() {
  els.tabView.addEventListener('click', () => switchWorkspace('view'));
  els.tabEdit.addEventListener('click', () => switchWorkspace('edit'));
  els.play.addEventListener('click', () => {
    if (!engine) return;
    if (state.workspace === 'edit') {
      if (state.previewing || engine.playing) {
        engine.pause();
        endPreview();
      } else {
        previewEditor();
      }
    } else {
      engine.toggle();
    }
    stampControl(els.play);
  });
  els.reset.addEventListener('click', () => {
    if (!engine) return;
    engine.reset();
    if (state.workspace === 'edit') endPreview();
    stampControl(els.reset);
  });
  els.slider.addEventListener('input', () => {
    engine?.seek(Number(els.slider.value));
  });
  els.file.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) await openFile(file);
  });

  const stage = els.stage;
  stage.addEventListener('dragenter', (e) => {
    e.preventDefault();
    els.drop.classList.add('is-on');
  });
  stage.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  stage.addEventListener('dragleave', (e) => {
    if (!stage.contains(e.relatedTarget)) els.drop.classList.remove('is-on');
  });
  stage.addEventListener('drop', async (e) => {
    e.preventDefault();
    els.drop.classList.remove('is-on');
    const file = e.dataTransfer?.files?.[0];
    if (file) await openFile(file);
  });

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      undo();
    }
    if (e.code === 'Space' && e.target === document.body) {
      e.preventDefault();
      els.play.click();
    }
  });
}

function switchWorkspace(next) {
  if (next === state.workspace) return;
  const toEdit = next === 'edit';
  state.workspace = next;
  engine.pause();

  els.tabView.classList.toggle('is-on', !toEdit);
  els.tabEdit.classList.toggle('is-on', toEdit);
  els.tabView.setAttribute('aria-selected', String(!toEdit));
  els.tabEdit.setAttribute('aria-selected', String(toEdit));

  if (toEdit) {
    if (!state.keyframes.length) loadLessonIntoEditor(REACTION_LESSONS[0]);
    else applyEditorFrame(state.currentFrame);
    scene?.setInteractive(true);
    scene?.setEditMode(state.editMode);
  } else {
    scene?.setInteractive(false);
    if (state.keyframes.length) {
      try {
        loadReaction(framesToChemx(state.metadata, state.keyframes), state.lessonId);
      } catch {
        loadReaction(state.chemx, state.lessonId);
      }
    } else {
      loadReaction(state.chemx, state.lessonId);
    }
  }

  renderAll();
  turnWorkspace(els.stage, { toEdit });
}

function loadReaction(chemx, lessonId = null) {
  if (!engine || !scene) return;
  engine.pause();
  state.chemx = chemx;
  state.lessonId = lessonId;
  engine.load(chemx);
  scene.setFrame(chemx.keyframes[0].atoms, chemx.keyframes[0].bonds);
  syncTransport(0);
  renderChips();
  if (state.workspace === 'view') renderAll();
}

function loadLessonIntoEditor(lesson) {
  state.lessonId = lesson.id;
  state.metadata = {
    name: lesson.name,
    description: lesson.description,
    created: Date.now(),
  };
  state.keyframes = lesson.frames.map((frame) => ({
    atoms: cloneAtoms(frame.atoms),
    bonds: cloneBonds(frame.bonds),
  }));
  state.currentFrame = 0;
  state.history = [];
  state.selectedAtom = null;
  applyEditorFrame(0);
}

function applyEditorFrame(index) {
  const frame = state.keyframes[index];
  if (!frame) {
    state.atoms = {};
    state.bonds = [];
    state.currentFrame = index;
    scene?.setFrame(state.atoms, state.bonds);
    return;
  }
  state.currentFrame = index;
  state.atoms = cloneAtoms(frame.atoms);
  state.bonds = cloneBonds(frame.bonds);
  scene?.setFrame(state.atoms, state.bonds);
  scene?.setSelected(state.selectedAtom);
}

function previewEditor() {
  if (!state.keyframes.length) {
    showToast('Hãy lưu ít nhất một keyframe trước khi phát.');
    return;
  }
  try {
    const chemx = framesToChemx(state.metadata, state.keyframes);
    scene?.setInteractive(false);
    state.previewing = true;
    loadReaction(chemx, state.lessonId);
    engine.play();
  } catch (err) {
    showToast(err.message);
  }
}

function endPreview() {
  if (!state.previewing && state.workspace !== 'edit') return;
  state.previewing = false;
  scene?.setInteractive(true);
  scene?.setEditMode(state.editMode);
  applyEditorFrame(state.currentFrame);
  renderChips();
}

async function openFile(file) {
  try {
    const data = await readChemxFile(file);
    if (state.workspace === 'edit') {
      state.metadata = { ...data.metadata };
      state.keyframes = data.keyframes.map((kf) => ({
        atoms: cloneAtoms(kf.atoms),
        bonds: cloneBonds(kf.bonds),
      }));
      state.currentFrame = 0;
      state.lessonId = null;
      applyEditorFrame(0);
      renderAll();
    } else {
      loadReaction(data, null);
    }
  } catch (err) {
    showToast(err.message);
  }
}

function handlePlaceAtom(position) {
  pushHistory();
  const id = `atom_${Date.now()}`;
  state.atoms[id] = {
    id,
    symbol: state.selectedAtomType,
    position: { x: position.x, y: position.y, z: position.z },
    charge: 0,
  };
  scene.setFrame(state.atoms, state.bonds);
}

function handleSelectAtom(id) {
  state.selectedAtom = id;
  scene.setSelected(id);
  renderPosDock();
}

function handleMoveAtom(id, position, options = {}) {
  if (!state.atoms[id]) return;
  if (!options.skipHistory) pushHistory();
  state.atoms[id] = {
    ...state.atoms[id],
    position: { ...position },
  };
  if (options.skipHistory) return;
  scene.setFrame(state.atoms, state.bonds);
  renderPosDock();
}

function handleDeleteAtom(id) {
  pushHistory();
  delete state.atoms[id];
  state.bonds = state.bonds.filter((b) => !b.atomIds.includes(id));
  if (state.selectedAtom === id) state.selectedAtom = null;
  scene.setFrame(state.atoms, state.bonds);
  renderPosDock();
}

function handleAddBond(a, b) {
  if (a === b) return;
  const exists = state.bonds.some((bond) => (
    (bond.atomIds[0] === a && bond.atomIds[1] === b)
    || (bond.atomIds[0] === b && bond.atomIds[1] === a)
  ));
  if (exists) return;
  pushHistory();
  state.bonds.push({
    id: `bond_${Date.now()}`,
    atomIds: [a, b],
    order: 1,
    strength: 1,
    bondType: state.selectedBondType,
  });
  scene.setFrame(state.atoms, state.bonds);
}

function handleBreakBond(id) {
  pushHistory();
  state.bonds = state.bonds.filter((bond) => bond.id !== id);
  scene.setFrame(state.atoms, state.bonds);
}

function pushHistory() {
  state.history.push({
    atoms: cloneAtoms(state.atoms),
    bonds: cloneBonds(state.bonds),
  });
  if (state.history.length > 40) state.history.shift();
}

function undo() {
  if (!state.history.length || state.workspace !== 'edit') return;
  const prev = state.history.pop();
  state.atoms = prev.atoms;
  state.bonds = prev.bonds;
  scene.setFrame(state.atoms, state.bonds);
  renderRail();
}

function saveKeyframe() {
  if (!Object.keys(state.atoms).length && !state.bonds.length) {
    showToast('Hãy đặt nguyên tử hoặc liên kết trước khi lưu khung.');
    return;
  }
  const frame = {
    atoms: cloneAtoms(state.atoms),
    bonds: cloneBonds(state.bonds),
  };
  if (state.currentFrame >= state.keyframes.length) {
    if (state.keyframes.length >= MAX_FRAMES) {
      showToast('Tối đa 20 keyframe.');
      return;
    }
    state.keyframes.push(frame);
    state.currentFrame = state.keyframes.length - 1;
  } else {
    state.keyframes[state.currentFrame] = frame;
  }
  renderPanel();
  renderChips();
  flashSaved(els.panel);
}

function createKeyframe() {
  if (!Object.keys(state.atoms).length && !state.bonds.length) {
    showToast('Hãy đặt nguyên tử trước khi tạo khung mới.');
    return;
  }
  if (state.keyframes.length >= MAX_FRAMES) {
    showToast('Tối đa 20 keyframe.');
    return;
  }
  const frame = {
    atoms: cloneAtoms(state.atoms),
    bonds: cloneBonds(state.bonds),
  };
  if (state.currentFrame < state.keyframes.length) {
    state.keyframes[state.currentFrame] = frame;
  }
  state.keyframes.push({
    atoms: cloneAtoms(state.atoms),
    bonds: cloneBonds(state.bonds),
  });
  state.currentFrame = state.keyframes.length - 1;
  renderPanel();
  renderChips();
}

function exportEditor() {
  try {
    if (!state.keyframes.length) saveKeyframe();
    const chemx = framesToChemx(state.metadata, state.keyframes);
    const name = (state.metadata.name || 'phan-ung').replace(/\s+/g, '-');
    downloadChemx(chemx, `${name}.chemx`);
  } catch (err) {
    showToast(err.message);
  }
}

function setEditMode(mode) {
  state.editMode = mode;
  if (mode !== 'select') state.selectedAtom = null;
  scene.setEditMode(mode);
  renderRail();
  renderHint();
  renderPosDock();
  stampControl(els.rail.querySelector(`[data-mode="${mode}"]`));
}

function syncTransport(timeMs) {
  const duration = engine.getDuration();
  els.slider.max = String(duration || 0);
  els.slider.value = String(Math.min(timeMs, duration));
  els.time.textContent = `${(timeMs / 1000).toFixed(1)}s / ${(duration / 1000).toFixed(1)}s`;
  highlightChip(timeMs);
}

function syncPlayButton(playing) {
  state.playing = playing;
  els.play.setAttribute('aria-pressed', String(playing));
  els.playIcon.textContent = playing ? 'pause' : 'play_arrow';
}

function highlightChip(timeMs) {
  const frames = state.workspace === 'view'
    ? (state.chemx?.keyframes || [])
    : state.keyframes.map((_, i) => ({ timestamp: i * 2000 }));
  [...els.chips.children].forEach((btn, i) => {
    const ts = frames[i]?.timestamp ?? i * 2000;
    btn.classList.toggle('is-on', Math.abs(timeMs - ts) < 80);
  });
}

function renderAll() {
  renderRail();
  renderPanel();
  renderHint();
  renderChips();
  renderPosDock();
}

function renderHint() {
  const text = state.workspace === 'view' ? HINTS.view : (HINTS[state.editMode] || HINTS.select);
  if (els.hint.textContent !== text) {
    els.hint.textContent = text;
    pulseHint(els.hint);
  }
}

function renderChips() {
  const frames = state.workspace === 'view' ? (state.chemx?.keyframes || []) : state.keyframes;
  els.chips.innerHTML = frames.map((_, i) => (
    `<button type="button" class="rx-chip" data-kf="${i}">Khung ${i + 1}</button>`
  )).join('');
  els.chips.querySelectorAll('.rx-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.kf);
      if (state.workspace === 'view') {
        engine.seek(state.chemx.keyframes[i].timestamp);
      } else {
        engine.pause();
        scene.setInteractive(true);
        applyEditorFrame(i);
        renderPanel();
        renderPosDock();
      }
    });
  });
  revealChips(els.chips);
}

function renderRail() {
  if (state.workspace === 'view') {
    els.rail.innerHTML = `
      <h1 class="rx-title">Bài phản ứng</h1>
      <p class="rx-copy">Chọn một phản ứng mẫu, rồi bấm Phát. Có thể mở file .chemx của bạn.</p>
      <div class="rx-lessons">
        ${REACTION_LESSONS.map((lesson) => `
          <button type="button" class="rx-lesson${lesson.id === state.lessonId ? ' is-on' : ''}" data-lesson="${lesson.id}">
            <strong>${lesson.title}</strong>
            <small>${lesson.subtitle} · ${lesson.grade}</small>
          </button>
        `).join('')}
      </div>
      <div class="rx-btn-row">
        <button type="button" class="rx-btn rx-btn-ghost" id="btn-open">Mở file</button>
        <button type="button" class="rx-btn rx-btn-accent" id="btn-export-view">Xuất .chemx</button>
      </div>
    `;
    els.rail.querySelectorAll('[data-lesson]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const lesson = REACTION_LESSONS.find((item) => item.id === btn.dataset.lesson);
        if (lesson) loadReaction(lessonToChemx(lesson), lesson.id);
      });
    });
    $('btn-open')?.addEventListener('click', () => els.file.click());
    $('btn-export-view')?.addEventListener('click', () => {
      const name = (state.chemx.metadata.name || 'phan-ung').replace(/\s+/g, '-');
      downloadChemx(state.chemx, `${name}.chemx`);
    });
    return;
  }

  const tools = [
    ['select', 'Chọn / kéo', 'Dời nguyên tử'],
    ['addAtom', 'Đặt nguyên tử', 'Bấm xuống lưới'],
    ['addBond', 'Nối liên kết', 'Hai nguyên tử'],
    ['breakBond', 'Cắt liên kết', 'Bấm thanh nối', true],
    ['deleteAtom', 'Xóa nguyên tử', 'Bấm quả cầu', true],
  ];

  els.rail.innerHTML = `
    <h1 class="rx-title">Bàn dựng khung</h1>
    <p class="rx-copy">Lưu từng khoảnh khắc của phản ứng, rồi phát thành hoạt ảnh.</p>
    <div class="rx-tools">
      ${tools.map(([id, label, hint, danger]) => `
        <button type="button" class="rx-tool${state.editMode === id ? ' is-on' : ''}${danger ? ' is-danger' : ''}" data-mode="${id}">
          ${label}<span>${hint}</span>
        </button>
      `).join('')}
    </div>
    <div class="rx-section-label">Nguyên tử</div>
    <div class="rx-palette">
      ${PALETTE_SYMBOLS.map((symbol) => `
        <button type="button" class="rx-swatch${state.selectedAtomType === symbol ? ' is-on' : ''}" data-symbol="${symbol}" style="background:${ATOM_COLORS[symbol]}" title="${symbol} · ${atomName(symbol)}"></button>
      `).join('')}
    </div>
    ${state.editMode === 'addBond' ? `
      <label class="rx-section-label" for="bond-type">Kiểu liên kết</label>
      <select id="bond-type" class="rx-select">
        ${Object.values(BOND_TYPES).map((type) => `
          <option value="${type.id}" ${type.id === state.selectedBondType ? 'selected' : ''}>${type.name}</option>
        `).join('')}
      </select>
    ` : ''}
    <button type="button" class="rx-btn rx-btn-ghost" id="btn-undo" ${state.history.length ? '' : 'disabled'}>Hoàn tác (Ctrl+Z)</button>
  `;

  els.rail.querySelectorAll('[data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => setEditMode(btn.dataset.mode));
  });
  els.rail.querySelectorAll('[data-symbol]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.selectedAtomType = btn.dataset.symbol;
      if (state.editMode !== 'addAtom') setEditMode('addAtom');
      else renderRail();
    });
  });
  $('bond-type')?.addEventListener('change', (e) => {
    state.selectedBondType = e.target.value;
  });
  $('btn-undo')?.addEventListener('click', undo);
}

function renderPanel() {
  if (state.workspace === 'view') {
    const meta = state.chemx?.metadata || {};
    els.panel.innerHTML = `
      <h2 class="rx-title">${meta.name || 'Phản ứng'}</h2>
      <p class="rx-copy">${meta.description || 'Theo dõi nguyên tử di chuyển giữa các khung.'}</p>
      <div class="rx-section-label">Nguyên tử</div>
      <div class="rx-legend">
        ${['H', 'C', 'N', 'O', 'Cl', 'S'].map((symbol) => `
          <div class="rx-legend-row">
            <span class="rx-atom-swatch" style="background:${atomColor(symbol)}"></span>
            <span><strong>${symbol}</strong> · ${atomName(symbol)}</span>
          </div>
        `).join('')}
      </div>
      <div class="rx-section-label">Liên kết</div>
      <div class="rx-legend">
        ${Object.values(BOND_TYPES).map((type) => `
          <div class="rx-legend-row">
            <span class="rx-bond-swatch" style="background:${type.color}; border-style:${type.dashed ? 'dashed' : 'solid'}"></span>
            <span><strong>${type.name}</strong><br>${type.hint}</span>
          </div>
        `).join('')}
      </div>
    `;
    return;
  }

  els.panel.innerHTML = `
    <label class="rx-section-label" for="rx-name">Tên phản ứng</label>
    <input id="rx-name" class="rx-input" value="${escapeAttr(state.metadata.name)}" placeholder="Ví dụ: H2 + Cl2">
    <label class="rx-section-label" for="rx-desc">Mô tả</label>
    <input id="rx-desc" class="rx-input" value="${escapeAttr(state.metadata.description)}" placeholder="Học sinh thấy gì khi phát?">
    <div class="rx-section-label">Keyframe ${state.currentFrame + 1} / ${MAX_FRAMES}</div>
    <div class="rx-frames" id="rx-frames">
      ${state.keyframes.length ? state.keyframes.map((frame, i) => `
        <button type="button" class="rx-frame${i === state.currentFrame ? ' is-on' : ''}" data-frame="${i}">
          <strong>Khung ${i + 1}</strong>
          <small>${Object.keys(frame.atoms).length} nguyên tử · ${frame.bonds.length} liên kết</small>
        </button>
      `).join('') : '<div class="rx-empty">Chưa có khung. Đặt phân tử rồi bấm Lưu khung này.</div>'}
    </div>
    <div class="rx-btn-row">
      <button type="button" class="rx-btn rx-btn-accent" id="btn-save-kf">Lưu khung này</button>
      <button type="button" class="rx-btn rx-btn-ghost" id="btn-new-kf">Thêm khung mới</button>
    </div>
    <div class="rx-section-label">Bài mẫu</div>
    <div class="rx-lessons">
      ${REACTION_LESSONS.map((lesson) => `
        <button type="button" class="rx-lesson${lesson.id === state.lessonId ? ' is-on' : ''}" data-lesson="${lesson.id}">
          <strong>${lesson.title}</strong>
          <small>Nạp 3 khung sẵn</small>
        </button>
      `).join('')}
    </div>
    <button type="button" class="rx-btn rx-btn-primary" id="btn-export">Xuất .chemx để phát</button>
  `;

  $('rx-name')?.addEventListener('input', (e) => {
    state.metadata.name = e.target.value;
  });
  $('rx-desc')?.addEventListener('input', (e) => {
    state.metadata.description = e.target.value;
  });
  els.panel.querySelectorAll('[data-frame]').forEach((btn) => {
    btn.addEventListener('click', () => {
      applyEditorFrame(Number(btn.dataset.frame));
      renderPanel();
      renderChips();
    });
  });
  els.panel.querySelectorAll('[data-lesson]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const lesson = REACTION_LESSONS.find((item) => item.id === btn.dataset.lesson);
      if (lesson) {
        loadLessonIntoEditor(lesson);
        renderAll();
        popIn(els.panel);
      }
    });
  });
  $('btn-save-kf')?.addEventListener('click', saveKeyframe);
  $('btn-new-kf')?.addEventListener('click', createKeyframe);
  $('btn-export')?.addEventListener('click', exportEditor);
}

function renderPosDock() {
  const atom = state.workspace === 'edit' && state.editMode === 'select'
    ? state.atoms[state.selectedAtom]
    : null;
  if (!atom) {
    els.posdock.hidden = true;
    els.posdock.innerHTML = '';
    return;
  }
  els.posdock.hidden = false;
  const p = atom.position;
  els.posdock.innerHTML = `
    <strong style="font-family:'Space Grotesk',sans-serif">${atom.symbol} · ${atomName(atom.symbol)}</strong>
    ${['x', 'y', 'z'].map((axis) => `
      <div class="rx-axis rx-axis-${axis}">
        <b>${axis.toUpperCase()}</b>
        <button type="button" class="rx-btn rx-btn-ghost" data-axis="${axis}" data-delta="-0.5">−</button>
        <input class="rx-input" data-axis-input="${axis}" type="number" step="0.1" value="${Number(p[axis]).toFixed(2)}">
        <button type="button" class="rx-btn rx-btn-ghost" data-axis="${axis}" data-delta="0.5">+</button>
      </div>
    `).join('')}
  `;
  els.posdock.querySelectorAll('[data-axis]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const axis = btn.dataset.axis;
      const next = { ...atom.position, [axis]: atom.position[axis] + Number(btn.dataset.delta) };
      handleMoveAtom(atom.id, next, { skipHistory: false });
      renderPosDock();
    });
  });
  els.posdock.querySelectorAll('[data-axis-input]').forEach((input) => {
    input.addEventListener('change', () => {
      const axis = input.dataset.axisInput;
      const next = { ...atom.position, [axis]: Number(input.value) || 0 };
      handleMoveAtom(atom.id, next, { skipHistory: false });
    });
  });
}

function showToast(message) {
  els.toast.hidden = false;
  els.toast.textContent = message;
  popIn(els.toast);
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    els.toast.hidden = true;
  }, 3200);
}

function escapeAttr(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;');
}

document.addEventListener('DOMContentLoaded', init);
