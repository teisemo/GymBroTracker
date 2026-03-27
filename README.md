# 🏋️ GymTracker

Webapp di tracking allenamento full-body con Supabase come backend e GitHub Pages come hosting.  
Supporta più utenti (3+) con storico condiviso e grafici di progressione.

---

## 🚀 Setup in 5 passi

### 1. Crea il progetto Supabase

1. Vai su [supabase.com](https://supabase.com) → **New project**
2. Scegli nome (es. `gym-tracker`), password DB, regione (EU West)
3. Aspetta ~2 minuti che il progetto si avvii

### 2. Crea le tabelle

1. Nel pannello Supabase → **SQL Editor** → **New query**
2. Incolla tutto il contenuto di `supabase_schema.sql`
3. Clicca **Run** — deve comparire "Success"

### 3. Configura le credenziali

1. Supabase → **Project Settings** → **API**
2. Copia **Project URL** e **anon public** key
3. Apri `js/config.js` e sostituisci:

```js
const SUPABASE_URL = 'https://TUOPROJECT.supabase.co';   // ← il tuo URL
const SUPABASE_ANON_KEY = 'eyJ...';                       // ← la tua anon key
```

### 4. Pubblica su GitHub Pages

```bash
# Se non hai ancora un repo
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/TUO-USER/gym-tracker.git
git push -u origin main
```

Poi su GitHub → repo → **Settings** → **Pages** → Source: `main / (root)` → **Save**

L'app sarà disponibile su `https://TUO-USER.github.io/gym-tracker/`

### 5. Registra i 3 utenti

Apri la webapp → **Registrati** → inserisci email, password e nome.  
Ripeti per ciascuno dei 3 utenti.

---

## 📁 Struttura progetto

```
gym-tracker/
├── index.html              # App principale
├── css/
│   └── style.css           # Stili
├── js/
│   ├── config.js           # ← Credenziali Supabase + dati allenamento
│   ├── data.js             # Layer dati (tutte le query Supabase)
│   └── app.js              # Logica UI
└── supabase_schema.sql     # Schema DB da eseguire una volta
```

## ✏️ Personalizzare gli esercizi

Modifica `js/config.js` → array `ALLENAMENTI`. Ogni oggetto:

```js
{ nome: "NOME ESERCIZIO", tempo: "3111", range: "6-10" }
```

---

## 🗄️ Schema DB

| Tabella            | Descrizione                              |
|--------------------|------------------------------------------|
| `profiles`         | Nome e email di ogni utente              |
| `workout_sessions` | Una riga per (utente, allenamento, sessione) con tutti i dati kg/rip in JSONB |

Row Level Security: ogni utente **legge** tutti, **scrive** solo i propri dati.

---

## 🔒 Sicurezza

- Le credenziali Supabase (`anon key`) sono pubbliche by design — la sicurezza è garantita dalle **Row Level Security policies** nel DB.
- Non commitare password personali nel repo.
