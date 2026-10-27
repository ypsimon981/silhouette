# Ombre morbide nel gioco — integrazione locale

Questa modifica introduce esclusivamente il sistema delle ombre. Pezzi, facce, sagome, incastri, texture, tovaglia attuale, audio, regole, tempi e classifiche restano quelli del gioco esistente. La L fotografica e gli incastri di farina non fanno parte di questo passaggio.

## Comportamento

La luce virtuale è al centro del campo di gioco. La proiezione usa la posizione attuale del pezzo, anche durante il trascinamento: attraversando il centro cambia il verso dell’ombra. Al centro l’ombra resta sotto il pezzo. L’altezza simulata è proporzionata alla dimensione del pezzo; durante il trascinamento aumenta e rende l’ombra più lunga e diffusa.

Ogni pezzo ha tre livelli: contatto, proiezione morbida a riposo e proiezione più morbida durante il sollevamento. Le opacità riprendono lo Studio 05.3 approvato: .36, .30 e .23. Le ombre usano filtri SVG, separati dalla grafica del pezzo, e mantengono il profilo e la rotazione originali. La piccola animazione già esistente all’incastro muove il pezzo mentre l’ombra rimane a terra.

Il modulo osserva creazione, posizione e stato dei pezzi; non riscrive il trascinamento, non legge gli incastri assegnati e non usa il generatore casuale del gioco. Aggiorna solo quando serve. La luce sulla buccia resta incorporata nella grafica esistente: questa modifica proietta le ombre e non ricalcola il materiale.

## File modificati e creati

- `index.html`: due riferimenti al nuovo CSS e al nuovo script; script di gameplay invariato.
- `potato-shadows.js`, `potato-shadows.css`: modulo cosmetico e livelli delle ombre, compatibili con il precedente sistema delle interazioni.
- `tests/shadows-ui.test.cjs`: regressioni su catalogo, posizionamento, trascinamento e partite complete.
- `tests/build-shadow-game-preview.cjs`: costruzione della copia HTML autonoma per revisione.
- `SHADOWS.md`: questa documentazione.

Non sono richieste nuove dipendenze per il gioco. I test usano Playwright già previsto dal progetto, con `PLAYWRIGHT_MODULE` e `CHROMIUM_EXECUTABLE` opzionali.

## Verifiche eseguite

- Confronto byte per byte dello script di gameplay e dei file grafici esistenti rispetto alla versione precedente: invariati.
- Ombre su tutte le 173 varianti attualmente nel catalogo, comprese le rotazioni e le sagome animali/fiori; nessuna sostituzione della grafica originale e nessun consumo di casualità del gioco.
- Direzione legata alla posizione attuale, sollevamento, ritorno dopo annullamento del trascinamento, una sola ombra composita per pezzo.
- Partite complete con spostamenti reali del puntatore su tre dimensioni: 320×568, 390×844 e 768×1024; livelli 1, 13 e 17. Dieci pezzi completati, interfaccia senza overflow ed esito corretto.
- Controllo che le ombre restino ferme durante l’animazione di assestamento esistente.
- Copia HTML autonoma: partita di dieci incastri, pezzi e facce originali, nessun errore JavaScript e nessuna richiesta di rete.

Non sono dichiarate prestazioni su smartphone: le verifiche sono state eseguite con Chromium desktop. Il test sul telefono resta necessario per giudicare resa e fluidità del sistema nel dispositivo reale.

## Aprire e applicare

L’HTML `10Potatoes-prova-ombre.html` è una copia autonoma per provare il gioco. In questa sola copia, profilo e risultati sono temporanei e le richieste di rete sono disattivate: non può inviare record né pubblicità. Il repository mantiene la propria configurazione normale.

Lo ZIP dell’aggiornamento contiene solo i file modificati/creati: va estratto sopra una copia del repository esistente, che contiene già gli altri asset. Dalla radice del repository avviare `python3 -m http.server 8000` e aprire `http://localhost:8000/`.

Sviluppato e verificato sul branch `feature/central-soft-shadows`. Il rilascio include solo questo aggiornamento delle ombre; prototipi fotografici, nuova tovaglia e incastri di farina restano esclusi.
