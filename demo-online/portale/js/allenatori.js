/* ==================================================================
   D.S.D. — allenatori.js (Portale v4)
   Sezione "Allenatori/Dirigenti": lo staff tecnico della società (allenatori,
   preparatori, dirigenti) con contatti, categorie seguite e documenti
   in scadenza. Le scadenze dello staff finiscono anche nello
   scadenziario della Panoramica, insieme a quelle degli atleti.
   ================================================================== */

// 1. COSTANTI
const tipiDocumentoStaff = ["Tesseramento Tecnico", "Visite Mediche", "Casellario Giudiziale", "Corso BLSD"];

// Documenti facoltativi: se la data resta vuota non compaiono da nessuna
// parte (né nello scadenziario né nei cartellini). Se la data c'è, contano
// come tutti gli altri: rosso se scaduti, giallo se in scadenza.
const documentiStaffFacoltativi = ["Casellario Giudiziale", "Corso BLSD"];

function documentoDaMostrare(doc) {
  return Boolean(doc.scadenza) || documentiStaffFacoltativi.indexOf(doc.tipo) === -1;
}

const ruoliStaff = ["Allenatore", "Vice allenatore", "Preparatore atletico", "Preparatore dei portieri",
  "Dirigente accompagnatore", "Fisioterapista"];

const nomiStaffDemo = [
  { nome: "Giovanni", cognome: "Pagani" },
  { nome: "Stefano", cognome: "Mariani" },
  { nome: "Paola", cognome: "Gatti" },
  { nome: "Roberto", cognome: "Lombardi" },
  { nome: "Claudio", cognome: "Sala" },
  { nome: "Fabio", cognome: "Testa" },
  { nome: "Marta", cognome: "Cattaneo" },
  { nome: "Alberto", cognome: "Pellegrini" },
];

// Copia di lavoro dell'allenatore aperto nel modulo:
// i dati veri cambiano solo premendo "Salva"
let allenatoreInModifica = null;

// 2. FUNZIONI DI SUPPORTO
function trovaAllenatore(id) {
  return configurazioneAttiva.allenatori.find(function (allenatore) {
    return allenatore.id === id;
  });
}

// Completa un allenatore con tutti i campi (utile per i dati più vecchi)
function completaAllenatore(allenatore) {
  const campiTesto = ["nome", "cognome", "ruolo", "telefono", "email", "dataNascita",
    "codiceFiscale", "qualifica", "matricola", "foto", "note"];

  campiTesto.forEach(function (campo) {
    if (allenatore[campo] === undefined) allenatore[campo] = "";
  });

  if (!allenatore.categorie) allenatore.categorie = [];
  if (!allenatore.documenti) allenatore.documenti = [];

  // Ogni allenatore ha sempre i quattro documenti, anche senza data
  tipiDocumentoStaff.forEach(function (tipo) {
    const presente = allenatore.documenti.some(function (doc) {
      return doc.tipo === tipo;
    });
    if (!presente) allenatore.documenti.push({ tipo: tipo, scadenza: "" });
  });

  return allenatore;
}

function allenatoriDiCategoria(categoria) {
  return configurazioneAttiva.allenatori.filter(function (allenatore) {
    return allenatore.categorie.indexOf(categoria) !== -1;
  });
}

// Esempio: "Pagani (Allenatore), Gatti (Preparatore atletico)"
function testoStaffCategoria(categoria) {
  return allenatoriDiCategoria(categoria).map(function (allenatore) {
    return `${allenatore.cognome}${allenatore.ruolo ? " (" + allenatore.ruolo + ")" : ""}`;
  }).join(", ");
}

