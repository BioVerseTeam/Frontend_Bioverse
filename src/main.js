import { MitosisSimulation } from './mitosis.js';
import { SkullViewer } from './skull.js';
import { skullRegions } from './skullData.js';
import { ParameciumViewer } from './paramecium.js';
import { parameciumRegions } from './parameciumData.js';
import { PlantViewer } from './plant.js';
import { plantStages, plantRegions } from './plantData.js';
import { TripoAPI } from './api/tripo.js';
import { phases, quizQuestions } from './data.js';
import { ChatBox } from './components/chatBox.js';
import { ChemistryViewer } from './chemistry.js';
import { chemistryCatalog, chemicalReactions } from './chemistryData.js';


// ============================================
// STATE
// ============================================
let currentMode = null;

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

// Plant state
let plantViewer = null;
let selectedPlantRegion = null;
let plantProgress = 0.0;
let isPlantPlaying = false;
let plantPlaySpeed = 0.025; // Tăng nhẹ tốc độ phát lớn lên tự động
let activePlantStageIndex = 0;

// Chemistry state
let chemistryViewer = null;
let chemistryState = 'selection'; // 'selection' | 'workspace'
let chemistryCart = [];
let activeAlmanacTab = 'chemicals'; // 'chemicals' | 'tools'
let selectedAlmanacItem = null;
let isMixingActive = false;
let mixSourceId = null;
let chemGraphData = [];
let lastGraphUpdate = 0;

// DOM Elements
let playBtn, prevBtn, nextBtn, timeline, timelineSlider, phaseTicks;
let phaseTitle, phaseSubtitle, phaseDesc, eventsList;
let sidebarContent, quizBtn, labelsToggle;
let labelsContainer;

// Mode UI elements
let modeSkullBtn, modeParameciumBtn, modeChemistryBtn;
let skullSidebar, parameciumSidebar, chemistrySidebar;
let skullControls, parameciumControls, chemistryControls;
let skullInfoPopup, skullHoverTag;
let headerCard, uiOverlay;

// Plant DOM elements
let plantPhaseTitle, plantPhaseSubtitle, plantPhaseDesc, plantEventsList, plantPartList;
let plantSlider, plantTicks, plantPrevBtn, plantNextBtn, plantPlayBtn;

// Chemistry DOM elements
let chemistryAlmanac, chemTabChemicals, chemTabTools, chemAlmanacGrid;
let chemDetailSymbol, chemDetailTitle, chemDetailLatin, chemDetailType, chemDetailCost, chemDetailDesc, chemDetailProperties, chemDetailHazards, chemAddCartBtn;
let chemCartCount, chemCartSummaryText, chemCartPreview, chemInitBtn;
let chemMaterialsList, chemReactionAlert, chemReactionAlertText, chemDockGrid;
let chemBtnIgnite, chemBtnMix, chemBtnReset;
let chemTelemetryTemp, chemTelemetryRate, chemTelemetryPh, chemTempBarFill, chemRateBarFill, chemPhBarFill;
let chemGraphPath, chemGraphArea;

// Vessel picker modal
let vesselPickerModal, vesselPickerTitle, vesselPickerChemName, vesselPickerOptions, vesselPickerHint;
let vesselPickerCloseBtn, vesselPickerConfirmBtn, vesselPickerCancelBtn;
let pendingChemicalItem = null;
let selectedVesselForPending = null;

// ============================================
// INIT
// ============================================
function init() {
  // Cache DOM Elements
  playBtn = document.getElementById('play-btn');
  prevBtn = document.getElementById('prev-btn');
  nextBtn = document.getElementById('next-btn');
  timeline = document.getElementById('timeline');
  timelineSlider = document.getElementById('timeline-slider');
  phaseTicks = document.querySelectorAll('#timeline .tick');

  phaseTitle = document.getElementById('phase-title');
  phaseSubtitle = document.getElementById('phase-subtitle');
  phaseDesc = document.getElementById('phase-desc');
  eventsList = document.getElementById('events-list');

  sidebarContent = document.getElementById('sidebar-content');
  quizBtn = document.getElementById('quiz-btn');
  labelsToggle = document.getElementById('labels-toggle');
  labelsContainer = document.getElementById('labels-container');

  // Mode elements
  modeSkullBtn = document.getElementById('mode-skull');
  modeParameciumBtn = document.getElementById('mode-paramecium');
  modeChemistryBtn = document.getElementById('mode-chemistry');
  skullSidebar = document.getElementById('skull-sidebar');
  parameciumSidebar = document.getElementById('paramecium-sidebar');
  chemistrySidebar = document.getElementById('chemistry-sidebar');
  skullControls = document.getElementById('skull-controls');
  parameciumControls = document.getElementById('paramecium-controls');
  chemistryControls = document.getElementById('chemistry-controls');
  skullInfoPopup = document.getElementById('skull-info-popup');
  skullHoverTag = document.getElementById('skull-hover-tag');
  headerCard = document.querySelector('.header-card');
  uiOverlay = document.querySelector('.ui-overlay');

  // Plant DOM cache
  plantPhaseTitle = document.getElementById('plant-phase-title');
  plantPhaseSubtitle = document.getElementById('plant-phase-subtitle');
  plantPhaseDesc = document.getElementById('plant-phase-desc');
  plantEventsList = document.getElementById('plant-events-list');
  plantPartList = document.getElementById('plant-part-list');
  plantSlider = document.getElementById('plant-slider');
  plantTicks = document.getElementById('plant-timeline');
  plantPrevBtn = document.getElementById('plant-prev-btn');
  plantNextBtn = document.getElementById('plant-next-btn');
  plantPlayBtn = document.getElementById('plant-play-btn');

  // Chemistry DOM cache
  chemistryAlmanac = document.getElementById('chemistry-almanac');
  chemTabChemicals = document.getElementById('chem-tab-chemicals');
  chemTabTools = document.getElementById('chem-tab-tools');
  chemAlmanacGrid = document.getElementById('chemistry-almanac-grid');
  chemDetailSymbol = document.getElementById('chem-detail-symbol');
  chemDetailTitle = document.getElementById('chem-detail-title');
  chemDetailLatin = document.getElementById('chem-detail-latin');
  chemDetailType = document.getElementById('chem-detail-type');
  chemDetailCost = document.getElementById('chem-detail-cost');
  chemDetailDesc = document.getElementById('chem-detail-desc');
  chemDetailProperties = document.getElementById('chem-detail-properties');
  chemDetailHazards = document.getElementById('chem-detail-hazards');
  chemAddCartBtn = document.getElementById('chem-add-cart-btn');
  chemCartCount = document.getElementById('chemistry-cart-count');
  chemCartSummaryText = document.getElementById('chemistry-cart-summary-text');
  chemCartPreview = document.getElementById('chemistry-cart-preview');
  chemInitBtn = document.getElementById('chemistry-init-btn');
  chemMaterialsList = document.getElementById('chemistry-materials-list');
  chemReactionAlert = document.getElementById('chemistry-reaction-alert');
  chemReactionAlertText = document.getElementById('chemistry-reaction-alert-text');
  chemDockGrid = document.getElementById('chemistry-dock-grid');
  chemBtnIgnite = document.getElementById('chem-btn-ignite');
  chemBtnMix = document.getElementById('chem-btn-mix');
  chemBtnReset = document.getElementById('chem-btn-reset');
  chemTelemetryTemp = document.getElementById('chem-telemetry-temp');
  chemTelemetryRate = document.getElementById('chem-telemetry-rate');
  chemTelemetryPh = document.getElementById('chem-telemetry-ph');
  chemTempBarFill = document.getElementById('chem-temp-bar-fill');
  chemRateBarFill = document.getElementById('chem-rate-bar-fill');
  chemPhBarFill = document.getElementById('chem-ph-bar-fill');
  chemGraphPath = document.getElementById('chem-graph-path');
  chemGraphArea = document.getElementById('chem-graph-area');

  // Vessel picker modal DOM cache
  vesselPickerModal = document.getElementById('vessel-picker-modal');
  vesselPickerTitle = document.getElementById('vessel-picker-title');
  vesselPickerChemName = document.getElementById('vessel-picker-chem-name');
  vesselPickerOptions = document.getElementById('vessel-picker-options');
  vesselPickerHint = document.getElementById('vessel-picker-hint');
  vesselPickerCloseBtn = document.getElementById('vessel-picker-close');

  // Setup Event Listeners
  setupControls();
  setupModeSwitch();
  setupSkullUI();
  setupParameciumUI();
  setupChemistryUI();
  setupCollapsibleSidebars();
  
  // Initialize default mode (skull)
  switchMode('skull');
  
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
  modeSkullBtn.addEventListener('click', () => switchMode('skull'));
  modeParameciumBtn.addEventListener('click', () => switchMode('paramecium'));
  modeChemistryBtn.addEventListener('click', () => switchMode('chemistry'));
}

