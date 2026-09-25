/**
 * Bài phản ứng mẫu KHTN 8–9. Mỗi bài là chuỗi keyframe sẵn để xem hoặc sửa.
 */

import { framesToChemx } from './chemx.js';

const atom = (id, symbol, x, y, z) => ({
  id,
  symbol,
  position: { x, y, z },
  charge: 0,
});

const bond = (id, a, b, type = 'covalent') => ({
  id,
  atomIds: [a, b],
  order: 1,
  strength: 1,
  bondType: type,
});

export const REACTION_LESSONS = [
  {
    id: 'h2-cl2',
    title: 'H₂ + Cl₂ → 2 HCl',
    subtitle: 'Hidro kết hợp clo tạo hidoclorua',
    grade: 'Lớp 8–9',
    name: 'H2 + Cl2 → 2 HCl',
    description: 'Hai phân tử hai nguyên tử tiến lại, đứt liên kết cũ và tạo hai phân tử HCl.',
    coach: {
      look: 'H₂ và Cl₂ đang đứng tách.\nBấm Tiếp theo. Bước sau bạn sẽ lưu hình này.',
      snap: 'Bấm “Lưu trạng thái 1” để máy nhớ hình đang thấy.',
      drag: 'Kéo Hydro hoặc Clo lại gần nhau.',
      snap2: 'Bấm “Lưu trạng thái 2”. Máy nhớ thêm một hình nữa.',
      cutOld: 'Bấm nút đỏ “Cắt liên kết” dưới đây.',
      cutOldHint: 'Rồi bấm thanh nối, hoặc bấm một quả cầu hidro.\nVới clo: bấm một quả cầu clo (hai quả to che thanh).',
      joinNew: 'Bấm nút “Nối liên kết” dưới đây.',
      joinNewHint: 'Bấm một quả cầu hidro (nó sáng lên), rồi bấm một quả cầu clo.\nLàm lại với cặp còn lại.',
      interact: 'Hai phân tử HCl đã được xếp gọn: mỗi hidro dính một clo.',
      snap3: 'Bấm “Lưu trạng thái 3” để máy nhớ hình cuối.',
      play: 'Bấm ▶ để xem phim.\nMáy tự chạy từ hình 1 sang hình 2 rồi hình 3.',
      save: 'Xong phim HCl rồi. Cất vào vở — chỉ mình bạn thấy.',
    },
    rebondCuts: [
      { pair: 'H-H', label: 'Bấm thanh nối hai quả cầu hidro' },
      { pair: 'Cl-Cl', label: 'Bấm một quả cầu clo, hoặc thanh giữa hai clo' },
    ],
    rebondJoins: [
      { pair: 'Cl-H', label: 'Bấm quả cầu hidro, rồi bấm quả cầu clo — cặp 1' },
      { pair: 'Cl-H', label: 'Bấm hidro còn lại, rồi bấm clo còn lại — cặp 2' },
    ],
    frames: [
      {
        atoms: {
          h1: atom('h1', 'H', -3.2, 0, 0),
          h2: atom('h2', 'H', -2.4, 0, 0),
          cl1: atom('cl1', 'Cl', 2.2, 0, 0),
          cl2: atom('cl2', 'Cl', 4.0, 0, 0),
        },
        bonds: [bond('b_hh', 'h1', 'h2'), bond('b_clcl', 'cl1', 'cl2')],
      },
      {
        atoms: {
          h1: atom('h1', 'H', -1.3, 0, 0.15),
          h2: atom('h2', 'H', -0.5, 0, -0.15),
          cl1: atom('cl1', 'Cl', 0.4, 0, 0.2),
          cl2: atom('cl2', 'Cl', 2.2, 0, -0.2),
        },
        bonds: [bond('b_hh', 'h1', 'h2'), bond('b_clcl', 'cl1', 'cl2')],
      },
      {
        atoms: {
          h1: atom('h1', 'H', -0.7, 0, 0.7),
          h2: atom('h2', 'H', -0.7, 0, -0.7),
          cl1: atom('cl1', 'Cl', 0.5, 0, 0.7),
          cl2: atom('cl2', 'Cl', 0.5, 0, -0.7),
        },
        bonds: [bond('b_hcl1', 'h1', 'cl1'), bond('b_hcl2', 'h2', 'cl2')],
      },
    ],
  },
  {
    id: 'h2-o2',
    title: '2 H₂ + O₂ → 2 H₂O',
    subtitle: 'Hidro cháy trong oxi tạo nước',
    grade: 'Lớp 8',
    name: '2 H2 + O2 → 2 H2O',
    description: 'Hai phân tử hidro và một phân tử oxi tái sắp xếp thành hai phân tử nước.',
    coach: {
      look: 'Hai H₂ và một O₂ lúc chưa cháy.\nBấm Tiếp theo. Bước sau bạn sẽ lưu hình này.',
      snap: 'Bấm “Lưu trạng thái 1” để máy nhớ hình đang thấy.',
      drag: 'Kéo một quả cầu lại gần oxi.',
      snap2: 'Bấm “Lưu trạng thái 2”. Máy nhớ thêm một hình nữa.',
      cutOld: 'Bấm nút đỏ “Cắt liên kết” dưới đây.',
      cutOldHint: 'Rồi bấm từng thanh nối hai hidro.\nXong thì bấm thanh nối hai oxi.',
      joinNew: 'Bấm nút “Nối liên kết” dưới đây.',
      joinNewHint: 'Bấm một quả cầu hidro (nó sáng lên), rồi bấm một quả cầu oxi.\nLàm vậy đủ 4 lần.',
      interact: 'Hai phân tử nước đã được xếp gọn: mỗi oxi dính hai hidro.',
      snap3: 'Bấm “Lưu trạng thái 3” để máy nhớ hình cuối.',
      play: 'Bấm ▶ để xem phim.\nMáy tự chạy từ hình 1 sang hình 2 rồi hình 3.',
      save: 'Xong phim nước rồi. Cất vào vở — chỉ mình bạn thấy.',
    },
    rebondCuts: [
      { pair: 'H-H', label: 'Bấm thanh nối cặp hidro thứ nhất' },
      { pair: 'H-H', label: 'Bấm thanh nối cặp hidro thứ hai' },
      { pair: 'O-O', label: 'Bấm thanh nối hai quả cầu oxi' },
    ],
    rebondJoins: [
      { pair: 'H-O', label: 'Bấm hidro, rồi bấm oxi — lần 1' },
      { pair: 'H-O', label: 'Bấm hidro, rồi bấm oxi — lần 2' },
      { pair: 'H-O', label: 'Bấm hidro, rồi bấm oxi — lần 3' },
      { pair: 'H-O', label: 'Bấm hidro, rồi bấm oxi — lần 4' },
    ],
    frames: [
      {
        atoms: {
          h1: atom('h1', 'H', -3.4, 0, 0.8),
          h2: atom('h2', 'H', -2.6, 0, 0.8),
          h3: atom('h3', 'H', -3.4, 0, -0.8),
          h4: atom('h4', 'H', -2.6, 0, -0.8),
          o1: atom('o1', 'O', 2.2, 0, 0.3),
          o2: atom('o2', 'O', 3.6, 0, -0.3),
        },
        bonds: [
          bond('b_h2a', 'h1', 'h2'),
          bond('b_h2b', 'h3', 'h4'),
          bond('b_o2', 'o1', 'o2'),
        ],
      },
      {
        atoms: {
          h1: atom('h1', 'H', -1.2, 0, 0.7),
          h2: atom('h2', 'H', -0.5, 0, 0.7),
          h3: atom('h3', 'H', -1.2, 0, -0.7),
          h4: atom('h4', 'H', -0.5, 0, -0.7),
          o1: atom('o1', 'O', 0.5, 0, 0.4),
          o2: atom('o2', 'O', 1.9, 0, -0.4),
        },
        bonds: [
          bond('b_h2a', 'h1', 'h2'),
          bond('b_h2b', 'h3', 'h4'),
          bond('b_o2', 'o1', 'o2'),
        ],
      },
      {
        atoms: {
          h1: atom('h1', 'H', -0.7, 0, 1.0),
          h2: atom('h2', 'H', 0.5, 0, 1.0),
          h3: atom('h3', 'H', -0.7, 0, -1.0),
          h4: atom('h4', 'H', 0.5, 0, -1.0),
          o1: atom('o1', 'O', 0, 0, 0.7),
          o2: atom('o2', 'O', 0, 0, -0.7),
        },
        bonds: [
          bond('b_w1a', 'o1', 'h1'),
          bond('b_w1b', 'o1', 'h2'),
          bond('b_w2a', 'o2', 'h3'),
          bond('b_w2b', 'o2', 'h4'),
        ],
      },
    ],
  },
  {
    id: 'n2-h2',
    title: 'N₂ + 3 H₂ → 2 NH₃',
    subtitle: 'Tổng hợp amoniac (Haber)',
    grade: 'Lớp 9',
    name: 'N2 + 3 H2 → 2 NH3',
    description: 'Phân tử nitơ và hidro tiến lại, đứt liên kết cũ và tạo hai phân tử amoniac.',
    frames: [
      {
        atoms: {
          n1: atom('n1', 'N', -2.8, 0, 0.2),
          n2: atom('n2', 'N', -1.4, 0, -0.2),
          h1: atom('h1', 'H', 1.6, 0, 1.2),
          h2: atom('h2', 'H', 2.4, 0, 1.2),
          h3: atom('h3', 'H', 1.6, 0, 0),
          h4: atom('h4', 'H', 2.4, 0, 0),
          h5: atom('h5', 'H', 1.6, 0, -1.2),
          h6: atom('h6', 'H', 2.4, 0, -1.2),
        },
        bonds: [
          bond('b_n2', 'n1', 'n2'),
          bond('b_h1', 'h1', 'h2'),
          bond('b_h2', 'h3', 'h4'),
          bond('b_h3', 'h5', 'h6'),
        ],
      },
      {
        atoms: {
          n1: atom('n1', 'N', -1.0, 0, 0.3),
          n2: atom('n2', 'N', 0.2, 0, -0.3),
          h1: atom('h1', 'H', 0.8, 0, 1.0),
          h2: atom('h2', 'H', 1.5, 0, 1.0),
          h3: atom('h3', 'H', 0.8, 0, 0),
          h4: atom('h4', 'H', 1.5, 0, 0),
          h5: atom('h5', 'H', 0.8, 0, -1.0),
          h6: atom('h6', 'H', 1.5, 0, -1.0),
        },
        bonds: [
          bond('b_n2', 'n1', 'n2'),
          bond('b_h1', 'h1', 'h2'),
          bond('b_h2', 'h3', 'h4'),
          bond('b_h3', 'h5', 'h6'),
        ],
      },
      {
        atoms: {
          n1: atom('n1', 'N', -1.2, 0, 0.8),
          n2: atom('n2', 'N', 1.2, 0, -0.8),
          h1: atom('h1', 'H', -2.0, 0, 1.4),
          h2: atom('h2', 'H', -0.4, 0, 1.4),
          h3: atom('h3', 'H', -1.2, 0, 0.1),
          h4: atom('h4', 'H', 2.0, 0, -1.4),
          h5: atom('h5', 'H', 0.4, 0, -1.4),
          h6: atom('h6', 'H', 1.2, 0, -0.1),
        },
        bonds: [
          bond('b_nh1', 'n1', 'h1'),
          bond('b_nh2', 'n1', 'h2'),
          bond('b_nh3', 'n1', 'h3'),
          bond('b_nh4', 'n2', 'h4'),
          bond('b_nh5', 'n2', 'h5'),
          bond('b_nh6', 'n2', 'h6'),
        ],
      },
    ],
  },
  {
    id: 'h2-f2',
    title: 'H₂ + F₂ → 2 HF',
    subtitle: 'Hidro kết hợp flo tạo hidroflo',
    grade: 'Lớp 8–9',
    name: 'H2 + F2 → 2 HF',
    description: 'Hai phân tử hai nguyên tử tiến lại và tạo hai phân tử HF.',
    frames: [
      {
        atoms: {
          h1: atom('h1', 'H', -3.2, 0, 0),
          h2: atom('h2', 'H', -2.4, 0, 0),
          f1: atom('f1', 'F', 2.2, 0, 0),
          f2: atom('f2', 'F', 3.5, 0, 0),
        },
        bonds: [bond('b_hh', 'h1', 'h2'), bond('b_ff', 'f1', 'f2')],
      },
      {
        atoms: {
          h1: atom('h1', 'H', -1.2, 0, 0.15),
          h2: atom('h2', 'H', -0.4, 0, -0.15),
          f1: atom('f1', 'F', 0.5, 0, 0.2),
          f2: atom('f2', 'F', 1.8, 0, -0.2),
        },
        bonds: [bond('b_hh', 'h1', 'h2'), bond('b_ff', 'f1', 'f2')],
      },
      {
        atoms: {
          h1: atom('h1', 'H', -0.7, 0, 0.7),
          h2: atom('h2', 'H', -0.7, 0, -0.7),
          f1: atom('f1', 'F', 0.5, 0, 0.7),
          f2: atom('f2', 'F', 0.5, 0, -0.7),
        },
        bonds: [bond('b_hf1', 'h1', 'f1'), bond('b_hf2', 'h2', 'f2')],
      },
    ],
  },
  {
    id: 'c-o2',
    title: 'C + O₂ → CO₂',
    subtitle: 'Cacbon cháy trong oxi tạo khí cácbonic',
    grade: 'Lớp 8',
    name: 'C + O2 → CO2',
    description: 'Nguyên tử cacbon kết hợp phân tử oxi thành phân tử CO₂ thẳng.',
    frames: [
      {
        atoms: {
          c1: atom('c1', 'C', -2.8, 0, 0),
          o1: atom('o1', 'O', 1.8, 0, 0.25),
          o2: atom('o2', 'O', 3.1, 0, -0.25),
        },
        bonds: [bond('b_o2', 'o1', 'o2')],
      },
      {
        atoms: {
          c1: atom('c1', 'C', -0.8, 0, 0),
          o1: atom('o1', 'O', 0.6, 0, 0.2),
          o2: atom('o2', 'O', 1.9, 0, -0.2),
        },
        bonds: [bond('b_o2', 'o1', 'o2')],
      },
      {
        atoms: {
          c1: atom('c1', 'C', 0, 0, 0),
          o1: atom('o1', 'O', -1.4, 0, 0),
          o2: atom('o2', 'O', 1.4, 0, 0),
        },
        bonds: [bond('b_co1', 'c1', 'o1'), bond('b_co2', 'c1', 'o2')],
      },
    ],
  },
  {
    id: 'n2-o2',
    title: 'N₂ + O₂ → 2 NO',
    subtitle: 'Nitơ oxi hóa tạo nitơ monoxit',
    grade: 'Lớp 9',
    name: 'N2 + O2 → 2 NO',
    description: 'Hai phân tử hai nguyên tử tái sắp xếp thành hai phân tử NO.',
    frames: [
      {
        atoms: {
          n1: atom('n1', 'N', -3.2, 0, 0.2),
          n2: atom('n2', 'N', -1.9, 0, -0.2),
          o1: atom('o1', 'O', 1.8, 0, 0.25),
          o2: atom('o2', 'O', 3.1, 0, -0.25),
        },
        bonds: [bond('b_n2', 'n1', 'n2'), bond('b_o2', 'o1', 'o2')],
      },
      {
        atoms: {
          n1: atom('n1', 'N', -1.3, 0, 0.2),
          n2: atom('n2', 'N', -0.2, 0, -0.2),
          o1: atom('o1', 'O', 0.5, 0, 0.25),
          o2: atom('o2', 'O', 1.8, 0, -0.25),
        },
        bonds: [bond('b_n2', 'n1', 'n2'), bond('b_o2', 'o1', 'o2')],
      },
      {
        atoms: {
          n1: atom('n1', 'N', -0.9, 0, 0.7),
          n2: atom('n2', 'N', -0.9, 0, -0.7),
          o1: atom('o1', 'O', 0.5, 0, 0.7),
          o2: atom('o2', 'O', 0.5, 0, -0.7),
        },
        bonds: [bond('b_no1', 'n1', 'o1'), bond('b_no2', 'n2', 'o2')],
      },
    ],
  },
  {
    id: 'na-cl2',
    title: '2 Na + Cl₂ → 2 NaCl',
    subtitle: 'Natri kết hợp clo tạo muối ăn',
    grade: 'Lớp 8–9',
    name: '2 Na + Cl2 → 2 NaCl',
    description: 'Hai nguyên tử natri và một phân tử clo tạo hai đơn vị NaCl.',
    frames: [
      {
        atoms: {
          na1: atom('na1', 'Na', -3.2, 0, 0.8),
          na2: atom('na2', 'Na', -3.2, 0, -0.8),
          cl1: atom('cl1', 'Cl', 2.0, 0, 0.2),
          cl2: atom('cl2', 'Cl', 3.7, 0, -0.2),
        },
        bonds: [bond('b_clcl', 'cl1', 'cl2')],
      },
      {
        atoms: {
          na1: atom('na1', 'Na', -1.2, 0, 0.7),
          na2: atom('na2', 'Na', -1.2, 0, -0.7),
          cl1: atom('cl1', 'Cl', 0.6, 0, 0.2),
          cl2: atom('cl2', 'Cl', 2.2, 0, -0.2),
        },
        bonds: [bond('b_clcl', 'cl1', 'cl2')],
      },
      {
        atoms: {
          na1: atom('na1', 'Na', -1.0, 0, 0.9),
          na2: atom('na2', 'Na', -1.0, 0, -0.9),
          cl1: atom('cl1', 'Cl', 0.6, 0, 0.9),
          cl2: atom('cl2', 'Cl', 0.6, 0, -0.9),
        },
        bonds: [
          bond('b_nacl1', 'na1', 'cl1', 'ionic'),
          bond('b_nacl2', 'na2', 'cl2', 'ionic'),
        ],
      },
    ],
  },
  {
    id: 'mg-o2',
    title: '2 Mg + O₂ → 2 MgO',
    subtitle: 'Magie cháy trong oxi tạo oxit magie',
    grade: 'Lớp 8',
    name: '2 Mg + O2 → 2 MgO',
    description: 'Hai nguyên tử magie và một phân tử oxi tạo hai đơn vị MgO.',
    frames: [
      {
        atoms: {
          mg1: atom('mg1', 'Mg', -3.2, 0, 0.8),
          mg2: atom('mg2', 'Mg', -3.2, 0, -0.8),
          o1: atom('o1', 'O', 1.8, 0, 0.25),
          o2: atom('o2', 'O', 3.1, 0, -0.25),
        },
        bonds: [bond('b_o2', 'o1', 'o2')],
      },
      {
        atoms: {
          mg1: atom('mg1', 'Mg', -1.2, 0, 0.7),
          mg2: atom('mg2', 'Mg', -1.2, 0, -0.7),
          o1: atom('o1', 'O', 0.5, 0, 0.25),
          o2: atom('o2', 'O', 1.8, 0, -0.25),
        },
        bonds: [bond('b_o2', 'o1', 'o2')],
      },
      {
        atoms: {
          mg1: atom('mg1', 'Mg', -0.9, 0, 0.85),
          mg2: atom('mg2', 'Mg', -0.9, 0, -0.85),
          o1: atom('o1', 'O', 0.6, 0, 0.85),
          o2: atom('o2', 'O', 0.6, 0, -0.85),
        },
        bonds: [
          bond('b_mgo1', 'mg1', 'o1', 'ionic'),
          bond('b_mgo2', 'mg2', 'o2', 'ionic'),
        ],
      },
    ],
  },
  {
    id: 'co-o2',
    title: '2 CO + O₂ → 2 CO₂',
    subtitle: 'Cacbon monoxit cháy thành cácbonic',
    grade: 'Lớp 9',
    name: '2 CO + O2 → 2 CO2',
    description: 'Hai phân tử CO và một phân tử O₂ tạo hai phân tử CO₂.',
    frames: [
      {
        atoms: {
          c1: atom('c1', 'C', -3.2, 0, 0.9),
          o1: atom('o1', 'O', -1.9, 0, 0.9),
          c2: atom('c2', 'C', -3.2, 0, -0.9),
          o2: atom('o2', 'O', -1.9, 0, -0.9),
          o3: atom('o3', 'O', 2.0, 0, 0.25),
          o4: atom('o4', 'O', 3.3, 0, -0.25),
        },
        bonds: [
          bond('b_co1', 'c1', 'o1'),
          bond('b_co2', 'c2', 'o2'),
          bond('b_o2', 'o3', 'o4'),
        ],
      },
      {
        atoms: {
          c1: atom('c1', 'C', -1.4, 0, 0.8),
          o1: atom('o1', 'O', -0.2, 0, 0.8),
          c2: atom('c2', 'C', -1.4, 0, -0.8),
          o2: atom('o2', 'O', -0.2, 0, -0.8),
          o3: atom('o3', 'O', 0.8, 0, 0.2),
          o4: atom('o4', 'O', 2.0, 0, -0.2),
        },
        bonds: [
          bond('b_co1', 'c1', 'o1'),
          bond('b_co2', 'c2', 'o2'),
          bond('b_o2', 'o3', 'o4'),
        ],
      },
      {
        atoms: {
          c1: atom('c1', 'C', -0.2, 0, 1.0),
          o1: atom('o1', 'O', -1.5, 0, 1.0),
          o3: atom('o3', 'O', 1.1, 0, 1.0),
          c2: atom('c2', 'C', -0.2, 0, -1.0),
          o2: atom('o2', 'O', -1.5, 0, -1.0),
          o4: atom('o4', 'O', 1.1, 0, -1.0),
        },
        bonds: [
          bond('b_a1', 'c1', 'o1'),
          bond('b_a2', 'c1', 'o3'),
          bond('b_b1', 'c2', 'o2'),
          bond('b_b2', 'c2', 'o4'),
        ],
      },
    ],
  },
  {
    id: 'so2-o2',
    title: '2 SO₂ + O₂ → 2 SO₃',
    subtitle: 'Lưu huỳnh dioxit oxi hóa thành SO₃',
    grade: 'Lớp 9',
    name: '2 SO2 + O2 → 2 SO3',
    description: 'Hai phân tử SO₂ và một phân tử O₂ tạo hai phân tử SO₃.',
    frames: [
      {
        atoms: {
          s1: atom('s1', 'S', -3.0, 0, 1.0),
          o1: atom('o1', 'O', -4.2, 0, 1.0),
          o2: atom('o2', 'O', -1.8, 0, 1.0),
          s2: atom('s2', 'S', -3.0, 0, -1.0),
          o3: atom('o3', 'O', -4.2, 0, -1.0),
          o4: atom('o4', 'O', -1.8, 0, -1.0),
          o5: atom('o5', 'O', 2.0, 0, 0.25),
          o6: atom('o6', 'O', 3.3, 0, -0.25),
        },
        bonds: [
          bond('b_s1a', 's1', 'o1'),
          bond('b_s1b', 's1', 'o2'),
          bond('b_s2a', 's2', 'o3'),
          bond('b_s2b', 's2', 'o4'),
          bond('b_o2', 'o5', 'o6'),
        ],
      },
      {
        atoms: {
          s1: atom('s1', 'S', -1.4, 0, 0.9),
          o1: atom('o1', 'O', -2.5, 0, 0.9),
          o2: atom('o2', 'O', -0.3, 0, 0.9),
          s2: atom('s2', 'S', -1.4, 0, -0.9),
          o3: atom('o3', 'O', -2.5, 0, -0.9),
          o4: atom('o4', 'O', -0.3, 0, -0.9),
          o5: atom('o5', 'O', 0.8, 0, 0.2),
          o6: atom('o6', 'O', 2.0, 0, -0.2),
        },
        bonds: [
          bond('b_s1a', 's1', 'o1'),
          bond('b_s1b', 's1', 'o2'),
          bond('b_s2a', 's2', 'o3'),
          bond('b_s2b', 's2', 'o4'),
          bond('b_o2', 'o5', 'o6'),
        ],
      },
      {
        atoms: {
          s1: atom('s1', 'S', -0.4, 0, 1.1),
          o1: atom('o1', 'O', -1.6, 0, 1.5),
          o2: atom('o2', 'O', 0.8, 0, 1.5),
          o5: atom('o5', 'O', -0.4, 0, 0.2),
          s2: atom('s2', 'S', -0.4, 0, -1.1),
          o3: atom('o3', 'O', -1.6, 0, -1.5),
          o4: atom('o4', 'O', 0.8, 0, -1.5),
          o6: atom('o6', 'O', -0.4, 0, -0.2),
        },
        bonds: [
          bond('b_a1', 's1', 'o1'),
          bond('b_a2', 's1', 'o2'),
          bond('b_a3', 's1', 'o5'),
          bond('b_b1', 's2', 'o3'),
          bond('b_b2', 's2', 'o4'),
          bond('b_b3', 's2', 'o6'),
        ],
      },
    ],
  },
];

export function lessonToChemx(lesson) {
  return framesToChemx(
    {
      name: lesson.name,
      description: lesson.description,
      created: Date.now(),
    },
    lesson.frames
  );
}

export const DEFAULT_REACTION = lessonToChemx(REACTION_LESSONS[0]);
