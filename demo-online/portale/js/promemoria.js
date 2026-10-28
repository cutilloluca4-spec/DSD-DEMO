/* ==================================================================
   D.S.D. — promemoria.js (Portale v4)
   Avvisi ai genitori in un clic: accanto a ogni scadenza ci sono due
   pulsanti che aprono WhatsApp o l'email con il messaggio già scritto.
   Non serve un server: si apre WhatsApp (web o app) oppure il
   programma di posta del computer, e il messaggio si può ancora
   correggere prima di inviarlo.
   ================================================================== */

// 1. A CHI SCRIVERE
// Per un minorenne si scrive al genitore o tutore, altrimenti alla persona stessa
function contattoScadenza(voce) {
  if (voce.staff) {
    const allenatore = trovaAllenatore(voce.id);
    return allenatore ? { nome: allenatore.nome, telefono: allenatore.telefono, email: allenatore.email } : null;
  }

  const atleta = trovaAtleta(voce.id);
  if (!atleta) return null;

  if (eMinorenne(atleta) || (!atleta.telefono && !atleta.email)) {
    return { nome: atleta.tutore.nome, telefono: atleta.tutore.telefono, email: atleta.tutore.email };
  }
  return { nome: atleta.nome, telefono: atleta.telefono, email: atleta.email };
}

// WhatsApp vuole il numero con il prefisso internazionale e senza spazi:
// "333 123 4567" -> "393331234567". Restituisce "" se il numero è troppo corto.
function numeroWhatsApp(telefono) {
  let cifre = String(telefono || "").replace(/[^0-9+]/g, "");
  if (cifre.indexOf("+") === 0) cifre = cifre.slice(1);
  else if (cifre.indexOf("00") === 0) cifre = cifre.slice(2);
  else cifre = "39" + cifre;
  return cifre.length >= 11 ? cifre : "";
}

// 2. IL MESSAGGIO
// Ogni documento con il suo articolo, per scrivere frasi corrette
const documentiPerMessaggio = {
  "Visita Medica": { nome: "la visita medica", femminile: true },
  "Tesseramento": { nome: "il tesseramento", femminile: false },
  "Documento d'Identità": { nome: "il documento d'identità", femminile: false },
  "Casellario": { nome: "il certificato del casellario giudiziale", femminile: false },
  "BLSD": { nome: "l'attestato del corso BLSD", femminile: false },
};

function testoPromemoria(voce) {
  const documento = documentiPerMessaggio[voce.tipo] || { nome: voce.tipo, femminile: false };
  const finale = documento.femminile ? "a" : "o";     // scadut-a / scadut-o
  const data = dataInItaliano(voce.scadenza);
  const societa = configurazioneAttiva.nomeSocieta || "la segreteria";

  // Ai genitori si parla di "voi" e del figlio, allo staff si dà del tu
  const cosa = voce.staff ? documento.nome : `${documento.nome} di ${voce.persona}`;
  const ricordiamo = voce.staff ? "ti ricordiamo" : "vi ricordiamo";
  const chiediamo = voce.staff ? "Ti chiediamo" : "Vi chiediamo";
  let frase = "";

  if (voce.stato === "scaduto") {
    frase = `${ricordiamo} che ${cosa} è scadut${finale} il ${data}. ${chiediamo} di rinnovarl${finale} al più presto${voce.tipo === "Visita Medica" ? ": senza certificato valido non è possibile allenarsi e giocare" : ""}.`;
  } else if (voce.stato === "in-scadenza") {
    frase = `${ricordiamo} che ${cosa} scade il ${data}. ${chiediamo} di rinnovarl${finale} prima della scadenza.`;
  } else {
    frase = `in segreteria non abbiamo ancora ${cosa}. ${voce.staff ? "Puoi" : "Potete"} farcel${finale} avere appena possibile?`;
  }

  return `Buongiorno, ${frase}\nGrazie, ${societa}`;
}

// 3. I PULSANTI
function htmlAzioniPromemoria(voce) {
  const contatto = contattoScadenza(voce);
  if (!contatto) return "";

  const testo = testoPromemoria(voce);
  const numero = numeroWhatsApp(contatto.telefono);
  const destinatario = contatto.nome || voce.persona;
  let htmlAccumulato = "";

  const iconaMessaggio = `<svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-5A8 8 0 1 1 21 12Z"/></svg>`;
  const iconaEmail = `<svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="1"/><path d="m3 7 9 6 9-6"/></svg>`;

  if (numero) {
    htmlAccumulato += `<a href="https://wa.me/${numero}?text=${encodeURIComponent(testo)}" target="_blank" rel="noopener" class="azione-contatto" title="Promemoria su WhatsApp a ${pulisciTesto(destinatario)}">${iconaMessaggio}</a>`;
  } else {
    htmlAccumulato += `<span class="azione-contatto azione-contatto--spenta" title="Nessun numero di telefono valido">${iconaMessaggio}</span>`;
  }

  if (contatto.email) {
    const oggetto = `${voce.tipo} di ${voce.persona}`;
    htmlAccumulato += `<a href="mailto:${pulisciTesto(contatto.email)}?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(testo)}" class="azione-contatto" title="Promemoria via email a ${pulisciTesto(destinatario)}">${iconaEmail}</a>`;
  } else {
    htmlAccumulato += `<span class="azione-contatto azione-contatto--spenta" title="Nessuna email">${iconaEmail}</span>`;
  }

  return htmlAccumulato;
}
