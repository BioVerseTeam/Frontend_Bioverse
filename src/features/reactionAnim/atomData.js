/**
 * CPK-ish atom colors, radii, Vietnamese names, and bond styles
 * for the molecular reaction studio.
 */

const TEXTBOOK_ATOMS = [
  ['H', 1, 1, 1, 'Hidro', '#F5F5F5', 0.32],
  ['He', 2, 1, 18, 'Heli', '#D9FFFF', 0.31],
  ['Li', 3, 2, 1, 'Liti', '#CC80FF', 1.45],
  ['Be', 4, 2, 2, 'Beri', '#C2FF00', 1.05],
  ['B', 5, 2, 13, 'Bo', '#FFB5B5', 0.82],
  ['C', 6, 2, 14, 'Cacbon', '#4A4A4A', 0.70],
  ['N', 7, 2, 15, 'Nitơ', '#2E5EA2', 0.65],
  ['O', 8, 2, 16, 'Oxi', '#E53E3E', 0.60],
  ['F', 9, 2, 17, 'Flo', '#6FCF6F', 0.52],
  ['Ne', 10, 2, 18, 'Neon', '#B3E3F5', 0.38],
  ['Na', 11, 3, 1, 'Natri', '#AB5CF2', 1.40],
  ['Mg', 12, 3, 2, 'Magie', '#8AFF00', 1.20],
  ['Al', 13, 3, 13, 'Nhôm', '#BFA6A6', 1.10],
  ['Si', 14, 3, 14, 'Silic', '#D4A574', 1.00],
  ['P', 15, 3, 15, 'Photpho', '#ED8936', 0.95],
  ['S', 16, 3, 16, 'Lưu huỳnh', '#E6C200', 0.95],
  ['Cl', 17, 3, 17, 'Clo', '#38A169', 0.78],
  ['Ar', 18, 3, 18, 'Argon', '#80D1E3', 0.71],
  ['K', 19, 4, 1, 'Kali', '#8F40D4', 1.55],
  ['Ca', 20, 4, 2, 'Canxi', '#3DFF00', 1.40],
  ['Sc', 21, 4, 3, 'Scandi', '#E6E6E6', 1.30],
  ['Ti', 22, 4, 4, 'Titan', '#BFC2C7', 1.25],
  ['V', 23, 4, 5, 'Vanadi', '#A6A6AB', 1.22],
  ['Cr', 24, 4, 6, 'Crom', '#8A99C7', 1.18],
  ['Mn', 25, 4, 7, 'Mangan', '#9C7AC7', 1.17],
  ['Fe', 26, 4, 8, 'Sắt', '#E06633', 1.20],
  ['Co', 27, 4, 9, 'Coban', '#F090A0', 1.16],
  ['Ni', 28, 4, 10, 'Niken', '#50D050', 1.15],
  ['Cu', 29, 4, 11, 'Đồng', '#C88033', 1.15],
  ['Zn', 30, 4, 12, 'Kẽm', '#7D80B0', 1.15],
  ['Ga', 31, 4, 13, 'Gali', '#C28F8F', 1.10],
  ['Ge', 32, 4, 14, 'Gecmani', '#668F8F', 1.05],
  ['As', 33, 4, 15, 'Asen', '#BD80E3', 1.00],
  ['Se', 34, 4, 16, 'Selen', '#FFA100', 0.95],
  ['Br', 35, 4, 17, 'Brom', '#A62929', 0.88],
  ['Kr', 36, 4, 18, 'Kripton', '#5CB8D1', 0.80],
  ['Rb', 37, 5, 1, 'Rubidi', '#702EB0', 1.60],
  ['Sr', 38, 5, 2, 'Stronti', '#00FF00', 1.45],
  ['Ag', 47, 5, 11, 'Bạc', '#C0C0C0', 1.25],
  ['Cd', 48, 5, 12, 'Cadimi', '#FFD98F', 1.20],
  ['Sn', 50, 5, 14, 'Thiếc', '#668080', 1.20],
  ['I', 53, 5, 17, 'Iot', '#940094', 0.98],
  ['Xe', 54, 5, 18, 'Xenon', '#429EB0', 0.90],
  ['Ba', 56, 6, 2, 'Bari', '#00C900', 1.55],
  ['Au', 79, 6, 11, 'Vàng', '#FFD123', 1.25],
  ['Hg', 80, 6, 12, 'Thủy ngân', '#B8B8D0', 1.20],
  ['Pb', 82, 6, 14, 'Chì', '#575961', 1.30],
];

