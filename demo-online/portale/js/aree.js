/* ==================================================================
   D.S.D. — aree.js (Portale v4)
   Funzioni in comune tra le tre aree del portale:
   - Segreteria (index.html)
   - Allenatore/Dirigente (allenatore.html)
   - Genitore/Atleta (famiglia.html)
   Tutte e tre leggono e salvano gli stessi dati: quello che fa una
   persona in un'area si vede subito nelle altre.
   Per ora è un prototipo: si passa da un'area all'altra con la barra in
   alto. Con il server ognuno vedrà solo la sua area dopo il login.
   ================================================================== */

// 1. BARRA "PROVA LE AREE" (solo nel prototipo)
function htmlBarraAree(areaAttiva) {
  const aree = [
    { id: "segreteria", nome: "Segreteria", link: "index.html" },
    { id: "allenatore", nome: "Allenatore/Dirigente", link: "allenatore.html" },
    { id: "famiglia", nome: "Genitore/Atleta", link: "famiglia.html" },
  ];

  return `
    <div class="barra-aree">
      <span class="barra-aree__titolo">Prototipo • prova le aree</span>
      <span class="flex flex-wrap gap-1">
        ${aree.map(function (area) {
          return `<a href="${area.link}" class="barra-aree__voce ${area.id === areaAttiva ? "barra-aree__voce--attiva" : ""}">${area.nome}</a>`;
        }).join("")}
      </span>
    </div>
  `;
}

function inserisciBarraAree(areaAttiva) {
  const contenitore = document.getElementById("barra-aree");
  if (contenitore) contenitore.innerHTML = htmlBarraAree(areaAttiva);
}

// Le aree Allenatore e Famiglia leggono i dati creati dalla segreteria
function caricaDatiArea() {
  configurazioneAttiva = caricaConfigurazioneSalvata();
  if (configurazioneAttiva && datiImportatiDa) salvaConfigurazione();
  return configurazioneAttiva !== null;
}

function htmlDatiMancanti() {
  return `
    <div class="pannello-scheda text-center max-w-md mx-auto mt-12">
      <p class="font-bold text-[#12181B] mb-1">Nessuna società ancora</p>
      <p class="text-sm text-[#7A8285] mb-4">Apri prima l'area Segreteria e crea la società (anche con i dati di esempio).</p>
      <a href="index.html" class="btn-dsd-primary text-xs py-2 px-5 inline-block">Vai alla Segreteria</a>
    </div>
  `;
}

// 2. IDONEITÀ (per allenatori e famiglie, senza mostrare dati sanitari)
// livello: "idoneo", "in-scadenza" oppure "non-idoneo"
function idoneitaAtleta(atleta) {
  const visita = atleta.documenti.find(function (doc) {
    return doc.tipo === "Visite Mediche";
  });
  const stato = calcolaStatoDocumento(visita ? visita.scadenza : "");

  if (stato.stato === "mancante") return { livello: "non-idoneo", testo: "Manca la visita medica" };
  if (stato.stato === "scaduto") return { livello: "non-idoneo", testo: "Visita medica scaduta" };
  if (certificatoDaCambiare(atleta)) return { livello: "non-idoneo", testo: "Serve il certificato agonistico" };
  if (stato.stato === "in-scadenza") return { livello: "in-scadenza", testo: `Visita in scadenza il ${dataInItaliano(visita.scadenza)}` };
  return { livello: "idoneo", testo: "Idoneo" };
}

function htmlIdoneita(atleta) {
  const idoneita = idoneitaAtleta(atleta);
  return `<span class="etichetta-idoneita etichetta-idoneita--${idoneita.livello}">${idoneita.livello === "idoneo" ? "Idoneo" : pulisciTesto(idoneita.testo)}</span>`;
}

// 3. PRESENZE AGLI ALLENAMENTI
// Ogni allenamento: { id, categoria, data, presenti: [id atleti], allenatoreId }
function allenamentiCategoria(categoria) {
  return configurazioneAttiva.presenze.filter(function (allenamento) {
    return allenamento.categoria === categoria;
  }).sort(function (a, b) {
    return a.data < b.data ? 1 : -1;   // dal più recente
  });
}

// Le assenze giustificate non contano nella percentuale.
// Esempio: { presenti: 17, totali: 20, giustificate: 2, percentuale: 94 }
// (percentuale null se non ci sono allenamenti da contare)
function presenzeAtleta(atleta) {
  const allenamenti = allenamentiCategoria(atleta.categoria);
  let presenti = 0;
  let giustificate = 0;
  allenamenti.forEach(function (allenamento) {
    if (allenamento.presenti.indexOf(atleta.id) !== -1) presenti++;
    else if ((allenamento.giustificati || []).indexOf(atleta.id) !== -1) giustificate++;
  });
  const daContare = allenamenti.length - giustificate;
  return {
    presenti: presenti,
    totali: allenamenti.length,
    giustificate: giustificate,
    percentuale: daContare > 0 ? Math.round((presenti / daContare) * 100) : null,
  };
}

