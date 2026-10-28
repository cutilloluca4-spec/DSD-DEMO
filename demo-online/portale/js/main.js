/* ==================================================================
   D.S.D. — main.js (Portale v4)
   Il "cuore" dell'area Segreteria (index.html): primo avvio, salvataggio
   e caricamento dei dati, navigazione tra le sezioni (Panoramica, Atleti,
   Allenatori/Dirigenti, Magazzino, Società), scadenziario con filtri e
   riquadro "Da sistemare", e aggiornaTutto() che ridisegna la pagina.
   È caricato per ultimo: usa le funzioni degli altri file (vedi la
   mappa dei file in README.md) e all'avvio chiama i loro init...().
   Viene caricato anche da allenatore.html e famiglia.html, che però
   non hanno #app: in quel caso l'avvio della segreteria non parte.
   ================================================================== */

// 1. COSTANTI
// Ogni versione del portale ha la sua chiave di salvataggio, così non si
// sovrascrivono a vicenda. Al primo avvio la v4 copia i dati della v3 (o della v2)
// (senza modificarli), così non si riparte da zero.
const CHIAVE_SALVATAGGIO = "dsd_config_v4";
// Versioni precedenti: al primo avvio si copiano i loro dati (restano com'erano)
const CHIAVI_VERSIONI_PRECEDENTI = ["dsd_config_v3", "dsd_config_v2"];

const categorieDefault = {
  calcio: ["Primi Calci", "Pulcini", "Esordienti", "Giovanissimi", "Allievi", "Juniores", "Prima Squadra"],
  pallavolo: ["Minivolley", "Under 12", "Under 14", "Under 16", "Under 18", "Prima Squadra"],
  basket: ["Minibasket", "Under 13", "Under 15", "Under 17", "Under 19", "Prima Squadra"],
  tennis: ["Minitennis (Red/Orange)", "Under 12 Green", "Under 14", "Under 16", "Under 18", "Senior / Open", "Master / Over"],
};

let sportScelto = null;

// Configurazione attiva: società, categorie, atleti e magazzino
let configurazioneAttiva = null;

// 2. ONBOARDING
function initOnboarding() {
  const bottoniSport = document.querySelectorAll(".sport-option");

  bottoniSport.forEach(function (bottone) {
    bottone.onclick = function (event) {
      const targetBtn = event.target.closest("[data-sport]");
      if (targetBtn) {
        const sport = targetBtn.getAttribute("data-sport");
        selezionaSport(sport);
      }
    };
  });

  const btnBack = document.getElementById("ob-back");
  const btnSubmit = document.getElementById("ob-submit");
  const btnAdd = document.getElementById("btn-aggiungi-categoria");

  if (btnBack) btnBack.onclick = tornaStep1;
  if (btnSubmit) btnSubmit.onclick = confermaOnboarding;
  if (btnAdd) btnAdd.onclick = aggiungiCategoriaManuale;
}

