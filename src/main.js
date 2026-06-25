import { MitosisSimulation } from './mitosis.js';
import { SkullViewer } from './skull.js';
import { skullRegions } from './skullData.js';
import { ParameciumViewer } from './paramecium.js';
import { parameciumRegions } from './parameciumData.js';
import { phases, quizQuestions } from './data.js';
import { ChatBox } from './components/chatBox.js';


// ============================================
// STATE
// ============================================
let currentMode = 'mitosis'; // 'mitosis' | 'skull'

// Mitosis state
let sim;
let progress = 0.0;
let isPlaying = false;
let lastTime = 0;
let playSpeed = 0.02;
let activePhaseIndex = 0;
let showLabels = true;
let isQuizMode = false;

// Quiz State
let currentQuestionIndex = 0;
let score = 0;
let selectedOptionIndex = null;
let questionAnswered = false;

// Skull state
let skullViewer = null;
let selectedSkullRegion = null;

// Paramecium state
let parameciumViewer = null;
let selectedParameciumRegion = null;

// DOM Elements
let playBtn, prevBtn, nextBtn, timeline, timelineSlider, phaseTicks;
let phaseTitle, phaseSubtitle, phaseDesc, eventsList;
let sidebarContent, quizBtn, labelsToggle;
let labelsContainer;

// Mode UI elements
let modeMitosisBtn, modeSkullBtn, modeParameciumBtn;
let mitosisSidebar, skullSidebar, parameciumSidebar;
let mitosisControls, skullControls, parameciumControls;
let skullInfoPopup, skullHoverTag;

// ============================================
// INIT
// ============================================
function init() {
  // Initialize 3D Simulation (Mitosis - default mode)
  sim = new MitosisSimulation('canvas-container');
  sim.onPartClick = handleMitosisPartClick;

  // Cache DOM Elements
  playBtn = document.getElementById('play-btn');
  prevBtn = document.getElementById('prev-btn');
  nextBtn = document.getElementById('next-btn');
  timeline = document.getElementById('timeline');
  timelineSlider = document.getElementById('timeline-slider');
  phaseTicks = document.querySelectorAll('.tick');

  phaseTitle = document.getElementById('phase-title');
  phaseSubtitle = document.getElementById('phase-subtitle');
  phaseDesc = document.getElementById('phase-desc');
  eventsList = document.getElementById('events-list');

  sidebarContent = document.getElementById('sidebar-content');
  quizBtn = document.getElementById('quiz-btn');
  labelsToggle = document.getElementById('labels-toggle');
  labelsContainer = document.getElementById('labels-container');

  // Mode elements
  modeMitosisBtn = document.getElementById('mode-mitosis');
  modeSkullBtn = document.getElementById('mode-skull');
  modeParameciumBtn = document.getElementById('mode-paramecium');
  mitosisSidebar = document.getElementById('mitosis-sidebar');
  skullSidebar = document.getElementById('skull-sidebar');
  parameciumSidebar = document.getElementById('paramecium-sidebar');
  mitosisControls = document.getElementById('mitosis-controls');
  skullControls = document.getElementById('skull-controls');
  parameciumControls = document.getElementById('paramecium-controls');
  skullInfoPopup = document.getElementById('skull-info-popup');
  skullHoverTag = document.getElementById('skull-hover-tag');

  // Setup Event Listeners
  setupControls();
  setupModeSwitch();
  setupSkullUI();
  setupParameciumUI();
  
  // Set initial phase UI
  updatePhaseUI(0);
  
  // Start Loop
  lastTime = performance.now();
  requestAnimationFrame(animate);

  // Initialize AI ChatBox
  new ChatBox();
}

// ============================================
// MODE SWITCHING
// ============================================
function setupModeSwitch() {
  modeMitosisBtn.addEventListener('click', () => switchMode('mitosis'));
  modeSkullBtn.addEventListener('click', () => switchMode('skull'));
  modeParameciumBtn.addEventListener('click', () => switchMode('paramecium'));
}

