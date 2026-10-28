/* ==================================================================
   D.S.D. — area-allenatore.js (Portale v4)
   Area Allenatore/Dirigente, pensata per lo smartphone al campo:
   le sue squadre con l'idoneità degli atleti, gli avvisi alle
   famiglie, l'appello degli allenamenti, le convocazioni con le
   risposte delle famiglie e il materiale da consegnare.
   Non mostra quote, codici fiscali, indirizzi e documenti sanitari.
   ================================================================== */

// 1. STATO DELL'AREA
let allenatoreAttivo = null;        // id dell'allenatore che ha fatto "l'accesso"
let schedaAllenatore = "squadre";
let categoriaPresenze = "";
let dataPresenze = "";              // "aaaa-mm-gg"
let convocazioneInModifica = null;  // id della convocazione aperta nel modulo

function allenatoreCorrente() {
  return trovaAllenatore(allenatoreAttivo);
}

// Atleti di una categoria, in ordine di cognome
function atletiCategoria(categoria) {
  return configurazioneAttiva.atleti.filter(function (atleta) {
    return atleta.categoria === categoria;
  }).sort(function (a, b) {
    return `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`, "it");
  });
}

function trovaConvocazione(id) {
  return configurazioneAttiva.convocazioni.find(function (convocazione) {
    return convocazione.id === id;
  });
}

// Icone per chiamare e scrivere (stesso stile dei promemoria)
const iconaTelefono = `<svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>`;
const iconaChat = `<svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-5A8 8 0 1 1 21 12Z"/></svg>`;

// Chiama o scrivi al genitore (minorenni) o all'atleta
function htmlContattiAtleta(atleta) {
  const contatto = contattoScadenza({ staff: false, id: atleta.id });
  if (!contatto || !contatto.telefono) {
    return `<span class="azione-contatto azione-contatto--spenta" title="Nessun telefono">${iconaTelefono}</span>`;
  }
  const chi = eMinorenne(atleta) ? `il genitore (${contatto.nome})` : atleta.nome;
  const numero = numeroWhatsApp(contatto.telefono);
  return `
    <a href="tel:${pulisciTesto(contatto.telefono.replace(/\s/g, ""))}" class="azione-contatto" title="Chiama ${pulisciTesto(chi)}">${iconaTelefono}</a>
    ${numero ? `<a href="https://wa.me/${numero}" target="_blank" rel="noopener" class="azione-contatto" title="Scrivi su WhatsApp a ${pulisciTesto(chi)}">${iconaChat}</a>` : ""}
  `;
}

// Chi non ha dato il consenso per foto e video non va pubblicato sui social
function htmlConsensoFoto(atleta) {
  return atleta.consensi.immagini ? "" : ` <span class="etichetta-idoneita etichetta-idoneita--no-foto">No foto/video</span>`;
}

