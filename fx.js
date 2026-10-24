/* Temas de color, sonidos y confeti. Las preferencias son de cada dispositivo. */

const LS_PREFS = 'plantilla.prefs.v1';

// Cada paleta define sus colores en claro y en oscuro.
export const PALETTES = {
  river: {
    name: 'River',
    light: { bg: '#F6F4F4', surface: '#FFFFFF', ink: '#161012', muted: '#6B5F62', line: '#E7DEE0', accent: '#D1132A', accentInk: '#FFFFFF', accentSoft: '#FBE1E4' },
    dark:  { bg: '#0E0A0B', surface: '#191214', ink: '#F4ECEE', muted: '#A8989C', line: '#33262A', accent: '#E5263B', accentInk: '#FFFFFF', accentSoft: '#3A1A1F' }
  },
  azul: {
    name: 'Azul',
    light: { bg: '#F2F5F5', surface: '#FFFFFF', ink: '#13201F', muted: '#5A6B6A', line: '#DAE2E2', accent: '#1F5FC4', accentInk: '#FFFFFF', accentSoft: '#E3ECFA' },
    dark:  { bg: '#0E1415', surface: '#162022', ink: '#E7EEED', muted: '#93A5A4', line: '#26353A', accent: '#7FA8F5', accentInk: '#0B1424', accentSoft: '#1B2A44' }
  },
  bosque: {
    name: 'Bosque',
    light: { bg: '#F1F5F1', surface: '#FFFFFF', ink: '#14211A', muted: '#5B6C61', line: '#D8E3DA', accent: '#23794A', accentInk: '#FFFFFF', accentSoft: '#DDF0E3' },
    dark:  { bg: '#0D1410', surface: '#151F19', ink: '#E5EFE8', muted: '#91A598', line: '#243329', accent: '#6FCF97', accentInk: '#0A1A10', accentSoft: '#173524' }
  },
  atardecer: {
    name: 'Atardecer',
    light: { bg: '#F8F3EF', surface: '#FFFFFF', ink: '#24170F', muted: '#76645A', line: '#EADDD4', accent: '#C84B1E', accentInk: '#FFFFFF', accentSoft: '#FBE4D8' },
    dark:  { bg: '#16100D', surface: '#211814', ink: '#F3E8E1', muted: '#B09C90', line: '#3A2B23', accent: '#FF9466', accentInk: '#2A1105', accentSoft: '#43251A' }
  },
  uva: {
    name: 'Uva',
    light: { bg: '#F5F3F9', surface: '#FFFFFF', ink: '#1C1527', muted: '#665E75', line: '#E1DCEB', accent: '#6D3BD6', accentInk: '#FFFFFF', accentSoft: '#EAE1FB' },
    dark:  { bg: '#110E18', surface: '#1A1623', ink: '#ECE7F5', muted: '#A39BB4', line: '#2E283B', accent: '#B794F6', accentInk: '#1B0D33', accentSoft: '#2D2346' }
  },
  oceano: {
    name: 'Océano',
    light: { bg: '#EFF6F7', surface: '#FFFFFF', ink: '#0F2226', muted: '#56696D', line: '#D3E4E7', accent: '#0A7C8C', accentInk: '#FFFFFF', accentSoft: '#D6EFF2' },
    dark:  { bg: '#0B1517', surface: '#121F22', ink: '#E2F0F2', muted: '#8DA6AA', line: '#213438', accent: '#4FD1DD', accentInk: '#06272B', accentSoft: '#153A3F' }
  },
  grafito: {
    name: 'Grafito',
    light: { bg: '#F4F4F5', surface: '#FFFFFF', ink: '#18181B', muted: '#62626A', line: '#E2E2E5', accent: '#18181B', accentInk: '#FFFFFF', accentSoft: '#E8E8EB' },
    dark:  { bg: '#0F0F11', surface: '#18181B', ink: '#EDEDEF', muted: '#9C9CA3', line: '#2C2C31', accent: '#EDEDEF', accentInk: '#18181B', accentSoft: '#2A2A2F' }
  }
};

const DEFAULTS = { palette: 'river', mode: 'auto', sound: true, motion: true };

function load() {
  try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(LS_PREFS)) || {}); } catch (e) { return Object.assign({}, DEFAULTS); }
}
export const prefs = load();

export function setPref(k, v) {
  prefs[k] = v;
  try { localStorage.setItem(LS_PREFS, JSON.stringify(prefs)); } catch (e) {}
  if (k === 'palette' || k === 'mode') applyTheme();
}

const darkMQ = window.matchMedia('(prefers-color-scheme: dark)');
const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
export const isRiver = () => prefs.palette === 'river';
export const isDark = () => prefs.mode === 'dark' || (prefs.mode === 'auto' && darkMQ.matches);
export const motionOK = () => prefs.motion && !reduceMQ.matches;

export function applyTheme() {
  const pal = PALETTES[prefs.palette] || PALETTES.azul;
  const t = isDark() ? pal.dark : pal.light;
  const r = document.documentElement.style;
  r.setProperty('--bg', t.bg); r.setProperty('--surface', t.surface); r.setProperty('--ink', t.ink);
  r.setProperty('--muted', t.muted); r.setProperty('--line', t.line); r.setProperty('--accent', t.accent);
  r.setProperty('--accent-ink', t.accentInk); r.setProperty('--accent-soft', t.accentSoft);
  r.setProperty('color-scheme', isDark() ? 'dark' : 'light');
  document.documentElement.classList.toggle('river', prefs.palette === 'river');
  try { localStorage.setItem('plantilla.themevars', JSON.stringify(t)); } catch (e) {}
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => { m.setAttribute('content', t.bg); m.removeAttribute('media'); });
}
darkMQ.addEventListener('change', () => { if (prefs.mode === 'auto') applyTheme(); });
applyTheme();

