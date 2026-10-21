const MENU = [
  { label: 'Accueil', href: 'index.html' },
  { label: 'Notre mairie', href: '#', color: '#b9503b' },
  { label: 'Associations', href: '#', color: '#f0b323' },
  { label: 'Ecoles', href: '#', color: '#3f6b2b' },
  { label: 'Urbanisme', href: '#', color: '#84b83a' },
  { label: 'Infos Pratiques', href: '#', color: '#2b7a8c', id: 'infos',
    children: [{ label: 'Réserver une salle', href: 'reserver-une-salle.html', id: 'reserver' }] },
];

const active = document.body.dataset.active;

const navHtml = MENU.map(m => {
  const sub = m.children
    ? `<ul class="sub">${m.children.map(c => `<li><a href="${c.href}" class="${c.id === active ? 'current' : ''}">${c.label}</a></li>`).join('')}</ul>`
    : '';
  const isActive = m.id === active || (m.children || []).some(c => c.id === active);
  return `<li class="${isActive ? 'active' : ''}" style="${m.color ? `--c:${m.color}` : ''}">
    <a href="${m.href}" ${m.children ? 'aria-haspopup="true"' : ''}>${m.label}</a>${sub}</li>`;
}).join('');

document.getElementById('site-header').innerHTML = `
<header class="site-header"><div class="wrap">
  <a class="logo" href="index.html"><img src="assets/logo.svg" alt="Mairie de Lacroix-Falgarde"></a>
  <nav aria-label="Navigation principale"><ul class="nav">${navHtml}
    <li><a class="search" href="#" aria-label="Rechercher">&#9906;</a></li></ul></nav>
</div></header>
<div class="hero"><div class="hero-in">
  <div class="hero-img"><h2>Site officiel de la ville de Lacroix-Falgarde</h2></div>
  <aside class="hero-pratique"><h3>Pratique</h3>
    <ul><li><a href="#">Documentation</a></li><li><a href="#">Démarches administratives</a></li>
    <li><a href="#">Urgences et services</a></li><li><a href="#">Commerces</a></li>
    <li><a href="#">Offres d'emploi et d'apprentissage</a></li><li><a href="#">Petites annonces</a></li></ul>
    <a class="btn-outline" href="#">Tous les services</a></aside>
</div></div>`;

document.getElementById('site-footer').innerHTML = `
<footer class="site-footer"><div class="wrap">
  <div class="foot-cols">
    <div><h4>Mairie de Lacroix Falgarde</h4><p><b>31120 Lacroix-Falgarde</b><br>Tél : 05 61 76 24 95<br>Fax : 05 61 76 71 57<br>mail : contact@lacroixfalgarde.fr</p></div>
    <div><h4>Horaires d'ouverture</h4>
      <p><b>Horaires habituels :</b> Du lundi au vendredi 9h-12h et 14h30-17h30 | Samedi 09h-12h</p>
      <p><b>Horaires vacances :</b> Les horaires sont susceptibles d'être modifiés et annoncés par voie d'affichage.</p></div>
    <div class="blason">MAIRIE DE<br>LACROIX-FALGARDE</div>
  </div>
  <div class="foot-links"><a href="#">Plan du site</a><a href="#">Mentions légales</a><a href="#">Newsletter</a><a href="#">Contactez-nous</a><a href="#">Facebook</a></div>
</div></footer>`;
