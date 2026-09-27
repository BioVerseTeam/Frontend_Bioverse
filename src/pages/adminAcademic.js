/**
 * BioVerse — Academic Taxonomy Controller (admin-academic.html)
 * Manages 3-tier hierarchy: Classes (Grades 6-9) -> Semesters (HK1, HK2) -> Subjects
 */

import { setupNavbarAuth } from '../utils/authNavbar.js';
import { requireAdmin } from '../utils/adminGuard.js';
import { showToast, confirmModal } from '../components/modal.js';
import {
  listClasses,
  createClass,
  updateClass,
  deleteClass,
  listSemestersByClassId,
  createSemester,
  updateSemester,
  deleteSemester,
  listSubjectsBySemesterId,
  createSubject,
  updateSubject,
  deleteSubject,
  parseExamError,
  EXAM_ERROR_CODES
} from '../api/adminExamApi.js';

const state = {
  classes: [],
  selectedClass: null,
  semesters: [],
  selectedSemester: null,
  subjects: [],
  selectedSubject: null,
  loading: false
};

document.addEventListener('DOMContentLoaded', () => {
  setupNavbarAuth();
  if (!requireAdmin({ loginNext: '/admin-academic' })) return;

  bindModals();
  bindButtons();
  loadClasses();
});

/* ==========================================================================
   1. KHỐI LỚP (CLASSES)
   ========================================================================== */

async function loadClasses(selectGradeId = null) {
  const listEl = document.getElementById('class-list');
  const countEl = document.getElementById('class-count');
  if (listEl) listEl.innerHTML = '<p class="text-xs text-gray-400 p-2">Đang tải khối lớp...</p>';

  try {
    const data = await listClasses();
    state.classes = Array.isArray(data) ? data : [];
    // Sort classes by grade ascending
    state.classes.sort((a, b) => (a.grade || 0) - (b.grade || 0));

    if (countEl) countEl.textContent = `${state.classes.length} khối`;

    renderClasses(selectGradeId);
  } catch (err) {
    if (listEl) {
      listEl.innerHTML = `
        <div class="p-3 bg-[#ffdad6] border border-[#b71422] rounded-xl text-xs text-[#b71422]">
          Không tải được khối lớp: ${err.message}
          <button type="button" id="btn-retry-classes" class="block underline mt-1 font-bold">Thử lại</button>
        </div>
      `;
      document.getElementById('btn-retry-classes')?.addEventListener('click', () => loadClasses());
    }
    showToast('Lỗi tải khối lớp: ' + err.message, 'error');
  }
}