/* ---------------- sonidos (sintetizados, sin archivos) ---------------- */
let ctx = null;
function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function tone(freq, start, dur, { type = 'sine', gain = 0.16, slide = 0 } = {}) {
  const a = ac(); if (!a) return;
  const t0 = a.currentTime + start;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
// Silbato de árbitro: tono agudo con un temblor rápido.
function whistle(start, dur, gain = 0.07) {
  const a = ac(); if (!a) return;
  const t0 = a.currentTime + start;
  const o = a.createOscillator(), lfo = a.createOscillator(), lg = a.createGain(), g = a.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(2900, t0);
  lfo.type = 'sine'; lfo.frequency.setValueAtTime(34, t0); lg.gain.setValueAtTime(140, t0);
  lfo.connect(lg).connect(o.frequency);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.setValueAtTime(gain, t0 + dur - 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0); lfo.start(t0); o.stop(t0 + dur + 0.02); lfo.stop(t0 + dur + 0.02);
}
const SOUNDS = {
  tick() { tone(880, 0, 0.09, { type: 'triangle', gain: 0.12, slide: 1.25 }); },
  untick() { tone(520, 0, 0.08, { type: 'triangle', gain: 0.08, slide: 0.8 }); },
  done() { tone(659.25, 0, 0.14, { type: 'triangle', gain: 0.14 }); tone(987.77, 0.08, 0.22, { type: 'triangle', gain: 0.14 }); },
  day() {
    if (isRiver()) {
      // pitazo final: corto, corto, largo; después el festejo
      whistle(0, 0.16); whistle(0.24, 0.16); whistle(0.48, 0.7);
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 1.25 + i * 0.09, 0.32, { type: 'triangle', gain: 0.13 }));
      tone(1318.5, 1.63, 0.6, { type: 'sine', gain: 0.1 });
      return;
    }
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.09, 0.32, { type: 'triangle', gain: 0.13 }));
    tone(1318.5, 0.38, 0.6, { type: 'sine', gain: 0.1 });
    tone(1567.98, 0.38, 0.6, { type: 'sine', gain: 0.06 });
  }
};
export function sfx(name) {
  if (!prefs.sound || !SOUNDS[name]) return;
  try { SOUNDS[name](); } catch (e) {}
}

/* ---------------- confeti ---------------- */
export function confetti() {
  if (!motionOK()) return;
  const cv = document.createElement('canvas');
  cv.className = 'confetti';
  cv.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cv);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = innerWidth, H = innerHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const css = getComputedStyle(document.documentElement);
  const accent = css.getPropertyValue('--accent').trim() || '#1F5FC4';
  const river = isRiver();
  const colors = river ? ['#D1132A', '#D1132A', '#FFFFFF', '#FFFFFF', '#F1F1F1', '#B30F23'] : [accent, '#F5B700', '#FF6B6B', '#2EC4B6', '#9B5DE5', '#FFFFFF'];
  const LIFE = river ? 3800 : 2600;
  // River: lluvia de papelitos desde arriba, como en la tribuna.
  const parts = river ? Array.from({ length: 180 }, () => ({
    x: Math.random() * W, y: -20 - Math.random() * H * 0.6,
    vx: (Math.random() - 0.5) * 1.2, vy: 1.6 + Math.random() * 2.2, flutter: Math.random() * 6.28,
    w: 7 + Math.random() * 7, h: 5 + Math.random() * 6, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.18,
    c: colors[(Math.random() * colors.length) | 0], fall: true
  })) : Array.from({ length: 140 }, () => {
    const fromLeft = Math.random() < 0.5;
    return {
      x: fromLeft ? -10 : W + 10, y: H * (0.55 + Math.random() * 0.3),
      vx: (fromLeft ? 1 : -1) * (4 + Math.random() * 7), vy: -(9 + Math.random() * 9),
      w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
      c: colors[(Math.random() * colors.length) | 0]
    };
  });
  const t0 = performance.now();
  (function frame(now) {
    const el = now - t0;
    g.clearRect(0, 0, W, H);
    parts.forEach((p) => {
      if (p.fall) { p.flutter += 0.08; p.x += p.vx + Math.sin(p.flutter) * 0.9; p.y += p.vy; p.r += p.vr; }
      else { p.vy += 0.32; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; }
      g.save(); g.translate(p.x, p.y); g.rotate(p.r);
      g.globalAlpha = Math.max(0, Math.min(1, (LIFE - el) / 700));
      g.fillStyle = p.c;
      if (p.c === '#FFFFFF' || p.c === '#F1F1F1') { g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 0.6; }
      const hh = p.h * Math.abs(Math.cos(p.r * 2)) + 1;
      g.fillRect(-p.w / 2, -hh / 2, p.w, hh);
      if (p.c === '#FFFFFF' || p.c === '#F1F1F1') g.strokeRect(-p.w / 2, -hh / 2, p.w, hh);
      g.restore();
    });
    if (el < LIFE) requestAnimationFrame(frame); else cv.remove();
  })(t0);
}

/* vibración corta en celulares que la soportan */
export function buzz(ms) { if (prefs.sound && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