// 2. SCHEDA "SQUADRE"
function renderSquadre(allenatore) {
  const avvisi = avvisiPerCategorie(allenatore.categorie).slice(0, 5);
  const nomeAutore = `${allenatore.nome} ${allenatore.cognome} (${(allenatore.ruolo || "staff").toLowerCase()})`;

  let htmlAccumulato = `
    <section class="mb-6">
      <p class="font-mono text-xs text-[#4E9EAF] font-bold uppercase tracking-widest mb-1">${pulisciTesto(allenatore.ruolo || "Staff")}</p>
      <h1 class="text-3xl font-bold text-[#12181B]">Ciao ${pulisciTesto(allenatore.nome)}</h1>
      <p class="text-sm text-[#7A8285] mt-1">Le tue squadre della stagione ${pulisciTesto(configurazioneAttiva.stagione)}.</p>
    </section>

    <section class="pannello-scheda mb-6">
      <h3 class="titolo-pannello">I tuoi documenti</h3>
      <div class="flex flex-wrap gap-2">${htmlCartellini(allenatore)}</div>
    </section>

    <section class="pannello-scheda mb-8">
      <h3 class="titolo-pannello">Bacheca avvisi</h3>
      ${allenatore.categorie.length > 0 ? `
      <div class="flex flex-col gap-2 mb-4">
        <textarea id="avviso-testo" rows="2" placeholder="es. Allenamento di giovedì annullato per pioggia" class="input-dsd w-full"></textarea>
        <div class="flex gap-2">
          <select id="avviso-categoria" class="input-dsd flex-1 text-xs">
            ${allenatore.categorie.map(function (c) { return `<option value="${pulisciTesto(c)}">${pulisciTesto(c)}</option>`; }).join("")}
          </select>
          <button type="button" id="avviso-pubblica" class="btn-dsd-primary text-xs py-2 px-4 shrink-0">Pubblica</button>
        </div>
        <p class="text-[11px] text-[#7A8285]">Le famiglie della categoria lo vedono nella loro Home.</p>
      </div>` : ""}
      <div class="flex flex-col gap-2">
        ${avvisi.map(function (avviso) { return htmlAvvisoBacheca(avviso, avviso.autore === nomeAutore); }).join("") || `<p class="text-sm text-[#7A8285]">Nessun avviso.</p>`}
      </div>
    </section>
  `;

  if (allenatore.categorie.length === 0) {
    htmlAccumulato += `<p class="pannello-scheda text-sm text-[#7A8285]">Non hai ancora categorie assegnate: chiedi alla segreteria.</p>`;
  }

  allenatore.categorie.forEach(function (categoria) {
    const atleti = atletiCategoria(categoria);
    const nonIdonei = atleti.filter(function (atleta) {
      return idoneitaAtleta(atleta).livello === "non-idoneo";
    }).length;
    const prossima = convocazioniFuture(categoria)[0];
    const orari = testoOrari(categoria);
    const prossimoAll = prossimoAllenamento(categoria);

    let rosaHtml = "";
    atleti.forEach(function (atleta) {
      const dettagli = [atleta.ruolo, atleta.numeroMaglia ? `n° ${atleta.numeroMaglia}` : "", annataAtleta(atleta)].filter(function (d) { return d; });
      const presenze = presenzeAtleta(atleta);
      rosaHtml += `
        <div class="flex items-center justify-between gap-3 px-4 py-3 bg-white">
          <div class="flex items-center gap-3 min-w-0">
            ${htmlAvatar(atleta, "w-12 h-12")}
            <div class="min-w-0">
              <p class="text-sm font-bold text-[#12181B] truncate">${pulisciTesto(atleta.cognome)} ${pulisciTesto(atleta.nome)}</p>
              <p class="text-xs text-[#7A8285] truncate">${pulisciTesto(dettagli.join(" • "))}${presenze.percentuale !== null ? ` • presenze ${presenze.percentuale}%` : ""}</p>
              <p class="mt-1">${htmlIdoneita(atleta)}${htmlConsensoFoto(atleta)}</p>
            </div>
          </div>
          <div class="flex items-center gap-1 shrink-0">${htmlContattiAtleta(atleta)}</div>
        </div>
      `;
    });
    if (rosaHtml === "") rosaHtml = `<p class="px-4 py-6 text-sm text-[#7A8285] text-center bg-white">Nessun atleta in questa categoria.</p>`;

    htmlAccumulato += `
      <section class="mb-8">
        <div class="flex items-end justify-between gap-3 mb-3">
          <div>
            <h2 class="text-xl font-bold text-[#12181B]">${pulisciTesto(categoria)}</h2>
            <p class="text-xs text-[#7A8285]">${atleti.length} atleti • ${nonIdonei === 0 ? "tutti idonei" : `<b class="text-[#C94141]">${nonIdonei} non ${nonIdonei === 1 ? "idoneo" : "idonei"}</b>`}${orari ? ` • allenamenti ${pulisciTesto(orari)}` : ""}</p>
          </div>
          <button type="button" data-appello="${pulisciTesto(categoria)}" class="btn-dsd-primary text-xs py-2 px-4 shrink-0">Fai l'appello</button>
        </div>
        ${prossimoAll ? `<p class="text-xs bg-white border border-[#E7EBEC] px-4 py-2 mb-2">Prossimo allenamento: <b>${pulisciTesto(testoAllenamento(prossimoAll))}</b>${prossimoAll.stato !== "regolare" ? ` <span class="etichetta-variazione">${prossimoAll.stato === "aggiunto" ? "In più" : "Variato"}</span>` : ""}</p>` : ""}
        ${prossima ? `<p class="text-xs bg-[#12181B] text-[#F2F4F4] px-4 py-2 mb-2">Prossimo impegno: <b>${pulisciTesto(prossima.evento)}</b> • ${dataEstesa(prossima.data)} alle ${pulisciTesto(prossima.ora)} • ${prossima.convocati.length} convocati</p>` : ""}
        <div class="border border-[#E7EBEC] divide-y divide-[#E7EBEC] shadow-xs">${rosaHtml}</div>
      </section>
    `;
  });

  return htmlAccumulato;
}

// 2-bis. SCHEDA "ALLENAMENTI": orari, settimana e variazioni
function renderAllenamenti(allenatore) {
  if (allenatore.categorie.length === 0) return `<p class="pannello-scheda text-sm text-[#7A8285]">Nessuna categoria assegnata.</p>`;
  const lunedi = lunediDi(oggiIso());

  let htmlAccumulato = `
    <h1 class="text-2xl font-bold text-[#12181B] mb-1">Allenamenti</h1>
    <p class="text-xs text-[#7A8285] mb-3">Allenamenti e partite delle tue squadre. Gli orari fissi li imposta la segreteria; qui segnali le variazioni di una data e le famiglie le vedono subito.</p>
    <button type="button" id="all-calendario" class="btn-dsd-secondary text-xs py-2 px-4 mb-4">Aggiungi al calendario del telefono</button>
  `;

  allenatore.categorie.forEach(function (categoria) {
    const orari = testoOrari(categoria);
    htmlAccumulato += `
      <section class="pannello-scheda mb-4">
        <h3 class="titolo-pannello">${pulisciTesto(categoria)}</h3>
        <p class="text-sm text-[#12181B] mb-3">${orari ? pulisciTesto(orari.charAt(0).toUpperCase() + orari.slice(1)) : "Orari non ancora impostati dalla segreteria."}</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p class="font-mono text-[10px] uppercase text-[#7A8285]">Questa settimana • ${testoSettimana(lunedi)}</p>
            ${htmlSettimana(categoria, lunedi, { mostraConflitti: true })}
          </div>
          <div>
            <p class="font-mono text-[10px] uppercase text-[#7A8285]">Prossima settimana • ${testoSettimana(aggiungiGiorni(lunedi, 7))}</p>
            ${htmlSettimana(categoria, aggiungiGiorni(lunedi, 7), { mostraConflitti: true })}
          </div>
        </div>
      </section>
    `;
  });

  htmlAccumulato += `
    <section class="pannello-scheda mb-4">
      <h3 class="titolo-pannello">Segnala una variazione</h3>
      ${htmlModuloVariazione(allenatore.categorie, "all-var")}
      <button type="button" id="all-var-salva" class="btn-dsd-primary w-full py-3 text-sm mt-4">Salva la variazione</button>
    </section>

    <section class="pannello-scheda">
      <h3 class="titolo-pannello">Variazioni in programma</h3>
      <div id="all-var-elenco">${htmlElencoVariazioni(allenatore.categorie)}</div>
    </section>
  `;

  return htmlAccumulato;
}

