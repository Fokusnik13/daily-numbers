// Daily number puzzle: core logic (works in browser and in Node for tests).
(function (root) {
  'use strict';

  // Deterministic RNG so every player gets the same puzzles for a given day.
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function apply(a, op, b) {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b > 0 ? a - b : null;
      case '×': return a * b;
      case '÷': return b !== 0 && a % b === 0 ? a / b : null;
    }
    return null;
  }

  // Difficulty per level: target range and number of operations used to build it.
  const LEVELS = [
    { lo: 30, hi: 99, ops: 2 },
    { lo: 60, hi: 160, ops: 3 },
    { lo: 100, hi: 260, ops: 3 },
    { lo: 150, hi: 360, ops: 4 },
    { lo: 250, hi: 499, ops: 5 },
  ];
  const SMALL = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const LARGE = [10, 11, 12, 13, 15, 20, 25];

  function generate(dateKey, level) {
    const rng = mulberry32(hashString(dateKey + '#' + level));
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];
    const cfg = LEVELS[level];
    for (let attempt = 0; attempt < 5000; attempt++) {
      const numbers = [pick(SMALL), pick(SMALL), pick(SMALL), pick(SMALL), pick(LARGE), pick(LARGE)];
      if (new Set(numbers).size < 5) continue;
      let pool = numbers.map((v) => v);
      const steps = [];
      let ok = true;
      for (let s = 0; s < cfg.ops; s++) {
        // After the first step always build on the previous result, so the
        // target really needs all `ops` operations.
        const prev = s === 0 ? Math.floor(rng() * pool.length) : pool.length - 1;
        let other = Math.floor(rng() * (pool.length - 1));
        if (other >= prev) other++;
        const [i, j] = rng() < 0.5 ? [prev, other] : [other, prev];
        const op = pick(['+', '-', '×', '×', '÷']);
        const r = apply(pool[i], op, pool[j]);
        if (r === null || r === pool[i] || r === pool[j] || r > 999) { ok = false; break; }
        steps.push([pool[i], op, pool[j], r]);
        pool = pool.filter((_, k) => k !== i && k !== j);
        pool.push(r);
      }
      if (!ok) continue;
      const target = steps[steps.length - 1][3];
      if (target < cfg.lo || target > cfg.hi || numbers.includes(target)) continue;
      return { level, numbers, target, solution: steps };
    }
    throw new Error('generator failed');
  }

  function dailyPuzzles(dateKey) {
    return LEVELS.map((_, i) => generate(dateKey, i));
  }

  // Stars: exact = 3, within 10 = 2, within 25 = 1.
  function starsFor(target, best) {
    const d = Math.abs(target - best);
    return d === 0 ? 3 : d <= 10 ? 2 : d <= 25 ? 1 : 0;
  }

  function dayNumber(dateKey) {
    const start = Date.UTC(2026, 9, 12);
    const [y, m, d] = dateKey.split('-').map(Number);
    return Math.round((Date.UTC(y, m - 1, d) - start) / 86400000) + 1;
  }

  const api = { generate, dailyPuzzles, apply, starsFor, dayNumber, LEVELS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Game = api;
})(this);
