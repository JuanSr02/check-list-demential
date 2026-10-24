import { PALETTES, prefs, setPref, isDark, isRiver, motionOK, sfx, confetti, buzz } from './fx.js';

/* ================= plantilla por defecto ================= */
const mk = (p, arr) => arr.map((t, i) => ({ id: p + '-' + (i + 1), text: t }));
const DEFAULTS = [
  { id: 'base-1', text: 'Creatina', subs: [] },
  { id: 'base-2', text: 'Limpieza Completa', subs: mk('lim', ['Lavar', 'Orden (grasa hornallas)', 'Barrer piso', 'Trapo piso', 'Baño', 'Mesa', 'Basura', 'Ropa', 'Rocco']) },
  { id: 'base-3', text: 'Merienda', subs: mk('mer', ['Agua', 'Tomar algo', 'Fruta', 'Comer algo']) },
  { id: 'base-4', text: 'Bañarse', subs: [] },
  { id: 'base-5', text: 'Hábitos Diarios', subs: mk('hab', ['Rosario', 'Leer', 'Cargar celu', 'Cargar reloj', '5 min journaling']) }
];
const LS_KEY = 'plantilla.clave';
const LS_CACHE = 'plantilla.cache.v1';
const LS_QUEUE = 'plantilla.queue.v1';
const root = document.getElementById('app');

/* ================= fechas ================= */
const pad = (n) => String(n).padStart(2, '0');
const keyOf = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const todayKey = () => keyOf(new Date());
const parseKey = (k) => { const p = k.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); };
const minKey = () => addDays(todayKey(), -30);
const INIT = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = (o) => JSON.parse(JSON.stringify(o));
const uid = () => 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const ICON = {
  check: '<path d="M3.5 8.5l3 3 6-7"/>',
  x: '<path d="M4 4l8 8M12 4l-8 8"/>',
  left: '<path d="M10 3L5 8l5 5"/>',
  right: '<path d="M6 3l5 5-5 5"/>',
  up: '<path d="M3.5 10L8 5.5 12.5 10"/>',
  down: '<path d="M3.5 6L8 10.5 12.5 6"/>',
  trash: '<path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8h5.8l.6-8"/>',
  chev: '<path d="M4 6l4 4 4-4"/>'
};
const ic = (name, size = 18) =>
  '<svg width="' + size + '" height="' + size + '" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[name] + '</svg>';

/* ================= modelo ================= */
const normTpl = (arr) => arr.map((x) => ({
  id: String(x.id), text: String(x.text),
  subs: Array.isArray(x.subs) ? x.subs.map((s) => ({ id: String(s.id), text: String(s.text) })) : []
}));
const normDay = (arr) => arr.map((x) => ({
  id: String(x.id), text: String(x.text), status: x.status || 'pending', tpl: !!x.tpl,
  subs: Array.isArray(x.subs) ? x.subs.map((s) => ({ id: String(s.id), text: String(s.text), status: s.status || 'pending' })) : []
}));
const activeSubs = (it) => (it.subs || []).filter((s) => s.status !== 'skipped');
const doneSubs = (it) => activeSubs(it).filter((s) => s.status === 'done');
function sync(it) {
  const a = activeSubs(it);
  if (a.length) it.status = a.every((s) => s.status === 'done') ? 'done' : 'pending';
}
const fromTpl = (t) => ({ id: t.id, text: t.text, status: 'pending', tpl: true, subs: (t.subs || []).map((s) => ({ id: s.id, text: s.text, status: 'pending' })) });
const find = (items, id) => items.find((x) => x.id === id);

/* ================= estado ================= */
const S = {
  auth: 'checking', online: true, syncing: false,
  ready: false,
  tpl: null, days: {}, today: todayKey(), sel: todayKey(),
  view: 'day', draftTpl: null, draft: '', enew: '', sdraft: {}, focus: null, err: ''
};
const LS_FOLD = 'plantilla.folded.v1';
let folded = new Set((() => { try { return JSON.parse(localStorage.getItem(LS_FOLD)) || []; } catch (e) { return []; } })());
const saveFold = () => { try { localStorage.setItem(LS_FOLD, JSON.stringify([...folded])); } catch (e) {} };
let anim = null;           // animación a aplicar en el próximo render
const segPrev = {};         // ancho anterior de cada segmento de la barra de avance
const tplItems = () => S.tpl || DEFAULTS;
const dayItems = (key) => S.days[key] || tplItems().map(fromTpl);

