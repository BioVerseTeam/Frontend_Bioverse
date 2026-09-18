/**
 * URL utility helpers for BioVerse
 */

export function getQueryParam(key, defaultValue = null) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key) || defaultValue;
}

export function setQueryParam(key, value) {
  const url = new URL(window.location.href);
  if (value === null || value === undefined) {
    url.searchParams.delete(key);
  } else {
    url.searchParams.set(key, value);
  }
  window.history.replaceState({}, '', url.toString());
}
