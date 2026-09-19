/**
 * BioVerse - Home Page Controller (index.html)
 * Dynamically binds real progress, XP, level, weekly goals, and last lesson data.
 */

import { setupNavbarAuth } from '../utils/authNavbar.js';
import { setupBiologyNav } from '../utils/siteNav.js';
import { ChatBox } from '../components/chatBox.js';
import { getHomePageData } from '../features/progress/progressService.js';
import { AuthService } from '../features/auth/authService.js';

document.addEventListener('DOMContentLoaded', () => {
  if (AuthService.getUser()?.role === 'ADMIN' && new URLSearchParams(window.location.search).get('view') !== 'student') {
    window.location.replace('/admin.html');
    return;
  }
  // 1. Sync User state in Header & greeting
  setupNavbarAuth();
  setupBiologyNav();

  // 2. Initialize BioBot Chat Assistant
  try {
    new ChatBox();
  } catch (err) {
    console.warn('BioBot init note:', err);
  }

  // 3. Render real dynamic homepage data
  renderHomeData();

  // 4. Listen for progress updates (from other tabs or intra-page interactions)
  window.addEventListener('storage', (e) => {
    if (e.key === 'bioverse_progress' || e.key === 'bioverse_user') {
      renderHomeData();
    }
  });

  window.addEventListener('bioverse_progress_updated', () => {
    renderHomeData();
  });

  window.addEventListener('bioverse_streak_updated', () => {
    renderHomeData();
  });

  console.log('BioVerse Home Page initialized with real dynamic data & progress tracking.');
});

export function renderHomeData() {
  const data = getHomePageData();

  // 1. Hero greeting
  const heroGreetingName = document.getElementById('hero-user-name');
  if (heroGreetingName) {
    heroGreetingName.textContent = `${data.userName}!`;
  }

  // 2. Level Badge
  const levelBadge = document.getElementById('user-level-badge');
  if (levelBadge) {
    levelBadge.textContent = `Cấp độ ${data.levelInfo.level}: ${data.levelInfo.title}`;
  }

  // 3. XP Display
  const xpDisplay = document.getElementById('user-xp-display');
  if (xpDisplay) {
    xpDisplay.textContent = `${data.xpFormatted} XP`;
  }

  const streakDisplay = document.getElementById('user-streak-display');
  if (streakDisplay) {
    streakDisplay.textContent = `${data.currentStreak} ngày`;
  }
  const longestDisplay = document.getElementById('user-longest-streak');
  if (longestDisplay) {
    longestDisplay.textContent = data.isLoggedIn
      ? `Kỷ lục: ${data.longestStreak} ngày`
      : 'Đăng nhập để tích chuỗi';
  }

  // 4. Weekly Goal Title
  const weeklyGoalText = document.getElementById('weekly-goal-text');
  if (weeklyGoalText) {
    weeklyGoalText.textContent = `Mục tiêu tuần này: Hoàn thành ${data.weeklyGoal.completed}/${data.weeklyGoal.target} mô hình 3D`;
  }

  // 5. Weekly Progress Percent
  const weeklyPercent = document.getElementById('weekly-progress-percent');
  if (weeklyPercent) {
    weeklyPercent.textContent = `${data.weeklyGoal.percent}% Tiến trình`;
  }

  // 6. Weekly Progress Bar
  const progressBar = document.getElementById('weekly-progress-bar');
  if (progressBar) {
    setTimeout(() => {
      progressBar.style.width = `${data.weeklyGoal.percent}%`;
    }, 120);
  }

  // 7. Weekly Progress Sprout
  const progressSprout = document.getElementById('weekly-progress-sprout');
  if (progressSprout) {
    const sproutPos = Math.min(95, Math.max(2, data.weeklyGoal.percent));
    progressSprout.style.left = `${sproutPos}%`;
  }

  // 8. Explored Models & Remaining Models Text
  const exploredText = document.getElementById('explored-models-text');
  if (exploredText) {
    if (data.exploredModelNames.length > 0) {
      exploredText.textContent = `Đã giải phẫu: ${data.exploredModelNames.join(', ')}`;
    } else {
      exploredText.textContent = 'Đã giải phẫu: Chưa có mô hình nào (bấm vào Lab để bắt đầu)';
    }
  }

  const remainingText = document.getElementById('remaining-models-text');
  if (remainingText) {
    if (data.remainingModels.length > 0) {
      remainingText.textContent = `Còn lại: ${data.remainingModels.slice(0, 2).join(', ')}${data.remainingModels.length > 2 ? '...' : ''}`;
    } else {
      remainingText.textContent = '🎉 Đã hoàn thành tất cả mô hình!';
    }
  }

  // 9. Resume Lesson Card ("BÀI HỌC DỞ DANG")
  if (data.lastLesson) {
    const lesson = data.lastLesson;
    const tagEl = document.getElementById('resume-lesson-tag');
    const iconEl = document.getElementById('resume-lesson-icon');
    const subjectEl = document.getElementById('resume-lesson-subject');
    const titleEl = document.getElementById('resume-lesson-title');
    const barEl = document.getElementById('resume-lesson-bar');
    const percentEl = document.getElementById('resume-lesson-percent');
    const linkEl = document.getElementById('resume-lesson-link');
    const btnTextEl = document.getElementById('resume-lesson-btn-text');

    if (tagEl) {
      tagEl.textContent = lesson.isDefault ? 'BÀI HỌC GỢI Ý' : 'BÀI HỌC DỞ DANG';
    }
    if (iconEl) {
      iconEl.textContent = lesson.icon || 'biotech';
    }
    if (subjectEl) {
      subjectEl.textContent = `${lesson.subject} ${lesson.grade || 8} • Bài thực hành`;
    }
    if (titleEl) {
      titleEl.textContent = lesson.name;
    }
    if (barEl) {
      setTimeout(() => {
        barEl.style.width = `${lesson.progress}%`;
      }, 150);
    }
    if (percentEl) {
      percentEl.textContent = lesson.progress > 0 ? `Đã học ${lesson.progress}%` : 'Chưa bắt đầu (0%)';
    }
    if (linkEl) {
      linkEl.href = `/lab.html?mode=${lesson.modelId}`;
    }
    if (btnTextEl) {
      btnTextEl.textContent = lesson.progress > 0 ? 'Học tiếp ngay' : 'Bắt đầu học ngay';
    }
  }
}