// 3. SCHEDA "PRESENZE" (l'appello dell'allenamento)
// Per ogni atleta: presente, assente oppure assente giustificato
function allenamentoEsistente(categoria, data) {
  return configurazioneAttiva.presenze.find(function (allenamento) {
    return allenamento.categoria === categoria && allenamento.data === data;
  });
}

function renderPresenze(allenatore) {
  if (allenatore.categorie.indexOf(categoriaPresenze) === -1) categoriaPresenze = allenatore.categorie[0] || "";
  if (!categoriaPresenze) return `<p class="pannello-scheda text-sm text-[#7A8285]">Nessuna categoria assegnata.</p>`;
  if (!dataPresenze) dataPresenze = dataAllenamentoProposta(categoriaPresenze);

  const allenamento = allenamentoEsistente(categoriaPresenze, dataPresenze);
  const presenti = allenamento ? allenamento.presenti : [];
  const giustificati = allenamento ? (allenamento.giustificati || []) : [];

  let righeHtml = "";
  atletiCategoria(categoriaPresenze).forEach(function (atleta) {
    const idoneita = idoneitaAtleta(atleta);
    const presente = presenti.indexOf(atleta.id) !== -1;
    righeHtml += `
      <div class="riga-presenza">
        <input type="checkbox" id="pres-${atleta.id}" data-presente="${atleta.id}" ${presente ? "checked" : ""} class="accent-[#4E9EAF] w-5 h-5 cursor-pointer" />
        <label for="pres-${atleta.id}" class="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
          ${htmlAvatar(atleta, "w-10 h-10")}
          <span class="min-w-0">
            <strong class="block text-sm truncate">${pulisciTesto(atleta.cognome)} ${pulisciTesto(atleta.nome)}</strong>
            ${idoneita.livello === "non-idoneo" ? `<small class="block text-[11px] font-bold text-[#C94141]">${pulisciTesto(idoneita.testo)}: non può allenarsi</small>` : ""}
          </span>
        </label>
        <label class="scelta-giustificato ${presente ? "invisible" : ""}">
          <input type="checkbox" data-giustificato="${atleta.id}" ${giustificati.indexOf(atleta.id) !== -1 ? "checked" : ""} class="accent-[#A9750F] w-4 h-4" />
          giustificato
        </label>
      </div>
    `;
  });

  // Storico degli ultimi allenamenti della categoria
  let storicoHtml = "";
  const totaleAtleti = atletiCategoria(categoriaPresenze).length;
  allenamentiCategoria(categoriaPresenze).slice(0, 8).forEach(function (voce) {
    const giust = (voce.giustificati || []).length;
    storicoHtml += `
      <button type="button" data-apri-allenamento="${voce.data}" class="flex items-center justify-between w-full text-left py-2 border-b border-[#E7EBEC] last:border-b-0 cursor-pointer hover:text-[#4E9EAF]">
        <span class="text-sm">${dataEstesa(voce.data)}</span>
        <span class="font-mono text-sm">${voce.presenti.length}/${totaleAtleti}${giust > 0 ? ` <small class="text-[#A9750F]">+${giust} giust.</small>` : ""}</span>
      </button>
    `;
  });

  const orari = testoOrari(categoriaPresenze);

  return `
    <section class="mb-4">
      <h1 class="text-2xl font-bold text-[#12181B] mb-1">Appello dell'allenamento</h1>
      <p class="text-xs text-[#7A8285] mb-3">${orari ? `Allenamenti: ${pulisciTesto(orari)}. ` : ""}Spunta chi c'è; per gli assenti puoi segnare se l'assenza è giustificata (non conta nella percentuale).</p>
      <div class="grid grid-cols-2 gap-3">
        <label class="text-xs text-[#7A8285]">Categoria
          <select id="presenze-categoria" class="input-dsd w-full mt-1">
            ${allenatore.categorie.map(function (categoria) {
              return `<option value="${pulisciTesto(categoria)}" ${categoria === categoriaPresenze ? "selected" : ""}>${pulisciTesto(categoria)}</option>`;
            }).join("")}
          </select>
        </label>
        <label class="text-xs text-[#7A8285]">Data
          <input type="text" id="presenze-data" inputmode="numeric" maxlength="10" value="${dataInItaliano(dataPresenze)}" class="input-dsd w-full mt-1 font-mono campo-data" />
        </label>
      </div>
      ${allenamento ? `<p class="text-xs text-[#4E9EAF] font-bold mt-2">Appello già salvato: puoi correggerlo.</p>` : ""}
    </section>

    <div class="flex items-center justify-between gap-3 mb-2">
      <button type="button" id="presenze-tutti" class="text-xs font-bold text-[#4E9EAF] hover:underline cursor-pointer">Segna tutti presenti</button>
      <span id="presenze-conteggio" class="font-mono text-xs text-[#7A8285]"></span>
    </div>
    <div class="border border-[#E7EBEC] divide-y divide-[#E7EBEC] bg-white shadow-xs mb-4">${righeHtml || `<p class="px-4 py-6 text-sm text-[#7A8285] text-center">Nessun atleta.</p>`}</div>
    <button type="button" id="presenze-salva" class="btn-dsd-primary w-full py-3 text-sm mb-8">Salva presenze</button>

    <section class="pannello-scheda">
      <h3 class="titolo-pannello">Ultimi allenamenti</h3>
      ${storicoHtml || `<p class="text-sm text-[#7A8285]">Nessun allenamento registrato.</p>`}
    </section>
  `;
}

