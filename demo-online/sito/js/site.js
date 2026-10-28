/* ==================================================================
   D.S.D. — site.js (sito v3)
   Comandi condivisi da Home, Come funziona, Contatti e Privacy:
   1. Titolo della hero  — diviso in parole che salgono una alla volta
   2. Intro del logo     — solo in Home, una volta sola per visita
   3. Comparse           — gli elementi .reveal-up entrano scorrendo
   4. Menu               — si scurisce scorrendo; menu mobile
   5. Torna su
   6. Modulo contatti    — invio al servizio scelto (o solo conferma)
   La pagina "Chi siamo" ha i suoi comandi in js/chi-siamo.js.
   Le animazioni delle sezioni sono in js/animazioni.js.
   ================================================================== */

document.addEventListener("DOMContentLoaded", function () {
  // Versione per Figma (?figma): niente intro e niente animazioni, tutto visibile
  if (/[?&]figma/.test(location.search)) {
    const intro = document.getElementById("intro");
    if (intro) intro.remove();
    document.body.style.overflow = "";
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  const comparsaHero = preparaTitoloHero();
  preparaIntro(comparsaHero);
  preparaComparse();
  preparaMenu();
  preparaTornaSu();
  preparaModuloContatti();
});

// 1. TITOLO DELLA HERO
// Divide il titolo in parole (<span class="word">) e prepara la loro salita.
// Restituisce l'animazione, che parte dopo l'intro (o subito se non c'è).
function preparaTitoloHero() {
  const titolo = document.getElementById("heroTitle");

  if (titolo) {
    const righe = titolo.innerHTML.split("<br>");
    titolo.innerHTML = righe.map(function (riga) {
      return riga.trim().split(" ").map(function (parola) {
        return '<span class="word">' + parola + "</span>";
      }).join(" ");
    }).join("<br>");
  }

  const parole = titolo ? titolo.querySelectorAll(".word") : [];
  const testiHero = document.querySelectorAll(".hero .reveal-up, .page-header .reveal-up");

  gsap.set(parole, { y: "110%", opacity: 0 });
  gsap.set(testiHero, { y: 24, opacity: 0 });

  return gsap.timeline({ paused: true, defaults: { ease: "power2.out" } })
    .to(parole, { y: "0%", opacity: 1, duration: 0.7, stagger: 0.05 }, 0)
    .to(testiHero, { y: 0, opacity: 1, duration: 0.6, stagger: 0.08 }, 0.25);
}

// 2. INTRO DEL LOGO (solo Home)
// Si vede una volta sola per visita: la memoria del browser (sessionStorage)
// ricorda che è già passata e si svuota chiudendo il browser.
function preparaIntro(comparsaHero) {
  const intro = document.getElementById("intro");
  const video = document.getElementById("introVideo");
  const salta = document.getElementById("introSkip");
  const barretta = document.getElementById("introBar");

  let giaVista = false;
  try {
    giaVista = sessionStorage.getItem("dsd_intro_vista") === "si";
    sessionStorage.setItem("dsd_intro_vista", "si");
  } catch (errore) {
    // memoria non disponibile (es. navigazione privata): l'intro si vede comunque
  }
  if (intro && giaVista) intro.remove();

  // Pagine senza intro (o intro già vista): il titolo compare subito
  if (!intro || !video || giaVista) {
    comparsaHero.play();
    return;
  }

  document.body.style.overflow = "hidden";
  let chiusa = false;

  function chiudiIntro() {
    if (chiusa) return;
    chiusa = true;
    gsap.to(intro, {
      yPercent: -100,
      duration: 0.9,
      ease: "power3.inOut",
      onComplete: function () {
        intro.style.display = "none";
        document.body.style.overflow = "";
      },
    });
    comparsaHero.play();
  }

  video.addEventListener("ended", chiudiIntro);
  video.addEventListener("error", chiudiIntro);
  if (salta) salta.addEventListener("click", chiudiIntro);

  // Se il video non parte o ci mette troppo, dopo 6,5 secondi si entra comunque
  const sicurezza = setTimeout(chiudiIntro, 6500);
  video.addEventListener("ended", function () { clearTimeout(sicurezza); });

  if (barretta) {
    video.addEventListener("timeupdate", function () {
      if (video.duration) barretta.style.width = (video.currentTime / video.duration) * 100 + "%";
    });
  }

  // Avvio bloccato dal browser: si passa alla Home dopo una breve pausa
  video.play().catch(function () { setTimeout(chiudiIntro, 400); });
}

// 3. COMPARSE: ogni .reveal-up (fuori dalla hero) sale ed entra scorrendo
function preparaComparse() {
  const elementi = document.querySelectorAll(".reveal-up:not(.hero .reveal-up):not(.page-header .reveal-up)");

  gsap.set(elementi, { y: 24, opacity: 0 });
  elementi.forEach(function (elemento) {
    gsap.to(elemento, {
      y: 0,
      opacity: 1,
      duration: 0.7,
      ease: "power2.out",
      scrollTrigger: { trigger: elemento, start: "top 88%" },
    });
  });
}

// 4. MENU: si scurisce scorrendo; su smartphone si apre col pulsante
//    e si chiude toccando fuori o con Esc
function preparaMenu() {
  const menu = document.getElementById("siteNav");
  const pulsante = document.getElementById("navToggle");
  const pannello = document.getElementById("navMobile");

  if (menu) {
    ScrollTrigger.create({
      start: 40,
      onUpdate: function (stato) { menu.classList.toggle("is-scrolled", stato.scroll() > 40); },
    });
  }

  if (!pulsante) return;

  function chiudi() {
    pannello.classList.remove("is-open");
  }

  pulsante.addEventListener("click", function () {
    pannello.classList.toggle("is-open");
  });

  pannello.querySelectorAll("a").forEach(function (link) {
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

// 5. TORNA SU
// La soglia dipende dalla lunghezza della pagina: così il pulsante
// compare anche sulle pagine corte (es. Contatti)
function preparaTornaSu() {
  const pulsante = document.getElementById("backToTop");
  if (!pulsante) return;

  function aggiorna() {
    const massimo = document.documentElement.scrollHeight - window.innerHeight;
    const soglia = Math.min(600, Math.max(80, massimo * 0.35));
    pulsante.classList.toggle("is-visible", massimo > 40 && window.scrollY > soglia);
  }

  window.addEventListener("scroll", aggiorna, { passive: true });
  window.addEventListener("resize", aggiorna);
  aggiorna();

  pulsante.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// 6. MODULO CONTATTI
// L'indirizzo del servizio che riceve i messaggi si scrive in contatti.html
// (data-indirizzo). Se è vuoto siamo nel prototipo: si mostra solo la conferma.
function preparaModuloContatti() {
  const modulo = document.getElementById("contactForm");
  if (!modulo) return;

  const conferma = document.getElementById("formSuccess");
  const errore = document.getElementById("formErrore");

  function mostraConferma() {
    modulo.reset();
    if (errore) errore.hidden = true;
    if (conferma) {
      conferma.classList.add("is-visible");
      conferma.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  modulo.addEventListener("submit", function (evento) {
    evento.preventDefault();

    const indirizzo = modulo.getAttribute("data-indirizzo");
    if (!indirizzo) {
      mostraConferma();
      return;
    }

    fetch(indirizzo, { method: "POST", body: new FormData(modulo), headers: { Accept: "application/json" } })
      .then(function (risposta) {
        if (!risposta.ok) throw new Error("Invio non riuscito");
        mostraConferma();
      })
      .catch(function () {
        if (errore) errore.hidden = false;
      });
  });
}
