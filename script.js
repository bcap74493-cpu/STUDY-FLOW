// ===== DATA LAYER =====
const SUBJECTS = [
  {id:'math', name:'Mathematics', emoji:'📐', color:'#7c5cfc'},
  {id:'science', name:'Science', emoji:'🔬', color:'#06b6d4'},
  {id:'physics', name:'Physics', emoji:'⚡', color:'#38bdf8'},
  {id:'chemistry', name:'Chemistry', emoji:'⚗️', color:'#10b981'},
  {id:'biology', name:'Biology', emoji:'🧬', color:'#f43f5e'},
  {id:'social', name:'Social Science', emoji:'🌍', color:'#f59e0b'},
  {id:'history', name:'History', emoji:'📜', color:'#d97706'},
  {id:'geography', name:'Geography', emoji:'🗺️', color:'#84cc16'},
  {id:'political', name:'Pol. Science', emoji:'⚖️', color:'#f97316'},
  {id:'economics', name:'Economics', emoji:'📈', color:'#a78bfa'},
  {id:'english', name:'English', emoji:'📖', color:'#ec4899'},
  {id:'cs', name:'Computer Science', emoji:'💻', color:'#22d3ee'},
  {id:'other', name:'Other', emoji:'✏️', color:'#8b5cf6'},
];

function ls(key, fallback=null){try{const v=localStorage.getItem(key);return v?JSON.parse(v):fallback}catch{return fallback}}
function ss(key,val){localStorage.setItem(key,JSON.stringify(val))}

let state = {
  user: ls('sf_user'),
  tasks: ls('sf_tasks',[]),
  notes: ls('sf_notes',[]),
  streak: ls('sf_streak',{count:0, lastDate:'', history:[]}),
  pomSessions: ls('sf_pomSessions',0),
  pomLog: ls('sf_pomLog',[]),
  settings: ls('sf_settings',{dark:true, notif:true}),
  currentFilter:'all',
  subjectFilter:'all',
  editTaskId:null,
  calDate: new Date(),
  selectedCalDate: new Date(),
};

// ===== AUTH =====
function switchAuthTab(tab){
  document.querySelectorAll('.login-tab').forEach((t,i)=>{t.classList.toggle('active',i===(tab==='login'?0:1))});
  document.getElementById('loginForm').style.display = tab==='login'?'':'none';
  document.getElementById('registerForm').style.display = tab==='register'?'':'none';
}
function handleLogin(){
  const email=document.getElementById('loginEmail').value.trim();
  const pass=document.getElementById('loginPass').value;
  if(!email||!pass){toast('⚠️','Error','Please fill in all fields');return}
  const users=ls('sf_users',[]);
  const user=users.find(u=>u.email===email&&u.password===pass);
  if(!user){toast('❌','Error','Invalid email or password');return}
  state.user=user; ss('sf_user',user);
  initApp();
}
function handleRegister(){
  const name=document.getElementById('regName').value.trim();
  const email=document.getElementById('regEmail').value.trim();
  const pass=document.getElementById('regPass').value;
  if(!name||!email||!pass){toast('⚠️','Error','Please fill in all fields');return}
  const users=ls('sf_users',[]);
  if(users.find(u=>u.email===email)){toast('❌','Error','Email already registered');return}
  const user={id:Date.now(),name,email,password:pass,avatar:name.charAt(0).toUpperCase()};
  users.push(user); ss('sf_users',users);
  state.user=user; ss('sf_user',user);
  initApp();
}
function logout(){
  ss('sf_user',null); state.user=null;
  document.getElementById('app').style.display='none';
  document.getElementById('loginScreen').style.display='flex';
  toast('👋','Signed Out','See you next time!');
}

// ===== APP INIT =====
function initApp(){
  document.getElementById('loginScreen').style.display='none';
  document.getElementById('app').style.display='block';
  updateUserUI();
  buildSubjectGrid();
  buildSubjectFilters();
  buildNoteSubjectSelect();
  updateStreak();
  showPage('dashboard');
  applySettings();
  setInterval(checkNotifications, 5000);
  if(state.settings.dark) document.body.classList.remove('light-mode');
  else document.body.classList.add('light-mode');
}

function updateUserUI(){
  if(!state.user) return;
  const avatar=state.user.avatar||state.user.name.charAt(0).toUpperCase();
  document.getElementById('topUserAvatar').textContent=avatar;
  document.getElementById('topUserName').textContent=state.user.name.split(' ')[0];
  document.getElementById('greetName').textContent=state.user.name.split(' ')[0];
  document.getElementById('profileName').value=state.user.name;
  document.getElementById('profileEmail').textContent=state.user.email;
  const hour=new Date().getHours();
  const g=hour<12?'morning':hour<17?'afternoon':'evening';
  document.getElementById('timeGreeting').textContent=g;
  document.getElementById('todayDate').textContent=new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
}

// ===== PAGES =====
function showPage(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.bottom-nav-btn').forEach(b=>b.classList.remove('active'));
  const p=document.getElementById('page-'+page);
  if(p) p.classList.add('active');
  const n=document.getElementById('nav-'+page);
  if(n) n.classList.add('active');
  const bn=document.getElementById('bnav-'+page);
  if(bn) bn.classList.add('active');
  if(page==='dashboard') renderDashboard();
  if(page==='tasks') renderTasks();
  if(page==='analytics') renderAnalytics();
  if(page==='notes') renderNotes();
  if(page==='calendar') renderCalendar();
  if(page==='calculator') renderCalculatorPage();
  if(page==='pomodoro') renderPomodoroStats();
  if(page==='settings') renderSettings();
}

// ===== SUBJECTS =====
function buildSubjectGrid(){
  const grid=document.getElementById('subjectGrid');
  grid.innerHTML=SUBJECTS.map(s=>`
    <button class="subject-btn" data-id="${s.id}" onclick="selectSubject('${s.id}',this)">
      ${s.emoji} ${s.name}
    </button>`).join('');
  selectSubject(SUBJECTS[0].id, grid.querySelector('.subject-btn'));
}
let selectedSubject=SUBJECTS[0].id;
function selectSubject(id,el){
  selectedSubject=id;
  document.querySelectorAll('#subjectGrid .subject-btn').forEach(b=>b.classList.remove('selected'));
  if(el) el.classList.add('selected');
}
function buildSubjectFilters(){
  const row=document.getElementById('subjectFilterRow');
  row.innerHTML='<button class="filter-chip active" onclick="setSubjectFilter(\'all\',this)">All Subjects</button>'+
    SUBJECTS.map(s=>`<button class="filter-chip" onclick="setSubjectFilter('${s.id}',this)">${s.emoji} ${s.name}</button>`).join('');
}
function buildNoteSubjectSelect(){
  const sel=document.getElementById('noteSubject');
  sel.innerHTML='<option value="">No subject</option>'+SUBJECTS.map(s=>`<option value="${s.id}">${s.emoji} ${s.name}</option>`).join('');
}
function getSubject(id){return SUBJECTS.find(s=>s.id===id)||SUBJECTS[SUBJECTS.length-1]}