// Nella prima versione della v3 lo staff si scriveva in Società → Categorie:
// lo trasformiamo in allenatori veri e propri (una volta sola)
function creaAllenatoriDaStaff(config) {
  const allenatori = [];

  Object.keys(config.staff || {}).forEach(function (categoria) {
    const staff = config.staff[categoria];
    const nomeIntero = String(staff.allenatore || "").trim();
    if (nomeIntero === "") return;

    // Lo stesso allenatore può seguire più categorie
    let allenatore = allenatori.find(function (a) {
      return `${a.nome} ${a.cognome}`.trim().toLowerCase() === nomeIntero.toLowerCase();
    });

    if (!allenatore) {
      const parti = nomeIntero.split(" ");
      allenatore = completaAllenatore({
        id: creaId("all"),
        nome: parti.shift(),
        cognome: parti.join(" "),
        ruolo: "Allenatore",
      });
      allenatori.push(allenatore);
    }

    if (config.categorie.indexOf(categoria) !== -1) allenatore.categorie.push(categoria);
    if (!allenatore.telefono) allenatore.telefono = staff.telefono || "";
  });

  return allenatori;
}

// 3. ALLENATORI DI ESEMPIO
// Un allenatore per categoria e un preparatore atletico per tutte
function generaAllenatoriDemo(categorie) {
  const allenatori = [];
  const annoCorrente = new Date().getFullYear();

  categorie.forEach(function (categoria, indice) {
    const persona = nomiStaffDemo[indice % nomiStaffDemo.length];
    allenatori.push({
      id: `all-${indice}`,
      nome: persona.nome,
      cognome: persona.cognome,
      ruolo: "Allenatore",
      categorie: [categoria],
      telefono: `339 40${String(indice).padStart(5, "0")}`,
      email: `${persona.nome.toLowerCase()}.${persona.cognome.toLowerCase()}@email.it`,
      dataNascita: `${annoCorrente - 30 - indice * 3}-0${(indice % 9) + 1}-1${indice % 9}`,
      qualifica: indice % 2 === 0 ? "UEFA C" : "Istruttore giovanile",
      documenti: [
        { tipo: "Tesseramento Tecnico", scadenza: calcolaDataDemo(indice + 1, 1) },
        { tipo: "Visite Mediche", scadenza: calcolaDataDemo(indice + 1, 0) },
        { tipo: "Casellario Giudiziale", scadenza: calcolaDataDemo(indice + 1, 2) },
        { tipo: "Corso BLSD", scadenza: indice % 3 === 0 ? "" : calcolaDataDemo(indice + 2, 2) },
      ],
    });
  });

  allenatori.push({
    id: "all-prep",
    nome: "Laura",
    cognome: "Ferri",
    ruolo: "Preparatore atletico",
    categorie: categorie.slice(),
    telefono: "339 4099999",
    documenti: [
      { tipo: "Tesseramento Tecnico", scadenza: calcolaDataDemo(4, 2) },
      { tipo: "Visite Mediche", scadenza: calcolaDataDemo(5, 1) },
    ],
  });

  return allenatori.map(completaAllenatore);
}

function aggiungiAllenatoriDemo() {
  configurazioneAttiva.allenatori = configurazioneAttiva.allenatori.concat(generaAllenatoriDemo(configurazioneAttiva.categorie));
  salvaConfigurazione();
  aggiornaTutto();
  mostraAvviso("Allenatori di esempio aggiunti: li trovi anche nello scadenziario.", "ok");
}

// 4. ELENCO ALLENATORI
function popolaFiltroCategorieStaff() {
  const select = document.getElementById("filtro-categoria-staff");
  const scelta = select.value;

  select.innerHTML = `<option value="">Tutte le categorie</option>`;
  configurazioneAttiva.categorie.forEach(function (categoria) {
    select.innerHTML += `<option value="${pulisciTesto(categoria)}">${pulisciTesto(categoria)}</option>`;
  });
  select.value = scelta;
}

function allenatoriFiltrati() {
  const testoRicerca = document.getElementById("cerca-allenatore").value.trim().toLowerCase();
  const categoria = document.getElementById("filtro-categoria-staff").value;

  const risultato = configurazioneAttiva.allenatori.filter(function (allenatore) {
    if (categoria && allenatore.categorie.indexOf(categoria) === -1) return false;
    if (testoRicerca === "") return true;

    const testo = `${allenatore.nome} ${allenatore.cognome} ${allenatore.cognome} ${allenatore.nome} ${allenatore.ruolo}`.toLowerCase();
    return testo.indexOf(testoRicerca) !== -1;
  });

  risultato.sort(function (a, b) {
    return `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`, "it");
  });

  return risultato;
}

