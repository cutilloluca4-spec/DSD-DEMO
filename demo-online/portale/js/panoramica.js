/* ==================================================================
   D.S.D. — panoramica.js (Portale v4)
   In cima alla Panoramica il riquadro "Oggi": allenamenti di oggi,
   partite dei prossimi giorni e le cose da guardare subito (richieste
   delle famiglie, scadenze urgenti, campi occupati due volte).
   Le altre sezioni si possono richiudere: il portale si ricorda quali.
   ================================================================== */

// 1. RIQUADRO "OGGI"
function renderOggi() {
  const oggi = oggiIso();
  document.getElementById("oggi-data").textContent = dataEstesa(oggi).replace(/^./, function (c) { return c.toUpperCase(); });

  // Allenamenti di oggi di tutte le categorie, in ordine di orario
  let allenamenti = [];
  configurazioneAttiva.categorie.forEach(function (categoria) {
    allenamenti = allenamenti.concat(allenamentiPeriodo(categoria, oggi, 1));
  });
  allenamenti.sort(function (a, b) { return a.inizio < b.inizio ? -1 : 1; });

  const etichette = {
    variato: ` <span class="etichetta-variazione">Variato</span>`,
    annullato: ` <span class="etichetta-variazione etichetta-variazione--annullato">Annullato</span>`,
    aggiunto: ` <span class="etichetta-variazione etichetta-variazione--aggiunto">In più</span>`,
  };
  const allenamentiHtml = allenamenti.map(function (voce) {
    return `
      <button type="button" data-categoria="${pulisciTesto(voce.categoria)}" class="riga-oggi ${voce.stato === "annullato" ? "riga-oggi--annullato" : ""}">
        <span class="font-mono text-sm">${pulisciTesto(testoFascia(voce))}</span>
        <span class="min-w-0"><strong class="block text-sm">${pulisciTesto(voce.categoria)}${etichette[voce.stato] || ""}</strong><small class="block text-xs text-[#7A8285]">${pulisciTesto(voce.campo || "Campo da definire")}</small></span>
      </button>
    `;
  }).join("");

  // Partite dei prossimi 7 giorni
  const fra7 = aggiungiGiorni(oggi, 7);
  const partite = configurazioneAttiva.convocazioni.filter(function (c) {
    return c.data >= oggi && c.data <= fra7;
  }).sort(function (a, b) { return (a.data + a.ora) < (b.data + b.ora) ? -1 : 1; });
  const partiteHtml = partite.map(function (c) {
    return `
      <button type="button" data-categoria="${pulisciTesto(c.categoria)}" class="riga-oggi">
        <span class="font-mono text-sm">${giornoCorto(c.data)}</span>
        <span class="min-w-0"><strong class="block text-sm">${pulisciTesto(c.categoria)} • ${pulisciTesto(c.evento)}</strong><small class="block text-xs text-[#7A8285]">Ritrovo ${pulisciTesto(c.ora)}${c.luogo ? " • " + pulisciTesto(c.luogo) : ""} • ${c.convocati.length} convocati</small></span>
      </button>
    `;
  }).join("");

  // Cose da guardare subito
  let urgenti = 0;
  configurazioneAttiva.atleti.concat(configurazioneAttiva.allenatori).forEach(function (persona) {
    persona.documenti.forEach(function (doc) {
      const stato = calcolaStatoDocumento(doc.scadenza).stato;
      if (stato === "scaduto" || stato === "in-scadenza") urgenti++;
    });
  });
  const richieste = richiesteNuove().length;
  const conflitti = conflittiCampi(oggi, 14).length;

  const voceDaGuardare = function (azione, numero, testo, rosso) {
    return `
      <button type="button" data-azione-oggi="${azione}" class="riga-oggi">
        <span class="font-mono text-xl font-bold ${numero > 0 && rosso ? "text-[#C94141]" : "text-[#12181B]"}">${numero}</span>
        <span class="text-sm text-left">${testo}</span>
      </button>
    `;
  };

  document.getElementById("oggi").innerHTML = `
    <div class="pannello-scheda">
      <h3 class="titolo-pannello">Allenamenti di oggi</h3>
      ${allenamentiHtml || `<p class="text-sm text-[#7A8285]">Nessun allenamento oggi.</p>`}
    </div>
    <div class="pannello-scheda">
      <h3 class="titolo-pannello">Partite dei prossimi 7 giorni</h3>
      ${partiteHtml || `<p class="text-sm text-[#7A8285]">Nessuna partita in programma.</p>`}
    </div>
    <div class="pannello-scheda">
      <h3 class="titolo-pannello">Da guardare</h3>
      ${voceDaGuardare("richieste", richieste, richieste === 1 ? "richiesta nuova dalle famiglie" : "richieste nuove dalle famiglie", true)}
      ${voceDaGuardare("scadenze", urgenti, "documenti scaduti o in scadenza", true)}
      ${voceDaGuardare("campi", conflitti, "sovrapposizioni di campo nelle prossime due settimane", true)}
    </div>
  `;

  const contenitore = document.getElementById("oggi");
  contenitore.querySelectorAll("[data-categoria]").forEach(function (bottone) {
    bottone.onclick = function () { apriPaginaCategoria(bottone.getAttribute("data-categoria")); };
  });
  contenitore.querySelectorAll("[data-azione-oggi]").forEach(function (bottone) {
    bottone.onclick = function () { azioneOggi(bottone.getAttribute("data-azione-oggi")); };
  });
}

