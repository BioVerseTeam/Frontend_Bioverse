/**
 * Personal reaction notebook.
 * Official sample lessons stay public; student-authored equations stay
 * on this device, isolated by the signed-in account (or a guest key).
 */

import { getAccessToken, getCurrentUser } from '../../utils/storage.js';
import { cloneAtoms, cloneBonds } from './chemx.js';

const PREFIX = 'bioverse_notebook_';
const MAX_ITEMS = 40;

export function notebookOwnerKey() {
  const user = getCurrentUser();
  const token = getAccessToken();
  if (token && user?.id != null) return `user:${user.id}`;
  if (token && user?.email) return `user:${String(user.email).toLowerCase()}`;
  return 'guest';
}

export function isNotebookLoggedIn() {
  return notebookOwnerKey() !== 'guest';
}

function storageKey() {
  return `${PREFIX}${notebookOwnerKey()}`;
}

function readAll() {
  try {
    const raw = localStorage.getItem(storageKey());
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items) {
  localStorage.setItem(storageKey(), JSON.stringify(items));
}

function cloneFrames(frames) {
  return (frames || []).map((frame) => ({
    atoms: cloneAtoms(frame.atoms),
    bonds: cloneBonds(frame.bonds),
  }));
}

export function listMyReactions() {
  return readAll()
    .slice()
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export function getMyReaction(id) {
  return readAll().find((item) => item.id === id) || null;
}

export function saveMyReaction({
  id = null,
  name,
  description = '',
  frames,
  sourceLessonId = null,
}) {
  const title = String(name || '').trim();
  if (!title) {
    throw new Error('Đặt tên phương trình trước khi lưu sổ tay.');
  }
  if (!frames?.length) {
    throw new Error('Hãy lưu ít nhất một trạng thái rồi mới cất vào sổ tay.');
  }

  const items = readAll();
  const now = Date.now();
  const existing = id ? items.find((item) => item.id === id) : null;

  if (existing) {
    existing.name = title;
    existing.description = String(description || '');
    existing.frames = cloneFrames(frames);
    existing.sourceLessonId = sourceLessonId || existing.sourceLessonId || null;
    existing.updatedAt = now;
    writeAll(items);
    return existing;
  }

  if (items.length >= MAX_ITEMS) {
    throw new Error(`Sổ tay tối đa ${MAX_ITEMS} phương trình. Hãy xóa bớt bài cũ.`);
  }

  const created = {
    id: `mine_${now}_${Math.random().toString(36).slice(2, 8)}`,
    name: title,
    description: String(description || ''),
    frames: cloneFrames(frames),
    sourceLessonId: sourceLessonId || null,
    createdAt: now,
    updatedAt: now,
    ownerKey: notebookOwnerKey(),
  };
  items.push(created);
  writeAll(items);
  return created;
}

export function deleteMyReaction(id) {
  writeAll(readAll().filter((item) => item.id !== id));
}

export function personalLessonId(id) {
  return `personal:${id}`;
}

export function parsePersonalLessonId(lessonId) {
  if (!String(lessonId || '').startsWith('personal:')) return null;
  return String(lessonId).slice('personal:'.length);
}
