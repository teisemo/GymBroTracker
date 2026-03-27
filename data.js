// ── SUPABASE CLIENT ──────────────────────────────────────────
let sb; // initialized in app.js after DOM ready

function initSupabase() {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ── AUTH ──────────────────────────────────────────────────────

async function authSignIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function authSignUp(email, password, displayName) {
  const { data, error } = await sb.auth.signUp({
    email, password,
    options: { data: { display_name: displayName } }
  });
  if (error) throw error;
  return data;
}

async function authSignOut() {
  await sb.auth.signOut();
}

async function getSession() {
  const { data } = await sb.auth.getSession();
  return data.session;
}

// ── PROFILES ─────────────────────────────────────────────────

async function getAllProfiles() {
  const { data, error } = await sb
    .from('profiles')
    .select('id, display_name, email')
    .order('display_name');
  if (error) throw error;
  return data;
}

async function upsertProfile(userId, email, displayName) {
  const { error } = await sb.from('profiles').upsert({
    id: userId,
    email,
    display_name: displayName || email.split('@')[0],
    updated_at: new Date().toISOString()
  }, { onConflict: 'id' });
  if (error) console.warn('Profile upsert:', error);
}

// ── SESSIONS (salvataggio scheda) ─────────────────────────────

// Salva o aggiorna una sessione di allenamento
async function saveWorkoutSession({ userId, allenamentoIdx, sessionIdx, sessionDate, seriesData }) {
  const payload = {
    user_id: userId,
    allenamento_idx: allenamentoIdx,
    session_idx: sessionIdx,
    session_date: sessionDate || null,
    series_data: seriesData,   // JSON blob
    updated_at: new Date().toISOString()
  };

  const { data, error } = await sb
    .from('workout_sessions')
    .upsert(payload, { onConflict: 'user_id,allenamento_idx,session_idx' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Carica la sessione corrente dell'utente
async function loadWorkoutSession(userId, allenamentoIdx, sessionIdx) {
  const { data, error } = await sb
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('allenamento_idx', allenamentoIdx)
    .eq('session_idx', sessionIdx)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Carica tutte le sessioni (per storico) con filtri opzionali
async function loadAllSessions({ userId = null, allenamentoIdx = null } = {}) {
  let q = sb
    .from('workout_sessions')
    .select('*, profiles(display_name, email)')
    .order('updated_at', { ascending: false })
    .limit(100);

  if (userId)          q = q.eq('user_id', userId);
  if (allenamentoIdx !== null) q = q.eq('allenamento_idx', allenamentoIdx);

  const { data, error } = await q;
  if (error) throw error;
  return data;
}

// Carica sessioni per le statistiche (solo serie allenanti con kg)
async function loadSessionsForStats(userId = null) {
  let q = sb
    .from('workout_sessions')
    .select('user_id, allenamento_idx, session_idx, session_date, series_data, updated_at, profiles(display_name)')
    .order('updated_at', { ascending: true });

  if (userId) q = q.eq('user_id', userId);

  const { data, error } = await q;
  if (error) throw error;
  return data;
}

// Controlla quali sessioni di un allenamento hanno dati (per i pallini colorati)
async function loadSessionMeta(userId, allenamentoIdx) {
  const { data, error } = await sb
    .from('workout_sessions')
    .select('session_idx, session_date, updated_at')
    .eq('user_id', userId)
    .eq('allenamento_idx', allenamentoIdx);
  if (error) throw error;
  return data || [];
}
