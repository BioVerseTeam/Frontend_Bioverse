/**
 * First-time authoring coach for THCS students.
 * One short instruction, one action, no editor jargon.
 */

const PREFS_KEY = 'bioverse_rx_studio';

export const EDIT_PATH = {
  GATE: 'gate',
  SAMPLE: 'sample',
  CREATE: 'create',
  FREE: 'free',
};

export const EQUATION_CHIPS = [
  { name: 'H₂ + Cl₂ → 2 HCl', description: 'Hidro gặp clo' },
  { name: '2 H₂ + O₂ → 2 H₂O', description: 'Hidro cháy trong oxi' },
];

export const STATE_WORD = 'Trạng thái';

export function stateLabel(index) {
  return `${STATE_WORD} ${index + 1}`;
}

export const STATE_FLOW = [
  'Sắp',
  'Lưu 1',
  'Đổi chỗ',
  'Lưu 2',
  'Lưu 3 · tương tác',
  '▶ Phim',
];

export const SAMPLE_STEPS = [
  {
    id: 'pick',
    say: 'Chọn một phản ứng để tập. Bấm vào tấm bạn thích.',
    waitFor: 'pick',
    tools: [],
    palette: false,
    dock: 'center',
  },
  {
    id: 'look',
    say: 'Đây là các quả cầu lúc chưa phản ứng.',
    hint: 'Bấm Tiếp theo. Bước sau bạn sẽ bấm Lưu để máy nhớ hình này.',
    waitFor: 'next',
    cta: 'Tiếp theo',
    tools: [],
    palette: false,
    spotlight: 'next',
    dock: 'top',
  },
  {
    id: 'snap',
    say: 'Bấm “Lưu trạng thái 1” để máy nhớ hình đang thấy.',
    hint: 'Sau này bấm ▶, máy làm phim từ hình này sang hình sau. Thanh nối cũng đổi theo.',
    waitFor: 'snap',
    cta: 'Lưu trạng thái 1',
    tools: [],
    palette: false,
    flow: true,
    flowAt: 1,
    spotlight: 'save',
    dock: 'top',
  },
  {
    id: 'drag',
    say: 'Kéo một quả cầu sang chỗ khác. Đây là lúc đang đổi chỗ.',
    waitFor: 'drag',
    cta: 'Tiếp theo',
    tools: ['select'],
    palette: false,
    pulseAtom: true,
    flow: true,
    flowAt: 2,
    spotlight: 'next',
    dock: 'top',
  },
  {
    id: 'snap2',
    say: 'Bấm “Lưu trạng thái 2”. Máy nhớ thêm một hình nữa.',
    hint: 'Phim sẽ chạy từ hình 1 sang hình 2.\nNếu bạn đổi thanh nối, phim cũng đổi theo.',
    waitFor: 'snap2',
    cta: 'Lưu trạng thái 2',
    tools: [],
    palette: false,
    flow: true,
    flowAt: 3,
    spotlight: 'save',
    dock: 'top',
  },
  {
    id: 'cutOld',
    say: 'Bấm nút đỏ “Cắt liên kết” dưới đây.',
    hint: 'Bấm thanh nối, hoặc bấm một quả cầu đang dính cặp đó.\nHai quả clo to: bấm thẳng vào một quả clo.',
    waitFor: 'cutOld',
    cta: 'Tiếp theo',
    tools: ['breakBond'],
    pickTool: true,
    palette: false,
    flow: true,
    flowAt: 4,
    spotlight: 'tool',
    dock: 'top',
  },
  {
    id: 'joinNew',
    say: 'Bấm nút “Nối liên kết” dưới đây.',
    hint: 'Rồi bấm quả cầu thứ nhất. Nó sáng lên. Bấm quả cầu thứ hai — thanh nối hiện ra.',
    pulseAtom: true,
    waitFor: 'joinNew',
    cta: 'Tiếp theo',
    tools: ['addBond'],
    pickTool: true,
    palette: false,
    flow: true,
    flowAt: 4,
    spotlight: 'tool',
    dock: 'top',
  },
  {
    id: 'interact',
    say: 'Máy xếp gọn các phân tử mới: mỗi cặp đứng gần nhau, thanh nối vừa phải.',
    hint: 'Bước sau bấm Lưu để máy nhớ hình này.',
    waitFor: 'next',
    cta: 'Tiếp theo, đi lưu lần 3',
    tools: [],
    palette: false,
    tidyPose: true,
    flow: true,
    flowAt: 4,
    spotlight: 'next',
    dock: 'top',
  },
  {
    id: 'snap3',
    say: 'Bấm “Lưu trạng thái 3” để máy nhớ hình cuối.',
    hint: 'Ba hình đã nhớ sẽ thành một đoạn phim khi bạn bấm ▶.',
    waitFor: 'snap3',
    cta: 'Lưu trạng thái 3',
    tools: [],
    palette: false,
    tidyPose: true,
    flow: true,
    flowAt: 4,
    spotlight: 'save',
    dock: 'top',
  },
  {
    id: 'play',
    say: 'Bấm ▶ để xem phim.\nMáy tự chạy từ hình 1 sang hình 2 rồi hình 3.',
    waitFor: 'play',
    cta: 'Tiếp theo',
    tools: [],
    palette: false,
    spotlight: 'play',
    flow: true,
    flowAt: 5,
    dock: 'top',
  },
  {
    id: 'save',
    say: 'Hay quá! Cất bài này vào vở — chỉ mình bạn thấy.',
    waitFor: 'save',
    cta: 'Cất vào vở của mình',
    tools: [],
    palette: false,
    dock: 'top',
  },
];

