// ========================================================
// ChemLab Edu — §9. Химиялық реакциялардың типтері
// Himiya_virtual_lab стилі + chemistry_simulation тапсырмалары
// ========================================================

const SUPABASE_URL = "https://xrlpzpxwhwdvvytjozrl.supabase.co";
const SUPABASE_KEY = "sb_publishable_GP2_euNodHn2mWuRUS_13A_O3zyokv5";

// Мұғалім құпиясөзі
const TEACHER_PASSWORDS = ["химия2026", "chem2026", "12345"];

// Supabase клиенті
const sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// Глобалды тұрақты мәндер және оқулық тапсырмалары (§9 C-деңгейі)
const DEFAULT_TASKS = [
  {
    id: 1,
    title: '1-тапсырма. Реакция теңдеулерін аяқтау және типтерін анықтау',
    category: 'Реакция типтері',
    formula_hint: 'Al₂S₃ + HCl → ? | NH₃ → ? | CuCO₃ → ? | N₂ + O₂ → ? | P + Cl₂ → ?',
    description: 'Мына реакция теңдеулерін аяқтап, олардың типтерін анықтаңдар:\n\n1) Al₂S₃ + HCl → ? + ?\n2) NH₃ → ? + ?\n3) CuCO₃ → ? + ?\n4) N₂ + O₂ → ?\n5) P + Cl₂ → ?\n\nТапсырма шарты: Әрбір реакция теңдеуіндегі сұрақ белгілерінің орнына түзілген зат формулаларын жазып, коэффициенттерді қойыңыз және реакция типін (қосылу, айырылу, орынбасу немесе алмасу) көрсетіңіз.'
  },
  {
    id: 2,
    title: '2-тапсырма. Реакция теңдеулерін толықтырып, теңестіру',
    category: 'Теңдеулерді теңестіру',
    formula_hint: 'AgNO₃ + Zn → ? | K₂S + CuCl₂ → ? | Fe + ? → FeCl₃ | Na₂O + H₃PO₄ → ? | FeCl₂ + ? → FeCl₃ | FeS + HCl → ?',
    description: 'Мына реакция теңдеулерін толықтырып, теңестіріңдер:\n\n1) AgNO₃ + Zn → Zn(NO₃)₂ + ?\n2) K₂S + CuCl₂ → KCl + ?\n3) Fe + ? → FeCl₃\n4) Na₂O + H₃PO₄ → Na₃PO₄ + ?\n5) FeCl₂ + ? → FeCl₃\n6) FeS + HCl → ? + ?\n\nТапсырма шарты: Сұрақ белгілерінің орнына жетіспейтін реагенттер мен өнімдерді тауып жазыңыз және зат массасының сақталу заңына сәйкес коэффициенттерін қойып теңестіріңіз.'
  },
  {
    id: 3,
    title: '3-тапсырма. Зат формулаларын жазып, коэффициент қою және типтерін анықтау',
    category: 'Кешенді тапсырма',
    formula_hint: '? + ? → NaCl + H₂ | ? + ? → CO₂ | ? + ? → HgO | ? + ? → CuCl₂ + H₂O | ? → CaO + CO₂',
    description: 'Сұрақ белгілерінің орнына зат формулаларын жазып, коэффициенттерін қойып, реакция типтерін анықтаңдар:\n\n1) ? + ? → NaCl + H₂\n2) ? + ? → CO₂\n3) ? + ? → HgO\n4) ? + ? → CuCl₂ + H₂O\n5) ? → CaO + CO₂\n\nТапсырма шарты: Берілген өнімдер мен бастапқы заттар сұлбасын негізге ала отырып, сұрақ белгілеріне сәйкес формулаларды анықтаңыз, коэффициенттер қойыңыз және реакция типін (қосылу, айырылу, орынбасу, алмасу) жазыңыз.'
  }
];

// Қолжетімді сыныптар тізімі (Мектеп сыныптары)
const AVAILABLE_CLASSES = ["7 E", "8 J", "9 I", "9 A", "9 E", "9 D", "10 B", "10 G", "10 E", "11 L", "11 E"];

// Қолданушы метадеректерін оқу (түс, сынып, қорытынды баға, кері байланыс)
function parseUserMeta(user) {
  if (!user) return { color: '#0284c7', class_name: '7 E', overall_grade: '', overall_feedback: '' };
  let color = '#0284c7';
  let class_name = '7 E';
  let overall_grade = '';
  let overall_feedback = '';

  if (user.avatar_color) {
    if (user.avatar_color.startsWith('{')) {
      try {
        const parsed = JSON.parse(user.avatar_color);
        color = parsed.color || color;
        class_name = parsed.class_name || class_name;
        overall_grade = parsed.overall_grade || '';
        overall_feedback = parsed.overall_feedback || '';
      } catch (e) {
        color = user.avatar_color;
      }
    } else {
      color = user.avatar_color;
    }
  }

  return { color, class_name, overall_grade, overall_feedback };
}

function serializeUserMeta(meta) {
  return JSON.stringify({
    color: meta.color || '#0284c7',
    class_name: meta.class_name || '7 E',
    overall_grade: meta.overall_grade || '',
    overall_feedback: meta.overall_feedback || ''
  });
}

// Глобалды күй
let state = {
  currentUser: null,
  users: [],
  tasks: [],
  submissions: [],
  activeTaskId: 1,
  activeReviewSubId: null,
  theme: 'light',
  soundEnabled: true,
  teacherSelectedClass: 'all', // 'all', '7 E', '8 J', etc.

  // Симуляция және таразы күйі
  simReaction: 'CuS',
  simM1: 6.4,
  simM2: 3.2,

  // Виртуалды зертхана күйі (Himiya_virtual_lab)
  vlabCurrent: 0,
  vlabDone: new Set(),

  // Сұрыптау күйі (Sorting)
  sortingScore: 0,

  // Теңестіру күйі (Balancing)
  balancingDone: false
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
    if (icon) icon.className = 'fa-solid fa-moon text-sky-600';
    if (text) text.textContent = 'Қараңғы тақырып';
  }
}

function toggleTheme() {
  setTheme(state.theme === 'dark' ? 'light' : 'dark');
}

// ======================== ХАБАРЛАМАЛАР МЕН ДЫБЫСТАР ========================

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
  toast.className = 'bg-white dark:bg-slate-800 border border-sky-100 dark:border-slate-700 shadow-xl rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2.5 pointer-events-auto transition-all duration-300 transform translate-y-2 opacity-0';
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

// ======================== ҚОЛДАНУШЫ АВТОРИЗАЦИЯСЫ ========================

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
  const teacherBlock = document.getElementById('teacherPasswordBlock');
  const classBlock = document.getElementById('studentClassBlock');
  if (role === 'teacher') {
    teacherBlock?.classList.remove('hidden');
    document.getElementById('loginTeacherPassword').required = true;
    classBlock?.classList.add('hidden');
  } else {
    teacherBlock?.classList.add('hidden');
    document.getElementById('loginTeacherPassword').required = false;
    classBlock?.classList.remove('hidden');
  }
}

