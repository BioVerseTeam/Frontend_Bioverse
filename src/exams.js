const API_BASE_URL = '/api';

// State
let exams = [];
let currentExam = null;
let currentQuestions = [];
let userAnswers = {}; // { questionId: answerId }
let isReviewMode = false;

// DOM Elements
const views = {
  list: document.getElementById('view-exam-list'),
  details: document.getElementById('view-exam-details'),
  take: document.getElementById('view-take-exam'),
  results: document.getElementById('view-exam-results')
};

const elems = {
  examsGrid: document.getElementById('exams-grid'),
  searchInput: document.getElementById('search-exam-input'),
  loadingExams: document.getElementById('loading-exams'),

  detailName: document.getElementById('detail-exam-name'),
  detailSubject: document.getElementById('detail-exam-subject'),
  detailType: document.getElementById('detail-exam-type'),
  detailCode: document.getElementById('detail-exam-code'),
  detailDesc: document.getElementById('detail-exam-desc'),

  takingTitle: document.getElementById('taking-exam-title'),
  questionsContainer: document.getElementById('questions-container'),

  resultScore: document.getElementById('result-score'),
  resultTotal: document.getElementById('result-total'),
  resultMessage: document.getElementById('result-message'),

  btnBackToList: document.getElementById('btn-back-to-list'),
  btnStartExam: document.getElementById('btn-start-exam'),
  btnSubmitExam: document.getElementById('btn-submit-exam'),
  btnReviewExam: document.getElementById('btn-review-exam'),
  btnFinishExam: document.getElementById('btn-finish-exam'),
  btnBackTo3D: document.getElementById('back-to-3d')
};

// Navigation
function switchView(viewName) {
  Object.values(views).forEach(v => {
    v.classList.remove('active');
    v.classList.add('hidden');
  });
  views[viewName].classList.remove('hidden');
  views[viewName].classList.add('active');
  // Scroll to top
  const mainCard = views[viewName].querySelector('.exam-main-card');
  if (mainCard) mainCard.scrollTop = 0;
}

// Fetch Exams
async function fetchExams() {
  elems.loadingExams.classList.remove('hidden');
  elems.examsGrid.innerHTML = '';

  try {
    const res = await fetch(`${API_BASE_URL}/exams`);
    const data = await res.json();
    if (res.ok && data.payload) {
      exams = data.payload || [];
      renderExams(exams);
    } else {
      console.error("API trả về lỗi hoặc không có payload:", data);
      elems.examsGrid.innerHTML = '<p class="error-msg">Không thể tải danh sách đề thi. Server trả về lỗi.</p>';
    }
  } catch (err) {
    console.error("Lỗi khi tải danh sách đề thi:", err);
    elems.examsGrid.innerHTML = '<p class="error-msg">Không thể tải danh sách đề thi. Vui lòng kiểm tra kết nối tới server backend.</p>';
  } finally {
    elems.loadingExams.classList.add('hidden');
  }
}

// Render Exams List
function renderExams(examList) {
  elems.examsGrid.innerHTML = '';

  if (examList.length === 0) {
    elems.examsGrid.innerHTML = '<p class="text-muted">Không tìm thấy đề thi nào.</p>';
    return;
  }

  examList.forEach(exam => {
    const card = document.createElement('div');
    card.className = 'exam-card';
    card.innerHTML = `
      <h3>${exam.name || 'Chưa có tên'}</h3>
      <div class="exam-meta">
        <p>${exam.description ? exam.description.substring(0, 80) + '...' : 'Không có mô tả'}</p>
      </div>
      <div class="badges">
        <span class="badge badge-subject">${exam.subjectName || 'N/A'}</span>
        ${exam.type ? `<span class="badge badge-type">${exam.type}</span>` : ''}
        ${exam.code ? `<span class="badge badge-code">${exam.code}</span>` : ''}
      </div>
    `;
    card.addEventListener('click', () => handleExamClick(exam));
    elems.examsGrid.appendChild(card);
  });
}

