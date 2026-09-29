// ========================================================
// ChemLab Edu — Клиенттік логика (Supabase + Realtime)
// Барлық мәтіндер қазақ тілінде, мұғалім құпиясөзімен қорғалған
// ========================================================

const SUPABASE_URL = "https://xrlpzpxwhwdvvytjozrl.supabase.co";
const SUPABASE_KEY = "sb_publishable_GP2_euNodHn2mWuRUS_13A_O3zyokv5";

// Мұғалім үшін құпиясөз (пароль)
const TEACHER_PASSWORDS = ["химия2026", "chem2026", "12345"];

// Supabase клиенті
const sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// Жүйелік жағдай (State)
let state = {
  currentUser: null, // { id, name, role, avatar_color }
  users: [],
  tasks: [],
  submissions: [],
  activeTaskId: null,
  activeReviewSubId: null,
  theme: 'light',
  soundEnabled: true
};

// ======================== ТАҚЫРЫП (АҚ / ҚАРАҢҒЫ) ========================

function initTheme() {
  const savedTheme = localStorage.getItem('chemlab_theme') || 'light';
  setTheme(savedTheme);
}

function setTheme(theme) {
  state.theme = theme;
  localStorage.setItem('chemlab_theme', theme);

  const html = document.documentElement;
  const icon = document.getElementById('themeIcon');
  const text = document.getElementById('themeText');

  if (theme === 'dark') {
    html.classList.add('dark');
    html.classList.remove('light');
    if (icon) icon.className = 'fa-solid fa-sun text-amber-400';
    if (text) text.textContent = 'Жарық тақырып';
  } else {
    html.classList.remove('dark');
    html.classList.add('light');
    if (icon) icon.className = 'fa-solid fa-moon text-indigo-500';
    if (text) text.textContent = 'Қараңғы тақырып';
  }

  if (chartInstance) inspectCompound();
}

function toggleTheme() {
  setTheme(state.theme === 'dark' ? 'light' : 'dark');
}

// ======================== ДЫБЫСТАР ЖӘНЕ ХАБАРЛАМАЛАР ========================

function playNotificationSound(type = 'success') {
  if (!state.soundEnabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'new_sub') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (e) {
    console.warn("Audio error", e);
  }
}

