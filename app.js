const APP = {
  user: localStorage.getItem('tq_user') || null,
  analytics: JSON.parse(localStorage.getItem('tq_analytics')||'[]'), // [{date,wpm,acc}]
  streak: parseInt(localStorage.getItem('tq_streak')||'0'),
  lastPracticeDay: localStorage.getItem('tq_last_day') || null,
  daily: JSON.parse(localStorage.getItem('tq_daily')||'null'),
  fall: {running:false, words:[], interval:null, anim:null, score:0, best: parseInt(localStorage.getItem('tq_fall_best')||'0')},
  racer: {running:false, distance:0, target:''},
  test: {running:false, seconds:60, timer:null, startTime:0}
};

/* ---------------------------
   Utility helpers
   --------------------------- */
const $ = id => document.getElementById(id);
function saveAnalytics(){ localStorage.setItem('tq_analytics', JSON.stringify(APP.analytics)); }
function saveStreak(){ localStorage.setItem('tq_streak', APP.streak); localStorage.setItem('tq_last_day', APP.lastPracticeDay); }
function saveDaily(){ localStorage.setItem('tq_daily', JSON.stringify(APP.daily)); }
function saveUser(){ if(APP.user) localStorage.setItem('tq_user', APP.user); else localStorage.removeItem('tq_user'); }

/* ---------------------------
   Init UI on load
   --------------------------- */
document.addEventListener('DOMContentLoaded', ()=>{
  // wire nav
  $('profileBtn').addEventListener('click', openModal);
  $('accentToggle').addEventListener('click', toggleAccent);
  $('startNow').addEventListener('click', ()=> scrollToId('practice'));
  document.querySelectorAll('nav a').forEach(a=>a.addEventListener('click', e=>{}));

  // modal
  $('modal').style.display='none';

  // practice
  $('practiceInput').value='';
  $('practiceDone').innerText = 0;

  // falling game
  $('startFallBtn').addEventListener('click', startFalling);
  $('stopFallBtn').addEventListener('click', stopFalling);
  $('fallBest').innerText = APP.fall.best;

  // racer
  $('startRacerBtn').addEventListener('click', startRacer);
  $('stopRacerBtn').addEventListener('click', stopRacer);

  // test
  $('startTestBtn').addEventListener('click', ()=> startTest(60));
  $('stopTestBtn').addEventListener('click', stopTest);

  // challenge
  $('attemptChallenge').addEventListener('click', ()=> scrollToId('test'));
  $('resetChallenge').addEventListener('click', resetDaily);

  // certificate
  $('downloadCert').addEventListener('click', generateCertificate);

  // load user
  $('displayName').innerText = APP.user || 'Guest';

  // init daily challenge
  setupDaily();

  // charts
  renderCharts();

  // fill initial test passage
  $('testPassage').innerText = sampleParagraph();

  // update UI values
  updateLatestUI();
  updateStreakUI();
});

/* ---------------------------
   Accent toggle (keeps light theme, toggles accent colors)
   --------------------------- */
let accentState = 0;
function toggleAccent(){
  accentState = (accentState+1) % 2;
  if(accentState===1){
    document.documentElement.style.setProperty('--accent', '#2196f3');
    document.documentElement.style.setProperty('--accent-2', '#009688');
  } else {
    document.documentElement.style.setProperty('--accent', '#009688');
    document.documentElement.style.setProperty('--accent-2', '#2196f3');
  }
}

/* ---------------------------
   Modal / profile
   --------------------------- */
function openModal(){ $('modal').style.display='flex'; $('nameInput').value = APP.user || ''; $('nameInput').focus(); }
function closeModal(){ $('modal').style.display='none'; }
function saveProfile(){ const v = $('nameInput').value.trim(); if(!v) return alert('Enter a name'); APP.user = v; saveUser(); $('displayName').innerText = APP.user; closeModal(); }
function logout(){ APP.user=null; saveUser(); $('displayName').innerText='Guest'; closeModal(); }

/* ---------------------------
   Smooth scroll
   --------------------------- */
function scrollToId(id){ document.getElementById(id).scrollIntoView({behavior:'smooth', block:'start'}); }

/* ===========================
   PRACTICE logic
   =========================== */
