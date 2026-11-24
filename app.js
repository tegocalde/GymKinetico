/* KINÉTICO · lógica de la aplicación (demo local) */
'use strict';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const NAV = {
  admin: [
    { id: 'dashboard', label: 'Resumen', icon: '◫', title: 'Resumen', kicker: 'PANEL DE CONTROL' },
    { id: 'clients', label: 'Clientes', icon: '◎', title: 'Clientes', kicker: 'GESTIÓN' },
    { id: 'routines', label: 'Rutinas', icon: '▤', title: 'Rutinas asignadas', kicker: 'GESTIÓN' },
    { id: 'library', label: 'Biblioteca', icon: '▶', title: 'Biblioteca de ejercicios', kicker: 'RECURSOS' }
  ],
  client: [
    { id: 'today', label: 'Mi rutina de hoy', icon: '◉', title: 'Mi rutina', kicker: 'TU PLAN' },
    { id: 'progress', label: 'Mi progreso', icon: '▧', title: 'Mi progreso', kicker: 'SEGUIMIENTO' },
    { id: 'therapist', label: 'Mi terapeuta', icon: '✚', title: 'Mi terapeuta', kicker: 'CONTACTO' }
  ]
};

let S = loadState();
let me = null;
let page = 'dashboard';
let builderItems = [];
let editingRoutineId = null;
let libraryQuery = '';
let clientQuery = '';
let toastTimer = null;

/* ── Utilidades ── */
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); }
function asDate(v) { return typeof v === 'string' ? new Date(v + 'T12:00:00') : v; }
function fmtDate(v, opts) { return new Intl.DateTimeFormat('es-DO', opts).format(asDate(v)); }
function shortDate(v) { return fmtDate(v, { day: '2-digit', month: 'short' }).replace('.', ''); }
function longDate(v) {
  const s = fmtDate(v, { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function dowShort(v) { return fmtDate(v, { weekday: 'short' }).replace('.', '').slice(0, 3); }
function exerciseById(id) { return EXERCISES.find((e) => e.id === id); }
function userById(id) { return S.users.find((u) => u.id === id); }
function gifSrc(ex) { return `assets/gifs/${ex.gif}`; }
function pct(n, d) { return d > 0 ? Math.round((n / d) * 100) : 0; }
function activeRoutineFor(clientId) {
  const t = todayYMD();
  return S.routines.find((r) => r.clientId === clientId && r.status === 'activa' && r.startDate <= t && addDays(r.startDate, r.days - 1) >= t)
    || S.routines.find((r) => r.clientId === clientId && r.status === 'activa')
    || null;
}
function routineProgress(r) {
  if (!r) return { done: 0, total: 0, percent: 0, streak: 0 };
  const total = r.days;
  const done = r.completedDays.length;
  let streak = 0;
  let cursor = todayYMD();
  if (!r.completedDays.includes(cursor)) cursor = addDays(cursor, -1);
  while (r.completedDays.includes(cursor)) { streak++; cursor = addDays(cursor, -1); }
  return { done, total, percent: pct(done, total), streak };
}
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}
function showToast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), 3400);
}

/* ══════════════ ACCESO ══════════════ */
function validateField(input) {
  const err = input.dataset.error ? document.getElementById(input.dataset.error) : null;
  const ok = input.checkValidity();
  const touched = input.dataset.touched === '1';
  if (!input.dataset.baseDescribedBy) input.dataset.baseDescribedBy = input.getAttribute('aria-describedby') || '';
  if (err) {
    err.hidden = !(touched && !ok);
    input.setAttribute('aria-describedby', touched && !ok
      ? `${input.dataset.baseDescribedBy} ${err.id}`.trim()
      : input.dataset.baseDescribedBy);
  }
}
function attemptLogin() {
  const email = $('#loginEmail');
  const pass = $('#loginPassword');
  [email, pass].forEach((el) => { el.dataset.touched = '1'; validateField(el); });
  if (!email.checkValidity() || !pass.checkValidity()) { email.reportValidity(); return; }
  const found = S.users.find((u) => (u.email === email.value.trim() || u.loginEmail === email.value.trim()) && u.password === pass.value);
  if (!found) {
    $('#loginError').hidden = false;
    pass.focus();
    return;
  }
  $('#loginError').hidden = true;
  me = found;
  S.session = me.id;
  saveState();
  showApp();
}
function showApp() {
  $('#loginScreen').hidden = true;
  $('#appShell').hidden = false;
  $('#todayLabel').textContent = longDate(todayYMD());
  $('#topAvatar').textContent = me.avatar;
  const side = $('#sideUser');
  side.innerHTML = `<div class="avatar" aria-hidden="true">${esc(me.avatar)}</div><div><strong>${esc(me.name)}</strong><span>${esc(me.role === 'admin' ? me.title : 'Cliente · ' + me.diagnosis)}</span></div>`;
  navigate(NAV[me.role][0].id, { noTransition: true });
}
function logout() {
  S.session = null;
  saveState();
  me = null;
  $('#appShell').hidden = true;
  $('#loginScreen').hidden = false;
  $('#loginForm').reset();
  $$('.error-msg, .form-alert').forEach((el) => { el.hidden = true; });
  $('#loginEmail').focus();
}

