// Liens à renseigner — les boutons pointent ici une fois remplis.
const LIENS = {
  rsvp: "",       // Lien Google Form du RSVP
  discours: "",   // Lien Google Form des inscriptions aux discours
};

document.querySelectorAll("[data-lien]").forEach((a) => {
  const url = LIENS[a.dataset.lien];
  if (url) {
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
  } else {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      alert("Le lien arrive bientôt !");
    });
  }
});

// Prepare text for the scroll animations (styles.css › Scroll reveal).
// "A venir": one span per letter so they can drop in one by one.
document.querySelectorAll(".a-venir").forEach((el) => {
  const texte = el.textContent.trim();
  el.textContent = "";
  [...texte].forEach((c, i) => {
    const lettre = document.createElement("span");
    lettre.className = "lettre";
    lettre.setAttribute("aria-hidden", "true");
    lettre.style.setProperty("--l", i);
    lettre.textContent = c === " " ? " " : c;
    el.append(lettre);
  });
  const lu = document.createElement("span");
  lu.className = "sr";
  lu.textContent = texte;
  el.append(lu);
});
// Block titles: wrap the text so it can rise out of a hidden line.
document.querySelectorAll(".bloc h3").forEach((h3) => {
  const texte = [...h3.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
  if (!texte) return;
  const ligne = document.createElement("span");
  ligne.className = "ligne";
  ligne.append(document.createElement("span"));
  ligne.firstChild.textContent = texte.textContent.trim();
  texte.replaceWith(ligne);
});
// Everything under a block title arrives one after the other.
document.querySelectorAll(".bloc").forEach((bloc) => {
  [...bloc.children]
    .filter((el) => el.tagName !== "H3")
    .forEach((el, i) => el.style.setProperty("--k", i));
});

// Play the animations as elements scroll into view. Once an element is back
// below the screen (scrolled up past it), reset it so it plays again.
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("est-visible");
      else if (entry.boundingClientRect.top > 0) entry.target.classList.remove("est-visible");
    });
  },
  { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
);
document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

// Highlight the section currently on screen and slide the pill to it.
const rail = document.querySelector(".nav__rail");
const pastille = document.querySelector(".nav__pastille");
const liens = [...rail.querySelectorAll("a")];
const sections = liens.map((a) => document.querySelector(a.hash));

function activer(lien) {
  if (!lien || lien.classList.contains("actif")) return;
  liens.forEach((a) => a.classList.toggle("actif", a === lien));
  placerPastille();
  // Keep the active link visible in the scrollable mobile rail.
  const gauche = lien.offsetLeft - (rail.clientWidth - lien.offsetWidth) / 2;
  rail.scrollTo({ left: gauche, behavior: "smooth" });
}

function placerPastille() {
  const lien = rail.querySelector("a.actif");
  if (!lien) return;
  pastille.style.width = `${lien.offsetWidth}px`;
  pastille.style.transform = `translateX(${lien.offsetLeft}px)`;
}

// Heart couples move as you scroll past their bar: they walk across (left
// couple to the right, right couple to the left) or bounce along in jumps.
// The home-screen couples ("surPlace") just hop up and down without moving,
// and the "danse" couples sway back and forth on the spot.
// Couples without a data-scene (the footer ones) stay still.
const couples = [...document.querySelectorAll(".couple[data-scene]")].map((el) => ({
  el,
  barre: el.parentElement,
  scene: el.dataset.scene,
  sens: el.classList.contains("couple--droite") ? -1 : 1,
}));
const mouvementReduit = matchMedia("(prefers-reduced-motion: reduce)").matches;

const borne = (v) => Math.min(Math.max(v, 0), 1);