// ===== DASHBOARD =====
function renderDashboard(){
  const tasks=state.tasks;
  const total=tasks.length, completed=tasks.filter(t=>t.completed).length;
  const today=todayStr();
  const todayTasks=tasks.filter(t=>t.date===today);
  const overdue=tasks.filter(t=>!t.completed && t.date && t.date<today).length;
  document.getElementById('totalTasksStat').textContent=total;
  document.getElementById('completedStat').textContent=completed;
  document.getElementById('streakStat').textContent=state.streak.count;
  document.getElementById('notesStat').textContent=state.notes.length;
  const pct=total>0?Math.round(completed/total*100):0;
  const circumference=339.3;
  const offset=circumference*(1-pct/100);
  document.getElementById('mainRing').style.strokeDashoffset=offset;
  document.getElementById('ringPercent').textContent=pct+'%';
  document.getElementById('ringComp').textContent=completed;
  document.getElementById('ringPend').textContent=total-completed;
  document.getElementById('ringOver').textContent=overdue;
  document.getElementById('miniBar1').style.width=(total?completed/total*100:0)+'%';
  document.getElementById('miniBar2').style.width=(total?(total-completed)/total*100:0)+'%';
  document.getElementById('miniBar3').style.width=(total?overdue/total*100:0)+'%';
  document.getElementById('streakCount').textContent=state.streak.count;
  renderStreakDots();
  renderUpcomingTasks();
  renderDailySummary(todayTasks, completed);
}

function renderDailySummary(todayTasks, totalCompleted){
  const el=document.getElementById('summaryItems');
  const pending=todayTasks.filter(t=>!t.completed).length;
  const done=todayTasks.filter(t=>t.completed).length;
  el.innerHTML=[
    `<div class="summary-item">📋 <span>${todayTasks.length} today</span></div>`,
    `<div class="summary-item" style="color:var(--green)">✅ <span>${done} done</span></div>`,
    `<div class="summary-item" style="color:var(--gold)">⏳ <span>${pending} pending</span></div>`,
    `<div class="summary-item" style="color:var(--accent2)">🔥 <span>${state.streak.count} streak</span></div>`,
    `<div class="summary-item" style="color:var(--teal)">📝 <span>${state.notes.length} notes</span></div>`,
  ].join('');
}

function renderStreakDots(){
  const container=document.getElementById('streakDots');
  const days=['Mo','Tu','We','Th','Fr','Sa','Su'];
  const today=new Date().getDay();
  container.innerHTML=days.map((d,i)=>{
    const active=i<=(today===0?6:today-1) && state.streak.count>=(today===0?7-i:today-i);
    return `<div class="streak-dot ${active?'active':'inactive'}">${active?'🔥':d}</div>`;
  }).join('');
}

function renderUpcomingTasks(){
  const el=document.getElementById('upcomingTasks');
  const today=todayStr();
  const upcoming=state.tasks.filter(t=>!t.completed && t.date>=today).sort((a,b)=>a.date>b.date?1:-1).slice(0,4);
  if(!upcoming.length){
    el.innerHTML='<div class="empty-state"><div class="empty-icon">🎉</div><p>All caught up! No upcoming tasks.</p></div>';
    return;
  }
  el.innerHTML=upcoming.map(t=>miniTaskCard(t)).join('');
}

function miniTaskCard(t){
  const s=getSubject(t.subject);
  return `<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">
    <div style="width:36px;height:36px;border-radius:10px;background:${s.color}22;display:flex;align-items:center;justify-content:center;font-size:18px">${s.emoji}</div>
    <div style="flex:1;min-width:0">
      <div style="font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.title}</div>
      <div style="font-size:12px;color:var(--text2)">${t.date} ${t.time||''}</div>
    </div>
    <div style="font-size:11px;padding:3px 10px;border-radius:20px;background:${s.color}22;color:${s.color}">${s.name}</div>
  </div>`;
}

// ===== TASKS =====
let activeTimers={};
function getFilteredTasks(){
  const filter=state.currentFilter, sub=state.subjectFilter;
  const search=document.getElementById('searchInput')?document.getElementById('searchInput').value.toLowerCase():'';
  const today=todayStr();
  let tasks=[...state.tasks];
  if(filter==='today') tasks=tasks.filter(t=>t.date===today);
  else if(filter==='pending') tasks=tasks.filter(t=>!t.completed);
  else if(filter==='completed') tasks=tasks.filter(t=>t.completed);
  else if(filter==='overdue') tasks=tasks.filter(t=>!t.completed&&t.date&&t.date<today);
  if(sub!=='all') tasks=tasks.filter(t=>t.subject===sub);
  if(search) tasks=tasks.filter(t=>t.title.toLowerCase().includes(search)||t.desc?.toLowerCase().includes(search));
  tasks.sort((a,b)=>{
    if(a.completed!==b.completed) return a.completed?1:-1;
    if(a.date&&b.date) return a.date>b.date?1:-1;
    return 0;
  });
  return tasks;
}

let _lastRenderedTaskIds=[];
let _newlyAddedTaskId=null; // set by saveTask() for the brand-new card only

function renderTasks(){
  const tasks=getFilteredTasks();
  const list=document.getElementById('tasksList');
  if(!tasks.length){
    list.innerHTML='<div class="empty-state"><div class="empty-icon">📭</div><p>No tasks found.<br>Add a task to get started!</p></div>';
    _lastRenderedTaskIds=[];
    return;
  }
  const existingIds=Array.from(list.querySelectorAll('.task-card')).map(el=>el.dataset.id);
  const newIds=tasks.map(t=>t.id);
  const orderChanged=JSON.stringify(existingIds)!==JSON.stringify(newIds);
  if(orderChanged){
    // Only animate the brand-new card, not all
    list.innerHTML=tasks.map(t=>renderTaskCard(t, t.id===_newlyAddedTaskId)).join('');
    _newlyAddedTaskId=null;
  } else {
    // Same order — just update timer footers in-place, zero re-render
    updateTaskTimersInPlace();
  }
  _lastRenderedTaskIds=newIds;
}

// Called only to refresh timer display without touching the whole card DOM
function updateTaskTimersInPlace(){
  const list=document.getElementById('tasksList');
  if(!list) return;
  list.querySelectorAll('.task-card').forEach(card=>{
    const id=card.dataset.id;
    const timerInfo=activeTimers[id];
    let footer=card.querySelector('.task-footer-timer');
    if(timerInfo){
      const pct=(1-timerInfo.remaining/timerInfo.total)*100;
      if(footer){
        const timeEl=footer.querySelector('.timer-time-val');
        const barEl=footer.querySelector('.task-progress-fill');
        if(timeEl) timeEl.textContent=formatTime(timerInfo.remaining);
        if(barEl) barEl.style.width=pct+'%';
      } else {
        // inject footer
        footer=document.createElement('div');
        footer.className='task-footer task-footer-timer';
        footer.innerHTML=`<div class="task-timer"><span class="timer-dot"></span><span class="timer-time-val">${formatTime(timerInfo.remaining)}</span></div><div class="task-progress"><div class="task-progress-fill" style="width:${pct}%"></div></div>`;
        card.appendChild(footer);
      }
    } else {
      if(footer) footer.remove();
    }
  });
}

