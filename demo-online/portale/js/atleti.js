/* ==================================================================
   D.S.D. — atleti.js (Portale v4)
   Roster atleti con filtri, scheda atleta completa (quota, consensi
   privacy, genitore o tutore), modulo di inserimento e modifica,
   controllo completo del codice fiscale e dati demo.
   ================================================================== */

// 1. COSTANTI ATLETI
const tipiDocumento = ["Visite Mediche", "Tesseramento Atleta", "CI"];

const ruoliPerSport = {
  calcio: ["Portiere", "Difensore", "Centrocampista", "Attaccante"],
  pallavolo: ["Palleggiatore", "Opposto", "Schiacciatore", "Centrale", "Libero"],
  basket: ["Playmaker", "Guardia", "Ala piccola", "Ala grande", "Centro"],
  tennis: ["Singolarista", "Doppista"],
};

const taglieAbbigliamento = ["4A", "6A", "8A", "10A", "12A", "14A", "XS", "S", "M", "L", "XL", "XXL"];

const nomiDemo = [
  { nome: "Marco", cognome: "Rossi", sesso: "M" },
  { nome: "Giulia", cognome: "Bianchi", sesso: "F" },
  { nome: "Luca", cognome: "Ferrari", sesso: "M" },
  { nome: "Sara", cognome: "Colombo", sesso: "F" },
  { nome: "Davide", cognome: "Ricci", sesso: "M" },
  { nome: "Elena", cognome: "Marino", sesso: "F" },
  { nome: "Andrea", cognome: "Greco", sesso: "M" },
  { nome: "Chiara", cognome: "Conti", sesso: "F" },
  { nome: "Matteo", cognome: "Bruno", sesso: "M" },
  { nome: "Alice", cognome: "Galli", sesso: "F" },
  { nome: "Simone", cognome: "De Luca", sesso: "M" },
  { nome: "Francesca", cognome: "Villa", sesso: "F" },
  { nome: "Tommaso", cognome: "Serra", sesso: "M" },
  { nome: "Giorgia", cognome: "Fontana", sesso: "F" },
  { nome: "Riccardo", cognome: "Costa", sesso: "M" },
  { nome: "Beatrice", cognome: "Rinaldi", sesso: "F" },
  { nome: "Alessio", cognome: "Farina", sesso: "M" },
  { nome: "Martina", cognome: "Longo", sesso: "F" },
  { nome: "Federico", cognome: "Basso", sesso: "M" },
  { nome: "Camilla", cognome: "Moretti", sesso: "F" },
];

const cittaDemo = [
  { comune: "Cremona", provincia: "CR", cap: "26100", codice: "D150" },
  { comune: "Brescia", provincia: "BS", cap: "25121", codice: "B157" },
  { comune: "Milano", provincia: "MI", cap: "20121", codice: "F205" },
  { comune: "Bergamo", provincia: "BG", cap: "24121", codice: "A794" },
  { comune: "Verona", provincia: "VR", cap: "37121", codice: "L781" },
];

// Atleta di cui è aperta la scheda e atleta in modifica nel modulo
let atletaAperto = null;
let atletaInModifica = null;

// 2. FUNZIONI DI SUPPORTO
function nomeCompleto(atleta) {
  return `${atleta.nome} ${atleta.cognome}`.trim();
}

function etichettaDocumento(tipo) {
  if (tipo === "Visite Mediche") return "Visita Medica";
  if (tipo === "Tesseramento Atleta") return "Tesseramento";
  if (tipo === "CI") return "Documento d'Identità";
  // Documenti dello staff (sezione Allenatori)
  if (tipo === "Tesseramento Tecnico") return "Tesseramento";
  if (tipo === "Casellario Giudiziale") return "Casellario";
  if (tipo === "Corso BLSD") return "BLSD";
  return tipo;
}

function calcolaEta(dataNascita) {
  if (!dataNascita) return null;
  const oggi = new Date();
  const nascita = new Date(dataNascita);
  let eta = oggi.getFullYear() - nascita.getFullYear();
  const compleannoNonPassato = oggi.getMonth() < nascita.getMonth() ||
    (oggi.getMonth() === nascita.getMonth() && oggi.getDate() < nascita.getDate());
  if (compleannoNonPassato) eta--;
  return eta;
}

function trovaAtleta(id) {
  return configurazioneAttiva.atleti.find(function (atleta) {
    return atleta.id === id;
  });
}

function iniziali(atleta) {
  return ((atleta.nome || " ")[0] + (atleta.cognome || " ")[0]).toUpperCase();
}

// Completa un atleta con tutti i campi della scheda (anche i dati del portale originale)
function completaAtleta(atleta) {
  // Il portale originale aveva un unico campo "nome" con nome e cognome
  if (atleta.cognome === undefined) {
    const parti = String(atleta.nome || "").trim().split(" ");
    atleta.nome = parti.shift() || "";
    atleta.cognome = parti.join(" ");
  }
  if (atleta.indirizzo === undefined) atleta.indirizzo = atleta.residenza || "";

  const campiTesto = ["sesso", "foto", "luogoNascita", "codiceFiscale", "comune", "cap", "provincia",
    "telefono", "email", "ruolo", "numeroMaglia", "matricola", "dataIscrizione", "note"];

  campiTesto.forEach(function (campo) {
    if (atleta[campo] === undefined) atleta[campo] = "";
  });

  if (!atleta.tipoCertificato) atleta.tipoCertificato = "Agonistico";
  if (!atleta.tutore) atleta.tutore = { nome: "", telefono: "", email: "" };
  if (!atleta.taglie) atleta.taglie = { maglia: "", pantaloncini: "", scarpe: "" };
  if (!atleta.documenti) atleta.documenti = [];

  // Novità della v3: quota associativa e consensi privacy.
  // quota.importo vuoto = si usa la quota predefinita della società
  if (!atleta.quota) atleta.quota = { importo: "", pagamenti: [] };
  if (!atleta.quota.pagamenti) atleta.quota.pagamenti = [];
  if (!atleta.consensi) atleta.consensi = { trattamento: false, sanitari: false, immagini: false, data: "" };

  // Ogni atleta ha sempre i tre documenti, anche senza data
  tipiDocumento.forEach(function (tipo) {
    const presente = atleta.documenti.some(function (doc) {
      return doc.tipo === tipo;
    });
    if (!presente) atleta.documenti.push({ tipo: tipo, scadenza: "" });
  });

  return atleta;
}

// 3. CODICE FISCALE
const lettereMesi = "ABCDEHLMPRST";

// Calcola l'ultima lettera del codice fiscale (il "carattere di controllo").
// Regola ufficiale: ogni carattere vale un numero, diverso se è in posizione
// dispari o pari; si sommano i valori, si divide per 26 e il resto indica
// la lettera (0 = A, 1 = B, ... 25 = Z).
const valoriDispari = [1, 0, 5, 7, 9, 13, 15, 17, 19, 21, 2, 4, 18, 20, 11, 3, 6, 8, 12, 14, 16, 10, 22, 25, 24, 23];

function carattereControlloCF(primi15) {
  let somma = 0;

  for (let i = 0; i < 15; i++) {
    const carattere = primi15[i];
    // cifre e lettere diventano un numero da 0 a 25 (0-9 per le cifre, A=0 ... Z=25)
    const numero = carattere >= "0" && carattere <= "9" ? Number(carattere) : carattere.charCodeAt(0) - 65;

    // posizioni 1, 3, 5... (dispari contando da 1) usano la tabella valoriDispari
    somma += i % 2 === 0 ? valoriDispari[numero] : numero;
  }

  return String.fromCharCode(65 + (somma % 26));
}