function switchMode(mode) {
  if (mode === currentMode) return;
  currentMode = mode;

  // Update tab buttons
  modeMitosisBtn.classList.toggle('active', mode === 'mitosis');
  modeSkullBtn.classList.toggle('active', mode === 'skull');
  modeParameciumBtn.classList.toggle('active', mode === 'paramecium');

  // Ẩn toàn bộ UI của mọi mode, sau đó chỉ bật mode đang chọn
  mitosisSidebar.classList.add('hidden');
  mitosisControls.classList.add('hidden');
  skullSidebar.classList.add('hidden');
  skullControls.classList.add('hidden');
  parameciumSidebar.classList.add('hidden');
  parameciumControls.classList.add('hidden');
  skullInfoPopup.classList.add('hidden');
  if (skullHoverTag) skullHoverTag.classList.add('hidden');

  // Ẩn mọi renderer trước
  if (sim && sim.renderer) sim.renderer.domElement.style.display = 'none';
  if (skullViewer && skullViewer.renderer) skullViewer.renderer.domElement.style.display = 'none';
  if (parameciumViewer && parameciumViewer.renderer) parameciumViewer.renderer.domElement.style.display = 'none';

  // Tạm dừng mô phỏng phân bào khi rời mode đó
  isPlaying = false;
  updatePlayButtonUI();

  const labels = labelsContainer;
  const hud = document.getElementById('hud-overlay');

  if (mode === 'mitosis') {
    mitosisSidebar.classList.remove('hidden');
    mitosisControls.classList.remove('hidden');
    labels.classList.remove('hidden');
    hud.style.display = '';
    if (sim && sim.renderer) sim.renderer.domElement.style.display = 'block';

  } else if (mode === 'skull') {
    skullSidebar.classList.remove('hidden');
    skullControls.classList.remove('hidden');
    labels.classList.add('hidden');
    hud.style.display = 'none';

    if (!skullViewer) {
      skullViewer = new SkullViewer('canvas-container');
      skullViewer.onRegionClick = handleSkullRegionClick;
      skullViewer.onHover = handleSkullHover;
    } else {
      skullViewer.renderer.domElement.style.display = 'block';
    }

  } else if (mode === 'paramecium') {
    parameciumSidebar.classList.remove('hidden');
    parameciumControls.classList.remove('hidden');
    labels.classList.add('hidden');
    hud.style.display = 'none';

    if (!parameciumViewer) {
      parameciumViewer = new ParameciumViewer('canvas-container');
      parameciumViewer.onRegionClick = handleParameciumRegionClick;
      parameciumViewer.onHover = handleSkullHover; // dùng chung nhãn bám chuột
      parameciumViewer.onRevealChange = handleParameciumRevealChange;
    } else {
      parameciumViewer.renderer.domElement.style.display = 'block';
    }
  }
}

// ============================================
// SKULL UI
// ============================================
function setupSkullUI() {
  // Populate bone list in sidebar
  const boneList = document.getElementById('skull-bone-list');
  skullRegions.forEach(region => {
    const item = document.createElement('div');
    item.className = 'skull-bone-item';
    item.dataset.regionId = region.id;
    item.innerHTML = `
      <div class="skull-bone-dot" style="background-color: ${region.color}; color: ${region.color}"></div>
      <span class="skull-bone-name">${region.name}</span>
      <span class="skull-bone-latin">${region.latin}</span>
    `;
    item.addEventListener('click', () => {
      selectSkullRegion(region);
      if (skullViewer) {
        skullViewer.highlightRegion(region.id);
        skullViewer.focusRegion(region.id);
      }
    });
    boneList.appendChild(item);
  });

  // Skull camera presets
  document.getElementById('skull-btn-front').addEventListener('click', (e) => {
    setActiveSkullCameraBtn(e.target);
    if (skullViewer) skullViewer.setCameraPreset('front');
  });
  document.getElementById('skull-btn-side').addEventListener('click', (e) => {
    setActiveSkullCameraBtn(e.target);
    if (skullViewer) skullViewer.setCameraPreset('side');
  });
  document.getElementById('skull-btn-back').addEventListener('click', (e) => {
    setActiveSkullCameraBtn(e.target);
    if (skullViewer) skullViewer.setCameraPreset('back');
  });
  document.getElementById('skull-btn-top').addEventListener('click', (e) => {
    setActiveSkullCameraBtn(e.target);
    if (skullViewer) skullViewer.setCameraPreset('top');
  });

  // Info popup close button (dùng chung cho skull & trùng giày)
  document.getElementById('skull-info-close').addEventListener('click', () => {
    skullInfoPopup.classList.add('hidden');
    if (currentMode === 'paramecium') {
      selectedParameciumRegion = null;
      updateParameciumListHighlight(null);
      if (parameciumViewer) parameciumViewer.clearHighlight();
    } else {
      selectedSkullRegion = null;
      updateBoneListHighlight(null);
      if (skullViewer) skullViewer.clearHighlight();
    }
  });
}

