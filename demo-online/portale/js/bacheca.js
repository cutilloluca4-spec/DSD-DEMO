/* ==================================================================
   D.S.D. — bacheca.js (Portale v4)
   Bacheca avvisi della segreteria, nella Panoramica: un avviso per
   tutta la società o per una categoria. Le famiglie lo vedono nella
   Home della loro area, gli allenatori nella loro bacheca.
   ================================================================== */

function renderBacheca() {
  // Menu delle destinazioni: tutta la società oppure una categoria
  const select = document.getElementById("bacheca-categoria");
  const scelta = select.value;
  select.innerHTML = `<option value="">Tutta la società</option>` + configurazioneAttiva.categorie.map(function (categoria) {
    return `<option value="${pulisciTesto(categoria)}">${pulisciTesto(categoria)}</option>`;
  }).join("");
  select.value = configurazioneAttiva.categorie.indexOf(scelta) !== -1 ? scelta : "";

  // Gli ultimi avvisi pubblicati (da segreteria e allenatori)
  const avvisi = avvisiPerCategorie(configurazioneAttiva.categorie).slice(0, 6);
  const lista = document.getElementById("bacheca-lista");
  lista.innerHTML = avvisi.map(function (avviso) {
    return htmlAvvisoBacheca(avviso, true);
  }).join("") || `<p class="pannello-scheda text-sm text-[#7A8285]">Nessun avviso pubblicato.</p>`;

  lista.querySelectorAll("[data-elimina-avviso]").forEach(function (bottone) {
    bottone.onclick = function () {
      eliminaAvviso(bottone.getAttribute("data-elimina-avviso"));
      aggiornaTutto();
    };
  });
}

function initBacheca() {
  document.getElementById("bacheca-pubblica").onclick = function () {
    const campo = document.getElementById("bacheca-testo");
    const testo = campo.value.trim();
    if (testo === "") {
      mostraAvviso("Scrivi il testo dell'avviso.", "errore");
      return;
    }
    pubblicaAvviso(testo, document.getElementById("bacheca-categoria").value, "Segreteria");
    campo.value = "";
    aggiornaTutto();
    mostraAvviso("Avviso pubblicato.", "ok");
  };
}
