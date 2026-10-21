const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TOTAL_STEPS = 5;

const state = { step: 1, roomId: '', date: '', start: null, end: null, files: {}, materials: {} };
const room = () => ROOMS.find(r => r.id === state.roomId);
const situation = () => SITUATIONS[$('situation').value];

/* ---------- Navigation ---------- */
function goTo(n) {
  state.step = n;
  document.querySelectorAll('.step').forEach(s => s.classList.toggle('on', +s.dataset.step === n));
  document.querySelectorAll('#stepper li').forEach((li, i) => {
    li.classList.toggle('done', i + 1 < n);
    li.classList.toggle('current', i + 1 === n);
    li.toggleAttribute('aria-current', i + 1 === n);
  });
  $('prev').hidden = n === 1;
  $('next').textContent = n === TOTAL_STEPS ? 'Valider ma demande' : 'Étape suivante';
  if (n === 3) renderMaterials();
  if (n === 4) renderDocs();
  if (n === 5) renderRecap();
  if (state.started) $('stepper').scrollIntoView({ behavior: 'smooth', block: 'start' });
  state.started = true;
}

function setErr(id, msg) {
  const el = $('err-' + id); if (!el) return !msg;
  el.textContent = msg || '';
  el.closest('.field')?.classList.toggle('invalid', !!msg);
  return !msg;
}

/* ---------- Étape 1 : salle, date, horaires ---------- */
$('rooms').innerHTML = ROOMS.map(r => `
  <button type="button" class="room" data-id="${r.id}" aria-pressed="false">
    <img src="assets/salle.svg" alt="">
    <b>${esc(r.name)}</b><span>${r.capacity} personnes max.</span>${r.note ? `<em>${esc(r.note)}</em>` : ''}
  </button>`).join('');

$('rooms').addEventListener('click', e => {
  const b = e.target.closest('.room'); if (!b) return;
  state.roomId = b.dataset.id;
  document.querySelectorAll('.room').forEach(x => x.setAttribute('aria-pressed', x === b));
  setErr('room', '');
  const cap = room().capacity;
  $('people').max = cap;
  $('people-hint').textContent = `Capacité de cette salle : ${cap} personnes maximum.`;
  if ($('people').value > cap) $('people').value = cap;
  if (state.date && isDayFull(state.roomId, state.date)) state.date = '';
  renderCal(); renderTimes();
});

const today = new Date(); today.setHours(0, 0, 0, 0);
let view = new Date(today.getFullYear(), today.getMonth(), 1);

function renderCal() {
  const first = new Date(view), monthName = first.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const lead = (first.getDay() + 6) % 7, days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const canPrev = view > new Date(today.getFullYear(), today.getMonth(), 1);
  let cells = ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => `<div class="dow">${d}</div>`).join('') + '<div></div>'.repeat(lead);
  for (let d = 1; d <= days; d++) {
    const dt = new Date(view.getFullYear(), view.getMonth(), d), key = iso(dt);
    const past = dt < today, full = state.roomId && !past && isDayFull(state.roomId, key);
    const off = past || full || !state.roomId;
    cells += `<button type="button" data-date="${key}" ${off ? 'disabled' : ''} class="${full ? 'full' : ''}" aria-pressed="${key === state.date}" ${full ? 'title="Complet"' : ''}>${d}</button>`;
  }
  $('cal').innerHTML = `<div class="cal-head"><button type="button" id="cprev" ${canPrev ? '' : 'disabled'} aria-label="Mois précédent">‹</button>
    <span>${monthName}</span><button type="button" id="cnext" aria-label="Mois suivant">›</button></div><div class="cal-grid">${cells}</div>`;
}
$('cal').addEventListener('click', e => {
  if (e.target.id === 'cprev') { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); renderCal(); }
  else if (e.target.id === 'cnext') { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); renderCal(); }
  else if (e.target.dataset.date) { state.date = e.target.dataset.date; setErr('date', ''); renderCal(); renderTimes(); }
});

function fillSelect(sel, values, current) {
  sel.innerHTML = values.map(v => `<option value="${v}">${fmtTime(v)}</option>`).join('');
  sel.value = values.includes(current) ? current : values[0];
}
function renderTimes() {
  const ready = state.roomId && state.date;
  $('start').disabled = $('end').disabled = !ready;
  if (!ready) { $('start').innerHTML = $('end').innerHTML = ''; state.start = state.end = null; return; }
  const starts = startOptions(state.roomId, state.date);
  fillSelect($('start'), starts, state.start);
  state.start = +$('start').value;
  renderEnd();
}
function renderEnd() {
  const ends = endOptions(state.roomId, state.date, state.start);
  fillSelect($('end'), ends, state.end);
  state.end = +$('end').value;
}
$('start').addEventListener('change', () => { state.start = +$('start').value; renderEnd(); });
$('end').addEventListener('change', () => { state.end = +$('end').value; });