function renderClasses(autoSelectId = null) {
  const listEl = document.getElementById('class-list');
  if (!listEl) return;

  if (state.classes.length === 0) {
    listEl.innerHTML = `
      <div class="p-4 border-2 border-dashed border-[#dcd5cb] rounded-xl text-center text-xs text-[#76716a]">
        Chưa có khối lớp nào.<br>Bấm "Thêm khối" để bắt đầu (Lớp 6 đến 9).
      </div>
    `;
    resetSemesters();
    resetSubjects();
    return;
  }

  listEl.innerHTML = state.classes.map(c => {
    const isSelected = state.selectedClass && state.selectedClass.id === c.id;
    return `
      <div class="group relative flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer ${
        isSelected
          ? 'bg-[#e8f5e9] border-[#00864c] shadow-[2px_2px_0px_#00864c]'
          : 'bg-[#fdfbf7] border-[#2d2d2d] hover:bg-[#f6f3f2]'
      }" data-class-id="${c.id}">
        <div class="flex items-center gap-3">
          <span class="w-8 h-8 rounded-lg bg-white border border-[#2d2d2d] flex items-center justify-center font-['Space_Grotesk'] font-bold text-sm text-[#006a3b]">
            ${c.grade || '?'}
          </span>
          <div>
            <h4 class="font-['Epilogue'] font-bold text-sm text-[#1b1c1c]">${c.name || 'Khối ' + c.grade}</h4>
            <p class="text-[11px] text-[#76716a] line-clamp-1">${c.description || 'Không có mô tả'}</p>
          </div>
        </div>
        <div class="flex items-center gap-1 opacity-80 group-hover:opacity-100">
          <button type="button" class="btn-edit-class p-1 hover:text-[#0284c7]" data-id="${c.id}" title="Chỉnh sửa">
            <span class="material-symbols-outlined text-[18px]">edit</span>
          </button>
          <button type="button" class="btn-delete-class p-1 hover:text-[#b71422]" data-id="${c.id}" title="Xóa">
            <span class="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Bind click selection
  listEl.querySelectorAll('[data-class-id]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      const id = Number(el.dataset.classId);
      selectClass(id);
    });
  });

  // Bind edit
  listEl.querySelectorAll('.btn-edit-class').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      openClassModal(id);
    });
  });

  // Bind delete
  listEl.querySelectorAll('.btn-delete-class').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      const target = state.classes.find(c => c.id === id);
      const ok = await confirmModal({
        title: `Xóa ${target?.name || 'khối lớp'}?`,
        message: 'LƯU Ý: Xóa khối lớp sẽ xóa toàn bộ Học kỳ và Môn học liên kết!',
        type: 'error',
        confirmText: 'Xác nhận xóa'
      });
      if (!ok) return;

      try {
        await deleteClass(id);
        showToast('Đã xóa khối lớp thành công', 'success');
        if (state.selectedClass?.id === id) {
          state.selectedClass = null;
          resetSemesters();
          resetSubjects();
        }
        loadClasses();
      } catch (err) {
        const parsed = parseExamError(err);
        showToast(parsed.userMessage || 'Không thể xóa khối lớp', 'error');
      }
    });
  });

  // Auto select
  if (autoSelectId) {
    selectClass(autoSelectId);
  } else if (!state.selectedClass && state.classes.length > 0) {
    selectClass(state.classes[0].id);
  }
}

function selectClass(id) {
  const target = state.classes.find(c => c.id === id);
  if (!target) return;
  state.selectedClass = target;

  // Re-highlight list
  const listEl = document.getElementById('class-list');
  listEl?.querySelectorAll('[data-class-id]').forEach(el => {
    const isThis = Number(el.dataset.classId) === id;
    el.className = `group relative flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer ${
      isThis
        ? 'bg-[#e8f5e9] border-[#00864c] shadow-[2px_2px_0px_#00864c]'
        : 'bg-[#fdfbf7] border-[#2d2d2d] hover:bg-[#f6f3f2]'
    }`;
  });

  // Enable Add Semester
  const addSemBtn = document.getElementById('btn-add-semester');
  if (addSemBtn) {
    addSemBtn.disabled = false;
    addSemBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  }

  // Update semester hint
  const hint = document.getElementById('semester-hint');
  if (hint) hint.textContent = `Các học kỳ của ${target.name}:`;

  loadSemesters(target.id);
}

/* ==========================================================================
   2. HỌC KỲ (SEMESTERS)
   ========================================================================== */

async function loadSemesters(classId, selectSemesterId = null) {
  const listEl = document.getElementById('semester-list');
  const countEl = document.getElementById('semester-count');
  if (listEl) listEl.innerHTML = '<p class="text-xs text-gray-400 p-2">Đang tải học kỳ...</p>';

  try {
    const data = await listSemestersByClassId(classId);
    state.semesters = Array.isArray(data) ? data : [];
    // Sort semesters by semesterOrder ascending
    state.semesters.sort((a, b) => (a.semesterOrder || 0) - (b.semesterOrder || 0));

    if (countEl) countEl.textContent = `${state.semesters.length} học kỳ`;

    renderSemesters(selectSemesterId);
  } catch (err) {
    if (listEl) {
      listEl.innerHTML = `
        <div class="p-3 bg-[#ffdad6] border border-[#b71422] rounded-xl text-xs text-[#b71422]">
          Không tải được học kỳ: ${err.message}
        </div>
      `;
    }
    showToast('Lỗi tải học kỳ: ' + err.message, 'error');
  }
}

function renderSemesters(autoSelectId = null) {
  const listEl = document.getElementById('semester-list');
  if (!listEl) return;

  if (state.semesters.length === 0) {
    listEl.innerHTML = `
      <div class="p-4 border-2 border-dashed border-[#dcd5cb] rounded-xl text-center text-xs text-[#76716a]">
        Khối này chưa có học kỳ nào.<br>Bấm "Thêm học kỳ" để tạo Học kỳ 1 hoặc 2.
      </div>
    `;
    resetSubjects();
    return;
  }

  listEl.innerHTML = state.semesters.map(s => {
    const isSelected = state.selectedSemester && state.selectedSemester.id === s.id;
    return `
      <div class="group relative flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer ${
        isSelected
          ? 'bg-[#e0f2fe] border-[#0284c7] shadow-[2px_2px_0px_#0284c7]'
          : 'bg-[#fdfbf7] border-[#2d2d2d] hover:bg-[#f6f3f2]'
      }" data-semester-id="${s.id}">
        <div class="flex items-center gap-3">
          <span class="w-8 h-8 rounded-lg bg-white border border-[#2d2d2d] flex items-center justify-center font-['Space_Grotesk'] font-bold text-xs text-[#0369a1]">
            HK${s.semesterOrder || '?'}
          </span>
          <div>
            <h4 class="font-['Epilogue'] font-bold text-sm text-[#1b1c1c]">${s.name || 'Học kỳ ' + s.semesterOrder}</h4>
            <p class="text-[11px] text-[#76716a] line-clamp-1">${s.description || 'Chương trình học kỳ'}</p>
          </div>
        </div>
        <div class="flex items-center gap-1 opacity-80 group-hover:opacity-100">
          <button type="button" class="btn-edit-semester p-1 hover:text-[#0284c7]" data-id="${s.id}" title="Chỉnh sửa">
            <span class="material-symbols-outlined text-[18px]">edit</span>
          </button>
          <button type="button" class="btn-delete-semester p-1 hover:text-[#b71422]" data-id="${s.id}" title="Xóa">
            <span class="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('[data-semester-id]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      const id = Number(el.dataset.semesterId);
      selectSemester(id);
    });
  });

  listEl.querySelectorAll('.btn-edit-semester').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      openSemesterModal(id);
    });
  });

  listEl.querySelectorAll('.btn-delete-semester').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      const target = state.semesters.find(s => s.id === id);
      const ok = await confirmModal({
        title: `Xóa ${target?.name || 'học kỳ'}?`,
        message: 'LƯU Ý: Xóa học kỳ sẽ xóa toàn bộ Môn học trực thuộc!',
        type: 'error',
        confirmText: 'Xác nhận xóa'
      });
      if (!ok) return;

      try {
        await deleteSemester(id);
        showToast('Đã xóa học kỳ thành công', 'success');
        if (state.selectedSemester?.id === id) {
          state.selectedSemester = null;
          resetSubjects();
        }
        loadSemesters(state.selectedClass.id);
      } catch (err) {
        const parsed = parseExamError(err);
        showToast(parsed.userMessage || 'Không thể xóa học kỳ', 'error');
      }
    });
  });

  if (autoSelectId) {
    selectSemester(autoSelectId);
  } else if (!state.selectedSemester && state.semesters.length > 0) {
    selectSemester(state.semesters[0].id);
  }
}

