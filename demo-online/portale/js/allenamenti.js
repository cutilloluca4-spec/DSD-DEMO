/* ==================================================================
   D.S.D. — allenamenti.js (Portale v4)
   Orari degli allenamenti di ogni categoria, giorno per giorno (ogni
   giorno con il suo orario e il suo campo), variazioni di una singola
   data (annullato, orario o campo diverso, allenamento in più),
   controllo dei campi occupati due volte e la settimana disegnata
   con allenamenti e partite.
   Lo usano tutte e tre le aree: segreteria, allenatore e famiglia.
   ================================================================== */

// 1. GIORNI E DATE
const giorniSettimana = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
const giorniCorti = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
// Ordine da lunedì a domenica, con la lettera per i pulsanti (0 = domenica)
const giorniBrevi = [{ g: 1, n: "L" }, { g: 2, n: "M" }, { g: 3, n: "M" }, { g: 4, n: "G" }, { g: 5, n: "V" }, { g: 6, n: "S" }, { g: 0, n: "D" }];

function dataIso(data) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

// Le date si leggono a mezzogiorno, così il cambio dell'ora legale non sposta il giorno
function dataDaIso(iso) {
  return new Date(iso + "T12:00:00");
}

function aggiungiGiorni(iso, giorni) {
  const data = dataDaIso(iso);
  data.setDate(data.getDate() + giorni);
  return dataIso(data);
}

// Il lunedì della settimana di una data
function lunediDi(iso) {
  const giorno = dataDaIso(iso).getDay();
  return aggiungiGiorni(iso, giorno === 0 ? -6 : 1 - giorno);
}

// Esempio: "Gio 22/10"
function giornoCorto(iso) {
  const data = dataDaIso(iso);
  return `${giorniCorti[data.getDay()]} ${String(data.getDate()).padStart(2, "0")}/${String(data.getMonth() + 1).padStart(2, "0")}`;
}

// Orario scritto a mano: "17.30" o "17:30" -> "17:30"; "" se vuoto; null se non valido
function leggiOra(testo) {
  const pulito = String(testo || "").trim().replace(".", ":");
  if (pulito === "") return "";
  if (!/^\d{1,2}:\d{2}$/.test(pulito)) return null;
  const parti = pulito.split(":");
  if (Number(parti[0]) > 23 || Number(parti[1]) > 59) return null;
  return `${parti[0].padStart(2, "0")}:${parti[1]}`;
}

// 2. ORARI DI UNA CATEGORIA, GIORNO PER GIORNO
// configurazioneAttiva.orari["Pulcini"] = { sedute: [
//   { giorno: 1, inizio: "17:30", fine: "19:00", campo: "Campo A" },
//   { giorno: 4, inizio: "18:00", fine: "19:30", campo: "Palestra" } ] }
function orariCategoria(categoria) {
  const orari = configurazioneAttiva.orari[categoria] || {};
  let sedute = orari.sedute;

  // Formato delle prime prove: stessi giorni, stesso orario e stesso campo
  if (!sedute) {
    sedute = (orari.giorni || []).map(function (giorno) {
      return { giorno: giorno, inizio: orari.inizio || orari.ora || "", fine: orari.fine || "", campo: orari.campo || "" };
    });
  }

  // Sempre in ordine da lunedì a domenica
  return {
    sedute: sedute.slice().sort(function (a, b) { return (a.giorno || 7) - (b.giorno || 7); }),
  };
}

function sedutaDelGiorno(categoria, giorno) {
  return orariCategoria(categoria).sedute.find(function (seduta) {
    return seduta.giorno === giorno;
  }) || null;
}

function haOrari(categoria) {
  return orariCategoria(categoria).sedute.length > 0;
}

// Esempio: "17:30–19:00" oppure "17:30"
function testoFascia(orari) {
  if (!orari.inizio) return "";
  return orari.fine ? `${orari.inizio}–${orari.fine}` : orari.inizio;
}

