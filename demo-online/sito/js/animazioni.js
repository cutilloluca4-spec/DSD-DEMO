/* ==================================================================
   D.S.D. — animazioni.js (sito v3)
   Animazioni di Home, Come funziona e Contatti, tutte legate a cosa fa
   il portale. Ogni animazione parte quando la sua sezione entra nello
   schermo (vedi quandoEntra) e cerca i suoi elementi per id o classe:
   se nella pagina non ci sono, non fa niente.
   1. Contatori       — i numeri partono da zero e salgono
   2. Scadenziario    — scorrendo, i cartellini passano da rosso ad azzurro
   3. Confronto       — le voci "prima" si barrano, quelle "con DSD" compaiono
   4. Mini-schermate  — piccole scene del portale che si muovono da sole
   5. Logo            — il monogramma DSD si compone pezzo per pezzo
   6. Passi           — una linea collega le tappe per partire e si ripete (Contatti)
   7. Percorso        — barra delle 4 funzioni che si riempie (Come funziona)
   8. Home d'impatto  — tabellone a LED che segue il mouse, barra di
                        lettura, schermo che si accende, cartellini che
                        arrivano come notifiche, foto che si colorano e
                        numeri che girano come carte
   9. Funzioni (v3)   — quote, promemoria, orari e campi in piccolo
   10. Tre aree (v3)  — il viaggio di un certificato: famiglia → segreteria
                        → allenatore, come una gif che si ripete
   11. Gallerie (v3)  — schermate vere del portale con le schede, che
                        scorrono da sole come le "storie" (Come funziona)
   12. Nastro         — la striscia di parole sotto la hero della Home
   Versione ferma: con ?figma nell'indirizzo, o con "riduci movimento"
   attivo nel sistema, nessuna animazione parte e mostraStatoFinale()
   mette tutto nello stato finale (utile anche per importare in Figma).
   Usa GSAP e ScrollTrigger, già presenti nel sito (js/vendor).
   ================================================================== */

