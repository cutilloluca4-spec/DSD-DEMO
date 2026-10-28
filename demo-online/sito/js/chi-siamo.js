/* ==================================================================
   D.S.D. — chi-siamo.js (sito v3)
   Animazioni e comandi della pagina "Chi siamo":
   1.  Comandi base      — barra di lettura e menu mobile
                           (il link del portale lo imposta js/portal.js)
   2.  Hero              — titolo che sale, parole che ruotano, cartellini
                           che galleggiano, luce che segue il mouse
   3.  Intro del logo    — il video si vede una volta sola per visita
   4.  Comparse          — elementi che entrano scorrendo e numeri che contano
   5.  Frase "Una sola fonte di verità" — sfumatura che scorre nel testo
   6.  Metodo            — la linea corre da sola lungo le cinque fasi (loop)
   7.  Portale           — il riquadro finale si avvicina scorrendo
   8.  Indice laterale   — si accende la sezione che stai leggendo
   9.  Solo computer     — caos → ordine e ricerca che scorre in orizzontale
   10. Torna su
   Usa GSAP e ScrollTrigger (js/vendor). Con ?figma o con "meno movimento"
   attivo nel sistema la pagina resta ferma (classe is-static su <html>,
   impostata dallo script piccolo nell'<head>).
   ================================================================== */

document.addEventListener("DOMContentLoaded", function () {
  const versioneFerma = document.documentElement.classList.contains("is-static");

  preparaBarraLettura();
  preparaMenuMobile();
  preparaTornaSu();

  if (versioneFerma || typeof gsap === "undefined") return;
  gsap.registerPlugin(ScrollTrigger);

  preparaLuceHero();
  const avviaHero = preparaHero();
  preparaIntro(avviaHero);
  animaNastroChiSiamo();
  animaComparse();
  animaContatori();
  animaFraseVerita();
  animaMetodo();
  animaPortale();
  animaIndice();
  animaSoloComputer();

  // Quando immagini e video sono caricati le misure cambiano: ricalcoliamo
  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
});

// Scorciatoie per cercare elementi nella pagina
function trova(selettore) {
  return document.querySelector(selettore);
}

function trovaTutti(selettore) {
  return Array.from(document.querySelectorAll(selettore));
}

// 1. COMANDI BASE

// Barra in alto che si riempie mentre leggi + menu che si scurisce scorrendo
function preparaBarraLettura() {
  const menu = trova("#siteNav");
  const barra = trova("#progress");

  function aggiorna() {
    const scorrimento = window.scrollY;
    const altezzaUtile = document.documentElement.scrollHeight - window.innerHeight;
    menu.classList.toggle("is-scrolled", scorrimento > 40);
    barra.style.transform = "scaleX(" + (altezzaUtile > 0 ? scorrimento / altezzaUtile : 0) + ")";
  }

  window.addEventListener("scroll", aggiorna, { passive: true });
  aggiorna();
}

// Menu su smartphone: si apre col pulsante, si chiude toccando fuori o con Esc
function preparaMenuMobile() {
  const pulsante = trova("#navToggle");
  const pannello = trova("#navMobile");

  function chiudi() {
    pannello.classList.remove("is-open");
  }

  pulsante.addEventListener("click", function () {
    pannello.classList.toggle("is-open");
  });

  trovaTutti("#navMobile a").forEach(function (link) {
    link.addEventListener("click", chiudi);
  });

  document.addEventListener("click", function (evento) {
    const fuori = !pannello.contains(evento.target) && !pulsante.contains(evento.target);
    if (pannello.classList.contains("is-open") && fuori) chiudi();
  });

  document.addEventListener("keydown", function (evento) {
    if (evento.key === "Escape") chiudi();
  });
}

// 2. HERO

// La luce di sfondo segue il mouse (variabili CSS --mx e --my)
function preparaLuceHero() {
  const hero = trova("#hero");

  hero.addEventListener("pointermove", function (evento) {
    const riquadro = hero.getBoundingClientRect();
    hero.style.setProperty("--mx", (evento.clientX - riquadro.left) + "px");
    hero.style.setProperty("--my", (evento.clientY - riquadro.top) + "px");
  });
}

