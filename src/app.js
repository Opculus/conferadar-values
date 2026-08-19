// Conferadar Values — quiz engine, scoring, and results rendering.
'use strict';

// matchPercent points within which a compound/tiebreak label fires. Calibrated
// (2026-08-19, label_threshold_test.py) against two failure modes: a textbook
// single-ideology respondent getting a spurious second label (false positive),
// and a genuine 50/50 blend respondent NOT getting compounded (missed). 15 gave
// a 64.2% false-positive rate at zero noise; 9 is the smallest value that still
// catches every 50/50 blend of each bucket's closest anchor pair (100% recall)
// while cutting the false-positive rate to 12.6%.
const LABEL_THRESHOLD = 9;
// Opt-in, anonymized result submission for construct-validity testing (does
// respondents agree with their result?). Empty string disables the feature —
// no submit UI renders until a real endpoint is deployed. See
// SETUP-DATA-COLLECTION.md to deploy one and fill this in.
const SUBMIT_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzahPrIlJ7yyB7y5n8-sTqbxUaHOhHsikaqlokw6eD46psP0BOwNqWV1eURHvhS0PJtdA/exec';
const MODULE2_FILES = {
  1: 'module2-b01-ml-questions.json',
  2: 'module2-b02-leftcom-questions.json',
  3: 'module2-b03-anarchism-questions.json',
  4: 'module2-b04-socdem-questions.json',
  5: 'module2-b05-progressive-questions.json',
  6: 'module2-b06-classlib-questions.json',
  7: 'module2-b07-conservatism-questions.json',
  8: 'module2-b08-fascism-questions.json',
  9: 'module2-b09-monarchism-questions.json',
  10: 'module2-b10-theocracy-questions.json',
  11: 'module2-b11-ancap-questions.json',
  12: 'module2-b12-thirdworldism-questions.json',
  13: 'module2-b13-eurasianism-questions.json',
};

const ANSWER_SCALE = [
  { mult: 1.0, label: 'Strongly Agree' },
  { mult: 0.5, label: 'Agree' },
  { mult: 0.0, label: 'Neutral' },
  { mult: -0.5, label: 'Disagree' },
  { mult: -1.0, label: 'Strongly Disagree' },
];

// ---------------------------------------------------------------- data load
async function loadData() {
  if (window.__BUNDLED_DATA__) return window.__BUNDLED_DATA__;
  const module1 = await (await fetch('module1-questions.json')).json();
  const buckets = {};
  await Promise.all(Object.entries(MODULE2_FILES).map(async ([id, fn]) => {
    buckets[id] = await (await fetch(fn)).json();
  }));
  return { module1, module2: { buckets } };
}

