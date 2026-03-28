# 💪 GymBroTracker

Webapp di tracking allenamento per gruppi — un unico account, più atleti, storico condiviso e progressi visualizzati per esercizio.

Hostata su **GitHub Pages** (zero server), backend su **Supabase** (PostgreSQL + Auth).

---

## ✨ Funzionalità

- **Home** — mostra il prossimo allenamento in rotazione automatica (A1→A2→A3), riepilogo dell'ultima sessione con i kg usati da ogni atleta, pulsante per saltare all'allenamento successivo
- **Scheda** — selettore atleta, serie di riscaldamento e allenanti, kg e rip per ogni serie, spunta completamento, suggerimento automatico dai kg della sessione precedente, badge arancione "↑ aumenta peso" se nella sessione precedente hai fatto ≥10 ripetizioni, auto-salvataggio silenzioso
- **Storico** — tutte le sessioni filtrabili per atleta e allenamento, dettaglio kg per ogni esercizio, confronto tra due sessioni dello stesso allenamento
- **Progressi** — card per esercizio con kg attuale, delta vs sessione precedente, sparkline degli ultimi 8 allenamenti, storico delle ultime sessioni
- **Gestione Atleti** — aggiungi/rimuovi atleti (nome e cognome) senza toccare il codice
- **Gestione Esercizi** — modifica nomi, tempo di esecuzione e range rip; aggiungi o rimuovi esercizi da ogni allenamento liberamente

---

## 🚀 Setup

### 1. Crea il progetto Supabase

1. Vai su [supabase.com](https://supabase.com) → **New project**
2. Scegli nome (es. `gymbrotracker`), password DB, regione EU West
3. Aspetta ~2 minuti che il progetto sia pronto

### 2. Esegui lo schema SQL

Nel pannello Supabase → **SQL Editor** → **New query**, esegui nell'ordine:

| File | Quando eseguirlo |
|------|-----------------|
| `schema_v4.sql` | Prima installazione — crea tutte le tabelle |
| `schema_v5.sql` | Aggiunge la tabella `athletes` e `athlete_id` |
| `fix_constraint.sql` | Corregge il vincolo unique su `workout_sessions` |
| `fix_exercises_constraint.sql` | Rimuove il vincolo unique su `exercises.position` |

> Se parti da zero, esegui tutti e 4 in sequenza.

### 3. Inserisci le credenziali

Nel file `index.html`, cerca in cima allo `<script>` e sostituisci:

```js
const SUPABASE_URL      = 'https://TUOPROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...';
```

Le trovi su: **Supabase → Project Settings → API → Project URL** e **anon public key**.

### 4. Pubblica su GitHub Pages

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/TUO-USER/gymbrotracker.git
git push -u origin main
```

Poi: **GitHub → repo → Settings → Pages → Source: main / (root) → Save**

L'app sarà disponibile su `https://TUO-USER.github.io/gymbrotracker/`

### 5. Prima configurazione

1. Apri l'app e registra l'account (serve un solo account per tutto il gruppo)
2. Vai su **Impostazioni → Atleti** → aggiungi i nomi di tutti gli atleti del gruppo
3. Vai su **Impostazioni → Esercizi** → verifica o modifica la scheda di allenamento
4. Inizia ad allenarti!

---

## 📁 Struttura del progetto

```
gymbrotracker/
├── index.html                      ← Tutta l'app (HTML + CSS + JS inline)
├── schema_v4.sql                   ← Schema base (tabelle exercises, workout_sessions, profiles)
├── schema_v5.sql                   ← Aggiunta tabella athletes
├── fix_constraint.sql              ← Fix vincolo unique su workout_sessions
├── fix_exercises_constraint.sql    ← Fix vincolo unique su exercises.position
└── README.md
```

> L'intera app è un singolo file `index.html` — niente build tool, niente Node.js, niente dipendenze da installare. Funziona direttamente su GitHub Pages.

---

## 🗄️ Schema del database

| Tabella | Descrizione |
|---------|-------------|
| `profiles` | Account di login (email, display name) |
| `athletes` | Atleti del gruppo (nome, cognome, ordine) |
| `exercises` | Esercizi delle 3 schede (nome, tempo, range rip) — condivisi |
| `workout_sessions` | Una riga per (utente, atleta, data, allenamento) con tutti i dati kg/rip in JSONB |

### Logica delle sessioni

- Ogni sessione è legata a un `athlete_id` specifico — più atleti possono allenarsi lo stesso giorno
- L'allenamento del giorno è calcolato automaticamente in rotazione A1→A2→A3 basandosi sull'ultima sessione salvata
- I suggerimenti kg mostrano i valori dell'ultima sessione **dello stesso allenamento e dello stesso atleta**

### Row Level Security

- Ogni utente autenticato **legge** tutte le sessioni (storico condiviso)
- Ogni utente **scrive** solo le proprie sessioni (`user_id = auth.uid()`)
- Gli esercizi e gli atleti sono **leggibili e modificabili** da tutti gli utenti autenticati

---

## 🔒 Note sulla sicurezza

La `anon key` di Supabase è pubblica by design — va nel frontend. La sicurezza è garantita dalle **Row Level Security policies** nel DB, non dalla segretezza della chiave. Non committare password personali o service role keys nel repo.

---

## 🛠️ Personalizzazione

Tutto è modificabile direttamente dall'app:

- **Atleti** → Impostazioni → Atleti
- **Esercizi** → Impostazioni → Esercizi (aggiungi, rimuovi, modifica nome/tempo/range)

Per cambiare i nomi degli allenamenti (A1/A2/A3) o il numero di serie, modifica le costanti in cima allo `<script>` in `index.html`:

```js
const ALL_NAMES = ['Allenamento 1','Allenamento 2','Allenamento 3'];
const SERIE_DEFS = [ ... ];
```