function selectSemester(id) {
  const target = state.semesters.find(s => s.id === id);
  if (!target) return;
  state.selectedSemester = target;

  const listEl = document.getElementById('semester-list');
  listEl?.querySelectorAll('[data-semester-id]').forEach(el => {
    const isThis = Number(el.dataset.semesterId) === id;
    el.className = `group relative flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer ${
      isThis
        ? 'bg-[#e0f2fe] border-[#0284c7] shadow-[2px_2px_0px_#0284c7]'
        : 'bg-[#fdfbf7] border-[#2d2d2d] hover:bg-[#f6f3f2]'
    }`;
  });

  const addSubBtn = document.getElementById('btn-add-subject');
  if (addSubBtn) {
    addSubBtn.disabled = false;
    addSubBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  }

  const hint = document.getElementById('subject-hint');
  if (hint) hint.textContent = `Môn học của ${state.selectedClass?.name} - ${target.name}:`;

  loadSubjects(target.id);
}

function resetSemesters() {
  state.semesters = [];
  state.selectedSemester = null;
  const listEl = document.getElementById('semester-list');
  if (listEl) listEl.innerHTML = '';
  const countEl = document.getElementById('semester-count');
  if (countEl) countEl.textContent = 'Chọn khối lớp';
  const addSemBtn = document.getElementById('btn-add-semester');
  if (addSemBtn) {
    addSemBtn.disabled = true;
    addSemBtn.classList.add('opacity-50', 'cursor-not-allowed');
  }
  const hint = document.getElementById('semester-hint');
  if (hint) hint.textContent = 'Vui lòng chọn một Khối lớp ở cột bên trái.';
}

/* ==========================================================================
   3. MÔN HỌC (SUBJECTS)
   ========================================================================== */

