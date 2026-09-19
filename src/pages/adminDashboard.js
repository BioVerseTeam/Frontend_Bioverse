/**
 * Admin intake desk — route into one domain at a time.
 * Motion: rubber-stamp counts + highlighter on the attention queue.
 */

import gsap from 'gsap';
import { setupNavbarAuth } from '../utils/authNavbar.js';
import { AuthService } from '../features/auth/authService.js';
import { requireAdmin } from '../utils/adminGuard.js';
import { showToast } from '../components/modal.js';
import { listAdminModels, listR2Assets } from '../api/adminBioModelApi.js';
import { getAdminDesk, listAdminUsers } from '../api/adminUserApi.js';
import { listAdminRoles } from '../api/adminRoleApi.js';

const state = {
  models: [],
  users: [],
  roles: [],
  r2Count: 0,
  r2Ok: true,
  modelTotal: 0,
  userTotal: 0,
  roleTotal: 0,
  modelsOk: true,
  usersOk: true,
  rolesOk: true,
  jumpHits: [],
  jumpIndex: 0,
  loading: false,
  reduceMotion: false,
  motion: null,
  census: null,
  chartOpen: false
};

document.addEventListener('DOMContentLoaded', () => {
  try {
    setupNavbarAuth();
  } catch (err) {
    console.warn('Admin navbar failed', err);
  }
  if (!requireAdmin({
    loginNext: '/admin.html',
    message: 'Tài khoản học sinh không vào được phòng điều hành.'
  })) return;

  const user = AuthService.getUser();
  const nameEl = document.getElementById('admin-operator-name');
  if (nameEl) nameEl.textContent = user?.name || user?.fullName || 'Quản trị viên';

  const dateEl = document.getElementById('admin-desk-date');
  if (dateEl) {
    dateEl.textContent = new Intl.DateTimeFormat('vi-VN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }).format(new Date());
  }

  bindDesk();
  try {
    setupMotion();
  } catch (err) {
    console.warn('Admin motion failed', err);
  }
  loadDesk();
});

function bindDesk() {
  document.getElementById('admin-refresh')?.addEventListener('click', () => loadDesk({ fromRefresh: true }));
  document.getElementById('admin-retry')?.addEventListener('click', () => loadDesk());
  document.getElementById('admin-census-chart-toggle')?.addEventListener('click', toggleCensusChart);

  const form = document.getElementById('admin-jump-form');
  const input = document.getElementById('admin-jump');
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    goJump(state.jumpIndex);
  });
  input?.addEventListener('input', () => updateJump(input.value));
  input?.addEventListener('focus', () => {
    if (input.value.trim()) updateJump(input.value);
  });
  input?.addEventListener('keydown', onJumpKey);

  document.addEventListener('click', (event) => {
    if (!form?.contains(event.target)) closeJump();
  });

  document.addEventListener('keydown', (event) => {
    const typing = event.target instanceof HTMLElement && (
      event.target.matches('input, textarea, select') || event.target.isContentEditable
    );
    if (event.key === '/' && !typing) {
      event.preventDefault();
      input?.focus();
      input?.select();
      return;
    }
    if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === 'm') window.location.href = '/admin-models.html';
    if (key === 'u') window.location.href = '/admin-users.html';
    if (key === 'r') window.location.href = '/admin-roles.html';
    if (key === 'n') window.location.href = '/admin-models.html?create=1';
  });
}

