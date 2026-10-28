/* ==================================================================
   D.S.D. — magazzino.js (Portale v4)
   Gestione magazzino: prodotti con foto, prezzo e taglie,
   prenotazioni (anche modificabili) per atleti e famiglie,
   consegne, incassi, carichi di merce e storico dei movimenti.
   ================================================================== */

// 1. COSTANTI MAGAZZINO
const categorieProdotto = ["Kit gara", "Allenamento", "Rappresentanza", "Accessori", "Attrezzatura", "Merchandising"];

const presetTaglie = {
  adulto: ["XS", "S", "M", "L", "XL", "XXL"],
  bambino: ["4A", "6A", "8A", "10A", "12A", "14A"],
  scarpe: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
  unica: ["Unica"],
};

const palloniPerSport = {
  calcio: "Pallone da allenamento n.5",
  pallavolo: "Pallone da allenamento",
  basket: "Pallone da allenamento n.7",
  tennis: "Tubo da 4 palline",
};

// Stato della sezione
let tabMagazzino = "prodotti";
let filtroStatoPrenotazioni = "aperta";
let prodottoInModifica = null;
let prenotazioneInModifica = null;   // prenotazione aperta nel modulo (null = nuova)
let fotoProdottoInModifica = "";

// Inquadratura della foto: zoom (0.5 - 3) e spostamento in % (x verso destra, y verso il basso)
let inquadraturaInModifica = { zoom: 1, x: 0, y: 0 };

// 2. FUNZIONI DI SUPPORTO
function trovaProdotto(id) {
  return configurazioneAttiva.magazzino.prodotti.find(function (prodotto) {
    return prodotto.id === id;
  });
}

// Registro dei movimenti: ogni volta che i pezzi in magazzino cambiano
// (carico, consegna, reso o correzione a mano) ne teniamo traccia.
// quantita è positiva se i pezzi entrano, negativa se escono.
function registraMovimento(prodottoId, taglia, quantita, tipo, nota) {
  if (quantita === 0) return;
  configurazioneAttiva.magazzino.movimenti.push({
    id: creaId("mov"),
    data: oggiIso(),
    prodottoId: prodottoId,
    taglia: taglia,
    quantita: quantita,
    tipo: tipo,          // "carico", "consegna", "reso", "rettifica"
    nota: nota || "",
  });
}

function etichettaMovimento(tipo) {
  if (tipo === "carico") return "Carico merce";
  if (tipo === "consegna") return "Consegna";
  if (tipo === "reso") return "Consegna annullata";
  return "Correzione a mano";
}

// Pezzi già prenotati (non ancora consegnati) per una taglia
function pezziPrenotati(prodottoId, taglia) {
  let totale = 0;
  configurazioneAttiva.magazzino.prenotazioni.forEach(function (pren) {
    if (pren.prodottoId === prodottoId && pren.taglia === taglia && pren.stato === "aperta") {
      totale += pren.quantita;
    }
  });
  return totale;
}

// Pezzi liberi = pezzi in magazzino meno quelli già prenotati
function pezziDisponibili(prodotto, taglia) {
  const voce = prodotto.taglie.find(function (t) {
    return t.taglia === taglia;
  });
  if (!voce) return 0;
  return Math.max(0, voce.quantita - pezziPrenotati(prodotto.id, taglia));
}

function totaleDisponibili(prodotto) {
  let totale = 0;
  prodotto.taglie.forEach(function (voce) {
    totale += pezziDisponibili(prodotto, voce.taglia);
  });
  return totale;
}

function contaPrenotazioniAperte() {
  if (!configurazioneAttiva) return 0;
  return configurazioneAttiva.magazzino.prenotazioni.filter(function (pren) {
    return pren.stato === "aperta";
  }).length;
}

function prenotazioniDiAtleta(atletaId) {
  return configurazioneAttiva.magazzino.prenotazioni.filter(function (pren) {
    return pren.atletaId === atletaId;
  }).reverse();
}

function nomeIntestatario(pren) {
  if (pren.atletaId) {
    const atleta = trovaAtleta(pren.atletaId);
    if (atleta) return nomeCompleto(atleta);
  }
  return pren.intestatario || "—";
}

function etichettaStatoPrenotazione(pren) {
  if (pren.stato === "consegnata") return "Consegnata";
  if (pren.stato === "annullata") return "Annullata";
  return pren.pagato ? "Prenotata • Pagata" : "Prenotata";
}

// La foto usa zoom e spostamento scelti nel modulo prodotto (stileInquadratura è in main.js)
function htmlFotoProdotto(prodotto) {
  return `<img src="${prodotto.foto}" alt="${pulisciTesto(prodotto.nome)}" class="w-full h-full object-contain" style="${stileInquadratura(prodotto.inquadratura)}" />`;
}

function htmlMiniaturaProdotto(prodotto, classeDimensione) {
  if (prodotto && prodotto.foto) {
    return `<div class="${classeDimensione} shrink-0 overflow-hidden border border-[#E7EBEC] foto-prodotto-taglio" style="background-color: ${coloreSfondoFoto(prodotto.inquadratura)};">${htmlFotoProdotto(prodotto)}</div>`;
  }
  const lettere = prodotto ? prodotto.nome.slice(0, 2).toUpperCase() : "?";
  return `<div class="${classeDimensione} shrink-0 bg-[#E3F2F4] text-[#4E9EAF] font-bold text-xs flex items-center justify-center foto-prodotto-taglio">${pulisciTesto(lettere)}</div>`;
}