function selezionaSport(sport) {
  sportScelto = sport;
  renderStep2(sport);

  document.getElementById("ob-step-1").classList.add("hidden");
  document.getElementById("ob-step-2").classList.remove("hidden");
  document.getElementById("ob-step-label").textContent = "Passo 2 di 2";
  document.getElementById("ob-progress").style.width = "100%";

  if (!motionRidotto() && typeof gsap !== "undefined") {
    gsap.fromTo("#ob-step-2", { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" });
  }
}

function tornaStep1() {
  document.getElementById("ob-step-2").classList.add("hidden");
  document.getElementById("ob-step-1").classList.remove("hidden");
  document.getElementById("ob-step-label").textContent = "Passo 1 di 2";
  document.getElementById("ob-progress").style.width = "50%";
}

function renderStep2(sport) {
  const lista = document.getElementById("categorie-form-list");
  lista.innerHTML = "";

  const categorie = sport === "altro" ? [] : (categorieDefault[sport] || []);

  categorie.forEach(function (categoria, indice) {
    lista.appendChild(creaRigaCategoria(categoria, indice));
  });

  const inputAltro = document.getElementById("altro-sport-input");
  if (inputAltro) {
    inputAltro.classList.toggle("hidden", sport !== "altro");
  }
}

function creaRigaCategoria(nomeCategoria, indice) {
  const riga = document.createElement("div");
  riga.className = "flex items-center gap-3 border border-[#E7EBEC] rounded-md px-3 py-2 bg-white";
  riga.innerHTML = `
    <input type="checkbox" checked data-index="${indice}" class="categoria-checkbox accent-[#4E9EAF] cursor-pointer">
    <input type="text" value="${pulisciTesto(nomeCategoria)}" data-index="${indice}" class="categoria-nome flex-1 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-[#4E9EAF] rounded-xs">
    <button type="button" class="btn-rimuovi-cat text-[#7A8285] hover:text-[#C94141] font-bold text-xs px-2 py-1 transition-colors cursor-pointer" title="Rimuovi categoria">✕</button>
  `;

  const btnRimuovi = riga.querySelector(".btn-rimuovi-cat");
  btnRimuovi.onclick = function () {
    riga.remove();
  };

  return riga;
}

function aggiungiCategoriaManuale() {
  const input = document.getElementById("nuova-categoria");
  if (!input) return;
  const valore = input.value.trim();
  if (valore === "") return;

  const lista = document.getElementById("categorie-form-list");
  const indice = lista.children.length;

  lista.appendChild(creaRigaCategoria(valore, indice));
  input.value = "";
  input.focus();
}

function confermaOnboarding() {
  const righe = document.querySelectorAll("#categorie-form-list > div");
  const categorieFinali = [];

  righe.forEach(function (riga) {
    const checkbox = riga.querySelector(".categoria-checkbox");
    const campoNome = riga.querySelector(".categoria-nome");

    if (checkbox && checkbox.checked && campoNome && campoNome.value.trim() !== "") {
      categorieFinali.push(campoNome.value.trim());
    }
  });

  if (categorieFinali.length === 0) {
    mostraAvviso("Seleziona o aggiungi almeno una categoria prima di continuare.", "errore");
    return;
  }

  const nomeSocieta = document.getElementById("ob-nome-societa").value.trim();
  const sportPersonalizzato = document.getElementById("nome-sport-personalizzato").value.trim();
  const conDatiDemo = document.getElementById("ob-dati-demo").checked;
  const sport = sportScelto || "calcio";

  let atleti = [];
  let allenatori = [];
  let magazzino = { prodotti: [], prenotazioni: [] };

  // Dati di esempio solo se richiesti: altrimenti si parte da zero
  if (conDatiDemo) {
    atleti = generaAtletiDemo(categorieFinali, sport);
    allenatori = generaAllenatoriDemo(categorieFinali);
    magazzino = generaMagazzinoDemo(sport, atleti);
  }

  const configurazione = {
    versione: 3,
    nomeSocieta: nomeSocieta,
    sport: sport,
    sportPersonalizzato: sportPersonalizzato,
    categorie: categorieFinali,
    atleti: atleti,
    allenatori: allenatori,
    magazzino: magazzino,
    // con i dati di esempio c'è già una quota, così si vedono acconti e saldi
    quotaPredefinita: conDatiDemo ? 250 : 0,
  };

  // Aggiunge i campi nuovi della v3 (logo, stagione, contatti, staff...)
  configurazioneAttiva = completaConfigurazione(configurazione);
  salvaConfigurazione();
  avviaApp();
}

function etichettaSport(sport) {
  if (sport === "calcio") return "Calcio";
  if (sport === "pallavolo") return "Pallavolo";
  if (sport === "basket") return "Basket";
  if (sport === "tennis") return "Tennis";
  if (configurazioneAttiva && configurazioneAttiva.sportPersonalizzato) return configurazioneAttiva.sportPersonalizzato;
  return "ASD";
}

// 3. STATO DOCUMENTI E FORMATTAZIONE
function calcolaStatoDocumento(dataScadenzaStr) {
  // Documento non ancora inserito
  if (!dataScadenzaStr) {
    return { stato: "mancante", giorniMancanti: null };
  }

  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);

  const scadenza = new Date(dataScadenzaStr);
  scadenza.setHours(0, 0, 0, 0);
  const giorniMancanti = Math.round((scadenza - oggi) / (1000 * 60 * 60 * 24));

  const stato = giorniMancanti < 0 ? "scaduto" : giorniMancanti <= 30 ? "in-scadenza" : "valido";

  return { stato: stato, giorniMancanti: giorniMancanti };
}

function etichettaGiorni(giorni) {
  if (giorni === null) return "Da inserire";
  if (giorni < 0) return `Scaduto da ${Math.abs(giorni)} giorni`;
  if (giorni === 0) return "Scade oggi";
  return `Tra ${giorni} giorni`;
}

function formattaData(dataStr) {
  if (!dataStr) return "Non specificata";
  const data = new Date(dataStr);
  return data.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

function formattaEuro(valore) {
  const numero = Number(valore) || 0;
  return "€ " + numero.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Evita che il testo inserito dall'utente venga letto come codice HTML
function pulisciTesto(testo) {
  if (testo === undefined || testo === null) return "";
  return String(testo)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Data di oggi in formato "aaaa-mm-gg", secondo l'ora italiana del computer
function oggiIso() {
  const oggi = new Date();
  return `${oggi.getFullYear()}-${String(oggi.getMonth() + 1).padStart(2, "0")}-${String(oggi.getDate()).padStart(2, "0")}`;
}

// ORDINAMENTI (usati dallo scadenziario e dai roster)
// Gravità: prima i documenti scaduti (dal più vecchio), poi quelli senza data,
// poi quelli in scadenza e per ultimi quelli in regola
const pesoGravita = { scaduto: 0, mancante: 1, "in-scadenza": 2, valido: 3 };

// a e b sono del tipo { stato: "scaduto", scadenza: "2026-10-01" }
function confrontaGravita(a, b) {
  const differenza = pesoGravita[a.stato] - pesoGravita[b.stato];
  if (differenza !== 0) return differenza;
  return confrontaDate(a.scadenza, b.scadenza);
}

// Date in ordine dalla più vicina; quelle mancanti vanno in fondo
function confrontaDate(a, b) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a < b ? -1 : a > b ? 1 : 0;
}

// Le categorie seguono l'ordine scelto dalla società (Società → Categorie)
function posizioneCategoria(categoria) {
  const posizione = configurazioneAttiva.categorie.indexOf(categoria);
  return posizione === -1 ? 999 : posizione;
}

// Annate dalla più vecchia (2010, 2011...); senza annata in fondo
function confrontaAnnate(a, b) {
  return confrontaDate(a, b);
}

function creaId(prefisso) {
  return `${prefisso}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

// Riduce una foto prima di salvarla, per non riempire la memoria del browser.
// formato: "image/jpeg" (predefinito, per le foto) o "image/png" (per il logo,
// così resta lo sfondo trasparente)
function riduciFoto(file, latoMassimo, callback, formato) {
  if (!file || file.type.indexOf("image/") !== 0) {
    mostraAvviso("Il file scelto non è un'immagine.", "errore");
    return;
  }
  const formatoFinale = formato || "image/jpeg";

  const lettore = new FileReader();
  lettore.onload = function () {
    const immagine = new Image();
    immagine.onload = function () {
      const scala = Math.min(1, latoMassimo / Math.max(immagine.width, immagine.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(immagine.width * scala);
      canvas.height = Math.round(immagine.height * scala);

      const contesto = canvas.getContext("2d");
      if (formatoFinale === "image/jpeg") {
        contesto.fillStyle = "#FFFFFF";
        contesto.fillRect(0, 0, canvas.width, canvas.height);
      }
      contesto.drawImage(immagine, 0, 0, canvas.width, canvas.height);

      callback(canvas.toDataURL(formatoFinale, 0.8));
    };
    immagine.src = lettore.result;
  };
  lettore.readAsDataURL(file);
}

// Inquadratura delle foto (prodotti e atleti): zoom e spostamento in %
function inquadraturaIniziale() {
  return { zoom: 1, x: 0, y: 0 };
}

// La foto parte sempre intera dentro la cornice (zoom 1 = foto completa).
// Lo zoom va da 0.5 (rimpicciolisce) a 3 (ingrandisce). Lo spostamento massimo
// dipende da quanto la foto è ingrandita o rimpicciolita, così resta sempre
// dentro la cornice (es. con zoom 1.4 o 0.6 si sposta al massimo del 20% per lato).
// Lo spazio libero attorno alla foto prende il colore del suo sfondo ("sfondo").
function limitaInquadratura(inquadratura) {
  const zoom = Math.max(0.5, Math.min(3, Number(inquadratura.zoom) || 1));
  const spostamentoMassimo = Math.abs(zoom - 1) * 50;
  const x = Math.max(-spostamentoMassimo, Math.min(spostamentoMassimo, inquadratura.x || 0));
  const y = Math.max(-spostamentoMassimo, Math.min(spostamentoMassimo, inquadratura.y || 0));

  // Numeri arrotondati a un decimale (es. 20 invece di 19.999999)
  return {
    zoom: zoom,
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
    sfondo: inquadratura.sfondo || "",
  };
}

function stileInquadratura(inquadratura) {
  const valori = limitaInquadratura(inquadratura || inquadraturaIniziale());
  return `transform: translate(${valori.x}%, ${valori.y}%) scale(${valori.zoom});`;
}

// Le frecce servono quando la foto è ingrandita o rimpicciolita: a zoom 1 le spegniamo
function aggiornaFrecceFoto(selettoreFrecce, inquadratura) {
  const zoomCambiato = limitaInquadratura(inquadratura).zoom !== 1;
  document.querySelectorAll(selettoreFrecce).forEach(function (freccia) {
    freccia.disabled = !zoomCambiato;
  });
}

function coloreSfondoFoto(inquadratura) {
  return inquadratura && inquadratura.sfondo ? inquadratura.sfondo : "#FFFFFF";
}

// Calcola il colore più frequente sui bordi della foto (es. il bianco dello sfondo
// di una foto tessera, anche se i capelli o la maglia toccano il bordo)
function calcolaColoreBordi(foto, callback) {
  const immagine = new Image();
  immagine.onload = function () {
    const lato = 40;
    const canvas = document.createElement("canvas");
    canvas.width = lato;
    canvas.height = lato;

    const contesto = canvas.getContext("2d");
    contesto.drawImage(immagine, 0, 0, lato, lato);
    const pixel = contesto.getImageData(0, 0, lato, lato).data;

    // Raggruppiamo i pixel della cornice esterna (2 pixel per lato) in "famiglie"
    // di colori simili e contiamo quale famiglia compare più volte
    const gruppi = {};
    let gruppoVincente = null;

    for (let y = 0; y < lato; y++) {
      for (let x = 0; x < lato; x++) {
        const sulBordo = x < 2 || y < 2 || x >= lato - 2 || y >= lato - 2;
        if (!sulBordo) continue;

        const indice = (y * lato + x) * 4;
        const r = pixel[indice];
        const g = pixel[indice + 1];
        const b = pixel[indice + 2];
        const chiave = `${Math.floor(r / 32)}-${Math.floor(g / 32)}-${Math.floor(b / 32)}`;

        if (!gruppi[chiave]) gruppi[chiave] = { conteggio: 0, rosso: 0, verde: 0, blu: 0 };
        gruppi[chiave].conteggio++;
        gruppi[chiave].rosso += r;
        gruppi[chiave].verde += g;
        gruppi[chiave].blu += b;

        if (!gruppoVincente || gruppi[chiave].conteggio > gruppoVincente.conteggio) {
          gruppoVincente = gruppi[chiave];
        }
      }
    }

    // Colore medio della famiglia più frequente
    const n = gruppoVincente.conteggio;
    callback(`rgb(${Math.round(gruppoVincente.rosso / n)}, ${Math.round(gruppoVincente.verde / n)}, ${Math.round(gruppoVincente.blu / n)})`);
  };
  immagine.src = foto;
}

// Frecce: spostano la foto di 5% alla volta; "centro" la rimette com'era
function spostaInquadratura(inquadratura, direzione) {
  if (direzione === "centro") {
    const iniziale = inquadraturaIniziale();
    iniziale.sfondo = inquadratura.sfondo;
    return iniziale;
  }

  if (direzione === "su") inquadratura.y -= 5;
  if (direzione === "giu") inquadratura.y += 5;
  if (direzione === "sinistra") inquadratura.x -= 5;
  if (direzione === "destra") inquadratura.x += 5;

  return limitaInquadratura(inquadratura);
}

// Quando cambia lo zoom, lo spostamento viene ricalcolato per non mostrare i bordi
function cambiaZoomInquadratura(inquadratura, nuovoZoom) {
  inquadratura.zoom = nuovoZoom;
  return limitaInquadratura(inquadratura);
}

// 4. SALVATAGGIO DATI (per ora nel browser)
// Tutti i dati della società stanno in UN SOLO oggetto, configurazioneAttiva
// (struttura completa in docs/dati.md). Si salva intero, come testo JSON,
// nella memoria del browser (localStorage) sotto la chiave CHIAVE_SALVATAGGIO.
// Le tre aree (segreteria, allenatore, famiglia) leggono e scrivono la stessa
// chiave: per questo nel prototipo sono collegate solo sullo stesso browser.
//
// >>> PUNTO DI AGGANCIO PER IL SERVER <<<
// Quando ci sarà un database, sono queste due funzioni da sostituire:
//   salvaConfigurazione()          -> scrive sul database
//   caricaConfigurazioneSalvata()  -> legge dal database
// Il resto del portale lavora su configurazioneAttiva e non sa dove
// finiscono i dati. Vedi "Verso il server" nel README.
function salvaConfigurazione() {
  try {
    localStorage.setItem(CHIAVE_SALVATAGGIO, JSON.stringify(configurazioneAttiva));
    return true;
  } catch (errore) {
    console.error("Salvataggio non riuscito.", errore);
    mostraAvviso("Memoria del browser piena: usa foto più leggere o elimina qualche immagine.", "errore");
    return false;
  }
}

// Indica da quale versione abbiamo copiato i dati all'avvio (per avvisare l'utente)
let datiImportatiDa = "";

function caricaConfigurazioneSalvata() {
  let salvato = localStorage.getItem(CHIAVE_SALVATAGGIO);

  // Primo avvio della v4: copiamo i dati della v3 (o della v2)
  // (le versioni precedenti restano com'erano, le leggiamo soltanto)
  const azzerata = localStorage.getItem(CHIAVE_SALVATAGGIO + "_azzerata");
  if (!salvato && !azzerata) {
    CHIAVI_VERSIONI_PRECEDENTI.forEach(function (chiave) {
      if (!salvato && localStorage.getItem(chiave)) {
        salvato = localStorage.getItem(chiave);
        datiImportatiDa = chiave.slice(-2);   // "v3" oppure "v2"
      }
    });
  }
  if (!salvato) return null;

  try {
    return completaConfigurazione(JSON.parse(salvato));
  } catch (errore) {
    console.error("Configurazione non valida.", errore);
    return null;
  }
}

// Aggiunge i campi mancanti (utile per i dati della v2 e per i backup più vecchi)
function completaConfigurazione(config) {
  config.versione = 4;
  if (!config.nomeSocieta) config.nomeSocieta = "";
  if (!config.categorie) config.categorie = [];
  if (!config.atleti) config.atleti = [];
  if (!config.magazzino) config.magazzino = { prodotti: [], prenotazioni: [] };
  if (!config.magazzino.prodotti) config.magazzino.prodotti = [];
  if (!config.magazzino.prenotazioni) config.magazzino.prenotazioni = [];

  // Novità della v3
  if (!config.magazzino.movimenti) config.magazzino.movimenti = [];
  if (!config.logo) config.logo = "";
  if (!config.stagione) config.stagione = stagioneSportiva();
  if (!config.contatti) config.contatti = { email: "", telefono: "", indirizzo: "", codiceAffiliazione: "" };
  if (!config.staff) config.staff = {};
  if (config.quotaPredefinita === undefined) config.quotaPredefinita = 0;
  if (!config.storicoStagioni) config.storicoStagioni = [];
  if (config.contatti.codiceFiscale === undefined) config.contatti.codiceFiscale = "";
  // Età dalla quale serve il certificato agonistico (nel calcio 12 anni)
  if (!config.etaAgonistica) config.etaAgonistica = 12;
  // Numerazione delle ricevute: riparte da 1 a ogni stagione
  if (!config.contatoreRicevute) config.contatoreRicevute = { stagione: config.stagione, ultimo: 0 };

  // Novità della v4: presenze, convocazioni e richieste dalle famiglie
  if (!config.presenze) config.presenze = [];
  if (!config.convocazioni) config.convocazioni = [];
  if (!config.richieste) config.richieste = [];
  if (!config.avvisi) config.avvisi = [];
  if (!config.orari) config.orari = {};
  if (!config.variazioniOrari) config.variazioniOrari = [];
  if (config.contatti.iban === undefined) config.contatti.iban = "";

  // Sezione Allenatori: la prima volta riprende lo staff scritto in Società
  if (!config.allenatori) config.allenatori = creaAllenatoriDaStaff(config);
  config.allenatori.forEach(function (allenatore) {
    completaAllenatore(allenatore);
  });

  config.atleti.forEach(function (atleta) {
    completaAtleta(atleta);
  });

  return config;
}

function resetConfigurazione() {
  chiediConferma({
    titolo: "Ricominciare da zero?",
    testo: "Tutti gli atleti, i prodotti e le prenotazioni salvati in questo browser verranno cancellati. Se vuoi conservarli, annulla e usa prima \"Scarica backup\".",
    conferma: "Cancella tutto",
    pericolo: true,
  }, function () {
    localStorage.removeItem(CHIAVE_SALVATAGGIO);
    // segno che la v4 è stata azzerata apposta: non ricopiamo i dati delle versioni precedenti
    localStorage.setItem(CHIAVE_SALVATAGGIO + "_azzerata", "si");
    window.location.reload();
  });
}

function scaricaBackup() {
  const testo = JSON.stringify(configurazioneAttiva, null, 2);
  const file = new Blob([testo], { type: "application/json" });
  const link = document.createElement("a");
  const oggi = new Date().toISOString().slice(0, 10);

  link.href = URL.createObjectURL(file);
  link.download = `dsd-backup-${oggi}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function ripristinaBackup(file) {
  if (!file) return;

  const lettore = new FileReader();
  lettore.onload = function () {
    try {
      const dati = JSON.parse(lettore.result);
      if (!dati.categorie || !dati.atleti) throw new Error("File non riconosciuto");

      chiediConferma({
        titolo: "Ripristinare il backup?",
        testo: "I dati attuali verranno sostituiti con quelli del file.",
        conferma: "Ripristina",
      }, function () {
        configurazioneAttiva = completaConfigurazione(dati);
        salvaConfigurazione();
        window.location.reload();
      });
    } catch (errore) {
      mostraAvviso("Questo file non è un backup D.S.D. valido.", "errore");
    }
  };
  lettore.readAsText(file);
}

// 5. NAVIGAZIONE TRA LE SEZIONI
let sezioneAttiva = "panoramica";

function mostraSezione(nomeSezione) {
  sezioneAttiva = nomeSezione;

  document.querySelectorAll(".sezione").forEach(function (sezione) {
    sezione.classList.add("hidden");
  });

  const sezione = document.getElementById(`sezione-${nomeSezione}`);
  if (sezione) sezione.classList.remove("hidden");

  // La scheda atleta fa parte della voce di menu "Atleti",
  // la pagina della categoria della voce "Panoramica"
  let voceDaEvidenziare = nomeSezione;
  if (nomeSezione === "scheda") voceDaEvidenziare = "atleti";
  if (nomeSezione === "categoria") voceDaEvidenziare = "panoramica";

  document.querySelectorAll(".voce-menu").forEach(function (voce) {
    voce.classList.toggle("voce-menu--attiva", voce.getAttribute("data-sezione") === voceDaEvidenziare);
  });

  window.scrollTo(0, 0);

  // La sezione Società si compila con i dati salvati ogni volta che si apre
  if (nomeSezione === "societa") apriSezioneSocieta();

  if (!motionRidotto() && typeof gsap !== "undefined" && sezione) {
    gsap.fromTo(sezione, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" });
  }
}

function initNavigazione() {
  document.querySelectorAll("[data-sezione]").forEach(function (bottone) {
    bottone.onclick = function () {
      mostraSezione(bottone.getAttribute("data-sezione"));
    };
  });
}

// 6. SEZIONE PANORAMICA
function renderCategorie(categorie, atleti) {
  const contenitore = document.getElementById("categorie-grid");
  if (!contenitore) return;
  let htmlAccumulato = "";

  categorie.forEach(function (categoria, index) {
    let conteggio = 0;
    atleti.forEach(function (atleta) {
      if (atleta.categoria === categoria) conteggio++;
    });

    htmlAccumulato += `
      <button type="button" data-categoria="${pulisciTesto(categoria)}" class="categoria-card text-left border border-[#E7EBEC] rounded-md p-4 bg-white shadow-xs hover:border-[#4E9EAF] transition-colors cursor-pointer">
        <p class="font-mono text-[11px] text-[#7A8285] mb-2">${String(index + 1).padStart(2, "0")}</p>
        <p class="text-base font-bold leading-tight mb-1 text-[#12181B]">${pulisciTesto(categoria)}</p>
        <p class="text-xs text-[#7A8285]">${conteggio} ${conteggio === 1 ? "atleta" : "atleti"}</p>
        ${testoStaffCategoria(categoria) ? `<p class="text-[11px] text-[#4E9EAF] font-medium truncate mt-1">${pulisciTesto(testoStaffCategoria(categoria))}</p>` : ""}
      </button>
    `;
  });

  contenitore.innerHTML = htmlAccumulato;
  const countEl = document.getElementById("categorie-count");
  if (countEl) countEl.textContent = categorie.length;

  // Clic su una categoria: apre la sua pagina (atleti, staff, scadenze, quote, materiale)
  contenitore.querySelectorAll("[data-categoria]").forEach(function (card) {
    card.onclick = function () {
      apriPaginaCategoria(card.getAttribute("data-categoria"));
    };
  });
}

// Filtro attivo dello scadenziario:
// "urgenti" (scaduti + entro 30 giorni), "tutte", "scaduto", "in-scadenza", "mancante"
let filtroScadenziario = "urgenti";
// Ordine: "gravita" (predefinito), "data", "categoria", "annata"
let ordineScadenziario = "gravita";
// Persone: "tutti", "atleti", "allenatori"
let personeScadenziario = "tutti";

// Tutte le scadenze di atleti e allenatori in un unico elenco
// persone: "tutti", "atleti" oppure "allenatori"
function raccogliScadenze(persone) {
  const scadenze = [];

  if (persone !== "allenatori") {
    configurazioneAttiva.atleti.forEach(function (atleta) {
      atleta.documenti.forEach(function (doc) {
        scadenze.push({
          id: atleta.id,
          staff: false,
          persona: nomeCompleto(atleta),
          categoria: atleta.categoria,
          categorie: [atleta.categoria],
          dettaglio: atleta.categoria,
          annata: annataAtleta(atleta),
          tipo: etichettaDocumento(doc.tipo),
          scadenza: doc.scadenza,
          stato: calcolaStatoDocumento(doc.scadenza).stato,
          giorni: calcolaStatoDocumento(doc.scadenza).giorniMancanti,
        });
      });
    });
  }

  if (persone !== "atleti") {
    configurazioneAttiva.allenatori.forEach(function (allenatore) {
      allenatore.documenti.forEach(function (doc) {
        if (!documentoDaMostrare(doc)) return; // facoltativo e senza data
        scadenze.push({
          id: allenatore.id,
          staff: true,
          persona: `${allenatore.nome} ${allenatore.cognome}`,
          categoria: allenatore.categorie[0] || "",
          categorie: allenatore.categorie,
          dettaglio: [allenatore.ruolo || "Staff"].concat(allenatore.categorie).join(" • "),
          annata: "",
          tipo: etichettaDocumento(doc.tipo),
          scadenza: doc.scadenza,
          stato: calcolaStatoDocumento(doc.scadenza).stato,
          giorni: calcolaStatoDocumento(doc.scadenza).giorniMancanti,
        });
      });
    });
  }

  return scadenze;
}

// Una riga dello scadenziario (usata anche nella pagina della categoria)
function htmlRigaScadenza(voce) {
  const apri = voce.staff ? `data-apri-allenatore="${voce.id}"` : `data-apri-atleta="${voce.id}"`;

  return `
    <div class="scadenziario-riga scadenziario-riga--${voce.stato} flex items-center bg-white hover:bg-[#F2F4F4]">
      <button type="button" ${apri} class="flex-1 min-w-0 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 pl-4 pr-2 py-3 cursor-pointer">
        <div class="flex items-center gap-4 min-w-0">
          <span class="stato-pallino stato-pallino--${voce.stato} w-2 h-2 rounded-full shrink-0"></span>
          <div class="min-w-0">
            <p class="text-sm font-bold text-[#12181B]">${voce.tipo} — ${pulisciTesto(voce.persona)}${voce.staff ? ` <span class="etichetta-staff">Staff</span>` : ""}</p>
            <p class="text-xs text-[#7A8285] truncate">${pulisciTesto(voce.dettaglio)}${voce.annata ? " • " + voce.annata : ""}</p>
          </div>
        </div>
        <div class="flex items-baseline gap-2 pl-6 sm:pl-0 sm:block sm:text-right shrink-0">
          <p class="font-mono text-sm font-semibold">${voce.scadenza ? formattaData(voce.scadenza) : "—"}</p>
          <p class="text-[11px] text-[#7A8285]">${etichettaGiorni(voce.giorni)}</p>
        </div>
      </button>
      <div class="flex flex-col sm:flex-row items-center gap-1 pr-3 shrink-0">${voce.stato === "valido" ? "" : htmlAzioniPromemoria(voce)}</div>
    </div>
  `;
}

// Nome del gruppo quando si ordina per categoria o per annata
function gruppoScadenza(voce) {
  if (ordineScadenziario === "categoria") return voce.categoria || "Staff senza categoria";
  if (ordineScadenziario === "annata") {
    if (voce.staff) return "Allenatori/Dirigenti";
    return voce.annata ? `Annata ${voce.annata}` : "Annata non indicata";
  }
  return "";
}

function ordinaScadenze(elenco) {
  // A parità, ordine alfabetico per persona
  elenco.sort(function (a, b) {
    return a.persona.localeCompare(b.persona, "it");
  });

  // La gravità è sempre il secondo criterio (anche dentro categorie e annate)
  elenco.sort(confrontaGravita);

  if (ordineScadenziario === "data") {
    elenco.sort(function (a, b) {
      return confrontaDate(a.scadenza, b.scadenza);
    });
  }
  if (ordineScadenziario === "categoria") {
    elenco.sort(function (a, b) {
      // Lo staff senza categoria va in fondo
      return posizioneCategoria(a.categoria) - posizioneCategoria(b.categoria);
    });
  }
  if (ordineScadenziario === "annata") {
    elenco.sort(function (a, b) {
      // Lo staff va dopo tutte le annate
      if (a.staff !== b.staff) return a.staff ? 1 : -1;
      return confrontaAnnate(a.annata, b.annata);
    });
  }
}

function renderScadenziario() {
  const scadenze = raccogliScadenze(personeScadenziario);

  // Teniamo solo le voci del filtro scelto
  const filtrate = scadenze.filter(function (voce) {
    if (filtroScadenziario === "tutte") return voce.stato !== "mancante";
    if (filtroScadenziario === "urgenti") return voce.stato === "scaduto" || voce.stato === "in-scadenza";
    return voce.stato === filtroScadenziario;
  });

  ordinaScadenze(filtrate);

  // Numero di voci per ogni filtro, mostrato sui pulsanti
  const conteggi = { urgenti: 0, tutte: 0, scaduto: 0, "in-scadenza": 0, mancante: 0 };
  scadenze.forEach(function (voce) {
    conteggi[voce.stato]++;
    if (voce.stato !== "mancante") conteggi.tutte++;
    if (voce.stato === "scaduto" || voce.stato === "in-scadenza") conteggi.urgenti++;
  });

  document.querySelectorAll("[data-filtro-scadenze]").forEach(function (bottone) {
    const filtro = bottone.getAttribute("data-filtro-scadenze");
    bottone.classList.toggle("filtro-stato--attivo", filtro === filtroScadenziario);
    bottone.querySelector("b").textContent = conteggi[filtro];
  });
  document.querySelectorAll("[data-ordine-scadenze]").forEach(function (bottone) {
    bottone.classList.toggle("ordine--attivo", bottone.getAttribute("data-ordine-scadenze") === ordineScadenziario);
  });
  document.querySelectorAll("[data-persone-scadenze]").forEach(function (bottone) {
    bottone.classList.toggle("ordine--attivo", bottone.getAttribute("data-persone-scadenze") === personeScadenziario);
  });

  const contenitore = document.getElementById("scadenziario-list");
  if (!contenitore) return;

  // Quante voci ci sono in ogni gruppo (per il titolo del gruppo)
  const quantiPerGruppo = {};
  filtrate.forEach(function (voce) {
    const gruppo = gruppoScadenza(voce);
    quantiPerGruppo[gruppo] = (quantiPerGruppo[gruppo] || 0) + 1;
  });

  let htmlAccumulato = "";
  let gruppoPrecedente = "";

  filtrate.forEach(function (voce) {
    const gruppo = gruppoScadenza(voce);
    if (gruppo !== "" && gruppo !== gruppoPrecedente) {
      const quante = quantiPerGruppo[gruppo];
      htmlAccumulato += `<p class="titolo-gruppo titolo-gruppo--elenco"><span>${pulisciTesto(gruppo)}</span><small>${quante} ${quante === 1 ? "scadenza" : "scadenze"}</small></p>`;
    }
    gruppoPrecedente = gruppo;

    htmlAccumulato += htmlRigaScadenza(voce);
  });

  if (filtrate.length === 0) {
    const messaggi = {
      urgenti: "Nessun documento scaduto o in scadenza nei prossimi 30 giorni. Ottimo lavoro!",
      tutte: "Nessuna scadenza inserita. Aggiungi le date dei documenti di atleti e allenatori.",
      scaduto: "Nessun documento scaduto.",
      "in-scadenza": "Nessun documento in scadenza nei prossimi 30 giorni.",
      mancante: "Tutti i documenti hanno una data di scadenza.",
    };
    htmlAccumulato = `<p class="px-4 py-6 text-sm text-[#7A8285] text-center">${messaggi[filtroScadenziario]}</p>`;
  }

  contenitore.innerHTML = htmlAccumulato;
  collegaAperturaSchede(contenitore);
  collegaAperturaAllenatori(contenitore);
}

// Riquadro "Da sistemare": conta i problemi e porta al roster già filtrato
function renderDaSistemare() {
  const atleti = configurazioneAttiva.atleti;
  const voci = [
    { filtro: "documenti", titolo: "Documenti scaduti", testo: "atleti con almeno un documento scaduto" },
    { filtro: "tutore", titolo: "Minorenni senza tutore", testo: "manca il genitore o tutore" },
    { filtro: "consensi", titolo: "Consensi privacy", testo: "atleti con consensi da raccogliere" },
    { filtro: "quota", titolo: "Quote da incassare", testo: "atleti con la quota non saldata" },
    { filtro: "certificato", titolo: "Certificato agonistico", testo: "hanno il non agonistico ma ne serve uno agonistico" },
  ];

  let htmlAccumulato = "";
  voci.forEach(function (voce) {
    const quanti = atleti.filter(function (atleta) {
      return atletaHaProblema(atleta, voce.filtro);
    }).length;

    htmlAccumulato += `
      <button type="button" data-filtro-problema="${voce.filtro}" class="da-sistemare ${quanti === 0 ? "da-sistemare--ok" : ""}">
        <span class="da-sistemare__numero">${quanti === 0 ? "✓" : quanti}</span>
        <span>
          <strong>${voce.titolo}</strong>
          <small>${quanti === 0 ? "tutto in ordine" : voce.testo}</small>
        </span>
      </button>
    `;
  });

  const contenitore = document.getElementById("da-sistemare");
  contenitore.innerHTML = htmlAccumulato;

  // Clic: apre il roster con il filtro corrispondente
  contenitore.querySelectorAll("[data-filtro-problema]").forEach(function (bottone) {
    bottone.onclick = function () {
      document.getElementById("filtro-categoria").value = "";
      document.getElementById("filtro-annata").value = "";
      document.getElementById("cerca-atleta").value = "";
      document.getElementById("filtro-problema").value = bottone.getAttribute("data-filtro-problema");
      renderAtleti();
      mostraSezione("atleti");
    };
  });
}

function renderStatistiche(categorie, atleti) {
  const statCat = document.getElementById("stat-categorie");
  const statAtl = document.getElementById("stat-atleti");
  const statSca = document.getElementById("stat-scadenze");
  const statPren = document.getElementById("stat-prenotazioni");
  const statQuote = document.getElementById("stat-quote");

  if (statCat) statCat.textContent = String(categorie.length).padStart(2, "0");
  if (statAtl) statAtl.textContent = String(atleti.length).padStart(2, "0");

  let daRinnovare = 0;

  // Documenti di atleti e allenatori
  atleti.concat(configurazioneAttiva.allenatori).forEach(function (persona) {
    persona.documenti.forEach(function (doc) {
      const infoStato = calcolaStatoDocumento(doc.scadenza);
      if (infoStato.stato === "scaduto" || infoStato.stato === "in-scadenza") daRinnovare++;
    });
  });

  if (statSca) statSca.textContent = String(daRinnovare).padStart(2, "0");
  if (statPren) statPren.textContent = String(contaPrenotazioniAperte()).padStart(2, "0");
  if (statQuote) statQuote.textContent = formattaEuro(totaleQuoteDaIncassare());
}

function renderIntestazione() {
  const config = configurazioneAttiva;
  const heroTitolo = document.getElementById("hero-title");
  const heroSub = document.getElementById("hero-sub");
  const headerNome = document.getElementById("header-nome-societa");

  if (config.nomeSocieta) {
    heroTitolo.innerHTML = `<span class="text-[#4E9EAF]">${pulisciTesto(config.nomeSocieta)}</span>`;
    heroSub.textContent = `${etichettaSport(config.sport)} • Stagione ${config.stagione} • Tesserati, documenti e magazzino.`;
    headerNome.textContent = config.nomeSocieta;
    document.title = `${config.nomeSocieta} — D.S.D.`;
  } else {
    heroTitolo.innerHTML = `Gestione <span id="hero-sport-name" class="text-[#4E9EAF]">${pulisciTesto(etichettaSport(config.sport))}</span>`;
    heroSub.textContent = `Stagione ${config.stagione} • Stato dei tesserati, visite mediche e documenti in scadenza.`;
    headerNome.textContent = "";
  }

  // Logo della società (se caricato in Società → Dati)
  const logoHeader = document.getElementById("header-logo-societa");
  const logoHero = document.getElementById("hero-logo-societa");
  [logoHeader, logoHero].forEach(function (immagine) {
    if (config.logo) {
      immagine.src = config.logo;
      immagine.classList.remove("hidden");
    } else {
      immagine.removeAttribute("src");
      immagine.classList.add("hidden");
    }
  });
}

// Esempio: da luglio 2026 a giugno 2027 la stagione è "2026/27"
function stagioneSportiva() {
  const oggi = new Date();
  const anno = oggi.getMonth() >= 6 ? oggi.getFullYear() : oggi.getFullYear() - 1;
  return `${anno}/${String(anno + 1).slice(2)}`;
}

// 7. AVVIO E AGGIORNAMENTO DELL'APP
function motionRidotto() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function animaIngressoApp() {
  if (motionRidotto() || typeof gsap === "undefined") return;

  const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

  tl.from("#app header", { y: -15, opacity: 0, duration: 0.4 })
    .from("#hero-title", { opacity: 0, y: 15, duration: 0.4 }, "-=0.2")
    .fromTo("#scoreboard", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 }, "-=0.2");
}

// Ridisegna tutte le sezioni dopo ogni modifica ai dati
function aggiornaTutto() {
  const config = configurazioneAttiva;

  renderIntestazione();
  popolaSelectCategorie(config.categorie);
  renderCategorie(config.categorie, config.atleti);
  renderAtleti();
  renderAllenatori();
  renderScadenziario();
  renderDaSistemare();
  renderRichieste();
  renderBacheca();
  renderSettimanaPanoramica();
  renderOggi();
  renderStatistiche(config.categorie, config.atleti);
  renderMagazzino();
  renderSocieta();

  // Se una scheda atleta è aperta, la aggiorniamo
  if (sezioneAttiva === "scheda" && atletaAperto) {
    renderSchedaAtleta(atletaAperto);
  }
  // ...e lo stesso per la pagina di una categoria
  if (sezioneAttiva === "categoria") renderPaginaCategoria();
}

function avviaApp() {
  const onboarding = document.getElementById("onboarding");
  const app = document.getElementById("app");

  if (onboarding) onboarding.classList.add("hidden");
  if (app) app.classList.remove("hidden");

  aggiornaTutto();
  mostraSezione("panoramica");
  animaIngressoApp();
}

// 8. AVVIO
document.addEventListener("DOMContentLoaded", function () {
  // Le aree Allenatore e Famiglia usano le stesse funzioni ma hanno un avvio loro
  if (!document.getElementById("app")) return;

  initFinestre();
  inserisciBarraAree("segreteria");
  initOnboarding();
  initNavigazione();
  initAtleti();
  initAllenatori();
  initMagazzino();
  initSocieta();
  initImportExport();
  initRicerca();
  initRicevute();
  initBacheca();
  initSettimanaPanoramica();
  initSezioniRichiudibili();

  // Filtri dello scadenziario
  document.querySelectorAll("[data-filtro-scadenze]").forEach(function (bottone) {
    bottone.onclick = function () {
      filtroScadenziario = bottone.getAttribute("data-filtro-scadenze");
      renderScadenziario();
    };
  });

  // Ordine dello scadenziario e persone da mostrare
  document.querySelectorAll("[data-ordine-scadenze]").forEach(function (bottone) {
    bottone.onclick = function () {
      ordineScadenziario = bottone.getAttribute("data-ordine-scadenze");
      renderScadenziario();
    };
  });
  document.querySelectorAll("[data-persone-scadenze]").forEach(function (bottone) {
    bottone.onclick = function () {
      personeScadenziario = bottone.getAttribute("data-persone-scadenze");
      renderScadenziario();
    };
  });

  const btnReset = document.getElementById("btn-reset-onboarding");
  if (btnReset) {
    btnReset.onclick = function (event) {
      event.preventDefault();
      resetConfigurazione();
    };
  }

  const btnBackup = document.getElementById("btn-scarica-backup");
  const inputRipristino = document.getElementById("input-ripristina-backup");

  if (btnBackup) btnBackup.onclick = scaricaBackup;
  if (inputRipristino) {
    inputRipristino.onchange = function () {
      ripristinaBackup(inputRipristino.files[0]);
      inputRipristino.value = "";
    };
  }

  // Se un allenatore o una famiglia (in un'altra scheda del browser) cambia i dati,
  // la segreteria si aggiorna da sola
  gestisciDatiEsterni(aggiornaTutto);

  const configurazioneSalvata = caricaConfigurazioneSalvata();

  if (configurazioneSalvata) {
    configurazioneAttiva = configurazioneSalvata;
    avviaApp();

    // Salviamo subito i campi aggiunti (es. lo staff diventato sezione Allenatori)
    salvaConfigurazione();
    if (datiImportatiDa) {
      mostraAvviso(`Ho copiato nella v4 i dati del portale ${datiImportatiDa}, che resta com'era.`, "ok");
    }
  } else if (!motionRidotto() && typeof gsap !== "undefined") {
    gsap.from("#onboarding-card", { opacity: 0, y: 20, duration: 0.4, ease: "power2.out" });
  }
});