function renderAllenatori() {
  const contenitore = document.getElementById("allenatori-list");
  if (!contenitore) return;

  popolaFiltroCategorieStaff();
  const allenatori = allenatoriFiltrati();
  let htmlAccumulato = "";

  allenatori.forEach(function (allenatore) {
    const dettagli = [allenatore.ruolo || "Staff"];
    if (allenatore.qualifica) dettagli.push(allenatore.qualifica);
    if (allenatore.telefono) dettagli.push(allenatore.telefono);

    const categorieHtml = allenatore.categorie.length > 0
      ? allenatore.categorie.map(function (categoria) {
        return `<span class="etichetta-categoria">${pulisciTesto(categoria)}</span>`;
      }).join("")
      : `<span class="etichetta-problema">Nessuna categoria</span>`;

    htmlAccumulato += `
      <button type="button" data-apri-allenatore="${allenatore.id}" class="roster-card w-full text-left border border-[#E7EBEC] rounded-md bg-white shadow-xs hover:border-[#4E9EAF] transition-colors cursor-pointer">
        <div class="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex items-center gap-4 md:w-80 shrink-0">
            ${htmlAvatar(allenatore, "w-14 h-14")}
            <div class="min-w-0">
              <p class="font-bold text-[#12181B] text-sm leading-tight">${pulisciTesto(allenatore.cognome)} ${pulisciTesto(allenatore.nome)}</p>
              <p class="text-xs text-[#7A8285] truncate">${pulisciTesto(dettagli.join(" • "))}</p>
              <p class="flex flex-wrap gap-1 mt-1">${categorieHtml}</p>
            </div>
          </div>
          <div class="flex items-center justify-between md:justify-end gap-3 flex-1">
            <div class="flex flex-wrap gap-2">${htmlCartellini(allenatore)}</div>
            <span class="flex items-center justify-center w-8 h-8 rounded-md bg-[#F2F4F4] text-[#4E9EAF] font-bold shrink-0 text-sm">→</span>
          </div>
        </div>
      </button>
    `;
  });

  if (allenatori.length === 0) {
    const nessuno = configurazioneAttiva.allenatori.length === 0;
    htmlAccumulato = `
      <div class="border border-dashed border-[#CFD5D6] rounded-md bg-white p-8 text-center">
        <p class="font-bold text-[#12181B] mb-1">${nessuno ? "Nessun allenatore o dirigente ancora" : "Nessun risultato"}</p>
        <p class="text-sm text-[#7A8285]">${nessuno ? "Usa \"+ Aggiungi Allenatore/Dirigente\" per inserire lo staff." : "Prova a cambiare la ricerca o la categoria."}</p>
        ${nessuno ? `<button type="button" id="btn-allenatori-demo" class="mt-3 text-xs text-[#4E9EAF] font-bold hover:underline cursor-pointer">Oppure crea allenatori di esempio per le tue categorie</button>` : ""}
      </div>
    `;
  }

  contenitore.innerHTML = htmlAccumulato;
  document.getElementById("allenatori-count").textContent = allenatori.length;

  const btnDemo = document.getElementById("btn-allenatori-demo");
  if (btnDemo) btnDemo.onclick = aggiungiAllenatoriDemo;

  collegaAperturaAllenatori(contenitore);
}

// Qualsiasi elemento con data-apri-allenatore apre il modulo di quell'allenatore
function collegaAperturaAllenatori(contenitore) {
  contenitore.querySelectorAll("[data-apri-allenatore]").forEach(function (elemento) {
    elemento.onclick = function () {
      apriModalAllenatore(elemento.getAttribute("data-apri-allenatore"));
    };
  });
}