/* ══════════════ NAVEGACIÓN ══════════════ */
function renderNav() {
  const items = NAV[me.role];
  $('#sideNav').innerHTML = `<p class="nav-label">${me.role === 'admin' ? 'ESPACIO DEL TERAPEUTA' : 'MI ESPACIO'}</p>` + items.map((n) => {
    let badge = '';
    if (me.role === 'admin' && n.id === 'routines') badge = `<span class="nav-item__badge">${S.routines.length}</span>`;
    return `<button type="button" class="nav-item" data-nav="${n.id}" ${page === n.id ? 'aria-current="page"' : ''}>
      <span class="nav-item__icon" aria-hidden="true">${n.icon}</span><span>${esc(n.label)}</span>${badge}</button>`;
  }).join('');
}
function closeMobileNav() {
  $('.sidebar').classList.remove('is-open');
  $('#menuBtn').setAttribute('aria-expanded', 'false');
  $('#navScrim').hidden = true;
}
function navigate(id, opts = {}) {
  const valid = NAV[me.role].some((n) => n.id === id);
  page = valid ? id : NAV[me.role][0].id;
  const item = NAV[me.role].find((n) => n.id === page);
  $('#topbarTitle').textContent = item.title;
  $('#topbarKicker').textContent = item.kicker;
  renderNav();
  closeMobileNav();
  const render = () => { $('#viewRoot').innerHTML = VIEWS[page](); };
  if (document.startViewTransition && !opts.noTransition) document.startViewTransition(render);
  else render();
}

/* ══════════════ VISTAS ADMIN ══════════════ */
function adminDashboard() {
  const clients = S.users.filter((u) => u.role === 'client');
  const active = S.routines.filter((r) => r.status === 'activa');
  let elapsed = 0, done = 0;
  active.forEach((r) => {
    const daysPassed = Math.min(r.days, Math.max(1, Math.floor((Date.now() - asDate(r.startDate).getTime()) / 86400000) + 1));
    elapsed += daysPassed;
    done += r.completedDays.length;
  });
  const adherence = pct(done, elapsed);
  const bars = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(todayYMD(), i - 6);
    const count = S.routines.reduce((n, r) => n + (r.completedDays.includes(day) ? 1 : 0), 0);
    return { label: dowShort(day), value: 18 + count * 26 + (i % 3) * 7 };
  });
  const recent = [...S.routines].sort((a, b) => b.startDate.localeCompare(a.startDate)).slice(0, 4);
  return `
    <section class="hero-band">
      <div>
        <p class="eyebrow eyebrow--light">HOLA, ${esc(me.name.split(' ').slice(-1)[0])}</p>
        <h2>Tu consulta,<br><span style="color:var(--lime)">en movimiento.</span></h2>
        <p>Tienes <strong>${active.length} rutinas activas</strong> y ${clients.length} clientes en seguimiento. Hoy es un buen día para ajustar algún plan.</p>
        <div class="hero-actions">
          <button type="button" class="btn btn--primary" data-action="new-routine">+ Asignar rutina</button>
          <button type="button" class="btn btn--ghost" data-action="nav" data-id="clients">Ver clientes →</button>
        </div>
      </div>
      <div class="hero-art" aria-hidden="true"><div class="hero-art__arc"></div><div class="hero-art__core">↗<span>RENDIMIENTO</span></div></div>
    </section>
    <div class="stat-grid">
      <article class="stat-card"><div class="stat-card__top"><span class="stat-card__icon">◎</span><span class="stat-card__delta">+2 este mes</span></div><strong>${clients.length}</strong><p>Clientes activos</p></article>
      <article class="stat-card stat-card--mint"><div class="stat-card__top"><span class="stat-card__icon">▤</span><span class="stat-card__delta">${S.routines.filter((r) => r.status === 'programada').length} programadas</span></div><strong>${active.length}</strong><p>Rutinas vigentes</p></article>
      <article class="stat-card stat-card--violet"><div class="stat-card__top"><span class="stat-card__icon">◉</span><span class="stat-card__delta">Últimos 7 días</span></div><strong>${adherence}%</strong><p>Adherencia promedio</p></article>
      <article class="stat-card stat-card--coral"><div class="stat-card__top"><span class="stat-card__icon">✚</span><span class="stat-card__delta stat-card__delta--down">1 pendiente</span></div><strong>12</strong><p>Sesiones esta semana</p></article>
    </div>
    <div class="grid-2">
      <section class="panel">
        <div class="panel__head"><div><h2>Actividad de la semana</h2><p>Días completados por tus clientes</p></div><span class="chip chip--mint">En vivo</span></div>
        <div class="bar-chart">${bars.map((b) => `<div class="bar-chart__col"><div class="bar-chart__bar" style="height:${b.value}%"></div><span class="bar-chart__label">${b.label}</span></div>`).join('')}</div>
      </section>
      <section class="panel">
        <div class="panel__head"><div><h2>Rutinas recientes</h2><p>Últimas asignaciones</p></div><button type="button" class="btn btn--ghost btn--sm" data-action="nav" data-id="routines">Ver todas</button></div>
        <div class="mini-list">${recent.map((r) => {
          const c = userById(r.clientId);
          const p = routineProgress(r);
          return `<div class="mini-row"><div class="avatar" aria-hidden="true">${esc(c.avatar)}</div><div class="mini-row__body"><strong>${esc(r.title)}</strong><span>${esc(c.name)} · ${shortDate(r.startDate)} → ${shortDate(addDays(r.startDate, r.days - 1))}</span></div><span class="mini-row__value">${p.percent}%</span></div>`;
        }).join('')}</div>
      </section>
    </div>
    <div class="section-head"><div><h2>Asignaciones recientes</h2><p>Gestiona el progreso de cada plan</p></div></div>
    ${routinesTable(recent)}`;
}

