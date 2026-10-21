# Social V1 web — pubblicazione graduale

Stato al 21 ottobre 2026: installazione SQL applicata al progetto CoDriver,
funzioni `ten-shapes-social` e `ten-shapes-ranking` distribuite, accessi anonimi
abilitati nel dashboard e cron `shapes-social-digest` attivo.
Il client pubblicato ha `enabled: true`: condivisioni, sfide, rivincite,
traguardi e avvisi interni sono attivi. Le push native restano rinviate all'app.

L'attivazione Auth è stata completata nel dashboard del progetto CoDriver dopo
l'accesso sicuro dell'utente; nessuna impostazione di Fi-card è stata modificata.

## Contenuto

- Card locali PNG verticali 1080×1920 e quadrate 1080×1080, nome facoltativo,
  record e posizione se restituita dal server. Condivisione Web Share con download
  e copia del link come alternative. Nessuna promessa di pubblicazione su Instagram.
- Sfide sui dieci livelli singoli con risultato autenticato, link
  `https://ypsimon981.github.io/silhouette/#c/CODICE`, schermata ricevuta,
  accettazione, salvataggio per dopo, tentativi illimitati e rivincite.
- Il valore interno del livello viene conservato: i livelli visuali 1–10
  corrispondono a `[1,2,4,7,8,9,10,11,12,13]`. Overall conserva il suo flusso.
- Vittoria, sconfitta e parità confrontate al centesimo visualizzato.
  Le classifiche conservano la precisione in millisecondi già esistente.
- Avvisi interni nel Profilo per il sorpasso e il riepilogo delle classifiche.
  Le preferenze sfide e riepilogo sono inizialmente attive, alle 19:00 locali.
- Primo completamento, record personale, miglioramento di almeno 5% e 0,50 s,
  ingressi nelle Top 10/5/1%. Un solo messaggio alla fine; gli altri nel Profilo.
  Non esiste oggi un sistema di blocco/sblocco livelli: non ne viene inventato uno.
- Cron server per riepiloghi, storico per variazioni dei risultati, confronto
  esatto a 24 ore, IANA timezone e deduplicazione per giorno locale.
- Statistiche social facoltative, disattivate inizialmente, aggregate dalla query
  `backend/analytics.sql`. Eventi operativi necessari sono conservati separatamente.

## Identità e record precedenti

Si usa Supabase Auth anonimo, con sessione e refresh token memorizzati nel browser.
Il server interroga Auth `/user` per verificare il token. L'ID nell'URL o nel JSON
non autorizza alcuna operazione. Le tabelle operative hanno RLS attiva e sono
accessibili soltanto al servizio: i client passano dalla Edge Function.

Le nuove identità non acquisiscono i vecchi ID UUID del localStorage: non c'è
una prova della proprietà di tali ID. Record e impostazioni locali vengono
conservati; i vecchi record online restano nella classifica, come dati storici.
La classifica continua a includere i profili DEMO già presenti.
Prima del rilascio pubblico va concordato il trattamento dei duplicati storici.

Non esiste ancora recupero account o accesso allo stesso profilo da dispositivi
diversi. Cancellare i dati del browser perde la sessione. Questo limite è visibile
nel Profilo. Non abilitare un'unione automatica basata sul vecchio UUID.

## Attivazione coordinata

1. Eseguire backup del database e della funzione `ten-shapes-ranking` attuale.
   Il progetto esistente è `bboijzuzhgvfxqrsfatw` (CoDriver): ospita anche altri
   servizi, che questo aggiornamento non modifica.
2. Provare prima su un database di sviluppo con la struttura di
   `public.ten_shapes_scores` esistente, incluso l'indice univoco
   `(player_id,level)`, e Supabase Auth.
3. Già applicato in produzione come migrazione `shapes_social_v1_web`:
   `backend/install-social.sql`. Per un ambiente nuovo, eseguirlo una volta.
   È uno script
   transazionale di installazione, non una migrazione CLI già applicata.
   Non rieseguirlo sullo stesso schema: crea tabelle e funzioni nuove.
4. Abilitare Anonymous Sign-ins in Supabase Auth. Controllare limiti e protezioni
   antiabuso prima di aprire la registrazione al pubblico. Il client non aggira
   CAPTCHA o le restrizioni configurate; un CAPTCHA obbligatorio richiede
   l'integrazione della sua UI prima dell'attivazione.
5. Distribuire entrambe le funzioni presenti in `supabase/functions/`.
   La configurazione `verify_jwt=false` è intenzionale: i GET delle classifiche
   sono pubblici, i POST verificano il JWT con Auth nel codice. Nessun POST
   competitivo viene autorizzato decodificando semplicemente il token.
   `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` sono variabili server Supabase.
   `SOCIAL_WEB_ORIGIN` vale `https://ypsimon981.github.io` per questo sito.
6. Attivare pg_cron e applicare `backend/schedule-social.sql` una volta.
   Verificare in `cron.job` il job `shapes-social-digest` e in `cron.job_run_details`
   il completamento. Non introdurre un secondo job con lo stesso scopo.
7. Attivare `enabled: true` in `social-config.js` e pubblicare insieme
   `index.html`, `social.js`, `social.css`, `social-config.js` e `favicon.svg`.
   La chiave nel config è pubblicabile; nessuna service-role key è nel frontend.
   I vecchi client non autenticati non potranno più scrivere sulla classifica:
   avvisare i tester di aggiornare la pagina.
