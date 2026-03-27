// ── STATE ────────────────────────────────────────────────────
let currentUser = null;
let currentSession = null;
let curAll = 0;
let curSess = 0;
let sessionMeta = [];  // which sessions have data
let autoSaveTimer = null;
let allProfiles = [];

// ── BOOT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initSupabase();

  // Today's date
  document.getElementById('today-date').textContent =
    new Date().toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  // Auth state listener
  sb.auth.onAuthStateChange(async (event, session) => {
    if (session) {
      currentUser = session.user;
      await onLogin(session.user);
    } else {
      currentUser = null;
      showScreen('auth-screen');
    }
  });

  // Check existing session
  const sess = await getSession();
  if (!sess) showScreen('auth-screen');
});

// ── SCREENS ──────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showPage(id, linkEl) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (linkEl) linkEl.classList.add('active');
  closeSidebar();

  if (id === 'history') loadHistory();
  if (id === 'stats')   loadStats();
}

// ── AUTH UI ──────────────────────────────────────────────────
let authMode = 'login';

function switchAuthTab(mode) {
  authMode = mode;
  document.querySelectorAll('.auth-tab').forEach((t, i) => {
    t.classList.toggle('active', (i === 0 && mode === 'login') || (i === 1 && mode === 'signup'));
  });
  document.getElementById('signup-name-field').classList.toggle('hidden', mode !== 'signup');
  document.getElementById('auth-btn-text').textContent = mode === 'login' ? 'Accedi' : 'Registrati';
  document.getElementById('auth-error').classList.add('hidden');
}

async function handleAuth(e) {
  e.preventDefault();
  const email    = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const name     = document.getElementById('display-name').value.trim();
  const errEl    = document.getElementById('auth-error');
  const spinner  = document.getElementById('auth-spinner');
  const btnText  = document.getElementById('auth-btn-text');

  errEl.classList.add('hidden');
  spinner.classList.remove('hidden');
  btnText.classList.add('hidden');

  try {
    if (authMode === 'login') {
      await authSignIn(email, password);
    } else {
      const { user } = await authSignUp(email, password, name);
      if (user) await upsertProfile(user.id, email, name);
    }
  } catch (err) {
    errEl.textContent = translateError(err.message);
    errEl.classList.remove('hidden');
  } finally {
    spinner.classList.add('hidden');
    btnText.classList.remove('hidden');
  }
}

function translateError(msg) {
  if (msg.includes('Invalid login')) return 'Email o password non corretti.';
  if (msg.includes('already registered')) return 'Email già registrata. Prova ad accedere.';
  if (msg.includes('Password should')) return 'La password deve essere di almeno 6 caratteri.';
  return msg;
}

async function handleLogout() {
  await authSignOut();
}

// ── ON LOGIN ─────────────────────────────────────────────────
async function onLogin(user) {
  // Ensure profile exists
  await upsertProfile(user.id, user.email, user.user_metadata?.display_name);

  // Update UI
  const name  = user.user_metadata?.display_name || user.email.split('@')[0];
  const email = user.email;
  document.getElementById('user-name').textContent  = name;
  document.getElementById('user-email').textContent = email;
  document.getElementById('user-avatar').textContent = name[0].toUpperCase();

  // Load profiles for filters
  try {
    allProfiles = await getAllProfiles();
    populateUserFilters();
  } catch(e) { console.warn('profiles', e); }

  showScreen('app-screen');
  await renderTracker();
}

function populateUserFilters() {
  ['history-filter-user', 'stats-filter-user'].forEach(id => {
    const sel = document.getElementById(id);
    // Remove existing user options
    [...sel.options].forEach(o => { if (o.value) sel.remove(o.index); });

    allProfiles.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.display_name || p.email;
      // Pre-select own profile in stats
      if (id === 'stats-filter-user' && p.id === currentUser.id) opt.selected = true;
      sel.appendChild(opt);
    });
  });
}

// ── SIDEBAR MOBILE ───────────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('show');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');
}

// ── TRACKER ──────────────────────────────────────────────────
function selectAllenamento(idx, btn) {
  curAll = idx;
  curSess = 0;
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  renderTracker();
}

