/**
 * .chemx file parse / stringify / download.
 * Compatible with ChemViz3D exports (array or map of atoms).
 */

import { atomColor, atomRadius } from './atomData.js';

const MAX_BYTES = 10 * 1024 * 1024;

export function vec3(pos) {
  if (!pos) return { x: 0, y: 0, z: 0 };
  return {
    x: Number(pos.x) || 0,
    y: Number(pos.y) || 0,
    z: Number(pos.z) || 0,
  };
}

export function cloneAtoms(atoms) {
  const next = {};
  Object.entries(atoms || {}).forEach(([id, atom]) => {
    next[id] = {
      ...atom,
      id: atom.id || id,
      position: vec3(atom.position),
    };
  });
  return next;
}

export function cloneBonds(bonds) {
  return (bonds || []).map((bond) => ({
    ...bond,
    atomIds: [...bond.atomIds],
  }));
}

function atomsFromKeyframe(kf) {
  const list = Array.isArray(kf.atoms)
    ? kf.atoms
    : Object.entries(kf.atoms || {}).map(([id, atom]) => ({
        ...atom,
        id: atom?.id || id,
      }));

  const atoms = {};
  list.forEach((atom) => {
    const id = String(atom.id);
    const symbol = atom.symbol || '?';
    atoms[id] = {
      id,
      symbol,
      position: vec3(atom.position),
      charge: Number(atom.charge) || 0,
      color: atom.color || atomColor(symbol),
      atomicRadius: atom.atomicRadius || atomRadius(symbol),
      currentBonds: Number(atom.currentBonds) || 0,
    };
  });
  return atoms;
}

export function parseChemx(content) {
  let data;
  try {
    data = JSON.parse(content);
  } catch {
    throw new Error('File không phải JSON hợp lệ. Hãy chọn file .chemx hoặc .json.');
  }

  if (!data || !Array.isArray(data.keyframes) || data.keyframes.length === 0) {
    throw new Error('File thiếu danh sách keyframe. Không phát được hoạt ảnh.');
  }

  const keyframes = data.keyframes.map((kf, index) => {
    if (!Array.isArray(kf.bonds) && kf.bonds != null) {
      throw new Error(`Keyframe ${index + 1} có bonds không hợp lệ.`);
    }
    return {
      timestamp: Number(kf.timestamp) || index * 2000,
      atoms: atomsFromKeyframe(kf),
      bonds: cloneBonds(kf.bonds || []),
    };
  });

  const lastTs = keyframes[keyframes.length - 1].timestamp;
  const duration = Number(data.duration) || Math.max(lastTs, (keyframes.length - 1) * 2000);

  return {
    version: data.version || '1.0',
    metadata: {
      name: data.metadata?.name || 'Phản ứng chưa đặt tên',
      description: data.metadata?.description || '',
      created: data.metadata?.created || Date.now(),
    },
    duration,
    keyframes,
  };
}

export function stringifyChemx(data) {
  const serializable = {
    version: data.version || '1.0',
    metadata: data.metadata,
    duration: data.duration,
    keyframes: data.keyframes.map((kf) => ({
      timestamp: kf.timestamp,
      atoms: Object.values(kf.atoms).map((atom) => ({
        ...atom,
        position: vec3(atom.position),
      })),
      bonds: kf.bonds,
    })),
  };
  return JSON.stringify(serializable, null, 2);
}

export function framesToChemx(metadata, frames, stepMs = 2000) {
  if (!frames?.length) {
    throw new Error('Chưa có keyframe nào để xuất.');
  }
  const keyframes = frames.map((frame, index) => ({
    timestamp: index * stepMs,
    atoms: cloneAtoms(frame.atoms),
    bonds: cloneBonds(frame.bonds),
  }));
  return {
    version: '1.0',
    metadata: {
      name: metadata?.name || 'Phản ứng BioVerse',
      description: metadata?.description || '',
      created: metadata?.created || Date.now(),
    },
    duration: Math.max(0, (keyframes.length - 1) * stepMs),
    keyframes,
  };
}

export function downloadChemx(data, filename) {
  const blob = new Blob([stringifyChemx(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.chemx') ? filename : `${filename}.chemx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function readChemxFile(file) {
  const name = (file?.name || '').toLowerCase();
  if (!name.endsWith('.chemx') && !name.endsWith('.json')) {
    throw new Error('Hãy chọn file .chemx hoặc .json.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('File lớn hơn 10MB, không đọc được.');
  }
  const content = await file.text();
  return parseChemx(content);
}
