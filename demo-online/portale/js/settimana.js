/* ==================================================================
   D.S.D. — settimana.js (Portale v4)
   Nella Panoramica della segreteria: gli allenamenti della settimana
   di tutte le categorie, con le variazioni in evidenza. Con le frecce
   si passa alla settimana prima o dopo.
   ================================================================== */

let lunediPanoramica = "";   // lunedì della settimana mostrata

function renderSettimanaPanoramica() {
  if (!lunediPanoramica) lunediPanoramica = lunediDi(oggiIso());
  const contenitore = document.getElementById("settimana-allenamenti");
  const categorie = configurazioneAttiva.categorie;
  const impostati = categorie.some(function (categoria) {
    return haOrari(categoria);
  });

  document.getElementById("settimana-titolo").textContent =
    (lunediPanoramica === lunediDi(oggiIso()) ? "Questa settimana • " : "") + testoSettimana(lunediPanoramica);

  if (!impostati && configurazioneAttiva.variazioniOrari.length === 0) {
    contenitore.innerHTML = `<p class="pannello-scheda text-sm text-[#7A8285] sm:col-span-2 lg:col-span-3">Gli orari non sono ancora impostati: aggiungili in Società → Orari degli allenamenti.</p>`;
    return;
  }

  contenitore.innerHTML = categorie.map(function (categoria) {
    return `
      <div class="pannello-scheda">
        <button type="button" data-categoria="${pulisciTesto(categoria)}" class="titolo-pannello text-left hover:underline cursor-pointer">${pulisciTesto(categoria)}</button>
        ${htmlSettimana(categoria, lunediPanoramica, { mostraConflitti: true })}
      </div>
    `;
  }).join("");

  // Clic sul nome: si apre la pagina della categoria
  contenitore.querySelectorAll("[data-categoria]").forEach(function (bottone) {
    bottone.onclick = function () { apriPaginaCategoria(bottone.getAttribute("data-categoria")); };
  });
}

function initSettimanaPanoramica() {
  document.getElementById("settimana-prima").onclick = function () {
    lunediPanoramica = aggiungiGiorni(lunediPanoramica, -7);
    renderSettimanaPanoramica();
  };
  document.getElementById("settimana-dopo").onclick = function () {
    lunediPanoramica = aggiungiGiorni(lunediPanoramica, 7);
    renderSettimanaPanoramica();
  };
  document.getElementById("settimana-oggi").onclick = function () {
    lunediPanoramica = lunediDi(oggiIso());
    renderSettimanaPanoramica();
  };
}