// Esempio: "lunedì e giovedì, 17:30–19:00 • Campo A; mercoledì, 18:00–19:30 • Palestra"
// (i giorni con lo stesso orario e lo stesso campo vengono raggruppati)
function testoOrari(categoria) {
  const gruppi = [];
  orariCategoria(categoria).sedute.forEach(function (seduta) {
    const chiave = `${seduta.inizio}|${seduta.fine}|${seduta.campo}`;
    let gruppo = gruppi.find(function (g) { return g.chiave === chiave; });
    if (!gruppo) {
      gruppo = { chiave: chiave, seduta: seduta, giorni: [] };
      gruppi.push(gruppo);
    }
    gruppo.giorni.push(giorniSettimana[seduta.giorno]);
  });

  return gruppi.map(function (gruppo) {
    const nomi = gruppo.giorni;
    const elenco = nomi.length > 1 ? nomi.slice(0, -1).join(", ") + " e " + nomi[nomi.length - 1] : nomi[0];
    return elenco + (testoFascia(gruppo.seduta) ? `, ${testoFascia(gruppo.seduta)}` : "") + (gruppo.seduta.campo ? ` • ${gruppo.seduta.campo}` : "");
  }).join("; ");
}

// I campi già usati, suggeriti mentre si scrive
function elencoCampi() {
  const campi = [];
  const aggiungi = function (campo) {
    if (campo && campi.indexOf(campo) === -1) campi.push(campo);
  };
  Object.keys(configurazioneAttiva.orari).forEach(function (categoria) {
    orariCategoria(categoria).sedute.forEach(function (seduta) { aggiungi(seduta.campo); });
  });
  configurazioneAttiva.variazioniOrari.forEach(function (variazione) { aggiungi(variazione.campo); });
  return campi.sort();
}

function htmlListaCampi(id) {
  return `<datalist id="${id}">${elencoCampi().map(function (campo) {
    return `<option value="${pulisciTesto(campo)}"></option>`;
  }).join("")}</datalist>`;
}

// 3. VARIAZIONI DI UNA DATA
// { id, categoria, data, tipo: "annullato" | "modificato" | "aggiunto", inizio, fine, campo, nota, autore }
const tipiVariazione = {
  annullato: "Annullato",
  modificato: "Orario o campo diverso",
  aggiunto: "Allenamento in più",
};

function variazioneDel(categoria, data) {
  return configurazioneAttiva.variazioniOrari.find(function (variazione) {
    return variazione.categoria === categoria && variazione.data === data;
  });
}

function variazioniFuture(categorie) {
  const oggi = oggiIso();
  return configurazioneAttiva.variazioniOrari.filter(function (variazione) {
    return variazione.data >= oggi && categorie.indexOf(variazione.categoria) !== -1;
  }).sort(function (a, b) {
    return a.data < b.data ? -1 : 1;
  });
}

// Il testo dell'avviso per le famiglie, es.
// "Esordienti: l'allenamento di martedì 27 ottobre è annullato. Campo chiuso per maltempo."
function testoVariazione(variazione) {
  const quando = dataEstesa(variazione.data);
  const seduta = sedutaDelGiorno(variazione.categoria, dataDaIso(variazione.data).getDay()) || {};
  const fascia = testoFascia({ inizio: variazione.inizio || seduta.inizio, fine: variazione.fine || seduta.fine });
  const campo = variazione.campo || seduta.campo || "";
  let frase = "";

  if (variazione.tipo === "annullato") frase = `l'allenamento di ${quando} è annullato.`;
  if (variazione.tipo === "modificato") frase = `${quando} l'allenamento cambia: ${fascia}${campo ? " al " + campo : ""}.`;
  if (variazione.tipo === "aggiunto") frase = `allenamento in più ${quando}, ${fascia}${campo ? " al " + campo : ""}.`;

  return `${variazione.categoria}: ${frase}${variazione.nota ? " " + variazione.nota : ""}`;
}

