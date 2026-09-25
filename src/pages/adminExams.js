/**
 * BioVerse — Admin Exams & Question Studio Controller (admin-exams.html)
 * Manages Exams, Questions, Answers, QuestionImages, AnswerImages,
 * Duplicate Exams, Question Bank picking, Reordering, and Media Uploads.
 */

import { setupNavbarAuth } from '../utils/authNavbar.js';
import { requireAdmin } from '../utils/adminGuard.js';
import { showToast, confirmModal } from '../components/modal.js';
import {
  listExams,
  getExamById,
  createExam,
  updateExam,
  deleteExam,
  duplicateExam,
  getExamBuilder,
  reorderExamQuestions,
  createCompositeQuestion,
  removeQuestionFromExam,
  pickQuestionsFromBank,
  listSubjects,
  listQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  listExamQuestions,
  addQuestionToExam,
  updateExamQuestion,
  deleteExamQuestion,
  listAnswersByQuestionId,
  createAnswer,
  updateAnswer,
  deleteAnswer,
  listQuestionImages,
  createQuestionImage,
  deleteQuestionImage,
  listAnswerImages,
  createAnswerImage,
  deleteAnswerImage,
  listQuestionBank,
  uploadMediaFile,
  parseExamError
} from '../api/adminExamApi.js';

const state = {
  exams: [],
  subjects: [],
  activeExam: null,
  activeQuestions: [], // Questions in active exam
  activeSummary: { totalQuestions: 0, totalPoints: 0, isValidTotalPoints: false },
  activeView: 'list', // 'list' | 'builder'
  filterSubject: '',
  searchQuery: '',
  bankQuestions: [],
  bankSelectedIds: new Set()
};

document.addEventListener('DOMContentLoaded', () => {
  setupNavbarAuth();
  if (!requireAdmin({ loginNext: '/admin-exams' })) return;

  // Đảm bảo chỉ hiển thị view-exam-list, ẩn triệt để view-exam-builder khi khởi tạo
  const builderView = document.getElementById('view-exam-builder');
  const listView = document.getElementById('view-exam-list');
  if (builderView) {
    builderView.hidden = true;
    builderView.style.display = 'none';
  }
  if (listView) {
    listView.hidden = false;
    listView.style.display = 'flex';
  }

  bindUiControls();
  bindModals();
  initData();
});

async function initData() {
  await loadSubjects();
  await loadExams();
}

/* ==========================================================================
   0. HELPER XỬ LÝ LỖI SẠCH (KHÔNG HIỂN THỊ MÃ KỸ THUẬT)
   ========================================================================== */

function setModalError(elementId, err, fallbackMsg = 'Có lỗi xảy ra') {
  const box = document.getElementById(elementId);
  const parsed = parseExamError(err);
  let errorMsg = parsed.userMessage || fallbackMsg;

  if (parsed.code === 1605) {
    errorMsg = 'Đề thi không tồn tại hoặc đã bị xóa khỏi hệ thống.';
  } else if (parsed.code === 1606) {
    errorMsg = 'Câu hỏi không tồn tại trong ngân hàng đề thi.';
  } else if (parsed.code === 1607) {
    errorMsg = 'Đáp án không tồn tại hoặc đã bị xóa.';
  } else if (parsed.code === 1608) {
    errorMsg = 'Liên kết giữa đề thi và câu hỏi không tồn tại.';
  } else if (parsed.code === 1609) {
    errorMsg = 'Không tìm thấy hình ảnh minh họa của câu hỏi.';
  } else if (parsed.code === 1610) {
    errorMsg = 'Không tìm thấy hình ảnh minh họa của đáp án.';
  } else if (parsed.code === 1400) {
    errorMsg = parsed.message || 'Dữ liệu không hợp lệ hoặc vi phạm quy tắc validation.';
  } else if (parsed.code === 1410) {
    errorMsg = 'Chưa chọn tệp hoặc định dạng tệp không được hỗ trợ (chỉ nhận JPG, PNG, WebP).';
  } else if (parsed.code === 1411) {
    errorMsg = 'Dung lượng tệp vượt quá 5MB. Vui lòng nén ảnh hoặc chọn ảnh nhỏ hơn.';
  }

  if (box) {
    box.textContent = errorMsg;
    box.hidden = false;
  }
  showToast(errorMsg, 'error');
}

function clearModalError(elementId) {
  const box = document.getElementById(elementId);
  if (box) {
    box.textContent = '';
    box.hidden = true;
  }
}

/* ==========================================================================
   1. MÔN HỌC & DANH SÁCH ĐỀ THI (CATALOG)
   ========================================================================== */

function extractExamList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.content)) return data.content;
  if (Array.isArray(data.data)) return data.data;
  if (data.data && Array.isArray(data.data.items)) return data.data.items;
  if (data.data && Array.isArray(data.data.content)) return data.data.content;
  return [];
}

/**
 * Lấy danh sách tên các môn học DUY NHẤT (không kèm mã môn, không lặp lại)
 */
function getDistinctSubjectNames() {
  const names = new Set();

  // 1. Lấy từ danh sách môn học đã cấu hình
  if (Array.isArray(state.subjects)) {
    state.subjects.forEach(s => {
      const name = (s.name || '').trim();
      if (name) names.add(name);
    });
  }

  // 2. Lấy thêm từ danh sách đề thi đã có
  if (Array.isArray(state.exams)) {
    state.exams.forEach(e => {
      const name = (e.subjectName || e.subject?.name || (typeof e.subject === 'string' ? e.subject : '') || '').trim();
      if (name) names.add(name);
    });
  }

  if (names.size === 0) {
    names.add('Khoa học Tự nhiên');
  }

  return Array.from(names).sort((a, b) => a.localeCompare(b, 'vi'));
}

async function loadSubjects() {
  try {
    const data = await listSubjects();
    state.subjects = Array.isArray(data) ? data : (data?.data || []);
    populateSubjectSelects();
  } catch (err) {
    console.warn('Lỗi tải môn học:', err);
  }
}

function populateSubjectSelects() {
  const filterSelect = document.getElementById('exam-filter-subject');
  const datalist = document.getElementById('subject-name-datalist');
  const distinctNames = getDistinctSubjectNames();

  // 1. Dropdown bộ lọc: chỉ lấy tên môn học duy nhất, không kèm mã môn
  if (filterSelect) {
    const currentVal = state.filterSubject || '';
    filterSelect.innerHTML = '<option value="">Tất cả môn học</option>' +
      distinctNames.map(name => `<option value="${name}" ${name === currentVal ? 'selected' : ''}>${name}</option>`).join('');
  }

  // 2. Datalist gợi ý tên môn học cho modal tạo đề thi mới
  if (datalist) {
    datalist.innerHTML = distinctNames.map(name => `<option value="${name}">`).join('');
  }
}