function changeSession(dir) {
  const next = curSess + dir;
  if (next < 0 || next >= NUM_SESSIONS) return;
  curSess = next;
  renderTracker();
}

async function renderTracker() {
  if (!currentUser) return;

  // Load session meta (which sessions have data)
  try {
    sessionMeta = await loadSessionMeta(currentUser.id, curAll);
  } catch(e) { sessionMeta = []; }

  renderSessionDots();

  // Load current session data from Supabase
  let saved = null;
  try {
    saved = await loadWorkoutSession(currentUser.id, curAll, curSess);
  } catch(e) { console.warn('load session', e); }

  renderExercises(saved);
  updateCompletion();
}

function renderSessionDots() {
  const container = document.getElementById('sess-dots');
  container.innerHTML = '';
  for (let i = 0; i < NUM_SESSIONS; i++) {
    const btn = document.createElement('button');
    btn.className = 'sess-dot';
    const hasMeta = sessionMeta.find(m => m.session_idx === i);
    if (i === curSess) btn.classList.add('active');
    if (hasMeta)       btn.classList.add('filled');
    btn.onclick = () => { curSess = i; renderTracker(); };
    container.appendChild(btn);
  }
  document.getElementById('sess-label').textContent =
    `Sessione ${curSess + 1}/${NUM_SESSIONS}`;
}

function renderExercises(saved) {
  const all = ALLENAMENTI[curAll];
  const seriesData = saved?.series_data || {};

  // Set date input
  const dateInput = document.getElementById('date-input-tracker');
  if (dateInput && saved?.session_date) {
    dateInput.value = saved.session_date;
  }

  let html = '';
  all.esercizi.forEach((ex, ei) => {
    html += `
    <div class="ex-block">
      <div class="ex-header">
        <span class="ex-name">${ex.nome}</span>
        <span class="ex-range">${ex.range} rip</span>
        <span class="ex-tempo">${ex.tempo}</span>
      </div>
      <div class="col-headers">
        <div class="col-h" style="text-align:left">Serie</div>
        <div class="col-h">Kg</div>
        <div class="col-h">Rip</div>
        <div class="col-h"></div>
      </div>`;

    SERIE_DEFS.forEach((s, si) => {
      const sv = (seriesData[ei] || {})[si] || {};
      const isDone = !!sv.done;
      html += `
      <div class="serie-row ${isDone ? 'done-row' : ''}">
        <div class="serie-label ${s.type}">${s.label}</div>
        <div class="inp-cell">
          <input type="number" min="0" step="0.5" placeholder="kg"
            id="kg_${ei}_${si}" value="${sv.kg || ''}"
            class="${isDone ? 'done' : ''}"
            oninput="scheduleAutoSave()">
        </div>
        <div class="inp-cell">
          <input type="number" min="0" step="1" placeholder="rip"
            id="rip_${ei}_${si}" value="${sv.rip || ''}"
            class="${isDone ? 'done' : ''}"
            oninput="scheduleAutoSave()">
        </div>
        <div class="check-cell">
          <button class="check-btn ${isDone ? 'done' : ''}"
            id="chk_${ei}_${si}"
            onclick="toggleDone(${ei},${si})"></button>
        </div>
      </div>`;
    });

    html += `</div>`; // ex-block
  });

  document.getElementById('exercises-container').innerHTML = html;
}

function toggleDone(ei, si) {
  const btn = document.getElementById(`chk_${ei}_${si}`);
  const kg  = document.getElementById(`kg_${ei}_${si}`);
  const rip = document.getElementById(`rip_${ei}_${si}`);
  const row = btn.closest('.serie-row');
  const isDone = !btn.classList.contains('done');

  btn.classList.toggle('done', isDone);
  kg.classList.toggle('done', isDone);
  rip.classList.toggle('done', isDone);
  row.classList.toggle('done-row', isDone);

  scheduleAutoSave();
  updateCompletion();
}

