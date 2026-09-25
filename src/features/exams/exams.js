/**
 * BioVerse - Student Exam Experience Controller
 * Fully integrated with Section 4.11 Student Exam Endpoints:
 *   1. GET  /api/student/exams/{id}/paper      (Anti-cheat Exam Paper Delivery)
 *   2. POST /api/student/exams/{id}/submit     (Server-Side Grading & Attempt Record)
 *   3. GET  /api/student/exam-attempts/{id}    (Detailed Review & Explanations)
 *   4. GET  /api/student/exam-attempts/my-history (Student Exam History & Progress)
 */

import { recordExamResult } from '../progress/progressService.js';

const API_BASE_URL = '/api';

// State
let allExams = [];
let currentExam = null;
let currentQuestions = [];
let userAnswers = {}; // { [questionId]: answerId }
let flaggedQuestions = new Set(); // Set of questionIds marked for review
let timerInterval = null;
let totalTimeSeconds = 45 * 60;
let remainingSeconds = 45 * 60;
let timeSpentSeconds = 0;
let examStartTimeIso = null;
let lastAttemptId = null;
let reviewQuestionsData = null; // Stored from GET /api/student/exam-attempts/{attemptId}
let reviewFilter = 'all'; // 'all' | 'wrong'

// Helper: Get Auth Headers
function getAuthHeaders() {
  const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || '';
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// DOM Elements
const views = {
  list: document.getElementById('view-exam-list'),
  take: document.getElementById('view-take-exam'),
  results: document.getElementById('view-exam-results')
};

const dom = {
  // Catalog View
  searchInput: document.getElementById('search-exam-input'),
  filterSubject: document.getElementById('filter-exam-subject'),
  btnReload: document.getElementById('btn-reload-exams'),
  btnOpenHistory: document.getElementById('btn-open-history'),
  loadingExams: document.getElementById('loading-exams'),
  examsGrid: document.getElementById('exams-grid'),

  // Header User Cluster
  headerXp: document.getElementById('header-user-xp'),
  headerName: document.getElementById('header-user-name'),
  headerGrade: document.getElementById('header-user-grade'),

  // Taking Studio View
  takingCode: document.getElementById('taking-exam-code'),
  takingSubject: document.getElementById('taking-exam-subject'),
  takingTitle: document.getElementById('taking-exam-title'),
  btnAbort: document.getElementById('btn-abort-exam'),
  timerBox: document.getElementById('exam-timer-box'),
  countdown: document.getElementById('exam-countdown'),
  btnSubmit: document.getElementById('btn-submit-exam'),
  btnSubmitFooter: document.getElementById('btn-submit-exam-footer'),
  progressText: document.getElementById('taking-progress-text'),
  progressBar: document.getElementById('taking-progress-bar'),
  questionsContainer: document.getElementById('questions-container'),

  // Palette Matrix
  paletteCountBadge: document.getElementById('palette-count-badge'),
  paletteContainer: document.getElementById('palette-container'),
  paletteAnsweredStat: document.getElementById('palette-answered-stat'),
  paletteUnansweredStat: document.getElementById('palette-unanswered-stat'),
  paletteFlaggedStat: document.getElementById('palette-flagged-stat'),

  // Results & Review View
  resultTitle: document.getElementById('result-exam-title'),
  resultScore10: document.getElementById('result-score-10'),
  resultFractionText: document.getElementById('result-fraction-text'),
  resultEvalBadge: document.getElementById('result-eval-badge'),
  resultStatCorrect: document.getElementById('result-stat-correct'),
  resultStatWrong: document.getElementById('result-stat-wrong'),
  resultStatUnanswered: document.getElementById('result-stat-unanswered'),
  resultStatTime: document.getElementById('result-stat-time'),
  btnToggleReview: document.getElementById('btn-toggle-review'),
  btnRetake: document.getElementById('btn-retake-exam'),
  btnFinishToList: document.getElementById('btn-finish-to-list'),
  reviewStreamContainer: document.getElementById('review-stream-container'),
  filterReviewAll: document.getElementById('filter-review-all'),
  filterReviewWrong: document.getElementById('filter-review-wrong'),
  reviewQuestionsList: document.getElementById('review-questions-list'),

  // History Modal
  modalHistory: document.getElementById('modal-exam-history'),
  btnCloseHistory: document.getElementById('btn-close-history-modal'),
  historyStatCount: document.getElementById('history-stat-count'),
  historyStatAvg: document.getElementById('history-stat-avg'),
  historyStatHighest: document.getElementById('history-stat-highest'),
  historyStatCorrect: document.getElementById('history-stat-correct'),
  historyTableBody: document.getElementById('history-table-body')
};

// =========================================================================
// VIEW SWITCHING
// =========================================================================
function switchView(viewName) {
  Object.keys(views).forEach(key => {
    const el = views[key];
    if (!el) return;
    if (key === viewName) {
      el.removeAttribute('hidden');
      el.style.display = 'flex';
    } else {
      el.setAttribute('hidden', '');
      el.style.display = 'none';
    }
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =========================================================================
// CLEAN SUBJECT NAME HELPER
// =========================================================================
function getCleanSubjectName(rawSubject) {
  if (!rawSubject) return 'Khoa học Tự nhiên';
  let clean = String(rawSubject).trim();
  clean = clean.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  clean = clean.replace(/\s*-\s*HK\d+/i, '').trim();
  return clean || 'Khoa học Tự nhiên';
}

// =========================================================================
// LOAD EXAM CATALOG (VIEW 1)
// =========================================================================
async function fetchExams() {
  if (dom.loadingExams) dom.loadingExams.style.display = 'block';
  if (dom.examsGrid) dom.examsGrid.innerHTML = '';

  try {
    const res = await fetch(`${API_BASE_URL}/exams`);
    const payload = await res.json();

    let items = [];
    if (Array.isArray(payload)) {
      items = payload;
    } else if (payload && Array.isArray(payload.data)) {
      items = payload.data;
    } else if (payload?.data?.items && Array.isArray(payload.data.items)) {
      items = payload.data.items;
    } else if (payload?.data?.content && Array.isArray(payload.data.content)) {
      items = payload.data.content;
    } else if (payload?.items && Array.isArray(payload.items)) {
      items = payload.items;
    }

    allExams = items;
    populateSubjectFilter(allExams);
    applyCatalogFilter();
  } catch (err) {
    console.error('Lỗi khi tải danh sách đề thi:', err);
    if (dom.examsGrid) {
      dom.examsGrid.innerHTML = `
        <div class="col-span-full py-12 text-center bg-white border-2 border-[#2d2d2d] rounded-2xl p-6 sketch-shadow">
          <span class="material-symbols-outlined text-[48px] text-red-500 mb-2">cloud_off</span>
          <p class="font-headline font-bold text-base text-[#1b1c1c]">Không thể kết nối đến máy chủ khảo thí</p>
          <p class="text-xs text-[#76716a] mt-1">Vui lòng kiểm tra lại kết nối mạng hoặc server Backend.</p>
          <button type="button" onclick="location.reload()" class="mt-4 px-4 py-2 bg-[#b71422] text-white rounded-xl font-mono text-xs font-bold sketch-shadow-sm hover:opacity-90">
            Thử lại
          </button>
        </div>
      `;
    }
  } finally {
    if (dom.loadingExams) dom.loadingExams.style.display = 'none';
  }
}

function populateSubjectFilter(exams) {
  if (!dom.filterSubject) return;
  const currentVal = dom.filterSubject.value;

  const subjectSet = new Set();
  exams.forEach(ex => {
    const clean = getCleanSubjectName(ex.subjectName);
    if (clean) subjectSet.add(clean);
  });

  const subjects = Array.from(subjectSet).sort();
  dom.filterSubject.innerHTML = '<option value="">Tất cả môn học</option>';
  subjects.forEach(sub => {
    const opt = document.createElement('option');
    opt.value = sub;
    opt.textContent = sub;
    dom.filterSubject.appendChild(opt);
  });

  if (currentVal && subjects.includes(currentVal)) {
    dom.filterSubject.value = currentVal;
  }
}

function applyCatalogFilter() {
  const searchTerm = (dom.searchInput?.value || '').trim().toLowerCase();
  const selectedSubject = dom.filterSubject?.value || '';

  const filtered = allExams.filter(exam => {
    const title = (exam.name || '').toLowerCase();
    const code = (exam.code || '').toLowerCase();
    const desc = (exam.description || '').toLowerCase();
    const cleanSub = getCleanSubjectName(exam.subjectName);

    const matchesSearch = !searchTerm || title.includes(searchTerm) || code.includes(searchTerm) || desc.includes(searchTerm);
    const matchesSubject = !selectedSubject || cleanSub === selectedSubject;

    return matchesSearch && matchesSubject;
  });

  renderCatalog(filtered);
}

function renderCatalog(examList) {
  if (!dom.examsGrid) return;
  dom.examsGrid.innerHTML = '';

  if (examList.length === 0) {
    dom.examsGrid.innerHTML = `
      <div class="col-span-full py-12 text-center bg-white border-2 border-[#2d2d2d] rounded-2xl p-8 sketch-shadow">
        <span class="material-symbols-outlined text-[48px] text-[#76716a] mb-2">manage_search</span>
        <h3 class="font-headline font-bold text-lg text-[#1b1c1c]">Không tìm thấy đề thi phù hợp</h3>
        <p class="text-xs text-[#76716a] mt-1">Hãy thử tìm với từ khóa khác hoặc bỏ chọn bộ lọc môn học.</p>
      </div>
    `;
    return;
  }

  examList.forEach(exam => {
    const cleanSubject = getCleanSubjectName(exam.subjectName);
    const duration = exam.durationMinutes || 45;
    const questionsCount = exam.questionCount || 40;

    const card = document.createElement('div');
    card.className = 'group bg-white border-[2.5px] border-[#2d2d2d] rounded-2xl p-6 sketch-shadow flex flex-col justify-between hover:-translate-y-1.5 transition-all duration-200 cursor-pointer';

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between gap-2 mb-3">
          <span class="px-2.5 py-1 rounded-lg bg-[#e8f5e9] border border-[#00864c] text-[#006a3b] font-mono text-[11px] font-bold">
            ${cleanSubject}
          </span>
          <span class="px-2 py-0.5 rounded bg-gray-100 border border-[#2d2d2d] font-mono text-[11px] font-bold text-[#5b403e]">
            ${exam.code || 'BIO-EXAM'}
          </span>
        </div>

        <h3 class="font-headline text-lg font-bold text-[#1b1c1c] leading-snug group-hover:text-[#b71422] transition-colors line-clamp-2">
          ${exam.name || 'Đề thi Khoa học Tự nhiên'}
        </h3>

        <p class="font-body text-xs text-[#5b403e] mt-2 line-clamp-2 leading-relaxed">
          ${exam.description || 'Đề thi trắc nghiệm khách quan chuẩn chương trình SGK, hỗ trợ chấm điểm và xem lời giải chi tiết.'}
        </p>
      </div>

      <div class="mt-6 pt-4 border-t-2 border-dashed border-[#dcd5cb]">
        <div class="flex items-center justify-between text-xs font-mono font-medium text-[#76716a] mb-4">
          <span class="flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px] text-[#b71422]">timer</span>
            ${duration} phút
          </span>
          <span class="flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px] text-[#006a3b]">assignment</span>
            ${questionsCount} câu
          </span>
          <span class="flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px] text-[#d97706]">grade</span>
            Thang 10
          </span>
        </div>

        <button type="button" class="btn-start-exam-card w-full py-2.5 bg-[#b71422] hover:bg-[#db3237] text-white border-2 border-[#2d2d2d] rounded-xl sketch-shadow-sm font-headline font-bold text-xs flex items-center justify-center gap-1.5 transition-transform active:translate-y-0.5">
          <span class="material-symbols-outlined text-[16px]">play_arrow</span>
          Bắt đầu làm bài
        </button>
      </div>
    `;

    card.addEventListener('click', () => {
      startExamTaking(exam);
    });

    dom.examsGrid.appendChild(card);
  });
}

// =========================================================================
// EXAM TAKING STUDIO (VIEW 2)
// =========================================================================
async function startExamTaking(exam) {
  currentExam = exam;
  userAnswers = {};
  flaggedQuestions = new Set();
  timeSpentSeconds = 0;
  examStartTimeIso = new Date().toISOString();
  lastAttemptId = null;
  reviewQuestionsData = null;

  // Header info
  if (dom.takingCode) dom.takingCode.textContent = exam.code || 'MÃ ĐỀ';
  if (dom.takingSubject) dom.takingSubject.textContent = getCleanSubjectName(exam.subjectName);
  if (dom.takingTitle) dom.takingTitle.textContent = exam.name || 'Bài kiểm tra KHTN';

  switchView('take');

  // Loading state
  if (dom.questionsContainer) {
    dom.questionsContainer.innerHTML = `
      <div class="py-16 text-center bg-white border-2 border-[#2d2d2d] rounded-2xl sketch-shadow p-6">
        <span class="material-symbols-outlined text-[36px] animate-spin text-[#b71422] mb-3">progress_activity</span>
        <p class="font-headline font-bold text-base text-[#1b1c1c]">Đang tải cấu trúc đề thi và danh sách câu hỏi...</p>
        <p class="text-xs text-[#76716a] mt-1">Bảo mật đề thi & chống gian lận trực tuyến.</p>
      </div>
    `;
  }
  if (dom.paletteContainer) dom.paletteContainer.innerHTML = '';

  // 1. Fetch Questions using Student Paper API: GET /api/student/exams/{id}/paper
  try {
    let questions = [];
    const headers = getAuthHeaders();

    // Primary: GET /api/student/exams/{id}/paper
    const resPaper = await fetch(`${API_BASE_URL}/student/exams/${exam.id}/paper`, { headers });
    if (resPaper.ok) {
      const dataPaper = await resPaper.json();
      if (dataPaper.data?.questions && Array.isArray(dataPaper.data.questions)) {
        questions = dataPaper.data.questions;
      }
    }

    // Fallback 1: GET /api/questions/exam/{id}
    if (questions.length === 0) {
      const resOld = await fetch(`${API_BASE_URL}/questions/exam/${exam.id}`, { headers });
      if (resOld.ok) {
        const dataOld = await resOld.json();
        if (dataOld.data && Array.isArray(dataOld.data)) {
          questions = dataOld.data;
        }
      }
    }

    // Fallback 2: GET /api/exams/{id}/builder
    if (questions.length === 0) {
      const resBuilder = await fetch(`${API_BASE_URL}/exams/${exam.id}/builder`, { headers });
      if (resBuilder.ok) {
        const dataBuilder = await resBuilder.json();
        if (dataBuilder.data?.questions && Array.isArray(dataBuilder.data.questions)) {
          questions = dataBuilder.data.questions;
        }
      }
    }

    currentQuestions = questions;

    if (currentQuestions.length === 0) {
      dom.questionsContainer.innerHTML = `
        <div class="py-12 text-center bg-white border-2 border-[#2d2d2d] rounded-2xl sketch-shadow p-6">
          <span class="material-symbols-outlined text-[48px] text-[#76716a] mb-2">quiz</span>
          <h3 class="font-headline font-bold text-base text-[#1b1c1c]">Đề thi này hiện chưa có câu hỏi</h3>
          <p class="text-xs text-[#76716a] mt-1">Giáo viên hoặc Quản trị viên đang biên soạn nội dung cho đề thi này.</p>
          <button type="button" id="btn-back-empty-exam" class="mt-4 px-4 py-2 bg-[#b71422] text-white border-2 border-[#2d2d2d] rounded-xl font-headline font-bold text-xs sketch-shadow-sm hover:opacity-90">
            Quay lại danh sách
          </button>
        </div>
      `;
      document.getElementById('btn-back-empty-exam')?.addEventListener('click', () => switchView('list'));
      return;
    }

    // Init Timer
    const durationMinutes = exam.durationMinutes || 45;
    totalTimeSeconds = durationMinutes * 60;
    remainingSeconds = totalTimeSeconds;
    startTimer();

    // Render questions & palette
    renderQuestionsList();
    renderQuestionPalette();
    updateProgressState();

  } catch (err) {
    console.error('Lỗi khi tải câu hỏi bài thi:', err);
    if (dom.questionsContainer) {
      dom.questionsContainer.innerHTML = `
        <div class="py-12 text-center bg-white border-2 border-[#2d2d2d] rounded-2xl sketch-shadow p-6">
          <span class="material-symbols-outlined text-[48px] text-red-500 mb-2">error</span>
          <h3 class="font-headline font-bold text-base text-[#1b1c1c]">Không thể nạp dữ liệu câu hỏi</h3>
          <p class="text-xs text-[#76716a] mt-1">Đã có lỗi xảy ra khi truy vấn đề thi từ hệ thống.</p>
          <button type="button" onclick="location.reload()" class="mt-4 px-4 py-2 bg-[#b71422] text-white border-2 border-[#2d2d2d] rounded-xl font-headline font-bold text-xs sketch-shadow-sm">
            Thử lại
          </button>
        </div>
      `;
    }
  }
}

// -------------------------------------------------------------------------
// TIMER LOGIC
// -------------------------------------------------------------------------
function startTimer() {
  if (timerInterval) clearInterval(timerInterval);

  updateTimerDisplay();

  timerInterval = setInterval(() => {
    remainingSeconds--;
    timeSpentSeconds++;

    updateTimerDisplay();

    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      alert('⏰ Đã hết thời gian làm bài! Hệ thống đang tự động nộp bài thi của bạn.');
      submitExam(true);
    }
  }, 1000);
}

function updateTimerDisplay() {
  if (!dom.countdown) return;
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  dom.countdown.textContent = formatted;

  if (dom.timerBox) {
    if (remainingSeconds <= 300) {
      dom.timerBox.classList.add('timer-warning');
    } else {
      dom.timerBox.classList.remove('timer-warning');
    }
  }
}

// -------------------------------------------------------------------------
// RENDER QUESTIONS IN TAKING STUDIO
// -------------------------------------------------------------------------
function renderQuestionsList() {
  if (!dom.questionsContainer) return;
  dom.questionsContainer.innerHTML = '';

  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  currentQuestions.forEach((q, index) => {
    const qId = q.id;
    const isFlagged = flaggedQuestions.has(qId);

    const card = document.createElement('div');
    card.id = `question-${qId}`;
    card.className = 'bg-white border-[2.5px] border-[#2d2d2d] rounded-2xl p-6 sketch-shadow flex flex-col gap-4 scroll-mt-28 transition-all';

    // Images
    const images = q.questionImageResponses || q.images || q.questionImages || [];
    let imagesHtml = '';
    if (images.length > 0) {
      imagesHtml = `
        <div class="flex flex-wrap gap-3 my-2">
          ${images.map(img => `
            <div class="border-2 border-[#2d2d2d] rounded-xl overflow-hidden sketch-shadow-sm bg-gray-50 max-w-sm">
              <img src="${img.url}" alt="${img.name || 'Hình minh họa'}" class="max-h-60 w-auto object-contain cursor-zoom-in" onclick="window.open('${img.url}', '_blank')">
            </div>
          `).join('')}
        </div>
      `;
    }

    // Answers
    const answers = q.answers || q.questionAnswers || [];
    let answersHtml = '';
    answers.forEach((ans, aIdx) => {
      const isSelected = userAnswers[qId] === ans.id;
      const letter = letters[aIdx] || `${aIdx + 1}`;

      const ansImgs = ans.answerImageResponses || ans.images || [];
      let ansImgHtml = '';
      if (ansImgs.length > 0) {
        ansImgHtml = `
          <div class="flex gap-2 mt-2">
            ${ansImgs.map(img => `<img src="${img.url}" alt="Ảnh đáp án" class="max-h-20 rounded border border-[#2d2d2d]">`).join('')}
          </div>
        `;
      }

      answersHtml += `
        <label class="answer-card flex items-start gap-3.5 p-3.5 rounded-xl border-2 border-[#2d2d2d] bg-[#fdfbf7] ${isSelected ? 'is-selected' : ''}" data-qid="${qId}" data-aid="${ans.id}">
          <div class="radio-circle shrink-0 w-7 h-7 rounded-lg border-2 border-[#2d2d2d] flex items-center justify-center font-mono font-bold text-xs bg-white text-[#2d2d2d] transition-colors">
            ${letter}
          </div>
          <div class="flex-1 text-sm font-medium text-[#1b1c1c] pt-0.5 leading-relaxed">
            ${ans.content || ''}
            ${ansImgHtml}
          </div>
        </label>
      `;
    });

    card.innerHTML = `
      <div class="flex items-center justify-between border-b-2 border-dashed border-[#dcd5cb] pb-3">
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-1 rounded-lg bg-[#b71422] text-white font-mono text-xs font-bold sketch-shadow-sm">
            Câu ${index + 1}
          </span>
          <span class="font-mono text-xs text-[#76716a] font-bold">
            ${q.point ? `${q.point} điểm` : '0.25 điểm'}
          </span>
        </div>

        <button type="button" class="flag-btn px-3 py-1 rounded-xl border-2 border-[#2d2d2d] text-xs font-mono font-bold flex items-center gap-1 transition-all ${isFlagged ? 'is-flagged' : 'bg-white hover:bg-amber-50 text-[#76716a]'}" data-qid="${qId}">
          <span class="material-symbols-outlined text-[16px]">${isFlagged ? 'flag' : 'outlined_flag'}</span>
          <span>${isFlagged ? 'Đã đặt cờ' : 'Đặt cờ'}</span>
        </button>
      </div>

      <div class="font-body text-base font-semibold text-[#1b1c1c] leading-relaxed">
        ${q.content || 'Nội dung câu hỏi đang được cập nhật...'}
      </div>

      ${imagesHtml}

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
        ${answersHtml}
      </div>
    `;

    // Bind Answer Selection
    card.querySelectorAll('.answer-card').forEach(option => {
      option.addEventListener('click', () => {
        const questionId = parseInt(option.getAttribute('data-qid'));
        const answerId = parseInt(option.getAttribute('data-aid'));

        userAnswers[questionId] = answerId;

        card.querySelectorAll('.answer-card').forEach(opt => opt.classList.remove('is-selected'));
        option.classList.add('is-selected');

        updateProgressState();
        updatePaletteButton(questionId);
      });
    });

    // Bind Flag Button
    const flagBtn = card.querySelector('.flag-btn');
    flagBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (flaggedQuestions.has(qId)) {
        flaggedQuestions.delete(qId);
        flagBtn.classList.remove('is-flagged');
        flagBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">outlined_flag</span><span>Đặt cờ</span>';
      } else {
        flaggedQuestions.add(qId);
        flagBtn.classList.add('is-flagged');
        flagBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">flag</span><span>Đã đặt cờ</span>';
      }
      updatePaletteButton(qId);
      updateProgressState();
    });

    dom.questionsContainer.appendChild(card);
  });
}

// -------------------------------------------------------------------------
// QUESTION PALETTE MATRIX
// -------------------------------------------------------------------------
function renderQuestionPalette() {
  if (!dom.paletteContainer) return;
  dom.paletteContainer.innerHTML = '';

  const total = currentQuestions.length;
  if (dom.paletteCountBadge) dom.paletteCountBadge.textContent = `${total} câu`;

  currentQuestions.forEach((q, i) => {
    const qId = q.id;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = `palette-btn-${qId}`;
    btn.className = 'palette-btn h-9 rounded-xl border-2 border-[#2d2d2d] font-mono text-xs font-bold flex items-center justify-center bg-[#fdfbf7] text-[#1b1c1c] sketch-shadow-sm';
    btn.textContent = i + 1;
    btn.title = `Chuyển đến câu ${i + 1}`;

    btn.addEventListener('click', () => {
      const targetQuestion = document.getElementById(`question-${qId}`);
      if (targetQuestion) {
        targetQuestion.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetQuestion.classList.add('ring-2', 'ring-[#0284c7]');
        setTimeout(() => targetQuestion.classList.remove('ring-2', 'ring-[#0284c7]'), 1200);
      }
    });

    dom.paletteContainer.appendChild(btn);
  });
}

function updatePaletteButton(questionId) {
  const btn = document.getElementById(`palette-btn-${questionId}`);
  if (!btn) return;

  const isAnswered = !!userAnswers[questionId];
  const isFlagged = flaggedQuestions.has(questionId);

  btn.className = 'palette-btn h-9 rounded-xl border-2 font-mono text-xs font-bold flex items-center justify-center sketch-shadow-sm';

  if (isFlagged) {
    btn.classList.add('bg-[#fef3c7]', 'text-[#b45309]', 'border-[#d97706]');
  } else if (isAnswered) {
    btn.classList.add('bg-[#00864c]', 'text-white', 'border-[#2d2d2d]');
  } else {
    btn.classList.add('bg-[#fdfbf7]', 'text-[#1b1c1c]', 'border-[#2d2d2d]');
  }
}

function updateProgressState() {
  const total = currentQuestions.length;
  const answeredCount = Object.keys(userAnswers).length;
  const flaggedCount = flaggedQuestions.size;
  const unansweredCount = Math.max(0, total - answeredCount);

  const percent = total > 0 ? Math.round((answeredCount / total) * 100) : 0;

  if (dom.progressText) dom.progressText.textContent = `${answeredCount} / ${total} câu (${percent}%)`;
  if (dom.progressBar) dom.progressBar.style.width = `${percent}%`;

  if (dom.paletteAnsweredStat) dom.paletteAnsweredStat.textContent = answeredCount;
  if (dom.paletteUnansweredStat) dom.paletteUnansweredStat.textContent = unansweredCount;
  if (dom.paletteFlaggedStat) dom.paletteFlaggedStat.textContent = flaggedCount;
}

// -------------------------------------------------------------------------
// SUBMIT EXAM & SERVER-SIDE GRADING (POST /api/student/exams/{id}/submit)
// -------------------------------------------------------------------------
function handleExamSubmitAttempt() {
  const total = currentQuestions.length;
  const answeredCount = Object.keys(userAnswers).length;
  const unansweredCount = total - answeredCount;

  if (unansweredCount > 0) {
    const confirmSubmit = confirm(`⚠️ Chú ý: Bạn còn ${unansweredCount} câu hỏi chưa hoàn thành!\n\nBạn có chắc chắn muốn nộp bài thi ngay bây giờ không?`);
    if (!confirmSubmit) return;
  } else {
    const confirmSubmit = confirm(`Bạn đã hoàn thành ${answeredCount}/${total} câu hỏi.\n\nXác nhận nộp bài thi để xem kết quả?`);
    if (!confirmSubmit) return;
  }

  submitExam(false);
}

async function submitExam(isAuto = false) {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  const total = currentQuestions.length;
  const headers = getAuthHeaders();

  // Prepare submission payload matching Section 4.11.2
  const avgQuestionTime = Math.round(timeSpentSeconds / (total || 1));
  const submitPayload = {
    startedAt: examStartTimeIso || new Date(Date.now() - timeSpentSeconds * 1000).toISOString(),
    timeSpentSec: timeSpentSeconds,
    answers: currentQuestions.map(q => ({
      questionId: q.id,
      selectedAnswerId: userAnswers[q.id] || null,
      timeSpentSec: avgQuestionTime
    }))
  };

  let serverGradingSuccess = false;
  let resultData = null;

  try {
    const res = await fetch(`${API_BASE_URL}/student/exams/${currentExam.id}/submit`, {
      method: 'POST',
      headers,
      body: JSON.stringify(submitPayload)
    });

    if (res.ok) {
      const resp = await res.json();
      if (resp.code === 1000 && resp.data) {
        serverGradingSuccess = true;
        const d = resp.data;
        lastAttemptId = d.attemptId;

        resultData = {
          exam: currentExam,
          total: d.totalQuestions || total,
          correctCount: d.correctCount,
          wrongCount: (d.totalQuestions || total) - d.correctCount,
          unansweredCount: total - Object.keys(userAnswers).length,
          score10: d.score != null ? d.score : ((d.correctCount / total) * 10.0),
          timeSpentSeconds: d.timeSpentSec || timeSpentSeconds,
          earnedXp: d.earnedXp,
          feedback: d.feedback
        };

        if (d.earnedXp && dom.headerXp) {
          const currentXpText = dom.headerXp.textContent || '0';
          const prevXp = parseInt(currentXpText) || 0;
          dom.headerXp.textContent = `${prevXp + d.earnedXp} XP`;
        }
      }
    }
  } catch (err) {
    console.warn('API POST /api/student/exams/{id}/submit chưa khả dụng, sử dụng bộ tính điểm dự phòng client:', err);
  }

  // Client-side fallback grading if server grading not available
  if (!serverGradingSuccess) {
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    currentQuestions.forEach(q => {
      const userSelectedId = userAnswers[q.id];
      const answers = q.answers || q.questionAnswers || [];

      if (!userSelectedId) {
        unansweredCount++;
        return;
      }

      const selectedAns = answers.find(a => a.id === userSelectedId);
      const isCorrect = selectedAns && (selectedAns.isCorrect === true || selectedAns.correct === true);

      if (isCorrect) {
        correctCount++;
      } else {
        wrongCount++;
      }
    });

    const score10 = total > 0 ? (correctCount / total) * 10.0 : 0;
    resultData = {
      exam: currentExam,
      total,
      correctCount,
      wrongCount,
      unansweredCount,
      score10,
      timeSpentSeconds,
      earnedXp: Math.round(score10 * 10),
      feedback: null
    };
  }

  // Record to local progress service
  try {
    recordExamResult(resultData.correctCount, resultData.total);
    window.dispatchEvent(new CustomEvent('bioverse_progress_updated'));
  } catch (err) {
    console.warn('Không thể lưu kết quả bài làm vào local storage:', err);
  }

  // Display Result Card
  displayResults(resultData);
  switchView('results');
}

// =========================================================================
// RESULTS & DETAILED REVIEW (VIEW 3)
// =========================================================================
function displayResults(data) {
  if (dom.resultTitle) dom.resultTitle.textContent = data.exam?.name || 'Bài kiểm tra Khoa học Tự nhiên';
  if (dom.resultScore10) dom.resultScore10.textContent = data.score10.toFixed(1);
  if (dom.resultFractionText) dom.resultFractionText.textContent = `Đúng: ${data.correctCount} / ${data.total} câu hỏi`;

  // Evaluation Badge
  if (dom.resultEvalBadge) {
    let evalText = data.feedback;
    let badgeClass = 'bg-[#ffebee] text-[#d32f2f]';

    if (!evalText) {
      if (data.score10 >= 9.0) {
        evalText = '🎉 Xuất sắc! Bạn nắm bài rất tốt và có kiến thức vững vàng!';
        badgeClass = 'bg-[#e8f5e9] text-[#006a3b]';
      } else if (data.score10 >= 8.0) {
        evalText = '🌟 Rất tốt! Kết quả khảo thí đáng khen ngợi!';
        badgeClass = 'bg-[#e8f5e9] text-[#006a3b]';
      } else if (data.score10 >= 6.5) {
        evalText = '👍 Khá tốt! Đã nắm được các khái niệm trọng tâm.';
        badgeClass = 'bg-[#e0f2fe] text-[#0284c7]';
      } else if (data.score10 >= 5.0) {
        evalText = '⚡ Đạt trung bình! Hãy xem lại lời giải các câu sai nhé.';
        badgeClass = 'bg-[#fef3c7] text-[#b45309]';
      } else {
        evalText = '📖 Cần ôn tập thêm! Hãy xem lại các mô hình 3D và lời giải chi tiết.';
        badgeClass = 'bg-[#ffebee] text-[#d32f2f]';
      }
    } else {
      badgeClass = data.score10 >= 8.0 ? 'bg-[#e8f5e9] text-[#006a3b]' : 'bg-[#e0f2fe] text-[#0284c7]';
    }

    dom.resultEvalBadge.className = `px-4 py-1.5 rounded-xl border-2 border-[#2d2d2d] font-headline text-sm font-bold sketch-shadow-sm mb-4 ${badgeClass}`;
    dom.resultEvalBadge.textContent = evalText;
  }

  // 4 Stats
  if (dom.resultStatCorrect) dom.resultStatCorrect.textContent = data.correctCount;
  if (dom.resultStatWrong) dom.resultStatWrong.textContent = data.wrongCount;
  if (dom.resultStatUnanswered) dom.resultStatUnanswered.textContent = data.unansweredCount;

  if (dom.resultStatTime) {
    const mins = Math.floor(data.timeSpentSeconds / 60);
    const secs = data.timeSpentSeconds % 60;
    dom.resultStatTime.textContent = `${mins}m ${String(secs).padStart(2, '0')}s`;
  }

  // Hide review stream initially
  if (dom.reviewStreamContainer) {
    dom.reviewStreamContainer.setAttribute('hidden', '');
    dom.reviewStreamContainer.style.display = 'none';
  }
}

// -------------------------------------------------------------------------
// DETAILED REVIEW STREAM (GET /api/student/exam-attempts/{attemptId})
// -------------------------------------------------------------------------
async function toggleReviewStream() {
  if (!dom.reviewStreamContainer) return;
  const isHidden = dom.reviewStreamContainer.hasAttribute('hidden') || dom.reviewStreamContainer.style.display === 'none';

  if (isHidden) {
    dom.reviewStreamContainer.removeAttribute('hidden');
    dom.reviewStreamContainer.style.display = 'flex';

    // If attemptId exists and not loaded, fetch from GET /api/student/exam-attempts/{attemptId}
    if (lastAttemptId && !reviewQuestionsData) {
      try {
        const res = await fetch(`${API_BASE_URL}/student/exam-attempts/${lastAttemptId}`, {
          headers: getAuthHeaders()
        });
        if (res.ok) {
          const resp = await res.json();
          if (resp.data?.questions) {
            reviewQuestionsData = resp.data.questions;
          }
        }
      } catch (err) {
        console.warn('Lỗi khi tải chi tiết bài làm từ server, dùng dữ liệu client fallback:', err);
      }
    }

    renderReviewQuestions();
    dom.reviewStreamContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (dom.btnToggleReview) {
      dom.btnToggleReview.innerHTML = '<span class="material-symbols-outlined text-[18px]">visibility_off</span><span>Ẩn Lời Giải Chi Tiết</span>';
    }
  } else {
    dom.reviewStreamContainer.setAttribute('hidden', '');
    dom.reviewStreamContainer.style.display = 'none';
    if (dom.btnToggleReview) {
      dom.btnToggleReview.innerHTML = '<span class="material-symbols-outlined text-[18px]">visibility</span><span>Xem Lại Bài Làm & Lời Giải</span>';
    }
  }
}

function renderReviewQuestions() {
  if (!dom.reviewQuestionsList) return;
  dom.reviewQuestionsList.innerHTML = '';

  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  let renderedCount = 0;

  // Use reviewQuestionsData if available (from BE Section 4.11.3), else fallback to currentQuestions
  const sourceQuestions = reviewQuestionsData || currentQuestions;

  sourceQuestions.forEach((q, index) => {
    const qId = q.questionId || q.id;
    const answers = q.answers || q.questionAnswers || [];

    let isUserCorrect = false;
    let isAnswered = false;
    let selectedAnswerId = null;

    if (reviewQuestionsData) {
      // From Section 4.11.3
      isUserCorrect = q.isCorrect === true;
      selectedAnswerId = q.selectedAnswerId;
      isAnswered = selectedAnswerId != null;
    } else {
      // Client Fallback
      selectedAnswerId = userAnswers[qId];
      isAnswered = !!selectedAnswerId;
      const selectedAns = answers.find(a => a.id === selectedAnswerId);
      isUserCorrect = selectedAns && (selectedAns.isCorrect === true || selectedAns.correct === true);
    }

    if (reviewFilter === 'wrong' && isUserCorrect) {
      return;
    }

    renderedCount++;

    const card = document.createElement('div');
    card.className = 'bg-white border-[2.5px] border-[#2d2d2d] rounded-2xl p-6 sketch-shadow flex flex-col gap-4';

    // Status Badge
    let statusBadge = '';
    const points = q.earnedPoint != null ? q.earnedPoint : (q.point || 0.25);

    if (isUserCorrect) {
      statusBadge = `<span class="px-2.5 py-1 rounded-lg bg-[#e8f5e9] border border-[#00864c] text-[#006a3b] font-mono text-xs font-bold flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">check_circle</span>Đúng (+${points}đ)</span>`;
    } else if (isAnswered) {
      statusBadge = '<span class="px-2.5 py-1 rounded-lg bg-[#ffebee] border border-[#d32f2f] text-[#d32f2f] font-mono text-xs font-bold flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">cancel</span>Sai</span>';
    } else {
      statusBadge = '<span class="px-2.5 py-1 rounded-lg bg-gray-100 border border-gray-400 text-gray-700 font-mono text-xs font-bold flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">radio_button_unchecked</span>Chưa làm</span>';
    }

    // Answers List in Review Mode
    let answersHtml = '';
    answers.forEach((ans, aIdx) => {
      const isCorrectAnswer = ans.isCorrect === true || ans.correct === true;
      const isSelectedByUser = (selectedAnswerId === ans.id) || (ans.isSelected === true);
      const letter = letters[aIdx] || `${aIdx + 1}`;

      let extraClass = 'bg-[#fdfbf7]';
      let icon = '';

      if (isCorrectAnswer) {
        extraClass = 'is-correct';
        icon = '<span class="material-symbols-outlined text-[#00864c] text-[18px]">check</span>';
      } else if (isSelectedByUser && !isCorrectAnswer) {
        extraClass = 'is-wrong';
        icon = '<span class="material-symbols-outlined text-[#d32f2f] text-[18px]">close</span>';
      }

      answersHtml += `
        <div class="answer-card disabled flex items-start justify-between gap-3 p-3.5 rounded-xl border-2 border-[#2d2d2d] ${extraClass}">
          <div class="flex items-start gap-3">
            <div class="radio-circle shrink-0 w-7 h-7 rounded-lg border-2 border-[#2d2d2d] flex items-center justify-center font-mono font-bold text-xs bg-white text-[#2d2d2d]">
              ${letter}
            </div>
            <div class="text-sm font-medium text-[#1b1c1c] pt-0.5 leading-relaxed">
              ${ans.content || ''}
            </div>
          </div>
          <div class="shrink-0 flex items-center gap-1 font-mono text-xs font-bold">
            ${isCorrectAnswer ? '<span class="text-[#00864c] hidden sm:inline">Đáp án đúng</span>' : ''}
            ${isSelectedByUser && !isCorrectAnswer ? '<span class="text-[#d32f2f] hidden sm:inline">Bạn đã chọn</span>' : ''}
            ${icon}
          </div>
        </div>
      `;
    });

    // Explanation Box
    const explanation = q.explanation || q.explain || 'Kiến thức cốt lõi được biên soạn theo chương trình chuẩn SGK Khoa học Tự nhiên THCS.';

    card.innerHTML = `
      <div class="flex items-center justify-between border-b-2 border-dashed border-[#dcd5cb] pb-3">
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-1 rounded-lg bg-[#2d2d2d] text-white font-mono text-xs font-bold">
            Câu ${index + 1}
          </span>
          <span class="font-mono text-xs text-[#76716a] font-bold">
            ${q.point ? `${q.point} điểm` : '0.25đ'}
          </span>
        </div>
        ${statusBadge}
      </div>

      <div class="font-body text-base font-semibold text-[#1b1c1c] leading-relaxed">
        ${q.content || ''}
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
        ${answersHtml}
      </div>

      <div class="mt-2 p-4 bg-[#fefce8] border-2 border-[#facc15] rounded-xl flex items-start gap-3 sketch-shadow-sm">
        <span class="material-symbols-outlined text-[#ca8a04] text-[22px] shrink-0 mt-0.5">lightbulb</span>
        <div>
          <span class="block font-headline text-xs font-bold text-[#854d0e] uppercase tracking-wide">Hướng dẫn giải & Nhắc lại kiến thức:</span>
          <p class="font-body text-xs text-[#713f12] mt-1 leading-relaxed">${explanation}</p>
        </div>
      </div>
    `;

    dom.reviewQuestionsList.appendChild(card);
  });

  if (renderedCount === 0) {
    dom.reviewQuestionsList.innerHTML = `
      <div class="py-8 text-center bg-white border-2 border-[#2d2d2d] rounded-2xl p-6">
        <span class="material-symbols-outlined text-[36px] text-[#006a3b] mb-1">celebration</span>
        <p class="font-headline font-bold text-sm text-[#1b1c1c]">Bạn không làm sai câu nào!</p>
        <p class="text-xs text-[#76716a]">Chuyển sang chế độ "Tất cả" để xem lại toàn bộ đề thi.</p>
      </div>
    `;
  }
}

// =========================================================================
// STUDENT EXAM HISTORY (GET /api/student/exam-attempts/my-history)
// =========================================================================
async function openHistoryModal() {
  if (!dom.modalHistory) return;
  dom.modalHistory.removeAttribute('hidden');
  dom.modalHistory.style.display = 'flex';

  if (dom.historyTableBody) {
    dom.historyTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="p-8 text-center text-[#76716a]">
          <span class="material-symbols-outlined text-[28px] animate-spin text-[#b71422] mb-1">progress_activity</span>
          <p>Đang tải lịch sử khảo thí...</p>
        </td>
      </tr>
    `;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/student/exam-attempts/my-history`, {
      headers: getAuthHeaders()
    });

    if (res.ok) {
      const resp = await res.json();
      if (resp.data) {
        renderHistoryData(resp.data);
        return;
      }
    }
  } catch (err) {
    console.warn('Chưa kết nối được API lịch sử thi:', err);
  }

  // Fallback empty view if no server history yet
  if (dom.historyTableBody) {
    dom.historyTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="p-8 text-center text-[#76716a]">
          <span class="material-symbols-outlined text-[32px] text-gray-400 mb-1">history_toggle_off</span>
          <p class="font-bold text-sm text-[#1b1c1c]">Chưa có lịch sử làm bài thi nào</p>
          <p class="text-xs text-[#76716a] mt-0.5">Các bài thi bạn hoàn thành sẽ được lưu lại tại đây.</p>
        </td>
      </tr>
    `;
  }
}

function renderHistoryData(data) {
  const summary = data.summary || {};
  const attempts = data.attempts || [];

  if (dom.historyStatCount) dom.historyStatCount.textContent = summary.totalExamsTaken || attempts.length;
  if (dom.historyStatAvg) dom.historyStatAvg.textContent = (summary.averageScore || 0).toFixed(1);
  if (dom.historyStatHighest) dom.historyStatHighest.textContent = (summary.highestScore || 0).toFixed(1);
  if (dom.historyStatCorrect) dom.historyStatCorrect.textContent = summary.totalCorrectQuestions || 0;

  if (!dom.historyTableBody) return;
  dom.historyTableBody.innerHTML = '';

  if (attempts.length === 0) {
    dom.historyTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="p-8 text-center text-[#76716a]">
          <p>Bạn chưa hoàn thành bài thi nào.</p>
        </td>
      </tr>
    `;
    return;
  }

  attempts.forEach(item => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-[#fdfbf7] transition-colors';

    const mins = Math.floor((item.timeSpentSec || 0) / 60);
    const secs = (item.timeSpentSec || 0) % 60;
    const timeFormatted = `${mins}m ${String(secs).padStart(2, '0')}s`;
    const submittedDate = item.submittedAt ? new Date(item.submittedAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : 'N/A';

    tr.innerHTML = `
      <td class="p-3">
        <span class="block font-headline font-bold text-[#1b1c1c]">${item.examTitle || 'Đề thi'}</span>
        <span class="block font-mono text-[10px] text-[#76716a]">${item.examCode || ''}</span>
      </td>
      <td class="p-3 font-mono font-medium">${getCleanSubjectName(item.subjectName)}</td>
      <td class="p-3 text-center">
        <span class="px-2 py-0.5 rounded-lg border font-mono font-bold ${item.score >= 8 ? 'bg-green-50 border-green-300 text-green-700' : (item.score >= 5 ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-red-50 border-red-300 text-red-700')}">
          ${(item.score || 0).toFixed(1)}
        </span>
      </td>
      <td class="p-3 text-center font-mono font-bold text-[#006a3b]">${item.correctCount || 0} / ${item.totalQuestions || 40}</td>
      <td class="p-3 text-center font-mono text-[#76716a]">${timeFormatted}</td>
      <td class="p-3 text-center font-mono text-[#76716a]">${submittedDate}</td>
      <td class="p-3 text-center">
        <button type="button" class="btn-review-history px-2.5 py-1 bg-white hover:bg-gray-100 border border-[#2d2d2d] rounded-lg font-mono text-[11px] font-bold sketch-shadow-sm transition-transform active:translate-y-0.5" data-attemptid="${item.attemptId}">
          Xem lại
        </button>
      </td>
    `;

    tr.querySelector('.btn-review-history')?.addEventListener('click', async () => {
      closeHistoryModal();
      await loadPastAttemptForReview(item.attemptId, item);
    });

    dom.historyTableBody.appendChild(tr);
  });
}

async function loadPastAttemptForReview(attemptId, summaryItem) {
  lastAttemptId = attemptId;
  reviewQuestionsData = null;

  try {
    const res = await fetch(`${API_BASE_URL}/student/exam-attempts/${attemptId}`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const resp = await res.json();
      if (resp.data) {
        const d = resp.data;
        reviewQuestionsData = d.questions || [];

        displayResults({
          exam: { name: d.examTitle, code: d.examCode },
          total: d.totalQuestions || 40,
          correctCount: d.correctCount || 0,
          wrongCount: (d.totalQuestions || 40) - (d.correctCount || 0),
          unansweredCount: 0,
          score10: d.score != null ? d.score : 0,
          timeSpentSeconds: d.timeSpentSec || 0,
          feedback: `Lần làm bài lúc ${d.submittedAt ? new Date(d.submittedAt).toLocaleDateString('vi-VN') : ''}`
        });

        switchView('results');
        toggleReviewStream();
        return;
      }
    }
  } catch (err) {
    console.error('Không thể tải chi tiết lần làm bài:', err);
  }

  // Fallback if network fails
  displayResults({
    exam: { name: summaryItem.examTitle, code: summaryItem.examCode },
    total: summaryItem.totalQuestions || 40,
    correctCount: summaryItem.correctCount || 0,
    wrongCount: (summaryItem.totalQuestions || 40) - (summaryItem.correctCount || 0),
    unansweredCount: 0,
    score10: summaryItem.score || 0,
    timeSpentSeconds: summaryItem.timeSpentSec || 0,
    feedback: null
  });
  switchView('results');
}

function closeHistoryModal() {
  if (!dom.modalHistory) return;
  dom.modalHistory.setAttribute('hidden', '');
  dom.modalHistory.style.display = 'none';
}

// =========================================================================
// EVENT LISTENERS BINDING
// =========================================================================
function initEventListeners() {
  // Search
  dom.searchInput?.addEventListener('input', () => applyCatalogFilter());

  // Subject Filter
  dom.filterSubject?.addEventListener('change', () => applyCatalogFilter());

  // Reload Button
  dom.btnReload?.addEventListener('click', () => fetchExams());

  // History Button & Modal
  dom.btnOpenHistory?.addEventListener('click', openHistoryModal);
  dom.btnCloseHistory?.addEventListener('click', closeHistoryModal);
  dom.modalHistory?.addEventListener('click', (e) => {
    if (e.target === dom.modalHistory) closeHistoryModal();
  });

  // Abort Exam Taking
  dom.btnAbort?.addEventListener('click', () => {
    const confirmExit = confirm('Bạn có chắc chắn muốn rời khỏi bài thi không?\nTiến trình làm bài hiện tại sẽ không được lưu.');
    if (confirmExit) {
      if (timerInterval) clearInterval(timerInterval);
      switchView('list');
    }
  });

  // Submit Buttons
  dom.btnSubmit?.addEventListener('click', handleExamSubmitAttempt);
  dom.btnSubmitFooter?.addEventListener('click', handleExamSubmitAttempt);

  // Review Toggle
  dom.btnToggleReview?.addEventListener('click', toggleReviewStream);

  // Review Filter: All
  dom.filterReviewAll?.addEventListener('click', () => {
    reviewFilter = 'all';
    dom.filterReviewAll.className = 'px-3 py-1 bg-[#2d2d2d] text-white rounded-lg text-xs font-mono font-bold';
    dom.filterReviewWrong.className = 'px-3 py-1 bg-white border border-[#2d2d2d] rounded-lg text-xs font-mono font-bold hover:bg-gray-100';
    renderReviewQuestions();
  });

  // Review Filter: Wrong Only
  dom.filterReviewWrong?.addEventListener('click', () => {
    reviewFilter = 'wrong';
    dom.filterReviewWrong.className = 'px-3 py-1 bg-[#2d2d2d] text-white rounded-lg text-xs font-mono font-bold';
    dom.filterReviewAll.className = 'px-3 py-1 bg-white border border-[#2d2d2d] rounded-lg text-xs font-mono font-bold hover:bg-gray-100';
    renderReviewQuestions();
  });

  // Retake Exam
  dom.btnRetake?.addEventListener('click', () => {
    if (currentExam) {
      startExamTaking(currentExam);
    } else {
      switchView('list');
    }
  });

  // Finish to List
  dom.btnFinishToList?.addEventListener('click', () => {
    currentExam = null;
    currentQuestions = [];
    userAnswers = {};
    flaggedQuestions.clear();
    reviewQuestionsData = null;
    lastAttemptId = null;
    switchView('list');
  });
}

// =========================================================================
// INITIALIZATION
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  fetchExams();
});
