/* ==================================================================
   D.S.D. — societa.js (Portale v4)
   Sezione "Società": dati e logo della società, contatti, categorie
   con il loro allenatore, quota predefinita, passaggio alla nuova
   stagione e strumenti per i dati (backup, ripristino, azzeramento).
   ================================================================== */

// 1. DATI DELLA SOCIETÀ
// Il logo in modifica (viene salvato solo premendo "Salva dati")
let logoInModifica = "";

// Riempie il modulo con i dati salvati (all'apertura della sezione)
function compilaModuloSocieta() {
  const config = configurazioneAttiva;

  document.getElementById("soc-nome").value = config.nomeSocieta;
  document.getElementById("soc-sport").value = ["calcio", "pallavolo", "basket", "tennis"].indexOf(config.sport) !== -1 ? config.sport : "altro";
  document.getElementById("soc-sport-altro").value = config.sportPersonalizzato || "";
  document.getElementById("soc-affiliazione").value = config.contatti.codiceAffiliazione;
  document.getElementById("soc-codice-fiscale").value = config.contatti.codiceFiscale;
  document.getElementById("soc-iban").value = config.contatti.iban;
  document.getElementById("soc-eta-agonistica").value = config.etaAgonistica;
  document.getElementById("soc-email").value = config.contatti.email;
  document.getElementById("soc-telefono").value = config.contatti.telefono;
  document.getElementById("soc-indirizzo").value = config.contatti.indirizzo;
  document.getElementById("soc-quota").value = config.quotaPredefinita || "";

  logoInModifica = config.logo;
  renderAnteprimaLogo();
  aggiornaCampoSportAltro();
}

function aggiornaCampoSportAltro() {
  const altro = document.getElementById("soc-sport").value === "altro";
  document.getElementById("soc-sport-altro-box").classList.toggle("hidden", !altro);
}

function renderAnteprimaLogo() {
  const anteprima = document.getElementById("soc-logo-anteprima");
  anteprima.innerHTML = logoInModifica
    ? `<img src="${logoInModifica}" alt="Logo della società" class="max-w-full max-h-full object-contain" />`
    : `<span class="font-mono text-[10px] uppercase text-[#7A8285] text-center px-2">Nessun logo</span>`;
  document.getElementById("soc-logo-rimuovi").classList.toggle("hidden", !logoInModifica);
}

function salvaDatiSocieta() {
  const config = configurazioneAttiva;
  const sport = document.getElementById("soc-sport").value;

  config.nomeSocieta = document.getElementById("soc-nome").value.trim();
  config.sport = sport;
  config.sportPersonalizzato = sport === "altro" ? document.getElementById("soc-sport-altro").value.trim() : "";
  config.logo = logoInModifica;
  config.contatti = {
    codiceAffiliazione: document.getElementById("soc-affiliazione").value.trim(),
    codiceFiscale: document.getElementById("soc-codice-fiscale").value.trim().toUpperCase(),
    iban: document.getElementById("soc-iban").value.replace(/\s/g, "").toUpperCase(),
    email: document.getElementById("soc-email").value.trim(),
    telefono: document.getElementById("soc-telefono").value.trim(),
    indirizzo: document.getElementById("soc-indirizzo").value.trim(),
  };

  // Età del certificato agonistico (tra 6 e 18 anni, altrimenti resta com'era)
  const eta = Number(document.getElementById("soc-eta-agonistica").value);
  if (eta >= 6 && eta <= 18) config.etaAgonistica = eta;

  if (!salvaConfigurazione()) return;
  aggiornaTutto();
  popolaSelectCategorie(config.categorie);
  mostraAvviso("Dati della società salvati.", "ok");
}

// 2. CATEGORIE E STAFF
// Ogni riga ha il nome originale (data-originale) per capire se è stata rinominata
function renderCategorieSocieta() {
  const lista = document.getElementById("soc-categorie");
  lista.innerHTML = "";

  configurazioneAttiva.categorie.forEach(function (categoria) {
    lista.appendChild(creaRigaCategoriaSocieta(categoria));
  });
}

function contaAtletiCategoria(categoria) {
  return configurazioneAttiva.atleti.filter(function (atleta) {
    return atleta.categoria === categoria;
  }).length;
}

