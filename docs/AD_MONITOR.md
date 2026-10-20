# Timeshapes: misura delle opportunità pubblicitarie

## Avvio ed esportazione

Servire il repository con un server statico, aprire `/?adtest=1`.
Il monitor è locale, senza analytics remoti e senza richieste pubblicitarie.
Senza parametro non crea timer, observer o HUD. `ad-monitor.js` è un piccolo
modulo statico; non usa storage personale, nickname, coordinate o ID giocatore.

- **Azzera**: nuova sessione nello stesso documento.
- **Fine**: congela i dati; il gioco può continuare normalmente.
- **Report**: copia JSON; **JSON**: scarica il file.
- Console: `window.timeshapesAdTest.report()` e `.stop()`.
- Al `pagehide` conserva l'ultima fotografia in
  `sessionStorage.timeshapes_last_ad_session`; non aggrega ricaricamenti in una
  sessione unica. Il nuovo documento inizia una nuova sessione. Non effettuare
  refresh durante una prova di durata. Il dato resta nel tab e non viene inviato.

La sessione è esplicita: avvio/azzera → fine o chiusura documento. Nessun timeout
implicito. La durata è monotona (`performance.now`); l'orario ISO è metadato.

## Significato delle metriche

| Metrica | Definizione |
| --- | --- |
| `pageVisits` | Ingressi in una schermata logica, incluse gioco e profilo |
| `eligibleOpportunities` | Aperture di livelli, classifica, performance, anche brevissime |
| `qualifiedOpportunities` | Al massimo una per visita, dopo >=1 s continuo con segnaposto visibile e tab in foreground |
| `contextChanges` | Cambio livello o filtro nella stessa schermata; NON crea un'altra opportunità |
| `bannerAppearances` | Segnaposto che torna visibile, anche nella medesima visita |
| `byPage` / `byContext` | Visite, opportunità, qualificate, permanenza e visibilità per schermata/contesto |
| `foregroundMs` / `backgroundMs` | Tempo nel documento visibile / nascosto |
| `gameplayMs` | Tempo in fase playing con campo di gioco visibile, esclusi overlay, ready, countdown e risultati |
| `adScreenMs` / `bannerVisibleMs` | Permanenza in schermate idonee / segnaposto realmente visibile |
| `gamesStarted/Completed/TimedOut/Abandoned` | Singoli round (stadi nelle serie); abbandono via uscita o restart |
| `native.request/loaded/failed/shown/impression/paid` | Eventi espliciti del futuro bridge nativo, sempre zero nel prototipo |

Una visita resta la stessa dopo ritorno dal background o temporanea occlusione.
Il timer di qualificazione ricomincia, ma una visita già qualificata non si
qualifica nuovamente. I contesti conservano livello e filtro, senza confondere
le consultazioni con nuovi caricamenti del banner. `byContext.qualified` indica
il contesto al momento della qualifica, non una nuova opportunità per ogni filtro.
`returnVisit` negli eventi distingue la prima visita dai ritorni.

La soglia di un secondo è una definizione di questo esperimento; non è una
regola di conteggio AdMob, di viewability pubblicitaria o di remunerazione.
Il segnaposto web non è ancora un Anchored Adaptive nativo e non ha creatività,
fill rate, latenza di rete, consenso o refresh. Non esiste alcun banner reload
pubblicitario osservabile nel prototipo: il footer è un unico nodo persistente.

Il profilo è un overlay che copre la pagina: viene misurato ma non è qualificato
come superficie pubblicitaria. Gioco, ready, countdown e risultati sul campo
sono sempre esclusi. Le classifiche/performance aperte sopra il campo diventano
schermate di navigazione esterne; alla chiusura torna l'esclusione del gioco.

## Costi di esecuzione e limiti

Nessun hook nel ciclo `requestAnimationFrame`, nessuna scrittura di storage
per frame, nessuna rete. Observer limitati agli attributi dei contenitori;
controllo a 250 ms, deduplicato per microtask. Durante il gioco non legge la
geometria dello slot. Le esportazioni JSON complete avvengono solo su richiesta.
Eventi limitati a 5.000 con `eventsDropped`; totali mantenuti anche dopo il limite.
Le tabelle per contesto hanno un insieme finito di chiavi nel gioco attuale.

Il controllo web richiede l'intero slot nel viewport e sei punti non coperti.
È una verifica del segnaposto: il futuro SDK dovrà misurare il banner nativo.
La permanenza può avere un errore fino all'intervallo di controllo per variazioni
non collegate agli eventi osservati; le transizioni principali di gioco hanno
hook espliciti. La chiusura brusca del processo può perdere dati non esportati.
Il conteggio degli abbandoni non comprende una chiusura forzata del sistema.

## Collegamento futuro AdMob

