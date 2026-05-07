/* ================================================
   PRIORVIA — dashboard.js  v3
   + Projeler (Kronolojik, Üyeler, Yeni Proje)
   + Görevlerim (Sadece atanan)
   + Takvim
   + Arşiv (PM Onayı)
   + Bildirimler (Tam Liste)
   + Gelişmiş Koyu Mod
   + Backend Auth Entegrasyonu
   ================================================ */

/* ── BACKEND KONTROL ──────────────────────────── */
/* ── HYBRID API KATMANI ───────────────────────────────────────────────────
   Backend varsa fetch() kullanır, yoksa localStorage fallback'e geçer.
   API_BASE = backend URL. Değiştirmen gerekmez.
   ─────────────────────────────────────────────────────────────────────── */
var API_BASE = 'http://localhost:3000';
var _backendAvailable = null; // null=bilinmiyor, true/false=test edildi

function checkBackend() {
  if (_backendAvailable !== null) return Promise.resolve(_backendAvailable);
  return fetch(API_BASE + '/health', { method: 'GET', signal: AbortSignal.timeout(1500) })
    .then(function() { _backendAvailable = true;  return true;  })
    .catch(function() { _backendAvailable = false; return false; });
}

/* Genel API helper — token'ı otomatik ekler */
function apiRequest(method, path, body) {
  var opts = {
    method: method,
    headers: { 'Content-Type': 'application/json' }
  };
  var tok = localStorage.getItem('token');
  if (tok) opts.headers['Authorization'] = 'Bearer ' + tok;
  if (body) opts.body = JSON.stringify(body);
  return fetch(API_BASE + path, opts).then(function(r) {
    if (!r.ok) throw new Error('API ' + r.status);
    return r.json();
  });
}

/* Proje üyelerini getir — hybrid */
function fetchProjectMembers(projectId) {
  return checkBackend().then(function(ok) {
    if (ok && projectId) {
      return apiRequest('GET', '/projects/' + projectId + '/members')
        .then(function(data) { return data.members || data; })
        .catch(function() { return teamMembers; }); // hata → localStorage
    }
    /* Backend yok veya proje seçilmedi → localStorage'dan ekip */
    return Promise.resolve(teamMembers);
  });
}

/* Tüm ekip üyelerini getir — hybrid */
function fetchTeamMembers() {
  return checkBackend().then(function(ok) {
    if (ok) {
      return apiRequest('GET', '/team/members')
        .then(function(data) { return data.members || data; })
        .catch(function() { return teamMembers; });
    }
    return Promise.resolve(teamMembers);
  });
}
var token = localStorage.getItem('token');
if (!token) {
  window.location.href = 'homePage.html';
}

/* ── LOGOUT ───────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
  var logoutBtns = document.querySelectorAll('.db-logout-btn, a[href="homePage.html"]');
  logoutBtns.forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      localStorage.removeItem('token');
      window.location.href = 'homePage.html';
    });
  });
});

/* ── STATE ────────────────────────────────────── */
var tasks       = JSON.parse(localStorage.getItem('priorvia_tasks')    || '[]');
var activities  = JSON.parse(localStorage.getItem('priorvia_activity') || '[]');
var teamMembers = JSON.parse(localStorage.getItem('priorvia_team')     || '[]');
var projects    = JSON.parse(localStorage.getItem('priorvia_projects') || '[]');
var archived    = JSON.parse(localStorage.getItem('priorvia_archive')  || '[]');
var notifications = JSON.parse(localStorage.getItem('priorvia_notifs')  || '[]');
var dragId      = null;
var editId      = null;
var calDate     = new Date();
var darkMode    = localStorage.getItem('priorvia_dark') === '1';

/* Aktif kullanıcı - backend'den gelir */
var _rawUser = localStorage.getItem('priorvia_user') || 'Kullanıcı';
var currentUser;
try {
  var _parsed = JSON.parse(_rawUser);
  currentUser = _parsed.name || _parsed.email || _rawUser;
} catch(e) {
  currentUser = _rawUser;
}

/* ── INIT ─────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
  applyTheme();
  initSidebar();
  initDropdowns();
  initDrawer();
  initInviteDrawer();
  initProjectDrawer();
  initFilters();
  initNavViews();
  initThemeToggle();
  initCalendar();
  render();
  renderTeam();
  renderProjects();
  renderMyTasks();
  renderNotificationsFull();
  renderArchive();
  renderMyProfile();
  updateWelcome();
  updateUserInfo();
  applyLanguage();
  cleanOldActivities();
  /* Her 10 dakikada bir eski aktiviteleri temizle */
  setInterval(function() {
    cleanOldActivities();
    renderActivity();
  }, 10 * 60 * 1000);
});

/* ── THEME ────────────────────────────────────── */
function applyTheme() {
  if (darkMode) {
    document.body.classList.add('dark-mode');
    setThemeIcon(true);
  }
}

function setThemeIcon(isDark) {
  var icon = document.getElementById('themeIcon');
  if (!icon) return;
  if (isDark) {
    icon.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
  } else {
    icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  }
}

function initThemeToggle() {
  document.getElementById('themeToggle').addEventListener('click', function() {
    darkMode = !darkMode;
    localStorage.setItem('priorvia_dark', darkMode ? '1' : '0');
    document.body.classList.toggle('dark-mode', darkMode);
    setThemeIcon(darkMode);
  });
}

/* ── USER INFO ────────────────────────────────── */
function updateUserInfo() {
  var profile = getMyProfile();
  var displayName = profile.name || currentUser;
  var ini = displayName.split(' ').map(function(w){ return w[0]||''; }).join('').toUpperCase().slice(0,2);
  setText('sidebarAvatar', ini);
  setText('sidebarName', displayName);
  var roleLabels = { pm:'Proje Yöneticisi', member:'Ekip Üyesi', viewer:'Görüntüleyici' };
  setText('sidebarRole', roleLabels[profile.role] || profile.title || 'Proje Yöneticisi');
  setText('topbarAvatar', ini);
  setText('topbarName', displayName.split(' ')[0]);
}

function getMyProfile() {
  return JSON.parse(localStorage.getItem('priorvia_myprofile') || 'null') || {
    name: currentUser, email: '', phone: '', github: ''
  };
}

function saveMyProfile(data) {
  localStorage.setItem('priorvia_myprofile', JSON.stringify(data));
  currentUser = data.name;
  localStorage.setItem('priorvia_user', data.name);
  updateUserInfo();
}

/* ── NAV VIEWS ────────────────────────────────── */
function initNavViews() {
  document.querySelectorAll('.db-nav-item[data-view]').forEach(function(item) {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      showView(this.dataset.view);
    });
  });
}

function showView(view) {
  document.querySelectorAll('.db-drawer').forEach(function(d){ d.classList.remove('open'); });
  document.getElementById('dbOverlay').classList.remove('open');
  editId = null;

  var allViewIds = [
    'viewDashboard','viewProjects','viewMyTasks','viewTeam',
    'viewNotifications','viewCalendar','viewArchive','viewMyprofile','viewSettings'
  ];
  allViewIds.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  document.querySelectorAll('.db-nav-item').forEach(function(i){ i.classList.remove('active'); });
  var navEl = document.querySelector('.db-nav-item[data-view="' + view + '"]');
  if (navEl) navEl.classList.add('active');

  var labels = {
    dashboard:     'Dashboard',
    projects:      'Projeler',
    mytasks:       'Görevlerim',
    team:          'Ekip & Yetkiler',
    notifications: 'Bildirimler',
    calendar:      'Takvim',
    archive:       'Arşiv',
    myprofile:     'Profilim',
    settings:      'Ayarlar'
  };
  setText('breadcrumbCurrent', labels[view] || view);

  var viewMap = {
    dashboard:     'viewDashboard',
    projects:      'viewProjects',
    mytasks:       'viewMyTasks',
    team:          'viewTeam',
    notifications: 'viewNotifications',
    calendar:      'viewCalendar',
    archive:       'viewArchive',
    myprofile:     'viewMyprofile',
    settings:      'viewSettings'
  };
  var el = document.getElementById(viewMap[view]);
  if (el) el.style.display = '';

  if (view === 'projects')      renderProjects();
  if (view === 'mytasks')       renderMyTasks();
  if (view === 'dashboard')     { renderDashChart(); populateDashProjectFilter(); }
  if (view === 'team')          renderTeam();
  if (view === 'notifications') renderNotificationsFull();
  if (view === 'calendar')      renderCalendar();
  if (view === 'archive')       renderArchive();
  if (view === 'myprofile')     renderMyProfile();
  if (view === 'settings')      renderSettings();
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* ── SIDEBAR ──────────────────────────────────── */
function initSidebar() {
  var sidebar = document.getElementById('dbSidebar');
  var main    = document.getElementById('dbMain');
  var btn     = document.getElementById('collapseBtn');
  if (!btn) return;
  btn.addEventListener('click', function() {
    sidebar.classList.toggle('collapsed');
    main.classList.toggle('collapsed');
  });
}

/* ── DROPDOWNS ────────────────────────────────── */
function initDropdowns() {
  setupToggle('notifToggle',   'notifDropdown');
  setupToggle('profileToggle', 'profileDropdown');
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.db-icon-wrap')) closeAllDropdowns();
  });
}
function setupToggle(btnId, dropId) {
  var btn = document.getElementById(btnId);
  if (!btn) return;
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    var drop = document.getElementById(dropId);
    var wasOpen = drop.classList.contains('open');
    closeAllDropdowns();
    if (!wasOpen) drop.classList.add('open');
  });
}
function closeAllDropdowns() {
  document.querySelectorAll('.db-dropdown').forEach(function(d){ d.classList.remove('open'); });
}

/* ── TASK DRAWER ──────────────────────────────── */
function initDrawer() {
  document.getElementById('newTaskBtn').addEventListener('click', function(){ openDrawer('todo'); });
  document.getElementById('drawerClose').addEventListener('click', closeDrawer);
  document.getElementById('drawerCancel').addEventListener('click', closeDrawer);
  document.getElementById('dbOverlay').addEventListener('click', closeAllDrawers);

  document.getElementById('fStatus').addEventListener('change', function(e) {
    var pg = document.getElementById('progressGroup');
    if (pg) pg.style.display = e.target.value === 'inprogress' ? 'flex' : 'none';
  });
  document.getElementById('fProject').addEventListener('change', function() {
    var currentAssignee = document.getElementById('fAssignee').value;
    populateAssigneeSelect(currentAssignee, this.value);
  });
  document.getElementById('fProgress').addEventListener('input', function(e) {
    document.getElementById('progressVal').textContent = e.target.value;
  });
  document.getElementById('drawerSave').addEventListener('click', saveTask);
  document.getElementById('fTitle').addEventListener('input', function() {
    this.classList.remove('err');
    document.getElementById('fTitleErr').classList.remove('show');
  });
}

function populateProjectDropdown(selectedId) {
  var sel = document.getElementById('fProject');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Proje Seçin —</option>';
  projects.forEach(function(p) {
    var opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    if (p.id === selectedId) opt.selected = true;
    sel.appendChild(opt);
  });
}
function populateAssigneeSelect(selectedValue, projectId) {
  var sel = document.getElementById('fAssignee');
  if (!sel || sel.tagName !== 'SELECT') return; /* HTML henüz güncellenmemişse çık */

  sel.innerHTML = '<option value="">— Kişi Seçin —</option>';
  sel.disabled = true;

  fetchProjectMembers(projectId).then(function(members) {
    sel.innerHTML = '<option value="">— Kişi Seçin —</option>';

    /* Ekipte kimse yoksa elle giriş seçeneği sun */
    if (!members || members.length === 0) {
      var opt = document.createElement('option');
      opt.value = selectedValue;
      opt.textContent = selectedValue || 'Ekip üyesi yok';
      if (selectedValue) { opt.selected = true; sel.appendChild(opt); }
      sel.disabled = false;
      return;
    }

    members.forEach(function(m) {
      var name = m.name || m.email || m;
      var val  = name;
      var opt  = document.createElement('option');
      opt.value = val;

      /* Avatar baş harflerini label'a ekle */
      var ini = name.split(' ').map(function(w){ return w[0] || ''; }).join('').toUpperCase().slice(0, 2);
      opt.textContent = ini + '  ' + name;

      if (val === selectedValue || name === selectedValue) opt.selected = true;
      sel.appendChild(opt);
    });

    sel.disabled = false;
  });
}