function setupMotion() {
  const root = document.getElementById('admin-workspace');
  state.motion?.revert();
  state.motion = gsap.matchMedia();
  state.motion.add(
    {
      reduce: '(prefers-reduced-motion: reduce)',
      motion: '(prefers-reduced-motion: no-preference)'
    },
    (context) => {
      state.reduceMotion = Boolean(context.conditions.reduce);
      const bays = root?.querySelectorAll('[data-desk-bay]');
      const leaveFns = [];
      if (!state.reduceMotion && bays) {
        bays.forEach((bay) => {
          const enter = () => gsap.to(bay, { y: -4, rotation: -0.35, duration: 0.18, ease: 'power2.out', overwrite: 'auto' });
          const leave = () => gsap.to(bay, { y: 0, rotation: 0, duration: 0.2, ease: 'power2.out', overwrite: 'auto' });
          bay.addEventListener('pointerenter', enter);
          bay.addEventListener('pointerleave', leave);
          leaveFns.push(() => {
            bay.removeEventListener('pointerenter', enter);
            bay.removeEventListener('pointerleave', leave);
          });
        });
      }
      return () => leaveFns.forEach((fn) => fn());
    },
    root
  );
}

async function loadDesk({ fromRefresh = false } = {}) {
  if (state.loading) return;
  state.loading = true;
  const workspace = document.getElementById('admin-workspace');
  const refreshBtn = document.getElementById('admin-refresh');
  const refreshIcon = refreshBtn?.querySelector('[data-refresh-icon]');
  workspace?.setAttribute('aria-busy', 'true');
  if (refreshBtn) refreshBtn.disabled = true;
  if (refreshIcon && !state.reduceMotion) {
    gsap.to(refreshIcon, { rotation: '+=360', duration: 0.45, ease: 'power2.inOut' });
  }

  try {
    const deskRes = await settle(getAdminDesk());
    if (deskRes.ok) {
      applyDeskPayload(deskRes.value);
    } else {
      await loadDeskParallel();
    }
    await loadDeskRoles();

    const failures = [
      !state.modelsOk && 'nhân mẫu',
      !state.usersOk && 'người dùng',
      !state.rolesOk && 'vai trò'
    ].filter(Boolean);

    hideError();
    await ensureCensus();
    renderCounts();
    renderCensusChart({ animate: state.chartOpen });
    renderAttention();
    stampDesk();

    const live = document.getElementById('admin-live');
    if (live) {
      live.textContent = `Đã tải ${state.modelTotal} mẫu, ${state.census?.newThisMonth ?? 0} người dùng mới tháng này, ${state.userTotal} trong sổ.`;
    }

    if (!state.modelsOk && !state.usersOk && !state.rolesOk) {
      showError('Không tải được bàn ca. Kiểm tra backend rồi thử lại.');
      showToast('Không tải được bàn ca.', 'error');
    } else if (failures.length) {
      showToast(`Không tải được ${failures.join(', ')}. Các phần còn lại vẫn dùng được.`, 'warning');
    } else if (fromRefresh) {
      showToast('Đã làm mới bàn ca.', 'success');
    }
  } catch (err) {
    showError(friendlyError(err.message, 'Không tải được số liệu. Kiểm tra backend rồi thử lại.'));
    showToast(friendlyError(err.message, 'Không tải được bàn ca.'), 'error');
  } finally {
    state.loading = false;
    workspace?.removeAttribute('aria-busy');
    if (refreshBtn) refreshBtn.disabled = false;
  }
}

async function settle(promise) {
  try {
    return { ok: true, value: await promise };
  } catch (error) {
    return { ok: false, error };
  }
}

function applyDeskPayload(desk) {
  const models = desk?.models || { items: [], totalElements: 0 };
  const users = desk?.users || { items: [], totalElements: 0 };
  state.modelsOk = !desk?.modelsError;
  state.usersOk = !desk?.usersError;
  state.models = state.modelsOk ? (models.items || []) : [];
  state.modelTotal = state.modelsOk ? Number(models.totalElements ?? state.models.length) : 0;
  state.users = state.usersOk ? (users.items || []) : [];
  state.userTotal = state.usersOk ? Number(users.totalElements ?? state.users.length) : 0;
  state.census = normalizeCensus(desk?.census);
  state.r2Ok = desk?.r2Ok !== false;
  state.r2Count = Array.isArray(desk?.r2Assets) ? desk.r2Assets.length : 0;
}