// 3. MAGAZZINO DEMO
function generaMagazzinoDemo(sport, atleti) {
  const oggi = oggiIso();

  const prodotti = [
    {
      id: "prod-1", nome: "Kit gara home", categoria: "Kit gara", prezzo: 45,
      descrizione: "Maglia, pantaloncini e calzettoni ufficiali.", foto: "", scortaMinima: 2,
      taglie: [
        { taglia: "8A", quantita: 4 }, { taglia: "10A", quantita: 5 }, { taglia: "12A", quantita: 5 },
        { taglia: "14A", quantita: 3 }, { taglia: "S", quantita: 4 }, { taglia: "M", quantita: 6 },
        { taglia: "L", quantita: 4 }, { taglia: "XL", quantita: 1 },
      ],
    },
    {
      id: "prod-2", nome: "Tuta di rappresentanza", categoria: "Rappresentanza", prezzo: 60,
      descrizione: "Giacca e pantalone con logo ricamato.", foto: "", scortaMinima: 2,
      taglie: [
        { taglia: "10A", quantita: 2 }, { taglia: "12A", quantita: 3 }, { taglia: "S", quantita: 3 },
        { taglia: "M", quantita: 4 }, { taglia: "L", quantita: 2 },
      ],
    },
    {
      id: "prod-3", nome: "Borsone società", categoria: "Accessori", prezzo: 30,
      descrizione: "Borsone con scomparto scarpe.", foto: "", scortaMinima: 3,
      taglie: [{ taglia: "Unica", quantita: 12 }],
    },
    {
      id: "prod-4", nome: palloniPerSport[sport] || "Attrezzo da allenamento", categoria: "Attrezzatura", prezzo: 22,
      descrizione: "Per l'allenamento a casa.", foto: "", scortaMinima: 2,
      taglie: [{ taglia: "Unica", quantita: 8 }],
    },
    {
      id: "prod-5", nome: "Sciarpa della società", categoria: "Merchandising", prezzo: 15,
      descrizione: "Per tifosi e famiglie.", foto: "", scortaMinima: 5,
      taglie: [{ taglia: "Unica", quantita: 20 }],
    },
  ];

  const prenotazioni = [];

  // Qualche prenotazione di esempio per i primi atleti
  atleti.slice(0, 3).forEach(function (atleta, indice) {
    const kit = prodotti[0];
    const tagliaKit = kit.taglie.some(function (t) { return t.taglia === atleta.taglie.maglia; }) ? atleta.taglie.maglia : "M";

    prenotazioni.push({
      id: `pren-${indice}`,
      prodottoId: indice === 2 ? "prod-3" : "prod-1",
      taglia: indice === 2 ? "Unica" : tagliaKit,
      quantita: 1,
      prezzoUnitario: indice === 2 ? 30 : 45,
      atletaId: atleta.id,
      intestatario: "",
      data: oggi,
      stato: "aperta",
      pagato: indice === 0,
      note: indice === 1 ? "Stampa nome e numero sulla maglia" : "",
    });
  });

  // Lo stock iniziale dei prodotti demo risulta come primo carico di merce
  const movimenti = [];
  prodotti.forEach(function (prodotto) {
    prodotto.taglie.forEach(function (voce) {
      movimenti.push({ id: creaId("mov"), data: oggi, prodottoId: prodotto.id, taglia: voce.taglia, quantita: voce.quantita, tipo: "carico", nota: "Fornitura di inizio stagione" });
    });
  });

  return { prodotti: prodotti, prenotazioni: prenotazioni, movimenti: movimenti };
}

// 4. RENDERING MAGAZZINO
function renderMagazzino() {
  renderStatisticheMagazzino();
  renderProdotti();
  renderPrenotazioni();
  renderMovimenti();
  mostraTabMagazzino(tabMagazzino);
}

function renderStatisticheMagazzino() {
  const magazzino = configurazioneAttiva.magazzino;
  let pezzi = 0;
  let valore = 0;
  let daIncassare = 0;

  magazzino.prodotti.forEach(function (prodotto) {
    pezzi += totaleDisponibili(prodotto);
    prodotto.taglie.forEach(function (voce) {
      valore += voce.quantita * prodotto.prezzo;
    });
  });

  magazzino.prenotazioni.forEach(function (pren) {
    if (pren.stato !== "annullata" && !pren.pagato) {
      daIncassare += pren.quantita * pren.prezzoUnitario;
    }
  });

  const aperte = contaPrenotazioniAperte();

  document.getElementById("mag-stat-pezzi").textContent = pezzi;
  document.getElementById("mag-stat-valore").textContent = formattaEuro(valore);
  document.getElementById("mag-stat-aperte").textContent = aperte;
  document.getElementById("mag-stat-incassare").textContent = formattaEuro(daIncassare);
  document.getElementById("badge-prenotazioni").textContent = aperte > 0 ? `(${aperte})` : "";
}

function popolaFiltroCategorieProdotto() {
  const select = document.getElementById("filtro-categoria-prodotto");
  const valoreAttuale = select.value;

  select.innerHTML = `<option value="">Tutte le categorie</option>`;
  categorieProdotto.forEach(function (cat) {
    select.innerHTML += `<option value="${cat}">${cat}</option>`;
  });
  select.value = valoreAttuale;

  const selectModulo = document.getElementById("prod-categoria");
  selectModulo.innerHTML = "";
  categorieProdotto.forEach(function (cat) {
    selectModulo.innerHTML += `<option value="${cat}">${cat}</option>`;
  });
}

