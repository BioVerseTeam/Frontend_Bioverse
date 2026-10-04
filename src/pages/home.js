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
    window.location.replace('/admin');
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
  syncCatalogTotal();

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

let cachedTotalBio = null;
let cachedTotalLabs = null;

export function renderHomeData(totalBioOverride = null, totalLabsOverride = null) {
  if (typeof totalBioOverride === 'number' && totalBioOverride > 0) {
    cachedTotalBio = totalBioOverride;
  }
  if (typeof totalLabsOverride === 'number' && totalLabsOverride > 0) {
    cachedTotalLabs = totalLabsOverride;
  }

  const effectiveBio = cachedTotalBio || totalBioOverride;
  const effectiveLabs = cachedTotalLabs || totalLabsOverride;
  const data = getHomePageData(effectiveBio);

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
      exploredText.textContent = 'Đã giải phẫu: Chưa có mô hình nào (bấm vào Sinh học để bắt đầu)';
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

  // 9. Resume Lesson Card ("BÀI HỌC DỞ DANG" - Sinh Học 3D)
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

    const completed = lesson.completedModels ?? 0;
    const total = lesson.totalModels ?? 8;
    const percent = lesson.progress ?? 0;

    if (tagEl) {
      if (completed === 0) {
        tagEl.textContent = 'BÀI HỌC GỢI Ý';
      } else if (completed >= total) {
        tagEl.textContent = 'ĐÃ HOÀN THÀNH';
      } else {
        tagEl.textContent = 'BÀI HỌC DỞ DANG';
      }
    }
    if (iconEl) {
      iconEl.textContent = lesson.icon || 'biotech';
    }
    if (subjectEl) {
      subjectEl.textContent = `SINH HỌC ${lesson.grade || 8} • BÀI THỰC HÀNH 3D`;
    }
    if (titleEl) {
      titleEl.textContent = lesson.name;
    }
    if (barEl) {
      setTimeout(() => {
        barEl.style.width = `${percent}%`;
      }, 150);
    }
    if (percentEl) {
      if (completed === 0) {
        percentEl.textContent = `Chưa bắt đầu (0/${total} mô hình sinh học)`;
      } else if (completed >= total) {
        percentEl.textContent = `Đã hoàn thành 100% (${total}/${total} mô hình sinh học)`;
      } else {
        percentEl.textContent = `Đã học ${percent}% (${completed}/${total} mô hình sinh học)`;
      }
    }
    if (linkEl) {
      linkEl.href = '/sinh-hoc';
    }
    if (btnTextEl) {
      if (completed === 0) {
        btnTextEl.textContent = 'Khám phá Sinh học ngay';
      } else if (completed >= total) {
        btnTextEl.textContent = 'Mở kho Sinh học ôn tập';
      } else {
        btnTextEl.textContent = 'Vào học Sinh học ngay';
      }
    }
  }

  // 10. Hero Biology stats cards (dynamically bound to real catalog & lab data)
  const modelsCountEl = document.getElementById('hero-biology-models-count');
  if (modelsCountEl) {
    const totalModels = effectiveBio || data.bioStats?.total || 8;
    modelsCountEl.textContent = `${totalModels} Mô hình`;
  }

  const labsCountEl = document.getElementById('hero-biology-labs-count');
  if (labsCountEl) {
    const totalLabs = effectiveLabs || 6;
    labsCountEl.textContent = `${totalLabs} Thực hành ảo`;
  }
}

async function syncCatalogTotal() {
  try {
    const [catRes, labsRes] = await Promise.allSettled([
      fetch('/api/models/catalog?subject=BIOLOGY&size=1'),
      fetch('/api/models/labs')
    ]);

    let totalModels = null;
    let totalLabs = null;

    if (catRes.status === 'fulfilled' && catRes.value.ok) {
      const json = await catRes.value.json();
      const total = json?.data?.totalElements;
      if (typeof total === 'number' && total > 0) {
        totalModels = total;
      }
    }

    if (labsRes.status === 'fulfilled' && labsRes.value.ok) {
      const json = await labsRes.value.json();
      const labs = json?.data;
      if (Array.isArray(labs) && labs.length > 0) {
        totalLabs = labs.length;
      }
    }

    if (totalModels !== null || totalLabs !== null) {
      renderHomeData(totalModels, totalLabs);
    }
  } catch (err) {
    console.debug('Catalog total sync note:', err);
  }
}