// -------------------------------------------------------------- PRNG/shuffle
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(arr, seed) {
  const rng = mulberry32(seed);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// sessionStorage throws SecurityError outright in a partitioned/sandboxed frame
// (a Discord activity is one), so every access is guarded. Losing it only costs
// shuffle stability across a mid-quiz refresh; it must never block the app.
const memSeeds = {};
function getSeed(key) {
  try {
    const stored = sessionStorage.getItem(key);
    if (stored) return parseInt(stored, 10);
  } catch (e) { /* storage blocked — fall through to in-memory */ }
  if (memSeeds[key] != null) return memSeeds[key];
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  memSeeds[key] = seed;
  try { sessionStorage.setItem(key, String(seed)); } catch (e) { /* ditto */ }
  return seed;
}
function clearSeeds() {
  for (const k in memSeeds) delete memSeeds[k];
  try { sessionStorage.clear(); } catch (e) { /* storage blocked */ }
}

// ---------------------------------------------------------- save/resume
// localStorage (not sessionStorage) so progress survives closing the tab —
// but that means the shuffle seed must be saved explicitly alongside it: a
// fresh getSeed() call after a browser restart would draw a NEW seed and
// reshuffle the question order, making the saved answers/idx point at the
// wrong items. Same SecurityError guard as sessionStorage above applies.
const PROGRESS_KEY = 'cfv_progress_v1';
const PROGRESS_VERSION = 1;

function saveProgress() {
  const p = {
    v: PROGRESS_VERSION,
    screen: state.screen,
    form: state.form,
    seed1: state.seed1,
    answers1: state.answers1,
    idx1: state.screen === 'quiz1' ? state.idx : null,
    m1scores: state.m1scores,
    culturalScore: state.culturalScore,
    bucketId: state.bucketId,
    seed2: state.seed2,
    answers2: state.answers2,
    idx2: state.screen === 'quiz2' ? state.idx : null,
  };
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch (e) { /* storage blocked */ }
}
function clearProgress() {
  try { localStorage.removeItem(PROGRESS_KEY); } catch (e) { /* storage blocked */ }
}
function loadRawProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

// Re-derives order1/order2 from the saved seeds and checks every saved
// answer id still exists in the current question set, so stale progress from
// a previous build (questions added/removed/reworded) is dropped rather than
// resumed into a broken state.
function validateProgress(p, data) {
  if (!p || p.v !== PROGRESS_VERSION) return null;
  if (p.form !== 'full' && p.form !== 'short') return null;
  if (!['quiz1', 'transition', 'quiz2'].includes(p.screen)) return null;

  const m1q = questionsForForm(data.module1.questions, p.form);
  const order1 = seededShuffle(m1q, p.seed1);
  const ids1 = new Set(order1.map(q => q.id));
  if (!Object.keys(p.answers1 || {}).every(id => ids1.has(id))) return null;

  if (p.screen === 'quiz1') {
    if (!Number.isInteger(p.idx1) || p.idx1 < 0 || p.idx1 >= order1.length) return null;
    return { ...p, order1 };
  }

  const bucketData = data.module2.buckets[p.bucketId];
  if (!bucketData || !p.m1scores) return null;
  if (p.screen === 'transition') return { ...p, order1 };

  const m2q = questionsForForm(bucketData.questions, p.form);
  const order2 = seededShuffle(m2q, p.seed2);
  const ids2 = new Set(order2.map(q => q.id));
  if (!Object.keys(p.answers2 || {}).every(id => ids2.has(id))) return null;
  if (!Number.isInteger(p.idx2) || p.idx2 < 0 || p.idx2 >= order2.length) return null;
  return { ...p, order1, order2 };
}

function resumeProgress() {
  const p = state.resumable;
  if (!p) return;
  state.form = p.form;
  state.seed1 = p.seed1;
  state.order1 = p.order1;
  state.answers1 = p.answers1 || {};

  if (p.screen === 'quiz1') {
    state.idx = p.idx1;
    state.screen = 'quiz1';
    render();
    return;
  }

  state.m1scores = p.m1scores;
  state.culturalScore = p.culturalScore;
  state.routing = routeModule1(p.m1scores, state.data.module1.buckets);
  state.bucketId = p.bucketId;

  if (p.screen === 'transition') {
    state.screen = 'transition';
    render();
    return;
  }

  state.seed2 = p.seed2;
  state.order2 = p.order2;
  state.answers2 = p.answers2 || {};
  state.idx = p.idx2;
  state.screen = 'quiz2';
  render();
}

// ------------------------------------------------------------------ scoring
function scoreAxes(questions, answers) {
  const acc = {};
  for (const q of questions) {
    const ax = q.axis;
    const eff = q.effect[ax];
    if (!acc[ax]) acc[ax] = { raw: 0, max: 0 };
    const mult = answers[q.id] ?? 0;
    acc[ax].raw += mult * eff;
    acc[ax].max += Math.abs(eff);
  }
  const out = {};
  for (const ax in acc) out[ax] = 100 * (acc[ax].max + acc[ax].raw) / (2 * acc[ax].max);
  return out;
}

function dist(a, b, keys) {
  let s = 0;
  for (const k of keys) { const d = a[k] - b[k]; s += d * d; }
  return Math.sqrt(s);
}

function routeModule1(scores, buckets) {
  const keys = ['econ', 'auth', 'soli', 'chng', 'legi', 'impe'];
  const maxD = Math.sqrt(keys.length * 100 ** 2);
  const ranked = buckets
    .map(b => ({ id: b.id, name: b.name, d: dist(scores, b.anchor, keys) }))
    .sort((a, b) => a.d - b.d)
    .map(r => ({ ...r, matchPercent: 100 * (1 - r.d / maxD) }));
  return ranked;
}

function resolveModule2Label(scores, subIdeologies, axisKeys) {
  const maxD = Math.sqrt(axisKeys.length * 100 ** 2);
  const ranked = subIdeologies
    .map(s => ({ ...s, d: dist(scores, s.anchor, axisKeys) }))
    .sort((a, b) => a.d - b.d)
    .map(r => ({ ...r, matchPercent: 100 * (1 - r.d / maxD) }));

  let primary = ranked[0];
  if (primary.umbrella) {
    const nonUmbrella = ranked.find(s => !s.umbrella);
    if (nonUmbrella && (primary.matchPercent - nonUmbrella.matchPercent) <= LABEL_THRESHOLD) {
      primary = nonUmbrella;
    }
  }
  const secondary = ranked.find(s => s.name !== primary.name);
  let label = primary.name;
  let compound = false;
  if (secondary && (primary.matchPercent - secondary.matchPercent) <= LABEL_THRESHOLD) {
    label = `${primary.name}, ${secondary.name} Lean`;
    compound = true;
  }
  return { ranked, primary, secondary, label, compound };
}

// ------------------------------------------------------------ URL encoding
// A result is fully reconstructible from three things: which bucket ran, the 7
// Module 1 axis scores, and the bucket's 8 Module 2 axis scores. Routing and the
// tendency label are recomputed from those on load, so the link carries no
// answers and stays short. Fixed-width base36 fields keep parsing trivial.
// The payload is positional: fields are written in bucketData.axes order with no
// checksum. BUMP THIS whenever any bucket's axes are added, removed, renamed or
// reordered — otherwise old links decode to wrong scores on the wrong axes and
// render a plausible-looking but incorrect result with no error.
const RESULT_VERSION = '1';
const M1_ORDER = ['econ', 'auth', 'soli', 'chng', 'legi', 'impe', 'cult'];

function enc3(v) {
  const n = Math.max(0, Math.min(1000, Math.round(v * 10)));
  return n.toString(36).padStart(3, '0');
}
function dec3(s) {
  const n = parseInt(s, 36);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n / 10)) : NaN;
}