function aggiornaConteggioPresenze() {
  const caselle = document.querySelectorAll("[data-presente]");
  const spuntate = document.querySelectorAll("[data-presente]:checked");
  document.getElementById("presenze-conteggio").textContent = `${spuntate.length} presenti su ${caselle.length}`;

  // "giustificato" ha senso solo per chi è assente
  caselle.forEach(function (casella) {
    const giustificato = document.querySelector(`[data-giustificato="${casella.getAttribute("data-presente")}"]`);
    giustificato.closest("label").classList.toggle("invisible", casella.checked);
    if (casella.checked) giustificato.checked = false;
  });
}

function salvaPresenze() {
  const data = dataDaItaliano(document.getElementById("presenze-data").value.trim());
  if (!data) {
    mostraAvviso("Scrivi la data dell'allenamento così: gg/mm/aaaa.", "errore");
    return;
  }

  const presenti = [];
  document.querySelectorAll("[data-presente]:checked").forEach(function (casella) {
    presenti.push(casella.getAttribute("data-presente"));
  });
  const giustificati = [];
  document.querySelectorAll("[data-giustificato]:checked").forEach(function (casella) {
    giustificati.push(casella.getAttribute("data-giustificato"));
  });

  // Si rileggono i dati (un'altra area potrebbe averli appena cambiati)
  ricaricaDati();
  const esistente = allenamentoEsistente(categoriaPresenze, data);
  if (esistente) {
    esistente.presenti = presenti;
    esistente.giustificati = giustificati;
  } else {
    configurazioneAttiva.presenze.push({ id: creaId("pres"), categoria: categoriaPresenze, data: data, presenti: presenti, giustificati: giustificati, allenatoreId: allenatoreAttivo });
  }

  if (!salvaConfigurazione()) return;
  dataPresenze = data;
  renderArea();
  mostraAvviso(`Presenze salvate: ${presenti.length} presenti${giustificati.length > 0 ? `, ${giustificati.length} giustificati` : ""}.`, "ok");
}