function openDrawer(defaultStatus) {
  defaultStatus = defaultStatus || 'todo';
  editId = null;
  document.getElementById('editTaskId').value = '';
  document.getElementById('drawerTitle').textContent = 'Yeni Görev';
  document.getElementById('fTitle').value    = '';
  document.getElementById('fDesc').value     = '';
  document.getElementById('fPriority').value = 'med';
  document.getElementById('fDate').value     = '';
  document.getElementById('fStatus').value   = defaultStatus;
  document.getElementById('fProgress').value = 0;
  document.getElementById('progressVal').textContent = '0';
  document.getElementById('progressGroup').style.display = defaultStatus === 'inprogress' ? 'flex' : 'none';
  document.getElementById('fTitle').classList.remove('err');
  document.getElementById('fTitleErr').classList.remove('show');
  populateProjectDropdown('');

  /* Assignee select'i doldur */
  var projId = document.getElementById('fProject').value || '';
  populateAssigneeSelect('', projId);

  document.getElementById('taskDrawer').classList.add('open');
  document.getElementById('dbOverlay').classList.add('open');
  document.getElementById('fTitle').focus();
}

function openEditDrawer(id) {
  var task = tasks.find(function(t){ return t.id === id; });
  if (!task) return;
  editId = id;
  document.getElementById('editTaskId').value = id;
  document.getElementById('drawerTitle').textContent = 'Görevi Düzenle';
  document.getElementById('fTitle').value    = task.title;
  document.getElementById('fDesc').value     = task.desc || '';
  document.getElementById('fPriority').value = task.priority;
  document.getElementById('fDate').value     = task.date || '';
  document.getElementById('fStatus').value   = task.status;
  document.getElementById('fProgress').value = task.progress || 0;
  document.getElementById('progressVal').textContent = task.progress || 0;
  document.getElementById('progressGroup').style.display = task.status === 'inprogress' ? 'flex' : 'none';
  populateProjectDropdown(task.projectId || '');

  /* Assignee select'i doldur — mevcut değeri seç */
  populateAssigneeSelect(task.assignee || '', task.projectId || '');

  document.getElementById('taskDrawer').classList.add('open');
  document.getElementById('dbOverlay').classList.add('open');
  document.getElementById('fTitle').focus();
}

function closeDrawer() {
  document.getElementById('taskDrawer').classList.remove('open');
  document.getElementById('dbOverlay').classList.remove('open');
  editId = null;
}

function closeAllDrawers() {
  document.querySelectorAll('.db-drawer').forEach(function(d){ d.classList.remove('open'); });
  document.getElementById('dbOverlay').classList.remove('open');
  editId = null;
}

function saveTask() {
  var title = document.getElementById('fTitle').value.trim();
  if (!title) {
    document.getElementById('fTitle').classList.add('err');
    document.getElementById('fTitleErr').classList.add('show');
    return;
  }
  var taskData = {
    title:     title,
    desc:      document.getElementById('fDesc').value.trim(),
    priority:  document.getElementById('fPriority').value,
    date:      document.getElementById('fDate').value,
    assignee:  document.getElementById('fAssignee').value.trim(),
    status:    document.getElementById('fStatus').value,
    progress:  parseInt(document.getElementById('fProgress').value) || 0,
    projectId: document.getElementById('fProject').value || ''
  };

  if (editId) {
    tasks = tasks.map(function(t){ return t.id === editId ? Object.assign({}, t, taskData) : t; });
    addActivity('"' + title + '" güncellendi', 'orange');
    addNotif('Görev güncellendi: ' + title, 'update');
    showSaveBar('Görev güncellendi.');
  } else {
    taskData.id = Date.now().toString();
    taskData.createdAt = new Date().toISOString();
    tasks.push(taskData);
    addActivity('Yeni görev: "' + title + '"', 'green');
    addNotif('Yeni görev oluşturuldu: ' + title, 'new');
    showSaveBar('Görev oluşturuldu.');
  }

  if (taskData.status === 'done') {
    addNotif('"' + title + '" tamamlandı — PM onayı gerekiyor', 'warn');
  }

  persist();
  render();
  renderMyTasks();
  renderProjects();
  closeDrawer();
}

/* ── ARCHIVE TASK (PM Approval) ───────────────── */
function archiveTask(id) {
  var task = tasks.find(function(t){ return t.id === id; });
  if (!task) return;
  if (!confirm('"' + task.title + '" arşive taşınacak. PM olarak onaylıyor musunuz?')) return;

  var archivedTask = Object.assign({}, task, {
    archivedAt: new Date().toISOString(),
    archivedBy: currentUser
  });
  archived.push(archivedTask);
  tasks = tasks.filter(function(t){ return t.id !== id; });

  addActivity('"' + task.title + '" arşive taşındı', 'blue');
  addNotif('"' + task.title + '" PM tarafından onaylanarak arşive taşındı', 'archive');

  localStorage.setItem('priorvia_archive', JSON.stringify(archived));
  persist();
  render();
  renderArchive();
  showSaveBar('Görev arşive taşındı.');
}

/* ── ARCHIVE RENDER ───────────────────────────── */
function renderArchive() {
  var list = document.getElementById('archiveList');
  if (!list) return;
  if (archived.length === 0) {
    list.innerHTML = '<div class="db-empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg><p>Arşivde henüz görev yok.</p><span>Tamamlanan görevleri PM onayıyla arşivleyebilirsiniz.</span></div>';
    return;
  }

  var html = '<div class="db-archive-table">';
  html += '<div class="db-archive-header"><span>GÖREV</span><span>ATANAN</span><span>PROJE</span><span>TAMAMLANMA</span><span>ARŞİVLEYEN PM</span></div>';

  archived.slice().reverse().forEach(function(t) {
    var proj = projects.find(function(p){ return p.id === t.projectId; });
    var archivedDate = new Date(t.archivedAt).toLocaleDateString('tr-TR', {day:'numeric', month:'short', year:'numeric'});
    var doneDate = t.doneAt ? new Date(t.doneAt).toLocaleDateString('tr-TR', {day:'numeric', month:'short'}) : archivedDate;
    html += '<div class="db-archive-row">' +
      '<div class="db-archive-task"><span class="db-archive-check">✓</span><div><div class="db-archive-title">' + escHtml(t.title) + '</div>' +
      (t.desc ? '<div class="db-archive-desc">' + escHtml(t.desc.substring(0,60)) + (t.desc.length>60?'...':'') + '</div>' : '') +
      '</div></div>' +
      '<div>' + (t.assignee ? '<span class="db-card-assignee">' + escHtml(initials(t.assignee)) + '</span> ' + escHtml(t.assignee) : '—') + '</div>' +
      '<div>' + (proj ? '<span class="db-proj-badge db-proj-' + proj.color + '">' + escHtml(proj.name) + '</span>' : '—') + '</div>' +
      '<div class="db-archive-date">' + doneDate + '</div>' +
      '<div class="db-archive-pm"><span class="db-role-badge db-role-pm">' + escHtml(t.archivedBy || currentUser) + '</span></div>' +
    '</div>';
  });
  html += '</div>';
  list.innerHTML = html;
}

/* ── PROJECTS ─────────────────────────────────── */
function initProjectDrawer() {
  document.getElementById('newProjectBtn').addEventListener('click', openProjectDrawer);
  document.getElementById('projectDrawerClose').addEventListener('click', closeProjectDrawer);
  document.getElementById('projectDrawerCancel').addEventListener('click', closeProjectDrawer);
  document.getElementById('projectDrawerSave').addEventListener('click', saveProject);
}

function openProjectDrawer(editProjId) {
  var isEdit = typeof editProjId === 'string';
  var proj = isEdit ? projects.find(function(p){ return p.id === editProjId; }) : null;

  document.getElementById('projectDrawerTitle').textContent = isEdit ? 'Projeyi Düzenle' : 'Yeni Proje';
  document.getElementById('editProjectId').value = isEdit ? editProjId : '';
  document.getElementById('pName').value     = proj ? proj.name : '';
  document.getElementById('pDesc').value     = proj ? proj.desc || '' : '';
  document.getElementById('pBudget').value   = proj ? proj.budget || '' : '';
  document.getElementById('pDeadline').value = proj ? proj.deadline || '' : '';
  document.getElementById('pColor').value    = proj ? proj.color || 'blue' : 'blue';

  var cl = document.getElementById('memberCheckList');
  cl.innerHTML = '';
  teamMembers.forEach(function(m) {
    var checked = proj && proj.members && proj.members.indexOf(m.id) !== -1;
    var label = document.createElement('label');
    label.className = 'db-member-check' + (checked ? ' checked' : '');
    label.innerHTML = '<input type="checkbox" value="' + m.id + '"' + (checked ? ' checked' : '') + '> ' +
      '<span class="db-team-avatar" style="width:24px;height:24px;font-size:10px">' + escHtml(initials(m.name)) + '</span>' +
      escHtml(m.name);
    label.querySelector('input').addEventListener('change', function() {
      label.classList.toggle('checked', this.checked);
    });
    cl.appendChild(label);
  });
  if (teamMembers.length === 0) {
    cl.innerHTML = '<p style="font-size:12px;color:var(--text-muted)">Önce ekip üyesi ekleyin.</p>';
  }

  document.getElementById('projectDrawer').classList.add('open');
  document.getElementById('dbOverlay').classList.add('open');
  document.getElementById('pName').focus();
}

function closeProjectDrawer() {
  document.getElementById('projectDrawer').classList.remove('open');
  document.getElementById('dbOverlay').classList.remove('open');
}

function saveProject() {
  var name = document.getElementById('pName').value.trim();
  if (!name) { alert('Proje adı zorunludur.'); return; }

  var memberIds = [];
  document.querySelectorAll('#memberCheckList input[type=checkbox]:checked').forEach(function(cb) {
    memberIds.push(cb.value);
  });

  var editProjId = document.getElementById('editProjectId').value;
  var projData = {
    name:     name,
    desc:     document.getElementById('pDesc').value.trim(),
    budget:   parseInt(document.getElementById('pBudget').value) || 0,
    deadline: document.getElementById('pDeadline').value,
    color:    document.getElementById('pColor').value,
    members:  memberIds
  };

  if (editProjId) {
    projects = projects.map(function(p){ return p.id === editProjId ? Object.assign({}, p, projData) : p; });
    addActivity('Proje güncellendi: "' + name + '"', 'blue');
    showSaveBar('Proje güncellendi.');
  } else {
    projData.id = Date.now().toString();
    projData.createdAt = new Date().toISOString();
    projects.push(projData);
    addActivity('Yeni proje: "' + name + '"', 'green');
    addNotif('Yeni proje oluşturuldu: ' + name, 'new');
    showSaveBar('Proje oluşturuldu.');
  }

  localStorage.setItem('priorvia_projects', JSON.stringify(projects));
  renderProjects();
  populateProjectDropdown('');
  closeProjectDrawer();
  render();
}

function deleteProject(id) {
  var proj = projects.find(function(p){ return p.id === id; });
  if (!proj) return;
  if (!confirm('"' + proj.name + '" projesi silinecek. Emin misiniz?')) return;
  projects = projects.filter(function(p){ return p.id !== id; });
  localStorage.setItem('priorvia_projects', JSON.stringify(projects));
  addActivity('"' + proj.name + '" projesi silindi', 'orange');
  renderProjects();
  showSaveBar('Proje silindi.');
}

