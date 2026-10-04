import gsap from 'gsap';

/**
 * Homepage banner linking to the biology catalog.
 */

const CATALOG_HREF = '/sinh-hoc';

export function setupBiologyNav() {
  insertHomeBanner();
  insertReactionNavLink();
  insertReactionBanner();
  initHeaderNavAnimations();
}

export function initHeaderNavAnimations() {
  const nav = document.querySelector('header nav');
  const links = document.querySelectorAll('header nav a');

  links.forEach((link) => {
    if (link.dataset.gsapNavBound === 'true') return;
    link.dataset.gsapNavBound = 'true';
    link.classList.add('bv-nav-link');

    link.addEventListener('mouseenter', () => {
      gsap.killTweensOf(link);
      gsap.to(link, {
        y: -2.5,
        scale: 1.04,
        duration: 0.2,
        ease: 'back.out(2)',
        overwrite: 'auto'
      });
    });

    link.addEventListener('mouseleave', () => {
      gsap.killTweensOf(link);
      gsap.to(link, {
        y: 0,
        scale: 1,
        duration: 0.2,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    });

    link.addEventListener('mousedown', () => {
      gsap.to(link, {
        y: 1,
        scale: 0.97,
        duration: 0.08,
        ease: 'power1.inOut'
      });
    });

    link.addEventListener('mouseup', () => {
      gsap.to(link, {
        y: -2.5,
        scale: 1.04,
        duration: 0.12,
        ease: 'power2.out'
      });
    });
  });

  // Watch for any links added dynamically to header nav (e.g. admin, pricing)
  if (nav && !nav.dataset.gsapObserverBound) {
    nav.dataset.gsapObserverBound = 'true';
    const observer = new MutationObserver(() => {
      initHeaderNavAnimations();
    });
    observer.observe(nav, { childList: true });
  }

  // Micro-interactions for other interactive elements in header
  const brandLogo = document.querySelector('header a[data-path="home"]');
  if (brandLogo && !brandLogo.dataset.gsapBound) {
    brandLogo.dataset.gsapBound = 'true';
    brandLogo.addEventListener('mouseenter', () => {
      gsap.to(brandLogo.querySelector('img, div'), {
        rotate: 0,
        scale: 1.08,
        duration: 0.22,
        ease: 'back.out(2)'
      });
    });
    brandLogo.addEventListener('mouseleave', () => {
      gsap.to(brandLogo.querySelector('img, div'), {
        rotate: -2,
        scale: 1,
        duration: 0.2,
        ease: 'power2.out'
      });
    });
  }

  const xpBadge = document.getElementById('header-user-xp')?.closest('.rounded-full');
  if (xpBadge && !xpBadge.dataset.gsapBound) {
    xpBadge.dataset.gsapBound = 'true';
    xpBadge.addEventListener('mouseenter', () => {
      gsap.to(xpBadge, {
        scale: 1.05,
        y: -2,
        duration: 0.2,
        ease: 'back.out(2)'
      });
    });
    xpBadge.addEventListener('mouseleave', () => {
      gsap.to(xpBadge, {
        scale: 1,
        y: 0,
        duration: 0.2,
        ease: 'power2.out'
      });
    });
  }

  const avatar = document.querySelector('header a[href*="login"], header .admin-avatar, header #btn-navbar-logout');
  if (avatar && !avatar.dataset.gsapBound) {
    avatar.dataset.gsapBound = 'true';
    avatar.addEventListener('mouseenter', () => {
      gsap.to(avatar, {
        scale: 1.08,
        y: -2,
        duration: 0.2,
        ease: 'back.out(2)'
      });
    });
    avatar.addEventListener('mouseleave', () => {
      gsap.to(avatar, {
        scale: 1,
        y: 0,
        duration: 0.2,
        ease: 'power2.out'
      });
    });
  }

  // Header back buttons and workspace tabs
  const headerActionBtns = document.querySelectorAll('header a[href="/"], header a[href="/sinh-hoc"], header .rx-workspace');
  headerActionBtns.forEach((btn) => {
    if (btn.dataset.gsapBound) return;
    btn.dataset.gsapBound = 'true';
    btn.addEventListener('mouseenter', () => {
      gsap.to(btn, {
        y: -2,
        scale: 1.03,
        duration: 0.2,
        ease: 'power2.out'
      });
    });
    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, {
        y: 0,
        scale: 1,
        duration: 0.18,
        ease: 'power2.out'
      });
    });
  });
}