// 4. GLI ALLENAMENTI DI UN PERIODO (orari normali + variazioni)
// Ogni voce: { categoria, data, inizio, fine, campo, stato: "regolare" | "variato" | "annullato" | "aggiunto", nota }
function allenamentiPeriodo(categoria, dal, quantiGiorni) {
  const voci = [];

  for (let i = 0; i < quantiGiorni; i++) {
    const data = aggiungiGiorni(dal, i);
    const seduta = sedutaDelGiorno(categoria, dataDaIso(data).getDay());
    const variazione = variazioneDel(categoria, data);
    const base = {
      categoria: categoria,
      data: data,
      inizio: seduta ? seduta.inizio : "",
      fine: seduta ? seduta.fine : "",
      campo: seduta ? seduta.campo : "",
      nota: "",
    };

    if (variazione) {
      base.nota = variazione.nota || "";
      if (variazione.tipo === "annullato") {
        if (seduta) voci.push(Object.assign(base, { stato: "annullato" }));
      } else {
        voci.push(Object.assign(base, {
          inizio: variazione.inizio || base.inizio,
          fine: variazione.fine || base.fine,
          campo: variazione.campo || base.campo,
          stato: variazione.tipo === "aggiunto" && !seduta ? "aggiunto" : "variato",
        }));
      }
    } else if (seduta) {
      voci.push(Object.assign(base, { stato: "regolare" }));
    }
  }
  return voci;
}

// Il prossimo allenamento non annullato (oggi compreso), null se non ce ne sono
function prossimoAllenamento(categoria) {
  return allenamentiPeriodo(categoria, oggiIso(), 15).find(function (voce) {
    return voce.stato !== "annullato";
  }) || null;
}

// L'appello propone l'ultimo allenamento fatto (oggi compreso), altrimenti oggi
function dataAllenamentoProposta(categoria) {
  const ultimi = allenamentiPeriodo(categoria, aggiungiGiorni(oggiIso(), -7), 8).filter(function (voce) {
    return voce.stato !== "annullato";
  });
  return ultimi.length > 0 ? ultimi[ultimi.length - 1].data : oggiIso();
}

// Esempio: "Gio 22/10 • 17:30–19:00 • Campo A"
function testoAllenamento(voce) {
  return [giornoCorto(voce.data), testoFascia(voce), voce.campo].filter(function (parte) { return parte; }).join(" • ");
}

// 5. CAMPI OCCUPATI DUE VOLTE
// Due allenamenti si sovrappongono se sono nello stesso campo, lo stesso giorno,
// e uno comincia prima che l'altro finisca (senza ora di fine: un'ora e mezza)
function minuti(ora) {
  const parti = ora.split(":");
  return Number(parti[0]) * 60 + Number(parti[1]);
}

function siSovrappongono(a, b) {
  if (!a.campo || !b.campo || !a.inizio || !b.inizio) return false;
  if (a.campo.trim().toLowerCase() !== b.campo.trim().toLowerCase()) return false;
  const inizioA = minuti(a.inizio);
  const fineA = a.fine ? minuti(a.fine) : inizioA + 90;
  const inizioB = minuti(b.inizio);
  const fineB = b.fine ? minuti(b.fine) : inizioB + 90;
  return inizioA < fineB && inizioB < fineA;
}

// Le sovrapposizioni dei prossimi giorni (variazioni comprese).
// Ogni voce: { data, campo, a: allenamento, b: allenamento }
function conflittiCampi(dal, quantiGiorni) {
  const conflitti = [];
  const tutti = [];
  configurazioneAttiva.categorie.forEach(function (categoria) {
    allenamentiPeriodo(categoria, dal, quantiGiorni).forEach(function (voce) {
      if (voce.stato !== "annullato") tutti.push(voce);
    });
  });

  for (let i = 0; i < tutti.length; i++) {
    for (let j = i + 1; j < tutti.length; j++) {
      if (tutti[i].data === tutti[j].data && siSovrappongono(tutti[i], tutti[j])) {
        conflitti.push({ data: tutti[i].data, campo: tutti[i].campo, a: tutti[i], b: tutti[j] });
      }
    }
  }
  return conflitti;
}