function validate1() {
  let ok = true;
  ok = setErr('room', state.roomId ? '' : 'Choisissez une salle.') && ok;
  ok = setErr('date', state.date ? '' : 'Choisissez une date disponible.') && ok;
  const n = +$('people').value;
  let m = '';
  if (!$('people').value) m = 'Indiquez le nombre de participants.';
  else if (!Number.isInteger(n) || n < 1) m = 'Nombre invalide.';
  else if (n > MAX_CAPACITY) m = `Maximum ${MAX_CAPACITY} participants.`;
  else if (state.roomId && n > room().capacity) m = `Cette salle accueille ${room().capacity} personnes maximum.`;
  ok = setErr('people', m) && ok;
  ok = setErr('desc', $('desc').value.trim() ? '' : 'Décrivez brièvement la manifestation.') && ok;
  return ok;
}

/* ---------- Étape 2 : informations ---------- */
$('situation').insertAdjacentHTML('beforeend', Object.entries(SITUATIONS).map(([k, s]) => `<option value="${k}">${s.label}</option>`).join(''));

function applySituation() {
  const s = situation(), isPart = $('situation').value === 'particulier';
  $('local-wrap').hidden = !s?.localLabel;
  if (s?.localLabel) $('local-label').textContent = s.localLabel;
  if (!s?.localLabel) $('local').checked = false;
  $('entity-block').hidden = isPart;
  $('siret-block').hidden = !s?.siret;
  $('siret-opt').hidden = !!s?.siretRequired;
  $('entity-label').textContent = 'Nom de l’' + (s && $('situation').value === 'association' ? 'association' : 'entité');
}
$('situation').addEventListener('change', () => { state.files = {}; applySituation(); });
applySituation();

const validSiret = v => { const x = v.replace(/\s/g, ''); return /^\d{14}$/.test(x) || /^W\d{9}$/i.test(x); };