// 4. SCHEDA "CONVOCAZIONI"
function renderConvocazioni(allenatore) {
  if (allenatore.categorie.length === 0) return `<p class="pannello-scheda text-sm text-[#7A8285]">Nessuna categoria assegnata.</p>`;

  // In modifica il modulo parte con i dati della convocazione
  const bozza = convocazioneInModifica ? trovaConvocazione(convocazioneInModifica) : null;
  if (bozza) categoriaPresenze = bozza.categoria;
  const categoria = allenatore.categorie.indexOf(categoriaPresenze) !== -1 ? categoriaPresenze : allenatore.categorie[0];

  // Elenco atleti: chi non è idoneo non si può convocare
  let atletiHtml = "";
  atletiCategoria(categoria).forEach(function (atleta) {
    const idoneita = idoneitaAtleta(atleta);
    const bloccato = idoneita.livello === "non-idoneo";
    const scelto = bozza && bozza.convocati.indexOf(atleta.id) !== -1 && !bloccato;
    atletiHtml += `
      <label class="riga-presenza ${bloccato ? "riga-presenza--bloccata" : ""}">
        <input type="checkbox" data-convocato="${atleta.id}" ${bloccato ? "disabled" : ""} ${scelto ? "checked" : ""} class="accent-[#4E9EAF] w-5 h-5" />
        ${htmlAvatar(atleta, "w-10 h-10")}
        <span class="flex-1 min-w-0">
          <strong class="block text-sm truncate">${pulisciTesto(atleta.cognome)} ${pulisciTesto(atleta.nome)}</strong>
          ${bloccato ? `<small class="block text-[11px] font-bold text-[#C94141]">${pulisciTesto(idoneita.testo)}: non convocabile</small>` : `<small class="block text-[11px] text-[#7A8285]">${pulisciTesto(atleta.ruolo || "")}</small>`}
        </span>
      </label>
    `;
  });

  // Convocazioni già fatte (dalla più vicina), con le risposte delle famiglie
  let elencoHtml = "";
  configurazioneAttiva.convocazioni.filter(function (convocazione) {
    return allenatore.categorie.indexOf(convocazione.categoria) !== -1 && convocazione.data >= oggiIso();
  }).sort(function (a, b) {
    return (a.data + a.ora) < (b.data + b.ora) ? -1 : 1;
  }).forEach(function (convocazione) {
    let si = 0;
    let no = 0;
    let convocatiHtml = "";
    convocazione.convocati.forEach(function (id) {
      const atleta = trovaAtleta(id);
      if (!atleta) return;
      const risposta = rispostaConvocazione(convocazione, id);
      if (risposta === "si") si++;
      if (risposta === "no") no++;
      const contatto = contattoScadenza({ staff: false, id: atleta.id });
      const numero = contatto ? numeroWhatsApp(contatto.telefono) : "";
      convocatiHtml += `
        <li class="flex items-center justify-between gap-2 py-1.5 border-b border-[#E7EBEC] last:border-b-0">
          <span class="text-sm min-w-0 truncate">${pulisciTesto(atleta.cognome)} ${pulisciTesto(atleta.nome)}${htmlConsensoFoto(atleta)}</span>
          <span class="flex items-center gap-2 shrink-0">
            ${htmlRisposta(risposta)}
            ${numero
              ? `<a href="https://wa.me/${numero}?text=${encodeURIComponent(testoConvocazione(convocazione, atleta))}" target="_blank" rel="noopener" class="azione-contatto" title="Avvisa la famiglia su WhatsApp">${iconaChat}</a>`
              : `<span class="azione-contatto azione-contatto--spenta" title="Nessun telefono">${iconaChat}</span>`}
          </span>
        </li>
      `;
    });
    const inAttesa = convocazione.convocati.length - si - no;

    elencoHtml += `
      <article class="pannello-scheda mb-4">
        <p class="font-mono text-[10px] uppercase text-[#4E9EAF] font-bold">${pulisciTesto(convocazione.categoria)}</p>
        <h3 class="text-lg font-bold text-[#12181B]">${pulisciTesto(convocazione.evento)}</h3>
        <p class="text-sm text-[#7A8285]">${dataEstesa(convocazione.data)} • ritrovo alle ${pulisciTesto(convocazione.ora)}${convocazione.luogo ? " • " + pulisciTesto(convocazione.luogo) : ""}</p>
        <p class="text-xs font-bold mt-2 mb-3"><span class="text-[#2F636F]">${si} ci saranno</span> • <span class="text-[#C94141]">${no} assenti</span> • <span class="text-[#7A8285]">${inAttesa} in attesa</span></p>
        <ul class="mb-3">${convocatiHtml}</ul>
        <div class="flex flex-wrap items-center gap-3">
          <button type="button" data-copia-convocazione="${convocazione.id}" class="btn-dsd-secondary text-xs py-2 px-4">Copia il messaggio per il gruppo</button>
          <button type="button" data-modifica-convocazione="${convocazione.id}" class="text-xs font-bold text-[#4E9EAF] hover:underline cursor-pointer">Modifica</button>
          <button type="button" data-elimina-convocazione="${convocazione.id}" class="text-xs text-[#7A8285] hover:text-[#C94141] underline cursor-pointer">Elimina</button>
        </div>
      </article>
    `;
  });

  const valore = function (campo) { return bozza ? pulisciTesto(bozza[campo] || "") : ""; };

  return `
    <section class="pannello-scheda mb-8 ${bozza ? "pannello-in-modifica" : ""}">
      <h1 class="text-2xl font-bold text-[#12181B] mb-1">${bozza ? "Modifica convocazione" : "Nuova convocazione"}</h1>
      <p class="text-xs text-[#7A8285] mb-4">Gli atleti senza visita medica valida non si possono convocare.${bozza ? " Le risposte già date dalle famiglie restano." : ""}</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <label class="text-xs text-[#7A8285]">Categoria
          <select id="conv-categoria" class="input-dsd w-full mt-1" ${bozza ? "disabled" : ""}>
            ${allenatore.categorie.map(function (c) {
              return `<option value="${pulisciTesto(c)}" ${c === categoria ? "selected" : ""}>${pulisciTesto(c)}</option>`;
            }).join("")}
          </select>
        </label>
        <label class="text-xs text-[#7A8285]">Partita o evento
          <input type="text" id="conv-evento" value="${valore("evento")}" placeholder="es. Partita contro Soresinese" class="input-dsd w-full mt-1" />
        </label>
        <label class="text-xs text-[#7A8285]">Data
          <input type="text" id="conv-data" value="${bozza ? dataInItaliano(bozza.data) : ""}" inputmode="numeric" maxlength="10" placeholder="gg/mm/aaaa" class="input-dsd w-full mt-1 font-mono campo-data" />
        </label>
        <label class="text-xs text-[#7A8285]">Ora di ritrovo
          <input type="text" id="conv-ora" value="${valore("ora")}" placeholder="es. 14:30" maxlength="5" class="input-dsd w-full mt-1 font-mono" />
        </label>
        <label class="text-xs text-[#7A8285] sm:col-span-2">Luogo
          <input type="text" id="conv-luogo" value="${valore("luogo")}" placeholder="es. Campo comunale di Castelverde" class="input-dsd w-full mt-1" />
        </label>
        <label class="text-xs text-[#7A8285] sm:col-span-2">Note per le famiglie
          <input type="text" id="conv-note" value="${valore("note")}" placeholder="es. Portare la divisa da gara" class="input-dsd w-full mt-1" />
        </label>
      </div>
      <div class="border border-[#E7EBEC] divide-y divide-[#E7EBEC] mb-4">${atletiHtml || `<p class="px-4 py-6 text-sm text-[#7A8285] text-center">Nessun atleta.</p>`}</div>
      <div class="flex gap-3">
        ${bozza ? `<button type="button" id="conv-annulla" class="btn-dsd-secondary py-3 px-5 text-sm">Annulla</button>` : ""}
        <button type="button" id="conv-salva" class="btn-dsd-primary flex-1 py-3 text-sm">${bozza ? "Salva le modifiche" : "Salva convocazione"}</button>
      </div>
    </section>

    <h2 class="text-xl font-bold text-[#12181B] mb-3">Prossime convocazioni</h2>
    ${elencoHtml || `<p class="text-sm text-[#7A8285]">Nessuna convocazione in programma.</p>`}
  `;
}