let practicePool = ["asdf","jkl;","sdfg","hjkl","qwer","uiop","zxcv","nm,."];
let practiceIndex=0, practiceActive=false;
function startPractice(){ practiceIndex=0; practiceActive=true; $('practiceWord').innerText = practicePool[practiceIndex]; $('practiceInput').value=''; $('practiceInput').focus(); }
function stopPractice(){ practiceActive=false; $('practiceWord').innerText='Ready'; }
function practiceCheck(){
  if(!practiceActive) return;
  const val = $('practiceInput').value.trim();
  if(val === practicePool[practiceIndex]){
    practiceIndex++;
    $('practiceInput').value='';
    $('practiceDone').innerText = practiceIndex;
    if(practiceIndex >= practicePool.length){ stopPractice(); alert('Drill complete!'); updateStreakOnActivity(); }
    else $('practiceWord').innerText = practicePool[practiceIndex];
  }
}
function startCustomPractice(){ const txt = $('customText').value.trim(); if(!txt) return alert('Paste text'); practicePool = txt.split(/\s+/).slice(0,200); startPractice(); }

/* ===========================
   FALLING WORDS GAME
   =========================== */
const fallArea = $('fallArea');
let fallLastTime = null;
let FALL_SPEED = 60; // px/sec
function startFalling(){
  if(APP.fall.running) return;
  APP.fall.running = true; APP.fall.words = []; APP.fall.score = 0; $('fallScore').innerText = 0;
  spawnFallWord();
  APP.fall.interval = setInterval(spawnFallWord, 1400);
  APP.fall.anim = requestAnimationFrame(stepFall);
}
function stopFalling(){
  APP.fall.running=false;
  clearInterval(APP.fall.interval);
  cancelAnimationFrame(APP.fall.anim);
  fallArea.querySelectorAll('.falling-word').forEach(n=>n.remove());
  APP.fall.words=[];
  fallLastTime = null;
}
function spawnFallWord(){
  const word = randomWord();
  const el = document.createElement('div'); el.className='falling-word'; el.textContent = word;
  const x = Math.max(8, Math.random()*(fallArea.clientWidth-120));
  el.style.left = x + 'px'; el.style.top='-36px';
  fallArea.appendChild(el);
  APP.fall.words.push({el, text:word, x, y:-36});
}
function stepFall(ts){
  if(!APP.fall.running) return;
  if(!fallLastTime) fallLastTime = ts;
  const dt = (ts - fallLastTime)/1000; fallLastTime = ts;
  const toRemove = [];
  APP.fall.words.forEach(w=>{
    w.y += FALL_SPEED * dt;
    w.el.style.top = w.y + 'px';
    if(w.y > fallArea.clientHeight - 28){ toRemove.push(w); }
  });
  toRemove.forEach(w=>{
    try{ w.el.remove(); }catch(e){}
    APP.fall.words = APP.fall.words.filter(x=>x!==w);
  });
  APP.fall.anim = requestAnimationFrame(stepFall);
}
function handleFallInput(){
  const val = $('fallInput').value.trim();
  if(!val) return;
  const found = APP.fall.words.find(w=>w.text === val);
  if(found){
    APP.fall.score += Math.max(1, Math.round(found.text.length/2));
    $('fallScore').innerText = APP.fall.score;
    found.el.remove();
    APP.fall.words = APP.fall.words.filter(x=>x!==found);
    if(APP.fall.score > APP.fall.best){ APP.fall.best = APP.fall.score; localStorage.setItem('tq_fall_best', APP.fall.best); $('fallBest').innerText = APP.fall.best; }
  }
  $('fallInput').value='';
}

/* ===========================
   RACER game
   =========================== */
function startRacer(){
  APP.racer.running = true; APP.racer.distance=0; $('racerDist').innerText='0';
  newRacerTarget(); $('racerInput').value=''; $('racerInput').focus();
}
function stopRacer(){ APP.racer.running=false; $('racerTarget').innerText='Stopped'; }
function newRacerTarget(){ APP.racer.target = phrase(4); $('racerTarget').innerText = APP.racer.target; }
function handleRacerInput(){
  const v = $('racerInput').value.trim();
  if(!v) return;
  if(v === APP.racer.target){
    APP.racer.distance += v.length;
    $('racerDist').innerText = APP.racer.distance;
    $('racerInput').value='';
    newRacerTarget();
    updateStreakOnActivity();
    addLeaderboard(APP.racer.distance);
  }
}
function phrase(n){ const pool = ["typing","speed","accuracy","keyboard","practice","function","variable","progress","focus","challenge"]; let s=[]; for(let i=0;i<n;i++) s.push(pool[Math.floor(Math.random()*pool.length)]); return s.join(' '); }
function randomWord(){ const pool = ["apple","keyboard","speed","accuracy","challenge","typing","javascript","quest","function","variable","progress","practice","rhythm","velocity","rocket"]; return pool[Math.floor(Math.random()*pool.length)]; }
function addLeaderboard(score){
  let lb = JSON.parse(localStorage.getItem('tq_leader')||'[]');
  const name = APP.user || 'Guest';
  lb.push({name,score,date:new Date().toLocaleDateString()});
  lb = lb.sort((a,b)=>b.score-a.score).slice(0,8);
  localStorage.setItem('tq_leader', JSON.stringify(lb));
  renderLeaderboard();
}
function renderLeaderboard(){
  const lb = JSON.parse(localStorage.getItem('tq_leader')||'[]');
  const el = $('leaderboard');
  if(!lb.length){ el.innerText='No scores yet'; return; }
  el.innerHTML = '<ol style="padding-left:18px;margin:0">';
  lb.forEach(item => el.innerHTML += `<li style="margin:6px 0">${item.name}: ${item.score}</li>`);
  el.innerHTML += '</ol>';
}

