/**
 * Molecular reaction studio: watch a keyframe animation or author one.
 * First-time students get a step-by-step coach on samples.
 * Self-authored equations live in a private notebook, not the public lesson list.
 */

import { setupNavbarAuth } from '../utils/authNavbar.js';
import { MoleculeScene } from '../features/reactionAnim/moleculeScene.js';
import { AnimationEngine } from '../features/reactionAnim/animationEngine.js';
import { REACTION_LESSONS, lessonToChemx } from '../features/reactionAnim/lessons.js';
import {
  cloneAtoms,
  cloneBonds,
  framesToChemx,
  downloadChemx,
  readChemxFile,
} from '../features/reactionAnim/chemx.js';
import {
  PALETTE_COMMON,
  PERIODIC_LAYOUT,
  BOND_TYPES,
  atomName,
  atomColor,
  normalizeSymbol,
  findTextbookAtoms,
  isTextbookAtom,
} from '../features/reactionAnim/atomData.js';
import {
  turnWorkspace,
  stampControl,
  popIn,
  flashSaved,
  revealChips,
  pulseHint,
  enterGuide,
  hopMascot,
  pulseTarget,
  celebrate,
  clearCelebrate,
  killCoachMotion,
  stopPlayPulse,
  revealAccordion,
  enterHowTo,
  openSheet,
  closeSheet,
  filterPeriodicCells,
  showDropOverlay,
  hideDropOverlay,
  enterFlow,
} from '../features/reactionAnim/uiMotion.js';
import { markModelExplored, updateLastLesson } from '../features/progress/progressService.js';
import {
  EDIT_PATH,
  getSteps,
  getCoachStep,
  toolAllowed,
  shouldShowGate,
  shouldShowHowTo,
  rememberSkipGuide,
  rememberGuideComplete,
  rememberHideHowTo,
  isGuidedPath,
  EQUATION_CHIPS,
  MASCOT_SVG,
  STATE_FLOW,
  stateLabel,
} from '../features/reactionAnim/coach.js';
import {
  listMyReactions,
  saveMyReaction,
  deleteMyReaction,
  getMyReaction,
  isNotebookLoggedIn,
  personalLessonId,
  parsePersonalLessonId,
} from '../features/reactionAnim/notebook.js';

const MAX_FRAMES = 20;
const HINTS = {
  view: 'Kéo để xoay · Bấm Trạng thái 1–3 để xem từng lần lưu · Hoặc thả file .chemx',
  viewEmpty: 'Chọn bài bên trái, hoặc kéo thả file .chemx vào trang này để phát.',
  select: 'Bấm một nguyên tử rồi kéo trên lưới để dời vị trí',
  addAtom: 'Bấm xuống lưới để đặt nguyên tử đang chọn',
  addBond: 'Bấm nguyên tử thứ nhất, rồi nguyên tử thứ hai để nối liên kết',
  breakBond: 'Bấm vào thanh liên kết để cắt',
  deleteAtom: 'Bấm nguyên tử để xóa (các liên kết đi kèm cũng mất)',
  gate: 'Chọn một tấm: tập theo mẫu, hoặc tự viết phương trình',
};

const TOOLS = [
  ['select', 'Chọn / kéo', 'Dời nguyên tử'],
  ['addAtom', 'Đặt nguyên tử', 'Bấm xuống lưới'],
  ['addBond', 'Nối liên kết', 'Hai nguyên tử'],
  ['breakBond', 'Cắt liên kết', 'Bấm thanh nối', true],
  ['deleteAtom', 'Xóa nguyên tử', 'Bấm quả cầu', true],
];

const state = {
  workspace: 'view',
  chemx: null,
  lessonId: null,
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
  editPath: null,
  coachStep: 0,
  notebookId: null,
  didDrag: false,
  didPlay: false,
  paletteOpen: false,
  extraSymbols: [],
  sampleFrames: [],
  panelOpen: { meta: false, frames: true, library: false },
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
    loadReaction(null, null);
  } catch (err) {
    console.error(err);
    showToast('Không mở được khung nhìn 3D. Hãy dùng Chrome hoặc Edge có bật WebGL.');
  }

  const params = new URLSearchParams(window.location.search);
  const path = params.get('path');
  if (params.get('workspace') === 'edit') {
    if (path === 'sample') startSamplePath();
    else if (path === 'create') startCreatePath();
    else if (path === 'free') enterFreeEditor({ skipPref: true });
    else switchWorkspace('edit');
  }

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
    coach: $('rx-coach'),
    guide: $('rx-guide'),
    gateLayer: $('rx-gate-layer'),
    canvasEmpty: $('rx-canvas-empty'),
    celebrate: $('rx-celebrate'),
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
    howto: $('rx-howto'),
    table: $('rx-table'),
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
        markTask('play');
      }
    } else if (!hasLoadedReaction()) {
      showToast('Chọn một bài phản ứng bên trái trước khi phát.');
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

  bindChemxDrop();

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      undo();
    }
    if (e.code === 'Space' && e.target === document.body) {
      e.preventDefault();
      els.play.click();
    }
    if (e.key === 'Escape' && els.table && !els.table.hidden) {
      closePeriodicTable();
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
    if (!state.editPath) {
      state.editPath = shouldShowGate() ? EDIT_PATH.GATE : EDIT_PATH.FREE;
    }
    if (state.editPath === EDIT_PATH.GATE) {
      scene?.setInteractive(false);
    } else if (state.editPath === EDIT_PATH.FREE) {
      if (!state.keyframes.length) startBlankEditor();
      else applyEditorFrame(state.currentFrame);
      scene?.setInteractive(true);
      scene?.setEditMode(state.editMode);
    } else {
      applyCoachScene();
    }
  } else {
    scene?.setInteractive(false);
    if (state.keyframes.length) {
      try {
        loadReaction(framesToChemx(state.metadata, state.keyframes), state.lessonId);
      } catch {
        loadReaction(state.chemx, state.lessonId);
      }
    } else if (hasLoadedReaction()) {
      loadReaction(state.chemx, state.lessonId);
    } else {
      loadReaction(null, null);
    }
  }

  renderAll();
  turnWorkspace(els.stage, { toEdit });
}

function startSamplePath() {
  state.editPath = EDIT_PATH.SAMPLE;
  state.coachStep = 0;
  state.notebookId = null;
  state.didDrag = false;
  state.didPlay = false;
  scene?.setInteractive(false);
  scene?.setFrame({}, []);
  if (state.workspace !== 'edit') {
    switchWorkspace('edit');
    return;
  }
  engine.pause();
  renderAll();
}

function startCreatePath() {
  state.editPath = EDIT_PATH.CREATE;
  state.coachStep = 0;
  state.notebookId = null;
  state.didDrag = false;
  state.didPlay = false;
  state.lessonId = null;
  state.metadata = { name: '', description: '', created: Date.now() };
  state.keyframes = [];
  state.atoms = {};
  state.bonds = [];
  state.currentFrame = 0;
  state.history = [];
  state.selectedAtom = null;
  scene?.setFrame({}, []);
  scene?.setInteractive(false);
  if (state.workspace !== 'edit') switchWorkspace('edit');
  else {
    engine.pause();
    renderAll();
  }
}

function startBlankEditor() {
  state.lessonId = null;
  state.notebookId = null;
  state.metadata = { name: '', description: '', created: Date.now() };
  state.keyframes = [];
  state.atoms = {};
  state.bonds = [];
  state.currentFrame = 0;
  state.history = [];
  state.selectedAtom = null;
  state.sampleFrames = [];
  scene?.setFrame({}, []);
}

function momentLabel(index) {
  return stateLabel(index);
}

function enterFreeEditor({ skipPref = false, keepFrames = false } = {}) {
  if (skipPref) rememberSkipGuide();
  killCoachMotion();
  scene?.clearAtomHint?.();
  state.editPath = EDIT_PATH.FREE;
  if (!keepFrames && !state.keyframes.length) {
    startBlankEditor();
  } else if (state.keyframes.length) {
    applyEditorFrame(state.currentFrame);
  }
  scene?.setInteractive(true);
  scene?.setEditMode(state.editMode);
  if (state.workspace !== 'edit') switchWorkspace('edit');
  else {
    engine.pause();
    renderAll();
  }
}

function currentLesson() {
  return REACTION_LESSONS.find((item) => item.id === state.lessonId) || null;
}