// Controlla formato, ultima lettera e coerenza con data di nascita e sesso
function verificaCodiceFiscale(cf, dataNascita, sesso) {
  const codice = String(cf || "").toUpperCase().trim();

  if (codice === "") return { stato: "vuoto", messaggio: "" };

  const formato = /^[A-Z]{6}[0-9]{2}[ABCDEHLMPRST][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
  if (!formato.test(codice)) {
    return { stato: "errato", messaggio: "Formato non valido: servono 16 caratteri (es. RSSMRC16A01D150Y)." };
  }

  if (carattereControlloCF(codice.slice(0, 15)) !== codice[15]) {
    return { stato: "errato", messaggio: "L'ultima lettera non torna: probabilmente c'è un errore di battitura." };
  }

  const datiDalCodice = leggiDatiCodiceFiscale(codice);
  const problemi = [];

  if (dataNascita && datiDalCodice.dataNascita !== dataNascita) {
    problemi.push("la data di nascita");
  }
  if (sesso && datiDalCodice.sesso !== sesso) {
    problemi.push("il sesso");
  }

  if (problemi.length > 0) {
    return { stato: "incoerente", messaggio: `Attenzione: il codice non corrisponde con ${problemi.join(" e ")}.` };
  }

  return { stato: "corretto", messaggio: "Codice fiscale corretto." };
}

// Ricava data di nascita e sesso dal codice fiscale
function leggiDatiCodiceFiscale(codice) {
  const anno2Cifre = Number(codice.slice(6, 8));
  const mese = lettereMesi.indexOf(codice[8]) + 1;
  let giorno = Number(codice.slice(9, 11));
  let sesso = "M";

  if (giorno > 40) {
    giorno = giorno - 40;
    sesso = "F";
  }

  // Esempio: "10" diventa 2010, "85" diventa 1985
  const annoCorrente2Cifre = new Date().getFullYear() % 100;
  const anno = anno2Cifre <= annoCorrente2Cifre ? 2000 + anno2Cifre : 1900 + anno2Cifre;

  const dataNascita = `${anno}-${String(mese).padStart(2, "0")}-${String(giorno).padStart(2, "0")}`;
  return { dataNascita: dataNascita, sesso: sesso };
}

// Crea un codice fiscale verosimile per gli atleti demo
function creaCodiceFiscaleDemo(nome, cognome, dataNascita, sesso, codiceComune) {
  function parteNome(testo) {
    const lettere = testo.toUpperCase().replace(/[^A-Z]/g, "");
    const consonanti = lettere.replace(/[AEIOU]/g, "");
    const vocali = lettere.replace(/[^AEIOU]/g, "");
    return (consonanti + vocali + "XXX").slice(0, 3);
  }

  const parti = dataNascita.split("-");
  const giorno = Number(parti[2]) + (sesso === "F" ? 40 : 0);

  const primi15 = parteNome(cognome) + parteNome(nome) + parti[0].slice(2) +
    lettereMesi[Number(parti[1]) - 1] + String(giorno).padStart(2, "0") + codiceComune;

  return primi15 + carattereControlloCF(primi15);
}

// QUOTA ASSOCIATIVA
// Importo della quota: quello dell'atleta, oppure la quota predefinita della società
function importoQuota(atleta) {
  if (atleta.quota.importo !== "" && atleta.quota.importo !== null) return Number(atleta.quota.importo);
  return Number(configurazioneAttiva.quotaPredefinita) || 0;
}

function versatoQuota(atleta) {
  let totale = 0;
  atleta.quota.pagamenti.forEach(function (pagamento) {
    totale += Number(pagamento.importo) || 0;
  });
  return totale;
}

// "nessuna" (quota a 0), "pagata", "parziale" (acconto) o "da-pagare"
function statoQuota(atleta) {
  const importo = importoQuota(atleta);
  const versato = versatoQuota(atleta);
  if (importo <= 0) return "nessuna";
  if (versato >= importo) return "pagata";
  if (versato > 0) return "parziale";
  return "da-pagare";
}

function etichettaStatoQuota(stato) {
  if (stato === "pagata") return "Pagata";
  if (stato === "parziale") return "Acconto";
  if (stato === "da-pagare") return "Da pagare";
  return "Nessuna quota";
}

function totaleQuoteDaIncassare() {
  let totale = 0;
  configurazioneAttiva.atleti.forEach(function (atleta) {
    totale += Math.max(0, importoQuota(atleta) - versatoQuota(atleta));
  });
  return totale;
}

// CONSENSI PRIVACY: trattamento dei dati e dati sanitari sono indispensabili
function consensiCompleti(atleta) {
  return atleta.consensi.trattamento && atleta.consensi.sanitari;
}

function eMinorenne(atleta) {
  const eta = calcolaEta(atleta.dataNascita);
  return eta !== null && eta < 18;
}

function mancaTutore(atleta) {
  return eMinorenne(atleta) && (!atleta.tutore.nome || (!atleta.tutore.telefono && !atleta.tutore.email));
}

// Usata dai filtri del roster e dal riquadro "Da sistemare" della Panoramica
// CERTIFICATO MEDICO
// Nel calcio l'attività agonistica parte dalla stagione in cui si compiono
// 12 anni (stagione dal 1° luglio al 30 giugno). L'età si cambia in Società.
function fineStagione() {
  const anno = Number(String(configurazioneAttiva.stagione).slice(0, 4));
  return `${anno + 1}-06-30`;
}

function serveAgonistico(atleta) {
  if (!atleta.dataNascita) return false;
  const anno = Number(atleta.dataNascita.slice(0, 4)) + Number(configurazioneAttiva.etaAgonistica);
  const compleanno = anno + atleta.dataNascita.slice(4);   // es. "2014-03-15" -> "2026-03-15"
  return compleanno <= fineStagione();
}

// Ha il certificato non agonistico ma per età gli serve quello agonistico
function certificatoDaCambiare(atleta) {
  return atleta.tipoCertificato !== "Agonistico" && serveAgonistico(atleta);
}

function atletaHaProblema(atleta, tipo) {
  if (tipo === "documenti") {
    return atleta.documenti.some(function (doc) {
      return calcolaStatoDocumento(doc.scadenza).stato === "scaduto";
    });
  }
  if (tipo === "tutore") return mancaTutore(atleta);
  if (tipo === "consensi") return !consensiCompleti(atleta);
  if (tipo === "quota") return statoQuota(atleta) === "da-pagare" || statoQuota(atleta) === "parziale";
  if (tipo === "minorenni") return eMinorenne(atleta);
  if (tipo === "certificato") return certificatoDaCambiare(atleta);
  return false;
}

// 4. GENERAZIONE ATLETI DEMO
function generaAtletiDemo(categorie, sport) {
  const atleti = [];
  const ruoli = ruoliPerSport[sport] || [];
  const annoCorrente = new Date().getFullYear();
  let contatore = 0;

  categorie.forEach(function (categoria, indiceCategoria) {
    // Le prime categorie sono le più giovani: età da 7 a 25 anni circa
    const passoEta = categorie.length > 1 ? 18 / (categorie.length - 1) : 0;
    const etaCategoria = 7 + Math.round(indiceCategoria * passoEta);

    for (let j = 0; j < 2; j++) {
      const persona = nomiDemo[contatore % nomiDemo.length];
      const citta = cittaDemo[contatore % cittaDemo.length];
      const eta = etaCategoria + j;
      const annoNascita = annoCorrente - eta - 1;
      const mese = String((contatore % 12) + 1).padStart(2, "0");
      const giorno = String((contatore % 25) + 1).padStart(2, "0");
      const dataNascita = `${annoNascita}-${mese}-${giorno}`;
      const minorenne = eta < 18;

      let tagliaMaglia = ["S", "M", "L", "XL"][contatore % 4];
      if (eta < 9) tagliaMaglia = "8A";
      else if (eta < 11) tagliaMaglia = "10A";
      else if (eta < 13) tagliaMaglia = "12A";
      else if (eta < 15) tagliaMaglia = "14A";

      const genitori = ["Paolo", "Laura", "Roberto", "Silvia"];

      atleti.push({
        id: `atl-${contatore}`,
        nome: persona.nome,
        cognome: persona.cognome,
        sesso: persona.sesso,
        foto: "",
        dataNascita: dataNascita,
        luogoNascita: `${citta.comune} (${citta.provincia})`,
        codiceFiscale: creaCodiceFiscaleDemo(persona.nome, persona.cognome, dataNascita, persona.sesso, citta.codice),
        indirizzo: `Via Roma ${contatore + 12}`,
        comune: citta.comune,
        cap: citta.cap,
        provincia: citta.provincia,
        telefono: minorenne ? "" : `333 10${String(contatore).padStart(5, "0")}`,
        email: minorenne ? "" : `${persona.nome.toLowerCase()}.${persona.cognome.toLowerCase().replace(" ", "")}@email.it`,
        tutore: minorenne
          ? { nome: `${genitori[contatore % 4]} ${persona.cognome}`, telefono: `347 20${String(contatore).padStart(5, "0")}`, email: `famiglia.${persona.cognome.toLowerCase().replace(" ", "")}@email.it` }
          : { nome: "", telefono: "", email: "" },
        categoria: categoria,
        ruolo: ruoli.length > 0 ? ruoli[contatore % ruoli.length] : "",
        numeroMaglia: String((contatore % 23) + 1),
        matricola: String(4100000 + contatore * 137),
        dataIscrizione: `${annoCorrente - (contatore % 5) - 1}-09-01`,
        tipoCertificato: eta < 12 ? "Non agonistico" : "Agonistico",
        taglie: { maglia: tagliaMaglia, pantaloncini: tagliaMaglia, scarpe: String(eta < 14 ? 26 + eta : 40 + (contatore % 5)) },
        note: "",
        quota: { importo: "", pagamenti: contatore % 3 === 0 ? [] : [{ data: oggiIso(), importo: contatore % 3 === 1 ? 100 : 250 }] },
        consensi: { trattamento: contatore % 4 !== 0, sanitari: contatore % 4 !== 0, immagini: contatore % 2 === 0, data: contatore % 4 !== 0 ? oggiIso() : "" },
        documenti: [
          { tipo: "Visite Mediche", scadenza: calcolaDataDemo(contatore, 0) },
          { tipo: "Tesseramento Atleta", scadenza: calcolaDataDemo(contatore, 1) },
          { tipo: "CI", scadenza: calcolaDataDemo(contatore, 2) },
        ],
      });
      contatore++;
    }
  });

  return atleti;
}

function calcolaDataDemo(indiceAtleta, indiceDocumento) {
  const chiave = (indiceAtleta + indiceDocumento) % 3;
  let offsetGiorni;

  if (chiave === 0) {
    offsetGiorni = -(3 + (indiceAtleta % 25));
  } else if (chiave === 1) {
    offsetGiorni = 5 + (indiceAtleta % 20);
  } else {
    offsetGiorni = 45 + (indiceAtleta % 200);
  }

  const data = new Date();
  data.setDate(data.getDate() + offsetGiorni);
  return data.toISOString().slice(0, 10);
}

// 5. ROSTER ATLETI
function popolaSelectCategorie(categorie) {
  const selectModal = document.getElementById("atl-categoria");
  const selectFiltro = document.getElementById("filtro-categoria");
  const filtroAttuale = selectFiltro ? selectFiltro.value : "";

  if (selectModal) {
    selectModal.innerHTML = "";
    categorie.forEach(function (cat) {
      const option = document.createElement("option");
      option.value = cat;
      option.textContent = cat;
      selectModal.appendChild(option);
    });
  }

  if (selectFiltro) {
    selectFiltro.innerHTML = `<option value="">Tutte le categorie</option>`;
    categorie.forEach(function (cat) {
      const option = document.createElement("option");
      option.value = cat;
      option.textContent = cat;
      selectFiltro.appendChild(option);
    });
    selectFiltro.value = filtroAttuale;
  }

  // Ruoli suggeriti in base allo sport
  const listaRuoli = document.getElementById("lista-ruoli");
  if (listaRuoli) {
    const ruoli = ruoliPerSport[configurazioneAttiva.sport] || [];
    listaRuoli.innerHTML = ruoli.map(function (ruolo) {
      return `<option value="${ruolo}"></option>`;
    }).join("");
  }

  // Taglie per maglia e pantaloncini
  document.querySelectorAll(".select-taglie").forEach(function (select) {
    let opzioni = `<option value="">—</option>`;
    taglieAbbigliamento.forEach(function (taglia) {
      opzioni += `<option value="${taglia}">${taglia}</option>`;
    });
    select.innerHTML = opzioni;
  });
}

// Annata di nascita, es. "2010" (vuota se manca la data)
function annataAtleta(atleta) {
  return atleta.dataNascita ? atleta.dataNascita.slice(0, 4) : "";
}

// Il documento più urgente di un atleta (o di un allenatore), secondo la gravità
function documentoPiuUrgente(persona) {
  let peggiore = null;
  persona.documenti.forEach(function (doc) {
    const voce = { stato: calcolaStatoDocumento(doc.scadenza).stato, scadenza: doc.scadenza };
    if (!peggiore || confrontaGravita(voce, peggiore) < 0) peggiore = voce;
  });
  return peggiore || { stato: "valido", scadenza: "" };
}

// La prima data di scadenza tra i documenti ("" se nessuno ha una data)
function prossimaScadenza(persona) {
  let prima = "";
  persona.documenti.forEach(function (doc) {
    if (doc.scadenza && (prima === "" || doc.scadenza < prima)) prima = doc.scadenza;
  });
  return prima;
}

// Menu delle annate presenti nel roster (es. 2010, 2011, 2012...)
function popolaFiltroAnnate() {
  const select = document.getElementById("filtro-annata");
  const scelta = select.value;
  const annate = [];

  configurazioneAttiva.atleti.forEach(function (atleta) {
    const annata = annataAtleta(atleta);
    if (annata && annate.indexOf(annata) === -1) annate.push(annata);
  });
  annate.sort();

  select.innerHTML = `<option value="">Tutte le annate</option>`;
  annate.forEach(function (annata) {
    select.innerHTML += `<option value="${annata}">Annata ${annata}</option>`;
  });
  select.value = annate.indexOf(scelta) !== -1 ? scelta : "";
}

function atletiFiltrati() {
  const testoRicerca = document.getElementById("cerca-atleta").value.trim().toLowerCase();
  const categoria = document.getElementById("filtro-categoria").value;
  const problema = document.getElementById("filtro-problema").value;
  const annata = document.getElementById("filtro-annata").value;
  const ordine = document.getElementById("ordina-atleti").value;

  const risultato = configurazioneAttiva.atleti.filter(function (atleta) {
    if (categoria && atleta.categoria !== categoria) return false;
    if (annata && annataAtleta(atleta) !== annata) return false;
    if (problema && !atletaHaProblema(atleta, problema)) return false;
    if (testoRicerca === "") return true;

    const testoAtleta = `${atleta.nome} ${atleta.cognome} ${atleta.cognome} ${atleta.nome} ${atleta.codiceFiscale}`.toLowerCase();
    return testoAtleta.indexOf(testoRicerca) !== -1;
  });

  // Prima in ordine alfabetico per cognome, come in segreteria...
  risultato.sort(function (a, b) {
    return `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`, "it");
  });

  // ...poi secondo l'ordine scelto (a parità resta l'ordine alfabetico)
  if (ordine === "categoria") {
    risultato.sort(function (a, b) {
      return posizioneCategoria(a.categoria) - posizioneCategoria(b.categoria);
    });
  }
  if (ordine === "annata") {
    risultato.sort(function (a, b) {
      return confrontaAnnate(annataAtleta(a), annataAtleta(b));
    });
  }
  if (ordine === "gravita") {
    risultato.sort(function (a, b) {
      return confrontaGravita(documentoPiuUrgente(a), documentoPiuUrgente(b));
    });
  }
  if (ordine === "scadenza") {
    risultato.sort(function (a, b) {
      return confrontaDate(prossimaScadenza(a), prossimaScadenza(b));
    });
  }

  return risultato;
}