// 5. MODULO AGGIUNGI / MODIFICA ALLENATORE
function apriModalAllenatore(id) {
  const allenatore = id ? trovaAllenatore(id) : null;

  // Lavoriamo su una copia: se si preme "Annulla" non cambia nulla
  allenatoreInModifica = allenatore
    ? JSON.parse(JSON.stringify(allenatore))
    : completaAllenatore({ id: "", ruolo: "Allenatore" });

  const dati = allenatoreInModifica;
  const filtroCategoria = document.getElementById("filtro-categoria-staff").value;
  if (!allenatore && filtroCategoria) dati.categorie = [filtroCategoria];

  document.getElementById("modal-allenatore-titolo").textContent = allenatore ? "Modifica Allenatore/Dirigente" : "Aggiungi Allenatore/Dirigente";
  document.getElementById("btn-elimina-allenatore").classList.toggle("hidden", !allenatore);

  impostaCampo("all-nome", dati.nome);
  impostaCampo("all-cognome", dati.cognome);
  impostaCampo("all-ruolo", dati.ruolo);
  impostaCampo("all-qualifica", dati.qualifica);
  impostaCampoData("all-data-nascita", dati.dataNascita);
  impostaCampo("all-cf", dati.codiceFiscale);
  impostaCampo("all-telefono", dati.telefono);
  impostaCampo("all-email", dati.email);
  impostaCampo("all-matricola", dati.matricola);
  impostaCampo("all-note", dati.note);

  // Una casella per ogni categoria della società
  let categorieHtml = "";
  configurazioneAttiva.categorie.forEach(function (categoria) {
    const scelta = dati.categorie.indexOf(categoria) !== -1;
    categorieHtml += `
      <label class="scelta-categoria">
        <input type="checkbox" value="${pulisciTesto(categoria)}" ${scelta ? "checked" : ""} class="accent-[#4E9EAF] w-4 h-4" />
        <span>${pulisciTesto(categoria)}</span>
      </label>
    `;
  });
  document.getElementById("all-categorie").innerHTML = categorieHtml;

  tipiDocumentoStaff.forEach(function (tipo, indice) {
    impostaCampoData(`all-scad-${indice}`, scadenzaDocumento(dati, tipo));
  });

  renderFotoModuloAllenatore();
  apriFinestra(document.getElementById("modal-allenatore"));
  document.getElementById("all-nome").focus();
}

function renderFotoModuloAllenatore() {
  const dati = allenatoreInModifica;
  document.getElementById("all-foto").innerHTML = dati.foto
    ? htmlFotoAtleta(dati, "w-20 h-20", "")
    : htmlAvatar(dati.nome || dati.cognome ? dati : { nome: "+", cognome: " " }, "w-20 h-20");

  document.getElementById("all-foto-testo").textContent = dati.foto ? "Cambia foto" : "+ Aggiungi foto";
  document.getElementById("all-foto-modifica").classList.toggle("hidden", !dati.foto);
  document.getElementById("all-foto-rimuovi").classList.toggle("hidden", !dati.foto);
}

function chiudiModalAllenatore() {
  chiudiFinestra(document.getElementById("modal-allenatore"));
  allenatoreInModifica = null;
}