function collectSeriesData() {
  const all = ALLENAMENTI[curAll];
  const d = {};
  all.esercizi.forEach((_, ei) => {
    d[ei] = {};
    SERIE_DEFS.forEach((_, si) => {
      const kg   = document.getElementById(`kg_${ei}_${si}`);
      const rip  = document.getElementById(`rip_${ei}_${si}`);
      const done = document.getElementById(`chk_${ei}_${si}`);
      d[ei][si] = {
        kg:   kg  ? kg.value  : '',
        rip:  rip ? rip.value : '',
        done: done ? done.classList.contains('done') : false
      };
    });
  });
  return d;
}

function updateCompletion() {
  const all = ALLENAMENTI[curAll];
  let total = 0, done = 0;
  all.esercizi.forEach((_, ei) => {
    SERIE_DEFS.forEach((_, si) => {
      total++;
      const btn = document.getElementById(`chk_${ei}_${si}`);
      if (btn && btn.classList.contains('done')) done++;
    });
  });
  const pct = total > 0 ? Math.round(done / total * 100) : 0;
  document.getElementById('completion-pct').textContent = pct + '%';
  document.getElementById('completion-fill').style.width = pct + '%';
}

function scheduleAutoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => saveSession(true), 1200);
}

async function saveSession(silent = false) {
  if (!currentUser) return;
  const seriesData = collectSeriesData();

  try {
    await saveWorkoutSession({
      userId: currentUser.id,
      allenamentoIdx: curAll,
      sessionIdx: curSess,
      sessionDate: new Date().toISOString().split('T')[0],
      seriesData
    });

    if (!silent) {
      showSaveStatus('✓ Salvato');
    } else {
      showSaveStatus('✓ Auto-salvato');
    }
    // Refresh dots
    sessionMeta = await loadSessionMeta(currentUser.id, curAll);
    renderSessionDots();
  } catch(e) {
    console.error('save error', e);
    if (!silent) showSaveStatus('⚠ Errore salvataggio');
  }
}