// Foto nella cornice tonda
// con lo zoom e lo spostamento scelti in "Modifica foto"
function htmlFotoAtleta(atleta, classeDimensione, classeCornice) {
  return `
    <div class="${classeDimensione} cornice-foto shrink-0 ${classeCornice}">
      <div class="overflow-hidden" style="background-color: ${coloreSfondoFoto(atleta.fotoInquadratura)};">
        <img src="${atleta.foto}" alt="Foto di ${pulisciTesto(nomeCompleto(atleta))}" class="w-full h-full object-contain" style="${stileInquadratura(atleta.fotoInquadratura)}" />
      </div>
    </div>
  `;
}

// Miniatura del roster: foto oppure iniziali, grande abbastanza da riconoscere l'atleta
function htmlAvatar(atleta, classeDimensione) {
  if (atleta.foto) {
    return htmlFotoAtleta(atleta, classeDimensione, "");
  }
  return `
    <div class="${classeDimensione} cornice-foto shrink-0">
      <div class="bg-[#12181B] text-white font-mono text-sm flex items-center justify-center">${pulisciTesto(iniziali(atleta))}</div>
    </div>
  `;
}

function htmlCartellini(atleta) {
  let badgeHtml = "";

  atleta.documenti.forEach(function (doc) {
    if (!documentoDaMostrare(doc)) return; // documento facoltativo non inserito
    const stato = calcolaStatoDocumento(doc.scadenza).stato;
    const data = doc.scadenza ? formattaData(doc.scadenza) : "Da inserire";

    badgeHtml += `
      <span class="cartellino cartellino--${stato}">
        <span class="cartellino__tipo">${etichettaDocumento(doc.tipo)}</span>
        <span class="cartellino__data">${data}</span>
      </span>
    `;
  });

  return badgeHtml;
}

// Piccole etichette sotto il nome per i problemi da risolvere
function htmlEtichetteProblemi(atleta) {
  const etichette = [];
  if (certificatoDaCambiare(atleta)) etichette.push("Serve agonistico");
  if (mancaTutore(atleta)) etichette.push("Senza tutore");
  if (!consensiCompleti(atleta)) etichette.push("Consensi");
  const quota = statoQuota(atleta);
  if (quota === "da-pagare" || quota === "parziale") etichette.push("Quota " + etichettaStatoQuota(quota).toLowerCase());

  if (etichette.length === 0) return "";
  return `<p class="flex flex-wrap gap-1 mt-1">${etichette.map(function (testo) {
    return `<span class="etichetta-problema">${testo}</span>`;
  }).join("")}</p>`;
}