function validate2() {
  let ok = true;
  const s = situation(), req = (id, msg) => { ok = setErr(id, $(id).value.trim() ? '' : msg) && ok; };
  ok = setErr('situation', s ? '' : 'Précisez votre situation.') && ok;
  if (s && $('situation').value !== 'particulier') req('entity', 'Indiquez le nom de l’entité.');
  req('address', 'Indiquez votre adresse.');
  if (s?.siret) {
    const v = $('siret').value.trim();
    ok = setErr('siret', !v ? (s.siretRequired ? 'Le n° SIRET ou RNA est obligatoire.' : '')
      : validSiret(v) ? '' : 'Format invalide : 14 chiffres (SIRET) ou W suivi de 9 chiffres (RNA).') && ok;
  }
  req('lastname', 'Indiquez votre nom.'); req('firstname', 'Indiquez votre prénom.');
  ok = setErr('email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($('email').value.trim()) ? '' : 'Courriel invalide.') && ok;
  ok = setErr('phone', /^(\+?\d[\s.\-]?){9,14}$/.test($('phone').value.trim()) ? '' : 'Numéro de téléphone invalide.') && ok;
  return ok;
}

/* ---------- Étape 3 : matériel ---------- */
const isLocal = () => $('local').checked;
// Prêt réservé aux habitants et associations de Lacroix-Falgarde
const canBorrow = () => ['particulier', 'association'].includes($('situation').value) && isLocal();

function renderMaterials() {
  const foyer = state.roomId === 'foyer', borrow = canBorrow();
  $('mat-msg').innerHTML = borrow ? '' :
    '<div class="alert">Le prêt de tables, bancs, barnums et barrières est réservé aux habitants et aux associations de Lacroix-Falgarde.</div>';
  $('materials').innerHTML = MATERIALS.map(m => {
    const allowed = m.foyerOnly ? foyer : borrow;
    if (!allowed) delete state.materials[m.id];
    const qty = state.materials[m.id];
    return `<div class="mat ${allowed ? '' : 'off'}">
      <input type="checkbox" id="m-${m.id}" data-id="${m.id}" ${allowed ? '' : 'disabled'} ${qty ? 'checked' : ''}>
      <label for="m-${m.id}">${esc(m.name)}<small>${m.foyerOnly ? 'Uniquement avec la location du Foyer rural' : `${m.dims} cm · ${m.total} disponibles`}</small></label>
      ${m.foyerOnly ? '<span></span>' : `<input type="number" min="1" max="${m.total}" value="${qty || 1}" data-qty="${m.id}" aria-label="Quantité ${esc(m.name)}" ${allowed && qty ? '' : 'disabled'}>`}
    </div>`;
  }).join('');
}
$('materials').addEventListener('change', e => {
  const id = e.target.dataset.id || e.target.dataset.qty, m = MATERIALS.find(x => x.id === id); if (!m) return;
  const qty = document.querySelector(`[data-qty="${id}"]`);
  if (e.target.dataset.id) {
    if (qty) qty.disabled = !e.target.checked;
    if (e.target.checked) state.materials[id] = m.foyerOnly ? 1 : +qty.value; else delete state.materials[id];
  } else if (state.materials[id]) state.materials[id] = Math.min(m.total, Math.max(1, Math.floor(+qty.value) || 1));
  if (qty && state.materials[id]) qty.value = state.materials[id];
  setErr('materials', '');
});

/* ---------- Étape 4 : justificatifs ---------- */
function renderDocs() {
  const s = situation(), docs = s.docs;
  $('docs-msg').innerHTML = docs.length ? '' :
    '<div class="alert">Aucun justificatif n’est exigé pour une personne morale de droit public. Vous pouvez passer à l’étape suivante.</div>';
  $('docs').innerHTML = docs.map(d => `<li><b>${DOCS[d]}</b> <span class="note">— obligatoire</span>
    <div class="field"><input type="file" id="file-${d}" data-doc="${d}" accept=".pdf,.jpg,.jpeg,.png" aria-label="${esc(DOCS[d])}">
    <div class="hint">${state.files[d] ? 'Fichier : ' + esc(state.files[d].name) : 'PDF, JPG ou PNG – 5 Mo maximum.'}</div><div class="err" id="err-file-${d}"></div></div></li>`).join('');
}
$('docs').addEventListener('change', e => {
  const d = e.target.dataset.doc; if (!d) return;
  const f = e.target.files[0];
  if (f && f.size > 5 * 1024 * 1024) { e.target.value = ''; delete state.files[d]; setErr('file-' + d, 'Fichier trop volumineux (5 Mo max).'); return; }
  if (f) state.files[d] = f; else delete state.files[d];
  setErr('file-' + d, '');
});
function validate4() {
  let ok = true;
  situation().docs.forEach(d => { ok = setErr('file-' + d, state.files[d] ? '' : 'Ce justificatif est obligatoire.') && ok; });
  return ok;
}

/* ---------- Étape 5 : récapitulatif ---------- */
function renderRecap() {
  const s = situation(), r = room(), row = (k, v) => v ? `<dt>${k}</dt><dd>${esc(v)}</dd>` : '';
  const mats = Object.entries(state.materials).map(([id, q]) => {
    const m = MATERIALS.find(x => x.id === id); return `${m.name}${m.foyerOnly ? '' : ' × ' + q}`;
  });
  const block = (title, step, rows) => `<div class="recap"><h3>${title}<button type="button" data-goto="${step}">Modifier</button></h3><dl>${rows}</dl></div>`;
  $('recap').innerHTML =
    block('Salle et horaires', 1,
      row('Salle', `${r.name} — ${r.address}`) + row('Date', fmtDate(state.date)) +
      row('Horaires', `${fmtTime(state.start)} → ${fmtTime(state.end)}`) +
      row('Participants', $('people').value) + row('Manifestation', $('desc').value.trim())) +
    block('Demandeur', 2,
      row('Situation', s.label + (isLocal() ? ' (Lacroix-Falgarde)' : '')) +
      row('Nom de l’entité', $('entity').value.trim()) + row('Adresse', $('address').value.trim()) +
      row('SIRET / RNA', s.siret ? $('siret').value.trim() : '') +
      row('Contact', `${$('firstname').value.trim()} ${$('lastname').value.trim()}`) +
      row('Courriel', $('email').value.trim()) + row('Téléphone', $('phone').value.trim())) +
    block('Matériel', 3, mats.length ? `<dt>Sélection</dt><dd>${mats.map(esc).join('<br>')}</dd>` : '<dt>Sélection</dt><dd>Aucun matériel</dd>') +
    block('Justificatifs', 4, s.docs.length
      ? s.docs.map(d => row(DOCS[d], state.files[d]?.name)).join('') : '<dt>Justificatifs</dt><dd>Aucun requis</dd>');
}
$('recap').addEventListener('click', e => { if (e.target.dataset.goto) goTo(+e.target.dataset.goto); });

/* ---------- Boutons ---------- */
$('prev').addEventListener('click', () => goTo(state.step - 1));
$('next').addEventListener('click', () => {
  const v = { 1: validate1, 2: validate2, 3: () => true, 4: validate4, 5: () => setErr('confirm', $('confirm').checked ? '' : 'Veuillez confirmer pour valider.') }[state.step];
  if (!v()) { document.querySelector('.invalid, .err:not(:empty)')?.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
  if (state.step < TOTAL_STEPS) return goTo(state.step + 1);
  // Pas de back-end : la demande n'est pas transmise (voir questions ouvertes).
  $('form').hidden = true; $('stepper').hidden = true;
  $('done').hidden = false;
  $('done').innerHTML = `<div class="alert"><b>Votre demande a bien été préparée.</b><br>
    Maquette : aucun envoi réel n’est effectué pour l’instant. En production, la demande serait transmise à association@lacroixfalgarde.fr.</div>
    <p><a class="btn" href="reserver-une-salle.html">Retour à la page Réserver une salle</a></p>`;
  $('done').scrollIntoView({ block: 'start' });
});

renderCal();
state.started = false;
goTo(1);