function showToast(message, iconClass = 'fa-solid fa-circle-check text-emerald-500') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2.5 pointer-events-auto transition-all duration-300 transform translate-y-2 opacity-0';
  toast.innerHTML = `<i class="${iconClass} text-base"></i> <span>${message}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// ======================== ОҚУШЫЛАР МЕН МҰҒАЛІМДІ АВТОРИЗАЦИЯЛАУ ========================

async function checkSavedUser() {
  const saved = localStorage.getItem('chemlab_user');
  if (saved) {
    try {
      state.currentUser = JSON.parse(saved);
      applyUserSession();
      return true;
    } catch (e) {
      localStorage.removeItem('chemlab_user');
    }
  }

  openLoginModal();
  return false;
}

function openLoginModal() {
  document.getElementById('loginModal').classList.remove('hidden');
}

function closeLoginModal() {
  document.getElementById('loginModal').classList.add('hidden');
}

function promptUserChange() {
  openLoginModal();
}

function toggleTeacherPasswordField() {
  const role = document.getElementById('loginRoleSelect').value;
  const block = document.getElementById('teacherPasswordBlock');
  if (role === 'teacher') {
    block.classList.remove('hidden');
    document.getElementById('loginTeacherPassword').required = true;
  } else {
    block.classList.add('hidden');
    document.getElementById('loginTeacherPassword').required = false;
  }
}

async function handleUserLogin(e) {
  e.preventDefault();
  const name = document.getElementById('loginNameInput').value.trim();
  const role = document.getElementById('loginRoleSelect').value;

  if (!name) return;

  // Егер рөлі Мұғалім болса — құпиясөзді тексеру
  if (role === 'teacher') {
    const password = document.getElementById('loginTeacherPassword').value.trim();
    if (!TEACHER_PASSWORDS.includes(password)) {
      showToast('Мұғалім құпиясөзі қате! Қайта көріңіз.', 'fa-solid fa-triangle-exclamation text-rose-500');
      return;
    }
  }

  // Supabase базасынан іздеу немесе жаңа қолданушы құру
  let user = null;
  const { data: existingUser } = await sb
    .from('users')
    .select('*')
    .ilike('name', name)
    .maybeSingle();

  if (existingUser) {
    // Егер бұрыннан бар қолданушы болса
    user = existingUser;
  } else {
    const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newId = (role === 'teacher' ? 'teacher_' : 'stud_') + Math.random().toString(36).substring(2, 9);

    const { data: created, error } = await sb
      .from('users')
      .insert({
        id: newId,
        name: name,
        role: role,
        avatar_color: randomColor
      })
      .select()
      .single();

    if (error) {
      console.error("Ошибка сохранения пользователя:", error);
      showToast('Қолданушыны базаға сақтау қатесі', 'fa-solid fa-triangle-exclamation text-rose-500');
      return;
    }
    user = created;
  }

  // localStorage-те сақтау (куки/кэш тазаланғанға дейін сақталады)
  state.currentUser = user;
  localStorage.setItem('chemlab_user', JSON.stringify(user));

  closeLoginModal();
  applyUserSession();
  showToast(`Қош келдіңіз, ${user.name}!`, 'fa-solid fa-user-check text-emerald-500');
}

function applyUserSession() {
  if (!state.currentUser) return;
  const user = state.currentUser;

  document.getElementById('userNameDisplay').textContent = user.name;
  document.getElementById('userRoleDisplay').textContent = user.role === 'teacher' ? 'Мұғалім' : 'Оқушы';
  document.getElementById('userAvatarDot').textContent = user.name.charAt(0).toUpperCase();
  document.getElementById('userAvatarDot').style.backgroundColor = user.avatar_color || '#10b981';

  const bannerName = document.getElementById('bannerStudentName');
  if (bannerName) bannerName.textContent = user.name;

  if (user.role === 'teacher') {
    switchTab('teacher');
  } else {
    switchTab('tasks');
  }

  loadTasksAndSubmissions();
}

// ======================== МҰҒАЛІМ ПАНЕЛІНЕ КІРУДІ ҚОРҒАУ ========================

function handleTeacherTabClick() {
  if (state.currentUser && state.currentUser.role === 'teacher') {
    switchTab('teacher');
  } else {
    // Оқушы Мұғалім панелін басқанда құпиясөз сұрау
    openTeacherAuthModal();
  }
}

function openTeacherAuthModal() {
  const modal = document.getElementById('teacherAuthModal');
  const input = document.getElementById('modalTeacherPasswordInput');
  const err = document.getElementById('teacherAuthErrorMsg');
  if (input) input.value = '';
  if (err) err.classList.add('hidden');
  if (modal) modal.classList.remove('hidden');
}

function closeTeacherAuthModal() {
  const modal = document.getElementById('teacherAuthModal');
  if (modal) modal.classList.add('hidden');
}

async function handleTeacherModalAuth(e) {
  e.preventDefault();
  const pass = document.getElementById('modalTeacherPasswordInput').value.trim();
  const err = document.getElementById('teacherAuthErrorMsg');

  if (TEACHER_PASSWORDS.includes(pass)) {
    closeTeacherAuthModal();
    // Қолданушыны мұғалім ретінде растау
    if (state.currentUser) {
      state.currentUser.role = 'teacher';
      localStorage.setItem('chemlab_user', JSON.stringify(state.currentUser));
      applyUserSession();
    }
    switchTab('teacher');
    showToast('Мұғалім мәртебесі сәтті расталды!', 'fa-solid fa-shield-halved text-emerald-500');
  } else {
    if (err) err.classList.remove('hidden');
  }
}

// ======================== ҚОЙЫНДЫЛАРДЫ АУЫСТЫРУ (TABS) ========================

function switchTab(tabId) {
  ['tasks', 'sim', 'explorer', 'teacher'].forEach(t => {
    const view = document.getElementById(`view-${t}`);
    const tabBtn = document.getElementById(`tab-${t}`);
    const mobBtn = document.getElementById(`mob-tab-${t}`);

    if (t === tabId) {
      view?.classList.remove('hidden');
      tabBtn?.classList.add('bg-white', 'dark:bg-slate-800', 'text-emerald-600', 'dark:text-emerald-400', 'shadow-sm');
      tabBtn?.classList.remove('text-slate-600', 'dark:text-slate-400');
      mobBtn?.classList.add('bg-white', 'dark:bg-slate-800', 'text-emerald-600', 'dark:text-emerald-400', 'shadow-sm');
      mobBtn?.classList.remove('text-slate-600', 'dark:text-slate-400');
    } else {
      view?.classList.add('hidden');
      tabBtn?.classList.remove('bg-white', 'dark:bg-slate-800', 'text-emerald-600', 'dark:text-emerald-400', 'shadow-sm');
      tabBtn?.classList.add('text-slate-600', 'dark:text-slate-400');
      mobBtn?.classList.remove('bg-white', 'dark:bg-slate-800', 'text-emerald-600', 'dark:text-emerald-400', 'shadow-sm');
      mobBtn?.classList.add('text-slate-600', 'dark:text-slate-400');
    }
  });

  if (tabId === 'explorer') inspectCompound();
  if (tabId === 'teacher') renderTeacherDashboard();
}

// ======================== SUPABASE REALTIME БАЙЛАНЫСЫ ========================

async function loadTasksAndSubmissions() {
  if (!sb) return;

  const [tRes, uRes, sRes] = await Promise.all([
    sb.from('tasks').select('*').order('id', { ascending: true }),
    sb.from('users').select('*').order('role', { ascending: false }).order('name'),
    sb.from('submissions').select('*, tasks(title, category, formula_hint)').order('id', { ascending: false })
  ]);

  state.tasks = tRes.data || [];
  state.users = uRes.data || [];
  state.submissions = (sRes.data || []).map(s => ({
    ...s,
    task_title: s.tasks ? s.tasks.title : `Тапсырма #${s.task_id}`,
    task_category: s.tasks ? s.tasks.category : '',
    formula_hint: s.tasks ? s.tasks.formula_hint : ''
  }));

  renderStudentTasksList();
  renderTeacherDashboard();
}