function renderAtleti() {
  const contenitore = document.getElementById("atleti-list");
  if (!contenitore) return;

  popolaFiltroAnnate();
  const atleti = atletiFiltrati();
  const ordine = document.getElementById("ordina-atleti").value;
  let htmlAccumulato = "";

  // Ordinando per categoria o per annata gli atleti vengono divisi in gruppi
  function gruppoDi(atleta) {
    if (ordine === "categoria") return atleta.categoria;
    if (ordine === "annata") return annataAtleta(atleta) ? `Annata ${annataAtleta(atleta)}` : "Annata non indicata";
    return "";
  }
  const quantiPerGruppo = {};
  atleti.forEach(function (atleta) {
    quantiPerGruppo[gruppoDi(atleta)] = (quantiPerGruppo[gruppoDi(atleta)] || 0) + 1;
  });
  let gruppoPrecedente = "";

  atleti.forEach(function (atleta) {
    const gruppo = gruppoDi(atleta);
    if (gruppo !== "" && gruppo !== gruppoPrecedente) {
      const quanti = quantiPerGruppo[gruppo];
      htmlAccumulato += `<p class="titolo-gruppo"><span>${pulisciTesto(gruppo)}</span><small>${quanti} ${quanti === 1 ? "atleta" : "atleti"}</small></p>`;
    }
    gruppoPrecedente = gruppo;

    const eta = calcolaEta(atleta.dataNascita);
    const dettagli = [atleta.categoria];
    if (atleta.ruolo) dettagli.push(atleta.ruolo);
    if (atleta.numeroMaglia) dettagli.push(`n° ${atleta.numeroMaglia}`);

    htmlAccumulato += `
      <button type="button" data-apri-atleta="${atleta.id}" class="roster-card w-full text-left border border-[#E7EBEC] rounded-md bg-white shadow-xs hover:border-[#4E9EAF] transition-colors cursor-pointer">
        <div class="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex items-center gap-4 md:w-80 shrink-0">
            ${htmlAvatar(atleta, "w-14 h-14")}
            <div class="min-w-0">
              <p class="font-bold text-[#12181B] text-sm leading-tight">
                ${pulisciTesto(atleta.cognome)} ${pulisciTesto(atleta.nome)}
                ${eta !== null && eta < 18 ? `<span class="etichetta-minore">Minore</span>` : ""}
              </p>
              <p class="text-xs text-[#7A8285] truncate">${pulisciTesto(dettagli.join(" • "))}</p>
              ${htmlEtichetteProblemi(atleta)}
            </div>
          </div>

          <!-- Documenti e Freccia a destra -->
          <div class="flex items-center justify-between md:justify-end gap-3 flex-1">
            <div class="flex flex-wrap gap-2">${htmlCartellini(atleta)}</div>
            <span class="flex items-center justify-center w-8 h-8 rounded-md bg-[#F2F4F4] text-[#4E9EAF] font-bold shrink-0 text-sm">→</span>
          </div>
        </div>
      </button>
    `;
  });

  if (atleti.length === 0) {
    const nessunAtleta = configurazioneAttiva.atleti.length === 0;
    htmlAccumulato = `
      <div class="border border-dashed border-[#CFD5D6] rounded-md bg-white p-8 text-center">
        <p class="font-bold text-[#12181B] mb-1">${nessunAtleta ? "Nessun atleta ancora" : "Nessun atleta trovato"}</p>
        <p class="text-sm text-[#7A8285]">${nessunAtleta ? "Usa \"+ Aggiungi Atleta\" per inserire il primo tesserato, oppure importali da Excel." : "Prova a cambiare la ricerca, la categoria o il filtro."}</p>
      </div>
    `;
  }

  contenitore.innerHTML = htmlAccumulato;
  const countEl = document.getElementById("atleti-count");
  if (countEl) countEl.textContent = atleti.length;

  collegaAperturaSchede(contenitore);
}

// Qualsiasi elemento con data-apri-atleta apre la scheda di quell'atleta
function collegaAperturaSchede(contenitore) {
  contenitore.querySelectorAll("[data-apri-atleta]").forEach(function (elemento) {
    elemento.onclick = function () {
      apriSchedaAtleta(elemento.getAttribute("data-apri-atleta"));
    };
  });
}

// 6. SCHEDA ATLETA
function apriSchedaAtleta(id) {
  atletaAperto = id;
  renderSchedaAtleta(id);
  mostraSezione("scheda");
}

function rigaDato(etichetta, valore, classeExtra) {
  const testo = valore ? pulisciTesto(valore) : `<span class="font-normal text-[#7A8285]">—</span>`;
  return `
    <div class="riga-dato">
      <span class="text-[#7A8285] font-mono uppercase text-[10px] block mb-0.5">${etichetta}</span>
      <span class="font-bold text-[#12181B] text-sm ${classeExtra || ""}">${testo}</span>
    </div>
  `;
}

function rigaConsenso(chiave, testo, tipo, attivo) {
  return `
    <label class="riga-consenso ${attivo ? "riga-consenso--ok" : ""}">
      <input type="checkbox" data-consenso="${chiave}" ${attivo ? "checked" : ""} class="accent-[#4E9EAF] w-4 h-4 cursor-pointer" />
      <span class="flex-1">${testo}</span>
      <small>${tipo}</small>
    </label>
  `;
}