async function loadExams() {
  const gridEl = document.getElementById('exam-grid');
  if (gridEl) gridEl.innerHTML = '<div class="col-span-full py-12 text-center text-sm text-[#76716a]">Đang tải danh sách đề thi...</div>';

  try {
    // 1. Thử gọi /api/exams không có param phân trang trước
    let rawData;
    try {
      rawData = await listExams();
    } catch {
      rawData = await listExams({ page: 0, size: 100 });
    }

    let items = extractExamList(rawData);

    // 2. Nếu danh sách vẫn rỗng, thử gọi có phân trang
    if (items.length === 0) {
      try {
        const paginated = await listExams({ page: 0, size: 100 });
        const pItems = extractExamList(paginated);
        if (pItems.length > 0) items = pItems;
      } catch (e) {
        console.warn('Fallback query exams note:', e);
      }
    }

    state.exams = items;
    populateSubjectSelects();
    renderExams();
  } catch (err) {
    console.error('Lỗi tải đề thi:', err);
    if (gridEl) {
      gridEl.innerHTML = `
        <div class="col-span-full p-4 bg-[#ffdad6] border-2 border-[#b71422] rounded-2xl text-center text-sm text-[#b71422]">
          Không tải được đề thi: ${err.message}
          <button type="button" id="btn-retry-exams" class="block mx-auto mt-2 underline font-bold">Thử lại</button>
        </div>
      `;
      document.getElementById('btn-retry-exams')?.addEventListener('click', loadExams);
    }
    showToast('Lỗi tải danh sách đề thi: ' + err.message, 'error');
  }
}