function switchMode(mode) {
  if (mode === currentMode) return;
  currentMode = mode;

  // Toggle header card visibility and grid rows based on chemistry workspace sub-state
  if (mode === 'chemistry' && chemistryState === 'workspace') {
    if (headerCard) headerCard.classList.add('hidden');
    if (uiOverlay) uiOverlay.classList.add('no-header');
  } else {
    if (headerCard) headerCard.classList.remove('hidden');
    if (uiOverlay) uiOverlay.classList.remove('no-header');
  }

  // Update tab buttons
  modeSkullBtn.classList.toggle('active', mode === 'skull');
  modeParameciumBtn.classList.toggle('active', mode === 'paramecium');
  modeChemistryBtn.classList.toggle('active', mode === 'chemistry');

  // Ẩn toàn bộ UI của mọi mode, sau đó chỉ bật mode đang chọn
  skullSidebar.classList.add('hidden');
  skullControls.classList.add('hidden');
  parameciumSidebar.classList.add('hidden');
  parameciumControls.classList.add('hidden');
  chemistrySidebar.classList.add('hidden');
  chemistryControls.classList.add('hidden');
  chemistryAlmanac.classList.add('hidden');
  skullInfoPopup.classList.add('hidden');
  if (skullHoverTag) skullHoverTag.classList.add('hidden');

  // Ẩn mọi renderer trước
  if (skullViewer && skullViewer.renderer) skullViewer.renderer.domElement.style.display = 'none';
  if (parameciumViewer && parameciumViewer.renderer) parameciumViewer.renderer.domElement.style.display = 'none';
  if (chemistryViewer && chemistryViewer.renderer) chemistryViewer.renderer.domElement.style.display = 'none';

  const labels = labelsContainer;
  const hud = document.getElementById('hud-overlay');

  if (mode === 'skull') {
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
      parameciumViewer.onHover = handleSkullHover;
      parameciumViewer.onRevealChange = handleParameciumRevealChange;
    } else {
      parameciumViewer.renderer.domElement.style.display = 'block';
    }
  } else if (mode === 'chemistry') {
    labels.classList.add('hidden');
    hud.style.display = 'none';

    if (chemistryState === 'selection') {
      chemistryAlmanac.classList.remove('hidden');
      renderChemistryAlmanac();
    } else {
      chemistrySidebar.classList.remove('hidden');
      chemistryControls.classList.remove('hidden');
      if (chemistryViewer && chemistryViewer.renderer) {
        chemistryViewer.renderer.domElement.style.display = 'block';
      }
    }

    if (!chemistryViewer) {
      chemistryViewer = new ChemistryViewer('canvas-container');
      chemistryViewer.onVesselClick = handleChemistryVesselClick;
      chemistryViewer.onReactionTrigger = handleChemistryReactionTrigger;
      chemistryViewer.onWorkbenchRebuilt = updateDockUI;
      
      // Hide 3D view while selecting elements initially
      if (chemistryState === 'selection') {
        chemistryViewer.renderer.domElement.style.display = 'none';
      }
    } else {
      if (chemistryState === 'workspace') {
        chemistryViewer.renderer.domElement.style.display = 'block';
      }
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

// Đặt popup ở PHÍA TRỐNG đối diện với điểm nhấn để không che mất model 3D.
function positionPopupAt(screenPos) {
  const margin = 16;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Tạm show popup để đo kích thước thật
  skullInfoPopup.classList.remove('hidden');
  skullInfoPopup.style.left = '-9999px';
  skullInfoPopup.style.top = '0';
  skullInfoPopup.style.right = 'auto';
  skullInfoPopup.style.bottom = 'auto';
  
  const rect = skullInfoPopup.getBoundingClientRect();
  const popW = Math.min(rect.width || 420, vw - margin * 2);
  const popH = Math.min(rect.height || 360, vh - margin * 2);

  // Không có vị trí (chọn từ sidebar) -> mặc định góc dưới-trái
  if (!screenPos) {
    skullInfoPopup.style.left = `${margin}px`;
    skullInfoPopup.style.top = 'auto';
    skullInfoPopup.style.bottom = `${margin + 120}px`;
    return;
  }

  // Theo chiều ngang: đặt bên đối diện với điểm bấm
  let left;
  const clickedLeftHalf = screenPos.x < vw / 2;
  if (clickedLeftHalf) {
    // Bấm trái -> popup bên phải
    left = vw - popW - margin;
  } else {
    // Bấm phải -> popup bên trái
    left = margin;
  }
  // Clamp: không cho tràn ra ngoài
  left = Math.max(margin, Math.min(left, vw - popW - margin));

  // Theo chiều dọc: gần ngang tầm điểm bấm, nhưng luôn trong khung nhìn
  let top = screenPos.y - popH / 2;
  top = Math.max(margin, Math.min(top, vh - popH - margin));

  // Nếu popup quá cao, ưu tiên đặt từ trên xuống
  if (popH > vh * 0.7) {
    top = margin;
  }

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
// PLANT (CÂY MÍT) UI
// ============================================
function setupPlantUI() {
  // Populate part list in sidebar
  const partList = document.getElementById('plant-part-list');
  plantRegions.forEach(region => {
    const item = document.createElement('div');
    item.className = 'skull-bone-item';
    item.dataset.regionId = region.id;
    item.innerHTML = `
      <div class="skull-bone-dot" style="background-color: ${region.color}; color: ${region.color}"></div>
      <span class="skull-bone-name">${region.name}</span>
      <span class="skull-bone-latin">${region.latin}</span>
    `;
    item.addEventListener('click', () => {
      if (!plantViewer) return;
      selectPlantRegion(region, null);
      plantViewer.highlightRegion(region.id);
      plantViewer.focusRegion(region.id);
    });
    partList.appendChild(item);
  });

  // Play/Pause growth
  plantPlayBtn.addEventListener('click', () => {
    isPlantPlaying = !isPlantPlaying;
    updatePlantPlayButtonUI();
  });

  // Prev/Next Stage
  plantPrevBtn.addEventListener('click', () => {
    goToPlantStage(activePlantStageIndex - 1);
  });
  plantNextBtn.addEventListener('click', () => {
    goToPlantStage(activePlantStageIndex + 1);
  });

  // Timeline Slider
  plantSlider.addEventListener('input', (e) => {
    isPlantPlaying = false;
    updatePlantPlayButtonUI();
    plantProgress = parseFloat(e.target.value) / 100;
    if (plantViewer) plantViewer.update(plantProgress);
    checkPlantStageChange();
  });

  // Timeline Ticks
  const plantTicksElements = document.querySelectorAll('#plant-timeline .tick');
  plantTicksElements.forEach(tick => {
    tick.addEventListener('click', () => {
      const targetStageId = parseInt(tick.dataset.stage);
      goToPlantStage(targetStageId);
    });
  });

  // Camera presets
  document.getElementById('plant-btn-front').addEventListener('click', (e) => {
    setActivePlantCameraBtn(e.target);
    if (plantViewer) plantViewer.setCameraPreset('front');
  });
  document.getElementById('plant-btn-top').addEventListener('click', (e) => {
    setActivePlantCameraBtn(e.target);
    if (plantViewer) plantViewer.setCameraPreset('top');
  });
  document.getElementById('plant-btn-detail').addEventListener('click', (e) => {
    setActivePlantCameraBtn(e.target);
    if (plantViewer) plantViewer.setCameraPreset('detail');
  });

  // Khởi tạo bảng điều khiển Tripo3D
  setupTripoUI();
}

function setActivePlantCameraBtn(activeBtn) {
  document.querySelectorAll('#plant-sidebar .camera-presets .btn').forEach(btn => {
    btn.classList.remove('active');
  });
  activeBtn.classList.add('active');
}

// ============================================
// TRIPO3D AI INTERFACES
// ============================================
function setupTripoUI() {
  const apiKeyInput = document.getElementById('tripo-api-key');
  const tabText = document.getElementById('tripo-tab-text');
  const tabImage = document.getElementById('tripo-tab-image');
  const textInputs = document.getElementById('tripo-text-inputs');
  const imageInputs = document.getElementById('tripo-image-inputs');
  const promptInput = document.getElementById('tripo-prompt');
  const fileInput = document.getElementById('tripo-file');
  const fileTrigger = document.getElementById('tripo-file-trigger');
  const fileName = document.getElementById('tripo-file-name');
  const generateBtn = document.getElementById('tripo-generate-btn');
  const resetBtn = document.getElementById('tripo-reset-btn');
  const statusContainer = document.getElementById('tripo-status-container');
  const statusText = document.getElementById('tripo-status-text');
  const statusPercentage = document.getElementById('tripo-status-percentage');
  const progressFill = document.getElementById('tripo-progress-fill');

  // Load API Key from localStorage
  const savedKey = localStorage.getItem('tripo_api_key');
  if (savedKey) {
    apiKeyInput.value = savedKey;
  }

  // Switch tabs
  tabText.addEventListener('click', () => {
    tabText.classList.add('active');
    tabImage.classList.remove('active');
    textInputs.classList.remove('hidden');
    imageInputs.classList.add('hidden');
  });

  tabImage.addEventListener('click', () => {
    tabImage.classList.add('active');
    tabText.classList.remove('active');
    imageInputs.classList.remove('hidden');
    textInputs.classList.add('hidden');
  });

  // File trigger click proxy
  fileTrigger.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      fileName.textContent = file.name;
    } else {
      fileName.textContent = 'Chưa chọn ảnh nào';
    }
  });

  // Reset model
  resetBtn.addEventListener('click', () => {
    if (plantViewer) {
      plantViewer.restoreProceduralPlant();
      resetBtn.classList.add('hidden');
      statusContainer.classList.add('hidden');
    }
  });

  // Generate action
  generateBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      alert('Vui lòng nhập API Key Tripo3D để bắt đầu!');
      return;
    }
    // Lưu tạm Key lại cho lần sau
    localStorage.setItem('tripo_api_key', apiKey);

    const isTextMode = tabText.classList.contains('active');
    let taskId = null;

    try {
      generateBtn.disabled = true;
      generateBtn.textContent = '⌛ Đang khởi tạo...';
      statusContainer.classList.remove('hidden');
      statusText.textContent = 'Đang gửi yêu cầu...';
      statusPercentage.textContent = '0%';
      progressFill.style.width = '0%';

      if (isTextMode) {
        const prompt = promptInput.value.trim();
        if (!prompt) {
          alert('Vui lòng nhập mô tả prompt của mô hình!');
          generateBtn.disabled = false;
          generateBtn.textContent = '⚡ Tạo mô hình 3D bằng AI';
          return;
        }
        taskId = await TripoAPI.createTextToModelTask(apiKey, prompt);
      } else {
        const file = fileInput.files[0];
        if (!file) {
          alert('Vui lòng chọn một hình ảnh từ thiết bị của bạn!');
          generateBtn.disabled = false;
          generateBtn.textContent = '⚡ Tạo mô hình 3D bằng AI';
          return;
        }
        statusText.textContent = 'Đang tải ảnh lên máy chủ Tripo3D...';
        const fileToken = await TripoAPI.uploadFile(apiKey, file);
        
        statusText.textContent = 'Đang gửi yêu cầu sinh mô hình từ ảnh...';
        const fileExt = file.name.split('.').pop().toLowerCase() || 'png';
        taskId = await TripoAPI.createImageToModelTask(apiKey, fileToken, fileExt);
      }

      if (!taskId) {
        throw new Error('Tripo3D không trả về Task ID.');
      }

      statusText.textContent = 'Đang xếp hàng trên Tripo3D...';
      pollTripoStatus(apiKey, taskId, generateBtn, resetBtn, statusContainer, statusText, statusPercentage, progressFill);

    } catch (err) {
      console.error(err);
      alert(`Lỗi Tripo3D: ${err.message}`);
      statusContainer.classList.add('hidden');
      generateBtn.disabled = false;
      generateBtn.textContent = '⚡ Tạo mô hình 3D bằng AI';
    }
  });
}

