/* ==================================================================
   D.S.D. — ricevute.js (Portale v4)
   Ricevuta della quota, pronta da stampare (o salvare in PDF dalla
   finestra di stampa del browser). Contiene i dati che servono alle
   famiglie per la detrazione delle spese sportive dei ragazzi da 5 a
   18 anni: dati della società, dati di chi paga, codice fiscale del
   ragazzo, causale, importo e metodo di pagamento.
   ================================================================== */

// Pagamento aperto nella finestra della ricevuta
let ricevutaAperta = null;   // { atletaId, indice }

// 1. NUMERO DELLA RICEVUTA
// Es. "3/2026": terza ricevuta della stagione 2026/27. Riparte da 1 a ogni stagione.
function prossimoNumeroRicevuta() {
  const config = configurazioneAttiva;
  const contatore = config.contatoreRicevute;

  if (contatore.stagione !== config.stagione) {
    contatore.stagione = config.stagione;
    contatore.ultimo = 0;
  }
  contatore.ultimo++;
  return `${contatore.ultimo}/${String(config.stagione).slice(0, 4)}`;
}

// 2. FINESTRA DELLA RICEVUTA
function apriRicevuta(atletaId, indice) {
  const atleta = trovaAtleta(atletaId);
  const pagamento = atleta ? atleta.quota.pagamenti[indice] : null;
  if (!pagamento) return;

  // Pagamenti registrati prima delle ricevute: il numero si assegna ora
  if (!pagamento.numero) {
    pagamento.numero = prossimoNumeroRicevuta();
    salvaConfigurazione();
  }

  ricevutaAperta = { atletaId: atletaId, indice: indice };
  const dati = datiRicevuta(atleta, pagamento);

  impostaCampo("ric-pagante", dati.pagante);
  impostaCampo("ric-pagante-cf", dati.paganteCF);
  impostaCampo("ric-causale", dati.causale);
  impostaCampo("ric-metodo", dati.metodo);

  renderAnteprimaRicevuta();
  apriFinestra(document.getElementById("finestra-ricevuta"));
}

function chiudiRicevuta() {
  chiudiFinestra(document.getElementById("finestra-ricevuta"));
  ricevutaAperta = null;
}

// Dati proposti per la ricevuta: quelli salvati, altrimenti quelli più probabili.
// Chi paga: di solito il genitore per i minorenni, l'atleta stesso per gli adulti
function datiRicevuta(atleta, pagamento) {
  const minorenne = eMinorenne(atleta);
  return {
    pagante: pagamento.pagante || (minorenne ? atleta.tutore.nome : nomeCompleto(atleta)),
    paganteCF: pagamento.paganteCF || (minorenne ? atleta.tutore.codiceFiscale : atleta.codiceFiscale) || "",
    causale: pagamento.causale ||
      `Quota associativa stagione ${configurazioneAttiva.stagione} per attività sportiva dilettantistica, categoria ${atleta.categoria}`,
    metodo: pagamento.metodo || "Bonifico",
  };
}