function renderExams() {
  const gridEl = document.getElementById('exam-grid');
  if (!gridEl) return;

  const filterSubject = (state.filterSubject || '').trim().toLowerCase();
  const q = state.searchQuery.toLowerCase();

  const filtered = state.exams.filter(e => {
    // Chỉ lấy tên môn học để lọc
    const examSubject = (e.subjectName || e.subject?.name || (typeof e.subject === 'string' ? e.subject : '') || '').trim().toLowerCase();
    const matchSubject = !filterSubject || examSubject === filterSubject;

    const matchQuery = !q ||
      (e.code && e.code.toLowerCase().includes(q)) ||
      (e.name && e.name.toLowerCase().includes(q)) ||
      (examSubject && examSubject.includes(q));

    return matchSubject && matchQuery;
  });

  if (filtered.length === 0) {
    gridEl.innerHTML = `
      <div class="col-span-full p-8 border-2 border-dashed border-[#dcd5cb] rounded-2xl text-center text-sm text-[#76716a]">
        Không tìm thấy đề thi phù hợp.<br>Bấm <strong>"Tạo đề thi mới"</strong> để bổ sung đề kiểm tra.
      </div>
    `;
    return;
  }

  gridEl.innerHTML = filtered.map(exam => {
    const qCount = exam.stats?.questionCount ?? exam.questions?.length ?? exam.questionCount ?? 0;
    const duration = exam.duration || exam.durationMinutes || 45;
    const totalScore = exam.stats?.totalAssignedPoints ?? exam.totalScore ?? exam.maxScore ?? 10.0;
    // Tên môn học hiển thị trên badge
    const subjectName = (exam.subjectName || exam.subject?.name || (typeof exam.subject === 'string' ? exam.subject : '') || 'Khoa học Tự nhiên').trim();

    return `
      <article class="bg-white border-[2.5px] border-[#2d2d2d] rounded-2xl p-5 sketch-shadow flex flex-col justify-between gap-4 hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform">
        <div>
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="px-2 py-0.5 rounded bg-[#fff9c4] border border-[#2d2d2d] font-['Space_Grotesk'] font-bold text-xs text-[#2d2d2d]">
              ${exam.code || 'MÃ ĐỀ'}
            </span>
            <span class="px-2 py-0.5 rounded bg-[#e8f5e9] border border-[#48bb78] text-[#006a3b] font-['Space_Grotesk'] font-semibold text-xs">
              ${subjectName}
            </span>
          </div>
          <h3 class="font-['Epilogue'] text-base md:text-lg font-bold text-[#1b1c1c] line-clamp-2">${exam.name}</h3>
          <p class="font-['Be_Vietnam_Pro'] text-xs text-[#5b403e] line-clamp-2 mt-1">${exam.description || 'Chưa có thông tin thời lượng / mô tả.'}</p>
        </div>

        <div class="border-t border-dashed border-[#dcd5cb] pt-3 flex flex-col gap-3">
          <!-- Chỉ số thống kê -->
          <div class="flex items-center justify-between text-xs text-[#76716a] font-['Space_Grotesk'] font-medium">
            <div class="flex items-center gap-1.5" title="Số lượng câu hỏi">
              <span class="material-symbols-outlined text-[16px] text-tertiary">quiz</span>
              <strong class="text-[#1b1c1c]">${qCount}</strong> câu hỏi
            </div>
            <div class="flex items-center gap-1.5" title="Thời lượng làm bài">
              <span class="material-symbols-outlined text-[16px] text-gray-500">timer</span>
              <span>${duration} phút</span>
            </div>
            <div class="flex items-center gap-1.5" title="Thang điểm">
              <span class="material-symbols-outlined text-[16px] text-amber-600">military_tech</span>
              <span class="font-bold text-[#b71422]">${totalScore}đ</span>
            </div>
          </div>

          <!-- Các nút hành động -->
          <div class="flex items-center justify-between gap-1 pt-1 border-t border-gray-100">
            <div class="flex items-center gap-1">
              <button type="button" class="btn-edit-exam p-1.5 text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg" data-id="${exam.id}" title="Chỉnh sửa thông tin đề">
                <span class="material-symbols-outlined text-[18px]">edit</span>
              </button>
              <button type="button" class="btn-duplicate-exam p-1.5 text-[#0284c7] hover:bg-sky-50 rounded-lg" data-id="${exam.id}" title="Nhân bản đề thi này">
                <span class="material-symbols-outlined text-[18px]">content_copy</span>
              </button>
              <button type="button" class="btn-delete-exam p-1.5 text-red-600 hover:bg-red-50 rounded-lg" data-id="${exam.id}" title="Xóa đề thi">
                <span class="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
            <button type="button" class="btn-build-exam neo-btn neo-btn-primary rounded-xl px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1" data-id="${exam.id}">
              <span class="material-symbols-outlined text-[16px]">edit_note</span>
              Soạn câu hỏi
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  // Bind actions
  gridEl.querySelectorAll('.btn-edit-exam').forEach(btn => {
    btn.addEventListener('click', () => openExamModal(Number(btn.dataset.id)));
  });

  gridEl.querySelectorAll('.btn-duplicate-exam').forEach(btn => {
    btn.addEventListener('click', () => openDuplicateModal(Number(btn.dataset.id)));
  });

  gridEl.querySelectorAll('.btn-delete-exam').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.id);
      const target = state.exams.find(e => e.id === id);
      const ok = await confirmModal({
        title: `Xóa đề thi ${target?.code || ''}?`,
        message: 'LƯU Ý: Xóa đề thi sẽ gỡ toàn bộ liên kết câu hỏi thuộc đề này.',
        type: 'error',
        confirmText: 'Xác nhận xóa'
      });
      if (!ok) return;

      try {
        await deleteExam(id);
        showToast('Đã xóa đề thi thành công', 'success');
        loadExams();
      } catch (err) {
        showToast('Không thể xóa đề thi: ' + err.message, 'error');
      }
    });
  });

  gridEl.querySelectorAll('.btn-build-exam').forEach(btn => {
    btn.addEventListener('click', () => openExamBuilder(Number(btn.dataset.id)));
  });
}

/* ==========================================================================
   2. TRÌNH BIÊN SOẠN CÂU HỎI TRONG ĐỀ THI (EXAM STUDIO / BUILDER)
   ========================================================================== */

async function openExamBuilder(examId) {
  const target = state.exams.find(e => e.id === examId);
  if (!target) return;
  state.activeExam = target;

  const subjectName = (target.subjectName || target.subject?.name || (typeof target.subject === 'string' ? target.subject : '') || 'Khoa học Tự nhiên').trim();

  document.getElementById('builder-exam-code').textContent = target.code || 'MÃ ĐỀ';
  document.getElementById('builder-exam-name').textContent = target.name;
  document.getElementById('builder-exam-subject').textContent = subjectName;
  const typeEl = document.getElementById('builder-exam-type');
  if (typeEl) typeEl.textContent = target.type || 'DEFAULT';

  // Chuyển chế độ xem: ẩn hoàn toàn catalog, hiện builder
  const listView = document.getElementById('view-exam-list');
  const builderView = document.getElementById('view-exam-builder');

  if (listView) {
    listView.hidden = true;
    listView.style.display = 'none';
  }
  if (builderView) {
    builderView.hidden = false;
    builderView.style.display = 'flex';
  }
  state.activeView = 'builder';

  await loadQuestionsForActiveExam();
}

function closeExamBuilder() {
  const listView = document.getElementById('view-exam-list');
  const builderView = document.getElementById('view-exam-builder');

  if (builderView) {
    builderView.hidden = true;
    builderView.style.display = 'none';
  }
  if (listView) {
    listView.hidden = false;
    listView.style.display = 'flex';
  }

  state.activeView = 'list';
  state.activeExam = null;
  state.activeQuestions = [];
  loadExams();
}

async function loadQuestionsForActiveExam() {
  const container = document.getElementById('builder-question-list');
  if (container) container.innerHTML = '<div class="py-8 text-center text-sm text-[#76716a]">Đang nạp cấu trúc câu hỏi đề thi...</div>';

  try {
    let questions = [];
    let builderData = null;

    // 1. Thử gọi API tối ưu /api/exams/{id}/builder
    try {
      builderData = await getExamBuilder(state.activeExam.id);
      if (builderData?.questions && Array.isArray(builderData.questions)) {
        questions = builderData.questions;
        if (builderData.summary) {
          state.activeSummary = builderData.summary;
        }
      }
    } catch {
      // Fallback sang endpoint truyền thống
    }

    // 2. Fallback nếu builder chưa có
    if (questions.length === 0) {
      const examDetail = await getExamById(state.activeExam.id);
      questions = examDetail?.questions || [];

      if (questions.length === 0) {
        try {
          const eqList = await listExamQuestions(state.activeExam.id);
          if (Array.isArray(eqList) && eqList.length > 0) {
            questions = await Promise.all(eqList.map(async eq => {
              try {
                const q = await getQuestionById(eq.questionId);
                return { ...q, examQuestionId: eq.id, point: eq.point, questionOrder: eq.questionOrder };
              } catch {
                return null;
              }
            }));
            questions = questions.filter(Boolean);
          }
        } catch (e) {
          console.warn('Fallback listExamQuestions note:', e);
        }
      }
    }

    // Sắp xếp theo questionOrder
    questions.sort((a, b) => (a.questionOrder || 0) - (b.questionOrder || 0));
    state.activeQuestions = questions;

    // Tính tổng điểm
    const totalPoints = questions.reduce((acc, q) => acc + (Number(q.point) || 0), 0);
    state.activeSummary = {
      totalQuestions: questions.length,
      totalPoints: Number(totalPoints.toFixed(2)),
      isValidTotalPoints: Math.abs(totalPoints - 10.0) < 0.05
    };

    updateBuilderHeaderStats();
    renderBuilderQuestions();
  } catch (err) {
    if (container) {
      container.innerHTML = `
        <div class="p-4 bg-[#ffdad6] border border-[#b71422] rounded-xl text-center text-xs text-[#b71422]">
          Không tải được câu hỏi: ${err.message}
        </div>
      `;
    }
  }
}

function updateBuilderHeaderStats() {
  const qStatEl = document.getElementById('builder-stat-questions');
  const ptStatEl = document.getElementById('builder-stat-points');

  if (qStatEl) {
    qStatEl.textContent = `${state.activeSummary.totalQuestions} câu hỏi`;
  }
  if (ptStatEl) {
    const pts = state.activeSummary.totalPoints;
    const isValid = state.activeSummary.isValidTotalPoints;
    ptStatEl.textContent = `${pts} / 10.0 điểm`;
    if (isValid) {
      ptStatEl.className = 'font-bold text-[#00864c]';
      ptStatEl.title = 'Đã đủ thang điểm 10 chuẩn';
    } else {
      ptStatEl.className = 'font-bold text-[#b71422]';
      ptStatEl.title = 'Tổng điểm các câu hỏi chưa đủ hoặc vượt quá 10.0';
    }
  }
}

function renderBuilderQuestions() {
  const container = document.getElementById('builder-question-list');
  if (!container) return;

  if (state.activeQuestions.length === 0) {
    container.innerHTML = `
      <div class="p-8 border-2 border-dashed border-[#dcd5cb] rounded-2xl bg-white text-center">
        <span class="material-symbols-outlined text-[36px] text-gray-400 mb-2">quiz</span>
        <h3 class="font-['Epilogue'] font-bold text-base text-[#1b1c1c]">Đề thi này chưa có câu hỏi nào</h3>
        <p class="text-xs text-[#76716a] mt-1 mb-4">Bạn có thể tạo câu hỏi mới hoặc lấy nhanh từ Ngân hàng câu hỏi.</p>
        <div class="flex items-center justify-center gap-3">
          <button type="button" class="btn-builder-add-q neo-btn neo-btn-primary rounded-xl px-4 py-2 text-xs font-bold inline-flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px]">add</span>
            Thêm câu hỏi ngay
          </button>
          <button type="button" class="btn-builder-open-bank neo-btn neo-btn-secondary rounded-xl px-4 py-2 text-xs font-bold inline-flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px]">library_books</span>
            Lấy từ ngân hàng
          </button>
        </div>
      </div>
    `;
    container.querySelector('.btn-builder-add-q')?.addEventListener('click', () => openQuestionModal());
    container.querySelector('.btn-builder-open-bank')?.addEventListener('click', openQuestionBankModal);
    return;
  }

  container.innerHTML = state.activeQuestions.map((q, idx) => {
    const answers = q.answers || [];
    const images = q.questionImages || q.questionImageRequests || q.images || [];
    const currentOrder = q.questionOrder || idx + 1;

    return `
      <div class="bg-white border-2 border-[#2d2d2d] rounded-2xl p-5 sketch-shadow flex flex-col gap-4" data-q-id="${q.id}" data-eq-id="${q.examQuestionId || ''}">
        
        <!-- Header câu hỏi -->
        <div class="flex items-start justify-between gap-3 border-b border-dashed border-[#dcd5cb] pb-3">
          <div class="flex items-center gap-2.5">
            <div class="flex items-center gap-1">
              <span class="w-8 h-8 rounded-lg bg-[#fdfbf7] border-2 border-[#2d2d2d] flex items-center justify-center font-['Space_Grotesk'] font-bold text-sm text-[#b71422]">
                ${currentOrder}
              </span>
              <!-- Nút đổi thứ tự lên xuống -->
              <div class="flex flex-col">
                <button type="button" class="btn-order-up text-gray-500 hover:text-black leading-none p-0.5" data-idx="${idx}" title="Đưa câu hỏi lên trên" ${idx === 0 ? 'disabled style="opacity:0.3"' : ''}>
                  <span class="material-symbols-outlined text-[16px]">arrow_drop_up</span>
                </button>
                <button type="button" class="btn-order-down text-gray-500 hover:text-black leading-none p-0.5" data-idx="${idx}" title="Đưa câu hỏi xuống dưới" ${idx === state.activeQuestions.length - 1 ? 'disabled style="opacity:0.3"' : ''}>
                  <span class="material-symbols-outlined text-[16px]">arrow_drop_down</span>
                </button>
              </div>
            </div>

            <div>
              <span class="px-2 py-0.5 rounded bg-gray-100 border text-[11px] font-['Space_Grotesk'] font-semibold">
                ${q.type === 'MULTIPLE_CHOICE' ? 'Nhiều đáp án (Multiple)' : 'Một đáp án (Single)'}
              </span>
              <span class="ml-2 text-xs font-['Space_Grotesk'] font-bold text-tertiary">
                ${q.point ?? 0.25} điểm
              </span>
              ${q.topic || q.description ? `<span class="ml-2 text-[11px] text-gray-500 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">${q.topic || q.description}</span>` : ''}
            </div>
          </div>

          <div class="flex items-center gap-1">
            <button type="button" class="btn-add-q-image text-xs neo-btn neo-btn-secondary rounded-lg px-2 py-1 inline-flex items-center gap-1" data-q-id="${q.id}">
              <span class="material-symbols-outlined text-[16px]">add_photo_alternate</span>
              Ảnh câu
            </button>
            <button type="button" class="btn-edit-question text-xs neo-btn neo-btn-secondary rounded-lg px-2.5 py-1 inline-flex items-center gap-1" data-q-id="${q.id}">
              <span class="material-symbols-outlined text-[16px]">edit</span>
              Sửa
            </button>
            <button type="button" class="btn-remove-from-exam text-xs text-amber-700 hover:bg-amber-50 rounded-lg p-1" data-q-id="${q.id}" data-eq-id="${q.examQuestionId || ''}" title="Gỡ câu hỏi này khỏi đề (vẫn lưu trong ngân hàng)">
              <span class="material-symbols-outlined text-[18px]">playlist_remove</span>
            </button>
            <button type="button" class="btn-delete-question text-xs text-red-600 hover:bg-red-50 rounded-lg p-1" data-q-id="${q.id}" title="Xóa vĩnh viễn câu hỏi">
              <span class="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        </div>

        <!-- Nội dung câu hỏi -->
        <div>
          <p class="font-['Be_Vietnam_Pro'] text-sm font-semibold text-[#1b1c1c] leading-relaxed whitespace-pre-wrap">${q.content}</p>
          ${q.explanation ? `<p class="mt-2 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-200">💡 <strong>Lời giải:</strong> ${q.explanation}</p>` : ''}
        </div>

        <!-- Ảnh đính kèm câu hỏi -->
        ${images.length > 0 ? `
          <div class="flex flex-wrap gap-2 pt-1">
            ${images.map(img => `
              <div class="relative group w-24 h-20 rounded-xl border border-[#2d2d2d] overflow-hidden bg-gray-100">
                <img src="${img.imageUrl || img.url}" alt="${img.caption || img.name || 'Ảnh'}" class="w-full h-full object-cover">
                <button type="button" class="btn-del-q-img absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" data-img-id="${img.id}" title="Xóa ảnh">
                  <span class="material-symbols-outlined text-[12px]">close</span>
                </button>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- Danh sách đáp án -->
        <div class="flex flex-col gap-2 pt-2 border-t border-dashed border-[#dcd5cb]">
          <div class="flex items-center justify-between">
            <span class="text-xs font-['Space_Grotesk'] font-bold uppercase text-[#76716a]">Các phương án lựa chọn (${answers.length})</span>
            <button type="button" class="btn-add-answer text-xs text-[#0284c7] hover:underline font-bold inline-flex items-center gap-1" data-q-id="${q.id}">
              <span class="material-symbols-outlined text-[16px]">add_circle</span>
              Thêm đáp án
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            ${answers.map((ans, aIdx) => {
              const letter = String.fromCharCode(65 + aIdx);
              const isCorrect = ans.isCorrect;
              return `
                <div class="flex items-start justify-between gap-2 p-2.5 rounded-xl border ${
                  isCorrect
                    ? 'bg-[#e8f5e9] border-[#00864c] text-[#006a3b]'
                    : 'bg-[#fdfbf7] border-[#dcd5cb] text-[#2d2d2d]'
                }">
                  <div class="flex items-start gap-2">
                    <span class="w-6 h-6 rounded-md font-['Space_Grotesk'] font-bold text-xs flex items-center justify-center shrink-0 ${
                      isCorrect ? 'bg-[#00864c] text-white' : 'bg-gray-200 text-gray-700'
                    }">${letter}</span>
                    <div>
                      <p class="text-xs font-medium">${ans.content}</p>
                      ${isCorrect ? '<span class="inline-block mt-0.5 text-[10px] font-bold uppercase text-[#00864c]">✓ Đáp án đúng</span>' : ''}
                    </div>
                  </div>
                  <div class="flex items-center gap-1 shrink-0">
                    <button type="button" class="btn-edit-ans text-gray-500 hover:text-black p-1" data-q-id="${q.id}" data-ans-id="${ans.id}" title="Sửa đáp án">
                      <span class="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button type="button" class="btn-del-ans text-red-500 hover:text-red-700 p-1" data-ans-id="${ans.id}" title="Xóa đáp án">
                      <span class="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

      </div>
    `;
  }).join('');

  // Bind actions in question cards
  container.querySelectorAll('.btn-order-up').forEach(btn => {
    btn.addEventListener('click', () => moveQuestionOrder(Number(btn.dataset.idx), -1));
  });

  container.querySelectorAll('.btn-order-down').forEach(btn => {
    btn.addEventListener('click', () => moveQuestionOrder(Number(btn.dataset.idx), 1));
  });

  container.querySelectorAll('.btn-edit-question').forEach(btn => {
    btn.addEventListener('click', () => openQuestionModal(Number(btn.dataset.qId)));
  });

  container.querySelectorAll('.btn-remove-from-exam').forEach(btn => {
    btn.addEventListener('click', async () => {
      const qId = Number(btn.dataset.qId);
      const eqId = btn.dataset.eqId ? Number(btn.dataset.eqId) : null;
      const ok = await confirmModal({
        title: 'Gỡ câu hỏi khỏi đề?',
        message: 'Câu hỏi sẽ chỉ bị gỡ khỏi đề thi này và vẫn còn lưu trong Ngân hàng câu hỏi dùng chung.',
        type: 'warning',
        confirmText: 'Gỡ câu hỏi'
      });
      if (!ok) return;

      try {
        try {
          await removeQuestionFromExam(state.activeExam.id, qId);
        } catch {
          if (eqId) await deleteExamQuestion(eqId);
        }
        showToast('Đã gỡ câu hỏi khỏi đề', 'success');
        loadQuestionsForActiveExam();
      } catch (err) {
        showToast('Lỗi gỡ câu hỏi: ' + err.message, 'error');
      }
    });
  });

  container.querySelectorAll('.btn-delete-question').forEach(btn => {
    btn.addEventListener('click', async () => {
      const qId = Number(btn.dataset.qId);
      const ok = await confirmModal({
        title: 'Xóa vĩnh viễn câu hỏi này?',
        message: 'Câu hỏi và toàn bộ đáp án sẽ bị xóa hoàn toàn khỏi ngân hàng dữ liệu.',
        type: 'error',
        confirmText: 'Xác nhận xóa'
      });
      if (!ok) return;

      try {
        await deleteQuestion(qId);
        showToast('Đã xóa câu hỏi thành công', 'success');
        loadQuestionsForActiveExam();
      } catch (err) {
        showToast('Lỗi xóa câu hỏi: ' + err.message, 'error');
      }
    });
  });

  container.querySelectorAll('.btn-add-answer').forEach(btn => {
    btn.addEventListener('click', () => openAnswerModal(Number(btn.dataset.qId)));
  });

  container.querySelectorAll('.btn-edit-ans').forEach(btn => {
    btn.addEventListener('click', () => {
      const qId = Number(btn.dataset.qId);
      const ansId = Number(btn.dataset.ansId);
      openAnswerModal(qId, ansId);
    });
  });

  container.querySelectorAll('.btn-del-ans').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ansId = Number(btn.dataset.ansId);
      const ok = await confirmModal({ title: 'Xóa đáp án này?', type: 'warning', confirmText: 'Xóa' });
      if (!ok) return;

      try {
        await deleteAnswer(ansId);
        showToast('Đã xóa đáp án', 'success');
        loadQuestionsForActiveExam();
      } catch (err) {
        showToast('Lỗi xóa đáp án: ' + err.message, 'error');
      }
    });
  });

  container.querySelectorAll('.btn-add-q-image').forEach(btn => {
    btn.addEventListener('click', () => openImageModal('QUESTION', Number(btn.dataset.qId)));
  });

  container.querySelectorAll('.btn-del-q-img').forEach(btn => {
    btn.addEventListener('click', async () => {
      const imgId = Number(btn.dataset.imgId);
      try {
        await deleteQuestionImage(imgId);
        showToast('Đã xóa ảnh câu hỏi', 'success');
        loadQuestionsForActiveExam();
      } catch (err) {
        showToast('Lỗi xóa ảnh: ' + err.message, 'error');
      }
    });
  });
}

