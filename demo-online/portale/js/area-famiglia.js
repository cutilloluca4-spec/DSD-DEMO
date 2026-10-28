/* ==================================================================
   D.S.D. — area-famiglia.js (Portale v4)
   Area Genitore/Atleta: il genitore entra per i figli minorenni,
   l'atleta maggiorenne per sé. Vede cosa c'è da fare, i documenti,
   la quota con le ricevute, il materiale da prenotare e il profilo
   con i consensi. Quello che invia arriva alla segreteria come
   "richiesta" da controllare.
   ================================================================== */

// 1. STATO DELL'AREA
let accountAttivo = null;      // chiave dell'account (vedi accountFamiglie in aree.js)
let atletaFamiglia = null;     // id dell'atleta che si sta guardando
let schedaFamiglia = "home";
let documentoInInvio = "";     // tipo del documento con il modulo di invio aperto

// L'atleta che si sta guardando, sempre letto dai dati più recenti
function atletaCorrente() {
  return trovaAtleta(atletaFamiglia);
}

function accountCorrente() {
  return accountFamiglie().find(function (account) {
    return account.chiave === accountAttivo;
  });
}

// 2. SCHEDA "HOME": cosa c'è da fare, impegni e richieste
function coseDaFare(atleta) {
  const voci = [];

  atleta.documenti.forEach(function (doc) {
    const stato = calcolaStatoDocumento(doc.scadenza);
    const nome = etichettaDocumento(doc.tipo);
    if (stato.stato === "scaduto") voci.push({ livello: "rosso", testo: `${nome} scaduto il ${dataInItaliano(doc.scadenza)}`, scheda: "documenti" });
    if (stato.stato === "mancante") voci.push({ livello: "rosso", testo: `${nome} da consegnare`, scheda: "documenti" });
    if (stato.stato === "in-scadenza") voci.push({ livello: "giallo", testo: `${nome} in scadenza il ${dataInItaliano(doc.scadenza)}`, scheda: "documenti" });
  });

  if (certificatoDaCambiare(atleta)) {
    voci.push({ livello: "rosso", testo: `In questa stagione compie ${configurazioneAttiva.etaAgonistica} anni: serve il certificato medico agonistico`, scheda: "documenti" });
  }

  const mancano = importoQuota(atleta) - versatoQuota(atleta);
  if (mancano > 0) voci.push({ livello: "giallo", testo: `Quota: mancano ${formattaEuro(mancano)}`, scheda: "quota" });
  if (!consensiCompleti(atleta)) voci.push({ livello: "giallo", testo: "Consensi privacy da completare in segreteria", scheda: "profilo" });

  return voci;
}