function encodeResult() {
  const axes = state.data.module2.buckets[state.bucketId].axes;
  return RESULT_VERSION
    + state.bucketId.toString(36).padStart(2, '0')
    + (state.form === 'short' ? 's' : 'f')
    + M1_ORDER.map(k => enc3(state.m1scores[k] ?? 50)).join('')
    + axes.map(a => enc3(state.m2.scores[a.key] ?? 50)).join('');
}

// Returns true if the payload was valid and state was populated.
function decodeResult(payload) {
  if (!payload || payload[0] !== RESULT_VERSION) return false;
  const bucketId = parseInt(payload.slice(1, 3), 36);
  const bucketData = state.data.module2.buckets[bucketId];
  if (!bucketData) return false;
  const form = payload[3] === 's' ? 'short' : 'full';
  const body = payload.slice(4);
  const expected = (M1_ORDER.length + bucketData.axes.length) * 3;
  if (body.length !== expected) return false;

  const m1scores = {};
  M1_ORDER.forEach((k, i) => { m1scores[k] = dec3(body.substr(i * 3, 3)); });
  const m2scores = {};
  const offset = M1_ORDER.length * 3;
  bucketData.axes.forEach((a, i) => { m2scores[a.key] = dec3(body.substr(offset + i * 3, 3)); });
  const all = [...Object.values(m1scores), ...Object.values(m2scores)];
  if (all.some(v => !Number.isFinite(v))) return false;

  const axisKeys = bucketData.axes.map(a => a.key);
  state.form = form;
  state.bucketId = bucketId;
  state.m1scores = m1scores;
  state.culturalScore = m1scores.cult;
  state.routing = routeModule1(m1scores, state.data.module1.buckets);
  state.m2 = {
    scores: m2scores,
    axes: bucketData.axes,
    ...resolveModule2Label(m2scores, bucketData.subIdeologies, axisKeys),
  };
  state.fromLink = true;
  return true;
}

let suppressHashChange = false;
function writeResultHash() {
  suppressHashChange = true;
  // never let a restricted-navigation frame stop the results from rendering
  try { location.hash = 'r=' + encodeResult(); } catch (e) { /* no shareable URL */ }
  setTimeout(() => { suppressHashChange = false; }, 0);
}
function clearResultHash() {
  suppressHashChange = true;
  if (location.hash) {
    // replaceState is restricted in sandboxed frames; blanking the hash is a
    // lesser fallback (leaves a history entry) but must not abort the retake.
    try {
      history.replaceState(null, '', location.pathname + location.search);
    } catch (e) {
      location.hash = '';
    }
  }
  setTimeout(() => { suppressHashChange = false; }, 0);
}
function hashPayload() {
  const m = /^#r=([0-9a-z]+)$/i.exec(location.hash || '');
  return m ? m[1] : null;
}

// -------------------------------------------------------------------- state
const state = {
  screen: 'intro',
  form: 'full', // 'full' | 'short'
  data: null,
  order1: [],
  order2: [],
  idx: 0,
  answers1: {},
  answers2: {},
  seed1: null,
  seed2: null,
  resumable: null, // validated save/resume snapshot offered on the intro screen
  bucketId: null,
  routing: null,
  m1scores: null,
  culturalScore: 50,
  m2: null,
  fromLink: false,
  accuracyRating: '',
  selfId: '',
  submitStatus: 'idle', // 'idle' | 'sending' | 'sent' | 'error'
};

const root = document.getElementById('app');

function questionsForForm(all, form) {
  return form === 'short' ? all.filter(q => q.core) : all;
}

// ------------------------------------------------------------------ render
function render() {
  if (state.screen === 'quiz1' || state.screen === 'transition' || state.screen === 'quiz2') {
    saveProgress();
  } else if (state.screen === 'results' && !state.fromLink) {
    // a freshly-finished run — nothing left to resume
    clearProgress();
  }
  root.innerHTML = '';
  if (state.screen === 'intro') return renderIntro();
  if (state.screen === 'quiz1') return renderQuiz(1);
  if (state.screen === 'transition') return renderTransition();
  if (state.screen === 'quiz2') return renderQuiz(2);
  if (state.screen === 'results') return renderResults();
}

function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    // null/false must mean "omit": setAttribute('disabled', null) stringifies to
    // "null", which is a *present* boolean attribute and silently disables it.
    else if (v != null && v !== false) e.setAttribute(k, v);
  }
  for (const c of [].concat(children)) if (c) e.appendChild(c);
  return e;
}
const text = (tag, cls, str) => el(tag, { class: cls }, [document.createTextNode(str)]);