/* ==========================================================================
   3. SẮP XẾP THỨ TỰ & PHÂN BỔ ĐIỂM SỐ (REORDER & BALANCE)
   ========================================================================== */

async function moveQuestionOrder(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= state.activeQuestions.length) return;

  // Hoán vị 2 phần tử
  const temp = state.activeQuestions[index];
  state.activeQuestions[index] = state.activeQuestions[newIndex];
  state.activeQuestions[newIndex] = temp;

  // Tạo payload reorder
  const items = state.activeQuestions.map((q, idx) => ({
    examQuestionId: q.examQuestionId,
    questionId: q.id,
    newOrder: idx + 1,
    point: q.point ?? 0.25
  }));

  try {
    try {
      await reorderExamQuestions(state.activeExam.id, items);
    } catch {
      // Fallback nếu API reorder chưa triển khai: update từng examQuestion
      await Promise.all(items.filter(it => it.examQuestionId).map(it =>
        updateExamQuestion(it.examQuestionId, {
          examId: state.activeExam.id,
          questionId: it.questionId,
          point: it.point,
          questionOrder: it.newOrder
        })
      ));
    }
    showToast('Đã cập nhật lại thứ tự câu hỏi', 'success');
    loadQuestionsForActiveExam();
  } catch (err) {
    showToast('Lỗi đổi thứ tự câu hỏi: ' + err.message, 'error');
  }
}