function setActiveSkullCameraBtn(activeBtn) {
  document.querySelectorAll('#skull-sidebar .camera-presets .btn').forEach(btn => {
    btn.classList.remove('active');
  });
  activeBtn.classList.add('active');
}

function handleSkullRegionClick(region, screenPos) {
  if (region) {
    selectSkullRegion(region, screenPos);
  } else {
    // Clicked empty space
    skullInfoPopup.classList.add('hidden');
    selectedSkullRegion = null;
    updateBoneListHighlight(null);
  }
}

// Hiển thị nhãn tên xương nhỏ bám theo con trỏ khi rê chuột lên mô hình
function handleSkullHover(region, screenPos) {
  if (!skullHoverTag) return;
  if (region && screenPos) {
    skullHoverTag.textContent = region.name;
    skullHoverTag.style.setProperty('--tag-color', region.color);
    skullHoverTag.style.left = `${screenPos.x}px`;
    skullHoverTag.style.top = `${screenPos.y}px`;
    skullHoverTag.classList.remove('hidden');
  } else {
    skullHoverTag.classList.add('hidden');
  }
}

function selectSkullRegion(region, screenPos) {
  selectedSkullRegion = region;

  // Update popup color property
  skullInfoPopup.style.setProperty('--region-color', region.color);

  // Update popup
  document.getElementById('skull-info-color-dot').style.backgroundColor = region.color;
  document.getElementById('skull-info-color-dot').style.color = region.color;
  document.getElementById('skull-info-name').textContent = region.name;
  document.getElementById('skull-info-latin').textContent = region.latin;
  document.getElementById('skull-info-desc').textContent = region.description;
  document.getElementById('skull-info-function').textContent = region.function;
  document.getElementById('skull-info-location').textContent = region.location;

  // Hiển thị popup ngay tại vị trí vừa nhấn (kẹp trong khung nhìn)
  positionPopupAt(screenPos);

  // Show popup with re-trigger animation
  skullInfoPopup.classList.remove('hidden');
  skullInfoPopup.style.animation = 'none';
  skullInfoPopup.offsetHeight; // force reflow
  skullInfoPopup.style.animation = '';

  // Update bone list highlight
  updateBoneListHighlight(region.id);
}

// Đặt popup ở PHÍA TRỐNG đối diện với điểm nhấn để không che mất hộp sọ.
// Bấm nửa trái màn hình -> popup nằm bên phải; bấm nửa phải -> popup bên trái.
function positionPopupAt(screenPos) {
  const margin = 24;
  const rect = skullInfoPopup.getBoundingClientRect();
  const popW = rect.width || 420;
  const popH = rect.height || 360;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Không có vị trí (chọn từ sidebar) -> mặc định góc dưới-trái
  if (!screenPos) {
    skullInfoPopup.style.left = `${margin}px`;
    skullInfoPopup.style.right = 'auto';
    skullInfoPopup.style.top = 'auto';
    skullInfoPopup.style.bottom = '140px';
    return;
  }

  // Đặt sang nửa đối diện với chỗ bấm theo chiều ngang
  const clickedLeftHalf = screenPos.x < vw / 2;
  const left = clickedLeftHalf ? vw - popW - margin : margin;

  // Căn dọc gần ngang tầm điểm bấm nhưng luôn kẹp trong khung nhìn
  let top = screenPos.y - popH / 2;
  top = Math.max(margin, Math.min(top, vh - popH - margin));

  skullInfoPopup.style.left = `${left}px`;
  skullInfoPopup.style.top = `${top}px`;
  skullInfoPopup.style.right = 'auto';
  skullInfoPopup.style.bottom = 'auto';
}