/* ================= almacenamiento ================= */
// Todo se guarda primero en este dispositivo (abre al instante y funciona sin conexión)
// y se manda a /api/state. Lo que no se pudo mandar queda en una cola y se reintenta.
const lsGet = (k, def) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? def : v; } catch (e) { return def; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const lsDel = (k) => { try { localStorage.removeItem(k); } catch (e) {} };

let clave = lsGet(LS_KEY, null);
let queue = lsGet(LS_QUEUE, {});   // { 'day:AAAA-MM-DD' | 'template': payload }
let flushing = false;

function writeCache() { lsSet(LS_CACHE, { tpl: S.tpl, days: S.days }); }
function readCache() {
  const c = lsGet(LS_CACHE, null);
  if (!c) return false;
  S.tpl = Array.isArray(c.tpl) ? normTpl(c.tpl) : null;
  S.days = {};
  Object.keys(c.days || {}).forEach((k) => { S.days[k] = normDay(c.days[k]); });
  return true;
}

async function api(method, body, query) {
  const r = await fetch('/api/state' + (query || ''), {
    method,
    headers: Object.assign({ 'x-clave': clave || '' }, body ? { 'content-type': 'application/json' } : {}),
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store'
  });
  let data = null;
  try { data = await r.json(); } catch (e) {}
  if (!r.ok) { const err = new Error((data && data.error) || ('Error ' + r.status)); err.status = r.status; throw err; }
  return data;
}

async function flush() {
  if (flushing || !clave) return;
  flushing = true;
  try {
    let keys;
    while ((keys = Object.keys(queue)).length) {
      const k = keys[0], payload = queue[k];
      try {
        await api('POST', payload);
        if (queue[k] === payload) delete queue[k];
        lsSet(LS_QUEUE, queue);
        const hadErr = !!S.err || !S.online;
        S.online = true; S.err = '';
        if (hadErr) render(); else if (!Object.keys(queue).length) updateAcct();
      } catch (e) {
        if (e.status === 401) { signOutLocal('La clave cambió. Ingresala de nuevo.'); return; }
        if (e.status && e.status !== 429 && e.status < 500) { delete queue[k]; lsSet(LS_QUEUE, queue); S.err = e.message; render(); continue; }
        if (S.online) { S.online = false; render(); }
        return;
      }
    }
  } finally { flushing = false; }
}

function enqueue(k, payload) {
  queue[k] = payload;
  lsSet(LS_QUEUE, queue);
  writeCache();
  flush();
}
function persistDay(key) { enqueue('day:' + key, { kind: 'day', date: key, items: S.days[key] }); }
function persistTpl() {
  S.tpl = clone(S.draftTpl);
  enqueue('template', { kind: 'template', items: S.tpl });
}

async function refresh() {
  if (!clave || S.syncing) return;
  S.syncing = true;
  try {
    await flush();
    const tk = todayKey();
    const data = await api('GET', null, '?from=' + addDays(tk, -30) + '&to=' + tk);
    if (!queue.template) S.tpl = data.template ? normTpl(data.template) : null;
    const nd = {};
    Object.keys(data.days || {}).forEach((k) => { nd[k] = normDay(data.days[k]); });
    Object.keys(queue).forEach((q) => { if (q.startsWith('day:')) { const k = q.slice(4); if (S.days[k]) nd[k] = S.days[k]; } });
    S.days = nd;
    S.online = true;
    if (S.auth !== 'in') S.auth = 'in';
    S.ready = true;
    writeCache();
    render();
  } catch (e) {
    if (e.status === 401) { signOutLocal('Clave incorrecta.'); }
    else if (e.status === 500) { S.err = e.message; if (S.auth === 'in') S.ready = true; render(); }
    else { S.online = false; if (S.auth === 'in') S.ready = true; render(); }
    throw e;
  } finally { S.syncing = false; }
}

function signOutLocal(msg) {
  clave = null; queue = {};
  lsDel(LS_KEY); lsDel(LS_QUEUE); lsDel(LS_CACHE);
  S.auth = 'out'; S.ready = false; S.tpl = null; S.days = {}; S.view = 'day'; S.sel = todayKey();
  S.err = msg || '';
  render();
}

function mutate(key, fn) {
  const items = clone(dayItems(key));
  fn(items);
  items.forEach(sync);
  S.days[key] = items;
  persistDay(key);
  render();
}

/* ================= diferencias con la plantilla ================= */
function tplDiff(items) {
  let n = 0;
  tplItems().forEach((t) => {
    const it = find(items, t.id);
    if (!it) { n++; return; }
    (t.subs || []).forEach((s) => { if (!find(it.subs || [], s.id)) n++; });
  });
  return n;
}

/* ================= vistas ================= */
function headHTML(key) {
  const d = parseKey(key), tk = todayKey();
  const dow = d.toLocaleDateString('es-AR', { weekday: 'long' });
  const dm = d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
  const items = S.ready ? dayItems(key).filter((i) => i.status !== 'skipped') : [];
  const done = items.filter((i) => i.status === 'done').length;
  const total = items.length;
  const segs = items.map((it) => {
    const a = activeSubs(it).length;
    const f = it.status === 'done' ? 1 : (a ? doneSubs(it).length / a : 0);
    const w = Math.round(f * 100), k = key + ':' + it.id;
    const from = segPrev[k] == null ? w : segPrev[k];
    segPrev[k] = w;
    return '<span class="seg"><i style="width:' + from + '%" data-w="' + w + '"></i></span>';
  }).join('');
  const count = !S.ready ? '' : total === 0 ? 'Sin ítems' : (done === total ? 'Completo' : done + ' de ' + total);
  const diffDays = Math.round((parseKey(tk) - d) / 864e5);
  let rel = diffDays === 0 ? 'Hoy' : diffDays === 1 ? 'Ayer' : 'Hace ' + diffDays + ' días';
  if (isRiver()) {
    const md = (d.getMonth() + 1) + '-' + d.getDate();
    if (md === '5-25') rel += ' · Cumple River (' + (d.getFullYear() - 1901) + ' años)';
    else if (md === '12-9') rel += ' · Madrid 2018';
  }
  return '<header class="top"><div class="datebar"><div class="dt"><div class="eyebrow' + (diffDays ? ' past' : '') + '">' + rel + '</div><h1 class="dow" style="margin:0">' + esc(dow) + '</h1><div class="dm">' + esc(dm) + '</div>' +
    (key !== tk ? '<button class="pill" data-act="today">Volver a hoy</button>' : '') +
    '</div><div class="navs">' +
    '<button class="nav" data-act="prev" aria-label="Día anterior"' + (key <= minKey() ? ' disabled' : '') + '>' + ic('left') + '</button>' +
    '<button class="nav" data-act="next" aria-label="Día siguiente"' + (key >= tk ? ' disabled' : '') + '>' + ic('right') + '</button>' +
    '</div></div>' +
    '<div class="prog"><div class="segs" role="progressbar" aria-label="Avance del día" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + done + '">' + segs + '</div>' +
    '<div class="count">' + count + '</div></div></header>';
}

function itemHTML(it, isDone) {
  const a = activeSubs(it), ds = doneSubs(it);
  const hasSubs = a.length > 0;
  const state = isDone ? 'true' : (ds.length ? 'mixed' : 'false');
  const part = !isDone && hasSubs && ds.length ? '<span class="part" style="height:' + Math.round(ds.length / a.length * 100) + '%"></span>' : '';
  const box = '<span class="box">' + part + ic('check', 16) + '</span>';
  const frac = hasSubs ? '<span class="frac">' + ds.length + '/' + a.length + '</span>' : '';
  const dropBtn = isDone ? '' : '<button class="ico" data-act="drop" data-id="' + esc(it.id) + '" aria-label="' + (it.tpl ? 'Omitir hoy: ' : 'Quitar: ') + esc(it.text) + '" title="' + (it.tpl ? 'Omitir por hoy' : 'Quitar') + '">' + ic('x', 16) + '</button>';

  // Sin subítems, o ya hecho: toda la fila marca / desmarca.
  if (isDone || !(it.subs || []).length) {
    return '<li><div class="row"><button class="chk" id="c-' + esc(it.id) + '" role="checkbox" aria-checked="' + state + '" data-act="toggle" data-id="' + esc(it.id) + '">' +
      box + '<span class="txt">' + esc(it.text) + '</span>' + frac + '</button>' + dropBtn + '</div></li>';
  }

  // Con subítems: el círculo marca todo y el nombre pliega o despliega la lista.
  const isFolded = folded.has(it.id);
  const pendSubs = a.filter((s) => s.status !== 'done');
  const nextTxt = isFolded && pendSubs.length ? '<span class="next">Sigue: ' + esc(pendSubs[0].text) + '</span>' : '';
  let h = '<li class="grp' + (isFolded ? ' folded' : '') + '"><div class="row">' +
    '<button class="chk chkall" id="c-' + esc(it.id) + '" role="checkbox" aria-checked="' + state + '" data-act="toggle" data-id="' + esc(it.id) + '" aria-label="Marcar todo: ' + esc(it.text) + '" title="Marcar todo">' + box + '</button>' +
    '<button class="expander" data-act="fold" data-id="' + esc(it.id) + '" aria-expanded="' + !isFolded + '" aria-controls="subs-' + esc(it.id) + '">' +
      '<span class="txtwrap"><span class="txt">' + esc(it.text) + '</span>' + nextTxt + '</span>' + frac + '<span class="chev">' + ic('chev', 16) + '</span></button>' +
    dropBtn + '</div>';
  const order = pendSubs.concat(ds);
  const skipped = it.subs.filter((s) => s.status === 'skipped');
  h += '<div class="subwrap" id="subs-' + esc(it.id) + '"' + (isFolded ? ' hidden' : '') + '><ul class="subs">' + order.map((s) => {
    const on = s.status === 'done';
    return '<li class="row"><button class="chk" id="c-' + esc(it.id) + '-' + esc(s.id) + '" role="checkbox" aria-checked="' + on + '" data-act="stoggle" data-id="' + esc(it.id) + '" data-sid="' + esc(s.id) + '">' +
      '<span class="box">' + ic('check', 13) + '</span><span class="txt">' + esc(s.text) + '</span></button>' +
      (on ? '' : '<button class="ico" data-act="sdrop" data-id="' + esc(it.id) + '" data-sid="' + esc(s.id) + '" aria-label="Omitir hoy: ' + esc(s.text) + '" title="Omitir por hoy">' + ic('x', 14) + '</button>') +
      '</li>';
  }).join('') + '</ul>';
  if (skipped.length) {
    h += '<div class="subnote" style="padding-bottom:8px"><span>Omitido hoy: ' + esc(skipped.map((s) => s.text).join(', ')) + '</span>' +
      '<button class="link" data-act="srestore" data-id="' + esc(it.id) + '">Restaurar</button></div>';
  }
  return h + '</div></li>';
}

function stripHTML() {
  const tk = todayKey();
  let out = '';
  for (let n = 6; n >= 0; n--) {
    const k = addDays(tk, -n), d = parseKey(k), items = S.days[k];
    const act = items ? items.filter((i) => i.status !== 'skipped') : [];
    const dn = act.filter((i) => i.status === 'done').length;
    const label = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric' }) + (items && act.length ? ': ' + dn + ' de ' + act.length : ': sin registro');
    const bar = items && act.length
      ? '<span class="bar"><i style="height:' + Math.round(dn / act.length * 100) + '%"></i></span>'
      : '<span class="bar none"></span>';
    out += '<button class="cell' + (k === tk ? ' today' : '') + '" data-act="pick" data-key="' + k + '" aria-label="' + esc(label) + '"' + (k === S.sel ? ' aria-current="true"' : '') + '>' +
      '<span class="wd">' + INIT[d.getDay()] + '</span>' + bar + '<span class="num">' + d.getDate() + '</span></button>';
  }
  return out;
}

function updateAcct() {
  const el = root.querySelector('.acct');
  if (el) el.outerHTML = acctHTML(); else render();
}

function acctHTML() {
  const pend = Object.keys(queue).length;
  const status = !S.online
    ? 'Sin conexión' + (pend ? ': ' + pend + (pend > 1 ? ' cambios esperan' : ' cambio espera') + ' para subirse' : '') + '.'
    : (pend ? 'Guardando…' : 'Guardado en la nube.');
  return '<div class="acct"><span>' + status + '</span><button class="link" data-act="signout">Salir de este dispositivo</button></div>';
}

function dayHTML() {
  const key = S.sel, tk = todayKey();
  if (!S.ready) {
    return headHTML(key) + '<ul class="list" aria-hidden="true"><li class="skel"></li><li class="skel"></li><li class="skel"></li></ul>';
  }
  const items = dayItems(key);
  const pend = items.filter((i) => i.status === 'pending');
  const done = items.filter((i) => i.status === 'done');
  const skip = items.filter((i) => i.status === 'skipped');
  let html = headHTML(key);

  if (key === tk && S.days[key]) {
    const diff = tplDiff(items);
    if (diff) html += '<div class="notice"><span>La plantilla cambió: ' + diff + (diff > 1 ? ' ítems nuevos' : ' ítem nuevo') + '.</span><button class="link" data-act="pull">Traer a hoy</button></div>';
  }
  if (!pend.length && !done.length && !skip.length) {
    html += '<p class="empty">Este día no tiene ítems. Agregá uno abajo o armá la plantilla.</p>';
  } else if (!pend.length && done.length) {
    html += key === tk
      ? '<div class="celebrate' + (anim && anim.day ? ' go' : '') + '"><div class="cel-badge">' + ic('check', 30) + '</div><div><div class="cel-title">' + (isRiver() ? '¡Golazo!' : 'Día completo') + '</div><div class="cel-sub">' + (isRiver() ? 'Día completo. Ganaste el partido de hoy.' : 'Hiciste todo lo de hoy.') + '</div></div></div>'
      : '<p class="allset">Todo hecho.</p>';
  }
  if (pend.length) html += '<ul class="list">' + pend.map((i) => itemHTML(i, false)).join('') + '</ul>';
  if (done.length) {
    html += '<section><div class="h"><span>Hechas</span><span>' + done.length + '</span></div><ul class="list">' + done.map((i) => itemHTML(i, true)).join('') + '</ul></section>';
  }
  if (skip.length) {
    html += '<section><div class="h"><span>Omitidas ' + (key === tk ? 'hoy' : 'ese día') + '</span><span>' + skip.length + '</span></div><ul class="list">' +
      skip.map((i) => '<li class="skipped"><span class="txt">' + esc(i.text) + '</span><button class="link" data-act="restore" data-id="' + esc(i.id) + '">Volver a agregar</button></li>').join('') +
      '</ul></section>';
  }
  html += '<form id="form-add" class="addrow" autocomplete="off"><input class="field" id="add" type="text" enterkeyhint="done" maxlength="120" placeholder="Agregar solo ' + (key === tk ? 'para hoy' : 'a este día') + '" aria-label="Nuevo ítem" value="' + esc(S.draft) + '"><button class="btn" type="submit">Agregar</button></form>';
  html += '<section><div class="h"><span>Últimos 7 días</span></div><div class="strip">' + stripHTML() + '</div></section>';
  html += '<div class="foot">' + (S.err ? '<p class="err" role="alert">' + esc(S.err) + '</p>' : '') +
    '<div class="footbtns"><button class="btn" data-act="edit">Editar plantilla</button><button class="btn" data-act="settings">Ajustes</button></div>' + acctHTML() + '</div>';
  return html;
}

function editHTML() {
  const t = S.draftTpl, n = t.length;
  const rows = t.map((it, i) => {
    const subs = it.subs.map((s, j) =>
      '<div class="esrow"><input class="einput esub" id="es-' + i + '-' + j + '" data-i="' + i + '" data-j="' + j + '" type="text" maxlength="120" value="' + esc(s.text) + '" aria-label="Subítem ' + (j + 1) + ' de ' + esc(it.text) + '">' +
      '<button class="eb" data-act="sup" data-i="' + i + '" data-j="' + j + '" aria-label="Subir subítem"' + (j === 0 ? ' disabled' : '') + '>' + ic('up', 16) + '</button>' +
      '<button class="eb" data-act="sdel" data-i="' + i + '" data-j="' + j + '" aria-label="Eliminar ' + esc(s.text) + '">' + ic('x', 14) + '</button></div>'
    ).join('');
    return '<li class="eitem"><div class="erow"><input class="einput eitm" id="e-' + i + '" data-i="' + i + '" type="text" maxlength="120" value="' + esc(it.text) + '" aria-label="Ítem ' + (i + 1) + '">' +
      '<button class="eb" data-act="up" data-i="' + i + '" aria-label="Subir"' + (i === 0 ? ' disabled' : '') + '>' + ic('up') + '</button>' +
      '<button class="eb" data-act="down" data-i="' + i + '" aria-label="Bajar"' + (i === n - 1 ? ' disabled' : '') + '>' + ic('down') + '</button>' +
      '<button class="eb" data-act="del" data-i="' + i + '" aria-label="Eliminar ' + esc(it.text) + '">' + ic('trash') + '</button></div>' +
      subs +
      '<form class="esadd" id="form-sadd-' + i + '" data-i="' + i + '" autocomplete="off"><input class="field" id="es-new-' + i + '" data-i="' + i + '" type="text" enterkeyhint="done" maxlength="120" placeholder="Agregar subítem" aria-label="Nuevo subítem de ' + esc(it.text) + '" value="' + esc(S.sdraft[i] || '') + '"><button class="btn" type="submit">Agregar</button></form>' +
      '</li>';
  }).join('');
  return '<header class="top"><div class="datebar"><div class="dt"><h1 class="dow" style="margin:0">Plantilla</h1><div class="dm">Lo que arranca cada día</div></div>' +
    '<button class="btn primary" data-act="doneEdit">Listo</button></div></header>' +
    (n ? '<ul class="list">' + rows + '</ul>' : '<p class="empty">La plantilla está vacía: cada día arranca sin ítems.</p>') +
    '<form id="form-eadd" class="addrow" autocomplete="off"><input class="field" id="e-new" type="text" enterkeyhint="done" maxlength="120" placeholder="Nuevo ítem de la plantilla" aria-label="Nuevo ítem de la plantilla" value="' + esc(S.enew) + '"><button class="btn" type="submit">Agregar</button></form>' +
    '<div class="foot"><p class="note">Los cambios se guardan solos. Si hoy ya marcaste algo, lo nuevo aparece con «Traer a hoy» en la pantalla del día. Para saltear un ítem o subítem un día puntual, usá la cruz en la lista.</p>' +
    (S.err ? '<p class="err" role="alert">' + esc(S.err) + '</p>' : '') + '</div>';
}

function settingsHTML() {
  const sw = Object.keys(PALETTES).map((k) => {
    const p = PALETTES[k], t = isDark() ? p.dark : p.light;
    return '<button class="swatch' + (k === 'river' ? ' feat' : '') + '" data-act="palette" data-k="' + k + '" aria-pressed="' + (prefs.palette === k) + '" style="--sw-bg:' + t.bg + ';--sw-ac:' + t.accent + ';--sw-soft:' + t.accentSoft + ';--sw-ink:' + t.accentInk + '">' +
      '<span class="sw-chip' + (k === 'river' ? ' sw-river' : '') + '"><span class="sw-dot">' + ic('check', 14) + '</span><span class="sw-bar"></span><span class="sw-bar short"></span></span><span class="sw-name">' + p.name + (k === 'river' ? '<span class="sw-sub">Banda roja, papelitos y silbato de final</span>' : '') + '</span></button>';
  }).join('');
  const seg = (k, label) => '<button class="segbtn" data-act="mode" data-k="' + k + '" aria-pressed="' + (prefs.mode === k) + '">' + label + '</button>';
  const toggle = (k, label, hint) => '<div class="setrow"><div><div class="set-l">' + label + '</div><div class="set-h">' + hint + '</div></div>' +
    '<button class="switch" role="switch" id="sw-' + k + '" data-act="pref" data-k="' + k + '" aria-checked="' + !!prefs[k] + '" aria-label="' + label + '"><span></span></button></div>';
  return '<header class="top"><div class="datebar"><div class="dt"><h1 class="dow" style="margin:0">Ajustes</h1><div class="dm">Se guardan en este dispositivo</div></div>' +
    '<button class="btn primary" data-act="doneSettings">Listo</button></div></header>' +
    '<section><div class="h"><span>Color</span></div><div class="swatches">' + sw + '</div></section>' +
    '<section><div class="h"><span>Modo</span></div><div class="segctl" role="group" aria-label="Modo">' + seg('auto', 'Automático') + seg('light', 'Claro') + seg('dark', 'Oscuro') + '</div></section>' +
    '<section><div class="h"><span>Efectos</span></div><div class="list setlist">' +
      toggle('sound', 'Sonido', 'Al marcar, al completar un ítem y al terminar el día.') +
      toggle('motion', 'Animaciones', 'Confeti y movimientos al marcar.') +
    '</div><div class="addrow" style="margin-top:10px"><button class="btn" data-act="preview">Probar efectos</button></div></section>';
}

function signinHTML() {
  if (S.auth === 'checking') return '<div class="signin" aria-busy="true"><h1 class="dow" style="margin:0">Plantilla</h1><p>Cargando…</p></div>';
  return '<form class="signin" id="form-login" autocomplete="on"><h1 class="dow" style="margin:0">Plantilla</h1>' +
    '<p>Ingresá tu clave. Se pide una sola vez en cada dispositivo.</p>' +
    '<div class="addrow" style="width:100%;max-width:360px"><input class="field" id="clave" type="password" autocomplete="current-password" aria-label="Clave" placeholder="Clave" required>' +
    '<button class="btn primary" type="submit">Entrar</button></div>' +
    (S.err ? '<p class="err" role="alert">' + esc(S.err) + '</p>' : '') + '</form>';
}

function render() {
  const ae = document.activeElement;
  const fid = ae && ae.id && root.contains(ae) ? ae.id : null;
  const pos = fid && ae.selectionStart != null ? ae.selectionStart : null;
  root.innerHTML = S.auth !== 'in' ? signinHTML() : (S.view === 'edit' ? editHTML() : S.view === 'settings' ? settingsHTML() : dayHTML());
  root.classList.toggle('motion', motionOK());
  applyAnim();
  fillMini();
  const target = S.focus || fid;
  S.focus = null;
  if (target) {
    const el = document.getElementById(target);
    if (el && el !== document.activeElement) {
      el.focus();
      if (pos != null && el.tagName === 'INPUT' && target === fid) { try { el.setSelectionRange(pos, pos); } catch (e) {} }
    }
  }
}

function applyAnim() {
  const bars = root.querySelectorAll('.seg i[data-w]');
  if (bars.length) {
    requestAnimationFrame(() => requestAnimationFrame(() => bars.forEach((b) => { b.style.width = b.dataset.w + '%'; })));
  }
  if (!anim) return;
  const a = anim; anim = null;
  if (!motionOK()) return;
  if (a.pop) { const el = document.getElementById(a.pop); if (el) el.classList.add('pop'); }
  if (a.arrive) { const el = document.getElementById(a.arrive); if (el) el.closest('li').classList.add('arrive'); }
}

const dayState = (items) => {
  const act = items.filter((i) => i.status !== 'skipped');
  return { done: new Set(act.filter((i) => i.status === 'done').map((i) => i.id)), all: act.length > 0 && act.every((i) => i.status === 'done') };
};
// Marca y decide animación y sonido según cómo cambia el día.
function check(el, fn, on) {
  const key = S.sel;
  const before = dayState(dayItems(key));
  const next = clone(dayItems(key)); fn(next); next.forEach(sync);
  const after = dayState(next);
  const newly = [...after.done].filter((id) => !before.done.has(id));
  const dayDone = after.all && !before.all;
  anim = { pop: el.id };
  if (newly.length) anim.arrive = 'c-' + newly[0];
  if (dayDone) anim.day = true;
  mutate(key, fn);
  if (dayDone) { sfx('day'); buzz([20, 60, 30]); confetti(); }
  else if (newly.length) { sfx('done'); buzz(18); }
  else { sfx(on ? 'tick' : 'untick'); if (on) buzz(8); }
}

/* ================= deshacer ================= */
const toastEl = document.createElement('div');
toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite');
document.body.appendChild(toastEl);
let toastTimer = null, undoFn = null;
function toast(msg, undo) {
  undoFn = undo || null;
  toastEl.innerHTML = '<span class="toast-msg"></span>' + (undo ? '<button class="toast-btn" type="button">Deshacer</button>' : '');
  toastEl.querySelector('.toast-msg').textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 5000);
}
function hideToast() { toastEl.classList.remove('show'); undoFn = null; }
toastEl.addEventListener('click', (e) => {
  if (e.target.closest('.toast-btn') && undoFn) { const f = undoFn; hideToast(); f(); }
});
// Guarda cómo estaba el día para poder volver atrás.
function undoableDay(msg) {
  const key = S.sel, snap = clone(dayItems(key)), hadDoc = !!S.days[key];
  return () => toast(msg, () => {
    S.days[key] = snap; if (hadDoc || true) persistDay(key); render();
  });
}
function undoableTpl(msg) {
  const snap = clone(S.draftTpl);
  return () => toast(msg, () => { S.draftTpl = snap; S.sdraft = {}; persistTpl(); render(); });
}