function azioneOggi(azione) {
  if (azione === "richieste") {
    document.getElementById("sez-richieste").scrollIntoView({ behavior: "smooth" });
  }
  if (azione === "scadenze") {
    filtroScadenziario = "urgenti";
    renderScadenziario();
    apriSezioneRichiudibile("sez-scadenziario");
    document.getElementById("sez-scadenziario").scrollIntoView({ behavior: "smooth" });
  }
  if (azione === "campi") {
    mostraSezione("societa");
    document.getElementById("soc-conflitti").scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

// 2. SEZIONI RICHIUDIBILI
// Ogni sezione con data-richiudibile ha un pulsante accanto al titolo.
// Quali sono chiuse lo ricorda il browser (solo una comodità: se non riesce, restano aperte)
const CHIAVE_SEZIONI_CHIUSE = "dsd_v4_sezioni_chiuse";

function sezioniChiuse() {
  try {
    return JSON.parse(localStorage.getItem(CHIAVE_SEZIONI_CHIUSE) || "[]");
  } catch (errore) {
    return [];
  }
}

function ricordaSezioniChiuse(elenco) {
  try {
    localStorage.setItem(CHIAVE_SEZIONI_CHIUSE, JSON.stringify(elenco));
  } catch (errore) {
    /* non importa */
  }
}

function impostaSezione(sezione, chiusa) {
  sezione.classList.toggle("sezione-chiusa", chiusa);
  const bottone = sezione.querySelector(".bottone-richiudi");
  bottone.textContent = chiusa ? "Apri ▾" : "Riduci ▴";
  bottone.setAttribute("aria-expanded", chiusa ? "false" : "true");
}

function apriSezioneRichiudibile(id) {
  const sezione = document.getElementById(id);
  impostaSezione(sezione, false);
  ricordaSezioniChiuse(sezioniChiuse().filter(function (altro) { return altro !== id; }));
}

function initSezioniRichiudibili() {
  const chiuse = sezioniChiuse();

  document.querySelectorAll("[data-richiudibile]").forEach(function (sezione) {
    const testata = sezione.firstElementChild;
    testata.classList.add("testata-richiudibile");

    const bottone = document.createElement("button");
    bottone.type = "button";
    bottone.className = "bottone-richiudi";
    testata.appendChild(bottone);

    bottone.onclick = function () {
      const chiusa = !sezione.classList.contains("sezione-chiusa");
      impostaSezione(sezione, chiusa);
      const elenco = sezioniChiuse().filter(function (id) { return id !== sezione.id; });
      if (chiusa) elenco.push(sezione.id);
      ricordaSezioniChiuse(elenco);
    };

    impostaSezione(sezione, chiuse.indexOf(sezione.id) !== -1);
  });
}