function creaRigaCategoriaSocieta(categoria) {
  const atleti = categoria ? contaAtletiCategoria(categoria) : 0;
  const riga = document.createElement("div");
  riga.className = "riga-categoria-societa";
  riga.setAttribute("data-originale", categoria);

  riga.innerHTML = `
    <div>
      <label>Categoria</label>
      <input type="text" value="${pulisciTesto(categoria)}" placeholder="es. Under 10" class="cat-nome input-dsd w-full py-1.5" />
    </div>
    <div>
      <label>Staff</label>
      <p class="text-sm text-[#12181B] py-1.5 truncate">${categoria && testoStaffCategoria(categoria) ? pulisciTesto(testoStaffCategoria(categoria)) : `<span class="text-[#7A8285]">—</span>`}</p>
    </div>
    <div class="flex items-end justify-between gap-2">
      <span class="text-xs text-[#7A8285] pb-2">${atleti} ${atleti === 1 ? "atleta" : "atleti"}</span>
      <button type="button" class="cat-elimina text-[#7A8285] hover:text-[#C94141] font-bold text-xs px-2 py-2 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        ${atleti > 0 ? `disabled title="Sposta prima gli atleti in un'altra categoria"` : `title="Elimina categoria"`}>✕</button>
    </div>
  `;

  riga.querySelector(".cat-elimina").onclick = function () {
    riga.remove();
  };
  return riga;
}

function salvaCategorieSocieta() {
  const righe = document.querySelectorAll("#soc-categorie .riga-categoria-societa");
  const nuoveCategorie = [];
  const rinomine = [];

  for (let i = 0; i < righe.length; i++) {
    const riga = righe[i];
    const nome = riga.querySelector(".cat-nome").value.trim();
    const originale = riga.getAttribute("data-originale");

    if (nome === "") {
      mostraAvviso("Ogni categoria deve avere un nome.", "errore");
      return;
    }
    if (nuoveCategorie.indexOf(nome) !== -1) {
      mostraAvviso(`La categoria "${nome}" compare due volte.`, "errore");
      return;
    }

    nuoveCategorie.push(nome);
    if (originale && originale !== nome) rinomine.push({ da: originale, a: nome });
  }

  if (nuoveCategorie.length === 0) {
    mostraAvviso("Serve almeno una categoria.", "errore");
    return;
  }

  // Le categorie rinominate vengono aggiornate anche sugli atleti
  rinomine.forEach(function (rinomina) {
    configurazioneAttiva.atleti.forEach(function (atleta) {
      if (atleta.categoria === rinomina.da) atleta.categoria = rinomina.a;
    });
  });

  // ...e sullo staff: le categorie rinominate cambiano nome,
  // quelle eliminate vengono tolte agli allenatori
  configurazioneAttiva.allenatori.forEach(function (allenatore) {
    allenatore.categorie = allenatore.categorie.map(function (categoria) {
      const rinomina = rinomine.find(function (r) {
        return r.da === categoria;
      });
      return rinomina ? rinomina.a : categoria;
    }).filter(function (categoria) {
      return nuoveCategorie.indexOf(categoria) !== -1;
    });
  });

  // ...e sugli orari e le variazioni degli allenamenti
  const nuoviOrari = {};
  Object.keys(configurazioneAttiva.orari).forEach(function (categoria) {
    const rinomina = rinomine.find(function (r) { return r.da === categoria; });
    const nome = rinomina ? rinomina.a : categoria;
    if (nuoveCategorie.indexOf(nome) !== -1) nuoviOrari[nome] = configurazioneAttiva.orari[categoria];
  });
  configurazioneAttiva.orari = nuoviOrari;
  configurazioneAttiva.variazioniOrari = configurazioneAttiva.variazioniOrari.map(function (variazione) {
    const rinomina = rinomine.find(function (r) { return r.da === variazione.categoria; });
    if (rinomina) variazione.categoria = rinomina.a;
    return variazione;
  }).filter(function (variazione) {
    return nuoveCategorie.indexOf(variazione.categoria) !== -1;
  });

  configurazioneAttiva.categorie = nuoveCategorie;

  if (!salvaConfigurazione()) return;
  aggiornaTutto();
  renderCategorieSocieta();   // le righe ripartono con i nomi nuovi
  renderOrariSocieta();
  mostraAvviso(rinomine.length > 0
    ? `Categorie salvate (${rinomine.length} rinominate, atleti aggiornati).`
    : "Categorie salvate.", "ok");
}

