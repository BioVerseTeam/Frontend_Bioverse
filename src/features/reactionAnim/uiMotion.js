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

/** Stagger lesson catalog cards (view rail / sample pick). */
export function revealLessons(container) {
  if (!container?.children?.length || prefersReducedMotion()) return;
  const items = [...container.children].slice(0, 14);
  gsap.fromTo(items, { y: 10, autoAlpha: 0, scale: 0.97 }, {
    y: 0,
    autoAlpha: 1,
    scale: 1,
    duration: 0.28,
    stagger: { each: 0.035, from: 'start' },
    ease: 'power2.out',
    overwrite: true,
    clearProps: 'transform',
  });
}

/** Subtle enter for rail tab panes (Mẫu / Tìm / Vở). */
export function swapRailPane(pane) {
  if (!pane) return;
  gsap.killTweensOf(pane);
  if (prefersReducedMotion()) {
    gsap.set(pane, { clearProps: 'autoAlpha,y' });
    return;
  }
  gsap.fromTo(pane, { autoAlpha: 0, y: 8 }, {
    autoAlpha: 1,
    y: 0,
    duration: 0.22,
    ease: 'power1.out',
    overwrite: true,
    clearProps: 'transform',
  });
}

/**
 * Open/close the personal notebook drawer in the view rail.
 * Keeps class samples as the primary scan path; notebook is secondary.
 */