// Prepara la hero nascosta e restituisce la funzione che la fa comparire
// (parte dopo l'intro del logo)
function preparaHero() {
  const righeTitolo = trovaTutti(".hx__title .ln > span");
  const testi = trovaTutti(".hf");
  const cartellini = trovaTutti(".fl");

  gsap.set(righeTitolo, { yPercent: 110 });
  gsap.set(testi, { y: 24, opacity: 0 });
  gsap.set("#hxStage", { y: 140, opacity: 0 });
  gsap.set(cartellini, { opacity: 0, scale: 0.8 });
  gsap.set("#hxMono", { opacity: 0 });

  // Scorrendo: lo schermo del portale si raddrizza e i cartellini salgono
  // a velocità diverse (data-speed)
  gsap.to("#hxFrame", {
    rotateX: 0,
    scale: 1,
    ease: "none",
    scrollTrigger: { trigger: "#hxStage", start: "top 85%", end: "top 15%", scrub: 1 },
  });

  cartellini.forEach(function (cartellino) {
    gsap.to(cartellino, {
      y: function () { return -120 * Number(cartellino.dataset.speed); },
      ease: "none",
      scrollTrigger: { trigger: "#hxStage", start: "top bottom", end: "bottom top", scrub: true },
    });
  });

  gsap.to("#hxMono", {
    yPercent: 30,
    ease: "none",
    scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true },
  });

  return function avviaHero() {
    gsap.timeline({ defaults: { ease: "power4.out" } })
      .to(righeTitolo, { yPercent: 0, duration: 1.1, stagger: 0.1 }, 0)
      .to("#hxMono", { opacity: 0.1, duration: 1.8, ease: "power2.out" }, 0)
      .to(testi, { y: 0, opacity: 1, duration: 0.9, stagger: 0.08, ease: "power3.out" }, 0.3)
      .to("#hxStage", { y: 0, opacity: 1, duration: 1.4 }, 0.45)
      .to(cartellini, { opacity: 1, scale: 1, duration: 0.8, stagger: 0.12, ease: "back.out(1.6)" }, 1);

    ruotaParole();

    // I cartellini galleggiano su e giù, ognuno col suo ritmo
    cartellini.forEach(function (cartellino, indice) {
      gsap.to(cartellino.firstElementChild, {
        y: 10 + indice * 3,
        duration: 2.6 + indice * 0.4,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
    });
  };
}

// "Pensato per le segreterie / gli allenatori / le famiglie": le parole
// scorrono in alto una alla volta. L'ultima è uguale alla prima, così il
// ritorno all'inizio non si vede.
function ruotaParole() {
  const elenco = trova("#rot .rot__list");
  const passi = elenco.children.length - 1;
  const giro = gsap.timeline({ repeat: -1, delay: 1.6 });

  for (let passo = 1; passo <= passi; passo++) {
    giro.to(elenco, { yPercent: -100 * passo / (passi + 1), duration: 0.7, ease: "power3.inOut" }, "+=1.6");
  }
  giro.set(elenco, { yPercent: 0 });
}

// 3. INTRO DEL LOGO
// Si vede una volta sola per visita: la memoria del browser (sessionStorage,
// la stessa della Home) ricorda che è già passata. Con ?nointro si salta.
function preparaIntro(avviaHero) {
  const intro = trova("#intro");
  const tendina = trova("#wipe");
  const video = trova("#introVideo");

  let giaVista = false;
  try {
    giaVista = sessionStorage.getItem("dsd_intro_vista") === "si";
    sessionStorage.setItem("dsd_intro_vista", "si");
  } catch (errore) {
    // memoria non disponibile (es. navigazione privata): l'intro si vede
  }

  if (new URLSearchParams(location.search).has("nointro") || giaVista) {
    intro.remove();
    tendina.remove();
    avviaHero();
    return;
  }

  document.body.style.overflow = "hidden";
  let chiusa = false;

  function chiudiIntro() {
    if (chiusa) return;
    chiusa = true;

    gsap.timeline()
      .to(video, { opacity: 0, scale: 1.05, duration: 0.45, ease: "power2.in" })
      .to(intro, { yPercent: -100, duration: 0.9, ease: "power4.inOut" }, "-=.1")
      .to(tendina, { yPercent: -100, duration: 0.9, ease: "power4.inOut" }, "-=.72")
      .add(avviaHero, "-=.55")
      .add(function () {
        intro.remove();
        tendina.remove();
        document.body.style.overflow = "";
        ScrollTrigger.refresh();
      });
  }

  // La barretta sotto il video segue l'avanzamento
  video.addEventListener("timeupdate", function () {
    const barretta = trova("#introBar");
    if (video.duration && barretta) barretta.style.width = (video.currentTime / video.duration * 100) + "%";
  });

  video.addEventListener("ended", chiudiIntro);
  video.addEventListener("error", chiudiIntro);
  trova("#introSkip").addEventListener("click", chiudiIntro);
  setTimeout(chiudiIntro, 7000); // in ogni caso dopo 7 secondi si entra

  // Se il browser blocca l'avvio del video, si entra subito
  const avvio = video.play();
  if (avvio && avvio.catch) avvio.catch(function () { setTimeout(chiudiIntro, 500); });
}

// Il nastro sotto la hero accelera un po' quando scorri la pagina veloce
function animaNastroChiSiamo() {
  const nastro = trova(".mq__t");
  const animazione = nastro && nastro.getAnimations ? nastro.getAnimations()[0] : null;
  if (!animazione) return;

  ScrollTrigger.create({
    onUpdate: function (stato) {
      animazione.playbackRate = 1 + Math.min(Math.abs(stato.getVelocity()) / 400, 5);
      gsap.to(animazione, { playbackRate: 1, duration: 1.2, overwrite: true });
    },
  });
}

// 4. COMPARSE E CONTATORI

// data-rv: l'elemento sale ed entra. data-stg: entrano i figli, uno dopo l'altro
function animaComparse() {
  trovaTutti("[data-rv]").forEach(function (elemento) {
    gsap.from(elemento, {
      y: 40,
      opacity: 0,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: { trigger: elemento, start: "top 88%" },
    });
  });

  trovaTutti("[data-stg]").forEach(function (gruppo) {
    gsap.from(gruppo.children, {
      y: 50,
      opacity: 0,
      duration: 0.9,
      stagger: 0.1,
      ease: "power3.out",
      scrollTrigger: { trigger: gruppo, start: "top 85%" },
    });
  });
}

// Esempio: <b data-count="40" data-suffix="+">40+</b> conta da 0 a 40+
// (data-pad="2" scrive 04 invece di 4)
function animaContatori() {
  trovaTutti("[data-count]").forEach(function (elemento) {
    const fine = Number(elemento.dataset.count);
    const cifre = Number(elemento.dataset.pad || 0);
    const suffisso = elemento.dataset.suffix || "";
    const valore = { n: 0 };

    function scrivi() {
      elemento.textContent = String(Math.round(valore.n)).padStart(cifre, "0") + suffisso;
    }

    scrivi();
    gsap.to(valore, {
      n: fine,
      duration: 1.8,
      ease: "power2.out",
      onUpdate: scrivi,
      scrollTrigger: { trigger: elemento, start: "top 88%" },
    });
  });
}

// 5. FRASE "UNA SOLA FONTE DI VERITÀ": la sfumatura scorre nel testo
function animaFraseVerita() {
  gsap.fromTo("#smText",
    { backgroundPosition: "100% 50%", scale: 0.86 },
    {
      backgroundPosition: "0% 50%",
      scale: 1,
      ease: "none",
      scrollTrigger: { trigger: "#verita", start: "top bottom", end: "bottom top", scrub: true },
    }
  );
}

// 6. METODO
// Come una gif: la linea corre da sola lungo le cinque fasi e le colora
// (classe "on") quando le raggiunge; poi sfuma e ricomincia.
function animaMetodo() {
  const fasi = trovaTutti("#mt .mt__s");
  const linea = trova("#mtFill");
  if (!linea) return;

  const giro = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.5 });

  giro
    .call(function () {
      fasi.forEach(function (fase) { fase.classList.remove("on"); });
      gsap.set(linea, { scaleX: 0, opacity: 1 });
    })
    .to(linea, { scaleX: 1, duration: 5, ease: "none" }, 0.3);

  // una fase al secondo, mentre la linea avanza
  fasi.forEach(function (fase, indice) {
    giro.call(function () { fase.classList.add("on"); }, null, 0.3 + indice);
  });

  giro.to(linea, { opacity: 0, duration: 0.6 }, "+=1.6");

  ScrollTrigger.create({
    trigger: "#mt",
    start: "top 80%",
    once: true,
    onEnter: function () { giro.play(); },
  });
}