function renderSchedaAtleta(id) {
  const contenitore = document.getElementById("scheda-atleta");
  const atleta = trovaAtleta(id);

  if (!atleta) {
    contenitore.innerHTML = `<p class="text-sm text-[#7A8285]">Atleta non trovato.</p>`;
    return;
  }

  const eta = calcolaEta(atleta.dataNascita);
  const minorenne = eta !== null && eta < 18;
  const controlloCF = verificaCodiceFiscale(atleta.codiceFiscale, atleta.dataNascita, atleta.sesso);
  const sessoTesto = atleta.sesso === "M" ? "Maschile" : atleta.sesso === "F" ? "Femminile" : "";

  let etichettaCF = "";
  if (controlloCF.stato === "corretto") etichettaCF = `<span class="etichetta-cf etichetta-cf--ok">Verificato</span>`;
  if (controlloCF.stato === "errato" || controlloCF.stato === "incoerente") etichettaCF = `<span class="etichetta-cf etichetta-cf--errore">Da controllare</span>`;

  const residenza = [atleta.indirizzo, [atleta.cap, atleta.comune].join(" ").trim(), atleta.provincia ? `(${atleta.provincia})` : ""]
    .filter(function (parte) { return parte; })
    .join(", ")
    .replace(", (", " (");

  // Documenti con aggiornamento rapido della scadenza
  let documentiHtml = "";
  atleta.documenti.forEach(function (doc, indice) {
    const infoStato = calcolaStatoDocumento(doc.scadenza);
    documentiHtml += `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 border-b border-[#E7EBEC] last:border-b-0">
        <div class="flex items-center gap-3">
          <span class="stato-pallino stato-pallino--${infoStato.stato} w-2 h-2 rounded-full shrink-0"></span>
          <div>
            <p class="text-sm font-bold text-[#12181B]">${etichettaDocumento(doc.tipo)}${doc.tipo === "Visite Mediche" ? ` <span class="font-normal text-[#7A8285]">• ${pulisciTesto(atleta.tipoCertificato)}</span>` : ""}</p>
            <p class="text-[11px] text-[#7A8285]">${etichettaGiorni(infoStato.giorniMancanti)}</p>
            ${doc.tipo === "Visite Mediche" && certificatoDaCambiare(atleta) ? `<p class="text-[11px] font-bold text-[#A9750F] mt-0.5">In questa stagione compie ${configurazioneAttiva.etaAgonistica} anni: serve il certificato agonistico</p>` : ""}
          </div>
        </div>
        <label class="flex items-center gap-2 text-[11px] text-[#7A8285]">
          Scadenza
          <input type="text" inputmode="numeric" maxlength="10" placeholder="gg/mm/aaaa" value="${dataInItaliano(doc.scadenza)}" data-indice-documento="${indice}" class="input-scadenza-rapida input-dsd py-1 text-xs w-28 font-mono" />
        </label>
      </div>
    `;
  });

  // Quota associativa: importo, versato, pagamenti
  const importo = importoQuota(atleta);
  const versato = versatoQuota(atleta);
  const stato = statoQuota(atleta);
  let pagamentiHtml = "";
  atleta.quota.pagamenti.forEach(function (pagamento, indice) {
    pagamentiHtml += `
      <div class="flex items-center justify-between gap-3 py-1.5 border-b border-[#E7EBEC] last:border-b-0 text-sm">
        <span class="text-[#7A8285]">${formattaData(pagamento.data)}${pagamento.metodo ? ` • ${pulisciTesto(pagamento.metodo)}` : ""}</span>
        <span class="flex items-center gap-3">
          <strong class="font-mono">${formattaEuro(pagamento.importo)}</strong>
          <button type="button" data-ricevuta-pagamento="${indice}" class="text-[11px] font-bold text-[#4E9EAF] hover:underline cursor-pointer">Ricevuta</button>
          <button type="button" data-elimina-pagamento="${indice}" class="text-[#7A8285] hover:text-[#C94141] text-xs cursor-pointer" title="Elimina pagamento">✕</button>
        </span>
      </div>
    `;
  });

  // Staff della categoria (sezione Allenatori)
  let staffHtml = "";
  allenatoriDiCategoria(atleta.categoria).forEach(function (allenatore) {
    const contatto = allenatore.telefono ? ` • ${allenatore.telefono}` : "";
    staffHtml += rigaDato(allenatore.ruolo || "Staff", `${allenatore.nome} ${allenatore.cognome}${contatto}`);
  });
  if (staffHtml === "") staffHtml = rigaDato("Allenatore", "");

  // Materiale prenotato in magazzino
  const prenotazioni = prenotazioniDiAtleta(atleta.id);
  let materialeHtml = "";
  prenotazioni.forEach(function (pren) {
    const prodotto = trovaProdotto(pren.prodottoId);
    materialeHtml += `
      <div class="flex items-center justify-between gap-3 py-2 border-b border-[#E7EBEC] last:border-b-0">
        <div class="flex items-center gap-3 min-w-0">
          ${htmlMiniaturaProdotto(prodotto, "w-10 h-10")}
          <div class="min-w-0">
            <p class="text-sm font-bold text-[#12181B] truncate">${prodotto ? pulisciTesto(prodotto.nome) : "Prodotto eliminato"}</p>
            <p class="text-[11px] text-[#7A8285]">Taglia ${pulisciTesto(pren.taglia)} • ${pren.quantita} pz • ${formattaData(pren.data)}</p>
          </div>
        </div>
        <span class="etichetta-stato etichetta-stato--${pren.stato}">${etichettaStatoPrenotazione(pren)}</span>
      </div>
    `;
  });
  if (prenotazioni.length === 0) {
    materialeHtml = `<p class="text-sm text-[#7A8285] py-2">Nessuna prenotazione.</p>`;
  }

  contenitore.innerHTML = `
    <!-- Testata scheda -->
    <section class="border border-[#E7EBEC] rounded-sm p-6 sm:p-8 bg-white shadow-xs mb-6">
      <div class="flex flex-col sm:flex-row gap-6 sm:items-center">
        <div class="flex flex-col items-center gap-2 shrink-0">
          ${atleta.foto
            ? htmlFotoAtleta(atleta, "w-28 h-28", "")
            : `<div class="w-28 h-28 cornice-foto">
                 <div class="bg-[#CFD5D6] flex items-center justify-center text-[#7A8285]">
                   <svg class="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                 </div>
               </div>`}
          <label class="text-[11px] font-medium text-[#12181B] bg-white border border-[#E7EBEC] px-2.5 py-1 rounded-md cursor-pointer hover:bg-[#F2F4F4] shadow-xs">
            ${atleta.foto ? "Cambia Foto" : "+ Aggiungi Foto"}
            <input type="file" id="scheda-input-foto" accept="image/*" class="hidden" />
          </label>
          ${atleta.foto ? `
          <button type="button" id="scheda-modifica-foto" class="text-[11px] font-medium text-[#4E9EAF] hover:underline cursor-pointer">Modifica foto</button>
          <button type="button" id="scheda-rimuovi-foto" class="text-[11px] text-[#7A8285] hover:text-[#C94141] underline cursor-pointer">Rimuovi foto</button>` : ""}
        </div>

        <div class="flex-1 text-center sm:text-left">
          <p class="font-mono text-xs text-[#4E9EAF] font-bold uppercase tracking-widest mb-1">${pulisciTesto(atleta.categoria)}${atleta.ruolo ? " • " + pulisciTesto(atleta.ruolo) : ""}</p>
          <h2 class="text-3xl sm:text-4xl font-bold text-[#12181B] leading-tight">${pulisciTesto(atleta.nome)} ${pulisciTesto(atleta.cognome)}</h2>
          <p class="text-sm text-[#7A8285] mt-1">
            ${eta !== null ? `${eta} anni` : ""}
            ${minorenne ? ` <span class="etichetta-minore">Minore</span>` : ""}
          </p>
        </div>

        ${atleta.numeroMaglia ? `
        <div class="numero-maglia shrink-0 self-center">
          <span class="font-mono text-[10px] uppercase block">Maglia</span>
          <span class="font-mono text-4xl font-extrabold leading-none">${pulisciTesto(atleta.numeroMaglia)}</span>
        </div>` : ""}
      </div>

      <div class="flex flex-wrap justify-center sm:justify-end gap-3 mt-6 pt-4 border-t border-[#E7EBEC]">
        <button type="button" id="scheda-elimina" class="text-xs text-[#C94141] underline cursor-pointer mr-auto">Elimina atleta</button>
        <button type="button" id="scheda-prenota" class="btn-dsd-secondary text-xs py-2 px-4">Prenota Materiale</button>
        <button type="button" id="scheda-modifica" class="btn-dsd-primary text-xs py-2 px-5">Modifica Dati</button>
      </div>
    </section>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

      <!-- Anagrafica -->
      <section class="pannello-scheda">
        <h3 class="titolo-pannello">Anagrafica</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
          ${rigaDato("Data di Nascita", atleta.dataNascita ? formattaData(atleta.dataNascita) : "")}
          ${rigaDato("Luogo di Nascita", atleta.luogoNascita)}
          ${rigaDato("Sesso", sessoTesto)}
          <div class="riga-dato">
            <span class="text-[#7A8285] font-mono uppercase text-[10px] block mb-0.5">Codice Fiscale ${etichettaCF}</span>
            <span class="font-mono font-bold text-[#12181B] text-sm">${atleta.codiceFiscale ? pulisciTesto(atleta.codiceFiscale) : `<span class="font-normal text-[#7A8285]">—</span>`}</span>
            ${controlloCF.stato === "errato" || controlloCF.stato === "incoerente" ? `<span class="block text-[11px] text-[#C94141] mt-0.5">${controlloCF.messaggio}</span>` : ""}
          </div>
        </div>
      </section>

      <!-- Residenza e contatti -->
      <section class="pannello-scheda">
        <h3 class="titolo-pannello">Residenza e Contatti</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
          <div class="sm:col-span-2">${rigaDato("Residenza", residenza)}</div>
          ${rigaDato("Telefono", atleta.telefono)}
          ${rigaDato("Email", atleta.email, "break-all")}
        </div>
      </section>

      <!-- Genitore / tutore -->
      ${minorenne || atleta.tutore.nome ? `
      <section class="pannello-scheda">
        <h3 class="titolo-pannello">Genitore o Tutore</h3>
        ${mancaTutore(atleta) ? `<p class="text-xs text-[#A9750F] bg-[#F8ECD6] px-3 py-2 mb-3">Atleta minorenne: servono nome e almeno un recapito (telefono o email) di un genitore o tutore.</p>` : ""}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
          <div class="sm:col-span-2">${rigaDato("Nome e Cognome", atleta.tutore.nome)}</div>
          ${rigaDato("Telefono", atleta.tutore.telefono)}
          ${rigaDato("Email", atleta.tutore.email, "break-all")}
        </div>
      </section>` : ""}

      <!-- Dati sportivi -->
      <section class="pannello-scheda">
        <h3 class="titolo-pannello">Dati Sportivi</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
          ${rigaDato("Categoria", atleta.categoria)}
          ${rigaDato("Ruolo", atleta.ruolo)}
          ${rigaDato("Matricola Federale", atleta.matricola, "font-mono")}
          ${rigaDato("Iscritto dal", atleta.dataIscrizione ? formattaData(atleta.dataIscrizione) : "")}
          ${staffHtml}
          ${rigaDato("Presenze agli allenamenti", testoPresenze(atleta))}
          ${rigaDato("Prossima convocazione", convocazioniAtleta(atleta)[0] ? `${convocazioniAtleta(atleta)[0].evento}, ${dataInItaliano(convocazioniAtleta(atleta)[0].data)}` : "")}
        </div>
      </section>

      <!-- Quota associativa -->
      <section class="pannello-scheda">
        <h3 class="titolo-pannello">Quota Stagione ${pulisciTesto(configurazioneAttiva.stagione)}</h3>
        <div class="flex items-end justify-between gap-4 mb-4">
          <div>
            <span class="etichetta-quota etichetta-quota--${stato}">${etichettaStatoQuota(stato)}</span>
            <p class="font-mono text-2xl font-bold text-[#12181B] mt-2">${formattaEuro(versato)} <span class="text-sm font-normal text-[#7A8285]">di ${formattaEuro(importo)}</span></p>
            ${importo > versato ? `<p class="text-xs text-[#C94141] mt-1">Mancano ${formattaEuro(importo - versato)}</p>` : ""}
          </div>
          ${importo > versato ? `<button type="button" id="scheda-pagamento" class="btn-dsd-primary text-xs py-2 px-4 shrink-0">Registra pagamento</button>` : ""}
        </div>
        <div class="barra-quota"><i style="width: ${importo > 0 ? Math.min(100, (versato / importo) * 100) : 0}%"></i></div>
        ${importo === 0 ? `<p class="text-xs text-[#7A8285] mt-3">Nessuna quota impostata. Puoi impostarla in Società (quota predefinita) o in "Modifica dati".</p>` : ""}
        ${pagamentiHtml ? `<div class="mt-3">${pagamentiHtml}</div>` : ""}
      </section>

      <!-- Consensi privacy -->
      <section class="pannello-scheda">
        <h3 class="titolo-pannello">Consensi Privacy</h3>
        ${!consensiCompleti(atleta) ? `<p class="text-xs text-[#A9750F] bg-[#F8ECD6] px-3 py-2 mb-3">Mancano consensi indispensabili: senza, i dati non andrebbero trattati.</p>` : ""}
        <div class="flex flex-col gap-2">
          ${rigaConsenso("trattamento", "Trattamento dei dati personali", "indispensabile", atleta.consensi.trattamento)}
          ${rigaConsenso("sanitari", "Dati sanitari (certificato medico)", "indispensabile", atleta.consensi.sanitari)}
          ${rigaConsenso("immagini", "Foto e video per sito e social", "facoltativo", atleta.consensi.immagini)}
        </div>
        ${atleta.consensi.data ? `<p class="text-[11px] text-[#7A8285] mt-3">Ultimo aggiornamento: ${formattaData(atleta.consensi.data)}${minorenne ? " • firmati dal genitore o tutore" : ""}</p>` : ""}
      </section>

      <!-- Documenti e scadenze -->
      <section class="pannello-scheda">
        <h3 class="titolo-pannello">Documenti e Scadenze</h3>
        ${documentiHtml}
      </section>

      <!-- Taglie -->
      <section class="pannello-scheda">
        <h3 class="titolo-pannello">Taglie</h3>
        <div class="grid grid-cols-3 gap-3">
          <div class="box-taglia"><span>Maglia</span><strong>${pulisciTesto(atleta.taglie.maglia) || "—"}</strong></div>
          <div class="box-taglia"><span>Pantaloncini</span><strong>${pulisciTesto(atleta.taglie.pantaloncini) || "—"}</strong></div>
          <div class="box-taglia"><span>Scarpe</span><strong>${pulisciTesto(atleta.taglie.scarpe) || "—"}</strong></div>
        </div>
      </section>

      <!-- Materiale prenotato -->
      <section class="pannello-scheda">
        <h3 class="titolo-pannello">Materiale dal Magazzino</h3>
        ${materialeHtml}
      </section>

      <!-- Note -->
      ${atleta.note ? `
      <section class="pannello-scheda">
        <h3 class="titolo-pannello">Note</h3>
        <p class="text-sm text-[#12181B] whitespace-pre-line">${pulisciTesto(atleta.note)}</p>
      </section>` : ""}
    </div>
  `;

  collegaPulsantiScheda(atleta);
}