function testoPresenze(atleta) {
  const presenze = presenzeAtleta(atleta);
  if (presenze.totali === 0) return "Nessun allenamento registrato";
  const giustificate = presenze.giustificate > 0 ? `, ${presenze.giustificate} ${presenze.giustificate === 1 ? "assenza giustificata" : "assenze giustificate"}` : "";
  return `${presenze.percentuale === null ? "—" : presenze.percentuale + "%"} (${presenze.presenti} su ${presenze.totali}${giustificate})`;
}

// 3-bis. ORARI DEGLI ALLENAMENTI: vedi allenamenti.js

// 4. CONVOCAZIONI
// { id, categoria, data, ora, evento, luogo, convocati: [id atleti], note, allenatoreId }
function convocazioniFuture(categoria) {
  const oggi = oggiIso();
  return configurazioneAttiva.convocazioni.filter(function (convocazione) {
    return convocazione.data >= oggi && (!categoria || convocazione.categoria === categoria);
  }).sort(function (a, b) {
    return (a.data + a.ora) < (b.data + b.ora) ? -1 : 1;
  });
}

// Risposta della famiglia: "si", "no" oppure "" (non ha ancora risposto)
function rispostaConvocazione(convocazione, atletaId) {
  return (convocazione.risposte || {})[atletaId] || "";
}

function htmlRisposta(risposta) {
  if (risposta === "si") return `<span class="etichetta-idoneita etichetta-idoneita--idoneo">Ci sarà</span>`;
  if (risposta === "no") return `<span class="etichetta-idoneita etichetta-idoneita--non-idoneo">Non ci sarà</span>`;
  return `<span class="etichetta-idoneita etichetta-idoneita--attesa">In attesa</span>`;
}

function convocazioniAtleta(atleta) {
  return convocazioniFuture(atleta.categoria).filter(function (convocazione) {
    return convocazione.convocati.indexOf(atleta.id) !== -1;
  });
}