function renderTaskCard(t, isNew=false){
  const s=getSubject(t.subject);
  const today=todayStr();
  const overdue=!t.completed&&t.date&&t.date<today;
  const timerInfo=activeTimers[t.id];
  const priorityColor=t.priority==='high'?'var(--rose)':t.priority==='low'?'var(--teal)':'var(--text3)';
  return `<div class="task-card${isNew?' task-new':''} subject-${t.subject} ${t.completed?'completed':''}" data-id="${t.id}">
    <div class="task-top">
      <div class="task-checkbox ${t.completed?'checked':''}" onclick="toggleTask('${t.id}')"></div>
      <div class="task-body">
        <div class="task-title">${t.title}</div>
        ${t.desc?`<div style="font-size:13px;color:var(--text2);margin-bottom:6px;line-height:1.5">${t.desc}</div>`:''}
        <div class="task-meta">
          <div class="task-subject" style="background:${s.color}22;color:${s.color}">${s.emoji} ${s.name}</div>
          ${t.date?`<div class="task-date">${overdue?'⚠️':'📅'} ${t.date}${t.time?' '+t.time:''}</div>`:''}
          ${t.priority!=='normal'?`<div style="font-size:11px;padding:2px 8px;border-radius:20px;background:${priorityColor}22;color:${priorityColor};font-weight:600">${t.priority==='high'?'🔴 High':'🔵 Low'}</div>`:''}
        </div>
      </div>
      <div class="task-actions">
        ${!t.completed&&t.timerMin?`<button class="task-action-btn" onclick="openTimer('${t.id}')" title="Start timer">⏱</button>`:''}
        <button class="task-action-btn" onclick="editTask('${t.id}')" title="Edit">✏️</button>
        <button class="task-action-btn danger" onclick="deleteTask('${t.id}')" title="Delete">🗑</button>
      </div>
    </div>
    ${timerInfo?`<div class="task-footer task-footer-timer">
      <div class="task-timer"><span class="timer-dot"></span><span class="timer-time-val">${formatTime(timerInfo.remaining)}</span></div>
      <div class="task-progress"><div class="task-progress-fill" style="width:${(1-timerInfo.remaining/timerInfo.total)*100}%"></div></div>
    </div>`:''}
  </div>`;
}

function toggleTask(id){
  const idx=state.tasks.findIndex(t=>t.id===id);
  if(idx<0) return;
  state.tasks[idx].completed=!state.tasks[idx].completed;
  state.tasks[idx].completedAt=state.tasks[idx].completed?new Date().toISOString():null;
  ss('sf_tasks',state.tasks);
  updateStreak();
  // Surgical DOM update — no full re-render, no blip
  const card=document.querySelector(`.task-card[data-id="${id}"]`);
  if(card){
    const cb=card.querySelector('.task-checkbox');
    if(state.tasks[idx].completed){
      card.classList.add('completed');
      cb.classList.add('checked');
    } else {
      card.classList.remove('completed');
      cb.classList.remove('checked');
    }
  }
  // Re-render only if filter would hide/show this card
  const f=state.currentFilter;
  if(f==='pending'||f==='completed'||f==='overdue'){
    renderTasks();
  }
  renderDashboard();
  if(state.tasks[idx].completed) toast('🎉','Task Complete!','Great job finishing "'+state.tasks[idx].title.substring(0,30)+'"');
}

function deleteTask(id){
  state.tasks=state.tasks.filter(t=>t.id!==id);
  delete activeTimers[id];
  ss('sf_tasks',state.tasks);
  renderTasks();renderDashboard();
  toast('🗑','Task Deleted','Task removed successfully');
}

function setFilter(f,el){
  state.currentFilter=f;
  document.querySelectorAll('#filterRow .filter-chip').forEach(c=>c.classList.remove('active'));
  if(el) el.classList.add('active');
  renderTasks();
}
function setSubjectFilter(f,el){
  state.subjectFilter=f;
  document.querySelectorAll('#subjectFilterRow .filter-chip').forEach(c=>c.classList.remove('active'));
  if(el) el.classList.add('active');
  renderTasks();
}
function filterTasks(){renderTasks()}

// ===== ADD/EDIT TASK =====
function openAddTask(){
  state.editTaskId=null;
  document.getElementById('modalTitle').textContent='✨ Add New Task';
  document.getElementById('taskSubmitBtn').textContent='Save Task';
  document.getElementById('taskTitle').value='';
  document.getElementById('taskDesc').value='';
  document.getElementById('taskDate').value=todayStr();
  document.getElementById('taskTime').value='';
  document.getElementById('taskTimer').value='';
  document.getElementById('taskPriority').value='normal';
  buildSubjectGrid();
  openModal('addTaskModal');
}

function editTask(id){
  const t=state.tasks.find(t=>t.id===id);
  if(!t) return;
  state.editTaskId=id;
  document.getElementById('modalTitle').textContent='✏️ Edit Task';
  document.getElementById('taskSubmitBtn').textContent='Update Task';
  document.getElementById('taskTitle').value=t.title;
  document.getElementById('taskDesc').value=t.desc||'';
  document.getElementById('taskDate').value=t.date||'';
  document.getElementById('taskTime').value=t.time||'';
  document.getElementById('taskTimer').value=t.timerMin||'';
  document.getElementById('taskPriority').value=t.priority||'normal';
  buildSubjectGrid();
  setTimeout(()=>{
    const btn=document.querySelector(`#subjectGrid [data-id="${t.subject}"]`);
    if(btn) selectSubject(t.subject,btn);
  },50);
  openModal('addTaskModal');
}

function saveTask(){
  const title=document.getElementById('taskTitle').value.trim();
  if(!title){toast('⚠️','Error','Please enter a task title');return}
  const task={
    id:state.editTaskId||'task_'+Date.now(),
    title,
    desc:document.getElementById('taskDesc').value.trim(),
    subject:selectedSubject,
    date:document.getElementById('taskDate').value,
    time:document.getElementById('taskTime').value,
    timerMin:parseInt(document.getElementById('taskTimer').value)||0,
    priority:document.getElementById('taskPriority').value,
    completed:false,
    createdAt:new Date().toISOString(),
  };
  if(state.editTaskId){
    const idx=state.tasks.findIndex(t=>t.id===state.editTaskId);
    task.completed=state.tasks[idx].completed;
    task.completedAt=state.tasks[idx].completedAt;
    state.tasks[idx]=task;
    toast('✅','Task Updated','Task updated successfully');
  } else {
    state.tasks.unshift(task);
    _newlyAddedTaskId=task.id; // only animate the brand-new card
    toast('✅','Task Added',`"${title.substring(0,30)}" added`);
  }
  ss('sf_tasks',state.tasks);
  closeModal('addTaskModal');
  renderTasks();renderDashboard();
}

// ===== TIMER =====
let activeTaskTimer={id:null,remaining:0,total:0,interval:null,running:false};