async function balancePointsEqually() {
  if (!state.activeExam || state.activeQuestions.length === 0) {
    return showToast('Đề thi chưa có câu hỏi nào để phân bổ điểm', 'warning');
  }

  const ok = await confirmModal({
    title: 'Chia đều 10 điểm cho tất cả câu hỏi?',
    message: `Hệ thống sẽ tự động gán ${(10.0 / state.activeQuestions.length).toFixed(2)} điểm cho mỗi câu trong tổng số ${state.activeQuestions.length} câu hỏi.`,
    confirmText: 'Chia đều điểm'
  });
  if (!ok) return;

  const pointPerQ = Number((10.0 / state.activeQuestions.length).toFixed(2));
  const items = state.activeQuestions.map((q, idx) => ({
    examQuestionId: q.examQuestionId,
    questionId: q.id,
    newOrder: idx + 1,
    point: pointPerQ
  }));

  try {
    try {
      await reorderExamQuestions(state.activeExam.id, items);
    } catch {
      await Promise.all(items.filter(it => it.examQuestionId).map(it =>
        updateExamQuestion(it.examQuestionId, {
          examId: state.activeExam.id,
          questionId: it.questionId,
          point: it.point,
          questionOrder: it.newOrder
        })
      ));
    }
    showToast(`Đã phân bổ đều ${pointPerQ}đ cho mỗi câu`, 'success');
    loadQuestionsForActiveExam();
  } catch (err) {
    showToast('Lỗi phân bổ điểm: ' + err.message, 'error');
  }
}

/* ==========================================================================
   4. NGÂN HÀNG CÂU HỎI (QUESTION BANK PICKER)
   ========================================================================== */

async function openQuestionBankModal() {
  if (!state.activeExam) return;
  clearModalError('bank-form-error');
  state.bankSelectedIds.clear();
  updateBankSelectedCounter();

  const modal = document.getElementById('modal-bank');
  modal?.showModal();
  await loadQuestionBank();
}