function renderProjects() {
  var list = document.getElementById('projectsList');
  if (!list) return;

  var sorted = projects.slice().sort(function(a, b) {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  setText('projectCount', projects.length);
  setText('projectsDoneCount', projects.length + ' proje aktif');

  if (sorted.length === 0) {
    list.innerHTML = '<div class="db-empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg><p>Henüz proje yok.</p><span>Yeni proje oluşturmak için butona tıklayın.</span></div>';
    return;
  }

  var colorMap = { blue:'#3b82f6', green:'#22c55e', orange:'#f59e0b', purple:'#8b5cf6', red:'#ef4444' };
  var html = '';

  sorted.forEach(function(p) {
    var projTasks = tasks.filter(function(t){ return t.projectId === p.id; });
    var doneTasks = projTasks.filter(function(t){ return t.status === 'done'; });
    var completion = projTasks.length > 0 ? Math.round((doneTasks.length / projTasks.length) * 100) : 0;
    var color = colorMap[p.color] || colorMap.blue;

    var memberHtml = '';
    var projMembers = teamMembers.filter(function(m){ return p.members && p.members.indexOf(m.id) !== -1; });
    projMembers.slice(0,4).forEach(function(m) {
      memberHtml += '<div class="db-proj-avatar" title="' + escHtml(m.name) + '">' + escHtml(initials(m.name)) + '</div>';
    });
    if (projMembers.length > 4) memberHtml += '<div class="db-proj-avatar db-proj-more">+' + (projMembers.length-4) + '</div>';

    var createdDate = new Date(p.createdAt).toLocaleDateString('tr-TR', {day:'numeric', month:'short', year:'numeric'});

    html += '<div class="db-proj-row">' +
      '<div class="db-proj-info">' +
        '<div class="db-proj-icon" style="background:' + color + '22;color:' + color + '">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>' +
        '</div>' +
        '<div>' +
          '<div class="db-proj-name">' + escHtml(p.name) + '</div>' +
          '<div class="db-proj-meta">' + projTasks.length + ' görev · ' + createdDate + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="db-proj-members">' + (memberHtml || '<span style="color:var(--text-muted);font-size:12px">—</span>') + '</div>' +
      '<div class="db-proj-budget">' + (p.budget > 0 ? '$' + p.budget.toLocaleString() : '<span style="color:#f59e0b;font-size:12px">Belirlenmedi</span>') + '</div>' +
      '<div class="db-proj-completion">' +
        '<div class="db-proj-progress-bar"><div class="db-proj-progress-fill" style="width:' + completion + '%;background:' + color + '"></div></div>' +
        '<span class="db-proj-pct" style="color:' + color + '">%' + completion + '</span>' +
      '</div>' +
      '<div class="db-proj-actions">' +
        '<button class="db-card-btn" title="Düzenle" onclick="openProjectDrawer(\'' + p.id + '\')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>' +
        '<button class="db-card-btn danger" title="Sil" onclick="deleteProject(\'' + p.id + '\')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>' +
      '</div>' +
    '</div>';
  });

  list.innerHTML = html;
}

function renderMyTasks() {
  var list = document.getElementById('myTasksList');
  if (!list) return;

  /* ── 1. Filtrele: sadece bana atanan görevler ── */
  var profile = getMyProfile();
  var myName  = (profile.name || currentUser).toLowerCase().trim();

  var myTasks = tasks.filter(function(t) {
    return t.assignee && t.assignee.toLowerCase().trim() === myName;
  });

  setText('myTaskCount', myTasks.length);

  if (myTasks.length === 0) {
    list.innerHTML = '<div class="db-empty-state">' +
      '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>' +
      '<p>Size atanan görev yok.</p>' +
      '<span>Atanan kişi olarak "' + escHtml(profile.name || currentUser) + '" seçildiğinde görevler burada görünür.</span>' +
    '</div>';
    return;
  }

  /* ── 2. Akıllı sıralama ──────────────────────
     Kural 1 — Durum: aktif görevler önce (done en sona)
     Kural 2 — Tarih: teslim tarihi en yakın olan üstte
                      tarihi olmayanlar en sona
     Kural 3 — Öncelik: aynı tarihte Acil>Yüksek>Orta>Düşük
  ─────────────────────────────────────────────── */
  var priorityOrder = { urgent: 0, high: 1, med: 2, low: 3 };
  var statusOrder   = { todo: 0, inprogress: 0, pending_approval: 1, done: 2 };
  var BIG = 99999999999999; /* tarihi olmayanlar için büyük sayı */

  myTasks.sort(function(a, b) {
    /* Önce durum grubu */
    var sDiff = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
    if (sDiff !== 0) return sDiff;

    /* Sonra tarih */
    var aDate = a.date ? new Date(a.date).getTime() : BIG;
    var bDate = b.date ? new Date(b.date).getTime() : BIG;
    if (aDate !== bDate) return aDate - bDate;

    /* Aynı tarihse öncelik */
    var aPri = priorityOrder[a.priority] !== undefined ? priorityOrder[a.priority] : 99;
    var bPri = priorityOrder[b.priority] !== undefined ? priorityOrder[b.priority] : 99;
    return aPri - bPri;
  });

  /* ── 3. Render ───────────────────────────────── */
  var today    = new Date(); today.setHours(0, 0, 0, 0);
  var tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  var html = '<div class="db-mytasks-grid">';

  /* Sıralama bilgisi başlık */
  html += '<div class="db-mytasks-sort-info">' +
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>' +
    myTasks.length + ' görev  ' +
  '</div>';

  myTasks.forEach(function(task) {
    var proj      = projects.find(function(p){ return p.id === task.projectId; });
    var pLabel    = { urgent:'ACİL', high:'YÜKSEK', med:'ORTA', low:'DÜŞÜK' }[task.priority] || 'ORTA';
    var statusLabel = {
      todo:             'Yapılacak',
      inprogress:       'Devam Ediyor',
      done:             'Tamamlandı',
      pending_approval: 'PM Onayı Bekliyor'
    }[task.status] || task.status;
    var statusCls = {
      todo:             'db-mt-todo',
      inprogress:       'db-mt-prog',
      done:             'db-mt-done',
      pending_approval: 'db-mt-pending'
    }[task.status] || 'db-mt-todo';

    /* Tarih durumu */
    var dateHtml   = '';
    var isOverdue  = false;
    var isToday    = false;
    var isTomorrow = false;

    if (task.date) {
      var d = new Date(task.date); d.setHours(0, 0, 0, 0);
      isOverdue  = d < today  && task.status !== 'done';
      isToday    = d.getTime() === today.getTime();
      isTomorrow = d.getTime() === tomorrow.getTime();

      var dateLabel = isOverdue  ? '⚠ Gecikmiş — ' + formatDate(d) :
                      isToday    ? '🔴 Bugün teslim' :
                      isTomorrow ? '🟡 Yarın teslim' :
                      formatDate(d);

      dateHtml = '<span class="db-card-date' + (isOverdue ? ' overdue' : isToday ? ' today-due' : '') + '">' +
        '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
        dateLabel + '</span>';
    } else {
      dateHtml = '<span style="font-size:11.5px;color:var(--text-muted)">Tarih belirlenmedi</span>';
    }

    /* Kart renk kenar — önceliğe göre */
    var borderColor = { urgent:'#dc2626', high:'#ef4444', med:'#f59e0b', low:'var(--green-600)' }[task.priority] || 'transparent';

    html += '<div class="db-mytask-card' + (task.status === 'done' ? ' db-card-done' : '') + '" style="border-left-color:' + borderColor + '">' +

      /* Üst satır: öncelik + durum */
      '<div class="db-card-top">' +
        '<span class="priority-tag ' + task.priority + '">' + pLabel + '</span>' +
        '<span class="db-mt-status ' + statusCls + '">' + statusLabel + '</span>' +
      '</div>' +

      /* Başlık */
      '<div class="db-card-title" style="margin:8px 0">' + escHtml(task.title) + '</div>' +

      /* Açıklama */
      (task.desc ? '<div class="db-mytask-desc">' + escHtml(task.desc.substring(0, 100)) + (task.desc.length > 100 ? '...' : '') + '</div>' : '') +

      /* İlerleme barı (devam ediyorsa) */
      (task.status === 'inprogress' && task.progress > 0
        ? '<div class="db-card-progress" style="margin-bottom:8px">' +
            '<div class="db-card-prog-bar"><div class="db-card-prog-fill" style="width:' + task.progress + '%"></div></div>' +
            '<span class="db-card-prog-label">%' + task.progress + '</span>' +
          '</div>'
        : '') +

      /* Meta: tarih + proje */
      '<div class="db-card-meta" style="margin-top:6px;flex-wrap:wrap;gap:6px">' +
        dateHtml +
        (proj ? '<span class="db-proj-badge db-proj-' + proj.color + '">' + escHtml(proj.name) + '</span>' : '') +
      '</div>' +

      /* Aksiyon butonları */
      '<div class="db-mytask-actions">' +
        '<button class="db-card-btn" style="opacity:1" onclick="openEditDrawer(\'' + task.id + '\')">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
          ' Düzenle' +
        '</button>' +
        (task.status === 'done'
          ? '<button class="db-card-btn" style="opacity:1" onclick="openReviewModal(\'' + task.id + '\')">' +
              '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' +
              ' Review' +
            '</button>'
          : '') +
        (task.status === 'done'
          ? '<button class="btn-ghost" style="font-size:12px;padding:5px 10px" onclick="archiveTask(\'' + task.id + '\')">' +
              '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/></svg>' +
              ' Arşivle (PM)' +
            '</button>'
          : '') +
      '</div>' +

    '</div>';
  });

  html += '</div>';
  list.innerHTML = html;
}

/* ── NOTIFICATIONS ────────────────────────────── */
function addNotif(text, type) {
  notifications.unshift({
    id: Date.now().toString(),
    text: text,
    type: type || 'info',
    time: Date.now(),
    read: false
  });
  if (notifications.length > 50) notifications.pop();
  localStorage.setItem('priorvia_notifs', JSON.stringify(notifications));
  updateNotifBadge();
}

function clearNotifs() {
  notifications = [];
  localStorage.setItem('priorvia_notifs', JSON.stringify(notifications));
  updateNotifBadge();
  renderNotificationsFull();
}

function markNotifRead(id) {
  notifications = notifications.map(function(n){ return n.id===id ? Object.assign({},n,{read:true}) : n; });
  localStorage.setItem('priorvia_notifs', JSON.stringify(notifications));
  updateNotifBadge();
  renderNotificationsFull();
}

function updateNotifBadge() {
  var today = new Date(); today.setHours(0,0,0,0);
  var tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
  var urgent = tasks.filter(function(t){ return t.date && t.status !== 'done' && new Date(t.date) <= tomorrow; });
  var unread = notifications.filter(function(n){ return !n.read; }).length;
  var total = urgent.length + unread;

  setText('notifBadge', total > 0 ? total : 0);
  var dot = document.getElementById('notifDot');
  if (dot) dot.style.display = total > 0 ? 'block' : 'none';
  setText('notifDropCount', total);

  var notifList = document.getElementById('notifList');
  if (!notifList) return;

  var allNotifs = [];
  urgent.forEach(function(t) {
    var d = new Date(t.date); var today2 = new Date(); today2.setHours(0,0,0,0);
    var ov = d < today2;
    allNotifs.push({ text: (ov ? '⚠ Gecikmiş: ' : '⏰ Yaklaşan: ') + t.title, type: ov ? 'warn' : 'info', time: Date.now() });
  });
  notifications.filter(function(n){ return !n.read; }).slice(0,5).forEach(function(n){ allNotifs.push(n); });

  if (allNotifs.length === 0) {
    notifList.innerHTML = '<p class="db-empty-sm">Henüz bildirim yok.</p>';
    return;
  }

  var typeIcon = {
    new:     { icon: '✦', cls: 'db-ni-green' },
    update:  { icon: '✎', cls: 'db-ni-blue' },
    warn:    { icon: '⚠', cls: 'db-ni-orange' },
    archive: { icon: '▦', cls: 'db-ni-purple' },
    info:    { icon: 'ℹ', cls: 'db-ni-blue' }
  };

  notifList.innerHTML = allNotifs.slice(0,8).map(function(n) {
    var ti = typeIcon[n.type] || typeIcon.info;
    return '<div class="db-notif-item unread">' +
      '<div class="db-notif-icon ' + ti.cls + '">' + ti.icon + '</div>' +
      '<div><div class="db-notif-title">' + escHtml(n.text) + '</div>' +
      '<div class="db-notif-time">' + timeAgo(n.time) + '</div></div></div>';
  }).join('');
}

function renderNotificationsFull() {
  var list = document.getElementById('notifFullList');
  if (!list) return;

  var today = new Date(); today.setHours(0,0,0,0);
  var tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
  var urgentTasks = tasks.filter(function(t){ return t.date && t.status !== 'done' && new Date(t.date) <= tomorrow; });

  var allNotifs = [];
  urgentTasks.forEach(function(t) {
    var d = new Date(t.date); var tod = new Date(); tod.setHours(0,0,0,0);
    var ov = d < tod;
    allNotifs.push({ id: 'task_' + t.id, text: (ov ? 'Gecikmiş görev: ' : 'Yaklaşan teslim: ') + t.title + ' — ' + formatDate(d), type: ov?'warn':'info', time: Date.now(), read: false });
  });
  notifications.forEach(function(n){ allNotifs.push(n); });

  if (allNotifs.length === 0) {
    list.innerHTML = '<div class="db-empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><p>Bildirim yok.</p></div>';
    return;
  }

  var typeIcon  = { new:'✦', update:'✎', warn:'⚠', archive:'▦', info:'ℹ' };
  var typeCls   = { new:'db-ni-green', update:'db-ni-blue', warn:'db-ni-orange', archive:'db-ni-purple', info:'db-ni-blue' };
  var typeLabel = { new:'Yeni', update:'Güncelleme', warn:'Uyarı', archive:'Arşiv', info:'Bilgi' };

  list.innerHTML = '<div class="db-notif-full-grid">' + allNotifs.map(function(n) {
    var ti = typeIcon[n.type] || 'ℹ';
    var tc = typeCls[n.type] || 'db-ni-blue';
    var tl = typeLabel[n.type] || 'Bilgi';
    return '<div class="db-notif-full-row' + (n.read?'':' unread') + '" onclick="markNotifRead(\'' + n.id + '\')">' +
      '<div class="db-notif-icon ' + tc + '" style="width:36px;height:36px;font-size:16px">' + ti + '</div>' +
      '<div style="flex:1">' +
        '<div class="db-notif-title">' + escHtml(n.text) + '</div>' +
        '<div style="display:flex;gap:8px;margin-top:3px">' +
          '<span class="db-role-badge" style="background:var(--green-100);color:var(--green-700)">' + tl + '</span>' +
          '<span class="db-notif-time">' + timeAgo(n.time) + '</span>' +
        '</div>' +
      '</div>' +
      (!n.read ? '<div class="db-unread-dot"></div>' : '') +
    '</div>';
  }).join('') + '</div>';
}

/* ── CALENDAR ─────────────────────────────────── */
function initCalendar() {
  var monthNames = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

  var mSel = document.getElementById('calMonthSelect');
  monthNames.forEach(function(name, i) {
    var opt = document.createElement('option');
    opt.value = i;
    opt.textContent = name;
    mSel.appendChild(opt);
  });

  var ySel = document.getElementById('calYearSelect');
  var currentYear = new Date().getFullYear();
  for (var y = currentYear - 5; y <= currentYear + 5; y++) {
    var opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    ySel.appendChild(opt);
  }

  mSel.value = calDate.getMonth();
  ySel.value = calDate.getFullYear();

  mSel.addEventListener('change', function() {
    calDate.setMonth(parseInt(this.value));
    renderCalendar();
  });
  ySel.addEventListener('change', function() {
    calDate.setFullYear(parseInt(this.value));
    renderCalendar();
  });

  document.getElementById('calPrev').addEventListener('click', function() {
    calDate.setMonth(calDate.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById('calNext').addEventListener('click', function() {
    calDate.setMonth(calDate.getMonth() + 1);
    renderCalendar();
  });
}

function renderCalendar() {
  var grid = document.getElementById('calendarGrid');
  if (!grid) return;

  var year = calDate.getFullYear();
  var month = calDate.getMonth();
  var monthNames = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  var dayNames = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];

  var mSel = document.getElementById('calMonthSelect');
  var ySel = document.getElementById('calYearSelect');
  if (mSel) mSel.value = month;
  if (ySel) {
    if (!ySel.querySelector('option[value="' + year + '"]')) {
      var opt = document.createElement('option');
      opt.value = year; opt.textContent = year;
      ySel.appendChild(opt);
      var opts = Array.from(ySel.options).sort(function(a,b){ return a.value - b.value; });
      ySel.innerHTML = '';
      opts.forEach(function(o){ ySel.appendChild(o); });
    }
    ySel.value = year;
  }

  setText('calendarMonthLabel', monthNames[month] + ' ' + year);

  var firstDay = new Date(year, month, 1).getDay();
  var startOffset = (firstDay === 0) ? 6 : firstDay - 1;
  var daysInMonth = new Date(year, month + 1, 0).getDate();

  var today = new Date();
  today.setHours(0,0,0,0);

  var tasksByDate = {};
  tasks.forEach(function(t) {
    if (!t.date) return;
    var d = new Date(t.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      var key = d.getDate();
      if (!tasksByDate[key]) tasksByDate[key] = [];
      tasksByDate[key].push(t);
    }
  });

  var html = '<div class="db-cal-daynames">';
  dayNames.forEach(function(d){ html += '<div class="db-cal-dayname">' + d + '</div>'; });
  html += '</div><div class="db-cal-grid">';

  for (var i = 0; i < startOffset; i++) {
    html += '<div class="db-cal-cell db-cal-empty"></div>';
  }

  for (var day = 1; day <= daysInMonth; day++) {
    var dayTasks = tasksByDate[day] || [];
    var cellDate = new Date(year, month, day);
    var isToday = cellDate.getTime() === today.getTime();
    var cls = 'db-cal-cell' + (isToday ? ' db-cal-today' : '') + (dayTasks.length > 0 ? ' db-cal-has-tasks' : '');

    html += '<div class="' + cls + '">';
    html += '<span class="db-cal-day-num' + (isToday ? ' today-num' : '') + '">' + day + '</span>';

    dayTasks.slice(0,3).forEach(function(t) {
      var color = { high:'#ef4444', med:'#f59e0b', low:'#22c55e' }[t.priority] || '#94a3b8';
      html += '<div class="db-cal-task-dot" style="border-left:3px solid ' + color + '" title="' + escHtml(t.title) + '">' +
        escHtml(t.title.substring(0,22)) + (t.title.length>22?'...':'') + '</div>';
    });
    if (dayTasks.length > 3) {
      html += '<div class="db-cal-more">+' + (dayTasks.length-3) + ' daha</div>';
    }
    html += '</div>';
  }

  html += '</div>';
  grid.innerHTML = html;
}

/* ── RENDER KANBAN ────────────────────────────── */
function render() {
  var priority = (document.getElementById('filterPriority')||{}).value || '';
  var assignee = (document.getElementById('filterAssignee')||{}).value || '';
  var filtered = tasks.slice();
  if (priority) filtered = filtered.filter(function(t){ return t.priority === priority; });
  if (assignee) filtered = filtered.filter(function(t){ return t.assignee === assignee; });

  ['todo','inprogress','done'].forEach(function(col) {
    var list  = document.getElementById('list-' + col);
    var empty = document.getElementById('empty-' + col);
    var count = document.getElementById('cnt-' + col);
    if (!list) return;
    var colTasks = filtered.filter(function(t){ return t.status === col; });
    if (count) count.textContent = colTasks.length;
    list.querySelectorAll('.db-task-card').forEach(function(el){ el.remove(); });
    if (colTasks.length === 0) { if (empty) empty.style.display = 'block'; }
    else { if (empty) empty.style.display = 'none'; colTasks.forEach(function(task){ list.appendChild(buildCard(task)); }); }
  });

  updateStats();
  updateAssigneeFilter();
  updateAlerts();
  renderActivity();
  updateNotifBadge();
}

function buildCard(task) {
  var card = document.createElement('div');
  card.className = 'db-task-card' + (task.status === 'done' ? ' db-card-done' : '');
  card.dataset.id       = task.id;
  card.dataset.priority = task.priority;
  card.draggable = true;
  card.addEventListener('dragstart', function(){ dragId = task.id; });

  var pLabel = { high:'YÜKSEK', med:'ORTA', low:'DÜŞÜK' }[task.priority] || '';

  var progressHTML = '';
  if (task.status === 'inprogress' && task.progress > 0) {
    progressHTML = '<div class="db-card-progress"><div class="db-card-prog-bar"><div class="db-card-prog-fill" style="width:' + task.progress + '%"></div></div><span class="db-card-prog-label">%' + task.progress + '</span></div>';
  }
  var dateHTML = '';
  if (task.date) {
    var d = new Date(task.date);
    var today = new Date(); today.setHours(0,0,0,0);
    var isOverdue = d < today && task.status !== 'done';
    dateHTML = '<span class="db-card-date' + (isOverdue ? ' overdue' : '') + '"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' + formatDate(d) + (isOverdue ? ' ⚠' : '') + '</span>';
  }

  var proj = projects.find(function(p){ return p.id === task.projectId; });
  var projHTML = proj ? '<span class="db-proj-badge db-proj-' + proj.color + '">' + escHtml(proj.name.substring(0,12)) + '</span>' : '';
  var assigneeHTML = task.assignee ? '<span class="db-card-assignee">' + escHtml(initials(task.assignee)) + '</span>' : '';
  var archiveBtn = task.status === 'done'
    ? '<button class="db-card-btn" title="Arşivle (PM)" onclick="archiveTask(\'' + task.id + '\')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/></svg></button>'
    : '';

  card.innerHTML =
    '<div class="db-card-top"><span class="priority-tag ' + task.priority + '">' + pLabel + '</span>' +
    '<div class="db-card-actions">' + archiveBtn +
      '<button class="db-card-btn" title="Düzenle" onclick="openEditDrawer(\'' + task.id + '\')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>' +
      '<button class="db-card-btn danger" title="Sil" onclick="deleteTask(\'' + task.id + '\')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>' +
    '</div></div>' +
    '<div class="db-card-title">' + escHtml(task.title) + '</div>' +
    progressHTML +
    '<div class="db-card-meta">' + dateHTML + '<div style="display:flex;gap:4px;align-items:center">' + projHTML + assigneeHTML + '</div></div>';

  return card;
}

/* ── DRAG & DROP ──────────────────────────────── */
function onDrop(e, col) {
  e.preventDefault();
  if (!dragId) return;
  var task = tasks.find(function(t){ return t.id === dragId; });
  tasks = tasks.map(function(t){ return t.id === dragId ? Object.assign({}, t, {status: col}) : t; });
  if (task) {
    addActivity('"' + task.title + '" → ' + colLabel(col), 'blue');
    if (col === 'done') addNotif('"' + task.title + '" tamamlandı — PM onayı bekliyor', 'warn');
  }
  dragId = null;
  persist();
  render();
  showSaveBar('Görev taşındı.');
}

/* ── DELETE ───────────────────────────────────── */
function deleteTask(id) {
  var task = tasks.find(function(t){ return t.id === id; });
  if (!task) return;
  if (!confirm('"' + task.title + '" silinecek. Emin misiniz?')) return;
  tasks = tasks.filter(function(t){ return t.id !== id; });
  addActivity('"' + task.title + '" silindi', 'orange');
  persist();
  render();
  showSaveBar('Görev silindi.');
}

/* ── STATS ────────────────────────────────────── */
function updateStats() {
  var total  = tasks.length;
  var inprog = tasks.filter(function(t){ return t.status === 'inprogress'; }).length;
  var done   = tasks.filter(function(t){ return t.status === 'done'; }).length;
  var rate   = total > 0 ? Math.round((done / total) * 100) : 0;
  setText('statTotal', total); setText('statInProgress', inprog);
  setText('statDone', done);   setText('statRate', '%' + rate);
  var bar = document.getElementById('miniProgressFill');
  if (bar) bar.style.width = rate + '%';
}

/* ── ALERTS ───────────────────────────────────── */
function updateAlerts() {
  var list = document.getElementById('alertList');
  if (!list) return;
  var today = new Date(); today.setHours(0,0,0,0);
  var tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
  var urgent = tasks.filter(function(t){ return t.date && t.status !== 'done' && new Date(t.date) <= tomorrow; });
  if (urgent.length === 0) { list.innerHTML = '<p class="db-empty-sm">Yaklaşan teslim tarihi yok.</p>'; return; }
  list.innerHTML = urgent.map(function(t) {
    var d = new Date(t.date); var today2 = new Date(); today2.setHours(0,0,0,0);
    var ov = d < today2;
    return '<div class="db-alert-item"><div class="db-alert-dot ' + (ov?'db-dot-red':'db-dot-orange') + '"></div>' +
      '<div><div class="db-alert-title">' + escHtml(t.title) + '</div>' +
      '<div class="db-alert-sub">Teslim: <strong>' + formatDate(d) + '</strong>' + (ov?' — gecikmiş':'') + '</div></div></div>';
  }).join('');
}

/* ── ACTIVITY ─────────────────────────────────── */
function addActivity(text, color) {
  var now = Date.now();
  activities.unshift({ text: text, color: color||'green', time: now });
  /* 48 saatten eski kayıtları sil */
  var limit48h = now - (48 * 60 * 60 * 1000);
  activities = activities.filter(function(a){ return a.time > limit48h; });
  if (activities.length > 50) activities = activities.slice(0, 50);
  localStorage.setItem('priorvia_activity', JSON.stringify(activities));
}

function cleanOldActivities() {
  var limit48h = Date.now() - (48 * 60 * 60 * 1000);
  var before = activities.length;
  activities = activities.filter(function(a){ return a.time > limit48h; });
  if (activities.length !== before) {
    localStorage.setItem('priorvia_activity', JSON.stringify(activities));
  }
}
function renderActivity() {
  var list = document.getElementById('activityList');
  if (!list) return;
  cleanOldActivities();
  if (activities.length === 0) {
    list.innerHTML = '<p class="db-empty-sm">Henüz aktivite yok.</p>';
    return;
  }
  list.innerHTML = activities.slice(0,8).map(function(a) {
    var ageHours = (Date.now() - a.time) / 3600000;
    var expiring = ageHours > 40; /* 40+ saat ise soluk göster */
    return '<div class="db-activity-item' + (expiring ? ' db-act-expiring' : '') + '">' +
      '<div class="db-act-dot db-act-' + a.color + '"></div>' +
      '<div style="flex:1"><div style="font-size:12.5px;color:var(--text-primary)">' + escHtml(a.text) + '</div>' +
      '<div class="db-act-time">' + timeAgo(a.time) + ' · 48s içinde silinir</div></div>' +
    '</div>';
  }).join('');
}

/* ── ASSIGNEE FILTER ──────────────────────────── */
function updateAssigneeFilter() {
  var select = document.getElementById('filterAssignee');
  if (!select) return;
  var current = select.value;
  var names = [];
  tasks.forEach(function(t){ if (t.assignee && names.indexOf(t.assignee) === -1) names.push(t.assignee); });
  select.innerHTML = '<option value="">Tüm Kişiler</option>' +
    names.map(function(n){ return '<option value="' + escHtml(n) + '"' + (n===current?' selected':'') + '>' + escHtml(n) + '</option>'; }).join('');
}

/* ── FILTERS ──────────────────────────────────── */
function initFilters() {
  var fp = document.getElementById('filterPriority');
  var fa = document.getElementById('filterAssignee');
  var gs = document.getElementById('globalSearch');
  if (fp) fp.addEventListener('change', render);
  if (fa) fa.addEventListener('change', render);
  if (gs) gs.addEventListener('input', function(e) {
    var q = e.target.value.toLowerCase();
    document.querySelectorAll('.db-task-card').forEach(function(card) {
      var title = (card.querySelector('.db-card-title')||{}).textContent || '';
      card.style.display = title.toLowerCase().includes(q) ? '' : 'none';
    });
  });
}

/* ── TEAM RENDER ──────────────────────────────── */
function initInviteDrawer() {
  var inviteBtn = document.getElementById('inviteBtn');
  if (inviteBtn) inviteBtn.addEventListener('click', openInviteDrawer);
  document.getElementById('inviteDrawerClose').addEventListener('click', closeInviteDrawer);
  document.getElementById('inviteCancel').addEventListener('click', closeInviteDrawer);
  document.getElementById('inviteSave').addEventListener('click', saveInvite);
}
function openInviteDrawer() {
  document.getElementById('inviteName').value  = '';
  document.getElementById('inviteEmail').value = '';
  document.getElementById('inviteRole').value  = 'member';
  document.getElementById('inviteDrawer').classList.add('open');
  document.getElementById('dbOverlay').classList.add('open');
  document.getElementById('inviteName').focus();
}
function closeInviteDrawer() {
  document.getElementById('inviteDrawer').classList.remove('open');
  document.getElementById('dbOverlay').classList.remove('open');
}
function saveInvite() {
  var name   = document.getElementById('inviteName').value.trim();
  var email  = document.getElementById('inviteEmail').value.trim();
  var phone  = document.getElementById('invitePhone').value.trim();
  var github = document.getElementById('inviteGithub').value.trim();
  var role   = document.getElementById('inviteRole').value;
  if (!name) { alert('Ad Soyad zorunludur.'); return; }
  var member = { id: Date.now().toString(), name: name, email: email, phone: phone, github: github, role: role, joinedAt: new Date().toISOString() };
  teamMembers.push(member);
  localStorage.setItem('priorvia_team', JSON.stringify(teamMembers));
  addActivity('"' + name + '" ekibe davet edildi', 'blue');
  addNotif('"' + name + '" ekibe katıldı', 'new');
  renderTeam();
  closeInviteDrawer();
  showSaveBar('Davet gönderildi.');
}

function renderTeam() {
  var list = document.getElementById('teamMemberList');
  if (!list) return;
  var pms = teamMembers.filter(function(m){ return m.role === 'pm'; }).length;
  var members = teamMembers.filter(function(m){ return m.role === 'member'; }).length;
  setText('teamTotalCount', teamMembers.length);
  setText('teamPMCount', pms);
  setText('teamMemberCount', members);

  if (teamMembers.length === 0) {
    list.innerHTML = '<p class="db-empty-sm" style="padding:24px 0">Henüz üye eklenmedi. "Üye Davet Et" butonunu kullanın.</p>';
    return;
  }
  var roleLabel = { pm:'Proje Yöneticisi', member:'Ekip Üyesi', viewer:'Görüntüleyici' };
  var roleCls   = { pm:'db-role-pm', member:'db-role-member', viewer:'db-role-viewer' };
  var html = '<table class="db-team-table"><thead><tr><th>Üye</th><th>Rol</th><th>Görev Sayısı</th><th>Katılım</th><th></th></tr></thead><tbody>';
  teamMembers.forEach(function(m) {
    var taskCount = tasks.filter(function(t){ return t.assignee && t.assignee.toLowerCase() === m.name.toLowerCase(); }).length;
    var ini = m.name.split(' ').map(function(w){ return w[0]||''; }).join('').toUpperCase().slice(0,2);
    var joined = new Date(m.joinedAt).toLocaleDateString('tr-TR', {day:'numeric',month:'short',year:'numeric'});
    html += '<tr><td><div class="db-member-cell"><div class="db-team-avatar">' + escHtml(ini) + '</div>' +
      '<div><div class="db-member-name db-member-clickable" onclick="openMemberProfile(\'' + m.id + '\')" title="Profili Gör">' + escHtml(m.name) + '</div>' +
      (m.email?'<div class="db-member-email">'+escHtml(m.email)+'</div>':'') + '</div></div></td>' +
      '<td><span class="db-role-badge ' + (roleCls[m.role]||'db-role-member') + '">' + (roleLabel[m.role]||m.role) + '</span></td>' +
      '<td>' + taskCount + ' görev</td><td>' + joined + '</td>' +
      '<td><button class="db-remove-btn" onclick="removeMember(\'' + m.id + '\')" title="Üyeyi Çıkar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button></td></tr>';
  });
  html += '</tbody></table>';
  list.innerHTML = html;
}

function removeMember(id) {
  var m = teamMembers.find(function(x){ return x.id === id; });
  if (!m) return;
  if (!confirm('"' + m.name + '" ekipten çıkarılacak. Emin misiniz?')) return;
  teamMembers = teamMembers.filter(function(x){ return x.id !== id; });
  localStorage.setItem('priorvia_team', JSON.stringify(teamMembers));
  addActivity('"' + m.name + '" ekipten çıkarıldı', 'orange');
  renderTeam();
  showSaveBar('Üye çıkarıldı.');
}

/* ── PROFİL MODAL ─────────────────────────────── */
var profileModalMode = 'view';

function openMyProfile() {
  var profile = getMyProfile();
  var ini = profile.name.split(' ').map(function(w){ return w[0]||''; }).join('').toUpperCase().slice(0,2);
  var myTasks    = tasks.filter(function(t){ return t.assignee && t.assignee.toLowerCase() === profile.name.toLowerCase(); });
  var myDone     = myTasks.filter(function(t){ return t.status === 'done'; }).length;
  var myProjects = projects.filter(function(p){ return p.members && p.members.length > 0; }).length;

  setText('prfModalTitle', 'Profilim');
  setText('prfViewAvatar', ini); setText('prfEditAvatar', ini);
  setText('prfViewName', profile.name);
  setText('prfViewRole', 'Proje Yöneticisi');
  setText('prfViewEmail', profile.email || 'Belirtilmedi');
  setText('prfViewPhone', profile.phone || 'Belirtilmedi');
  setText('prfStatTasks', myTasks.length);
  setText('prfStatDone', myDone);
  setText('prfStatProjects', myProjects);

  var ghEl = document.getElementById('prfViewGithub');
  if (ghEl) { ghEl.textContent = profile.github || 'Belirtilmedi'; ghEl.href = profile.github || '#'; }

  document.getElementById('prfViewMode').style.display = '';
  document.getElementById('prfEditMode').style.display = 'none';
  document.getElementById('prfEditBtn').style.display  = '';
  document.getElementById('prfEditBtn').innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Düzenle';
  document.getElementById('prfEditBtn').onclick = toggleProfileEdit;

  profileModalMode = 'view';
  document.getElementById('prfModal').classList.add('open');
  document.getElementById('prfOverlay').classList.add('open');
}

function openMemberProfile(id) {
  var m = teamMembers.find(function(x){ return x.id === id; });
  if (!m) return;
  var roleLabel = { pm:'Proje Yöneticisi', member:'Ekip Üyesi', viewer:'Görüntüleyici' };
  var ini = m.name.split(' ').map(function(w){ return w[0]||''; }).join('').toUpperCase().slice(0,2);
  var mTasks    = tasks.filter(function(t){ return t.assignee && t.assignee.toLowerCase() === m.name.toLowerCase(); });
  var mDone     = mTasks.filter(function(t){ return t.status === 'done'; }).length;
  var mProjects = projects.filter(function(p){ return p.members && p.members.indexOf(m.id) !== -1; }).length;

  setText('prfModalTitle', m.name + ' — Profil');
  setText('prfViewAvatar', ini);
  setText('prfViewName', m.name);
  setText('prfViewRole', roleLabel[m.role] || m.role);
  setText('prfViewEmail', m.email || 'Belirtilmedi');
  setText('prfViewPhone', m.phone || 'Belirtilmedi');
  setText('prfStatTasks', mTasks.length);
  setText('prfStatDone', mDone);
  setText('prfStatProjects', mProjects);

  var ghEl = document.getElementById('prfViewGithub');
  if (ghEl) { ghEl.textContent = m.github || 'Belirtilmedi'; ghEl.href = m.github || '#'; }

  document.getElementById('prfViewMode').style.display = '';
  document.getElementById('prfEditMode').style.display = 'none';
  document.getElementById('prfEditBtn').style.display  = 'none';

  document.getElementById('prfModal').classList.add('open');
  document.getElementById('prfOverlay').classList.add('open');
}

function toggleProfileEdit() {
  var profile = getMyProfile();
  var isEdit = document.getElementById('prfEditMode').style.display !== 'none';

  if (!isEdit) {
    document.getElementById('prfName').value   = profile.name   || '';
    document.getElementById('prfEmail').value  = profile.email  || '';
    document.getElementById('prfPhone').value  = profile.phone  || '';
    document.getElementById('prfGithub').value = profile.github || '';
    var ini = (profile.name||'').split(' ').map(function(w){ return w[0]||''; }).join('').toUpperCase().slice(0,2);
    setText('prfEditAvatar', ini);
    document.getElementById('prfViewMode').style.display = 'none';
    document.getElementById('prfEditMode').style.display = '';
    document.getElementById('prfEditBtn').innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Kaydet';
    document.getElementById('prfEditBtn').onclick = saveProfileFromModal;
  }
}

function saveProfileFromModal() {
  var name = document.getElementById('prfName').value.trim();
  if (!name) { alert('Ad Soyad zorunludur.'); return; }
  var data = {
    name:   name,
    email:  document.getElementById('prfEmail').value.trim(),
    phone:  document.getElementById('prfPhone').value.trim(),
    github: document.getElementById('prfGithub').value.trim()
  };
  saveMyProfile(data);
  var ini = name.split(' ').map(function(w){ return w[0]||''; }).join('').toUpperCase().slice(0,2);
  setText('prfViewAvatar', ini);
  setText('prfViewName', name);
  setText('prfViewEmail', data.email || 'Belirtilmedi');
  setText('prfViewPhone', data.phone || 'Belirtilmedi');
  var ghEl = document.getElementById('prfViewGithub');
  if (ghEl) { ghEl.textContent = data.github || 'Belirtilmedi'; ghEl.href = data.github || '#'; }
  document.getElementById('prfViewMode').style.display = '';
  document.getElementById('prfEditMode').style.display = 'none';
  document.getElementById('prfEditBtn').innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Düzenle';
  document.getElementById('prfEditBtn').onclick = toggleProfileEdit;
  showSaveBar('Profil güncellendi.');
}

function closeProfileModal() {
  document.getElementById('prfModal').classList.remove('open');
  document.getElementById('prfOverlay').classList.remove('open');
}

/* ── PROFİLİM VIEW ────────────────────────────── */
function renderMyProfile() {
  var profile = getMyProfile();
  var roleLabels = { pm:'Proje Yöneticisi', member:'Ekip Üyesi', viewer:'Görüntüleyici' };
  var roleLabel  = roleLabels[profile.role] || profile.title || 'Proje Yöneticisi';
  var ini = (profile.name || '?').split(' ').map(function(w){ return w[0]||''; }).join('').toUpperCase().slice(0,2) || '?';

  /* ── Sol panel ── */
  setText('mprfAvatarDisp', ini);
  setText('mprfNameDisp',   profile.name || '—');

  var badgeEl = document.querySelector('#viewMyprofile .mprf-badge');
  if (badgeEl) badgeEl.textContent = roleLabel;

  setText('mprfListName',  profile.name  || '—');
  setText('mprfListEmail', profile.email || '—');
  setText('mprfListPhone', profile.phone || '—');

  var ghEl = document.getElementById('mprfListGithub');
  if (ghEl) {
    ghEl.textContent = profile.github || '—';
    ghEl.href        = profile.github || '#';
  }

  /* ── Sağ panel: formu doldur ── */
  var nameEl   = document.getElementById('mprfName');
  var emailEl  = document.getElementById('mprfEmail');
  var phoneEl  = document.getElementById('mprfPhone');
  var githubEl = document.getElementById('mprfGithub');
  if (nameEl)   nameEl.value   = profile.name   || '';
  if (emailEl)  emailEl.value  = profile.email  || '';
  if (phoneEl)  phoneEl.value  = profile.phone  || '';
  if (githubEl) githubEl.value = profile.github || '';
}

function saveMyProfileFromView() {
  var nameEl = document.getElementById('mprfName');
  if (!nameEl) return;
  var name = nameEl.value.trim();
  if (!name) { alert('Ad Soyad zorunludur.'); return; }

  var existing = getMyProfile();
  var data = {
    name:   name,
    email:  (document.getElementById('mprfEmail')  || {}).value.trim() || '',
    phone:  (document.getElementById('mprfPhone')  || {}).value.trim() || '',
    github: (document.getElementById('mprfGithub') || {}).value.trim() || '',
    role:   existing.role  || 'pm',
    title:  existing.title || 'Proje Yöneticisi'
  };

  /* localStorage'a kaydet */
  localStorage.setItem('priorvia_myprofile', JSON.stringify(data));
  currentUser = data.name;
  localStorage.setItem('priorvia_user', data.name);

  /* Sidebar'ı güncelle */
  updateUserInfo();

  /* Sol paneli kayıt sonrası güncelle */
  var ini = name.split(' ').map(function(w){ return w[0]||''; }).join('').toUpperCase().slice(0,2) || '?';
  setText('mprfAvatarDisp', ini);
  setText('mprfNameDisp', name);
  setText('mprfListName', name);
  setText('mprfListEmail', data.email || '—');
  setText('mprfListPhone', data.phone || '—');
  var ghEl = document.getElementById('mprfListGithub');
  if (ghEl) {
    ghEl.textContent = data.github || '—';
    ghEl.href = data.github || '#';
  }

  showSaveBar('Profil güncellendi.');
}

/* ── WELCOME ──────────────────────────────────── */
function updateWelcome() {
  var h = new Date().getHours();
  setText('welcomeMsg', (h<12?'Günaydın':h<18?'İyi günler':'İyi akşamlar') + ', ' + currentUser.split(' ')[0] + ' 👋');
}

/* ── PERSIST ──────────────────────────────────── */
function persist() { localStorage.setItem('priorvia_tasks', JSON.stringify(tasks)); }

/* ── SAVE BAR ─────────────────────────────────── */
var saveBarTimer = null;
function showSaveBar(msg) {
  var bar = document.getElementById('saveBar');
  document.getElementById('saveBarMsg').textContent = msg || 'Değişiklikler kaydedildi.';
  bar.classList.add('show');
  clearTimeout(saveBarTimer);
  saveBarTimer = setTimeout(function(){ bar.classList.remove('show'); }, 2600);
}

/* ── HELPERS ──────────────────────────────────── */
function setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
function escHtml(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function initials(name) { return String(name).split(' ').map(function(w){ return w[0]||''; }).join('').toUpperCase().slice(0,2); }
function colLabel(col) { return {todo:'Yapılacak',inprogress:'Devam Ediyor',done:'Tamamlandı'}[col]||col; }
function formatDate(d) {
  var today = new Date(); today.setHours(0,0,0,0);
  var tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
  var dd = new Date(d); dd.setHours(0,0,0,0);
  if (dd.getTime()===today.getTime()) return 'Bugün';
  if (dd.getTime()===tomorrow.getTime()) return 'Yarın';
  return dd.toLocaleDateString('tr-TR',{day:'numeric',month:'short'});
}
function timeAgo(ts) {
  var diff = Date.now()-ts;
  if (diff<60000) return 'Az önce';
  if (diff<3600000) return Math.floor(diff/60000)+' dk önce';
  if (diff<86400000) return Math.floor(diff/3600000)+' saat önce';
  return Math.floor(diff/86400000)+' gün önce';
}
/* ================================================
   AYARLAR — settings.js — dashboard.js sonuna ekle
   ================================================ */

/* ── Sekme Geçişi ─────────────────────────────── */
function sttTab(btn, tabId) {
  document.querySelectorAll('.stt-nav-item').forEach(function(b){ b.classList.remove('active'); });
  document.querySelectorAll('.stt-tab').forEach(function(t){ t.style.display = 'none'; });
  btn.classList.add('active');
  var tab = document.getElementById('stt-' + tabId);
  if (tab) tab.style.display = '';
}

/* ── Profil Yükle / Kaydet ────────────────────── */
function sttLoadProfile() {
  var p = getMyProfile();
  var ini = p.name.split(' ').map(function(w){ return w[0]||''; }).join('').toUpperCase().slice(0,2);
  var nameEl   = document.getElementById('sttName');
  var emailEl  = document.getElementById('sttEmail');
  var phoneEl  = document.getElementById('sttPhone');
  var ghEl     = document.getElementById('sttGithub');
  var avEl     = document.getElementById('sttAvatar');
  var anEl     = document.getElementById('sttAvatarName');
  var titleEl  = document.getElementById('sttTitle');
  var roleEl   = document.getElementById('sttRoleSelect');
  if (nameEl)  nameEl.value  = p.name   || '';
  if (emailEl) emailEl.value = p.email  || '';
  if (phoneEl) phoneEl.value = p.phone  || '';
  if (ghEl)    ghEl.value    = p.github || '';
  if (avEl)    avEl.textContent = ini || '?';
  if (anEl)    anEl.textContent = p.name || '—';
  if (titleEl) titleEl.value = p.title  || 'Proje Yöneticisi';
  if (roleEl)  roleEl.value  = p.role   || 'pm';
}

function sttSaveProfile() {
  var nameEl = document.getElementById('sttName');
  if (!nameEl) return;
  var name = nameEl.value.trim();
  if (!name) { alert('Ad Soyad zorunludur.'); return; }
  var titleEl = document.getElementById('sttTitle');
  var roleEl  = document.getElementById('sttRoleSelect');
  var data = {
    name:   name,
    email:  (document.getElementById('sttEmail')  || {}).value || '',
    phone:  (document.getElementById('sttPhone')  || {}).value || '',
    github: (document.getElementById('sttGithub') || {}).value || '',
    title:  titleEl  ? titleEl.value.trim()  : '',
    role:   roleEl   ? roleEl.value          : 'pm'
  };
  saveMyProfile(data);
  sttLoadProfile();
  showSaveBar('Profil güncellendi.');
}

/* ── Şifre Değiştir (simüle) ──────────────────── */
function sttChangePassword() {
  var old  = (document.getElementById('sttOldPw')  || {}).value || '';
  var nw   = (document.getElementById('sttNewPw')  || {}).value || '';
  var nw2  = (document.getElementById('sttNewPw2') || {}).value || '';
  if (!old || !nw || !nw2) { alert('Tüm şifre alanlarını doldurun.'); return; }
  if (nw !== nw2) { alert('Yeni şifreler eşleşmiyor.'); return; }
  if (nw.length < 6) { alert('Şifre en az 6 karakter olmalıdır.'); return; }
  document.getElementById('sttOldPw').value  = '';
  document.getElementById('sttNewPw').value  = '';
  document.getElementById('sttNewPw2').value = '';
  showSaveBar('Şifre güncellendi.');
}

/* ── Tema Uygula ──────────────────────────────── */
function sttApplyTheme(val) {
  if (val === 'dark') {
    darkMode = true;
    document.body.classList.add('dark-mode');
    setThemeIcon(true);
  } else if (val === 'light') {
    darkMode = false;
    document.body.classList.remove('dark-mode');
    setThemeIcon(false);
  } else {
    // system
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    darkMode = prefersDark;
    document.body.classList.toggle('dark-mode', prefersDark);
    setThemeIcon(prefersDark);
  }
  localStorage.setItem('priorvia_dark', darkMode ? '1' : '0');
  localStorage.setItem('priorvia_theme_mode', val);
  showSaveBar('Tema güncellendi.');
}

/* ── Dil Ayarı (simüle) ───────────────────────── */
function sttSetLang(lang) {
  localStorage.setItem('priorvia_lang', lang);
  var checkTR = document.getElementById('langCheckTR');
  var checkEN = document.getElementById('langCheckEN');
  if (checkTR) checkTR.style.display = lang === 'tr' ? '' : 'none';
  if (checkEN) checkEN.style.display = lang === 'en' ? '' : 'none';
  showSaveBar('Dil ayarı kaydedildi. Sayfa yenilenince uygulanır.');
}

/* ── Bildirim Tercihlerini Kaydet ─────────────── */
function sttSaveNotifPref() {
  var prefs = {
    notifNewTask:  (document.getElementById('notifNewTask')  || {}).checked,
    notifDone:     (document.getElementById('notifDone')     || {}).checked,
    notifDelete:   (document.getElementById('notifDelete')   || {}).checked,
    notifDeadline: (document.getElementById('notifDeadline') || {}).checked,
    emailDaily:    (document.getElementById('emailDaily')    || {}).checked,
    emailWeekly:   (document.getElementById('emailWeekly')   || {}).checked,
    actAdd:        (document.getElementById('actAdd')        || {}).checked,
    actUpdate:     (document.getElementById('actUpdate')     || {}).checked,
    actDelete:     (document.getElementById('actDelete')     || {}).checked,
  };
  localStorage.setItem('priorvia_notif_prefs', JSON.stringify(prefs));
  showSaveBar('Bildirim tercihleri kaydedildi.');
}

/* ── Sütun İsimleri ───────────────────────────── */
function sttSaveColumns() {
  var cols = {
    todo:       (document.getElementById('colTodo')   || {}).value || 'YAPILACAK',
    inprogress: (document.getElementById('colInprog') || {}).value || 'DEVAM EDİYOR',
    done:       (document.getElementById('colDone')   || {}).value || 'TAMAMLANDI'
  };
  localStorage.setItem('priorvia_col_labels', JSON.stringify(cols));
  // Kanban başlıklarını güncelle
  var todoTitle   = document.querySelector('.db-k-col[data-col="todo"] .db-k-title');
  var progTitle   = document.querySelector('.db-k-col[data-col="inprogress"] .db-k-title');
  var doneTitle   = document.querySelector('.db-k-col[data-col="done"] .db-k-title');
  if (todoTitle) todoTitle.textContent = cols.todo;
  if (progTitle) progTitle.textContent = cols.inprogress;
  if (doneTitle) doneTitle.textContent = cols.done;
  showSaveBar('Sütun isimleri güncellendi.');
}

/* ── Etiketler ────────────────────────────────── */
function sttSaveTags() {
  var tags = {
    high: (document.getElementById('tagHigh') || {}).value || 'YÜKSEK',
    med:  (document.getElementById('tagMed')  || {}).value || 'ORTA',
    low:  (document.getElementById('tagLow')  || {}).value || 'DÜŞÜK'
  };
  localStorage.setItem('priorvia_tags', JSON.stringify(tags));
  showSaveBar('Etiketler güncellendi.');
}

/* ── JSON Export ──────────────────────────────── */
function sttExportJSON() {
  var data = {
    exportDate: new Date().toISOString(),
    tasks:      JSON.parse(localStorage.getItem('priorvia_tasks')    || '[]'),
    projects:   JSON.parse(localStorage.getItem('priorvia_projects') || '[]'),
    team:       JSON.parse(localStorage.getItem('priorvia_team')     || '[]'),
    archive:    JSON.parse(localStorage.getItem('priorvia_archive')  || '[]'),
  };
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href   = url;
  a.download = 'priorvia-backup-' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showSaveBar('JSON dosyası indirildi.');
}

/* ── CSV Export ───────────────────────────────── */
function sttExportCSV() {
  var tasks = JSON.parse(localStorage.getItem('priorvia_tasks') || '[]');
  var rows  = [['ID','Başlık','Açıklama','Öncelik','Durum','Atanan','Tarih','Proje']];
  var projs = JSON.parse(localStorage.getItem('priorvia_projects') || '[]');
  tasks.forEach(function(t) {
    var proj = projs.find(function(p){ return p.id === t.projectId; });
    rows.push([
      t.id,
      '"' + (t.title  || '').replace(/"/g,'""') + '"',
      '"' + (t.desc   || '').replace(/"/g,'""') + '"',
      t.priority   || '',
      t.status     || '',
      t.assignee   || '',
      t.date       || '',
      proj ? '"' + proj.name.replace(/"/g,'""') + '"' : ''
    ]);
  });
  var csv  = rows.map(function(r){ return r.join(','); }).join('\n');
  var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href   = url;
  a.download = 'priorvia-gorevler-' + new Date().toISOString().slice(0,10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  showSaveBar('CSV dosyası indirildi.');
}

/* ── Tehlikeli İşlemler ───────────────────────── */
function sttClearTasks() {
  if (!confirm('Tüm görevler silinecek. Bu işlem geri alınamaz. Emin misiniz?')) return;
  tasks = [];
  persist();
  render();
  renderMyTasks();
  showSaveBar('Tüm görevler silindi.');
}

function sttClearArchive() {
  if (!confirm('Arşiv temizlenecek. Bu işlem geri alınamaz. Emin misiniz?')) return;
  archived = [];
  localStorage.setItem('priorvia_archive', JSON.stringify(archived));
  renderArchive();
  showSaveBar('Arşiv temizlendi.');
}

function sttResetAll() {
  if (!confirm('TÜM VERİLER silinecek (görevler, projeler, ekip, arşiv). Bu işlem GERİ ALINAMAZ. Devam etmek istiyor musunuz?')) return;
  if (!confirm('Son onay: Tüm Priorvia verileriniz kalıcı olarak silinecek. Onaylıyor musunuz?')) return;
  ['priorvia_tasks','priorvia_projects','priorvia_team','priorvia_archive',
   'priorvia_notifs','priorvia_activity'].forEach(function(k){
    localStorage.removeItem(k);
  });
  tasks=[]; projects=[]; teamMembers=[]; archived=[]; notifications=[]; activities=[];
  render(); renderTeam(); renderProjects(); renderMyTasks(); renderNotificationsFull(); renderArchive();
  showSaveBar('Tüm veriler sıfırlandı.');
}

/* ── Settings View render ─────────────────────── */
function renderSettings() {
  sttLoadProfile();

  // Tema radio'larını doğru ayarla
  var savedMode = localStorage.getItem('priorvia_theme_mode') || (darkMode ? 'dark' : 'light');
  document.querySelectorAll('input[name="sttTheme"]').forEach(function(r){
    r.checked = r.value === savedMode;
  });

  // Bildirim tercihlerini yükle
  var prefs = JSON.parse(localStorage.getItem('priorvia_notif_prefs') || 'null') || {};
  var defaults = { notifNewTask:true, notifDone:true, notifDeadline:true, emailWeekly:true, actAdd:true, actUpdate:true };
  var merged = Object.assign({}, defaults, prefs);
  Object.keys(merged).forEach(function(k) {
    var el = document.getElementById(k);
    if (el) el.checked = merged[k];
  });

  // Sütun isimlerini yükle
  var cols = JSON.parse(localStorage.getItem('priorvia_col_labels') || 'null') || {};
  if (document.getElementById('colTodo'))   document.getElementById('colTodo').value   = cols.todo       || 'YAPILACAK';
  if (document.getElementById('colInprog')) document.getElementById('colInprog').value = cols.inprogress || 'DEVAM EDİYOR';
  if (document.getElementById('colDone'))   document.getElementById('colDone').value   = cols.done       || 'TAMAMLANDI';

  // Etiketleri yükle
  var tags = JSON.parse(localStorage.getItem('priorvia_tags') || 'null') || {};
  if (document.getElementById('tagHigh')) document.getElementById('tagHigh').value = tags.high || 'YÜKSEK';
  if (document.getElementById('tagMed'))  document.getElementById('tagMed').value  = tags.med  || 'ORTA';
  if (document.getElementById('tagLow'))  document.getElementById('tagLow').value  = tags.low  || 'DÜŞÜK';

  // Dil
  var lang = localStorage.getItem('priorvia_lang') || 'tr';
  document.querySelectorAll('input[name="sttLang"]').forEach(function(r){ r.checked = r.value === lang; });
  var checkTR = document.getElementById('langCheckTR');
  var checkEN = document.getElementById('langCheckEN');
  if (checkTR) checkTR.style.display = lang === 'tr' ? '' : 'none';
  if (checkEN) checkEN.style.display = lang === 'en' ? '' : 'none';
}





/* ── DAVET LİNKİ ──────────────────────────────── */
function generateInviteLink() {
  var profile = getMyProfile();
  var inviteCode = btoa(JSON.stringify({
    invitedBy: profile.name,
    team: 'Priorvia',
    ts: Date.now()
  }));
  /* Local ortamda base URL */
  var base = window.location.origin + window.location.pathname.replace('dashboard.html', '');
  return base + 'homePage.html?invite=' + inviteCode;
}

function openInviteLinkModal() {
  var link = generateInviteLink();
  var modal = document.getElementById('inviteLinkModal');
  var input = document.getElementById('inviteLinkInput');
  if (input) input.value = link;
  if (modal) modal.classList.add('open');
  var overlay = document.getElementById('inviteLinkOverlay');
  if (overlay) overlay.classList.add('open');
}

function closeInviteLinkModal() {
  var modal = document.getElementById('inviteLinkModal');
  var overlay = document.getElementById('inviteLinkOverlay');
  if (modal) modal.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
}

function copyInviteLink() {
  var input = document.getElementById('inviteLinkInput');
  if (!input) return;
  input.select();
  input.setSelectionRange(0, 99999);
  try {
    navigator.clipboard.writeText(input.value).then(function() {
      showCopyFeedback();
    }).catch(function() {
      document.execCommand('copy');
      showCopyFeedback();
    });
  } catch(e) {
    document.execCommand('copy');
    showCopyFeedback();
  }
}

function showCopyFeedback() {
  var btn = document.getElementById('copyLinkBtn');
  if (!btn) return;
  var orig = btn.innerHTML;
  btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Kopyalandı!';
  btn.style.background = 'var(--green-600)';
  setTimeout(function() {
    btn.innerHTML = orig;
    btn.style.background = '';
  }, 2000);
  showSaveBar('Davet linki kopyalandı.');
}

function shareViaWhatsapp() {
  var link = generateInviteLink();
  var profile = getMyProfile();
  var text = profile.name + ' sizi Priorvia ekibine davet etti! ' + link;
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
}

function shareViaEmail() {
  var link = generateInviteLink();
  var subject = profile.name + " sizi Priorvia'ya davet etti";
  var subject = profile.name + " sizi Priorvia\u2019ya davet etti";
  var body = 'Merhaba,%0A%0A' + profile.name + ' sizi Priorvia proje yönetim ekibine davet etti.%0A%0ADavet linkiniz: ' + link + '%0A%0APriorvia ile görevlerinizi kolayca yönetin.';
  window.location.href = 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + body;
}

/* ================================================
   ADIM 2 — Dashboard Proje Filtresi + Review + Chart
   ================================================ */

/* ── Proje Filtresi ─────────────────────────────── */
var dashSelectedProject = ''; /* '' = tüm projeler */

function initDashProjectFilter() {
  var sel = document.getElementById('dashProjectFilter');
  if (!sel) return;
  sel.addEventListener('change', function() {
    dashSelectedProject = this.value;
    render();
    renderDashChart();
  });
}

function populateDashProjectFilter() {
  var sel = document.getElementById('dashProjectFilter');
  if (!sel) return;
  var current = sel.value;
  sel.innerHTML = '<option value="">🗂 Tüm Projeler</option>';
  projects.forEach(function(p) {
    var opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    if (p.id === current) opt.selected = true;
    sel.appendChild(opt);
  });
  if (!sel.value) dashSelectedProject = '';
}

/* ── Render'ı proje filtresine göre güncelle ──────
   Mevcut render() fonksiyonu task'ları filtreler,
   biz sadece projectId filtresini ekleyeceğiz.
   Bunun için mevcut render()'ı wrap'liyoruz.        */
var _origRender = render;
render = function() {
  _origRender();
  applyProjectFilter();
  populateDashProjectFilter();
  updateDashStats();
};

function applyProjectFilter() {
  if (!dashSelectedProject) return; /* tüm projeler — dokunma */
  document.querySelectorAll('.db-task-card').forEach(function(card) {
    var id   = card.dataset.id;
    var task = tasks.find(function(t){ return t.id === id; });
    if (!task) return;
    var match = task.projectId === dashSelectedProject;
    card.style.display = match ? '' : 'none';
  });
  /* Boş kolon mesajlarını güncelle */
  ['todo','inprogress','done'].forEach(function(col) {
    var list    = document.getElementById('list-' + col);
    var empty   = document.getElementById('empty-' + col);
    var count   = document.getElementById('cnt-' + col);
    if (!list || !empty) return;
    var visible = list.querySelectorAll('.db-task-card:not([style*="display: none"])').length;
    empty.style.display = visible === 0 ? 'block' : 'none';
    if (count) count.textContent = visible;
  });
}

function updateDashStats() {
  var filtered = dashSelectedProject
    ? tasks.filter(function(t){ return t.projectId === dashSelectedProject; })
    : tasks;
  var total  = filtered.length;
  var inprog = filtered.filter(function(t){ return t.status === 'inprogress'; }).length;
  var done   = filtered.filter(function(t){ return t.status === 'done'; }).length;
  var rate   = total > 0 ? Math.round((done / total) * 100) : 0;
  setText('statTotal',      total);
  setText('statInProgress', inprog);
  setText('statDone',       done);
  setText('statRate',       '%' + rate);
  var bar = document.getElementById('miniProgressFill');
  if (bar) bar.style.width = rate + '%';
  /* Proje label */
  var proj = projects.find(function(p){ return p.id === dashSelectedProject; });
  setText('chartProjLabel', proj ? proj.name : 'Tüm Projeler');
}

function openReviewModal(taskId) {
  var task = tasks.find(function(t){ return t.id === taskId; });
  if (!task) return;

  var pLabel    = { high:'YÜKSEK', med:'ORTA', low:'DÜŞÜK' }[task.priority] || 'ORTA';
  var statusMap = {
    todo:'Yapılacak', inprogress:'Devam Ediyor',
    done:'Tamamlandı', pending_approval:'PM Onayı Bekliyor'
  };
  var statusCls = {
    todo:'db-mt-todo', inprogress:'db-mt-prog',
    done:'db-mt-done', pending_approval:'db-mt-pending'
  };
  var proj = projects.find(function(p){ return p.id === task.projectId; });

  /* Priority + status */
  var prEl = document.getElementById('rvPriority');
  if (prEl) { prEl.textContent = pLabel; prEl.className = 'priority-tag ' + task.priority; }
  var stEl = document.getElementById('rvStatus');
  if (stEl) { stEl.textContent = statusMap[task.status] || task.status; stEl.className = 'db-mt-status ' + (statusCls[task.status] || 'db-mt-done'); }

  setText('rvTitle',    task.title);
  setText('rvAssignee', task.assignee || 'Atanmadı');
  setText('rvDate',     task.date ? formatDate(new Date(task.date)) : 'Tarih yok');
  setText('rvProject',  proj ? proj.name : 'Proje yok');
  setText('rvProgress', task.progress > 0 ? '%' + task.progress + ' tamamlandı' : 'İlerleme girilmedi');

  var descEl = document.getElementById('rvDesc');
  if (descEl) {
    if (task.desc) { descEl.textContent = task.desc; descEl.style.display = ''; }
    else { descEl.style.display = 'none'; }
  }

  /* Avatar */
  var profile = getMyProfile();
  var ini = (profile.name || currentUser).split(' ').map(function(w){ return w[0]||''; }).join('').toUpperCase().slice(0,2);
  setText('rvMyAvatar', ini);

  /* Yorum alanını temizle */
  var inp = document.getElementById('rvCommentInput');
  if (inp) inp.value = '';

  /* Mevcut yorumları yükle */
  renderReviewComments(task.id);

  /* Butonlara task id bağla */
  var editBtn = document.getElementById('rvEditBtn');
  if (editBtn) editBtn.onclick = function() { closeReviewModal(); openEditDrawer(task.id); };
  var archBtn = document.getElementById('rvArchiveBtn');
  if (archBtn) {
    archBtn.style.display = task.status === 'done' ? '' : 'none';
    archBtn.onclick = function() { closeReviewModal(); archiveTask(task.id); };
  }

  /* Modal'ı aç */
  document.getElementById('reviewModal').classList.add('open');
  document.getElementById('reviewOverlay').classList.add('open');

  /* Bildirim gönder — review açıldı */
  var reviewerName = profile.name || currentUser;
  addNotif('"' + task.title + '" görevi ' + reviewerName + ' tarafından incelendi', 'update');
}
function closeReviewModal() {
  document.getElementById('reviewModal').classList.remove('open');
  document.getElementById('reviewOverlay').classList.remove('open');
}

/* ── CHART.JS — Burndown + Donut ────────────────── */
var _burndownChart = null;
var _donutChart    = null;

function loadChartJS(cb) {
  if (window.Chart) { cb(); return; }
  var s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
  s.onload = cb;
  document.head.appendChild(s);
}

function renderDashChart() {
  loadChartJS(function() {
    renderBurndownChart();
    renderDonutChart();
  });
}

function getChartColors() {
  var dark = document.body.classList.contains('dark-mode');
  return {
    gridColor:  dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
    textColor:  dark ? '#8ab89a' : '#6B8F7B',
    lineColor:  dark ? '#4ade80' : '#40916C',
    areaColor:  dark ? 'rgba(74,222,128,0.12)' : 'rgba(64,145,108,0.10)',
    todoColor:  dark ? '#4b5563' : '#94a3b8',
    progColor:  dark ? '#f59e0b' : '#f59e0b',
    doneColor:  dark ? '#4ade80' : '#22c55e'
  };
}

function renderBurndownChart() {
  var canvas = document.getElementById('burndownChart');
  if (!canvas) return;

  var filtered = dashSelectedProject
    ? tasks.filter(function(t){ return t.projectId === dashSelectedProject; })
    : tasks;

  /* Son 7 günün tamamlanma verisini hesapla */
  var labels = [];
  var dataPoints = [];
  for (var i = 6; i >= 0; i--) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(23, 59, 59, 0);
    var dayLabel = d.toLocaleDateString('tr-TR', { day:'numeric', month:'short' });
    labels.push(dayLabel);

    /* O güne kadar tamamlanan görev sayısı */
    var doneCount = filtered.filter(function(t) {
      if (t.status !== 'done') return false;
      /* createdAt'i kaba tamamlanma tarihi olarak kullan */
      var taskDate = new Date(t.updatedAt || t.createdAt || Date.now());
      return taskDate <= d;
    }).length;
    var total = filtered.length || 1;
    dataPoints.push(Math.round((doneCount / total) * 100));
  }

  var c = getChartColors();
  var ctx = canvas.getContext('2d');

  if (_burndownChart) { _burndownChart.destroy(); _burndownChart = null; }

  _burndownChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Tamamlanma %',
        data: dataPoints,
        borderColor: c.lineColor,
        backgroundColor: c.areaColor,
        borderWidth: 2,
        pointBackgroundColor: c.lineColor,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.35
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(ctx) { return ' %' + ctx.parsed.y + ' tamamlandı'; }
          }
        }
      },
      scales: {
        x: {
          grid: { color: c.gridColor },
          ticks: { color: c.textColor, font: { size: 11 } }
        },
        y: {
          min: 0, max: 100,
          grid: { color: c.gridColor },
          ticks: {
            color: c.textColor, font: { size: 11 },
            callback: function(v) { return '%' + v; }
          }
        }
      }
    }
  });
}

function renderDonutChart() {
  var canvas = document.getElementById('donutChart');
  if (!canvas) return;

  var filtered = dashSelectedProject
    ? tasks.filter(function(t){ return t.projectId === dashSelectedProject; })
    : tasks;

  var todo   = filtered.filter(function(t){ return t.status === 'todo'; }).length;
  var inprog = filtered.filter(function(t){ return t.status === 'inprogress'; }).length;
  var done   = filtered.filter(function(t){ return t.status === 'done'; }).length;

  var c = getChartColors();
  var ctx = canvas.getContext('2d');

  if (_donutChart) { _donutChart.destroy(); _donutChart = null; }

  var total = todo + inprog + done;
  if (total === 0) {
    /* Boş state */
    var legend = document.getElementById('donutLegend');
    if (legend) legend.innerHTML = '<span style="font-size:12px;color:var(--text-muted)">Henüz görev yok.</span>';
    return;
  }

  _donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Yapılacak', 'Devam Ediyor', 'Tamamlandı'],
      datasets: [{
        data: [todo, inprog, done],
        backgroundColor: [c.todoColor, c.progColor, c.doneColor],
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: false,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              var pct = Math.round((ctx.parsed / total) * 100);
              return ' ' + ctx.label + ': ' + ctx.parsed + ' (%' + pct + ')';
            }
          }
        }
      }
    }
  });

  /* Legend */
  var legend = document.getElementById('donutLegend');
  if (legend) {
    var items = [
      { label:'Yapılacak',    count:todo,   color:c.todoColor },
      { label:'Devam Ediyor', count:inprog, color:c.progColor },
      { label:'Tamamlandı',   count:done,   color:c.doneColor }
    ];
    legend.innerHTML = items.map(function(item) {
      return '<div class="db-donut-item">' +
        '<span class="db-donut-dot" style="background:' + item.color + '"></span>' +
        '<span>' + item.label + '</span>' +
        '<strong>' + item.count + '</strong>' +
      '</div>';
    }).join('');
  }
}