function currentWait() {
  return getCoachStep(state.editPath, state.coachStep)?.waitFor || null;
}

function applyCoachScene() {
  killCoachMotion();
  scene?.clearAtomHint?.();
  const step = getCoachStep(state.editPath, state.coachStep);
  if (!step) {
    scene?.setInteractive(state.workspace === 'edit' && state.editPath === EDIT_PATH.FREE);
    return;
  }
  if (typeof step.frame === 'number' && state.keyframes[step.frame]) {
    applyEditorFrame(step.frame);
  }
  if (typeof step.sampleFrame === 'number' && state.sampleFrames.length) {
    const src = state.sampleFrames[Math.min(step.sampleFrame, state.sampleFrames.length - 1)];
    if (src) {
      state.atoms = cloneAtoms(src.atoms);
      state.bonds = cloneBonds(src.bonds);
      scene?.setFrame(state.atoms, state.bonds);
    }
  }
  if (step.tidyPose) tidyProductPose();
  const canEdit = Array.isArray(step.tools) && step.tools.length > 0;
  scene?.setInteractive(canEdit);
  if (canEdit) {
    if (step.pickTool && !step.tools.includes(state.editMode)) {
      state.editMode = 'select';
    } else {
      const nextMode = toolAllowed(state.editPath, state.coachStep, state.editMode)
        ? state.editMode
        : step.tools[0];
      state.editMode = nextMode;
    }
    scene?.setEditMode(state.editMode);
  }
  if (step.pulseAtom) {
    requestAnimationFrame(() => scene?.pulseAtomHint(scene.firstAtomId()));
  }
}

function canAdvanceCoach() {
  const step = getCoachStep(state.editPath, state.coachStep);
  if (!step) return false;
  if (step.waitFor === 'pick') return false;
  if (step.waitFor === 'name') return Boolean(state.metadata.name.trim());
  if (step.waitFor === 'place') return Object.keys(state.atoms).length > 0;
  if (step.waitFor === 'bond') return state.bonds.length > 0;
  if (step.waitFor === 'snap') return state.keyframes.length >= 1;
  if (step.waitFor === 'snap2') return state.keyframes.length >= 2;
  if (step.waitFor === 'snap3') return state.keyframes.length >= 3;
  if (step.waitFor === 'drag') return state.didDrag;
  if (step.waitFor === 'play') return state.didPlay;
  if (step.waitFor === 'cutOld') return reactantBondsGone();
  if (step.waitFor === 'joinNew') return productBondsReady();
  return true;
}

function markTask(kind) {
  const wait = currentWait();
  if (wait !== kind) return;
  if (kind === 'drag') state.didDrag = true;
  if (kind === 'play') state.didPlay = true;
  clearCelebrate(els.celebrate);
  hopMascot(els.guide?.querySelector('.rx-guide-mascot'));
  if (kind === 'play') {
    stopPlayPulse(els.play);
    renderGuide();
    return;
  }
  if (kind === 'drag') {
    window.setTimeout(() => {
      if (currentWait() === kind) coachNext();
    }, 420);
    return;
  }
  renderGuide();
}

function symbolPair(bond, atoms = state.atoms) {
  const a = atoms[bond.atomIds[0]]?.symbol || '';
  const b = atoms[bond.atomIds[1]]?.symbol || '';
  return [a, b].sort().join('-');
}

function pairCounts(bonds, atoms) {
  const map = {};
  (bonds || []).forEach((bond) => {
    const key = symbolPair(bond, atoms);
    map[key] = (map[key] || 0) + 1;
  });
  return map;
}

function reactantBondsGone() {
  const src = state.sampleFrames[0];
  if (!src) return state.bonds.length === 0;
  const old = pairCounts(src.bonds, src.atoms);
  const now = pairCounts(state.bonds, state.atoms);
  return Object.keys(old).every((key) => !now[key]);
}

function productBondsReady() {
  const src = state.sampleFrames[state.sampleFrames.length - 1];
  if (!src) return false;
  const need = pairCounts(src.bonds, src.atoms);
  const now = pairCounts(state.bonds, state.atoms);
  if (!Object.entries(need).every(([key, count]) => (now[key] || 0) >= count)) return false;
  return degreesMatch(src);
}

function neighborsOf(id, bonds = state.bonds) {
  return bonds
    .filter((bond) => bond.atomIds.includes(id))
    .map((bond) => (bond.atomIds[0] === id ? bond.atomIds[1] : bond.atomIds[0]));
}

function degreesMatch(src) {
  const want = {};
  Object.values(src.atoms).forEach((atom) => {
    const deg = neighborsOf(atom.id, src.bonds).length;
    if (!want[atom.symbol]) want[atom.symbol] = [];
    want[atom.symbol].push(deg);
  });
  const got = {};
  Object.values(state.atoms).forEach((atom) => {
    const deg = neighborsOf(atom.id).length;
    if (!got[atom.symbol]) got[atom.symbol] = [];
    got[atom.symbol].push(deg);
  });
  return Object.keys(want).every((symbol) => {
    const a = (want[symbol] || []).slice().sort((x, y) => x - y);
    const b = (got[symbol] || []).slice().sort((x, y) => x - y);
    return a.length === b.length && a.every((deg, i) => deg === b[i]);
  });
}

function tidyProductPose() {
  const src = state.sampleFrames[state.sampleFrames.length - 1];
  if (!src) return;
  Object.entries(src.atoms).forEach(([id, atom]) => {
    if (!state.atoms[id]) return;
    state.atoms[id] = { ...state.atoms[id], position: { ...atom.position } };
  });
  if (typeof scene?.animateAtomsTo === 'function') scene.animateAtomsTo(state.atoms);
  else scene?.setFrame(state.atoms, state.bonds);
}

function afterBondEdit() {
  const wait = currentWait();
  if (wait !== 'cutOld' && wait !== 'joinNew') return;
  hopMascot(els.guide?.querySelector('.rx-guide-mascot'));
  renderGuide();
  if (!canAdvanceCoach()) return;
  if (wait === 'joinNew') tidyProductPose();
  window.setTimeout(() => {
    if (currentWait() === wait && canAdvanceCoach()) coachNext();
  }, wait === 'joinNew' ? 720 : 420);
}

function checklistDone(items, index, mode) {
  const key = items[index]?.pair;
  if (!key) return false;
  const same = items.slice(0, index + 1).filter((item) => item.pair === key).length;
  const now = pairCounts(state.bonds, state.atoms)[key] || 0;
  if (mode === 'join') return now >= same;
  const src = state.sampleFrames[0];
  const initial = src ? (pairCounts(src.bonds, src.atoms)[key] || 0) : 0;
  return now <= initial - same;
}

function pickSampleLesson(lesson) {
  state.lessonId = lesson.id;
  state.notebookId = null;
  state.metadata = {
    name: lesson.name,
    description: lesson.description,
    created: Date.now(),
  };
  state.sampleFrames = lesson.frames.map((frame) => ({
    atoms: cloneAtoms(frame.atoms),
    bonds: cloneBonds(frame.bonds),
  }));
  const first = state.sampleFrames[0];
  state.atoms = cloneAtoms(first?.atoms || {});
  state.bonds = cloneBonds(first?.bonds || []);
  state.keyframes = [];
  state.currentFrame = 0;
  state.history = [];
  state.selectedAtom = null;
  scene?.setFrame(state.atoms, state.bonds);
  state.coachStep = 1;
  state.didDrag = false;
  state.didPlay = false;
  applyCoachScene();
  hopMascot(els.guide?.querySelector('.rx-guide-mascot'));
  renderAll();
}

function coachNext() {
  const step = getCoachStep(state.editPath, state.coachStep);
  if (step?.waitFor === 'save') {
    saveToNotebook();
    return;
  }
  if (step?.waitFor === 'snap') {
    saveKeyframe();
    if (state.keyframes.length >= 1) {
      state.coachStep += 1;
      applyCoachScene();
    }
    renderAll();
    hopMascot(els.guide?.querySelector('.rx-guide-mascot'));
    return;
  }
  if (step?.waitFor === 'snap2') {
    createKeyframe();
    if (state.keyframes.length >= 2) {
      state.coachStep += 1;
      if (getCoachStep(state.editPath, state.coachStep)?.id === 'rearrange2') {
        state.didDrag = false;
      }
      applyCoachScene();
    }
    renderAll();
    hopMascot(els.guide?.querySelector('.rx-guide-mascot'));
    return;
  }
  if (step?.waitFor === 'snap3') {
    createKeyframe();
    if (state.keyframes.length >= 3) {
      state.coachStep += 1;
      applyCoachScene();
    }
    renderAll();
    hopMascot(els.guide?.querySelector('.rx-guide-mascot'));
    return;
  }
  if (!canAdvanceCoach() && step?.waitFor !== 'next' && step?.waitFor !== 'drag') {
    showToast(coachBlockReason());
    return;
  }
  const steps = getSteps(state.editPath);
  if (state.coachStep >= steps.length - 1) {
    saveToNotebook();
    return;
  }
  state.coachStep += 1;
  applyCoachScene();
  renderAll();
}