async function loadDeskRoles() {
  const rolesRes = await settle(listAdminRoles({ page: 0, size: 50 }));
  state.rolesOk = rolesRes.ok;
  state.roles = rolesRes.ok ? (rolesRes.value?.items || []) : [];
  state.roleTotal = rolesRes.ok ? Number(rolesRes.value?.totalElements ?? state.roles.length) : 0;
}

async function loadDeskParallel() {
  const [modelsRes, usersRes, r2Res] = await Promise.all([
    settle(listAdminModels({ page: 0, size: 20 })),
    settle(listAdminUsers({ page: 0, size: 20 })),
    settle(listR2Assets())
  ]);

  state.modelsOk = modelsRes.ok;
  state.usersOk = usersRes.ok;
  state.models = modelsRes.ok ? (modelsRes.value?.items || []) : [];
  state.modelTotal = modelsRes.ok ? Number(modelsRes.value?.totalElements ?? state.models.length) : 0;
  state.users = usersRes.ok ? (usersRes.value?.items || []) : [];
  state.userTotal = usersRes.ok ? Number(usersRes.value?.totalElements ?? state.users.length) : 0;
  state.r2Ok = r2Res.ok;
  state.r2Count = r2Res.ok && Array.isArray(r2Res.value) ? r2Res.value.length : 0;
  state.census = null;
}

function friendlyError(message, fallback) {
  const text = String(message || '').trim();
  if (!text || text.includes('Lỗi hệ thống')) return fallback;
  return text;
}

function renderCounts() {
  const incomplete = state.models.filter(isIncomplete).length;
  const census = state.census;
  const students = census
    ? census.students
    : state.users.filter((user) => roleOf(user) === 'STUDENT').length;
  const locked = census
    ? census.locked
    : state.users.filter((user) => user.status && user.status !== 'ACTIVE').length;
  const systemRoles = state.roles.filter((role) => ['ADMIN', 'STUDENT'].includes(String(role.code || '').toUpperCase())).length;

  stampNumber('stat-models', state.modelsOk ? state.modelTotal : null);
  stampNumber('stat-incomplete', state.modelsOk ? incomplete : null);
  if (state.r2Ok) stampNumber('stat-r2', state.r2Count);
  else {
    const r2El = document.getElementById('stat-r2');
    if (r2El) r2El.textContent = '—';
  }
  stampNumber('stat-new-week', state.usersOk ? census?.newThisWeek ?? 0 : null);
  stampNumber('stat-new-month', state.usersOk ? census?.newThisMonth ?? 0 : null);
  stampNumber('stat-users', state.usersOk ? (census?.total ?? state.userTotal) : null);
  stampNumber('stat-students', state.usersOk ? students : null);
  stampNumber('stat-locked', state.usersOk ? locked : null);
  stampNumber('stat-roles', state.rolesOk ? state.roleTotal : null);
  stampNumber('stat-system-roles', state.rolesOk ? systemRoles : null);
}

async function ensureCensus() {
  if (state.census?.months?.length) return;
  if (!state.usersOk) {
    state.census = emptyCensus();
    return;
  }
  if (state.users.length >= state.userTotal) {
    state.census = censusFromUsers(state.users, state.userTotal);
    return;
  }
  const size = Math.min(500, Math.max(state.userTotal || 50, 50));
  const extra = await settle(listAdminUsers({ page: 0, size }));
  if (extra.ok) {
    const items = extra.value?.items || [];
    const total = Number(extra.value?.totalElements ?? items.length);
    state.census = censusFromUsers(items, total);
    return;
  }
  state.census = censusFromUsers(state.users, state.userTotal);
}

function normalizeCensus(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const months = Array.isArray(raw.months)
    ? raw.months.map((item) => ({
      year: Number(item.year) || 0,
      month: Number(item.month) || 0,
      label: item.label || `Thg ${item.month}`,
      count: Number(item.count) || 0
    }))
    : [];
  if (!months.length) return null;
  return {
    total: Number(raw.total) || 0,
    students: Number(raw.students) || 0,
    locked: Number(raw.locked) || 0,
    newThisWeek: Number(raw.newThisWeek) || 0,
    newThisMonth: Number(raw.newThisMonth) || 0,
    months
  };
}

