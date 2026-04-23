// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLOCK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const API_URL = "http://localhost:3000";
function capNhatGio(){
  const now=new Date();
  const pad=n=>String(n).padStart(2,'0');
  document.getElementById('clock').textContent=`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} — ${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()}`;
}
capNhatGio();
setInterval(capNhatGio,1000);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STORAGE HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ls(key,fallback){
  try{const v=localStorage.getItem(key);return v===null?fallback:JSON.parse(v);}catch(e){return fallback;}
}
function ls_set(key,val){try{localStorage.setItem(key,JSON.stringify(val));}catch(e){}}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUTH
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function getUsers(){return ls('lf_users',[]);}
function saveUsers(u){ls_set('lf_users',u);}
function getCurrentUser(){return ls('lf_current',null);}
function setCurrentUser(u){if(u)ls_set('lf_current',u);else localStorage.removeItem('lf_current');}

function initAuth(){
  const user=getCurrentUser();
  const pill=document.getElementById('user-pill');
  const authBtns=document.getElementById('auth-btns');
  if(user){
    pill.style.display='flex';
    authBtns.style.display='none';
    document.getElementById('sidebar-username').textContent=user.name;
    const initials=user.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    document.getElementById('sidebar-ava').textContent=initials;
    updateStreakOnLogin();
  } else {
    pill.style.display='none';
    authBtns.style.display='block';
  }
  updateGreeting(user?user.name:null);
  updateNotifBadge();
}

function updateGreeting(name){
  const h=new Date().getHours();
  const time=h<12?'sáng':h<18?'chiều':'tối';
  document.getElementById('page-title').textContent=name?`Chào buổi ${time}, ${name} 👋`:'Dashboard';
}

function openAuthModal(view){
  document.getElementById('auth-modal-bg').classList.add('open');
  document.getElementById('auth-view-login').style.display=view==='login'?'block':'none';
  document.getElementById('auth-view-signup').style.display=view==='signup'?'block':'none';
  document.getElementById('login-err').style.display='none';
  document.getElementById('signup-err').style.display='none';
}
function closeAuthModal(){document.getElementById('auth-modal-bg').classList.remove('open');}
function switchAuth(view){
  document.getElementById('auth-view-login').style.display=view==='login'?'block':'none';
  document.getElementById('auth-view-signup').style.display=view==='signup'?'block':'none';
  document.getElementById('login-err').style.display='none';
  document.getElementById('signup-err').style.display='none';
}

async function doLogin(){
  const email=document.getElementById('login-email').value.trim().toLowerCase();
  const pw=document.getElementById('login-pw').value;

  try{
    const res = await fetch(API_URL+"/api/auth/login",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ email:email, password:pw })
    });

    const data = await res.json();

    if(!res.ok){
      document.getElementById('login-err').style.display='block';
      return;
    }

    // lưu token + username
    localStorage.setItem("lf_token", data.token);

    // current user (để hệ thống UI bạn vẫn chạy được)
    setCurrentUser({ name: data.username, email: email });

    closeAuthModal();
    initAuth();
    showToast(`Chào mừng trở lại, ${data.username}! 🎉`,'👋');
    setPage('dashboard',null);

  }catch(e){
    alert("Không kết nối được backend!");
  }
}

async function doSignup(){
  const name=document.getElementById('signup-name').value.trim();
  const email=document.getElementById('signup-email').value.trim().toLowerCase();
  const pw=document.getElementById('signup-pw').value;
  const errEl=document.getElementById('signup-err');

  if(!name||!email||pw.length<6){
    errEl.textContent=!name?'Vui lòng nhập họ tên.':!email?'Vui lòng nhập email.':'Mật khẩu tối thiểu 6 ký tự.';
    errEl.style.display='block';
    return;
  }

  try{
    const res = await fetch(API_URL+"/api/auth/signup",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ username:name, email:email, password:pw })
    });

    const data = await res.json();

    if(!res.ok){
      errEl.textContent=data.msg || "Đăng ký thất bại!";
      errEl.style.display='block';
      return;
    }

    showToast("Đăng ký thành công! 🎉","🎉");
    switchAuth("login");

  }catch(e){
    errEl.textContent="Không kết nối được server backend!";
    errEl.style.display='block';
  }
}