// Il foglio della ricevuta (usato dalla segreteria e dall'area Famiglia)
function htmlFoglioRicevuta(atleta, pagamento, dati) {
  const config = configurazioneAttiva;
  const eta = calcolaEta(atleta.dataNascita);

  const datiSocieta = [
    config.contatti.indirizzo,
    config.contatti.codiceFiscale ? `C.F./P.IVA ${config.contatti.codiceFiscale}` : "",
    config.contatti.codiceAffiliazione ? `Affiliazione ${config.contatti.codiceAffiliazione}` : "",
    [config.contatti.telefono, config.contatti.email].filter(function (dato) { return dato; }).join(" • "),
  ].filter(function (dato) { return dato; });

  return `
    <div class="flex items-start justify-between gap-6 pb-5 border-b-2 border-[#12181B]">
      <div class="flex items-center gap-4">
        ${config.logo ? `<img src="${config.logo}" alt="" class="w-16 h-16 object-contain" />` : ""}
        <div>
          <p class="text-lg font-bold text-[#12181B]">${pulisciTesto(config.nomeSocieta || "Nome della società")}</p>
          ${datiSocieta.map(function (riga) { return `<p class="text-[11px] text-[#7A8285]">${pulisciTesto(riga)}</p>`; }).join("")}
        </div>
      </div>
      <div class="text-right shrink-0">
        <p class="font-mono text-[10px] uppercase text-[#7A8285]">Ricevuta n.</p>
        <p class="font-mono text-lg font-bold">${pulisciTesto(pagamento.numero || "—")}</p>
        <p class="text-xs text-[#7A8285]">${dataInItaliano(pagamento.data)}</p>
      </div>
    </div>

    <div class="py-5 text-sm leading-relaxed text-[#12181B] space-y-3">
      <p>Si dichiara di aver ricevuto da <strong>${pulisciTesto(dati.pagante) || "—"}</strong>${dati.paganteCF ? `, C.F. <span class="font-mono">${pulisciTesto(dati.paganteCF.toUpperCase())}</span>` : ""},</p>
      <p>la somma di <strong class="font-mono text-base">${formattaEuro(pagamento.importo)}</strong></p>
      <p>a titolo di: ${pulisciTesto(dati.causale)}</p>
      <p>per l'atleta <strong>${pulisciTesto(nomeCompleto(atleta))}</strong>${atleta.dataNascita ? `, nato/a il ${dataInItaliano(atleta.dataNascita)}` : ""}${atleta.codiceFiscale ? `, C.F. <span class="font-mono">${pulisciTesto(atleta.codiceFiscale)}</span>` : ""}.</p>
      <p>Pagamento effettuato con: <strong>${pulisciTesto(dati.metodo)}</strong>.</p>
    </div>

    <div class="flex items-end justify-between gap-6 pt-4">
      <div class="text-[10px] text-[#7A8285] max-w-xs space-y-2">
        ${pagamento.importo > 77.47 ? `<p class="border border-dashed border-[#CFD5D6] px-3 py-4 text-center">Spazio per la marca da bollo da € 2,00<br>(importi oltre € 77,47)</p>` : ""}
        ${eta !== null && eta >= 5 && eta <= 18 && dati.metodo !== "Contanti" ? `<p>Spesa per attività sportiva di ragazzi tra 5 e 18 anni, pagata con metodo tracciabile.</p>` : ""}
      </div>
      <div class="text-center">
        <div class="w-48 border-b border-[#12181B] h-12"></div>
        <p class="text-[10px] text-[#7A8285] mt-1">Timbro e firma</p>
      </div>
    </div>
  `;
}

// L'anteprima nella finestra della segreteria, aggiornata mentre si scrive
function renderAnteprimaRicevuta() {
  const config = configurazioneAttiva;
  const atleta = trovaAtleta(ricevutaAperta.atletaId);
  const pagamento = atleta.quota.pagamenti[ricevutaAperta.indice];
  const dati = {
    pagante: valoreCampo("ric-pagante"),
    paganteCF: valoreCampo("ric-pagante-cf"),
    causale: valoreCampo("ric-causale"),
    metodo: valoreCampo("ric-metodo"),
  };

  document.getElementById("ricevuta-foglio").innerHTML = htmlFoglioRicevuta(atleta, pagamento, dati);

  // Avvisi solo a schermo (non si stampano)
  const avvisi = [];
  if (dati.metodo === "Contanti") avvisi.push("Pagato in contanti: per la famiglia la spesa non è detraibile.");
  if (!atleta.codiceFiscale) avvisi.push("Manca il codice fiscale dell'atleta: serve alla famiglia per la detrazione.");
  if (!dati.paganteCF) avvisi.push("Manca il codice fiscale di chi paga.");
  if (!config.contatti.codiceFiscale) avvisi.push("Manca il codice fiscale della società: aggiungilo in Società → Dati.");

  document.getElementById("ricevuta-avvisi").innerHTML = avvisi.map(function (testo) {
    return `<p>${testo}</p>`;
  }).join("");
}

// Salva i dati scritti (così la prossima volta sono già pronti) e stampa
function stampaRicevuta() {
  const atleta = trovaAtleta(ricevutaAperta.atletaId);
  const pagamento = atleta.quota.pagamenti[ricevutaAperta.indice];

  pagamento.pagante = valoreCampo("ric-pagante");
  pagamento.paganteCF = valoreCampo("ric-pagante-cf").toUpperCase();
  pagamento.causale = valoreCampo("ric-causale");
  pagamento.metodo = valoreCampo("ric-metodo");
  if (eMinorenne(atleta) && pagamento.paganteCF) atleta.tutore.codiceFiscale = pagamento.paganteCF;
  salvaConfigurazione();
  aggiornaTutto();

  // Durante la stampa si vede solo il foglio della ricevuta (vedi style.css)
  document.body.classList.add("stampa-ricevuta");
  window.print();
  document.body.classList.remove("stampa-ricevuta");
}

// 3. AVVIO
function initRicevute() {
  document.getElementById("ricevuta-chiudi").onclick = chiudiRicevuta;
  document.getElementById("ricevuta-stampa").onclick = stampaRicevuta;

  ["ric-pagante", "ric-pagante-cf", "ric-causale", "ric-metodo"].forEach(function (id) {
    document.getElementById(id).oninput = renderAnteprimaRicevuta;
  });
}