8. Eseguire i test reali elencati sotto e controllare gli advisor Supabase.
   La prima comparazione storica valida arriva dopo almeno 24 ore.

Per usare la CLI, verificare prima `supabase --help`, collegare esplicitamente
il progetto corretto e consultare l'help di `functions deploy`. Nessun comando
   di deploy CLI è stato eseguito: la distribuzione è avvenuta tramite il connettore.

Per un rollback del client, ripristinare insieme la precedente Edge Function
delle classifiche; cambiare soltanto `enabled` dopo il deploy non riabilita i
vecchi POST. Le tabelle aggiuntive possono rimanere senza cancellare dati.

## Regole e limiti

Ogni START di un livello singolo online richiede un ticket al server prima del
countdown. Il server verifica proprietario, livello, regole, intervallo temporale,
durata 1,5–60 s, scadenza e riutilizzo del ticket. Gli invii sono idempotenti e
serializzati per account. Una sfida scade dopo 30 giorni; i tentativi sono
illimitati, con limite antiabuso di 20 avvii al minuto per account.

Una nuova miglior prestazione sullo stesso obiettivo non è un nuovo sorpasso:
si produce un avviso per destinatario/sfida. Una rivincita crea un nuovo obiettivo.
Il nome pubblico segue la preferenza privacy attuale dell'autore.

La casualità, le famiglie, le rotazioni, la selezione delle forme e il generatore
esistente non vengono cambiati. Non viene introdotto un seed condiviso.
La musica viene inizializzata sul gesto START e il countdown originale parte
solo dopo il ticket. Una partita normale senza rete rimane locale; una sfida
non parte come partita competitiva se manca il collegamento.

Le verifiche temporali non provano che il client abbia davvero posizionato le
forme. Non c'è attestazione del dispositivo né simulazione autorevole del gioco
sul server. Il percorso Overall/stage conserva la validazione a limiti del gioco
esistente e acquisisce autenticazione e aggiornamento atomico; non produce ticket
di sfida. Questi limiti vanno considerati prima di classifiche pubbliche premiate.

## Verifica eseguita e da completare

Eseguiti: 9 test sullo SQL reale in PostgreSQL WASM/PGlite, comprendenti
risultati validi/non validi, proprietà, replay, parità, vittoria/sconfitta,
rivincita, avvisi non duplicati, privacy, preferenze, RLS e grant,
storico di 24 ore, variazioni positive/negative, fusi estate/inverno,
riepiloghi idempotenti, corrispondenza ranking e invii concorrenti serializzati.
Controllo sintattico del JavaScript e caricamento delle due funzioni TypeScript.
Un test funzionale DOM esegue il client reale e verifica inizializzazione,
conclusione della partita, comparsa delle azioni social, retry casuale e timeout.
Quest'ultimo non verifica la grafica o i gesti di trascinamento.

Attivazione verificata anche sulle API reali con due account ospite di prova:
creazione e apertura sfida, risultato vincente, differenza al centesimo,
reinvio idempotente senza doppio avviso e apertura del link di rivincita.
I risultati e i profili usati esclusivamente per la prova sono stati rimossi.

I test browser Playwright sono inclusi in `tests/ui.test.cjs`, ma non sono stati
superati qui: il browser locale non si avvia in questo ambiente. Non equivalgono
a test grafici riusciti. Eseguirli con `npm ci`, `npx playwright install chromium`,
`npm run test:ui` in un ambiente compatibile. Serve un controllo visivo su
Safari/iPhone e Chrome/Android, incluse safe area e schermi piccoli.

Prima di attivare: due account reali, apertura fredda/calda del link, condivisione
su WhatsApp/Telegram/Instagram dove supportata, card quadrata/verticale, rete
assente, tentativo interrotto, link scaduto, notifiche interne e job dopo 24 ore.
Verificati in produzione l'installazione additiva, la funzione di lettura ranking,
il job, l'esecuzione del digest senza profili e gli advisor. Gli avvisi informativi
RLS senza policy sulle tabelle social sono coerenti con l'accesso solo server:
anon e authenticated non hanno grant e il servizio accede tramite Edge Function.

## Funzioni rinviate alla versione mobile

Push APNs/FCM, token dispositivi, consenso OS, invio con app chiusa, tracking push,
App Links e Universal Links verificati, pagina con store e recupero post-install.
Richiedono progetti Android/iOS, identificativi firmati, configurazione push,
dominio e pubblicazione. Non sono implementati come finte push nel browser.

I link hash attuali funzionano sulla pagina GitHub Pages senza rewrite server.
Le anteprime social restano quelle generiche del sito: il frammento non arriva
al server. In futuro il dominio potrà usare `/c/CODICE` e metadati dedicati.

I riepiloghi attuali sono avvisi interni; `ranking_digest_sent`, `push_sent` e
`push_opened` non vengono emessi perché non esiste un invio push reale.
Il browser distingue apertura del pannello e ritorno da Web Share, ma il ritorno
non prova consegna, lettura o pubblicazione. L'attribuzione riguarda nuovi
account browser, non persone verificate né installazioni.