/* Review butonunu buildCard'a ekle — done kartlarına */
var _origBuildCard = buildCard;
buildCard = function(task) {
  var card = _origBuildCard(task);
  if (task.status === 'done' || task.status === 'pending_approval') {
    /* Karta review butonu ekle */
    var actions = card.querySelector('.db-card-actions');
    if (actions) {
      var rvBtn = document.createElement('button');
      rvBtn.className = 'db-card-btn';
      rvBtn.title     = 'Review';
      rvBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
      rvBtn.style.opacity = '1';
      rvBtn.onclick = function(e) {
        e.stopPropagation();
        openReviewModal(task.id);
      };
      actions.insertBefore(rvBtn, actions.firstChild);
    }
  }
  return card;
};

/* DOMContentLoaded'a ekstra init'leri bağla */
document.addEventListener('DOMContentLoaded', function() {
  initDashProjectFilter();
  /* Dashboard açık geliyorsa chart'ı hemen çiz */
  setTimeout(renderDashChart, 400);
});

/* Theme toggle'da chart'ı yenile */
var _origThemeToggle = document.getElementById('themeToggle');
if (_origThemeToggle) {
  _origThemeToggle.addEventListener('click', function() {
    setTimeout(renderDashChart, 300);
  });
}

/* ── REVIEW YORUM SİSTEMİ ───────────────────────── */

