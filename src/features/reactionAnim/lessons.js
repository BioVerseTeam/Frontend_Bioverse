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