// 2-bis. ORARI DEGLI ALLENAMENTI, VARIAZIONI E SOSPENSIONI
// Per ogni categoria un riquadro richiudibile con i sette giorni:
// ogni giorno spuntato ha il suo orario (dalle-alle) e il suo campo
function renderOrariSocieta() {
  const lista = document.getElementById("soc-orari");
  let htmlAccumulato = "";

  configurazioneAttiva.categorie.forEach(function (categoria) {
    let giorniHtml = "";
    giorniBrevi.forEach(function (giorno) {
      const seduta = sedutaDelGiorno(categoria, giorno.g);
      giorniHtml += `
        <div class="riga-giorno ${seduta ? "" : "riga-giorno--spenta"}" data-giorno="${giorno.g}">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" class="giorno-attivo accent-[#4E9EAF] w-4 h-4" ${seduta ? "checked" : ""} />
            <span class="riga-giorno__nome">${giorniSettimana[giorno.g]}</span>
          </label>
          <span class="flex items-center gap-2">
            <input type="text" value="${seduta ? pulisciTesto(seduta.inizio) : ""}" placeholder="17:30" maxlength="5" aria-label="Inizio ${giorniSettimana[giorno.g]}" class="giorno-inizio input-dsd input-ora" ${seduta ? "" : "disabled"} />
            <span class="text-xs text-[#7A8285]">–</span>
            <input type="text" value="${seduta ? pulisciTesto(seduta.fine) : ""}" placeholder="19:00" maxlength="5" aria-label="Fine ${giorniSettimana[giorno.g]}" class="giorno-fine input-dsd input-ora" ${seduta ? "" : "disabled"} />
          </span>
          <input type="text" value="${seduta ? pulisciTesto(seduta.campo) : ""}" list="soc-campi" placeholder="Campo" aria-label="Campo ${giorniSettimana[giorno.g]}" class="giorno-campo input-dsd w-full" ${seduta ? "" : "disabled"} />
        </div>
      `;
    });

    htmlAccumulato += `
      <details class="blocco-orari" data-categoria-orari="${pulisciTesto(categoria)}">
        <summary>
          <strong>${pulisciTesto(categoria)}</strong>
          <span>${pulisciTesto(testoOrari(categoria)) || "Nessun orario impostato"}</span>
        </summary>
        <div class="blocco-orari__giorni">${giorniHtml}</div>
        <button type="button" class="copia-orario text-[11px] font-bold text-[#4E9EAF] hover:underline cursor-pointer mt-2">Copia l'orario del primo giorno sugli altri giorni spuntati</button>
      </details>
    `;
  });

  lista.innerHTML = htmlAccumulato + htmlListaCampi("soc-campi");
  collegaRigheOrari(lista);

  // Campi occupati due volte nelle prossime due settimane
  document.getElementById("soc-conflitti").innerHTML = htmlConflitti(conflittiCampi(oggiIso(), 14));

  // Variazioni e sospensioni
  document.getElementById("soc-variazione-modulo").innerHTML = htmlModuloVariazione(configurazioneAttiva.categorie, "soc-var");
  collegaModuloVariazione("soc-var");
  renderSospensioneSocieta();
  renderElencoVariazioniSocieta();
}