function siteFooter() {
  return el('div', { class: 'site-footer' }, [
    document.createTextNode('Discussion & feedback — '),
    el('a', {
      href: 'https://discord.gg/Ct5aNegdun',
      target: '_blank',
      rel: 'noopener noreferrer',
    }, document.createTextNode('join the Discord ↗')),
  ]);
}

function buildSubmissionPayload() {
  const family = state.routing.find(r => r.id === state.bucketId) || state.routing[0];
  return {
    form: state.form,
    m1: {
      bucket: family.name,
      axes: state.m1scores,
      matchPercent: family.matchPercent,
    },
    m2: {
      bucketId: state.bucketId,
      label: state.m2.label,
      primary: state.m2.primary.name,
      secondary: state.m2.secondary ? state.m2.secondary.name : '',
      matchPercent: state.m2.primary.matchPercent,
    },
    culturalScore: state.culturalScore,
    accuracyRating: state.accuracyRating,
    // free text is the whole point (self-reported ideology to compare against
    // the routed label) but still capped — this is a public unauthenticated
    // endpoint and the field must not become a place to paste arbitrary text.
    selfId: state.selfId.slice(0, 300),
  };
}

// Shown only on a respondent's own freshly-taken result (never on a shared
// link someone else is viewing) and only once an endpoint is deployed.
function renderValidation() {
  const box = el('div', { class: 'validate-box' });
  box.appendChild(text('div', 'section-title', 'HELP CALIBRATE THIS TEST'));

  if (state.submitStatus === 'sent') {
    box.appendChild(text('p', 'note', 'Thanks — your anonymized result was submitted.'));
    return box;
  }

  box.appendChild(text('p', 'note',
    'Optional and anonymous. Submitting sends only the scores and label shown ' +
    'above, plus whatever you answer below — no individual question answers, ' +
    'no identifying info.'));

  const ratingRow = el('div', { class: 'rating-row' });
  for (const r of ['Spot on', 'Close', 'Off', 'Way off']) {
    ratingRow.appendChild(el('button', {
      class: 'rating-btn' + (state.accuracyRating === r ? ' active' : ''),
      onclick: () => { state.accuracyRating = r; render(); },
    }, text('span', '', r)));
  }
  box.appendChild(ratingRow);

  const selfIdInput = el('input', {
    class: 'share-fallback',
    placeholder: 'If different, what do you actually identify as? (optional)',
    value: state.selfId,
  });
  // deliberately no render() here — a full re-render on every keystroke would
  // blow away focus and cursor position in this input
  selfIdInput.addEventListener('input', e => { state.selfId = e.target.value; });
  box.appendChild(selfIdInput);

  const submitBtn = el('button', {
    class: 'begin-btn compact',
    disabled: state.submitStatus === 'sending' ? 'disabled' : null,
  }, text('span', '', state.submitStatus === 'error' ? 'RETRY SUBMIT' : '📤 SUBMIT ANONYMIZED RESULT'));
  submitBtn.addEventListener('click', async () => {
    state.submitStatus = 'sending';
    render();
    try {
      // no-cors: Apps Script web apps don't send CORS headers a browser will
      // accept, so the response is opaque and unreadable either way — the
      // POST still reaches the server and appends the row. text/plain avoids
      // a preflight OPTIONS request, which Apps Script doesn't implement.
      await fetch(SUBMIT_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(buildSubmissionPayload()),
      });
      state.submitStatus = 'sent';
    } catch (e) {
      state.submitStatus = 'error';
    }
    render();
  });
  box.appendChild(submitBtn);
  if (state.submitStatus === 'error') {
    box.appendChild(text('p', 'note', 'Submission failed — check your connection and try again.'));
  }

  return box;
}