const SCENES = {
  // Little steps: a small bob and wobble.
  balade: (t) => ({ y: -Math.abs(Math.sin(t * Math.PI * 4)) * 6, r: Math.sin(t * Math.PI * 4) * 3 }),
  // Three big hops.
  saut: (t) => ({ y: -Math.abs(Math.sin(t * Math.PI * 3)) * 36, r: 0 }),
  // Hops in place, one hop per SAUT_SURPLACE px scrolled.
  surPlace: (t) => ({ y: -Math.abs(Math.sin(t * Math.PI)) * 36, r: 0 }),
  // Dancing on the spot: sway side to side leaning into each step, with a
  // little bounce on every beat. The lift keeps the low corner of the lean
  // from dipping under the bottom of the bar.
  danse: (t) => {
    const balance = Math.sin(t * Math.PI * 2);
    return {
      x: balance * 0.5,
      y: -Math.abs(Math.sin(t * Math.PI * 4)) * 10 - Math.abs(balance) * 14,
      r: balance * 6,
    };
  },
};
const SAUT_SURPLACE = 210;
// Highest lift of each scene, so hops can be scaled down to fit their bar.
const LEVEE = Object.fromEntries(
  Object.entries(SCENES).map(([nom, scene]) => [
    nom,
    Math.max(...Array.from({ length: 201 }, (_, i) => -scene(i / 200).y), 1),
  ])
);
// Keep the couples this far inside their bar's edges (room for the tilt).
const MARGE_BARRE = 8;

// Header: starts as the full home header and, over the first scroll, shrinks
// into the compact header. Each piece slides/scales from its full-layout spot
// to its compact spot (transforms only, so it stays smooth).
const entete = document.querySelector(".entete");
const bord = entete.querySelector(".entete__bord");
const infosGrandes = entete.querySelector(".morph--infos");
const infosCompactes = entete.querySelector(".infos-compactes");
const guirlandes = [...entete.querySelectorAll(".guirlande-cadre")];
const morphs = [
  { el: entete.querySelector(".morph--logo"), cible: entete.querySelector(".emplacement--logo") },
  { el: entete.querySelector(".morph--titre"), cible: entete.querySelector(".emplacement--titre") },
  // The big date block shrinks into the top-right corner, above the right garland.
  { el: infosGrandes, cible: infosCompactes },
  { el: entete.querySelector(".morph--nav"), cible: null },
];

// In the compact header the logo sits in the dip of the left garland and the
// date/location sits above the string of the right garland. These spots are
// worked out from each garland's drawing (fractions of the image).
const LOGO = { cx: 0.42, cy: 0.4, h: 0.34, largeur: 0.3, ratio: 101 / 62 };
const DATE = { gauche: 0.44, droite: 1, haut: 0.04, bas: 0.56 };
// Phones have less room, so the garlands stretch further, the logo takes more
// of its garland and the date uses more of the space above the string.
const telephone = matchMedia("(max-width: 720px)");
const LOGO_TEL = { ...LOGO, h: 0.5, largeur: 0.44 };
const DATE_TEL = { gauche: 0.34, droite: 1, haut: 0, bas: 0.52 };
// Space the date block lands in (set by placerEmplacements), or null when the
// compact header has no room for it and it fades out instead.
let zoneDate = null;

function placerGuirlandes(hautCompact) {
  const largeur = entete.clientWidth;
  const titre = entete.querySelector(".emplacement--titre").getBoundingClientRect();
  const avecDate = getComputedStyle(infosCompactes).display !== "none";
  return guirlandes.map((g, i) => {
    const cadre = g.getBoundingClientRect();
    // Layout offsets, not the on-screen box: the garlands' drop-in animation
    // moves the images while the page loads.
    const im = g.firstElementChild;
    const img = {
      left: cadre.left + im.offsetLeft,
      top: cadre.top + im.offsetTop,
      width: im.offsetWidth,
      height: im.offsetHeight,
    };
    // Shrink to hang over the top ~70% of the compact header…
    const sy = Math.min(1, (hautCompact * 0.7) / cadre.height);
    let sx = sy;
    if (avecDate) {
      // …and stretch sideways (up to 1.5×, 2.2× on phones) into the room
      // beside the title.
      const tel = telephone.matches;
      const ecart = tel ? 2 : 16;
      const place = i === 0 ? titre.left - ecart : largeur - titre.right - ecart;
      sx = Math.min(sy * (tel ? 2.2 : 1.5), place / cadre.width);
    }
    // Garlands scale from their outer top corner.
    const ox = i === 0 ? cadre.left : cadre.right;
    return {
      sx,
      sy,
      img: {
        left: ox + (img.left - ox) * sx,
        top: cadre.top + (img.top - cadre.top) * sy,
        w: img.width * sx,
        h: img.height * sy,
      },
    };
  });
}