function collegaRigheOrari(lista) {
  // Spuntando un giorno si accendono i suoi campi (e prende l'orario del primo giorno già compilato)
  lista.querySelectorAll(".riga-giorno").forEach(function (riga) {
    const casella = riga.querySelector(".giorno-attivo");
    casella.onchange = function () {
      riga.classList.toggle("riga-giorno--spenta", !casella.checked);
      riga.querySelectorAll("input[type=text]").forEach(function (campo) { campo.disabled = !casella.checked; });
      if (casella.checked && riga.querySelector(".giorno-inizio").value === "") {
        const modello = Array.prototype.find.call(riga.parentNode.querySelectorAll(".riga-giorno"), function (altra) {
          return altra !== riga && altra.querySelector(".giorno-attivo").checked && altra.querySelector(".giorno-inizio").value;
        });
        if (modello) {
          ["inizio", "fine", "campo"].forEach(function (nome) {
            riga.querySelector(`.giorno-${nome}`).value = modello.querySelector(`.giorno-${nome}`).value;
          });
        }
      }
    };
  });

  lista.querySelectorAll(".copia-orario").forEach(function (bottone) {
    bottone.onclick = function () {
      const righe = Array.prototype.filter.call(bottone.parentNode.querySelectorAll(".riga-giorno"), function (riga) {
        return riga.querySelector(".giorno-attivo").checked;
      });
      if (righe.length < 2) {
        mostraAvviso("Spunta almeno due giorni.", "info");
        return;
      }
      righe.slice(1).forEach(function (riga) {
        ["inizio", "fine", "campo"].forEach(function (nome) {
          riga.querySelector(`.giorno-${nome}`).value = righe[0].querySelector(`.giorno-${nome}`).value;
        });
      });
    };
  });
}

function renderElencoVariazioniSocieta() {
  const elenco = document.getElementById("soc-variazioni");
  elenco.innerHTML = htmlElencoVariazioni(configurazioneAttiva.categorie);
  collegaCopiaVariazioni(elenco);
  elenco.querySelectorAll("[data-elimina-variazione]").forEach(function (bottone) {
    bottone.onclick = function () {
      eliminaVariazione(bottone.getAttribute("data-elimina-variazione"));
      aggiornaTutto();
      renderElencoVariazioniSocieta();
      document.getElementById("soc-conflitti").innerHTML = htmlConflitti(conflittiCampi(oggiIso(), 14));
    };
  });
}

function salvaOrariSocieta() {
  const nuoviOrari = {};
  const blocchi = document.querySelectorAll("#soc-orari [data-categoria-orari]");

  for (let i = 0; i < blocchi.length; i++) {
    const categoria = blocchi[i].getAttribute("data-categoria-orari");
    const sedute = [];
    const righe = blocchi[i].querySelectorAll(".riga-giorno");

    for (let j = 0; j < righe.length; j++) {
      const riga = righe[j];
      if (!riga.querySelector(".giorno-attivo").checked) continue;
      const giorno = Number(riga.getAttribute("data-giorno"));
      const inizio = leggiOra(riga.querySelector(".giorno-inizio").value);
      const fine = leggiOra(riga.querySelector(".giorno-fine").value);
      const nomeGiorno = giorniSettimana[giorno];

      if (inizio === null || fine === null) {
        mostraAvviso(`${categoria}, ${nomeGiorno}: scrivi l'orario così, 17:30.`, "errore");
        blocchi[i].open = true;
        return;
      }
      if (!inizio) {
        mostraAvviso(`${categoria}, ${nomeGiorno}: manca l'ora di inizio.`, "errore");
        blocchi[i].open = true;
        return;
      }
      if (fine && fine <= inizio) {
        mostraAvviso(`${categoria}, ${nomeGiorno}: l'ora di fine deve venire dopo quella di inizio.`, "errore");
        blocchi[i].open = true;
        return;
      }
      sedute.push({ giorno: giorno, inizio: inizio, fine: fine, campo: riga.querySelector(".giorno-campo").value.trim() });
    }
    nuoviOrari[categoria] = { sedute: sedute };
  }

  configurazioneAttiva.orari = nuoviOrari;
  if (!salvaConfigurazione()) return;
  aggiornaTutto();
  renderOrariSocieta();

  // Avviso se lo stesso campo è occupato due volte
  const conflitti = conflittiCampi(oggiIso(), 14);
  if (conflitti.length > 0) {
    mostraAvviso(`Orari salvati, ma ci sono ${conflitti.length} sovrapposizioni di campo: le trovi sotto gli orari.`, "errore");
  } else {
    mostraAvviso("Orari degli allenamenti salvati: li vedono anche allenatori e famiglie.", "ok");
  }
}

function aggiungiVariazioneSocieta() {
  const variazione = leggiModuloVariazione("soc-var", "Segreteria");
  if (!variazione) return;
  const avvisa = variazione.avvisa;
  const conflitti = salvaVariazione(variazione);
  aggiornaTutto();
  renderOrariSocieta();
  avvisoVariazioneSalvata(variazione, conflitti, avvisa);
}