// L'allenamento (di quella categoria, quel giorno) è in un campo occupato due volte?
function inConflitto(voce, conflitti) {
  return conflitti.some(function (c) {
    return c.data === voce.data && (c.a.categoria === voce.categoria || c.b.categoria === voce.categoria);
  });
}

function htmlConflitti(conflitti) {
  if (conflitti.length === 0) return `<p class="text-sm text-[#2F636F] font-bold">Nessun campo occupato due volte.</p>`;
  return conflitti.map(function (c) {
    return `
      <p class="conflitto">
        <b>${giornoCorto(c.data)} • ${pulisciTesto(c.campo)}</b>
        ${pulisciTesto(c.a.categoria)} ${pulisciTesto(testoFascia(c.a))} e ${pulisciTesto(c.b.categoria)} ${pulisciTesto(testoFascia(c.b))}
      </p>
    `;
  }).join("");
}

// 6. LA SETTIMANA DISEGNATA: allenamenti e partite insieme (uguale in tutte le aree)
// opzioni.atletaId: nell'area famiglia si mostrano solo le partite in cui l'atleta è convocato
// opzioni.mostraConflitti: segnala i campi occupati due volte (segreteria e allenatore)
function partiteSettimana(categoria, lunedi, opzioni) {
  const domenica = aggiungiGiorni(lunedi, 6);
  return configurazioneAttiva.convocazioni.filter(function (convocazione) {
    if (convocazione.categoria !== categoria || convocazione.data < lunedi || convocazione.data > domenica) return false;
    return !opzioni.atletaId || convocazione.convocati.indexOf(opzioni.atletaId) !== -1;
  }).map(function (convocazione) {
    return {
      categoria: categoria,
      data: convocazione.data,
      inizio: convocazione.ora,
      fine: "",
      campo: convocazione.luogo,
      nota: convocazione.evento + (convocazione.note ? " • " + convocazione.note : ""),
      stato: "partita",
    };
  });
}

function htmlSettimana(categoria, lunedi, opzioni) {
  opzioni = opzioni || {};
  const allenamenti = allenamentiPeriodo(categoria, lunedi, 7);
  const voci = allenamenti.concat(partiteSettimana(categoria, lunedi, opzioni)).sort(function (a, b) {
    return (a.data + a.inizio) < (b.data + b.inizio) ? -1 : 1;
  });
  const conflitti = opzioni.mostraConflitti ? conflittiCampi(lunedi, 7) : [];
  const oggi = oggiIso();

  if (!haOrari(categoria) && voci.length === 0) {
    return `<p class="text-sm text-[#7A8285] py-2">Orari non ancora impostati.</p>`;
  }
  if (voci.length === 0) {
    return `<p class="text-sm text-[#7A8285] py-2">Nessun allenamento in questa settimana.</p>`;
  }

  const etichette = {
    variato: `<span class="etichetta-variazione">Variato</span>`,
    annullato: `<span class="etichetta-variazione etichetta-variazione--annullato">Annullato</span>`,
    aggiunto: `<span class="etichetta-variazione etichetta-variazione--aggiunto">In più</span>`,
    partita: `<span class="etichetta-variazione etichetta-variazione--partita">Partita</span>`,
  };

  return `<div class="settimana">${voci.map(function (voce) {
    const classi = ["settimana__riga"];
    if (voce.data < oggi) classi.push("settimana__riga--passata");
    if (voce.data === oggi) classi.push("settimana__riga--oggi");
    if (voce.stato !== "regolare") classi.push(`settimana__riga--${voce.stato}`);
    const doppio = voce.stato !== "partita" && voce.stato !== "annullato" && inConflitto(voce, conflitti);

    return `
      <div class="${classi.join(" ")}">
        <span class="settimana__giorno">${giornoCorto(voce.data)}${voce.data === oggi ? " <small>oggi</small>" : ""}</span>
        <span class="settimana__orario">${voce.stato === "partita" ? "ritrovo " : ""}${pulisciTesto(testoFascia(voce)) || "—"}</span>
        <span class="settimana__campo">${pulisciTesto(voce.campo) || (voce.stato === "partita" ? "Luogo da definire" : "Campo da definire")}${doppio ? ` <span class="etichetta-variazione etichetta-variazione--annullato">Campo occupato</span>` : ""}</span>
        <span class="settimana__stato">${etichette[voce.stato] || ""}</span>
        ${voce.nota ? `<span class="settimana__nota">${pulisciTesto(voce.nota)}</span>` : ""}
      </div>
    `;
  }).join("")}</div>`;
}