export const CREATE_STEPS = [
  {
    id: 'name',
    say: 'Đặt tên phương trình. Gõ, hoặc bấm một ví dụ.',
    waitFor: 'name',
    cta: 'Xong, đi đặt nguyên tử',
    tools: [],
    palette: false,
    dock: 'center',
  },
  {
    id: 'place',
    say: 'Bấm màu nguyên tố, rồi bấm xuống sàn. Sắp xong mới lưu.',
    hint: '',
    waitFor: 'place',
    cta: 'Sắp xong, đi nối',
    tools: ['addAtom', 'select', 'deleteAtom'],
    palette: true,
    flow: true,
    flowAt: 0,
    dock: 'top',
  },
  {
    id: 'bond',
    say: 'Bấm quả cầu thứ nhất, rồi quả cầu thứ hai. Thanh nối hiện ra — đó là liên kết do bạn tạo.',
    hint: 'Nối nhầm? Bấm vào thanh để cắt. Phim sau này dùng đúng các thanh bạn nối.',
    waitFor: 'bond',
    cta: 'Nối xong, đi lưu',
    skip: 'Chưa cần nối',
    tools: ['addBond', 'breakBond', 'select'],
    palette: false,
    flow: true,
    flowAt: 0,
    dock: 'top',
  },
  {
    id: 'snap',
    say: 'Bấm “Lưu trạng thái 1”. Máy nhớ hình các quả cầu và thanh nối lúc này.',
    hint: 'Không lưu thì máy không nhớ hình này để làm phim.',
    waitFor: 'snap',
    cta: 'Lưu trạng thái 1',
    tools: ['select', 'addAtom', 'addBond', 'breakBond', 'deleteAtom'],
    palette: true,
    flow: true,
    flowAt: 1,
    dock: 'top',
  },
  {
    id: 'rearrange',
    say: 'Kéo quả cầu như lúc đã phản ứng. Đổi chỗ xong mới bấm Lưu lần 2.',
    hint: '',
    waitFor: 'drag',
    cta: 'Đổi chỗ xong, đi lưu',
    tools: ['select'],
    palette: false,
    pulseAtom: true,
    flow: true,
    flowAt: 2,
    dock: 'top',
  },
  {
    id: 'snap2',
    say: 'Bấm “Lưu trạng thái 2”. Máy nhớ thêm một hình nữa.',
    hint: 'Phim sẽ chạy từ hình 1 sang hình 2. Nếu bạn đổi thanh nối, phim cũng đổi theo.',
    waitFor: 'snap2',
    cta: 'Lưu trạng thái 2',
    tools: ['select', 'addAtom', 'addBond', 'deleteAtom'],
    palette: false,
    flow: true,
    flowAt: 3,
    spotlight: 'save',
    dock: 'top',
  },
  {
    id: 'rearrange2',
    say: 'Cắt thanh nối cũ, rồi nối lại từng cặp mới.\nXong mới lưu hình 3.',
    waitFor: 'drag',
    cta: 'Tiếp theo',
    tools: ['select'],
    palette: false,
    pulseAtom: true,
    flow: true,
    flowAt: 4,
    spotlight: 'next',
    dock: 'top',
  },
  {
    id: 'snap3',
    say: 'Bấm “Lưu trạng thái 3” để máy nhớ hình cuối.',
    hint: 'Ba hình đã nhớ sẽ thành một đoạn phim khi bạn bấm ▶.',
    waitFor: 'snap3',
    cta: 'Lưu trạng thái 3',
    tools: [],
    palette: false,
    flow: true,
    flowAt: 4,
    spotlight: 'save',
    dock: 'top',
  },
  {
    id: 'play',
    say: 'Bấm ▶ để xem phim. Máy tự chạy từ hình 1 sang hình 2 rồi hình 3.',
    waitFor: 'save',
    cta: 'Cất vào vở của mình',
    tools: ['select'],
    palette: false,
    spotlight: 'play',
    flow: true,
    flowAt: 5,
    dock: 'top',
  },
];

