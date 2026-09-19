/**
 * Shared GSAP motion for admin editors.
 * Focal moment: create ↔ edit page-turn. Routine feedback stays under 250ms.
 */

import gsap from 'gsap';

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function animateEditorSwap(root, { creating = false } = {}) {
  if (!root || prefersReducedMotion()) return;
  const strip = root.querySelector('.admin-mode-strip');
  const sheets = root.querySelectorAll('.admin-sheet');
  const tl = gsap.timeline({
    defaults: { ease: 'power3.out', overwrite: 'auto' }
  });

  tl.fromTo(root, {
    clipPath: creating ? 'inset(8% 0 0 0)' : 'inset(0 0 8% 0)',
    y: creating ? -10 : 10
  }, {
    clipPath: 'inset(0% 0% 0% 0%)',
    y: 0,
    duration: 0.32,
    clearProps: 'clipPath'
  }, 0);

  if (strip) {
    tl.fromTo(strip, { x: creating ? -12 : 12, autoAlpha: 0.5 }, {
      x: 0,
      autoAlpha: 1,
      duration: 0.24
    }, 0);
  }

  if (sheets.length) {
    tl.fromTo(sheets, { y: 16, autoAlpha: 0 }, {
      y: 0,
      autoAlpha: 1,
      duration: 0.28,
      stagger: 0.045
    }, 0.05);
  }
}

export function stampSelect(el) {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(el, { scale: 0.97 }, {
    scale: 1,
    duration: 0.18,
    ease: 'power2.out',
    overwrite: true
  });
}

export function popIn(el) {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(el, { scale: 0.88, autoAlpha: 0 }, {
    scale: 1,
    autoAlpha: 1,
    duration: 0.22,
    ease: 'power2.out',
    overwrite: true
  });
}

export function flashSaved(el) {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(el, { boxShadow: '4px 4px 0 #00864c' }, {
    boxShadow: '4px 4px 0 #2d2d2d',
    duration: 0.5,
    ease: 'power2.out',
    overwrite: true
  });
}

export function revealList(list) {
  if (!list?.children?.length || prefersReducedMotion()) return;
  const items = [...list.children].slice(0, 12);
  gsap.fromTo(items, { autoAlpha: 0, y: 8 }, {
    autoAlpha: 1,
    y: 0,
    duration: 0.22,
    stagger: { each: 0.03, from: 'start' },
    ease: 'power2.out',
    overwrite: true
  });
}

export function slideRank(el, delta) {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(el, { y: delta * 8 }, {
    y: 0,
    duration: 0.2,
    ease: 'power2.out',
    overwrite: true
  });
}