function openTimer(id){
  const t=state.tasks.find(t=>t.id===id);
  if(!t) return;

  // If a DIFFERENT task's timer is running, just switch context (don't stop it)
  if(activeTaskTimer.running && activeTaskTimer.id !== id){
    clearInterval(activeTaskTimer.interval);
    activeTaskTimer.interval=null;
    activeTaskTimer.running=false;
    activeTimers[activeTaskTimer.id]={remaining:activeTaskTimer.remaining,total:activeTaskTimer.total};
    updateTaskTimersInPlace();
  }

  document.getElementById('timerTaskName').textContent=t.title;
  activeTaskTimer.id=id;
  activeTaskTimer.total=t.timerMin*60;
  const existing=activeTimers[id];
  activeTaskTimer.remaining=existing ? existing.remaining : t.timerMin*60;

  // Restore running state if this task was already counting
  const wasRunning=activeTaskTimer.running;
  document.getElementById('timerStartBtn').textContent=wasRunning ? '⏸ Pause' : (existing ? '▶ Resume' : '▶ Start');
  updateTimerDisplay();
  openModal('timerModal');
}

function pauseAndCloseTimer(){
  // Just close the modal — timer keeps running in background
  // Only pause when user explicitly clicks Pause button
  closeModal('timerModal');
}

function toggleTimer(){
  if(activeTaskTimer.running){
    // PAUSE
    clearInterval(activeTaskTimer.interval);
    activeTaskTimer.interval=null;
    activeTaskTimer.running=false;
    activeTimers[activeTaskTimer.id]={remaining:activeTaskTimer.remaining,total:activeTaskTimer.total};
    document.getElementById('timerStartBtn').textContent='▶ Resume';
    updateTaskTimersInPlace();
  } else {
    // START / RESUME
    if(activeTaskTimer.remaining<=0) return;
    activeTaskTimer.running=true;
    document.getElementById('timerStartBtn').textContent='⏸ Pause';
    activeTaskTimer.interval=setInterval(()=>{
      if(activeTaskTimer.remaining>0){
        activeTaskTimer.remaining--;
        activeTimers[activeTaskTimer.id]={remaining:activeTaskTimer.remaining,total:activeTaskTimer.total};
        // Update modal if open, and task card footer
        if(document.getElementById('timerModal')?.classList.contains('open')) updateTimerDisplay();
        updateTaskTimersInPlace();
      }
      if(activeTaskTimer.remaining<=0){
        clearInterval(activeTaskTimer.interval);
        activeTaskTimer.interval=null;
        activeTaskTimer.running=false;
        delete activeTimers[activeTaskTimer.id];
        sendNotification('⏱ Timer Done!','Your task timer has ended!');
        toast('⏱','Timer Done!','Your task timer has ended!');
        document.getElementById('timerStartBtn').textContent='▶ Start';
        updateTimerDisplay();
        updateTaskTimersInPlace();
        closeModal('timerModal');
      }
    },1000);
  }
}
function resetTimer(){
  clearInterval(activeTaskTimer.interval);
  activeTaskTimer.interval=null;
  const t=state.tasks.find(t=>t.id===activeTaskTimer.id);
  activeTaskTimer.remaining=t?t.timerMin*60:0;
  activeTaskTimer.running=false;
  delete activeTimers[activeTaskTimer.id];
  document.getElementById('timerStartBtn').textContent='▶ Start';
  updateTimerDisplay();
  updateTaskTimersInPlace();
}
function updateTimerDisplay(){
  const el=document.getElementById('timerDisplay');
  if(el) el.textContent=formatTime(activeTaskTimer.remaining);
  // Keep button label in sync
  const btn=document.getElementById('timerStartBtn');
  if(btn) btn.textContent=activeTaskTimer.running ? '⏸ Pause' : (activeTaskTimer.remaining<activeTaskTimer.total ? '▶ Resume' : '▶ Start');
}
function updateTimers(){
  // handled in interval
}
function formatTime(secs){
  const m=Math.floor(secs/60),s=secs%60;
  return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}

