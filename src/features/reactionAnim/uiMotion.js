/**
 * Shared GSAP motion for the reaction studio.
 * Focal moment: flipping the notebook between watching and authoring.
 */

import gsap from 'gsap';

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function turnWorkspace(stage, { toEdit = false } = {}) {
  if (!stage) return;
  if (prefersReducedMotion()) {
    gsap.set(stage, { clearProps: 'clipPath,y,rotationY' });
    return;
  }
  const tl = gsap.timeline({ defaults: { ease: 'power3.out', overwrite: 'auto' } });
  tl.fromTo(stage, {
    clipPath: toEdit ? 'inset(0 0 0 12%)' : 'inset(0 12% 0 0)',
    y: toEdit ? 8 : -8,
  }, {
    clipPath: 'inset(0% 0% 0% 0%)',
    y: 0,
    duration: 0.36,
    clearProps: 'clipPath',
  });
}

export function stampControl(el) {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(el, { scale: 0.96 }, {
    scale: 1,
    duration: 0.16,
    ease: 'power2.out',
    overwrite: true,
  });
}

export function popIn(el) {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(el, { scale: 0.9, autoAlpha: 0, y: 8 }, {
    scale: 1,
    autoAlpha: 1,
    y: 0,
    duration: 0.22,
    ease: 'power2.out',
    overwrite: true,
  });
}

export function flashSaved(el) {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(el, { boxShadow: '4px 4px 0 #00864c' }, {
    boxShadow: '4px 4px 0 #2d2d2d',
    duration: 0.45,
    ease: 'power2.out',
    overwrite: true,
  });
}

export function revealChips(container) {
  if (!container?.children?.length || prefersReducedMotion()) return;
  gsap.fromTo(container.children, { y: 8, autoAlpha: 0 }, {
    y: 0,
    autoAlpha: 1,
    duration: 0.2,
    stagger: 0.035,
    ease: 'power2.out',
    overwrite: true,
  });
}

export function pulseHint(el) {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(el, { y: 6, autoAlpha: 0 }, {
    y: 0,
    autoAlpha: 1,
    duration: 0.24,
    ease: 'power2.out',
    overwrite: true,
  });
}