/* ================= barra compacta al scrollear ================= */
const miniEl = document.createElement('div');
miniEl.className = 'mini'; miniEl.setAttribute('aria-hidden', 'true');
document.body.appendChild(miniEl);
function updateMini() {
  const top = root.querySelector('.top');
  const show = S.auth === 'in' && S.view === 'day' && S.ready && top && top.getBoundingClientRect().bottom < 8;
  miniEl.classList.toggle('show', !!show);
}
function fillMini() {
  if (!(S.auth === 'in' && S.view === 'day' && S.ready)) { miniEl.classList.remove('show'); return; }
  const items = dayItems(S.sel).filter((i) => i.status !== 'skipped');
  const fr = items.map((it) => { const a = activeSubs(it).length; return it.status === 'done' ? 1 : (a ? doneSubs(it).length / a : 0); });
  const pct = fr.length ? Math.round(fr.reduce((x, y) => x + y, 0) / fr.length * 100) : 0;
  const done = items.filter((i) => i.status === 'done').length;
  const d = parseKey(S.sel).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric' });
  miniEl.innerHTML = '<div class="mini-in"><span class="mini-day"></span><span class="mini-bar"><i style="width:' + pct + '%"></i></span><span class="mini-count">' + done + '/' + items.length + '</span></div>';
  miniEl.querySelector('.mini-day').textContent = d;
  updateMini();
}
window.addEventListener('scroll', updateMini, { passive: true });

