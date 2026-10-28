/* ==================================================================
   D.S.D. — import-export.js (Portale v4)
   Esporta gli atleti in un file che si apre con Excel (CSV) e li
   importa da un file Excel salvato come CSV. Il modello da compilare
   si scarica con "Scarica modello".
   ================================================================== */

// 1. COLONNE DEL FILE
// Ogni colonna ha un titolo, come leggerla dall'atleta e come scriverla
// nell'atleta durante l'importazione. Le date sono in formato gg/mm/aaaa.
function documento(atleta, tipo) {
  return atleta.documenti.find(function (doc) { return doc.tipo === tipo; });
}

const colonneAtleti = [
  { titolo: "Cognome", leggi: function (a) { return a.cognome; }, scrivi: function (a, v) { a.cognome = v; } },
  { titolo: "Nome", leggi: function (a) { return a.nome; }, scrivi: function (a, v) { a.nome = v; } },
  { titolo: "Data di nascita", leggi: function (a) { return dataInItaliano(a.dataNascita); }, scrivi: function (a, v) { a.dataNascita = leggiDataImport(v); } },
  { titolo: "Luogo di nascita", leggi: function (a) { return a.luogoNascita; }, scrivi: function (a, v) { a.luogoNascita = v; } },
  { titolo: "Sesso", leggi: function (a) { return a.sesso; }, scrivi: function (a, v) { a.sesso = v.toUpperCase().slice(0, 1); } },
  { titolo: "Codice fiscale", leggi: function (a) { return a.codiceFiscale; }, scrivi: function (a, v) { a.codiceFiscale = v.toUpperCase(); } },
  { titolo: "Categoria", leggi: function (a) { return a.categoria; }, scrivi: function (a, v) { a.categoria = v; } },
  { titolo: "Ruolo", leggi: function (a) { return a.ruolo; }, scrivi: function (a, v) { a.ruolo = v; } },
  { titolo: "Numero di maglia", leggi: function (a) { return a.numeroMaglia; }, scrivi: function (a, v) { a.numeroMaglia = v; } },
  { titolo: "Matricola federale", leggi: function (a) { return a.matricola; }, scrivi: function (a, v) { a.matricola = v; } },
  { titolo: "Indirizzo", leggi: function (a) { return a.indirizzo; }, scrivi: function (a, v) { a.indirizzo = v; } },
  { titolo: "CAP", leggi: function (a) { return a.cap; }, scrivi: function (a, v) { a.cap = v; } },
  { titolo: "Comune", leggi: function (a) { return a.comune; }, scrivi: function (a, v) { a.comune = v; } },
  { titolo: "Provincia", leggi: function (a) { return a.provincia; }, scrivi: function (a, v) { a.provincia = v.toUpperCase(); } },
  { titolo: "Telefono", leggi: function (a) { return a.telefono; }, scrivi: function (a, v) { a.telefono = v; } },
  { titolo: "Email", leggi: function (a) { return a.email; }, scrivi: function (a, v) { a.email = v; } },
  { titolo: "Genitore o tutore", leggi: function (a) { return a.tutore.nome; }, scrivi: function (a, v) { a.tutore.nome = v; } },
  { titolo: "Telefono genitore", leggi: function (a) { return a.tutore.telefono; }, scrivi: function (a, v) { a.tutore.telefono = v; } },
  { titolo: "Email genitore", leggi: function (a) { return a.tutore.email; }, scrivi: function (a, v) { a.tutore.email = v; } },
  { titolo: "Scadenza visita medica", leggi: function (a) { return dataInItaliano(documento(a, "Visite Mediche").scadenza); }, scrivi: function (a, v) { documento(a, "Visite Mediche").scadenza = leggiDataImport(v); } },
  { titolo: "Scadenza tesseramento", leggi: function (a) { return dataInItaliano(documento(a, "Tesseramento Atleta").scadenza); }, scrivi: function (a, v) { documento(a, "Tesseramento Atleta").scadenza = leggiDataImport(v); } },
  { titolo: "Scadenza documento", leggi: function (a) { return dataInItaliano(documento(a, "CI").scadenza); }, scrivi: function (a, v) { documento(a, "CI").scadenza = leggiDataImport(v); } },
  { titolo: "Quota versata", leggi: function (a) { return String(versatoQuota(a)).replace(".", ","); }, scrivi: null },
];