function pollTripoStatus(apiKey, taskId, generateBtn, resetBtn, statusContainer, statusText, statusPercentage, progressFill) {
  const checkInterval = setInterval(async () => {
    try {
      const taskData = await TripoAPI.checkTaskStatus(apiKey, taskId);
      const progress = taskData.progress || 0;
      statusPercentage.textContent = `${progress}%`;
      progressFill.style.width = `${progress}%`;

      if (taskData.status === 'success') {
        clearInterval(checkInterval);
        statusText.textContent = 'Đang tải tệp GLB vào Scene...';
        
        const glbUrl = taskData.result.model.glb || taskData.result.model.gltf;
        if (plantViewer) {
          plantViewer.loadGLBFromUrl(
            glbUrl,
            () => {
              statusText.textContent = 'Đã tải mô hình Tripo3D thành công!';
              generateBtn.disabled = false;
              generateBtn.textContent = '⚡ Tạo mô hình 3D bằng AI';
              resetBtn.classList.remove('hidden');
            },
            (err) => {
              statusText.textContent = 'Lỗi nạp mô hình vào WebGL.';
              alert(`Không thể render mô hình 3D: ${err.message}`);
              generateBtn.disabled = false;
              generateBtn.textContent = '⚡ Tạo mô hình 3D bằng AI';
            }
          );
        }
      } else if (taskData.status === 'failed') {
        clearInterval(checkInterval);
        statusText.textContent = 'Tác vụ sinh mô hình thất bại.';
        alert('Tripo3D báo lỗi: Không thể xử lý yêu cầu này.');
        generateBtn.disabled = false;
        generateBtn.textContent = '⚡ Tạo mô hình 3D bằng AI';
      } else if (taskData.status === 'running') {
        statusText.textContent = 'Tripo3D đang dựng mô hình...';
      } else if (taskData.status === 'queued') {
        statusText.textContent = 'Đang chờ đến lượt xử lý...';
      }
    } catch (err) {
      clearInterval(checkInterval);
      console.error(err);
      statusText.textContent = 'Lỗi kiểm tra tiến độ.';
      alert(`Lỗi polling: ${err.message}`);
      generateBtn.disabled = false;
      generateBtn.textContent = '⚡ Tạo mô hình 3D bằng AI';
    }
  }, 2500);
}

function handlePlantRegionClick(region, screenPos) {
  if (region) {
    selectPlantRegion(region, screenPos);
  } else {
    skullInfoPopup.classList.add('hidden');
    selectedPlantRegion = null;
    updatePlantListHighlight(null);
  }
}

function selectPlantRegion(region, screenPos) {
  selectedPlantRegion = region;

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

  updatePlantListHighlight(region.id);
}

function updatePlantListHighlight(regionId) {
  document.querySelectorAll('#plant-part-list .skull-bone-item').forEach(item => {
    if (item.dataset.regionId === regionId) {
      item.classList.add('active');
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      item.classList.remove('active');
    }
  });
}

function checkPlantStageChange() {
  let matchedIndex = 0;
  for (let i = 0; i < plantStages.length; i++) {
    const [start, end] = plantStages[i].range;
    if (plantProgress >= start - 0.001 && plantProgress <= end + 0.001) {
      matchedIndex = i;
      break;
    }
  }

  if (matchedIndex !== activePlantStageIndex) {
    activePlantStageIndex = matchedIndex;
    updatePlantStageUI(activePlantStageIndex);
  }
}

