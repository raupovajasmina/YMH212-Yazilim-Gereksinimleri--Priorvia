/* ================================================
   PRIORVIA — dashboard.js  v3
   + Projeler (Kronolojik, Üyeler, Yeni Proje)
   + Görevlerim (Sadece atanan)
   + Takvim
   + Arşiv (PM Onayı)
   + Bildirimler (Tam Liste)
   + Gelişmiş Koyu Mod
   ================================================ */

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

/* Simüle edilmiş aktif kullanıcı */
var currentUser = localStorage.getItem('priorvia_user') || 'Ali Veli';

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
  updateWelcome();
  updateUserInfo();
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
  setText('sidebarRole', 'Proje Yöneticisi');
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
  // Önce tüm drawer'ları kapat
  document.querySelectorAll('.db-drawer').forEach(function(d){ d.classList.remove('open'); });
  document.getElementById('dbOverlay').classList.remove('open');
  editId = null;

  var allViewIds = ['viewDashboard','viewProjects','viewMyTasks','viewTeam','viewNotifications','viewCalendar','viewArchive'];
  allViewIds.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  document.querySelectorAll('.db-nav-item').forEach(function(i){ i.classList.remove('active'); });
  var navEl = document.querySelector('.db-nav-item[data-view="' + view + '"]');
  if (navEl) navEl.classList.add('active');

  var labels = {
    dashboard: 'Dashboard', projects: 'Projeler', mytasks: 'Görevlerim',
    team: 'Ekip & Yetkiler', notifications: 'Bildirimler',
    calendar: 'Takvim', archive: 'Arşiv'
  };
  setText('breadcrumbCurrent', labels[view] || view);

  var viewMap = {
    dashboard: 'viewDashboard', projects: 'viewProjects', mytasks: 'viewMyTasks',
    team: 'viewTeam', notifications: 'viewNotifications',
    calendar: 'viewCalendar', archive: 'viewArchive'
  };
  var el = document.getElementById(viewMap[view]);
  if (el) el.style.display = '';

  if (view === 'projects')      renderProjects();
  if (view === 'mytasks')       renderMyTasks();
  if (view === 'team')          renderTeam();
  if (view === 'notifications') renderNotificationsFull();
  if (view === 'calendar')      renderCalendar();
  if (view === 'archive')       renderArchive();
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