function doLogout(){
  if(!confirm('Bạn có muốn đăng xuất không?'))return;
  localStorage.removeItem("lf_token");
  setCurrentUser(null);
  initAuth();
  showToast('Đã đăng xuất','👋');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STREAK — persisted, auto-increments on daily login
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function updateStreakOnLogin(){
  const todayStr=new Date().toDateString();
  const lastLogin=ls('lf_last_login','');
  let streak=ls('lf_streak',0);
  if(lastLogin!==todayStr){
    const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
    if(lastLogin===yesterday.toDateString()){
      streak++;
    } else if(lastLogin===''){
      streak=1;
    } else {
      streak=1; // broken streak
    }
    ls_set('lf_streak',streak);
    ls_set('lf_last_login',todayStr);
  }
  document.getElementById('streak-val').textContent=streak;
  document.getElementById('notif-streak-text').textContent=`🔥 Streak ${streak} ngày! Tuyệt vời!`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PAGE NAVIGATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const allPages=['dashboard','timer','notes','tasks','progress','problems','editor','courses','settings','ai-analysis'];
function setPage(id,navEl){
  allPages.forEach(p=>{
    const el=document.getElementById('page-'+p);
    if(el){el.style.display='none';}
  });
  const target=document.getElementById('page-'+id);
  if(target){target.style.display='flex';}
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));
  if(navEl)navEl.classList.add('active');
  const titles={
    timer:'⏱️ Pomodoro Timer',notes:'📓 Ghi chú của tôi',
    tasks:'📝 Bài tập & Nhiệm vụ',progress:'📊 Tiến độ học tập',
    courses:'📚 Tất cả khoá học',leaderboard:'🏆 Bảng xếp hạng',
    schedule:'📅 Lịch học',settings:'⚙️ Cài đặt',
    problems:'💻 Luyện tập lập trình',editor:'💻 Code Editor',
    'ai-analysis':'🤖 AI Phân tích năng lực'
  };
  if(id==='dashboard')updateGreeting(getCurrentUser()?getCurrentUser().name:null);
  else document.getElementById('page-title').textContent=titles[id]||'Dashboard';
  if(id==='courses')renderCoursesPage();
  if(id==='progress')renderProgressPage();
  if(id==='tasks')renderTasksPage();
  if(id==='settings')renderSettingsPage();
  if(id==='ai-analysis')initAIAnalysisPage();
  const searchBar=document.getElementById('topbar-search');
  if(searchBar)searchBar.style.display=id==='editor'?'none':'flex';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOAST
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let toastTimer;
function showToast(msg,icon='✓'){
  const t=document.getElementById('toast');
  document.getElementById('toast-msg').textContent=msg;
  document.getElementById('toast-icon').textContent=icon;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'),3000);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MODAL — click-outside to close
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function openModal(id){document.getElementById('modal-'+id).classList.add('open');}
function closeModal(id){document.getElementById('modal-'+id).classList.remove('open');}

// click outside to close
document.addEventListener('click',function(e){
  if(e.target.classList.contains('modal-bg')){
    e.target.classList.remove('open');
  }
  if(e.target.id==='auth-modal-bg'){closeAuthModal();}
  if(e.target.id==='challenge-timer-modal'){closeChallengeModal();}
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCHEDULE DATA — persisted with time info
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const defaultSchedule=[
  {id:'s1',name:'React Hooks nâng cao',time:'08:00',dur:45,color:'var(--indigo)',module:'Module 7'},
  {id:'s2',name:'Pandas & Visualization',time:'10:30',dur:60,color:'var(--teal)',module:'Module 3'},
  {id:'s3',name:'Live: UI/UX Review Session',time:'14:00',dur:90,color:'var(--amber)',module:'Buổi cuối'},
  {id:'s4',name:'AWS EC2 & S3 Basics',time:'16:30',dur:50,color:'var(--sky)',module:'Module 2'},
  {id:'s5',name:'Ôn tập & Flashcard',time:'20:00',dur:30,color:'var(--rose)',module:'Tự học'},
];

function getSchedule(){
  const saved=ls('lf_schedule',null);
  return saved||defaultSchedule;
}

function timeToMinutes(t){
  const[h,m]=t.split(':').map(Number);
  return h*60+m;
}

function getScheduleStatus(item){
  const now=new Date();
  const curMin=now.getHours()*60+now.getMinutes();
  const startMin=timeToMinutes(item.time);
  const endMin=startMin+item.dur;
  if(curMin>=startMin&&curMin<endMin)return'now';
  if(curMin<startMin)return'upcoming';
  return'past';
}

function renderSchedule(){
  const list=document.getElementById('schedule-list');
  if(!list)return;
  const schedule=getSchedule();
  const now=new Date();
  const curMin=now.getHours()*60+now.getMinutes();

  // find next upcoming
  const nextIdx=schedule.findIndex(s=>{
    const startMin=timeToMinutes(s.time);
    return curMin<startMin;
  });

  list.innerHTML=schedule.map((s,i)=>{
    const status=getScheduleStatus(s);
    const startMin=timeToMinutes(s.time);
    let rowClass='sched-row';
    let tag='';
    if(status==='now'){
      rowClass+=' sched-now';
      const elapsed=curMin-startMin;
      const pct=Math.round(elapsed/s.dur*100);
      tag=`<div><div class="now-tag">🔴 Đang học</div><div class="sched-progress">${pct}% hoàn thành</div></div>`;
    } else if(status==='past'){
      rowClass+=' sched-past';
      tag=`<div class="done-tag">✓ Xong</div>`;
    } else if(i===nextIdx){
      rowClass+=' sched-next';
      const diff=startMin-curMin;
      const hrs=Math.floor(diff/60),mins=diff%60;
      const countdown=hrs>0?`${hrs}g ${mins}p nữa`:`${mins} phút nữa`;
      tag=`<div><div class="next-tag">Tiếp theo</div><div class="sched-countdown">${countdown}</div></div>`;
    }
    return`<div class="${rowClass}">
      <div class="sched-time">${s.time}</div>
      <div class="sched-dot" style="background:${s.color}"></div>
      <div class="sched-body">
        <div class="sched-name">${s.name}</div>
        <div class="sched-meta">${s.dur} phút · ${s.module}</div>
      </div>
      ${tag}
    </div>`;
  }).join('');
}

// re-render schedule every 30 seconds for real-time updates
setInterval(()=>{
  if(document.getElementById('page-dashboard').style.display!=='none'){
    renderSchedule();
  }
},30000);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TASKS — fully persisted
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const defaultTasks=[
  {id:'t1',name:'Bài tập React: Xây dựng Todo App',course:'React Advanced',date:'2026-04-15',priority:'urgent',done:false},
  {id:'t2',name:'Quiz: Machine Learning Basics',course:'Python ML',date:'2026-04-18',priority:'normal',done:false},
  {id:'t3',name:'Thiết kế prototype ứng dụng mobile',course:'UI/UX Masterclass',date:'2026-04-20',priority:'normal',done:false},
  {id:'t4',name:'Đọc tài liệu AWS IAM',course:'AWS',date:'2026-04-10',priority:'low',done:true},
  {id:'t5',name:'Xem video CSS Grid layout',course:'UI/UX',date:'2026-04-08',priority:'low',done:true},
];

function getTasks(){return ls('lf_tasks',defaultTasks);}
function saveTasks(t){ls_set('lf_tasks',t);}

function renderTasksPage(){
  const tasks=getTasks();
  const list=document.getElementById('tasks-list');
  if(!list)return;
  const priorityMap={urgent:'b-live',normal:'b-new',low:'b-done'};
  const priorityLabel={urgent:'🔴 Gấp',normal:'🟡 Bình thường',low:'🟢 Thấp'};
  list.innerHTML=tasks.map((t,i)=>{
    const fmtDate=t.date?new Date(t.date).toLocaleDateString('vi-VN'):'Chưa có hạn';
    return`<div class="task-row" style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--border);">
      <input type="checkbox" ${t.done?'checked':''} onchange="toggleTaskById('${t.id}',this)" style="width:16px;height:16px;cursor:pointer;accent-color:var(--indigo);">
      <div style="flex:1;${t.done?'opacity:.5':''}">
        <div style="font-size:13px;font-weight:600;${t.done?'text-decoration:line-through':''}">${t.name}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px;">${t.course} · Hạn: ${fmtDate}</div>
      </div>
      <div class="badge ${priorityMap[t.priority]||'b-new'}">${priorityLabel[t.priority]||'Mới'}</div>
      <button onclick="deleteTask('${t.id}')" style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--text3);padding:0 4px;" title="Xoá">🗑</button>
    </div>`;
  }).join('');
  updateTaskProgress();
  updateTasksBadge();
}

function toggleTaskById(id,cb){
  const tasks=getTasks();
  const t=tasks.find(x=>x.id===id);
  if(t){t.done=cb.checked;saveTasks(tasks);}
  renderTasksPage();
}

function deleteTask(id){
  const tasks=getTasks().filter(t=>t.id!==id);
  saveTasks(tasks);
  renderTasksPage();
  showToast('Đã xoá bài tập','🗑');
}

function updateTaskProgress(){
  const tasks=getTasks();
  const done=tasks.filter(t=>t.done).length;
  const total=tasks.length;
  const pct=total>0?Math.round(done/total*100):0;
  const prog=document.getElementById('task-progress');
  const count=document.getElementById('task-count');
  if(prog)prog.style.width=pct+'%';
  if(count)count.textContent=`${done} / ${total} hoàn thành`;
}

function updateTasksBadge(){
  const pending=getTasks().filter(t=>!t.done).length;
  const badge=document.getElementById('tasks-badge');
  if(badge)badge.textContent=pending;
}

function addTask(){
  const name=document.getElementById('new-task-name').value.trim();
  const course=document.getElementById('new-task-course').value;
  const date=document.getElementById('new-task-date').value;
  const priority=document.getElementById('new-task-priority').value;
  if(!name){showToast('Vui lòng nhập tên bài tập!','⚠️');return;}
  const tasks=getTasks();
  tasks.unshift({id:'t'+Date.now(),name,course,date,priority,done:false});
  saveTasks(tasks);
  closeModal('modal-add-task');
  ['new-task-name','new-task-note'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('new-task-date').value='';
  renderTasksPage();
  showToast(`Đã thêm: ${name}`,'✅');
  // update notification
  const upcoming=tasks.filter(t=>!t.done&&t.date);
  if(upcoming.length>0){
    const next=upcoming.sort((a,b)=>new Date(a.date)-new Date(b.date))[0];
    document.getElementById('notif-task-text').textContent=`"${next.name}" — Hạn: ${new Date(next.date).toLocaleDateString('vi-VN')}`;
  }
}

function updateNotifBadge(){
  const tasks=getTasks();
  const now=new Date();
  const upcoming=tasks.filter(t=>{
    if(t.done||!t.date)return false;
    const d=new Date(t.date);
    const diff=(d-now)/(1000*3600*24);
    return diff<=3&&diff>=0;
  });
  if(upcoming.length>0){
    const next=upcoming.sort((a,b)=>new Date(a.date)-new Date(b.date))[0];
    document.getElementById('notif-task-text').textContent=`"${next.name}" — Hạn: ${new Date(next.date).toLocaleDateString('vi-VN')}`;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCHEDULE ADD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function addSchedule(){
  const name=document.getElementById('new-sched-name').value.trim();
  const time=document.getElementById('new-sched-time').value;
  const dur=parseInt(document.getElementById('new-sched-dur').value)||45;
  const color=document.getElementById('new-sched-color').value;
  if(!name){showToast('Vui lòng nhập tên buổi học!','⚠️');return;}
  if(!time){showToast('Vui lòng chọn giờ học!','⚠️');return;}
  const schedule=getSchedule();
  schedule.push({id:'s'+Date.now(),name,time,dur,color,module:'Tự thêm'});
  schedule.sort((a,b)=>timeToMinutes(a.time)-timeToMinutes(b.time));
  ls_set('lf_schedule',schedule);
  closeModal('modal-add-schedule');
  ['new-sched-name','new-sched-time','new-sched-dur'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  renderSchedule();
  showToast(`Đã thêm lịch: ${name}`,'📅');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NOTES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const noteColors=[
  {bg:'#fef3e2',border:'#fcd9a0',title:'#92400e',body:'#78350f',date:'#a16207'},
  {bg:'#e0f2fe',border:'#bae6fd',title:'#075985',body:'#0c4a6e',date:'#0369a1'},
  {bg:'#e3f5ed',border:'#6ee7b7',title:'#065f46',body:'#064e3b',date:'#047857'},
  {bg:'#eeedf9',border:'#c4bff5',title:'#3c3489',body:'#26215c',date:'#534ab7'},
  {bg:'#fdeaea',border:'#fca5a5',title:'#7f1d1d',body:'#450a0a',date:'#b91c1c'},
];
let noteColorIdx=ls('lf_note_color_idx',0);

function addNote(){
  const title=prompt('Tiêu đề ghi chú:');
  if(title===null||title.trim()==='')return;
  const content=prompt('Nội dung:');
  if(content===null)return;
  const c=noteColors[noteColorIdx%noteColors.length];
  noteColorIdx++;
  ls_set('lf_note_color_idx',noteColorIdx);
  const today=new Date().toLocaleDateString('vi-VN');
  const grid=document.getElementById('notes-grid');
  const addBtn=grid.lastElementChild;
  const div=document.createElement('div');
  div.className='note-card';
  div.style.cssText=`background:${c.bg};border:1px solid ${c.border};border-radius:var(--r);padding:14px;cursor:pointer;`;
  div.onclick=function(){editNote(this);};
  div.innerHTML=`<div style="font-size:12px;font-weight:700;color:${c.title};margin-bottom:6px;">${title.trim()}</div>
  <div style="font-size:12px;color:${c.body};line-height:1.6;">${content||'...'}</div>
  <div style="font-size:10px;color:${c.date};margin-top:10px;font-family:var(--mono);">${today}</div>`;
  grid.insertBefore(div,addBtn);
  showToast(`Đã thêm ghi chú: ${title.trim()}`,'📓');
}

function editNote(el){
  const titleEl=el.querySelector('div:first-child');
  const bodyEl=el.querySelector('div:nth-child(2)');
  const newTitle=prompt('Sửa tiêu đề:',titleEl.textContent);
  if(newTitle===null)return;
  const newBody=prompt('Sửa nội dung:',bodyEl.textContent);
  if(newTitle.trim())titleEl.textContent=newTitle.trim();
  if(newBody!==null)bodyEl.textContent=newBody;
  showToast('Đã cập nhật ghi chú','✏️');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COURSES DATA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const emojiMap={'Frontend':'⚛️','Backend':'🔧','Data Science':'🐍','Design':'🎨','DevOps':'☁️','Khác':'📘'};
const colorMap={'Frontend':'var(--indigo-light)','Backend':'var(--sky-light)','Data Science':'var(--teal-light)','Design':'var(--amber-light)','DevOps':'var(--rose-light)','Khác':'var(--border)'};
const fillMap={'Frontend':'var(--indigo)','Backend':'var(--sky)','Data Science':'var(--teal)','Design':'var(--amber)','DevOps':'var(--rose)','Khác':'var(--text3)'};

const coursesData=[
  {id:'c1',name:'React Advanced & Performance Patterns',teacher:'Nguyễn Văn A',category:'Frontend',emoji:'⚛️',color:'var(--indigo-light)',fill:'var(--indigo)',totalLessons:42,tag:'b-live',tagText:'🔴 Live',
    lessons:[
      {name:'Giới thiệu khoá học',dur:'12 phút'},{name:'React 18: Concurrent Mode',dur:'28 phút'},{name:'useTransition & useDeferredValue',dur:'35 phút'},
      {name:'useCallback & useMemo nâng cao',dur:'40 phút'},{name:'Custom Hooks thực chiến',dur:'45 phút'},{name:'Context API vs Zustand',dur:'38 phút'},
      {name:'React Query: Server State',dur:'52 phút'},{name:'Lazy loading & Code splitting',dur:'30 phút'},{name:'Virtualization với react-window',dur:'28 phút'},
      {name:'Memoization patterns',dur:'35 phút'},{name:'Error Boundaries',dur:'22 phút'},{name:'Suspense & Data Fetching',dur:'40 phút'},
      {name:'React Testing Library',dur:'50 phút'},{name:'Vitest & jest setup',dur:'32 phút'},{name:'Performance profiling',dur:'38 phút'},
      {name:'Next.js App Router basics',dur:'55 phút'},{name:'Server Components',dur:'48 phút'},{name:'Next.js Data Fetching',dur:'44 phút'},
      {name:'SEO & Metadata API',dur:'25 phút'},{name:'Next.js Deployment',dur:'30 phút'},{name:'Zustand advanced patterns',dur:'42 phút'},
      {name:'Jotai vs Recoil comparison',dur:'35 phút'},{name:'React Hook Form',dur:'48 phút'},{name:'Zod validation',dur:'30 phút'},
      {name:'Framer Motion animations',dur:'55 phút'},{name:'Styled Components deep dive',dur:'40 phút'},{name:'Tailwind + React patterns',dur:'35 phút'},
      {name:'Storybook component docs',dur:'42 phút'},{name:'🎯 Dự án: E-commerce UI',dur:'90 phút'},
      {name:'Monorepo với Turborepo',dur:'45 phút'},{name:'Micro-frontends',dur:'50 phút'},{name:'WebSockets trong React',dur:'38 phút'},
      {name:'Server-Sent Events',dur:'28 phút'},{name:'PWA với React',dur:'42 phút'},{name:'Cypress E2E Testing',dur:'55 phút'},
      {name:'Playwright testing',dur:'48 phút'},{name:'CI/CD cho React apps',dur:'35 phút'},{name:'Docker & containerization',dur:'50 phút'},
      {name:'Performance audit tools',dur:'32 phút'},{name:'Accessibility (a11y)',dur:'38 phút'},{name:'Internationalisation (i18n)',dur:'30 phút'},
      {name:'🏆 Dự án cuối khoá',dur:'120 phút'}
    ]
  },
  {id:'c2',name:'Python cho Data Science & Machine Learning',teacher:'Trần Thị B',category:'Data Science',emoji:'🐍',color:'var(--teal-light)',fill:'var(--teal)',totalLessons:60,tag:'b-new',tagText:'✨ Mới',
    lessons:[
      {name:'Cài đặt Python & Jupyter',dur:'15 phút'},{name:'NumPy cơ bản',dur:'45 phút'},{name:'NumPy nâng cao',dur:'40 phút'},
      {name:'Pandas Series & DataFrame',dur:'50 phút'},{name:'Pandas: Cleaning',dur:'55 phút'},{name:'Pandas groupby & pivot',dur:'45 phút'},
      {name:'Pandas merge & join',dur:'40 phút'},{name:'Matplotlib cơ bản',dur:'38 phút'},{name:'Seaborn visualization',dur:'42 phút'},
      {name:'Plotly interactive charts',dur:'50 phút'},{name:'EDA',dur:'60 phút'},{name:'Feature Engineering',dur:'55 phút'},
      {name:'Xử lý missing values',dur:'35 phút'},{name:'Encoding categorical data',dur:'30 phút'},{name:'Scaling & Normalization',dur:'28 phút'},
      {name:'Train/Test split',dur:'20 phút'},{name:'Linear Regression',dur:'50 phút'},{name:'Logistic Regression',dur:'48 phút'},
      {name:'Decision Trees',dur:'45 phút'},{name:'Random Forest',dur:'52 phút'},{name:'Gradient Boosting',dur:'55 phút'},
      {name:'SVM',dur:'48 phút'},{name:'K-Means Clustering',dur:'40 phút'},{name:'DBSCAN',dur:'38 phút'},
      {name:'PCA',dur:'50 phút'},{name:'🎯 Dự án: Titanic Prediction',dur:'90 phút'},{name:'Neural Networks với Keras',dur:'65 phút'},
      {name:'Deep Learning basics',dur:'70 phút'},{name:'CNN',dur:'75 phút'},{name:'RNN & LSTM',dur:'68 phút'},
      {name:'NLP: Text Processing',dur:'60 phút'},{name:'NLP: Sentiment Analysis',dur:'55 phút'},{name:'Transformers & BERT',dur:'80 phút'},
      {name:'Time Series Analysis',dur:'65 phút'},{name:'Recommendation Systems',dur:'58 phút'},{name:'MLflow',dur:'45 phút'},
      {name:'Model Deployment (FastAPI)',dur:'60 phút'},{name:'Docker cho ML',dur:'50 phút'},{name:'Cloud ML',dur:'70 phút'},
      {name:'🏆 Dự án cuối',dur:'180 phút'}
    ]
  },
  {id:'c3',name:'UI/UX Design Masterclass 2025',teacher:'Lê Văn C',category:'Design',emoji:'🎨',color:'var(--amber-light)',fill:'var(--amber)',totalLessons:38,tag:'b-done',tagText:'✅ Gần xong',
    lessons:Array.from({length:38},(_,i)=>({name:`Bài ${i+1}: Design Lesson`,dur:'40 phút'}))
  },
  {id:'c4',name:'AWS Cloud Practitioner Essentials',teacher:'Phạm Thị D',category:'DevOps',emoji:'☁️',color:'var(--sky-light)',fill:'var(--sky)',totalLessons:55,tag:'b-sky',tagText:'🆕 Mới bắt đầu',
    lessons:Array.from({length:55},(_,i)=>({name:`Bài ${i+1}: AWS Module`,dur:'35 phút'}))
  },
  {id:'c5',name:'TypeScript Full Course 2025',teacher:'Ngô Minh E',category:'Frontend',emoji:'🔷',color:'#dbeafe',fill:'#3b82f6',totalLessons:35,tag:'b-new',tagText:'✨ Mới thêm',
    lessons:Array.from({length:35},(_,i)=>({name:`Bài ${i+1}: TypeScript`,dur:'35 phút'}))
  },
  {id:'c6',name:'Node.js & Express: Backend Development',teacher:'Võ Thanh F',category:'Backend',emoji:'🟢',color:'var(--teal-light)',fill:'var(--teal)',totalLessons:48,tag:'b-sky',tagText:'🆕 Mới',
    lessons:Array.from({length:48},(_,i)=>({name:`Bài ${i+1}: Node.js`,dur:'40 phút'}))
  },
  {id:'c7',name:'Docker & Kubernetes Mastery',teacher:'Đinh Bảo G',category:'DevOps',emoji:'🐳',color:'var(--sky-light)',fill:'var(--sky)',totalLessons:40,tag:'b-sky',tagText:'⚙️ DevOps',
    lessons:Array.from({length:40},(_,i)=>({name:`Bài ${i+1}: Container`,dur:'35 phút'}))
  },
  {id:'c8',name:'Figma Advanced: Design Systems',teacher:'Hoàng Yến H',category:'Design',emoji:'🖌️',color:'var(--rose-light)',fill:'var(--rose)',totalLessons:28,tag:'b-done',tagText:'✅ Hoàn thành',
    lessons:Array.from({length:28},(_,i)=>({name:`Bài ${i+1}: Figma`,dur:'40 phút'}))
  },
];

// Lesson progress stored in localStorage
function getLessonProgress(courseId){return ls('lf_lp_'+courseId,{});}
function saveLessonProgress(courseId,prog){ls_set('lf_lp_'+courseId,prog);}

// Default progress for existing courses (simulate prior progress)
function initDefaultProgress(){
  const defaults={
    c1:{count:28},  // 68% of 42
    c2:{count:25},  // 41% of 60
    c3:{count:35},  // 92% of 38
    c4:{count:12},  // 23% of 55
    c8:{count:28},  // 100% - complete
  };
  Object.entries(defaults).forEach(([id,{count}])=>{
    const existing=ls('lf_lp_'+id,null);
    if(existing===null){
      const prog={};
      for(let i=0;i<count;i++)prog[i]=true;
      ls_set('lf_lp_'+id,prog);
    }
  });
}

function getCourseProgress(course){
  const prog=getLessonProgress(course.id);
  const done=Object.values(prog).filter(Boolean).length;
  const total=course.lessons.length;
  const pct=total>0?Math.round(done/total*100):0;
  return{done,total,pct};
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DASHBOARD — courses list & activity
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function renderDashboardCourses(){
  const list=document.getElementById('course-list');
  if(!list)return;
  const saved=ls('lf_custom_courses',[]);
  const all=[...coursesData.slice(0,4),...saved.slice(0,0)]; // show top 4 built-in
  list.innerHTML=all.map(c=>{
    const p=getCourseProgress(c);
    const left=p.total-p.done;
    const sub=left===0?'Hoàn thành! 🎉':`Còn ${left} bài`;
    let badge='';
    if(p.pct===100)badge='<div class="badge b-done">✅ Xong</div>';
    else if(p.pct>80)badge='<div class="badge b-done">✅ Gần xong</div>';
    else if(c.tag==='b-live')badge='<div class="badge b-live">🔴 Live</div>';
    else badge=`<div class="badge ${c.tag}">${c.tagText}</div>`;
    return`<div class="course-row" onclick="openCourseDetail('${c.id}')">
      <div class="course-thumb" style="background:${c.color}">${c.emoji}</div>
      <div class="ci">
        <div class="ci-name">${c.name}</div>
        <div class="ci-sub">${c.teacher} · ${c.totalLessons} bài học</div>
        <div class="ci-bar"><div class="ci-fill" style="width:${p.pct}%;background:${c.fill}"></div></div>
        <div class="ci-pct">${p.pct}% · ${sub}</div>
      </div>
      ${badge}
    </div>`;
  }).join('');
  updateDashboardStats();
}

function updateDashboardStats(){
  const totalPct=coursesData.reduce((sum,c)=>sum+getCourseProgress(c).pct,0);
  const avgPct=Math.round(totalPct/coursesData.length);
  const el=document.getElementById('stat-complete-num');
  const fill=document.getElementById('stat-complete-fill');
  if(el)el.textContent=avgPct+'%';
  if(fill)fill.style.width=avgPct+'%';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACTIVITY CHART — based on session time per day
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function renderActivityChart(){
  const chart=document.getElementById('activity-chart');
  const stats=document.getElementById('activity-stats');
  if(!chart)return;
  const days=['T2','T3','T4','T5','T6','T7','CN'];
  // get saved daily activity, or use defaults
  const activity=ls('lf_activity',[50,68,40,78,58,32,85]);
  const maxVal=Math.max(...activity,1);
  const total=activity.reduce((a,b)=>a+b,0);
  const avg=Math.round(total/7);
  const best=Math.max(...activity);
  const today=new Date().getDay(); // 0=Sun,1=Mon...
  const todayIdx=today===0?6:today-1;

  chart.innerHTML=activity.map((v,i)=>{
    const h=Math.round(v/maxVal*85);
    const isToday=i===todayIdx;
    const bg=isToday?'var(--indigo)':(v>avg?'#aba6ef':'#c7c4f5');
    return`<div class="bar-col">
      <div class="bar" style="height:${h}px;background:${bg}" title="${v} phút"></div>
      <div class="bar-label" style="${isToday?'color:var(--indigo);font-weight:600':''}">${days[i]}</div>
    </div>`;
  }).join('');

  const totalH=Math.floor(total/60);
  const totalM=total%60;
  stats.innerHTML=`<div class="cs">Tổng: <b>${totalH}h ${totalM}m</b></div>
    <div class="cs">TB/ngày: <b>${avg} phút</b></div>
    <div class="cs">Tốt nhất: <b style="color:var(--teal)">${Math.floor(best/60)}h ${best%60}m</b></div>`;
}

// Update today's activity bar when session time increases
function updateTodayActivity(){
  const now=new Date();
  const today=now.getDay();
  const todayIdx=today===0?6:today-1;
  const elapsed=Date.now()-sessionStartTime;
  const minutes=Math.floor(elapsed/60000);
  const activity=ls('lf_activity',[50,68,40,78,58,32,85]);
  const base=ls('lf_activity_base',[50,68,40,78,58,32,85]);
  activity[todayIdx]=base[todayIdx]+minutes;
  ls_set('lf_activity',activity);
  renderActivityChart();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROGRESS PAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function renderProgressPage(){
  const list=document.getElementById('progress-courses-list');
  if(list){
    list.innerHTML=coursesData.map(c=>{
      const p=getCourseProgress(c);
      return`<div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <span style="font-size:13px;font-weight:600;">${c.emoji} ${c.name.split(' ').slice(0,4).join(' ')}...</span>
          <span style="font-size:12px;font-family:var(--mono);color:${c.fill}">${p.pct}%</span>
        </div>
        <div style="height:8px;background:var(--bg);border-radius:8px;overflow:hidden;">
          <div style="width:${p.pct}%;height:100%;background:${c.fill};border-radius:8px;transition:width .5s;"></div>
        </div>
        <div style="font-size:10px;color:var(--text3);margin-top:3px;font-family:var(--mono);">${p.done} / ${p.total} bài · ${c.teacher}</div>
      </div>`;
    }).join('');
  }

  // Weekly goals
  const tasks=getTasks();
  const doneTasks=tasks.filter(t=>t.done).length;
  const totalTasks=tasks.length;
  const streak=ls('lf_streak',0);
  const sessionMs=Date.now()-sessionStartTime;
  const sessionH=Math.floor(sessionMs/3600000);

  const goals=document.getElementById('weekly-goals');
  if(goals){
    goals.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--indigo-light);border-radius:var(--r2);">
        <span style="font-size:13px;font-weight:600;color:var(--indigo)">⏱️ Học 10h / tuần</span>
        <span style="font-size:12px;font-family:var(--mono);color:var(--indigo)">${sessionH}h / 10h</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--teal-light);border-radius:var(--r2);">
        <span style="font-size:13px;font-weight:600;color:var(--teal)">✅ Hoàn thành bài tập</span>
        <span style="font-size:12px;font-family:var(--mono);color:var(--teal)">${doneTasks} / ${totalTasks}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--amber-light);border-radius:var(--r2);">
        <span style="font-size:13px;font-weight:600;color:var(--amber)">📚 Bài học hoàn thành tuần này</span>
        <span style="font-size:12px;font-family:var(--mono);color:var(--amber)">${ls('lf_lessons_week',0)} bài</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:${streak>0?'var(--rose-light)':'var(--bg)'};border-radius:var(--r2);">
        <span style="font-size:13px;font-weight:600;color:var(--rose)">🔥 Duy trì streak ${streak}+ ngày</span>
        <span style="font-size:12px;font-family:var(--mono);color:${streak>0?'var(--teal)':'var(--text3)'}">${streak>0?'✓ Đạt!':'Chưa đạt'}</span>
      </div>`;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COURSES PAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let courseFilter='all';
let activeCourseId=null;

function setCourseFilter(f,el){
  courseFilter=f;
  document.querySelectorAll('#page-courses .prob-filter-btn').forEach(b=>b.classList.remove('active'));
  if(el)el.classList.add('active');
  renderCoursesPage();
}

function renderCoursesPage(){
  const grid=document.getElementById('courses-grid');
  if(!grid)return;
  const saved=ls('lf_custom_courses',[]);
  let list=[...coursesData,...saved];

  if(courseFilter==='active') list=list.filter(c=>{const p=getCourseProgress(c);return p.pct>0&&p.pct<100;});
  else if(courseFilter==='done') list=list.filter(c=>getCourseProgress(c).pct===100);
  else if(courseFilter==='frontend') list=list.filter(c=>c.category==='Frontend');
  else if(courseFilter==='backend') list=list.filter(c=>c.category==='Backend');
  else if(courseFilter==='data') list=list.filter(c=>c.category==='Data Science');

  const done=list.filter(c=>getCourseProgress(c).pct===100).length;
  const summaryEl=document.getElementById('courses-summary');
  if(summaryEl)summaryEl.innerHTML=`${list.length} khoá học · <span style="color:var(--teal)">${done} hoàn thành</span>`;

  grid.innerHTML=list.map(c=>{
    const p=getCourseProgress(c);
    return`<div class="course-card" onclick="openCourseDetail('${c.id}')">
      <div class="course-card-banner" style="background:${c.color}">${c.emoji}</div>
      <div class="course-card-body">
        <div class="course-card-title">${c.name}</div>
        <div class="course-card-meta">${c.teacher} · ${c.category}</div>
        <div class="course-prog-row"><span style="font-size:12px;color:var(--text2)">Tiến độ</span><span class="course-prog-pct" style="color:${c.fill}">${p.pct}%</span></div>
        <div class="course-prog-bar"><div class="course-prog-fill" style="width:${p.pct}%;background:${c.fill}"></div></div>
        <div class="course-card-footer">
          <span class="course-lessons-count">${p.done} / ${p.total} bài đã học</span>
          <span class="badge ${c.tag}">${c.tagText}</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

function openCourseDetail(id){
  const allCourses=[...coursesData,...ls('lf_custom_courses',[])];
  const c=allCourses.find(x=>x.id===id);
  if(!c)return;
  activeCourseId=id;
  const p=getCourseProgress(c);
  const prog=getLessonProgress(id);

  document.getElementById('cdp-banner').style.background=c.color;
  document.getElementById('cdp-banner').childNodes[0].nodeValue=c.emoji+' ';
  document.getElementById('cdp-title').textContent=c.name;
  document.getElementById('cdp-meta').textContent=`${c.teacher} · ${c.category} · ${c.totalLessons} bài học`;
  document.getElementById('cdp-prog-pct').textContent=`${p.pct}%`;
  document.getElementById('cdp-prog-pct').style.color=c.fill;
  document.getElementById('cdp-prog-fill').style.width=`${p.pct}%`;
  document.getElementById('cdp-prog-fill').style.background=c.fill;
  document.getElementById('cdp-prog-sub').textContent=`${p.done} / ${p.total} bài đã hoàn thành · Còn ${p.total-p.done} bài`;

  const display=c.lessons.slice(0,30);
  const firstUndoneIdx=c.lessons.findIndex((_,i)=>!prog[i]);

  document.getElementById('cdp-lessons').innerHTML=display.map((l,i)=>{
    const isDone=!!prog[i];
    const isActive=i===firstUndoneIdx;
    const cls=isDone?'done':isActive?'active-lesson':'';
    const numCls=isDone?'ln-done':isActive?'ln-active':'ln-lock';
    const tick=isDone?'<span class="lesson-tick">✓</span>':isActive?'<span class="lesson-play">▶</span>':'<span style="font-size:12px;color:var(--text3);">○</span>';
    return`<div class="lesson-row ${cls}" onclick="markLessonDone('${id}',${i})">
      <div class="lesson-num ${numCls}">${i+1}</div>
      <div class="lesson-info"><div class="lesson-name">${l.name}</div><div class="lesson-dur">⏱ ${l.dur}</div></div>
      ${tick}
    </div>`;
  }).join('')+(c.lessons.length>30?`<div style="text-align:center;padding:12px;font-size:12px;color:var(--text3);">+${c.lessons.length-30} bài nữa...</div>`:'');

  const nextLesson=c.lessons[firstUndoneIdx];
  document.getElementById('cdp-continue-btn').textContent=nextLesson&&firstUndoneIdx>=0?`▶ Tiếp: ${nextLesson.name.slice(0,28)}...`:'🏆 Đã hoàn thành!';

  document.getElementById('course-detail-overlay').classList.add('open');
}

function markLessonDone(courseId,idx){
  const allCourses=[...coursesData,...ls('lf_custom_courses',[])];
  const c=allCourses.find(x=>x.id===courseId);
  if(!c)return;
  const prog=getLessonProgress(courseId);
  prog[idx]=!prog[idx];
  saveLessonProgress(courseId,prog);

  // track lessons completed this week
  if(prog[idx]){
    ls_set('lf_lessons_week',(ls('lf_lessons_week',0)+1));
    // increment user score
    const score=ls('lf_user_score',2840);
    ls_set('lf_user_score',score+50);
    const scoreEl=document.getElementById('user-score');
    if(scoreEl)scoreEl.textContent=(score+50).toLocaleString();
    updateLevelDisplay();
  }

  openCourseDetail(courseId);
  renderDashboardCourses();
  renderCoursesPage();

  const p=getCourseProgress(c);
  showToast(`${prog[idx]?'✅ Hoàn thành':'↩ Bỏ đánh dấu'}: ${c.lessons[idx].name}`,'📚');
  if(p.pct===100)showToast(`🎉 Chúc mừng! Bạn đã hoàn thành "${c.name}"!`,'🏆');
}

function continueLesson(){
  if(!activeCourseId)return;
  const allCourses=[...coursesData,...ls('lf_custom_courses',[])];
  const c=allCourses.find(x=>x.id===activeCourseId);
  if(!c)return;
  const prog=getLessonProgress(activeCourseId);
  const firstUndone=c.lessons.findIndex((_,i)=>!prog[i]);
  if(firstUndone>=0)markLessonDone(activeCourseId,firstUndone);
}

function closeCourseDetail(){
  document.getElementById('course-detail-overlay').classList.remove('open');
  renderCoursesPage();
}

function addCourse(){
  const name=document.getElementById('new-course-name').value.trim();
  const teacher=document.getElementById('new-course-teacher').value.trim();
  const total=parseInt(document.getElementById('new-course-total').value)||10;
  const cat=document.getElementById('new-course-cat').value;
  if(!name){showToast('Vui lòng nhập tên khoá học!','⚠️');return;}
  const newId='c_'+Date.now();
  const lessons=Array.from({length:total},(_,i)=>({name:`Bài ${i+1}`,dur:'30 phút'}));
  const newCourse={id:newId,name,teacher:teacher||'Chưa rõ',category:cat,emoji:emojiMap[cat]||'📘',color:colorMap[cat]||'var(--border)',fill:fillMap[cat]||'var(--text3)',totalLessons:total,tag:'b-new',tagText:'🆕 Mới',lessons};
  const saved=ls('lf_custom_courses',[]);
  saved.push(newCourse);
  ls_set('lf_custom_courses',saved);
  closeModal('modal-add-course');
  ['new-course-name','new-course-teacher','new-course-total'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  renderCoursesPage();
  renderDashboardCourses();
  showToast(`Đã thêm khoá học: ${name}`,'📚');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SEARCH
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function handleSearch(val){
  document.querySelectorAll('#course-list .course-row').forEach(row=>{
    const name=row.querySelector('.ci-name');
    if(name)row.style.display=name.textContent.toLowerCase().includes(val.toLowerCase())?'flex':'none';
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POMODORO TIMER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let timerInterval=null,timerRunning=false;
let timerTotal=25*60,timerRemaining=25*60;
let pomoCount=ls('lf_pomo_count',0),pomoTotalSec=ls('lf_pomo_sec',0);
const timerModes={focus:25*60,short:5*60,long:15*60};
let currentMode='focus';

function setTimerMode(mode,tabEl){
  document.querySelectorAll('#timer-tabs .tab').forEach(t=>t.classList.remove('active'));
  tabEl.classList.add('active');
  currentMode=mode;timerTotal=timerModes[mode];timerRemaining=timerTotal;
  clearInterval(timerInterval);timerRunning=false;
  document.getElementById('timer-btn').textContent='▶ Bắt đầu';
  document.getElementById('timer-mode-lbl').textContent=mode==='focus'?'Tập trung':mode==='short'?'Nghỉ ngắn':'Nghỉ dài';
  renderTimer();
}
function renderTimer(){
  const m=Math.floor(timerRemaining/60),s=timerRemaining%60;
  const disp=document.getElementById('timer-display');
  const circ=document.getElementById('timer-circle');
  if(disp)disp.textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  if(circ)circ.style.strokeDashoffset=301.6*(1-timerRemaining/timerTotal);
}
function toggleTimer(){
  if(timerRunning){
    clearInterval(timerInterval);timerRunning=false;
    document.getElementById('timer-btn').textContent='▶ Tiếp tục';
  } else {
    timerRunning=true;
    document.getElementById('timer-btn').textContent='⏸ Dừng';
    timerInterval=setInterval(()=>{
      if(timerRemaining<=0){
        clearInterval(timerInterval);timerRunning=false;
        if(currentMode==='focus'){
          pomoCount++;pomoTotalSec+=timerTotal;
          ls_set('lf_pomo_count',pomoCount);ls_set('lf_pomo_sec',pomoTotalSec);
          document.getElementById('pomo-count').textContent=pomoCount;
          const h=Math.floor(pomoTotalSec/3600),mn=Math.floor((pomoTotalSec%3600)/60);
          document.getElementById('pomo-time').textContent=`${h}h ${mn}m`;
          showToast(`🎉 Phiên ${pomoCount} hoàn thành! Nghỉ ngơi nào.`,'🎯');
          // update activity
          const activity=ls('lf_activity',[50,68,40,78,58,32,85]);
          const base=ls('lf_activity_base',[50,68,40,78,58,32,85]);
          const today=new Date().getDay();
          const todayIdx=today===0?6:today-1;
          activity[todayIdx]=(activity[todayIdx]||0)+25;
          ls_set('lf_activity',activity);
          if(!ls('lf_activity_base',null))ls_set('lf_activity_base',activity);
          renderActivityChart();
        } else {
          showToast('Hết giờ nghỉ! Tiếp tục học thôi 💪','⏰');
        }
        document.getElementById('timer-btn').textContent='▶ Bắt đầu';
        return;
      }
      timerRemaining--;renderTimer();
    },1000);
  }
}
function resetTimer(){clearInterval(timerInterval);timerRunning=false;timerRemaining=timerTotal;document.getElementById('timer-btn').textContent='▶ Bắt đầu';renderTimer();}
function skipTimer(){clearInterval(timerInterval);timerRunning=false;timerRemaining=0;renderTimer();showToast('Đã bỏ qua phiên này','⏭');document.getElementById('timer-btn').textContent='▶ Bắt đầu';}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SESSION TRACKER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let sessionStartTime=Date.now();
const todayStr=new Date().toDateString();
if(ls('lf_session_date','')!==todayStr){
  ls_set('lf_session_today_base',0);
  ls_set('lf_session_date',todayStr);
}
let sessionTodayBase=ls('lf_session_today_base',0);

function formatSessionTime(ms){
  const s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;
  return`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}
function formatHM(ms){
  const s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60);
  return h>0?`${h}h ${m}m`:`${m}m`;
}
function updateSessionDisplay(){
  const elapsed=Date.now()-sessionStartTime;
  const todayTotal=sessionTodayBase+elapsed;
  const dispEl=document.getElementById('session-display');
  const todayEl=document.getElementById('session-today');
  if(dispEl)dispEl.textContent=formatSessionTime(elapsed);
  if(todayEl)todayEl.textContent=formatHM(todayTotal);
  ls_set('lf_session_today_base',Math.floor(todayTotal));
}
setInterval(updateSessionDisplay,1000);
updateSessionDisplay();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROBLEMS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const problemsData=[
  {id:1,name:'Two Sum',diff:'easy',tags:['Array','Hash Table'],ac:'47.2%',description:'Cho một mảng số nguyên <code>nums</code> và <code>target</code>, trả về chỉ số của hai số cộng lại bằng target.',examples:[{input:'nums = [2,7,11,15], target = 9',output:'[0,1]',explain:'nums[0]+nums[1]=9'}],constraints:['2 ≤ nums.length ≤ 10⁴'],testcases:[{input:'nums = [2,7,11,15]\ntarget = 9',expected:'[0,1]'},{input:'nums = [3,2,4]\ntarget = 6',expected:'[1,2]'}],starter:{python:'class Solution:\n    def twoSum(self, nums, target):\n        pass\n',javascript:'var twoSum = function(nums, target) {\n    \n};\n',java:'class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        return new int[]{};\n    }\n}\n',cpp:'class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        return {};\n    }\n};\n'}},
  {id:2,name:'Add Two Numbers',diff:'medium',tags:['Linked List','Math'],ac:'40.1%',description:'Cộng hai số được biểu diễn bằng linked list ngược.',examples:[{input:'l1=[2,4,3], l2=[5,6,4]',output:'[7,0,8]'}],constraints:['1-100 nodes'],testcases:[{input:'l1=[2,4,3]\nl2=[5,6,4]',expected:'[7,0,8]'}],starter:{python:'class Solution:\n    def addTwoNumbers(self, l1, l2):\n        pass\n',javascript:'var addTwoNumbers = function(l1, l2) {\n    \n};\n',java:'class Solution {\n    public ListNode addTwoNumbers(ListNode l1, ListNode l2) {\n        return null;\n    }\n}\n',cpp:'class Solution {\npublic:\n    ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) {\n        return nullptr;\n    }\n};\n'}},
  {id:3,name:'Longest Substring Without Repeating',diff:'medium',tags:['Sliding Window','String'],ac:'33.8%',description:'Tìm độ dài chuỗi con dài nhất không chứa ký tự lặp.',examples:[{input:'s = "abcabcbb"',output:'3'}],constraints:['s.length ≤ 50000'],testcases:[{input:'s = "abcabcbb"',expected:'3'}],starter:{python:'class Solution:\n    def lengthOfLongestSubstring(self, s):\n        pass\n',javascript:'var lengthOfLongestSubstring = function(s) {\n    \n};\n',java:'class Solution {\n    public int lengthOfLongestSubstring(String s) {\n        return 0;\n    }\n}\n',cpp:'class Solution {\npublic:\n    int lengthOfLongestSubstring(string s) {\n        return 0;\n    }\n};\n'}},
  {id:4,name:'Median of Two Sorted Arrays',diff:'hard',tags:['Binary Search','Array'],ac:'36.2%',description:'Tìm trung vị của hai mảng đã sắp xếp. Yêu cầu O(log(m+n)).',examples:[{input:'nums1=[1,3], nums2=[2]',output:'2.0'}],constraints:['O(log(m+n))'],testcases:[{input:'nums1=[1,3]\nnums2=[2]',expected:'2.0'}],starter:{python:'class Solution:\n    def findMedianSortedArrays(self, nums1, nums2):\n        pass\n',javascript:'var findMedianSortedArrays = function(nums1, nums2) {\n    \n};\n',java:'class Solution {\n    public double findMedianSortedArrays(int[] nums1, int[] nums2) {\n        return 0.0;\n    }\n}\n',cpp:'class Solution {\npublic:\n    double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {\n        return 0.0;\n    }\n};\n'}},
  {id:5,name:'Longest Palindromic Substring',diff:'medium',tags:['DP','String'],ac:'32.4%',description:'Tìm chuỗi con palindrome dài nhất.',examples:[{input:'s = "babad"',output:'"bab"'}],constraints:['1 ≤ s.length ≤ 1000'],testcases:[{input:'s = "babad"',expected:'"bab"'}],starter:{python:'class Solution:\n    def longestPalindrome(self, s):\n        pass\n',javascript:'var longestPalindrome = function(s) {\n    \n};\n',java:'class Solution {\n    public String longestPalindrome(String s) {\n        return "";\n    }\n}\n',cpp:'class Solution {\npublic:\n    string longestPalindrome(string s) {\n        return "";\n    }\n};\n'}},
  ...[
    {id:6,name:'ZigZag Conversion',diff:'medium',tags:['String'],ac:'45.3%'},
    {id:7,name:'Reverse Integer',diff:'medium',tags:['Math'],ac:'27.9%'},
    {id:8,name:'String to Integer (atoi)',diff:'medium',tags:['String'],ac:'17.6%'},
    {id:9,name:'Palindrome Number',diff:'easy',tags:['Math'],ac:'52.1%'},
    {id:10,name:'Regular Expression Matching',diff:'hard',tags:['DP'],ac:'28.3%'},
    {id:11,name:'Container With Most Water',diff:'medium',tags:['Two Pointers'],ac:'54.2%'},
    {id:12,name:'Integer to Roman',diff:'medium',tags:['Math'],ac:'62.0%'},
    {id:13,name:'Roman to Integer',diff:'easy',tags:['Math','String'],ac:'58.9%'},
    {id:14,name:'Longest Common Prefix',diff:'easy',tags:['String'],ac:'41.3%'},
    {id:15,name:'3Sum',diff:'medium',tags:['Two Pointers'],ac:'32.5%'},
    {id:16,name:'Letter Combinations of Phone',diff:'medium',tags:['Backtracking'],ac:'57.4%'},
    {id:17,name:'Valid Parentheses',diff:'easy',tags:['Stack'],ac:'40.7%'},
    {id:18,name:'Merge Two Sorted Lists',diff:'easy',tags:['Linked List'],ac:'62.8%'},
    {id:19,name:'Generate Parentheses',diff:'medium',tags:['Backtracking'],ac:'73.1%'},
    {id:20,name:'Merge k Sorted Lists',diff:'hard',tags:['Heap'],ac:'48.2%'},
    {id:21,name:'Search in Rotated Sorted Array',diff:'medium',tags:['Binary Search'],ac:'38.5%'},
    {id:22,name:'Find First and Last Position',diff:'medium',tags:['Binary Search'],ac:'41.7%'},
    {id:23,name:'Climbing Stairs',diff:'easy',tags:['DP'],ac:'51.8%'},
    {id:24,name:'Binary Tree Inorder Traversal',diff:'easy',tags:['Tree'],ac:'74.5%'},
    {id:25,name:'Symmetric Tree',diff:'easy',tags:['Tree','BFS'],ac:'53.2%'},
    {id:26,name:'Maximum Depth of Binary Tree',diff:'easy',tags:['Tree','DFS'],ac:'73.9%'},
    {id:27,name:'Best Time to Buy and Sell Stock',diff:'easy',tags:['Array','DP'],ac:'54.4%'},
    {id:28,name:'Single Number',diff:'easy',tags:['Bit Manipulation'],ac:'70.2%'},
    {id:29,name:'Linked List Cycle',diff:'easy',tags:['Linked List'],ac:'45.9%'},
    {id:30,name:'Min Stack',diff:'medium',tags:['Stack'],ac:'51.7%'},
    {id:31,name:'Intersection of Linked Lists',diff:'easy',tags:['Linked List'],ac:'55.1%'},
    {id:32,name:'Majority Element',diff:'easy',tags:['Array'],ac:'63.4%'},
    {id:33,name:'House Robber',diff:'medium',tags:['DP'],ac:'49.8%'},
    {id:34,name:'Reverse Linked List',diff:'easy',tags:['Linked List'],ac:'73.1%'},
    {id:35,name:'Course Schedule',diff:'medium',tags:['Graph','Topological Sort'],ac:'46.0%'},
    {id:36,name:'Implement Trie',diff:'medium',tags:['Trie'],ac:'62.3%'},
    {id:37,name:'Kth Largest Element',diff:'medium',tags:['Heap'],ac:'65.3%'},
    {id:38,name:'Number of Islands',diff:'medium',tags:['BFS','DFS'],ac:'56.7%'},
    {id:39,name:'Product of Array Except Self',diff:'medium',tags:['Array'],ac:'64.5%'},
    {id:40,name:'Find Median from Data Stream',diff:'hard',tags:['Heap'],ac:'51.9%'},
  ].map(p=>({
    ...p,
    description:`Bài toán <b>${p.name}</b>. Đây là bài tập luyện tập lập trình.`,
    examples:[{input:'Xem đề bài chi tiết',output:''}],
    constraints:['Xem chi tiết'],
    testcases:[{input:'// Test case',expected:'// Output'}],
    starter:{
      python:`class Solution:\n    def solve(self):\n        # ${p.name}\n        pass\n`,
      javascript:`var solve = function() {\n    // ${p.name}\n};\n`,
      java:`class Solution {\n    public void solve() {\n        // ${p.name}\n    }\n}\n`,
      cpp:`class Solution {\npublic:\n    void solve() {\n        // ${p.name}\n    }\n};\n`
    }
  }))
];

let currentProbFilter='all';
let currentProbSearch='';
let currentProbId=null;
let currentLang='python';
let currentOutputTab='testcase';
let submissionsHistory=[];

function loadProblemsStatus(){
  const m=ls('problems_status',{});
  problemsData.forEach(p=>{if(m[p.id])p.status=m[p.id];else if(!p.status)p.status='none';});
}
function saveProblemStatus(){
  const m={};problemsData.forEach(p=>m[p.id]=p.status);ls_set('problems_status',m);
}

function updateProblemStats(){
  const done=problemsData.filter(p=>p.status==='done').length;
  document.getElementById('stat-done').textContent=done;
  document.getElementById('stat-easy').textContent=problemsData.filter(p=>p.diff==='easy'&&p.status==='done').length;
  document.getElementById('stat-med').textContent=problemsData.filter(p=>p.diff==='medium'&&p.status==='done').length;
  document.getElementById('stat-hard').textContent=problemsData.filter(p=>p.diff==='hard'&&p.status==='done').length;
  document.getElementById('stat-total').textContent=problemsData.length;
}

function setProbFilter(filter,btn){
  currentProbFilter=filter;
  document.querySelectorAll('.prob-filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderProblems();
}
function filterProblems(val){currentProbSearch=val;renderProblems();}

function toggleProblemStatus(id){
  const prob=problemsData.find(p=>p.id===id);
  if(!prob)return;
  if(prob.status==='none')prob.status='try';
  else if(prob.status==='try')prob.status='done';
  else prob.status='none';
  saveProblemStatus();
  renderProblems();
  updateProblemStats();
}

function renderProblems(){
  const tbody=document.getElementById('prob-tbody');
  if(!tbody)return;
  let list=problemsData.filter(p=>{
    if(currentProbFilter==='easy')return p.diff==='easy';
    if(currentProbFilter==='medium')return p.diff==='medium';
    if(currentProbFilter==='hard')return p.diff==='hard';
    if(currentProbFilter==='done')return p.status==='done';
    if(currentProbFilter==='todo')return p.status!=='done';
    return true;
  }).filter(p=>{
    if(!currentProbSearch)return true;
    const q=currentProbSearch.toLowerCase();
    return p.name.toLowerCase().includes(q)||p.tags.some(t=>t.toLowerCase().includes(q));
  });
  tbody.innerHTML=list.map(p=>{
    const diffHtml=p.diff==='easy'?'<span class="diff-easy">Dễ</span>':p.diff==='medium'?'<span class="diff-med">Vừa</span>':'<span class="diff-hard">Khó</span>';
    const statusHtml=p.status==='done'?'<span class="prob-status-done" title="Đã giải">✅</span>':p.status==='try'?'<span class="prob-status-try" title="Đang thử">⚡</span>':'<span class="prob-status-none" title="Chưa làm">○</span>';
    const tagsHtml=p.tags.map(t=>`<span class="prob-tag">${t}</span>`).join('');
    return`<tr>
      <td style="color:var(--text3);font-family:var(--mono);font-size:12px;">${p.id}</td>
      <td style="cursor:pointer;" onclick="toggleProblemStatus(${p.id})" title="Nhấp để đổi">${statusHtml}</td>
      <td><span class="prob-name-link" onclick="openProblem(${p.id})">${p.name}</span></td>
      <td>${diffHtml}</td>
      <td><div class="prob-tags">${tagsHtml}</div></td>
      <td style="font-family:var(--mono);font-size:12px;color:var(--text3);">${p.ac}</td>
    </tr>`;
  }).join('');
  updateProblemStats();
}

function openProblem(id){
  const prob=problemsData.find(p=>p.id===id);
  if(!prob)return;
  currentProbId=id;
  document.getElementById('editor-prob-num').textContent='#'+prob.id;
  document.getElementById('editor-prob-title').textContent=prob.name;
  const diffEl=document.getElementById('editor-prob-diff');
  diffEl.innerHTML=prob.diff==='easy'?'<span class="diff-easy">Dễ</span>':prob.diff==='medium'?'<span class="diff-med">Vừa</span>':'<span class="diff-hard">Khó</span>';
  let html=`<div class="prob-desc-section"><p>${prob.description.replace(/<code>/g,'<code style="background:var(--bg);padding:1px 5px;border-radius:4px;font-family:var(--mono);font-size:12px;color:var(--indigo)">').replace(/\n/g,'<br>')}</p></div>`;
  if(prob.examples&&prob.examples.length){
    html+='<div class="prob-desc-section"><h4>Ví dụ</h4>';
    prob.examples.forEach(ex=>{
      html+=`<div class="prob-example"><code><b>Input:</b> ${ex.input}\n<b>Output:</b> ${ex.output}${ex.explain?'\n<b>Giải thích:</b> '+ex.explain:''}</code></div>`;
    });
    html+='</div>';
  }
  if(prob.constraints&&prob.constraints.length){
    html+='<div class="prob-desc-section"><h4>Ràng buộc</h4><div class="prob-constraints"><ul>';
    prob.constraints.forEach(c=>{html+=`<li>${c}</li>`;});
    html+='</ul></div></div>';
  }
  document.getElementById('editor-prob-body').innerHTML=html;
  document.getElementById('code-editor').value=(prob.starter&&prob.starter[currentLang])||'// Viết code của bạn ở đây\n';
  renderTestCases(prob);
  setPage('editor',null);
  document.getElementById('page-title').textContent=`💻 ${prob.name}`;
}

function renderTestCases(prob){
  if(currentOutputTab!=='testcase')return;
  let html='';
  (prob.testcases||[]).forEach((tc,i)=>{
    html+=`<div class="testcase-row"><div class="testcase-label">Test Case ${i+1}</div><div class="testcase-val">${tc.input.replace(/\n/g,'<br>')}</div><div class="testcase-label" style="margin-top:6px;">Expected</div><div class="testcase-val">${tc.expected}</div></div>`;
  });
  document.getElementById('output-body').innerHTML=html||'<div style="color:#585b70;font-family:var(--mono);font-size:12px;">Chưa có test case.</div>';
}

function switchOutputTab(tab,btn){
  currentOutputTab=tab;
  document.querySelectorAll('.output-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const prob=problemsData.find(p=>p.id===currentProbId);
  if(tab==='testcase'&&prob)renderTestCases(prob);
  else if(tab==='result') document.getElementById('output-body').innerHTML='<div class="result-line result-info">▶ Nhấn "Chạy" để xem kết quả</div>';
  else if(tab==='submissions')renderSubmissions();
}

function renderSubmissions(){
  const mine=submissionsHistory.filter(s=>s.probId===currentProbId).reverse();
  document.getElementById('output-body').innerHTML=mine.length?mine.map(s=>`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #313244;"><span class="${s.pass?'result-pass':'result-fail'} result-line">${s.pass?'✅ Accepted':'❌ Wrong Answer'}</span><span style="color:#6c7086;font-size:11px;font-family:var(--mono);margin-left:auto;">${s.lang} · ${s.time}</span></div>`).join(''):'<div style="color:#585b70;font-size:12px;font-family:var(--mono);">Chưa có lần nộp.</div>';
}

function changeLang(lang){
  const prob=problemsData.find(p=>p.id===currentProbId);
  if(prob&&prob.starter&&prob.starter[lang]){
    if(!confirm('Đổi ngôn ngữ sẽ reset code hiện tại. Tiếp tục?')){
      document.getElementById('lang-select').value=currentLang;return;
    }
    document.getElementById('code-editor').value=prob.starter[lang];
  }
  currentLang=lang;
}

function runCode(){
  const code=document.getElementById('code-editor').value.trim();
  if(!code){showToast('Viết code trước đã!','⚠️');return;}
  const prob=problemsData.find(p=>p.id===currentProbId);
  document.querySelectorAll('.output-tab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.output-tab')[1].classList.add('active');
  currentOutputTab='result';
  document.getElementById('output-body').innerHTML='<div class="result-line result-info">⏳ Đang chạy...</div>';
  setTimeout(()=>{
    const pass=Math.random()>0.35;
    const tc=prob?prob.testcases:[];
    let html=`<div class="result-line ${pass?'result-pass':'result-fail'}" style="font-size:13px;font-weight:700;margin-bottom:12px;">${pass?'✅ Chạy thành công!':'❌ Một số test case thất bại'}</div>`;
    tc.forEach((t,i)=>{
      const ok=i<tc.length-1?true:pass;
      html+=`<div style="margin-bottom:10px;"><div class="result-line ${ok?'result-pass':'result-fail'}">${ok?'✅':'❌'} Test ${i+1}</div><div style="margin-top:4px;background:#313244;border-radius:6px;padding:8px 10px;"><div class="result-line result-info">Input: ${t.input.replace(/\n/g,' | ')}</div><div class="result-line ${ok?'result-pass':'result-fail'}">Output: ${ok?t.expected:'Wrong'}</div></div></div>`;
    });
    document.getElementById('output-body').innerHTML=html;
    showToast(pass?'Code chạy thành công! 🎉':'Có test case thất bại',pass?'✅':'❌');
  },800);
}

function submitCode(){
  const code=document.getElementById('code-editor').value.trim();
  if(!code){showToast('Viết code trước đã!','⚠️');return;}
  const prob=problemsData.find(p=>p.id===currentProbId);
  document.querySelectorAll('.output-tab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.output-tab')[1].classList.add('active');
  currentOutputTab='result';
  document.getElementById('output-body').innerHTML='<div class="result-line result-info">⏳ Đang chấm bài...</div>';
  setTimeout(()=>{
    const accepted=Math.random()>0.3;
    const runtime=Math.floor(Math.random()*80+20);
    const memory=Math.floor(Math.random()*10+14);
    const beats=Math.floor(Math.random()*30+65);
    if(accepted&&prob&&prob.status!=='done'){prob.status='done';saveProblemStatus();updateProblemStats();}
    const now=new Date();
    submissionsHistory.push({probId:currentProbId,pass:accepted,lang:currentLang,time:`${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`});
    if(accepted&&prob){
      const score=ls('lf_user_score',2840);
      ls_set('lf_user_score',score+100);
      const el=document.getElementById('user-score');
      if(el)el.textContent=(score+100).toLocaleString();
    }
    const html=accepted?`<div class="result-line result-pass" style="font-size:15px;font-weight:700;margin-bottom:16px;">✅ Accepted</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
        <div style="background:#313244;border-radius:6px;padding:10px 12px;"><div style="font-size:10px;color:#6c7086;font-family:var(--mono);margin-bottom:4px;">RUNTIME</div><div style="font-size:16px;font-weight:700;color:#a6e3a1;font-family:var(--mono);">${runtime} ms</div><div style="font-size:10px;color:#6c7086;">Beats ${beats}%</div></div>
        <div style="background:#313244;border-radius:6px;padding:10px 12px;"><div style="font-size:10px;color:#6c7086;font-family:var(--mono);margin-bottom:4px;">MEMORY</div><div style="font-size:16px;font-weight:700;color:#89b4fa;font-family:var(--mono);">${memory}.2 MB</div><div style="font-size:10px;color:#6c7086;">Beats ${100-beats}%</div></div>
      </div><div class="result-line result-pass">Tất cả test cases pass! 🎉</div>`
    :`<div class="result-line result-fail" style="font-size:15px;font-weight:700;margin-bottom:12px;">❌ Wrong Answer</div>
      <div style="background:#313244;border-radius:6px;padding:10px 12px;margin-bottom:8px;"><div class="result-line result-info">Test case thất bại</div></div>
      <div class="result-line result-warn">Kiểm tra lại logic và thử lại nhé.</div>`;
    document.getElementById('output-body').innerHTML=html;
    showToast(accepted?`Accepted! +100 XP 🎉`:'Wrong Answer, thử lại nhé!',accepted?'🏆':'❌');
  },1200);
}

function handleEditorKey(e){
  if(e.key==='Tab'){e.preventDefault();const ta=e.target,s=ta.selectionStart,en=ta.selectionEnd;ta.value=ta.value.substring(0,s)+'  '+ta.value.substring(en);ta.selectionStart=ta.selectionEnd=s+2;}
}

function backToProblems(){setPage('problems',document.getElementById('nav-problems'));}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHALLENGE TIMER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let challengeSelectedMin=5;
let challengeInterval=null;
let challengeEndTime=null;
let challengeTotalSec=0;

function openChallengeModal(){
  document.getElementById('challenge-timer-modal').classList.add('open');
  document.querySelectorAll('.ctm-preset').forEach(b=>b.classList.remove('selected'));
  document.querySelector('.ctm-preset').classList.add('selected');
  challengeSelectedMin=5;
  document.getElementById('challenge-custom-min').value='';
}
function closeChallengeModal(){document.getElementById('challenge-timer-modal').classList.remove('open');}
function selectChallengePreset(min,el){
  challengeSelectedMin=min;
  document.querySelectorAll('.ctm-preset').forEach(b=>b.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('challenge-custom-min').value='';
}
function startChallengeTimer(){
  const customVal=parseInt(document.getElementById('challenge-custom-min').value);
  const mins=(!isNaN(customVal)&&customVal>0)?customVal:challengeSelectedMin;
  challengeTotalSec=mins*60;
  challengeEndTime=Date.now()+challengeTotalSec*1000;
  closeChallengeModal();
  document.getElementById('challenge-timer-bar').classList.add('active');
  clearInterval(challengeInterval);
  updateChallengeDisplay();
  challengeInterval=setInterval(updateChallengeDisplay,1000);
  showToast(`⏱ Bắt đầu thử thách ${mins} phút!`,'⚡');
}
function updateChallengeDisplay(){
  if(!challengeEndTime)return;
  const remaining=Math.max(0,Math.floor((challengeEndTime-Date.now())/1000));
  const m=Math.floor(remaining/60),s=remaining%60;
  const timeStr=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  const miniStr=remaining<60?`${remaining}s`:`${m}m`;
  const isWarning=remaining<=60;
  const progress=1-remaining/challengeTotalSec;
  const remainEl=document.getElementById('ct-remaining-display');
  const miniEl=document.getElementById('ct-mini-display');
  const circEl=document.getElementById('ct-circle');
  if(remainEl){remainEl.textContent=timeStr;remainEl.className='ct-remaining'+(isWarning?' warning':'');}
  if(miniEl){miniEl.textContent=miniStr;miniEl.className='ct-time-text'+(isWarning?' warning':'');}
  if(circEl){circEl.style.strokeDashoffset=94.2*progress;circEl.style.stroke=isWarning?'#f38ba8':'var(--indigo)';}
  if(remaining<=0){
    clearInterval(challengeInterval);
    document.getElementById('challenge-timer-bar').classList.remove('active');
    const ov=document.getElementById('ct-finished-overlay');
    document.getElementById('ctf-emoji').textContent='⏰';
    document.getElementById('ctf-title').textContent='Hết giờ thử thách!';
    document.getElementById('ctf-msg').textContent=`Bạn đã dùng hết ${Math.round(challengeTotalSec/60)} phút. Nhìn lại và cải thiện nhé!`;
    ov.classList.add('open');
    showToast('⏰ Thời gian thử thách kết thúc!','⚡');
  }
}
function stopChallengeTimer(){
  clearInterval(challengeInterval);challengeEndTime=null;
  document.getElementById('challenge-timer-bar').classList.remove('active');
  showToast('Đã dừng thử thách','⏹');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LEVEL SYSTEM — dynamic level from real XP/score
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const LEVEL_TABLE=[
  {level:1,  title:'Newbie',      emoji:'🌱', minXP:0},
  {level:2,  title:'Explorer',    emoji:'🔍', minXP:500},
  {level:3,  title:'Apprentice',  emoji:'📖', minXP:1000},
  {level:4,  title:'Student',     emoji:'🎓', minXP:1800},
  {level:5,  title:'Learner',     emoji:'💡', minXP:2800},
  {level:6,  title:'Scholar',     emoji:'🏫', minXP:4000},
  {level:7,  title:'Practitioner',emoji:'🔧', minXP:5500},
  {level:8,  title:'Developer',   emoji:'💻', minXP:7500},
  {level:9,  title:'Expert',      emoji:'⚡', minXP:10000},
  {level:10, title:'Master',      emoji:'🏆', minXP:13000},
  {level:11, title:'Architect',   emoji:'🏛️', minXP:17000},
  {level:12, title:'Sage',        emoji:'🧙', minXP:22000},
  {level:13, title:'Legend',      emoji:'✨', minXP:28000},
  {level:14, title:'Grandmaster', emoji:'👑', minXP:35000},
  {level:15, title:'Mythic',      emoji:'🌟', minXP:50000},
];

function getLevelInfo(score){
  let info=LEVEL_TABLE[0];
  for(let i=LEVEL_TABLE.length-1;i>=0;i--){
    if(score>=LEVEL_TABLE[i].minXP){info=LEVEL_TABLE[i];break;}
  }
  const nextIdx=LEVEL_TABLE.findIndex(l=>l.level===info.level)+1;
  const nextLevel=nextIdx<LEVEL_TABLE.length?LEVEL_TABLE[nextIdx]:null;
  const xpInLevel=score-info.minXP;
  const xpToNext=nextLevel?nextLevel.minXP-info.minXP:1;
  const pct=nextLevel?Math.min(100,Math.round(xpInLevel/xpToNext*100)):100;
  return{...info,score,xpInLevel,xpToNext,pct,nextLevel};
}

function updateLevelDisplay(){
  const score=ls('lf_user_score',2840);
  const info=getLevelInfo(score);
  const labelEl=document.getElementById('sidebar-level-label');
  if(labelEl)labelEl.textContent=`Level ${info.level} · ${info.title}`;
  // update leaderboard 'me' row level
  const lbLvEl=document.querySelector('.lb-inf .lb-lv');
  // find the "Bạn" row specifically
  document.querySelectorAll('.lb-row').forEach(row=>{
    if(row.querySelector('.me-tag')){
      const lvEl=row.querySelector('.lb-lv');
      if(lvEl)lvEl.textContent=`Lv.${info.level}`;
    }
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SETTINGS PAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function renderSettingsPage(){
  const user=getCurrentUser();
  const score=ls('lf_user_score',2840);
  const streak=ls('lf_streak',0);
  const info=getLevelInfo(score);
  const solved=problemsData.filter(p=>p.status==='done').length;

  // Profile
  if(user){
    const initials=user.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    const avaEl=document.getElementById('settings-ava');
    if(avaEl)avaEl.textContent=initials;
    const nameEl=document.getElementById('settings-name');
    if(nameEl)nameEl.textContent=user.name;
    const emailEl=document.getElementById('settings-email');
    if(emailEl)emailEl.textContent=user.email+' · Tham gia: '+(user.createdAt||'');
  }

  const lvBadge=document.getElementById('settings-level-badge');
  const titleBadge=document.getElementById('settings-title-badge');
  if(lvBadge)lvBadge.textContent=`${info.emoji} Level ${info.level}`;
  if(titleBadge)titleBadge.textContent=info.title;

  // XP Bar
  const xpText=document.getElementById('settings-xp-text');
  const xpBar=document.getElementById('settings-xp-bar');
  const xpSub=document.getElementById('settings-xp-sub');
  if(xpText)xpText.textContent=`${score.toLocaleString()} XP tổng cộng`;
  if(xpBar)xpBar.style.width=info.pct+'%';
  if(xpSub){
    if(info.nextLevel)xpSub.textContent=`${info.xpInLevel.toLocaleString()} / ${info.xpToNext.toLocaleString()} XP — cần thêm ${(info.xpToNext-info.xpInLevel).toLocaleString()} XP để lên Level ${info.level+1}`;
    else xpSub.textContent='🌟 Đã đạt cấp độ tối đa!';
  }

  // Stats
  const ss=document.getElementById('settings-stat-score');
  const sst=document.getElementById('settings-stat-streak');
  const ssp=document.getElementById('settings-stat-problems');
  if(ss)ss.textContent=score.toLocaleString();
  if(sst)sst.textContent=streak;
  if(ssp)ssp.textContent=solved;

  // Level Roadmap
  const roadmap=document.getElementById('settings-level-roadmap');
  if(roadmap){
    roadmap.innerHTML=LEVEL_TABLE.map(l=>{
      const isCurrent=l.level===info.level;
      const isDone=score>=l.minXP&&!isCurrent;
      const isLocked=score<l.minXP;
      const bg=isCurrent?'var(--indigo-light)':isDone?'#f0fdf4':'var(--bg)';
      const border=isCurrent?'var(--indigo)':isDone?'#86efac':'var(--border)';
      const opacity=isLocked?'0.5':'1';
      return`<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:var(--r2);border:1.5px solid ${border};background:${bg};opacity:${opacity};transition:all .15s;">
        <div style="font-size:20px;width:28px;text-align:center;">${l.emoji}</div>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:${isCurrent?'700':'600'};color:${isCurrent?'var(--indigo)':'var(--text1)'};">Level ${l.level} — ${l.title}</div>
          <div style="font-size:11px;color:var(--text3);font-family:var(--mono);">Từ ${l.minXP.toLocaleString()} XP</div>
        </div>
        ${isCurrent?`<span style="font-size:10px;background:var(--indigo);color:#fff;border-radius:20px;padding:2px 10px;font-weight:700;">⭐ Hiện tại</span>`:isDone?`<span style="font-size:14px;color:#16a34a;">✅</span>`:`<span style="font-size:14px;color:var(--text3);">🔒</span>`}
      </div>`;
    }).join('');
  }

  // Load saved Pomodoro settings
  const pomoSettings=ls('lf_pomo_settings',{focus:25,short:5,long:15,sound:true});
  const fv=document.getElementById('pomo-focus-val');
  const sv=document.getElementById('pomo-short-val');
  const lv=document.getElementById('pomo-long-val');
  const sd=document.getElementById('toggle-sound');
  if(fv)fv.textContent=pomoSettings.focus;
  if(sv)sv.textContent=pomoSettings.short;
  if(lv)lv.textContent=pomoSettings.long;
  if(sd){
    sd.checked=pomoSettings.sound!==false;
    updateToggleUI('sound-slider','sound-knob',sd.checked);
  }

  // Load dark mode
  const isDark=ls('lf_dark_mode',false);
  const darkToggle=document.getElementById('toggle-dark');
  if(darkToggle){
    darkToggle.checked=isDark;
    updateToggleUI('dark-slider','dark-knob',isDark);
  }

  // Load font size
  const fontSize=ls('lf_font_size','14');
  const fsSel=document.getElementById('font-size-select');
  if(fsSel)fsSel.value=fontSize;

  // Load notif settings
  const notifSettings=ls('lf_notif_settings',{study:true,task:true,streak:true});
  const ns=document.getElementById('toggle-notif-study');
  const nt=document.getElementById('toggle-notif-task');
  const nst=document.getElementById('toggle-notif-streak');
  if(ns){ns.checked=notifSettings.study;updateSliderFromBool('notif-study-slider',notifSettings.study);}
  if(nt){nt.checked=notifSettings.task;updateSliderFromBool('notif-task-slider',notifSettings.task);}
  if(nst){nst.checked=notifSettings.streak;updateSliderFromBool('notif-streak-slider',notifSettings.streak);}
}

function updateToggleUI(sliderId,knobId,checked){
  const slider=document.getElementById(sliderId);
  const knob=document.getElementById(knobId);
  if(slider)slider.style.background=checked?'var(--indigo)':'var(--border2)';
  if(knob)knob.style.left=checked?'22px':'3px';
}

function updateSliderFromBool(sliderId,checked){
  const slider=document.getElementById(sliderId);
  if(!slider)return;
  slider.style.background=checked?'var(--indigo)':'var(--border2)';
  const knob=slider.querySelector('span');
  if(knob)knob.style.left=checked?'22px':'3px';
}

function applyDarkMode(enabled){
  ls_set('lf_dark_mode',enabled);
  updateToggleUI('dark-slider','dark-knob',enabled);
  const root=document.documentElement;
  if(enabled){
    root.style.setProperty('--bg','#1a1a2e');
    root.style.setProperty('--surface','#16213e');
    root.style.setProperty('--surface2','#0f3460');
    root.style.setProperty('--border','#2a2a4a');
    root.style.setProperty('--border2','#3a3a5a');
    root.style.setProperty('--text1','#e8e6f0');
    root.style.setProperty('--text2','#a09cbc');
    root.style.setProperty('--text3','#6b6890');
  } else {
    root.style.setProperty('--bg','#f5f4f0');
    root.style.setProperty('--surface','#ffffff');
    root.style.setProperty('--surface2','#faf9f7');
    root.style.setProperty('--border','#e8e5df');
    root.style.setProperty('--border2','#d4cfc6');
    root.style.setProperty('--text1','#1a1916');
    root.style.setProperty('--text2','#6b6760');
    root.style.setProperty('--text3','#a09c96');
  }
  showToast(enabled?'🌙 Đã bật chế độ tối':'☀️ Đã tắt chế độ tối','🎨');
}

function setAccentColor(main,light,mid,el){
  ls_set('lf_accent',{main,light,mid});
  document.documentElement.style.setProperty('--indigo',main);
  document.documentElement.style.setProperty('--indigo-light',light);
  document.documentElement.style.setProperty('--indigo-mid',mid);
  document.querySelectorAll('.accent-dot').forEach(d=>{d.style.outline='none';});
  if(el){el.style.outline='2px solid #fff';el.style.outlineOffset='1px';}
  showToast('Đã đổi màu chủ đạo 🎨','✨');
}

function setFontSize(size){
  ls_set('lf_font_size',size);
  document.body.style.fontSize=size+'px';
  showToast(`Cỡ chữ: ${size}px`,'🔤');
}

function adjustPomo(type,delta){
  const settings=ls('lf_pomo_settings',{focus:25,short:5,long:15,sound:true});
  const min={focus:5,short:1,long:5};
  const max={focus:60,short:15,long:30};
  settings[type]=Math.min(max[type],Math.max(min[type],(settings[type]||min[type])+delta));
  ls_set('lf_pomo_settings',settings);
  const elMap={focus:'pomo-focus-val',short:'pomo-short-val',long:'pomo-long-val'};
  const el=document.getElementById(elMap[type]);
  if(el)el.textContent=settings[type];
}

function savePomodoroSettings(){
  const settings=ls('lf_pomo_settings',{focus:25,short:5,long:15,sound:true});
  const sd=document.getElementById('toggle-sound');
  if(sd){settings.sound=sd.checked;updateToggleUI('sound-slider','sound-knob',sd.checked);}
  ls_set('lf_pomo_settings',settings);
  // apply to timer
  timerModes.focus=(settings.focus||25)*60;
  timerModes.short=(settings.short||5)*60;
  timerModes.long=(settings.long||15)*60;
  showToast('Đã lưu cài đặt Pomodoro ✅','⏱️');
}

function saveNotifSettings(){
  const ns=document.getElementById('toggle-notif-study');
  const nt=document.getElementById('toggle-notif-task');
  const nst=document.getElementById('toggle-notif-streak');
  const settings={
    study:ns?ns.checked:true,
    task:nt?nt.checked:true,
    streak:nst?nst.checked:true,
  };
  ls_set('lf_notif_settings',settings);
  ['notif-study-slider','notif-task-slider','notif-streak-slider'].forEach((id,i)=>{
    const vals=[settings.study,settings.task,settings.streak];
    updateSliderFromBool(id,vals[i]);
  });
}

function exportData(){
  const data={
    user:getCurrentUser(),
    score:ls('lf_user_score',0),
    streak:ls('lf_streak',0),
    tasks:ls('lf_tasks',[]),
    schedule:ls('lf_schedule',[]),
    problems:ls('problems_status',{}),
    activity:ls('lf_activity',[]),
    exportedAt:new Date().toISOString()
  };
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='learnflow_data.json';
  a.click();
  showToast('Đã xuất dữ liệu thành công!','📥');
}

function resetAllData(){
  if(!confirm('⚠️ Bạn có chắc muốn xoá toàn bộ tiến độ học tập? Hành động này không thể hoàn tác!'))return;
  if(!confirm('Xác nhận lần nữa: XOÁ TẤT CẢ dữ liệu?'))return;
  const keysToKeep=['lf_users','lf_current'];
  const allKeys=Object.keys(localStorage).filter(k=>k.startsWith('lf_')||k==='problems_status');
  allKeys.forEach(k=>{if(!keysToKeep.includes(k))localStorage.removeItem(k);});
  showToast('Đã reset dữ liệu. Làm mới trang để áp dụng.','🗑');
  setTimeout(()=>location.reload(),1500);
}

// Apply saved settings on load
function applyStoredSettings(){
  const isDark=ls('lf_dark_mode',false);
  if(isDark)applyDarkMode(true);
  const accent=ls('lf_accent',null);
  if(accent){
    document.documentElement.style.setProperty('--indigo',accent.main);
    document.documentElement.style.setProperty('--indigo-light',accent.light);
    document.documentElement.style.setProperty('--indigo-mid',accent.mid);
  }
  const fontSize=ls('lf_font_size','14');
  if(fontSize!=='14')document.body.style.fontSize=fontSize+'px';
  // apply custom pomo times
  const pomoSettings=ls('lf_pomo_settings',null);
  if(pomoSettings){
    timerModes.focus=(pomoSettings.focus||25)*60;
    timerModes.short=(pomoSettings.short||5)*60;
    timerModes.long=(pomoSettings.long||15)*60;
    timerTotal=timerModes.focus;
    timerRemaining=timerTotal;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INIT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
document.addEventListener('DOMContentLoaded',()=>{
  applyStoredSettings();
  initDefaultProgress();
  loadProblemsStatus();
  initAuth();
  renderDashboardCourses();
  renderSchedule();
  renderActivityChart();
  renderProblems();
  renderTasksPage();
  updateTasksBadge();
  updateLevelDisplay();

  // init pomodoro display
  document.getElementById('pomo-count').textContent=pomoCount;
  const ph=Math.floor(pomoTotalSec/3600),pm=Math.floor((pomoTotalSec%3600)/60);
  document.getElementById('pomo-time').textContent=`${ph}h ${pm}m`;
  renderTimer();

  // user score
  const score=ls('lf_user_score',2840);
  const el=document.getElementById('user-score');
  if(el)el.textContent=score.toLocaleString();

  // update activity chart every minute
  setInterval(()=>{
    updateTodayActivity();
    if(document.getElementById('page-dashboard').style.display!=='none'){
      renderSchedule();
    }
  },60000);
});