function updatePlantStageUI(stageIndex) {
  const stage = plantStages[stageIndex];
  
  const plantTicksElements = document.querySelectorAll('#plant-timeline .tick');
  plantTicksElements.forEach(tick => {
    const tickStage = parseInt(tick.dataset.stage);
    if (tickStage === stageIndex) {
      tick.classList.add('active');
    } else {
      tick.classList.remove('active');
    }
  });

  plantPhaseTitle.style.opacity = 0;
  plantPhaseSubtitle.style.opacity = 0;
  plantEventsList.style.opacity = 0;

  setTimeout(() => {
    plantPhaseTitle.innerHTML = `${stage.title} <span class="phase-badge" style="background-color:${stage.color}33; color:${stage.color}; border: 1px solid ${stage.color}55">Giai đoạn ${stage.id + 1}</span>`;
    plantPhaseTitle.style.setProperty('color', stage.color);
    plantPhaseSubtitle.textContent = stage.subtitle;
    plantPhaseDesc.textContent = stage.description;
    
    plantEventsList.innerHTML = stage.events
      .map(event => `<li>${event}</li>`)
      .join('');

    const bullets = plantEventsList.querySelectorAll('li');
    bullets.forEach(li => {
      li.style.setProperty('--accent-purple', stage.color);
    });

    plantPhaseTitle.style.opacity = 1;
    plantPhaseSubtitle.style.opacity = 1;
    plantEventsList.style.opacity = 1;
  }, 150);
}

function goToPlantStage(stageIndex) {
  if (stageIndex < 0 || stageIndex >= plantStages.length) return;
  isPlantPlaying = false;
  updatePlantPlayButtonUI();

  const stage = plantStages[stageIndex];
  const targetProgress = stage.range[0];
  animatePlantProgressSlider(targetProgress);
}

function animatePlantProgressSlider(targetProgress) {
  const startProgress = plantProgress;
  const duration = 500;
  const startTime = performance.now();

  const easeOutQuad = t => t * (2 - t);

  const step = (now) => {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1.0);
    const easedT = easeOutQuad(t);

    plantProgress = startProgress + (targetProgress - startProgress) * easedT;
    if (plantViewer) plantViewer.update(plantProgress);
    plantSlider.value = plantProgress * 100;
    checkPlantStageChange();

    if (t < 1.0) {
      requestAnimationFrame(step);
    }
  };
  requestAnimationFrame(step);
}