// Sospensione per festività: annulla tutti gli allenamenti di un periodo
function renderSospensioneSocieta() {
  document.getElementById("soc-sosp-categorie").innerHTML = configurazioneAttiva.categorie.map(function (categoria) {
    return `
      <label class="scelta-categoria">
        <input type="checkbox" value="${pulisciTesto(categoria)}" checked class="accent-[#4E9EAF] w-4 h-4" />
        <span>${pulisciTesto(categoria)}</span>
      </label>
    `;
  }).join("");
}

function aggiungiSospensioneSocieta() {
  const dal = dataDaItaliano(document.getElementById("soc-sosp-dal").value.trim());
  const al = dataDaItaliano(document.getElementById("soc-sosp-al").value.trim());
  const nota = document.getElementById("soc-sosp-nota").value.trim();
  const categorie = [];
  document.querySelectorAll("#soc-sosp-categorie input:checked").forEach(function (casella) {
    categorie.push(casella.value);
  });

  if (!dal || !al) {
    mostraAvviso("Scrivi le date così: gg/mm/aaaa.", "errore");
    return;
  }
  if (dal < oggiIso() || al < dal) {
    mostraAvviso("Controlla le date: il periodo deve essere nel futuro e finire dopo l'inizio.", "errore");
    return;
  }
  if (categorie.length === 0) {
    mostraAvviso("Scegli almeno una categoria.", "errore");
    return;
  }

  const annullati = creaSospensione(dal, al, categorie, nota, "Segreteria", document.getElementById("soc-sosp-avvisa").checked);
  aggiornaTutto();
  renderOrariSocieta();
  ["soc-sosp-dal", "soc-sosp-al", "soc-sosp-nota"].forEach(function (id) { document.getElementById(id).value = ""; });
  mostraAvviso(annullati > 0 ? `Sospensione salvata: ${annullati} allenamenti annullati.` : "In quel periodo non c'erano allenamenti da annullare.", annullati > 0 ? "ok" : "info");
}

// 3. STAGIONE E QUOTE
function renderStagione() {
  const config = configurazioneAttiva;
  let incassato = 0;
  config.atleti.forEach(function (atleta) {
    incassato += versatoQuota(atleta);
  });

  document.getElementById("soc-stagione").textContent = config.stagione;
  document.getElementById("soc-incassato").textContent = formattaEuro(incassato);
  document.getElementById("soc-da-incassare").textContent = formattaEuro(totaleQuoteDaIncassare());
  document.getElementById("btn-nuova-stagione").textContent = `Passa alla stagione ${stagioneSuccessiva(config.stagione)}`;

  // Stagioni archiviate
  let htmlAccumulato = "";
  config.storicoStagioni.slice().reverse().forEach(function (stagione) {
    let versato = 0;
    stagione.quote.forEach(function (quota) { versato += quota.versato; });
    htmlAccumulato += `
      <div class="flex items-center justify-between gap-3 py-2 border-b border-[#E7EBEC] last:border-b-0 text-sm">
        <span><strong>${pulisciTesto(stagione.stagione)}</strong> <span class="text-[#7A8285]">• chiusa il ${formattaData(stagione.chiusaIl)}</span></span>
        <span class="font-mono text-xs text-[#7A8285]">${stagione.quote.length} atleti • ${formattaEuro(versato)} incassati</span>
      </div>
    `;
  });
  document.getElementById("soc-storico").innerHTML = htmlAccumulato ||
    `<p class="text-sm text-[#7A8285]">Nessuna stagione archiviata.</p>`;
}

function salvaQuotaPredefinita() {
  const valore = document.getElementById("soc-quota").value.replace(",", ".");
  const numero = valore === "" ? 0 : Number(valore);

  if (isNaN(numero) || numero < 0) {
    mostraAvviso("La quota deve essere un importo valido (es. 250).", "errore");
    return;
  }

  configurazioneAttiva.quotaPredefinita = numero;
  if (!salvaConfigurazione()) return;
  aggiornaTutto();
  mostraAvviso(`Quota predefinita: ${formattaEuro(numero)}. Vale per chi non ha una quota personalizzata.`, "ok");
}

// Esempio: dopo "2026/27" viene "2027/28"
function stagioneSuccessiva(stagione) {
  const anno = parseInt(String(stagione).slice(0, 4), 10);
  if (isNaN(anno)) return stagioneSportiva();
  return `${anno + 1}/${String(anno + 2).slice(2)}`;
}