function renderProdotti() {
  const contenitore = document.getElementById("prodotti-grid");
  const testoRicerca = document.getElementById("cerca-prodotto").value.trim().toLowerCase();
  const categoria = document.getElementById("filtro-categoria-prodotto").value;
  let htmlAccumulato = "";

  const prodotti = configurazioneAttiva.magazzino.prodotti.filter(function (prodotto) {
    if (categoria && prodotto.categoria !== categoria) return false;
    return prodotto.nome.toLowerCase().indexOf(testoRicerca) !== -1;
  });

  prodotti.forEach(function (prodotto) {
    const disponibili = totaleDisponibili(prodotto);
    let taglieHtml = "";
    let prenotatiTotali = 0;

    prodotto.taglie.forEach(function (voce) {
      const liberi = pezziDisponibili(prodotto, voce.taglia);
      prenotatiTotali += pezziPrenotati(prodotto.id, voce.taglia);

      let classeTaglia = "";
      if (liberi === 0) classeTaglia = "chip-taglia--esaurita";
      else if (liberi <= prodotto.scortaMinima) classeTaglia = "chip-taglia--bassa";

      taglieHtml += `
        <span class="chip-taglia ${classeTaglia}" title="${liberi} disponibili">
          <span>${pulisciTesto(voce.taglia)}</span><strong>${liberi}</strong>
        </span>
      `;
    });

    let avviso = "";
    if (disponibili === 0) avviso = `<span class="avviso-prodotto avviso-prodotto--esaurito">Esaurito</span>`;
    else if (prodotto.taglie.some(function (v) { return pezziDisponibili(prodotto, v.taglia) <= prodotto.scortaMinima; })) {
      avviso = `<span class="avviso-prodotto">Scorta bassa</span>`;
    }

    htmlAccumulato += `
      <article class="card-prodotto border border-[#E7EBEC] rounded-sm bg-white shadow-xs flex flex-col overflow-hidden">
        <div class="relative aspect-[4/3] ${prodotto.foto ? "" : "bg-[#F2F4F4]"} flex items-center justify-center overflow-hidden border-b border-[#E7EBEC]" ${prodotto.foto ? `style="background-color: ${coloreSfondoFoto(prodotto.inquadratura)};"` : ""}>
          ${prodotto.foto
            ? htmlFotoProdotto(prodotto)
            : `<div class="segnaposto-prodotto">
                 <span class="font-bold text-4xl text-[#4E9EAF]">${pulisciTesto(prodotto.nome.slice(0, 2).toUpperCase())}</span>
                 <span class="font-mono text-[10px] uppercase text-[#7A8285]">Nessuna foto</span>
               </div>`}
          ${avviso}
        </div>

        <div class="p-4 flex flex-col gap-3 flex-1">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-mono text-[10px] text-[#4E9EAF] font-bold uppercase tracking-widest">${pulisciTesto(prodotto.categoria)}</p>
              <h4 class="font-bold text-[#12181B] leading-tight">${pulisciTesto(prodotto.nome)}</h4>
            </div>
            <p class="font-mono font-bold text-lg text-[#12181B] shrink-0">${formattaEuro(prodotto.prezzo)}</p>
          </div>
          ${prodotto.descrizione ? `<p class="text-xs text-[#7A8285]">${pulisciTesto(prodotto.descrizione)}</p>` : ""}

          <div>
            <p class="font-mono text-[10px] text-[#7A8285] uppercase mb-1.5">Disponibili per taglia</p>
            <div class="flex flex-wrap gap-1.5">${taglieHtml}</div>
          </div>

          <p class="text-[11px] text-[#7A8285] mt-auto">${disponibili} liberi • ${prenotatiTotali} prenotati</p>

          <div class="flex gap-2">
            <button type="button" data-prenota-prodotto="${prodotto.id}" class="btn-dsd-primary text-xs py-2 px-4 flex-1" ${disponibili === 0 ? "disabled" : ""}>Prenota</button>
            <button type="button" data-modifica-prodotto="${prodotto.id}" class="btn-dsd-secondary text-xs py-2 px-4">Modifica</button>
          </div>
          <button type="button" data-carico-prodotto="${prodotto.id}" class="text-xs text-[#4E9EAF] font-bold hover:underline cursor-pointer self-start">+ Carico merce</button>
        </div>
      </article>
    `;
  });

  if (prodotti.length === 0) {
    const vuoto = configurazioneAttiva.magazzino.prodotti.length === 0;
    htmlAccumulato = `
      <div class="sm:col-span-2 lg:col-span-3 border border-dashed border-[#CFD5D6] rounded-md bg-white p-8 text-center">
        <p class="font-bold text-[#12181B] mb-1">${vuoto ? "Il magazzino è vuoto" : "Nessun prodotto trovato"}</p>
        <p class="text-sm text-[#7A8285]">${vuoto ? "Usa \"+ Nuovo Prodotto\" per inserire kit, tute e materiale." : "Prova a cambiare la ricerca o la categoria."}</p>
      </div>
    `;
  }

  contenitore.innerHTML = htmlAccumulato;

  contenitore.querySelectorAll("[data-prenota-prodotto]").forEach(function (bottone) {
    bottone.onclick = function () {
      apriModalPrenotazione(bottone.getAttribute("data-prenota-prodotto"), null);
    };
  });
  contenitore.querySelectorAll("[data-carico-prodotto]").forEach(function (bottone) {
    bottone.onclick = function () {
      apriModalCarico(bottone.getAttribute("data-carico-prodotto"));
    };
  });
  contenitore.querySelectorAll("[data-modifica-prodotto]").forEach(function (bottone) {
    bottone.onclick = function () {
      apriModalProdotto(bottone.getAttribute("data-modifica-prodotto"));
    };
  });
}