function collegaPulsantiScheda(atleta) {
  document.getElementById("scheda-modifica").onclick = function () {
    apriModalAtleta(atleta.id);
  };

  document.getElementById("scheda-prenota").onclick = function () {
    apriModalPrenotazione(null, atleta.id);
  };

  document.getElementById("scheda-elimina").onclick = function () {
    eliminaAtleta(atleta.id);
  };

  // Foto atleta
  const inputFoto = document.getElementById("scheda-input-foto");
  inputFoto.onchange = function () {
    // Foto abbastanza grande da restare nitida con lo zoom
    riduciFoto(inputFoto.files[0], 600, function (fotoRidotta) {
      calcolaColoreBordi(fotoRidotta, function (colore) {
        atleta.foto = fotoRidotta;
        atleta.fotoInquadratura = inquadraturaIniziale();
        atleta.fotoInquadratura.sfondo = colore;
        salvaConfigurazione();
        aggiornaTutto();

        // Appena caricata, si apre subito l'inquadratura
        apriModalFotoAtleta(atleta.id);
      });
    });
  };

  const btnModificaFoto = document.getElementById("scheda-modifica-foto");
  if (btnModificaFoto) {
    btnModificaFoto.onclick = function () {
      apriModalFotoAtleta(atleta.id);
    };
  }

  const btnRimuoviFoto = document.getElementById("scheda-rimuovi-foto");
  if (btnRimuoviFoto) {
    btnRimuoviFoto.onclick = function () {
      atleta.foto = "";
      atleta.fotoInquadratura = inquadraturaIniziale();
      salvaConfigurazione();
      aggiornaTutto();
    };
  }

  // Aggiornamento rapido delle scadenze (es. visita medica rinnovata).
  // Si scrive gg/mm/aaaa: le barre si aggiungono da sole e quando la data
  // è completa (10 caratteri) viene salvata.
  document.querySelectorAll(".input-scadenza-rapida").forEach(function (input) {
    input.oninput = function () {
      formattaCampoData(input);
      if (input.value.length === 10) salvaScadenzaRapida(input);
    };
    input.onchange = function () {
      salvaScadenzaRapida(input);
    };
  });

  function salvaScadenzaRapida(input) {
    const indice = Number(input.getAttribute("data-indice-documento"));
    const nuovaData = dataDaItaliano(input.value.trim());

    if (nuovaData === null) {
      mostraAvviso("Data non valida: scrivila così gg/mm/aaaa (es. 30/09/2027).", "errore");
      return;
    }
    if (atleta.documenti[indice].scadenza === nuovaData) return;

    atleta.documenti[indice].scadenza = nuovaData;
    salvaConfigurazione();
    aggiornaTutto();
    mostraAvviso(`${etichettaDocumento(atleta.documenti[indice].tipo)} aggiornata.`, "ok");
  }

  // Quota: registra un pagamento (propone l'importo che manca)
  const btnPagamento = document.getElementById("scheda-pagamento");
  if (btnPagamento) {
    btnPagamento.onclick = function () {
      const mancano = importoQuota(atleta) - versatoQuota(atleta);
      chiediImporto({
        titolo: "Registra pagamento",
        testo: `Quota di ${nomeCompleto(atleta)}: mancano ${formattaEuro(mancano)}. Puoi registrare anche un acconto.`,
        valore: mancano,
        metodo: true,
      }, function (valore, metodo) {
        atleta.quota.pagamenti.push({ data: oggiIso(), importo: valore, metodo: metodo, numero: prossimoNumeroRicevuta() });
        salvaConfigurazione();
        aggiornaTutto();
        mostraAvviso(`Pagamento di ${formattaEuro(valore)} registrato. Puoi stampare la ricevuta.`, "ok");
      });
    };
  }

  document.querySelectorAll("[data-ricevuta-pagamento]").forEach(function (bottone) {
    bottone.onclick = function () {
      apriRicevuta(atleta.id, Number(bottone.getAttribute("data-ricevuta-pagamento")));
    };
  });

  document.querySelectorAll("[data-elimina-pagamento]").forEach(function (bottone) {
    bottone.onclick = function () {
      const indice = Number(bottone.getAttribute("data-elimina-pagamento"));
      chiediConferma({
        titolo: "Eliminare il pagamento?",
        testo: `Il pagamento di ${formattaEuro(atleta.quota.pagamenti[indice].importo)} verrà tolto dalla quota.`,
        conferma: "Elimina",
        pericolo: true,
      }, function () {
        atleta.quota.pagamenti.splice(indice, 1);
        salvaConfigurazione();
        aggiornaTutto();
      });
    };
  });

  // Consensi: una spunta = consenso dato, con la data di oggi
  document.querySelectorAll("[data-consenso]").forEach(function (casella) {
    casella.onchange = function () {
      atleta.consensi[casella.getAttribute("data-consenso")] = casella.checked;
      atleta.consensi.data = oggiIso();
      salvaConfigurazione();
      aggiornaTutto();
    };
  });
}

// Inquadratura della foto (zoom e frecce)
// La stessa finestra serve per gli atleti e per gli allenatori:
// "persona" è l'atleta o l'allenatore, "dopoSalvataggio" cosa fare dopo
let personaFotoInModifica = null;
let dopoSalvataggioFoto = null;
let inquadraturaFotoAtleta = { zoom: 1, x: 0, y: 0 };

function apriModalFotoAtleta(id) {
  apriModalFoto(trovaAtleta(id), function () {
    salvaConfigurazione();
    aggiornaTutto();
  });
}

function apriModalFoto(persona, dopoSalvataggio) {
  if (!persona || !persona.foto) return;

  personaFotoInModifica = persona;
  dopoSalvataggioFoto = dopoSalvataggio;
  inquadraturaFotoAtleta = limitaInquadratura(persona.fotoInquadratura || inquadraturaIniziale());

  renderAnteprimaFotoAtleta();
  document.getElementById("modal-foto-atleta").classList.remove("hidden");

  // Foto caricate prima di questa versione: calcoliamo ora il colore dei bordi
  if (!inquadraturaFotoAtleta.sfondo) {
    calcolaColoreBordi(persona.foto, function (colore) {
      inquadraturaFotoAtleta.sfondo = colore;
      renderAnteprimaFotoAtleta();
    });
  }
}