function updateBoneListHighlight(regionId) {
  document.querySelectorAll('#skull-bone-list .skull-bone-item').forEach(item => {
    if (item.dataset.regionId === regionId) {
      item.classList.add('active');
      // Scroll into view
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      item.classList.remove('active');
    }
  });
}

// ============================================
// PARAMECIUM (TRÙNG GIÀY) UI
// ============================================
function setupParameciumUI() {
  // Đổ danh sách bộ phận vào sidebar
  const partList = document.getElementById('paramecium-part-list');
  parameciumRegions.forEach(region => {
    const item = document.createElement('div');
    item.className = 'skull-bone-item';
    item.dataset.regionId = region.id;
    item.innerHTML = `
      <div class="skull-bone-dot" style="background-color: ${region.color}; color: ${region.color}"></div>
      <span class="skull-bone-name">${region.name}</span>
      <span class="skull-bone-latin">${region.latin}</span>
    `;
    item.addEventListener('click', () => {
      if (!parameciumViewer) return;
      // Bộ phận bên trong: tự động bổ đôi rồi soi
      if (region.isShell) {
        parameciumViewer.setInside(false);
        return;
      }
      if (!parameciumViewer.isInside) parameciumViewer.setInside(true);
      selectParameciumRegion(region, null);
      parameciumViewer.highlightRegion(region.id);
      parameciumViewer.focusRegion(region.id);
    });
    partList.appendChild(item);
  });

  // Nút bổ đôi / đóng lại
  document.getElementById('para-reveal-btn').addEventListener('click', () => {
    if (parameciumViewer) parameciumViewer.toggleInside();
  });

  // Góc nhìn
  document.getElementById('para-btn-front').addEventListener('click', (e) => {
    setActiveParameciumCameraBtn(e.target);
    if (parameciumViewer) parameciumViewer.setCameraPreset('front');
  });
  document.getElementById('para-btn-side').addEventListener('click', (e) => {
    setActiveParameciumCameraBtn(e.target);
    if (parameciumViewer) parameciumViewer.setCameraPreset('side');
  });
  document.getElementById('para-btn-top').addEventListener('click', (e) => {
    setActiveParameciumCameraBtn(e.target);
    if (parameciumViewer) parameciumViewer.setCameraPreset('top');
  });
}

function setActiveParameciumCameraBtn(activeBtn) {
  document.querySelectorAll('#paramecium-sidebar .camera-presets .btn').forEach(btn => {
    btn.classList.remove('active');
  });
  activeBtn.classList.add('active');
}

function handleParameciumRegionClick(region, screenPos) {
  if (region) {
    selectParameciumRegion(region, screenPos);
  } else {
    skullInfoPopup.classList.add('hidden');
    selectedParameciumRegion = null;
    updateParameciumListHighlight(null);
  }
}

// Khi chuyển giữa "nguyên con" và "bổ đôi": cập nhật nhãn nút + gợi ý
function handleParameciumRevealChange(isInside) {
  const label = document.getElementById('para-reveal-label');
  const btn = document.getElementById('para-reveal-btn');
  const hint = document.getElementById('para-hint-text');
  const intro = document.getElementById('paramecium-intro-desc');

  if (isInside) {
    if (label) label.textContent = 'Xem toàn bộ';
    if (btn) btn.classList.add('active');
    if (hint) hint.textContent = 'Đã bổ đôi — nhấn vào từng bào quan (nhân, không bào…) để xem mô tả & chức năng. Bấm “Xem toàn bộ” để khép lại.';
    if (intro) intro.innerHTML = 'Đang xem cấu tạo bên trong. Nhấn vào từng bộ phận trên mô hình hoặc trong danh sách để xem chi tiết.';
  } else {
    if (label) label.textContent = 'Xem bên trong';
    if (btn) btn.classList.remove('active');
    if (hint) hint.textContent = 'Đang xem nguyên con. Bấm “Xem bên trong” để vỏ tế bào mờ đi và lộ các bào quan — sau đó nhấn từng bộ phận để xem thông tin.';
    if (intro) intro.innerHTML = 'Đang xem nguyên con. Nhấn nút <b>“Xem bên trong”</b> (hoặc bấm thẳng vào con trùng) để bổ đôi và khám phá từng bào quan.';
    // đóng popup khi khép lại
    skullInfoPopup.classList.add('hidden');
    selectedParameciumRegion = null;
    updateParameciumListHighlight(null);
  }
}

