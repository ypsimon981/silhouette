# v0.22.44 — ombre leggere e patate senza faccine

Correzione del rallentamento avvertito durante il trascinamento, crescente con i pezzi già posati. Le nuove ombre mantengono la luce virtuale centrale, la direzione basata sulla posizione attuale e le opacità approvate (.36 contatto, .30 proiezione a riposo, .23 sollevamento).

## Modifiche

- I filtri SVG di sfocatura in tempo reale sono sostituiti da tre immagini alpha già sfocate. Il profilo è sempre quello del pezzo esistente, compresa la rotazione.
- Ogni sagoma/rotazione viene preparata una sola volta e conservata in cache. Il calcolo della sfocatura avviene in un Web Worker; se i Worker non sono disponibili, viene diviso in piccoli passaggi durante i tempi liberi del browser. Non richiede `CanvasRenderingContext2D.filter`.
- Durante il trascinamento si aggiornano solo trasformazioni e opacità dell’ombra del pezzo attivo. Le patate ferme non vengono ripercorse, né si leggono le loro matrici SVG o dimensioni a ogni movimento.
- Le faccine non vengono più costruite, sia nel renderer normale sia nel fallback. È rimosso il caricamento del gestore delle animazioni facciali e delle gag. Resta il breve assestamento del corpo all’incastro, con ombra stabile a terra.
- Corpi, sagome, texture, incastri, sfondo, regole, audio di gioco, tempi, settori e classifiche restano quelli esistenti. La L fotografica e gli incastri di farina sono esclusi da questo passaggio.

## Verifiche

- 173 varianti del catalogo: stesso profilo per pezzo e ombra, nessuna faccina e nessun filtro SVG nelle nuove ombre.
- Trascinamento con nove pezzi posati e uno attivo: zero letture `getCTM` durante il movimento e zero nodi di sfocatura SVG.
- Partite complete tramite puntatore a 320×568, 390×844 e 768×1024 nei livelli 1, 13 e 17; annullamento del trascinamento, cambio di direzione della luce, sollevamento, assestamento e risultato finale.
- Test aggiornati delle patate senza volto: preservazione dei contorni, delle varietà e delle regole di posizionamento.

Nei controlli aggiuntivi su comportamento, settori e voci sono passati 12 test su 13. Il solo errore riguarda la maiuscola della parola «Livello» nell’etichetta di un pulsante: è stato riprodotto anche sulla versione precedente, commit `2f292007`, e non è causato da questa modifica.

Queste sono verifiche Chromium desktop. Non costituiscono una certificazione delle prestazioni del telefono reale né una promessa di 60 FPS.

## File e uso

`potato-shadows.js` prepara le immagini e aggiorna le sole ombre interessate. `potato-shadows.css` gestisce i livelli compositi. `index.html` mantiene il trascinamento esistente, rimuove la costruzione delle facce e carica la revisione 2 delle ombre; numero visibile v0.22.44.

Test mirati: `node --test tests/potatoes.test.cjs tests/shadows-ui.test.cjs`. Playwright è già una dipendenza di sviluppo del progetto; `PLAYWRIGHT_MODULE` e `CHROMIUM_EXECUTABLE` permettono di usare installazioni/browser alternativi.

`tests/build-shadow-game-preview.cjs` produce una copia HTML autonoma per revisione. Solo nella copia autonoma profilo e risultati sono temporanei e le richieste di rete sono disattivate. La configurazione social del repository non viene modificata.
