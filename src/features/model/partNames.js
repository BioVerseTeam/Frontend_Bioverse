/**
 * Đổi tên mesh GLB (tiếng Anh / Blender) sang tiếng Việt cho học sinh THCS.
 * Ưu tiên cụm dài, rồi từ đơn; từ Anh còn sót bị bỏ, không hiện ra danh sách.
 */

const PHRASES = [
  ['contractile vacuole', 'không bào co bóp'],
  ['food vacuole', 'không bào tiêu hóa'],
  ['left ventricle', 'tâm thất trái'],
  ['right ventricle', 'tâm thất phải'],
  ['left atrium', 'tâm nhĩ trái'],
  ['right atrium', 'tâm nhĩ phải'],
  ['aortic valve', 'van động mạch chủ'],
  ['mitral valve', 'van hai lá'],
  ['tricuspid valve', 'van ba lá'],
  ['pulmonary valve', 'van động mạch phổi'],
  ['pulmonary artery', 'động mạch phổi'],
  ['pulmonary vein', 'tĩnh mạch phổi'],
  ['vena cava', 'tĩnh mạch chủ'],
  ['coronary artery', 'động mạch vành'],
  ['optic nerve', 'dây thần kinh thị giác'],
  ['spinal cord', 'tủy sống'],
  ['small intestine', 'ruột non'],
  ['large intestine', 'ruột già'],
  ['urinary bladder', 'bàng quang'],
  ['gall bladder', 'túi mật'],
  ['paramecium body', 'màng và tế bào chất'],
  ['os frontale', 'xương trán'],
  ['os parietale', 'xương đỉnh'],
  ['os occipitale', 'xương chẩm'],
  ['os temporale', 'xương thái dương'],
  ['os sphenoidale', 'xương bướm'],
  ['os ethmoidale', 'xương sàng'],
  ['os zygomaticum', 'xương gò má'],
  ['os palatinum', 'xương khẩu cái'],
  ['inferior turbinate', 'xương xoăn mũi dưới']
];

const SIDES = {
  left: 'trái',
  right: 'phải',
  upper: 'trên',
  lower: 'dưới',
  inner: 'trong',
  outer: 'ngoài',
  anterior: 'trước',
  posterior: 'sau',
  superior: 'trên',
  inferior: 'dưới',
  proximal: 'gần thân',
  distal: 'xa thân',
  medial: 'trong',
  lateral: 'ngoài',
  front: 'trước',
  back: 'sau',
  top: 'đỉnh',
  bottom: 'đáy',
  mid: 'giữa',
  middle: 'giữa',
  center: 'giữa',
  central: 'giữa'
};