function initSupabaseRealtime() {
  if (!sb) return;

  sb.channel('chemlab-edu-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, async (payload) => {
      const newSub = payload.new;
      await loadTasksAndSubmissions();

      if (state.currentUser && state.currentUser.role === 'teacher') {
        if (newSub.status === 'submitted') {
          playNotificationSound('new_sub');
          showToast(`Оқушы <strong>${newSub.student_name}</strong> жауап жіберді!`, 'fa-solid fa-inbox text-amber-500');
        }
      } else if (state.currentUser && state.currentUser.id === newSub.student_id) {
        if (newSub.status === 'approved' || newSub.status === 'needs_revision') {
          playNotificationSound('success');
          const statusText = newSub.status === 'approved' ? 'қабылданды' : 'қайта өңдеуге жіберілді';
          showToast(`Мұғалім шешімді тексерді (${statusText}, балл: ${newSub.score || '—'})!`, 'fa-solid fa-graduation-cap text-emerald-500');
        }
      }
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, async (payload) => {
      showToast(`Жаңа тапсырма жарияланды: "${payload.new.title}"`, 'fa-solid fa-bell text-sky-500');
      await loadTasksAndSubmissions();
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'users' }, async () => {
      const { data } = await sb.from('users').select('*');
      state.users = data || [];
      renderTeacherDashboard();
    })
    .subscribe();
}

// ======================== ОҚУШЫ БӨЛІМІ (ТАПСЫРМАЛАР) ========================

function renderStudentTasksList() {
  const container = document.getElementById('studentTasksList');
  if (!container) return;

  const counter = document.getElementById('tasksTotalCounter');
  if (counter) counter.textContent = `${state.tasks.length} тапсырма`;

  container.innerHTML = '';

  const mySubMap = {};
  if (state.currentUser) {
    state.submissions
      .filter(s => s.student_id === state.currentUser.id)
      .forEach(s => mySubMap[s.task_id] = s);
  }

  state.tasks.forEach((task, idx) => {
    const sub = mySubMap[task.id];
    let badgeHtml = '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500">Басталмады</span>';

    if (sub) {
      if (sub.status === 'submitted') {
        badgeHtml = '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">Тексерілуде</span>';
      } else if (sub.status === 'approved') {
        badgeHtml = `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">Қабылданды (${sub.score || '5'})</span>`;
      } else if (sub.status === 'needs_revision') {
        badgeHtml = '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30">Қайта өңдеуге</span>';
      }
    }

    const item = document.createElement('div');
    const isActive = state.activeTaskId === task.id;
    item.className = `p-3 rounded-2xl border cursor-pointer transition-all ${
      isActive 
        ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500 shadow-sm' 
        : 'bg-slate-50/60 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800'
    }`;
    item.innerHTML = `
      <div class="flex justify-between items-center mb-1">
        <span class="text-[10px] uppercase font-bold text-slate-400 font-mono">${task.category}</span>
        ${badgeHtml}
      </div>
      <div class="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
        ${idx + 1}. ${task.title}
      </div>
    `;
    item.onclick = () => selectStudentTask(task.id);
    container.appendChild(item);
  });

  if (state.activeTaskId) {
    const cur = state.tasks.find(t => t.id === state.activeTaskId);
    if (cur) displayTaskDetails(cur);
  }
}

function selectStudentTask(taskId) {
  state.activeTaskId = taskId;
  renderStudentTasksList();
  const task = state.tasks.find(t => t.id === taskId);
  if (task) displayTaskDetails(task);
}

function displayTaskDetails(task) {
  document.getElementById('noTaskSelectedState').classList.add('hidden');
  const content = document.getElementById('taskActiveContent');
  content.classList.remove('hidden');

  document.getElementById('taskDetailTitle').textContent = task.title;
  document.getElementById('taskDetailCategory').textContent = task.category;
  document.getElementById('taskDetailDescription').textContent = task.description;

  const fBox = document.getElementById('taskDetailFormulaBox');
  if (task.formula_hint) {
    fBox.classList.remove('hidden');
    document.getElementById('taskDetailFormula').textContent = task.formula_hint;
  } else {
    fBox.classList.add('hidden');
  }

  const mySub = state.currentUser ? state.submissions.find(s => s.task_id === task.id && s.student_id === state.currentUser.id) : null;
  const statusBadge = document.getElementById('taskDetailStatusBadge');
  const feedbackCard = document.getElementById('feedbackCard');
  const answerInput = document.getElementById('studentAnswerTextarea');
  const submitBtn = document.getElementById('btnSubmitSolution');
  const hintMsg = document.getElementById('submitHintMsg');

  if (mySub) {
    answerInput.value = mySub.answer_text;
    if (mySub.status === 'approved') {
      statusBadge.className = 'text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
      statusBadge.textContent = `Қабылданды: ${mySub.score || '5'} балл`;

      feedbackCard.classList.remove('hidden');
      feedbackCard.className = 'p-4 rounded-2xl border bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200';
      document.getElementById('feedbackScorePill').className = 'text-xs font-bold px-2.5 py-0.5 rounded-lg font-mono bg-emerald-200 text-emerald-800 dark:bg-emerald-500/30 dark:text-emerald-200';
      document.getElementById('feedbackScorePill').textContent = `Баға: ${mySub.score || 5}`;
      document.getElementById('feedbackTextDisplay').textContent = mySub.teacher_feedback || 'Жарайсың! Шешім қабылданды.';

      submitBtn.innerHTML = '<i class="fa-solid fa-rotate mr-1"></i> <span>Жаңартылған жауапты қайта жіберу</span>';
      hintMsg.textContent = 'Жұмыс мұғалім тарапынан қабылданған.';
    } else if (mySub.status === 'needs_revision') {
      statusBadge.className = 'text-xs font-bold px-3 py-1 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300';
      statusBadge.textContent = 'Қайта қарауды қажет етеді';

      feedbackCard.classList.remove('hidden');
      feedbackCard.className = 'p-4 rounded-2xl border bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200';
      document.getElementById('feedbackScorePill').className = 'text-xs font-bold px-2.5 py-0.5 rounded-lg font-mono bg-rose-200 text-rose-800 dark:bg-rose-500/30 dark:text-rose-200';
      document.getElementById('feedbackScorePill').textContent = 'Өңдеуге';
      document.getElementById('feedbackTextDisplay').textContent = mySub.teacher_feedback || 'Қателіктерді түзеп, қайта жіберіңіз.';

      submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane mr-1"></i> <span>Түзетілген шешімді жіберу</span>';
      hintMsg.textContent = 'Мұғалім жұмыстың түзетілуін күтуде.';
    } else {
      statusBadge.className = 'text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300';
      statusBadge.textContent = 'Мұғалімнің тексеруінде';
      feedbackCard.classList.add('hidden');
      submitBtn.innerHTML = '<i class="fa-solid fa-pen-to-square mr-1"></i> <span>Жіберілген жауапты жаңарту</span>';
      hintMsg.textContent = 'Жауап мұғалімге жіберілді.';
    }
  } else {
    answerInput.value = '';
    statusBadge.className = 'text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400';
    statusBadge.textContent = 'Басталмады';
    feedbackCard.classList.add('hidden');
    submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane mr-1"></i> <span>Шешімді мұғалімге жіберу</span>';
    hintMsg.textContent = '';
  }
}

