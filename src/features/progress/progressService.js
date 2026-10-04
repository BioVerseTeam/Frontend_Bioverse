/**
 * BioVerse - Progress & Learning Tracker Service
 * Manages user XP, levels, weekly goals, and learning progress locally.
 * Designed to sync with backend API when progress endpoints become available.
 */

import { getCurrentUser, getAccessToken } from '../../utils/storage.js';

const PROGRESS_KEY = 'bioverse_progress';

// ─── Level System Configuration ───
const LEVELS = [
  { level: 1, title: 'Tập Sự Phòng Thí Nghiệm', xpRequired: 0 },
  { level: 2, title: 'Quan Sát Viên Nhí', xpRequired: 200 },
  { level: 3, title: 'Trợ Lý Nghiên Cứu', xpRequired: 500 },
  { level: 4, title: 'Nhà Thí Nghiệm Trẻ', xpRequired: 1000 },
  { level: 5, title: 'Nhà Thám Hiểm Tế Bào', xpRequired: 1500 },
  { level: 6, title: 'Chuyên Gia Giải Phẫu', xpRequired: 2500 },
  { level: 7, title: 'Bậc Thầy Sinh Học', xpRequired: 4000 },
  { level: 8, title: 'Nhà Khoa Học Trưởng', xpRequired: 6000 },
  { level: 9, title: 'Viện Sĩ Hàn Lâm STEM', xpRequired: 9000 },
  { level: 10, title: 'Huyền Thoại BioVerse', xpRequired: 15000 },
];

// ─── 3D Models Available in Lab (Biology + Chemistry) ───
export const LAB_MODELS = [
  { id: '1', slug: 'he-than-kinh', name: 'Hệ Thần Kinh & Dây Thần Kinh', subject: 'Sinh Học', grade: 8, icon: 'psychology', xpReward: 100 },
  { id: '2', slug: 'he-tieu-hoa', name: 'Hệ Tiêu Hóa & Nội Tạng', subject: 'Sinh Học', grade: 8, icon: 'nutrition', xpReward: 100 },
  { id: '3', slug: 'he-tuan-hoan', name: 'Hệ Tuần Hoàn & Tim Mạch', subject: 'Sinh Học', grade: 8, icon: 'vital_signs', xpReward: 100 },
  { id: '4', slug: 'he-xuong', name: 'Hệ Xương & Khung Xương Người', subject: 'Sinh Học', grade: 8, icon: 'accessibility_new', xpReward: 100 },
  { id: '5', slug: 'he-co-bap', name: 'Hệ Cơ Bắp Toàn Thân', subject: 'Sinh Học', grade: 8, icon: 'fitness_center', xpReward: 100 },
  { id: '6', slug: 'trung-de-giay', name: 'Trùng Đế Giày (Paramecium)', subject: 'Sinh Học', grade: 6, icon: 'biotech', xpReward: 100 },
  { id: '7', slug: 'phoi-nguoi', name: 'Phổi & Hệ Hô Hấp Người', subject: 'Sinh Học', grade: 8, icon: 'air', xpReward: 100 },
  { id: '8', slug: 'nguyen-phan-te-bao', name: 'Quá Trình Phân Bào Nguyên Phân (Mitosis)', subject: 'Sinh Học', grade: 9, icon: 'hub', xpReward: 100 },
  { id: 'reaction', slug: 'phan-ung-hoa-hoc', name: 'Hoạt ảnh phản ứng phân tử', subject: 'Hóa Học', grade: 8, icon: 'science', xpReward: 80 },
];

export const BIOLOGY_MODELS = LAB_MODELS.filter(m => m.subject === 'Sinh Học');

/**
 * Get default progress data for a new user
 */
function getDefaultProgress() {
  return {
    xp: 0,
    modelsExplored: [],        // Array of model IDs user has interacted with
    examsCompleted: 0,
    examsCorrectAnswers: 0,
    totalQuestions: 0,
    weeklyGoal: {
      target: 4,               // Models to explore this week
      startDate: getWeekStartDate(),
    },
    lastLesson: null,          // { modelId, slug, name, subject, progress, timestamp }
    chatMessagesCount: 0,
    updatedAt: new Date().toISOString()
  };
}

function getWeekStartDate() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  return new Date(now.setDate(diff)).toISOString().split('T')[0];
}

/**
 * Load progress from localStorage (fallback until backend API is ready)
 */
export function getProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      // Reset weekly goal if new week
      if (data.weeklyGoal && data.weeklyGoal.startDate !== getWeekStartDate()) {
        data.weeklyGoal.startDate = getWeekStartDate();
        data.modelsExplored = data.modelsExplored || [];
        saveProgress(data);
      }
      return data;
    }
  } catch (e) {
    console.warn('Failed to load progress:', e);
  }
  const defaults = getDefaultProgress();
  saveProgress(defaults);
  return defaults;
}