// Nuova stagione: archiviamo quote e prenotazioni chiuse, poi ripartiamo.
// Atleti, documenti, categorie e magazzino restano come sono.
function passaNuovaStagione() {
  const config = configurazioneAttiva;
  const attuale = config.stagione;
  const prossima = stagioneSuccessiva(attuale);

  chiediConferma({
    titolo: `Passare alla stagione ${prossima}?`,
    testo: `I pagamenti delle quote ${attuale} vengono archiviati e le quote ripartono da zero; le prenotazioni consegnate o annullate vengono archiviate. Atleti, documenti, categorie e magazzino restano. Consiglio: scarica prima un backup.`,
    conferma: "Passa alla nuova stagione",
  }, function () {
    config.storicoStagioni.push({
      stagione: attuale,
      chiusaIl: oggiIso(),
      quote: config.atleti.map(function (atleta) {
        return { atletaId: atleta.id, nome: nomeCompleto(atleta), importo: importoQuota(atleta), versato: versatoQuota(atleta) };
      }),
      prenotazioniArchiviate: config.magazzino.prenotazioni.filter(function (pren) {
        return pren.stato !== "aperta";
      }),
    });

    config.atleti.forEach(function (atleta) {
      atleta.quota.pagamenti = [];
    });
    config.magazzino.prenotazioni = config.magazzino.prenotazioni.filter(function (pren) {
      return pren.stato === "aperta";
    });
    config.stagione = prossima;

    if (!salvaConfigurazione()) return;
    aggiornaTutto();
    mostraAvviso(`Benvenuti nella stagione ${prossima}!`, "ok");
  });
}

// 4. RENDER E AVVIO DELLA SEZIONE
function renderSocieta() {
  renderStagione();

  // Le categorie si ridisegnano solo se la sezione non è aperta,
  // così non si perdono le modifiche che si stanno scrivendo
  if (sezioneAttiva !== "societa") {
    renderCategorieSocieta();
    renderOrariSocieta();
  } else {
    renderElencoVariazioniSocieta();
  }
}

// Chiamata da mostraSezione quando si apre "Società"
function apriSezioneSocieta() {
  compilaModuloSocieta();
  renderCategorieSocieta();
  renderOrariSocieta();
  renderStagione();
}

function initSocieta() {
  document.getElementById("soc-sport").onchange = aggiornaCampoSportAltro;
  document.getElementById("btn-salva-societa").onclick = salvaDatiSocieta;
  document.getElementById("btn-salva-categorie").onclick = salvaCategorieSocieta;
  document.getElementById("btn-salva-orari").onclick = salvaOrariSocieta;
  document.getElementById("btn-aggiungi-variazione").onclick = aggiungiVariazioneSocieta;
  document.getElementById("btn-aggiungi-sospensione").onclick = aggiungiSospensioneSocieta;
  ["soc-sosp-dal", "soc-sosp-al"].forEach(function (id) {
    document.getElementById(id).oninput = function () { formattaCampoData(document.getElementById(id)); };
  });
  document.getElementById("btn-salva-quota").onclick = salvaQuotaPredefinita;
  document.getElementById("btn-nuova-stagione").onclick = passaNuovaStagione;

  document.getElementById("btn-nuova-categoria").onclick = function () {
    const riga = creaRigaCategoriaSocieta("", {});
    document.getElementById("soc-categorie").appendChild(riga);
    riga.querySelector(".cat-nome").focus();
  };

  // Logo: PNG così resta lo sfondo trasparente
  const inputLogo = document.getElementById("soc-logo-input");
  inputLogo.onchange = function () {
    riduciFoto(inputLogo.files[0], 300, function (logo) {
      logoInModifica = logo;
      renderAnteprimaLogo();
    }, "image/png");
    inputLogo.value = "";
  };
  document.getElementById("soc-logo-rimuovi").onclick = function () {
    logoInModifica = "";
    renderAnteprimaLogo();
  };

  // Strumenti per i dati (gli stessi del piè di pagina)
  document.getElementById("soc-backup").onclick = scaricaBackup;
  document.getElementById("soc-azzera").onclick = resetConfigurazione;
}