function renderAnteprimaFotoAtleta() {
  const persona = personaFotoInModifica;
  if (!persona) return;

  const anteprima = document.getElementById("foto-atleta-anteprima");
  anteprima.style.backgroundColor = coloreSfondoFoto(inquadraturaFotoAtleta);
  anteprima.innerHTML =
    `<img src="${persona.foto}" alt="Anteprima" class="w-full h-full object-contain" style="${stileInquadratura(inquadraturaFotoAtleta)}" />`;
  document.getElementById("foto-atleta-zoom").value = inquadraturaFotoAtleta.zoom;
  aggiornaFrecceFoto("[data-sposta-foto-atleta]:not([data-sposta-foto-atleta=centro])", inquadraturaFotoAtleta);
}

function chiudiModalFotoAtleta() {
  document.getElementById("modal-foto-atleta").classList.add("hidden");
  personaFotoInModifica = null;
}

function salvaFotoAtleta() {
  const persona = personaFotoInModifica;
  if (!persona) return;

  persona.fotoInquadratura = inquadraturaFotoAtleta;
  const dopo = dopoSalvataggioFoto;
  chiudiModalFotoAtleta();
  if (dopo) dopo();
}

function eliminaAtleta(id) {
  const atleta = trovaAtleta(id);
  if (!atleta) return;

  chiediConferma({
    titolo: `Eliminare ${nomeCompleto(atleta)}?`,
    testo: "L'atleta verrà tolto dal roster. L'operazione non si può annullare (se serve, scarica prima un backup).",
    conferma: "Elimina atleta",
    pericolo: true,
  }, function () {
    configurazioneAttiva.atleti = configurazioneAttiva.atleti.filter(function (a) {
      return a.id !== id;
    });

    // Le sue prenotazioni restano, ma senza collegamento all'atleta
    configurazioneAttiva.magazzino.prenotazioni.forEach(function (pren) {
      if (pren.atletaId === id) {
        pren.atletaId = "";
        pren.intestatario = nomeCompleto(atleta);
      }
    });

    atletaAperto = null;
    salvaConfigurazione();
    aggiornaTutto();
    mostraSezione("atleti");
    mostraAvviso(`${nomeCompleto(atleta)} eliminato dal roster.`, "info");
  });
}

// 7. MODULO AGGIUNGI / MODIFICA ATLETA
function valoreCampo(id) {
  return document.getElementById(id).value.trim();
}

function impostaCampo(id, valore) {
  document.getElementById(id).value = valore || "";
}

// Date scritte a mano in formato italiano: "15/10/2010" <-> "2010-10-15"
function dataInItaliano(dataIso) {
  if (!dataIso) return "";
  const parti = dataIso.split("-");
  return `${parti[2]}/${parti[1]}/${parti[0]}`;
}

// Restituisce la data in formato "aaaa-mm-gg", "" se il campo è vuoto, null se non è valida
function dataDaItaliano(testo) {
  if (!testo) return "";

  const parti = testo.split("/");
  if (parti.length !== 3 || parti[2].length !== 4) return null;

  const giorno = Number(parti[0]);
  const mese = Number(parti[1]);
  const anno = Number(parti[2]);
  if (!giorno || !mese || anno < 1900 || anno > 2100) return null;

  // Controllo che il giorno esista davvero (es. 31/02 non è valido)
  const prova = new Date(anno, mese - 1, giorno);
  if (prova.getDate() !== giorno || prova.getMonth() !== mese - 1) return null;

  return `${anno}-${String(mese).padStart(2, "0")}-${String(giorno).padStart(2, "0")}`;
}

function leggiCampoData(id) {
  return dataDaItaliano(valoreCampo(id));
}

function impostaCampoData(id, dataIso) {
  impostaCampo(id, dataInItaliano(dataIso));
}

// Mentre si scrive, aggiunge da solo le barre: 15102010 -> 15/10/2010
function formattaCampoData(input) {
  const cifre = input.value.replace(/[^0-9]/g, "").slice(0, 8);
  let testo = cifre;
  if (cifre.length > 4) testo = `${cifre.slice(0, 2)}/${cifre.slice(2, 4)}/${cifre.slice(4)}`;
  else if (cifre.length > 2) testo = `${cifre.slice(0, 2)}/${cifre.slice(2)}`;
  input.value = testo;
}

function apriModalAtleta(id) {
  const atleta = id ? trovaAtleta(id) : null;
  atletaInModifica = atleta ? atleta.id : null;

  document.getElementById("modal-atleta-titolo").textContent = atleta ? "Modifica Atleta" : "Aggiungi Nuovo Atleta";
  document.getElementById("btn-salva-atleta").textContent = atleta ? "Salva Modifiche" : "Salva Atleta";

  // Con un atleta da modificare i campi vengono precompilati, altrimenti svuotati
  const dati = atleta || completaAtleta({ nome: "", cognome: "", categoria: configurazioneAttiva.categorie[0] });
  const filtroCategoria = document.getElementById("filtro-categoria").value;
  if (!atleta && filtroCategoria) dati.categoria = filtroCategoria;

  impostaCampo("atl-nome", dati.nome);
  impostaCampo("atl-cognome", dati.cognome);
  impostaCampoData("atl-data-nascita", dati.dataNascita);
  impostaCampo("atl-luogo-nascita", dati.luogoNascita);
  impostaCampo("atl-sesso", dati.sesso);
  impostaCampo("atl-cf", dati.codiceFiscale);
  impostaCampo("atl-indirizzo", dati.indirizzo);
  impostaCampo("atl-comune", dati.comune);
  impostaCampo("atl-cap", dati.cap);
  impostaCampo("atl-provincia", dati.provincia);
  impostaCampo("atl-telefono", dati.telefono);
  impostaCampo("atl-email", dati.email);
  impostaCampo("atl-tutore-nome", dati.tutore.nome);
  impostaCampo("atl-tutore-telefono", dati.tutore.telefono);
  impostaCampo("atl-tutore-email", dati.tutore.email);
  impostaCampo("atl-categoria", dati.categoria);
  impostaCampo("atl-ruolo", dati.ruolo);
  impostaCampo("atl-numero", dati.numeroMaglia);
  impostaCampo("atl-matricola", dati.matricola);
  impostaCampoData("atl-data-iscrizione", dati.dataIscrizione);
  impostaCampo("atl-tipo-certificato", dati.tipoCertificato);
  impostaCampo("atl-taglia-maglia", dati.taglie.maglia);
  impostaCampo("atl-taglia-pantaloncini", dati.taglie.pantaloncini);
  impostaCampo("atl-taglia-scarpe", dati.taglie.scarpe);
  impostaCampo("atl-note", dati.note);

  // Quota: vuoto = quota predefinita della società (mostrata come suggerimento)
  impostaCampo("atl-quota", dati.quota.importo);
  document.getElementById("atl-quota").placeholder = `Predefinita: ${formattaEuro(configurazioneAttiva.quotaPredefinita)}`;

  // Consensi privacy
  document.getElementById("atl-consenso-trattamento").checked = dati.consensi.trattamento;
  document.getElementById("atl-consenso-sanitari").checked = dati.consensi.sanitari;
  document.getElementById("atl-consenso-immagini").checked = dati.consensi.immagini;

  impostaCampoData("scad-visita", scadenzaDocumento(dati, "Visite Mediche"));
  impostaCampoData("scad-tesseramento", scadenzaDocumento(dati, "Tesseramento Atleta"));
  impostaCampoData("scad-ci", scadenzaDocumento(dati, "CI"));

  aggiornaMessaggioCF();
  document.getElementById("modal-atleta").classList.remove("hidden");
  document.getElementById("atl-nome").focus();
}

function scadenzaDocumento(atleta, tipo) {
  const documento = atleta.documenti.find(function (doc) {
    return doc.tipo === tipo;
  });
  return documento ? documento.scadenza : "";
}

function chiudiModalAtleta() {
  document.getElementById("modal-atleta").classList.add("hidden");
  atletaInModifica = null;
}

// Messaggio sotto il campo codice fiscale, aggiornato mentre si scrive
function aggiornaMessaggioCF() {
  const campoCF = document.getElementById("atl-cf");
  const messaggio = document.getElementById("atl-cf-messaggio");
  const cf = campoCF.value.toUpperCase().trim();

  // Se data di nascita o sesso sono vuoti, li ricaviamo dal codice fiscale
  if (verificaCodiceFiscale(cf, "", "").stato === "corretto") {
    const dati = leggiDatiCodiceFiscale(cf);
    if (!valoreCampo("atl-data-nascita")) impostaCampoData("atl-data-nascita", dati.dataNascita);
    if (!valoreCampo("atl-sesso")) impostaCampo("atl-sesso", dati.sesso);
  }

  // Il confronto con la data si fa solo quando la data è completa e valida
  const dataNascita = leggiCampoData("atl-data-nascita") || "";
  const controllo = verificaCodiceFiscale(cf, dataNascita, valoreCampo("atl-sesso"));
  messaggio.textContent = cf.length < 16 && controllo.stato === "errato" ? `${cf.length} di 16 caratteri` : controllo.messaggio;
  messaggio.className = "text-[11px] mt-1 " + (controllo.stato === "corretto" ? "text-[#2F636F]" : controllo.stato === "vuoto" || cf.length < 16 ? "text-[#7A8285]" : "text-[#C94141]");
}