export function setNotebookOpen(root, open, { animateList = true } = {}) {
  if (!root) return;
  const body = root.querySelector('.rx-notebook-body');
  const toggle = root.querySelector('.rx-notebook-toggle');
  const list = body?.querySelector('.rx-lessons');
  root.classList.toggle('is-open', open);
  toggle?.setAttribute('aria-expanded', String(open));
  if (!body) return;

  gsap.killTweensOf(body);

  if (!open) {
    if (prefersReducedMotion()) {
      body.hidden = true;
      gsap.set(body, { clearProps: 'height,autoAlpha,overflow' });
      return;
    }
    gsap.to(body, {
      height: 0,
      autoAlpha: 0,
      duration: 0.26,
      ease: 'power2.in',
      overwrite: true,
      onComplete: () => {
        body.hidden = true;
        gsap.set(body, { clearProps: 'height,autoAlpha,overflow' });
      },
    });
    return;
  }

  body.hidden = false;
  if (prefersReducedMotion()) {
    gsap.set(body, { clearProps: 'height,autoAlpha,overflow' });
    return;
  }

  gsap.set(body, { height: 'auto', autoAlpha: 1, overflow: 'hidden' });
  const target = body.offsetHeight;
  gsap.fromTo(body, { height: 0, autoAlpha: 0 }, {
    height: target,
    autoAlpha: 1,
    duration: 0.32,
    ease: 'power3.out',
    overwrite: true,
    onComplete: () => {
      gsap.set(body, { clearProps: 'height,overflow' });
    },
  });
  if (animateList && list?.children?.length) {
    revealLessons(list);
  }
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

export function slideCoach(el) {
  enterGuide(el);
}

let coachTweens = [];

function trackTween(tween) {
  if (tween) coachTweens.push(tween);
  return tween;
}

export function killCoachMotion() {
  coachTweens.forEach((tween) => tween?.kill?.());
  coachTweens = [];
}

export function enterGuide(el, { from = 'bottom' } = {}) {
  if (!el) return;
  const cards = el.querySelectorAll('.rx-pick');
  const pips = el.querySelectorAll('.rx-guide-pip');
  gsap.killTweensOf(el);
  if (cards.length) gsap.killTweensOf(cards);
  if (pips.length) gsap.killTweensOf(pips);
  gsap.set(el, { clearProps: 'transform' });
  if (cards.length) gsap.set(cards, { clearProps: 'transform' });
  if (prefersReducedMotion()) {
    gsap.set(el, { autoAlpha: 1, y: 0, scale: 1 });
    if (cards.length) gsap.set(cards, { autoAlpha: 1, y: 0 });
    return;
  }
  const yFrom = from === 'top' ? -18 : 16;
  const tl = gsap.timeline({ defaults: { overwrite: 'auto' } });
  tl.fromTo(el, {
    y: yFrom,
    autoAlpha: 0,
    scale: 0.97,
  }, {
    y: 0,
    autoAlpha: 1,
    scale: 1,
    duration: 0.36,
    ease: 'power3.out',
    clearProps: 'transform',
  });
  const mascot = el.querySelector('.rx-guide-mascot');
  if (mascot) {
    tl.fromTo(mascot, { y: 8, autoAlpha: 0, rotation: -8 }, {
      y: 0,
      autoAlpha: 1,
      rotation: 0,
      duration: 0.3,
      ease: 'back.out(1.4)',
    }, '<0.04');
  }
  if (pips.length) {
    tl.fromTo(pips, { scaleX: 0.4, autoAlpha: 0 }, {
      scaleX: 1,
      autoAlpha: 1,
      duration: 0.22,
      stagger: 0.04,
      ease: 'power2.out',
      clearProps: 'transform',
    }, '<0.08');
  }
  if (cards.length) {
    tl.fromTo(cards, {
      y: 10,
      autoAlpha: 0,
      scale: 0.96,
    }, {
      y: 0,
      autoAlpha: 1,
      scale: 1,
      duration: 0.32,
      stagger: 0.06,
      ease: 'back.out(1.4)',
      clearProps: 'transform',
    }, '-=0.12');
  }
  return trackTween(tl);
}

export function hopMascot(el) {
  if (!el || prefersReducedMotion()) return;
  trackTween(gsap.fromTo(el, { y: 0, rotation: 0 }, {
    y: -12,
    rotation: -9,
    duration: 0.16,
    yoyo: true,
    repeat: 1,
    ease: 'power2.out',
    overwrite: true,
  }));
}

export function stopPlayPulse(el) {
  if (!el) return;
  gsap.killTweensOf(el);
  gsap.set(el, { clearProps: 'transform' });
  el.classList?.remove('is-spotlight');
  el.closest?.('.rx-transport')?.classList.remove('is-lit');
}

export function pulseTarget(el) {
  if (!el) return null;
  gsap.killTweensOf(el);
  if (prefersReducedMotion()) return null;
  return trackTween(gsap.to(el, {
    scale: 1.08,
    duration: 0.55,
    yoyo: true,
    repeat: -1,
    ease: 'sine.inOut',
    overwrite: true,
    transformOrigin: '50% 50%',
  }));
}

export function clearCelebrate(root) {
  if (!root) return;
  const bits = root.querySelectorAll('.rx-bit');
  if (bits.length) gsap.killTweensOf(bits);
  root.replaceChildren();
}

export function enterFlow(root) {
  if (!root?.children?.length) return;
  if (prefersReducedMotion()) {
    gsap.set(root.children, { autoAlpha: 1, y: 0 });
    return;
  }
  gsap.fromTo(root.children, { autoAlpha: 0, y: 8 }, {
    autoAlpha: 1,
    y: 0,
    duration: 0.28,
    stagger: 0.04,
    ease: 'power1.out',
    overwrite: true,
  });
}

export function revealAccordion(body) {
  if (!body) return;
  if (prefersReducedMotion()) {
    gsap.set(body, { autoAlpha: 1, y: 0 });
    return;
  }
  gsap.fromTo(body, { autoAlpha: 0, y: 8 }, {
    autoAlpha: 1,
    y: 0,
    duration: 0.28,
    ease: 'power2.out',
    overwrite: true,
  });
}

export function revealSwatches(container) {
  if (!container?.children?.length || prefersReducedMotion()) return;
  gsap.fromTo(container.children, { autoAlpha: 0, scale: 0.86, y: 8 }, {
    autoAlpha: 1,
    scale: 1,
    y: 0,
    duration: 0.28,
    stagger: 0.03,
    ease: 'back.out(1.4)',
    overwrite: true,
    clearProps: 'transform',
  });
}

export function filterPeriodicCells(root, matches, { filtering = false } = {}) {
  if (!root) return;
  const cells = [...root.querySelectorAll('.rx-pcell')];
  const empty = root.parentElement?.querySelector('.rx-ptable-empty');
  const visible = new Set(matches.map((item) => item.symbol));
  const shown = [];
  cells.forEach((cell) => {
    const on = visible.has(cell.dataset.symbol);
    cell.hidden = !on;
    cell.disabled = !on;
    if (on) shown.push(cell);
  });
  root.classList.toggle('is-filtering', filtering);
  if (empty) empty.hidden = shown.length > 0;
  if (!shown.length || prefersReducedMotion()) return;
  gsap.fromTo(shown, { autoAlpha: 0.55, y: 8 }, {
    autoAlpha: 1,
    y: 0,
    duration: 0.22,
    stagger: 0.012,
    ease: 'power1.out',
    overwrite: true,
  });
}

export function showDropOverlay(root) {
  if (!root) return;
  const card = root.querySelector('.rx-drop-card');
  root.hidden = false;
  root.setAttribute('aria-hidden', 'false');
  if (prefersReducedMotion()) {
    gsap.set(root, { autoAlpha: 1 });
    if (card) gsap.set(card, { autoAlpha: 1, y: 0, scale: 1 });
    return;
  }
  gsap.fromTo(root, { autoAlpha: 0 }, {
    autoAlpha: 1,
    duration: 0.18,
    ease: 'power1.out',
    overwrite: true,
  });
  if (card) {
    gsap.fromTo(card, { y: 12, scale: 0.96, autoAlpha: 0 }, {
      y: 0,
      scale: 1,
      autoAlpha: 1,
      duration: 0.28,
      ease: 'power2.out',
      overwrite: true,
    });
  }
}

export function hideDropOverlay(root) {
  if (!root) return;
  const done = () => {
    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
  };
  if (prefersReducedMotion()) {
    gsap.set(root, { autoAlpha: 0 });
    done();
    return;
  }
  gsap.to(root, {
    autoAlpha: 0,
    duration: 0.16,
    ease: 'power1.in',
    overwrite: true,
    onComplete: done,
  });
}

export function openSheet(root) {
  if (!root) return;
  const sheet = root.querySelector('.rx-table-sheet');
  const cells = root.querySelectorAll('.rx-pcell');
  root.hidden = false;
  if (prefersReducedMotion()) {
    gsap.set(root, { autoAlpha: 1 });
    if (sheet) gsap.set(sheet, { autoAlpha: 1, y: 0, scale: 1 });
    return;
  }
  gsap.set(root, { autoAlpha: 1 });
  if (sheet) {
    gsap.fromTo(sheet, { y: 18, scale: 0.96, autoAlpha: 0 }, {
      y: 0,
      scale: 1,
      autoAlpha: 1,
      duration: 0.32,
      ease: 'power3.out',
      overwrite: true,
      clearProps: 'transform',
    });
  }
  if (cells.length) {
    gsap.fromTo(cells, { autoAlpha: 0, scale: 0.88 }, {
      autoAlpha: 1,
      scale: 1,
      duration: 0.26,
      stagger: { each: 0.012, from: 'start', grid: 'auto' },
      ease: 'power2.out',
      overwrite: true,
      clearProps: 'transform',
    });
  }
}

export function closeSheet(root, onDone) {
  if (!root) {
    onDone?.();
    return;
  }
  if (prefersReducedMotion()) {
    root.hidden = true;
    onDone?.();
    return;
  }
  const sheet = root.querySelector('.rx-table-sheet');
  const tl = gsap.timeline({
    onComplete: () => {
      root.hidden = true;
      gsap.set(root, { clearProps: 'opacity,visibility' });
      onDone?.();
    },
  });
  if (sheet) {
    tl.to(sheet, { y: 12, autoAlpha: 0, duration: 0.18, ease: 'power2.in' }, 0);
  }
  tl.to(root, { autoAlpha: 0, duration: 0.16, ease: 'power1.in' }, 0);
}

export function enterHowTo(el) {
  if (!el) return;
  if (prefersReducedMotion()) {
    gsap.set(el, { autoAlpha: 1, y: 0 });
    return;
  }
  gsap.fromTo(el, { y: -14, autoAlpha: 0 }, {
    y: 0,
    autoAlpha: 1,
    duration: 0.32,
    ease: 'power3.out',
    overwrite: true,
    clearProps: 'transform',
  });
}

export function celebrate(root) {
  if (!root) return;
  clearCelebrate(root);
  if (prefersReducedMotion()) return;
  const colors = ['#7c3aed', '#48bb78', '#ed8936', '#2e5ea2'];
  for (let i = 0; i < 6; i += 1) {
    const bit = document.createElement('span');
    bit.className = 'rx-bit';
    bit.style.background = colors[i % colors.length];
    root.appendChild(bit);
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
    trackTween(gsap.fromTo(bit, {
      x: 0,
      y: 0,
      scale: 0.3,
      autoAlpha: 1,
    }, {
      x: Math.cos(angle) * 28,
      y: Math.sin(angle) * 18,
      scale: 1,
      duration: 0.38,
      ease: 'power2.out',
      onComplete: () => {
        gsap.to(bit, {
          autoAlpha: 0,
          y: '+=6',
          duration: 0.16,
          onComplete: () => bit.remove(),
        });
      },
    }));
  }
}