function renderPrenotazioni() {
  const contenitore = document.getElementById("prenotazioni-list");
  let htmlAccumulato = "";

  // Le più recenti in alto
  const prenotazioni = configurazioneAttiva.magazzino.prenotazioni.filter(function (pren) {
    return filtroStatoPrenotazioni === "tutte" || pren.stato === filtroStatoPrenotazioni;
  }).slice().reverse();

  prenotazioni.forEach(function (pren) {
    const prodotto = trovaProdotto(pren.prodottoId);
    const totale = pren.quantita * pren.prezzoUnitario;

    let azioni = "";
    if (pren.stato === "aperta") {
      azioni = `
        <button type="button" data-azione="consegna" data-id="${pren.id}" class="btn-dsd-primary text-[11px] py-1.5 px-3">Consegna</button>
        <button type="button" data-azione="modifica" data-id="${pren.id}" class="text-[11px] text-[#4E9EAF] font-bold hover:underline cursor-pointer">Modifica</button>
        <button type="button" data-azione="annulla" data-id="${pren.id}" class="text-[11px] text-[#7A8285] hover:text-[#C94141] underline cursor-pointer">Annulla</button>
      `;
    }
    if (pren.stato === "consegnata") {
      azioni = `
        <button type="button" data-azione="annulla-consegna" data-id="${pren.id}" class="text-[11px] text-[#7A8285] hover:text-[#C94141] underline cursor-pointer" title="I pezzi tornano in magazzino">Annulla consegna</button>
      `;
    }

    let pagamento = "";
    if (pren.stato !== "annullata") {
      pagamento = pren.pagato
        ? `<button type="button" data-azione="pagato" data-id="${pren.id}" class="etichetta-pagamento etichetta-pagamento--ok" title="Clic per segnare come da pagare">Pagato ✓</button>`
        : `<button type="button" data-azione="pagato" data-id="${pren.id}" class="etichetta-pagamento" title="Clic per segnare come pagato">Da pagare</button>`;
    }

    const nomePersona = pulisciTesto(nomeIntestatario(pren));
    const persona = pren.atletaId && trovaAtleta(pren.atletaId)
      ? `<button type="button" data-apri-atleta="${pren.atletaId}" class="underline hover:text-[#4E9EAF] cursor-pointer">${nomePersona}</button>`
      : nomePersona;

    htmlAccumulato += `
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 py-3 bg-white ${pren.stato === "annullata" ? "opacity-60" : ""}">
        <div class="flex items-center gap-3 min-w-0">
          ${htmlMiniaturaProdotto(prodotto, "w-12 h-12")}
          <div class="min-w-0">
            <p class="text-sm font-bold text-[#12181B] truncate">${prodotto ? pulisciTesto(prodotto.nome) : "Prodotto eliminato"} <span class="font-normal text-[#7A8285]">• Taglia ${pulisciTesto(pren.taglia)} × ${pren.quantita}</span></p>
            <p class="text-xs text-[#7A8285]">Per ${persona} • ${formattaData(pren.data)}${pren.dataConsegna && pren.stato === "consegnata" ? ` • consegnata il ${formattaData(pren.dataConsegna)}` : ""}</p>
            ${pren.note ? `<p class="text-[11px] text-[#7A8285] italic">${pulisciTesto(pren.note)}</p>` : ""}
          </div>
        </div>
        <div class="flex items-center gap-3 flex-wrap md:justify-end shrink-0">
          <span class="etichetta-stato etichetta-stato--${pren.stato}">${pren.stato === "aperta" ? "Prenotata" : etichettaStatoPrenotazione(pren)}</span>
          <span class="font-mono text-sm font-bold w-20 text-right">${formattaEuro(totale)}</span>
          ${pagamento}
          ${azioni}
        </div>
      </div>
    `;
  });

  if (prenotazioni.length === 0) {
    htmlAccumulato = `<p class="px-4 py-6 text-sm text-[#7A8285] text-center">Nessuna prenotazione in questo elenco.</p>`;
  }

  contenitore.innerHTML = htmlAccumulato;

  contenitore.querySelectorAll("[data-azione]").forEach(function (bottone) {
    bottone.onclick = function () {
      gestisciAzionePrenotazione(bottone.getAttribute("data-azione"), bottone.getAttribute("data-id"));
    };
  });
  collegaAperturaSchede(contenitore);

  // Evidenzia il filtro attivo
  document.querySelectorAll("[data-filtro-stato]").forEach(function (bottone) {
    bottone.classList.toggle("filtro-stato--attivo", bottone.getAttribute("data-filtro-stato") === filtroStatoPrenotazioni);
  });
}

// Storico dei movimenti, dal più recente
function renderMovimenti() {
  const contenitore = document.getElementById("movimenti-list");
  const movimenti = configurazioneAttiva.magazzino.movimenti.slice().reverse();
  let htmlAccumulato = "";

  movimenti.forEach(function (movimento) {
    const prodotto = trovaProdotto(movimento.prodottoId);
    const entra = movimento.quantita > 0;

    htmlAccumulato += `
      <div class="flex items-center justify-between gap-3 px-4 py-3 bg-white">
        <div class="flex items-center gap-3 min-w-0">
          <span class="movimento-segno ${entra ? "movimento-segno--entra" : "movimento-segno--esce"}">${entra ? "+" : "−"}${Math.abs(movimento.quantita)}</span>
          <div class="min-w-0">
            <p class="text-sm font-bold text-[#12181B] truncate">${prodotto ? pulisciTesto(prodotto.nome) : "Prodotto eliminato"} <span class="font-normal text-[#7A8285]">• Taglia ${pulisciTesto(movimento.taglia)}</span></p>
            <p class="text-xs text-[#7A8285]">${etichettaMovimento(movimento.tipo)}${movimento.nota ? " • " + pulisciTesto(movimento.nota) : ""}</p>
          </div>
        </div>
        <span class="font-mono text-xs text-[#7A8285] shrink-0">${formattaData(movimento.data)}</span>
      </div>
    `;
  });

  if (movimenti.length === 0) {
    htmlAccumulato = `<p class="px-4 py-6 text-sm text-[#7A8285] text-center">Nessun movimento registrato. Usa "+ Carico merce" quando arriva nuovo materiale.</p>`;
  }

  contenitore.innerHTML = htmlAccumulato;
}

function mostraTabMagazzino(nomeTab) {
  tabMagazzino = nomeTab;
  document.getElementById("tab-prodotti").classList.toggle("hidden", nomeTab !== "prodotti");
  document.getElementById("tab-prenotazioni").classList.toggle("hidden", nomeTab !== "prenotazioni");
  document.getElementById("tab-movimenti").classList.toggle("hidden", nomeTab !== "movimenti");

  document.querySelectorAll(".tab-magazzino").forEach(function (bottone) {
    bottone.classList.toggle("tab-magazzino--attiva", bottone.getAttribute("data-tab-magazzino") === nomeTab);
  });
}

// 5. AZIONI SULLE PRENOTAZIONI
function trovaPrenotazione(id) {
  return configurazioneAttiva.magazzino.prenotazioni.find(function (p) {
    return p.id === id;
  });
}

// Cambia la quantità di una taglia in magazzino (anche in negativo) senza scendere sotto zero
function cambiaPezzi(prodottoId, taglia, differenza) {
  const prodotto = trovaProdotto(prodottoId);
  if (!prodotto) return;
  const voce = prodotto.taglie.find(function (t) { return t.taglia === taglia; });
  if (voce) voce.quantita = Math.max(0, voce.quantita + differenza);
}