// ===== NOTIFICATIONS =====
function sendNotification(title,body){
  if(!state.settings.notif) return;
  if('Notification' in window&&Notification.permission==='granted'){
    new Notification(title,{body,icon:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📚</text></svg>'});
  }
}
function checkNotifications(){
  if('Notification' in window&&Notification.permission==='default'){
    Notification.requestPermission();
  }
}

// ===== ANALYTICS =====
let charts={};
function renderAnalytics(){
  const tasks=state.tasks;
  const completed=tasks.filter(t=>t.completed).length;
  const pending=tasks.filter(t=>!t.completed).length;
  const today=todayStr();
  const overdue=tasks.filter(t=>!t.completed&&t.date&&t.date<today).length;
  const el=document.getElementById('analyticsStats');
  el.innerHTML=[
    `<div class="stat-card"><div class="stat-icon">📊</div><div class="stat-value">${tasks.length}</div><div class="stat-label">Total Tasks</div></div>`,
    `<div class="stat-card"><div class="stat-icon">✅</div><div class="stat-value">${completed}</div><div class="stat-label">Completed</div></div>`,
    `<div class="stat-card"><div class="stat-icon">⏳</div><div class="stat-value">${pending}</div><div class="stat-label">Pending</div></div>`,
    `<div class="stat-card"><div class="stat-icon">⚠️</div><div class="stat-value">${overdue}</div><div class="stat-label">Overdue</div></div>`,
  ].join('');
  renderDoughnutChart(completed,pending,overdue);
  renderBarChart();
  renderWeekBars();
  renderRadarChart();
}

function renderDoughnutChart(comp,pend,over){
  const ctx=document.getElementById('doughnutChart');
  if(charts.doughnut) charts.doughnut.destroy();
  charts.doughnut=new Chart(ctx,{
    type:'doughnut',
    data:{
      labels:['Completed','Pending','Overdue'],
      datasets:[{data:[comp,pend,over],backgroundColor:['#10b981','#f59e0b','#f43f5e'],borderWidth:0,hoverOffset:6}]
    },
    options:{
      responsive:true,maintainAspectRatio:true,cutout:'72%',
      plugins:{
        legend:{position:'bottom',labels:{color:'#9898b8',font:{family:'DM Sans',size:12},padding:16}},
        tooltip:{callbacks:{label:c=>' '+c.label+': '+c.raw}}
      }
    }
  });
}

function renderBarChart(){
  const ctx=document.getElementById('barChart');
  if(charts.bar) charts.bar.destroy();
  const subjectCounts=SUBJECTS.map(s=>{
    const t=state.tasks.filter(t=>t.subject===s.id);
    return {name:s.name.substring(0,6),total:t.length,done:t.filter(t=>t.completed).length,color:s.color};
  }).filter(s=>s.total>0);
  charts.bar=new Chart(ctx,{
    type:'bar',
    data:{
      labels:subjectCounts.map(s=>s.name),
      datasets:[
        {label:'Total',data:subjectCounts.map(s=>s.total),backgroundColor:subjectCounts.map(s=>s.color+'55'),borderColor:subjectCounts.map(s=>s.color),borderWidth:2,borderRadius:6},
        {label:'Done',data:subjectCounts.map(s=>s.done),backgroundColor:subjectCounts.map(s=>s.color+'99'),borderColor:subjectCounts.map(s=>s.color),borderWidth:0,borderRadius:6}
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:true,
      plugins:{legend:{labels:{color:'#9898b8',font:{family:'DM Sans',size:11}}}},
      scales:{
        x:{ticks:{color:'#9898b8',font:{size:10}},grid:{color:'rgba(255,255,255,0.05)'}},
        y:{ticks:{color:'#9898b8',font:{size:10}},grid:{color:'rgba(255,255,255,0.05)'}}
      }
    }
  });
}

function renderWeekBars(){
  const el=document.getElementById('weekBars');
  const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const today=new Date();
  const weekData=days.map((_,i)=>{
    const d=new Date(today);
    d.setDate(today.getDate()-today.getDay()+i+1);
    const ds=d.toISOString().split('T')[0];
    return {day:days[i],count:state.tasks.filter(t=>t.completedAt&&t.completedAt.startsWith(ds)).length};
  });
  const max=Math.max(...weekData.map(d=>d.count),1);
  el.innerHTML=weekData.map(d=>`
    <div class="week-bar-wrap">
      <div class="week-bar-count">${d.count}</div>
      <div class="week-bar-track">
        <div class="week-bar-fill" style="height:${d.count/max*100}%"></div>
      </div>
      <div class="week-bar-label">${d.day}</div>
    </div>`).join('');
}

function renderRadarChart(){
  const ctx=document.getElementById('radarChart');
  if(charts.radar) charts.radar.destroy();
  const data=SUBJECTS.map(s=>{
    const t=state.tasks.filter(t=>t.subject===s.id);
    return t.length>0?Math.round(t.filter(t=>t.completed).length/t.length*100):0;
  });
  charts.radar=new Chart(ctx,{
    type:'radar',
    data:{
      labels:SUBJECTS.map(s=>s.name),
      datasets:[{label:'Completion %',data,backgroundColor:'rgba(124,92,252,0.2)',borderColor:'#7c5cfc',borderWidth:2,pointBackgroundColor:'#7c5cfc',pointRadius:4}]
    },
    options:{
      responsive:true,maintainAspectRatio:true,
      plugins:{legend:{labels:{color:'#9898b8'}}},
      scales:{r:{ticks:{color:'#9898b8',backdropColor:'transparent'},grid:{color:'rgba(255,255,255,0.08)'},pointLabels:{color:'#9898b8',font:{size:11}}}}
    }
  });
}

// ===== NOTES =====
let editNoteId=null;
function renderNotes(){
  const grid=document.getElementById('notesGrid');
  grid.innerHTML=`<div class="note-add-area" onclick="openNoteModal()">
    <div style="font-size:32px;margin-bottom:8px">📝</div>
    <div style="font-size:15px;font-weight:600">Add New Note</div>
    <div style="font-size:13px;margin-top:4px">Click to create a note</div>
  </div>`;
  state.notes.forEach(n=>{
    const s=getSubject(n.subject);
    const div=document.createElement('div');
    div.className='note-card';
    div.style.borderTop=`3px solid ${s.color}`;
    div.innerHTML=`
      <div class="note-title">${n.title||'Untitled'}</div>
      <div class="note-body">${n.content||''}</div>
      <div class="note-footer">
        <div>
          <div style="font-size:11px;padding:2px 8px;border-radius:20px;background:${s.color}22;color:${s.color};display:inline-block">${s.emoji} ${s.name}</div>
          <div class="note-date">${formatDate(n.createdAt)}</div>
        </div>
        <button class="note-delete" onclick="deleteNote('${n.id}',event)">🗑</button>
      </div>`;
    div.addEventListener('click',()=>openNoteModal(n.id));
    grid.appendChild(div);
  });
}
function openNoteModal(id=null){
  editNoteId=id;
  if(id){
    const n=state.notes.find(n=>n.id===id);
    document.getElementById('noteModalTitle').textContent='✏️ Edit Note';
    document.getElementById('noteTitle').value=n.title||'';
    document.getElementById('noteContent').value=n.content||'';
    document.getElementById('noteSubject').value=n.subject||'';
  } else {
    document.getElementById('noteModalTitle').textContent='📝 New Note';
    document.getElementById('noteTitle').value='';
    document.getElementById('noteContent').value='';
    document.getElementById('noteSubject').value='';
  }
  openModal('noteModal');
}
function saveNote(){
  const title=document.getElementById('noteTitle').value.trim();
  const content=document.getElementById('noteContent').value.trim();
  if(!title&&!content){toast('⚠️','Error','Please write something');return}
  const note={
    id:editNoteId||'note_'+Date.now(),
    title:title||'Untitled',
    content,subject:document.getElementById('noteSubject').value,
    createdAt:new Date().toISOString(),
  };
  if(editNoteId){
    const idx=state.notes.findIndex(n=>n.id===editNoteId);
    state.notes[idx]=note;
    toast('📝','Note Updated','');
  } else {
    state.notes.unshift(note);
    toast('📝','Note Saved','');
  }
  ss('sf_notes',state.notes);
  closeModal('noteModal');
  renderNotes();
  document.getElementById('notesStat').textContent=state.notes.length;
}
function deleteNote(id,e){
  e.stopPropagation();
  state.notes=state.notes.filter(n=>n.id!==id);
  ss('sf_notes',state.notes);
  renderNotes();
  toast('🗑','Note Deleted','');
}

// ===== CALENDAR =====
function renderCalendar(){
  renderCalGrid();
  renderCalTasks();
}
function renderCalGrid(){
  const d=state.calDate;
  document.getElementById('calMonthLabel').textContent=d.toLocaleDateString('en-US',{month:'long',year:'numeric'});
  const firstDay=new Date(d.getFullYear(),d.getMonth(),1).getDay();
  const daysInMonth=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
  const prevDays=new Date(d.getFullYear(),d.getMonth(),0).getDate();
  const today=new Date(); const todayStr2=todayStr();
  const grid=document.getElementById('calGrid'); grid.innerHTML='';
  for(let i=firstDay-1;i>=0;i--){
    const el=document.createElement('div');
    el.className='cal-day other-month';
    el.textContent=prevDays-i;
    grid.appendChild(el);
  }
  for(let i=1;i<=daysInMonth;i++){
    const dateStr=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
    const el=document.createElement('div');
    el.className='cal-day'+(dateStr===todayStr2?' today':'');
    const selStr=state.selectedCalDate.toISOString().split('T')[0];
    if(dateStr===selStr) el.classList.add('selected-day');
    const hasTasks=state.tasks.some(t=>t.date===dateStr);
    if(hasTasks) el.classList.add('has-tasks');
    el.textContent=i;
    el.onclick=()=>{state.selectedCalDate=new Date(dateStr+'T12:00:00');renderCalGrid();renderCalTasks();};
    grid.appendChild(el);
  }
}
function renderCalTasks(){
  const selStr=state.selectedCalDate.toISOString().split('T')[0];
  const tasks=state.tasks.filter(t=>t.date===selStr);
  document.getElementById('selectedDateLabel').textContent=new Date(selStr+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
  const el=document.getElementById('calendarTasks');
  if(!tasks.length){el.innerHTML='<div class="empty-state"><div class="empty-icon">📅</div><p>No tasks on this date</p></div>';return}
  el.innerHTML=tasks.map(t=>miniTaskCard(t)).join('');
}
function changeMonth(dir){
  state.calDate.setMonth(state.calDate.getMonth()+dir);
  renderCalendar();
}

// ===== POMODORO =====
const POM_DEFAULTS={focus:25,short:5,long:15};
let pom={
  phase:'focus',running:false,interval:null,
  remaining:25*60,total:25*60,sessions:0,
  customMins:{focus:25,short:5,long:15},
};
function getPomMins(phase){return pom.customMins[phase]||POM_DEFAULTS[phase];}

function adjustPomTime(delta){
  if(pom.running) return; // don't allow while running
  const phase=pom.phase;
  const cur=pom.customMins[phase];
  const newVal=Math.max(1,Math.min(120,cur+delta));
  pom.customMins[phase]=newVal;
  pom.remaining=newVal*60;
  pom.total=newVal*60;
  updatePomDisplay();
  updatePomTimeBadge();
}

function updatePomTimeBadge(){
  const mins=getPomMins(pom.phase);
  const defMins=POM_DEFAULTS[pom.phase];
  document.getElementById('pomTotalMins').textContent=mins+' min';
  const badge=document.getElementById('pomCustomBadge');
  if(mins!==defMins){
    badge.innerHTML=`<span class="pom-custom-badge">✏️ Custom: ${mins} min</span>`;
  } else {
    badge.innerHTML='';
  }
}

function setPomPhase(phase,el){
  clearInterval(pom.interval);pom.running=false;pom.phase=phase;
  const mins=getPomMins(phase);
  pom.remaining=mins*60;pom.total=mins*60;
  document.querySelectorAll('.pom-phase-btn').forEach(b=>b.classList.remove('active'));
  if(el) el.classList.add('active');
  const labels={focus:'Focus 🍅',short:'Short Break ☕',long:'Long Break 😴'};
  document.getElementById('pomPhaseLabel').textContent=labels[phase];
  document.getElementById('pomStartBtn').textContent='▶ Start';
  updatePomDisplay();
  updatePomTimeBadge();
}
function togglePom(){
  if(pom.running){
    clearInterval(pom.interval);pom.running=false;
    document.getElementById('pomStartBtn').textContent='▶ Resume';
  } else {
    pom.running=true;
    document.getElementById('pomStartBtn').textContent='⏸ Pause';
    pom.interval=setInterval(()=>{
      if(pom.remaining>0){pom.remaining--;updatePomDisplay();}
      else {
        clearInterval(pom.interval);pom.running=false;
        if(pom.phase==='focus'){pom.sessions++;ss('sf_pomSessions',pom.sessions);}
        const log={phase:pom.phase,at:new Date().toISOString(),duration:pom.total};
        state.pomLog.unshift(log);if(state.pomLog.length>20)state.pomLog.pop();
        ss('sf_pomLog',state.pomLog);
        sendNotification('⏱ Pomodoro Done!', pom.phase==='focus'?'Time for a break!':'Break over, back to work!');
        toast('⏱',pom.phase==='focus'?'Focus session done!':'Break time over!','');
        renderPomodoroStats();
        document.getElementById('pomStartBtn').textContent='▶ Start';
      }
    },1000);
  }
}
function resetPom(){
  clearInterval(pom.interval);pom.running=false;
  const mins=getPomMins(pom.phase);
  pom.remaining=mins*60;pom.total=mins*60;
  document.getElementById('pomStartBtn').textContent='▶ Start';
  updatePomDisplay();
}
function updatePomDisplay(){
  document.getElementById('pomTime').textContent=formatTime(pom.remaining);
  const pct=pom.total>0?1-(pom.remaining/pom.total):0;
  const circ=553;
  document.getElementById('pomRingFill').style.strokeDashoffset=circ*(1-pct);
}
function renderPomodoroStats(){
  const sessions=pom.sessions||ls('sf_pomSessions',0);
  const el=document.getElementById('pomStats');
  el.innerHTML=[
    `<div class="ring-stat-row"><div class="ring-stat-label">🍅 Total Sessions</div><div class="ring-stat-val">${sessions}</div></div>`,
    `<div class="ring-stat-row"><div class="ring-stat-label">⏱ Total Focus Time</div><div class="ring-stat-val">${Math.round(sessions*getPomMins('focus'))} min</div></div>`,
    `<div class="ring-stat-row"><div class="ring-stat-label">☕ Breaks Taken</div><div class="ring-stat-val">${sessions}</div></div>`,
  ].join('');
  const sessions4=document.getElementById('pomSessions');
  sessions4.innerHTML=Array.from({length:4},(_,i)=>`<div class="pom-session-dot ${i<(sessions%4)?'done':''}"></div>`).join('');
  document.getElementById('pomSessionNum').textContent=(sessions%4)+1;
  const log=document.getElementById('pomLog');
  const pomLog=state.pomLog||[];
  if(!pomLog.length){
    log.innerHTML='<div style="color:var(--text3);font-size:13px">No sessions yet</div>';
  } else {
    log.innerHTML=pomLog.slice(0,5).map(l=>`
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px;background:var(--surface);border-radius:10px">
        <div style="font-size:13px;font-weight:600">${l.phase==='focus'?'🍅 Focus':l.phase==='short'?'☕ Short Break':'😴 Long Break'}</div>
        <div style="font-size:12px;color:var(--text2)">${Math.round(l.duration/60)} min · ${formatDate(l.at)}</div>
      </div>`).join('');
  }
  buildScSubjectSelect();
  updatePomTimeBadge();
}

// ===== SUBJECT COMPUTER =====
let sc={expr:'', subject:'math', history:[]};
function buildScSubjectSelect(){
  const el=document.getElementById('scSubjectSelect');
  if(!el) return;
  el.innerHTML=SUBJECTS.slice(0,8).map(s=>`
    <button class="sc-subj-chip ${sc.subject===s.id?'active':''}" onclick="scSetSubject('${s.id}',this)">
      ${s.emoji} ${s.name.substring(0,6)}
    </button>`).join('');
}
function scSetSubject(id,el){
  sc.subject=id;
  document.querySelectorAll('.sc-subj-chip').forEach(b=>b.classList.remove('active'));
  if(el) el.classList.add('active');
}
function scInput(val){
  if(val==='C'){sc.expr=sc.expr.slice(0,-1);}
  else{ sc.expr+=val; }
  updateScDisplay();
}
function scBackspace(){sc.expr=sc.expr.slice(0,-1);updateScDisplay();}
function scClear(){sc.expr='';document.getElementById('scResult').textContent='0';document.getElementById('scExpression').textContent='';  }
function updateScDisplay(){
  document.getElementById('scExpression').textContent=sc.expr;
  try{
    let expr=sc.expr.replace(/÷/g,'/').replace(/×/g,'*').replace(/−/g,'-').replace(/√(\d+(\.\d+)?)/g,'Math.sqrt($1)').replace(/(\d+(\.\d+)?)\^(\d+(\.\d+)?)/g,'Math.pow($1,$3)');
    if(expr&&!expr.match(/[+\-*/(%^]$/)){
      const result=Function('"use strict";return ('+expr+')')();
      if(isFinite(result)) document.getElementById('scResult').textContent=parseFloat(result.toFixed(8)).toString();
    }
  } catch(e){}
}
function scCalculate(){
  try{
    let expr=sc.expr.replace(/÷/g,'/').replace(/×/g,'*').replace(/−/g,'-').replace(/√(\d+(\.\d+)?)/g,'Math.sqrt($1)').replace(/(\d+(\.\d+)?)\^(\d+(\.\d+)?)/g,'Math.pow($1,$3)');
    const result=Function('"use strict";return ('+expr+')')();
    const val=parseFloat(result.toFixed(8)).toString();
    document.getElementById('scResult').textContent=val;
    document.getElementById('scExpression').textContent=sc.expr+' =';
    const s=getSubject(sc.subject);
    sc.history.unshift({expr:sc.expr,result:val,subject:s.name,emoji:s.emoji});
    if(sc.history.length>10) sc.history.pop();
    sc.expr=val;
    renderScHistory();
  } catch(e){
    document.getElementById('scResult').textContent='Error';
    sc.expr='';
  }
}
function renderScHistory(){
  const el=document.getElementById('scHistory');
  if(!el) return;
  if(!sc.history.length){el.innerHTML='<div style="color:var(--text3);font-size:12px;padding:8px 0">No calculations yet</div>';return}
  el.innerHTML=sc.history.map(h=>`
    <div class="sc-hist-item">
      <span class="sc-hist-expr">${h.emoji} ${h.expr}</span>
      <span class="sc-hist-val">= ${h.result}</span>
    </div>`).join('');
}

// ===== MAIN CALCULATOR PAGE =====
let calc={expr:'', subject:'math', history:[], mode:'std'};

function renderCalculatorPage(){
  buildScMainSubjectSelect();
  renderScMainHistory();
  renderScSubjectStats();
}

function buildScMainSubjectSelect(){
  const el=document.getElementById('scSubjectSelectMain');
  if(!el) return;
  el.innerHTML=SUBJECTS.map(s=>`
    <button class="sc-subj-chip ${calc.subject===s.id?'active':''}"
      style="${calc.subject===s.id?'background:'+getSubject(s.id).color+';border-color:'+getSubject(s.id).color+';':''}"
      onclick="scMainSetSubject('${s.id}',this)">
      ${s.emoji} ${s.name.length>7?s.name.substring(0,7)+'…':s.name}
    </button>`).join('');
}

function scMainSetSubject(id, el){
  calc.subject=id;
  const s=getSubject(id);
  document.querySelectorAll('#scSubjectSelectMain .sc-subj-chip').forEach(b=>{
    b.classList.remove('active');
    b.style.background='';b.style.borderColor='';b.style.color='';
  });
  if(el){
    el.classList.add('active');
    el.style.background=s.color;
    el.style.borderColor=s.color;
    el.style.color='#fff';
  }
}

function setCalcMode(mode, el){
  calc.mode=mode;
  document.querySelectorAll('.sc-mode-btn').forEach(b=>b.classList.remove('active'));
  if(el) el.classList.add('active');
  document.getElementById('scKeypadSci').style.display=(mode==='sci')?'grid':'none';
}

function scM(val){
  if(val==='C'){calc.expr=calc.expr.slice(0,-1);}
  else if(val==='±'){
    // toggle sign
    if(calc.expr.startsWith('-')) calc.expr=calc.expr.slice(1);
    else calc.expr='-'+calc.expr;
  } else { calc.expr+=val; }
  scMainUpdateDisplay();
}
function scMBack(){calc.expr=calc.expr.slice(0,-1);scMainUpdateDisplay();}
function scMClear(){calc.expr='';document.getElementById('scResultMain').textContent='0';document.getElementById('scExpressionMain').textContent='';}
function scMClearHistory(){calc.history=[];renderScMainHistory();renderScSubjectStats();}

function factorial(n){
  n=Math.round(Math.abs(n));
  if(n>170) return Infinity;
  let r=1; for(let i=2;i<=n;i++) r*=i; return r;
}

function scMainUpdateDisplay(){
  document.getElementById('scExpressionMain').textContent=calc.expr;
  try{
    let expr=calc.expr
      .replace(/÷/g,'/').replace(/×/g,'*').replace(/−/g,'-')
      .replace(/π/g,'Math.PI').replace(/\be\b/g,'Math.E')
      .replace(/√(\d+(\.\d+)?)/g,'Math.sqrt($1)')
      .replace(/(\d+(\.\d+)?)\^(\d+(\.\d+)?)/g,'Math.pow($1,$3)')
      .replace(/(\d+(\.\d+)?)²/g,'Math.pow($1,2)')
      .replace(/(\d+)!/g,'factorial($1)')
      .replace(/sin\(/g,'Math.sin(').replace(/cos\(/g,'Math.cos(').replace(/tan\(/g,'Math.tan(')
      .replace(/log\(/g,'Math.log10(').replace(/abs\(/g,'Math.abs(')
      .replace(/1\//g,'1/');
    if(expr&&!expr.match(/[+\-*/(%^,]$/)){
      const result=Function('"use strict";const factorial='+factorial.toString()+';return ('+expr+')')();
      if(isFinite(result)) document.getElementById('scResultMain').textContent=parseFloat(result.toFixed(10)).toString();
    }
  } catch(e){}
}

function scCalc(){
  try{
    let expr=calc.expr
      .replace(/÷/g,'/').replace(/×/g,'*').replace(/−/g,'-')
      .replace(/π/g,'Math.PI').replace(/\be\b/g,'Math.E')
      .replace(/√(\d+(\.\d+)?)/g,'Math.sqrt($1)')
      .replace(/(\d+(\.\d+)?)\^(\d+(\.\d+)?)/g,'Math.pow($1,$3)')
      .replace(/(\d+(\.\d+)?)²/g,'Math.pow($1,2)')
      .replace(/(\d+)!/g,'factorial($1)')
      .replace(/sin\(/g,'Math.sin(').replace(/cos\(/g,'Math.cos(').replace(/tan\(/g,'Math.tan(')
      .replace(/log\(/g,'Math.log10(').replace(/abs\(/g,'Math.abs(');
    const result=Function('"use strict";const factorial='+factorial.toString()+';return ('+expr+')')();
    const val=parseFloat(result.toFixed(10)).toString();
    document.getElementById('scResultMain').textContent=val;
    document.getElementById('scExpressionMain').textContent=calc.expr+' =';
    const s=getSubject(calc.subject);
    calc.history.unshift({expr:calc.expr,result:val,subject:calc.subject,name:s.name,emoji:s.emoji,color:s.color,at:new Date().toISOString()});
    if(calc.history.length>50) calc.history.pop();
    calc.expr=val;
    renderScMainHistory();
    renderScSubjectStats();
  } catch(e){
    document.getElementById('scResultMain').textContent='Error';
    document.getElementById('scExpressionMain').textContent='Invalid expression';
    calc.expr='';
    setTimeout(()=>{document.getElementById('scResultMain').textContent='0';document.getElementById('scExpressionMain').textContent='';},1500);
  }
}

function renderScMainHistory(){
  const el=document.getElementById('scHistoryMain');
  if(!el) return;
  if(!calc.history.length){
    el.innerHTML='<div style="color:var(--text3);font-size:13px;padding:12px 0;text-align:center">No calculations yet.<br>Pick a subject and start calculating!</div>';
    return;
  }
  el.innerHTML=calc.history.map((h,i)=>`
    <div class="sc-hist-item" style="animation:noteIn 0.3s ease ${i*0.04}s both">
      <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
        <div style="width:28px;height:28px;border-radius:8px;background:${h.color}22;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">${h.emoji}</div>
        <div style="min-width:0">
          <div class="sc-hist-expr" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${h.expr}</div>
          <div style="font-size:10px;color:var(--text3)">${h.name} · ${formatDate(h.at)}</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex-shrink:0;margin-left:10px">
        <span class="sc-hist-val">${h.result}</span>
        <button onclick="scReuseResult('${h.result}')" style="font-size:10px;padding:2px 7px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--text3);cursor:pointer" title="Use result">↩</button>
      </div>
    </div>`).join('');
}

function scReuseResult(val){
  calc.expr=val;
  scMainUpdateDisplay();
}

function renderScSubjectStats(){
  const el=document.getElementById('scSubjectStats');
  if(!el) return;
  if(!calc.history.length){
    el.innerHTML='<div style="color:var(--text3);font-size:13px;padding:8px 0">No calculations yet</div>';
    return;
  }
  const counts={};
  calc.history.forEach(h=>{counts[h.subject]=(counts[h.subject]||0)+1;});
  const total=calc.history.length;
  const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  el.innerHTML=sorted.map(([subId,count])=>{
    const s=getSubject(subId);
    const pct=Math.round(count/total*100);
    return `<div style="margin-bottom:10px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
        <div style="display:flex;align-items:center;gap:7px;font-size:13px;font-weight:600">
          <span>${s.emoji}</span><span>${s.name}</span>
        </div>
        <span style="font-size:12px;color:var(--text2)">${count} calc · ${pct}%</span>
      </div>
      <div style="height:5px;background:var(--surface2);border-radius:10px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${s.color};border-radius:10px;transition:width 0.6s ease"></div>
      </div>
    </div>`;
  }).join('');
}

// keyboard support for calculator
document.addEventListener('keydown', e=>{
  if(document.getElementById('page-calculator')?.classList.contains('active')){
    const k=e.key;
    if(k>='0'&&k<='9'||k==='.') scM(k);
    else if(k==='+'||k==='-') scM(k==='+'?'+':'−');
    else if(k==='*') scM('×');
    else if(k==='/'){e.preventDefault();scM('÷');}
    else if(k==='%') scM('%');
    else if(k==='('||k===')') scM(k);
    else if(k==='Enter'||k==='='){e.preventDefault();scCalc();}
    else if(k==='Backspace') scMBack();
    else if(k==='Escape') scMClear();
  }
});
function updateStreak(){
  const today=todayStr();
  const s=state.streak;
  const hasCompleted=state.tasks.some(t=>t.completed&&t.completedAt&&t.completedAt.startsWith(today));
  if(hasCompleted){
    if(s.lastDate===today) return;
    const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
    const yStr=yesterday.toISOString().split('T')[0];
    if(s.lastDate===yStr) s.count++;
    else if(s.lastDate!==today) s.count=1;
    s.lastDate=today;
  } else if(s.lastDate&&s.lastDate<today){
    const lastD=new Date(s.lastDate),now=new Date();
    const diff=Math.floor((now-lastD)/86400000);
    if(diff>1) s.count=0;
  }
  ss('sf_streak',s);state.streak=s;
}

// ===== SETTINGS =====
function renderSettings(){
  document.getElementById('darkToggle').className='toggle'+(state.settings.dark?'':'')+(!state.settings.dark?' ':' on');
  document.getElementById('notifToggle').className='toggle'+(state.settings.notif?' on':'');
  document.getElementById('darkToggle').classList.toggle('on',!document.body.classList.contains('light-mode'));
}
function toggleDark(){
  document.body.classList.toggle('light-mode');
  state.settings.dark=!document.body.classList.contains('light-mode');
  ss('sf_settings',state.settings);
  document.getElementById('themeBtn').textContent=document.body.classList.contains('light-mode')?'🌙':'☀️';
  renderSettings();
}
function toggleNotif(){
  state.settings.notif=!state.settings.notif;
  ss('sf_settings',state.settings);
  renderSettings();
}
function applySettings(){
  if(!state.settings.dark) document.body.classList.add('light-mode');
  document.getElementById('themeBtn').textContent=document.body.classList.contains('light-mode')?'🌙':'☀️';
}
function saveProfile(){
  const name=document.getElementById('profileName').value.trim();
  if(!name) return;
  state.user.name=name;state.user.avatar=name.charAt(0).toUpperCase();
  ss('sf_user',state.user);
  updateUserUI();
}
function clearAllData(){
  if(!confirm('⚠️ This will delete ALL your tasks, notes, and streaks. Continue?')) return;
  state.tasks=[];state.notes=[];state.streak={count:0,lastDate:'',history:[]};
  ss('sf_tasks',[]);ss('sf_notes',[]);ss('sf_streak',{count:0,lastDate:'',history:[]});
  toast('🗑','All Data Cleared','Tasks, notes & streaks removed');
  renderDashboard();renderTasks();renderNotes();
}

// ===== MODALS =====
function openModal(id){document.getElementById(id).classList.add('open')}
function closeModal(id){document.getElementById(id).classList.remove('open')}
document.querySelectorAll('.modal-overlay').forEach(m=>{
  m.addEventListener('click',e=>{
    if(e.target===m) closeModal(m.id);
  });
});

// ===== TOAST =====
function toast(icon,title,msg,duration=3200){
  const c=document.getElementById('toastContainer');
  const el=document.createElement('div');
  el.className='toast';
  el.innerHTML=`<div class="toast-icon">${icon}</div><div class="toast-content"><div class="toast-title">${title}</div>${msg?`<div class="toast-msg">${msg}</div>`:''}</div>`;
  c.appendChild(el);
  setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),350)},duration);
}

// ===== FULLSCREEN =====
function toggleFullscreen(){
  if(!document.fullscreenElement) document.documentElement.requestFullscreen();
  else document.exitFullscreen();
}

// ===== UTILS =====
function todayStr(){return new Date().toISOString().split('T')[0]}
function formatDate(iso){if(!iso) return '';const d=new Date(iso);return d.toLocaleDateString('en-US',{month:'short',day:'numeric'})}

// ===== INIT =====
window.addEventListener('load',()=>{
  if(state.user){initApp();}
  else {
    // Demo account for easy testing
    const users=ls('sf_users',[]);
    if(!users.find(u=>u.email==='demo@studyflow.com')){
      users.push({id:1,name:'Alex Johnson',email:'demo@studyflow.com',password:'demo123',avatar:'A'});
      ss('sf_users',users);
    }
  }
});