function insertChemSym(sym) {
  const input = document.getElementById('studentAnswerTextarea');
  if (!input) return;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const text = input.value;
  input.value = text.substring(0, start) + sym + text.substring(end);
  input.selectionStart = input.selectionEnd = start + sym.length;
  input.focus();
}

async function submitStudentSolution() {
  if (!state.currentUser) {
    openLoginModal();
    return;
  }
  if (!state.activeTaskId) return;

  const answer = document.getElementById('studentAnswerTextarea').value.trim();
  if (!answer) {
    alert('Шешім жолын жазыңыз!');
    return;
  }

  const { data: existing } = await sb
    .from('submissions')
    .select('id')
    .eq('task_id', state.activeTaskId)
    .eq('student_id', state.currentUser.id)
    .maybeSingle();

  const now = new Date().toISOString();
  let err = null;

  if (existing) {
    const { error } = await sb
      .from('submissions')
      .update({
        answer_text: answer,
        status: 'submitted',
        score: null,
        teacher_feedback: null,
        submitted_at: now
      })
      .eq('id', existing.id);
    err = error;
  } else {
    const { error } = await sb
      .from('submissions')
      .insert({
        task_id: state.activeTaskId,
        student_id: state.currentUser.id,
        student_name: state.currentUser.name,
        answer_text: answer,
        status: 'submitted',
        submitted_at: now
      });
    err = error;
  }

  if (!err) {
    showToast('Шешім мұғалімге сәтті жіберілді!', 'fa-solid fa-paper-plane text-emerald-500');
    playNotificationSound('success');
    await loadTasksAndSubmissions();
  } else {
    console.error("Ошибка сохранения:", err);
    showToast('Жауапты сақтау барысында қате орын алды', 'fa-solid fa-triangle-exclamation text-rose-500');
  }
}

// ======================== МҰҒАЛІМ ПАНЕЛІ ========================

function renderTeacherDashboard() {
  const students = state.users.filter(u => u.role === 'student');
  const tasks = state.tasks;
  const pendingCount = state.submissions.filter(s => s.status === 'submitted').length;
  const approvedCount = state.submissions.filter(s => s.status === 'approved').length;

  const sTot = document.getElementById('statTotalStudents');
  if (sTot) sTot.textContent = students.length;
  const tTot = document.getElementById('statTotalTasks');
  if (tTot) tTot.textContent = tasks.length;
  const pTot = document.getElementById('statPendingReviews');
  if (pTot) pTot.textContent = pendingCount;
  const aTot = document.getElementById('statApprovedReviews');
  if (aTot) aTot.textContent = approvedCount;

  const badge = document.getElementById('teacherQueueBadge');
  if (badge) {
    if (pendingCount > 0) {
      badge.classList.remove('hidden');
      badge.textContent = pendingCount;
    } else {
      badge.classList.add('hidden');
    }
  }

  renderTeacherMatrix(students, tasks);
  renderTeacherSubmissionsQueue();
}

function renderTeacherMatrix(students, tasks) {
  const header = document.getElementById('teacherMatrixHeader');
  const body = document.getElementById('teacherMatrixBody');
  if (!header || !body) return;

  header.innerHTML = '<th class="py-3 px-4">Оқушы</th>';
  tasks.forEach(t => {
    const th = document.createElement('th');
    th.className = 'py-3 px-3 text-center';
    th.textContent = t.title.length > 20 ? t.title.slice(0, 18) + '...' : t.title;
    th.title = t.title;
    header.appendChild(th);
  });

  body.innerHTML = '';
  const subMap = {};
  state.submissions.forEach(s => subMap[`${s.student_id}_${s.task_id}`] = s);

  students.forEach(st => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition';

    const tdUser = document.createElement('td');
    tdUser.className = 'py-3 px-4 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2.5';
    tdUser.innerHTML = `
      <div class="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold" style="background-color: ${st.avatar_color || '#10b981'}">
        ${st.name.charAt(0).toUpperCase()}
      </div>
      <span>${st.name}</span>
    `;
    tr.appendChild(tdUser);

    tasks.forEach(t => {
      const td = document.createElement('td');
      td.className = 'py-3 px-3 text-center';
      const sub = subMap[`${st.id}_${t.id}`];

      if (!sub) {
        td.innerHTML = '<span class="inline-block text-slate-300 dark:text-slate-600 font-bold">—</span>';
      } else if (sub.status === 'submitted') {
        const btn = document.createElement('button');
        btn.className = 'px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 animate-pulse';
        btn.textContent = 'Тексеру';
        btn.onclick = () => openReviewModal(sub.id);
        td.appendChild(btn);
      } else if (sub.status === 'approved') {
        const btn = document.createElement('button');
        btn.className = 'px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300';
        btn.textContent = `Қабылданды (${sub.score || '5'})`;
        btn.onclick = () => openReviewModal(sub.id);
        td.appendChild(btn);
      } else if (sub.status === 'needs_revision') {
        const btn = document.createElement('button');
        btn.className = 'px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-300';
        btn.textContent = 'Өңдеуге';
        btn.onclick = () => openReviewModal(sub.id);
        td.appendChild(btn);
      }

      tr.appendChild(td);
    });

    body.appendChild(tr);
  });
}