function selectParameciumRegion(region, screenPos) {
  selectedParameciumRegion = region;

  skullInfoPopup.style.setProperty('--region-color', region.color);
  document.getElementById('skull-info-color-dot').style.backgroundColor = region.color;
  document.getElementById('skull-info-color-dot').style.color = region.color;
  document.getElementById('skull-info-name').textContent = region.name;
  document.getElementById('skull-info-latin').textContent = region.latin;
  document.getElementById('skull-info-desc').textContent = region.description;
  document.getElementById('skull-info-function').textContent = region.function;
  document.getElementById('skull-info-location').textContent = region.location;

  positionPopupAt(screenPos);

  skullInfoPopup.classList.remove('hidden');
  skullInfoPopup.style.animation = 'none';
  skullInfoPopup.offsetHeight; // force reflow
  skullInfoPopup.style.animation = '';

  updateParameciumListHighlight(region.id);
}

function updateParameciumListHighlight(regionId) {
  document.querySelectorAll('#paramecium-part-list .skull-bone-item').forEach(item => {
    if (item.dataset.regionId === regionId) {
      item.classList.add('active');
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      item.classList.remove('active');
    }
  });
}

// ============================================
// MITOSIS CLICK-TO-LEARN (mô hình Blender)
// ============================================
// Dùng chung popup info với skull/trùng giày. Đọc custom props từ GLB.
function handleMitosisPartClick(info, screenPos) {
  if (!info) {
    skullInfoPopup.classList.add('hidden');
    return;
  }
  const color = '#a855f7';
  skullInfoPopup.style.setProperty('--region-color', color);
  document.getElementById('skull-info-color-dot').style.backgroundColor = color;
  document.getElementById('skull-info-color-dot').style.color = color;
  document.getElementById('skull-info-name').textContent = info.display_name || '';
  document.getElementById('skull-info-latin').textContent = '';
  document.getElementById('skull-info-desc').textContent = info.description || '';
  document.getElementById('skull-info-function').textContent = info.function || '';
  document.getElementById('skull-info-location').textContent =
    info.stage ? `Giai đoạn: ${info.stage}` : '';

  positionPopupAt(screenPos);

  skullInfoPopup.classList.remove('hidden');
  skullInfoPopup.style.animation = 'none';
  skullInfoPopup.offsetHeight; // force reflow
  skullInfoPopup.style.animation = '';
}

// ============================================
// MITOSIS CONTROLS (unchanged logic)
// ============================================
function setupControls() {
  // Play/Pause
  playBtn.addEventListener('click', () => {
    isPlaying = !isPlaying;
    updatePlayButtonUI();
  });

  // Prev/Next Phase
  prevBtn.addEventListener('click', () => {
    goToPhase(activePhaseIndex - 1);
  });
  nextBtn.addEventListener('click', () => {
    goToPhase(activePhaseIndex + 1);
  });

  // Timeline Slider
  timelineSlider.addEventListener('input', (e) => {
    isPlaying = false;
    updatePlayButtonUI();
    progress = parseFloat(e.target.value) / 100;
    sim.update(progress);
    checkPhaseChange();
  });

  // Timeline Tick Marks
  phaseTicks.forEach(tick => {
    tick.addEventListener('click', () => {
      const targetPhaseId = parseInt(tick.dataset.phase);
      goToPhase(targetPhaseId);
    });
  });

  // Camera Presets
  document.getElementById('btn-persp').addEventListener('click', (e) => {
    setActiveCameraBtn(e.target);
    sim.setCameraPreset('perspective');
  });
  document.getElementById('btn-side').addEventListener('click', (e) => {
    setActiveCameraBtn(e.target);
    sim.setCameraPreset('side');
  });
  document.getElementById('btn-equator').addEventListener('click', (e) => {
    setActiveCameraBtn(e.target);
    sim.setCameraPreset('equator');
  });

  // Labels Toggle
  labelsToggle.addEventListener('change', (e) => {
    showLabels = e.target.checked;
    if (!showLabels) {
      labelsContainer.innerHTML = '';
    }
  });

  // Quiz Button Toggle
  quizBtn.addEventListener('click', () => {
    if (isQuizMode) {
      exitQuizMode();
    } else {
      enterQuizMode();
    }
  });
}