/* Yorumları localStorage'dan oku */
function getTaskComments(taskId) {
  var all = JSON.parse(localStorage.getItem('priorvia_comments') || '{}');
  return all[taskId] || [];
}

/* Yorum kaydet */
function saveTaskComment(taskId, comment) {
  var all = JSON.parse(localStorage.getItem('priorvia_comments') || '{}');
  if (!all[taskId]) all[taskId] = [];
  all[taskId].push(comment);
  localStorage.setItem('priorvia_comments', JSON.stringify(all));
}

/* Yorumları render et */
function renderReviewComments(taskId) {
  var list   = document.getElementById('rvCommentsList');
  var countEl = document.getElementById('rvCommentCount');
  if (!list) return;

  var comments = getTaskComments(taskId);
  if (countEl) countEl.textContent = comments.length;

  if (comments.length === 0) {
    list.innerHTML = '<p class="db-empty-sm">Henüz yorum yok.</p>';
    return;
  }

  list.innerHTML = comments.map(function(c) {
    var ini = (c.author || '?').split(' ').map(function(w){ return w[0]||''; }).join('').toUpperCase().slice(0,2);
    return '<div class="rv-comment-item">' +
      '<div class="rv-comment-avatar">' + escHtml(ini) + '</div>' +
      '<div class="rv-comment-body">' +
        '<div class="rv-comment-meta">' +
          '<strong>' + escHtml(c.author) + '</strong>' +
          '<span>' + timeAgo(c.time) + '</span>' +
        '</div>' +
        '<div class="rv-comment-text">' + escHtml(c.text) + '</div>' +
      '</div>' +
    '</div>';
  }).join('');

  /* En alta kaydır */
  list.scrollTop = list.scrollHeight;
}