async function loadSubjects(semesterId, selectSubjectId = null) {
  const listEl = document.getElementById('subject-list');
  const countEl = document.getElementById('subject-count');
  if (listEl) listEl.innerHTML = '<p class="text-xs text-gray-400 p-2">Đang tải môn học...</p>';

  try {
    const data = await listSubjectsBySemesterId(semesterId);
    state.subjects = Array.isArray(data) ? data : [];

    if (countEl) countEl.textContent = `${state.subjects.length} môn`;

    renderSubjects(selectSubjectId);
  } catch (err) {
    if (listEl) {
      listEl.innerHTML = `
        <div class="p-3 bg-[#ffdad6] border border-[#b71422] rounded-xl text-xs text-[#b71422]">
          Không tải được môn học: ${err.message}
        </div>
      `;
    }
    showToast('Lỗi tải môn học: ' + err.message, 'error');
  }
}

function renderSubjects(autoSelectId = null) {
  const listEl = document.getElementById('subject-list');
  if (!listEl) return;

  if (state.subjects.length === 0) {
    listEl.innerHTML = `
      <div class="p-4 border-2 border-dashed border-[#dcd5cb] rounded-xl text-center text-xs text-[#76716a]">
        Học kỳ này chưa có môn học nào.<br>Bấm "Thêm môn" để tạo môn học mới.
      </div>
    `;
    return;
  }

  listEl.innerHTML = state.subjects.map(s => {
    return `
      <div class="group relative flex items-center justify-between p-3 rounded-xl border-2 bg-[#fdfbf7] border-[#2d2d2d] hover:bg-[#f6f3f2] transition-all" data-subject-id="${s.id}">
        <div class="flex items-center gap-3">
          <span class="px-2 py-1 rounded bg-[#fff9c4] border border-[#2d2d2d] font-['Space_Grotesk'] font-bold text-[11px] text-[#2d2d2d]">
            ${s.code || 'MÔN'}
          </span>
          <div>
            <h4 class="font-['Epilogue'] font-bold text-sm text-[#1b1c1c]">${s.name}</h4>
            <p class="text-[11px] text-[#76716a] line-clamp-1">${s.description || 'Chương trình môn học'}</p>
          </div>
        </div>
        <div class="flex items-center gap-1 opacity-80 group-hover:opacity-100">
          <button type="button" class="btn-edit-subject p-1 hover:text-[#0284c7]" data-id="${s.id}" title="Chỉnh sửa">
            <span class="material-symbols-outlined text-[18px]">edit</span>
          </button>
          <button type="button" class="btn-delete-subject p-1 hover:text-[#b71422]" data-id="${s.id}" title="Xóa">
            <span class="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('.btn-edit-subject').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      openSubjectModal(id);
    });
  });

  listEl.querySelectorAll('.btn-delete-subject').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.id);
      const target = state.subjects.find(s => s.id === id);
      const ok = await confirmModal({
        title: `Xóa môn ${target?.name || ''}?`,
        message: 'Các đề thi liên kết môn học này sẽ chuyển subject_id về trống (SET NULL).',
        type: 'warning',
        confirmText: 'Xác nhận xóa'
      });
      if (!ok) return;

      try {
        await deleteSubject(id);
        showToast('Đã xóa môn học thành công', 'success');
        loadSubjects(state.selectedSemester.id);
      } catch (err) {
        const parsed = parseExamError(err);
        showToast(parsed.userMessage || 'Không thể xóa môn học', 'error');
      }
    });
  });
}

function resetSubjects() {
  state.subjects = [];
  state.selectedSubject = null;
  const listEl = document.getElementById('subject-list');
  if (listEl) listEl.innerHTML = '';
  const countEl = document.getElementById('subject-count');
  if (countEl) countEl.textContent = 'Chọn học kỳ';
  const addSubBtn = document.getElementById('btn-add-subject');
  if (addSubBtn) {
    addSubBtn.disabled = true;
    addSubBtn.classList.add('opacity-50', 'cursor-not-allowed');
  }
  const hint = document.getElementById('subject-hint');
  if (hint) hint.textContent = 'Vui lòng chọn một Học kỳ ở cột giữa.';
}

/* ==========================================================================
   4. MODALS & FORMS
   ========================================================================== */

function setFormError(boxId, err, fallbackMsg) {
  const box = document.getElementById(boxId);
  const parsed = parseExamError(err);
  let errorMsg = parsed.userMessage || fallbackMsg;

  if (parsed.code === 1602) {
    errorMsg = 'Khối lớp này đã có trong hệ thống! Mỗi khối từ 6 đến 9 chỉ được tạo một lần duy nhất.';
  } else if (parsed.code === 1601) {
    errorMsg = 'Khối lớp không tồn tại hoặc đã bị xóa.';
  } else if (parsed.code === 1603) {
    errorMsg = 'Học kỳ không tồn tại hoặc đã bị xóa.';
  } else if (parsed.code === 1604) {
    errorMsg = 'Môn học không tồn tại hoặc đã bị xóa.';
  } else if (parsed.code === 1400) {
    errorMsg = parsed.message || 'Dữ liệu không hợp lệ hoặc vi phạm quy tắc validation.';
  }

  if (box) {
    box.textContent = errorMsg;
    box.hidden = false;
  }
  showToast(errorMsg, 'error');
}

function clearFormError(boxId) {
  const box = document.getElementById(boxId);
  if (box) {
    box.textContent = '';
    box.hidden = true;
  }
}

function bindButtons() {
  document.getElementById('btn-add-class')?.addEventListener('click', () => openClassModal());
  document.getElementById('btn-add-semester')?.addEventListener('click', () => {
    if (!state.selectedClass) return showToast('Vui lòng chọn một Khối lớp trước', 'warning');
    openSemesterModal();
  });
  document.getElementById('btn-add-subject')?.addEventListener('click', () => {
    if (!state.selectedSemester) return showToast('Vui lòng chọn một Học kỳ trước', 'warning');
    openSubjectModal();
  });
}

function bindModals() {
  // Close buttons on all dialogs
  document.querySelectorAll('dialog .btn-close-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const dialog = e.target.closest('dialog');
      dialog?.close();
    });
  });

  // 1. Form Class
  document.getElementById('form-class')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormError('class-form-error');

    const id = document.getElementById('class-id').value;
    const grade = Number(document.getElementById('class-grade').value);
    const name = document.getElementById('class-name').value.trim();
    const description = document.getElementById('class-desc').value.trim();

    if (!name) return setFormError('class-form-error', { code: 1400, message: 'Tên khối lớp không được để trống' });

    try {
      if (id) {
        await updateClass(id, { name, grade, description });
        showToast('Cập nhật khối lớp thành công', 'success');
      } else {
        await createClass({ name, grade, description });
        showToast('Tạo khối lớp thành công', 'success');
      }
      document.getElementById('modal-class')?.close();
      loadClasses(id ? Number(id) : null);
    } catch (err) {
      setFormError('class-form-error', err, 'Lỗi lưu khối lớp');
    }
  });

  // 2. Form Semester
  document.getElementById('form-semester')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormError('semester-form-error');

    const id = document.getElementById('semester-id').value;
    const classId = Number(document.getElementById('semester-class-id').value);
    const semesterOrder = Number(document.getElementById('semester-order').value);
    const name = document.getElementById('semester-name').value.trim();
    const description = document.getElementById('semester-desc').value.trim();

    if (!name) return setFormError('semester-form-error', { code: 1400, message: 'Tên học kỳ không được để trống' });

    try {
      if (id) {
        await updateSemester(id, { classId, semesterOrder, name, description });
        showToast('Cập nhật học kỳ thành công', 'success');
      } else {
        await createSemester({ classId, semesterOrder, name, description });
        showToast('Tạo học kỳ thành công', 'success');
      }
      document.getElementById('modal-semester')?.close();
      loadSemesters(classId, id ? Number(id) : null);
    } catch (err) {
      setFormError('semester-form-error', err, 'Lỗi lưu học kỳ');
    }
  });

  // 3. Form Subject
  document.getElementById('form-subject')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormError('subject-form-error');

    const id = document.getElementById('subject-id').value;
    const semesterId = Number(document.getElementById('subject-semester-id').value);
    const code = document.getElementById('subject-code').value.trim();
    const name = document.getElementById('subject-name').value.trim();
    const description = document.getElementById('subject-desc').value.trim();

    if (!code || !name) return setFormError('subject-form-error', { code: 1400, message: 'Mã môn và tên môn không được để trống' });

    try {
      if (id) {
        await updateSubject(id, { semesterId, code, name, description });
        showToast('Cập nhật môn học thành công', 'success');
      } else {
        await createSubject({ semesterId, code, name, description });
        showToast('Tạo môn học thành công', 'success');
      }
      document.getElementById('modal-subject')?.close();
      loadSubjects(semesterId, id ? Number(id) : null);
    } catch (err) {
      setFormError('subject-form-error', err, 'Lỗi lưu môn học');
    }
  });
}

function openClassModal(classId = null) {
  clearFormError('class-form-error');
  const modal = document.getElementById('modal-class');
  const title = document.getElementById('modal-class-title');
  const idInput = document.getElementById('class-id');
  const gradeSelect = document.getElementById('class-grade');
  const nameInput = document.getElementById('class-name');
  const descInput = document.getElementById('class-desc');

  if (classId) {
    const target = state.classes.find(c => c.id === classId);
    if (!target) return;
    title.textContent = 'Chỉnh sửa Khối Lớp';
    idInput.value = target.id;
    gradeSelect.value = target.grade || 6;
    nameInput.value = target.name || '';
    descInput.value = target.description || '';
  } else {
    title.textContent = 'Thêm Khối Lớp Mới';
    idInput.value = '';
    // Gợi ý số khối tiếp theo chưa được dùng (từ 6 đến 9)
    const usedGrades = state.classes.map(c => c.grade);
    const nextGrade = [6, 7, 8, 9].find(g => !usedGrades.includes(g)) || 6;
    gradeSelect.value = nextGrade;
    nameInput.value = `Lớp ${nextGrade}`;
    descInput.value = `Chương trình Khoa học tự nhiên Lớp ${nextGrade}`;
  }

  modal?.showModal();
}

function openSemesterModal(semesterId = null) {
  if (!state.selectedClass) return;
  clearFormError('semester-form-error');

  const modal = document.getElementById('modal-semester');
  const title = document.getElementById('modal-semester-title');
  const idInput = document.getElementById('semester-id');
  const classIdInput = document.getElementById('semester-class-id');
  const parentName = document.getElementById('semester-parent-name');
  const orderSelect = document.getElementById('semester-order');
  const nameInput = document.getElementById('semester-name');
  const descInput = document.getElementById('semester-desc');

  classIdInput.value = state.selectedClass.id;
  parentName.textContent = state.selectedClass.name;

  if (semesterId) {
    const target = state.semesters.find(s => s.id === semesterId);
    if (!target) return;
    title.textContent = 'Chỉnh sửa Học Kỳ';
    idInput.value = target.id;
    orderSelect.value = target.semesterOrder || 1;
    nameInput.value = target.name || '';
    descInput.value = target.description || '';
  } else {
    title.textContent = 'Thêm Học Kỳ Mới';
    idInput.value = '';
    const usedOrders = state.semesters.map(s => s.semesterOrder);
    const nextOrder = usedOrders.includes(1) ? 2 : 1;
    orderSelect.value = nextOrder;
    nameInput.value = `Học kỳ ${nextOrder}`;
    descInput.value = `Chương trình học kỳ ${nextOrder} của ${state.selectedClass.name}`;
  }

  modal?.showModal();
}

function openSubjectModal(subjectId = null) {
  if (!state.selectedSemester) return;
  clearFormError('subject-form-error');

  const modal = document.getElementById('modal-subject');
  const title = document.getElementById('modal-subject-title');
  const idInput = document.getElementById('subject-id');
  const semIdInput = document.getElementById('subject-semester-id');
  const parentName = document.getElementById('subject-parent-name');
  const codeInput = document.getElementById('subject-code');
  const nameInput = document.getElementById('subject-name');
  const descInput = document.getElementById('subject-desc');

  semIdInput.value = state.selectedSemester.id;
  parentName.textContent = `${state.selectedClass?.name} - ${state.selectedSemester.name}`;

  if (subjectId) {
    const target = state.subjects.find(s => s.id === subjectId);
    if (!target) return;
    title.textContent = 'Chỉnh sửa Môn Học';
    idInput.value = target.id;
    codeInput.value = target.code || '';
    nameInput.value = target.name || '';
    descInput.value = target.description || '';
  } else {
    title.textContent = 'Thêm Môn Học Mới';
    idInput.value = '';
    const gradeNum = state.selectedClass?.grade || 6;
    codeInput.value = `KHTN${gradeNum}`;
    nameInput.value = `Khoa học tự nhiên ${gradeNum}`;
    descInput.value = `Môn học Khoa học tự nhiên ${gradeNum} - ${state.selectedSemester.name}`;
  }

  modal?.showModal();
}
