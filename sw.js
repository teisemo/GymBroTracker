// GymBroTracker Service Worker
// Versione minima — abilita l'installazione come PWA

const CACHE = 'gymbrotracker-v1';

// All'installazione: metti in cache solo l'essenziale
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      c.addAll(['./index.html', './manifest.json'])
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Rimuovi cache vecchie
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Strategia: network first, fallback cache
// Così Supabase e le API funzionano sempre con dati freschi
self.addEventListener('fetch', e => {
  // Non intercettare le chiamate API Supabase
  if (e.request.url.includes('supabase.co')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Salva in cache solo le risorse statiche GET
        if (e.request.method === 'GET') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