function gestisciAzionePrenotazione(azione, id) {
  const pren = trovaPrenotazione(id);
  if (!pren) return;

  if (azione === "pagato") {
    pren.pagato = !pren.pagato;
  }

  if (azione === "modifica") {
    apriModalPrenotazione(pren.prodottoId, pren.atletaId, pren.id);
    return;
  }

  if (azione === "consegna") {
    // Alla consegna i pezzi escono davvero dal magazzino
    cambiaPezzi(pren.prodottoId, pren.taglia, -pren.quantita);
    registraMovimento(pren.prodottoId, pren.taglia, -pren.quantita, "consegna", nomeIntestatario(pren));
    pren.stato = "consegnata";
    pren.dataConsegna = oggiIso();
    mostraAvviso(`Consegnato a ${nomeIntestatario(pren)}.`, "ok");
  }

  if (azione === "annulla-consegna") {
    chiediConferma({
      titolo: "Annullare la consegna?",
      testo: `I pezzi tornano in magazzino e la prenotazione di ${nomeIntestatario(pren)} torna aperta.`,
      conferma: "Annulla consegna",
    }, function () {
      cambiaPezzi(pren.prodottoId, pren.taglia, pren.quantita);
      registraMovimento(pren.prodottoId, pren.taglia, pren.quantita, "reso", nomeIntestatario(pren));
      pren.stato = "aperta";
      pren.dataConsegna = "";
      salvaConfigurazione();
      aggiornaTutto();
    });
    return;
  }

  if (azione === "annulla") {
    chiediConferma({
      titolo: "Annullare la prenotazione?",
      testo: `La prenotazione di ${nomeIntestatario(pren)} verrà annullata e i pezzi tornano disponibili.`,
      conferma: "Annulla prenotazione",
      pericolo: true,
    }, function () {
      pren.stato = "annullata";
      salvaConfigurazione();
      aggiornaTutto();
    });
    return;
  }

  salvaConfigurazione();
  aggiornaTutto();
}

// 6. MODULO PRODOTTO
function apriModalProdotto(id) {
  const prodotto = id ? trovaProdotto(id) : null;
  prodottoInModifica = prodotto ? prodotto.id : null;
  fotoProdottoInModifica = prodotto ? prodotto.foto : "";
  inquadraturaInModifica = limitaInquadratura(prodotto && prodotto.inquadratura ? prodotto.inquadratura : inquadraturaIniziale());

  document.getElementById("modal-prodotto-titolo").textContent = prodotto ? "Modifica Prodotto" : "Nuovo Prodotto";
  document.getElementById("btn-elimina-prodotto").classList.toggle("hidden", !prodotto);

  document.getElementById("prod-nome").value = prodotto ? prodotto.nome : "";
  document.getElementById("prod-categoria").value = prodotto ? prodotto.categoria : categorieProdotto[0];
  document.getElementById("prod-prezzo").value = prodotto ? prodotto.prezzo : "";
  document.getElementById("prod-descrizione").value = prodotto ? prodotto.descrizione : "";
  document.getElementById("prod-scorta-minima").value = prodotto ? prodotto.scortaMinima : 2;

  const taglie = prodotto ? prodotto.taglie : [];
  renderRigheTaglie(taglie.length > 0 ? taglie : presetTaglie.adulto.map(function (t) { return { taglia: t, quantita: 0 }; }));
  renderAnteprimaFotoProdotto();

  // Foto caricate prima di questa versione: calcoliamo ora il colore dei bordi
  if (fotoProdottoInModifica && !inquadraturaInModifica.sfondo) {
    calcolaColoreBordi(fotoProdottoInModifica, function (colore) {
      inquadraturaInModifica.sfondo = colore;
      renderAnteprimaFotoProdotto();
    });
  }

  document.getElementById("modal-prodotto").classList.remove("hidden");
  document.getElementById("prod-nome").focus();
}

function chiudiModalProdotto() {
  document.getElementById("modal-prodotto").classList.add("hidden");
  prodottoInModifica = null;
  fotoProdottoInModifica = "";
}

function renderAnteprimaFotoProdotto() {
  const anteprima = document.getElementById("prod-anteprima-foto");
  anteprima.style.backgroundColor = fotoProdottoInModifica ? coloreSfondoFoto(inquadraturaInModifica) : "";
  anteprima.innerHTML = fotoProdottoInModifica
    ? `<img src="${fotoProdottoInModifica}" alt="Anteprima" class="w-full h-full object-contain" style="${stileInquadratura(inquadraturaInModifica)}" />`
    : `<span class="font-mono text-[10px] uppercase text-[#7A8285] text-center px-2">Nessuna foto</span>`;

  // Zoom e frecce compaiono solo quando c'è una foto
  document.getElementById("prod-rimuovi-foto").classList.toggle("hidden", !fotoProdottoInModifica);
  document.getElementById("prod-controlli-foto").classList.toggle("hidden", !fotoProdottoInModifica);
  document.getElementById("prod-zoom").value = inquadraturaInModifica.zoom;
  aggiornaFrecceFoto("[data-sposta-foto]:not([data-sposta-foto=centro])", inquadraturaInModifica);
}

// Frecce: spostano la foto dentro la cornice; il pallino al centro la rimette com'era
function spostaFotoProdotto(direzione) {
  inquadraturaInModifica = spostaInquadratura(inquadraturaInModifica, direzione);
  renderAnteprimaFotoProdotto();
}

function renderRigheTaglie(taglie) {
  const lista = document.getElementById("prod-taglie-list");
  lista.innerHTML = "";
  taglie.forEach(function (voce) {
    lista.appendChild(creaRigaTaglia(voce.taglia, voce.quantita));
  });
}

function creaRigaTaglia(taglia, quantita) {
  const riga = document.createElement("div");
  riga.className = "riga-taglia flex items-center gap-2";
  riga.innerHTML = `
    <input type="text" value="${pulisciTesto(taglia)}" placeholder="Taglia" class="taglia-nome input-dsd w-28 py-1.5" />
    <input type="number" value="${quantita}" min="0" class="taglia-quantita input-dsd w-24 py-1.5" />
    <span class="text-xs text-[#7A8285]">pezzi</span>
    <button type="button" class="btn-rimuovi-taglia ml-auto text-[#7A8285] hover:text-[#C94141] font-bold text-xs px-2 py-1 cursor-pointer" title="Rimuovi taglia">✕</button>
  `;
  riga.querySelector(".btn-rimuovi-taglia").onclick = function () {
    riga.remove();
  };
  return riga;
}

// Legge le taglie scritte nel modulo
function leggiTaglieDalModulo() {
  const taglie = [];
  document.querySelectorAll("#prod-taglie-list .riga-taglia").forEach(function (riga) {
    const taglia = riga.querySelector(".taglia-nome").value.trim();
    const quantita = Math.max(0, parseInt(riga.querySelector(".taglia-quantita").value, 10) || 0);
    if (taglia !== "") taglie.push({ taglia: taglia, quantita: quantita });
  });
  return taglie;
}