function placerEmplacements(geo, largeur) {
  const tel = telephone.matches;
  // Logo: centred in the left garland's dip.
  const L = tel ? LOGO_TEL : LOGO;
  const g = geo[0].img;
  let h = L.h * g.h;
  let w = h * L.ratio;
  if (w > L.largeur * g.w) {
    w = L.largeur * g.w;
    h = w / L.ratio;
  }
  const logo = entete.querySelector(".emplacement--logo");
  logo.style.left = `${g.left + L.cx * g.w - w / 2}px`;
  logo.style.top = `${g.top + L.cy * g.h - h / 2}px`;
  logo.style.width = `${w}px`;

  // Date + location: fitted into the space above the right garland's string.
  zoneDate = null;
  if (getComputedStyle(infosCompactes).display === "none") return;
  const D = tel ? DATE_TEL : DATE;
  const d = geo[1].img;
  const gauche = d.left + D.gauche * d.w;
  const droite = Math.min(d.left + D.droite * d.w, largeur - (tel ? 6 : 14));
  // The garland's top can sit above the screen; keep the date below it.
  const haut = Math.max(d.top + D.haut * d.h, 4);
  const bas = d.top + D.bas * d.h;
  zoneDate = { gauche, droite, haut, bas };
}

function mesurerEntete() {
  morphs.forEach((m) => (m.el.style.transform = ""));
  guirlandes.forEach((g) => (g.style.transform = ""));
  const hautPlein = entete.offsetHeight;
  const hautCompact = entete.querySelector(".compacte").offsetHeight;
  const geo = placerGuirlandes(hautCompact);
  placerEmplacements(geo, entete.clientWidth);
  const fond = entete.getBoundingClientRect().top;
  const pas = morphs.map(({ el, cible }) => {
    const a = el.getBoundingClientRect();
    if (!cible) {
      // The menu keeps its size and sits at the bottom of the compact header.
      const marge = hautPlein - (a.bottom - fond);
      return { dx: 0, dy: hautCompact - marge - a.bottom + fond, s: 1 };
    }
    if (cible === infosCompactes) {
      if (!zoneDate) return { dx: 0, dy: 0, s: 1 };
      // Scaled down to fit the corner zone, centred in it.
      const { gauche, droite, haut, bas } = zoneDate;
      const s = Math.min((droite - gauche) / a.width, (bas - haut) / a.height);
      return {
        dx: (gauche + droite) / 2 - (a.left + (a.width * s) / 2),
        dy: (haut + bas) / 2 - (a.top + (a.height * s) / 2),
        s,
      };
    }
    const b = cible.getBoundingClientRect();
    const s = b.width / a.width;
    return { dx: b.left - a.left, dy: b.top - a.top, s: s || 1 };
  });
  return { plage: Math.max(hautPlein - hautCompact, 1), hautPlein, pas, guirlandes: geo };
}