function censusFromUsers(users, total) {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const buckets = new Map();
  for (let i = 11; i >= 0; i -= 1) {
    const cursor = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    buckets.set(key, {
      year: cursor.getFullYear(),
      month: cursor.getMonth() + 1,
      label: `Thg ${cursor.getMonth() + 1}`,
      count: 0
    });
  }

  let newThisWeek = 0;
  let newThisMonth = 0;
  let students = 0;
  let locked = 0;
  users.forEach((user) => {
    if (roleOf(user) === 'STUDENT') students += 1;
    if (user.status && user.status !== 'ACTIVE') locked += 1;
    const created = parseCreatedAt(user.createdAt);
    if (!created) return;
    if (created >= weekAgo) newThisWeek += 1;
    if (created >= monthStart) newThisMonth += 1;
    const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.count += 1;
  });

  return {
    total: Number(total) || users.length,
    students,
    locked,
    newThisWeek,
    newThisMonth,
    months: [...buckets.values()]
  };
}

function emptyCensus() {
  return censusFromUsers([], 0);
}

function parseCreatedAt(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function roleOf(user) {
  const role = user?.role;
  if (!role) return 'STUDENT';
  if (typeof role === 'string') return role.replace(/^ROLE_/i, '').toUpperCase();
  return String(role.code || role.name || 'STUDENT').replace(/^ROLE_/i, '').toUpperCase();
}

function toggleCensusChart() {
  const chart = document.getElementById('admin-census-chart');
  const btn = document.getElementById('admin-census-chart-toggle');
  if (!chart || !btn) return;
  state.chartOpen = chart.hidden;
  chart.hidden = !state.chartOpen;
  syncChartToggle(btn);
  if (state.chartOpen) {
    renderCensusChart({ animate: true });
    chart.scrollIntoView({ block: 'nearest', behavior: state.reduceMotion ? 'auto' : 'smooth' });
  }
}

function syncChartToggle(btn = document.getElementById('admin-census-chart-toggle')) {
  if (!btn) return;
  btn.setAttribute('aria-expanded', String(Boolean(state.chartOpen)));
  const label = btn.querySelector('[data-chart-label]');
  if (label) label.textContent = state.chartOpen ? 'Thu biểu đồ' : 'Xem biểu đồ tháng';
}

function renderCensusChart({ animate = false } = {}) {
  const wrap = document.getElementById('admin-census-chart-bars');
  const empty = document.getElementById('admin-census-chart-empty');
  const chart = document.getElementById('admin-census-chart');
  if (!wrap) return;

  syncChartToggle();
  if (chart) chart.hidden = !state.chartOpen;

  const months = state.census?.months || [];
  const total = months.reduce((sum, item) => sum + Number(item.count || 0), 0);
  if (empty) empty.hidden = total > 0;
  if (!months.length || total === 0) {
    wrap.innerHTML = '';
    return;
  }

  const max = Math.max(1, ...months.map((item) => Number(item.count) || 0));
  wrap.innerHTML = months.map((item, index) => {
    const count = Number(item.count) || 0;
    const height = Math.max(4, Math.round((count / max) * 118));
    const now = index === months.length - 1 ? ' is-now' : '';
    const label = String(item.month || '').padStart(2, '0');
    return `
      <div class="admin-census-col${now}" title="${escapeAttr(`${item.label || label} ${item.year}: ${count} tài khoản`)}">
        <span class="admin-census-count">${count ? count : ''}</span>
        <span class="admin-census-bar" style="height:${height}px"></span>
        <span class="admin-census-label">${escapeHtml(label)}</span>
      </div>
    `;
  }).join('');

  if (state.chartOpen && animate && !state.reduceMotion) {
    gsap.fromTo(wrap.querySelectorAll('.admin-census-bar'), {
      scaleY: 0.08
    }, {
      scaleY: 1,
      duration: 0.42,
      stagger: 0.035,
      ease: 'power2.out',
      overwrite: true
    });
  }
}

function renderAttention() {
  const list = document.getElementById('admin-attention-list');
  if (!list) return;

  const incomplete = state.models.filter(isIncomplete);
  const hidden = state.models.filter((model) => model.isActive === false);
  const lockedOnPage = state.users.filter((user) => user.status && user.status !== 'ACTIVE');
  const lockedCount = Math.max(Number(state.census?.locked) || 0, lockedOnPage.length);
  const unlabeledR2 = state.r2Ok ? Math.max(0, state.r2Count - state.modelTotal) : 0;
  const items = [];

  if (incomplete.length) {
    items.push({
      href: '/admin-models.html',
      title: `${incomplete.length} mẫu thiếu lớp hoặc loại`,
      detail: 'Học sinh sẽ khó lọc trên catalog. Mở nhãn mẫu để bổ sung.'
    });
  }
  if (hidden.length) {
    items.push({
      href: '/admin-models.html',
      title: `${hidden.length} mẫu đang ẩn`,
      detail: 'File R2 còn, nhưng không hiện trên trang Sinh học.'
    });
  }
  if (unlabeledR2 > 0) {
    items.push({
      href: '/admin-models.html?create=1',
      title: `${unlabeledR2} file R2 chưa gắn nhãn`,
      detail: 'Chọn file đã upload, rồi điền tên và lớp.'
    });
  }
  if (lockedCount) {
    items.push({
      href: '/admin-users.html?status=INACTIVE',
      title: `${lockedCount} tài khoản đang khóa`,
      detail: 'Học sinh này không đăng nhập được cho đến khi mở lại.'
    });
  }

  if (!items.length) {
    list.innerHTML = '<p class="admin-attention-empty">Không có việc tồn. Catalog và tài khoản đang ổn.</p>';
    return;
  }

  list.innerHTML = items.map((item) => `
    <a class="admin-attention-item" href="${escapeAttr(item.href)}">
      <span>
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.detail)}</span>
      </span>
      <span class="material-symbols-outlined text-[18px] shrink-0">arrow_forward</span>
    </a>
  `).join('');

  highlightAttention(list.querySelectorAll('.admin-attention-item'));
}

function updateJump(raw) {
  const q = String(raw || '').trim().toLowerCase();
  const panel = document.getElementById('admin-jump-results');
  const input = document.getElementById('admin-jump');
  if (!panel || !input) return;

  if (q.length < 1) {
    closeJump();
    return;
  }

  const models = state.models
    .filter((model) => matchesQuery(q, [model.name, model.scientificName, model.category, model.slug]))
    .slice(0, 5)
    .map((model) => ({
      href: `/admin-models.html?id=${encodeURIComponent(model.id)}`,
      title: model.name || 'Mẫu chưa đặt tên',
      detail: [model.category, model.grade ? `Lớp ${model.grade}` : null].filter(Boolean).join(' · ') || 'Mẫu vật',
      group: 'Mẫu vật'
    }));

  const users = state.users
    .filter((user) => matchesQuery(q, [user.fullName, user.email, user.role]))
    .slice(0, 5)
    .map((user) => ({
      href: `/admin-users.html?q=${encodeURIComponent(user.email || user.fullName || '')}`,
      title: user.fullName || user.email,
      detail: user.email || user.role || 'Tài khoản',
      group: 'Tài khoản'
    }));

  const extras = [];
  if (q.length >= 2 && ['nhãn', 'mau', 'mẫu', 'model'].some((term) => term.includes(q) || q.includes(term))) {
    extras.push({ href: '/admin-models.html', title: 'Mở nhân mẫu 3D', detail: 'Gắn tên, loại, lớp', group: 'Lối tắt' });
  }
  if (q.length >= 2 && ['loại', 'loai', 'category'].some((term) => term.includes(q) || q.includes(term))) {
    extras.push({ href: '/admin-categories.html', title: 'Mở loại mẫu', detail: 'Chip lọc catalog', group: 'Lối tắt' });
  }
  if (q.length >= 2 && ['lab', 'viewer'].some((term) => term.includes(q) || q.includes(term))) {
    extras.push({ href: '/admin-labs.html', title: 'Mở lab', detail: 'Điểm đến khi bấm thẻ', group: 'Lối tắt' });
  }
  if (q.length >= 2 && ['tài khoản', 'tai khoan', 'user', 'học sinh', 'hoc sinh', 'người dùng', 'nguoi dung'].some((term) => term.includes(q) || q.includes(term))) {
    extras.push({ href: '/admin-users.html', title: 'Mở người dùng', detail: 'Khóa hoặc mở lại', group: 'Lối tắt' });
  }
  if (q.length >= 2 && ['vai trò', 'vai tro', 'role', 'quyền'].some((term) => term.includes(q) || q.includes(term))) {
    extras.push({ href: '/admin-roles.html', title: 'Mở vai trò', detail: 'Tạo hoặc sửa role', group: 'Lối tắt' });
  }

  const roles = state.roles
    .filter((role) => matchesQuery(q, [role.code, role.name, role.description]))
    .slice(0, 5)
    .map((role) => ({
      href: `/admin-roles.html?id=${encodeURIComponent(role.id)}`,
      title: role.name || role.code,
      detail: role.code || 'Vai trò',
      group: 'Vai trò'
    }));

  state.jumpHits = [...models, ...users, ...roles, ...extras];
  state.jumpIndex = 0;
  input.setAttribute('aria-expanded', 'true');
  panel.hidden = false;

  if (!state.jumpHits.length) {
    panel.innerHTML = `<p class="admin-jump-empty">Không thấy “${escapeHtml(raw)}”. Thử tên mẫu hoặc email.</p>`;
    revealJump(panel);
    return;
  }

  const groups = groupBy(state.jumpHits, (hit) => hit.group);
  panel.innerHTML = Object.entries(groups).map(([group, hits]) => `
    <div class="admin-jump-group">
      <div class="admin-jump-group-title">${escapeHtml(group)}</div>
      ${hits.map((hit) => {
        const index = state.jumpHits.indexOf(hit);
        return `
          <button type="button" class="admin-jump-option${index === 0 ? ' is-active' : ''}" role="option" data-jump-index="${index}" id="admin-jump-opt-${index}">
            <span class="material-symbols-outlined text-[18px]">${group === 'Tài khoản' ? 'person' : group === 'Vai trò' ? 'badge' : 'view_in_ar'}</span>
            <span>
              <strong class="block font-['Epilogue'] text-sm">${escapeHtml(hit.title)}</strong>
              <span class="block font-['Be_Vietnam_Pro'] text-xs text-[#5b403e]">${escapeHtml(hit.detail)}</span>
            </span>
          </button>
        `;
      }).join('')}
    </div>
  `).join('');

  panel.querySelectorAll('[data-jump-index]').forEach((btn) => {
    btn.addEventListener('mousedown', (event) => event.preventDefault());
    btn.addEventListener('click', () => goJump(Number(btn.dataset.jumpIndex)));
  });
  input.setAttribute('aria-activedescendant', 'admin-jump-opt-0');
  revealJump(panel);
}

function onJumpKey(event) {
  if (event.key === 'Escape') {
    closeJump();
    event.target.blur();
    return;
  }
  if (!state.jumpHits.length) return;
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    state.jumpIndex = (state.jumpIndex + 1) % state.jumpHits.length;
    syncJumpActive();
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    state.jumpIndex = (state.jumpIndex - 1 + state.jumpHits.length) % state.jumpHits.length;
    syncJumpActive();
  }
}