function clientsView() {
  return `
    <div class="section-head" style="margin-top:0">
      <div><h2>Tus clientes</h2><p>${S.users.filter((u) => u.role === 'client').length} personas en seguimiento</p></div>
      <label class="search-bar"><span aria-hidden="true">⌕</span><input id="clientSearch" type="search" value="${esc(clientQuery)}" placeholder="Buscar cliente…" aria-label="Buscar cliente"></label>
    </div>
    <div id="clientsGrid">${clientsGridHtml()}</div>`;
}
function clientsGridHtml() {
  const list = S.users.filter((u) => u.role === 'client' && (`${u.name} ${u.diagnosis} ${u.sport}`).toLowerCase().includes(clientQuery.toLowerCase()));
  return list.length ? `<div class="client-grid">${list.map((c) => {
      const r = activeRoutineFor(c.id);
      const p = routineProgress(r);
      return `<article class="client-card">
        <div class="client-card__head"><div class="avatar" aria-hidden="true">${esc(c.avatar)}</div><div><strong>${esc(c.name)}</strong><span>${esc(c.sport)} · desde ${shortDate(c.since)}</span></div></div>
        <div class="client-card__meta"><span class="chip chip--warn">${esc(c.diagnosis)}</span><span class="chip">${r ? r.days + ' días' : 'Sin plan'}</span></div>
        <div class="client-card__foot"><small>${r ? `${p.done}/${p.total} días completados` : 'Sin rutina asignada'}</small><strong style="color:var(--lime);font-family:var(--display)">${r ? p.percent + '%' : '—'}</strong></div>
        <div class="line-progress" style="margin-block-start:10px"><i style="width:${p.percent}%"></i></div>
        <div class="client-card__actions">
          <button type="button" class="btn btn--primary btn--sm" data-action="assign" data-id="${c.id}">Asignar rutina</button>
          ${r ? `<button type="button" class="btn btn--ghost btn--sm" data-action="edit-routine" data-id="${r.id}">Editar plan</button>` : ''}
        </div>
      </article>`;
    }).join('')}</div>` : emptyState('◎', 'Sin resultados', 'Prueba con otro nombre o condición.');
}

function routinesTable(list) {
  const rows = list.filter((r) => (`${userById(r.clientId)?.name} ${r.title}`).toLowerCase().includes(clientQuery.toLowerCase()));
  if (!rows.length) return emptyState('▤', 'No hay rutinas', 'Asigna una rutina para verla aquí.');
  return `<div class="panel table-wrap"><table class="data-table">
    <thead><tr><th>Cliente</th><th>Rutina</th><th>Período</th><th>Ejercicios</th><th>Progreso</th><th>Estado</th><th></th></tr></thead>
    <tbody>${rows.map((r) => {
      const c = userById(r.clientId);
      const p = routineProgress(r);
      const chip = r.status === 'programada' ? 'chip--violet' : (r.startDate > todayYMD() ? 'chip--warn' : 'chip--ok');
      return `<tr>
        <td><div class="cell-person"><div class="avatar" aria-hidden="true">${esc(c.avatar)}</div><div><strong>${esc(c.name)}</strong><small>${esc(c.sport)}</small></div></div></td>
        <td><strong>${esc(r.title)}</strong></td>
        <td>${shortDate(r.startDate)} → ${shortDate(addDays(r.startDate, r.days - 1))}<br><small style="color:var(--muted)">${r.days} días</small></td>
        <td>${r.items.length} ejercicios</td>
        <td><div style="display:flex;align-items:center;gap:9px"><div class="line-progress"><i style="width:${p.percent}%"></i></div><span style="font-size:.72rem;color:var(--muted)">${p.percent}%</span></div></td>
        <td><span class="chip ${chip}">${esc(r.status)}</span></td>
        <td><div class="row-actions"><button type="button" class="btn btn--ghost btn--sm" data-action="edit-routine" data-id="${r.id}">Editar</button><button type="button" class="btn btn--danger btn--sm" data-action="delete-routine" data-id="${r.id}" aria-label="Eliminar ${esc(r.title)}">✕</button></div></td>
      </tr>`;
    }).join('')}</tbody></table></div>`;
}
function routinesView() {
  return `<div class="section-head" style="margin-top:0"><div><h2>Rutinas asignadas</h2><p>planes por días calendario, secuencia y repeticiones</p></div>
    <button type="button" class="btn btn--primary" data-action="new-routine">+ Nueva rutina</button></div>
    ${routinesTable([...S.routines].sort((a, b) => b.startDate.localeCompare(a.startDate)))}`;
}
function libraryView() {
  return `<div class="section-head" style="margin-top:0"><div><h2>Biblioteca de ejercicios</h2><p>${EXERCISES.length} demostraciones animadas listas para asignar</p></div>
    <label class="search-bar"><span aria-hidden="true">⌕</span><input id="librarySearchView" type="search" value="${esc(libraryQuery)}" placeholder="Buscar ejercicio…" aria-label="Buscar ejercicio"></label></div>
    <div id="libraryGrid">${libraryGridHtml()}</div>`;
}
function libraryGridHtml() {
  const list = EXERCISES.filter((e) => (`${e.name} ${e.group} ${e.equipment}`).toLowerCase().includes(libraryQuery.toLowerCase()));
  return list.length ? `<div class="exercise-grid">${list.map((e) => `<button type="button" class="exercise-tile" data-action="preview-exercise" data-id="${e.id}">
      <span class="exercise-tile__media"><img src="${gifSrc(e)}" alt="Demostración: ${esc(e.name)}" width="180" height="180" loading="lazy" decoding="async"></span>
      <h3>${esc(e.name)}</h3><p>${esc(e.group)}</p>
      <span class="exercise-tile__tags"><span class="chip chip--mint">${esc(e.equipment)}</span></span>
    </button>`).join('')}</div>` : emptyState('▶', 'Sin resultados', 'Prueba con otro término.');
}