function appliquerEntete(y) {
  const { plage, pas, guirlandes: geo } = mesures.entete;
  const rogne = Math.min(Math.max(y, 0), plage);
  const p = rogne / plage;
  entete.style.setProperty("--rogne", `${rogne}px`);
  morphs.forEach((m, i) => {
    const { dx, dy, s } = pas[i];
    m.el.style.transform = `translate3d(${(dx * p).toFixed(1)}px, ${(dy * p).toFixed(1)}px, 0) scale(${(1 + (s - 1) * p).toFixed(4)})`;
  });
  guirlandes.forEach((g, i) => {
    const { sx, sy } = geo[i];
    g.style.transform = `scale(${(1 + (sx - 1) * p).toFixed(4)}, ${(1 + (sy - 1) * p).toFixed(4)})`;
  });
  infosGrandes.style.opacity = zoneDate ? "1" : (1 - borne(p / 0.6)).toFixed(3);
  bord.style.opacity = borne((p - 0.8) / 0.2).toFixed(3);
  bord.style.transform = `translate3d(0, ${-rogne}px, 0)`;
}

// Layout is measured once (and again on resize), so scrolling itself never
// forces the browser to recalculate the page — it only reads scrollY.
let mesures = null;

// Each screen is exactly one visible screen tall. On phones the visible height
// changes as the browser toolbar shows/hides; it's only picked up on rotation
// and when a menu link is used (so the page doesn't jump while scrolling).
let largeurVue = 0;
function fixerHauteur() {
  largeurVue = window.innerWidth;
  document.documentElement.style.setProperty("--hauteur", `${window.innerHeight}px`);
}
fixerHauteur();
const ecranTactile = matchMedia("(pointer: coarse)").matches;
window.addEventListener("resize", () => {
  if (!ecranTactile || window.innerWidth !== largeurVue) fixerHauteur();
});
liens.forEach((a) => a.addEventListener("click", fixerHauteur));

function mesurer() {
  const y = window.scrollY;
  const hauteur = window.innerHeight;
  const scrollMax = document.documentElement.scrollHeight - hauteur;
  mesures = {
    entete: mesurerEntete(),
    hauteur,
    scrollMax,
    amplitude: Math.min(window.innerWidth * 0.06, 90),
    hautsSections: sections.map((s) => s.getBoundingClientRect().top + y),
    barres: couples.map((c) => {
      const r = c.barre.getBoundingClientRect();
      // Where the couple stands at rest, without its scroll movement.
      c.el.style.transform = "";
      const e = c.el.getBoundingClientRect();
      return {
        haut: r.top + y,
        bas: r.bottom + y,
        // Room left between the couple and the bar's top and sides.
        dessus: Math.max(e.top - r.top - MARGE_BARRE, 0),
        gauche: Math.max(e.left - r.left - MARGE_BARRE, 0),
        droite: Math.max(r.right - e.right - MARGE_BARRE, 0),
      };
    }),
  };
}

function sectionCourante(y) {
  const { hauteur, scrollMax, hautsSections } = mesures;
  if (y >= scrollMax - 2) return liens[liens.length - 1];
  const repere = y + hauteur * 0.35;
  let courant = 0;
  hautsSections.forEach((haut, i) => {
    if (haut <= repere) courant = i;
  });
  return liens[courant];
}

function jouerScenes(y) {
  if (mouvementReduit) return;
  const { hauteur, scrollMax, amplitude, barres } = mesures;
  couples.forEach((c, i) => {
    const haut = barres[i].haut - y;
    const bas = barres[i].bas - y;
    if (bas < -50 || haut > hauteur + 50) return;
    // 0 when the bar enters at the bottom, 1 once it reaches the upper quarter —
    // or, for bars near the end of the page, once the page can't scroll further.
    const hautFinal = Math.max(barres[i].haut - scrollMax, hauteur * 0.25);
    const t = borne((hauteur - haut) / Math.max(hauteur - hautFinal, 1));
    // In-place hops follow the scroll itself, so they rest on the ground at the
    // very top of the page and start bouncing as soon as you scroll.
    const surPlace = c.scene === "surPlace";
    const scene = SCENES[c.scene](surPlace ? y / SAUT_SURPLACE : t);
    // Scenes may set their own sideways sway (as a share of `amplitude`);
    // otherwise the couple walks across.
    const place = barres[i];
    const x = surPlace ? 0 : c.sens * amplitude * (scene.x ?? (t - 0.5) * 2);
    const dx = Math.min(Math.max(x, -place.gauche), place.droite);
    // Lower the hops when the bar is too short for them.
    const saut = scene.y * Math.min(1, place.dessus / LEVEE[c.scene]);
    const angle = scene.r;
    // The right-hand couple is mirrored so both face the middle.
    c.el.style.transform = `translate3d(${dx.toFixed(1)}px, ${saut.toFixed(1)}px, 0) rotate(${(angle * c.sens).toFixed(2)}deg) scaleX(${c.sens})`;
  });
}

