/* ==================================================================
   D.S.D. — portal.js (sito v3)
   LINK DEL PORTALE — unico punto da modificare per tutto il sito.
   Tutti i link con l'attributo data-portal ("Prova il portale") prendono
   questo indirizzo e si aprono in una nuova scheda; gli elementi con
   data-portal-url mostrano l'indirizzo scritto per esteso.

   Nel progetto il portale sta nella cartella accanto (../portale/), quindi
   un indirizzo relativo funziona sia aprendo i file dal computer sia su
   GitHub Pages. Con un dominio vero si scrive l'indirizzo completo, es.:
   window.PORTAL_URL = "https://portale.digitalsportsdesk.it";
   ================================================================== */
window.PORTAL_URL = "../portale/index.html";

function collegaLinkPortale() {
  const indirizzo = window.PORTAL_URL;

  document.querySelectorAll("[data-portal]").forEach(function (link) {
    if (!indirizzo) return;
    link.href = indirizzo;
    link.target = "_blank";
    link.rel = "noopener";
  });

  // L'indirizzo si mostra solo se è completo (https://...);
  // con un indirizzo relativo si legge semplicemente "portale DSD"
  document.querySelectorAll("[data-portal-url]").forEach(function (testo) {
    const completo = /^https?:\/\//.test(indirizzo || "");
    testo.textContent = completo ? indirizzo.replace(/^https?:\/\//, "") : "portale DSD";
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", collegaLinkPortale);
} else {
  collegaLinkPortale();
}