function applicaPresetTaglie(nomePreset) {
  // Le quantità già scritte per le stesse taglie vengono mantenute
  const attuali = leggiTaglieDalModulo();
  const nuove = presetTaglie[nomePreset].map(function (taglia) {
    const esistente = attuali.find(function (v) { return v.taglia === taglia; });
    return { taglia: taglia, quantita: esistente ? esistente.quantita : 0 };
  });
  renderRigheTaglie(nuove);
}

function salvaProdottoDalModulo() {
  const nome = document.getElementById("prod-nome").value.trim();
  const prezzo = parseFloat(String(document.getElementById("prod-prezzo").value).replace(",", "."));
  const taglie = leggiTaglieDalModulo();

  if (nome === "" || isNaN(prezzo) || prezzo < 0) {
    mostraAvviso("Inserisci almeno il nome del prodotto e un prezzo valido.", "errore");
    return;
  }
  if (taglie.length === 0) {
    mostraAvviso("Aggiungi almeno una taglia (anche \"Unica\").", "errore");
    return;
  }

  let prodotto = prodottoInModifica ? trovaProdotto(prodottoInModifica) : null;
  const nuovo = !prodotto;
  if (nuovo) prodotto = { id: creaId("prod") };

  prodotto.nome = nome;
  prodotto.categoria = document.getElementById("prod-categoria").value;
  prodotto.prezzo = prezzo;
  prodotto.descrizione = document.getElementById("prod-descrizione").value.trim();
  prodotto.scortaMinima = Math.max(0, parseInt(document.getElementById("prod-scorta-minima").value, 10) || 0);
  prodotto.foto = fotoProdottoInModifica;
  prodotto.inquadratura = inquadraturaInModifica;

  // Movimenti: per un prodotto nuovo è il primo carico; per uno esistente,
  // se le quantità sono state cambiate a mano, registriamo la correzione
  taglie.forEach(function (voce) {
    const prima = nuovo ? null : (prodotto.taglie || []).find(function (t) { return t.taglia === voce.taglia; });
    const differenza = voce.quantita - (prima ? prima.quantita : 0);
    if (nuovo) registraMovimento(prodotto.id, voce.taglia, differenza, "carico", "Prodotto inserito");
    else registraMovimento(prodotto.id, voce.taglia, differenza, "rettifica", "Modifica del prodotto");
  });
  prodotto.taglie = taglie;

  if (nuovo) configurazioneAttiva.magazzino.prodotti.push(prodotto);

  if (!salvaConfigurazione()) return;
  chiudiModalProdotto();
  aggiornaTutto();
  mostraAvviso(nuovo ? `"${nome}" aggiunto al magazzino.` : "Prodotto aggiornato.", "ok");
}

function eliminaProdotto() {
  const prodotto = trovaProdotto(prodottoInModifica);
  if (!prodotto) return;

  const aperte = configurazioneAttiva.magazzino.prenotazioni.filter(function (p) {
    return p.prodottoId === prodotto.id && p.stato === "aperta";
  }).length;

  chiediConferma({
    titolo: `Eliminare "${prodotto.nome}"?`,
    testo: aperte > 0
      ? `Attenzione: ci sono ${aperte} prenotazioni aperte per questo prodotto, verranno annullate.`
      : "Il prodotto verrà tolto dal magazzino.",
    conferma: "Elimina prodotto",
    pericolo: true,
  }, function () {
    configurazioneAttiva.magazzino.prenotazioni.forEach(function (p) {
      if (p.prodottoId === prodotto.id && p.stato === "aperta") p.stato = "annullata";
    });
    configurazioneAttiva.magazzino.prodotti = configurazioneAttiva.magazzino.prodotti.filter(function (p) {
      return p.id !== prodotto.id;
    });

    salvaConfigurazione();
    chiudiModalProdotto();
    aggiornaTutto();
  });
}

// 7. MODULO PRENOTAZIONE
// prenotazioneId: se presente, il modulo si apre in modifica di quella prenotazione
function apriModalPrenotazione(prodottoId, atletaId, prenotazioneId) {
  const prodotti = configurazioneAttiva.magazzino.prodotti;
  if (prodotti.length === 0) {
    mostraAvviso("Il magazzino è vuoto: aggiungi prima un prodotto.", "errore");
    return;
  }

  const pren = prenotazioneId ? trovaPrenotazione(prenotazioneId) : null;
  prenotazioneInModifica = pren ? pren.id : null;
  document.getElementById("pren-titolo").textContent = pren ? "Modifica Prenotazione" : "Nuova Prenotazione";
  document.getElementById("btn-salva-prenotazione").textContent = pren ? "Salva Modifiche" : "Conferma Prenotazione";

  // Elenco prodotti
  const selectProdotto = document.getElementById("pren-prodotto");
  selectProdotto.innerHTML = "";
  prodotti.forEach(function (prodotto) {
    const liberi = totaleDisponibili(prodotto);
    selectProdotto.innerHTML += `<option value="${prodotto.id}" ${liberi === 0 ? "disabled" : ""}>${pulisciTesto(prodotto.nome)} — ${formattaEuro(prodotto.prezzo)}${liberi === 0 ? " (esaurito)" : ""}</option>`;
  });

  const primoDisponibile = prodotti.find(function (p) { return totaleDisponibili(p) > 0; });
  selectProdotto.value = prodottoId || (primoDisponibile ? primoDisponibile.id : prodotti[0].id);

  // Elenco atleti in ordine alfabetico, più "altra persona"
  const selectAtleta = document.getElementById("pren-atleta");
  const atleti = configurazioneAttiva.atleti.slice().sort(function (a, b) {
    return `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`, "it");
  });

  selectAtleta.innerHTML = `<option value="">Scegli un atleta…</option>`;
  atleti.forEach(function (atleta) {
    selectAtleta.innerHTML += `<option value="${atleta.id}">${pulisciTesto(atleta.cognome)} ${pulisciTesto(atleta.nome)} — ${pulisciTesto(atleta.categoria)}</option>`;
  });
  selectAtleta.innerHTML += `<option value="altro">Altra persona (staff, genitore…)</option>`;
  selectAtleta.value = atletaId || (pren && pren.intestatario ? "altro" : "");

  document.getElementById("pren-altro-nome").value = pren ? pren.intestatario : "";
  document.getElementById("pren-quantita").value = pren ? pren.quantita : 1;
  document.getElementById("pren-note").value = pren ? pren.note : "";
  document.getElementById("pren-pagato").checked = pren ? pren.pagato : false;

  // In modifica teniamo la taglia già scelta; per una nuova prenotazione la suggeriamo
  if (pren) {
    document.getElementById("pren-taglia").innerHTML = `<option value="${pulisciTesto(pren.taglia)}">${pulisciTesto(pren.taglia)}</option>`;
    document.getElementById("pren-taglia").value = pren.taglia;
  }
  aggiornaModuloPrenotazione(!pren);
  document.getElementById("modal-prenotazione").classList.remove("hidden");
}