// 7. PORTALE: il riquadro finale si avvicina e il logo si compone
function animaPortale() {
  gsap.from("#pxRing", {
    scale: 0.9,
    ease: "none",
    scrollTrigger: { trigger: "#portale", start: "top bottom", end: "center center", scrub: 1 },
  });

  gsap.from(".px__card .mono-svg polygon, .px__card .mono-svg path", {
    y: -30,
    opacity: 0,
    stagger: 0.07,
    duration: 0.8,
    ease: "back.out(2)",
    scrollTrigger: { trigger: "#pxRing", start: "top 75%" },
  });
}

// 8. INDICE LATERALE: si accende la voce della sezione che stai leggendo
function animaIndice() {
  const voci = trovaTutti("#index a");

  voci.forEach(function (voce) {
    const sezione = document.getElementById(voce.dataset.s);
    if (!sezione) return;

    ScrollTrigger.create({
      trigger: sezione,
      start: "top 50%",
      end: "bottom 50%",
      onToggle: function (stato) {
        if (!stato.isActive) return;
        voci.forEach(function (altra) { altra.classList.remove("on"); });
        voce.classList.add("on");
      },
    });
  });
}

// 9. SOLO COMPUTER (da 900 px): su smartphone queste sezioni restano normali
function animaSoloComputer() {
  gsap.matchMedia().add("(min-width: 900px)", function () {
    animaCaosOrdine();
    animaRicerca();
  });
}