// Search Handler
elems.searchInput.addEventListener('input', (e) => {
  const term = e.target.value.toLowerCase();
  const filtered = exams.filter(ex =>
    (ex.name && ex.name.toLowerCase().includes(term)) ||
    (ex.subjectName && ex.subjectName.toLowerCase().includes(term)) ||
    (ex.code && ex.code.toLowerCase().includes(term))
  );
  renderExams(filtered);
});

// Click on an Exam in the list
async function handleExamClick(exam) {
  currentExam = exam;

  // Show loading state on the clicked card (optional, but good UX)
  switchView('take');
  elems.takingTitle.textContent = `Đang tải câu hỏi cho đề: ${exam.name}...`;
  elems.questionsContainer.innerHTML = '<div class="loading-spinner">Đang tải dữ liệu...</div>';
  elems.btnSubmitExam.style.display = 'none';

  try {
    const res = await fetch(`${API_BASE_URL}/questions/exam/${currentExam.id}`);
    const data = await res.json();

    if (res.ok && data.payload) {
      console.log("Dữ liệu câu hỏi tải về từ API:", data.payload);
      currentQuestions = data.payload || [];
      userAnswers = {};
      isReviewMode = false;

      elems.takingTitle.textContent = `Đang làm bài: ${currentExam.name}`;
      renderQuestions();
    } else {
      console.error("API trả về lỗi hoặc không có payload:", data);
      elems.questionsContainer.innerHTML = '<p class="error-msg">Không thể tải danh sách câu hỏi. Server trả về lỗi.</p>';
    }
  } catch (err) {
    console.error("Lỗi khi tải câu hỏi:", err);
    elems.questionsContainer.innerHTML = '<p class="error-msg">Lỗi kết nối tới server khi tải câu hỏi.</p>';
  }
}

// Show Exam Details (No longer used directly from list, but keeping for reference if needed)
function showExamDetails(exam) {
  currentExam = exam;
  elems.detailName.textContent = exam.name || 'Không có tên';
  elems.detailSubject.textContent = exam.subjectName || 'Môn: N/A';
  elems.detailType.textContent = exam.type || 'Loại: N/A';
  elems.detailCode.textContent = exam.code || 'Mã: N/A';
  elems.detailDesc.textContent = exam.description || 'Không có mô tả chi tiết.';

  switchView('details');
}

elems.btnBackToList.addEventListener('click', () => {
  switchView('list');
});

// Start Exam (Old button logic)
elems.btnStartExam.addEventListener('click', async () => {
  handleExamClick(currentExam);
});