function coachBack() {
  if (state.coachStep <= 0) {
    state.editPath = EDIT_PATH.GATE;
    scene?.setInteractive(false);
    scene?.clearAtomHint?.();
    killCoachMotion();
    renderAll();
    return;
  }
  state.coachStep -= 1;
  applyCoachScene();
  renderAll();
}

function coachBlockReason() {
  const step = getCoachStep(state.editPath, state.coachStep);
  if (step?.waitFor === 'name') return 'Đặt tên phương trình trước nhé.';
  if (step?.waitFor === 'place') return 'Bấm xuống sàn để đặt ít nhất một nguyên tử.';
  if (step?.waitFor === 'bond') return 'Bấm hai quả cầu để nối, hoặc chọn Chưa cần nối.';
  if (step?.waitFor === 'snap') return 'Bấm Lưu trạng thái 1 trước.';
  if (step?.waitFor === 'snap2') return 'Bấm Lưu trạng thái 2 trước.';
  if (step?.waitFor === 'snap3') return 'Bấm Lưu trạng thái 3 trước.';
  if (step?.waitFor === 'cutOld') return 'Bấm nút “Cắt liên kết”, rồi bấm hết các thanh nối cũ.';
  if (step?.waitFor === 'joinNew') return 'Bấm nút “Nối liên kết”, rồi bấm từng cặp quả cầu.';
  return 'Làm xong việc trên tấm vàng rồi hãy đi tiếp.';
}

function loadReaction(chemx, lessonId = null) {
  if (!engine || !scene) return;
  engine.pause();
  state.chemx = chemx || null;
  state.lessonId = lessonId;
  const first = chemx?.keyframes?.[0];
  engine.load(chemx || { duration: 0, keyframes: [] });
  scene.setFrame(first?.atoms || {}, first?.bonds || []);
  syncTransport(0);
  renderChips();
  if (state.workspace === 'view') renderAll();
}

