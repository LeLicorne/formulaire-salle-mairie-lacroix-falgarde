const ROOMS = [
  { id: 'foyer', name: 'Foyer rural', address: 'Place du Foyer, avenue des Pyrénées', capacity: 200 },
  { id: 'dojo', name: 'Dojo', address: 'avenue de Falgarde', capacity: 50, note: 'uniquement manifestation sportive et éducative' },
  { id: 'mistral', name: 'Frédéric Mistral', address: 'Place du Foyer, avenue des Pyrénées', capacity: 30 },
  { id: 'dupuy', name: 'Alain Dupuy', address: '14 chemin de l’Aliette', capacity: 30 },
  { id: 'cazelles', name: 'Danton Cazelles', address: 'Place de la Mairie, avenue des Pyrénées', capacity: 30 },
  { id: 'gleyzette', name: 'Chapelle de la Gleyzette', address: 'Route de la Gleyzette', capacity: 30 },
  { id: 'conseil', name: 'Salle du Conseil', address: 'Avenue des Pyrénées', capacity: 25 },
  { id: 'sadacca', name: 'Ugo Sadacca', address: 'Chemin de la Berterole', capacity: 20 },
  { id: 'expo', name: 'Salle exposition médiathèque', address: 'Avenue de Falgarde', capacity: 15 },
  { id: 'orangeraie', name: 'L’orangeraie', address: '42 avenue des Pyrénées', capacity: 10 },
  { id: 'goudouli', name: 'Pierre Goudouli', address: 'Place de la Mairie, avenue des Pyrénées', capacity: 5, note: 'uniquement cours de musique' },
];
const MAX_CAPACITY = Math.max(...ROOMS.map(r => r.capacity)); // 200

const MATERIALS = [
  { id: 'tables-ext', name: 'Tables ext. 8 pers. (bois)', dims: '220 x 70 x 76', total: 42 },
  { id: 'bancs', name: 'Bancs 4 pers.', dims: '220 x 25 x 47', total: 70 },
  { id: 'tables-int', name: 'Tables int. 6 pers. (plastique)', dims: '182 x 76 x 73', total: 23 },
  { id: 'mange-debout', name: 'Mange-debout', dims: '82,5 (diam) x 112 (hauteur)', total: 9 },
  { id: 'barnum', name: 'Barnum', dims: '600 x 300 x 250', total: 6 },
  { id: 'barrieres', name: 'Barrières', dims: '200 x 5 x 110', total: 20 },
  { id: 'video', name: 'Vidéoprojecteur', foyerOnly: true },
  { id: 'enceinte', name: 'Enceinte', foyerOnly: true },
];

// Horaires : ouverture 9h, créneaux de 30 min, fin max 22h (en minutes depuis minuit)
const DAY_START = 9 * 60, DAY_END = 22 * 60, STEP = 30;

const SITUATIONS = {
  particulier: { label: 'Particulier', siret: false, localLabel: 'Je réside à Lacroix-Falgarde',
    docs: ['assurance', 'identite', 'domicile'] },
  association: { label: 'Association', siret: true, siretRequired: true, localLabel: 'Mon association est basée à Lacroix-Falgarde',
    docs: ['assurance', 'siret'] },
  parti: { label: 'Parti ou mouvement politique', siret: true,
    docs: ['courrier', 'assurance'] },
  public: { label: 'Personne morale de droit public', siret: true,
    docs: [] },
  prive: { label: 'Personne morale de droit privé (société, professionnel…)', siret: true, siretRequired: true,
    docs: ['assurance', 'siret', 'kbis'] },
};
const DOCS = {
  courrier: 'Courrier de demande à l’attention de M. le Maire',
  assurance: 'Attestation d’assurance responsabilité civile et risques locatifs',
  siret: 'Déclaration SIRET',
  kbis: 'Déclaration KBIS',
  identite: 'Pièce d’identité',
  domicile: 'Justificatif de domicile',
};

/* ---- Disponibilités (simulées, en attendant un back-end) ---- */
function hash(str) { let h = 7; for (const c of str) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function bookingsFor(roomId, dateIso) {
  const h = hash(roomId + dateIso);
  if (h % 9 === 0) return [[DAY_START, DAY_END]]; // journée complète
  let seed = h, cursor = DAY_START;
  const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
  const out = [];
  for (let i = 0, n = h % 4; i < n; i++) {
    const s = cursor + STEP * rnd(6), e = s + STEP * (2 + rnd(6));
    if (e > DAY_END) break;
    out.push([s, e]); cursor = e;
  }
  return out;
}
const isFree = (b, t) => !b.some(([s, e]) => t < e && t + STEP > s);
const isDayFull = (roomId, dateIso) => {
  const b = bookingsFor(roomId, dateIso);
  for (let t = DAY_START; t < DAY_END; t += STEP) if (isFree(b, t)) return false;
  return true;
};
function startOptions(roomId, dateIso) {
  const b = bookingsFor(roomId, dateIso), out = [];
  for (let t = DAY_START; t < DAY_END; t += STEP) if (isFree(b, t)) out.push(t);
  return out;
}
function endOptions(roomId, dateIso, start) {
  const b = bookingsFor(roomId, dateIso), out = [];
  for (let t = start; t < DAY_END && isFree(b, t); t += STEP) out.push(t + STEP);
  return out;
}
const fmtTime = m => `${String(Math.floor(m / 60)).padStart(2, '0')}h${String(m % 60).padStart(2, '0')}`;
const fmtDate = s => new Date(s + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