/* ══════════════ VISTAS CLIENTE ══════════════ */
function clientToday() {
  const r = activeRoutineFor(me.id);
  if (!r) return `<div class="empty"><span class="empty__icon">🌱</span><h3>Aún no tienes una rutina activa</h3><p>Cuando tu terapeuta te asigne un plan, aparecerá aquí con cada ejercicio, sus repeticiones y su secuencia.</p></div>`;
  const p = routineProgress(r);
  const t = todayYMD();
  const days = Array.from({ length: r.days }, (_, i) => addDays(r.startDate, i));
  const checks = r.dayChecks?.[t] || [];
  const dayIsDone = r.completedDays.includes(t);
  const therapist = userById('u-admin');
  return `
    <section class="client-hero">
      <div>
        <p class="eyebrow eyebrow--light">MI PLAN DE HOY · ${longDate(t).toUpperCase()}</p>
        <h2>${greeting()}, ${esc(me.name.split(' ')[0])}.<br><span style="color:var(--lime)">Hoy también avanzas.</span></h2>
        <p>Sigue la secuencia, respira y haz cada movimiento con control. Tu cuerpo te lo va a agradecer.</p>
        ${p.streak > 0 ? `<span class="streak">🔥 ${p.streak} ${p.streak === 1 ? 'día' : 'días'} consecutivos</span>` : ''}
      </div>
      <div class="ring-side">
        <div class="progress-ring-wrapper">
          <progress class="progress-ring" value="${p.percent}" max="100" style="--value:${p.percent}" aria-label="Progreso de la rutina" aria-valuetext="${p.done} de ${p.total} días completados"></progress>
          <div class="progress-ring__content" aria-hidden="true"><strong>${p.percent}%</strong><span>completado</span></div>
        </div>
        <div class="ring-side__text"><span>Llevas</span><strong>${p.done} / ${p.total} días</strong><span>de tu plan</span></div>
      </div>
    </section>
    <section class="panel" style="margin-block-start:16px">
      <div class="panel__head"><div><h2>Tu calendario de tratamiento</h2><p>Toca un día para marcarlo como completado</p></div><span class="chip chip--ok">${shortDate(r.startDate)} → ${shortDate(addDays(r.startDate, r.days - 1))}</span></div>
      <div class="day-strip">${days.map((d) => {
        const done = r.completedDays.includes(d);
        const cls = done ? 'day-chip--done' : (d === t ? 'day-chip--today' : (d < t ? 'day-chip--missed' : 'day-chip--future'));
        return `<button type="button" class="day-chip ${cls}" data-action="toggle-day" data-date="${d}" ${d > t ? 'disabled' : ''} aria-pressed="${done}" aria-label="${longDate(d)}: ${done ? 'completado' : 'pendiente'}">
          <small>${dowShort(d)}</small><strong>${asDate(d).getDate()}</strong><small>${done ? '✓' : (d === t ? 'hoy' : '·')}</small>
        </button>`;
      }).join('')}</div>
    </section>
    <div class="routine-head">
      <div><p class="eyebrow">SECUENCIA DE EJERCICIOS</p><h2>${esc(r.title)}</h2><p>${r.items.length} ejercicios · ${r.days} días calendario · ${esc(therapist.name)}</p></div>
      <div class="routine-head__meta"><span class="chip chip--mint">${dayIsDone ? 'Día completado ✓' : 'En curso'}</span><span class="chip">${esc(me.diagnosis)}</span></div>
    </div>
    <div class="exercise-list">${[...r.items].sort((a, b) => a.order - b.order).map((item, idx) => {
      const ex = exerciseById(item.exerciseId);
      if (!ex) return '';
      const checked = dayIsDone || checks.includes(ex.id);
      return `<article class="exercise-card ${checked ? 'is-done' : ''}">
        <button type="button" class="exercise-card__media" data-action="zoom-exercise" data-id="${ex.id}" data-order="${idx + 1}" data-sets="${item.sets}" data-reps="${item.reps}" data-note="${esc(item.note || ex.tip)}" aria-label="Ampliar demostración de ${esc(ex.name)}"><img src="${gifSrc(ex)}" alt="Demostración animada: ${esc(ex.name)}" width="180" height="180" loading="lazy" decoding="async"><span class="exercise-card__order">${idx + 1}</span></button>
        <div class="exercise-card__body">
          <h3>${esc(ex.name)}</h3><p>${esc(ex.group)} · ${esc(ex.equipment)}</p>
          <div class="exercise-card__sets"><span class="set-pill"><b>${item.sets}</b> series</span><span class="set-pill"><b>${item.reps}</b> ${/seg|30/.test(item.note) ? 'seg' : 'repeticiones'}</span></div>
          ${item.note ? `<p class="exercise-card__tip">✦ ${esc(item.note)}</p>` : `<p class="exercise-card__tip">✦ ${esc(ex.tip)}</p>`}
        </div>
        <div class="exercise-card__action">
          <button type="button" class="check-btn" data-action="toggle-exercise" data-id="${ex.id}" aria-pressed="${checked}">${checked ? '✓ Hecho' : 'Marcar hecho'}</button>
          <small>Selecciona al terminar</small>
        </div>
      </article>`;
    }).join('')}</div>
    ${r.notes ? `<section class="panel" style="margin-block-start:18px"><div class="panel__head"><h2>Nota de tu terapeuta</h2><span class="chip chip--violet">✚ ${esc(therapist.name)}</span></div><p style="font-size:.86rem;color:var(--muted)">${esc(r.notes)}</p></section>` : ''}`;
}
function clientProgress() {
  const r = activeRoutineFor(me.id);
  const p = routineProgress(r);
  const t = todayYMD();
  const now = asDate(t);
  const year = now.getFullYear(), month = now.getMonth();
  const first = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: first }, () => '<div class="calendar-cell calendar-cell--pad"></div>'),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = ymd(new Date(year, month, i + 1));
      const done = r?.completedDays.includes(d);
      const cls = done ? 'calendar-cell--done' : (d === t ? 'calendar-cell--today' : (d < t && r?.startDate <= d ? 'calendar-cell--missed' : 'calendar-cell--future'));
      return `<div class="calendar-cell ${cls}" title="${longDate(d)}" aria-label="${longDate(d)}: ${done ? 'completado' : 'sin completar'}">${i + 1}</div>`;
    })
  ];
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(t, i - 6);
    const v = S.routines.reduce((n, x) => n + (x.completedDays.includes(d) ? 1 : 0), 0);
    return { label: dowShort(d), value: 12 + v * 30 + (i % 2) * 8 };
  });
  const mine = S.routines.filter((x) => x.clientId === me.id);
  return `
    <div class="section-head" style="margin-top:0"><div><h2>Tu progreso</h2><p>Cada día cuenta. Así va tu recuperación.</p></div><span class="chip chip--ok">${esc(me.name)}</span></div>
    <div class="stat-grid">
      <article class="stat-card"><div class="stat-card__top"><span class="stat-card__icon">✓</span></div><strong>${p.done}</strong><p>Días completados</p></article>
      <article class="stat-card stat-card--coral"><div class="stat-card__top"><span class="stat-card__icon">🔥</span></div><strong>${p.streak}</strong><p>Racha actual</p></article>
      <article class="stat-card stat-card--violet"><div class="stat-card__top"><span class="stat-card__icon">◉</span></div><strong>${p.percent}%</strong><p>Plan completado</p></article>
      <article class="stat-card stat-card--mint"><div class="stat-card__top"><span class="stat-card__icon">▶</span></div><strong>${r?.items.length || 0}</strong><p>Ejercicios en tu plan</p></article>
    </div>
    <div class="grid-2">
      <section class="panel"><div class="panel__head"><div><h2>${fmtDate(t, { month: 'long', year: 'numeric' })}</h2><p>Verde = día completado</p></div></div>
        <div class="calendar-grid">${['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((d) => `<div class="calendar-grid__dow">${d}</div>`).join('')}${cells.join('')}</div>
      </section>
      <section class="panel"><div class="panel__head"><div><h2>Últimos 7 días</h2><p>Constancia en tu tratamiento</p></div></div>
        <div class="bar-chart">${week.map((b) => `<div class="bar-chart__col"><div class="bar-chart__bar" style="height:${b.value}%"></div><span class="bar-chart__label">${b.label}</span></div>`).join('')}</div>
      </section>
    </div>
    <div class="section-head"><h2>Historial de planes</h2></div>
    ${mine.length ? `<div class="mini-list">${mine.map((x) => `<div class="mini-row"><div class="mini-row__body"><strong>${esc(x.title)}</strong><span>${shortDate(x.startDate)} → ${shortDate(addDays(x.startDate, x.days - 1))} · ${x.items.length} ejercicios</span></div><span class="mini-row__value">${routineProgress(x).percent}%</span></div>`).join('')}</div>` : emptyState('▧', 'Sin planes aún', 'Tu terapeuta los agregará aquí.')}`;
}
function clientTherapist() {
  const th = userById('u-admin');
  return `
    <div class="section-head" style="margin-top:0"><div><h2>Tu equipo de cuidado</h2><p>Estamos contigo en cada etapa del proceso.</p></div></div>
    <section class="panel therapist-card">
      <div class="avatar" aria-hidden="true">${esc(th.avatar)}</div>
      <div class="therapist-card__body"><h2>${esc(th.name)}</h2><p>${esc(th.title)} · ${esc(th.clinic)}</p>
        <dl><dt>Teléfono</dt><dd>${esc(th.phone)}</dd><dt>Especialidad</dt><dd>Terapia física deportiva y masajes</dd><dt>Modalidad</dt><dd>Presencial y seguimiento virtual</dd></dl>
      </div>
      <button type="button" class="btn btn--primary" data-action="open-message">✉ Escribir mensaje</button>
    </section>
    <div class="info-grid">
      <div class="info-tile"><span>Próxima sesión</span><strong>${shortDate(addDays(todayYMD(), 2))}</strong></div>
      <div class="info-tile"><span>Duración</span><strong>50 min</strong></div>
      <div class="info-tile"><span>Tu condición</span><strong style="font-size:1rem">${esc(me.diagnosis)}</strong></div>
      <div class="info-tile"><span>Contacto</span><strong style="font-size:1rem">${esc(th.phone)}</strong></div>
    </div>
    <section class="panel" style="margin-block-start:16px">
      <div class="panel__head"><div><h2>¿Cómo te has sentido?</h2><p>Cuéntale a tu terapeuta; eso ayuda a ajustar tu rutina.</p></div></div>
      <button type="button" class="btn btn--ghost" data-action="open-message">Enviar un mensaje →</button>
    </section>`;
}
function emptyState(icon, title, text) {
  return `<div class="empty"><span class="empty__icon" aria-hidden="true">${icon}</span><h3>${esc(title)}</h3><p>${esc(text)}</p></div>`;
}