function updatePlantPlayButtonUI() {
  if (isPlantPlaying) {
    plantPlayBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
  } else {
    plantPlayBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
  }
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

  // Quiz Button Redirect to Exams page
  quizBtn.addEventListener('click', () => {
    window.location.href = '/exams.html';
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
    } else if (currentMode === 'plant') {
      if (isPlantPlaying) {
        plantProgress += plantPlaySpeed * delta;
        if (plantProgress >= 1.0) {
          plantProgress = 0.0;
        }
        if (plantViewer) plantViewer.update(plantProgress);
        plantSlider.value = plantProgress * 100;
        checkPlantStageChange();
      }
    } else if (currentMode === 'chemistry') {
      if (timestamp - lastGraphUpdate > 100) {
        updateChemGraph();
        lastGraphUpdate = timestamp;
      }
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

// ============================================================
// CHEMISTRY LAB INTERACTIONS & ALMANAC SELECTOR LOGIC
// ============================================================

function setupChemistryUI() {
  try {
  // Tab switching in Almanac
  chemTabChemicals.addEventListener('click', () => {
    activeAlmanacTab = 'chemicals';
    chemTabChemicals.classList.add('active');
    chemTabTools.classList.remove('active');
    renderChemistryAlmanac();
  });

  chemTabTools.addEventListener('click', () => {
    activeAlmanacTab = 'tools';
    chemTabTools.classList.add('active');
    chemTabChemicals.classList.remove('active');
    renderChemistryAlmanac();
  });

  // Add-to-cart button: reads current item ID from data attribute (no closure dependency)
  chemAddCartBtn.addEventListener('click', function () {
    try {
      const itemId = chemAddCartBtn.getAttribute('data-item-id');
      if (!itemId) return;
      const allItems = [...chemistryCatalog.chemicals, ...chemistryCatalog.tools];
      const item = allItems.find(i => i.id === itemId);
      if (!item) return;
      const inCart = chemistryCart.some(i => i.id === itemId);
      if (inCart) {
        removeFromCart(itemId);
      } else {
        if (item.category === 'Chemical') {
          if (item.id === 'phenol') {
            addToCart(item, 'phenol_set');
          } else {
            showVesselPicker(item);
          }
        } else {
          showQuantityPicker(item);
        }
      }
    } catch (err) {
      console.error('[Chemistry] Button click error:', err);
    }
  });

  // Vessel picker modal handlers
  if (vesselPickerCloseBtn) {
    vesselPickerCloseBtn.addEventListener('click', closeVesselPicker);
  }
  if (vesselPickerModal) {
    vesselPickerModal.addEventListener('click', (e) => {
      if (e.target === vesselPickerModal) closeVesselPicker();
    });
  }

  // Initialise workspace button click
  chemInitBtn.addEventListener('click', () => {
    initializeWorkspace();
  });

  // Back to selection screen button click
  const chemBtnBackSelection = document.getElementById('chem-btn-back-selection');
  if (chemBtnBackSelection) {
    chemBtnBackSelection.addEventListener('click', () => {
      goBackToSelection();
    });
  }

  // Dock buttons click handlers
  if (chemBtnIgnite) chemBtnIgnite.addEventListener('click', () => {
    if (chemistryViewer) {
      chemistryViewer.toggleBurner();
      chemBtnIgnite.classList.toggle('active', chemistryViewer.isBurnerLit);
      updateMaterialsList();
    }
  });

  if (chemBtnMix) chemBtnMix.addEventListener('click', () => {
    if (!chemistryViewer) return;
    if (isMixingActive) {
      resetMixingState();
    } else {
      isMixingActive = true;
      mixSourceId = null;
      chemBtnMix.classList.add('active');
      const labDesc = document.getElementById('chemistry-lab-desc');
      if (labDesc) labDesc.textContent = 'Pha Trộn Đang Bật: Nhấp chọn dụng cụ chứa nguồn trên bàn 3D...';
    }
  });

  if (chemBtnReset) chemBtnReset.addEventListener('click', () => {
    if (chemistryViewer) {
      chemistryViewer.resetLaboratory();
      resetMixingState();
      updateMaterialsList();
      chemBtnIgnite.classList.remove('active');
    }
  });

  updateCartUI();
  } catch (setupErr) {
    console.error('[Chemistry] setupChemistryUI error:', setupErr);
  }
}

function renderChemistryAlmanac() {
  const items = chemistryCatalog[activeAlmanacTab];
  chemAlmanacGrid.innerHTML = '';
  
  items.forEach(item => {
    const card = document.createElement('div');
    const isSelectedInAlmanac = selectedAlmanacItem && selectedAlmanacItem.id === item.id;
    
    card.className = `chem-card ${isSelectedInAlmanac ? 'selected-preview' : ''}`;
    
    card.innerHTML = `
      <div class="chem-card-body">
        <span class="chem-card-symbol" style="color: ${item.color || '#333'}">${item.symbol}</span>
        <div class="chem-card-cost">${item.cost}</div>
      </div>
      <div class="chem-card-footer">
        <span>${item.name}</span>
      </div>
    `;
    
    card.addEventListener('click', () => {
      selectAlmanacItem(item);
      document.querySelectorAll('#chemistry-almanac-grid .chem-card').forEach(c => {
        c.classList.remove('selected-preview');
      });
      card.classList.add('selected-preview');
    });
    
    chemAlmanacGrid.appendChild(card);
  });

  // Chọn phần tử đầu tiên nếu chưa chọn
  if (items.length > 0) {
    const activeSelected = items.find(i => selectedAlmanacItem && i.id === selectedAlmanacItem.id) || items[0];
    selectAlmanacItem(activeSelected);
    
    // Highlight thẻ tương ứng
    setTimeout(() => {
      const cards = chemAlmanacGrid.querySelectorAll('.chem-card');
      cards.forEach((c, idx) => {
        if (items[idx].id === activeSelected.id) {
          c.classList.add('selected-preview');
        }
      });
    }, 10);
  }
}

function selectAlmanacItem(item) {
  selectedAlmanacItem = item;
  
  chemDetailSymbol.textContent = item.symbol;
  chemDetailSymbol.style.color = item.color || 'var(--accent-blue)';
  chemDetailSymbol.style.textShadow = `0 0 16px ${item.color || 'var(--accent-blue)'}66`;
  document.querySelector('.chem-detail-circle').style.borderColor = `${item.color || 'var(--accent-blue)'}55`;
  
  chemDetailTitle.textContent = item.name;
  chemDetailLatin.textContent = item.latin;
  chemDetailType.textContent = item.type;
  chemDetailCost.textContent = item.cost;
  chemDetailDesc.textContent = item.description;
  chemDetailProperties.textContent = item.properties;
  
  chemDetailHazards.innerHTML = '';
  if (item.hazards) {
    item.hazards.forEach(h => {
      const badge = document.createElement('span');
      badge.className = 'chem-hazard-badge';
      badge.style.backgroundColor = `${item.hazardColor || '#ef4444'}22`;
      badge.style.color = item.hazardColor || '#ef4444';
      badge.style.borderColor = `${item.hazardColor || '#ef4444'}44`;
      badge.textContent = h;
      chemDetailHazards.appendChild(badge);
    });
  }

  const isInCart = chemistryCart.some(i => i.id === item.id);
  if (isInCart) {
    chemAddCartBtn.textContent = "✓ Đã thêm vào bộ TN";
    chemAddCartBtn.className = "chem-action-btn remove";
  } else {
    chemAddCartBtn.textContent = "+ Thêm vào bộ thí nghiệm";
    chemAddCartBtn.className = "chem-action-btn primary";
  }

  // Store item ID on the button so the click handler can look up the item (no closure needed)
  chemAddCartBtn.setAttribute('data-item-id', item.id);
  chemAddCartBtn.onclick = null; // Clear any leftover onclick
} // end selectAlmanacItem

function addToCart(item, vesselId) {
  if (item.category === 'Tool') {
    // Thay thế số lượng nếu đã có, hoặc thêm mới
    const existingIdx = chemistryCart.findIndex(i => i.id === item.id);
    if (existingIdx >= 0) {
      chemistryCart[existingIdx].quantity = vesselId || 1;
    } else {
      chemistryCart.push({ ...item, quantity: vesselId || 1 });
    }
  } else {
    // Hóa chất — gán vesselId nhưng không tự thêm công cụ
    if (chemistryCart.some(i => i.id === item.id && i.vesselId === vesselId)) return;
    chemistryCart.push({ ...item, vesselId: vesselId || 'beaker' });
  }
  updateCartUI();
  renderChemistryAlmanac();
  selectAlmanacItem(item);
}

// --- Quantity Picker Modal ---
function showQuantityPicker(toolItem) {
  let modal = document.getElementById('quantity-picker-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'quantity-picker-modal';
    modal.className = 'vessel-picker-overlay hidden';
    modal.innerHTML = `
      <div class="vessel-picker-card" style="max-width: 360px; text-align: center;">
        <div class="vessel-picker-header">
          <h3 id="quantity-picker-title"></h3>
        </div>
        <div style="padding: 24px 20px;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 20px;">
            <button id="qty-minus" style="width: 44px; height: 44px; border-radius: 10px; border: 1px solid rgba(100,120,255,0.2); background: rgba(255,255,255,0.05); color: #e2e8f0; font-size: 22px; cursor: pointer; display: flex; align-items: center; justify-content: center;">−</button>
            <div id="qty-display" style="font-size: 36px; font-weight: 700; min-width: 60px; color: #fff;">1</div>
            <button id="qty-plus" style="width: 44px; height: 44px; border-radius: 10px; border: 1px solid rgba(100,120,255,0.2); background: rgba(255,255,255,0.05); color: #e2e8f0; font-size: 22px; cursor: pointer; display: flex; align-items: center; justify-content: center;">+</button>
          </div>
          <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
            ${[1,2,3,4,5].map(n => `<button class="qty-quick" data-qty="${n}" style="padding: 6px 14px; border-radius: 8px; border: 1px solid rgba(100,120,255,0.2); background: rgba(255,255,255,0.05); color: #e2e8f0; font-size: 14px; cursor: pointer;">${n}</button>`).join('')}
          </div>
        </div>
        <div style="display: flex; gap: 10px; justify-content: center; padding-bottom: 8px;">
          <button class="chem-action-btn" id="quantity-cancel" style="background: rgba(255,255,255,0.08);">Hủy</button>
          <button class="chem-action-btn primary" id="quantity-confirm">Thêm vào bộ TN</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const display = modal.querySelector('#qty-display');
    const setQty = (v) => {
      modal._qty = Math.max(1, Math.min(10, v));
      display.textContent = modal._qty;
    };

    modal.querySelector('#qty-minus').addEventListener('click', () => setQty(modal._qty - 1));
    modal.querySelector('#qty-plus').addEventListener('click', () => setQty(modal._qty + 1));
    modal.querySelectorAll('.qty-quick').forEach(btn => {
      btn.addEventListener('click', () => setQty(parseInt(btn.dataset.qty)));
    });
    modal.querySelector('#quantity-cancel').addEventListener('click', () => {
      modal.classList.add('hidden');
    });
    modal.querySelector('#quantity-confirm').addEventListener('click', () => {
      if (modal._pendingTool) {
        addToCart(modal._pendingTool, modal._qty);
      }
      modal.classList.add('hidden');
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
    modal._qty = 1;
  }
  document.getElementById('quantity-picker-title').textContent = `Chọn số lượng: ${toolItem.name}`;
  modal._pendingTool = toolItem;
  modal._qty = 1;
  modal.querySelector('#qty-display').textContent = '1';
  modal.classList.remove('hidden');
}

// --- Vessel Picker Modal ---
function showVesselPicker(chemicalItem) {
  pendingChemicalItem = chemicalItem;
  selectedVesselForPending = null;

  const toolsInCart = chemistryCart.filter(i => i.category === 'Tool');
  const allTools = chemistryCatalog.tools;

  vesselPickerChemName.textContent = `${chemicalItem.symbol} — ${chemicalItem.name}`;
  vesselPickerOptions.innerHTML = '';

  const toolIcons = { beaker: '🥛', flask: '️', testtube: '' };
  const toolNames = { beaker: 'Cốc thủy tinh', flask: 'Bình tam giác', testtube: 'Ống nghiệm' };

  allTools.forEach(tool => {
    // Bỏ qua burner vì không phải dụng cụ đựng hóa chất
    if (tool.id === 'burner') return;
    const isInCart = toolsInCart.some(t => t.id === tool.id);
    const opt = document.createElement('div');
    opt.className = `vessel-picker-option ${isInCart ? 'in-cart' : ''}`;
    opt.dataset.toolId = tool.id;
    opt.innerHTML = `
      <div class="vessel-picker-option-icon">${toolIcons[tool.id] || '🧫'}</div>
      <div class="vessel-picker-option-label">${toolNames[tool.id] || tool.name}</div>
      <div class="vessel-picker-option-sub">${isInCart ? 'Đã có trong phòng lab' : 'Sẽ tự động thêm vào'}</div>
    `;
    opt.addEventListener('click', () => {
      vesselPickerOptions.querySelectorAll('.vessel-picker-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedVesselForPending = tool.id;
      if (vesselPickerConfirmBtn) vesselPickerConfirmBtn.disabled = false;
    });
    vesselPickerOptions.appendChild(opt);
  });

  vesselPickerHint.textContent = 'Chọn dụng cụ để đựng hóa chất này (sẽ tự động thêm dụng cụ nếu chưa có).';

  // Create confirm/cancel buttons if not exist
  let actionsDiv = vesselPickerModal.querySelector('.vessel-picker-actions');
  if (!actionsDiv) {
    actionsDiv = document.createElement('div');
    actionsDiv.className = 'vessel-picker-actions';
    vesselPickerConfirmBtn = document.createElement('button');
    vesselPickerConfirmBtn.className = 'vessel-picker-confirm-btn';
    vesselPickerConfirmBtn.textContent = 'Thêm vào';
    vesselPickerConfirmBtn.disabled = true;
    vesselPickerConfirmBtn.addEventListener('click', confirmVesselSelection);
    vesselPickerCancelBtn = document.createElement('button');
    vesselPickerCancelBtn.className = 'vessel-picker-cancel-btn';
    vesselPickerCancelBtn.textContent = 'Hủy';
    vesselPickerCancelBtn.addEventListener('click', closeVesselPicker);
    actionsDiv.appendChild(vesselPickerCancelBtn);
    actionsDiv.appendChild(vesselPickerConfirmBtn);
    vesselPickerModal.querySelector('.vessel-picker-card').appendChild(actionsDiv);
  } else {
    vesselPickerConfirmBtn = actionsDiv.querySelector('.vessel-picker-confirm-btn');
    vesselPickerCancelBtn = actionsDiv.querySelector('.vessel-picker-cancel-btn');
    if (vesselPickerConfirmBtn) vesselPickerConfirmBtn.disabled = true;
  }

  vesselPickerModal.classList.remove('hidden');
}

function closeVesselPicker() {
  vesselPickerModal.classList.add('hidden');
  pendingChemicalItem = null;
  selectedVesselForPending = null;
}

function confirmVesselSelection() {
  if (pendingChemicalItem && selectedVesselForPending) {
    addToCart(pendingChemicalItem, selectedVesselForPending);
  }
  closeVesselPicker();
}

function removeFromCart(itemId, vesselId) {
  if (vesselId) {
    chemistryCart = chemistryCart.filter(i => !(i.id === itemId && i.vesselId === vesselId));
  } else {
    chemistryCart = chemistryCart.filter(i => i.id !== itemId);
  }
  updateCartUI();
  renderChemistryAlmanac();
  const currentSelected = chemistryCatalog[activeAlmanacTab].find(i => i.id === itemId);
  if (currentSelected) selectAlmanacItem(currentSelected);
}

function updateCartUI() {
  const count = chemistryCart.length;
  chemCartCount.textContent = count;

  const hasTool = chemistryCart.some(i => i.category === 'Tool');
  const hasChemical = chemistryCart.some(i => i.category === 'Chemical');

  if (count === 0) {
    chemCartSummaryText.textContent = "Chưa chọn vật liệu nào";
  } else {
    chemCartSummaryText.textContent = `${count} vật liệu đã chọn`;
  }

  const vesselLabels = { beaker: 'Cốc', flask: 'Bình', testtube: 'Ống', phenol_set: 'Bộ phenol' };

  chemCartPreview.innerHTML = '';
  chemistryCart.forEach(item => {
    const dot = document.createElement('div');
    dot.className = 'chem-cart-item-dot';
    const vesselTag = item.vesselId ? `<small style="opacity:0.6;margin-left:3px">${vesselLabels[item.vesselId] || ''}</small>` : '';
    const qtyTag = item.quantity ? `<small style="opacity:0.7;margin-left:3px">×${item.quantity}</small>` : '';
    dot.innerHTML = `
      <span style="color: ${item.color || 'var(--text-secondary)'}">${item.symbol}</span>${vesselTag}${qtyTag}
      <button class="chem-cart-item-dot-del" title="Xóa">&times;</button>
    `;
    dot.querySelector('.chem-cart-item-dot-del').addEventListener('click', (e) => {
      e.stopPropagation();
      removeFromCart(item.id, item.vesselId);
    });
    chemCartPreview.appendChild(dot);
  });
  
  const isValid = hasChemical;
  chemInitBtn.disabled = !isValid;
  
  if (chemistryState === 'workspace') {
    chemInitBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none"><path d="M12 2L2 22h20L12 2z"></path></svg>
      Cập Nhật Bàn Thí Nghiệm
    `;
  } else {
    chemInitBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none"><path d="M12 2L2 22h20L12 2z"></path></svg>
      Bước vào Phòng Lab
    `;
  }
}

function initializeWorkspace() {
  chemistryState = 'workspace';
  
  // Ẩn Almanac
  chemistryAlmanac.classList.add('hidden');

  // Hide header and collapse header row height
  if (headerCard) headerCard.classList.add('hidden');
  if (uiOverlay) uiOverlay.classList.add('no-header');
  
  // Hiện HUD và Sidebar
  chemistrySidebar.classList.remove('hidden');
  chemistryControls.classList.remove('hidden');
  
  // Bật Three.js canvas renderer
  if (chemistryViewer) {
    if (chemistryViewer.renderer) {
      chemistryViewer.renderer.domElement.style.display = 'block';
    }
    chemistryViewer.setupWorkbench(chemistryCart);
    chemistryViewer.clearSelection();
  }
  
  updateDockUI();
  updateMaterialsList();
  resetMixingState();
  initChemGraph();
}

function goBackToSelection() {
  chemistryState = 'selection';
  
  // Show header and restore top grid row
  if (headerCard) headerCard.classList.remove('hidden');
  if (uiOverlay) uiOverlay.classList.remove('no-header');
  
  // Hide workspace UI
  chemistrySidebar.classList.add('hidden');
  chemistryControls.classList.add('hidden');
  
  // Show Almanac selector overlay
  chemistryAlmanac.classList.remove('hidden');
  
  // Hide Three.js canvas
  if (chemistryViewer && chemistryViewer.renderer) {
    chemistryViewer.renderer.domElement.style.display = 'none';
  }
  
  renderChemistryAlmanac();
}

function updateDockUI() {
  console.log('[Chemistry] updateDockUI called. chemistryCart:', chemistryCart);
  chemDockGrid.innerHTML = '';
  
  // 1. Render các dụng cụ (Vessels) đang có trên bàn
  if (chemistryViewer && chemistryViewer.vessels) {
    const vesselIcons = { beaker: '🥛', flask: '️', testtube: '' };
    
    for (const vesselId in chemistryViewer.vessels) {
      if (vesselId === 'burner' || vesselId === 'phenol_set') continue;
      const vessel = chemistryViewer.vessels[vesselId];
      if (!vessel) continue;
      
      const isSelected = chemistryViewer.selectedVesselId === vesselId;
      const item = document.createElement('div');
      item.className = `chem-dock-item tool-item ${isSelected ? 'active' : ''}`;
      item.dataset.vesselId = vesselId;
      item.title = vessel.userData.title || vesselId;
      
      const chemInside = vessel.userData.chemical;
      const vesselType = vessel.userData.type || 'beaker';
      const icon = vesselIcons[vesselType] || '🧪';
      
      item.innerHTML = `
        <span class="chem-dock-item-sym">${icon}</span>
        <span class="chem-dock-item-name" style="margin-top: 1px;">${vessel.userData.title}</span>
        ${chemInside ? `<span style="font-size: 8px; font-weight: bold; padding: 1px 4px; border-radius: 4px; background: rgba(255,255,255,0.08); color: ${chemInside.color || '#a5f3fc'}; margin-top: 1px;">${chemInside.symbol}</span>` : ''}
      `;
      
      item.addEventListener('click', () => {
        if (chemistryViewer) {
          if (chemistryViewer.selectedVesselId === vesselId) {
            chemistryViewer.clearSelection();
            item.classList.remove('active');
          } else {
            chemistryViewer.selectVessel(vesselId);
            document.querySelectorAll('#chemistry-dock-grid .chem-dock-item').forEach(c => {
              c.classList.remove('active');
            });
            item.classList.add('active');
          }
          updateMaterialsList();
        }
      });
      
      chemDockGrid.appendChild(item);
    }
  }
  
  // 2. Thêm thanh chia nếu có cả dụng cụ và hóa chất
  const chemicals = chemistryCart.filter(i => i.category === 'Chemical');
  const hasVessels = chemistryViewer && Object.keys(chemistryViewer.vessels).some(k => k !== 'burner' && k !== 'phenol_set');
  if (hasVessels && chemicals.length > 0) {
    const div = document.createElement('div');
    div.className = 'chem-dock-divider';
    chemDockGrid.appendChild(div);
  }
  
  // 3. Render các hóa chất (Chemicals) được chọn để người dùng sử dụng
  chemicals.forEach(chem => {
    const item = document.createElement('div');
    item.className = 'chem-dock-item chemical-item';
    item.dataset.chemId = chem.id;
    item.title = `${chem.name} (Nhấp để thêm vào dụng cụ đang chọn)`;
    
    item.innerHTML = `
      <span class="chem-dock-item-sym" style="color: ${chem.color || '#fff'}">${chem.symbol}</span>
      <span class="chem-dock-item-name">${chem.name}</span>
    `;
    
    item.addEventListener('click', () => {
      // Nếu có dụng cụ đang được chọn
      if (chemistryViewer && chemistryViewer.selectedVesselId) {
        const vesselId = chemistryViewer.selectedVesselId;
        if (vesselId === 'burner') {
          const labDesc = document.getElementById('chemistry-lab-desc');
          if (labDesc) labDesc.textContent = "Không thể thêm hóa chất vào đèn cồn!";
          return;
        }
        addChemicalToVessel(vesselId, chem);
      } else {
        const labDesc = document.getElementById('chemistry-lab-desc');
        if (labDesc) labDesc.textContent = `Hãy chọn một dụng cụ (Cốc/Ống nghiệm/Bình tam giác) trước khi thêm ${chem.name}!`;
      }
    });
    
    chemDockGrid.appendChild(item);
  });
  
  // 4. Thêm thanh chia trước nút "+"
  if (chemicals.length > 0) {
    const div = document.createElement('div');
    div.className = 'chem-dock-divider';
    chemDockGrid.appendChild(div);
  }
  
  // 5. Thêm nút "+" để quay lại màn hình chọn vật chất
  const addBtn = document.createElement('div');
  addBtn.className = 'chem-dock-item add-btn';
  addBtn.title = 'Thêm dụng cụ hoặc hóa chất';
  addBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
  `;
  addBtn.addEventListener('click', () => {
    updateCartUI(); // cập nhật nút thành "Cập nhật bàn thí nghiệm"
    chemistryAlmanac.classList.remove('hidden');
    chemistrySidebar.classList.add('hidden');
    chemistryControls.classList.add('hidden');
    if (chemistryViewer && chemistryViewer.renderer) {
      chemistryViewer.renderer.domElement.style.display = 'none';
    }
  });
  
  chemDockGrid.appendChild(addBtn);
}

// Hàm bổ sung hóa chất động vào dụng cụ đang được chọn trên bàn thí nghiệm
function addChemicalToVessel(vesselId, chemical) {
  if (!chemistryViewer) return;
  const vessel = chemistryViewer.vessels[vesselId];
  if (!vessel) return;

  // Cập nhật thông tin hóa chất
  vessel.userData.chemical = { ...chemical };
  
  // Thiết lập nhiệt độ và pH cơ bản của hóa chất đó
  vessel.userData.temp = 298.15;
  vessel.userData.hasPhenol = (chemical.id === 'phenol');
  
  const pHMap = {
    hcl: 1.0,
    naoh: 14.0,
    cuso4: 4.0,
    na2co3: 11.5,
    h2o: 7.0,
    phenol: 7.0,
    zn: 7.0
  };
  vessel.userData.pH = pHMap[chemical.id] || 7.0;

  // Cập nhật lại màu sắc dung dịch trong mô hình 3D
  let liq = vessel.getObjectByName('liquid');
  const vesselType = chemistryViewer._getVesselType(vesselId);
  if (!liq) {
    let radTop = vesselType === 'beaker' ? 0.14 : vesselType === 'flask' ? 0.06 : 0.02;
    let radBot = vesselType === 'beaker' ? 0.14 : vesselType === 'flask' ? 0.13 : 0.02;
    let height = vesselType === 'testtube' ? 0.12 : 0.21;
    liq = chemistryViewer._createLiquidGroup(chemical, radTop, radBot, height, vesselType === 'testtube' ? 24 : 32);
    liq.position.y = vesselType === 'beaker' ? 0.115 : vesselType === 'flask' ? 0.11 : 0.1;
    vessel.add(liq);
  } else {
    // Cập nhật màu cho cả body và surface
    const newColor = new THREE.Color(chemical.color);
    const body = liq.getObjectByName('liquid_body');
    const surface = liq.getObjectByName('liquid_surface');
    if (body && body.material.uniforms) {
      body.material.uniforms.uColor.value.copy(newColor);
    }
    if (surface && surface.material.uniforms) {
      surface.material.uniforms.uColor.value.copy(newColor);
      surface.material.uniforms.uOpacity.value = chemical.id === 'phenol' ? 0.35 : 0.9;
    }
    liq.visible = true;
  }

  // Tắt phản ứng và reset các bọt khí/kết tủa cũ
  chemistryViewer.activeReaction = null;
  chemistryViewer.reactionRate = 0.0;
  
  const particles = [];
  vessel.traverse(child => {
    if (child.name === 'bubbles' || child.name === 'precipitate_particles') {
      particles.push(child);
    }
  });
  particles.forEach(p => vessel.remove(p));

  // Cập nhật nhãn 3D tách rời
  const oldLabelIdx = chemistryViewer.labels.findIndex(l => l.userData.followVessel === vesselId);
  if (oldLabelIdx >= 0) {
    chemistryViewer.labGroup.remove(chemistryViewer.labels[oldLabelIdx]);
    chemistryViewer.labels.splice(oldLabelIdx, 1);
  }
  if (chemical) {
    const vType = chemistryViewer._getVesselType(vesselId);
    const offset = new THREE.Vector3(0, vType === 'beaker' ? 0.58 : vType === 'flask' ? 0.75 : 0.6, 0);
    const newLabel = chemistryViewer._createLabel(chemical.symbol, chemical.color);
    newLabel.position.copy(vessel.position).add(offset);
    newLabel.userData.followVessel = vesselId;
    newLabel.userData.offset = offset;
    chemistryViewer.labGroup.add(newLabel);
    chemistryViewer.labels.push(newLabel);
  }

  // Cập nhật lại toàn bộ thông tin hiển thị trên HUD
  updateMaterialsList();
  updateDockUI();
  chemistryViewer.updateTelemetry();
  
  const labDesc = document.getElementById('chemistry-lab-desc');
  if (labDesc) {
    labDesc.textContent = `Đã bổ sung ${chemical.name} vào ${vessel.userData.title}.`;
  }
}

function updateMaterialsList() {
  chemMaterialsList.innerHTML = '';
  
  if (!chemistryViewer) return;
  
  let count = 0;
  for (const id in chemistryViewer.vessels) {
    if (id === 'burner') continue;
    // Bỏ qua các vessel trang trí không có dữ liệu hóa học
    if (id === 'phenol_bottle' || id === 'phenol_pipette') continue;
    const v = chemistryViewer.vessels[id];
    if (!v) continue;
    
    count++;
    const item = document.createElement('div');
    const isSelected = chemistryViewer.selectedVesselId === id;
    item.className = `chem-list-item ${isSelected ? 'active' : ''}`;
    
    const chemName = v.userData.chemical ? v.userData.chemical.name : 'Rỗng';
    const temp = (v.userData.temp != null) ? Number(v.userData.temp).toFixed(1) : '298.2';
    const pH   = (v.userData.pH   != null) ? Number(v.userData.pH).toFixed(1)   : '7.0';
    const color = v.userData.chemical ? v.userData.chemical.color : '#cbd5e1';
    
    item.innerHTML = `
      <div>
        <span class="chem-list-dot" style="background-color: ${color};"></span>
        <span class="chem-list-name"><b>${v.userData.title}</b> (${chemName})</span>
      </div>
      <span class="chem-list-value">${temp} K | pH ${pH}</span>
    `;
    
    item.addEventListener('click', () => {
      chemistryViewer.selectVessel(id);
    });
    
    chemMaterialsList.appendChild(item);
  }

  if (count === 0) {
    chemMaterialsList.innerHTML = `<div class="text-center py-6 text-on-surface-variant/40" style="font-size: 13px;">Không có thiết bị chứa nào</div>`;
  }
}

function handleChemistryVesselClick(id, name, pH, temp, reactants, chemical) {
  if (isMixingActive) {
    if (!id) return;
    
    if (mixSourceId === null) {
      mixSourceId = id;
      document.getElementById('chemistry-lab-desc').textContent = `Đã chọn nguồn: ${name}. Hãy nhấp chọn dụng cụ đích trên bàn 3D để đổ lẫn vào...`;
      
      // Highlight dock nguồn
      document.querySelectorAll('#chemistry-dock-grid .chem-dock-item').forEach(c => {
        c.classList.toggle('active', c.dataset.vesselId === id);
      });
      return;
    } else {
      if (id === mixSourceId) {
        resetMixingState();
        return;
      }
      
      const targetId = id;
      document.getElementById('chemistry-lab-desc').textContent = "Đang thực hiện rót hóa chất và phản ứng...";
      isMixingActive = false;
      
      chemistryViewer.pourVessel(mixSourceId, targetId, () => {
        resetMixingState();
        updateMaterialsList();
        updateDockUI();
      });
      return;
    }
  }

  // Cập nhật thông số đo lường Telemetry
  if (id && temp != null && pH != null) {
    chemTelemetryTemp.textContent = `${Number(temp).toFixed(1)} K`;
    chemTelemetryRate.textContent = `${chemistryViewer.reactionRate.toFixed(3)} mol/s`;
    chemTelemetryPh.textContent = Number(pH).toFixed(1);
    
    const tempPct = Math.max(0, Math.min(100, ((temp - 298.15) / 75) * 100));
    chemTempBarFill.style.width = `${tempPct}%`;
    
    const ratePct = chemistryViewer.reactionRate * 100;
    chemRateBarFill.style.width = `${ratePct}%`;
    
    const pHPct = (pH / 14) * 100;
    chemPhBarFill.style.width = `${pHPct}%`;
    
    if (pH < 5) {
      chemPhBarFill.style.backgroundColor = 'var(--accent-pink)';
    } else if (pH > 9) {
      chemPhBarFill.style.backgroundColor = 'var(--accent-purple)';
    } else {
      chemPhBarFill.style.backgroundColor = 'var(--accent-green)';
    }
  } else {
    chemTelemetryTemp.textContent = '298.1 K';
    chemTelemetryRate.textContent = '0.000 mol/s';
    chemTelemetryPh.textContent = '7.0';
    chemTempBarFill.style.width = '0%';
    chemRateBarFill.style.width = '0%';
    chemPhBarFill.style.width = '50%';
    chemPhBarFill.style.backgroundColor = 'var(--accent-green)';
  }
  
  // Cập nhật active dock highlight
  document.querySelectorAll('#chemistry-dock-grid .chem-dock-item').forEach(c => {
    c.classList.toggle('active', c.dataset.vesselId === id);
  });

  updateMaterialsList();
}

function handleChemistryReactionTrigger(reactionText) {
  document.getElementById('chemistry-lab-desc').textContent = reactionText;
  
  if (chemistryViewer.activeReaction) {
    chemReactionAlert.classList.remove('hidden');
    
    let eq = "";
    if (chemistryViewer.activeReaction === 'neutralization') eq = "HCl + NaOH → NaCl + H₂O (Trung hòa)";
    else if (chemistryViewer.activeReaction === 'precipitate') eq = "CuSO₄ + 2NaOH → Cu(OH)₂↓ + Na₂SO₄ (Kết tủa)";
    else if (chemistryViewer.activeReaction === 'gas_h2') eq = "Zn + 2HCl → ZnCl₂ + H₂↑ (Thế H₂)";
    else if (chemistryViewer.activeReaction === 'gas_co2') eq = "Na₂CO₃ + 2HCl → 2NaCl + H₂O + CO₂↑";
    
    chemReactionAlertText.innerHTML = `Phản ứng tỏa nhiệt đang xảy ra!<br><b style="color:var(--accent-teal)">${eq}</b>`;
  } else {
    chemReactionAlert.classList.add('hidden');
  }

  // Làm mới đo lường của vessel hiện tại
  if (chemistryViewer.selectedVesselId) {
    const v = chemistryViewer.vessels[chemistryViewer.selectedVesselId];
    if (v) {
      handleChemistryVesselClick(
        chemistryViewer.selectedVesselId,
        v.userData.title,
        v.userData.pH,
        v.userData.temp,
        [],
        v.userData.chemical
      );
    }
  }
}

function resetMixingState() {
  isMixingActive = false;
  mixSourceId = null;
  chemBtnMix.classList.remove('active');
  document.getElementById('chemistry-lab-desc').textContent = "Hãy kích hoạt các dụng cụ và thêm hóa chất từ dock dưới để tiến hành các phản ứng pha chế.";
  
  // Trả về highlight dock
  if (chemistryViewer && chemistryViewer.selectedVesselId) {
    document.querySelectorAll('#chemistry-dock-grid .chem-dock-item').forEach(c => {
      c.classList.toggle('active', c.dataset.vesselId === chemistryViewer.selectedVesselId);
    });
  }
}

function initChemGraph() {
  chemGraphData = Array(40).fill(298.15);
  drawChemGraph();
}

function updateChemGraph() {
  if (currentMode !== 'chemistry' || chemistryState !== 'workspace' || !chemistryViewer) return;
  
  let currentTemp = 298.15;
  if (chemistryViewer.selectedVesselId) {
    const v = chemistryViewer.vessels[chemistryViewer.selectedVesselId];
    if (v) currentTemp = v.userData.temp;
  } else if (chemistryViewer.isBurnerLit && chemistryViewer.vessels['burner']) {
    currentTemp = chemistryViewer.currentHeat;
  }

  chemGraphData.push(currentTemp);
  if (chemGraphData.length > 40) {
    chemGraphData.shift();
  }

  drawChemGraph();
}

function drawChemGraph() {
  if (!chemGraphPath || !chemGraphArea) return;
  
  const points = [];
  const minTemp = 290.0;
  const maxTemp = 380.0;
  const width = 100;
  const height = 40;
  
  const stepX = width / (chemGraphData.length - 1);
  
  chemGraphData.forEach((temp, idx) => {
    const x = idx * stepX;
    const y = height - ((temp - minTemp) / (maxTemp - minTemp)) * (height - 6) - 3;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  });
  
  const pathD = `M ${points.join(' L ')}`;
  chemGraphPath.setAttribute('d', pathD);
  
  const areaD = `${pathD} L 100,45 L 0,45 Z`;
  chemGraphArea.setAttribute('d', areaD);
}

// Boot application
window.addEventListener('DOMContentLoaded', init);

function setupCollapsibleSidebars() {
  const sidebars = document.querySelectorAll('.sidebar-card');
  sidebars.forEach(sidebar => {
    if (sidebar.querySelector('.sidebar-toggle-btn')) return;

    // 1. Tạo scroll wrapper và chuyển toàn bộ con hiện tại vào đó (trừ khi đã có)
    let scrollWrapper = sidebar.querySelector('.sidebar-scroll-wrapper');
    if (!scrollWrapper) {
      scrollWrapper = document.createElement('div');
      scrollWrapper.className = 'sidebar-scroll-wrapper';
      
      // Di chuyển các phần tử con hiện tại vào scroll wrapper
      while (sidebar.firstChild) {
        scrollWrapper.appendChild(sidebar.firstChild);
      }
      sidebar.appendChild(scrollWrapper);
    }

    // 2. Tạo nút toggle
    const toggleBtn = document.createElement('div');
    toggleBtn.className = 'sidebar-toggle-btn';
    toggleBtn.innerHTML = `
      <svg class="toggle-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    `;
    toggleBtn.title = "Thu gọn / Mở rộng bảng";
    
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isCollapsed = sidebar.classList.toggle('collapsed');
      
      const polyline = toggleBtn.querySelector('polyline');
      if (isCollapsed) {
        polyline.setAttribute('points', '15 18 9 12 15 6'); // Mũi tên trái (Mở rộng)
      } else {
        polyline.setAttribute('points', '9 18 15 12 9 6'); // Mũi tên phải (Thu gọn)
      }
    });
    
    // Thêm nút toggle trực tiếp vào sidebar (bên ngoài scroll wrapper để không bị cuộn hay clip)
    sidebar.appendChild(toggleBtn);
  });
}
