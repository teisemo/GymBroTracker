// ══════════════════════════════════════════════════════════════
//  CONFIG — inserisci le tue credenziali Supabase qui
//  Le trovi su: supabase.com → Project Settings → API
// ══════════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://doibluowkxnsdttmrqzr.supabase.co';   // ← sostituisci
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvaWJsdW93a3huc2R0dG1ycXpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTg3NjAsImV4cCI6MjA5MDE5NDc2MH0.y_wiXg-P13qI7eC5Gsn4VgV8jCTw6iB-9Lo0M7isdYw';                       // ← sostituisci

// ── Struttura degli allenamenti (puoi modificare) ────────────
const ALLENAMENTI = [
  {
    nome: "Allenamento 1",
    esercizi: [
      { nome: "LEG EXTENSIONS",  tempo: "3111", range: "6-10" },
      { nome: "LEG CURL",        tempo: "3111", range: "6-10" },
      { nome: "PANCA PIANA",     tempo: "3111", range: "6-10" },
      { nome: "LAT MACHINE",     tempo: "2111", range: "6-10" },
      { nome: "HAMMER CURL",     tempo: "3111", range: "6-10" },
    ]
  },
  {
    nome: "Allenamento 2",
    esercizi: [
      { nome: "STACCO DA TERRA",       tempo: "3111", range: "6-10" },
      { nome: "TRAZIONI ALLA SBARRA",  tempo: "3111", range: "6-10" },
      { nome: "PARALLELE",             tempo: "3111", range: "6-10" },
      { nome: "SPINTE PER LE SPALLE",  tempo: "3111", range: "6-10" },
      { nome: "CURL AL CAVO",          tempo: "3111", range: "6-10" },
    ]
  },
  {
    nome: "Allenamento 3",
    esercizi: [
      { nome: "SQUAT",                   tempo: "2111", range: "6-10" },
      { nome: "REMATORE",                tempo: "3111", range: "6-10" },
      { nome: "CROCI SU PANCA INCLINATA",tempo: "3111", range: "6-10" },
      { nome: "ALZATE LATERALI",         tempo: "2111", range: "6-10" },
      { nome: "SPINTE IN BASSO BARRA",   tempo: "3111", range: "6-10" },
    ]
  }
];

const SERIE_DEFS = [
  { label: "1ª serie riscaldamento — 10 rip", type: "risc"   },
  { label: "2ª serie riscaldamento — 6 rip",  type: "risc"   },
  { label: "3ª serie allenante — 8 rip",      type: "all"    },
  { label: "4ª serie allenante — MAX rip",    type: "allmax" },
];

const NUM_SESSIONS = 5;