Mantenere una vista Anchored Adaptive alle dimensioni disponibili, fuori dal
layout di gioco. Prima di ready/countdown/playing/risultati rimuovere/nascondere
la vista nativa e sospenderne il lifecycle di refresh; ripristinarla solo nelle
schermate idonee. Questo vincolo va implementato nel wrapper nativo, il CSS web
non governa una AdView sopra la WebView. Nessun `loadAd` su cambio filtro,
livello consultato o semplice ritorno alla stessa vista. Gestire il refresh
nell'SDK e nella configurazione AdMob, senza timer artificiali di navigazione.

Il bridge futuro può chiamare:

```js
window.timeshapesAdTest.nativeEvent({
  type: 'impression', platform: 'android',
  adId: 'banner-instance:load-generation', eventId: 'unique-impression-id'
});
window.timeshapesAdTest.nativeEvent({
  type: 'paid', platform: 'android',
  adId: 'banner-instance:load-generation', eventId: 'same-impression-id',
  valueMicros: 250, currency: 'EUR', precision: 'ESTIMATED'
});
```

`eventId` deve essere stabile nelle ritrasmissioni del singolo evento e diverso
per ogni nuovo evento SDK, anche in caso di refresh. Deduplica per piattaforma,
tipo, ID. Usare lo stesso ID per correlare impression e paid; non aggiungere
l'evento paid al contatore impression. Non riutilizzare un ID per tutte le
impression della stessa AdView. Valori monetari per valuta, mai sommati tra
valute differenti; un micro = un milionesimo dell'unità monetaria. La precisione
va preservata. Le callback tardive conservano `eligibleAtCallback`: non vanno
scartate o attribuite automaticamente all'ultima pagina; il wrapper deve
correlare adId e contesto di presentazione nel proprio registro.

| Momento | Android Mobile Ads SDK | iOS Mobile Ads SDK |
| --- | --- | --- |
| richiesta esplicita | subito prima di `AdView.loadAd` | subito prima di `BannerView.load` |
| caricato | `AdListener.onAdLoaded()` | `bannerViewDidReceiveAd` |
| fallito | `onAdFailedToLoad` | `bannerView(_:didFailToReceiveAdWithError:)` |
| mostrato | evento del contenitore nativo: allegato, visibile, foreground | evento del contenitore nativo: in window, visibile, foreground |
| impression SDK | `AdListener.onAdImpression()` | `bannerViewDidRecordImpression` |
| ricavo | `setOnPaidEventListener` / `AdValue.valueMicros`, currencyCode, precisionType | `paidEventHandler` / `AdValue.value` decimale × 1.000.000, currencyCode, precision |

`loaded` non significa mostrato, `shown` non significa impression SDK.
Le richieste di refresh automatico non sono tutte osservabili dal semplice
wrapper di `loadAd`: integrare le API disponibili nella versione SDK scelta e
riconciliare i totali con AdMob. Questi nomi si riferiscono al Mobile Ads SDK
standard; l'Android Next-Gen SDK ha API differenti. Verificare la versione
prima dell'integrazione. Usare unità test su dispositivi test, poi misurare
latenza, fill, consenso, riutilizzo/refresh e ricavi per paese, OS e schermata.
La callback impression non garantisce l'importo finale liquidato: riconciliare
con i report AdMob e gli eventuali aggiustamenti del traffico.

Il bridge proposto è un'interfaccia locale di collaudo, attiva soltanto in adtest.
Per la release occorrerà spostare lo stesso schema nel collector nativo, con
persistenza/coda offline e trasporto analytics autorizzato; non esporre un
bridge scrivibile da contenuti web non fidati. Non è già un'integrazione SDK.

Fonti ufficiali consultate il 21 ottobre 2026:
- https://developers.google.com/admob/android/banner
- https://developers.google.com/admob/ios/banner
- https://developers.google.com/admob/android/impression-level-ad-revenue
- https://developers.google.com/admob/ios/impression-level-ad-revenue

## Ripetibilità

```
node --test tests/ad-monitor.test.cjs
python3 -m http.server 8765
# In un altro terminale, con Playwright e Chromium installati:
SESSION_SECONDS=600 node tests/browser-session.cjs
```

Il test browser usa trascinamenti reali e temporizzazione reale, con tutte le
API esterne simulate. Non invia record alla produzione. `docs/browser-session.json`
riporta metadati, eventi e tempi. La navigazione dello script è un comportamento
sintetico scelto, non una misura della popolazione degli utenti.

Per i controlli di integrazione rapidi, con server locale sulla porta 8766:
`node tests/browser-checks.cjs`. `BROWSER_EXECUTABLE` permette di indicare un
Chromium già installato; i flag GPU del test servono soltanto all'ambiente
headless. Il primo tentativo con Chromium serverless e flag minimi non avanzava
il cronometro; ripetendo con GPU in-process i controlli passano senza modificare
il cronometro del gioco. Il controllo originale senza monitor ha confermato
l'avanzamento del tempo; il benchmark su telefoni rimane da eseguire.

Per rigenerare proiezioni e 36 scenari economici dall'esportazione osservata:
`node tests/economics.cjs docs/browser-session.json`.