function updatePlayButtonUI() {
  if (isPlaying) {
    playBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`; // Pause icon
  } else {
    playBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`; // Play icon
  }
}

function setActiveCameraBtn(activeBtn) {
  document.querySelectorAll('#mitosis-sidebar .camera-presets .btn').forEach(btn => {
    btn.classList.remove('active');
  });
  activeBtn.classList.add('active');
}

function goToPhase(phaseIndex) {
  if (phaseIndex < 0 || phaseIndex >= phases.length) return;
  isPlaying = false;
  updatePlayButtonUI();

  const phase = phases[phaseIndex];
  const targetProgress = phase.range[0];
  animateProgressSlider(targetProgress);
}

function animateProgressSlider(targetProgress) {
  const startProgress = progress;
  const duration = 500;
  const startTime = performance.now();

  const easeOutQuad = t => t * (2 - t);

  const step = (now) => {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1.0);
    const easedT = easeOutQuad(t);

    progress = startProgress + (targetProgress - startProgress) * easedT;
    sim.update(progress);
    timelineSlider.value = progress * 100;
    checkPhaseChange();

    if (t < 1.0) {
      requestAnimationFrame(step);
    }
  };
  requestAnimationFrame(step);
}

function checkPhaseChange() {
  let matchedIndex = 0;
  for (let i = 0; i < phases.length; i++) {
    const [start, end] = phases[i].range;
    if (progress >= start - 0.001 && progress <= end + 0.001) {
      matchedIndex = i;
      break;
    }
  }

  if (matchedIndex !== activePhaseIndex) {
    activePhaseIndex = matchedIndex;
    updatePhaseUI(activePhaseIndex);
  }
}

function updatePhaseUI(phaseIndex) {
  const phase = phases[phaseIndex];
  
  phaseTicks.forEach(tick => {
    const tickPhase = parseInt(tick.dataset.phase);
    if (tickPhase === phaseIndex) {
      tick.classList.add('active');
    } else {
      tick.classList.remove('active');
    }
  });

  if (isQuizMode) return;

  phaseTitle.style.opacity = 0;
  phaseSubtitle.style.opacity = 0;
  eventsList.style.opacity = 0;

  setTimeout(() => {
    phaseTitle.innerHTML = `${phase.title} <span class="phase-badge" style="background-color:${phase.color}33; color:${phase.color}; border: 1px solid ${phase.color}55">Kỳ ${phase.id + 1}</span>`;
    phaseSubtitle.textContent = phase.subtitle;
    phaseDesc.textContent = phase.description;
    
    eventsList.innerHTML = phase.events
      .map(event => `<li>${event}</li>`)
      .join('');

    const bullets = eventsList.querySelectorAll('li');
    bullets.forEach(li => {
      li.style.setProperty('--accent-purple', phase.color);
    });

    phaseTitle.style.opacity = 1;
    phaseSubtitle.style.opacity = 1;
    eventsList.style.opacity = 1;
  }, 150);
}

// Helper to get label colors
function getLabelColor(id) {
  switch (id) {
    case 'label-membrane': return '#a855f7';
    case 'label-nucleus': return '#3b82f6';
    case 'label-centrosome-l':
    case 'label-centrosome-r': return '#10b981';
    case 'label-chromosome': return '#ec4899';
    case 'label-spindle': return '#ffea00';
    default: return '#ffffff';
  }
}