function syncJumpActive() {
  const input = document.getElementById('admin-jump');
  document.querySelectorAll('[data-jump-index]').forEach((btn) => {
    const active = Number(btn.dataset.jumpIndex) === state.jumpIndex;
    btn.classList.toggle('is-active', active);
    if (active) {
      btn.scrollIntoView({ block: 'nearest' });
      input?.setAttribute('aria-activedescendant', btn.id);
    }
  });
}

function goJump(index) {
  const hit = state.jumpHits[index];
  if (!hit) return;
  window.location.href = hit.href;
}

function closeJump() {
  const panel = document.getElementById('admin-jump-results');
  const input = document.getElementById('admin-jump');
  if (panel) panel.hidden = true;
  input?.setAttribute('aria-expanded', 'false');
  input?.removeAttribute('aria-activedescendant');
  state.jumpHits = [];
}

function stampDesk() {
  const marks = document.querySelectorAll('[data-stamp]');
  const duration = state.reduceMotion ? 0 : 0.38;
  gsap.fromTo(marks, {
    autoAlpha: 0,
    scale: 1.45,
    rotation: 28
  }, {
    autoAlpha: 0.9,
    scale: 1,
    rotation: 12,
    duration,
    ease: 'power3.out',
    stagger: state.reduceMotion ? 0 : 0.08,
    overwrite: true
  });
}

