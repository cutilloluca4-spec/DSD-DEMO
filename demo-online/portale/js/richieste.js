/* ==================================================================
   D.S.D. — richieste.js (Portale v4)
   Nella Panoramica della segreteria: le richieste arrivate dall'area
   Genitore/Atleta. Un documento nuovo si controlla e, con un clic,
   la sua scadenza viene aggiornata nella scheda dell'atleta.
   ================================================================== */

function renderRichieste() {
  const sezione = document.getElementById("sez-richieste");
  const nuove = richiesteNuove();

  // La sezione compare solo quando c'è qualcosa da guardare
  sezione.classList.toggle("hidden", nuove.length === 0);
  if (nuove.length === 0) return;

  let htmlAccumulato = "";
  nuove.forEach(function (richiesta) {
    const atleta = trovaAtleta(richiesta.atletaId);
    if (!atleta) return;

    htmlAccumulato += `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-white">
        <button type="button" data-apri-atleta="${atleta.id}" class="flex items-center gap-3 text-left min-w-0 cursor-pointer">
          ${htmlAvatar(atleta, "w-10 h-10")}
          <span class="min-w-0">
            <strong class="block text-sm text-[#12181B]">${pulisciTesto(titoloRichiesta(richiesta))} — ${pulisciTesto(nomeCompleto(atleta))}</strong>
            <small class="block text-xs text-[#7A8285]">${pulisciTesto(testoRichiesta(richiesta))} • arrivata il ${dataInItaliano(richiesta.data)}</small>
          </span>
        </button>
        <span class="flex gap-2 shrink-0">
          ${richiesta.tipo === "documento"
            ? `<button type="button" data-accetta-richiesta="${richiesta.id}" class="btn-dsd-primary text-[11px] py-1.5 px-3">Aggiorna la scadenza</button>
               <button type="button" data-rifiuta-richiesta="${richiesta.id}" class="btn-dsd-secondary text-[11px] py-1.5 px-3">Da rifare</button>`
            : `<button type="button" data-chiudi-richiesta="${richiesta.id}" class="btn-dsd-secondary text-[11px] py-1.5 px-3">Fatto</button>`}
        </span>
      </div>
    `;
  });

  const contenitore = document.getElementById("richieste-list");
  contenitore.innerHTML = htmlAccumulato;
  collegaAperturaSchede(contenitore);

  contenitore.querySelectorAll("[data-accetta-richiesta]").forEach(function (bottone) {
    bottone.onclick = function () {
      accettaRichiesta(bottone.getAttribute("data-accetta-richiesta"));
    };
  });
  contenitore.querySelectorAll("[data-rifiuta-richiesta]").forEach(function (bottone) {
    bottone.onclick = function () {
      rifiutaRichiesta(bottone.getAttribute("data-rifiuta-richiesta"));
    };
  });
  contenitore.querySelectorAll("[data-chiudi-richiesta]").forEach(function (bottone) {
    bottone.onclick = function () {
      chiudiRichiesta(bottone.getAttribute("data-chiudi-richiesta"));
    };
  });
}

function trovaRichiesta(id) {
  return configurazioneAttiva.richieste.find(function (richiesta) {
    return richiesta.id === id;
  });
}

// Documento controllato: la nuova scadenza va nella scheda dell'atleta
function accettaRichiesta(id) {
  const richiesta = trovaRichiesta(id);
  const atleta = trovaAtleta(richiesta.atletaId);

  atleta.documenti.forEach(function (doc) {
    if (doc.tipo === richiesta.documento) doc.scadenza = richiesta.scadenza;
  });
  richiesta.stato = "accettata";

  salvaConfigurazione();
  aggiornaTutto();
  mostraAvviso(`${etichettaDocumento(richiesta.documento)} di ${nomeCompleto(atleta)} aggiornata: scade il ${dataInItaliano(richiesta.scadenza)}.`, "ok");
}

// Documento non valido (illeggibile, scaduto, sbagliato): la famiglia legge il motivo
function rifiutaRichiesta(id) {
  const richiesta = trovaRichiesta(id);
  chiediTesto({
    titolo: "Documento da rifare",
    testo: "Scrivi in breve il motivo: la famiglia lo legge nella sua area e può inviarlo di nuovo.",
    esempio: "es. La foto è illeggibile, manca la seconda pagina",
    conferma: "Invia alla famiglia",
  }, function (motivo) {
    richiesta.stato = "rifiutata";
    richiesta.motivo = motivo;
    salvaConfigurazione();
    aggiornaTutto();
    mostraAvviso("La famiglia vedrà che il documento è da rifare.", "info");
  });
}

function chiudiRichiesta(id) {
  trovaRichiesta(id).stato = "accettata";
  salvaConfigurazione();
  aggiornaTutto();
}
