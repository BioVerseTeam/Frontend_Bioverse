/**
 * DOM utility helpers for BioVerse
 */

export const $ = (selector, context = document) => context.querySelector(selector);
export const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));

export function show(element) {
  if (!element) return;
  element.classList.remove('hidden');
}

export function hide(element) {
  if (!element) return;
  element.classList.add('hidden');
}

export function on(element, event, handler, options) {
  if (!element) return;
  element.addEventListener(event, handler, options);
  return () => element.removeEventListener(event, handler, options);
}