// Render Questions
function renderQuestions() {
  elems.questionsContainer.innerHTML = '';

  if (currentQuestions.length === 0) {
    elems.questionsContainer.innerHTML = '<p>Đề thi này chưa có câu hỏi nào.</p>';
    elems.btnSubmitExam.style.display = 'none';
    return;
  }

  elems.btnSubmitExam.style.display = 'block';

  currentQuestions.forEach((q, index) => {
    const qBlock = document.createElement('div');
    qBlock.className = 'question-block';
    qBlock.id = `question-${q.id}`;

    // Xử lý hình ảnh của câu hỏi (nếu có)
    let questionImagesHtml = '';
    if (q.questionImageResponses && q.questionImageResponses.length > 0) {
      questionImagesHtml = '<div class="question-images" style="margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap;">';
      q.questionImageResponses.forEach(img => {
        if (img.url) {
          questionImagesHtml += `<img src="${img.url}" alt="${img.name || 'Image'}" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">`;
        }
      });
      questionImagesHtml += '</div>';
    }

    let answersHtml = '';
    const answers = q.answers || [];

    answers.forEach(ans => {
      const isSelected = userAnswers[q.id] === ans.id;
      let extraClass = '';

      if (isReviewMode) {
        if (ans.correct) extraClass += ' correct-answer';
        if (isSelected && !ans.correct) extraClass += ' wrong-answer';
      } else if (isSelected) {
        extraClass = 'selected';
      }

      const disabledAttr = isReviewMode ? 'disabled' : '';
      const checkedAttr = isSelected ? 'checked' : '';

      // Xử lý hình ảnh của đáp án (nếu có)
      let answerImagesHtml = '';
      if (ans.answerImageResponses && ans.answerImageResponses.length > 0) {
        answerImagesHtml = '<div class="answer-images" style="margin-top: 8px; display: flex; gap: 10px; flex-wrap: wrap;">';
        ans.answerImageResponses.forEach(img => {
          if (img.url) {
            answerImagesHtml += `<img src="${img.url}" alt="${img.name || 'Image'}" style="max-height: 100px; border-radius: 4px;">`;
          }
        });
        answerImagesHtml += '</div>';
      }

      answersHtml += `
        <label class="answer-option ${extraClass}">
          <div style="display: flex; align-items: flex-start;">
            <input type="radio" name="question_${q.id}" value="${ans.id}" ${checkedAttr} ${disabledAttr} style="margin-top: 4px;">
            <div style="flex: 1;">
              <span class="answer-text">${ans.content || ''}</span>
              ${answerImagesHtml}
            </div>
          </div>
        </label>
      `;
    });

    const explanationHtml = isReviewMode && q.explain ? `
      <div class="question-explanation visible">
        <strong>Giải thích:</strong> ${q.explain}
      </div>
    ` : '';

    qBlock.innerHTML = `
      <div class="question-text">
        <span class="question-number">Câu ${index + 1}:</span>
        ${q.content || ''}
      </div>
      ${questionImagesHtml}
      <div class="answers-list" style="margin-top: 20px;">
        ${answersHtml}
      </div>
      ${explanationHtml}
    `;

    elems.questionsContainer.appendChild(qBlock);

    // Attach event listeners for answer selection
    if (!isReviewMode) {
      const radioInputs = qBlock.querySelectorAll(`input[name="question_${q.id}"]`);
      const optionLabels = qBlock.querySelectorAll('.answer-option');

      radioInputs.forEach(radio => {
        radio.addEventListener('change', (e) => {
          userAnswers[q.id] = parseInt(e.target.value);
          // Update visual selected state
          optionLabels.forEach(lbl => lbl.classList.remove('selected'));
          e.target.closest('.answer-option').classList.add('selected');
        });
      });
    }
  });

  if (isReviewMode) {
    elems.btnSubmitExam.style.display = 'none';
  }
}

// Submit Exam
elems.btnSubmitExam.addEventListener('click', () => {
  const answeredCount = Object.keys(userAnswers).length;
  if (answeredCount < currentQuestions.length) {
    const confirmSubmit = confirm(`Bạn mới làm ${answeredCount}/${currentQuestions.length} câu. Bạn có chắc chắn muốn nộp bài không?`);
    if (!confirmSubmit) return;
  }

  calculateScore();
});

function calculateScore() {
  let score = 0;

  currentQuestions.forEach(q => {
    const selectedAnsId = userAnswers[q.id];
    if (!selectedAnsId) return;

    const selectedAns = (q.answers || []).find(a => a.id === selectedAnsId);
    if (selectedAns && selectedAns.correct) {
      score++;
    }
  });

  const total = currentQuestions.length;
  elems.resultScore.textContent = score;
  elems.resultTotal.textContent = total;

  const percent = total > 0 ? (score / total) * 100 : 0;
  let msg = "Tuyệt vời!";
  if (percent < 50) msg = "Cần cố gắng hơn nhé!";
  else if (percent < 80) msg = "Khá tốt!";
  else if (percent < 100) msg = "Rất xuất sắc!";
  else msg = "Hoàn hảo!";

  elems.resultMessage.textContent = msg;

  switchView('results');
}

// Review Exam
elems.btnReviewExam.addEventListener('click', () => {
  isReviewMode = true;
  renderQuestions();
  switchView('take');
});

// Finish Exam
elems.btnFinishExam.addEventListener('click', () => {
  currentExam = null;
  currentQuestions = [];
  userAnswers = {};
  switchView('list');
});

// Back to 3D
elems.btnBackTo3D.addEventListener('click', () => {
  window.location.href = '/index.html';
});

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  fetchExams();
});