function insertReactionNavLink() {
  document.querySelectorAll('header nav').forEach((nav) => {
    if (nav.querySelector('[data-path="reaction-anim"]')) return;
    const after = nav.querySelector('[data-path="lessons-3d"]')
      || nav.querySelector('[data-path="home"]');
    const link = document.createElement('a');
    link.dataset.path = 'reaction-anim';
    link.href = '/phan-ung';
    link.textContent = 'Phân tử';
    const onPage = location.pathname.includes('phan-ung');
    link.className = 'bv-nav-link';
    if (onPage) link.setAttribute('aria-current', 'page');
    if (after) after.after(link);
    else nav.appendChild(link);
  });
}

function insertReactionBanner() {
  if (!document.getElementById('hero-user-name')) return;
  if (document.getElementById('home-reaction-banner')) return;
  const stack = document.querySelector('main .max-w-7xl');
  const after = document.getElementById('home-biology-banner');
  if (!stack) return;

  const banner = document.createElement('a');
  banner.id = 'home-reaction-banner';
  banner.href = '/phan-ung';
  banner.className = [
    'relative flex flex-col sm:flex-row sm:items-center justify-between gap-3',
    'bg-[#f3e8ff] border-[2.5px] border-[#2d2d2d] rounded-2xl p-4 md:p-5 sketch-shadow',
    'hover:-translate-y-0.5 transition-transform no-underline text-[#1b1c1c]'
  ].join(' ');
  banner.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="w-12 h-12 rounded-xl bg-[#9f7aea] border-2 border-[#2d2d2d] flex items-center justify-center shrink-0">
        <span class="material-symbols-outlined text-[28px] text-white">animation</span>
      </div>
      <div>
        <p class="font-['Epilogue'] text-lg md:text-xl font-bold leading-tight">Hoạt ảnh phản ứng phân tử</p>
        <p class="font-['Be_Vietnam_Pro'] text-sm text-[#5b403e]">Xem H₂ + Cl₂ chạy 3D, hoặc tự dựng keyframe rồi xuất file .chemx.</p>
      </div>
    </div>
    <span class="inline-flex items-center justify-center gap-1 px-4 py-2 bg-[#7c3aed] text-white border-2 border-[#2d2d2d] rounded-xl font-['Space_Grotesk'] text-sm font-bold sketch-shadow-sm">
      Xem hoạt ảnh
      <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
    </span>
  `;
  if (after?.nextSibling) stack.insertBefore(banner, after.nextSibling);
  else stack.insertBefore(banner, stack.firstChild);
}

function insertHomeBanner() {
  if (!document.getElementById('hero-user-name')) return;
  if (document.getElementById('home-biology-banner')) return;

  const stack = document.querySelector('main .max-w-7xl');
  if (!stack) return;

  const banner = document.createElement('a');
  banner.id = 'home-biology-banner';
  banner.href = CATALOG_HREF;
  banner.className = [
    'relative flex flex-col sm:flex-row sm:items-center justify-between gap-3',
    'bg-[#e8f5e9] border-[2.5px] border-[#2d2d2d] rounded-2xl p-4 md:p-5 sketch-shadow',
    'hover:-translate-y-0.5 transition-transform no-underline text-[#1b1c1c]'
  ].join(' ');
  banner.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="w-12 h-12 rounded-xl bg-[#48bb78] border-2 border-[#2d2d2d] flex items-center justify-center shrink-0">
        <span class="material-symbols-outlined text-[28px] text-[#1b1c1c]">biotech</span>
      </div>
      <div>
        <p class="font-['Epilogue'] text-lg md:text-xl font-bold leading-tight">Kho mô hình Sinh học 3D</p>
        <p class="font-['Be_Vietnam_Pro'] text-sm text-[#5b403e]">Xem toàn bộ mẫu vật, lọc theo lớp rồi mở mô hình 3D.</p>
      </div>
    </div>
    <span class="inline-flex items-center justify-center gap-1 px-4 py-2 bg-[#ff4d4d] text-white border-2 border-[#2d2d2d] rounded-xl font-['Space_Grotesk'] text-sm font-bold sketch-shadow-sm">
      Vào Sinh Học
      <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
    </span>
  `;

  stack.insertBefore(banner, stack.firstChild);
}