/* ===========================
   TYPING TEST (60s)
   =========================== */
const TEST_POOL = [
  "Typing tests are great for improving speed and accuracy. Practice consistently to see growth.",
  "The quick brown fox jumps over the lazy dog. This pangram contains every letter of the alphabet.",
  "Daily practice of focused typing increases your words per minute while reducing errors."
];
function sampleParagraph(){ return TEST_POOL[Math.floor(Math.random()*TEST_POOL.length)]; }

function startTest(seconds=60){
  if(APP.test.running) return;
  APP.test.running = true; APP.test.seconds = seconds; APP.test.startTime = Date.now();
  const passage = sampleParagraph();
  $('testPassage').innerText = passage; $('testInput').value=''; $('testTimer').innerText = seconds;
  APP.test.timer = setInterval(()=>{
    APP.test.seconds--;
    $('testTimer').innerText = APP.test.seconds;
    if(APP.test.seconds<=0) finishTest();
  },1000);
  $('testInput').focus();
}
function stopTest(){ if(!APP.test.running) return; clearInterval(APP.test.timer); APP.test.running=false; }
function finishTest(){
  clearInterval(APP.test.timer); APP.test.running=false;
  const typed = $('testInput').value.trim();
  const source = $('testPassage').innerText;
  const correctChars = charAccuracy(typed, source);
  const accuracy = Math.round((correctChars / Math.max(1, source.length))*100);
  const minutes = Math.max( (Date.now() - APP.test.startTime)/60000, 1/60 );
  const wpm = Math.round( (typed ? typed.split(/\s+/).length : 0) / minutes );
  // save analytics
  APP.analytics.push({date:new Date().toLocaleDateString(), wpm, acc:accuracy});
  saveAnalytics();
  // show result
  $('latestWPM').innerText = `${wpm} WPM`; $('latestAcc').innerText = `${accuracy} %`;
  // certificate eligibility
  if(wpm>=40 && accuracy>=90){ $('downloadCert').style.display='inline-block'; }
  updateStreakOnTest();
  renderCharts();
  alert(`Test complete — ${wpm} WPM, ${accuracy}% accuracy`);
}

function charAccuracy(a,b){
  const m = Math.min(a.length,b.length);
  let c=0; for(let i=0;i<m;i++) if(a[i]===b[i]) c++;
  return c;
}

/* ===========================
   CHARTS (Chart.js)
   =========================== */
let wpmChart=null, accChart=null;
function renderCharts(){
  const labels = APP.analytics.map((d,i)=> `${i+1} · ${d.date}`);
  const wpms = APP.analytics.map(d=>d.wpm);
  const accs = APP.analytics.map(d=>d.acc);
  const wctx = $('wpmChart').getContext('2d'), actx = $('accChart').getContext('2d');
  if(wpmChart) wpmChart.destroy(); if(accChart) accChart.destroy();
  wpmChart = new Chart(wctx, { type:'line', data:{labels, datasets:[{label:'WPM', data:wpms, backgroundColor:'rgba(33,150,243,0.12)', borderColor:'rgba(33,150,243,0.95)', fill:true, tension:0.25} ] }, options:{responsive:true, plugins:{legend:{display:false}} }});
  accChart = new Chart(actx, { type:'bar', data:{labels, datasets:[{label:'Accuracy', data:accs, backgroundColor:'rgba(0,150,136,0.85)'}]}, options:{responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true, max:100}}}});
}

/* ===========================
   STREAK / DAILY CHALLENGE
   =========================== */