function renderIntro() {
  const wrap = el('div', { class: 'sheet intro' });
  wrap.appendChild(el('div', { class: 'stamp-corner' }, text('span', '', 'CLASSIFIED')));
  wrap.appendChild(text('h1', 'title', 'CONFERADAR VALUES'));
  wrap.appendChild(text('p', 'subtitle', 'Political Disposition Assessment — Two-Stage Protocol'));
  wrap.appendChild(el('hr', { class: 'rule' }));
  wrap.appendChild(text('p', 'body',
    'Stage One routes you into one of thirteen ideological family clusters across six structural axes. ' +
    'Stage Two administers a battery specific to that cluster, scoring eight further axes unique to it. ' +
    'A cultural orientation reading is taken independently and never affects routing.'));

  if (state.resumable) {
    const p = state.resumable;
    const info = p.screen === 'quiz1'
      ? `Module 1 — item ${p.idx1 + 1} of ${p.order1.length}`
      : p.screen === 'transition'
        ? 'Module 1 complete — ready to start Module 2'
        : `Module 2 — item ${p.idx2 + 1} of ${p.order2.length}`;
    wrap.appendChild(el('div', { class: 'validate-box' }, [
      text('div', 'section-title', 'IN-PROGRESS ASSESSMENT FOUND'),
      text('p', 'note', info),
      el('div', { class: 'action-row' }, [
        el('button', {
          class: 'begin-btn compact',
          onclick: () => resumeProgress(),
        }, text('span', '', '↻ RESUME')),
        el('button', {
          class: 'nav-btn',
          onclick: () => { clearProgress(); state.resumable = null; render(); },
        }, text('span', '', 'DISCARD & START OVER')),
      ]),
    ]));
  }

  const formPicker = el('div', { class: 'form-picker' });
  const full = el('button', {
    class: 'choice-btn' + (state.form === 'full' ? ' active' : ''),
    onclick: () => { state.form = 'full'; render(); },
  }, [text('strong', '', 'Full Dossier'), text('span', 'meta', '94 + 96 questions · ~35–45 min')]);
  const short = el('button', {
    class: 'choice-btn' + (state.form === 'short' ? ' active' : ''),
    onclick: () => { state.form = 'short'; render(); },
  }, [text('strong', '', 'Field Brief'), text('span', 'meta', '50 + 48 questions · ~18–22 min')]);
  formPicker.append(full, short);
  wrap.appendChild(formPicker);

  wrap.appendChild(el('button', {
    class: 'begin-btn',
    onclick: () => beginModule1(),
  }, text('span', '', 'BEGIN INTAKE →')));

  wrap.appendChild(siteFooter());

  root.appendChild(wrap);
}

function beginModule1() {
  clearProgress();
  state.resumable = null;
  const q = questionsForForm(state.data.module1.questions, state.form);
  const seed = getSeed('cfv_seed1_' + state.form);
  state.seed1 = seed;
  state.order1 = seededShuffle(q, seed);
  state.idx = 0;
  state.answers1 = {};
  state.screen = 'quiz1';
  render();
}

function renderQuiz(moduleNum) {
  const order = moduleNum === 1 ? state.order1 : state.order2;
  const answers = moduleNum === 1 ? state.answers1 : state.answers2;
  const q = order[state.idx];
  const pct = Math.round((state.idx / order.length) * 100);

  const wrap = el('div', { class: 'sheet quiz' });
  wrap.appendChild(el('div', { class: 'progress-track' }, [
    el('div', { class: 'progress-fill', style: `width:${pct}%` }),
  ]));
  wrap.appendChild(text('div', 'progress-label',
    `MODULE ${moduleNum} — ITEM ${state.idx + 1} OF ${order.length}`));

  wrap.appendChild(text('p', 'question-text', q.text));

  const opts = el('div', { class: 'options' });
  for (const opt of ANSWER_SCALE) {
    const selected = answers[q.id] === opt.mult;
    opts.appendChild(el('button', {
      class: 'opt-btn' + (selected ? ' selected' : ''),
      onclick: () => {
        answers[q.id] = opt.mult;
        advance(moduleNum);
      },
    }, text('span', '', opt.label)));
  }
  wrap.appendChild(opts);

  const nav = el('div', { class: 'nav-row' });
  const backBtn = el('button', {
    class: 'nav-btn',
    disabled: state.idx === 0 ? 'disabled' : null,
    onclick: () => { if (state.idx > 0) { state.idx--; render(); } },
  }, text('span', '', '← BACK'));
  nav.appendChild(backBtn);
  wrap.appendChild(nav);

  root.appendChild(wrap);
}

function advance(moduleNum) {
  const order = moduleNum === 1 ? state.order1 : state.order2;
  if (state.idx < order.length - 1) {
    state.idx++;
    render();
  } else if (moduleNum === 1) {
    finishModule1();
  } else {
    finishModule2();
  }
}

function finishModule1() {
  // MUST be the form-filtered set, not all 94. scoreAxes treats a missing
  // answer as 0 in the numerator but still counts its weight in the
  // denominator, so scoring the short form against every question drags each
  // axis toward 50 by the fraction of items that form never asked (~0.53-0.64
  // per axis). That compression collapsed the whole moderate-left region onto
  // the Social Democracy anchor.
  const asked = questionsForForm(state.data.module1.questions, state.form);
  const scores = scoreAxes(asked, state.answers1);
  state.m1scores = scores;
  state.culturalScore = scores.cult ?? 50;
  state.routing = routeModule1(scores, state.data.module1.buckets);
  state.bucketId = state.routing[0].id;
  state.screen = 'transition';
  render();
}

function renderTransition() {
  const wrap = el('div', { class: 'sheet transition' });
  wrap.appendChild(text('h2', 'section-title', 'STAGE ONE COMPLETE'));
  wrap.appendChild(el('hr', { class: 'rule' }));
  const list = el('div', { class: 'match-list' });
  for (const r of state.routing.slice(0, 3)) {
    list.appendChild(el('div', { class: 'match-row' }, [
      text('span', 'match-name', r.name),
      text('span', 'match-pct', `${r.matchPercent.toFixed(1)}%`),
    ]));
  }
  wrap.appendChild(list);
  wrap.appendChild(text('p', 'body',
    `Provisional classification: ${state.routing[0].name}. Proceeding to Stage Two — ` +
    'a deeper battery specific to this cluster.'));
  wrap.appendChild(el('button', {
    class: 'begin-btn',
    onclick: () => beginModule2(),
  }, text('span', '', 'CONTINUE TO STAGE TWO →')));
  root.appendChild(wrap);
}