function chiudiModalPrenotazione() {
  document.getElementById("modal-prenotazione").classList.add("hidden");
  prenotazioneInModifica = null;
}

// Pezzi liberi per il modulo: se stiamo modificando una prenotazione,
// i suoi pezzi contano come liberi (li sta già "tenendo" lei)
function pezziLiberiPerModulo(prodotto, taglia) {
  let liberi = pezziDisponibili(prodotto, taglia);
  const pren = prenotazioneInModifica ? trovaPrenotazione(prenotazioneInModifica) : null;
  if (pren && pren.prodottoId === prodotto.id && pren.taglia === taglia) liberi += pren.quantita;
  return liberi;
}

// Aggiorna taglie disponibili e totale quando cambia prodotto, atleta o quantità
function aggiornaModuloPrenotazione(suggerisciTaglia) {
  const prodotto = trovaProdotto(document.getElementById("pren-prodotto").value);
  const atletaId = document.getElementById("pren-atleta").value;
  const selectTaglia = document.getElementById("pren-taglia");
  const tagliaPrecedente = selectTaglia.value;

  document.getElementById("pren-altro-box").classList.toggle("hidden", atletaId !== "altro");

  if (!prodotto) return;

  selectTaglia.innerHTML = "";
  prodotto.taglie.forEach(function (voce) {
    const liberi = pezziLiberiPerModulo(prodotto, voce.taglia);
    selectTaglia.innerHTML += `<option value="${pulisciTesto(voce.taglia)}" ${liberi === 0 ? "disabled" : ""}>${pulisciTesto(voce.taglia)} — ${liberi} disponibili</option>`;
  });

  // Proviamo a scegliere la taglia giusta dalla scheda dell'atleta
  let tagliaScelta = tagliaPrecedente;
  const atleta = atletaId && atletaId !== "altro" ? trovaAtleta(atletaId) : null;

  if (suggerisciTaglia && atleta) {
    const tagliePossibili = [atleta.taglie.maglia, atleta.taglie.pantaloncini, atleta.taglie.scarpe];
    for (let i = 0; i < tagliePossibili.length; i++) {
      if (tagliePossibili[i] && pezziLiberiPerModulo(prodotto, tagliePossibili[i]) > 0) {
        tagliaScelta = tagliePossibili[i];
        break;
      }
    }
  }

  if (!tagliaScelta || pezziLiberiPerModulo(prodotto, tagliaScelta) === 0) {
    const primaLibera = prodotto.taglie.find(function (v) { return pezziLiberiPerModulo(prodotto, v.taglia) > 0; });
    tagliaScelta = primaLibera ? primaLibera.taglia : "";
  }
  selectTaglia.value = tagliaScelta;

  // Quantità massima = pezzi liberi della taglia scelta
  const campoQuantita = document.getElementById("pren-quantita");
  const massimo = tagliaScelta ? pezziLiberiPerModulo(prodotto, tagliaScelta) : 0;
  campoQuantita.max = massimo;

  const quantita = Math.max(1, parseInt(campoQuantita.value, 10) || 1);
  document.getElementById("pren-totale").textContent = formattaEuro(quantita * prodotto.prezzo);
}

function salvaPrenotazioneDalModulo() {
  const prodotto = trovaProdotto(document.getElementById("pren-prodotto").value);
  const atletaId = document.getElementById("pren-atleta").value;
  const nomeAltro = document.getElementById("pren-altro-nome").value.trim();
  const taglia = document.getElementById("pren-taglia").value;
  const quantita = parseInt(document.getElementById("pren-quantita").value, 10) || 0;

  if (!prodotto || !taglia) {
    mostraAvviso("Scegli un prodotto e una taglia disponibile.", "errore");
    return;
  }
  if (atletaId === "" || (atletaId === "altro" && nomeAltro === "")) {
    mostraAvviso("Indica per chi è la prenotazione.", "errore");
    return;
  }

  const liberi = pezziLiberiPerModulo(prodotto, taglia);
  if (quantita < 1 || quantita > liberi) {
    mostraAvviso(`Quantità non valida: per la taglia ${taglia} ci sono ${liberi} pezzi disponibili.`, "errore");
    return;
  }

  const dati = {
    prodottoId: prodotto.id,
    taglia: taglia,
    quantita: quantita,
    atletaId: atletaId === "altro" ? "" : atletaId,
    intestatario: atletaId === "altro" ? nomeAltro : "",
    pagato: document.getElementById("pren-pagato").checked,
    note: document.getElementById("pren-note").value.trim(),
  };

  const pren = prenotazioneInModifica ? trovaPrenotazione(prenotazioneInModifica) : null;
  if (pren) {
    // Modifica: se cambia prodotto si aggiorna anche il prezzo
    if (pren.prodottoId !== prodotto.id) pren.prezzoUnitario = prodotto.prezzo;
    Object.assign(pren, dati);
  } else {
    dati.id = creaId("pren");
    dati.prezzoUnitario = prodotto.prezzo;
    dati.data = oggiIso();
    dati.stato = "aperta";
    configurazioneAttiva.magazzino.prenotazioni.push(dati);
  }

  if (!salvaConfigurazione()) return;
  chiudiModalPrenotazione();
  aggiornaTutto();
  mostraAvviso(pren ? "Prenotazione aggiornata." : "Prenotazione registrata.", "ok");
}