/* Yorum gönder */
function submitReviewComment() {
  var inp    = document.getElementById('rvCommentInput');
  var taskId = document.getElementById('rvEditBtn') ? null : null;

  /* Aktif task id'yi bul — rvEditBtn'in onclick'inden al */
  var editBtn = document.getElementById('rvEditBtn');
  if (!editBtn || !editBtn.onclick) { alert('Görev bulunamadı.'); return; }

  /* Task id'yi başlıktan bul */
  var titleEl = document.getElementById('rvTitle');
  var taskTitle = titleEl ? titleEl.textContent : '';
  var task = tasks.find(function(t){ return t.title === taskTitle; });
  if (!task) { alert('Görev bulunamadı.'); return; }

  var text = inp ? inp.value.trim() : '';
  if (!text) { inp.focus(); return; }

  var profile = getMyProfile();
  var comment = {
    id:     Date.now().toString(),
    taskId: task.id,
    author: profile.name || currentUser,
    text:   text,
    time:   Date.now()
  };

  saveTaskComment(task.id, comment);

  /* Yorumu ekrana yansıt */
  renderReviewComments(task.id);

  /* Input'u temizle */
  if (inp) inp.value = '';

  /* Bildirim: görev sahibine yorum bildirimi */
  addNotif(
    '"' + task.title + '" görevine ' + (profile.name || currentUser) + ' yorum ekledi',
    'update'
  );

  showSaveBar('Yorum eklendi.');
}