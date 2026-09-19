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
    frames: [
      {
        atoms: {
          h1: atom('h1', 'H', -3.2, 0, 0),
          h2: atom('h2', 'H', -2.4, 0, 0),
          cl1: atom('cl1', 'Cl', 2.3, 0, 0),
          cl2: atom('cl2', 'Cl', 3.3, 0, 0),
        },
        bonds: [bond('b_hh', 'h1', 'h2'), bond('b_clcl', 'cl1', 'cl2')],
      },
      {
        atoms: {
          h1: atom('h1', 'H', -1.3, 0, 0.15),
          h2: atom('h2', 'H', -0.5, 0, -0.15),
          cl1: atom('cl1', 'Cl', 0.5, 0, 0.15),
          cl2: atom('cl2', 'Cl', 1.5, 0, -0.15),
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
    frames: [
      {
        atoms: {
          h1: atom('h1', 'H', -3.4, 0, 0.8),
          h2: atom('h2', 'H', -2.6, 0, 0.8),
          h3: atom('h3', 'H', -3.4, 0, -0.8),
          h4: atom('h4', 'H', -2.6, 0, -0.8),
          o1: atom('o1', 'O', 2.4, 0, 0.3),
          o2: atom('o2', 'O', 3.2, 0, -0.3),
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
          o1: atom('o1', 'O', 0.6, 0, 0.4),
          o2: atom('o2', 'O', 1.2, 0, -0.4),
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