function miseAJour() {
  const y = window.scrollY;
  appliquerEntete(y);
  activer(sectionCourante(y));
  jouerScenes(y);
}

let enAttente = false;
function planifier() {
  if (enAttente) return;
  enAttente = true;
  requestAnimationFrame(() => {
    enAttente = false;
    miseAJour();
  });
}

function remesurer() {
  mesurer();
  placerPastille();
  // Straight away, so nothing is painted in its unmoved spot.
  miseAJour();
}

window.addEventListener("scroll", planifier, { passive: true });
window.addEventListener("resize", remesurer);
window.addEventListener("load", remesurer);
document.fonts.ready.then(remesurer);
// Page height can change after load (images, fonts) — re-measure when it does.
new ResizeObserver(remesurer).observe(document.body);

mesurer();
miseAJour();

// ---------- Photo strip: drifts on its own, can be swiped, opens the viewer ----------

const bandePhotos = document.querySelector(".photos");
const vignettes = [...bandePhotos.querySelectorAll("img")];
const nbPhotos = vignettes.length / 2; // the set is repeated once for the loop
const VITESSE = 1 / 84; // one full set every ~84 s

let periode = 0; // width of one set of photos, in px
let position = 0; // where the strip is, in px (kept as a float for smooth drift)
let repriseApres = 0; // drifting resumes after this time (ms)
let survol = false;
let bandeVisible = false;
let dernierTemps = 0;

function mesurerBande() {
  periode = vignettes[nbPhotos].offsetLeft - vignettes[0].offsetLeft;
}

// The strip repeats every `periode` px, so jumping by one period is invisible.
function boucler() {
  if (periode <= 0) return;
  if (bandePhotos.scrollLeft >= periode) bandePhotos.scrollLeft -= periode;
  else if (bandePhotos.scrollLeft <= 0) bandePhotos.scrollLeft += periode;
  position = bandePhotos.scrollLeft;
}

function pause(ms = 2500) {
  repriseApres = performance.now() + ms;
}

function deriver(temps) {
  const dt = dernierTemps ? Math.min(temps - dernierTemps, 50) : 0;
  dernierTemps = temps;
  if (bandeVisible && !survol && !visionneuse.open && temps > repriseApres && !mouvementReduit) {
    // Pick up from wherever a swipe left the strip.
    if (Math.abs(bandePhotos.scrollLeft - position) > 2) position = bandePhotos.scrollLeft;
    position += periode * VITESSE * (dt / 1000);
    if (position >= periode) position -= periode;
    bandePhotos.scrollLeft = position;
  }
  requestAnimationFrame(deriver);
}

// Any hand-made scroll (swipe, drag, trackpad) pauses the drift for a moment.
["pointerdown", "touchstart", "wheel"].forEach((type) =>
  bandePhotos.addEventListener(type, () => pause(), { passive: true })
);
bandePhotos.addEventListener("mouseenter", () => (survol = true));
bandePhotos.addEventListener("mouseleave", () => (survol = false));
bandePhotos.addEventListener("scroll", () => {
  if (performance.now() < repriseApres || survol) boucler();
}, { passive: true });

