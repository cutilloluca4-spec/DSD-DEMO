/* ==================================================================
   D.S.D. — dialoghi.js (Portale v4)
   Avvisi e conferme in stile DSD al posto dei messaggi grigi del
   browser (alert e confirm), e chiusura delle finestre con il tasto
   Esc o con un clic sullo sfondo scuro.
   ================================================================== */

// 1. AVVISI
// Un messaggio compare in basso e sparisce da solo dopo qualche secondo.
// tipo: "ok" (azzurro), "errore" (rosso) oppure "info" (scuro)
function mostraAvviso(testo, tipo) {
  const contenitore = document.getElementById("avvisi");
  if (!contenitore) return;

  const avviso = document.createElement("div");
  avviso.className = "avviso avviso--" + (tipo || "info");
  avviso.setAttribute("role", tipo === "errore" ? "alert" : "status");
  avviso.textContent = testo;
  contenitore.appendChild(avviso);

  setTimeout(function () { avviso.classList.add("avviso--esce"); }, 4000);
  setTimeout(function () { avviso.remove(); }, 4500);
}

// 2. CONFERMA
// Finestra con due pulsanti: l'azione parte solo se si preme il pulsante di conferma.
// Esempio:
//   chiediConferma({ titolo: "Eliminare l'atleta?", testo: "...", conferma: "Elimina", pericolo: true },
//     function () { ...elimina... });
function chiediConferma(opzioni, azione) {
  const finestra = document.getElementById("finestra-conferma");
  const bottoneSi = document.getElementById("conferma-si");
  const bottoneNo = document.getElementById("conferma-no");

  document.getElementById("conferma-titolo").textContent = opzioni.titolo || "Sei sicuro?";
  document.getElementById("conferma-testo").textContent = opzioni.testo || "";
  bottoneSi.textContent = opzioni.conferma || "Conferma";
  bottoneSi.className = opzioni.pericolo ? "btn-dsd-danger text-xs py-2 px-5" : "btn-dsd-primary text-xs py-2 px-5";

  bottoneSi.onclick = function () {
    chiudiFinestra(finestra);
    azione();
  };
  bottoneNo.onclick = function () {
    chiudiFinestra(finestra);
  };

  apriFinestra(finestra);
  bottoneNo.focus();
}

// 3. RICHIESTA DI UN IMPORTO (es. pagamento della quota)
// La funzione "azione" riceve il numero scritto dall'utente
// (e, con metodo: true, anche il metodo di pagamento scelto)
function chiediImporto(opzioni, azione) {
  const finestra = document.getElementById("finestra-importo");
  const campo = document.getElementById("importo-valore");

  document.getElementById("importo-titolo").textContent = opzioni.titolo || "Importo";
  document.getElementById("importo-testo").textContent = opzioni.testo || "";
  campo.value = opzioni.valore || "";

  // Metodo di pagamento (solo se richiesto, es. per le quote)
  const metodo = document.getElementById("importo-metodo");
  document.getElementById("importo-metodo-box").classList.toggle("hidden", !opzioni.metodo);
  metodo.value = "Bonifico";

  document.getElementById("importo-si").onclick = function () {
    const valore = parseFloat(String(campo.value).replace(",", "."));
    if (isNaN(valore) || valore <= 0) {
      mostraAvviso("Scrivi un importo valido, maggiore di zero.", "errore");
      return;
    }
    chiudiFinestra(finestra);
    azione(valore, opzioni.metodo ? metodo.value : "");
  };
  document.getElementById("importo-no").onclick = function () {
    chiudiFinestra(finestra);
  };

  apriFinestra(finestra);
  campo.focus();
  campo.select();
}

// 3-bis. RICHIESTA DI UN BREVE TESTO (es. il motivo per cui un documento va rifatto)
function chiediTesto(opzioni, azione) {
  const finestra = document.getElementById("finestra-testo");
  const campo = document.getElementById("testo-valore");

  document.getElementById("testo-titolo").textContent = opzioni.titolo || "";
  document.getElementById("testo-testo").textContent = opzioni.testo || "";
  campo.value = "";
  campo.placeholder = opzioni.esempio || "";

  document.getElementById("testo-si").textContent = opzioni.conferma || "Invia";
  document.getElementById("testo-si").onclick = function () {
    const valore = campo.value.trim();
    if (valore === "") {
      mostraAvviso("Scrivi il testo prima di inviare.", "errore");
      return;
    }
    chiudiFinestra(finestra);
    azione(valore);
  };
  document.getElementById("testo-no").onclick = function () {
    chiudiFinestra(finestra);
  };

  apriFinestra(finestra);
  campo.focus();
}

// 4. FINESTRE
// Tutte le finestre hanno la classe "finestra". Quelle con data-chiudi-fuori
// si chiudono anche con un clic sullo sfondo (le altre no, per non perdere
// per sbaglio un modulo lungo già compilato).
function apriFinestra(finestra) {
  finestra.classList.remove("hidden");
}

function chiudiFinestra(finestra) {
  finestra.classList.add("hidden");
}

function initFinestre() {
  // Esc chiude l'ultima finestra aperta
  document.addEventListener("keydown", function (evento) {
    if (evento.key !== "Escape") return;

    const aperte = document.querySelectorAll(".finestra:not(.hidden)");
    if (aperte.length > 0) chiudiFinestra(aperte[aperte.length - 1]);
  });

  document.querySelectorAll(".finestra[data-chiudi-fuori]").forEach(function (finestra) {
    finestra.addEventListener("mousedown", function (evento) {
      if (evento.target === finestra) chiudiFinestra(finestra);
    });
  });
}