/* ================= acciones ================= */
const swap = (arr, a, b) => { const x = arr[a]; arr[a] = arr[b]; arr[b] = x; };
const A = {
  toggle(el) {
    const willOn = el.getAttribute('aria-checked') !== 'true';
    const it0 = find(dayItems(S.sel), el.dataset.id);
    if (!willOn && it0 && activeSubs(it0).length > 1) {
      const done = undoableDay('Desmarcaste ' + it0.text);
      setTimeout(done, 0);
    }
    check(el, (items) => {
      const it = find(items, el.dataset.id); if (!it) return;
      const a = activeSubs(it);
      if (a.length) {
        const all = a.every((s) => s.status === 'done');
        a.forEach((s) => { s.status = all ? 'pending' : 'done'; });
      } else {
        it.status = it.status === 'done' ? 'pending' : 'done';
      }
    }, willOn);
  },
  stoggle(el) {
    S.focus = el.id;
    const willOn = el.getAttribute('aria-checked') !== 'true';
    check(el, (items) => {
      const it = find(items, el.dataset.id); if (!it) return;
      const s = find(it.subs, el.dataset.sid);
      if (s) s.status = s.status === 'done' ? 'pending' : 'done';
    }, willOn);
  },
  settings() { S.view = 'settings'; render(); window.scrollTo(0, 0); },
  doneSettings() { S.view = 'day'; render(); window.scrollTo(0, 0); },
  palette(el) { setPref('palette', el.dataset.k); sfx('tick'); render(); },
  mode(el) { setPref('mode', el.dataset.k); render(); },
  pref(el) { setPref(el.dataset.k, !prefs[el.dataset.k]); S.focus = el.id; render(); if (el.dataset.k === 'sound' && prefs.sound) sfx('tick'); },
  preview() { sfx('day'); confetti(); },
  drop(el) {
    const it0 = find(dayItems(S.sel), el.dataset.id);
    const done = undoableDay((it0 && it0.tpl ? 'Omitido hoy: ' : 'Quitado: ') + (it0 ? it0.text : ''));
    mutate(S.sel, (items) => {
      const i = items.findIndex((x) => x.id === el.dataset.id);
      if (i < 0) return;
      if (items[i].tpl) items[i].status = 'skipped'; else items.splice(i, 1);
    });
    done();
  },
  sdrop(el) {
    const p0 = find(dayItems(S.sel), el.dataset.id), s0 = p0 && find(p0.subs, el.dataset.sid);
    const done = undoableDay('Omitido hoy: ' + (s0 ? s0.text : ''));
    mutate(S.sel, (items) => {
      const it = find(items, el.dataset.id); if (!it) return;
      const s = find(it.subs, el.dataset.sid);
      if (s) s.status = 'skipped';
    });
    done();
  },
  fold(el) {
    const id = el.dataset.id;
    if (folded.has(id)) folded.delete(id); else folded.add(id);
    saveFold(); S.focus = null; render();
    const b = root.querySelector('.expander[data-id="' + id.replace(/"/g, '') + '"]'); if (b) b.focus();
  },
  srestore(el) {
    mutate(S.sel, (items) => {
      const it = find(items, el.dataset.id); if (!it) return;
      it.subs.forEach((s) => { if (s.status === 'skipped') s.status = 'pending'; });
    });
  },
  restore(el) {
    mutate(S.sel, (items) => { const it = find(items, el.dataset.id); if (it) it.status = 'pending'; });
  },
  pull() {
    mutate(S.sel, (items) => {
      tplItems().forEach((t) => {
        const it = find(items, t.id);
        if (!it) { items.push(fromTpl(t)); return; }
        it.subs = it.subs || [];
        const wasDone = it.status === 'done' && !activeSubs(it).length;
        (t.subs || []).forEach((s) => {
          if (!find(it.subs, s.id)) it.subs.push({ id: s.id, text: s.text, status: wasDone ? 'done' : 'pending' });
        });
      });
    });
  },
  prev() { goDay(-1); },
  next() { goDay(1); },
  today() { S.sel = todayKey(); render(); },
  pick(el) { S.sel = el.dataset.key; render(); window.scrollTo(0, 0); },
  edit() { S.draftTpl = clone(tplItems()); S.enew = ''; S.sdraft = {}; S.view = 'edit'; render(); window.scrollTo(0, 0); },
  doneEdit() { S.view = 'day'; S.draftTpl = null; render(); window.scrollTo(0, 0); },
  up(el) { const i = +el.dataset.i; if (i < 1) return; swap(S.draftTpl, i - 1, i); S.sdraft = {}; persistTpl(); render(); },
  down(el) { const i = +el.dataset.i; if (i >= S.draftTpl.length - 1) return; swap(S.draftTpl, i + 1, i); S.sdraft = {}; persistTpl(); render(); },
  del(el) { const t = S.draftTpl[+el.dataset.i]; const done = undoableTpl('Eliminado: ' + t.text + (t.subs.length ? ' y sus ' + t.subs.length + ' subítems' : '')); S.draftTpl.splice(+el.dataset.i, 1); S.sdraft = {}; persistTpl(); render(); done(); },
  sup(el) { const i = +el.dataset.i, j = +el.dataset.j; if (j < 1) return; swap(S.draftTpl[i].subs, j - 1, j); persistTpl(); render(); },
  sdel(el) { const sb = S.draftTpl[+el.dataset.i].subs[+el.dataset.j]; const done = undoableTpl('Eliminado: ' + sb.text); S.draftTpl[+el.dataset.i].subs.splice(+el.dataset.j, 1); persistTpl(); render(); done(); },
  signout() { signOutLocal(''); }
};

root.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (el && root.contains(el) && A[el.dataset.act]) A[el.dataset.act](el);
});
root.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target;
  if (f.id === 'form-login') {
    const v = document.getElementById('clave').value;
    if (!v) return;
    clave = v; S.err = ''; S.auth = 'checking'; render();
    refresh().then(() => { lsSet(LS_KEY, clave); }).catch(() => {
      if (S.auth !== 'out') { clave = null; S.auth = 'out'; if (!S.err) S.err = 'No se pudo conectar. Revisá la conexión.'; render(); }
    });
    return;
  }
  if (f.id === 'form-add') {
    const v = S.draft.trim(); if (!v) return;
    S.draft = ''; S.focus = 'add';
    mutate(S.sel, (items) => { items.push({ id: uid(), text: v, status: 'pending', tpl: false, subs: [] }); });
  } else if (f.id === 'form-eadd') {
    const w = S.enew.trim(); if (!w) return;
    S.enew = ''; S.focus = 'e-new';
    S.draftTpl.push({ id: uid(), text: w, subs: [] });
    persistTpl(); render();
  } else if (f.classList.contains('esadd')) {
    const i = +f.dataset.i, sv = (S.sdraft[i] || '').trim(); if (!sv) return;
    S.sdraft[i] = ''; S.focus = 'es-new-' + i;
    S.draftTpl[i].subs.push({ id: uid(), text: sv });
    persistTpl(); render();
  }
});
root.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'add') S.draft = t.value;
  else if (t.id === 'e-new') S.enew = t.value;
  else if (t.id && t.id.indexOf('es-new-') === 0) S.sdraft[+t.dataset.i] = t.value;
  else if (t.classList.contains('eitm') && t.value.trim()) S.draftTpl[+t.dataset.i].text = t.value;
  else if (t.classList.contains('esub') && t.value.trim()) S.draftTpl[+t.dataset.i].subs[+t.dataset.j].text = t.value;
});
root.addEventListener('change', (e) => {
  const t = e.target;
  if (t.classList.contains('eitm')) {
    if (!t.value.trim()) { render(); return; }
    S.draftTpl[+t.dataset.i].text = t.value.trim(); persistTpl();
  } else if (t.classList.contains('esub')) {
    if (!t.value.trim()) { render(); return; }
    S.draftTpl[+t.dataset.i].subs[+t.dataset.j].text = t.value.trim(); persistTpl();
  }
});