const TERMS = {
  heart: 'tim',
  cardiac: 'tim',
  atrium: 'tâm nhĩ',
  atria: 'tâm nhĩ',
  ventricle: 'tâm thất',
  aorta: 'động mạch chủ',
  aortic: 'động mạch chủ',
  valve: 'van',
  mitral: 'van hai lá',
  tricuspid: 'van ba lá',
  pulmonary: 'phổi',
  pulmonic: 'phổi',
  coronary: 'vành tim',
  artery: 'động mạch',
  arteries: 'động mạch',
  vein: 'tĩnh mạch',
  veins: 'tĩnh mạch',
  vessel: 'mạch máu',
  vessels: 'mạch máu',
  blood: 'máu',
  lung: 'phổi',
  lungs: 'phổi',
  bronchus: 'phế quản',
  bronchi: 'phế quản',
  trachea: 'khí quản',
  diaphragm: 'cơ hoành',
  liver: 'gan',
  kidney: 'thận',
  kidneys: 'thận',
  spleen: 'lách',
  pancreas: 'tụy',
  stomach: 'dạ dày',
  intestine: 'ruột',
  intestines: 'ruột',
  colon: 'ruột kết',
  bowel: 'ruột',
  bladder: 'bàng quang',
  gallbladder: 'túi mật',
  bile: 'mật',
  brain: 'não',
  cerebrum: 'đại não',
  cerebellum: 'tiểu não',
  cortex: 'vỏ não',
  lobe: 'thùy',
  skull: 'hộp sọ',
  cranium: 'hộp sọ',
  frontal: 'xương trán',
  parietal: 'xương đỉnh',
  occipital: 'xương chẩm',
  temporal: 'xương thái dương',
  sphenoid: 'xương bướm',
  ethmoid: 'xương sàng',
  zygomatic: 'xương gò má',
  zygoma: 'xương gò má',
  mandible: 'xương hàm dưới',
  maxilla: 'xương hàm trên',
  palatine: 'xương khẩu cái',
  vomer: 'xương lá mía',
  lacrimal: 'xương lệ',
  turbinate: 'xương xoăn mũi',
  concha: 'xương xoăn mũi',
  jaw: 'hàm',
  tooth: 'răng',
  teeth: 'răng',
  eye: 'mắt',
  eyes: 'mắt',
  orbit: 'hốc mắt',
  ear: 'tai',
  nose: 'mũi',
  nasal: 'xương mũi',
  tongue: 'lưỡi',
  skin: 'da',
  muscle: 'cơ',
  muscles: 'cơ',
  bone: 'xương',
  bones: 'xương',
  rib: 'xương sườn',
  ribs: 'xương sườn',
  spine: 'cột sống',
  vertebra: 'đốt sống',
  vertebrae: 'đốt sống',
  pelvis: 'xương chậu',
  femur: 'xương đùi',
  tibia: 'xương chày',
  fibula: 'xương mác',
  humerus: 'xương cánh tay',
  radius: 'xương quay',
  ulna: 'xương trụ',
  clavicle: 'xương đòn',
  scapula: 'xương bả vai',
  sternum: 'xương ức',
  patella: 'xương bánh chè',
  cartilage: 'sụn',
  ligament: 'dây chằng',
  tendon: 'gân',
  nerve: 'dây thần kinh',
  nerves: 'dây thần kinh',
  neuron: 'nơron',
  cell: 'tế bào',
  nucleus: 'nhân',
  macronucleus: 'nhân lớn',
  micronucleus: 'nhân nhỏ',
  membrane: 'màng',
  cytoplasm: 'tế bào chất',
  pellicle: 'màng phim',
  organelle: 'bào quan',
  vacuole: 'không bào',
  contractile: 'co bóp',
  food: 'thức ăn',
  tissue: 'mô',
  organ: 'cơ quan',
  body: 'thân',
  head: 'đầu',
  neck: 'cổ',
  chest: 'ngực',
  thorax: 'lồng ngực',
  abdomen: 'bụng',
  arm: 'cánh tay',
  hand: 'bàn tay',
  finger: 'ngón tay',
  phalanx: 'đốt ngón',
  leg: 'chân',
  foot: 'bàn chân',
  toe: 'ngón chân',
  root: 'rễ',
  stem: 'thân',
  leaf: 'lá',
  leaves: 'lá',
  flower: 'hoa',
  fruit: 'quả',
  seed: 'hạt',
  petal: 'cánh hoa',
  bark: 'vỏ',
  shell: 'vỏ',
  cilia: 'lông rung',
  mitochondria: 'ty thể',
  chloroplast: 'lục lạp',
  wall: 'thành',
  base: 'đế',
  cap: 'nắp',
  lid: 'nắp',
  cover: 'nắp',
  interior: 'bên trong',
  exterior: 'bên ngoài',
  surface: 'bề mặt',
  layer: 'lớp',
  part: 'bộ phận',
  piece: 'mảnh',
  segment: 'đoạn',
  section: 'phần',
  model: 'mô hình',
  object: 'khối',
  paramecium: 'trùng giày',
  esophagus: 'thực quản',
  oesophagus: 'thực quản',
  pharynx: 'họng',
  larynx: 'thanh quản',
  thyroid: 'tuyến giáp',
  thymus: 'tuyến ức',
  uterus: 'tử cung',
  ovary: 'buồng trứng',
  testes: 'tinh hoàn',
  testis: 'tinh hoàn',
  prostate: 'tuyến tiền liệt',
  rectum: 'trực tràng',
  appendix: 'ruột thừa',
  myocardium: 'cơ tim',
  pericardium: 'màng ngoài tim',
  endocardium: 'nội tâm mạc',
  septum: 'vách',
  chamber: 'buồng',
  ramus: 'nhánh',
  condyle: 'lồi cầu',
  process: 'mỏm',
  suture: 'đường khớp',
  foramen: 'lỗ',
  sinus: 'xoang',
  vena: 'tĩnh mạch',
  cava: 'chủ'
};

const SKIP = new Set([
  'mesh', 'obj', 'geo', 'geom', 'geometry', 'group', 'node', 'scene',
  'armature', 'empty', 'null', 'gltf', 'sketchfab', 'material',
  'primitive', 'high', 'low', 'poly', 'lod', 'baked', 'output', 'stl',
  'visible', 'interactive', 'human', 'exploding', 'instance', 'clone',
  'copy', 'default', 'object', 'cube', 'sphere', 'plane', 'cylinder',
  'the', 'and', 'of', 'a', 'an', 'in', 'on', 'to', 'for'
]);