function salvaConvocazione() {
  const data = dataDaItaliano(document.getElementById("conv-data").value.trim());
  const ora = document.getElementById("conv-ora").value.trim();
  const evento = document.getElementById("conv-evento").value.trim();
  const convocati = [];
  document.querySelectorAll("[data-convocato]:checked").forEach(function (casella) {
    convocati.push(casella.getAttribute("data-convocato"));
  });

  if (!evento || !data || !/^\d{1,2}[:.]\d{2}$/.test(ora)) {
    mostraAvviso("Compila evento, data (gg/mm/aaaa) e ora di ritrovo (es. 14:30).", "errore");
    return;
  }
  if (data < oggiIso()) {
    mostraAvviso("La data della convocazione è già passata.", "errore");
    return;
  }
  if (convocati.length === 0) {
    mostraAvviso("Scegli almeno un atleta da convocare.", "errore");
    return;
  }

  const dati = {
    data: data,
    ora: ora.replace(".", ":"),
    evento: evento,
    luogo: document.getElementById("conv-luogo").value.trim(),
    note: document.getElementById("conv-note").value.trim(),
    convocati: convocati,
  };

  // Si rileggono i dati: le famiglie potrebbero aver appena risposto
  ricaricaDati();
  const esistente = convocazioneInModifica ? trovaConvocazione(convocazioneInModifica) : null;
  if (esistente) {
    Object.assign(esistente, dati);
  } else {
    dati.id = creaId("conv");
    dati.categoria = document.getElementById("conv-categoria").value;
    dati.risposte = {};
    dati.allenatoreId = allenatoreAttivo;
    configurazioneAttiva.convocazioni.push(dati);
  }

  if (!salvaConfigurazione()) return;
  convocazioneInModifica = null;
  renderArea();
  mostraAvviso(esistente ? "Convocazione aggiornata: avvisa le famiglie del cambio." : `Convocazione salvata: ${convocati.length} convocati. Ora puoi avvisare le famiglie.`, "ok");
}

// Il messaggio unico per il gruppo WhatsApp della squadra
function copiaConvocazione(id) {
  const convocazione = trovaConvocazione(id);
  const nomi = convocazione.convocati.map(function (idAtleta) {
    const atleta = trovaAtleta(idAtleta);
    return atleta ? `- ${atleta.cognome} ${atleta.nome}` : "";
  }).filter(function (riga) { return riga; });

  const testo = `CONVOCAZIONE ${convocazione.categoria.toUpperCase()}\n${convocazione.evento}\n` +
    `${dataEstesa(convocazione.data)}, ritrovo alle ${convocazione.ora}${convocazione.luogo ? " a " + convocazione.luogo : ""}\n\n` +
    `${nomi.join("\n")}${convocazione.note ? "\n\n" + convocazione.note : ""}\n\nRispondete dall'area famiglie del portale: ci sarà / non ci sarà.`;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(testo).then(function () {
      mostraAvviso("Messaggio copiato: incollalo nel gruppo della squadra.", "ok");
    }, function () {
      mostraAvviso("Non riesco a copiare il testo da questo browser.", "errore");
    });
  }
}