function beginModule2() {
  const bucketData = state.data.module2.buckets[state.bucketId];
  const q = questionsForForm(bucketData.questions, state.form);
  const seed = getSeed('cfv_seed2_' + state.bucketId + '_' + state.form);
  state.seed2 = seed;
  state.order2 = seededShuffle(q, seed);
  state.idx = 0;
  state.answers2 = {};
  state.screen = 'quiz2';
  render();
}

function finishModule2() {
  const bucketData = state.data.module2.buckets[state.bucketId];
  // form-filtered for the same reason as finishModule1()
  const scores = scoreAxes(questionsForForm(bucketData.questions, state.form), state.answers2);
  const axisKeys = bucketData.axes.map(a => a.key);
  const resolved = resolveModule2Label(scores, bucketData.subIdeologies, axisKeys);
  state.m2 = { scores, axes: bucketData.axes, ...resolved };
  state.fromLink = false;
  state.screen = 'results';
  writeResultHash();
  render();
}

// -------------------------------------------------------------- radar chart
// An axis score of 0 means "hard toward negPole", 100 means "hard toward posPole",
// 50 means "no commitment either way". Plotting the raw 0-100 as the spoke radius
// would draw a hard negPole conviction as a SHORT spoke, which reads as "weak on
// this" — the opposite of the truth. So the spoke radius is the STRENGTH of the
// lean, and the vertex is labelled with the pole actually landed on. Long spoke =
// strongly held, always; the label says which side.
const BALANCED_BAND = 4; // within this many points of 50, call it uncommitted

function leaning(axis, score) {
  if (Math.abs(score - 50) < BALANCED_BAND) {
    return { pole: 'No firm position', strength: 0, balanced: true };
  }
  return score >= 50
    ? { pole: axis.posPole, strength: (score - 50) * 2, balanced: false }
    : { pole: axis.negPole, strength: (50 - score) * 2, balanced: false };
}