function renderHome(atleta) {
  const daFare = coseDaFare(atleta);
  const convocazioni = convocazioniAtleta(atleta);
  const staff = allenatoriDiCategoria(atleta.categoria);
  const richieste = richiesteAtleta(atleta.id).slice(0, 3);

  const daFareHtml = daFare.length === 0
    ? `<p class="semaforo semaforo--verde">Tutto in regola per la stagione ${pulisciTesto(configurazioneAttiva.stagione)}</p>`
    : daFare.map(function (voce) {
      return `<button type="button" data-vai="${voce.scheda}" class="semaforo semaforo--${voce.livello}">${pulisciTesto(voce.testo)}<span>→</span></button>`;
    }).join("");

  // Per ogni convocazione la famiglia risponde: ci sarà / non ci sarà
  const convocazioniHtml = convocazioni.map(function (c) {
    const risposta = rispostaConvocazione(c, atleta.id);
    return `
      <div class="py-3 border-b border-[#E7EBEC] last:border-b-0">
        <p class="text-sm font-bold">${pulisciTesto(c.evento)}</p>
        <p class="text-xs text-[#7A8285]">${dataEstesa(c.data)} • ritrovo alle ${pulisciTesto(c.ora)}${c.luogo ? " • " + pulisciTesto(c.luogo) : ""}</p>
        ${c.note ? `<p class="text-xs text-[#12181B] mt-0.5">${pulisciTesto(c.note)}</p>` : ""}
        <div class="flex gap-2 mt-2">
          <button type="button" data-risposta="si" data-convocazione="${c.id}" class="risposta ${risposta === "si" ? "risposta--si" : ""}">Ci sarà</button>
          <button type="button" data-risposta="no" data-convocazione="${c.id}" class="risposta ${risposta === "no" ? "risposta--no" : ""}">Non ci sarà</button>
        </div>
      </div>
    `;
  }).join("");

  const avvisiHtml = avvisiPerCategorie([atleta.categoria]).slice(0, 4).map(function (avviso) {
    return htmlAvvisoBacheca(avviso, false);
  }).join("");

  const orari = testoOrari(atleta.categoria);
  const prossimo = prossimoAllenamento(atleta.categoria);

  const richiesteHtml = richieste.map(function (r) {
    return `
      <div class="flex items-start justify-between gap-3 py-2 border-b border-[#E7EBEC] last:border-b-0">
        <span class="min-w-0">
          <strong class="block text-sm">${pulisciTesto(titoloRichiesta(r))}</strong>
          <small class="block text-xs text-[#7A8285]">Inviata il ${dataInItaliano(r.data)}</small>
        </span>
        <span class="shrink-0">${htmlStatoRichiesta(r)}</span>
      </div>
      ${r.stato === "rifiutata" && r.motivo ? `<p class="text-xs text-[#C94141] -mt-1 pb-2">Segreteria: ${pulisciTesto(r.motivo)}</p>` : ""}
    `;
  }).join("");

  return `
    <section class="pannello-scheda mb-6">
      <div class="flex items-center gap-4">
        ${htmlAvatar(atleta, "w-20 h-20")}
        <div class="min-w-0">
          <p class="font-mono text-xs text-[#4E9EAF] font-bold uppercase tracking-widest">${pulisciTesto(atleta.categoria)}</p>
          <h1 class="text-2xl font-bold text-[#12181B] leading-tight">${pulisciTesto(atleta.nome)} ${pulisciTesto(atleta.cognome)}</h1>
          <p class="text-xs text-[#7A8285] mt-1">${staff.length > 0 ? pulisciTesto(staff.map(function (a) { return `${a.ruolo || "Staff"}: ${a.nome} ${a.cognome}`; }).join(" • ")) : "Staff da assegnare"}</p>
          <p class="mt-2">${htmlIdoneita(atleta)}</p>
        </div>
      </div>
    </section>

    ${avvisiHtml ? `
    <section class="mb-6">
      <h2 class="text-lg font-bold text-[#12181B] mb-2">Avvisi</h2>
      <div class="flex flex-col gap-2">${avvisiHtml}</div>
    </section>` : ""}

    <section class="mb-6">
      <h2 class="text-lg font-bold text-[#12181B] mb-2">Cosa c'è da fare</h2>
      <div class="flex flex-col gap-2">${daFareHtml}</div>
    </section>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <section class="pannello-scheda">
        <h3 class="titolo-pannello">Prossimi impegni</h3>
        ${convocazioniHtml || `<p class="text-sm text-[#7A8285]">Nessuna convocazione per ora.</p>`}
      </section>
      <section class="pannello-scheda">
        <h3 class="titolo-pannello">Allenamenti e partite</h3>
        ${orari ? `<p class="text-sm text-[#12181B]">${pulisciTesto(orari.charAt(0).toUpperCase() + orari.slice(1))}</p>` : `<p class="text-sm text-[#7A8285]">Orari da comunicare.</p>`}
        ${prossimo ? `<p class="text-xs text-[#12181B] mt-1">Prossimo: <b>${prossimo.data === oggiIso() ? "oggi" : dataEstesa(prossimo.data)}, ${pulisciTesto(testoFascia(prossimo))}</b>${prossimo.campo ? " • " + pulisciTesto(prossimo.campo) : ""}${prossimo.stato !== "regolare" ? ` <span class="etichetta-variazione">${prossimo.stato === "aggiunto" ? "In più" : "Variato"}</span>` : ""}</p>` : ""}
        <p class="font-mono text-[10px] uppercase text-[#7A8285] mt-3">Questa settimana • ${testoSettimana(lunediDi(oggiIso()))}</p>
        ${htmlSettimana(atleta.categoria, lunediDi(oggiIso()), { atletaId: atleta.id })}
        <p class="font-mono text-[10px] uppercase text-[#7A8285] mt-3">Prossima settimana • ${testoSettimana(aggiungiGiorni(lunediDi(oggiIso()), 7))}</p>
        ${htmlSettimana(atleta.categoria, aggiungiGiorni(lunediDi(oggiIso()), 7), { atletaId: atleta.id })}
        <button type="button" id="fam-calendario" class="btn-dsd-secondary text-xs py-2 px-4 mt-3 mb-4">Aggiungi al calendario del telefono</button>
        <p class="font-mono text-[10px] uppercase text-[#7A8285]">Presenze</p>
        <p class="font-mono text-2xl font-bold">${presenzeAtleta(atleta).percentuale === null ? "—" : presenzeAtleta(atleta).percentuale + "%"}</p>
        <p class="text-xs text-[#7A8285]">${testoPresenze(atleta)}</p>
      </section>
    </div>

    ${richiesteHtml ? `
    <section class="pannello-scheda mt-4">
      <h3 class="titolo-pannello">Le tue richieste alla segreteria</h3>
      ${richiesteHtml}
    </section>` : ""}
  `;
}