const VIEWS = {
  dashboard: adminDashboard, clients: clientsView, routines: routinesView, library: libraryView,
  today: clientToday, progress: clientProgress, therapist: clientTherapist
};

/* ══════════════ CONSTRUCTOR DE RUTINAS ══════════════ */
function openRoutineDialog(clientId, routineId = null) {
  editingRoutineId = routineId;
  const r = routineId ? S.routines.find((x) => x.id === routineId) : null;
  const select = $('#routineClient');
  select.innerHTML = S.users.filter((u) => u.role === 'client').map((u) => `<option value="${u.id}">${esc(u.name)} · ${esc(u.diagnosis)}</option>`).join('');
  select.value = r?.clientId || clientId || select.options[0].value;
  $('#routineTitle').value = r?.title || 'Nueva rutina';
  $('#routineStart').value = r?.startDate || todayYMD();
  $('#routineDays').value = r?.days || 21;
  $('#routineNotes').value = r?.notes || '';
  $('#librarySearch').value = '';
  libraryQuery = '';
  builderItems = r ? r.items.map((it, i) => ({ ...it, order: i })) : [];
  $('#routineDialogTitle').textContent = r ? 'Editar rutina' : 'Asignar rutina';
  renderLibraryPicker();
  renderSelected();
  $('#routineDialog').showModal();
  $('#routineTitle').focus();
}
function renderLibraryPicker() {
  const list = EXERCISES.filter((e) => (`${e.name} ${e.group} ${e.equipment}`).toLowerCase().includes(libraryQuery.toLowerCase()));
  $('#libraryCount').textContent = `${list.length} disponibles`;
  $('#libraryPicker').innerHTML = list.map((e) => `<div class="library-item">
    <img src="${gifSrc(e)}" alt="" width="44" height="44" loading="lazy" decoding="async">
    <div class="library-item__body"><strong>${esc(e.name)}</strong><span>${esc(e.group)} · ${esc(e.equipment)}</span></div>
    <button type="button" class="btn btn--primary btn--sm btn--add" data-action="add-exercise" data-id="${e.id}" aria-label="Agregar ${esc(e.name)} a la secuencia">+</button>
  </div>`).join('') || '<p style="font-size:.78rem;color:var(--muted);padding:10px">No hay ejercicios con ese nombre.</p>';
}
function syncBuilderInputs() {
  $$('.selected-item').forEach((el, i) => {
    if (!builderItems[i]) return;
    builderItems[i].sets = Math.max(1, Number($('[data-field="sets"]', el).value) || 1);
    builderItems[i].reps = Math.max(1, Number($('[data-field="reps"]', el).value) || 1);
    builderItems[i].note = $('[data-field="note"]', el)?.value || '';
  });
}
function renderSelected() {
  const el = $('#selectedExercises');
  $('#selectedCount').textContent = `${builderItems.length} ej.`;
  el.innerHTML = builderItems.map((it, i) => {
    const ex = exerciseById(it.exerciseId);
    return `<div class="selected-item" data-index="${i}">
      <span class="selected-item__order">${i + 1}</span>
      <div class="selected-item__body"><strong>${esc(ex.name)}</strong>
        <div class="selected-item__inputs">
          <label>Series<input type="number" min="1" max="20" value="${it.sets}" data-field="sets" aria-label="Series de ${esc(ex.name)}"></label>
          <label>Reps<input type="number" min="1" max="200" value="${it.reps}" data-field="reps" aria-label="Repeticiones de ${esc(ex.name)}"></label>
        </div>
      </div>
      <div class="selected-item__tools">
        <button type="button" data-action="move-up" data-index="${i}" aria-label="Subir ${esc(ex.name)}" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button type="button" data-action="move-down" data-index="${i}" aria-label="Bajar ${esc(ex.name)}" ${i === builderItems.length - 1 ? 'disabled' : ''}>↓</button>
        <button type="button" data-action="remove-exercise" data-index="${i}" aria-label="Quitar ${esc(ex.name)}">✕</button>
      </div>
    </div>`;
  }).join('') || '<p style="font-size:.78rem;color:var(--muted);padding:12px;border:1px dashed var(--line-strong);border-radius:11px">Agrega ejercicios desde la biblioteca. El orden define la secuencia.</p>';
  updateSummary();
}
function updateSummary() {
  const start = $('#routineStart').value;
  const days = Math.max(1, Number($('#routineDays').value) || 1);
  const end = start ? addDays(start, days - 1) : '—';
  $('#routineSummary').innerHTML = `<strong>${builderItems.length}</strong> ejercicios · <strong>${days}</strong> días calendario · ${start ? `${shortDate(start)} → ${shortDate(end)}` : ' elige una fecha'}`;
}
function saveRoutine(e) {
  e.preventDefault();
  const client = $('#routineClient').value;
  const title = $('#routineTitle').value.trim();
  const start = $('#routineStart').value;
  const days = Math.max(1, Math.min(90, Number($('#routineDays').value) || 1));
  syncBuilderInputs();
  if (!title || !start || !builderItems.length) {
    showToast('Completa el nombre, la fecha y agrega al menos un ejercicio.');
    return;
  }
  const items = builderItems.map((it, i) => ({ exerciseId: it.exerciseId, sets: it.sets, reps: it.reps, note: it.note || '', order: i }));
  const existing = editingRoutineId ? S.routines.find((r) => r.id === editingRoutineId) : null;
  if (existing) {
    Object.assign(existing, { clientId: client, title, startDate: start, days, notes: $('#routineNotes').value.trim(), items });
  } else {
    S.routines.push({
      id: `r-${Date.now()}`, clientId: client, title, startDate: start, days,
      status: start > todayYMD() ? 'programada' : 'activa', createdAt: todayYMD(),
      notes: $('#routineNotes').value.trim(), items, completedDays: [], dayChecks: {}
    });
  }
  saveState();
  $('#routineDialog').close();
  showToast(existing ? 'Rutina actualizada correctamente.' : 'Rutina asignada al cliente.');
  navigate('routines');
}
function openExerciseDialog(id, details = null) {
  const ex = exerciseById(id);
  if (!ex) return;
  $('#exerciseDialogTitle').textContent = ex.name;
  $('#exercisePreview').innerHTML = `
    <div class="exercise-preview__stage">
      <img src="${gifSrc(ex)}" alt="Demostración animada ampliada: ${esc(ex.name)}" width="180" height="180" loading="lazy">
    </div>
    <div>
      <h3>${esc(ex.name)}</h3>
      <div class="exercise-preview__meta">
        <span class="chip chip--mint">${esc(ex.group)}</span>
        <span class="chip">${esc(ex.equipment)}</span>
        ${details ? `<span class="chip chip--ok">${esc(details.order)}° en la secuencia</span><span class="chip chip--violet">${esc(details.sets)} series × ${esc(details.reps)} reps</span>` : ''}
      </div>
    </div>
    <p class="tip">✦ ${esc(details?.note || ex.tip)}</p>`;
  $('#exerciseDialog').showModal();
}