// 9a. Caos → ordine: i foglietti sparsi (WhatsApp, Excel, moduli) volano
//     dentro lo scadenziario e al loro posto compaiono le righe in ordine
function animaCaosOrdine() {
  const ordine = trova("#order");
  const foglietti = trovaTutti("#mess .junk");
  const righe = trovaTutti("#order .row");

  // centro di un elemento sullo schermo
  function centro(elemento) {
    const riquadro = elemento.getBoundingClientRect();
    return { x: riquadro.left + riquadro.width / 2, y: riquadro.top + riquadro.height / 2 };
  }

  gsap.set(righe, { opacity: 0, x: 40 });

  gsap.timeline({
    scrollTrigger: { trigger: "#chStage", start: "center 55%", end: "+=140%", pin: "#caos", scrub: 1, invalidateOnRefresh: true },
  })
    .to(foglietti, {
      rotation: function (indice) { return [-14, 12, -10, 9, -16, 14][indice]; },
      scale: 1.06,
      duration: 0.3,
      stagger: 0.02,
    })
    .to(foglietti, {
      x: function (indice, foglietto) { return centro(ordine).x - ordine.offsetWidth * 0.25 - centro(foglietto).x; },
      y: function (indice, foglietto) { return centro(ordine).y - centro(foglietto).y; },
      rotation: 0,
      scale: 0.25,
      opacity: 0,
      duration: 1,
      stagger: 0.09,
      ease: "power2.in",
    })
    .to("#mess", { borderColor: "rgba(255,255,255,0)", duration: 0.4 }, "<.5")
    .to("#mess .mess__l", { opacity: 0, duration: 0.3 }, "<")
    .fromTo(".ch__mid .mono-svg", { rotation: 0 }, { rotation: 360, scale: 1.25, duration: 0.8, ease: "power2.inOut" }, "<")
    .to(".ch__mid .mono-svg", { scale: 1, duration: 0.3 })
    .to(righe, { opacity: 1, x: 0, duration: 0.6, stagger: 0.15, ease: "power3.out" }, "-=.7");
}

// 9b. Ricerca sul campo: le card scorrono in orizzontale mentre scendi.
//     La distanza si calcola dall'ultima card: quando arriva al bordo destro
//     l'animazione finisce e la pagina riprende a scorrere.
function animaRicerca() {
  const fila = trova("#track");

  function distanza() {
    const ultima = fila.lastElementChild;
    const margine = parseFloat(getComputedStyle(fila).paddingRight) || 0;
    const fine = ultima.offsetLeft + ultima.offsetWidth + margine;
    return Math.max(0, fine - document.documentElement.clientWidth);
  }

  gsap.to(fila, {
    x: function () { return -distanza(); },
    ease: "none",
    scrollTrigger: {
      trigger: "#ricerca",
      start: "top top",
      end: function () { return "+=" + Math.round(distanza() * 0.6); }, // più corta dello spostamento
      pin: true,
      scrub: 1,
      invalidateOnRefresh: true,
      onUpdate: function (stato) { gsap.set("#rsBar", { scaleX: stato.progress }); },
    },
  });
}

// 10. TORNA SU: il pulsante compare dopo 600 px
function preparaTornaSu() {
  const pulsante = trova("#backToTop");
  if (!pulsante) return;

  function aggiorna() {
    pulsante.classList.toggle("is-visible", window.scrollY > 600);
  }

  window.addEventListener("scroll", aggiorna, { passive: true });
  aggiorna();

  pulsante.addEventListener("click", function () {
    const menoMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: menoMovimento ? "auto" : "smooth" });
  });
}