const VIETNAMESE = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
const KNOWN_VI = new Set([
  ...Object.values(TERMS),
  ...Object.values(SIDES),
  ...PHRASES.map(([, vi]) => vi)
].flatMap((value) => String(value).split(/\s+/)));

export function looksVietnamese(value) {
  return VIETNAMESE.test(String(value || ''));
}

export function preferVietnamese(...values) {
  return values.find((value) => typeof value === 'string' && value.trim() && looksVietnamese(value)) || '';
}

export function looksScientific(value) {
  const text = String(value || '').trim();
  if (!text || looksVietnamese(text)) return false;
  if (/\b(os|musculus|arteria|vena|nervus|homo sapiens|caudatum)\b/i.test(text)) return true;
  if (/\b(vacuole|body|valve|bone|left|right|skull|heart|cell)\b/i.test(text)) return false;
  return /^[A-Z][a-z]+ [a-z]{3,}$/.test(text);
}

export function sideFromKey(raw) {
  const text = normalizeSource(raw).toLowerCase();
  const bits = [];
  if (/\bleft\b|_left|left_/.test(text) && !/right/.test(text)) bits.push('trái');
  else if (/\bright\b|_right|right_/.test(text)) bits.push('phải');
  if (text.includes('anterior')) bits.push('trước');
  else if (text.includes('posterior')) bits.push('sau');
  if (text.includes('superior') || /\bupper\b/.test(text)) bits.push('trên');
  else if (text.includes('inferior') || /\blower\b/.test(text)) bits.push('dưới');
  const num = text.match(/(?:^|[_\s-])(\d{1,2})(?:\s|$)/);
  if (num) {
    const n = Number(num[1]);
    if (n >= 1 && n <= 20) bits.push(String(n));
  }
  return bits.join(' ');
}

export function vietnamesePartName(raw, fallbackIndex = 1) {
  const source = String(raw || '').trim();
  if (!source) return `Bộ phận ${fallbackIndex}`;
  if (looksVietnamese(source)) return source.replace(/\s+/g, ' ').trim();

  let working = tokenize(normalizeSource(source)).join(' ');
  const sides = [];
  PHRASES
    .slice()
    .sort((a, b) => b[0].length - a[0].length)
    .forEach(([en, vi]) => {
      const pattern = new RegExp(`\\b${en.replace(/\s+/g, '[\\s_-]+')}\\b`, 'ig');
      working = working.replace(pattern, ` ${vi} `);
    });

  const tokens = working.split(/\s+/).filter(Boolean);
  const body = [];
  tokens.forEach((token) => {
    if (SKIP.has(token)) return;
    if (/^\d+$/.test(token)) {
      body.push(String(Number(token)));
      return;
    }
    if (SIDES[token]) {
      sides.push(SIDES[token]);
      return;
    }
    if (TERMS[token]) {
      body.push(TERMS[token]);
      return;
    }
    if (looksVietnamese(token) || KNOWN_VI.has(token)) {
      body.push(token);
    }
  });

  const name = [uniqueJoin(body), uniqueJoin(sides)].filter(Boolean).join(' ').trim();
  return capitalizeVi(name || `Bộ phận ${fallbackIndex}`);
}

export function describePartPlacement(origin) {
  if (!origin) return 'Nằm trong khối mô hình.';
  const lr = origin.x > 0.22 ? 'bên phải' : origin.x < -0.22 ? 'bên trái' : 'trục giữa';
  const ud = origin.y > 0.22 ? 'phía trên' : origin.y < -0.22 ? 'phía dưới' : 'tầm giữa';
  const fb = origin.z > 0.22 ? 'phía trước' : origin.z < -0.22 ? 'phía sau' : '';
  const bits = [ud, lr, fb].filter(Boolean);
  return `Nằm ở ${bits.join(', ')} của mô hình khi nhìn thẳng.`;
}

function normalizeSource(raw) {
  return String(raw)
    .replace(/:STL_Output.*/ig, ' ')
    .replace(/sketchfab/ig, ' ')
    .replace(/[.]glb$/i, ' ');
}

function tokenize(raw) {
  return String(raw)
    .replace(/[.](\d+)$/g, ' $1')
    .replace(/[_./+:\-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9à-ỹ]+/gi, ''))
    .filter(Boolean);
}

function uniqueJoin(items) {
  const seen = new Set();
  const out = [];
  items.forEach((item) => {
    if (!item || seen.has(item)) return;
    seen.add(item);
    out.push(item);
  });
  return out.join(' ');
}

function capitalizeVi(value) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