/**
 * Save progress to localStorage
 */
export function saveProgress(data) {
  try {
    data.updatedAt = new Date().toISOString();
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save progress:', e);
  }
}

/**
 * Add XP and return updated progress
 */
export function addXP(amount) {
  const progress = getProgress();
  progress.xp += amount;
  saveProgress(progress);
  return progress;
}

/**
 * Mark a model as explored
 */
export function markModelExplored(modelId) {
  const progress = getProgress();
  const cleanId = String(modelId).replace(/^model-/, '');
  if (!progress.modelsExplored.includes(cleanId) && !progress.modelsExplored.includes(`model-${cleanId}`)) {
    progress.modelsExplored.push(cleanId);
    // Award XP for exploring new model
    const model = LAB_MODELS.find(m => String(m.id) === cleanId || m.slug === cleanId);
    if (model) {
      progress.xp += model.xpReward || 100;
    } else {
      progress.xp += 100;
    }
    saveProgress(progress);
    window.dispatchEvent(new CustomEvent('bioverse_progress_updated'));
  }
  return progress;
}

/**
 * Record exam completion
 */
export function recordExamResult(correctAnswers, totalQuestions) {
  const progress = getProgress();
  progress.examsCompleted += 1;
  progress.examsCorrectAnswers += correctAnswers;
  progress.totalQuestions += totalQuestions;
  progress.xp += correctAnswers * 10;
  saveProgress(progress);
  return progress;
}

/**
 * Update last lesson progress
 */
export function updateLastLesson(modelIdOrObj, progressPercent) {
  const progress = getProgress();
  if (typeof modelIdOrObj === 'object' && modelIdOrObj !== null) {
    progress.lastLesson = {
      ...modelIdOrObj,
      timestamp: new Date().toISOString()
    };
  } else {
    progress.lastLesson = {
      modelId: modelIdOrObj,
      progress: typeof progressPercent === 'number' ? Math.min(100, Math.max(0, progressPercent)) : 0,
      timestamp: new Date().toISOString()
    };
  }
  saveProgress(progress);
  window.dispatchEvent(new CustomEvent('bioverse_progress_updated'));
  return progress;
}

/**
 * Record a chat message sent to BioBot
 */
export function recordChatMessage() {
  const progress = getProgress();
  progress.chatMessagesCount += 1;
  progress.xp += 5;
  saveProgress(progress);
  return progress;
}

/**
 * Get user's current level info based on XP
 */
export function getLevelInfo(xp) {
  let currentLevel = LEVELS[0];
  let nextLevel = LEVELS[1];
  
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) {
      currentLevel = LEVELS[i];
      nextLevel = LEVELS[i + 1] || null;
      break;
    }
  }
  
  const xpInLevel = xp - currentLevel.xpRequired;
  const xpForNextLevel = nextLevel ? nextLevel.xpRequired - currentLevel.xpRequired : 0;
  const levelProgress = nextLevel ? Math.round((xpInLevel / xpForNextLevel) * 100) : 100;
  
  return {
    level: currentLevel.level,
    title: currentLevel.title,
    xpInLevel,
    xpForNextLevel,
    levelProgress,
    nextLevelTitle: nextLevel ? nextLevel.title : null
  };
}

/**
 * Calculate biology progress based on total biology models
 * @param {number|null} totalOverride Total biology models (from catalog API or default)
 */
export function getBiologyProgressStats(totalOverride = null) {
  const progress = getProgress();
  let recentList = [];
  try {
    const rawRecent = localStorage.getItem('bioverse_recent_models');
    if (rawRecent) recentList = JSON.parse(rawRecent) || [];
  } catch {}

  const exploredSet = new Set();

  // 1. From progress.modelsExplored
  (progress.modelsExplored || []).forEach((key) => {
    const cleanId = String(key).replace(/^model-/, '');
    const found = BIOLOGY_MODELS.find(m => String(m.id) === cleanId || m.slug === cleanId);
    if (found) {
      exploredSet.add(found.id);
    }
  });

  // 2. From recent models viewed in laboratory
  recentList.forEach((m) => {
    const found = BIOLOGY_MODELS.find(b => 
      String(b.id) === String(m.id) || 
      b.slug === m.slug || 
      b.name === m.name
    );
    if (found) {
      exploredSet.add(found.id);
    } else if (m.category && m.category !== 'Hóa học') {
      exploredSet.add(String(m.id || m.slug || m.name));
    }
  });

  const total = typeof totalOverride === 'number' && totalOverride > 0 
    ? totalOverride 
    : BIOLOGY_MODELS.length;

  const completed = Math.min(total, exploredSet.size);
  const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

  return {
    completed,
    total,
    percent,
    exploredIds: Array.from(exploredSet)
  };
}