// Esempio: "19–25 ottobre"
function testoSettimana(lunedi) {
  const inizio = dataDaIso(lunedi);
  const fine = dataDaIso(aggiungiGiorni(lunedi, 6));
  const mese = fine.toLocaleDateString("it-IT", { month: "long" });
  if (inizio.getMonth() === fine.getMonth()) return `${inizio.getDate()}–${fine.getDate()} ${mese}`;
  return `${inizio.getDate()} ${inizio.toLocaleDateString("it-IT", { month: "short" })} – ${fine.getDate()} ${mese}`;
}

// 7. MODULO DELLE VARIAZIONI (segreteria e allenatore)
// "prefisso" distingue i campi quando il modulo è usato in pagine diverse
function htmlModuloVariazione(categorie, prefisso) {
  return `
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <label class="text-xs text-[#7A8285] col-span-2 sm:col-span-1">Categoria
        <select id="${prefisso}-categoria" class="input-dsd w-full mt-1">
          ${categorie.map(function (c) { return `<option value="${pulisciTesto(c)}">${pulisciTesto(c)}</option>`; }).join("")}
        </select>
      </label>
      <label class="text-xs text-[#7A8285]">Data
        <input type="text" id="${prefisso}-data" inputmode="numeric" maxlength="10" placeholder="gg/mm/aaaa" class="input-dsd w-full mt-1 font-mono campo-data" />
      </label>
      <label class="text-xs text-[#7A8285] col-span-2 sm:col-span-2">Cosa cambia
        <select id="${prefisso}-tipo" class="input-dsd w-full mt-1">
          ${Object.keys(tipiVariazione).map(function (tipo) { return `<option value="${tipo}">${tipiVariazione[tipo]}</option>`; }).join("")}
        </select>
      </label>
      <label class="text-xs text-[#7A8285] campo-variazione-orario">Dalle
        <input type="text" id="${prefisso}-inizio" maxlength="5" placeholder="17:30" class="input-dsd input-ora w-full mt-1" />
      </label>
      <label class="text-xs text-[#7A8285] campo-variazione-orario">Alle
        <input type="text" id="${prefisso}-fine" maxlength="5" placeholder="19:00" class="input-dsd input-ora w-full mt-1" />
      </label>
      <label class="text-xs text-[#7A8285] col-span-2 campo-variazione-orario">Campo
        <input type="text" id="${prefisso}-campo" list="${prefisso}-campi" placeholder="es. Campo B (sintetico)" class="input-dsd w-full mt-1" />
        ${htmlListaCampi(prefisso + "-campi")}
      </label>
      <label class="text-xs text-[#7A8285] col-span-2 sm:col-span-4">Nota per le famiglie
        <input type="text" id="${prefisso}-nota" placeholder="es. Campo principale chiuso per manutenzione" class="input-dsd w-full mt-1" />
      </label>
      <label class="col-span-2 sm:col-span-4 flex items-center gap-2 text-sm text-[#12181B] cursor-pointer">
        <input type="checkbox" id="${prefisso}-avvisa" checked class="accent-[#4E9EAF] w-4 h-4" />
        Pubblica anche un avviso in bacheca per le famiglie della categoria
      </label>
    </div>
    <p class="text-[11px] text-[#7A8285] mt-2">Lascia vuoti orario e campo se restano quelli di sempre. Per spostare un allenamento a un altro giorno: annulla quello e aggiungine uno in più.</p>
  `;
}