async function loadQuestionBank() {
  const container = document.getElementById('bank-question-container');
  const search = document.getElementById('bank-search-input')?.value.trim() || '';
  const type = document.getElementById('bank-type-select')?.value || '';

  if (container) container.innerHTML = '<div class="py-8 text-center text-xs text-gray-500">Đang tìm câu hỏi trong kho...</div>';

  try {
    let items = [];
    try {
      const data = await listQuestionBank({ search, type, page: 0, size: 50 });
      items = data?.content || data?.items || (Array.isArray(data) ? data : []);
    } catch {
      const allQ = await listQuestions();
      items = Array.isArray(allQ) ? allQ : [];
      if (search) items = items.filter(q => q.content?.toLowerCase().includes(search.toLowerCase()));
      if (type) items = items.filter(q => q.type === type);
    }

    state.bankQuestions = items;
    renderBankQuestions();
  } catch (err) {
    if (container) {
      container.innerHTML = `<div class="p-3 text-center text-xs text-red-600">Không tải được ngân hàng câu hỏi: ${err.message}</div>`;
    }
  }
}

function renderBankQuestions() {
  const container = document.getElementById('bank-question-container');
  if (!container) return;

  const existingQIds = new Set(state.activeQuestions.map(q => q.id));

  if (state.bankQuestions.length === 0) {
    container.innerHTML = '<div class="py-8 text-center text-xs text-gray-500">Không tìm thấy câu hỏi phù hợp trong kho.</div>';
    return;
  }

  container.innerHTML = state.bankQuestions.map(q => {
    const isAlreadyInExam = existingQIds.has(q.id);
    const isChecked = state.bankSelectedIds.has(q.id);

    return `
      <label class="flex items-start gap-3 p-3 rounded-xl border border-[#2d2d2d] ${
        isAlreadyInExam ? 'bg-gray-100 opacity-60 cursor-not-allowed' : 'bg-white hover:bg-[#fdfbf7] cursor-pointer'
      }">
        <input type="checkbox" value="${q.id}" class="bank-check-item mt-1 w-4 h-4 accent-primary" ${
          isAlreadyInExam ? 'disabled checked' : isChecked ? 'checked' : ''
        }>
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <span class="px-1.5 py-0.5 rounded bg-gray-100 border text-[10px] font-bold">
              ${q.type === 'MULTIPLE_CHOICE' ? 'Nhiều đáp án' : 'Một đáp án'}
            </span>
            ${isAlreadyInExam ? '<span class="text-[10px] text-green-700 font-bold bg-green-50 px-1 rounded border border-green-200">Đã có trong đề</span>' : ''}
          </div>
          <p class="text-xs font-semibold text-[#1b1c1c] line-clamp-2">${q.content}</p>
        </div>
      </label>
    `;
  }).join('');

  container.querySelectorAll('.bank-check-item:not([disabled])').forEach(cb => {
    cb.addEventListener('change', () => {
      const qId = Number(cb.value);
      if (cb.checked) {
        state.bankSelectedIds.add(qId);
      } else {
        state.bankSelectedIds.delete(qId);
      }
      updateBankSelectedCounter();
    });
  });
}

function updateBankSelectedCounter() {
  const el = document.getElementById('bank-selected-count');
  if (el) el.textContent = state.bankSelectedIds.size;
}

async function handleConfirmPickBank() {
  if (state.bankSelectedIds.size === 0) {
    return showToast('Vui lòng tích chọn ít nhất 1 câu hỏi để gán', 'warning');
  }

  const defaultPoint = Number(document.getElementById('bank-default-point')?.value) || 0.25;
  const questionIds = Array.from(state.bankSelectedIds);

  try {
    try {
      await pickQuestionsFromBank(state.activeExam.id, questionIds, defaultPoint);
    } catch {
      let nextOrder = state.activeQuestions.length + 1;
      for (const qId of questionIds) {
        await addQuestionToExam({
          examId: state.activeExam.id,
          questionId: qId,
          point: defaultPoint,
          questionOrder: nextOrder++
        });
      }
    }

    showToast(`Đã gán thành công ${questionIds.length} câu hỏi vào đề`, 'success');
    document.getElementById('modal-bank')?.close();
    loadQuestionsForActiveExam();
  } catch (err) {
    setModalError('bank-form-error', err, 'Lỗi gán câu hỏi từ ngân hàng');
  }
}

/* ==========================================================================
   5. CÁC HÀM XỬ LÝ SỰ KIỆN & MODALS CHÍNH
   ========================================================================== */

function bindUiControls() {
  document.getElementById('btn-create-exam')?.addEventListener('click', () => openExamModal());
  document.getElementById('btn-refresh-exams')?.addEventListener('click', loadExams);
  document.getElementById('btn-back-to-exams')?.addEventListener('click', closeExamBuilder);
  document.getElementById('btn-add-question')?.addEventListener('click', () => openQuestionModal());
  document.getElementById('btn-balance-points')?.addEventListener('click', balancePointsEqually);
  document.getElementById('btn-open-bank')?.addEventListener('click', openQuestionBankModal);
  document.getElementById('btn-bank-search')?.addEventListener('click', loadQuestionBank);
  document.getElementById('btn-confirm-pick-bank')?.addEventListener('click', handleConfirmPickBank);

  // Search catalog
  const searchInput = document.getElementById('exam-search-input');
  let searchDebounce = null;
  searchInput?.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      state.searchQuery = searchInput.value.trim();
      renderExams();
    }, 250);
  });

  document.getElementById('exam-filter-subject')?.addEventListener('change', (e) => {
    state.filterSubject = e.target.value;
    renderExams();
  });

  // URL preview trong modal ảnh
  const imgUrlInput = document.getElementById('image-url');
  imgUrlInput?.addEventListener('input', () => {
    updateImagePreview(imgUrlInput.value.trim());
  });

  // Upload file ảnh trực tiếp (Cloudflare R2 / /api/media/upload)
  const fileInput = document.getElementById('image-file-input');
  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    const spinner = document.getElementById('image-uploading-spinner');
    if (spinner) spinner.hidden = false;
    clearModalError('image-form-error');

    try {
      const data = await uploadMediaFile(file, 'exams');
      const uploadedUrl = data?.url || data?.imageUrl;
      if (uploadedUrl) {
        if (imgUrlInput) imgUrlInput.value = uploadedUrl;
        updateImagePreview(uploadedUrl);
        showToast('Tải ảnh lên máy chủ thành công', 'success');
      }
    } catch (err) {
      setModalError('image-form-error', err, 'Lỗi tải ảnh lên máy chủ');
    } finally {
      if (spinner) spinner.hidden = true;
    }
  });
}

function updateImagePreview(url) {
  const box = document.getElementById('image-preview-box');
  if (!box) return;
  if (url) {
    box.innerHTML = `<img src="${url}" alt="Preview" class="w-full h-full object-contain" onerror="this.parentElement.innerHTML='<span class=\\'text-xs text-red-500 font-semibold\\'>Không tải được ảnh từ đường dẫn này</span>'">`;
  } else {
    box.innerHTML = '<span class="text-xs text-gray-400">Xem trước ảnh sẽ hiển thị ở đây</span>';
  }
}