document.addEventListener("DOMContentLoaded", function () {
  // Versione ferma: per Figma (?figma) o per chi ha chiesto meno movimento
  const versioneFerma = /[?&]figma/.test(location.search) ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (versioneFerma || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    preparaGallerie(false);
    mostraStatoFinale();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  preparaGallerie(true);

  animaContatori();
  animaScadenziario();
  animaConfronto();
  animaMiniSchermate();
  animaLogo();
  animaPassi();
  animaPercorso();
  avviaTabellone(false);
  animaTitolo();
  animaBarraLettura();
  animaVetrina();
  animaTestimonianze();
  animaMotivi();
  animaTreAree();
  animaNastro();
});

// Esegue un'azione una sola volta, quando l'elemento entra nello schermo
function quandoEntra(elemento, azione) {
  ScrollTrigger.create({
    trigger: elemento,
    start: "top 80%",
    once: true,
    onEnter: azione,
  });
}

// Scrive un testo una lettera alla volta, come se lo stessimo digitando
function scriviTesto(elemento, testo, durata) {
  const lettere = { n: 0 };
  elemento.textContent = "";

  return gsap.to(lettere, {
    n: testo.length,
    duration: durata,
    ease: "none",
    onUpdate: function () {
      elemento.textContent = testo.slice(0, Math.round(lettere.n));
    },
  });
}

// 1. CONTATORI
// Esempio: <strong data-conta="14" data-cifre="2">14</strong> conta da 00 a 14
function animaContatori() {
  document.querySelectorAll("[data-conta]").forEach(function (elemento) {
    const fine = Number(elemento.getAttribute("data-conta"));
    const cifre = Number(elemento.getAttribute("data-cifre") || 0);
    const suffisso = elemento.getAttribute("data-suffisso") || "";
    const valore = { n: 0 };

    function scrivi() {
      elemento.textContent = String(Math.round(valore.n)).padStart(cifre, "0") + suffisso;
    }

    scrivi();
    quandoEntra(elemento, function () {
      gsap.to(valore, { n: fine, duration: 1.6, ease: "power2.out", onUpdate: scrivi });
    });
  });
}

// 2. SCADENZIARIO CHE SI RINNOVA (Home)
// Più si scorre, più righe passano da "Scaduto" a "Rinnovato".
// Tornando su, le righe tornano rosse: è legato allo scroll.
function animaScadenziario() {
  const sezione = document.getElementById("scadenziario-vivo");
  if (!sezione) return;

  const righe = sezione.querySelectorAll(".sv__riga");
  const contatore = document.getElementById("svContatore");

  ScrollTrigger.create({
    trigger: sezione.querySelector(".sv__lista"),
    start: "top 70%",
    end: "bottom 40%",
    onUpdate: function (stato) {
      const rinnovate = Math.min(righe.length, Math.floor(stato.progress * (righe.length + 1)));
      aggiornaScadenziario(righe, contatore, rinnovate);
    },
  });
}

function aggiornaScadenziario(righe, contatore, rinnovate) {
  righe.forEach(function (riga, indice) {
    riga.classList.toggle("is-rinnovata", indice < rinnovate);
  });

  const daRinnovare = righe.length - rinnovate;
  contatore.textContent = String(daRinnovare).padStart(2, "0");
  contatore.classList.toggle("is-zero", daRinnovare === 0);
}

// 3. CONFRONTO PRIMA / CON DSD
// Basta aggiungere la classe "is-visto": il resto lo fanno le transizioni CSS
function animaConfronto() {
  document.querySelectorAll(".compare--animato").forEach(function (confronto) {
    quandoEntra(confronto, function () {
      confronto.classList.add("is-visto");
    });
  });
}

// 4. MINI-SCHERMATE DEL PORTALE
// Ogni schermata ha data-anima="..." e parte quando entra nello schermo
function animaMiniSchermate() {
  document.querySelectorAll("[data-anima]").forEach(function (schermata) {
    const tipo = schermata.getAttribute("data-anima");

    if (tipo === "societa") preparaSocieta(schermata);
    if (tipo === "panoramica") preparaPanoramica(schermata);
    if (tipo === "scheda") preparaScheda(schermata);
    if (tipo === "magazzino") preparaMagazzino(schermata);
    if (tipo === "quote") preparaQuote(schermata);
    if (tipo === "promemoria") preparaPromemoria(schermata);
    if (tipo === "orari") preparaOrari(schermata);
    if (tipo === "campi") preparaCampi(schermata);
  });
}

// 4a. Primo avvio: si sceglie il calcio e il nome della società si scrive da solo
function preparaSocieta(schermata) {
  const sport = schermata.querySelector("[data-sport-scelto]");
  const scritta = schermata.querySelector(".mk-scrittura");
  const testo = scritta.getAttribute("data-testo");
  const barra = schermata.querySelector(".mk-progresso i");

  sport.classList.remove("is-scelto");
  scritta.textContent = "";
  gsap.set(barra, { scaleX: 0.5 });

  quandoEntra(schermata, function () {
    gsap.timeline()
      .add(function () { sport.classList.add("is-scelto"); }, 0.4)
      .add(scriviTesto(scritta, testo, testo.length * 0.07), 0.9)
      .to(barra, { scaleX: 1, duration: 0.6, ease: "power2.out" });
  });
}

// 4b. Panoramica: i numeri contano (vedi data-conta), poi le righe entrano
//     e il pallino rosso inizia a pulsare
function preparaPanoramica(schermata) {
  const righe = schermata.querySelectorAll(".mk-riga");
  const pallinoRosso = schermata.querySelector(".mk-pallino--rosso");

  gsap.set(righe, { opacity: 0, x: 20 });

  quandoEntra(schermata, function () {
    gsap.to(righe, { opacity: 1, x: 0, duration: 0.5, stagger: 0.15, delay: 0.6, ease: "power2.out" });
    if (pallinoRosso) gsap.delayedCall(1.4, function () { pallinoRosso.classList.add("is-pulsante"); });
  });
}

// 4c. Scheda atleta: il codice fiscale si compila e compare "Verificato"
function preparaScheda(schermata) {
  const codice = schermata.querySelector("[data-testo]");
  const testo = codice.getAttribute("data-testo");
  const verificato = schermata.querySelector(".mk-verificato");
  const taglie = schermata.querySelectorAll(".mk-taglie div");

  codice.textContent = "";
  gsap.set(verificato, { scale: 0, opacity: 0 });
  gsap.set(taglie, { opacity: 0, y: 10 });

  quandoEntra(schermata, function () {
    gsap.timeline({ delay: 0.3 })
      .add(scriviTesto(codice, testo, 1.4))
      .to(verificato, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2.5)" })
      .to(taglie, { opacity: 1, y: 0, duration: 0.4, stagger: 0.1, ease: "power2.out" }, "-=0.1");
  });
}

// 4d. Magazzino: si preme "Prenota", la taglia M passa da 6 a 5
//     e compare la conferma della prenotazione
function preparaMagazzino(schermata) {
  const bottone = schermata.querySelector(".mk-bottone");
  const chip = schermata.querySelector("[data-taglia-prenotata]");
  const numero = chip.querySelector("b");
  const prima = numero.getAttribute("data-da");
  const dopo = numero.getAttribute("data-a");
  const avviso = schermata.querySelector(".mk-avviso");

  numero.textContent = prima;
  chip.classList.remove("is-aggiornata");
  gsap.set(avviso, { opacity: 0, y: 10 });

  quandoEntra(schermata, function () {
    gsap.timeline({ delay: 0.6 })
      .to(bottone, { scale: 0.94, duration: 0.12, ease: "power1.in" })
      .to(bottone, { scale: 1, duration: 0.25, ease: "back.out(3)" })
      .add(function () {
        numero.textContent = dopo;
        chip.classList.add("is-aggiornata");
      })
      .fromTo(chip, { scale: 1.25 }, { scale: 1, duration: 0.4, ease: "back.out(2)" })
      .to(avviso, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, "+=0.15");
  });
}

// Mostra solo il figlio con lo stato richiesto (es. il cartellino "Valido"
// al posto di "Scaduto"). Gli altri ricevono la classe "is-nascosto".
function mostraStato(contenitore, stato) {
  contenitore.querySelectorAll("[data-stato]").forEach(function (elemento) {
    elemento.classList.toggle("is-nascosto", elemento.getAttribute("data-stato") !== stato);
  });
}

// 9. FUNZIONI PER LA SEGRETERIA (Home, sito v3)

// 9a. Quote: il versato sale da 150 a 250 €, la barra si riempie
//     e arriva la ricevuta con il timbro "Pronta"
function preparaQuote(schermata) {
  const euro = schermata.querySelector("[data-euro-da]");
  const prima = Number(euro.getAttribute("data-euro-da"));
  const dopo = Number(euro.getAttribute("data-euro-a"));
  const barra = schermata.querySelector(".mk-progresso i");
  const ricevuta = schermata.querySelector(".mk-ricevuta");
  const timbro = ricevuta.querySelector("em");
  const valore = { n: prima };

  euro.textContent = prima;
  gsap.set(barra, { scaleX: prima / dopo });
  gsap.set(ricevuta, { opacity: 0, y: 12 });
  gsap.set(timbro, { scale: 0, opacity: 0, rotation: -8 });

  quandoEntra(schermata, function () {
    gsap.timeline({ delay: 0.5 })
      .to(valore, {
        n: dopo,
        duration: 1.2,
        ease: "power2.out",
        onUpdate: function () { euro.textContent = Math.round(valore.n); },
      })
      .to(barra, { scaleX: 1, duration: 1.2, ease: "power2.out" }, "<")
      .to(ricevuta, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" })
      .to(timbro, { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(3)" });
  });
}

// 9b. Promemoria: il messaggio per il genitore si scrive da solo,
//     poi si preme "Apri WhatsApp"
function preparaPromemoria(schermata) {
  const scritta = schermata.querySelector(".mk-scrittura");
  const testo = scritta.getAttribute("data-testo");
  const bottone = schermata.querySelector(".mk-bottone");

  scritta.textContent = "";

  quandoEntra(schermata, function () {
    gsap.timeline({ delay: 0.4 })
      .add(scriviTesto(scritta, testo, 2.6))
      .to(bottone, { scale: 0.94, duration: 0.12, ease: "power1.in" }, "+=0.3")
      .to(bottone, { scale: 1, duration: 0.25, ease: "back.out(3)" });
  });
}

// 9c. Orari: sul giovedì cade il timbro "Annullato", l'orario si barra
//     e compare l'avviso in bacheca
function preparaOrari(schermata) {
  const giorno = schermata.querySelector("[data-variato]");
  const timbro = giorno.querySelector(".mk-timbro");
  const avviso = schermata.querySelector(".mk-avviso");

  giorno.classList.remove("is-annullato");
  gsap.set(timbro, { scale: 2.5, opacity: 0, rotation: -8 });
  gsap.set(avviso, { opacity: 0, y: 10 });

  quandoEntra(schermata, function () {
    gsap.timeline({ delay: 0.8 })
      .to(timbro, { scale: 1, opacity: 1, duration: 0.3, ease: "power3.in" })
      .add(function () { giorno.classList.add("is-annullato"); })
      .fromTo(giorno, { x: -4 }, { x: 0, duration: 0.5, ease: "elastic.out(1, 0.3)" })
      .to(avviso, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, "+=0.3");
  });
}

// 9d. Campi: gli Allievi si sovrappongono agli Esordienti (rosso),
//     vengono spostati alle 19:00 e il campo torna libero (azzurro)
function preparaCampi(schermata) {
  const fascia = schermata.querySelector("[data-sposta]");
  const esito = schermata.querySelector(".mk-esito");

  function mostraConflitto(inConflitto) {
    fascia.classList.toggle("is-conflitto", inConflitto);
    mostraStato(esito, inConflitto ? "conflitto" : "ok");
  }

  gsap.set(fascia, { left: "37.5%" });
  mostraConflitto(true);

  quandoEntra(schermata, function () {
    gsap.timeline({ delay: 1.4 })
      .to(fascia, { left: "50%", duration: 0.8, ease: "power2.inOut" })
      .add(function () { mostraConflitto(false); });
  });
}

// 5. LOGO CHE SI COMPONE (fine Home)
// I pezzi del simbolo cadono al loro posto, poi la scritta
// DIGITAL SPORTS DESK compare lettera per lettera
function animaLogo() {
  document.querySelectorAll(".cta-logo").forEach(function (logo) {
    const simbolo = logo.querySelectorAll(".logo__simbolo > *");
    const lettere = logo.querySelectorAll(".logo__scritta > *");

    gsap.timeline({ scrollTrigger: { trigger: logo, start: "top 85%" } })
      .from(simbolo, { y: -40, opacity: 0, duration: 0.8, stagger: 0.08, ease: "back.out(2)" })
      .from(lettere, { y: 8, opacity: 0, duration: 0.3, stagger: 0.03, ease: "power2.out" }, "-=0.3");
  });
}

// 6. PASSI PER PARTIRE (Contatti)
// Come una gif: quando la sezione entra nello schermo parte da sola e si ripete.
// Si accende il passo 1, la linea corre fino al 2 e poi fino al 3;
// pausa con tutto acceso, la linea sfuma e si ricomincia.
function animaPassi() {
  const passi = document.querySelector(".passi");
  if (!passi) return;

  const linea = passi.querySelector(".passi__linea i");
  const tappe = passi.querySelectorAll(".passo");

  function accendi(indice) {
    return function () { tappe[indice].classList.add("is-attivo"); };
  }

  function spegniTutto() {
    tappe.forEach(function (tappa) { tappa.classList.remove("is-attivo"); });
    gsap.set(linea, { scaleX: 0, opacity: 1 });
  }

  const giro = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.6 });
  giro
    .call(spegniTutto)
    .call(accendi(0), null, 0.4)
    .to(linea, { scaleX: 0.5, duration: 1, ease: "power1.inOut" }, 0.7)
    .call(accendi(1))
    .to(linea, { scaleX: 1, duration: 1, ease: "power1.inOut" }, "+=0.4")
    .call(accendi(2))
    .to(linea, { opacity: 0, duration: 0.5 }, "+=2");

  quandoEntra(passi, function () { giro.play(); });
}

// 7. PERCORSO DELLE 4 TAPPE (Come funziona)
// La barra si riempie mentre scorri le funzioni e la tappa che stai
// leggendo si accende
function animaPercorso() {
  const barra = document.getElementById("percorsoBarra");
  if (!barra) return;

  ScrollTrigger.create({
    trigger: "#funzioni-portale",
    start: "top 60%",
    end: "bottom 60%",
    onUpdate: function (stato) {
      gsap.set(barra, { scaleX: stato.progress });
    },
  });

  document.querySelectorAll(".percorso a").forEach(function (voce) {
    const funzione = document.getElementById(voce.getAttribute("data-tappa"));
    if (!funzione) return;

    ScrollTrigger.create({
      trigger: funzione,
      start: "top 60%",
      end: "bottom 60%",
      onToggle: function (stato) {
        voce.classList.toggle("is-attiva", stato.isActive);
      },
    });
  });
}

// 8. HOME D'IMPATTO

// 8a. Barra di lettura: in cima alla pagina, si riempie mentre scorri
function animaBarraLettura() {
  const barra = document.getElementById("barraLettura");
  if (!barra) return;

  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: function (stato) {
      gsap.set(barra, { scaleX: stato.progress });
    },
  });
}