async function handleUserLogin(e) {
  e.preventDefault();
  const name = document.getElementById('loginNameInput').value.trim();
  const role = document.getElementById('loginRoleSelect').value;
  const selectedClass = document.getElementById('loginStudentClass')?.value || '7 E';

  if (!name) return;

  if (role === 'teacher') {
    const password = document.getElementById('loginTeacherPassword').value.trim();
    if (!TEACHER_PASSWORDS.includes(password)) {
      showToast('Мұғалім құпиясөзі қате! Қайта көріңіз.', 'fa-solid fa-triangle-exclamation text-rose-500');
      return;
    }
  }

  let user = null;
  const { data: existingUser } = await sb
    .from('users')
    .select('*')
    .ilike('name', name)
    .maybeSingle();

  if (existingUser) {
    user = existingUser;
    // If student logged in, ensure class is assigned
    if (role === 'student') {
      const meta = parseUserMeta(user);
      if (!meta.class_name || meta.class_name !== selectedClass) {
        meta.class_name = selectedClass;
        const serialized = serializeUserMeta(meta);
        user.avatar_color = serialized;
        await sb.from('users').update({ avatar_color: serialized }).eq('id', user.id);
      }
    }
  } else {
    const colors = ['#0284c7', '#2563eb', '#10b981', '#f59e0b', '#8b5cf6'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newId = (role === 'teacher' ? 'teacher_' : 'stud_') + Math.random().toString(36).substring(2, 9);
    
    const metaPayload = role === 'student' ? serializeUserMeta({
      color: randomColor,
      class_name: selectedClass,
      overall_grade: '',
      overall_feedback: ''
    }) : randomColor;

    const { data: created, error } = await sb
      .from('users')
      .insert({
        id: newId,
        name: name,
        role: role,
        avatar_color: metaPayload
      })
      .select()
      .single();

    if (error) {
      console.error("Қолданушыны сақтау қатесі:", error);
      showToast('Қолданушыны сақтау қатесі: ' + error.message, 'fa-solid fa-triangle-exclamation text-rose-500');
      return;
    }
    user = created;
  }

  state.currentUser = user;
  localStorage.setItem('chemlab_user', JSON.stringify(user));

  closeLoginModal();
  applyUserSession();
  showToast(`Қош келдіңіз, ${user.name}!`, 'fa-solid fa-user-check text-sky-600');
}

function applyUserSession() {
  if (!state.currentUser) return;
  const user = state.currentUser;
  const meta = parseUserMeta(user);

  document.getElementById('userNameDisplay').textContent = user.name;
  document.getElementById('userRoleDisplay').textContent = user.role === 'teacher' ? 'Мұғалім' : `Оқушы (${meta.class_name})`;
  document.getElementById('userAvatarDot').textContent = user.name.charAt(0).toUpperCase();
  document.getElementById('userAvatarDot').style.backgroundColor = meta.color;

  const bannerRole = document.getElementById('bannerRoleLabel');
  if (bannerRole) bannerRole.textContent = user.role === 'teacher' ? 'Мұғалім:' : 'Оқушы:';

  const bannerClass = document.getElementById('bannerClassBadge');
  if (bannerClass) {
    if (user.role === 'student' && meta.class_name) {
      bannerClass.textContent = meta.class_name;
      bannerClass.classList.remove('hidden');
    } else {
      bannerClass.classList.add('hidden');
    }
  }

  const bannerName = document.getElementById('bannerStudentName');
  if (bannerName) bannerName.textContent = user.name;

  // Оқушының қорытынды бағасы мен пікірі (мұғалім қойған)
  const evalCard = document.getElementById('studentOverallEvaluationCard');
  const evalGradeBadge = document.getElementById('evalStudentGradeBadge');
  const evalFeedbackText = document.getElementById('evalStudentFeedbackText');
  if (evalCard) {
    if (user.role === 'student' && (meta.overall_grade || meta.overall_feedback)) {
      evalCard.classList.remove('hidden');
      if (evalGradeBadge) evalGradeBadge.textContent = meta.overall_grade || 'Тексерілді';
      if (evalFeedbackText) evalFeedbackText.textContent = meta.overall_feedback ? `«${meta.overall_feedback}»` : 'Мұғалім жұмысыңызды бағалады.';
    } else {
      evalCard.classList.add('hidden');
    }
  }

  if (user.role === 'teacher') {
    switchTab('teacher');
  } else {
    switchTab('tasks');
  }

  loadTasksAndSubmissions();
}

// Мұғалім панеліне кіруді құпиясөзбен қорғау
function handleTeacherTabClick() {
  if (state.currentUser && state.currentUser.role === 'teacher') {
    switchTab('teacher');
  } else {
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
    if (state.currentUser) {
      state.currentUser.role = 'teacher';
      localStorage.setItem('chemlab_user', JSON.stringify(state.currentUser));
      applyUserSession();
    }
    switchTab('teacher');
    showToast('Мұғалім мәртебесі сәтті расталды!', 'fa-solid fa-shield-halved text-sky-600');
  } else {
    if (err) err.classList.remove('hidden');
  }
}

// ======================== ҚОЙЫНДЫЛАРДЫ АУЫСТЫРУ ========================

function switchTab(tabId) {
  ['tasks', 'calc', 'lab', 'sorting', 'balance', 'teacher'].forEach(t => {
    const view = document.getElementById(`view-${t}`);
    const tabBtn = document.getElementById(`tab-${t}`);
    const mobBtn = document.getElementById(`mob-tab-${t}`);

    if (t === tabId) {
      view?.classList.remove('hidden');
      tabBtn?.classList.add('active');
      mobBtn?.classList.add('bg-white', 'dark:bg-slate-800', 'text-sky-600', 'dark:text-sky-400', 'shadow-sm');
      mobBtn?.classList.remove('text-slate-600', 'dark:text-slate-400');
    } else {
      view?.classList.add('hidden');
      tabBtn?.classList.remove('active');
      mobBtn?.classList.remove('bg-white', 'dark:bg-slate-800', 'text-sky-600', 'dark:text-sky-400', 'shadow-sm');
      mobBtn?.classList.add('text-slate-600', 'dark:text-slate-400');
    }
  });

  if (tabId === 'calc') initSim();
  if (tabId === 'lab') initVLab();
  if (tabId === 'sorting') renderSortingPool();
  if (tabId === 'teacher') renderTeacherDashboard();
}

// ======================== SUPABASE МӘЛІМЕТТЕРІН ЖҮКТЕУ ========================

async function loadTasksAndSubmissions() {
  if (!sb) return;

  const [tRes, uRes, sRes] = await Promise.all([
    sb.from('tasks').select('*').order('id', { ascending: true }),
    sb.from('users').select('*').order('role', { ascending: false }).order('name'),
    sb.from('submissions').select('*, tasks(title, category, formula_hint)').order('id', { ascending: false })
  ]);

  state.tasks = (tRes.data && tRes.data.length > 0) ? tRes.data : DEFAULT_TASKS;
  state.users = uRes.data || [];
  state.submissions = (sRes.data || []).map(s => ({
    ...s,
    task_title: s.tasks ? s.tasks.title : `Тапсырма #${s.task_id}`,
    task_category: s.tasks ? s.tasks.category : '',
    formula_hint: s.tasks ? s.tasks.formula_hint : ''
  }));

  if (!state.activeTaskId && state.tasks.length > 0) {
    state.activeTaskId = state.tasks[0].id;
  }

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
          showToast(`Оқушы <strong>${newSub.student_name}</strong> шешім жіберді!`, 'fa-solid fa-inbox text-amber-500');
        }
      } else if (state.currentUser && state.currentUser.id === newSub.student_id) {
        if (newSub.status === 'approved' || newSub.status === 'needs_revision') {
          playNotificationSound('success');
          const statusText = newSub.status === 'approved' ? 'қабылданды' : 'өңдеуге жіберілді';
          showToast(`Мұғалім шешімді тексерді (${statusText}, ұпай: ${newSub.score || '—'})!`, 'fa-solid fa-graduation-cap text-sky-600');
        }
      }
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, async (payload) => {
      showToast(`Жаңа тапсырма қосылды: "${payload.new.title}"`, 'fa-solid fa-bell text-sky-600');
      await loadTasksAndSubmissions();
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'users' }, async () => {
      const { data } = await sb.from('users').select('*');
      state.users = data || [];
      renderTeacherDashboard();
    })
    .subscribe();
}