function bindModals() {
  document.querySelectorAll('dialog .btn-close-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.target.closest('dialog')?.close();
    });
  });

  // 1. Submit Form Exam (Tạo / Sửa đề thi)
  document.getElementById('form-exam')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearModalError('exam-form-error');

    const id = document.getElementById('exam-id').value;
    const code = document.getElementById('exam-code').value.trim();
    const name = document.getElementById('exam-name').value.trim();
    // Chỉ lấy tên môn học
    const subjectName = (document.getElementById('exam-subject-name')?.value || 'Khoa học Tự nhiên').trim();
    const type = document.getElementById('exam-type').value;
    const description = document.getElementById('exam-desc').value.trim();

    if (!code || !name) return setModalError('exam-form-error', { code: 1400, message: 'Mã đề thi và tiêu đề không được để trống' });
    if (!subjectName) return setModalError('exam-form-error', { code: 1400, message: 'Tên môn học không được để trống' });

    try {
      if (id) {
        await updateExam(id, { code, name, subjectName, type, description });
        showToast('Cập nhật đề thi thành công', 'success');
      } else {
        await createExam({ code, name, subjectName, type, description });
        showToast('Tạo đề thi mới thành công', 'success');
      }
      document.getElementById('modal-exam')?.close();
      loadExams();
    } catch (err) {
      setModalError('exam-form-error', err, 'Lỗi lưu đề thi');
    }
  });

  // 1B. Submit Form Duplicate Exam (Nhân bản đề thi)
  document.getElementById('form-duplicate-exam')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearModalError('duplicate-form-error');

    const sourceId = Number(document.getElementById('duplicate-source-id').value);
    const newCode = document.getElementById('duplicate-new-code').value.trim();
    const newTitle = document.getElementById('duplicate-new-title').value.trim();

    if (!newCode || !newTitle) {
      return setModalError('duplicate-form-error', { code: 1400, message: 'Mã đề và tiêu đề mới không được để trống' });
    }

    try {
      await duplicateExam(sourceId, { newCode, newTitle });
      showToast(`Đã nhân bản đề thi thành công sang mã ${newCode}`, 'success');
      document.getElementById('modal-duplicate-exam')?.close();
      loadExams();
    } catch (err) {
      setModalError('duplicate-form-error', err, 'Lỗi nhân bản đề thi');
    }
  });

  // 2. Submit Form Question (Soạn câu hỏi - Hỗ trợ Composite 4 đáp án nhanh)
  document.getElementById('form-question')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearModalError('question-form-error');

    const qId = document.getElementById('question-id').value;
    const type = document.getElementById('question-type').value;
    const point = Number(document.getElementById('question-point').value);
    const questionOrder = Number(document.getElementById('question-order').value);
    const content = document.getElementById('question-content').value.trim();
    const explanation = document.getElementById('question-explanation').value.trim();
    const description = document.getElementById('question-desc').value.trim();
    const quickImgUrl = document.getElementById('question-img-url-quick')?.value.trim();

    if (!content) return setModalError('question-form-error', { code: 1400, message: 'Nội dung câu hỏi không được để trống' });

    try {
      if (qId) {
        await updateQuestion(qId, { type, point, questionOrder, content, explanation, description });
        showToast('Cập nhật câu hỏi thành công', 'success');
      } else {
        const correctRadio = document.querySelector('input[name="quick-correct-answer"]:checked')?.value || '0';
        const quickAnswers = [
          { content: document.getElementById('quick-ans-0')?.value.trim() || 'Phương án A', isCorrect: correctRadio === '0', type: 'TEXT' },
          { content: document.getElementById('quick-ans-1')?.value.trim() || 'Phương án B', isCorrect: correctRadio === '1', type: 'TEXT' },
          { content: document.getElementById('quick-ans-2')?.value.trim() || 'Phương án C', isCorrect: correctRadio === '2', type: 'TEXT' },
          { content: document.getElementById('quick-ans-3')?.value.trim() || 'Phương án D', isCorrect: correctRadio === '3', type: 'TEXT' }
        ];

        let createdSuccess = false;

        if (state.activeExam) {
          try {
            await createCompositeQuestion(state.activeExam.id, {
              content,
              point,
              type,
              difficultyLevel: 'EASY',
              topic: description,
              explanation,
              images: quickImgUrl ? [{ imageUrl: quickImgUrl, caption: 'Ảnh minh họa' }] : [],
              answers: quickAnswers
            });
            createdSuccess = true;
          } catch {
            // Fallback sang tuần tự
          }
        }

        if (!createdSuccess) {
          const newQ = await createQuestion({
            type,
            point,
            questionOrder,
            content,
            explanation,
            description,
            answers: quickAnswers
          });

          if (state.activeExam && newQ?.id) {
            try {
              await addQuestionToExam({
                examId: state.activeExam.id,
                questionId: newQ.id,
                point,
                questionOrder
              });
            } catch (linkErr) {
              console.warn('Auto link question note:', linkErr);
            }
          }

          if (quickImgUrl && newQ?.id) {
            try {
              await createQuestionImage({ questionId: newQ.id, url: quickImgUrl, name: 'Ảnh minh họa', displayOrder: 1 });
            } catch (imgErr) {
              console.warn('Auto add img note:', imgErr);
            }
          }
        }

        showToast('Thêm câu hỏi và đáp án vào đề thành công', 'success');
      }

      document.getElementById('modal-question')?.close();
      loadQuestionsForActiveExam();
    } catch (err) {
      setModalError('question-form-error', err, 'Lỗi lưu câu hỏi');
    }
  });

  // 3. Submit Form Answer (Thêm/Sửa đáp án đơn lẻ)
  document.getElementById('form-answer')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearModalError('answer-form-error');

    const ansId = document.getElementById('answer-id').value;
    const questionId = Number(document.getElementById('answer-question-id').value);
    const type = document.getElementById('answer-type').value;
    const content = document.getElementById('answer-content').value.trim();
    const isCorrect = document.getElementById('answer-is-correct').checked;
    const explanation = document.getElementById('answer-explanation').value.trim();

    if (!content) return setModalError('answer-form-error', { code: 1400, message: 'Nội dung đáp án không được để trống' });

    try {
      if (ansId) {
        await updateAnswer(ansId, { type, content, isCorrect, explanation });
        showToast('Cập nhật đáp án thành công', 'success');
      } else {
        await createAnswer({ questionId, type, content, isCorrect, explanation });
        showToast('Thêm đáp án mới thành công', 'success');
      }
      document.getElementById('modal-answer')?.close();
      loadQuestionsForActiveExam();
    } catch (err) {
      setModalError('answer-form-error', err, 'Lỗi lưu đáp án');
    }
  });

  // 4. Submit Form Image (Gắn ảnh câu hỏi hoặc đáp án)
  document.getElementById('form-image')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearModalError('image-form-error');

    const parentId = Number(document.getElementById('image-parent-id').value);
    const targetType = document.getElementById('image-target-type').value;
    const url = document.getElementById('image-url').value.trim();
    const name = document.getElementById('image-name').value.trim();
    const displayOrder = Number(document.getElementById('image-order').value) || 1;

    if (!url) return setModalError('image-form-error', { code: 1400, message: 'Vui lòng chọn tệp ảnh hoặc nhập đường dẫn hình ảnh (URL)' });

    try {
      if (targetType === 'QUESTION') {
        await createQuestionImage({ questionId: parentId, url, name, displayOrder });
        showToast('Đã thêm hình ảnh cho câu hỏi', 'success');
      } else {
        await createAnswerImage({ answerId: parentId, url, name, displayOrder });
        showToast('Đã thêm hình ảnh cho đáp án', 'success');
      }
      document.getElementById('modal-image')?.close();
      loadQuestionsForActiveExam();
    } catch (err) {
      setModalError('image-form-error', err, 'Lỗi lưu hình ảnh');
    }
  });
}