function salvaAllenatoreDalModulo() {
  const dati = allenatoreInModifica;
  const nome = valoreCampo("all-nome");
  const cognome = valoreCampo("all-cognome");

  if (nome === "" || cognome === "") {
    mostraAvviso("Scrivi almeno nome e cognome dell'allenatore.", "errore");
    return;
  }

  // Le date possono restare vuote, ma se scritte devono essere valide
  const dataNascita = leggiCampoData("all-data-nascita");
  const scadenze = tipiDocumentoStaff.map(function (tipo, indice) {
    return leggiCampoData(`all-scad-${indice}`);
  });
  if (dataNascita === null || scadenze.indexOf(null) !== -1) {
    mostraAvviso("Una delle date non è valida. Scrivila così: gg/mm/aaaa (es. 30/06/2027).", "errore");
    return;
  }

  dati.nome = nome;
  dati.cognome = cognome;
  dati.ruolo = valoreCampo("all-ruolo");
  dati.qualifica = valoreCampo("all-qualifica");
  dati.dataNascita = dataNascita;
  dati.codiceFiscale = valoreCampo("all-cf").toUpperCase();
  dati.telefono = valoreCampo("all-telefono");
  dati.email = valoreCampo("all-email");
  dati.matricola = valoreCampo("all-matricola");
  dati.note = valoreCampo("all-note");

  dati.categorie = [];
  document.querySelectorAll("#all-categorie input:checked").forEach(function (casella) {
    dati.categorie.push(casella.value);
  });

  tipiDocumentoStaff.forEach(function (tipo, indice) {
    dati.documenti.forEach(function (doc) {
      if (doc.tipo === tipo) doc.scadenza = scadenze[indice];
    });
  });

  // Nuovo allenatore: si aggiunge; altrimenti si sostituisce quello vecchio
  if (dati.id === "") {
    dati.id = creaId("all");
    configurazioneAttiva.allenatori.push(dati);
  } else {
    configurazioneAttiva.allenatori = configurazioneAttiva.allenatori.map(function (allenatore) {
      return allenatore.id === dati.id ? dati : allenatore;
    });
  }

  if (!salvaConfigurazione()) return;
  chiudiModalAllenatore();
  aggiornaTutto();
  mostraAvviso(`${nome} ${cognome} salvato nello staff.`, "ok");
}

function eliminaAllenatore() {
  const allenatore = trovaAllenatore(allenatoreInModifica.id);
  if (!allenatore) return;

  chiediConferma({
    titolo: `Eliminare ${allenatore.nome} ${allenatore.cognome}?`,
    testo: "Verrà tolto dallo staff e dallo scadenziario. Gli atleti non vengono toccati.",
    conferma: "Elimina",
    pericolo: true,
  }, function () {
    configurazioneAttiva.allenatori = configurazioneAttiva.allenatori.filter(function (a) {
      return a.id !== allenatore.id;
    });
    salvaConfigurazione();
    chiudiModalAllenatore();
    aggiornaTutto();
    mostraAvviso(`${allenatore.nome} ${allenatore.cognome} eliminato dallo staff.`, "info");
  });
}

// 6. AVVIO SEZIONE ALLENATORI
function initAllenatori() {
  document.getElementById("btn-apri-modal-allenatore").onclick = function () {
    apriModalAllenatore(null);
  };
  document.getElementById("btn-chiudi-allenatore").onclick = chiudiModalAllenatore;
  document.getElementById("btn-salva-allenatore").onclick = salvaAllenatoreDalModulo;
  document.getElementById("btn-elimina-allenatore").onclick = eliminaAllenatore;

  document.getElementById("cerca-allenatore").oninput = renderAllenatori;
  document.getElementById("filtro-categoria-staff").onchange = renderAllenatori;

  // Ruoli suggeriti mentre si scrive
  document.getElementById("lista-ruoli-staff").innerHTML = ruoliStaff.map(function (ruolo) {
    return `<option value="${ruolo}"></option>`;
  }).join("");

  // Foto: si carica, poi si apre subito l'inquadratura (zoom e frecce)
  const inputFoto = document.getElementById("all-input-foto");
  inputFoto.onchange = function () {
    riduciFoto(inputFoto.files[0], 600, function (fotoRidotta) {
      calcolaColoreBordi(fotoRidotta, function (colore) {
        allenatoreInModifica.foto = fotoRidotta;
        allenatoreInModifica.fotoInquadratura = inquadraturaIniziale();
        allenatoreInModifica.fotoInquadratura.sfondo = colore;
        renderFotoModuloAllenatore();
        apriModalFoto(allenatoreInModifica, renderFotoModuloAllenatore);
      });
    });
    inputFoto.value = "";
  };

  document.getElementById("all-foto-modifica").onclick = function () {
    apriModalFoto(allenatoreInModifica, renderFotoModuloAllenatore);
  };
  document.getElementById("all-foto-rimuovi").onclick = function () {
    allenatoreInModifica.foto = "";
    allenatoreInModifica.fotoInquadratura = inquadraturaIniziale();
    renderFotoModuloAllenatore();
  };
}
