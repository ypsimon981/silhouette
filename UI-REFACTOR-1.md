# 10Potatoes — UI Refactoring 1/6

Implementazione basata su main, commit iniziale `9bd25995eefb7e852e95041f0cb1bcdb5925276d`.

## Modifiche

- Navigazione comune Livelli, Classifiche, Profilo cognitivo e Impostazioni: tre destinazioni per pagina, esclusa quella corrente. Rimossi dall'interfaccia pubblica il comando tecnico refresh e il vecchio accesso PLAY alla homepage.
- Homepage con dieci livelli classici, Overall ancora operativo e separato, Animali e Fiori nei livelli speciali. Contenitore Allenamento predisposto ma nascosto, senza nuove modalità o Conchiglie simulate.
- Risultati a tutta area disponibile sopra il footer pubblicitario, con nome livello, tempo, record, settori e confronto personale visibile, classifica compatta e azioni. Eliminato il posizionamento dei pannelli basato sulle coordinate delle patate. Intestazione di gioco nascosta nei risultati perché ridondante.
- Stato di navigazione esplicito: apertura contestuale della classifica o del profilo conserva la schermata finale e lo scorrimento. X ripristina il contesto senza richiamare setup o goHome. La navigazione principale cambia sezione e abbandona il contesto.
- Riepilogo mondiale tramite GET esistenti: primo tempo, posizione personale, fino a due vicini sopra e sotto, distacchi dai migliori tempi personali online. Le variazioni di posizione richiedono due snapshot reali della stessa identità. Errori e assenza di piazzamento producono stati neutri. Il lettore non invia nuovi punteggi; per i singoli livelli attende la verifica già gestita dal modulo social.
- Nuove stringhe italiane centralizzate in `UI_COPY`. Interfaccia italiana per questa fase; preferenza linguistica memorizzata conservata, selettore temporaneamente disabilitato.

Motore, sagome, fisica, cronometri, salvataggi storici, punteggi, API e sistema pubblicitario restano invariati. Nessuna nuova analisi cognitiva o traduzione.

## File

- `index.html`: navigazione, struttura dei gruppi, risultati, lettura classifica e copia italiana centralizzata.
- `ui-refactor.css`: impaginazione responsive e navigazione condivisa, riuso delle texture e dei colori attuali.
- `tests/ui-refactor.test.cjs`: regressione browser con dati simulati e traffico esterno intercettato.
- `tests/sectors.test.cjs`: aspettativa sul nuovo titolo e correzione della maiuscola del testo già esistente.
- `UI-REFACTOR-1.md`: rapporto di consegna.

## Verifica

Browser Chromium, viewport 320×568, 360×640 e 412×915:

- Tutte le transizioni tra le quattro macrosezioni; esattamente tre pulsanti, senza la sezione corrente.
- Avvio diretto, partita completata trascinando realmente le dieci sagome, tempo e tre settori.
- Classifica contestuale: cinque righe, distacchi e variazione di posizione su fixture controllata.
- Apertura classifica e profilo cognitivo dai risultati, chiusura con X e confronto integrale dei risultati conservati.
- Riprova, livello successivo, esportazione della scheda condivisibile a 1080 px.
- Limiti del pannello sopra la pubblicità, assenza di overflow orizzontale.
- Accesso diretto e tema invariato di Animali e Fiori; risposta neutra offline.

Comando: `CHROMIUM_EXECUTABLE=/percorso/chromium node --test tests/ui-refactor.test.cjs`.

`npm test`: 36 test superati, 3 falliti già presenti nel commit iniziale, verificato con un checkout separato dello stesso commit:

1. `tests/dom.test.cjs`: attesa di «livello» minuscolo contro «Livello» già presente nell'app.
2. `tests/dom.test.cjs`: attesa che le cache social seguano la versione visualizzata, mentre main usa già chiavi diverse.
3. `tests/dom.test.cjs`: attesa del vecchio countdown SVG mentre main usa immagini fotografiche.

`tests/sectors.test.cjs`: 5/5 superati, incluso il nuovo titolo.

La vecchia suite `npm run test:ui` fallisce in due controlli: attende il banner finale nascosto e non intercetta correttamente le richieste HTTPS con il suo pattern di routing, bloccando la fixture delle sfide. La nuova suite usa un'espressione regolare HTTPS e verifica condivisione e navigazione aggiornate.

Controlli sintattici degli script inline e `git diff --check` superati. Il progetto è statico e non definisce uno script build in package.json; nessuna build Android/APK disponibile in questo repository.

Le dimensioni Android sono simulate nel browser: non è stata eseguita una prova su dispositivi fisici. Nessuna scrittura sui backend di produzione durante i test. Nessun tag o release pubblicata.