function openExamModal(examId = null) {
  clearModalError('exam-form-error');
  const modal = document.getElementById('modal-exam');
  const title = document.getElementById('modal-exam-title');
  const idInput = document.getElementById('exam-id');
  const codeInput = document.getElementById('exam-code');
  const nameInput = document.getElementById('exam-name');
  const subjectNameInput = document.getElementById('exam-subject-name');
  const descInput = document.getElementById('exam-desc');

  if (examId) {
    const target = state.exams.find(e => e.id === examId);
    if (!target) return;
    title.textContent = 'Chỉnh sửa Đề Thi';
    idInput.value = target.id;
    codeInput.value = target.code || '';
    nameInput.value = target.name || '';
    const subj = (target.subjectName || target.subject?.name || (typeof target.subject === 'string' ? target.subject : '') || 'Khoa học Tự nhiên').trim();
    if (subjectNameInput) subjectNameInput.value = subj;
    descInput.value = target.description || '';
  } else {
    title.textContent = 'Tạo Đề Thi Mới';
    idInput.value = '';
    const num = state.exams.length + 1;
    codeInput.value = `EXAM_KHTN_0${num}`;
    nameInput.value = `Bài kiểm tra trắc nghiệm 0${num}`;
    if (subjectNameInput) subjectNameInput.value = 'Khoa học Tự nhiên';
    descInput.value = 'Thời lượng 45 phút, gồm các câu hỏi trắc nghiệm khách quan chuẩn KHTN.';
  }

  modal?.showModal();
}

function openDuplicateModal(examId) {
  clearModalError('duplicate-form-error');
  const modal = document.getElementById('modal-duplicate-exam');
  const sourceInput = document.getElementById('duplicate-source-id');
  const codeInput = document.getElementById('duplicate-new-code');
  const titleInput = document.getElementById('duplicate-new-title');

  const target = state.exams.find(e => e.id === examId);
  if (!target) return;

  sourceInput.value = target.id;
  codeInput.value = `${target.code || 'EXAM'}_02`;
  titleInput.value = `${target.name} - Đề số 2`;

  modal?.showModal();
}

function openQuestionModal(qId = null) {
  clearModalError('question-form-error');
  const modal = document.getElementById('modal-question');
  const title = document.getElementById('modal-question-title');
  const idInput = document.getElementById('question-id');
  const typeSelect = document.getElementById('question-type');
  const pointInput = document.getElementById('question-point');
  const orderInput = document.getElementById('question-order');
  const contentInput = document.getElementById('question-content');
  const explanationInput = document.getElementById('question-explanation');
  const descInput = document.getElementById('question-desc');
  const quickSection = document.getElementById('section-quick-answers');
  const quickImg = document.getElementById('question-img-url-quick');

  if (qId) {
    const target = state.activeQuestions.find(q => q.id === qId);
    if (!target) return;
    title.textContent = 'Chỉnh sửa Câu Hỏi';
    idInput.value = target.id;
    typeSelect.value = target.type || 'SINGLE_CHOICE';
    pointInput.value = target.point ?? 0.25;
    orderInput.value = target.questionOrder || 1;
    contentInput.value = target.content || '';
    explanationInput.value = target.explanation || '';
    descInput.value = target.topic || target.description || '';
    if (quickSection) quickSection.hidden = true;
    if (quickImg) quickImg.value = '';
  } else {
    title.textContent = 'Thêm Câu Hỏi Mới Vào Đề';
    idInput.value = '';
    typeSelect.value = 'SINGLE_CHOICE';
    pointInput.value = 0.25;
    orderInput.value = state.activeQuestions.length + 1;
    contentInput.value = '';
    explanationInput.value = '';
    descInput.value = 'Nhận biết';
    if (quickSection) quickSection.hidden = false;
    if (quickImg) quickImg.value = '';
    const a0 = document.getElementById('quick-ans-0'); if (a0) a0.value = '';
    const a1 = document.getElementById('quick-ans-1'); if (a1) a1.value = '';
    const a2 = document.getElementById('quick-ans-2'); if (a2) a2.value = '';
    const a3 = document.getElementById('quick-ans-3'); if (a3) a3.value = '';
    const rad0 = document.querySelector('input[name="quick-correct-answer"][value="0"]');
    if (rad0) rad0.checked = true;
  }

  modal?.showModal();
}

function openAnswerModal(qId, ansId = null) {
  clearModalError('answer-form-error');
  const modal = document.getElementById('modal-answer');
  const title = document.getElementById('modal-answer-title');
  const idInput = document.getElementById('answer-id');
  const qIdInput = document.getElementById('answer-question-id');
  const typeSelect = document.getElementById('answer-type');
  const contentInput = document.getElementById('answer-content');
  const isCorrectCheck = document.getElementById('answer-is-correct');
  const explanationInput = document.getElementById('answer-explanation');

  qIdInput.value = qId;

  if (ansId) {
    title.textContent = 'Chỉnh sửa Đáp Án';
    idInput.value = ansId;
    const parentQ = state.activeQuestions.find(q => q.id === qId);
    const target = parentQ?.answers?.find(a => a.id === ansId);
    if (target) {
      typeSelect.value = target.type || 'TEXT';
      contentInput.value = target.content || '';
      isCorrectCheck.checked = Boolean(target.isCorrect);
      explanationInput.value = target.explanation || '';
    }
  } else {
    title.textContent = 'Thêm Đáp Án Mới';
    idInput.value = '';
    typeSelect.value = 'TEXT';
    contentInput.value = '';
    isCorrectCheck.checked = false;
    explanationInput.value = '';
  }

  modal?.showModal();
}

function openImageModal(targetType, parentId) {
  clearModalError('image-form-error');
  const modal = document.getElementById('modal-image');
  const title = document.getElementById('modal-image-title');
  const typeInput = document.getElementById('image-target-type');
  const parentIdInput = document.getElementById('image-parent-id');
  const urlInput = document.getElementById('image-url');
  const nameInput = document.getElementById('image-name');
  const orderInput = document.getElementById('image-order');
  const fileInput = document.getElementById('image-file-input');

  typeInput.value = targetType;
  parentIdInput.value = parentId;
  if (urlInput) urlInput.value = '';
  if (fileInput) fileInput.value = '';
  if (nameInput) nameInput.value = targetType === 'QUESTION' ? 'Ảnh minh họa câu hỏi' : 'Ảnh đáp án';
  if (orderInput) orderInput.value = 1;
  updateImagePreview('');

  title.textContent = targetType === 'QUESTION' ? 'Thêm Hình Ảnh Cho Câu Hỏi' : 'Thêm Hình Ảnh Cho Đáp Án';
  modal?.showModal();
}