function showSaveStatus(msg) {
  const el = document.getElementById('save-status');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

// ── HISTORY ──────────────────────────────────────────────────
async function loadHistory() {
  const userFilter = document.getElementById('history-filter-user').value;
  const allFilter  = document.getElementById('history-filter-all').value;

  const listEl = document.getElementById('history-list');
  listEl.innerHTML = '<div class="empty-state">Caricamento...</div>';

  try {
    const sessions = await loadAllSessions({
      userId: userFilter || null,
      allenamentoIdx: allFilter !== '' ? parseInt(allFilter) : null
    });

    if (!sessions.length) {
      listEl.innerHTML = '<div class="empty-state">Nessuna sessione trovata</div>';
      return;
    }

    listEl.innerHTML = sessions.map(s => {
      const profileName = s.profiles?.display_name || s.profiles?.email || '—';
      const allName = ALLENAMENTI[s.allenamento_idx]?.nome || `Allenamento ${s.allenamento_idx + 1}`;
      const date = s.session_date
        ? new Date(s.session_date).toLocaleDateString('it-IT', {day:'numeric',month:'long',year:'numeric'})
        : '—';

      // Count completion
      let total = 0, done = 0;
      const sd = s.series_data || {};
      Object.values(sd).forEach(exData => {
        Object.values(exData).forEach(serie => {
          total++;
          if (serie.done) done++;
        });
      });
      const pct = total > 0 ? Math.round(done / total * 100) : 0;

      // Exercise tags with best kg
      const all = ALLENAMENTI[s.allenamento_idx];
      const exTags = all ? all.esercizi.map((ex, ei) => {
        const exData = sd[ei] || {};
        const maxKg = Math.max(...Object.values(exData).map(s => parseFloat(s.kg) || 0).filter(v => v > 0), 0);
        return `<span class="hist-ex-tag">${ex.nome.split(' ').slice(0,2).join(' ')}${maxKg > 0 ? ` · ${maxKg}kg` : ''}</span>`;
      }).join('') : '';

      return `
      <div class="history-card">
        <div class="hist-top">
          <span class="hist-badge">${allName.replace('Allenamento', 'A')}</span>
          <span class="hist-user">${profileName}</span>
          <span style="font-size:.75rem;color:var(--text3)">Sess. ${s.session_idx + 1}</span>
          <span class="hist-date">${date}</span>
        </div>
        <div class="hist-completion" style="margin-bottom:6px">
          Completamento: <strong style="color:${pct===100?'var(--green)':'var(--text)'}">${pct}%</strong>
          (${done}/${total} serie)
        </div>
        <div class="hist-exercises">${exTags}</div>
      </div>`;
    }).join('');

  } catch(e) {
    console.error(e);
    listEl.innerHTML = `<div class="empty-state">Errore: ${e.message}</div>`;
  }
}

// ── STATS ─────────────────────────────────────────────────────
async function loadStats() {
  const userId = document.getElementById('stats-filter-user').value || currentUser.id;
  const gridEl = document.getElementById('stats-grid');
  gridEl.innerHTML = '<div class="empty-state">Caricamento...</div>';

  try {
    const sessions = await loadSessionsForStats(userId);

    if (!sessions.length) {
      gridEl.innerHTML = '<div class="empty-state">Nessun dato ancora. Salva qualche sessione!</div>';
      return;
    }

    // Build exercise → array of best kg (serie allenanti) over time
    const exerciseData = {}; // { "exName": [{date, kg}] }

    sessions.forEach(sess => {
      const all = ALLENAMENTI[sess.allenamento_idx];
      if (!all) return;
      const sd = sess.series_data || {};
      const date = sess.session_date || sess.updated_at?.split('T')[0];

      all.esercizi.forEach((ex, ei) => {
        const exData = sd[ei] || {};
        // Only training series (idx 2 and 3)
        const trainingKgs = [2, 3].map(si => parseFloat((exData[si] || {}).kg) || 0).filter(v => v > 0);
        if (!trainingKgs.length) return;
        const best = Math.max(...trainingKgs);

        if (!exerciseData[ex.nome]) exerciseData[ex.nome] = [];
        exerciseData[ex.nome].push({ date, kg: best });
      });
    });

    if (!Object.keys(exerciseData).length) {
      gridEl.innerHTML = '<div class="empty-state">Nessun dato con carichi registrati.</div>';
      return;
    }

    gridEl.innerHTML = Object.entries(exerciseData).map(([name, entries]) => {
      // Sort by date
      entries.sort((a, b) => a.date?.localeCompare(b.date));
      const latest = entries[entries.length - 1];
      const prev   = entries[entries.length - 2];
      const delta  = prev ? (latest.kg - prev.kg) : null;
      const max    = Math.max(...entries.map(e => e.kg));

      // Sparkline (last 8)
      const spark = entries.slice(-8);
      const sparkMax = Math.max(...spark.map(e => e.kg), 1);
      const bars = spark.map((e, i) => {
        const h = Math.round((e.kg / sparkMax) * 28) + 2;
        const isLast = i === spark.length - 1;
        return `<div class="spark-bar ${isLast ? 'latest' : ''}" style="height:${h}px"></div>`;
      }).join('');

      // Last 3 entries list
      const histRows = entries.slice(-4).reverse().map(e => `
        <div class="stat-hist-row">
          <span>${e.date || '—'}</span>
          <span class="stat-hist-val">${e.kg} kg</span>
        </div>`).join('');

      const deltaHtml = delta !== null
        ? `<div class="stat-delta ${delta < 0 ? 'neg' : ''}">${delta >= 0 ? '+' : ''}${delta.toFixed(1)} kg vs sessione prec.</div>`
        : '';

      return `
      <div class="stat-card">
        <div class="stat-ex-name">${name}</div>
        <div class="stat-current">${latest.kg} <span class="stat-unit">kg</span></div>
        ${deltaHtml}
        <div class="sparkline">${bars}</div>
        <div class="stat-history">${histRows}</div>
      </div>`;
    }).join('');

  } catch(e) {
    console.error(e);
    gridEl.innerHTML = `<div class="empty-state">Errore: ${e.message}</div>`;
  }
}