// 5. SCHEDA "MATERIALE"
function renderMateriale(allenatore) {
  let htmlAccumulato = `
    <h1 class="text-2xl font-bold text-[#12181B] mb-1">Materiale da consegnare</h1>
    <p class="text-xs text-[#7A8285] mb-4">Prenotazioni aperte dei tuoi atleti. La consegna la registra la segreteria.</p>
  `;

  allenatore.categorie.forEach(function (categoria) {
    const idAtleti = atletiCategoria(categoria).map(function (atleta) { return atleta.id; });
    const prenotazioni = configurazioneAttiva.magazzino.prenotazioni.filter(function (pren) {
      return pren.stato === "aperta" && idAtleti.indexOf(pren.atletaId) !== -1;
    });

    let righeHtml = "";
    prenotazioni.forEach(function (pren) {
      const prodotto = trovaProdotto(pren.prodottoId);
      righeHtml += `
        <div class="flex items-center gap-3 px-4 py-3 bg-white">
          ${htmlMiniaturaProdotto(prodotto, "w-12 h-12")}
          <div class="min-w-0">
            <p class="text-sm font-bold truncate">${prodotto ? pulisciTesto(prodotto.nome) : "Prodotto eliminato"}</p>
            <p class="text-xs text-[#7A8285]">${pulisciTesto(nomeIntestatario(pren))} • taglia ${pulisciTesto(pren.taglia)} × ${pren.quantita}</p>
          </div>
        </div>
      `;
    });

    htmlAccumulato += `
      <section class="mb-6">
        <h2 class="text-lg font-bold text-[#12181B] mb-2">${pulisciTesto(categoria)}</h2>
        <div class="border border-[#E7EBEC] divide-y divide-[#E7EBEC] shadow-xs">${righeHtml || `<p class="px-4 py-4 text-sm text-[#7A8285] bg-white">Niente da consegnare.</p>`}</div>
      </section>
    `;
  });

  return htmlAccumulato;
}

// 6. DISEGNO DELL'AREA E PULSANTI
function renderArea() {
  const contenitore = document.getElementById("area-contenuto");
  const allenatore = allenatoreCorrente();

  document.querySelectorAll("[data-scheda]").forEach(function (voce) {
    voce.classList.toggle("voce-area--attiva", voce.getAttribute("data-scheda") === schedaAllenatore);
  });

  if (!allenatore) {
    contenitore.innerHTML = `<p class="pannello-scheda text-sm text-[#7A8285]">Nessun allenatore o dirigente: aggiungili dalla Segreteria, sezione Allenatori/Dirigenti.</p>`;
    return;
  }

  if (schedaAllenatore === "squadre") contenitore.innerHTML = renderSquadre(allenatore);
  if (schedaAllenatore === "allenamenti") contenitore.innerHTML = renderAllenamenti(allenatore);
  if (schedaAllenatore === "presenze") contenitore.innerHTML = renderPresenze(allenatore);
  if (schedaAllenatore === "convocazioni") contenitore.innerHTML = renderConvocazioni(allenatore);
  if (schedaAllenatore === "materiale") contenitore.innerHTML = renderMateriale(allenatore);

  collegaPulsantiArea();
}