function wrapWords(str, maxChars) {
  const lines = [];
  let cur = '';
  for (const word of str.split(/\s+/)) {
    if (!cur) cur = word;
    else if ((cur + ' ' + word).length <= maxChars) cur += ' ' + word;
    else { lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  return lines;
}

function buildRadar(axes, scores) {
  const n = axes.length;
  const R = 118, pad = 132; // pad: room for the pole labels sitting outside the ring
  const w = 2 * (R + pad), h = 2 * (R + pad), cx = w / 2, cy = h / 2;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('class', 'radar-svg');

  const angleFor = i => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (i, r) => [cx + r * Math.cos(angleFor(i)), cy + r * Math.sin(angleFor(i))];
  const mk = (tag, attrs) => {
    const e = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
  };

  for (const frac of [0.25, 0.5, 0.75, 1]) {
    svg.appendChild(mk('polygon', {
      points: axes.map((_, i) => pt(i, R * frac).join(',')).join(' '),
      class: 'radar-ring',
    }));
  }

  axes.forEach((ax, i) => {
    const [x, y] = pt(i, R);
    svg.appendChild(mk('line', { x1: cx, y1: cy, x2: x, y2: y, class: 'radar-spoke' }));

    const lean = leaning(ax, scores[ax.key]);
    const [lx, ly] = pt(i, R + 14);
    const onSide = Math.abs(lx - cx) > 4;
    const anchor = !onSide ? 'middle' : lx > cx ? 'start' : 'end';
    const lines = wrapWords(lean.pole, onSide ? 17 : 22);
    const lh = 11.5;

    // grow the text block away from the centre so it never overlaps the ring
    let startY;
    if (!onSide) startY = ly < cy ? ly - (lines.length - 1) * lh - 2 : ly + 9;
    else startY = ly - ((lines.length - 1) * lh) / 2 + 3;

    const label = mk('text', {
      x: lx, y: startY, class: 'radar-pole-label' + (lean.balanced ? ' muted' : ''),
      'text-anchor': anchor,
    });
    lines.forEach((ln, k) => {
      const ts = mk('tspan', { x: lx, y: startY + k * lh });
      ts.textContent = ln;
      label.appendChild(ts);
    });
    svg.appendChild(label);
  });

  const radiusFor = ax => (R * leaning(ax, scores[ax.key]).strength) / 100;
  svg.appendChild(mk('polygon', {
    points: axes.map((ax, i) => pt(i, radiusFor(ax)).join(',')).join(' '),
    class: 'radar-data',
  }));
  axes.forEach((ax, i) => {
    const [x, y] = pt(i, radiusFor(ax));
    svg.appendChild(mk('circle', { cx: x, cy: y, r: 3.5, class: 'radar-dot' }));
  });
  return svg;
}

function axisBar(axis, value) {
  const row = el('div', { class: 'axis-bar-row' });
  row.appendChild(text('span', 'pole pole-neg', axis.negPole));
  const track = el('div', { class: 'axis-track' });
  track.appendChild(el('div', { class: 'axis-marker', style: `left:${value}%` }));
  row.appendChild(track);
  row.appendChild(text('span', 'pole pole-pos', axis.posPole));
  row.appendChild(text('span', 'axis-value', value.toFixed(0)));
  return row;
}

function matchList(rows, limit) {
  const list = el('div', { class: 'match-list' });
  for (const r of rows.slice(0, limit)) {
    list.appendChild(el('div', { class: 'match-row' }, [
      text('span', 'match-name', r.name),
      text('span', 'match-pct', `${r.matchPercent.toFixed(1)}%`),
    ]));
  }
  return list;
}

// ------------------------------------------------------------- share card
// A downloadable PNG for manual sharing (Discord, Twitter, etc), NOT a
// crawler-fetched og:image — the result payload lives in location.hash, and
// URL fragments never reach a server, so a link-preview bot can never see it.
// Drawn with 2D canvas primitives rather than serializing the results radar
// <svg>: that SVG is styled entirely by CSS classes (radar-ring, radar-data,
// ...), which do not travel when cloned into an off-DOM canvas — it would
// rasterize blank.
function drawRadarOnCanvas(ctx, axes, scores, cx, cy, R) {
  const n = axes.length;
  const angleFor = i => -Math.PI / 2 + (i * 2 * Math.PI) / n;

  ctx.strokeStyle = 'rgba(217,201,163,0.25)';
  ctx.lineWidth = 1;
  for (const frac of [0.25, 0.5, 0.75, 1]) {
    ctx.beginPath();
    axes.forEach((_, i) => {
      const a = angleFor(i);
      const x = cx + R * frac * Math.cos(a), y = cy + R * frac * Math.sin(a);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
  }

  ctx.fillStyle = '#d9c9a3';
  ctx.font = '12px Georgia, serif';
  axes.forEach((ax, i) => {
    const a = angleFor(i);
    const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
    const lx = cx + (R + 16) * Math.cos(a), ly = cy + (R + 16) * Math.sin(a);
    ctx.textAlign = Math.abs(lx - cx) < 4 ? 'center' : (lx > cx ? 'left' : 'right');
    ctx.textBaseline = ly < cy ? 'bottom' : 'top';
    ctx.fillText(ax.name, lx, ly);
  });

  const radiusFor = ax => (R * leaning(ax, scores[ax.key]).strength) / 100;
  ctx.beginPath();
  axes.forEach((ax, i) => {
    const a = angleFor(i), r = radiusFor(ax);
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = 'rgba(140,31,31,0.35)';
  ctx.fill();
  ctx.strokeStyle = '#8c1f1f';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function buildShareCardCanvas() {
  const W = 1200, H = 630;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const family = state.routing.find(r => r.id === state.bucketId) || state.routing[0];

  ctx.fillStyle = '#1c2a44';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#8c1f1f';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, W - 6, H - 6);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#a89873';
  ctx.font = 'bold 22px Georgia, serif';
  ctx.fillText('CONFERADAR VALUES — CASE FILE', 48, 64);

  ctx.fillStyle = '#d9c9a3';
  ctx.font = 'bold 46px Georgia, serif';
  ctx.fillText(family.name, 48, 130);

  ctx.fillStyle = '#c2492a';
  ctx.font = '26px Georgia, serif';
  wrapWords(state.m2.label, 34).slice(0, 2).forEach((line, i) => {
    ctx.fillText(line, 48, 168 + i * 32);
  });

  ctx.fillStyle = '#d9c9a3';
  ctx.font = '19px Georgia, serif';
  ctx.fillText(
    `${family.matchPercent.toFixed(0)}% family match · ${state.m2.primary.matchPercent.toFixed(0)}% tendency match`,
    48, 240);

  drawRadarOnCanvas(ctx, state.m2.axes, state.m2.scores, 860, 360, 190);

  ctx.fillStyle = '#a89873';
  ctx.font = '15px Georgia, serif';
  ctx.fillText('conferadar values — take the test yourself', 48, H - 36);

  return canvas;
}

function renderResults() {
  const wrap = el('div', { class: 'sheet results' });
  wrap.appendChild(el('div', { class: 'stamp verdict-stamp' }, text('span', '', 'VERDICT')));

  // read the family off the bucket Module 2 actually ran, not just routing[0]
  const family = state.routing.find(r => r.id === state.bucketId) || state.routing[0];

  const head = el('div', { class: 'verdict-head' });
  head.appendChild(text('div', 'dossier-label', 'CASE FILE — FINAL ASSESSMENT'));
  head.appendChild(text('h1', 'bucket-name', family.name));
  head.appendChild(text('h2', 'flavor-label', state.m2.label));
  head.appendChild(text('div', 'headline-match',
    `${family.matchPercent.toFixed(0)}% family match · ` +
    `${state.m2.primary.matchPercent.toFixed(0)}% tendency match`));
  wrap.appendChild(head);
  wrap.appendChild(el('hr', { class: 'rule' }));

  const grid = el('div', { class: 'results-grid' });

  const left = el('div', { class: 'results-left' });
  left.appendChild(el('div', { class: 'radar-wrap' }, buildRadar(state.m2.axes, state.m2.scores)));
  left.appendChild(text('div', 'radar-legend',
    'Each spoke is named for the side you actually came down on. Distance from the centre = how strongly you held it.'));
  grid.appendChild(left);

  const right = el('div', { class: 'results-right' });
  right.appendChild(text('div', 'section-title', 'CULTURAL ORIENTATION'));
  const cultRow = el('div', { class: 'axis-bar-row cultural' });
  cultRow.appendChild(text('span', 'pole pole-neg', 'Traditionalist'));
  const cultTrack = el('div', { class: 'axis-track' });
  cultTrack.appendChild(el('div', { class: 'axis-marker', style: `left:${state.culturalScore}%` }));
  cultRow.appendChild(cultTrack);
  cultRow.appendChild(text('span', 'pole pole-pos', 'Progressive'));
  cultRow.appendChild(text('span', 'axis-value', state.culturalScore.toFixed(0)));
  right.appendChild(cultRow);
  right.appendChild(text('div', 'note', 'Measured separately — never affects which family you were routed into.'));

  right.appendChild(text('div', 'section-title', 'CLOSEST FAMILIES'));
  right.appendChild(matchList(state.routing, 3));
  right.appendChild(text('div', 'section-title', 'CLOSEST TENDENCIES'));
  right.appendChild(matchList(state.m2.ranked, 4));
  grid.appendChild(right);

  wrap.appendChild(grid);

  // full 0-100 axis positions, folded away so the verdict fits one screen
  const details = el('details', { class: 'breakdown' });
  const summary = document.createElement('summary');
  summary.textContent = 'FULL AXIS BREAKDOWN';
  details.appendChild(summary);
  const barsWrap = el('div', { class: 'axis-bars' });
  for (const ax of state.m2.axes) barsWrap.appendChild(axisBar(ax, state.m2.scores[ax.key]));
  details.appendChild(barsWrap);
  wrap.appendChild(details);

  const actions = el('div', { class: 'action-row' });
  const shareBtn = el('button', { class: 'begin-btn compact' },
    text('span', '', '🔗 COPY SHAREABLE LINK'));
  shareBtn.addEventListener('click', async () => {
    const url = location.href;
    const done = () => {
      shareBtn.firstChild.textContent = '✓ LINK COPIED';
      setTimeout(() => { shareBtn.firstChild.textContent = '🔗 COPY SHAREABLE LINK'; }, 1800);
    };
    try {
      await navigator.clipboard.writeText(url);
      done();
    } catch (e) {
      // clipboard API is blocked on file:// and in some sandboxed frames
      const box = el('input', { class: 'share-fallback', value: url, readonly: 'readonly' });
      shareBtn.replaceWith(box);
      box.focus(); box.select();
    }
  });
  actions.appendChild(shareBtn);

  const cardBtn = el('button', { class: 'begin-btn compact' },
    text('span', '', '🖼 DOWNLOAD SHARE CARD'));
  cardBtn.addEventListener('click', () => {
    const canvas = buildShareCardCanvas();
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'conferadar-result.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, 'image/png');
  });
  actions.appendChild(cardBtn);

  actions.appendChild(el('button', {
    class: 'begin-btn compact',
    onclick: () => {
      clearSeeds();
      clearResultHash();
      clearProgress();
      state.resumable = null;
      state.screen = 'intro';
      state.answers1 = {}; state.answers2 = {};
      state.fromLink = false;
      render();
    },
  }, text('span', '', state.fromLink ? '→ TAKE THE TEST YOURSELF' : '↺ RETAKE ASSESSMENT')));
  wrap.appendChild(actions);

  if (SUBMIT_ENDPOINT && !state.fromLink) wrap.appendChild(renderValidation());

  wrap.appendChild(siteFooter());

  root.appendChild(wrap);
}

// -------------------------------------------------------------------- boot
function routeFromHash() {
  const payload = hashPayload();
  if (payload && decodeResult(payload)) {
    state.screen = 'results';
  } else {
    state.screen = 'intro';
    state.resumable = validateProgress(loadRawProgress(), state.data);
  }
  render();
}

window.addEventListener('hashchange', () => {
  if (suppressHashChange) return;
  routeFromHash();
});

loadData().then(data => {
  state.data = data;
  routeFromHash();
}).catch(err => {
  root.innerHTML = `<div class="sheet"><p class="body">Failed to load data: ${err.message}. If you opened this file directly, serve it via a local HTTP server instead.</p></div>`;
});