/**
 * Get weekly goal summary
 */
export function getWeeklyGoalSummary() {
  const progress = getProgress();
  const bioStats = getBiologyProgressStats();
  const modelsThisWeek = bioStats.completed;
  const target = progress.weeklyGoal?.target || 4;
  const percent = Math.min(100, Math.round((modelsThisWeek / target) * 100));
  
  return {
    completed: modelsThisWeek,
    target,
    percent,
    modelsExplored: bioStats.exploredIds,
    remaining: Math.max(0, target - modelsThisWeek)
  };
}

/**
 * Get formatted display data for the home page
 */
export function getHomePageData(totalBioOverride = null) {
  const user = getCurrentUser();
  const progress = getProgress();
  const levelInfo = getLevelInfo(progress.xp);
  const weeklyGoal = getWeeklyGoalSummary();
  const isLoggedIn = !!getAccessToken() && !!user;
  
  // Calculate real Biology models stats
  const bioStats = getBiologyProgressStats(totalBioOverride);

  // Determine the active Biology lesson for the resume card
  let lastLessonInfo = null;
  let recentList = [];
  try {
    const rawRecent = localStorage.getItem('bioverse_recent_models');
    if (rawRecent) recentList = JSON.parse(rawRecent) || [];
  } catch {}

  // Priority 1: Latest biology model from recentModels
  const latestBio = recentList.find(m => m.category !== 'Hóa học');
  if (latestBio) {
    const foundBio = BIOLOGY_MODELS.find(b => String(b.id) === String(latestBio.id) || b.slug === latestBio.slug);
    lastLessonInfo = {
      modelId: latestBio.id,
      slug: latestBio.slug || (foundBio ? foundBio.slug : null),
      name: latestBio.name,
      subject: 'Sinh Học',
      grade: latestBio.grade || (foundBio ? foundBio.grade : 8),
      icon: foundBio?.icon || 'biotech',
      progress: bioStats.percent,
      completedModels: bioStats.completed,
      totalModels: bioStats.total,
      isDefault: false
    };
  }

  // Priority 2: progress.lastLesson if it's a biology model
  if (!lastLessonInfo && progress.lastLesson && progress.lastLesson.modelId !== 'reaction') {
    const cleanId = String(progress.lastLesson.modelId || '').replace(/^model-/, '');
    const found = BIOLOGY_MODELS.find(m => String(m.id) === cleanId || m.slug === progress.lastLesson.slug);
    if (found) {
      lastLessonInfo = {
        modelId: found.id,
        slug: found.slug,
        name: progress.lastLesson.name || found.name,
        subject: 'Sinh Học',
        grade: found.grade || 8,
        icon: found.icon || 'biotech',
        progress: bioStats.percent,
        completedModels: bioStats.completed,
        totalModels: bioStats.total,
        isDefault: false
      };
    }
  }

  // Priority 3: Default to premier biology model (Hệ Tuần Hoàn & Tim Mạch)
  if (!lastLessonInfo) {
    const defaultBio = BIOLOGY_MODELS[2] || BIOLOGY_MODELS[0];
    lastLessonInfo = {
      modelId: defaultBio.id,
      slug: defaultBio.slug,
      name: defaultBio.name,
      subject: 'Sinh Học',
      grade: defaultBio.grade || 8,
      icon: defaultBio.icon || 'biotech',
      progress: bioStats.percent,
      completedModels: bioStats.completed,
      totalModels: bioStats.total,
      isDefault: bioStats.completed === 0
    };
  }
  
  // Explored biology model names for display
  const exploredModelNames = BIOLOGY_MODELS
    .filter(m => bioStats.exploredIds.includes(m.id))
    .map(m => m.name);
  
  // Remaining biology models
  const remainingModels = BIOLOGY_MODELS
    .filter(m => !bioStats.exploredIds.includes(m.id))
    .map(m => m.name);
  
  const userName = isLoggedIn 
    ? (user.name || user.fullName || user.email?.split('@')[0] || 'Nhà nghiên cứu')
    : 'Nhà khoa học';

  return {
    userName,
    userEmail: user?.email || '',
    userRole: user?.role || 'STUDENT',
    isLoggedIn,
    
    xp: progress.xp,
    xpFormatted: progress.xp.toLocaleString('vi-VN'),
    levelInfo,
    currentStreak: isLoggedIn ? (user.currentStreak ?? 0) : 0,
    longestStreak: isLoggedIn ? (user.longestStreak ?? 0) : 0,
    
    weeklyGoal,
    exploredModelNames,
    remainingModels,
    bioStats,
    
    lastLesson: lastLessonInfo,
    
    examsCompleted: progress.examsCompleted,
    chatMessages: progress.chatMessagesCount,
  };
}

export { LEVELS };