// 3. SCHEDA "DOCUMENTI": scadenze e invio del nuovo documento
function renderDocumenti(atleta) {
  const richiesteDocumenti = richiesteAtleta(atleta.id).filter(function (r) {
    return r.tipo === "documento";
  });
  const inAttesa = richiesteDocumenti.filter(function (r) {
    return r.stato === "nuova";
  });

  let htmlAccumulato = `
    <h1 class="text-2xl font-bold text-[#12181B] mb-1">Documenti</h1>
    <p class="text-xs text-[#7A8285] mb-4">Quando rinnovi un documento invialo da qui: la segreteria lo controlla e aggiorna la scadenza.</p>
  `;

  atleta.documenti.forEach(function (doc) {
    const stato = calcolaStatoDocumento(doc.scadenza);
    const attesa = inAttesa.find(function (r) { return r.documento === doc.tipo; });
    // L'ultima risposta della segreteria su questo documento (la più recente è la prima)
    const ultima = richiesteDocumenti.find(function (r) { return r.documento === doc.tipo; });
    const daRifare = !attesa && ultima && ultima.stato === "rifiutata";
    const moduloAperto = documentoInInvio === doc.tipo;

    htmlAccumulato += `
      <section class="pannello-scheda mb-3">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <span class="stato-pallino stato-pallino--${stato.stato} w-2.5 h-2.5 rounded-full shrink-0"></span>
            <div>
              <p class="text-sm font-bold">${etichettaDocumento(doc.tipo)}${doc.tipo === "Visite Mediche" ? ` <span class="font-normal text-[#7A8285]">• ${pulisciTesto(atleta.tipoCertificato)}</span>` : ""}</p>
              <p class="text-xs text-[#7A8285]">${doc.scadenza ? "Scade il " + dataInItaliano(doc.scadenza) + " • " : ""}${etichettaGiorni(stato.giorniMancanti)}</p>
            </div>
          </div>
          ${!attesa && !moduloAperto ? `<button type="button" data-invia-documento="${pulisciTesto(doc.tipo)}" class="btn-dsd-secondary text-[11px] py-1.5 px-3 shrink-0">Invia il nuovo</button>` : ""}
        </div>
        ${attesa ? `<p class="text-xs text-[#4E9EAF] font-bold mt-3">Inviato il ${dataInItaliano(attesa.data)} con scadenza ${dataInItaliano(attesa.scadenza)}: in verifica dalla segreteria.</p>` : ""}
        ${daRifare ? `<p class="text-xs text-[#C94141] font-bold mt-3">Da rifare: ${pulisciTesto(ultima.motivo || "la segreteria non ha potuto accettarlo")}. Invialo di nuovo.</p>` : ""}
        ${moduloAperto ? `
        <div class="border-t border-[#E7EBEC] mt-4 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="text-xs text-[#7A8285]">Nuova data di scadenza
            <input type="text" id="invio-scadenza" inputmode="numeric" maxlength="10" placeholder="gg/mm/aaaa" class="input-dsd w-full mt-1 font-mono campo-data" />
          </label>
          <label class="text-xs text-[#7A8285]">Foto o PDF del documento
            <input type="file" id="invio-file" accept="image/*,application/pdf" class="input-dsd w-full mt-1 text-xs" />
          </label>
          <p class="text-[11px] text-[#7A8285] sm:col-span-2">Nel prototipo il file non viene salvato. Con il server finirà in uno spazio privato, visibile solo alla segreteria.</p>
          <div class="flex gap-3 sm:col-span-2">
            <button type="button" id="invio-annulla" class="btn-dsd-secondary text-xs py-2 px-4">Annulla</button>
            <button type="button" id="invio-conferma" class="btn-dsd-primary text-xs py-2 px-5">Invia alla segreteria</button>
          </div>
        </div>` : ""}
      </section>
    `;
  });

  return htmlAccumulato;
}

function inviaDocumento() {
  const atleta = atletaCorrente();
  const scadenza = dataDaItaliano(document.getElementById("invio-scadenza").value.trim());
  const file = document.getElementById("invio-file").files[0];

  if (!scadenza) {
    mostraAvviso("Scrivi la nuova data di scadenza così: gg/mm/aaaa.", "errore");
    return;
  }
  if (scadenza <= oggiIso()) {
    mostraAvviso("La nuova scadenza deve essere nel futuro.", "errore");
    return;
  }

  // Nel prototipo si salva solo il NOME del file: il file vero resta sul
  // telefono della famiglia. Con il server qui si caricherà il file in un
  // archivio privato e nella richiesta si salverà il suo indirizzo.
  ricaricaDati();
  aggiungiRichiesta({
    atletaId: atleta.id,
    tipo: "documento",
    documento: documentoInInvio,
    scadenza: scadenza,
    nomeFile: file ? file.name : "",
    testo: "",
  });
  documentoInInvio = "";
  renderArea();
  mostraAvviso("Documento inviato: la segreteria lo controllerà a breve.", "ok");
}

// 4. SCHEDA "QUOTA": quanto manca, ricevute e dati per il bonifico
function renderQuota(atleta) {
  const importo = importoQuota(atleta);
  const versato = versatoQuota(atleta);
  const stato = statoQuota(atleta);
  const contatti = configurazioneAttiva.contatti;
  const causale = `Quota ${configurazioneAttiva.stagione} ${nomeCompleto(atleta)}`;

  const pagamentiHtml = atleta.quota.pagamenti.map(function (pagamento, indice) {
    return `
      <div class="flex items-center justify-between gap-3 py-2 border-b border-[#E7EBEC] last:border-b-0 text-sm">
        <span class="text-[#7A8285]">${dataInItaliano(pagamento.data)}${pagamento.metodo ? " • " + pulisciTesto(pagamento.metodo) : ""}</span>
        <span class="flex items-center gap-3">
          <strong class="font-mono">${formattaEuro(pagamento.importo)}</strong>
          ${pagamento.numero
            ? `<button type="button" data-ricevuta="${indice}" class="text-[11px] font-bold text-[#4E9EAF] hover:underline cursor-pointer">Ricevuta</button>`
            : `<span class="text-[11px] text-[#7A8285]">ricevuta dalla segreteria</span>`}
        </span>
      </div>
    `;
  }).join("");

  return `
    <h1 class="text-2xl font-bold text-[#12181B] mb-4">Quota ${pulisciTesto(configurazioneAttiva.stagione)}</h1>

    <section class="pannello-scheda mb-4">
      ${importo === 0
        ? `<p class="text-sm text-[#7A8285]">La società non ha ancora indicato la quota di questa stagione.</p>
           <p class="font-mono text-3xl font-bold text-[#12181B] mt-2">${formattaEuro(versato)} <span class="text-sm font-normal text-[#7A8285]">versati</span></p>`
        : `<span class="etichetta-quota etichetta-quota--${stato}">${etichettaStatoQuota(stato)}</span>
           <p class="font-mono text-3xl font-bold text-[#12181B] mt-2">${formattaEuro(versato)} <span class="text-sm font-normal text-[#7A8285]">di ${formattaEuro(importo)}</span></p>`}
      ${importo > versato ? `<p class="text-sm text-[#C94141] font-bold mt-1">Mancano ${formattaEuro(importo - versato)}</p>` : ""}
      <div class="barra-quota mt-3"><i style="width: ${importo > 0 ? Math.min(100, (versato / importo) * 100) : 0}%"></i></div>
      ${pagamentiHtml ? `<div class="mt-4">${pagamentiHtml}</div>` : ""}
    </section>

    ${importo > versato ? `
    <section class="pannello-scheda">
      <h3 class="titolo-pannello">Come pagare con bonifico</h3>
      <div class="grid grid-cols-1 gap-3">
        ${rigaDato("Intestatario", configurazioneAttiva.nomeSocieta)}
        ${rigaDato("IBAN", contatti.iban || "Chiedilo in segreteria", "font-mono")}
        ${rigaDato("Causale", causale)}
      </div>
      <button type="button" id="copia-bonifico" class="btn-dsd-secondary text-xs py-2 px-4 mt-4">Copia i dati del bonifico</button>
      <p class="text-[11px] text-[#7A8285] mt-3">Paga con bonifico o carta: per i ragazzi dai 5 ai 18 anni la spesa si può detrarre nella dichiarazione dei redditi, ma non se pagata in contanti.</p>
    </section>` : ""}
  `;
}

function apriRicevutaFamiglia(atleta, indice) {
  const pagamento = atleta.quota.pagamenti[indice];
  document.getElementById("ricevuta-foglio").innerHTML = htmlFoglioRicevuta(atleta, pagamento, datiRicevuta(atleta, pagamento));
  apriFinestra(document.getElementById("finestra-ricevuta"));
}

// 5. SCHEDA "MATERIALE": prenotare il kit e vedere gli ordini
function renderMaterialeFamiglia(atleta) {
  const prodotti = configurazioneAttiva.magazzino.prodotti.filter(function (prodotto) {
    return totaleDisponibili(prodotto) > 0;
  });

  const catalogoHtml = prodotti.map(function (prodotto) {
    const taglie = prodotto.taglie.filter(function (voce) {
      return pezziDisponibili(prodotto, voce.taglia) > 0;
    });
    // Si propone la taglia segnata nella scheda dell'atleta, se c'è
    const suggerita = taglie.some(function (t) { return t.taglia === atleta.taglie.maglia; }) ? atleta.taglie.maglia : "";

    return `
      <div class="flex items-center gap-3 px-4 py-3 bg-white">
        ${htmlMiniaturaProdotto(prodotto, "w-16 h-16")}
        <div class="flex-1 min-w-0">
          <p class="text-sm font-bold truncate">${pulisciTesto(prodotto.nome)}</p>
          <p class="text-xs text-[#7A8285]">${pulisciTesto(prodotto.categoria)} • <b class="text-[#12181B]">${formattaEuro(prodotto.prezzo)}</b></p>
          <div class="flex items-center gap-2 mt-2">
            <select data-taglia-prodotto="${prodotto.id}" class="input-dsd py-1 text-xs">
              ${taglie.map(function (t) {
                return `<option value="${pulisciTesto(t.taglia)}" ${t.taglia === suggerita ? "selected" : ""}>Taglia ${pulisciTesto(t.taglia)}</option>`;
              }).join("")}
            </select>
            <button type="button" data-prenota="${prodotto.id}" class="btn-dsd-primary text-[11px] py-1.5 px-3">Prenota</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  const ordiniHtml = prenotazioniDiAtleta(atleta.id).map(function (pren) {
    const prodotto = trovaProdotto(pren.prodottoId);
    return `
      <div class="flex items-center justify-between gap-3 py-2 border-b border-[#E7EBEC] last:border-b-0">
        <span class="min-w-0">
          <strong class="block text-sm truncate">${prodotto ? pulisciTesto(prodotto.nome) : "Prodotto"}</strong>
          <small class="block text-xs text-[#7A8285]">Taglia ${pulisciTesto(pren.taglia)} × ${pren.quantita} • ${formattaEuro(pren.quantita * pren.prezzoUnitario)} • ${dataInItaliano(pren.data)}</small>
        </span>
        <span class="flex flex-col items-end gap-1 shrink-0">
          <span class="etichetta-stato etichetta-stato--${pren.stato}">${etichettaStatoPrenotazione(pren)}</span>
          ${pren.stato === "aperta" ? `<button type="button" data-annulla-ordine="${pren.id}" class="text-[11px] text-[#7A8285] hover:text-[#C94141] underline cursor-pointer">Annulla</button>` : ""}
        </span>
      </div>
    `;
  }).join("");

  return `
    <h1 class="text-2xl font-bold text-[#12181B] mb-1">Materiale</h1>
    <p class="text-xs text-[#7A8285] mb-4">Prenota qui: lo ritiri e lo paghi in segreteria o al campo.</p>

    <section class="pannello-scheda mb-6">
      <h3 class="titolo-pannello">I tuoi ordini</h3>
      ${ordiniHtml || `<p class="text-sm text-[#7A8285]">Nessun ordine.</p>`}
    </section>

    <h2 class="text-lg font-bold text-[#12181B] mb-2">Disponibile in magazzino</h2>
    <div class="border border-[#E7EBEC] divide-y divide-[#E7EBEC] shadow-xs">${catalogoHtml || `<p class="px-4 py-4 text-sm text-[#7A8285] bg-white">Nessun prodotto disponibile.</p>`}</div>
  `;
}

function prenotaProdotto(prodottoId) {
  const atleta = atletaCorrente();
  const prodotto = trovaProdotto(prodottoId);
  const taglia = document.querySelector(`[data-taglia-prodotto="${prodottoId}"]`).value;
  if (!prodotto || !taglia) return;

  chiediConferma({
    titolo: `Prenotare ${prodotto.nome}?`,
    testo: `Taglia ${taglia} per ${nomeCompleto(atleta)}, ${formattaEuro(prodotto.prezzo)}. La segreteria ti avviserà quando è pronto.`,
    conferma: "Prenota",
  }, function () {
    ricaricaDati();
    configurazioneAttiva.magazzino.prenotazioni.push({
      id: creaId("pren"),
      prodottoId: prodotto.id,
      taglia: taglia,
      quantita: 1,
      prezzoUnitario: prodotto.prezzo,
      atletaId: atleta.id,
      intestatario: "",
      data: oggiIso(),
      stato: "aperta",
      pagato: false,
      note: "Prenotato dalla famiglia",
    });
    if (!salvaConfigurazione()) return;
    renderArea();
    mostraAvviso("Prenotazione inviata alla segreteria.", "ok");
  });
}

// 6. SCHEDA "PROFILO": dati, correzioni e consensi
function renderProfilo(atleta) {
  const residenza = [atleta.indirizzo, [atleta.cap, atleta.comune].join(" ").trim(), atleta.provincia].filter(function (p) { return p; }).join(", ");

  return `
    <h1 class="text-2xl font-bold text-[#12181B] mb-4">Profilo</h1>

    <section class="pannello-scheda mb-4">
      <h3 class="titolo-pannello">Dati dell'atleta</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
        ${rigaDato("Nome e cognome", nomeCompleto(atleta))}
        ${rigaDato("Data di nascita", atleta.dataNascita ? dataInItaliano(atleta.dataNascita) : "")}
        ${rigaDato("Luogo di nascita", atleta.luogoNascita)}
        ${rigaDato("Codice fiscale", atleta.codiceFiscale, "font-mono")}
        ${rigaDato("Residenza", residenza)}
        ${rigaDato("Telefono", atleta.telefono)}
        ${rigaDato("Email", atleta.email)}
        ${rigaDato("Taglia maglia", atleta.taglie.maglia)}
        ${eMinorenne(atleta) ? rigaDato("Genitore o tutore", [atleta.tutore.nome, atleta.tutore.telefono].filter(function (d) { return d; }).join(" • ")) : ""}
      </div>
    </section>

    <section class="pannello-scheda mb-4">
      <h3 class="titolo-pannello">Qualcosa non è corretto?</h3>
      <textarea id="correzione-testo" rows="2" placeholder="es. Il numero di telefono è cambiato: 333 1234567" class="input-dsd w-full"></textarea>
      <button type="button" id="correzione-invia" class="btn-dsd-secondary text-xs py-2 px-4 mt-3">Segnala alla segreteria</button>
    </section>

    <section class="pannello-scheda">
      <h3 class="titolo-pannello">Consensi privacy</h3>
      <div class="flex flex-col gap-2">
        <div class="riga-consenso ${atleta.consensi.trattamento ? "riga-consenso--ok" : ""}"><span class="flex-1">Trattamento dei dati personali</span><small>${atleta.consensi.trattamento ? "dato" : "da firmare in segreteria"}</small></div>
        <div class="riga-consenso ${atleta.consensi.sanitari ? "riga-consenso--ok" : ""}"><span class="flex-1">Dati sanitari (certificato medico)</span><small>${atleta.consensi.sanitari ? "dato" : "da firmare in segreteria"}</small></div>
        <label class="riga-consenso ${atleta.consensi.immagini ? "riga-consenso--ok" : ""}">
          <input type="checkbox" id="consenso-immagini" ${atleta.consensi.immagini ? "checked" : ""} class="accent-[#4E9EAF] w-4 h-4 cursor-pointer" />
          <span class="flex-1">Foto e video per sito e social</span><small>puoi cambiarlo quando vuoi</small>
        </label>
      </div>
      <p class="text-[11px] text-[#7A8285] mt-3">I primi due servono per fare attività con la società: per modificarli parla con la segreteria.</p>
    </section>
  `;
}

// 7. DISEGNO DELL'AREA E PULSANTI
function renderSceltaFigli(account) {
  const contenitore = document.getElementById("scelta-figli");
  if (!account || account.atleti.length < 2) {
    contenitore.innerHTML = "";
    return;
  }
  contenitore.innerHTML = account.atleti.map(function (id) {
    const atleta = trovaAtleta(id);
    return `<button type="button" data-figlio="${id}" class="filtro-stato ${id === atletaFamiglia ? "filtro-stato--attivo" : ""}">${pulisciTesto(atleta.nome)}</button>`;
  }).join("");
  contenitore.querySelectorAll("[data-figlio]").forEach(function (bottone) {
    bottone.onclick = function () {
      atletaFamiglia = bottone.getAttribute("data-figlio");
      documentoInInvio = "";
      renderArea();
    };
  });
}

function renderArea() {
  const contenitore = document.getElementById("area-contenuto");
  const account = accountCorrente();

  document.querySelectorAll("[data-scheda]").forEach(function (voce) {
    voce.classList.toggle("voce-area--attiva", voce.getAttribute("data-scheda") === schedaFamiglia);
  });

  if (!account) {
    contenitore.innerHTML = `<p class="pannello-scheda text-sm text-[#7A8285]">Nessun atleta: aggiungili dalla Segreteria.</p>`;
    return;
  }
  if (account.atleti.indexOf(atletaFamiglia) === -1) atletaFamiglia = account.atleti[0];
  renderSceltaFigli(account);

  const atleta = trovaAtleta(atletaFamiglia);
  if (schedaFamiglia === "home") contenitore.innerHTML = renderHome(atleta);
  if (schedaFamiglia === "documenti") contenitore.innerHTML = renderDocumenti(atleta);
  if (schedaFamiglia === "quota") contenitore.innerHTML = renderQuota(atleta);
  if (schedaFamiglia === "materiale") contenitore.innerHTML = renderMaterialeFamiglia(atleta);
  if (schedaFamiglia === "profilo") contenitore.innerHTML = renderProfilo(atleta);

  collegaPulsantiFamiglia();
}

// Ogni pulsante rilegge i dati prima di salvare (un'altra area potrebbe
// averli appena cambiati) e cerca l'atleta per id
function collegaPulsantiFamiglia() {
  document.querySelectorAll(".campo-data").forEach(function (campo) {
    campo.oninput = function () { formattaCampoData(campo); };
  });
  document.querySelectorAll("[data-vai]").forEach(function (bottone) {
    bottone.onclick = function () { apriSchedaFamiglia(bottone.getAttribute("data-vai")); };
  });

  // Calendario del telefono: allenamenti e partite in cui è convocato
  const btnCalendario = document.getElementById("fam-calendario");
  if (btnCalendario) {
    btnCalendario.onclick = function () {
      const atleta = atletaCorrente();
      scaricaCalendario([atleta.categoria], `allenamenti ${atleta.nome}`, { atletaId: atleta.id });
    };
  }

  // Documenti
  document.querySelectorAll("[data-invia-documento]").forEach(function (bottone) {
    bottone.onclick = function () {
      documentoInInvio = bottone.getAttribute("data-invia-documento");
      renderArea();
      document.getElementById("invio-scadenza").focus();
    };
  });
  const btnInvio = document.getElementById("invio-conferma");
  if (btnInvio) {
    btnInvio.onclick = inviaDocumento;
    document.getElementById("invio-annulla").onclick = function () {
      documentoInInvio = "";
      renderArea();
    };
  }

  // Quota
  document.querySelectorAll("[data-ricevuta]").forEach(function (bottone) {
    bottone.onclick = function () { apriRicevutaFamiglia(atletaCorrente(), Number(bottone.getAttribute("data-ricevuta"))); };
  });
  const btnCopia = document.getElementById("copia-bonifico");
  if (btnCopia) {
    btnCopia.onclick = function () {
      const atleta = atletaCorrente();
      const testo = `Intestatario: ${configurazioneAttiva.nomeSocieta}\nIBAN: ${configurazioneAttiva.contatti.iban || "da chiedere in segreteria"}\n` +
        `Importo: ${formattaEuro(importoQuota(atleta) - versatoQuota(atleta))}\nCausale: Quota ${configurazioneAttiva.stagione} ${nomeCompleto(atleta)}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(testo).then(function () {
          mostraAvviso("Dati del bonifico copiati.", "ok");
        }, function () {
          mostraAvviso("Non riesco a copiare il testo da questo browser.", "errore");
        });
      }
    };
  }

  // Materiale
  document.querySelectorAll("[data-prenota]").forEach(function (bottone) {
    bottone.onclick = function () { prenotaProdotto(bottone.getAttribute("data-prenota")); };
  });
  document.querySelectorAll("[data-annulla-ordine]").forEach(function (bottone) {
    bottone.onclick = function () {
      chiediConferma({ titolo: "Annullare l'ordine?", testo: "La prenotazione verrà annullata e i pezzi tornano disponibili.", conferma: "Annulla ordine", pericolo: true }, function () {
        ricaricaDati();
        const pren = trovaPrenotazione(bottone.getAttribute("data-annulla-ordine"));
        if (pren && pren.stato === "aperta") {
          pren.stato = "annullata";
          pren.note = (pren.note ? pren.note + " • " : "") + "Annullato dalla famiglia";
          salvaConfigurazione();
        }
        renderArea();
        mostraAvviso("Ordine annullato.", "info");
      });
    };
  });

  // Risposta alle convocazioni
  document.querySelectorAll("[data-risposta]").forEach(function (bottone) {
    bottone.onclick = function () {
      ricaricaDati();
      const convocazione = configurazioneAttiva.convocazioni.find(function (c) {
        return c.id === bottone.getAttribute("data-convocazione");
      });
      if (!convocazione) return;
      if (!convocazione.risposte) convocazione.risposte = {};
      convocazione.risposte[atletaFamiglia] = bottone.getAttribute("data-risposta");
      salvaConfigurazione();
      renderArea();
      mostraAvviso("Risposta inviata all'allenatore.", "ok");
    };
  });

  // Profilo
  const btnCorrezione = document.getElementById("correzione-invia");
  if (btnCorrezione) {
    btnCorrezione.onclick = function () {
      const testo = document.getElementById("correzione-testo").value.trim();
      if (testo === "") {
        mostraAvviso("Scrivi cosa va corretto.", "errore");
        return;
      }
      ricaricaDati();
      aggiungiRichiesta({ atletaId: atletaFamiglia, tipo: "correzione", testo: testo });
      renderArea();
      mostraAvviso("Segnalazione inviata alla segreteria.", "ok");
    };

    // Il consenso per foto e video si può dare o togliere in ogni momento:
    // si aggiorna subito e la segreteria ne riceve notizia
    document.getElementById("consenso-immagini").onchange = function () {
      const dato = document.getElementById("consenso-immagini").checked;
      ricaricaDati();
      const atleta = atletaCorrente();
      atleta.consensi.immagini = dato;
      atleta.consensi.data = oggiIso();
      aggiungiRichiesta({ atletaId: atleta.id, tipo: "consenso", testo: dato ? "Consenso per foto e video dato" : "Consenso per foto e video revocato" });
      renderArea();
      mostraAvviso(dato ? "Consenso per foto e video dato." : "Consenso per foto e video revocato.", "ok");
    };
  }
}

