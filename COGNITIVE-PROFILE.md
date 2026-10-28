# Profilo cognitivo personale — versione 1

La scala 0–100 descrive soltanto le prestazioni nel gioco. Non è una misura clinica o un test del QI. Velocità e percezione rimangono senza punteggio in attesa del confronto con altri giocatori.

## Requisiti e aggiornamento

Servono almeno tre completamenti per ciascuno dei dieci livelli ordinari (modi 1, 2, 4, 7, 8, 9, 10, 11, 12, 13). I vecchi completamenti verificati sono riutilizzati per costanza e sblocco, senza inventare rilasci mancanti. Animali, Fiori e prove di adattabilità non alimentano questi riferimenti. Le tappe ordinarie di Overall con misurazioni nuove possono alimentarle.

Il server crea una fotografia alla prima apertura di ogni giornata, nel fuso del profilo. Altre partite e prove entrano nella fotografia del giorno successivo. Le fotografie precedenti e i dati grezzi sono conservati; la versione dell'algoritmo permette futuri ricalcoli. Le classifiche restano sempre accessibili.

## Precisione

Per ogni livello: `100 × somma(incastri riusciti) / somma(rilasci)` sugli ultimi 20 tentativi misurati, comprese interruzioni e timeout. Un pointercancel non è un rilascio errato. La media dei dieci livelli dà il punteggio; occorrono almeno tre completamenti misurati per ciascun livello nella finestra. Per esempio 10 incastri su 12 rilasci valgono 83,3. Un tentativo senza rilasci non fornisce precisione.

## Costanza

Per ogni livello, ultimi 20 completamenti: `100 × max(0, 1 − deviazione standard della popolazione / tempo medio)`. La media dei dieci livelli dà il punteggio. Tempi identici valgono 100; una dispersione relativa del 20% vale 80. È una scelta di scala del gioco, non una calibrazione scientifica.

## Adattabilità

La prova privata sceglie un livello da L1–L3, uno da L4–L6, uno da L7–L10. Il riferimento è la mediana dei propri ultimi 20 completamenti per ciascun livello, fissata sul server prima di iniziare. Il rapporto `min(1, riferimento / tempo)` viene calcolato per ogni tappa. La media geometrica dei tre rapporti, moltiplicata per 100, è il risultato della prova.

Tre tentativi per giornata, assegnati sul server con lock per utente. Uscita, riavvio, ricarica, timeout o chiusura consumano il tentativo e valgono zero. Una nuova prova chiude come fallita un'eventuale prova precedente ancora aperta. La prova non modifica record, classifiche o riferimenti ordinari.

Il profilo usa la media dei migliori risultati giornalieri degli ultimi 30 giorni. Dopo tre giorni senza una prova completata, il moltiplicatore scende linearmente fino a 0,7 al trentesimo giorno; quando non resta alcun risultato nella finestra il punteggio torna non disponibile, mentre lo storico rimane conservato. Le prove fallite non azzerano l'inattività.

## Salvataggio e accesso

Le misurazioni nuove vengono prima registrate sul dispositivo in un archivio per identità, con coda persistente. Le copie confermate restano sul dispositivo e sul server. Gli errori non svuotano la coda; riapertura della pagina e ritorno online ritentano il salvataggio. Un cambio di identità non trasferisce dati all'altro utente.

Le tre nuove tabelle hanno RLS attiva, nessun privilegio per anon/authenticated e accesso soltanto tramite l'Edge Function che verifica l'utente. Il corpo della richiesta non può scegliere il proprietario. Le misurazioni personali non sono usate per assegnare record ufficiali. Gli eventi sono idempotenti e gli stessi run online non vengono contati due volte.

## Verifica

- `npm test`: include i test SQL del profilo.
- `npm run test:cognitive:ui`: browser con SQL reale in PGlite e API/Auth di fixture. Nessuna richiesta di produzione. `CHROMIUM_EXECUTABLE` è facoltativo.