function salvaAtletaDalModulo() {
  const nome = valoreCampo("atl-nome");
  const cognome = valoreCampo("atl-cognome");
  const dataNascita = leggiCampoData("atl-data-nascita");
  const categoria = valoreCampo("atl-categoria");
  const sesso = valoreCampo("atl-sesso");
  const cf = valoreCampo("atl-cf").toUpperCase();

  if (nome === "" || cognome === "" || !dataNascita || !categoria) {
    if (dataNascita === null) {
      mostraAvviso("La data di nascita non è valida. Scrivila così: gg/mm/aaaa (es. 15/10/2010).", "errore");
    } else {
      mostraAvviso("Compila tutti i campi obbligatori (Nome, Cognome, Data di Nascita e Categoria).", "errore");
    }
    return;
  }

  if (new Date(dataNascita) > new Date()) {
    mostraAvviso("La data di nascita non può essere nel futuro.", "errore");
    return;
  }

  // Controllo delle altre date (possono restare vuote, ma se scritte devono essere valide)
  const campiData = [
    { id: "atl-data-iscrizione", nome: "Iscritto alla società dal" },
    { id: "scad-visita", nome: "Scadenza Visita Medica" },
    { id: "scad-tesseramento", nome: "Scadenza Tesseramento" },
    { id: "scad-ci", nome: "Scadenza Documento Identità" },
  ];

  for (let i = 0; i < campiData.length; i++) {
    if (leggiCampoData(campiData[i].id) === null) {
      mostraAvviso(`La data "${campiData[i].nome}" non è valida. Scrivila così: gg/mm/aaaa.`, "errore");
      return;
    }
  }

  // Minorenni: genitore o tutore obbligatorio (nome + almeno un recapito)
  const eta = calcolaEta(dataNascita);
  const tutoreCompleto = valoreCampo("atl-tutore-nome") !== "" &&
    (valoreCampo("atl-tutore-telefono") !== "" || valoreCampo("atl-tutore-email") !== "");
  if (eta < 18 && !tutoreCompleto) {
    mostraAvviso("Atleta minorenne: inserisci il nome di un genitore o tutore e almeno un recapito (telefono o email).", "errore");
    document.getElementById("atl-tutore-nome").focus();
    return;
  }

  // Quota: vuota oppure un numero valido
  const quota = valoreCampo("atl-quota").replace(",", ".");
  if (quota !== "" && (isNaN(Number(quota)) || Number(quota) < 0)) {
    mostraAvviso("La quota deve essere un importo valido (es. 250) oppure vuota.", "errore");
    return;
  }

  const controlloCF = verificaCodiceFiscale(cf, dataNascita, sesso);
  if (controlloCF.stato === "errato") {
    mostraAvviso(controlloCF.messaggio, "errore");
    return;
  }

  // Codice fiscale che non corrisponde a data o sesso: chiediamo conferma
  if (controlloCF.stato === "incoerente") {
    chiediConferma({
      titolo: "Codice fiscale da controllare",
      testo: controlloCF.messaggio + " Vuoi salvare comunque?",
      conferma: "Salva comunque",
    }, function () {
      registraAtletaDalModulo(nome, cognome, dataNascita, categoria, sesso, cf, quota);
    });
    return;
  }

  registraAtletaDalModulo(nome, cognome, dataNascita, categoria, sesso, cf, quota);
}

// Scrive i dati del modulo nell'atleta (nuovo o esistente) e salva
function registraAtletaDalModulo(nome, cognome, dataNascita, categoria, sesso, cf, quota) {
  // Nuovo atleta oppure atleta esistente da aggiornare
  let atleta = atletaInModifica ? trovaAtleta(atletaInModifica) : null;
  const nuovo = !atleta;
  if (nuovo) {
    atleta = completaAtleta({ id: creaId("atl"), nome: "", cognome: "" });
  }

  atleta.nome = nome;
  atleta.cognome = cognome;
  atleta.dataNascita = dataNascita;
  atleta.luogoNascita = valoreCampo("atl-luogo-nascita");
  atleta.sesso = sesso;
  atleta.codiceFiscale = cf;
  atleta.indirizzo = valoreCampo("atl-indirizzo");
  atleta.comune = valoreCampo("atl-comune");
  atleta.cap = valoreCampo("atl-cap");
  atleta.provincia = valoreCampo("atl-provincia").toUpperCase();
  atleta.telefono = valoreCampo("atl-telefono");
  atleta.email = valoreCampo("atl-email");
  atleta.tutore = {
    nome: valoreCampo("atl-tutore-nome"),
    telefono: valoreCampo("atl-tutore-telefono"),
    email: valoreCampo("atl-tutore-email"),
  };
  atleta.categoria = categoria;
  atleta.ruolo = valoreCampo("atl-ruolo");
  atleta.numeroMaglia = valoreCampo("atl-numero");
  atleta.matricola = valoreCampo("atl-matricola");
  atleta.dataIscrizione = leggiCampoData("atl-data-iscrizione");
  atleta.tipoCertificato = valoreCampo("atl-tipo-certificato");
  atleta.taglie = {
    maglia: valoreCampo("atl-taglia-maglia"),
    pantaloncini: valoreCampo("atl-taglia-pantaloncini"),
    scarpe: valoreCampo("atl-taglia-scarpe"),
  };
  atleta.note = valoreCampo("atl-note");
  atleta.documenti = [
    { tipo: "Visite Mediche", scadenza: leggiCampoData("scad-visita") },
    { tipo: "Tesseramento Atleta", scadenza: leggiCampoData("scad-tesseramento") },
    { tipo: "CI", scadenza: leggiCampoData("scad-ci") },
  ];
  atleta.quota.importo = quota === "" ? "" : Number(quota);

  // Consensi: aggiorniamo la data solo se qualcosa è cambiato
  const nuoviConsensi = {
    trattamento: document.getElementById("atl-consenso-trattamento").checked,
    sanitari: document.getElementById("atl-consenso-sanitari").checked,
    immagini: document.getElementById("atl-consenso-immagini").checked,
  };
  const consensiCambiati = nuoviConsensi.trattamento !== atleta.consensi.trattamento ||
    nuoviConsensi.sanitari !== atleta.consensi.sanitari ||
    nuoviConsensi.immagini !== atleta.consensi.immagini;
  if (consensiCambiati) {
    nuoviConsensi.data = oggiIso();
    atleta.consensi = nuoviConsensi;
  }

  if (nuovo) configurazioneAttiva.atleti.push(atleta);

  if (!salvaConfigurazione()) return;
  chiudiModalAtleta();
  mostraAvviso(nuovo ? `${nomeCompleto(atleta)} aggiunto al roster.` : "Modifiche salvate.", "ok");

  // Dopo il salvataggio si apre la scheda dell'atleta
  aggiornaTutto();
  apriSchedaAtleta(atleta.id);
}

// 8. AVVIO SEZIONE ATLETI
function initAtleti() {
  document.getElementById("btn-apri-modal-atleta").onclick = function () {
    apriModalAtleta(null);
  };
  document.getElementById("btn-chiudi-modal").onclick = chiudiModalAtleta;
  document.getElementById("btn-salva-atleta").onclick = function (e) {
    e.preventDefault();
    salvaAtletaDalModulo();
  };

  document.getElementById("cerca-atleta").oninput = renderAtleti;
  document.getElementById("filtro-categoria").onchange = renderAtleti;
  document.getElementById("filtro-problema").onchange = renderAtleti;
  document.getElementById("filtro-annata").onchange = renderAtleti;
  document.getElementById("ordina-atleti").onchange = renderAtleti;

  document.getElementById("atl-cf").oninput = aggiornaMessaggioCF;
  document.getElementById("atl-sesso").onchange = aggiornaMessaggioCF;

  // Inquadratura foto atleta
  document.getElementById("btn-chiudi-foto-atleta").onclick = chiudiModalFotoAtleta;
  document.getElementById("btn-salva-foto-atleta").onclick = salvaFotoAtleta;
  document.getElementById("foto-atleta-zoom").oninput = function () {
    const nuovoZoom = Number(document.getElementById("foto-atleta-zoom").value);
    inquadraturaFotoAtleta = cambiaZoomInquadratura(inquadraturaFotoAtleta, nuovoZoom);
    renderAnteprimaFotoAtleta();
  };
  document.querySelectorAll("[data-sposta-foto-atleta]").forEach(function (bottone) {
    bottone.onclick = function () {
      inquadraturaFotoAtleta = spostaInquadratura(inquadraturaFotoAtleta, bottone.getAttribute("data-sposta-foto-atleta"));
      renderAnteprimaFotoAtleta();
    };
  });

  // Campi data in formato gg/mm/aaaa: le barre si aggiungono da sole
  document.querySelectorAll(".campo-data").forEach(function (campo) {
    campo.oninput = function () {
      formattaCampoData(campo);
      if (campo.id === "atl-data-nascita") aggiornaMessaggioCF();
    };
  });
}
