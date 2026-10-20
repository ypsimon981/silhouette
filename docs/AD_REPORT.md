# Timeshapes — rapporto opportunità pubblicitarie

Data: 21 ottobre 2026.

**Osservati 31 ingressi qualificati in 10.00 minuti di browser**, cioè 3.10 al minuto. Si tratta di una singola sessione automatizzata con comportamento sintetico, non di una media misurata su giocatori umani. Le impression AdMob osservate sono 0: il prototipo non integra l’SDK.

## Misurazione

Viewport 390x844, Chromium 153.0.8010.0. Partite completate: 9; iniziate: 9; scadute: 0; abbandonate: 0. Gioco attivo 318.8 s; foreground 600.1 s; background 0.0 s. Schermate idonee 221.2 s; segnaposto visibile 221.2 s.

Visite complessive 40; opportunità grezze 31; qualificate 31; cambi di contesto 4; apparizioni dello slot 10. Nessun caricamento pubblicitario: richieste 0, caricati 0, mostrati SDK 0, impression 0, ricavi 0.

| Schermata | Visite | Opportunità | Qualificate | Permanenza (s) | Slot visibile (s) |
|---|---:|---:|---:|---:|---:|
| livelli | 11 | 11 | 11 | 77.3 | 77.3 |
| gioco | 9 | 0 | 0 | 378.9 | 0.0 |
| classifica | 10 | 10 | 10 | 73.0 | 73.0 |
| performance | 10 | 10 | 10 | 71.0 | 71.0 |

La sessione alterna livelli 1 e 2, countdown, dieci trascinamenti per partita, risultati senza banner, classifica, occasionali filtri nazionali, performance e ritorno ai livelli. Le attese sono reali, senza accelerare il cronometro del test. I trascinamenti sono automatizzati; le risposte delle classifiche sono simulate e non vengono scritti record in produzione. Le attese e la lentezza del browser remoto influiscono sul ritmo: il risultato non descrive la frequenza naturale dei giocatori. Il tempo iniziale di costruzione del monitor può precedere la prima schermata classificata.

## Proiezioni di durata

Proiezioni lineari allo stesso ritmo della sessione. Non sono altre sessioni osservate; le cifre decimali sono valori attesi. La permanenza finale ai livelli può abbassare la frequenza rispetto ai cicli precedenti.

| Minuti | Opportunità qualificate proiettate | Impression al 25% | al 50% | al 75% |
|---:|---:|---:|---:|---:|
| 5 | 15.5 | 3.9 | 7.7 | 11.6 |
| 10 | 31.0 | 7.7 | 15.5 | 23.2 |
| 15 | 46.5 | 11.6 | 23.2 | 34.9 |
| 20 | 62.0 | 15.5 | 31.0 | 46.5 |

## Scenari economici

Con un unico banner conservato per tutta la sessione e nessun refresh, anche molte riaperture potrebbero corrispondere a una sola impression dopo il primo caricamento riuscito. Le opportunità da sole non identificano la politica di caricamento e refresh. Le percentuali seguenti mostrano soltanto la sensibilità dei ricavi a questa incertezza.

Ipotesi: una sessione di 10 minuti per giocatore attivo al giorno, tutti con il ritmo proiettato sopra. Conversioni 25%, 50%, 75% scelte solo per analisi di sensibilità: nessuna è misurata. Il rapporto include riutilizzo del banner, mancate richieste, mancato fill, consenso, latenza e mancata impression. Non moltiplicare ulteriormente per il fill se questo è già compreso nel rapporto. Nessun refresh aggiuntivo è ipotizzato; con refresh SDK il rapporto impression/opportunità potrebbe anche superare 1.

Formula: **ricavo giornaliero = DAU × sessioni/giorno × opportunità/10 min × conversione × eCPM / 1.000**. eCPM in euro forniti come scenario, non prezzi verificati né medie globali. Importi lordi stimati prima di imposte e costi operativi; nessun cambio valuta implicito.

| Conversione | DAU | Impression/giorno | €/giorno eCPM 0,20 € | eCPM 0,50 € | eCPM 1,00 € |
|---:|---:|---:|---:|---:|---:|
| 25% | 1000 | 7749 | 1.55 | 3.87 | 7.75 |
| 25% | 10.000 | 77.488 | 15.50 | 38.74 | 77.49 |
| 25% | 100.000 | 774.884 | 154.98 | 387.44 | 774.88 |
| 25% | 500.000 | 3.874.419 | 774.88 | 1937.21 | 3874.42 |
| 50% | 1000 | 15.498 | 3.10 | 7.75 | 15.50 |
| 50% | 10.000 | 154.977 | 31.00 | 77.49 | 154.98 |
| 50% | 100.000 | 1.549.768 | 309.95 | 774.88 | 1549.77 |
| 50% | 500.000 | 7.748.839 | 1549.77 | 3874.42 | 7748.84 |
| 75% | 1000 | 23.247 | 4.65 | 11.62 | 23.25 |
| 75% | 10.000 | 232.465 | 46.49 | 116.23 | 232.47 |
| 75% | 100.000 | 2.324.652 | 464.93 | 1162.33 | 2324.65 |
| 75% | 500.000 | 11.623.258 | 2324.65 | 5811.63 | 11623.26 |

Per 30 giorni moltiplicare per 30; per due sessioni giornaliere uguali moltiplicare per due. Il CSV allegato contiene anche i ricavi mensili per tutte le 36 combinazioni.

## Verifiche e limiti

Il test di durata ha eseguito 36 controlli di assenza banner/HUD in preparazione, countdown, partita e risultati. Errori JavaScript: 0. Sette test unitari coprono deduplicazione, continuità della soglia, background, permanenza, ritorni, callback e fine sessione. I controlli browser aggiuntivi sono documentati nella PR insieme all’esito del confronto del cronometro.

La verifica non è un benchmark prestazionale su telefoni Android/iOS. Prima di stimare il numero realistico medio servono esportazioni di sessioni umane su più giocatori e livelli, comprese sessioni con molti replay e poche classifiche. Calcolare la media ponderata sul tempo, la mediana per sessione e la dispersione; poi misurare il rapporto effettivo con i callback SDK. Una sola sequenza automatica non può stabilire una media di popolazione.

## Cosa manca per impression e ricavi effettivi

Integrare Anchored Adaptive nel wrapper Android/iOS, agganciare impression e paid callback, distinguere caricamento e visibilità, registrare ogni refresh SDK con ID deduplicabili e riconciliare con AdMob. Il prototipo contiene soltanto un bridge di collaudo. Le callback ufficiali e i nomi dei campi sono descritti in [AD_MONITOR.md](AD_MONITOR.md), con link alle fonti Google. Nessun annuncio reale, merge o deploy di produzione è necessario per usare questa modalità.