function loadLessonIntoEditor(lesson) {
  state.lessonId = lesson.id;
  state.notebookId = null;
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

function loadPersonalIntoEditor(item) {
  state.notebookId = item.id;
  state.lessonId = personalLessonId(item.id);
  state.editPath = EDIT_PATH.FREE;
  state.metadata = {
    name: item.name,
    description: item.description,
    created: item.createdAt,
  };
  state.keyframes = item.frames.map((frame) => ({
    atoms: cloneAtoms(frame.atoms),
    bonds: cloneBonds(frame.bonds),
  }));
  state.currentFrame = 0;
  state.history = [];
  state.selectedAtom = null;
  applyEditorFrame(0);
  scene?.setInteractive(true);
  scene?.setEditMode(state.editMode);
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
  clearCelebrate(els.celebrate);
  if (!state.keyframes.length) {
    showToast('Hãy lưu ít nhất một trạng thái trước khi phát.');
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
  if (state.workspace === 'edit') applyCoachScene();
  if (state.editPath === EDIT_PATH.FREE) {
    scene?.setInteractive(true);
    scene?.setEditMode(state.editMode);
  }
  applyEditorFrame(state.currentFrame);
  renderChips();
}

function isChemxTransfer(dt) {
  if (!dt) return false;
  if ([...dt.types || []].includes('Files')) return true;
  return [...(dt.items || [])].some((item) => item.kind === 'file');
}

function pickChemxFile(files) {
  const list = [...(files || [])];
  return list.find((file) => /\.(chemx|json)$/i.test(file.name)) || list[0] || null;
}

function setDropVisible(on) {
  if (!els.drop) return;
  const shown = els.drop.classList.contains('is-on');
  if (on === shown) return;
  if (on) {
    els.drop.classList.add('is-on');
    showDropOverlay(els.drop);
  } else {
    els.drop.classList.remove('is-on');
    hideDropOverlay(els.drop);
  }
}

function bindChemxDrop() {
  const leftWindow = (e) => (
    e.relatedTarget == null
    || e.clientX <= 0
    || e.clientY <= 0
    || e.clientX >= window.innerWidth
    || e.clientY >= window.innerHeight
  );
  document.addEventListener('dragenter', (e) => {
    if (!isChemxTransfer(e.dataTransfer)) return;
    e.preventDefault();
    setDropVisible(true);
  });
  document.addEventListener('dragover', (e) => {
    if (!isChemxTransfer(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  document.addEventListener('dragleave', (e) => {
    if (leftWindow(e)) setDropVisible(false);
  });
  document.addEventListener('drop', async (e) => {
    e.preventDefault();
    setDropVisible(false);
    const file = pickChemxFile(e.dataTransfer?.files);
    if (!file) {
      showToast('Hãy thả file .chemx hoặc .json.');
      return;
    }
    await openFile(file, { play: true });
  });
}

async function openFile(file, { play = false } = {}) {
  try {
    const data = await readChemxFile(file);
    if (state.workspace === 'edit' && !play) {
      state.metadata = { ...data.metadata };
      state.keyframes = data.keyframes.map((kf) => ({
        atoms: cloneAtoms(kf.atoms),
        bonds: cloneBonds(kf.bonds),
      }));
      state.currentFrame = 0;
      state.lessonId = null;
      state.notebookId = null;
      state.editPath = EDIT_PATH.FREE;
      applyEditorFrame(0);
      scene?.setInteractive(true);
      renderAll();
      showToast(`Đã nạp ${file.name} vào bàn dựng. Bấm Trạng thái 1–3 hoặc ▶ để xem.`);
      return;
    }
    if (state.workspace === 'edit') switchWorkspace('view');
    loadReaction(data, null);
    renderAll();
    if (play) engine?.play();
    showToast(`Đã mở ${file.name}. Bấm Trạng thái 1, 2, 3… để xem từng lần lưu.`);
  } catch (err) {
    showToast(err.message);
  }
}

function handlePlaceAtom(position) {
  if (!toolAllowed(state.editPath, state.coachStep, 'addAtom')) return;
  pushHistory();
  const id = `atom_${Date.now()}`;
  state.atoms[id] = {
    id,
    symbol: state.selectedAtomType,
    position: { x: position.x, y: position.y, z: position.z },
    charge: 0,
  };
  scene.setFrame(state.atoms, state.bonds);
  markTask('place');
}

function handleSelectAtom(id) {
  state.selectedAtom = id;
  scene.setSelected(id);
  renderPosDock();
  if (currentWait() === 'joinNew') renderGuide();
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
  markTask('drag');
}

function handleDeleteAtom(id) {
  if (!toolAllowed(state.editPath, state.coachStep, 'deleteAtom')) return;
  pushHistory();
  delete state.atoms[id];
  state.bonds = state.bonds.filter((b) => !b.atomIds.includes(id));
  if (state.selectedAtom === id) state.selectedAtom = null;
  scene.setFrame(state.atoms, state.bonds);
  renderPosDock();
}

function handleAddBond(a, b) {
  if (!toolAllowed(state.editPath, state.coachStep, 'addBond')) return;
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
  markTask('bond');
  afterBondEdit();
}

function handleBreakBond(id) {
  if (!toolAllowed(state.editPath, state.coachStep, 'breakBond')) return;
  pushHistory();
  state.bonds = state.bonds.filter((bond) => bond.id !== id);
  scene.setFrame(state.atoms, state.bonds);
  afterBondEdit();
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
    showToast('Hãy đặt nguyên tử trước khi lưu trạng thái.');
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
  renderGuide();
  flashSaved(els.panel);
}

function createKeyframe() {
  if (!Object.keys(state.atoms).length && !state.bonds.length) {
    showToast('Hãy đặt nguyên tử trước khi thêm trạng thái.');
    return;
  }
  if (state.keyframes.length >= MAX_FRAMES) {
    showToast('Tối đa 20 keyframe.');
    return;
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

function saveToNotebook() {
  try {
    if (!state.keyframes.length) saveKeyframe();
    const saved = saveMyReaction({
      id: state.notebookId,
      name: state.metadata.name,
      description: state.metadata.description,
      frames: state.keyframes,
      sourceLessonId: state.editPath === EDIT_PATH.SAMPLE ? currentLesson()?.id : null,
    });
    state.notebookId = saved.id;
    state.lessonId = personalLessonId(saved.id);
    if (state.editPath === EDIT_PATH.SAMPLE || state.editPath === EDIT_PATH.CREATE) {
      rememberGuideComplete();
    }
    celebrate(els.celebrate);
    hopMascot(els.guide?.querySelector('.rx-guide-mascot'));
    showToast(isNotebookLoggedIn()
      ? 'Đã cất vào vở của bạn. Chỉ mình bạn thấy bài này.'
      : 'Đã cất trên máy này. Đăng nhập để giữ vở khi đổi máy.');
    renderAll();
  } catch (err) {
    showToast(err.message);
  }
}

function playPersonal(item) {
  try {
    loadReaction(
      framesToChemx({ name: item.name, description: item.description, created: item.createdAt }, item.frames),
      personalLessonId(item.id)
    );
  } catch (err) {
    showToast(err.message);
  }
}

function removePersonal(id) {
  const item = getMyReaction(id);
  if (!item) return;
  if (!window.confirm(`Xóa "${item.name}" khỏi sổ tay? Bài mẫu chung không bị ảnh hưởng.`)) return;
  deleteMyReaction(id);
  if (state.notebookId === id) state.notebookId = null;
  if (parsePersonalLessonId(state.lessonId) === id) {
    loadReaction(null, null);
    state.notebookId = null;
  }
  showToast('Đã xóa khỏi sổ tay cá nhân.');
  renderAll();
}

function setEditMode(mode) {
  if (!toolAllowed(state.editPath, state.coachStep, mode)) {
    showToast('Bước này chưa cần công cụ đó. Làm theo hướng dẫn vàng trước.');
    return;
  }
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
  syncGuidedChrome();
  renderRail();
  renderPanel();
  renderGateLayer();
  renderGuide();
  renderHint();
  renderChips();
  renderPosDock();
  renderCanvasEmpty();
  renderHowTo();
}

function hasLoadedReaction() {
  return Boolean(state.chemx?.keyframes?.length);
}

function sceneSymbols() {
  const frames = state.workspace === 'view'
    ? (state.chemx?.keyframes || [])
    : state.keyframes;
  const symbols = [];
  const seen = new Set();
  frames.forEach((frame) => {
    Object.values(frame.atoms || {}).forEach((atom) => {
      const symbol = atom?.symbol;
      if (!symbol || seen.has(symbol)) return;
      seen.add(symbol);
      symbols.push(symbol);
    });
  });
  return symbols;
}

function renderHowTo() {
  const el = els.howto;
  if (!el) return;
  const show = state.workspace === 'edit'
    && state.editPath === EDIT_PATH.FREE
    && shouldShowHowTo();
  if (!show) {
    el.hidden = true;
    el.innerHTML = '';
    return;
  }
  const became = el.hidden;
  el.hidden = false;
  el.innerHTML = `
    <div class="rx-howto-card">
      <p class="rx-howto-kicker">Lần đầu dựng phim?</p>
      <ol class="rx-howto-steps">
        ${STATE_FLOW.map((label, i) => `<li><b>${i + 1}</b><span>${label}</span></li>`).join('')}
      </ol>
      <div class="rx-howto-actions">
        <button type="button" class="rx-btn rx-btn-accent" id="howto-start">Học từng bước</button>
        <button type="button" class="rx-btn rx-btn-ghost" id="howto-hide">Mình đã hiểu</button>
      </div>
    </div>
  `;
  $('howto-start')?.addEventListener('click', startSamplePath);
  $('howto-hide')?.addEventListener('click', () => {
    rememberHideHowTo();
    renderHowTo();
  });
  if (became) enterHowTo(el.querySelector('.rx-howto-card'));
}

function renderCanvasEmpty() {
  const el = els.canvasEmpty;
  if (!el) return;
  const empty = state.workspace === 'view' && !hasLoadedReaction();
  const becameEmpty = empty && el.hidden;
  el.hidden = !empty;
  if (becameEmpty) popIn(el.querySelector('.rx-canvas-empty-card'));
}

function syncGuidedChrome() {
  const guided = state.workspace === 'edit' && isGuidedPath(state.editPath);
  const gated = state.workspace === 'edit' && state.editPath === EDIT_PATH.GATE;
  const wait = currentWait();
  els.stage?.classList.toggle('is-guided', guided);
  els.stage?.classList.toggle('is-gated', gated);
  els.stage?.classList.toggle('is-bonding', guided && (wait === 'cutOld' || wait === 'joinNew'));
  scene?.setLabelsVisible(state.workspace === 'edit' && !gated);
  if (gated) clearCelebrate(els.celebrate);
  if (!guided) {
    killCoachMotion();
    scene?.clearAtomHint?.();
    stopPlayPulse(els.play);
    els.chips?.classList.remove('is-lit');
  }
}

function renderHint() {
  let text = hasLoadedReaction() ? HINTS.view : HINTS.viewEmpty;
  if (state.workspace === 'edit') {
    if (state.editPath === EDIT_PATH.GATE) text = HINTS.gate;
    else text = HINTS[state.editMode] || HINTS.select;
  }
  if (els.hint.textContent !== text) {
    els.hint.textContent = text;
    pulseHint(els.hint);
  }
}

function renderChips() {
  const frames = state.workspace === 'view' ? (state.chemx?.keyframes || []) : state.keyframes;
  const help = $('rx-moments-help');
  if (help) {
    help.textContent = frames.length
      ? `Đã nhớ ${frames.length} hình. Bấm nút để xem. Muốn thêm: kéo quả cầu hoặc đổi thanh nối, rồi bấm Lưu / Thêm trạng thái.`
      : 'Chưa nhớ hình nào. Xếp quả cầu, nối thanh, rồi bấm “Lưu trạng thái 1”.';
  }
  els.chips.innerHTML = frames.map((_, i) => (
    `<button type="button" class="rx-chip" role="tab" data-kf="${i}" title="Nhảy tới ${momentLabel(i)}" aria-label="Nhảy tới ${momentLabel(i)}">${momentLabel(i)}</button>`
  )).join('');
  els.chips.querySelectorAll('.rx-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.kf);
      if (state.workspace === 'view') {
        const ts = state.chemx?.keyframes?.[i]?.timestamp;
        if (ts == null) return;
        engine.seek(ts);
      } else {
        engine.pause();
        applyEditorFrame(i);
        renderPanel();
        renderPosDock();
        applyCoachScene();
      }
    });
  });
  revealChips(els.chips);
}

function renderGateLayer() {
  const el = els.gateLayer;
  const show = state.workspace === 'edit' && state.editPath === EDIT_PATH.GATE;
  if (!show) {
    el.hidden = true;
    el.innerHTML = '';
    return;
  }
  clearCelebrate(els.celebrate);
  el.hidden = false;
  el.innerHTML = `
    <div class="rx-gate-sheet">
      <div class="rx-guide-mascot" style="margin-bottom:8px">${MASCOT_SVG}</div>
      <h2 class="rx-title" style="margin:0">Bạn muốn làm kiểu nào?</h2>
      <p class="rx-copy" style="margin:8px 0 0">Chỉ hiện đúng một việc mỗi lần. Không cần nhớ tên công cụ.</p>
      <div class="rx-gate-picks">
        <button type="button" class="rx-pick is-easy" id="gate-sample">
          <b>Tập theo mẫu</b>
          <span>Chọn phản ứng, kéo thử một quả cầu, bấm ▶ xem phim. Dễ nhất.</span>
          <small>Nên bắt đầu từ đây</small>
        </button>
        <button type="button" class="rx-pick" id="gate-create">
          <b>Tự viết phương trình</b>
          <span>Sắp nguyên tử, lưu trạng thái 1, đổi chỗ, lưu trạng thái 2. Cất riêng trong vở.</span>
          <small>Chỉ mình bạn thấy</small>
        </button>
      </div>
      <button type="button" class="rx-link" id="gate-free" style="margin-top:12px">Mình tự làm, không cần dẫn</button>
    </div>
  `;
  $('gate-sample')?.addEventListener('click', startSamplePath);
  $('gate-create')?.addEventListener('click', startCreatePath);
  $('gate-free')?.addEventListener('click', () => enterFreeEditor({ skipPref: true }));
  enterGuide(el.querySelector('.rx-gate-sheet'));
}

function renderGuide() {
  const el = els.guide;
  const guided = state.workspace === 'edit'
    && (state.editPath === EDIT_PATH.SAMPLE || state.editPath === EDIT_PATH.CREATE);
  stopPlayPulse(els.play);
  if (!guided) {
    el.hidden = true;
    el.innerHTML = '';
    el.classList.remove('is-center');
    renderGuide._key = '';
    return;
  }
  const steps = getSteps(state.editPath);
  const step = steps[state.coachStep];
  if (!step) {
    el.hidden = true;
    el.classList.remove('is-center');
    return;
  }
  const lesson = currentLesson();
  const say = (state.editPath === EDIT_PATH.SAMPLE && lesson?.coach?.[step.id]) || step.say;
  const hint = (state.editPath === EDIT_PATH.SAMPLE && lesson?.coach?.[`${step.id}Hint`]) || step.hint;
  const checkItems = step.waitFor === 'cutOld'
    ? (lesson?.rebondCuts || [])
    : step.waitFor === 'joinNew'
      ? (lesson?.rebondJoins || [])
      : [];
  const checkMode = step.waitFor === 'joinNew' ? 'join' : 'cut';
  const startId = scene?.bondStartId || null;
  const startSym = startId ? (state.atoms[startId]?.symbol || '') : '';
  const joinToolOn = state.editMode === 'addBond';
  const howStep = step.waitFor === 'cutOld'
    ? 0
    : !joinToolOn ? 1
      : startId ? 3
        : 2;
  const canCta = step.waitFor === 'next'
    || step.waitFor === 'drag'
    || step.waitFor === 'save'
    || step.waitFor === 'snap'
    || step.waitFor === 'snap2'
    || step.waitFor === 'snap3'
    || canAdvanceCoach();
  const ctaLabel = step.cta || 'Tiếp theo';

  const dockTop = step.dock !== 'center';
  const slim = dockTop && !step.palette;
  el.hidden = false;
  el.classList.toggle('is-center', !dockTop);
  el.innerHTML = `
    <div class="rx-guide-card${slim ? ' is-slim' : ''}">
      <div class="rx-guide-mascot">${MASCOT_SVG}</div>
      <div>
        <p class="rx-guide-step">Bước ${state.coachStep + 1}/${steps.length}</p>
        <p class="rx-guide-say" aria-live="polite">${say}</p>
        ${hint ? `<p class="rx-guide-hint">${hint}</p>` : ''}
        ${step.pickTool && step.tools?.length ? `
          <div class="rx-guide-tools">
            ${TOOLS.filter(([id]) => step.tools.includes(id)).map(([id, label, , danger]) => `
              <button type="button" class="rx-btn ${danger ? 'rx-btn-primary' : 'rx-btn-accent'} rx-guide-tool${state.editMode === id ? ' is-on' : ''}" data-mode="${id}">
                ${label}
              </button>
            `).join('')}
          </div>
        ` : ''}
        ${checkItems.length ? `
          <ol class="rx-guide-list">
            ${checkItems.map((item, i) => `
              <li class="${checklistDone(checkItems, i, checkMode) ? 'is-done' : ''}">${item.label}</li>
            `).join('')}
          </ol>
        ` : ''}
        ${step.waitFor === 'cutOld' || step.waitFor === 'joinNew' ? `
          <p class="rx-guide-pick">${
            step.waitFor === 'cutOld'
              ? 'Cắt hết thanh cũ rồi mới nối. Cách nối:'
              : startSym
                ? `Đã chọn quả cầu ${startSym}. Bấm quả cầu thứ hai — thanh nối hiện ra.`
                : joinToolOn
                  ? 'Bấm một quả cầu, rồi bấm quả cầu kia.'
                  : 'Bấm nút “Nối liên kết”, rồi bấm hai quả cầu.'
          }</p>
          <ol class="rx-guide-how" aria-label="Cách nối hai quả cầu">
            <li class="${howStep > 1 ? 'is-done' : howStep === 1 ? 'is-on' : ''}"><b>1</b><span>Bấm nút “Nối liên kết”</span></li>
            <li class="${howStep > 2 ? 'is-done' : howStep === 2 ? 'is-on' : ''}"><b>2</b><span>Bấm quả cầu thứ nhất</span></li>
            <li class="${howStep === 3 ? 'is-on' : ''}"><b>3</b><span>Bấm quả cầu thứ hai</span></li>
          </ol>
        ` : ''}
        ${step.flow && STATE_FLOW[step.flowAt] ? `
          <p class="rx-guide-now">Bây giờ: ${STATE_FLOW[step.flowAt]}</p>
        ` : ''}
        ${slim ? '' : `
          <div class="rx-guide-progress" aria-label="Bước ${state.coachStep + 1} / ${steps.length}">
            ${steps.map((_, i) => `<span class="rx-guide-pip${i === state.coachStep ? ' is-on' : ''}${i < state.coachStep ? ' is-done' : ''}"></span>`).join('')}
          </div>
        `}
        ${step.waitFor === 'pick' ? `
          <div class="rx-gate-picks">
            ${REACTION_LESSONS.map((lesson) => `
              <button type="button" class="rx-pick is-easy" data-lesson="${lesson.id}">
                <b>${lesson.title}</b>
                <span>${lesson.subtitle}</span>
              </button>
            `).join('')}
          </div>
        ` : ''}
        ${step.waitFor === 'name' ? `
          <input id="guide-name" class="rx-input" value="${escapeAttr(state.metadata.name)}" placeholder="Ví dụ: H₂ + Cl₂ → 2 HCl" aria-label="Tên phương trình">
          <div class="rx-chips-row">
            ${EQUATION_CHIPS.map((chip) => `
              <button type="button" class="rx-chip rx-chip-fill" data-chip="${escapeAttr(chip.name)}">${chip.name}</button>
            `).join('')}
          </div>
        ` : ''}
        ${step.palette ? `
          <div class="rx-guide-palette">
            ${PALETTE_COMMON.map((symbol) => swatchButton(symbol)).join('')}
          </div>
        ` : ''}
        ${(step.waitFor === 'snap2' || step.waitFor === 'snap3') && state.keyframes.length ? `<p class="rx-guide-hint">Đã nhớ ${state.keyframes.length} hình.</p>` : ''}
        ${step.waitFor !== 'pick' ? `
          <div class="rx-guide-foot">
            <button type="button" class="rx-btn rx-btn-primary rx-guide-cta" id="guide-cta" ${canCta ? '' : 'disabled'}>${ctaLabel}</button>
            <button type="button" class="rx-btn rx-btn-ghost" id="guide-back">${state.coachStep === 0 ? 'Chọn lại' : 'Quay lại'}</button>
          </div>
          <div class="rx-guide-nav">
            ${step.skip ? `<button type="button" class="rx-btn rx-btn-ghost" id="guide-skip">${step.skip}</button>` : ''}
            <button type="button" class="rx-link" id="guide-free">Tự làm, không cần dẫn</button>
          </div>
        ` : `
          <div class="rx-guide-nav">
            <button type="button" class="rx-btn rx-btn-ghost" id="guide-back">Chọn lại</button>
            <button type="button" class="rx-link" id="guide-free">Tự làm, không cần dẫn</button>
          </div>
        `}
      </div>
    </div>
  `;

  el.querySelectorAll('[data-lesson]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const lesson = REACTION_LESSONS.find((item) => item.id === btn.dataset.lesson);
      if (lesson) pickSampleLesson(lesson);
    });
  });
  $('guide-name')?.addEventListener('input', (e) => {
    state.metadata.name = e.target.value;
    const cta = $('guide-cta');
    if (cta) cta.disabled = !e.target.value.trim();
  });
  el.querySelectorAll('[data-chip]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.metadata.name = btn.dataset.chip;
      const input = $('guide-name');
      if (input) input.value = btn.dataset.chip;
      const cta = $('guide-cta');
      if (cta) cta.disabled = false;
      hopMascot(el.querySelector('.rx-guide-mascot'));
    });
  });
  el.querySelectorAll('[data-symbol]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.selectedAtomType = btn.dataset.symbol;
      state.editMode = 'addAtom';
      scene?.setEditMode('addAtom');
      renderGuide();
    });
  });
  el.querySelectorAll('.rx-guide-tool[data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.editMode = btn.dataset.mode;
      scene?.setInteractive(true);
      scene?.setEditMode(state.editMode);
      renderGuide();
      hopMascot(el.querySelector('.rx-guide-mascot'));
    });
  });
  $('guide-back')?.addEventListener('click', coachBack);
  $('guide-cta')?.addEventListener('click', () => {
    if (step.waitFor === 'drag' && !state.didDrag) {
      coachNext();
      return;
    }
    coachNext();
  });
  $('guide-skip')?.addEventListener('click', () => {
    state.coachStep += 1;
    applyCoachScene();
    renderAll();
  });
  $('guide-free')?.addEventListener('click', () => enterFreeEditor({ skipPref: true, keepFrames: true }));

  const key = `${state.editPath}:${state.coachStep}:${step.waitFor}`;
  if (renderGuide._key !== key) {
    renderGuide._key = key;
    enterGuide(el.querySelector('.rx-guide-card'), { from: dockTop ? 'top' : 'bottom' });
    enterFlow(el.querySelector('.rx-flow'));
  }
  els.chips?.classList.remove('is-lit');
  if (step.spotlight === 'play' && !state.didPlay) {
    els.play.classList.add('is-spotlight');
    els.play.closest('.rx-transport')?.classList.add('is-lit');
    pulseTarget(els.play);
  }
  if (step.spotlight === 'moments') {
    els.chips?.classList.add('is-lit');
    pulseTarget(els.chips);
  }
  if (step.spotlight === 'save' || step.spotlight === 'next') {
    const cta = $('guide-cta');
    cta?.classList.add('is-spotlight');
    pulseTarget(cta);
  }
  if (step.spotlight === 'tool') {
    const toolBtn = el.querySelector('.rx-guide-tool');
    if (toolBtn && !step.tools.includes(state.editMode)) {
      toolBtn.classList.add('is-spotlight');
      pulseTarget(toolBtn);
    }
  }
}