// Con "Annullato" non servono orario e campo
function collegaModuloVariazione(prefisso) {
  const tipo = document.getElementById(`${prefisso}-tipo`);
  if (!tipo) return;
  const aggiorna = function () {
    document.querySelectorAll(`#${prefisso}-inizio, #${prefisso}-fine, #${prefisso}-campo`).forEach(function (campo) {
      campo.closest(".campo-variazione-orario").classList.toggle("hidden", tipo.value === "annullato");
    });
  };
  tipo.onchange = aggiorna;
  aggiorna();
  document.getElementById(`${prefisso}-data`).oninput = function () {
    formattaCampoData(document.getElementById(`${prefisso}-data`));
  };
}

// Legge il modulo: restituisce la variazione da salvare, oppure null (con l'avviso dell'errore)
function leggiModuloVariazione(prefisso, autore) {
  const categoria = document.getElementById(`${prefisso}-categoria`).value;
  const data = dataDaItaliano(document.getElementById(`${prefisso}-data`).value.trim());
  const tipo = document.getElementById(`${prefisso}-tipo`).value;
  const inizio = leggiOra(document.getElementById(`${prefisso}-inizio`).value);
  const fine = leggiOra(document.getElementById(`${prefisso}-fine`).value);
  const campo = document.getElementById(`${prefisso}-campo`).value.trim();
  const nota = document.getElementById(`${prefisso}-nota`).value.trim();
  const seduta = data ? sedutaDelGiorno(categoria, dataDaIso(data).getDay()) : null;

  if (!data) {
    mostraAvviso("Scrivi la data così: gg/mm/aaaa.", "errore");
    return null;
  }
  if (data < oggiIso()) {
    mostraAvviso("La data è già passata.", "errore");
    return null;
  }
  if (inizio === null || fine === null) {
    mostraAvviso("Scrivi gli orari così: 17:30.", "errore");
    return null;
  }
  if (inizio && fine && fine <= inizio) {
    mostraAvviso("L'ora di fine deve venire dopo quella di inizio.", "errore");
    return null;
  }
  if (tipo !== "aggiunto" && !seduta) {
    mostraAvviso(`Quel giorno ${categoria} non si allena: per un allenamento extra scegli "Allenamento in più".`, "errore");
    return null;
  }
  if (tipo === "aggiunto" && !seduta && !inizio) {
    mostraAvviso("Per un allenamento in più scrivi almeno l'ora di inizio.", "errore");
    return null;
  }
  if (tipo === "modificato" && !inizio && !fine && !campo) {
    mostraAvviso("Scrivi il nuovo orario o il nuovo campo.", "errore");
    return null;
  }

  return {
    id: creaId("var"),
    categoria: categoria,
    data: data,
    tipo: tipo,
    inizio: tipo === "annullato" ? "" : inizio,
    fine: tipo === "annullato" ? "" : fine,
    campo: tipo === "annullato" ? "" : campo,
    nota: nota,
    autore: autore,
    avvisa: document.getElementById(`${prefisso}-avvisa`).checked,
  };
}

// Una sola variazione per categoria e data: la nuova sostituisce la vecchia.
// Con "avvisa" si pubblica anche l'avviso in bacheca per le famiglie.
// Restituisce i campi occupati due volte quel giorno (per avvisare chi salva)
function salvaVariazione(variazione) {
  const avvisa = variazione.avvisa;
  delete variazione.avvisa;

  configurazioneAttiva.variazioniOrari = configurazioneAttiva.variazioniOrari.filter(function (v) {
    return !(v.categoria === variazione.categoria && v.data === variazione.data);
  });
  configurazioneAttiva.variazioniOrari.push(variazione);
  if (avvisa) {
    configurazioneAttiva.avvisi.push({ id: creaId("avv"), data: oggiIso(), testo: testoVariazione(variazione), categoria: variazione.categoria, autore: variazione.autore });
  }
  salvaConfigurazione();

  return conflittiCampi(variazione.data, 1).filter(function (c) {
    return c.a.categoria === variazione.categoria || c.b.categoria === variazione.categoria;
  });
}