function stampNumber(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (value == null || !Number.isFinite(Number(value))) {
    el.textContent = '—';
    el.dataset.current = '0';
    return;
  }
  const safe = Number.isFinite(Number(value)) ? Number(value) : 0;
  const proxy = { n: Number(el.dataset.current || 0) };
  const duration = state.reduceMotion ? 0 : 0.45;
  gsap.to(proxy, {
    n: safe,
    duration,
    ease: 'power2.out',
    overwrite: true,
    onUpdate: () => {
      el.textContent = String(Math.round(proxy.n));
    },
    onComplete: () => {
      el.dataset.current = String(safe);
      el.textContent = String(safe);
    }
  });
  gsap.fromTo(el, { scale: 1.14, y: -6 }, {
    scale: 1,
    y: 0,
    duration: state.reduceMotion ? 0 : 0.28,
    ease: 'power3.out',
    overwrite: true
  });
}

function highlightAttention(items) {
  if (!items.length) return;
  if (state.reduceMotion) {
    gsap.set(items, { clipPath: 'none', autoAlpha: 1 });
    return;
  }
  gsap.fromTo(items, {
    clipPath: 'inset(0 100% 0 0)',
    autoAlpha: 1
  }, {
    clipPath: 'inset(0 0% 0 0)',
    duration: 0.4,
    stagger: 0.07,
    ease: 'power2.out',
    overwrite: true
  });
}