function apriSchedaFamiglia(nomeScheda) {
  schedaFamiglia = nomeScheda;
  documentoInInvio = "";
  renderArea();
  window.scrollTo(0, 0);
}

// 8. AVVIO
document.addEventListener("DOMContentLoaded", function () {
  initFinestre();
  inserisciBarraAree("famiglia");

  if (!caricaDatiArea()) {
    document.getElementById("area-contenuto").innerHTML = htmlDatiMancanti();
    return;
  }

  const config = configurazioneAttiva;
  document.getElementById("area-nome-societa").textContent = config.nomeSocieta || "La tua società";
  if (config.logo) {
    const logo = document.getElementById("area-logo-societa");
    logo.src = config.logo;
    logo.classList.remove("hidden");
  }

  // "Accesso come": nel prototipo si sceglie, con il server lo dirà il login
  const scelta = document.getElementById("scelta-account");
  const elenco = accountFamiglie();
  scelta.innerHTML = elenco.map(function (account) {
    return `<option value="${pulisciTesto(account.chiave)}">${pulisciTesto(account.nome)} (${account.ruolo.toLowerCase()})</option>`;
  }).join("");

  let ricordato = "";
  try { ricordato = localStorage.getItem("dsd_v4_accesso_famiglia") || ""; } catch (errore) { ricordato = ""; }
  accountAttivo = elenco.some(function (a) { return a.chiave === ricordato; }) ? ricordato : (elenco[0] ? elenco[0].chiave : null);
  scelta.value = accountAttivo || "";

  scelta.onchange = function () {
    accountAttivo = scelta.value;
    atletaFamiglia = null;
    try { localStorage.setItem("dsd_v4_accesso_famiglia", accountAttivo); } catch (errore) { /* non importa */ }
    renderArea();
  };

  document.querySelectorAll("[data-scheda]").forEach(function (voce) {
    voce.onclick = function () { apriSchedaFamiglia(voce.getAttribute("data-scheda")); };
  });

  document.getElementById("ricevuta-chiudi").onclick = function () {
    chiudiFinestra(document.getElementById("finestra-ricevuta"));
  };
  document.getElementById("ricevuta-stampa").onclick = function () {
    document.body.classList.add("stampa-ricevuta");
    window.print();
    document.body.classList.remove("stampa-ricevuta");
  };

  // Dati cambiati dalla segreteria o dall'allenatore (in un'altra scheda del browser)
  gestisciDatiEsterni(renderArea);

  renderArea();
});