// Messaggio di conferma dopo il salvataggio (con l'eventuale campo occupato)
function avvisoVariazioneSalvata(variazione, conflitti, avvisata) {
  if (conflitti.length > 0) {
    const c = conflitti[0];
    const altra = c.a.categoria === variazione.categoria ? c.b.categoria : c.a.categoria;
    mostraAvviso(`Salvata, ma attenzione: ${giornoCorto(variazione.data)} il ${c.campo} è occupato anche da ${altra}.`, "errore");
    return;
  }
  mostraAvviso(`Variazione salvata: ${variazione.categoria}, ${giornoCorto(variazione.data)}.${avvisata ? " Avviso pubblicato in bacheca." : ""}`, "ok");
}

function eliminaVariazione(id) {
  configurazioneAttiva.variazioniOrari = configurazioneAttiva.variazioniOrari.filter(function (v) {
    return v.id !== id;
  });
  return salvaConfigurazione();
}

// Elenco delle variazioni in programma: si possono togliere o copiare per il gruppo WhatsApp
function htmlElencoVariazioni(categorie) {
  const variazioni = variazioniFuture(categorie);
  if (variazioni.length === 0) return `<p class="text-sm text-[#7A8285]">Nessuna variazione in programma.</p>`;

  return variazioni.map(function (v) {
    const dettaglio = [testoFascia(v), v.campo, v.nota, v.autore ? "da " + v.autore : ""].filter(function (d) { return d; }).join(" • ");
    return `
      <div class="flex items-start justify-between gap-3 py-2 border-b border-[#E7EBEC] last:border-b-0">
        <span class="min-w-0">
          <strong class="block text-sm">${pulisciTesto(v.categoria)} • ${giornoCorto(v.data)} <span class="font-normal text-[#7A8285]">— ${pulisciTesto(tipiVariazione[v.tipo])}</span></strong>
          ${dettaglio ? `<small class="block text-xs text-[#7A8285]">${pulisciTesto(dettaglio)}</small>` : ""}
        </span>
        <span class="flex flex-col items-end gap-1 shrink-0">
          <button type="button" data-copia-variazione="${v.id}" class="text-[11px] font-bold text-[#4E9EAF] hover:underline cursor-pointer">Copia per il gruppo</button>
          <button type="button" data-elimina-variazione="${v.id}" class="text-[11px] text-[#7A8285] hover:text-[#C94141] underline cursor-pointer">Togli</button>
        </span>
      </div>
    `;
  }).join("");
}

// Pulsanti "Copia per il gruppo" (uguali in segreteria e area allenatore)
function collegaCopiaVariazioni(contenitore) {
  contenitore.querySelectorAll("[data-copia-variazione]").forEach(function (bottone) {
    bottone.onclick = function () {
      const variazione = configurazioneAttiva.variazioniOrari.find(function (v) {
        return v.id === bottone.getAttribute("data-copia-variazione");
      });
      if (!variazione || !navigator.clipboard) return;
      navigator.clipboard.writeText(testoVariazione(variazione)).then(function () {
        mostraAvviso("Messaggio copiato: incollalo nel gruppo WhatsApp della squadra.", "ok");
      }, function () {
        mostraAvviso("Non riesco a copiare il testo da questo browser.", "errore");
      });
    };
  });
}

