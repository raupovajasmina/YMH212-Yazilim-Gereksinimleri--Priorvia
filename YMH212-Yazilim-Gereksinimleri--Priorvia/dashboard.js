/* ================================================
   PRIORVIA — dashboard.js
   Backend-ready: localStorage geçici,
   gerçek API'ye geçişte fetch() ile değiştirilir.
   ================================================ */

/* ── STATE ────────────────────────────────────── */
let tasks      = JSON.parse(localStorage.getItem('priorvia_tasks')    || '[]');
let activities = JSON.parse(localStorage.getItem('priorvia_activity') || '[]');
let dragId     = null;
let editId     = null;

/* ── INIT ─────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initDropdowns();
  initDrawer();
  initFilters();
  render();
  updateWelcome();
});

/* ── SIDEBAR ──────────────────────────────────── */
function initSidebar() {
  const sidebar = document.getElementById('dbSidebar');
  const main    = document.getElementById('dbMain');
  const btn     = document.getElementById('collapseBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    main.classList.toggle('collapsed');
  });
}

/* ── DROPDOWNS ────────────────────────────────── */
function initDropdowns() {
  setupToggle('notifToggle',   'notifDropdown');
  setupToggle('profileToggle', 'profileDropdown');
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.db-icon-wrap')) closeAllDropdowns();
  });
}
function setupToggle(btnId, dropId) {
  document.getElementById(btnId)?.addEventListener('click', (e) => {
    e.stopPropagation();
    const drop = document.getElementById(dropId);
    const wasOpen = drop.classList.contains('open');
    closeAllDropdowns();
    if (!wasOpen) drop.classList.add('open');
  });
}
function closeAllDropdowns() {
  document.querySelectorAll('.db-dropdown').forEach(d => d.classList.remove('open'));
}