// Aspetta la fine dell'intro video del logo prima di far partire un'animazione.
// L'intro si chiude quando il video finisce, quando si preme "Salta intro",
// se il browser blocca il video o comunque dopo 6,5 secondi (come in site.js)
function dopoIntro(azione) {
  const video = document.getElementById("introVideo");
  if (!video) {
    azione();
    return;
  }

  let partita = false;
  function parti() {
    if (partita) return;
    partita = true;
    gsap.delayedCall(0.6, azione);
  }

  video.addEventListener("ended", parti);
  video.addEventListener("error", parti);
  const salta = document.getElementById("introSkip");
  if (salta) salta.addEventListener("click", parti);

  setTimeout(function () { if (video.paused) parti(); }, 1000);
  setTimeout(parti, 6500);
}

// 8b. TABELLONE A LED (Home)
//     Una griglia di puntini disegnata su un <canvas>, come il tabellone
//     di uno stadio. Per ogni puntino, a ogni fotogramma, calcoliamo:
//       1. accensione → si accende solo se è dentro un cerchio che si
//                       allarga dal centro (dopo l'intro)
//       2. ola        → un'onda che attraversa il tabellone da sinistra a destra
//       3. mouse      → più il puntino è vicino alla freccia, più è grande,
//                       azzurro e spinto via di lato
//       4. onde d'urto → al clic parte un cerchio che si allarga e accende
//                       i puntini che attraversa (ogni tanto ne parte uno
//                       anche da solo, così il tabellone resta vivo)
//     Con fermo = true disegna un solo fotogramma, senza movimento.
function avviaTabellone(fermo) {
  const canvas = document.getElementById("tabellone");
  if (!canvas) return;

  const contesto = canvas.getContext("2d");
  const hero = canvas.parentElement;
  const DISTANZA = 26;        // spazio tra un puntino e l'altro (px)
  const RAGGIO_MOUSE = 220;   // fin dove arriva l'effetto della freccia (px)

  let larghezza = 0;
  let altezza = 0;
  let puntini = [];
  let tempo = 0;
  let visibile = true;
  const stato = { accensione: fermo ? 1 : 0 };
  const mouse = { x: -9999, y: -9999 };
  let onde = [];              // onde d'urto in corso: { x, y, raggio }

  // Crea la griglia di puntini grande quanto la hero
  function preparaGriglia() {
    const nitidezza = window.devicePixelRatio || 1;
    larghezza = hero.offsetWidth;
    altezza = hero.offsetHeight;
    canvas.width = larghezza * nitidezza;
    canvas.height = altezza * nitidezza;
    contesto.setTransform(nitidezza, 0, 0, nitidezza, 0, 0);

    puntini = [];
    for (let y = DISTANZA / 2; y < altezza; y += DISTANZA) {
      for (let x = DISTANZA / 2; x < larghezza; x += DISTANZA) {
        puntini.push({ x: x, y: y });
      }
    }
  }

  function disegna() {
    contesto.clearRect(0, 0, larghezza, altezza);
    const raggioAccensione = stato.accensione * Math.hypot(larghezza, altezza) * 0.6;

    puntini.forEach(function (puntino) {
      // 1. accensione dal centro
      const dalCentro = Math.hypot(puntino.x - larghezza / 2, puntino.y - altezza / 2);
      if (dalCentro > raggioAccensione) return;

      // 2. ola: un valore da 0 a 1 che scorre da sinistra a destra nel tempo
      const ola = (Math.sin(puntino.x * 0.012 - tempo * 2.2) + 1) / 2;

      // 3. mouse: 1 proprio sotto la freccia, 0 oltre RAGGIO_MOUSE
      const dx = puntino.x - mouse.x;
      const dy = puntino.y - mouse.y;
      const dalMouse = Math.hypot(dx, dy) || 1;
      const vicinanza = Math.max(0, 1 - dalMouse / RAGGIO_MOUSE);

      // 4. onde d'urto: il puntino si accende quando il cerchio gli passa sopra
      let urto = 0;
      onde.forEach(function (onda) {
        const distanzaDalBordo = Math.abs(Math.hypot(puntino.x - onda.x, puntino.y - onda.y) - onda.raggio);
        urto = Math.max(urto, (1 - distanzaDalBordo / 40) * onda.energia);
      });

      // L'effetto più forte vince: la freccia, l'onda d'urto o la ola (più leggera)
      const forza = Math.max(vicinanza, urto, ola * 0.35);

      // Spinta: il puntino si allontana dalla freccia
      const spinta = vicinanza * 18;
      const x = puntino.x + (dx / dalMouse) * spinta;
      const y = puntino.y + (dy / dalMouse) * spinta;

      contesto.beginPath();
      contesto.arc(x, y, 1.5 + forza * 6, 0, Math.PI * 2);
      contesto.fillStyle = "rgba(78, 158, 175, " + (0.2 + forza * 0.8) + ")";
      contesto.fill();
    });
  }

  // Fa partire un'onda d'urto da un punto
  function lanciaOnda(x, y) {
    onde.push({ x: x, y: y, raggio: 0, energia: 1 });
  }

  // Ciclo continuo: ridisegna circa 60 volte al secondo, ma solo se la hero è visibile
  function ciclo() {
    if (visibile) {
      tempo += 1 / 60;

      // le onde si allargano e perdono energia; quelle esaurite si tolgono
      onde.forEach(function (onda) {
        onda.raggio += 7;
        onda.energia -= 0.008;
      });
      onde = onde.filter(function (onda) { return onda.energia > 0; });

      disegna();
    }
    requestAnimationFrame(ciclo);
  }

  preparaGriglia();
  window.addEventListener("resize", function () {
    preparaGriglia();
    if (fermo) disegna();
  });

  if (fermo) {
    disegna();
    return;
  }

  // Posizione della freccia (o del dito) rispetto alla hero
  function aggiornaMouse(clientX, clientY) {
    const rettangolo = hero.getBoundingClientRect();
    mouse.x = clientX - rettangolo.left;
    mouse.y = clientY - rettangolo.top;
  }

  hero.addEventListener("mousemove", function (evento) {
    aggiornaMouse(evento.clientX, evento.clientY);
  });
  hero.addEventListener("touchmove", function (evento) {
    aggiornaMouse(evento.touches[0].clientX, evento.touches[0].clientY);
  }, { passive: true });
  hero.addEventListener("mouseleave", function () {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  // Clic o tocco: onda d'urto (non sui pulsanti e sui link)
  hero.addEventListener("pointerdown", function (evento) {
    if (evento.target.closest("a, button")) return;
    const rettangolo = hero.getBoundingClientRect();
    lanciaOnda(evento.clientX - rettangolo.left, evento.clientY - rettangolo.top);
  });

  // Ogni 3 secondi un'onda parte da sola da un punto a caso
  setInterval(function () {
    if (visibile && stato.accensione === 1) {
      lanciaOnda(Math.random() * larghezza, Math.random() * altezza);
    }
  }, 3000);

  // Quando la hero esce dallo schermo smettiamo di disegnare (risparmio batteria)
  ScrollTrigger.create({
    trigger: hero,
    start: "top bottom",
    end: "bottom top",
    onToggle: function (s) { visibile = s.isActive; },
  });

  // Dopo l'intro il tabellone si accende dal centro verso i bordi
  dopoIntro(function () {
    gsap.to(stato, { accensione: 1, duration: 1.8, ease: "power2.out" });
  });

  ciclo();
}

// 8b-bis. TITOLO DELLA HOME
//     site.js divide il titolo in parole (.word) e le fa salire.
//     Qui prendiamo l'ultima parola, "digitale.", la dividiamo in lettere
//     e le accendiamo in azzurro una alla volta, come i LED del tabellone;
//     poi le lettere fanno "la ola": saltano una dopo l'altra, come i
//     tifosi sugli spalti, e la ola si ripete ogni pochi secondi.
function animaTitolo() {
  const parole = document.querySelectorAll("#heroTitle .word");
  if (parole.length === 0) return;

  const ultima = parole[parole.length - 1];
  ultima.classList.add("hero__evidenza");
  ultima.innerHTML = ultima.textContent.split("").map(function (lettera) {
    return '<span class="lettera">' + lettera + "</span>";
  }).join("");

  const lettere = ultima.querySelectorAll(".lettera");

  dopoIntro(function () {
    gsap.timeline({ delay: 1.1 })
      .to(lettere, { color: "#4E9EAF", duration: 0.25, stagger: 0.07, ease: "none" })
      .add(faiLaOla, "+=0.3");
  });

  // La ola: le lettere salgono una dopo l'altra (0,06 secondi di distanza)
  // e poi tornano giù nello stesso ordine; si ripete ogni 3,5 secondi
  function faiLaOla() {
    gsap.timeline({ repeat: -1, repeatDelay: 3.5 })
      .to(lettere, { y: "-0.22em", duration: 0.28, ease: "power2.out", stagger: 0.06 })
      .to(lettere, { y: 0, duration: 0.35, ease: "power2.in", stagger: 0.06 }, 0.28);
  }
}

// 8c. Vetrina: lo schermo si "accende" come un televisore, partendo da una
//     linea sottile al centro e aprendosi in altezza mentre scorri.
//     Poi i cartellini arrivano dai lati come notifiche del portale.
function animaVetrina() {
  const vetrina = document.getElementById("vetrina");
  if (!vetrina) return;

  const immagine = document.getElementById("vetrinaImmagine");
  const cartellini = vetrina.querySelectorAll(".fluttuante");

  // inset(alto destra basso sinistra): 49% sopra e sotto = solo una linea al centro
  gsap.fromTo(immagine,
    { clipPath: "inset(49% 0% 49% 0%)", filter: "brightness(2.2)" },
    {
      clipPath: "inset(0% 0% 0% 0%)",
      filter: "brightness(1)",
      ease: "none",
      scrollTrigger: { trigger: vetrina, start: "top 90%", end: "top 35%", scrub: 1 },
    }
  );

  // Notifiche: quelle a sinistra entrano da sinistra, quelle a destra da destra
  cartellini.forEach(function (cartellino, indice) {
    const daSinistra = cartellino.classList.contains("fluttuante--1") || cartellino.classList.contains("fluttuante--4");
    gsap.from(cartellino, {
      x: daSinistra ? -80 : 80,
      opacity: 0,
      duration: 0.6,
      delay: indice * 0.25,
      ease: "back.out(1.6)",
      scrollTrigger: { trigger: vetrina, start: "top 40%" },
    });
  });
}

// 8d. Testimonianze: su computer le foto si colorano al passaggio del mouse (CSS);
//     su smartphone, dove il mouse non c'è, si colorano quando entrano nello schermo
function animaTestimonianze() {
  if (window.matchMedia("(hover: hover)").matches) return;

  document.querySelectorAll(".quote-card").forEach(function (card) {
    ScrollTrigger.create({
      trigger: card,
      start: "top 70%",
      end: "bottom 30%",
      onToggle: function (stato) {
        card.classList.toggle("is-a-colori", stato.isActive);
      },
    });
  });
}

// 8e. I numeri dei "tre motivi" entrano girando come carte
function animaMotivi() {
  const numeri = document.querySelectorAll(".reason-item__n");
  if (numeri.length === 0) return;

  gsap.from(numeri, {
    rotateY: 180,
    scale: 0.6,
    duration: 0.8,
    stagger: 0.2,
    ease: "back.out(1.6)",
    scrollTrigger: { trigger: ".reasons-grid", start: "top 80%" },
  });
}

// 10. UNA SOCIETÀ, TRE AREE (Home, sito v3)
// Come una gif: quando la sezione entra nello schermo parte da sola e si ripete.
//   1. la famiglia preme "Invia certificato" e il PDF viaggia verso la segreteria
//   2. in segreteria compare la richiesta
//   3. la segreteria preme "Aggiorna la scadenza": rosso → azzurro, il contatore scende
//   4. la conferma viaggia verso l'allenatore: Marco diventa "Idoneo"
function animaTreAree() {
  const treAree = document.getElementById("treAree");
  if (!treAree) return;

  const passi = treAree.querySelectorAll(".tre-aree__passi li");
  const schermi = treAree.querySelectorAll(".ta-schermo");
  const pacchetti = treAree.querySelectorAll(".ta-pacchetto");
  const documentoFamiglia = treAree.querySelector(".ta-doc");
  const bottoneInvia = treAree.querySelector(".ta-bottone");
  const richiesta = treAree.querySelector(".ta-richiesta");
  const bottoneAggiorna = richiesta.querySelector(".mk-bottone");
  const rigaScadenza = treAree.querySelector(".ta-riga");
  const pallino = rigaScadenza.querySelector(".mk-pallino");
  const marco = treAree.querySelector(".ta-atleta--marco");
  const contatore = treAree.querySelector('[data-ta="contatore"]');
  const numeroRichieste = treAree.querySelector('[data-ta="richieste"]');
  const idonei = treAree.querySelector('[data-ta="idonei"]');

  // Quale schermo lavora in ogni passo: famiglia, segreteria, segreteria, allenatore
  const schermoDelPasso = [0, 1, 1, 2];

  function accendiPasso(indice) {
    passi.forEach(function (passo, i) {
      passo.classList.toggle("is-attivo", i === indice);
    });
    schermi.forEach(function (schermo, i) {
      schermo.classList.toggle("is-attivo", i === schermoDelPasso[indice]);
    });
  }

  // Tutto come all'inizio della storia: certificato scaduto
  function inizio() {
    passi.forEach(function (passo) { passo.classList.remove("is-attivo"); });
    schermi.forEach(function (schermo) { schermo.classList.remove("is-attivo"); });
    mostraStato(documentoFamiglia, "scaduto");
    mostraStato(rigaScadenza, "scaduto");
    mostraStato(marco, "scaduto");
    pallino.classList.add("mk-pallino--rosso");
    richiesta.classList.add("is-nascosto");
    contatore.textContent = "03";
    numeroRichieste.textContent = "00";
    idonei.textContent = "11";
    gsap.set(pacchetti, { opacity: 0, "--avanzamento": 0 });
  }

  // Il pacchetto compare, corre lungo il filo e sparisce
  function viaggio(pacchetto) {
    return gsap.timeline()
      .to(pacchetto, { opacity: 1, duration: 0.2 })
      .to(pacchetto, { "--avanzamento": 1, duration: 1, ease: "power1.inOut" }, 0)
      .to(pacchetto, { opacity: 0, duration: 0.2 });
  }

  // Un clic su un pulsante finto
  function premi(bottone) {
    return gsap.timeline()
      .to(bottone, { scale: 0.94, duration: 0.12, ease: "power1.in" })
      .to(bottone, { scale: 1, duration: 0.25, ease: "back.out(3)" });
  }

  const giro = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.4 });
  giro
    .call(inizio)
    // 1. la famiglia invia
    .call(accendiPasso, [0], 0.6)
    .add(premi(bottoneInvia), 1.4)
    .call(function () { mostraStato(documentoFamiglia, "inviato"); })
    .add(viaggio(pacchetti[0]), "+=0.2")
    // 2. arriva in segreteria
    .call(function () {
      accendiPasso(1);
      richiesta.classList.remove("is-nascosto");
      numeroRichieste.textContent = "01";
    })
    .fromTo(richiesta, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out", immediateRender: false })
    // 3. la segreteria aggiorna la scadenza
    .call(accendiPasso, [2], "+=1.2")
    .add(premi(bottoneAggiorna), "+=0.5")
    .call(function () {
      richiesta.classList.add("is-nascosto");
      numeroRichieste.textContent = "00";
      mostraStato(rigaScadenza, "valido");
      mostraStato(documentoFamiglia, "valido");
      pallino.classList.remove("mk-pallino--rosso");
      contatore.textContent = "02";
    })
    .fromTo(contatore, { scale: 1.4 }, { scale: 1, duration: 0.4, ease: "back.out(2)", immediateRender: false })
    .fromTo(rigaScadenza, { backgroundColor: "rgba(216, 240, 243, 1)" }, { backgroundColor: "rgba(216, 240, 243, 0)", duration: 1.2, immediateRender: false }, "<")
    // 4. l'allenatore vede Marco idoneo
    .add(viaggio(pacchetti[1]), "+=0.2")
    .call(function () {
      accendiPasso(3);
      mostraStato(marco, "valido");
      idonei.textContent = "12";
    })
    .fromTo(idonei, { scale: 1.5 }, { scale: 1, duration: 0.4, ease: "back.out(2)", immediateRender: false })
    .fromTo(marco, { backgroundColor: "rgba(216, 240, 243, 1)" }, { backgroundColor: "rgba(216, 240, 243, 0)", duration: 1.2, immediateRender: false }, "<")
    // pausa con la storia finita, poi si ricomincia
    .to({}, { duration: 2.6 });

  quandoEntra(treAree, function () { giro.play(); });
}

// 11. GALLERIE DI SCHERMATE (Come funziona, sito v3)
// Si clicca una scheda e compare la schermata. Con automatica = true,
// quando la galleria entra nello schermo le schermate scorrono da sole
// ogni 5 secondi (la barretta sotto la scheda fa da timer); al primo
// clic si fermano, così chi legge decide cosa guardare.
function preparaGallerie(automatica) {
  document.querySelectorAll("[data-galleria]").forEach(function (galleria) {
    const schede = galleria.querySelectorAll("[data-mostra]");
    const immagini = galleria.querySelectorAll(".galleria__schermo img");
    const didascalia = galleria.querySelector(".galleria__didascalia");
    let attuale = 0;
    let timer = null;

    function mostra(indice) {
      attuale = indice;
      schede.forEach(function (scheda, i) {
        scheda.classList.toggle("is-attiva", i === indice);
        scheda.setAttribute("aria-selected", i === indice ? "true" : "false");
      });
      immagini.forEach(function (immagine, i) {
        immagine.classList.toggle("is-attiva", i === indice);
      });
      didascalia.textContent = immagini[indice].getAttribute("data-didascalia");
    }

    function prossima() {
      mostra((attuale + 1) % immagini.length);
      timer = setTimeout(prossima, 5000);
    }

    function avvia() {
      galleria.classList.add("is-in-corsa");
      mostra(attuale); // fa ripartire la barretta da zero
      timer = setTimeout(prossima, 5000);
    }

    function ferma() {
      clearTimeout(timer);
      galleria.classList.remove("is-in-corsa");
    }

    schede.forEach(function (scheda, i) {
      scheda.onclick = function () {
        ferma();
        mostra(i);
      };
    });

    mostra(0);
    if (automatica) quandoEntra(galleria, avvia);
  });
}

// 12. NASTRO DELLA HOME
// Due giri uguali uno dietro l'altro: il nastro si sposta di metà della sua
// lunghezza (un giro intero) e ricomincia da capo senza che si veda lo stacco.
// Scorre sempre alla stessa velocità: il mouse non lo cambia.
function animaNastro() {
  const nastro = document.querySelector(".nastro__scorri");
  if (!nastro) return;

  gsap.to(nastro, { xPercent: -50, duration: 32, ease: "none", repeat: -1 });
}

// VERSIONE FERMA: tutto già nello stato finale, senza movimento
function mostraStatoFinale() {
  // ferma anche le animazioni solo CSS (nastro e pallini delle notifiche)
  document.documentElement.classList.add("versione-ferma");

  // tabellone acceso, ma senza ola e senza mouse
  avviaTabellone(true);

  const sezione = document.getElementById("scadenziario-vivo");
  if (sezione) {
    const righe = sezione.querySelectorAll(".sv__riga");
    aggiornaScadenziario(righe, document.getElementById("svContatore"), righe.length);
  }

  document.querySelectorAll(".compare--animato").forEach(function (confronto) {
    confronto.classList.add("is-visto");
  });

  document.querySelectorAll(".passo").forEach(function (tappa) {
    tappa.classList.add("is-attivo");
  });

  document.querySelectorAll(".passi__linea i").forEach(function (linea) {
    linea.style.transform = "scaleX(1)";
  });
}