// ======================== ОҚУШЫ ТАПСЫРМАЛАРЫ (§9) ========================

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
        badgeHtml = '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">Тексерілуде</span>';
      } else if (sub.status === 'approved') {
        badgeHtml = '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"><i class="fa-solid fa-check mr-1"></i>Дұрыс</span>';
      } else if (sub.status === 'needs_revision') {
        badgeHtml = '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400"><i class="fa-solid fa-rotate-left mr-1"></i>Өңдеуге</span>';
      }
    }

    const item = document.createElement('div');
    const isActive = state.activeTaskId === task.id;
    item.className = `p-3 rounded-2xl border cursor-pointer transition-all ${
      isActive 
        ? 'bg-sky-50 dark:bg-slate-900 border-sky-500 shadow-sm' 
        : 'bg-white dark:bg-slate-900/60 hover:bg-sky-50/50 border-sky-100 dark:border-slate-800'
    }`;
    item.innerHTML = `
      <div class="flex justify-between items-center mb-1">
        <span class="text-[10px] uppercase font-bold text-sky-600 dark:text-sky-400 font-mono">${task.category}</span>
        ${badgeHtml}
      </div>
      <div class="text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug">
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
      statusBadge.textContent = '✓ Дұрыс орындалды';

      feedbackCard.classList.remove('hidden');
      feedbackCard.className = 'p-4 rounded-2xl border bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200';
      document.getElementById('feedbackScorePill').className = 'text-xs font-bold px-2.5 py-0.5 rounded-lg bg-emerald-200 text-emerald-800 dark:bg-emerald-500/30 dark:text-emerald-200';
      document.getElementById('feedbackScorePill').textContent = '✓ Дұрыс';
      document.getElementById('feedbackTextDisplay').textContent = mySub.teacher_feedback || 'Жарайсың! Шешім қабылданды.';

      submitBtn.innerHTML = '<i class="fa-solid fa-rotate mr-1"></i> <span>Жаңартылған жауапты қайта жіберу</span>';
      hintMsg.textContent = 'Тапсырма мұғалім тарапынан «Дұрыс» деп қабылданды.';
    } else if (mySub.status === 'needs_revision') {
      statusBadge.className = 'text-xs font-bold px-3 py-1 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300';
      statusBadge.textContent = '↺ Өңдеуге жіберілді';

      feedbackCard.classList.remove('hidden');
      feedbackCard.className = 'p-4 rounded-2xl border bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200';
      document.getElementById('feedbackScorePill').className = 'text-xs font-bold px-2.5 py-0.5 rounded-lg bg-rose-200 text-rose-800 dark:bg-rose-500/30 dark:text-rose-200';
      document.getElementById('feedbackScorePill').textContent = 'Өңдеуге';
      document.getElementById('feedbackTextDisplay').textContent = mySub.teacher_feedback || 'Қателіктерді түзетіп, қайта жіберіңіз.';

      submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane mr-1"></i> <span>Түзетілген шешімді жіберу</span>';
      hintMsg.textContent = 'Мұғалім тапсырманы өңдеуге қайтарды.';
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
    showToast('Шешім мұғалімге сәтті жіберілді!', 'fa-solid fa-paper-plane text-sky-600');
    playNotificationSound('success');
    await loadTasksAndSubmissions();
  } else {
    console.error("Жауапты сақтау қатесі:", err);
    showToast('Жауапты сақтау барысында қате орын алды', 'fa-solid fa-triangle-exclamation text-rose-500');
  }
}

// ======================== ТӘЖІРИБЕ ЖӘНЕ ТАРАЗЫ СИМУЛЯЦИЯСЫ ========================

const simReactionsData = {
  CuS: {
    title: '1. Мыс + Күкірт → Мыс(II) сульфиді (Cu + S = CuS)',
    r1Name: 'Мыс (Cu)',
    r2Name: 'Күкірт (S)',
    r1Default: 6.4,
    r2Default: 3.2,
    ratioR1: 2,
    ratioR2: 1,
    prodName: 'Мыс(II) сульфиді',
    prodFormula: 'CuS',
    ratioText: 'm(Cu) : m(S) = 64 : 32 = 2 : 1'
  },
  MgO: {
    title: '2. Магний + Оттек → Магний оксиді (2Mg + O₂ = 2MgO)',
    r1Name: 'Магний (Mg)',
    r2Name: 'Оттек (O₂)',
    r1Default: 3.0,
    r2Default: 2.0,
    ratioR1: 3,
    ratioR2: 2,
    prodName: 'Магний оксиді',
    prodFormula: 'MgO',
    ratioText: 'm(Mg) : m(O) = 24 : 16 = 3 : 2'
  },
  H2O: {
    title: '3. Сутек + Оттек → Су синтезі (2H₂ + O₂ = 2H₂O)',
    r1Name: 'Сутек (H₂)',
    r2Name: 'Оттек (O₂)',
    r1Default: 2.0,
    r2Default: 16.0,
    ratioR1: 1,
    ratioR2: 8,
    prodName: 'Су',
    prodFormula: 'H₂O',
    ratioText: 'm(H) : m(O) = 2 : 16 = 1 : 8'
  },
  FeCl3: {
    title: '4. Темір + Хлор → Темір(III) хлориді (2Fe + 3Cl₂ = 2FeCl₃)',
    r1Name: 'Темір (Fe)',
    r2Name: 'Хлор (Cl₂)',
    r1Default: 11.2,
    r2Default: 21.3,
    ratioR1: 112,
    ratioR2: 213,
    prodName: 'Темір(III) хлориді',
    prodFormula: 'FeCl₃',
    ratioText: 'm(Fe) : m(Cl) = 112 : 213'
  },
  Al2S3: {
    title: '5. Алюминий + Күкірт → Алюминий сульфиді (2Al + 3S = Al₂S₃)',
    r1Name: 'Алюминий (Al)',
    r2Name: 'Күкірт (S)',
    r1Default: 5.4,
    r2Default: 9.6,
    ratioR1: 9,
    ratioR2: 16,
    prodName: 'Алюминий сульфиді',
    prodFormula: 'Al₂S₃',
    ratioText: 'm(Al) : m(S) = 54 : 96 = 9 : 16'
  }
};

let simSelectedReaction = 'CuS';

function initSim() {
  updateSimDisplay();
  runCustomCalc();
}

function changeSimReaction() {
  const sel = document.getElementById('simReactionSelect');
  if (!sel) return;
  simSelectedReaction = sel.value;
  const data = simReactionsData[simSelectedReaction];

  const titleEl = document.getElementById('currentReactionTitle');
  if (titleEl) titleEl.textContent = data.title;

  const r1Label = document.getElementById('sim-r1-label');
  const r2Label = document.getElementById('sim-r2-label');
  if (r1Label) r1Label.textContent = `1-реагент: ${data.r1Name}`;
  if (r2Label) r2Label.textContent = `2-реагент: ${data.r2Name}`;

  setSimPreset(simSelectedReaction, data.r1Default, data.r2Default);
}

function handleSimInputChange(which) {
  const inputEl = document.getElementById(`sim-${which}-input`);
  const sliderEl = document.getElementById(`sim-${which}-slider`);
  if (!inputEl || !sliderEl) return;

  let val = parseFloat(inputEl.value) || 0;
  if (val < 0) val = 0;
  sliderEl.value = Math.min(val, parseFloat(sliderEl.max));
  resetSimStatus();
  updateSimDisplay();
}

function handleSimSliderChange(which) {
  const inputEl = document.getElementById(`sim-${which}-input`);
  const sliderEl = document.getElementById(`sim-${which}-slider`);
  if (!inputEl || !sliderEl) return;

  const val = parseFloat(sliderEl.value) || 0;
  inputEl.value = val.toFixed(1);
  resetSimStatus();
  updateSimDisplay();
}

function resetSimStatus() {
  const dot = document.getElementById('simStatusDot');
  const txt = document.getElementById('simStatusText');
  const sub = document.getElementById('simScaleSub');
  if (dot) dot.className = 'w-3 h-3 rounded-full bg-amber-400 animate-pulse';
  if (txt) txt.textContent = 'ДАЙЫН: ҚЫЗДЫРУДЫ КҮТУДЕ';
  if (sub) sub.textContent = 'Бастапқы реакциялық қоспа';

  const resProd = document.getElementById('simResProduct');
  const resExcess = document.getElementById('simResExcess');
  if (resProd) resProd.textContent = '—';
  if (resExcess) resExcess.textContent = '—';
}

function updateSimDisplay() {
  const m1 = parseFloat(document.getElementById('sim-r1-input')?.value || '6.4');
  const m2 = parseFloat(document.getElementById('sim-r2-input')?.value || '3.2');
  const total = (m1 + m2).toFixed(2);

  const scaleVal = document.getElementById('simScaleVal');
  if (scaleVal) scaleVal.textContent = total;

  const data = simReactionsData[simSelectedReaction] || simReactionsData.CuS;

  const l1 = document.getElementById('simLayer1');
  const l2 = document.getElementById('simLayer2');
  if (l1) {
    l1.className = 'w-full bg-amber-600/80 flex items-center justify-center text-[10px] font-mono text-white font-bold transition-all duration-700';
    l1.textContent = `${data.r1Name} (${m1}г)`;
  }
  if (l2) {
    l2.className = 'w-full bg-yellow-400/90 flex items-center justify-center text-[10px] font-mono text-slate-900 font-bold transition-all duration-700';
    l2.textContent = `${data.r2Name} (${m2}г)`;
  }

  const consText = document.getElementById('simConservationText');
  const stepText = document.getElementById('simStepText');
  if (consText) consText.textContent = `m(бастапқы) = ${total} г = m(қоспа)`;
  if (stepText) stepText.textContent = `Стехиометриялық қатынас: ${data.ratioText}`;
}

function setSimPreset(reactionKey, m1, m2) {
  simSelectedReaction = reactionKey;
  const sel = document.getElementById('simReactionSelect');
  if (sel) sel.value = reactionKey;

  const data = simReactionsData[reactionKey];
  const titleEl = document.getElementById('currentReactionTitle');
  if (titleEl) titleEl.textContent = data.title;

  const r1Label = document.getElementById('sim-r1-label');
  const r2Label = document.getElementById('sim-r2-label');
  if (r1Label) r1Label.textContent = `1-реагент: ${data.r1Name}`;
  if (r2Label) r2Label.textContent = `2-реагент: ${data.r2Name}`;

  const in1 = document.getElementById('sim-r1-input');
  const sl1 = document.getElementById('sim-r1-slider');
  const in2 = document.getElementById('sim-r2-input');
  const sl2 = document.getElementById('sim-r2-slider');

  if (in1) in1.value = m1;
  if (sl1) sl1.value = Math.min(m1, parseFloat(sl1.max));
  if (in2) in2.value = m2;
  if (sl2) sl2.value = Math.min(m2, parseFloat(sl2.max));

  resetSimStatus();
  updateSimDisplay();
}

function runSimReaction() {
  const m1 = parseFloat(document.getElementById('sim-r1-input')?.value || '6.4');
  const m2 = parseFloat(document.getElementById('sim-r2-input')?.value || '3.2');
  if (m1 <= 0 || m2 <= 0) {
    alert('Реагенттер массасын оң сан ретінде енгізіңіз!');
    return;
  }

  const flame = document.getElementById('simFlameContainer');
  const dot = document.getElementById('simStatusDot');
  const txt = document.getElementById('simStatusText');
  const btn = document.getElementById('simBtnReact');

  if (flame) flame.classList.remove('hidden');
  if (dot) dot.className = 'w-3 h-3 rounded-full bg-orange-500 animate-ping';
  if (txt) txt.textContent = 'РЕАКЦИЯ ЖҮРУДЕ (ҚЫЗДЫРУ)...';
  if (btn) btn.disabled = true;

  playNotificationSound('success');

  setTimeout(() => {
    if (flame) flame.classList.add('hidden');
    if (dot) dot.className = 'w-3 h-3 rounded-full bg-emerald-500';
    if (txt) txt.textContent = 'РЕАКЦИЯ АЯҚТАЛДЫ';
    if (btn) btn.disabled = false;

    calculateSimResults(m1, m2);
    showToast('Реакция сәтті аяқталды! Өнімдер мен қалдық массасын қараңыз.', 'fa-solid fa-flask-vial text-sky-600');
  }, 1200);
}

function calculateSimResults(m1, m2) {
  const data = simReactionsData[simSelectedReaction] || simReactionsData.CuS;
  const ratioR1 = data.ratioR1;
  const ratioR2 = data.ratioR2;

  const neededR2 = (m1 * ratioR2) / ratioR1;
  let productMass = 0;
  let excessMass = 0;
  let excessSubstance = '';

  if (m2 >= neededR2) {
    const usedR2 = neededR2;
    productMass = m1 + usedR2;
    excessMass = m2 - usedR2;
    excessSubstance = `${data.r2Name} (Артық)`;
  } else {
    const neededR1 = (m2 * ratioR1) / ratioR2;
    const usedR1 = neededR1;
    productMass = m2 + usedR1;
    excessMass = m1 - usedR1;
    excessSubstance = `${data.r1Name} (Артық)`;
  }

  const resProd = document.getElementById('simResProduct');
  const resExcess = document.getElementById('simResExcess');
  const subText = document.getElementById('simScaleSub');
  const consText = document.getElementById('simConservationText');
  const stepText = document.getElementById('simStepText');

  if (resProd) resProd.textContent = `${data.prodName} (${productMass.toFixed(2)} г)`;
  if (resExcess) {
    resExcess.textContent = excessMass > 0.005 ? `${excessSubstance}: ${excessMass.toFixed(2)} г` : 'Жоқ (толық реакция)';
  }
  if (subText) subText.textContent = `Түзілген өнім мен қалдық массасы: ${(productMass + excessMass).toFixed(2)} г`;

  const total = (m1 + m2).toFixed(2);
  if (consText) consText.textContent = `m(бастапқы) = ${total}г = m(өнім ${productMass.toFixed(2)}г + қалдық ${excessMass.toFixed(2)}г) = ${total}г`;
  if (stepText) stepText.textContent = `Стехиометриялық есеп: ${data.ratioText}. Түзілген ${data.prodFormula}: ${productMass.toFixed(2)}г.`;

  const l1 = document.getElementById('simLayer1');
  const l2 = document.getElementById('simLayer2');
  if (l1) {
    l1.className = 'w-full bg-sky-700 flex items-center justify-center text-[10px] font-mono text-white font-bold transition-all duration-700';
    l1.textContent = `${data.prodFormula} өнімі (${productMass.toFixed(2)}г)`;
  }
  if (l2) {
    l2.className = 'w-full bg-slate-700/80 flex items-center justify-center text-[10px] font-mono text-slate-300 font-bold transition-all duration-700';
    l2.textContent = excessMass > 0.005 ? `Артық: ${excessMass.toFixed(2)}г` : 'Толық әрекеттесті';
  }
}

function resetSim() {
  const data = simReactionsData[simSelectedReaction] || simReactionsData.CuS;
  setSimPreset(simSelectedReaction, data.r1Default, data.r2Default);
}

function runCustomCalc() {
  const m1 = parseFloat(document.getElementById('calcM1')?.value) || 0;
  const m2 = parseFloat(document.getElementById('calcM2')?.value) || 0;
  const res = document.getElementById('calcRatioRes');
  if (!res) return;

  if (m1 <= 0 || m2 <= 0) {
    res.textContent = '—';
    return;
  }

  const gcd = (a, b) => b < 0.01 ? a : gcd(b, a % b);
  let g = gcd(m1, m2);
  let r1 = (m1 / g).toFixed(1).replace('.0', '');
  let r2 = (m2 / g).toFixed(1).replace('.0', '');

  res.textContent = `${r1} : ${r2}`;
}

// ======================== ВИРТУАЛДЫ ЗЕРТХАНА (Himiya_virtual_lab) ========================

const vlabData = [
  {
    type: 'Қосылу',
    title: '1-тәжірибе. Қосылу реакциясы: 2Mg + O₂ → 2MgO',
    goal: 'Екі немесе бірнеше бастапқы заттан бір ғана жаңа зат түзілуін бақыла.',
    materials: ['Mg (Магний)', 'O₂ (Оттек)'],
    eq: '2Mg + O₂ → 2MgO',
    start: '2', prod: '1',
    comp: 'Жай + жай → күрделі',
    obs: 'Жарқыраған ақ жалынмен жанып, ақ магний оксиді түзіледі.',
    hasFlame: true,
    liquidColor: 'rgba(56, 189, 248, 0.35)'
  },
  {
    type: 'Айырылу',
    title: '2-тәжірибе. Айырылу реакциясы: CaCO₃ → CaO + CO₂↑',
    goal: 'Бір күрделі заттың бірнеше жаңа затқа айналуын бақыла.',
    materials: ['CaCO₃ (Әктас)', 'Қыздыру'],
    eq: 'CaCO₃ → CaO + CO₂↑',
    start: '1', prod: '2',
    comp: 'Күрделі → күрделі + күрделі',
    obs: 'Қыздырғанда бастапқы заттан көмірқышқыл газы бөлінеді.',
    hasFlame: true,
    liquidColor: 'rgba(234, 179, 8, 0.3)'
  },
  {
    type: 'Орынбасу',
    title: '3-тәжірибе. Орынбасу реакциясы: Zn + 2HCl → ZnCl₂ + H₂↑',
    goal: 'Жай заттың күрделі зат құрамындағы элементті алмастыруын бақыла.',
    materials: ['Zn (Мырыш)', 'HCl (Тұз қышқылы)'],
    eq: 'Zn + 2HCl → ZnCl₂ + H₂↑',
    start: '2', prod: '2',
    comp: 'Жай + күрделі → күрделі + жай',
    obs: 'Газ көпіршіктері белсенді бөлінеді, сутек газы шығады.',
    hasFlame: false,
    liquidColor: 'rgba(16, 185, 129, 0.35)'
  },
  {
    type: 'Алмасу',
    title: '4-тәжірибе. Алмасу реакциясы: CuO + 2HCl → CuCl₂ + H₂O',
    goal: 'Екі күрделі зат құрам бөліктерінің орын алмасуын бақыла.',
    materials: ['CuO (Мыс(II) оксиді)', 'HCl (Қышқыл)'],
    eq: 'CuO + 2HCl → CuCl₂ + H₂O',
    start: '2', prod: '2',
    comp: 'Күрделі + күрделі → күрделі + күрделі',
    obs: 'Қара CuO еріп, көгілдір-жасыл CuCl₂ ерітіндісі түзіледі.',
    hasFlame: false,
    liquidColor: 'rgba(6, 182, 212, 0.45)'
  }
];

function initVLab() {
  const tabsContainer = document.getElementById('vlabTabs');
  if (!tabsContainer) return;
  tabsContainer.innerHTML = '';

  vlabData.forEach((d, i) => {
    const btn = document.createElement('button');
    btn.className = `py-2.5 px-3 rounded-xl font-bold text-xs shadow-sm border transition flex items-center justify-center gap-1.5 ${
      state.vlabCurrent === i 
        ? 'bg-blue-600 text-white border-blue-600' 
        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-sky-100 dark:border-slate-700 hover:bg-sky-50'
    }`;
    btn.innerHTML = `<span>${i + 1}. ${d.type}</span> ${state.vlabDone.has(i) ? '<i class="fa-solid fa-check text-emerald-400"></i>' : ''}`;
    btn.onclick = () => selectVLab(i);
    tabsContainer.appendChild(btn);
  });

  selectVLab(state.vlabCurrent);
  updateVLabSheet();
}

function selectVLab(index) {
  state.vlabCurrent = index;
  resetVLab();

  // Жаңарту
  const tabsContainer = document.getElementById('vlabTabs');
  if (tabsContainer) {
    const btns = tabsContainer.querySelectorAll('button');
    btns.forEach((b, i) => {
      if (i === index) {
        b.className = 'py-2.5 px-3 rounded-xl font-bold text-xs shadow-sm border bg-blue-600 text-white border-blue-600 transition flex items-center justify-center gap-1.5';
      } else {
        b.className = 'py-2.5 px-3 rounded-xl font-bold text-xs shadow-sm border bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-sky-100 dark:border-slate-700 hover:bg-sky-50 transition flex items-center justify-center gap-1.5';
      }
    });
  }

  const d = vlabData[index];
  document.getElementById('vlabTitle').textContent = d.title;
  document.getElementById('vlabGoal').textContent = 'Мақсат: ' + d.goal;
  document.getElementById('vlabMaterials').innerHTML = d.materials.map(x => `<span class="mat-pill">${x}</span>`).join('');
  document.getElementById('vlabEquation').textContent = d.eq;
  document.getElementById('vlabLiquid').style.background = d.liquidColor;

  document.getElementById('vlabStartCount').textContent = 'Тәжірибе іске қосылғаннан кейін анықталады';
  document.getElementById('vlabProductCount').textContent = '—';
  document.getElementById('vlabComposition').textContent = '—';
  document.getElementById('vlabObservation').textContent = '—';
  document.getElementById('vlabResult').textContent = '';
  document.getElementById('vlabAnswers').innerHTML = '';
}

function runVLabReaction() {
  const d = vlabData[state.vlabCurrent];
  const box = document.getElementById('vlabBox');
  const flame = document.getElementById('vlabFlame');
  const visualText = document.getElementById('vlabVisualText');
  const runBtn = document.getElementById('vlabRunBtn');

  box.classList.add('reaction-running');
  if (d.hasFlame) {
    box.classList.add('has-flame');
    flame.style.display = 'block';
  } else {
    box.classList.remove('has-flame');
    flame.style.display = 'none';
  }

  visualText.textContent = 'Реакция жүріп жатыр...';
  runBtn.disabled = true;

  setTimeout(() => {
    box.classList.remove('reaction-running', 'has-flame');
    flame.style.display = 'none';
    visualText.textContent = 'Бақылау аяқталды. Төмендегі зерттеу сұрағына жауап беріңіз:';
    runBtn.disabled = false;

    document.getElementById('vlabStartCount').textContent = d.start;
    document.getElementById('vlabProductCount').textContent = d.prod;
    document.getElementById('vlabComposition').textContent = d.comp;
    document.getElementById('vlabObservation').textContent = d.obs;

    showVLabAnswers();
  }, 1300);
}

function showVLabAnswers() {
  const box = document.getElementById('vlabAnswers');
  box.innerHTML = '';
  vlabData.forEach(d => {
    const b = document.createElement('button');
    b.className = 'ans-btn';
    b.textContent = d.type + ' реакциясы';
    b.onclick = () => checkVLabAnswer(d.type);
    box.appendChild(b);
  });
}

function checkVLabAnswer(chosenType) {
  const d = vlabData[state.vlabCurrent];
  const r = document.getElementById('vlabResult');

  if (chosenType === d.type) {
    r.textContent = `Дұрыс! Бұл — ${d.type} реакциясы.`;
    r.className = 'font-bold text-xs text-emerald-600 dark:text-emerald-400 mt-2';
    if (!state.vlabDone.has(state.vlabCurrent)) {
      state.vlabDone.add(state.vlabCurrent);
      updateVLabSheet();
      updateVLabProgress();
      initVLab(); // Түймелерді жаңарту
    }
  } else {
    r.textContent = 'Қате. Бастапқы және түзілген заттардың саны мен құрамын қайта салыстырыңыз.';
    r.className = 'font-bold text-xs text-rose-600 dark:text-rose-400 mt-2';
  }
}

function updateVLabSheet() {
  const body = document.getElementById('vlabSheetBody');
  if (!body) return;
  body.innerHTML = vlabData.map((d, i) => `
    <tr>
      <td>${i + 1}</td>
      <td class="font-mono font-bold">${d.eq}</td>
      <td>${state.vlabDone.has(i) ? d.start : '—'}</td>
      <td>${state.vlabDone.has(i) ? d.prod : '—'}</td>
      <td class="font-bold ${state.vlabDone.has(i) ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}">
        ${state.vlabDone.has(i) ? d.type : '—'}
      </td>
    </tr>
  `).join('');
}

function updateVLabProgress() {
  const count = state.vlabDone.size;
  const bar = document.getElementById('vlabProgressBar');
  const txt = document.getElementById('vlabStatusText');
  if (bar) bar.style.width = (count * 25) + '%';
  if (txt) txt.textContent = `${count}/4 тәжірибе орындалды`;
}

function resetVLab() {
  const box = document.getElementById('vlabBox');
  const flame = document.getElementById('vlabFlame');
  const visualText = document.getElementById('vlabVisualText');
  const runBtn = document.getElementById('vlabRunBtn');

  if (box) box.classList.remove('reaction-running', 'has-flame');
  if (flame) flame.style.display = 'none';
  if (visualText) visualText.textContent = 'Тәжірибені бастау үшін батырманы басыңыз';
  if (runBtn) runBtn.disabled = false;
}

// ======================== ТИПТЕРДІ СҰРЫПТАУ ========================

const sortingEquations = [
  { id: 'eq1', text: '2Ca + O₂ = 2CaO', type: 'combination' },
  { id: 'eq2', text: '2KClO₃ = 2KCl + 3O₂↑', type: 'decomposition' },
  { id: 'eq3', text: '2Al + Fe₂O₃ = Al₂O₃ + 2Fe', type: 'replacement' },
  { id: 'eq4', text: '2HCl + Na₂S = 2NaCl + H₂S↑', type: 'exchange' },
  { id: 'eq5', text: 'CaO + H₂O = Ca(OH)₂', type: 'combination' },
  { id: 'eq6', text: 'CuO + 2HCl = CuCl₂ + H₂O', type: 'exchange' }
];

let currentSortingPool = [...sortingEquations];
let sortingBuckets = { combination: [], decomposition: [], replacement: [], exchange: [] };

function renderSortingPool() {
  const poolEl = document.getElementById('equationPool');
  if (!poolEl) return;
  poolEl.innerHTML = '';

  if (currentSortingPool.length === 0) {
    poolEl.innerHTML = `<div class="col-span-full text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl gap-2"><i class="fa-solid fa-circle-check text-base"></i> Барлық 6 теңдеу дұрыс сұрыпталды! Өте жақсы!</div>`;
    return;
  }

  currentSortingPool.forEach(eq => {
    const card = document.createElement('div');
    card.className = "p-3 bg-white dark:bg-slate-800 border border-sky-100 dark:border-slate-700 rounded-xl flex flex-col justify-between space-y-2.5 shadow-sm";
    card.innerHTML = `
      <div class="font-mono text-center text-xs font-extrabold text-slate-800 dark:text-slate-100 py-1.5 bg-sky-50/50 dark:bg-slate-900 rounded-lg">
        ${eq.text}
      </div>
      <div id="sort-err-${eq.id}" class="hidden text-[10px] text-center font-bold text-rose-600"></div>
      <div class="grid grid-cols-2 gap-1.5 text-[11px]">
        <button onclick="selectEquationCategory('${eq.id}', 'combination')" class="py-1 px-2 rounded-lg bg-sky-50 hover:bg-sky-600 hover:text-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 font-bold transition">Қосылу</button>
        <button onclick="selectEquationCategory('${eq.id}', 'decomposition')" class="py-1 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-600 hover:text-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 font-bold transition">Айырылу</button>
        <button onclick="selectEquationCategory('${eq.id}', 'replacement')" class="py-1 px-2 rounded-lg bg-amber-50 hover:bg-amber-600 hover:text-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 font-bold transition">Орынбасу</button>
        <button onclick="selectEquationCategory('${eq.id}', 'exchange')" class="py-1 px-2 rounded-lg bg-purple-50 hover:bg-purple-600 hover:text-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 font-bold transition">Алмасу</button>
      </div>
    `;
    poolEl.appendChild(card);
  });

  renderSortingBuckets();
}

function selectEquationCategory(eqId, chosenType) {
  const eq = currentSortingPool.find(i => i.id === eqId);
  if (!eq) return;

  const errEl = document.getElementById(`sort-err-${eqId}`);

  if (chosenType === eq.type) {
    sortingBuckets[chosenType].push(eq);
    currentSortingPool = currentSortingPool.filter(i => i.id !== eqId);
    state.sortingScore++;
    document.getElementById('sortScore').innerText = state.sortingScore;
    renderSortingPool();
  } else {
    if (errEl) {
      errEl.innerText = "Қате! Басқа типін таңдаңыз.";
      errEl.classList.remove('hidden');
      setTimeout(() => errEl.classList.add('hidden'), 2000);
    }
  }
}

function renderSortingBuckets() {
  ['combination', 'decomposition', 'replacement', 'exchange'].forEach(key => {
    const el = document.getElementById(`bucket-${key}`);
    if (!el) return;
    el.innerHTML = '';
    sortingBuckets[key].forEach(eq => {
      const item = document.createElement('div');
      item.className = "p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-mono flex items-center justify-between";
      item.innerHTML = `<span>${eq.text}</span> <i class="fa-solid fa-check text-emerald-500"></i>`;
      el.appendChild(item);
    });
  });
}

function resetSortingGame() {
  currentSortingPool = [...sortingEquations];
  sortingBuckets = { combination: [], decomposition: [], replacement: [], exchange: [] };
  state.sortingScore = 0;
  document.getElementById('sortScore').innerText = 0;
  renderSortingPool();
}

// ======================== ТЕҢЕСТІРУ КОНСТРУКТОРЫ ========================

function setupBalancingListeners() {
  ['coeff-a', 'coeff-b', 'coeff-c', 'coeff-d'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', calculateLiveAtoms);
      el.addEventListener('change', calculateLiveAtoms);
    }
  });
}

function calculateLiveAtoms() {
  const a = parseInt(document.getElementById('coeff-a')?.value || '1', 10);
  const b = parseInt(document.getElementById('coeff-b')?.value || '1', 10);
  const c = parseInt(document.getElementById('coeff-c')?.value || '1', 10);
  const d = parseInt(document.getElementById('coeff-d')?.value || '1', 10);

  const left = { fe: a * 1, cl: a * 3, na: b * 1, o: b * 1, h: b * 1 };
  const right = { fe: d * 1, cl: c * 1, na: c * 1, o: d * 3, h: d * 3 };

  const update = (id, val, isMatch) => {
    const el = document.getElementById(id);
    if (el) {
      el.innerText = val;
      el.className = `font-mono font-bold ${isMatch ? 'text-emerald-600' : 'text-amber-600'}`;
    }
  };

  const feMatch = left.fe === right.fe;
  const clMatch = left.cl === right.cl;
  const naMatch = left.na === right.na;
  const oMatch = left.o === right.o;
  const hMatch = left.h === right.h;

  update('left-fe', left.fe, feMatch); update('right-fe', right.fe, feMatch);
  update('left-cl', left.cl, clMatch); update('right-cl', right.cl, clMatch);
  update('left-na', left.na, naMatch); update('right-na', right.na, naMatch);
  update('left-o', left.o, oMatch);   update('right-o', right.o, oMatch);
  update('left-h', left.h, hMatch);   update('right-h', right.h, hMatch);

  return feMatch && clMatch && naMatch && oMatch && hMatch;
}

function checkBalancingTask() {
  const isBalanced = calculateLiveAtoms();
  const selectedType = document.getElementById('user-rxn-type').value;
  const selectedSum = document.getElementById('user-coeff-sum').value;
  const feedbackEl = document.getElementById('balancing-feedback');

  if (isBalanced && selectedType === 'exchange' && selectedSum === '8') {
    state.balancingDone = true;
    feedbackEl.innerHTML = `
      <div class="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-700 rounded-xl space-y-2 text-xs">
        <div class="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
          <i class="fa-solid fa-circle-check text-base"></i> Дұрыс! Тапсырма толығымен орындалды!
        </div>
        <p class="text-slate-700 dark:text-slate-300 leading-relaxed">
          <b>Теңдеу:</b> 1FeCl₃ + 3NaOH → 3NaCl + 1Fe(OH)₃↓<br>
          <b>Коэффициенттер қосындысы:</b> 1 + 3 + 3 + 1 = 8 (B нұсқасы).<br>
          <b>Реакция типі:</b> Екі күрделі заттың құрамбөліктері орын алмастырғандықтан — <b>Алмасу реакциясы</b>.
        </p>
      </div>
    `;
    showToast('Теңестіру тапсырмасы дұрыс орындалды!', 'fa-solid fa-circle-check text-emerald-500');
  } else {
    state.balancingDone = false;
    let hints = [];
    if (!isBalanced) hints.push("Атомдар саны әлі тең емес. 1FeCl₃ + 3NaOH → 3NaCl + 1Fe(OH)₃ теңестіруін тексеріңіз.");
    if (selectedType !== 'exchange') hints.push("Реакция типі қате таңдалды (екі зат та күрделі зат).");
    if (selectedSum !== '8') hints.push("Коэффициенттер қосындысын қайта санаңыз: 1 + 3 + 3 + 1 = 8.");

    feedbackEl.innerHTML = `
      <div class="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-700 rounded-xl space-y-2 text-xs">
        <div class="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
          <i class="fa-solid fa-triangle-exclamation"></i> Тексеруде қате бар:
        </div>
        <ul class="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-1">
          ${hints.map(h => `<li>${h}</li>`).join('')}
        </ul>
      </div>
    `;
  }
}

// ======================== МҰҒАЛІМ ПАНЕЛІ ========================

function renderTeacherDashboard() {
  const allStudents = state.users.filter(u => u.role === 'student');
  const selectedClass = state.teacherSelectedClass || 'all';

  // Сынып бойынша оқушыларды сүзу
  const filteredStudents = selectedClass === 'all'
    ? allStudents
    : allStudents.filter(st => parseUserMeta(st).class_name === selectedClass);

  const tasks = state.tasks;
  const studentIds = new Set(filteredStudents.map(s => s.id));
  const classSubmissions = state.submissions.filter(s => studentIds.has(s.student_id));

  const pendingCount = classSubmissions.filter(s => s.status === 'submitted').length;
  const approvedCount = classSubmissions.filter(s => s.status === 'approved').length;

  const sTot = document.getElementById('statTotalStudents');
  if (sTot) {
    sTot.textContent = selectedClass === 'all' ? allStudents.length : `${filteredStudents.length} (${selectedClass})`;
  }
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

  // Сынып сүзгісі мен батырмаларын жаңарту
  renderTeacherClassFilters(allStudents, selectedClass);

  // Мониторинг кестесі мен кезек тізімін сынып бойынша шығару
  renderTeacherMatrix(filteredStudents, tasks);
  renderTeacherSubmissionsQueue(filteredStudents);
}

function renderTeacherClassFilters(allStudents, selectedClass) {
  const sel = document.getElementById('teacherClassSelect');
  if (sel && sel.value !== selectedClass) {
    sel.value = selectedClass;
  }

  const badge = document.getElementById('teacherClassCountBadge');
  if (badge) {
    const count = selectedClass === 'all' 
      ? allStudents.length 
      : allStudents.filter(st => parseUserMeta(st).class_name === selectedClass).length;
    badge.innerHTML = `Көрсетілуде: <span class="font-bold text-sky-600 dark:text-sky-400 font-mono">${count}</span> оқушы`;
  }

  const pillsContainer = document.getElementById('teacherClassPills');
  if (!pillsContainer) return;
  pillsContainer.innerHTML = '';

  const pillClasses = ['all', ...AVAILABLE_CLASSES];
  pillClasses.forEach(cls => {
    const isAct = cls === selectedClass;
    const count = cls === 'all' 
      ? allStudents.length 
      : allStudents.filter(st => parseUserMeta(st).class_name === cls).length;

    if (cls !== 'all' && count === 0 && !isAct) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = isAct
      ? 'px-2.5 py-1 rounded-xl bg-sky-600 text-white font-extrabold shadow-sm transition'
      : 'px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-700 border border-sky-100 dark:border-slate-700 transition';
    btn.textContent = cls === 'all' ? `Барлығы (${count})` : `${cls} (${count})`;
    btn.onclick = () => changeTeacherClassFilter(cls);
    pillsContainer.appendChild(btn);
  });
}

function changeTeacherClassFilter(className) {
  state.teacherSelectedClass = className;
  renderTeacherDashboard();
}

function renderTeacherMatrix(students, tasks) {
  const header = document.getElementById('teacherMatrixHeader');
  const body = document.getElementById('teacherMatrixBody');
  if (!header || !body) return;

  header.innerHTML = '<th class="py-3 px-4 min-w-[160px]">Оқушы (Сынып)</th>';
  tasks.forEach(t => {
    const th = document.createElement('th');
    th.className = 'py-3 px-2 text-center min-w-[100px]';
    th.textContent = t.title.length > 18 ? t.title.slice(0, 16) + '...' : t.title;
    th.title = t.title;
    header.appendChild(th);
  });

  const thGrade = document.createElement('th');
  thGrade.className = 'py-3 px-3 text-center min-w-[120px] text-sky-700 dark:text-sky-300';
  thGrade.innerHTML = '<i class="fa-solid fa-star text-amber-400 mr-1"></i> Қорытынды баға';
  header.appendChild(thGrade);

  const thFeedback = document.createElement('th');
  thFeedback.className = 'py-3 px-3 text-left min-w-[210px] text-sky-700 dark:text-sky-300';
  thFeedback.innerHTML = '<i class="fa-solid fa-comment-dots text-sky-500 mr-1"></i> Мұғалімнің кері байланысы';
  header.appendChild(thFeedback);

  const thAction = document.createElement('th');
  thAction.className = 'py-3 px-2 text-center w-10';
  header.appendChild(thAction);

  body.innerHTML = '';
  if (students.length === 0) {
    const trEmpty = document.createElement('tr');
    trEmpty.innerHTML = `
      <td colspan="${tasks.length + 4}" class="py-8 text-center text-slate-400 text-xs">
        <i class="fa-solid fa-users-slash text-2xl text-slate-300 dark:text-slate-600 mb-2 block"></i>
        ${state.teacherSelectedClass && state.teacherSelectedClass !== 'all' ? `«${state.teacherSelectedClass}» сыныбында әзірге тіркелген оқушылар жоқ.` : 'Оқушылар тізімі бос.'}
      </td>
    `;
    body.appendChild(trEmpty);
    return;
  }

  const subMap = {};
  state.submissions.forEach(s => subMap[`${s.student_id}_${s.task_id}`] = s);

  students.forEach(st => {
    const meta = parseUserMeta(st);
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-sky-50/40 dark:hover:bg-slate-800/40 transition border-b border-sky-50 dark:border-slate-800/50';

    const tdUser = document.createElement('td');
    tdUser.className = 'py-3 px-4 font-bold text-slate-800 dark:text-slate-200';
    tdUser.innerHTML = `
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-[11px] font-bold shadow-sm" style="background-color: ${meta.color}">
          ${st.name.charAt(0).toUpperCase()}
        </div>
        <div class="min-w-0">
          <div class="truncate text-xs font-bold leading-tight">${escapeHtml(st.name)}</div>
          <span class="inline-block text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 font-mono">${meta.class_name || '—'}</span>
        </div>
      </div>
    `;
    tr.appendChild(tdUser);

    tasks.forEach(t => {
      const td = document.createElement('td');
      td.className = 'py-3 px-2 text-center';
      const sub = subMap[`${st.id}_${t.id}`];

      if (!sub) {
        td.innerHTML = '<span class="inline-block text-slate-300 dark:text-slate-600 font-bold">—</span>';
      } else if (sub.status === 'submitted') {
        const btn = document.createElement('button');
        btn.className = 'px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 animate-pulse';
        btn.textContent = 'Тексеру';
        btn.onclick = () => openReviewModal(sub.id);
        td.appendChild(btn);
      } else if (sub.status === 'approved') {
        const btn = document.createElement('button');
        btn.className = 'px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 inline-flex items-center gap-1';
        btn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Дұрыс</span>';
        btn.title = 'Қайта қарау';
        btn.onclick = () => openReviewModal(sub.id);
        td.appendChild(btn);
      } else if (sub.status === 'needs_revision') {
        const btn = document.createElement('button');
        btn.className = 'px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-300 inline-flex items-center gap-1';
        btn.innerHTML = '<i class="fa-solid fa-rotate-left"></i> <span>Өңдеуге</span>';
        btn.title = 'Қайта қарау';
        btn.onclick = () => openReviewModal(sub.id);
        td.appendChild(btn);
      }

      tr.appendChild(td);
    });

    // Қорытынды баға
    const tdGrade = document.createElement('td');
    tdGrade.className = 'py-3 px-2 text-center';
    tdGrade.innerHTML = `
      <select onchange="updateStudentGradeDirect('${st.id}', this.value)" class="bg-white dark:bg-slate-900 border border-sky-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-sky-800 dark:text-sky-200 focus:ring-1 focus:ring-sky-500 cursor-pointer shadow-sm">
        <option value="" ${!meta.overall_grade ? 'selected' : ''}>—</option>
        <option value="5" ${meta.overall_grade === '5' ? 'selected' : ''}>5 (Өте жақсы)</option>
        <option value="4" ${meta.overall_grade === '4' ? 'selected' : ''}>4 (Жақсы)</option>
        <option value="3" ${meta.overall_grade === '3' ? 'selected' : ''}>3 (Қанағат)</option>
        <option value="2" ${meta.overall_grade === '2' ? 'selected' : ''}>2 (Нашар)</option>
      </select>
    `;
    tr.appendChild(tdGrade);

    // Мұғалімнің кері байланысы
    const tdFeedback = document.createElement('td');
    tdFeedback.className = 'py-3 px-2';
    tdFeedback.innerHTML = `
      <div class="flex items-center gap-1">
        <input type="text" id="feedbackInput_${st.id}" value="${escapeHtml(meta.overall_feedback)}" placeholder="Оқушыға пікір..." onchange="updateStudentFeedbackDirect('${st.id}', this.value)" class="w-full bg-white dark:bg-slate-900 border border-sky-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-sky-500">
        <button onclick="saveStudentGradeAndFeedback('${st.id}')" title="Сақтау" class="p-1.5 text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg transition text-xs font-bold">
          <i class="fa-solid fa-floppy-disk"></i>
        </button>
      </div>
    `;
    tr.appendChild(tdFeedback);

    // Өшіру
    const tdAction = document.createElement('td');
    tdAction.className = 'py-3 px-2 text-center';
    tdAction.innerHTML = `
      <button onclick="deleteStudent('${st.id}', '${escapeHtml(st.name)}')" title="Оқушыны өшіру" class="opacity-40 hover:opacity-100 hover:text-rose-600 transition p-1 text-xs">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    `;
    tr.appendChild(tdAction);

    body.appendChild(tr);
  });
}

async function updateStudentGradeDirect(studentId, grade) {
  const student = state.users.find(u => u.id === studentId);
  if (!student) return;
  const meta = parseUserMeta(student);
  meta.overall_grade = grade;
  const newAvatarColor = serializeUserMeta(meta);
  student.avatar_color = newAvatarColor;

  const { error } = await sb
    .from('users')
    .update({ avatar_color: newAvatarColor })
    .eq('id', studentId);

  if (!error) {
    showToast(`«${student.name}» қорытынды бағасы қойылды: ${grade || '—'}`, 'fa-solid fa-star text-amber-500');
  }
}

async function updateStudentFeedbackDirect(studentId, feedback) {
  const student = state.users.find(u => u.id === studentId);
  if (!student) return;
  const meta = parseUserMeta(student);
  meta.overall_feedback = feedback;
  const newAvatarColor = serializeUserMeta(meta);
  student.avatar_color = newAvatarColor;

  const { error } = await sb
    .from('users')
    .update({ avatar_color: newAvatarColor })
    .eq('id', studentId);

  if (!error) {
    showToast(`«${student.name}» үшін кері байланыс сақталды!`, 'fa-solid fa-comment-dots text-sky-600');
  }
}

async function saveStudentGradeAndFeedback(studentId) {
  const student = state.users.find(u => u.id === studentId);
  if (!student) return;
  const meta = parseUserMeta(student);

  const gradeSelect = document.querySelector(`select[onchange*="${studentId}"]`);
  const feedbackInput = document.getElementById(`feedbackInput_${studentId}`);
  if (gradeSelect) meta.overall_grade = gradeSelect.value;
  if (feedbackInput) meta.overall_feedback = feedbackInput.value.trim();

  const newAvatarColor = serializeUserMeta(meta);
  student.avatar_color = newAvatarColor;

  const { error } = await sb
    .from('users')
    .update({ avatar_color: newAvatarColor })
    .eq('id', studentId);

  if (!error) {
    showToast(`«${student.name}» бағасы мен пікірі сәтті сақталды!`, 'fa-solid fa-circle-check text-emerald-500');
  } else {
    console.error("Бағаны сақтау қатесі:", error);
    showToast('Бағаны сақтау қатесі: ' + error.message, 'fa-solid fa-triangle-exclamation text-rose-500');
  }
}

async function deleteStudent(studentId, studentName) {
  if (!confirm(`«${studentName}» оқушысын және оның барлық жауаптарын тізімнен өшіруді растайсыз ба?`)) {
    return;
  }
  try {
    const { error: subErr } = await sb
      .from('submissions')
      .delete()
      .eq('student_id', studentId);

    if (subErr) {
      console.warn("Жауаптарды тазарту ескертпесі:", subErr);
    }

    const { error: userErr } = await sb
      .from('users')
      .delete()
      .eq('id', studentId);

    if (userErr) {
      showToast('Оқушыны өшіру барысында қате шықты: ' + userErr.message, 'fa-solid fa-triangle-exclamation text-rose-500');
      return;
    }

    showToast(`«${studentName}» оқушысы тізімнен өшірілді!`, 'fa-solid fa-trash-can text-sky-600');
    await loadTasksAndSubmissions();
  } catch (e) {
    console.error("deleteStudent error:", e);
    showToast('Өшіру кезінде қате орын алды', 'fa-solid fa-triangle-exclamation text-rose-500');
  }
}

function renderTeacherSubmissionsQueue(filteredStudents) {
  const container = document.getElementById('teacherSubmissionsList');
  if (!container) return;
  container.innerHTML = '';

  const studentIds = new Set((filteredStudents || state.users).map(s => s.id));
  const subs = state.submissions.filter(s => studentIds.has(s.student_id));

  if (subs.length === 0) {
    container.innerHTML = '<div class="col-span-3 text-center py-8 text-slate-400 text-xs">Әзірге өткізілген шешімдер жоқ.</div>';
    return;
  }

  subs.forEach(sub => {
    const stUser = state.users.find(u => u.id === sub.student_id);
    const meta = parseUserMeta(stUser);

    const card = document.createElement('div');
    card.className = "bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-sm";

    let badgeClass = 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
    let badgeText = 'Тексеруді күтуде';
    if (sub.status === 'approved') {
      badgeClass = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
      badgeText = '✓ Дұрыс';
    } else if (sub.status === 'needs_revision') {
      badgeClass = 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400';
      badgeText = '↺ Өңдеуге';
    }

    card.innerHTML = `
      <div>
        <div class="flex justify-between items-start mb-2">
          <div>
            <div class="flex items-center gap-1.5">
              <span class="font-extrabold text-sm text-slate-900 dark:text-white">${sub.student_name}</span>
              <span class="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 font-mono">${meta.class_name || '—'}</span>
            </div>
            <div class="text-[11px] text-sky-600 dark:text-sky-400 font-mono mt-0.5">${sub.task_title}</div>
          </div>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass}">${badgeText}</span>
        </div>
        <div class="p-3 bg-sky-50/50 dark:bg-slate-950 rounded-xl border border-sky-100 dark:border-slate-800 text-xs font-mono text-sky-900 dark:text-sky-300 whitespace-pre-wrap max-h-28 overflow-y-auto">
          ${escapeHtml(sub.answer_text)}
        </div>
        ${sub.teacher_feedback ? `<div class="text-[11px] text-slate-500 mt-2"><strong>Кері байланыс:</strong> ${escapeHtml(sub.teacher_feedback)}</div>` : ''}
      </div>
      <button onclick="openReviewModal(${sub.id})" class="w-full mt-2 bg-sky-50 hover:bg-sky-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-sky-100 dark:border-slate-700 py-2 rounded-xl text-xs font-bold text-sky-800 dark:text-sky-200 transition">
        ${sub.status === 'submitted' ? 'Жауапты тексеру' : 'Шешімді өзгерту'}
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
  const feedback = document.getElementById('mReviewFeedbackText')?.value.trim() || '';

  const { error } = await sb
    .from('submissions')
    .update({
      status: status,
      score: null, // Жеке тапсырмаға баға қойылмайды, тек «Дұрыс» / «Өңдеуге»
      teacher_feedback: feedback,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', state.activeReviewSubId);

  if (!error) {
    closeReviewModal();
    const actionMsg = status === 'approved' ? 'Тапсырма «Дұрыс» деп қабылданды!' : 'Тапсырма өңдеуге жіберілді!';
    showToast(actionMsg, status === 'approved' ? 'fa-solid fa-circle-check text-emerald-500' : 'fa-solid fa-rotate-left text-rose-500');
    await loadTasksAndSubmissions();
  } else {
    console.error("Тексеруді сақтау қатесі:", error);
    showToast('Тексеруді сақтау қатесі: ' + error.message, 'fa-solid fa-triangle-exclamation text-rose-500');
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
    console.error("Тапсырманы құру қатесі:", error);
    showToast('Тапсырманы құру қатесі', 'fa-solid fa-triangle-exclamation text-rose-500');
  }
}

// ======================== МҰҒАЛІМ: ПАРАГРАФТЫ АВТОМАТТАНДЫРУ ========================

function openNewParagraphModal() {
  const modal = document.getElementById('newParagraphModal');
  if (modal) modal.classList.remove('hidden');
}

function closeNewParagraphModal() {
  const modal = document.getElementById('newParagraphModal');
  if (modal) modal.classList.add('hidden');
}

function fillParagraphTemplate(topic) {
  if (topic === 'hydrogen') {
    document.getElementById('newParaTitle').value = '§10. Сутек — химиялық элемент және жай зат';
    document.getElementById('paraTask1Title').value = '1-тапсырма (А-деңгейі). Сутекті алу реакциялары';
    document.getElementById('paraTask1Desc').value = 'Мырыш пен тұз қышқылының әрекеттесу реакциясының теңдеуін жазып, теңестіріңіз және реакция типін анықтаңыз: Zn + HCl → ? + ?';
    document.getElementById('paraTask2Title').value = '2-тапсырма (В-деңгейі). Сутектің тотықсыздандырғыш қасиеті';
    document.getElementById('paraTask2Desc').value = 'Мыс(II) оксидінен таза мысты сутекпен тотықсыздандыру реакциясы теңдеуін құрыңыз: CuO + H₂ → ? + ?';
    document.getElementById('paraTask3Title').value = '3-тапсырма (С-деңгейі). Сутекті жағу және реакция жылуы';
    document.getElementById('paraTask3Desc').value = 'Сутектің оттекте жану реакциясы теңдеуін жазып, 4 г сутек жанғанда түзілетін судың массасын есептеңіз.';
  } else if (topic === 'water') {
    document.getElementById('newParaTitle').value = '§11. Су — еріткіш. Ерітінділер';
    document.getElementById('paraTask1Title').value = '1-тапсырма (А-деңгейі). Судың физикалық қасиеттері';
    document.getElementById('paraTask1Desc').value = 'Судың қайнау және қату температурасын, агрегаттық күйлерін және химиялық формуласын сипаттаңыз.';
    document.getElementById('paraTask2Title').value = '2-тапсырма (В-деңгейі). Судың металдармен әрекеттесуі';
    document.getElementById('paraTask2Desc').value = 'Натрий мен судың әрекеттесу теңдеуін жазып, теңестіріңіз: Na + H₂O → NaOH + H₂↑';
    document.getElementById('paraTask3Title').value = '3-тапсырма (С-деңгейі). Ерітіндідегі еріген заттың массалық үлесі';
    document.getElementById('paraTask3Desc').value = '180 г суға 20 г ас тұзын (NaCl) еріткенде түзілген ерітіндідегі тұздың массалық үлесін (ω, %) табыңыз.';
  }
}

async function handleCreateParagraph(e) {
  e.preventDefault();
  const paraTitle = document.getElementById('newParaTitle').value.trim();
  const t1Title = document.getElementById('paraTask1Title').value.trim();
  const t1Desc = document.getElementById('paraTask1Desc').value.trim();
  const t2Title = document.getElementById('paraTask2Title').value.trim();
  const t2Desc = document.getElementById('paraTask2Desc').value.trim();
  const t3Title = document.getElementById('paraTask3Title').value.trim();
  const t3Desc = document.getElementById('paraTask3Desc').value.trim();

  if (!paraTitle || !t1Title || !t2Title || !t3Title) {
    alert('Барлық өрістерді толтырыңыз!');
    return;
  }

  const tasksToInsert = [
    { title: t1Title, category: paraTitle, description: t1Desc, formula_hint: 'А-деңгейі' },
    { title: t2Title, category: paraTitle, description: t2Desc, formula_hint: 'В-деңгейі' },
    { title: t3Title, category: paraTitle, description: t3Desc, formula_hint: 'С-деңгейі' }
  ];

  const { error } = await sb.from('tasks').insert(tasksToInsert);

  if (!error) {
    closeNewParagraphModal();
    document.getElementById('newParagraphForm').reset();
    showToast(`Жаңа параграф сәтті қосылды: "${paraTitle}"!`, 'fa-solid fa-book-bookmark text-emerald-500');
    await loadTasksAndSubmissions();
  } else {
    console.error("Параграфты сақтау қатесі:", error);
    showToast('Параграфты сақтауда қате орын алды', 'fa-solid fa-triangle-exclamation text-rose-500');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}

// ======================== GEMINI AI ОҚУЛЫҚ ТАЛДАУ ========================

let geminiSelectedFile = null;
let geminiBase64Data = null;
let geminiMimeType = null;

function openGeminiAIModal() {
  const modal = document.getElementById('geminiAIModal');
  if (modal) {
    modal.classList.remove('hidden');
    const savedKey = localStorage.getItem('chemlab_gemini_api_key');
    const keyInput = document.getElementById('geminiApiKeyInput');
    if (savedKey && keyInput) {
      keyInput.value = savedKey;
    }
  }
}

function closeGeminiAIModal() {
  const modal = document.getElementById('geminiAIModal');
  if (modal) modal.classList.add('hidden');
}

function saveGeminiApiKey() {
  const input = document.getElementById('geminiApiKeyInput');
  const val = input ? input.value.trim() : '';
  if (!val) {
    showToast('API кілтін жазыңыз', 'fa-solid fa-circle-exclamation text-amber-500');
    return;
  }
  localStorage.setItem('chemlab_gemini_api_key', val);
  showToast('Gemini API кілті сәтті сақталды!', 'fa-solid fa-circle-check text-emerald-500');
}

function handleGeminiFileSelect(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  geminiSelectedFile = file;
  geminiMimeType = file.type || 'image/jpeg';

  const reader = new FileReader();
  reader.onload = (evt) => {
    const dataUrl = evt.target.result;
    geminiBase64Data = dataUrl.split(',')[1];

    const previewBox = document.getElementById('geminiImgPreviewBox');
    const previewImg = document.getElementById('geminiImgPreview');
    if (previewImg && previewBox) {
      previewImg.src = dataUrl;
      previewBox.classList.remove('hidden');
    }
  };
  reader.readAsDataURL(file);
}

function clearGeminiPhoto() {
  geminiSelectedFile = null;
  geminiBase64Data = null;
  geminiMimeType = null;
  const fileInput = document.getElementById('geminiFileInput');
  if (fileInput) fileInput.value = '';
  const previewBox = document.getElementById('geminiImgPreviewBox');
  if (previewBox) previewBox.classList.add('hidden');
  const previewImg = document.getElementById('geminiImgPreview');
  if (previewImg) previewImg.src = '';
}

function loadGeminiDemoExample() {
  document.getElementById('aiGeneratedParaTitle').value = '§12. Оттек және оның қасиеттері. Оксидтер';
  document.getElementById('aiTask1Title').value = '1-тапсырма (А-деңгейі). Оттекті зертханада алу';
  document.getElementById('aiTask1Desc').value = 'Калий перманганатын (KMnO₄) қыздыру арқылы оттек алу реакциясының теңдеуін жазып, теңестіріңіз: KMnO₄ → K₂MnO₄ + MnO₂ + O₂↑';
  document.getElementById('aiTask2Title').value = '2-тапсырма (В-деңгейі). Жай заттардың оттекпен әрекеттесуі';
  document.getElementById('aiTask2Desc').value = 'Фосфордың (P) оттекте жанып фосфор(V) оксидін түзетін реакциясының теңдеуін құрыңыз: P + O₂ → P₂O₅. Коэффициенттерін қойыңыз және реакция типін анықтаңыз.';
  document.getElementById('aiTask3Title').value = '3-тапсырма (С-деңгейі). Реакция теңдеуі бойынша есептеу';
  document.getElementById('aiTask3Desc').value = '12 г көміртек толық жанғанда (C + O₂ → CO₂) жұмсалатын оттектің көлемін (қ.ж., л) есептеңіз. M(C) = 12 г/моль, Vm = 22.4 л/моль.';

  const resBox = document.getElementById('geminiResultBox');
  if (resBox) resBox.classList.remove('hidden');
  showToast('Демо үлгісі енгізілді. Қажет болса өзгертіп, сайтқа жариялаңыз!', 'fa-solid fa-wand-magic-sparkles text-purple-600');
}

async function generateTopicWithGemini() {
  let apiKey = localStorage.getItem('chemlab_gemini_api_key');
  const keyInput = document.getElementById('geminiApiKeyInput');
  if (keyInput && keyInput.value.trim()) {
    apiKey = keyInput.value.trim();
    localStorage.setItem('chemlab_gemini_api_key', apiKey);
  }

  if (!apiKey) {
    showToast('Алдымен Google Gemini API кілтін енгізіңіз немесе Үлгі көру (Демо) батырмасын басыңыз!', 'fa-solid fa-triangle-exclamation text-amber-500');
    if (keyInput) keyInput.focus();
    return;
  }

  const teacherPrompt = document.getElementById('geminiTeacherPrompt')?.value.trim() || '';

  if (!geminiBase64Data && !teacherPrompt) {
    showToast('Оқулық фотосын жүктеңіз немесе қосымша тақырыпты жазыңыз!', 'fa-solid fa-image text-amber-500');
    return;
  }

  const loadingBox = document.getElementById('geminiLoadingBox');
  const resultBox = document.getElementById('geminiResultBox');
  const btn = document.getElementById('btnRunGemini');
  if (loadingBox) loadingBox.classList.remove('hidden');
  if (resultBox) resultBox.classList.add('hidden');
  if (btn) btn.disabled = true;

  const promptText = `
Сен химия пәнінің тәжірибелі мұғалімісің. 
Берілген оқулық материалын (сурет немесе тақырып) талдап, қазақ тілінде мектептің 8-сынып бағдарламасына сай 3 деңгейлі жаттығу құрастыр.
Мұғалімнің қосымша нұсқаулығы: ${teacherPrompt || 'Оқулыққа сәйкес стандартты деңгейлік тапсырмалар дайында'}.

МҰҚИЯТ ТАЛАП:
1. paragraph_title: "§[нөмірі]. [Тақырып атауы]" форматында болуы керек.
2. task1_title: "1-тапсырма (А-деңгейі). [Тақырыпша]" (қарапайым ұғымдар, формула, анықтама).
3. task1_desc: Толық шарт пен тапсырма.
4. task2_title: "2-тапсырма (В-деңгейі). [Тақырыпша]" (реакция теңдеуін құру, теңестіру).
5. task2_desc: Толық шарт пен химиялық теңдеулер.
6. task3_title: "3-тапсырма (С-деңгейі). [Тақырыпша]" (сандық есеп немесе логикалық сұрақ).
7. task3_desc: Есеп шарты және нақты сұрақ.

Жауапты ТЕК КЕЛЕСІ СТРУКТУРАДАҒЫ ТАЗА JSON ФОРМАТЫНДА қайтар:
{
  "paragraph_title": "§... ...",
  "task1_title": "1-тапсырма (А-деңгейі). ...",
  "task1_desc": "...",
  "task2_title": "2-тапсырма (В-деңгейі). ...",
  "task2_desc": "...",
  "task3_title": "3-тапсырма (С-деңгейі). ...",
  "task3_desc": "..."
}
`;

  try {
    const parts = [{ text: promptText }];
    if (geminiBase64Data) {
      parts.push({
        inline_data: {
          mime_type: geminiMimeType || 'image/jpeg',
          data: geminiBase64Data
        }
      });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          response_mime_type: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData?.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error("Gemini жауап қайтармады");

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      else throw new Error("JSON құрылымы оқылмады");
    }

    document.getElementById('aiGeneratedParaTitle').value = parsed.paragraph_title || '§10. Жаңа тақырып';
    document.getElementById('aiTask1Title').value = parsed.task1_title || '1-тапсырма (А-деңгейі)';
    document.getElementById('aiTask1Desc').value = parsed.task1_desc || '';
    document.getElementById('aiTask2Title').value = parsed.task2_title || '2-тапсырма (В-деңгейі)';
    document.getElementById('aiTask2Desc').value = parsed.task2_desc || '';
    document.getElementById('aiTask3Title').value = parsed.task3_title || '3-тапсырма (С-деңгейі)';
    document.getElementById('aiTask3Desc').value = parsed.task3_desc || '';

    if (resultBox) resultBox.classList.remove('hidden');
    showToast('Gemini оқулықты сәтті талдап, тапсырмаларды дайындады!', 'fa-solid fa-wand-magic-sparkles text-purple-600');
  } catch (err) {
    console.error("Gemini API қатесі:", err);
    showToast('Gemini API қатесі: ' + err.message, 'fa-solid fa-triangle-exclamation text-rose-500');
  } finally {
    if (loadingBox) loadingBox.classList.add('hidden');
    if (btn) btn.disabled = false;
  }
}

async function publishAITasksToSite() {
  const paraTitle = document.getElementById('aiGeneratedParaTitle').value.trim();
  const t1Title = document.getElementById('aiTask1Title').value.trim();
  const t1Desc = document.getElementById('aiTask1Desc').value.trim();
  const t2Title = document.getElementById('aiTask2Title').value.trim();
  const t2Desc = document.getElementById('aiTask2Desc').value.trim();
  const t3Title = document.getElementById('aiTask3Title').value.trim();
  const t3Desc = document.getElementById('aiTask3Desc').value.trim();

  if (!paraTitle || !t1Title || !t2Title || !t3Title) {
    alert('Барлық өрістерді толтырыңыз!');
    return;
  }

  const tasksToInsert = [
    { title: t1Title, category: paraTitle, description: t1Desc, formula_hint: 'А-деңгейі' },
    { title: t2Title, category: paraTitle, description: t2Desc, formula_hint: 'В-деңгейі' },
    { title: t3Title, category: paraTitle, description: t3Desc, formula_hint: 'С-деңгейі' }
  ];

  const { error } = await sb.from('tasks').insert(tasksToInsert);

  if (!error) {
    const bannerTopic = document.getElementById('bannerTopicSubtitle');
    if (bannerTopic) bannerTopic.textContent = paraTitle;

    closeGeminiAIModal();
    showToast(`«${paraTitle}» жаңа тақырыбы сайтқа сәтті жарияланды!`, 'fa-solid fa-cloud-arrow-up text-emerald-500');
    await loadTasksAndSubmissions();
    switchTab('tasks');
  } else {
    console.error("AI тапсырмаларын сақтау қатесі:", error);
    showToast('Тапсырмаларды сақтау кезінде қате орын алды: ' + error.message, 'fa-solid fa-triangle-exclamation text-rose-500');
  }
}

// ======================== ІСКЕ ҚОСУ ========================

window.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initSim();
  initVLab();
  setupBalancingListeners();
  calculateLiveAtoms();
  renderSortingPool();

  const savedGeminiKey = localStorage.getItem('chemlab_gemini_api_key');
  const geminiInput = document.getElementById('geminiApiKeyInput');
  if (savedGeminiKey && geminiInput) {
    geminiInput.value = savedGeminiKey;
  }

  await checkSavedUser();
  initSupabaseRealtime();
});
