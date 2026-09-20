/**
 * Match a typed/pasted chemical equation to a catalog or sample reaction.
 * Catalog lookup only — does not generate molecules or geometry.
 */

const SUBSCRIPT_MAP = {
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
  '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
};

const SUPERSCRIPT_MAP = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
};

const ARROW_RE = /(?:&gt;|&rarr;|&rightarrow;|⟶|⇒|⇢|➜|➔|→|↦|->|=>|＝|=+)/gi;

/**
 * Strip spaces, map unicode subscripts, unify arrow variants → `>`.
 * @param {string} raw
 * @returns {string}
 */
export function normalizeEquation(raw) {
  return String(raw || '')
    .normalize('NFKC')
    .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (ch) => SUBSCRIPT_MAP[ch] || ch)
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (ch) => SUPERSCRIPT_MAP[ch] || ch)
    .replace(ARROW_RE, '>')
    .replace(/[·⋅×]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

/**
 * Canonical key: sides split on `>`, terms on `+`, sorted (order-flexible).
 * @param {string} raw
 * @returns {string}
 */
export function equationKey(raw) {
  const normalized = normalizeEquation(raw);
  if (!normalized) return '';

  const sides = normalized.split('>').filter((part) => part.length);
  if (sides.length < 2) {
    return normalized.toLowerCase();
  }

  const left = sides[0].split('+').filter(Boolean).sort().join('+');
  const right = sides.slice(1).join('>').split('+').filter(Boolean).sort().join('+');
  return `${left}>${right}`.toLowerCase();
}

/**
 * Collect strings that might encode the equation for a lesson/catalog item.
 * @param {{ title?: string, name?: string, subtitle?: string }} item
 * @returns {string[]}
 */
export function candidateStrings(item) {
  if (!item) return [];
  return [item.title, item.name, item.subtitle]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
}

/**
 * @param {string} query
 * @param {Array<{ id: string, title?: string, name?: string, subtitle?: string }>} pool
 * @returns {{ item: object, via: string } | null}
 */
export function matchEquation(query, pool) {
  const key = equationKey(query);
  if (!key || !Array.isArray(pool) || !pool.length) return null;

  for (const item of pool) {
    for (const label of candidateStrings(item)) {
      if (equationKey(label) === key) {
        return { item, via: label };
      }
    }
  }

  // Loose: normalized query equals a full normalized label (no arrow / partial paste)
  const loose = normalizeEquation(query).toLowerCase();
  if (loose.length >= 4) {
    for (const item of pool) {
      for (const label of candidateStrings(item)) {
        if (normalizeEquation(label).toLowerCase() === loose) {
          return { item, via: label };
        }
      }
    }
  }

  return null;
}

/**
 * Short display labels for example chips (prefer title with subscripts).
 * @param {Array<{ title?: string, name?: string }>} lessons
 * @param {number} [limit=6]
 * @returns {string[]}
 */
export function exampleEquations(lessons, limit = 6) {
  const seen = new Set();
  const out = [];
  for (const lesson of lessons || []) {
    const label = lesson.title || lesson.name;
    if (!label) continue;
    const key = equationKey(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
    if (out.length >= limit) break;
  }
  return out;
}
