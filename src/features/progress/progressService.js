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

// ─── 3D Models Available in Lab ───
const LAB_MODELS = [
  { id: 'skull', name: 'Hộp Sọ Người', subject: 'Sinh Học', grade: 8, icon: 'view_in_ar', xpReward: 150 },
  { id: 'organs', name: 'Hệ Tuần Hoàn & Tim Mạch', subject: 'Sinh Học', grade: 8, icon: 'vital_signs', xpReward: 200 },
  { id: 'paramecium', name: 'Trùng Giày (Paramecium)', subject: 'Sinh Học', grade: 7, icon: 'biotech', xpReward: 120 },
  { id: 'plant', name: 'Cấu Tạo Thực Vật', subject: 'Sinh Học', grade: 6, icon: 'psychiatry', xpReward: 100 },
  { id: 'mitosis', name: 'Phân Bào Nguyên Phân', subject: 'Sinh Học', grade: 8, icon: 'cell_tower', xpReward: 180 },
  { id: 'chemistry', name: 'Phòng Thí Nghiệm Hóa Học', subject: 'Hóa Học', grade: 8, icon: 'science', xpReward: 160 },
];

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
    lastLesson: null,          // { modelId, progress: 0-100, timestamp }
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
  if (!progress.modelsExplored.includes(modelId)) {
    progress.modelsExplored.push(modelId);
    // Award XP for exploring new model
    const model = LAB_MODELS.find(m => m.id === modelId);
    if (model) {
      progress.xp += model.xpReward;
    }
    saveProgress(progress);
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
  // XP reward: 10 per correct answer
  progress.xp += correctAnswers * 10;
  saveProgress(progress);
  return progress;
}

/**
 * Update last lesson progress
 */
export function updateLastLesson(modelId, progressPercent) {
  const progress = getProgress();
  progress.lastLesson = {
    modelId,
    progress: Math.min(100, Math.max(0, progressPercent)),
    timestamp: new Date().toISOString()
  };
  saveProgress(progress);
  return progress;
}

/**
 * Record a chat message sent to BioBot
 */
export function recordChatMessage() {
  const progress = getProgress();
  progress.chatMessagesCount += 1;
  // Small XP for engaging with AI
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
 * Get weekly goal summary
 */
export function getWeeklyGoalSummary() {
  const progress = getProgress();
  const modelsThisWeek = progress.modelsExplored.length;
  const target = progress.weeklyGoal?.target || 4;
  const percent = Math.min(100, Math.round((modelsThisWeek / target) * 100));
  
  return {
    completed: modelsThisWeek,
    target,
    percent,
    modelsExplored: progress.modelsExplored,
    remaining: Math.max(0, target - modelsThisWeek)
  };
}

/**
 * Get formatted display data for the home page
 */
export function getHomePageData() {
  const user = getCurrentUser();
  const progress = getProgress();
  const levelInfo = getLevelInfo(progress.xp);
  const weeklyGoal = getWeeklyGoalSummary();
  const isLoggedIn = !!getAccessToken() && !!user;
  
  // Get last lesson info
  let lastLessonInfo = null;
  if (progress.lastLesson) {
    const model = LAB_MODELS.find(m => m.id === progress.lastLesson.modelId);
    if (model) {
      lastLessonInfo = {
        ...progress.lastLesson,
        name: model.name,
        subject: model.subject,
        grade: model.grade,
        icon: model.icon,
        isDefault: false
      };
    }
  }

  // If user hasn't started any lesson yet, recommend the 1st model
  if (!lastLessonInfo) {
    lastLessonInfo = {
      modelId: 'skull',
      name: 'Hộp Sọ & Cấu Trúc Xương Đầu Mặt',
      subject: 'Sinh Học',
      grade: 8,
      icon: 'view_in_ar',
      progress: 0,
      isDefault: true
    };
  }
  
  // Get explored model names for display
  const exploredModelNames = progress.modelsExplored
    .map(id => LAB_MODELS.find(m => m.id === id)?.name)
    .filter(Boolean);
  
  // Get remaining models
  const remainingModels = LAB_MODELS
    .filter(m => !progress.modelsExplored.includes(m.id))
    .map(m => m.name);
  
  const userName = isLoggedIn 
    ? (user.name || user.fullName || user.email?.split('@')[0] || 'Nhà nghiên cứu')
    : 'Nhà khoa học';

  return {
    // User info
    userName,
    userEmail: user?.email || '',
    userRole: user?.role || 'STUDENT',
    isLoggedIn,
    
    // XP & Level
    xp: progress.xp,
    xpFormatted: progress.xp.toLocaleString('vi-VN'),
    levelInfo,
    
    // Weekly goal
    weeklyGoal,
    exploredModelNames,
    remainingModels,
    
    // Last lesson
    lastLesson: lastLessonInfo,
    
    // Stats
    examsCompleted: progress.examsCompleted,
    chatMessages: progress.chatMessagesCount,
  };
}

export { LAB_MODELS, LEVELS };