function setupDaily(){
  const today = new Date().toLocaleDateString();
  if(!APP.daily || APP.daily.date !== today){
    const base = APP.analytics.length ? APP.analytics[APP.analytics.length-1].wpm : 20;
    const target = Math.max(20, Math.round(base * (1 + (Math.random()*0.20 + 0.05))));
    APP.daily = {date: today, target, done:false};
    saveDaily();
  }
  $('dailyTarget').innerText = `${APP.daily.target} WPM`;
  $('dailyTarget').style.color = 'var(--accent)';
}

function updateStreakOnTest(){
  const today = new Date().toLocaleDateString();
  if(APP.lastPracticeDay === today) return;
  const yesterday = new Date(Date.now()-86400000).toLocaleDateString();
  APP.streak = (APP.lastPracticeDay === yesterday) ? APP.streak + 1 : 1;
  APP.lastPracticeDay = today;
  saveStreak();
  updateStreakUI();
}

function updateStreakOnActivity(){
  const today = new Date().toLocaleDateString();
  if(APP.lastPracticeDay === today) return;
  const yesterday = new Date(Date.now()-86400000).toLocaleDateString();
  APP.streak = (APP.lastPracticeDay === yesterday) ? APP.streak + 1 : 1;
  APP.lastPracticeDay = today;
  saveStreak(); updateStreakUI();
}

function updateStreakUI(){ $('streakCount').innerText = APP.streak; $('streakDisplay').innerText = `${APP.streak} days`; }

/* ===========================
   CERTIFICATE (jsPDF)
   =========================== */
async function generateCertificate(){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({orientation:'landscape', unit:'pt', format:'a4'});
  // border
  doc.setLineWidth(2); doc.setDrawColor(30,40,50);
  doc.rect(20,20, doc.internal.pageSize.width-40, doc.internal.pageSize.height-40);
  // inline svg -> image
  const svgEl = document.getElementById('logo-svg');
  const svgStr = new XMLSerializer().serializeToString(svgEl);
  const blob = new Blob([svgStr], {type:'image/svg+xml;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const img = new Image(); img.src = url;
  await new Promise(r=>img.onload=r);
  // draw logo
  const imgW = 120, imgH = 120;
  const cx = doc.internal.pageSize.width/2;
  const canvas = document.createElement('canvas'); canvas.width = imgW; canvas.height = imgH;
  const ctx = canvas.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,imgW,imgH); ctx.drawImage(img,0,0,imgW,imgH);
  const dataUrl = canvas.toDataURL('image/png');
  doc.addImage(dataUrl,'PNG', cx - imgW/2, 40, imgW, imgH);
  // title & name
  doc.setFontSize(26); doc.setTextColor(10,30,40);
  doc.text('TypeQuest Certificate of Achievement', cx, 180, {align:'center'});
  const name = APP.user || 'Player One';
  doc.setFontSize(20); doc.text(name, cx, 220, {align:'center'});
  const last = APP.analytics.length ? APP.analytics[APP.analytics.length-1] : {wpm:0, acc:0};
  doc.setFontSize(14); doc.text(`For achieving ${last.wpm} WPM with ${last.acc}% accuracy`, cx, 250, {align:'center'});
  doc.setFontSize(12); doc.text(`Awarded on: ${new Date().toLocaleDateString()}`, cx, 280, {align:'center'});
  doc.save(`TypeQuest_Certificate_${name.replace(/\s+/g,'_')}.pdf`);
}

/* ===========================
   Leaderboard rendering (on load)
   =========================== */
function renderLeaderboardOnLoad(){ renderLeaderboard(); }

/* ===========================
   Helpers & bindings
   =========================== */
function updateLatestUI(){
  if(APP.analytics.length){
    const last = APP.analytics[APP.analytics.length-1];
    $('latestWPM').innerText = `${last.wpm} WPM`;
    $('latestAcc').innerText = `${last.acc} %`;
  }
  $('dailyProgress').innerText = Math.min(100, Math.round((APP.streak/7)*100));
  renderCharts();
  renderLeaderboardOnLoad();
}
function resetDaily(){ localStorage.removeItem('tq_daily'); APP.daily=null; setupDaily(); alert('Daily challenge reset'); }

/* ===========================
   Event wiring for inputs invoked earlier
   =========================== */
document.addEventListener('DOMContentLoaded', ()=>{
  // fall input
  $('fallInput').addEventListener('keydown', (e)=>{ if(e.key==='Enter') handleFallInput(); });
  // practice enter handled inline
  // racer input handled inline
});

/* Kickstart UI */
renderLeaderboardOnLoad();
updateLatestUI();