function notebookListHtml(selectedId) {
  const mine = listMyReactions();
  if (!mine.length) {
    return '<div class="rx-empty">Chưa có phương trình riêng. Vào Làm hoạt ảnh → Tự viết phương trình.</div>';
  }
  return mine.map((item) => {
    const selected = selectedId === item.id || state.lessonId === personalLessonId(item.id);
    return `
      <button type="button" class="rx-lesson is-mine${selected ? ' is-on' : ''}" data-mine="${item.id}">
        <strong>${escapeAttr(item.name)}</strong>
        <small>${item.frames.length} trạng thái · ${formatWhen(item.updatedAt)}</small>
        <span class="rx-badge">Chỉ mình bạn</span>
      </button>
    `;
  }).join('');
}

function bindNotebookList(root, { intoEditor = false } = {}) {
  root.querySelectorAll('[data-mine]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = getMyReaction(btn.dataset.mine);
      if (!item) return;
      if (intoEditor || state.workspace === 'edit') {
        state.editPath = EDIT_PATH.FREE;
        if (state.workspace !== 'edit') switchWorkspace('edit');
        loadPersonalIntoEditor(item);
        renderAll();
        popIn(els.panel);
      } else {
        playPersonal(item);
      }
    });
  });
}

function renderRail() {
  if (state.workspace === 'edit' && isGuidedPath(state.editPath)) {
    els.rail.innerHTML = '';
    return;
  }
  if (state.workspace === 'view') {
    els.rail.innerHTML = `
      <h1 class="rx-title">Bài phản ứng</h1>
      <p class="rx-copy">Chọn bài mẫu, mở sổ tay, hoặc kéo thả file .chemx vào trang để phát. Không bắt buộc bấm Mở file.</p>
      <div class="rx-section-label">Bài mẫu lớp</div>
      <div class="rx-lessons">
        ${REACTION_LESSONS.map((lesson) => `
          <button type="button" class="rx-lesson${lesson.id === state.lessonId ? ' is-on' : ''}" data-lesson="${lesson.id}">
            <strong>${lesson.title}</strong>
            <small>${lesson.subtitle} · ${lesson.grade}</small>
          </button>
        `).join('')}
      </div>
      <div class="rx-section-label">Vở của tôi</div>
      <div class="rx-lessons" id="rx-mine-list">
        ${notebookListHtml(parsePersonalLessonId(state.lessonId))}
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
    bindNotebookList(els.rail, { intoEditor: false });
    $('btn-open')?.addEventListener('click', () => els.file.click());
    $('btn-export-view')?.addEventListener('click', () => {
      if (!hasLoadedReaction()) {
        showToast('Chọn một bài phản ứng trước khi xuất.');
        return;
      }
      const name = (state.chemx.metadata.name || 'phan-ung').replace(/\s+/g, '-');
      downloadChemx(state.chemx, `${name}.chemx`);
    });
    return;
  }

  if (state.editPath === EDIT_PATH.GATE) {
    els.rail.innerHTML = `
      <h1 class="rx-title">Làm hoạt ảnh lần đầu?</h1>
      <p class="rx-copy">Bàn dựng đầy đủ dễ rối. Chọn cách học bên phải — chỉ hiện đúng việc của bước đó.</p>
      <p class="rx-privacy"><span class="material-symbols-outlined">lock</span> Phương trình tự tạo sẽ vào sổ tay riêng, không lẫn bài mẫu chung.</p>
    `;
    return;
  }

  if (state.editPath === EDIT_PATH.SAMPLE) {
    const step = getCoachStep(state.editPath, state.coachStep);
    els.rail.innerHTML = `
      <h1 class="rx-title">Bài mẫu</h1>
      <p class="rx-copy">Chọn phản ứng, rồi làm theo thanh vàng ở giữa.</p>
      <div class="rx-lessons">
        ${REACTION_LESSONS.map((lesson) => `
          <button type="button" class="rx-lesson${lesson.id === state.lessonId && state.coachStep > 0 ? ' is-on' : ''}" data-lesson="${lesson.id}">
            <strong>${lesson.title}</strong>
            <small>3 trạng thái sẵn · ${lesson.grade}</small>
          </button>
        `).join('')}
      </div>
      ${renderTools(step)}
      <button type="button" class="rx-link" id="btn-skip-guide">Bỏ hướng dẫn, tự làm</button>
    `;
    els.rail.querySelectorAll('[data-lesson]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const lesson = REACTION_LESSONS.find((item) => item.id === btn.dataset.lesson);
        if (!lesson) return;
        loadLessonIntoEditor(lesson);
        state.coachStep = 1;
        applyCoachScene();
        renderAll();
        slideCoach(els.coach);
      });
    });
    bindToolEvents();
    $('btn-skip-guide')?.addEventListener('click', () => enterFreeEditor({ skipPref: true, keepFrames: true }));
    return;
  }

  if (state.editPath === EDIT_PATH.CREATE) {
    const step = getCoachStep(state.editPath, state.coachStep);
    els.rail.innerHTML = `
      <h1 class="rx-title">Phương trình của bạn</h1>
      <p class="rx-copy">Làm từng bước. Bài sẽ vào sổ tay cá nhân, không hiện cho bạn khác.</p>
      ${renderTools(step)}
      <div class="rx-section-label">Vở của tôi</div>
      <div class="rx-lessons" id="rx-mine-list">${notebookListHtml(state.notebookId)}</div>
      <button type="button" class="rx-link" id="btn-skip-guide">Bỏ hướng dẫn, tự làm</button>
    `;
    bindToolEvents();
    bindNotebookList(els.rail, { intoEditor: true });
    $('btn-skip-guide')?.addEventListener('click', () => enterFreeEditor({ skipPref: true, keepFrames: true }));
    return;
  }

  els.rail.innerHTML = `
    <h1 class="rx-title">Bàn dựng</h1>
    <p class="rx-copy">Sắp → lưu trạng thái → đổi chỗ → lưu tiếp → phát.</p>
    ${renderTools({ tools: TOOLS.map((t) => t[0]), palette: true })}
    <div class="rx-btn-row">
      <button type="button" class="rx-btn rx-btn-ghost" id="btn-undo" ${state.history.length ? '' : 'disabled'}>Hoàn tác</button>
    </div>
    <div class="rx-howto-mini">
      <strong>Cần dẫn từng bước?</strong>
      <span>Học vòng: sắp → lưu trạng thái → đổi chỗ → lưu tiếp → phát.</span>
      <button type="button" class="rx-btn rx-btn-accent" id="btn-open-gate">Học từng bước</button>
    </div>
  `;
  bindToolEvents();
  $('btn-undo')?.addEventListener('click', undo);
  $('btn-open-gate')?.addEventListener('click', startSamplePath);
}

function renderTools(step) {
  const allowed = step?.tools || [];
  const showTools = allowed.length > 0;
  const showPalette = Boolean(step?.palette);
  const toolsHtml = showTools ? `
    <div class="rx-tools">
      ${TOOLS.filter(([id]) => allowed.includes(id)).map(([id, label, hint, danger]) => `
        <button type="button" class="rx-tool${state.editMode === id ? ' is-on' : ''}${danger ? ' is-danger' : ''}" data-mode="${id}">
          ${label}<span>${hint}</span>
        </button>
      `).join('')}
    </div>
  ` : '';
  const extras = state.extraSymbols.filter((symbol) => !PALETTE_COMMON.includes(symbol));
  const paletteHtml = showPalette ? `
    <div class="rx-section-label">Nguyên tố thường dùng</div>
    <div class="rx-palette" id="rx-palette-common">
      ${PALETTE_COMMON.map((symbol) => swatchButton(symbol)).join('')}
      ${extras.map((symbol) => swatchButton(symbol)).join('')}
    </div>
    <p class="rx-copy">Đang chọn: <strong>${state.selectedAtomType}</strong> · ${atomName(state.selectedAtomType)}</p>
    <button type="button" class="rx-btn rx-btn-ghost rx-palette-toggle" id="btn-more-atoms">
      Mở bảng tuần hoàn
    </button>
  ` : '';
  const bondHtml = showTools && allowed.includes('addBond') && state.editMode === 'addBond' ? `
    <label class="rx-section-label" for="bond-type">Kiểu liên kết</label>
    <select id="bond-type" class="rx-select">
      ${Object.values(BOND_TYPES).map((type) => `
        <option value="${type.id}" ${type.id === state.selectedBondType ? 'selected' : ''}>${type.name}</option>
      `).join('')}
    </select>
  ` : '';
  return `${toolsHtml}${paletteHtml}${bondHtml}`;
}

function swatchButton(symbol) {
  return `
    <button type="button" class="rx-swatch${state.selectedAtomType === symbol ? ' is-on' : ''}" data-symbol="${symbol}" style="background:${atomColor(symbol)}" title="${symbol} · ${atomName(symbol)}" aria-label="${symbol} · ${atomName(symbol)}">
      <span class="rx-swatch-sym">${symbol}</span>
    </button>
  `;
}

function pickAtomSymbol(symbol) {
  const next = normalizeSymbol(symbol);
  if (!isTextbookAtom(next)) {
    showToast('Chỉ chọn nguyên tố có trong bảng tuần hoàn SGK. Gõ Clo, Oxi, Fe hoặc 26.');
    return;
  }
  if (!PALETTE_COMMON.includes(next) && !state.extraSymbols.includes(next)) {
    state.extraSymbols.push(next);
  }
  state.selectedAtomType = next;
  closePeriodicTable();
  if (state.editMode !== 'addAtom') setEditMode('addAtom');
  else renderRail();
}

function applyPeriodicSearch(query = '') {
  const table = els.table?.querySelector('.rx-ptable');
  if (!table) return;
  const matches = findTextbookAtoms(query);
  filterPeriodicCells(table, matches, { filtering: Boolean(String(query).trim()) });
  const count = $('rx-table-count');
  if (count) {
    count.textContent = String(query).trim()
      ? (matches.length ? `${matches.length} nguyên tố khớp` : 'Không có nguyên tố khớp')
      : `${PERIODIC_LAYOUT.length} nguyên tố trong SGK KHTN 8`;
  }
}

function openPeriodicTable() {
  const el = els.table;
  if (!el) return;
  el.innerHTML = `
    <div class="rx-table-sheet" role="dialog" aria-modal="true" aria-labelledby="rx-table-title">
      <div class="rx-table-head">
        <div>
          <h2 class="rx-title" id="rx-table-title">Bảng tuần hoàn SGK</h2>
          <p class="rx-copy">Đủ 4 chu kỳ đầu (H–Kr) và vài nguyên tố hay gặp ở lớp trên. Bấm một ô để chọn.</p>
        </div>
        <button type="button" class="rx-icon-btn" id="rx-table-close" aria-label="Đóng bảng tuần hoàn">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="rx-table-search">
        <label class="rx-section-label" for="rx-table-search">Tìm trong bảng</label>
        <input id="rx-table-search" class="rx-input" type="search" placeholder="Gõ Clo, Oxi, Fe hoặc 26" aria-label="Tìm nguyên tố trong bảng tuần hoàn" autocomplete="off">
        <p class="rx-table-count" id="rx-table-count" aria-live="polite">${PERIODIC_LAYOUT.length} nguyên tố trong SGK KHTN 8</p>
      </div>
      <div class="rx-ptable" role="list">
        ${PERIODIC_LAYOUT.map((cell) => `
          <button type="button" class="rx-pcell${state.selectedAtomType === cell.symbol ? ' is-on' : ''}" data-symbol="${cell.symbol}" role="listitem" style="--g:${cell.group};--p:${cell.period};background:${atomColor(cell.symbol)}" title="${cell.symbol} · ${atomName(cell.symbol)} · Z ${cell.z}">
            <small>${cell.z}</small>
            <b>${cell.symbol}</b>
            <span>${atomName(cell.symbol)}</span>
          </button>
        `).join('')}
      </div>
      <p class="rx-ptable-empty" hidden>Không có nguyên tố khớp. Thử Clo, Oxi, Fe, 26 hoặc xóa ô tìm.</p>
    </div>
  `;
  el.querySelectorAll('[data-symbol]').forEach((btn) => {
    btn.addEventListener('click', () => pickAtomSymbol(btn.dataset.symbol));
  });
  $('rx-table-close')?.addEventListener('click', closePeriodicTable);
  $('rx-table-search')?.addEventListener('input', (event) => {
    applyPeriodicSearch(event.target.value);
  });
  el.onclick = (event) => {
    if (event.target === el) closePeriodicTable();
  };
  openSheet(el);
  $('rx-table-search')?.focus();
}

function closePeriodicTable() {
  if (!els.table || els.table.hidden) return;
  closeSheet(els.table);
}

function bindToolEvents() {
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
  $('btn-more-atoms')?.addEventListener('click', openPeriodicTable);
  $('bond-type')?.addEventListener('change', (e) => {
    state.selectedBondType = e.target.value;
  });
}

function renderPanel() {
  if (state.workspace === 'edit' && isGuidedPath(state.editPath)) {
    els.panel.innerHTML = '';
    return;
  }
  if (state.workspace === 'view') {
    if (!hasLoadedReaction()) {
      els.panel.innerHTML = `
        <h2 class="rx-title">Bắt đầu từ bài mẫu</h2>
        <p class="rx-copy">Chọn phản ứng bên trái, hoặc kéo thả file .chemx vào trang để chạy. Sân trống cho đến khi có bài.</p>
        <div class="rx-empty">Chưa có nguyên tử trên sân. Chọn bài xong, nhãn nguyên tử chỉ hiện khi bạn chọn hoặc được gợi ý.</div>
      `;
      return;
    }
    const personalId = parsePersonalLessonId(state.lessonId);
    const personal = personalId ? getMyReaction(personalId) : null;
    const meta = personal
      ? { name: personal.name, description: personal.description || 'Phương trình trong sổ tay của bạn.' }
      : (state.chemx?.metadata || {});
    const symbols = sceneSymbols();
    els.panel.innerHTML = `
      ${personal ? '<p class="rx-privacy"><span class="material-symbols-outlined">lock</span> Sổ tay cá nhân — bạn khác không thấy bài này.</p>' : ''}
      <h2 class="rx-title">${escapeAttr(meta.name) || 'Phản ứng'}</h2>
      <p class="rx-copy">${escapeAttr(meta.description) || 'Theo dõi nguyên tử di chuyển giữa các trạng thái đã lưu.'}</p>
      ${personal ? `
        <div class="rx-btn-row">
          <button type="button" class="rx-btn rx-btn-accent" id="btn-edit-mine">Sửa bài này</button>
          <button type="button" class="rx-btn rx-btn-ghost" id="btn-del-mine">Xóa khỏi sổ tay</button>
        </div>
      ` : ''}
      <div class="rx-section-label">Nguyên tử trên sân</div>
      <div class="rx-legend">
        ${symbols.length ? symbols.map((symbol) => `
          <div class="rx-legend-row">
            <span class="rx-atom-swatch" style="background:${atomColor(symbol)}"></span>
            <span><strong>${symbol}</strong> · ${atomName(symbol)}</span>
          </div>
        `).join('') : '<div class="rx-empty">Chưa có nguyên tử trong bài này.</div>'}
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
    $('btn-edit-mine')?.addEventListener('click', () => {
      if (!personal) return;
      state.editPath = EDIT_PATH.FREE;
      if (state.workspace !== 'edit') switchWorkspace('edit');
      loadPersonalIntoEditor(personal);
      renderAll();
    });
    $('btn-del-mine')?.addEventListener('click', () => removePersonal(personalId));
    return;
  }

  if (state.editPath === EDIT_PATH.GATE) {
    els.panel.innerHTML = `
      <h2 class="rx-title">Bạn muốn làm gì?</h2>
      <p class="rx-copy">Học sinh mới nên đi từ bài mẫu. Khi đã quen, hãy tự viết phương trình và cất riêng.</p>
      <div class="rx-gate">
        <button type="button" class="rx-gate-card" id="gate-sample">
          <strong>Làm theo bài mẫu</strong>
          <span>Sắp có sẵn. Bạn tự bấm Lưu trạng thái 1, đổi chỗ, rồi Lưu trạng thái 2.</span>
        </button>
        <button type="button" class="rx-gate-card is-create" id="gate-create">
          <strong>Tự viết phương trình</strong>
          <span>Sắp nguyên tử, lưu trạng thái, đổi chỗ, lưu tiếp. Bài vào sổ tay cá nhân.</span>
        </button>
      </div>
      <button type="button" class="rx-link" id="gate-free" style="margin-top:10px">Bỏ hướng dẫn, vào bàn dựng đầy đủ</button>
    `;
    $('gate-sample')?.addEventListener('click', startSamplePath);
    $('gate-create')?.addEventListener('click', startCreatePath);
    $('gate-free')?.addEventListener('click', () => enterFreeEditor({ skipPref: true }));
    popIn(els.panel);
    return;
  }

  const guided = state.editPath === EDIT_PATH.SAMPLE || state.editPath === EDIT_PATH.CREATE;
  const step = getCoachStep(state.editPath, state.coachStep);
  const showFrames = !guided || step?.id === 'frames' || step?.id === 'save' || state.editPath === EDIT_PATH.FREE;
  const showName = !guided || step?.id === 'name' || step?.id === 'save' || state.editPath === EDIT_PATH.FREE;
  const open = state.panelOpen;

  els.panel.innerHTML = `
    <div class="rx-panel-stack">
      <div class="rx-panel-body">
        ${state.editPath === EDIT_PATH.CREATE ? '<p class="rx-privacy"><span class="material-symbols-outlined">lock</span> Chỉ mình bạn thấy phương trình này.</p>' : ''}
        ${showName ? `
          <button type="button" class="rx-acc${open.meta ? ' is-on' : ''}" data-acc-toggle="meta" aria-expanded="${open.meta}">
            <span>Tên bài</span>
            <strong>${escapeAttr(state.metadata.name) || 'Chưa đặt tên'}</strong>
          </button>
          ${open.meta ? `
            <div class="rx-acc-body" data-acc="meta">
              <label class="rx-section-label" for="rx-name">Tên phản ứng</label>
              <input id="rx-name" class="rx-input" value="${escapeAttr(state.metadata.name)}" placeholder="Ví dụ: H2 + Cl2 → 2 HCl">
              <label class="rx-section-label" for="rx-desc">Mô tả</label>
              <input id="rx-desc" class="rx-input" value="${escapeAttr(state.metadata.description)}" placeholder="Học sinh thấy gì khi phát?">
            </div>
          ` : ''}
        ` : ''}
        ${showFrames ? `
          <button type="button" class="rx-acc${open.frames ? ' is-on' : ''}" data-acc-toggle="frames" aria-expanded="${open.frames}">
            <span>Trạng thái đã lưu</span>
            <strong>${state.keyframes.length} trạng thái · đang xem ${state.currentFrame + 1}</strong>
          </button>
          ${open.frames ? `
            <div class="rx-acc-body" data-acc="frames">
              <p class="rx-copy">Mỗi trạng thái là một hình máy đã nhớ. Bạn tự xếp quả cầu và tự nối thanh. Bấm ▶, máy làm phim chạy từ hình này sang hình kia.</p>
              <div class="rx-frames" id="rx-frames">
                ${state.keyframes.length ? state.keyframes.map((frame, i) => `
                  <button type="button" class="rx-frame${i === state.currentFrame ? ' is-on' : ''}" data-frame="${i}">
                    <strong>${momentLabel(i)}</strong>
                    <small>${Object.keys(frame.atoms).length} nguyên tử · ${frame.bonds.length} liên kết</small>
                  </button>
                `).join('') : '<div class="rx-empty">Chưa có trạng thái. Sắp phân tử rồi bấm Lưu trạng thái này.</div>'}
              </div>
              <div class="rx-btn-row">
                <button type="button" class="rx-btn rx-btn-accent" id="btn-save-kf">Lưu trạng thái này</button>
                <button type="button" class="rx-btn rx-btn-ghost" id="btn-new-kf">Thêm trạng thái</button>
              </div>
            </div>
          ` : ''}
        ` : `<p class="rx-copy">${step?.say || ''}</p>`}
        ${state.editPath === EDIT_PATH.FREE ? `
          <button type="button" class="rx-acc${open.library ? ' is-on' : ''}" data-acc-toggle="library" aria-expanded="${open.library}">
            <span>Bài mẫu &amp; vở</span>
            <strong>${REACTION_LESSONS.length} mẫu · ${listMyReactions().length} bài của bạn</strong>
          </button>
          ${open.library ? `
            <div class="rx-acc-body" data-acc="library">
              <div class="rx-section-label">Bài mẫu</div>
              <div class="rx-lessons">
                ${REACTION_LESSONS.map((lesson) => `
                  <button type="button" class="rx-lesson${lesson.id === state.lessonId ? ' is-on' : ''}" data-lesson="${lesson.id}">
                    <strong>${lesson.title}</strong>
                    <small>Nạp 3 trạng thái sẵn</small>
                  </button>
                `).join('')}
              </div>
              <div class="rx-section-label">Vở của tôi</div>
              <div class="rx-lessons">${notebookListHtml(state.notebookId)}</div>
            </div>
          ` : ''}
        ` : ''}
      </div>
      <div class="rx-panel-foot">
        <button type="button" class="rx-btn rx-btn-primary" id="btn-save-note">Cất vào vở của mình</button>
        <button type="button" class="rx-btn rx-btn-ghost" id="btn-export">Xuất .chemx để phát</button>
        ${!isNotebookLoggedIn() ? '<p class="rx-copy">Khách: sổ tay lưu trên máy này. <a href="/login.html" class="rx-link">Đăng nhập</a> để giữ khi đổi máy.</p>' : ''}
      </div>
    </div>
  `;

  $('rx-name')?.addEventListener('input', (e) => {
    state.metadata.name = e.target.value;
  });
  $('rx-desc')?.addEventListener('input', (e) => {
    state.metadata.description = e.target.value;
  });
  els.panel.querySelectorAll('[data-acc-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.accToggle;
      state.panelOpen[key] = !state.panelOpen[key];
      renderPanel();
      revealAccordion(els.panel.querySelector(`[data-acc="${key}"]`));
    });
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
  bindNotebookList(els.panel, { intoEditor: true });
  $('btn-save-kf')?.addEventListener('click', saveKeyframe);
  $('btn-new-kf')?.addEventListener('click', createKeyframe);
  $('btn-save-note')?.addEventListener('click', saveToNotebook);
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

function formatWhen(ts) {
  if (!ts) return 'vừa xong';
  try {
    return new Date(ts).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function escapeAttr(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;');
}

document.addEventListener('DOMContentLoaded', init);