// 8. SOSPENSIONE PER FESTIVITÀ (es. vacanze di Natale)
// Annulla tutti gli allenamenti del periodo per le categorie scelte.
// Restituisce quanti allenamenti sono stati annullati.
function creaSospensione(dal, al, categorie, nota, autore, avvisa) {
  let annullati = 0;
  const giorni = Math.round((dataDaIso(al) - dataDaIso(dal)) / 86400000) + 1;

  categorie.forEach(function (categoria) {
    for (let i = 0; i < giorni; i++) {
      const data = aggiungiGiorni(dal, i);
      if (!sedutaDelGiorno(categoria, dataDaIso(data).getDay())) continue;
      configurazioneAttiva.variazioniOrari = configurazioneAttiva.variazioniOrari.filter(function (v) {
        return !(v.categoria === categoria && v.data === data);
      });
      configurazioneAttiva.variazioniOrari.push({ id: creaId("var"), categoria: categoria, data: data, tipo: "annullato", inizio: "", fine: "", campo: "", nota: nota, autore: autore });
      annullati++;
    }
  });

  // Un solo avviso: per tutta la società se ci sono tutte le categorie
  if (avvisa && annullati > 0) {
    const tutte = categorie.length === configurazioneAttiva.categorie.length;
    const testo = `Niente allenamenti dal ${dataEstesa(dal)} al ${dataEstesa(al)}${tutte ? "" : " per " + categorie.join(", ")}.${nota ? " " + nota : ""}`;
    const destinatari = tutte ? [""] : categorie;
    destinatari.forEach(function (categoria) {
      configurazioneAttiva.avvisi.push({ id: creaId("avv"), data: oggiIso(), testo: testo, categoria: categoria, autore: autore });
    });
  }

  salvaConfigurazione();
  return annullati;
}

// 9. CALENDARIO DEL TELEFONO (file .ics)
// Allenamenti (con le variazioni) e partite delle prossime 8 settimane in un file
// che si apre con il calendario del telefono o del computer.
// È una fotografia: se cambiano gli orari si scarica di nuovo
// (con il server diventerà un calendario che si aggiorna da solo).
function oraIcs(data, ora) {
  return data.replace(/-/g, "") + "T" + ora.replace(":", "") + "00";
}

function testoIcs(testo) {
  return String(testo || "").replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function creaCalendarioIcs(categorie, opzioni) {
  opzioni = opzioni || {};
  const societa = configurazioneAttiva.nomeSocieta || "D.S.D.";
  const righe = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Digital Sports Desk//IT", "CALSCALE:GREGORIAN", `X-WR-CALNAME:${testoIcs(societa)}`];
  const adesso = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const lunedi = lunediDi(oggiIso());

  categorie.forEach(function (categoria) {
    let voci = [];
    for (let settimana = 0; settimana < 8; settimana++) {
      const inizioSettimana = aggiungiGiorni(lunedi, settimana * 7);
      voci = voci.concat(allenamentiPeriodo(categoria, inizioSettimana, 7), partiteSettimana(categoria, inizioSettimana, opzioni));
    }

    voci.forEach(function (voce, indice) {
      if (voce.stato === "annullato" || !voce.inizio || voce.data < oggiIso()) return;
      const fine = voce.fine || (function () {
        const m = minuti(voce.inizio) + 90;
        return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
      })();
      const titolo = voce.stato === "partita" ? `${categoria}: ${voce.nota}` : `Allenamento ${categoria}`;

      righe.push("BEGIN:VEVENT");
      righe.push(`UID:${categoria.replace(/\W/g, "")}-${voce.data}-${voce.stato}-${indice}@dsd`);
      righe.push(`DTSTAMP:${adesso}`);
      righe.push(`DTSTART:${oraIcs(voce.data, voce.inizio)}`);
      righe.push(`DTEND:${oraIcs(voce.data, fine)}`);
      righe.push(`SUMMARY:${testoIcs(titolo)}`);
      if (voce.campo) righe.push(`LOCATION:${testoIcs(voce.campo)}`);
      if (voce.nota && voce.stato !== "partita") righe.push(`DESCRIPTION:${testoIcs(voce.nota)}`);
      righe.push("END:VEVENT");
    });
  });

  righe.push("END:VCALENDAR");
  return righe.join("\r\n");
}

function scaricaCalendario(categorie, nomeFile, opzioni) {
  const file = new Blob([creaCalendarioIcs(categorie, opzioni)], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = nomeFile.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase() + ".ics";
  link.click();
  URL.revokeObjectURL(link.href);
  mostraAvviso("Calendario scaricato: aprilo per aggiungere gli allenamenti al telefono o al computer.", "ok");
}