function openDrawer(defaultStatus) {
  defaultStatus = defaultStatus || 'todo';
  editId = null;
  document.getElementById('editTaskId').value = '';
  document.getElementById('drawerTitle').textContent = 'Yeni Görev';
  document.getElementById('fTitle').value    = '';
  document.getElementById('fDesc').value     = '';
  document.getElementById('fPriority').value = 'med';
  document.getElementById('fDate').value     = '';
  document.getElementById('fAssignee').value = '';
  document.getElementById('fStatus').value   = defaultStatus;
  document.getElementById('fProgress').value = 0;
  document.getElementById('progressVal').textContent = '0';
  document.getElementById('progressGroup').style.display = defaultStatus === 'inprogress' ? 'flex' : 'none';
  document.getElementById('fTitle').classList.remove('err');
  document.getElementById('fTitleErr').classList.remove('show');
  populateProjectDropdown('');
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
  document.getElementById('fAssignee').value = task.assignee || '';
  document.getElementById('fStatus').value   = task.status;
  document.getElementById('fProgress').value = task.progress || 0;
  document.getElementById('progressVal').textContent = task.progress || 0;
  document.getElementById('progressGroup').style.display = task.status === 'inprogress' ? 'flex' : 'none';
  populateProjectDropdown(task.projectId || '');
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

  // Done olan görevler için PM bildirimi
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

  // Üye checkboxları
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

  // Kronolojik sıralama (en yeni önce)
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

    // Üye avatarları
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

/* ── MY TASKS ─────────────────────────────────── */
function renderMyTasks() {
  var list = document.getElementById('myTasksList');
  if (!list) return;

  // Sadece aktif kullanıcıya atanan görevler
  var myTasks = tasks.filter(function(t) {
    return t.assignee && t.assignee.toLowerCase() === currentUser.toLowerCase();
  });

  setText('myTaskCount', myTasks.length);

  if (myTasks.length === 0) {
    list.innerHTML = '<div class="db-empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg><p>Size atanan görev yok.</p><span>Atanan kişi olarak adınızı kullandığınızda görevler burada görünür.</span></div>';
    return;
  }

  var statusOrder = { todo: 0, inprogress: 1, done: 2 };
  myTasks.sort(function(a,b){ return statusOrder[a.status] - statusOrder[b.status]; });

  var html = '<div class="db-mytasks-grid">';
  myTasks.forEach(function(task) {
    var proj = projects.find(function(p){ return p.id === task.projectId; });
    var pLabel = { high:'YÜKSEK', med:'ORTA', low:'DÜŞÜK' }[task.priority] || '';
    var statusLabel = { todo:'Yapılacak', inprogress:'Devam Ediyor', done:'Tamamlandı' }[task.status] || '';
    var statusCls = { todo:'mt-todo', inprogress:'mt-prog', done:'mt-done' }[task.status] || '';

    var today = new Date(); today.setHours(0,0,0,0);
    var isOverdue = task.date && new Date(task.date) < today && task.status !== 'done';

    html += '<div class="db-mytask-card' + (task.status==='done'?' db-card-done':'') + '">' +
      '<div class="db-card-top">' +
        '<span class="priority-tag ' + task.priority + '">' + pLabel + '</span>' +
        '<span class="db-mt-status ' + statusCls + '">' + statusLabel + '</span>' +
      '</div>' +
      '<div class="db-card-title">' + escHtml(task.title) + '</div>' +
      (task.desc ? '<div class="db-mytask-desc">' + escHtml(task.desc.substring(0,80)) + (task.desc.length>80?'...':'') + '</div>' : '') +
      '<div class="db-card-meta">' +
        (task.date ? '<span class="db-card-date' + (isOverdue?' overdue':'') + '"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' + formatDate(new Date(task.date)) + (isOverdue?' ⚠':'') + '</span>' : '') +
        (proj ? '<span class="db-proj-badge db-proj-' + proj.color + '">' + escHtml(proj.name) + '</span>' : '') +
      '</div>' +
      '<div class="db-mytask-actions">' +
        '<button class="db-card-btn" onclick="openEditDrawer(\'' + task.id + '\')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Düzenle</button>' +
        (task.status === 'done' ? '<button class="btn-ghost" style="font-size:12px;padding:5px 10px" onclick="archiveTask(\'' + task.id + '\')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/></svg> Arşivle (PM)</button>' : '') +
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

  // Dropdown notif list
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

  var typeIcon = { new:'✦', update:'✎', warn:'⚠', archive:'▦', info:'ℹ' };
  var typeCls  = { new:'db-ni-green', update:'db-ni-blue', warn:'db-ni-orange', archive:'db-ni-purple', info:'db-ni-blue' };
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

  // Ay select'ini doldur
  var mSel = document.getElementById('calMonthSelect');
  monthNames.forEach(function(name, i) {
    var opt = document.createElement('option');
    opt.value = i;
    opt.textContent = name;
    mSel.appendChild(opt);
  });

  // Yıl select'ini doldur (±10 yıl)
  var ySel = document.getElementById('calYearSelect');
  var currentYear = new Date().getFullYear();
  for (var y = currentYear - 5; y <= currentYear + 5; y++) {
    var opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    ySel.appendChild(opt);
  }

  // Select değerlerini calDate'e göre ayarla
  mSel.value = calDate.getMonth();
  ySel.value = calDate.getFullYear();

  // Select değişince takvimi güncelle
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

  // Select'leri güncelle (nav butonlarıyla değişince senkron kalsın)
  var mSel = document.getElementById('calMonthSelect');
  var ySel = document.getElementById('calYearSelect');
  if (mSel) mSel.value = month;
  if (ySel) {
    // Eğer yıl select'te yoksa ekle
    if (!ySel.querySelector('option[value="' + year + '"]')) {
      var opt = document.createElement('option');
      opt.value = year; opt.textContent = year;
      ySel.appendChild(opt);
      // Seçenekleri sırala
      var opts = Array.from(ySel.options).sort(function(a,b){ return a.value - b.value; });
      ySel.innerHTML = '';
      opts.forEach(function(o){ ySel.appendChild(o); });
    }
    ySel.value = year;
  }

  setText('calendarMonthLabel', monthNames[month] + ' ' + year);

  var firstDay = new Date(year, month, 1).getDay();
  // Pzt başlasın (0=Paz, 1=Pzt...)
  var startOffset = (firstDay === 0) ? 6 : firstDay - 1;
  var daysInMonth = new Date(year, month + 1, 0).getDate();

  var today = new Date();
  today.setHours(0,0,0,0);

  // Görevleri tarihe göre grupla
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

  // Boş günler
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
    if (colTasks.length === 0) {
      if (empty) empty.style.display = 'block';
    } else {
      if (empty) empty.style.display = 'none';
      colTasks.forEach(function(task){ list.appendChild(buildCard(task)); });
    }
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
  activities.unshift({ text: text, color: color||'green', time: Date.now() });
  if (activities.length > 20) activities.pop();
  localStorage.setItem('priorvia_activity', JSON.stringify(activities));
}
function renderActivity() {
  var list = document.getElementById('activityList');
  if (!list) return;
  if (activities.length === 0) { list.innerHTML = '<p class="db-empty-sm">Henüz aktivite yok.</p>'; return; }
  list.innerHTML = activities.slice(0,8).map(function(a) {
    return '<div class="db-activity-item"><div class="db-act-dot db-act-' + a.color + '"></div>' +
      '<div><div style="font-size:12.5px;color:var(--text-primary)">' + escHtml(a.text) + '</div>' +
      '<div class="db-act-time">' + timeAgo(a.time) + '</div></div></div>';
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
var profileModalMode = 'view'; // 'view' | 'edit'

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
  document.getElementById('prfEditBtn').style.display  = 'none'; // başkasının profili düzenlenemez

  document.getElementById('prfModal').classList.add('open');
  document.getElementById('prfOverlay').classList.add('open');
}

function toggleProfileEdit() {
  var profile = getMyProfile();
  var isEdit = document.getElementById('prfEditMode').style.display !== 'none';

  if (!isEdit) {
    // Görüntüleme → Düzenleme
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
  // Görüntüleme moduna dön
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
   dashboard.js — PROFİLİM VIEW EKLEMELERİ
   Bu kodları mevcut dashboard.js dosyanıza ekleyin
   ================================================ */

/* ── 1. showView FONKSİYONUNDA DEĞİŞİKLİK ────────
   showView() içindeki allViewIds dizisine 'viewMyprofile' ekleyin:
   
   ÖNCE:
   var allViewIds = ['viewDashboard','viewProjects','viewMyTasks','viewTeam','viewNotifications','viewCalendar','viewArchive'];
   
   SONRA:
*/
var allViewIds = ['viewDashboard','viewProjects','viewMyTasks','viewTeam','viewNotifications','viewCalendar','viewArchive','viewMyprofile'];

/* ── showView labels objesine myprofile ekleyin ──
   ÖNCE:
   var labels = { dashboard: 'Dashboard', projects: 'Projeler', mytasks: 'Görevlerim',
     team: 'Ekip & Yetkiler', notifications: 'Bildirimler', calendar: 'Takvim', archive: 'Arşiv' };
   
   SONRA:
*/
var labels = {
  dashboard: 'Dashboard', projects: 'Projeler', mytasks: 'Görevlerim',
  team: 'Ekip & Yetkiler', notifications: 'Bildirimler',
  calendar: 'Takvim', archive: 'Arşiv', myprofile: 'Profilim'
};

/* ── showView viewMap objesine myprofile ekleyin ──
   ÖNCE:
   var viewMap = { dashboard: 'viewDashboard', projects: 'viewProjects', mytasks: 'viewMyTasks',
     team: 'viewTeam', notifications: 'viewNotifications', calendar: 'viewCalendar', archive: 'viewArchive' };
   
   SONRA:
*/
var viewMap = {
  dashboard: 'viewDashboard', projects: 'viewProjects', mytasks: 'viewMyTasks',
  team: 'viewTeam', notifications: 'viewNotifications',
  calendar: 'viewCalendar', archive: 'viewArchive', myprofile: 'viewMyprofile'
};

/* ── showView içinde render çağrılarına myprofile ekleyin ──
   if (view === 'archive') renderArchive(); satırından SONRA şunu ekleyin:
*/
// if (view === 'myprofile')    renderMyProfile();

/* ── 2. YENİ FONKSİYON: renderMyProfile ─────────
   Bu fonksiyonu dosyanın herhangi bir yerine (örn. renderArchive'ın altına) ekleyin:
*/
function renderMyProfile() {
  var container = document.getElementById('myProfileContent');
  if (!container) return;

  var profile = getMyProfile();
  var ini = profile.name.split(' ').map(function(w){ return w[0]||''; }).join('').toUpperCase().slice(0,2);
  var myTasks    = tasks.filter(function(t){ return t.assignee && t.assignee.toLowerCase() === profile.name.toLowerCase(); });
  var myDone     = myTasks.filter(function(t){ return t.status === 'done'; }).length;
  var myInProg   = myTasks.filter(function(t){ return t.status === 'inprogress'; }).length;
  var myProjects = projects.filter(function(p){ return p.members && p.members.length > 0; }).length;

  container.innerHTML = [
    '<div class="mprf-wrap">',

    /* ── Sol Kart: Avatar + İstatistikler ── */
    '<div class="mprf-left">',
      '<div class="mprf-avatar-card">',
        '<div class="mprf-big-avatar" id="mprfAvatar">', ini, '</div>',
        '<div class="mprf-name" id="mprfNameDisp">', escHtml(profile.name), '</div>',
        '<div class="mprf-role-tag">Proje Yöneticisi</div>',
      '</div>',

      '<div class="mprf-stats-card">',
        '<div class="mprf-stat">',
          '<div class="mprf-stat-val" id="mprfStatTotal">', myTasks.length, '</div>',
          '<div class="mprf-stat-lbl">Toplam Görev</div>',
        '</div>',
        '<div class="mprf-stat-divider"></div>',
        '<div class="mprf-stat">',
          '<div class="mprf-stat-val" id="mprfStatDone">', myDone, '</div>',
          '<div class="mprf-stat-lbl">Tamamlandı</div>',
        '</div>',
        '<div class="mprf-stat-divider"></div>',
        '<div class="mprf-stat">',
          '<div class="mprf-stat-val" id="mprfStatProg">', myInProg, '</div>',
          '<div class="mprf-stat-lbl">Devam Ediyor</div>',
        '</div>',
      '</div>',

      /* Aktif görevler özeti */
      myTasks.length > 0 ? [
        '<div class="mprf-recent-card">',
          '<div class="mprf-sub-title">Son Görevlerim</div>',
          myTasks.slice(0,4).map(function(t) {
            var dot = { high:'#ef4444', med:'#f59e0b', low:'#22c55e' }[t.priority];
            var stLbl = { todo:'Yapılacak', inprogress:'Devam', done:'Tamam' }[t.status];
            return '<div class="mprf-task-row">' +
              '<span class="mprf-task-dot" style="background:' + dot + '"></span>' +
              '<span class="mprf-task-name">' + escHtml(t.title.substring(0,30)) + (t.title.length>30?'...':'') + '</span>' +
              '<span class="mprf-task-st">' + stLbl + '</span>' +
            '</div>';
          }).join(''),
        '</div>'
      ].join('') : '',
    '</div>',

    /* ── Sağ Kart: Düzenlenebilir Form ── */
    '<div class="mprf-right">',
      '<div class="mprf-form-card">',
        '<div class="mprf-form-header">',
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green-700)" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
          '<span>Profil Bilgileri</span>',
        '</div>',

        '<div class="mprf-form-body">',
          '<div class="mprf-field-group">',
            '<div class="mprf-field">',
              '<label class="mprf-label">Ad Soyad <span style="color:#e53e3e">*</span></label>',
              '<input type="text" id="mprfName" class="db-input" value="', escHtml(profile.name), '" placeholder="Ad Soyad" />',
            '</div>',
            '<div class="mprf-field">',
              '<label class="mprf-label">E-posta</label>',
              '<div class="mprf-input-icon">',
                '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
                '<input type="email" id="mprfEmail" class="db-input mprf-with-icon" value="', escHtml(profile.email || ''), '" placeholder="ornek@email.com" />',
              '</div>',
            '</div>',
          '</div>',

          '<div class="mprf-field-group">',
            '<div class="mprf-field">',
              '<label class="mprf-label">Telefon</label>',
              '<div class="mprf-input-icon">',
                '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.77a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16h.27Z"/></svg>',
                '<input type="tel" id="mprfPhone" class="db-input mprf-with-icon" value="', escHtml(profile.phone || ''), '" placeholder="+90 555 000 00 00" />',
              '</div>',
            '</div>',
            '<div class="mprf-field">',
              '<label class="mprf-label">GitHub</label>',
              '<div class="mprf-input-icon">',
                '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>',
                '<input type="url" id="mprfGithub" class="db-input mprf-with-icon" value="', escHtml(profile.github || ''), '" placeholder="https://github.com/kullaniciadi" />',
              '</div>',
            '</div>',
          '</div>',
        '</div>',

        '<div class="mprf-form-footer">',
          '<button class="btn-ghost" onclick="renderMyProfile()">',
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.93"/></svg>',
            'Sıfırla',
          '</button>',
          '<button class="btn-primary" onclick="saveMyProfileFromView()">',
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
            'Değişiklikleri Kaydet',
          '</button>',
        '</div>',
      '</div>',

      /* Güvenlik / Hesap bilgisi kartı */
      '<div class="mprf-info-card">',
        '<div class="mprf-sub-title" style="margin-bottom:12px">',
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--green-600)" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
          'Hesap Bilgileri',
        '</div>',
        '<div class="mprf-info-row">',
          '<span class="mprf-info-key">Kullanıcı Adı</span>',
          '<span class="mprf-info-val" id="mprfInfoName">', escHtml(profile.name), '</span>',
        '</div>',
        profile.email ? [
          '<div class="mprf-info-row">',
            '<span class="mprf-info-key">E-posta</span>',
            '<span class="mprf-info-val">', escHtml(profile.email), '</span>',
          '</div>'
        ].join('') : '',
        '<div class="mprf-info-row">',
          '<span class="mprf-info-key">Rol</span>',
          '<span class="db-role-badge db-role-pm">Proje Yöneticisi</span>',
        '</div>',
        '<div class="mprf-info-row">',
          '<span class="mprf-info-key">Atanan Görevler</span>',
          '<span class="mprf-info-val">', myTasks.length, ' görev</span>',
        '</div>',
      '</div>',
    '</div>',

    '</div>' /* /mprf-wrap */
  ].join('');
}

/* ── 3. YENİ FONKSİYON: saveMyProfileFromView ───
   Bu fonksiyonu da ekleyin:
*/
function saveMyProfileFromView() {
  var name = document.getElementById('mprfName').value.trim();
  if (!name) { alert('Ad Soyad zorunludur.'); return; }
  var data = {
    name:   name,
    email:  document.getElementById('mprfEmail').value.trim(),
    phone:  document.getElementById('mprfPhone').value.trim(),
    github: document.getElementById('mprfGithub').value.trim()
  };
  saveMyProfile(data);
  renderMyProfile();
  showSaveBar('Profil güncellendi.');
}

/* ── 4. showView FONKSİYONUNDA son kontrol ───────
   showView() içindeki if/render bloğuna şunu ekleyin:
   
   if (view === 'myprofile') renderMyProfile();
   
   Bu satırı:
   if (view === 'archive') renderArchive();
   satırından HEMEN SONRA ekleyin.
*/
/* ================================================
   /* ================================================
   dashboard.js — showView FONKSİYONUNU TAMAMEN
   BU KOD İLE DEĞİŞTİRİN (eski showView silin)
   ================================================ */

function showView(view) {
  document.querySelectorAll('.db-drawer').forEach(function(d){ d.classList.remove('open'); });
  document.getElementById('dbOverlay').classList.remove('open');
  editId = null;

  var allViewIds = [
    'viewDashboard','viewProjects','viewMyTasks','viewTeam',
    'viewNotifications','viewCalendar','viewArchive','viewMyprofile'
  ];
  allViewIds.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  document.querySelectorAll('.db-nav-item').forEach(function(i){ i.classList.remove('active'); });
  var navEl = document.querySelector('.db-nav-item[data-view="' + view + '"]');
  if (navEl) navEl.classList.add('active');

  var labels = {
    dashboard:   'Dashboard',
    projects:    'Projeler',
    mytasks:     'Görevlerim',
    team:        'Ekip & Yetkiler',
    notifications: 'Bildirimler',
    calendar:    'Takvim',
    archive:     'Arşiv',
    myprofile:   'Profilim'
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
    myprofile:     'viewMyprofile'
  };
  var el = document.getElementById(viewMap[view]);
  if (el) el.style.display = '';

  if (view === 'projects')      renderProjects();
  if (view === 'mytasks')       renderMyTasks();
  if (view === 'team')          renderTeam();
  if (view === 'notifications') renderNotificationsFull();
  if (view === 'calendar')      renderCalendar();
  if (view === 'archive')       renderArchive();
  if (view === 'myprofile')     renderMyProfile();   /* ← YENİ */
}


/* ================================================
   renderMyProfile — Listeyi ve formu doldurur
   Bu fonksiyon yoksa dashboard.js'e EKLE
   ================================================ */

function renderMyProfile() {
  var profile = getMyProfile();
  var ini = profile.name
    .split(' ')
    .map(function(w){ return w[0] || ''; })
    .join('')
    .toUpperCase()
    .slice(0, 2);

  /* Avatar & başlık */
  setText('mprfAvatarDisp', ini || '?');
  setText('mprfNameDisp',   profile.name  || '—');

  /* Bilgi listesi */
  setText('mprfListName',  profile.name  || '—');
  setText('mprfListEmail', profile.email || '—');
  setText('mprfListPhone', profile.phone || '—');

  var ghEl = document.getElementById('mprfListGithub');
  if (ghEl) {
    if (profile.github) {
      ghEl.textContent = profile.github;
      ghEl.href        = profile.github;
    } else {
      ghEl.textContent = '—';
      ghEl.href        = '#';
    }
  }

  /* Formu doldur */
  var f = function(id, val) {
    var el = document.getElementById(id);
    if (el) el.value = val || '';
  };
  f('mprfName',   profile.name);
  f('mprfEmail',  profile.email);
  f('mprfPhone',  profile.phone);
  f('mprfGithub', profile.github);
}


/* ================================================
   saveMyProfileFromView — Formu kaydeder
   Bu fonksiyon yoksa dashboard.js'e EKLE
   ================================================ */

function saveMyProfileFromView() {
  var nameEl = document.getElementById('mprfName');
  if (!nameEl) return;
  var name = nameEl.value.trim();
  if (!name) { alert('Ad Soyad zorunludur.'); return; }

  var data = {
    name:   name,
    email:  (document.getElementById('mprfEmail')  || {}).value || '',
    phone:  (document.getElementById('mprfPhone')  || {}).value || '',
    github: (document.getElementById('mprfGithub') || {}).value || ''
  };

  saveMyProfile(data);   /* mevcut fonksiyon — localStorage + sidebar günceller */
  renderMyProfile();     /* listeyi ve formu yenile */
  showSaveBar('Profil güncellendi.');
}