// Esempio: "sabato 24 ottobre"
function dataEstesa(dataIso) {
  return new Date(dataIso + "T12:00:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
}

function testoConvocazione(convocazione, atleta) {
  const societa = configurazioneAttiva.nomeSocieta || "la società";
  return `Buongiorno, ${atleta.nome} è convocat${atleta.sesso === "F" ? "a" : "o"} per ${convocazione.evento}, ` +
    `${dataEstesa(convocazione.data)}. Ritrovo alle ${convocazione.ora}${convocazione.luogo ? " a " + convocazione.luogo : ""}.` +
    `${convocazione.note ? " " + convocazione.note : ""}\nGrazie, ${societa}`;
}

// 5. RICHIESTE DALLE FAMIGLIE ALLA SEGRETERIA
// { id, data, atletaId, tipo: "documento" | "correzione" | "consenso", testo,
//   documento, scadenza, nomeFile, stato: "nuova" | "accettata" | "rifiutata", motivo }
function aggiungiRichiesta(dati) {
  dati.id = creaId("ric");
  dati.data = oggiIso();
  dati.stato = "nuova";
  configurazioneAttiva.richieste.push(dati);
  return salvaConfigurazione();
}

function richiesteAtleta(atletaId) {
  return configurazioneAttiva.richieste.filter(function (richiesta) {
    return richiesta.atletaId === atletaId;
  }).reverse();
}

function richiesteNuove() {
  return configurazioneAttiva.richieste.filter(function (richiesta) {
    return richiesta.stato === "nuova";
  });
}

// Come la famiglia vede lo stato della sua richiesta
function htmlStatoRichiesta(richiesta) {
  if (richiesta.stato === "nuova") return `<span class="etichetta-stato etichetta-stato--aperta">In verifica</span>`;
  if (richiesta.stato === "rifiutata") return `<span class="etichetta-stato etichetta-stato--annullata">Da rifare</span>`;
  return `<span class="etichetta-stato etichetta-stato--consegnata">Fatto</span>`;   // "accettata" (o "fatta" delle prime prove)
}

function titoloRichiesta(richiesta) {
  if (richiesta.tipo === "documento") return `Nuovo documento: ${etichettaDocumento(richiesta.documento)}`;
  if (richiesta.tipo === "consenso") return "Consenso foto e video cambiato";
  return "Correzione dei dati";
}

function testoRichiesta(richiesta) {
  if (richiesta.tipo === "documento") {
    return `Nuova scadenza ${dataInItaliano(richiesta.scadenza)}${richiesta.nomeFile ? " • file: " + richiesta.nomeFile : ""}`;
  }
  return richiesta.testo;
}

// 6. ACCOUNT DELLE FAMIGLIE (nel prototipo, al posto del login)
// Un genitore con più figli nella società ha un solo account;
// un atleta maggiorenne entra con il suo account.
function accountFamiglie() {
  const account = [];

  configurazioneAttiva.atleti.forEach(function (atleta) {
    const minorenne = eMinorenne(atleta);
    const chiave = minorenne
      ? "tutore-" + String(atleta.tutore.email || atleta.tutore.telefono || atleta.tutore.nome || atleta.id).toLowerCase()
      : "atleta-" + atleta.id;

    let voce = account.find(function (a) { return a.chiave === chiave; });
    if (!voce) {
      voce = {
        chiave: chiave,
        nome: minorenne ? (atleta.tutore.nome || `Genitore di ${nomeCompleto(atleta)}`) : nomeCompleto(atleta),
        ruolo: minorenne ? "Genitore" : "Atleta",
        atleti: [],
      };
      account.push(voce);
    }
    voce.atleti.push(atleta.id);
  });

  return account.sort(function (a, b) {
    return a.nome.localeCompare(b.nome, "it");
  });
}

// 7. BACHECA AVVISI
// { id, data, testo, categoria ("" = tutta la società), autore }
function avvisiPerCategorie(categorie) {
  return configurazioneAttiva.avvisi.filter(function (avviso) {
    return avviso.categoria === "" || categorie.indexOf(avviso.categoria) !== -1;
  }).sort(function (a, b) {
    return a.data < b.data ? 1 : -1;   // dal più recente
  });
}

function htmlAvvisoBacheca(avviso, eliminabile) {
  return `
    <div class="avviso-bacheca">
      <div class="flex items-start justify-between gap-3">
        <p class="font-mono text-[10px] uppercase text-[#4E9EAF] font-bold">${avviso.categoria ? pulisciTesto(avviso.categoria) : "Tutta la società"} • ${dataInItaliano(avviso.data)}</p>
        ${eliminabile ? `<button type="button" data-elimina-avviso="${avviso.id}" class="text-[11px] text-[#7A8285] hover:text-[#C94141] underline cursor-pointer shrink-0">Elimina</button>` : ""}
      </div>
      <p class="text-sm text-[#12181B] mt-1 whitespace-pre-line">${pulisciTesto(avviso.testo)}</p>
      <p class="text-[11px] text-[#7A8285] mt-1">${pulisciTesto(avviso.autore)}</p>
    </div>
  `;
}

function pubblicaAvviso(testo, categoria, autore) {
  configurazioneAttiva.avvisi.push({ id: creaId("avv"), data: oggiIso(), testo: testo, categoria: categoria, autore: autore });
  return salvaConfigurazione();
}

function eliminaAvviso(id) {
  configurazioneAttiva.avvisi = configurazioneAttiva.avvisi.filter(function (avviso) {
    return avviso.id !== id;
  });
  return salvaConfigurazione();
}

// 8. DATI CAMBIATI DA UN'ALTRA AREA (altra scheda del browser)
// Nel prototipo tutte le aree salvano nello stesso posto del browser.
// L'evento "storage" del browser avvisa una scheda quando un'altra scheda
// cambia i dati: è così che, aprendo segreteria e famiglia in due schede,
// una richiesta inviata dalla famiglia compare subito in segreteria.
// Con un database online questo ruolo lo prenderà un aggiornamento in
// tempo reale (es. le "subscription" del database).
// Prima di ogni salvataggio si rileggono i dati, così non si cancella
// quello che ha appena fatto un'altra persona.
function ricaricaDati() {
  const freschi = caricaConfigurazioneSalvata();
  if (freschi) configurazioneAttiva = freschi;
}

// Se arrivano dati nuovi mentre si sta scrivendo, non si ridisegna la pagina
// (si perderebbe il modulo): compare un pulsante "Aggiorna".
function staScrivendo() {
  const attivo = document.activeElement;
  const inCampo = attivo && ["INPUT", "TEXTAREA", "SELECT"].indexOf(attivo.tagName) !== -1 && !attivo.closest("header");
  const finestraAperta = document.querySelector(".finestra:not(.hidden)");
  return inCampo || finestraAperta !== null;
}

function gestisciDatiEsterni(ridisegna) {
  window.addEventListener("storage", function (evento) {
    if (evento.key !== CHIAVE_SALVATAGGIO || !configurazioneAttiva) return;

    if (!staScrivendo()) {
      ricaricaDati();
      ridisegna();
      return;
    }

    let barra = document.getElementById("barra-aggiornamenti");
    if (!barra) {
      barra = document.createElement("button");
      barra.id = "barra-aggiornamenti";
      barra.type = "button";
      barra.className = "barra-aggiornamenti";
      barra.textContent = "Ci sono novità da un'altra area • Aggiorna";
      document.body.appendChild(barra);
    }
    barra.onclick = function () {
      barra.remove();
      ricaricaDati();
      ridisegna();
    };
  });
}
