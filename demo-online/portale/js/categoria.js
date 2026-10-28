/* ==================================================================
   D.S.D. — categoria.js (Portale v4)
   Pagina di una categoria: tutto quello che serve all'allenatore e
   alla segreteria su una squadra in una pagina sola (atleti, staff,
   documenti da sistemare, quote da incassare e materiale da consegnare).
   Si apre con un clic sulla categoria nella Panoramica.
   ================================================================== */

let categoriaAperta = null;

function apriPaginaCategoria(categoria) {
  categoriaAperta = categoria;
  renderPaginaCategoria();
  mostraSezione("categoria");
}

// Esempio: "annate 2014–2015" oppure "annata 2016"
function testoAnnate(atleti) {
  const annate = [];
  atleti.forEach(function (atleta) {
    const annata = annataAtleta(atleta);
    if (annata && annate.indexOf(annata) === -1) annate.push(annata);
  });
  annate.sort();

  if (annate.length === 0) return "";
  if (annate.length === 1) return `annata ${annate[0]}`;
  return `annate ${annate[0]}–${annate[annate.length - 1]}`;
}

function renderPaginaCategoria() {
  const contenitore = document.getElementById("pagina-categoria");
  const categoria = categoriaAperta;

  if (configurazioneAttiva.categorie.indexOf(categoria) === -1) {
    contenitore.innerHTML = `<p class="text-sm text-[#7A8285]">Categoria non trovata (forse è stata rinominata in Società).</p>`;
    return;
  }

  const atleti = configurazioneAttiva.atleti.filter(function (atleta) {
    return atleta.categoria === categoria;
  }).sort(function (a, b) {
    return `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`, "it");
  });
  const staff = allenatoriDiCategoria(categoria);

  // Documenti da sistemare di atleti e staff della categoria (dal più grave)
  const scadenze = raccogliScadenze("tutti").filter(function (voce) {
    return voce.stato !== "valido" && voce.categorie.indexOf(categoria) !== -1;
  });
  scadenze.sort(confrontaGravita);

  // Quote non saldate
  let daIncassare = 0;
  const quote = atleti.filter(function (atleta) {
    const stato = statoQuota(atleta);
    if (stato === "da-pagare" || stato === "parziale") {
      daIncassare += importoQuota(atleta) - versatoQuota(atleta);
      return true;
    }
    return false;
  });

  // Materiale prenotato e non ancora consegnato
  const idAtleti = atleti.map(function (atleta) { return atleta.id; });
  const materiale = configurazioneAttiva.magazzino.prenotazioni.filter(function (pren) {
    return pren.stato === "aperta" && idAtleti.indexOf(pren.atletaId) !== -1;
  });

  const certificati = atleti.filter(certificatoDaCambiare).length;

  // --- Presenze: media della squadra e chi manca più spesso
  const allenamenti = allenamentiCategoria(categoria);
  const conPercentuale = atleti.map(function (atleta) {
    return { atleta: atleta, presenze: presenzeAtleta(atleta) };
  }).filter(function (voce) {
    return voce.presenze.percentuale !== null;
  });
  let somma = 0;
  conPercentuale.forEach(function (voce) { somma += voce.presenze.percentuale; });
  const media = conPercentuale.length > 0 ? Math.round(somma / conPercentuale.length) : null;
  const mancanoDiPiu = conPercentuale.filter(function (voce) {
    return voce.presenze.percentuale < 100;
  }).sort(function (a, b) {
    return a.presenze.percentuale - b.presenze.percentuale;
  }).slice(0, 3);

  let presenzeHtml = "";
  if (allenamenti.length === 0) {
    presenzeHtml = `<p class="text-sm text-[#7A8285] py-2">Nessun allenamento registrato: l'appello lo fa l'allenatore dalla sua area.</p>`;
  } else {
    presenzeHtml = `
      <p class="font-mono text-2xl font-bold">${media === null ? "—" : media + "%"}</p>
      <p class="text-xs text-[#7A8285] mb-3">media della squadra su ${allenamenti.length} ${allenamenti.length === 1 ? "allenamento" : "allenamenti"}${testoOrari(categoria) ? " • " + pulisciTesto(testoOrari(categoria)) : ""}</p>
      ${mancanoDiPiu.map(function (voce) {
        return `
          <button type="button" data-apri-atleta="${voce.atleta.id}" class="flex items-center justify-between w-full text-left py-1.5 border-b border-[#E7EBEC] last:border-b-0 cursor-pointer hover:text-[#4E9EAF]">
            <span class="text-sm">${pulisciTesto(voce.atleta.cognome)} ${pulisciTesto(voce.atleta.nome)}</span>
            <span class="font-mono text-sm">${voce.presenze.percentuale}%</span>
          </button>
        `;
      }).join("")}
    `;
  }

  // --- Staff
  let staffHtml = "";
  staff.forEach(function (allenatore) {
    staffHtml += `
      <button type="button" data-apri-allenatore="${allenatore.id}" class="flex items-center gap-3 text-left w-full py-2 border-b border-[#E7EBEC] last:border-b-0 cursor-pointer hover:text-[#4E9EAF]">
        ${htmlAvatar(allenatore, "w-11 h-11")}
        <span class="min-w-0">
          <strong class="block text-sm">${pulisciTesto(allenatore.nome)} ${pulisciTesto(allenatore.cognome)}</strong>
          <small class="block text-xs text-[#7A8285]">${pulisciTesto([allenatore.ruolo || "Staff", allenatore.telefono].filter(function (d) { return d; }).join(" • "))}</small>
        </span>
      </button>
    `;
  });
  if (staffHtml === "") {
    staffHtml = `<p class="text-sm text-[#7A8285] py-2">Nessun allenatore o dirigente assegnato.</p>`;
  }

  // --- Atleti
  let atletiHtml = "";
  atleti.forEach(function (atleta) {
    const quota = statoQuota(atleta);
    atletiHtml += `
      <button type="button" data-apri-atleta="${atleta.id}" class="flex items-center justify-between gap-3 text-left w-full px-4 py-2.5 bg-white hover:bg-[#F2F4F4] cursor-pointer">
        <span class="flex items-center gap-3 min-w-0">
          ${htmlAvatar(atleta, "w-10 h-10")}
          <span class="min-w-0">
            <strong class="block text-sm text-[#12181B] truncate">${pulisciTesto(atleta.cognome)} ${pulisciTesto(atleta.nome)}</strong>
            <small class="block text-xs text-[#7A8285]">${annataAtleta(atleta) || "—"}${atleta.ruolo ? " • " + pulisciTesto(atleta.ruolo) : ""}</small>
          </span>
        </span>
        <span class="flex items-center gap-1.5 shrink-0">
          ${atleta.documenti.map(function (doc) {
            return `<span class="stato-pallino stato-pallino--${calcolaStatoDocumento(doc.scadenza).stato} w-2 h-2 rounded-full" title="${etichettaDocumento(doc.tipo)}"></span>`;
          }).join("")}
          ${quota !== "nessuna" ? `<span class="etichetta-quota etichetta-quota--${quota} ml-2">${etichettaStatoQuota(quota)}</span>` : ""}
        </span>
      </button>
    `;
  });
  if (atletiHtml === "") {
    atletiHtml = `<p class="px-4 py-6 text-sm text-[#7A8285] text-center">Nessun atleta in questa categoria.</p>`;
  }

  // --- Scadenze
  let scadenzeHtml = "";
  scadenze.forEach(function (voce) {
    scadenzeHtml += htmlRigaScadenza(voce);
  });
  if (scadenzeHtml === "") {
    scadenzeHtml = `<p class="px-4 py-6 text-sm text-[#7A8285] text-center">Tutti i documenti sono in regola.</p>`;
  }

  // --- Quote
  let quoteHtml = "";
  quote.forEach(function (atleta) {
    quoteHtml += `
      <button type="button" data-apri-atleta="${atleta.id}" class="flex items-center justify-between gap-3 w-full text-left py-2 border-b border-[#E7EBEC] last:border-b-0 cursor-pointer hover:text-[#4E9EAF]">
        <span class="text-sm">${pulisciTesto(atleta.cognome)} ${pulisciTesto(atleta.nome)}</span>
        <span class="font-mono text-sm font-bold text-[#C94141]">${formattaEuro(importoQuota(atleta) - versatoQuota(atleta))}</span>
      </button>
    `;
  });
  if (quoteHtml === "") quoteHtml = `<p class="text-sm text-[#7A8285] py-2">Tutte le quote sono saldate.</p>`;

  // --- Materiale
  let materialeHtml = "";
  materiale.forEach(function (pren) {
    const prodotto = trovaProdotto(pren.prodottoId);
    materialeHtml += `
      <div class="flex items-center justify-between gap-3 py-2 border-b border-[#E7EBEC] last:border-b-0">
        <span class="min-w-0">
          <strong class="block text-sm truncate">${prodotto ? pulisciTesto(prodotto.nome) : "Prodotto eliminato"}</strong>
          <small class="block text-xs text-[#7A8285]">${pulisciTesto(nomeIntestatario(pren))} • Taglia ${pulisciTesto(pren.taglia)} × ${pren.quantita}</small>
        </span>
        <span class="etichetta-stato etichetta-stato--aperta">${pren.pagato ? "Pagata" : "Da pagare"}</span>
      </div>
    `;
  });
  if (materialeHtml === "") materialeHtml = `<p class="text-sm text-[#7A8285] py-2">Niente da consegnare.</p>`;

  const sottotitolo = [`${atleti.length} ${atleti.length === 1 ? "atleta" : "atleti"}`, testoAnnate(atleti), `stagione ${configurazioneAttiva.stagione}`]
    .filter(function (parte) { return parte; }).join(" • ");

  contenitore.innerHTML = `
    <section class="border border-[#E7EBEC] rounded-sm p-6 sm:p-8 bg-white shadow-xs mb-6">
      <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <p class="font-mono text-xs text-[#4E9EAF] font-bold uppercase tracking-widest mb-1">Categoria</p>
          <h2 class="text-3xl sm:text-4xl font-bold text-[#12181B]">${pulisciTesto(categoria)}</h2>
          <p class="text-sm text-[#7A8285] mt-1">${pulisciTesto(sottotitolo)}</p>
        </div>
        <div class="flex flex-wrap gap-3">
          <button type="button" id="cat-roster" class="btn-dsd-secondary text-xs py-2 px-4">Apri nel roster</button>
          <button type="button" id="cat-esporta" class="btn-dsd-secondary text-xs py-2 px-4">Esporta elenco (Excel)</button>
          <button type="button" id="cat-nuovo-atleta" class="btn-dsd-primary text-xs py-2 px-4">+ Aggiungi atleta</button>
        </div>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
        <div class="box-numero"><span>Atleti</span><strong>${atleti.length}</strong></div>
        <div class="box-numero"><span>Documenti da sistemare</span><strong class="${scadenze.length > 0 ? "text-[#C94141]" : ""}">${scadenze.length}</strong></div>
        <div class="box-numero"><span>Quote da incassare</span><strong class="${daIncassare > 0 ? "text-[#C94141]" : ""}">${formattaEuro(daIncassare)}</strong></div>
        <div class="box-numero"><span>Materiale da consegnare</span><strong>${materiale.length}</strong></div>
      </div>
      ${certificati > 0 ? `<p class="text-xs text-[#A9750F] bg-[#F8ECD6] px-3 py-2 mt-4">${certificati} ${certificati === 1 ? "atleta ha" : "atleti hanno"} il certificato non agonistico ma in questa stagione ${certificati === 1 ? "compie" : "compiono"} ${configurazioneAttiva.etaAgonistica} anni: serve quello agonistico.</p>` : ""}
    </section>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-6">
        <section>
          <h3 class="text-lg font-bold text-[#12181B] mb-1">Documenti da Sistemare</h3>
          <p class="text-xs text-[#7A8285] mb-3">Dal più grave • con i pulsanti a destra mandi il promemoria su WhatsApp o via email</p>
          <div class="border border-[#E7EBEC] rounded-sm divide-y divide-[#E7EBEC] overflow-hidden bg-white shadow-xs">${scadenzeHtml}</div>
        </section>
        <section>
          <h3 class="text-lg font-bold text-[#12181B] mb-3">Atleti</h3>
          <div class="border border-[#E7EBEC] rounded-sm divide-y divide-[#E7EBEC] overflow-hidden bg-white shadow-xs">${atletiHtml}</div>
        </section>
      </div>

      <div class="space-y-6">
        <section class="pannello-scheda">
          <h3 class="titolo-pannello">Staff</h3>
          ${staffHtml}
          <button type="button" data-sezione="allenatori" class="text-xs text-[#4E9EAF] font-bold hover:underline cursor-pointer mt-3">Gestisci allenatori e dirigenti</button>
        </section>
        <section class="pannello-scheda">
          <h3 class="titolo-pannello">Allenamenti</h3>
          ${testoOrari(categoria) ? `<p class="text-sm text-[#12181B] mb-3">${pulisciTesto(testoOrari(categoria))}</p>` : ""}
          <p class="font-mono text-[10px] uppercase text-[#7A8285]">Questa settimana • ${testoSettimana(lunediDi(oggiIso()))}</p>
          ${htmlSettimana(categoria, lunediDi(oggiIso()), { mostraConflitti: true })}
          <p class="font-mono text-[10px] uppercase text-[#7A8285] mt-3">Prossima settimana • ${testoSettimana(aggiungiGiorni(lunediDi(oggiIso()), 7))}</p>
          ${htmlSettimana(categoria, aggiungiGiorni(lunediDi(oggiIso()), 7), { mostraConflitti: true })}
          <button type="button" id="cat-calendario" class="text-xs font-bold text-[#4E9EAF] hover:underline cursor-pointer mt-3">Scarica il calendario della categoria (.ics)</button>
        </section>
        <section class="pannello-scheda">
          <h3 class="titolo-pannello">Presenze</h3>
          ${presenzeHtml}
        </section>
        <section class="pannello-scheda">
          <h3 class="titolo-pannello">Quote da Incassare</h3>
          ${quoteHtml}
        </section>
        <section class="pannello-scheda">
          <h3 class="titolo-pannello">Materiale da Consegnare</h3>
          ${materialeHtml}
        </section>
      </div>
    </div>
  `;

  collegaAperturaSchede(contenitore);
  collegaAperturaAllenatori(contenitore);
  contenitore.querySelector("[data-sezione=allenatori]").onclick = function () {
    document.getElementById("filtro-categoria-staff").value = categoria;
    renderAllenatori();
    mostraSezione("allenatori");
  };

  // Il roster con i filtri della categoria (vale anche per l'esportazione)
  function filtraRosterSullaCategoria() {
    document.getElementById("filtro-categoria").value = categoria;
    document.getElementById("filtro-annata").value = "";
    document.getElementById("filtro-problema").value = "";
    document.getElementById("cerca-atleta").value = "";
    renderAtleti();
  }

  document.getElementById("cat-calendario").onclick = function () {
    scaricaCalendario([categoria], `allenamenti ${categoria}`);
  };

  document.getElementById("cat-roster").onclick = function () {
    filtraRosterSullaCategoria();
    mostraSezione("atleti");
  };
  document.getElementById("cat-esporta").onclick = function () {
    filtraRosterSullaCategoria();
    esportaAtleti();
  };
  document.getElementById("cat-nuovo-atleta").onclick = function () {
    filtraRosterSullaCategoria();
    apriModalAtleta(null);   // la categoria è già scelta
  };
}