// Accetta sia 15/10/2010 sia 2010-10-15; se la data non è valida resta vuota
function leggiDataImport(valore) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(valore)) return valore;
  return dataDaItaliano(valore) || "";
}

// 2. ESPORTAZIONE
// Excel in italiano usa il punto e virgola come separatore.
// I valori che contengono ; o virgolette vanno tra virgolette.
function valoreCSV(valore) {
  const testo = String(valore === undefined || valore === null ? "" : valore);
  if (/[;"\n]/.test(testo)) return '"' + testo.replace(/"/g, '""') + '"';
  return testo;
}

function scaricaFile(nome, contenuto, tipo) {
  // "﻿" all'inizio: così Excel legge bene le lettere accentate
  const file = new Blob(["﻿" + contenuto], { type: tipo });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = nome;
  link.click();
  URL.revokeObjectURL(link.href);
}

function esportaAtleti() {
  const atleti = atletiFiltrati();   // rispetta ricerca e filtri del roster
  if (atleti.length === 0) {
    mostraAvviso("Nessun atleta da esportare con i filtri attuali.", "errore");
    return;
  }

  const righe = [colonneAtleti.map(function (c) { return c.titolo; }).join(";")];
  atleti.forEach(function (atleta) {
    righe.push(colonneAtleti.map(function (colonna) {
      return valoreCSV(colonna.leggi(atleta));
    }).join(";"));
  });

  const nomeSocieta = (configurazioneAttiva.nomeSocieta || "societa").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
  scaricaFile(`atleti-${nomeSocieta}-${oggiIso()}.csv`, righe.join("\r\n"), "text/csv;charset=utf-8");
  mostraAvviso(`Esportati ${atleti.length} atleti: il file si apre con Excel.`, "ok");
}

// Modello vuoto (con una riga d'esempio) da compilare in Excel
function scaricaModello() {
  const intestazione = colonneAtleti.filter(function (c) { return c.scrivi; }).map(function (c) { return c.titolo; });
  const esempio = ["Rossi", "Marco", "01/01/2016", "Cremona (CR)", "M", "RSSMRC16A01D150Y", configurazioneAttiva.categorie[0] || "Pulcini",
    "Centrocampista", "8", "", "Via Roma 12", "26100", "Cremona", "CR", "", "", "Laura Rossi", "347 1234567", "laura.rossi@email.it",
    "30/09/2027", "30/06/2027", "15/03/2030"];

  scaricaFile("modello-atleti-dsd.csv", intestazione.join(";") + "\r\n" + esempio.map(valoreCSV).join(";"), "text/csv;charset=utf-8");
  mostraAvviso("Modello scaricato: compilalo in Excel e salvalo come \"CSV (separato da punto e virgola)\".", "info");
}

// 3. IMPORTAZIONE
// Divide il testo del file in righe e celle, rispettando le virgolette
function leggiCSV(testo, separatore) {
  const righe = [];
  let riga = [];
  let cella = "";
  let traVirgolette = false;

  for (let i = 0; i < testo.length; i++) {
    const carattere = testo[i];

    if (traVirgolette) {
      if (carattere === '"' && testo[i + 1] === '"') { cella += '"'; i++; }
      else if (carattere === '"') traVirgolette = false;
      else cella += carattere;
    } else if (carattere === '"') {
      traVirgolette = true;
    } else if (carattere === separatore) {
      riga.push(cella); cella = "";
    } else if (carattere === "\n" || carattere === "\r") {
      if (carattere === "\r" && testo[i + 1] === "\n") i++;
      riga.push(cella); cella = "";
      righe.push(riga); riga = [];
    } else {
      cella += carattere;
    }
  }
  if (cella !== "" || riga.length > 0) { riga.push(cella); righe.push(riga); }

  // Togliamo le righe completamente vuote
  return righe.filter(function (r) {
    return r.some(function (valore) { return valore.trim() !== ""; });
  });
}

// Excel può salvare in UTF-8 o nel vecchio formato di Windows: proviamo entrambi
function leggiTestoFile(file, callback) {
  const lettore = new FileReader();
  lettore.onload = function () {
    let testo;
    try {
      testo = new TextDecoder("utf-8", { fatal: true }).decode(lettore.result);
    } catch (errore) {
      testo = new TextDecoder("windows-1252").decode(lettore.result);
    }
    callback(testo.replace(/^﻿/, ""));
  };
  lettore.readAsArrayBuffer(file);
}

function importaAtleti(file) {
  if (!file) return;

  leggiTestoFile(file, function (testo) {
    const primaRiga = testo.split(/\r?\n/)[0];
    const separatore = (primaRiga.match(/;/g) || []).length >= (primaRiga.match(/,/g) || []).length ? ";" : ",";
    const righe = leggiCSV(testo, separatore);

    if (righe.length < 2) {
      mostraAvviso("Il file è vuoto o non ha righe di atleti.", "errore");
      return;
    }

    // Abbiniamo le colonne del file alle nostre, per titolo (maiuscole e spazi non contano)
    const normalizza = function (t) { return t.trim().toLowerCase().replace(/\s+/g, " "); };
    const intestazione = righe[0].map(normalizza);
    const colonneTrovate = colonneAtleti.filter(function (colonna) {
      return colonna.scrivi && intestazione.indexOf(normalizza(colonna.titolo)) !== -1;
    });

    if (intestazione.indexOf("nome") === -1 || intestazione.indexOf("cognome") === -1) {
      mostraAvviso("Nel file mancano le colonne \"Nome\" e \"Cognome\". Usa \"Scarica modello\" come base.", "errore");
      return;
    }

    const nuoviAtleti = [];
    const nuoveCategorie = [];
    let scartati = 0;
    let doppioni = 0;

    righe.slice(1).forEach(function (celle) {
      const atleta = completaAtleta({ id: creaId("atl"), nome: "", cognome: "" });

      colonneTrovate.forEach(function (colonna) {
        const valore = (celle[intestazione.indexOf(normalizza(colonna.titolo))] || "").trim();
        if (valore !== "") colonna.scrivi(atleta, valore);
      });

      if (!atleta.nome || !atleta.cognome) {
        scartati++;
        return;
      }

      // Stesso codice fiscale di un atleta già presente: non lo duplichiamo
      const giaPresente = atleta.codiceFiscale && configurazioneAttiva.atleti.concat(nuoviAtleti).some(function (a) {
        return a.codiceFiscale === atleta.codiceFiscale;
      });
      if (giaPresente) {
        doppioni++;
        return;
      }

      if (!atleta.categoria) atleta.categoria = configurazioneAttiva.categorie[0] || "Senza categoria";
      if (configurazioneAttiva.categorie.indexOf(atleta.categoria) === -1 && nuoveCategorie.indexOf(atleta.categoria) === -1) {
        nuoveCategorie.push(atleta.categoria);
      }
      nuoviAtleti.push(atleta);
    });

    if (nuoviAtleti.length === 0) {
      mostraAvviso(`Nessun atleta da importare (${scartati} righe senza nome o cognome, ${doppioni} già presenti).`, "errore");
      return;
    }

    // Riepilogo prima di importare davvero
    let testoRiepilogo = `Verranno aggiunti ${nuoviAtleti.length} atleti.`;
    if (nuoveCategorie.length > 0) testoRiepilogo += ` Nuove categorie: ${nuoveCategorie.join(", ")}.`;
    if (doppioni > 0) testoRiepilogo += ` ${doppioni} saltati perché già presenti (stesso codice fiscale).`;
    if (scartati > 0) testoRiepilogo += ` ${scartati} righe saltate perché senza nome o cognome.`;

    chiediConferma({ titolo: "Importare gli atleti?", testo: testoRiepilogo, conferma: "Importa" }, function () {
      configurazioneAttiva.categorie = configurazioneAttiva.categorie.concat(nuoveCategorie);
      configurazioneAttiva.atleti = configurazioneAttiva.atleti.concat(nuoviAtleti);

      if (!salvaConfigurazione()) return;
      aggiornaTutto();
      mostraAvviso(`Importati ${nuoviAtleti.length} atleti. Controlla quelli con le etichette gialle.`, "ok");
    });
  });
}

// 4. AVVIO
function initImportExport() {
  document.getElementById("btn-esporta-atleti").onclick = esportaAtleti;
  document.getElementById("btn-modello-atleti").onclick = scaricaModello;

  const inputImporta = document.getElementById("input-importa-atleti");
  inputImporta.onchange = function () {
    importaAtleti(inputImporta.files[0]);
    inputImporta.value = "";
  };
}