function revealJump(panel) {
  gsap.fromTo(panel, {
    autoAlpha: state.reduceMotion ? 1 : 0,
    y: state.reduceMotion ? 0 : -8
  }, {
    autoAlpha: 1,
    y: 0,
    duration: state.reduceMotion ? 0 : 0.16,
    ease: 'power2.out',
    overwrite: true
  });
}

function isIncomplete(model) {
  return !model.grade || !String(model.category || '').trim() || !String(model.modelUrl || '').trim();
}

function matchesQuery(q, fields) {
  return fields.some((field) => String(field || '').toLowerCase().includes(q));
}

function groupBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    (acc[key] ||= []).push(item);
    return acc;
  }, {});
}

function showError(message) {
  const box = document.getElementById('admin-error');
  const hint = document.getElementById('admin-stats-hint');
  if (hint) hint.textContent = message;
  if (box) box.hidden = false;
  ['stat-models', 'stat-incomplete', 'stat-r2', 'stat-users', 'stat-students', 'stat-locked', 'stat-roles', 'stat-system-roles', 'stat-new-week', 'stat-new-month'].forEach((id) => {
    const el = document.getElementById(id);
    if (el && (el.textContent === '…' || !el.dataset.current)) el.textContent = '—';
  });
}

function hideError() {
  const box = document.getElementById('admin-error');
  if (box) box.hidden = true;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}