/* ================= gestos y teclado ================= */
let touch = null;
root.addEventListener('touchstart', (e) => {
  if (S.view !== 'day' || e.touches.length !== 1 || e.target.closest('input, textarea, .strip')) { touch = null; return; }
  touch = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
}, { passive: true });
root.addEventListener('touchend', (e) => {
  if (!touch) return;
  const t = e.changedTouches[0], dx = t.clientX - touch.x, dy = t.clientY - touch.y, dt = Date.now() - touch.t;
  touch = null;
  if (Math.abs(dx) > 70 && Math.abs(dy) < 45 && dt < 600) goDay(dx < 0 ? 1 : -1);
}, { passive: true });
document.addEventListener('keydown', (e) => {
  if (S.view !== 'day' || S.auth !== 'in' || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target.closest && e.target.closest('input, textarea')) return;
  if (e.key === 'ArrowLeft') goDay(-1);
  else if (e.key === 'ArrowRight') goDay(1);
  else if (e.key === 'Escape') hideToast();
});
function goDay(dir) {
  const next = addDays(S.sel, dir);
  if (next > todayKey() || next < minKey()) return;
  S.sel = next; render();
  if (motionOK()) { root.classList.remove('slide-l', 'slide-r'); void root.offsetWidth; root.classList.add(dir > 0 ? 'slide-l' : 'slide-r'); }
}

/* ================= cambio de día ================= */
function rollover() {
  const tk = todayKey();
  if (tk === S.today) return;
  if (S.sel === S.today) S.sel = tk;
  S.today = tk;
  S.draft = '';
  refresh().catch(() => {});
  render();
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) rollover(); });
window.addEventListener('focus', rollover);
setInterval(rollover, 30000);

/* ================= arranque ================= */
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh().catch(() => {}); });
window.addEventListener('online', () => { refresh().catch(() => {}); });
setInterval(() => { if (!document.hidden) refresh().catch(() => {}); }, 60000);

function init() {
  if (!clave) { S.auth = 'out'; render(); return; }
  if (readCache()) { S.auth = 'in'; S.ready = true; }
  render();
  refresh().catch(() => {
    if (S.auth === 'checking') { S.auth = 'in'; S.ready = true; render(); }
  });
}
init();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });
}