export function getSteps(path) {
  if (path === EDIT_PATH.SAMPLE) return SAMPLE_STEPS;
  if (path === EDIT_PATH.CREATE) return CREATE_STEPS;
  return [];
}

export function getCoachStep(path, index) {
  return getSteps(path)[index] || null;
}

export function toolAllowed(path, stepIndex, toolId) {
  if (path === EDIT_PATH.FREE || path === EDIT_PATH.GATE || !path) return true;
  const step = getCoachStep(path, stepIndex);
  if (!step) return true;
  if (!Array.isArray(step.tools) || step.tools.length === 0) return false;
  return step.tools.includes(toolId);
}

export function isGuidedPath(path) {
  return path === EDIT_PATH.GATE || path === EDIT_PATH.SAMPLE || path === EDIT_PATH.CREATE;
}

export function readStudioPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStudioPrefs(patch) {
  const next = { ...readStudioPrefs(), ...patch };
  localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  return next;
}

export function shouldShowGate() {
  const prefs = readStudioPrefs();
  return !prefs.skipGuide && !prefs.completedOnce;
}

export function rememberSkipGuide() {
  writeStudioPrefs({ skipGuide: true });
}

export function rememberGuideComplete() {
  writeStudioPrefs({ completedOnce: true });
}

export function shouldShowHowTo() {
  return !readStudioPrefs().hideHowTo;
}

export function rememberHideHowTo() {
  writeStudioPrefs({ hideHowTo: true });
}

export function resetStudioPrefs() {
  localStorage.removeItem(PREFS_KEY);
}

export const MASCOT_SVG = `
<svg class="rx-guide-flask" viewBox="0 0 64 80" aria-hidden="true">
  <path d="M24 8h16v10l10 18c4 8 4 22-10 28H24C10 58 10 44 14 36L24 18V8z" fill="#f3e8ff" stroke="#2d2d2d" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="M22 8h20" stroke="#2d2d2d" stroke-width="3" stroke-linecap="round"/>
  <path d="M20 48c6 8 18 8 24 0" fill="none" stroke="#7c3aed" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="28" cy="36" r="2.2" fill="#2d2d2d"/>
  <circle cx="38" cy="36" r="2.2" fill="#2d2d2d"/>
  <path d="M29 43c3 3 6 3 9 0" fill="none" stroke="#2d2d2d" stroke-width="2" stroke-linecap="round"/>
  <circle cx="44" cy="22" r="3" fill="#fff9c4" stroke="#2d2d2d" stroke-width="1.6"/>
</svg>
`;