function renderTeacherSubmissionsQueue() {
  const container = document.getElementById('teacherSubmissionsList');
  if (!container) return;
  container.innerHTML = '';

  if (state.submissions.length === 0) {
    container.innerHTML = '<div class="col-span-3 text-center py-8 text-slate-400 text-xs">Әзірге өткізілген шешімдер жоқ.</div>';
    return;
  }

  state.submissions.forEach(sub => {
    const card = document.createElement('div');
    card.className = 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3';

    let badgeClass = 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
    let badgeText = 'Тексеруді күтуде';
    if (sub.status === 'approved') {
      badgeClass = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
      badgeText = `Қабылданды (${sub.score})`;
    } else if (sub.status === 'needs_revision') {
      badgeClass = 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400';
      badgeText = 'Өңдеуге жіберілді';
    }

    card.innerHTML = `
      <div>
        <div class="flex justify-between items-start mb-2">
          <div>
            <div class="font-extrabold text-sm text-slate-900 dark:text-white">${sub.student_name}</div>
            <div class="text-[11px] text-slate-400 font-mono">${sub.task_title}</div>
          </div>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass}">${badgeText}</span>
        </div>
        <div class="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono text-emerald-700 dark:text-emerald-400 whitespace-pre-wrap max-h-28 overflow-y-auto">
          ${escapeHtml(sub.answer_text)}
        </div>
        ${sub.teacher_feedback ? `<div class="text-[11px] text-slate-500 mt-2"><strong>Пікір:</strong> ${escapeHtml(sub.teacher_feedback)}</div>` : ''}
      </div>
      <button onclick="openReviewModal(${sub.id})" class="w-full mt-2 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition">
        ${sub.status === 'submitted' ? 'Жауапты тексеру' : 'Бағаны өзгерту'}
      </button>
    `;
    container.appendChild(card);
  });
}

function openReviewModal(subId) {
  const sub = state.submissions.find(s => s.id === subId);
  if (!sub) return;

  state.activeReviewSubId = subId;
  document.getElementById('mReviewStudentName').textContent = `Тексеру: ${sub.student_name}`;
  document.getElementById('mReviewTaskTitle').textContent = sub.task_title;
  document.getElementById('mReviewAnswerText').textContent = sub.answer_text;
  document.getElementById('mReviewFeedbackText').value = sub.teacher_feedback || '';
  document.getElementById('mReviewScoreInput').value = sub.score || 5;

  document.getElementById('reviewModal').classList.remove('hidden');
}

function closeReviewModal() {
  document.getElementById('reviewModal').classList.add('hidden');
}

function setQuickFeedback(text) {
  const input = document.getElementById('mReviewFeedbackText');
  input.value = text;
  input.focus();
}