/* ══════════════ ACCIONES ══════════════ */
function handleAction(action, el) {
  const id = el.dataset.id;
  switch (action) {
    case 'nav': navigate(id); break;
    case 'new-routine': openRoutineDialog(null); break;
    case 'assign': openRoutineDialog(id); break;
    case 'edit-routine': {
      const r = S.routines.find((x) => x.id === id);
      if (r) openRoutineDialog(r.clientId, r.id);
      break;
    }
    case 'delete-routine': {
      const r = S.routines.find((x) => x.id === id);
      if (r && confirm(`¿Eliminar la rutina "${r.title}"?`)) {
        S.routines = S.routines.filter((x) => x.id !== id);
        saveState();
        navigate('routines');
        showToast('Rutina eliminada.');
      }
      break;
    }
    case 'preview-exercise': openExerciseDialog(id); break;
    case 'zoom-exercise': openExerciseDialog(id, { order: el.dataset.order, sets: el.dataset.sets, reps: el.dataset.reps, note: el.dataset.note }); break;
    case 'add-exercise': {
      syncBuilderInputs();
      if (!builderItems.some((it) => it.exerciseId === id)) builderItems.push({ exerciseId: id, sets: 3, reps: 12, note: '', order: builderItems.length });
      renderSelected();
      break;
    }
    case 'remove-exercise': syncBuilderInputs(); builderItems.splice(Number(el.dataset.index), 1); renderSelected(); break;
    case 'move-up': {
      syncBuilderInputs(); const i = Number(el.dataset.index);
      if (i > 0) { [builderItems[i - 1], builderItems[i]] = [builderItems[i], builderItems[i - 1]]; renderSelected(); }
      break;
    }
    case 'move-down': {
      syncBuilderInputs(); const i = Number(el.dataset.index);
      if (i < builderItems.length - 1) { [builderItems[i + 1], builderItems[i]] = [builderItems[i], builderItems[i + 1]]; renderSelected(); }
      break;
    }
    case 'toggle-day': {
      const r = activeRoutineFor(me.id);
      if (!r) break;
      const date = el.dataset.date;
      r.dayChecks = r.dayChecks || {};
      if (r.completedDays.includes(date)) {
        r.completedDays = r.completedDays.filter((d) => d !== date);
        r.dayChecks[date] = [];
      } else {
        r.completedDays.push(date);
        r.dayChecks[date] = r.items.map((it) => it.exerciseId);
      }
      saveState(); navigate('today', { noTransition: true });
      showToast(r.completedDays.includes(date) ? '¡Día completado! Excelente trabajo.' : 'Día marcado como pendiente.');
      break;
    }
    case 'toggle-exercise': {
      const r = activeRoutineFor(me.id);
      if (!r) break;
      const t = todayYMD();
      r.dayChecks = r.dayChecks || {};
      const checks = new Set(r.dayChecks[t] || []);
      if (r.completedDays.includes(t)) {
        r.completedDays = r.completedDays.filter((d) => d !== t);
        checks.clear();
      }
      if (checks.has(id)) checks.delete(id); else checks.add(id);
      r.dayChecks[t] = [...checks];
      if (r.items.every((it) => checks.has(it.exerciseId))) {
        r.completedDays.push(t);
        showToast('¡Rutina del día completada! 🔥');
      }
      saveState(); navigate('today', { noTransition: true });
      break;
    }
    case 'open-message': $('#messageDialog').showModal(); $('#messageText').focus(); break;
  }
}