/* ── DRAWER ───────────────────────────────────── */
function initDrawer() {
  document.getElementById('newTaskBtn')?.addEventListener('click', () => openDrawer('todo'));
  document.getElementById('drawerClose')?.addEventListener('click', closeDrawer);
  document.getElementById('drawerCancel')?.addEventListener('click', closeDrawer);
  document.getElementById('dbOverlay')?.addEventListener('click', closeDrawer);

  document.getElementById('fStatus')?.addEventListener('change', (e) => {
    const pg = document.getElementById('progressGroup');
    if (pg) pg.style.display = e.target.value === 'inprogress' ? 'flex' : 'none';
  });

  document.getElementById('fProgress')?.addEventListener('input', (e) => {
    const el = document.getElementById('progressVal');
    if (el) el.textContent = e.target.value;
  });

  document.getElementById('drawerSave')?.addEventListener('click', saveTask);

  document.getElementById('fTitle')?.addEventListener('input', () => {
    document.getElementById('fTitle').classList.remove('err');
    document.getElementById('fTitleErr').classList.remove('show');
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
  document.getElementById('progressGroup').style.display =
    defaultStatus === 'inprogress' ? 'flex' : 'none';
  document.getElementById('fTitle').classList.remove('err');
  document.getElementById('fTitleErr').classList.remove('show');

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
  document.getElementById('progressGroup').style.display =
    task.status === 'inprogress' ? 'flex' : 'none';

  document.getElementById('taskDrawer').classList.add('open');
  document.getElementById('dbOverlay').classList.add('open');
  document.getElementById('fTitle').focus();
}

function closeDrawer() {
  document.getElementById('taskDrawer').classList.remove('open');
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
    title:    title,
    desc:     document.getElementById('fDesc').value.trim(),
    priority: document.getElementById('fPriority').value,
    date:     document.getElementById('fDate').value,
    assignee: document.getElementById('fAssignee').value.trim(),
    status:   document.getElementById('fStatus').value,
    progress: parseInt(document.getElementById('fProgress').value) || 0,
  };

  if (editId) {
    tasks = tasks.map(function(t){ return t.id === editId ? Object.assign({}, t, taskData) : t; });
    addActivity('"' + title + '" güncellendi', 'orange');
    showSaveBar('Görev güncellendi.');
  } else {
    taskData.id = Date.now().toString();
    taskData.createdAt = new Date().toISOString();
    tasks.push(taskData);
    addActivity('Yeni görev: "' + title + '"', 'green');
    showSaveBar('Görev oluşturuldu.');
  }

  persist();
  render();
  closeDrawer();
}

/* ── RENDER ───────────────────────────────────── */
function render() {
  var priority = document.getElementById('filterPriority') ? document.getElementById('filterPriority').value : '';
  var assignee = document.getElementById('filterAssignee') ? document.getElementById('filterAssignee').value : '';

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
      colTasks.forEach(function(task){
        list.appendChild(buildCard(task));
      });
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

  var priorityLabel = { high: 'YÜKSEK', med: 'ORTA', low: 'DÜŞÜK' }[task.priority] || '';

  var progressHTML = '';
  if (task.status === 'inprogress' && task.progress > 0) {
    progressHTML = '<div class="db-card-progress">' +
      '<div class="db-card-prog-bar"><div class="db-card-prog-fill" style="width:' + task.progress + '%"></div></div>' +
      '<span class="db-card-prog-label">%' + task.progress + '</span>' +
      '</div>';
  }

  var dateHTML = '';
  if (task.date) {
    var d = new Date(task.date);
    var today = new Date(); today.setHours(0,0,0,0);
    var isOverdue = d < today && task.status !== 'done';
    dateHTML = '<span class="db-card-date' + (isOverdue ? ' overdue' : '') + '">' +
      '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
      formatDate(d) + (isOverdue ? ' ⚠' : '') +
      '</span>';
  }

  var assigneeHTML = task.assignee
    ? '<span class="db-card-assignee">' + escHtml(initials(task.assignee)) + '</span>'
    : '';

  card.innerHTML =
    '<div class="db-card-top">' +
      '<span class="priority-tag ' + task.priority + '">' + priorityLabel + '</span>' +
      '<div class="db-card-actions">' +
        '<button class="db-card-btn" title="Düzenle" onclick="openEditDrawer(\'' + task.id + '\')">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
        '</button>' +
        '<button class="db-card-btn danger" title="Sil" onclick="deleteTask(\'' + task.id + '\')">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>' +
        '</button>' +
      '</div>' +
    '</div>' +
    '<div class="db-card-title">' + escHtml(task.title) + '</div>' +
    progressHTML +
    '<div class="db-card-meta">' + dateHTML + assigneeHTML + '</div>';

  return card;
}

/* ── DRAG & DROP ──────────────────────────────── */
function onDrop(e, col) {
  e.preventDefault();
  if (!dragId) return;
  var task = tasks.find(function(t){ return t.id === dragId; });
  tasks = tasks.map(function(t){ return t.id === dragId ? Object.assign({}, t, {status: col}) : t; });
  if (task) addActivity('"' + task.title + '" → ' + colLabel(col), 'blue');
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
  var total = tasks.length;
  var inprog = tasks.filter(function(t){ return t.status === 'inprogress'; }).length;
  var done   = tasks.filter(function(t){ return t.status === 'done'; }).length;
  var rate   = total > 0 ? Math.round((done / total) * 100) : 0;

  setText('statTotal',      total);
  setText('statInProgress', inprog);
  setText('statDone',       done);
  setText('statRate',       '%' + rate);

  var bar = document.getElementById('miniProgressFill');
  if (bar) bar.style.width = rate + '%';
  setText('myTaskCount', total);
}

/* ── ALERTS ───────────────────────────────────── */
function updateAlerts() {
  var list = document.getElementById('alertList');
  if (!list) return;
  var today = new Date(); today.setHours(0,0,0,0);
  var tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  var urgent = tasks.filter(function(t){
    if (!t.date || t.status === 'done') return false;
    return new Date(t.date) <= tomorrow;
  });

  if (urgent.length === 0) {
    list.innerHTML = '<p class="db-empty-sm">Yaklaşan teslim tarihi yok.</p>';
    return;
  }

  list.innerHTML = urgent.map(function(t) {
    var d = new Date(t.date);
    var today2 = new Date(); today2.setHours(0,0,0,0);
    var isOverdue = d < today2;
    return '<div class="db-alert-item">' +
      '<div class="db-alert-dot ' + (isOverdue ? 'db-dot-red' : 'db-dot-orange') + '"></div>' +
      '<div>' +
        '<div class="db-alert-title">' + escHtml(t.title) + '</div>' +
        '<div class="db-alert-sub">Teslim: <strong>' + formatDate(d) + '</strong>' + (isOverdue ? ' — gecikmiş' : '') + '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

/* ── ACTIVITY ─────────────────────────────────── */
function addActivity(text, color) {
  color = color || 'green';
  activities.unshift({ text: text, color: color, time: Date.now() });
  if (activities.length > 20) activities.pop();
  localStorage.setItem('priorvia_activity', JSON.stringify(activities));
}

function renderActivity() {
  var list = document.getElementById('activityList');
  if (!list) return;
  if (activities.length === 0) {
    list.innerHTML = '<p class="db-empty-sm">Henüz aktivite yok.</p>';
    return;
  }
  list.innerHTML = activities.slice(0,8).map(function(a) {
    return '<div class="db-activity-item">' +
      '<div class="db-act-dot db-act-' + a.color + '"></div>' +
      '<div>' +
        '<div style="font-size:12.5px;color:var(--text-primary)">' + escHtml(a.text) + '</div>' +
        '<div class="db-act-time">' + timeAgo(a.time) + '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

/* ── NOTIFICATIONS ────────────────────────────── */
function updateNotifBadge() {
  var today = new Date(); today.setHours(0,0,0,0);
  var tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);

  var urgent = tasks.filter(function(t){
    if (!t.date || t.status === 'done') return false;
    return new Date(t.date) <= tomorrow;
  });

  setText('notifBadge', urgent.length);
  var dot = document.getElementById('notifDot');
  if (dot) dot.style.display = urgent.length > 0 ? 'block' : 'none';

  var notifList = document.getElementById('notifList');
  if (!notifList) return;
  if (urgent.length === 0) {
    notifList.innerHTML = '<p class="db-empty-sm">Henüz bildirim yok.</p>';
    return;
  }
  notifList.innerHTML = urgent.map(function(t){
    return '<div class="db-notif-item unread">' +
      '<div class="db-notif-icon db-ni-orange">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
      '</div>' +
      '<div><div class="db-notif-title">' + escHtml(t.title) + '</div>' +
      '<div class="db-notif-time">Son gün: ' + formatDate(new Date(t.date)) + '</div></div>' +
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
  document.getElementById('filterPriority')?.addEventListener('change', render);
  document.getElementById('filterAssignee')?.addEventListener('change', render);
  document.getElementById('globalSearch')?.addEventListener('input', function(e){
    var q = e.target.value.toLowerCase();
    document.querySelectorAll('.db-task-card').forEach(function(card){
      var title = (card.querySelector('.db-card-title') || {}).textContent || '';
      card.style.display = title.toLowerCase().includes(q) ? '' : 'none';
    });
  });
}

/* ── WELCOME ──────────────────────────────────── */
function updateWelcome() {
  var hour = new Date().getHours();
  var g = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';
  setText('welcomeMsg', g + ' 👋');
}

/* ── PERSIST ──────────────────────────────────── */
function persist() {
  localStorage.setItem('priorvia_tasks', JSON.stringify(tasks));
}

/* ── SAVE BAR ─────────────────────────────────── */
var saveBarTimer = null;
function showSaveBar(msg) {
  msg = msg || 'Değişiklikler kaydedildi.';
  var bar = document.getElementById('saveBar');
  document.getElementById('saveBarMsg').textContent = msg;
  bar.classList.add('show');
  clearTimeout(saveBarTimer);
  saveBarTimer = setTimeout(function(){ bar.classList.remove('show'); }, 2600);
}

/* ── HELPERS ──────────────────────────────────── */
function setText(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val;
}
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function initials(name) {
  return String(name).split(' ').map(function(w){ return w[0]||''; }).join('').toUpperCase().slice(0,2);
}
function colLabel(col) {
  return {todo:'Yapılacak', inprogress:'Devam Ediyor', done:'Tamamlandı'}[col] || col;
}
function formatDate(d) {
  var today = new Date(); today.setHours(0,0,0,0);
  var tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
  var dd = new Date(d); dd.setHours(0,0,0,0);
  if (dd.getTime() === today.getTime()) return 'Bugün';
  if (dd.getTime() === tomorrow.getTime()) return 'Yarın';
  return dd.toLocaleDateString('tr-TR', {day:'numeric', month:'short'});
}
function timeAgo(ts) {
  var diff = Date.now() - ts;
  if (diff < 60000) return 'Az önce';
  if (diff < 3600000) return Math.floor(diff/60000) + ' dk önce';
  if (diff < 86400000) return Math.floor(diff/3600000) + ' saat önce';
  return Math.floor(diff/86400000) + ' gün önce';
}