async function saveReview(status) {
  if (!state.activeReviewSubId) return;
  const score = parseInt(document.getElementById('mReviewScoreInput').value) || 5;
  const feedback = document.getElementById('mReviewFeedbackText').value.trim();

  const { error } = await sb
    .from('submissions')
    .update({
      status: status,
      score: score,
      teacher_feedback: feedback,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', state.activeReviewSubId);

  if (!error) {
    closeReviewModal();
    showToast('Баға мен түсініктеме сәтті сақталды!', 'fa-solid fa-circle-check text-emerald-500');
    await loadTasksAndSubmissions();
  } else {
    console.error("Ошибка сохранения отзыва:", error);
    showToast('Бағаны сақтау қатесі', 'fa-solid fa-triangle-exclamation text-rose-500');
  }
}

function openNewTaskModal() {
  document.getElementById('newTaskModal').classList.remove('hidden');
}

function closeNewTaskModal() {
  document.getElementById('newTaskModal').classList.add('hidden');
}

async function handleCreateTask(e) {
  e.preventDefault();
  const title = document.getElementById('newTaskTitle').value.trim();
  const category = document.getElementById('newTaskCategory').value;
  const formula = document.getElementById('newTaskFormula').value.trim();
  const desc = document.getElementById('newTaskDesc').value.trim();

  const { error } = await sb
    .from('tasks')
    .insert({
      title: title,
      category: category,
      formula_hint: formula,
      description: desc
    });

  if (!error) {
    closeNewTaskModal();
    document.getElementById('newTaskForm').reset();
    showToast('Жаңа тапсырма сәтті қосылды!', 'fa-solid fa-circle-check text-emerald-500');
    await loadTasksAndSubmissions();
  } else {
    console.error("Ошибка создания задания:", error);
    showToast('Тапсырманы құру қатесі', 'fa-solid fa-triangle-exclamation text-rose-500');
  }
}

// ======================== ИНТЕРАКТИВТІ СИМУЛЯЦИЯ ========================

let selectedReaction = 'CuS';

function changeReaction() {
  selectedReaction = document.getElementById('reactionSelect').value;
  const title = document.getElementById('currentReactionTitle');
  const r1Label = document.getElementById('r1-label');
  const r2Label = document.getElementById('r2-label');

  if (selectedReaction === 'CuS') {
    title.innerText = 'Cu + S = CuS (Мыс сульфиді)';
    r1Label.innerText = '1-реагент: Мыс (Cu)';
    r2Label.innerText = '2-реагент: Күкірт (S)';
  } else if (selectedReaction === 'MgO') {
    title.innerText = '2Mg + O₂ = 2MgO (Магний оксиді)';
    r1Label.innerText = '1-реагент: Магний (Mg)';
    r2Label.innerText = '2-реагент: Оттек (O₂)';
  } else if (selectedReaction === 'H2O') {
    title.innerText = '2H₂ + O₂ = 2H₂O (Су синтезі)';
    r1Label.innerText = '1-реагент: Сутек (H₂)';
    r2Label.innerText = '2-реагент: Оттек (O₂)';
  } else if (selectedReaction === 'FeCl3') {
    title.innerText = '2Fe + 3Cl₂ = 2FeCl₃ (Темір(III) хлориді)';
    r1Label.innerText = '1-реагент: Темір (Fe)';
    r2Label.innerText = '2-реагент: Хлор (Cl₂)';
  } else if (selectedReaction === 'Al2S3') {
    title.innerText = '2Al + 3S = Al₂S₃ (Алюминий сульфиді)';
    r1Label.innerText = '1-реагент: Алюминий (Al)';
    r2Label.innerText = '2-реагент: Күкірт (S)';
  }

  resetSim();
}

function updateSimInputs() {
  const v1 = parseFloat(document.getElementById('r1-slider').value);
  const v2 = parseFloat(document.getElementById('r2-slider').value);

  document.getElementById('r1-val').innerText = `${v1.toFixed(2)} г`;
  document.getElementById('r2-val').innerText = `${v2.toFixed(2)} г`;

  const total = (v1 + v2).toFixed(2);
  document.getElementById('scale-display').innerHTML = `${total} <span class="text-xl text-emerald-500">г</span>`;
  document.getElementById('status-badge').className = 'w-3.5 h-3.5 rounded-full bg-amber-400 animate-pulse';
  document.getElementById('status-text').innerText = 'Дайын: Қыздыруды күтуде';
  document.getElementById('flame-container').classList.add('hidden');

  const l1 = document.getElementById('substance-layer-1');
  const l2 = document.getElementById('substance-layer-2');
  const t1 = document.getElementById('substance-layer-1-text');
  const t2 = document.getElementById('substance-layer-2-text');

  if (selectedReaction === 'CuS') {
    l1.className = 'w-full bg-amber-700/80 transition-all duration-1000 flex items-center justify-center text-[10px] text-white';
    l2.className = 'w-full bg-yellow-400/90 transition-all duration-1000 flex items-center justify-center text-[10px] text-slate-900';
    t1.innerText = `Cu (${v1}г)`;
    t2.innerText = `S (${v2}г)`;
  } else if (selectedReaction === 'MgO') {
    l1.className = 'w-full bg-slate-400/80 transition-all duration-1000 flex items-center justify-center text-[10px] text-slate-900';
    l2.className = 'w-full bg-sky-300/60 transition-all duration-1000 flex items-center justify-center text-[10px] text-slate-900';
    t1.innerText = `Mg (${v1}г)`;
    t2.innerText = `O₂ (${v2}г)`;
  } else {
    l1.className = 'w-full bg-indigo-500/50 transition-all duration-1000 flex items-center justify-center text-[10px] text-white';
    l2.className = 'w-full bg-emerald-500/50 transition-all duration-1000 flex items-center justify-center text-[10px] text-white';
    t1.innerText = `R1 (${v1}г)`;
    t2.innerText = `R2 (${v2}г)`;
  }
}

function resetSim() {
  document.getElementById('r1-slider').value = 6.4;
  document.getElementById('r2-slider').value = 3.2;
  updateSimInputs();
}

function runReaction() {
  const m1 = parseFloat(document.getElementById('r1-slider').value);
  const m2 = parseFloat(document.getElementById('r2-slider').value);

  document.getElementById('flame-container').classList.remove('hidden');
  document.getElementById('status-badge').className = 'w-3.5 h-3.5 rounded-full bg-red-500 animate-ping';
  document.getElementById('status-text').innerText = 'Қыздыру және Реакция жүріп жатыр...';

  setTimeout(() => {
    document.getElementById('flame-container').classList.add('hidden');
    document.getElementById('status-badge').className = 'w-3.5 h-3.5 rounded-full bg-emerald-500';
    document.getElementById('status-text').innerText = 'Реакция аяқталды';

    let ratioR1 = 2, ratioR2 = 1, prodName = 'Мыс(II) сульфиді', prodFormula = 'CuS', ratioText = 'm(Cu) : m(S) = 2 : 1';

    if (selectedReaction === 'MgO') {
      ratioR1 = 3; ratioR2 = 2; prodName = 'Магний оксиді'; prodFormula = 'MgO'; ratioText = 'm(Mg) : m(O) = 3 : 2';
    } else if (selectedReaction === 'H2O') {
      ratioR1 = 1; ratioR2 = 8; prodName = 'Су'; prodFormula = 'H₂O'; ratioText = 'm(H) : m(O) = 1 : 8';
    }

    let neededR2 = (m1 * ratioR2) / ratioR1;
    let productMass = 0, excessMass = 0, excessSub = '';

    if (m2 >= neededR2) {
      productMass = m1 + neededR2;
      excessMass = m2 - neededR2;
      excessSub = '2-реагент (Артық)';
    } else {
      let neededR1 = (m2 * ratioR1) / ratioR2;
      productMass = m2 + neededR1;
      excessMass = m1 - neededR1;
      excessSub = '1-реагент (Артық)';
    }

    document.getElementById('calc-step-1').innerText = `Теориялық қатынас: ${ratioText}`;
    document.getElementById('calc-step-2').innerText = `Бастапқы массалар: ${m1}г және ${m2}г. Түзілген өнім ${prodFormula}: ${productMass.toFixed(2)}г`;
    document.getElementById('calc-step-3').innerText = excessMass > 0.005 ? `Артық қалған зат: ${excessMass.toFixed(2)}г (${excessSub})` : 'Стехиометриялық толық реакция (Артық зат жоқ)';

    const l1 = document.getElementById('substance-layer-1');
    const l2 = document.getElementById('substance-layer-2');
    l1.className = 'w-full bg-slate-800 transition-all duration-1000 flex items-center justify-center text-[10px] text-emerald-400 font-bold';
    l2.className = 'w-full bg-slate-900 transition-all duration-1000 flex items-center justify-center text-[10px] text-slate-400';
    document.getElementById('substance-layer-1-text').innerText = `${prodFormula} (${productMass.toFixed(2)}г)`;
    document.getElementById('substance-layer-2-text').innerText = excessMass > 0.005 ? `Артық: ${excessMass.toFixed(2)}г` : 'Толық реакция';
  }, 1000);
}

// ======================== МОЛЕКУЛА ИНСПЕКТОРЫ ========================

const compoundsData = {
  CO2: {
    formula: 'CO₂', name: 'Көмірқышқыл газы', molar: 44,
    atomRatio: 'n(C) : n(O) = 1 : 2', massRatio: 'm(C) : m(O) = 12 : 32 = 3 : 8', percentRatio: 'w(C) : w(O) = 27.3% : 72.7%',
    description: 'Көмірқышқыл газы тыныс алғанда, отын жанғанда түзіледі. Ондағы көміртек пен оттектің массалық қатынасы әрдайым 3 : 8 болады (Пруст заңы).',
    elements: ['Көміртек (C)', 'Оттек (O)'], percentages: [27.3, 72.7], colors: ['#3b82f6', '#ef4444']
  },
  CuS: {
    formula: 'CuS', name: 'Мыс(II) сульфиді', molar: 96,
    atomRatio: 'n(Cu) : n(S) = 1 : 1', massRatio: 'm(Cu) : m(S) = 64 : 32 = 2 : 1', percentRatio: 'w(Cu) : w(S) = 66.7% : 33.3%',
    description: 'Мыс(II) сульфидінде мыс пен күкірттің атомдық қатынасы 1:1, ал массалық қатынасы қатаң түрде 2 : 1 болады.',
    elements: ['Мыс (Cu)', 'Күкірт (S)'], percentages: [66.7, 33.3], colors: ['#f59e0b', '#10b981']
  },
  MgO: {
    formula: 'MgO', name: 'Магний оксиді', molar: 40,
    atomRatio: 'n(Mg) : n(O) = 1 : 1', massRatio: 'm(Mg) : m(O) = 24 : 16 = 3 : 2', percentRatio: 'w(Mg) : w(O) = 60.0% : 40.0%',
    description: 'Магний жанғанда түзілетін магний оксидінде элементтердің массалық қатынасы 3 : 2 құрайды.',
    elements: ['Магний (Mg)', 'Оттек (O)'], percentages: [60.0, 40.0], colors: ['#8b5cf6', '#ec4899']
  },
  SO2: {
    formula: 'SO₂', name: 'Күкірт(IV) оксиді', molar: 64,
    atomRatio: 'n(S) : n(O) = 1 : 2', massRatio: 'm(S) : m(O) = 32 : 32 = 1 : 1', percentRatio: 'w(S) : w(O) = 50.0% : 50.0%',
    description: 'Күкірт(IV) оксидінде күкірт пен оттектің массалары бір-біріне тең (1:1 қатынасы).',
    elements: ['Күкірт (S)', 'Оттек (O)'], percentages: [50.0, 50.0], colors: ['#eab308', '#3b82f6']
  },
  SO3: {
    formula: 'SO₃', name: 'Күкірт(VI) оксиді', molar: 80,
    atomRatio: 'n(S) : n(O) = 1 : 3', massRatio: 'm(S) : m(O) = 32 : 48 = 2 : 3', percentRatio: 'w(S) : w(O) = 40.0% : 60.0%',
    description: 'Күкірт(VI) оксидінде күкірт пен оттек массалары 2 : 3 қатынасында әрекеттеседі.',
    elements: ['Күкірт (S)', 'Оттек (O)'], percentages: [40.0, 60.0], colors: ['#10b981', '#f43f5e']
  },
  FeO: {
    formula: 'FeO', name: 'Темір(II) оксиді', molar: 72,
    atomRatio: 'n(Fe) : n(O) = 1 : 1', massRatio: 'm(Fe) : m(O) = 56 : 16 = 7 : 2', percentRatio: 'w(Fe) : w(O) = 77.8% : 22.2%',
    description: 'Темір(II) оксидіндегі темір мен оттектің массалық қатынасы 7 : 2 құрайды.',
    elements: ['Темір (Fe)', 'Оттек (O)'], percentages: [77.8, 22.2], colors: ['#b45309', '#38bdf8']
  },
  Fe2O3: {
    formula: 'Fe₂O₃', name: 'Темір(III) оксиді', molar: 160,
    atomRatio: 'n(Fe) : n(O) = 2 : 3', massRatio: 'm(Fe) : m(O) = 112 : 48 = 7 : 3', percentRatio: 'w(Fe) : w(O) = 70.0% : 30.0%',
    description: 'Темір(III) оксидінде элементтердің массалық қатынасы 7 : 3 болады.',
    elements: ['Темір (Fe)', 'Оттек (O)'], percentages: [70.0, 30.0], colors: ['#d97706', '#0284c7']
  },
  Al2O3: {
    formula: 'Al₂O₃', name: 'Алюминий оксиді', molar: 102,
    atomRatio: 'n(Al) : n(O) = 2 : 3', massRatio: 'm(Al) : m(O) = 54 : 48 = 9 : 8', percentRatio: 'w(Al) : w(O) = 52.9% : 47.1%',
    description: 'Алюминий оксидінде алюминий мен оттектің массалық қатынасы 9 : 8 болады.',
    elements: ['Алюминий (Al)', 'Оттек (O)'], percentages: [52.9, 47.1], colors: ['#64748b', '#ef4444']
  },
  H2O: {
    formula: 'H₂O', name: 'Су', molar: 18,
    atomRatio: 'n(H) : n(O) = 2 : 1', massRatio: 'm(H) : m(O) = 2 : 16 = 1 : 8', percentRatio: 'w(H) : w(O) = 11.1% : 88.9%',
    description: 'Кез келген таза суда 1 грамм сутекке әрдайым 8 грамм оттек сәйкес келеді.',
    elements: ['Сутек (H)', 'Оттек (O)'], percentages: [11.1, 88.9], colors: ['#38bdf8', '#2563eb']
  },
  P2O5: {
    formula: 'P₂O₅', name: 'Фосфор(V) оксиді', molar: 142,
    atomRatio: 'n(P) : n(O) = 2 : 5', massRatio: 'm(P) : m(O) = 62 : 80 = 31 : 40', percentRatio: 'w(P) : w(O) = 43.7% : 56.3%',
    description: 'Фосфор(V) оксидінде элементтердің массалық қатынасы 31 : 40 тең.',
    elements: ['Фосфор (P)', 'Оттек (O)'], percentages: [43.7, 56.3], colors: ['#a855f7', '#f97316']
  },
  CH4: {
    formula: 'CH₄', name: 'Метан', molar: 16,
    atomRatio: 'n(C) : n(H) = 1 : 4', massRatio: 'm(C) : m(H) = 12 : 4 = 3 : 1', percentRatio: 'w(C) : w(H) = 75.0% : 25.0%',
    description: 'Метан газында әрбір 3 грамм көміртекке 1 грамм сутек сәйкес келеді (3:1 қатынасы).',
    elements: ['Көміртек (C)', 'Сутек (H)'], percentages: [75.0, 25.0], colors: ['#3b82f6', '#38bdf8']
  },
  NH3: {
    formula: 'NH₃', name: 'Аммиак', molar: 17,
    atomRatio: 'n(N) : n(H) = 1 : 3', massRatio: 'm(N) : m(H) = 14 : 3', percentRatio: 'w(N) : w(H) = 82.4% : 17.6%',
    description: 'Аммиак қосылысында азот пен сутектің массалық қатынасы 14 : 3 құрайды.',
    elements: ['Азот (N)', 'Сутек (H)'], percentages: [82.4, 17.6], colors: ['#6366f1', '#06b6d4']
  }
};

let chartInstance = null;

function inspectCompound() {
  const select = document.getElementById('compoundSelect');
  if (!select) return;
  const key = select.value;
  const data = compoundsData[key];
  if (!data) return;

  document.getElementById('mol-formula-badge').innerText = data.formula;
  document.getElementById('mol-name').innerText = data.name;
  document.getElementById('mol-molar').innerText = `Салыстырмалы молекулалық массасы Mr = ${data.molar}`;
  document.getElementById('mol-atom-ratio').innerText = data.atomRatio;
  document.getElementById('mol-mass-ratio').innerText = data.massRatio;
  document.getElementById('mol-percent-ratio').innerText = data.percentRatio;
  document.getElementById('mol-description').innerText = data.description;

  const canvas = document.getElementById('massRatioChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (chartInstance) {
    chartInstance.destroy();
  }

  const isDark = document.documentElement.classList.contains('dark');

  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.elements,
      datasets: [{
        data: data.percentages,
        backgroundColor: data.colors,
        borderWidth: 2,
        borderColor: isDark ? '#1e293b' : '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      }
    }
  });

  const legendBox = document.getElementById('chartLegend');
  legendBox.innerHTML = data.elements.map((el, idx) => `
    <div class="flex items-center space-x-2">
      <span class="w-3 h-3 rounded-full inline-block" style="background-color: ${data.colors[idx]}"></span>
      <span class="text-slate-600 dark:text-slate-300 font-mono">${el}: <strong>${data.percentages[idx]}%</strong></span>
    </div>
  `).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}

// ======================== ІСКЕ ҚОСУ ========================

window.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  updateSimInputs();
  inspectCompound();

  await checkSavedUser();
  initSupabaseRealtime();
});