/* ══════════════ EVENTOS ══════════════ */
document.addEventListener('click', (e) => {
  const actionEl = e.target.closest('[data-action]');
  if (actionEl) handleAction(actionEl.dataset.action, actionEl);
  const closeEl = e.target.closest('[data-close-dialog]');
  if (closeEl) document.getElementById(closeEl.dataset.closeDialog).close();
  const demoEl = e.target.closest('[data-demo]');
  if (demoEl) {
    $('#loginEmail').value = demoEl.dataset.demo === 'admin' ? 'admin@kinetico.do' : 'cliente@kinetico.do';
    $('#loginPassword').value = 'demo1234';
    attemptLogin();
  }
  const navEl = e.target.closest('[data-nav]');
  if (navEl) navigate(navEl.dataset.nav);
  if (e.target.closest('#logoutBtn')) logout();
  if (e.target.closest('#menuBtn')) {
    const open = $('.sidebar').classList.toggle('is-open');
    $('#menuBtn').setAttribute('aria-expanded', String(open));
    $('#navScrim').hidden = !open;
  }
  if (e.target.closest('#navScrim')) closeMobileNav();
  if (e.target.closest('#notificationBtn')) showToast('Tienes recordatorios de 2 sesiones próximas.');
  if (e.target.closest('#togglePassword')) {
    const input = $('#loginPassword');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    $('#togglePassword').textContent = show ? '🙈' : '👁';
    $('#togglePassword').setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
  }
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.matches('#loginEmail, #loginPassword')) { t.dataset.touched = '1'; validateField(t); $('#loginError').hidden = true; }
  else if (t.id === 'clientSearch') { clientQuery = t.value; $('#clientsGrid').innerHTML = clientsGridHtml(); }
  else if (t.id === 'librarySearchView') { libraryQuery = t.value; $('#libraryGrid').innerHTML = libraryGridHtml(); }
  else if (t.id === 'librarySearch') { libraryQuery = t.value; renderLibraryPicker(); }
  else if (t.matches('#routineStart, #routineDays')) updateSummary();
  else if (t.closest('.selected-item')) { syncBuilderInputs(); updateSummary(); }
});
document.addEventListener('change', (e) => {
  if (e.target.matches('#loginEmail, #loginPassword')) { e.target.dataset.touched = '1'; validateField(e.target); }
  if (e.target.closest('.selected-item')) { syncBuilderInputs(); updateSummary(); }
});
document.addEventListener('focusout', (e) => {
  if (e.target.matches('#loginEmail, #loginPassword')) { e.target.dataset.touched = '1'; validateField(e.target); }
});

$('#loginForm').addEventListener('submit', (e) => { e.preventDefault(); attemptLogin(); });
$('#routineForm').addEventListener('submit', saveRoutine);
$('#messageForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = $('#messageText').value.trim();
  if (!text) return;
  S.messages.push({ from: me.id, to: 'u-admin', text, date: todayYMD() });
  saveState();
  $('#messageForm').reset();
  $('#messageDialog').close();
  showToast('Mensaje enviado a tu terapeuta.');
});

/* ── Inicio ── */
$('#todayLabel').textContent = longDate(todayYMD());
if (S.session && userById(S.session)) {
  me = userById(S.session);
  showApp();
}
