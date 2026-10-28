/* ==================================================================
   D.S.D. — ricerca.js (Portale v4)
   Ricerca unica: dal pulsante "Cerca" in alto (o premendo il tasto /)
   si trovano atleti, allenatori, prodotti e categorie scrivendo poche lettere.
   ================================================================== */

function apriRicerca() {
  const campo = document.getElementById("ricerca-campo");
  campo.value = "";
  renderRisultatiRicerca();
  apriFinestra(document.getElementById("finestra-ricerca"));
  campo.focus();
}

function chiudiRicerca() {
  chiudiFinestra(document.getElementById("finestra-ricerca"));
}

// Cerca il testo dentro nome, cognome, codice fiscale, categoria...
function contiene(testo, cercato) {
  return String(testo || "").toLowerCase().indexOf(cercato) !== -1;
}

function renderRisultatiRicerca() {
  const cercato = document.getElementById("ricerca-campo").value.trim().toLowerCase();
  const contenitore = document.getElementById("ricerca-risultati");

  if (cercato.length < 2) {
    contenitore.innerHTML = `<p class="text-sm text-[#7A8285] px-1 py-3">Scrivi almeno due lettere: atleta, allenatore, dirigente, codice fiscale, prodotto o categoria.</p>`;
    return;
  }

  const atleti = configurazioneAttiva.atleti.filter(function (a) {
    return contiene(`${a.nome} ${a.cognome} ${a.cognome} ${a.nome}`, cercato) || contiene(a.codiceFiscale, cercato) || contiene(a.tutore.nome, cercato);
  }).slice(0, 8);

  const allenatori = configurazioneAttiva.allenatori.filter(function (a) {
    return contiene(`${a.nome} ${a.cognome} ${a.cognome} ${a.nome}`, cercato) || contiene(a.ruolo, cercato);
  }).slice(0, 5);

  const prodotti = configurazioneAttiva.magazzino.prodotti.filter(function (p) {
    return contiene(p.nome, cercato) || contiene(p.categoria, cercato);
  }).slice(0, 5);

  const categorie = configurazioneAttiva.categorie.filter(function (c) {
    return contiene(c, cercato);
  });

  let htmlAccumulato = "";

  if (atleti.length > 0) {
    htmlAccumulato += `<p class="titolo-risultati">Atleti</p>`;
    atleti.forEach(function (atleta) {
      htmlAccumulato += `
        <button type="button" class="risultato" data-risultato="atleta" data-id="${atleta.id}">
          ${htmlAvatar(atleta, "w-9 h-9")}
          <span class="min-w-0"><strong>${pulisciTesto(atleta.cognome)} ${pulisciTesto(atleta.nome)}</strong><small>${pulisciTesto(atleta.categoria)}${atleta.codiceFiscale ? " • " + pulisciTesto(atleta.codiceFiscale) : ""}</small></span>
        </button>
      `;
    });
  }

  if (allenatori.length > 0) {
    htmlAccumulato += `<p class="titolo-risultati">Allenatori/Dirigenti</p>`;
    allenatori.forEach(function (allenatore) {
      htmlAccumulato += `
        <button type="button" class="risultato" data-risultato="allenatore" data-id="${allenatore.id}">
          ${htmlAvatar(allenatore, "w-9 h-9")}
          <span class="min-w-0"><strong>${pulisciTesto(allenatore.cognome)} ${pulisciTesto(allenatore.nome)}</strong><small>${pulisciTesto([allenatore.ruolo || "Staff"].concat(allenatore.categorie).join(" • "))}</small></span>
        </button>
      `;
    });
  }

  if (prodotti.length > 0) {
    htmlAccumulato += `<p class="titolo-risultati">Magazzino</p>`;
    prodotti.forEach(function (prodotto) {
      htmlAccumulato += `
        <button type="button" class="risultato" data-risultato="prodotto" data-id="${prodotto.id}">
          ${htmlMiniaturaProdotto(prodotto, "w-9 h-9")}
          <span class="min-w-0"><strong>${pulisciTesto(prodotto.nome)}</strong><small>${pulisciTesto(prodotto.categoria)} • ${formattaEuro(prodotto.prezzo)} • ${totaleDisponibili(prodotto)} disponibili</small></span>
        </button>
      `;
    });
  }

  if (categorie.length > 0) {
    htmlAccumulato += `<p class="titolo-risultati">Categorie</p>`;
    categorie.forEach(function (categoria) {
      htmlAccumulato += `
        <button type="button" class="risultato" data-risultato="categoria" data-id="${pulisciTesto(categoria)}">
          <span class="risultato__icona">${pulisciTesto(categoria.slice(0, 2).toUpperCase())}</span>
          <span class="min-w-0"><strong>${pulisciTesto(categoria)}</strong><small>${contaAtletiCategoria(categoria)} atleti</small></span>
        </button>
      `;
    });
  }

  contenitore.innerHTML = htmlAccumulato || `<p class="text-sm text-[#7A8285] px-1 py-3">Nessun risultato per "${pulisciTesto(cercato)}".</p>`;

  contenitore.querySelectorAll(".risultato").forEach(function (bottone) {
    bottone.onclick = function () {
      apriRisultato(bottone.getAttribute("data-risultato"), bottone.getAttribute("data-id"));
    };
  });
}

// Porta l'utente dove serve: scheda atleta, magazzino o roster filtrato
function apriRisultato(tipo, id) {
  chiudiRicerca();

  if (tipo === "atleta") apriSchedaAtleta(id);

  if (tipo === "allenatore") {
    mostraSezione("allenatori");
    apriModalAllenatore(id);
  }

  if (tipo === "prodotto") {
    const prodotto = trovaProdotto(id);
    document.getElementById("cerca-prodotto").value = prodotto ? prodotto.nome : "";
    document.getElementById("filtro-categoria-prodotto").value = "";
    tabMagazzino = "prodotti";
    renderMagazzino();
    mostraSezione("magazzino");
  }

  if (tipo === "categoria") {
    apriPaginaCategoria(id);
    return;
  }

  if (tipo === "categoria-roster") {
    document.getElementById("filtro-categoria").value = id;
    document.getElementById("filtro-problema").value = "";
    document.getElementById("cerca-atleta").value = "";
    renderAtleti();
    mostraSezione("atleti");
  }
}

function initRicerca() {
  document.querySelectorAll("[data-apri-ricerca]").forEach(function (bottone) {
    bottone.onclick = apriRicerca;
  });

  const campo = document.getElementById("ricerca-campo");
  campo.oninput = renderRisultatiRicerca;

  // Invio apre il primo risultato
  campo.onkeydown = function (evento) {
    if (evento.key !== "Enter") return;
    const primo = document.querySelector("#ricerca-risultati .risultato");
    if (primo) primo.click();
  };

  // Tasto "/" per aprire la ricerca (se non si sta già scrivendo in un campo)
  document.addEventListener("keydown", function (evento) {
    const staScrivendo = ["INPUT", "TEXTAREA", "SELECT"].indexOf(document.activeElement.tagName) !== -1;
    if (evento.key === "/" && !staScrivendo && configurazioneAttiva) {
      evento.preventDefault();
      apriRicerca();
    }
  });
}