new IntersectionObserver(([entree]) => {
  bandeVisible = entree.isIntersecting;
}).observe(bandePhotos);

// Desktop: drag the strip with the mouse too (a short click still opens the photo).
let glisse = null;
bandePhotos.addEventListener("pointerdown", (e) => {
  if (e.pointerType !== "mouse") return;
  glisse = { x: e.clientX, depart: bandePhotos.scrollLeft, bouge: false };
});
window.addEventListener("pointermove", (e) => {
  if (!glisse) return;
  const dx = e.clientX - glisse.x;
  if (Math.abs(dx) > 5) glisse.bouge = true;
  if (glisse.bouge) {
    bandePhotos.scrollLeft = glisse.depart - dx;
    boucler();
    glisse.depart = bandePhotos.scrollLeft + dx;
    pause();
  }
});
window.addEventListener("pointerup", () => {
  if (glisse && glisse.bouge) {
    // Swallow the click that follows a drag (and only that one).
    const avaler = (e) => e.stopPropagation();
    window.addEventListener("click", avaler, { capture: true, once: true });
    setTimeout(() => window.removeEventListener("click", avaler, { capture: true }), 0);
  }
  glisse = null;
});

// ---------- Viewer ----------

const visionneuse = document.querySelector(".visionneuse");
const grandeImage = visionneuse.querySelector(".visionneuse__img");
const compteur = visionneuse.querySelector(".visionneuse__compte");
const sources = vignettes.slice(0, nbPhotos).map((img) => img.getAttribute("src").replace("photos/", "photos/grand/"));
let courante = 0;

function montrer(i) {
  courante = (i + nbPhotos) % nbPhotos;
  grandeImage.src = sources[courante];
  compteur.textContent = `${courante + 1} / ${nbPhotos}`;
  grandeImage.classList.remove("change");
  void grandeImage.offsetWidth; // restart the fade
  grandeImage.classList.add("change");
  // Warm up the neighbours so the arrows feel instant.
  [courante + 1, courante - 1].forEach((j) => (new Image().src = sources[(j + nbPhotos) % nbPhotos]));
}

function ouvrir(i) {
  montrer(i);
  document.documentElement.style.overflow = "hidden";
  visionneuse.showModal();
}

vignettes.forEach((img, i) => {
  img.draggable = false;
  img.addEventListener("click", () => ouvrir(i % nbPhotos));
});
visionneuse.addEventListener("close", () => {
  document.documentElement.style.overflow = "";
  pause(1500);
});
visionneuse.querySelector(".visionneuse__fermer").addEventListener("click", () => visionneuse.close());
visionneuse.querySelector(".visionneuse__fleche--prec").addEventListener("click", () => montrer(courante - 1));
visionneuse.querySelector(".visionneuse__fleche--suiv").addEventListener("click", () => montrer(courante + 1));
// Click on the dark background closes it.
visionneuse.addEventListener("click", (e) => {
  if (e.target === visionneuse) visionneuse.close();
});
visionneuse.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") montrer(courante - 1);
  if (e.key === "ArrowRight") montrer(courante + 1);
});
// Phone: swipe left/right on the big photo.
let toucheX = null;
visionneuse.addEventListener("touchstart", (e) => (toucheX = e.touches[0].clientX), { passive: true });
visionneuse.addEventListener("touchend", (e) => {
  if (toucheX === null) return;
  const dx = e.changedTouches[0].clientX - toucheX;
  if (Math.abs(dx) > 40) montrer(courante + (dx < 0 ? 1 : -1));
  toucheX = null;
});

function demarrerBande() {
  mesurerBande();
  bandePhotos.scrollLeft = 1;
  position = bandePhotos.scrollLeft;
  requestAnimationFrame(deriver);
}
window.addEventListener("resize", mesurerBande);
if (document.readyState === "complete") demarrerBande();
else window.addEventListener("load", demarrerBande);