// 7-bis. CARICO MERCE
// Quando arriva nuovo materiale si aggiungono i pezzi a una taglia
// e il carico resta nello storico dei movimenti
function apriModalCarico(prodottoId) {
  const prodotti = configurazioneAttiva.magazzino.prodotti;
  if (prodotti.length === 0) {
    mostraAvviso("Il magazzino è vuoto: aggiungi prima un prodotto.", "errore");
    return;
  }

  const selectProdotto = document.getElementById("carico-prodotto");
  selectProdotto.innerHTML = prodotti.map(function (prodotto) {
    return `<option value="${prodotto.id}">${pulisciTesto(prodotto.nome)}</option>`;
  }).join("");
  selectProdotto.value = prodottoId || prodotti[0].id;

  document.getElementById("carico-quantita").value = "";
  document.getElementById("carico-nota").value = "";
  aggiornaTaglieCarico();
  apriFinestra(document.getElementById("finestra-carico"));
}

function aggiornaTaglieCarico() {
  const prodotto = trovaProdotto(document.getElementById("carico-prodotto").value);
  document.getElementById("carico-taglia").innerHTML = prodotto.taglie.map(function (voce) {
    return `<option value="${pulisciTesto(voce.taglia)}">${pulisciTesto(voce.taglia)} — ora ${voce.quantita} pezzi</option>`;
  }).join("");
}

function salvaCarico() {
  const prodotto = trovaProdotto(document.getElementById("carico-prodotto").value);
  const taglia = document.getElementById("carico-taglia").value;
  const quantita = parseInt(document.getElementById("carico-quantita").value, 10) || 0;
  const nota = document.getElementById("carico-nota").value.trim();

  if (quantita < 1) {
    mostraAvviso("Scrivi quanti pezzi sono arrivati.", "errore");
    return;
  }

  cambiaPezzi(prodotto.id, taglia, quantita);
  registraMovimento(prodotto.id, taglia, quantita, "carico", nota);

  if (!salvaConfigurazione()) return;
  chiudiFinestra(document.getElementById("finestra-carico"));
  aggiornaTutto();
  mostraAvviso(`Caricati ${quantita} pezzi di "${prodotto.nome}" (taglia ${taglia}).`, "ok");
}

// 8. AVVIO SEZIONE MAGAZZINO
function initMagazzino() {
  popolaFiltroCategorieProdotto();

  document.querySelectorAll(".tab-magazzino").forEach(function (bottone) {
    bottone.onclick = function () {
      mostraTabMagazzino(bottone.getAttribute("data-tab-magazzino"));
    };
  });

  document.querySelectorAll("[data-filtro-stato]").forEach(function (bottone) {
    bottone.onclick = function () {
      filtroStatoPrenotazioni = bottone.getAttribute("data-filtro-stato");
      renderPrenotazioni();
    };
  });

  document.getElementById("cerca-prodotto").oninput = renderProdotti;
  document.getElementById("filtro-categoria-prodotto").onchange = renderProdotti;

  // Modulo prodotto
  document.getElementById("btn-nuovo-prodotto").onclick = function () {
    apriModalProdotto(null);
  };
  document.getElementById("btn-chiudi-prodotto").onclick = chiudiModalProdotto;
  document.getElementById("btn-salva-prodotto").onclick = salvaProdottoDalModulo;
  document.getElementById("btn-elimina-prodotto").onclick = eliminaProdotto;
  document.getElementById("prod-aggiungi-taglia").onclick = function () {
    document.getElementById("prod-taglie-list").appendChild(creaRigaTaglia("", 0));
  };

  document.querySelectorAll("[data-preset-taglie]").forEach(function (bottone) {
    bottone.onclick = function () {
      applicaPresetTaglie(bottone.getAttribute("data-preset-taglie"));
    };
  });

  const inputFoto = document.getElementById("prod-input-foto");
  inputFoto.onchange = function () {
    // Foto un po' più grande, così resta nitida anche con lo zoom
    riduciFoto(inputFoto.files[0], 900, function (fotoRidotta) {
      calcolaColoreBordi(fotoRidotta, function (colore) {
        fotoProdottoInModifica = fotoRidotta;
        inquadraturaInModifica = inquadraturaIniziale();
        inquadraturaInModifica.sfondo = colore;
        renderAnteprimaFotoProdotto();
      });
    });
    inputFoto.value = "";
  };
  document.getElementById("prod-rimuovi-foto").onclick = function () {
    fotoProdottoInModifica = "";
    inquadraturaInModifica = { zoom: 1, x: 0, y: 0 };
    renderAnteprimaFotoProdotto();
  };

  // Inquadratura: zoom con il cursore, spostamento con le frecce
  document.getElementById("prod-zoom").oninput = function () {
    const nuovoZoom = Number(document.getElementById("prod-zoom").value);
    inquadraturaInModifica = cambiaZoomInquadratura(inquadraturaInModifica, nuovoZoom);
    renderAnteprimaFotoProdotto();
  };
  document.querySelectorAll("[data-sposta-foto]").forEach(function (bottone) {
    bottone.onclick = function () {
      spostaFotoProdotto(bottone.getAttribute("data-sposta-foto"));
    };
  });

  // Carico merce
  document.getElementById("btn-carico-merce").onclick = function () {
    apriModalCarico(null);
  };
  document.getElementById("carico-prodotto").onchange = aggiornaTaglieCarico;
  document.getElementById("carico-si").onclick = salvaCarico;
  document.getElementById("carico-no").onclick = function () {
    chiudiFinestra(document.getElementById("finestra-carico"));
  };

  // Modulo prenotazione
  document.getElementById("btn-chiudi-prenotazione").onclick = chiudiModalPrenotazione;
  document.getElementById("btn-salva-prenotazione").onclick = salvaPrenotazioneDalModulo;
  document.getElementById("pren-prodotto").onchange = function () {
    document.getElementById("pren-taglia").value = "";
    aggiornaModuloPrenotazione(true);
  };
  document.getElementById("pren-atleta").onchange = function () {
    aggiornaModuloPrenotazione(true);
  };
  document.getElementById("pren-taglia").onchange = function () {
    aggiornaModuloPrenotazione(false);
  };
  document.getElementById("pren-quantita").oninput = function () {
    aggiornaModuloPrenotazione(false);
  };
}