// 2D HTML Labels update with HUD leader lines
function updateLabels() {
  const svgOverlay = document.getElementById('hud-overlay');
  
  if (!showLabels || currentMode !== 'mitosis') {
    labelsContainer.innerHTML = '';
    if (svgOverlay) svgOverlay.innerHTML = '';
    return;
  }

  const positions = sim.getLabelPositions();
  
  labelsContainer.innerHTML = '';
  
  let svgContent = '';

  positions.forEach(lbl => {
    let dx = 80;
    let dy = -40;
    let alignClass = 'align-left';

    if (lbl.id === 'label-membrane') { 
      dx = -95; dy = -60; 
      alignClass = 'align-right'; 
    } else if (lbl.id === 'label-nucleus') { 
      dx = -95; dy = 60; 
      alignClass = 'align-right'; 
    } else if (lbl.id === 'label-centrosome-l') { 
      dx = -95; dy = -50; 
      alignClass = 'align-right'; 
    } else if (lbl.id === 'label-centrosome-r') { 
      dx = 95; dy = -50; 
      alignClass = 'align-left'; 
    } else if (lbl.id === 'label-chromosome') { 
      dx = 95; dy = 60; 
      alignClass = 'align-left'; 
    } else if (lbl.id === 'label-spindle') { 
      dx = 95; dy = -30; 
      alignClass = 'align-left'; 
    }

    const targetX = Math.round(lbl.x);
    const targetY = Math.round(lbl.y);
    const labelX = Math.round(targetX + dx);
    const labelY = Math.round(targetY + dy);

    const el = document.createElement('div');
    el.id = lbl.id;
    el.className = `label-pill visible ${alignClass}`;
    el.textContent = lbl.name;
    el.style.left = `${labelX}px`;
    el.style.top = `${labelY}px`;
    labelsContainer.appendChild(el);

    const color = getLabelColor(lbl.id);
    
    svgContent += `
      <circle cx="${targetX}" cy="${targetY}" r="4" fill="${color}" stroke="#fff" stroke-width="1.5" />
      <line x1="${targetX}" y1="${targetY}" x2="${labelX}" y2="${labelY}" stroke="${color}" stroke-width="1.5" stroke-dasharray="3,3" />
      <circle cx="${labelX}" cy="${labelY}" r="2" fill="${color}" />
    `;
  });

  if (svgOverlay) {
    svgOverlay.innerHTML = svgContent;
  }
}

// Main Frame Loop
function animate(timestamp) {
  requestAnimationFrame(animate);

  try {
    const delta = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    if (currentMode === 'mitosis') {
      if (isPlaying) {
        progress += playSpeed * delta;
        if (progress >= 1.0) {
          progress = 0.0;
        }
        sim.update(progress);
        timelineSlider.value = progress * 100;
        checkPhaseChange();
      }

      sim.render();
      updateLabels();
    }
    // Skull viewer has its own animation loop
  } catch (err) {
    console.error('[Bio3D] Lỗi trong vòng lặp animate:', err);
  }
}

// ============================================
// QUIZ MODE (unchanged)
// ============================================

function enterQuizMode() {
  isQuizMode = true;
  quizBtn.textContent = "Học Lý Thuyết";
  quizBtn.classList.remove('btn-primary');
  quizBtn.classList.add('active');

  currentQuestionIndex = 0;
  score = 0;
  questionAnswered = false;
  selectedOptionIndex = null;

  renderQuizScreen();
}

function exitQuizMode() {
  isQuizMode = false;
  quizBtn.textContent = "Làm Trắc Nghiệm";
  quizBtn.classList.add('btn-primary');
  quizBtn.classList.remove('active');

  sidebarContent.innerHTML = `
    <div class="sidebar-section">
      <div class="sidebar-title">Nội dung học tập</div>
      <div class="phase-info">
        <h2 id="phase-title" style="transition: opacity 0.2s">Kỳ trung gian</h2>
        <p id="phase-subtitle" class="phase-subtitle" style="transition: opacity 0.2s">Chuẩn bị phân chia</p>
        <p id="phase-desc" class="phase-desc">Mô tả chi tiết</p>
      </div>
    </div>
    
    <div class="sidebar-section">
      <div class="sidebar-title">Diễn biến sinh học</div>
      <ul id="events-list" class="events-list" style="transition: opacity 0.2s"></ul>
    </div>
  `;
  
  phaseTitle = document.getElementById('phase-title');
  phaseSubtitle = document.getElementById('phase-subtitle');
  phaseDesc = document.getElementById('phase-desc');
  eventsList = document.getElementById('events-list');

  updatePhaseUI(activePhaseIndex);
}