function collegaPulsantiArea() {
  // Le date si scrivono gg/mm/aaaa: le barre si aggiungono da sole
  document.querySelectorAll(".campo-data").forEach(function (campo) {
    campo.oninput = function () { formattaCampoData(campo); };
  });

  // Bacheca
  const btnAvviso = document.getElementById("avviso-pubblica");
  if (btnAvviso) {
    btnAvviso.onclick = function () {
      const testo = document.getElementById("avviso-testo").value.trim();
      if (testo === "") {
        mostraAvviso("Scrivi il testo dell'avviso.", "errore");
        return;
      }
      const allenatore = allenatoreCorrente();
      const categoria = document.getElementById("avviso-categoria").value;
      ricaricaDati();
      pubblicaAvviso(testo, categoria, `${allenatore.nome} ${allenatore.cognome} (${(allenatore.ruolo || "staff").toLowerCase()})`);
      renderArea();
      mostraAvviso("Avviso pubblicato per le famiglie.", "ok");
    };
  }
  document.querySelectorAll("[data-elimina-avviso]").forEach(function (bottone) {
    bottone.onclick = function () {
      ricaricaDati();
      eliminaAvviso(bottone.getAttribute("data-elimina-avviso"));
      renderArea();
    };
  });

  // Variazioni degli allenamenti
  collegaModuloVariazione("all-var");
  const btnVariazione = document.getElementById("all-var-salva");
  if (btnVariazione) {
    btnVariazione.onclick = function () {
      const allenatore = allenatoreCorrente();
      const variazione = leggiModuloVariazione("all-var", `${allenatore.nome} ${allenatore.cognome} (${(allenatore.ruolo || "staff").toLowerCase()})`);
      if (!variazione) return;
      const avvisa = variazione.avvisa;
      ricaricaDati();
      const conflitti = salvaVariazione(variazione);
      renderArea();
      avvisoVariazioneSalvata(variazione, conflitti, avvisa);
    };
  }
  const btnCalendario = document.getElementById("all-calendario");
  if (btnCalendario) {
    btnCalendario.onclick = function () {
      const allenatore = allenatoreCorrente();
      scaricaCalendario(allenatore.categorie, `allenamenti ${allenatore.cognome}`);
    };
  }
  collegaCopiaVariazioni(document.getElementById("area-contenuto"));
  document.querySelectorAll("[data-elimina-variazione]").forEach(function (bottone) {
    bottone.onclick = function () {
      ricaricaDati();
      eliminaVariazione(bottone.getAttribute("data-elimina-variazione"));
      renderArea();
    };
  });

  document.querySelectorAll("[data-appello]").forEach(function (bottone) {
    bottone.onclick = function () {
      categoriaPresenze = bottone.getAttribute("data-appello");
      dataPresenze = dataAllenamentoProposta(categoriaPresenze);
      apriSchedaAllenatore("presenze");
    };
  });

  // Presenze
  const selectCategoria = document.getElementById("presenze-categoria");
  if (selectCategoria) {
    selectCategoria.onchange = function () {
      categoriaPresenze = selectCategoria.value;
      dataPresenze = dataAllenamentoProposta(categoriaPresenze);
      renderArea();
    };
    const campoData = document.getElementById("presenze-data");
    campoData.onchange = function () {
      const data = dataDaItaliano(campoData.value.trim());
      if (data) {
        dataPresenze = data;
        renderArea();
      }
    };
    document.querySelectorAll("[data-presente]").forEach(function (casella) {
      casella.onchange = aggiornaConteggioPresenze;
    });
    document.getElementById("presenze-tutti").onclick = function () {
      document.querySelectorAll("[data-presente]").forEach(function (casella) { casella.checked = true; });
      aggiornaConteggioPresenze();
    };
    document.getElementById("presenze-salva").onclick = salvaPresenze;
    document.querySelectorAll("[data-apri-allenamento]").forEach(function (bottone) {
      bottone.onclick = function () {
        dataPresenze = bottone.getAttribute("data-apri-allenamento");
        renderArea();
        window.scrollTo(0, 0);
      };
    });
    aggiornaConteggioPresenze();
  }

  // Convocazioni
  const selectConv = document.getElementById("conv-categoria");
  if (selectConv) {
    selectConv.onchange = function () {
      categoriaPresenze = selectConv.value;
      renderArea();
    };
    document.getElementById("conv-salva").onclick = salvaConvocazione;
    const btnAnnulla = document.getElementById("conv-annulla");
    if (btnAnnulla) {
      btnAnnulla.onclick = function () {
        convocazioneInModifica = null;
        renderArea();
      };
    }
  }
  document.querySelectorAll("[data-copia-convocazione]").forEach(function (bottone) {
    bottone.onclick = function () { copiaConvocazione(bottone.getAttribute("data-copia-convocazione")); };
  });
  document.querySelectorAll("[data-modifica-convocazione]").forEach(function (bottone) {
    bottone.onclick = function () {
      convocazioneInModifica = bottone.getAttribute("data-modifica-convocazione");
      renderArea();
      window.scrollTo(0, 0);
    };
  });
  document.querySelectorAll("[data-elimina-convocazione]").forEach(function (bottone) {
    bottone.onclick = function () {
      chiediConferma({ titolo: "Eliminare la convocazione?", testo: "Le famiglie non la vedranno più.", conferma: "Elimina", pericolo: true }, function () {
        ricaricaDati();
        configurazioneAttiva.convocazioni = configurazioneAttiva.convocazioni.filter(function (c) {
          return c.id !== bottone.getAttribute("data-elimina-convocazione");
        });
        if (convocazioneInModifica === bottone.getAttribute("data-elimina-convocazione")) convocazioneInModifica = null;
        salvaConfigurazione();
        renderArea();
      });
    };
  });
}

function apriSchedaAllenatore(nomeScheda) {
  schedaAllenatore = nomeScheda;
  convocazioneInModifica = null;
  renderArea();
  window.scrollTo(0, 0);
}

// 7. AVVIO
document.addEventListener("DOMContentLoaded", function () {
  initFinestre();
  inserisciBarraAree("allenatore");

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
  const scelta = document.getElementById("scelta-allenatore");
  const allenatori = config.allenatori.slice().sort(function (a, b) {
    return `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`, "it");
  });
  scelta.innerHTML = allenatori.map(function (a) {
    return `<option value="${a.id}">${pulisciTesto(a.nome)} ${pulisciTesto(a.cognome)}</option>`;
  }).join("");

  let ricordato = "";
  try { ricordato = localStorage.getItem("dsd_v4_accesso_allenatore") || ""; } catch (errore) { ricordato = ""; }
  allenatoreAttivo = trovaAllenatore(ricordato) ? ricordato : (allenatori[0] ? allenatori[0].id : null);
  scelta.value = allenatoreAttivo || "";

  scelta.onchange = function () {
    allenatoreAttivo = scelta.value;
    convocazioneInModifica = null;
    dataPresenze = "";
    try { localStorage.setItem("dsd_v4_accesso_allenatore", allenatoreAttivo); } catch (errore) { /* non importa */ }
    renderArea();
  };

  document.querySelectorAll("[data-scheda]").forEach(function (voce) {
    voce.onclick = function () { apriSchedaAllenatore(voce.getAttribute("data-scheda")); };
  });

  // Dati cambiati dalla segreteria o da una famiglia (in un'altra scheda del browser)
  gestisciDatiEsterni(renderArea);

  renderArea();
});
