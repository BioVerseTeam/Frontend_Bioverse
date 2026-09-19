/**
 * CPK-ish atom colors, radii, Vietnamese names, and bond styles
 * for the molecular reaction studio.
 */

export const ATOM_COLORS = {
  H: '#F5F5F5',
  B: '#FFB5B5',
  C: '#4A4A4A',
  N: '#2E5EA2',
  O: '#E53E3E',
  F: '#6FCF6F',
  Na: '#AB5CF2',
  Mg: '#8AFF00',
  Al: '#BFA6A6',
  Si: '#D4A574',
  P: '#ED8936',
  S: '#E6C200',
  Cl: '#38A169',
  K: '#8F40D4',
  Ca: '#808090',
  Fe: '#ED8936',
  Cu: '#C88033',
  Zn: '#7D80B0',
  Br: '#A62929',
  I: '#805AD5',
};

export const ATOM_RADIUS = {
  H: 0.32,
  B: 0.82,
  C: 0.70,
  N: 0.65,
  O: 0.60,
  F: 0.52,
  Na: 1.40,
  Mg: 1.20,
  Al: 1.10,
  Si: 1.00,
  P: 0.95,
  S: 0.95,
  Cl: 0.78,
  K: 1.55,
  Ca: 1.40,
  Fe: 1.20,
  Cu: 1.15,
  Zn: 1.15,
  Br: 0.88,
  I: 0.98,
};

export const ATOM_NAMES = {
  H: 'Hidro',
  B: 'Bo',
  C: 'Cacbon',
  N: 'Nitơ',
  O: 'Oxi',
  F: 'Flo',
  Na: 'Natri',
  Mg: 'Magie',
  Al: 'Nhôm',
  Si: 'Silic',
  P: 'Photpho',
  S: 'Lưu huỳnh',
  Cl: 'Clo',
  K: 'Kali',
  Ca: 'Canxi',
  Fe: 'Sắt',
  Cu: 'Đồng',
  Zn: 'Kẽm',
  Br: 'Brom',
  I: 'Iot',
};

export const PALETTE_SYMBOLS = ['H', 'C', 'N', 'O', 'Cl', 'S', 'P', 'Na', 'Fe', 'Cu'];

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