function renderQuizScreen() {
  if (currentQuestionIndex >= quizQuestions.length) {
    renderQuizResults();
    return;
  }

  const q = quizQuestions[currentQuestionIndex];
  questionAnswered = false;
  selectedOptionIndex = null;

  sidebarContent.innerHTML = `
    <div class="quiz-container">
      <div class="quiz-header">
        <div class="sidebar-title">Câu hỏi ôn tập</div>
        <div class="quiz-progress">Câu ${currentQuestionIndex + 1}/${quizQuestions.length}</div>
      </div>
      
      <div class="quiz-question">${q.question}</div>
      
      <div class="quiz-options">
        ${q.options.map((opt, idx) => `
          <button class="quiz-option-btn" data-index="${idx}">${opt}</button>
        `).join('')}
      </div>

      <div id="quiz-feedback-box" style="display:none"></div>
      
      <button id="quiz-action-btn" class="btn btn-primary" style="margin-top: 10px; display:none;">Tiếp tục</button>
    </div>
  `;

  const optionBtns = sidebarContent.querySelectorAll('.quiz-option-btn');
  optionBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (questionAnswered) return;
      
      const idx = parseInt(btn.dataset.index);
      selectedOptionIndex = idx;
      
      optionBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');

      submitAnswer(idx, optionBtns);
    });
  });
}

function submitAnswer(idx, optionBtns) {
  questionAnswered = true;
  const q = quizQuestions[currentQuestionIndex];
  const isCorrect = idx === q.correctAnswer;

  if (isCorrect) score++;

  optionBtns.forEach((btn, bIdx) => {
    btn.disabled = true;
    if (bIdx === q.correctAnswer) {
      btn.classList.add('correct');
    } else if (bIdx === idx) {
      btn.classList.add('wrong');
    }
  });

  const feedbackBox = document.getElementById('quiz-feedback-box');
  feedbackBox.className = `quiz-feedback ${isCorrect ? 'correct' : 'wrong'}`;
  feedbackBox.innerHTML = `
    <div class="quiz-feedback-title" style="color: ${isCorrect ? 'var(--accent-green)' : '#ef4444'}">
      ${isCorrect ? '✓ Chính xác!' : '✗ Chưa chính xác!'}
    </div>
    <div>${q.explanation}</div>
  `;
  feedbackBox.style.display = 'block';

  const actionBtn = document.getElementById('quiz-action-btn');
  actionBtn.style.display = 'block';
  actionBtn.textContent = currentQuestionIndex === quizQuestions.length - 1 ? "Xem kết quả" : "Câu tiếp theo";
  
  actionBtn.addEventListener('click', () => {
    currentQuestionIndex++;
    renderQuizScreen();
  });
}

function renderQuizResults() {
  const percent = Math.round((score / quizQuestions.length) * 100);
  let feedbackText = "";
  if (percent === 100) feedbackText = "Xuất sắc! Bạn đã hiểu rõ toàn bộ kiến thức về quá trình phân bào.";
  else if (percent >= 80) feedbackText = "Rất tốt! Bạn nắm rất chắc diễn biến của các kỳ nguyên phân.";
  else if (percent >= 50) feedbackText = "Khá ổn! Hãy ôn lại các kỳ mà bạn còn trả lời sai nhé.";
  else feedbackText = "Bạn nên đọc lại lý thuyết mô phỏng 3D để hiểu sâu hơn về quá trình phân chia.";

  sidebarContent.innerHTML = `
    <div class="quiz-results-card">
      <div class="quiz-score-circle">${score}/${quizQuestions.length}</div>
      <h2 class="quiz-results-title">Hoàn thành bài tập</h2>
      <p class="quiz-results-desc">${feedbackText}</p>
      
      <div style="display:flex; gap:10px; width:100%; margin-top:15px;">
        <button id="quiz-retry-btn" class="btn" style="flex:1">Làm lại</button>
        <button id="quiz-exit-btn" class="btn btn-primary" style="flex:1">Xem lý thuyết</button>
      </div>
    </div>
  `;

  document.getElementById('quiz-retry-btn').addEventListener('click', () => {
    enterQuizMode();
  });
  
  document.getElementById('quiz-exit-btn').addEventListener('click', () => {
    exitQuizMode();
  });
}

// Boot application
window.addEventListener('DOMContentLoaded', init);