export const ATOM_COLORS = Object.fromEntries(TEXTBOOK_ATOMS.map(([symbol, , , , , color]) => [symbol, color]));
export const ATOM_RADIUS = Object.fromEntries(TEXTBOOK_ATOMS.map(([symbol, , , , , , radius]) => [symbol, radius]));
export const ATOM_NAMES = Object.fromEntries(TEXTBOOK_ATOMS.map(([symbol, , , , name]) => [symbol, name]));
export const PERIODIC_LAYOUT = TEXTBOOK_ATOMS.map(([symbol, z, period, group]) => ({
  symbol, z, period, group,
}));

export const PALETTE_COMMON = ['H', 'C', 'N', 'O', 'Cl', 'S', 'P'];
export const PALETTE_MORE = ['Na', 'Mg', 'Al', 'Si', 'K', 'Ca', 'Fe', 'Cu', 'Zn', 'F', 'Br', 'I', 'B'];
export const PALETTE_SYMBOLS = [...PALETTE_COMMON, 'Na', 'Fe', 'Cu'];
export const ALL_ATOM_SYMBOLS = PERIODIC_LAYOUT.map((cell) => cell.symbol);

export function normalizeSymbol(raw) {
  const text = String(raw || '').replace(/[^A-Za-z]/g, '');
  if (!text) return '';
  return text[0].toUpperCase() + text.slice(1, 2).toLowerCase();
}

function foldVi(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase();
}

export function findTextbookAtoms(query) {
  const q = foldVi(query).trim();
  if (!q) return PERIODIC_LAYOUT;
  return PERIODIC_LAYOUT.filter((cell) => {
    const name = foldVi(ATOM_NAMES[cell.symbol] || '');
    const symbol = foldVi(cell.symbol);
    return symbol.includes(q) || name.includes(q) || String(cell.z) === q;
  });
}

export function isTextbookAtom(symbol) {
  return PERIODIC_LAYOUT.some((cell) => cell.symbol === symbol);
}

export const BOND_TYPES = {
  covalent: {
    id: 'covalent',
    name: 'Liên kết cộng hóa trị',
    hint: 'Chia sẻ electron giữa hai nguyên tử.',
    color: '#00864c',
    radius: 0.09,
    dashed: false,
  },
  ionic: {
    id: 'ionic',
    name: 'Liên kết ion',
    hint: 'Hút tĩnh điện giữa ion trái dấu.',
    color: '#db3237',
    radius: 0.05,
    dashed: true,
  },
  metallic: {
    id: 'metallic',
    name: 'Liên kết kim loại',
    hint: 'Electron tự do trong mạng tinh thể.',
    color: '#76716a',
    radius: 0.1,
    dashed: false,
  },
  hydrogen: {
    id: 'hydrogen',
    name: 'Liên kết hidro',
    hint: 'Liên kết yếu, thường trong nước và protein.',
    color: '#2e5ea2',
    radius: 0.03,
    dashed: true,
  },
  pi: {
    id: 'pi',
    name: 'Liên kết π',
    hint: 'Electron p chồng lên nhau, thường ở liên kết đôi.',
    color: '#2d2d2d',
    radius: 0.05,
    dashed: false,
  },
};

export function atomColor(symbol) {
  return ATOM_COLORS[symbol] || '#9f7aea';
}

export function atomRadius(symbol) {
  return ATOM_RADIUS[symbol] || 0.7;
}

export function atomName(symbol) {
  return ATOM_NAMES[symbol] || symbol;
}

export function bondStyle(type) {
  return BOND_TYPES[type] || BOND_TYPES.covalent;
}
