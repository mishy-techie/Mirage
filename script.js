const POOL=['🦊','🐙','🦋','🌵','🍄','🔮','🐚','🦉','🍉','🌙','🦄','🐢','🌻','🍒'];
const MODES={
  clear:{swaps:0,th:[10,14],blurb:'Find all 8 pairs. The board stays still.'},
  mist:{swaps:1,th:[14,20],blurb:'Mist rolls in: after each miss, two tiles trade places. Watch closely!'},
  storm:{swaps:2,th:[18,28],blurb:'Storm! After each miss, two pairs of tiles trade places.'}};
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const $=id=>document.getElementById(id);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const reduced=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
let mode='clear',tiles=[],sel=[],busy=false,moves=0,matched=0,secs=0,timer=null,started=false,over=false,glimpsed=false,soundOn=true,AC=null,best={};
try{best=JSON.parse(store.get('mir-best')||'{}')||{}}catch(e){}

function tone(f,d=.12,t=0,type='sine'){
  if(!soundOn)return;
  try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();
  if(AC.state==='suspended')AC.resume();
  const o=AC.createOscillator(),g=AC.createGain(),s=AC.currentTime+t;
  o.type=type;o.frequency.value=f;
  g.gain.setValueAtTime(.16,s);g.gain.exponentialRampToValueAtTime(.001,s+d);
  o.connect(g);g.connect(AC.destination);o.start(s);o.stop(s+d)}catch(e){}
}
function sfx(k){
  if(k==='flip')tone(620,.06);
  else if(k==='match'){tone(660,.14,0,'triangle');tone(880,.2,.1,'triangle')}
  else if(k==='miss')tone(220,.2,0,'triangle');
  else if(k==='drift'){[500,420,340,420,500].forEach((f,i)=>tone(f,.1,i*.07,'sine'))}
  else if(k==='win')[523,659,784,1047,1319].forEach((f,i)=>tone(f,.2,i*.11,'triangle'));
}
function confetti(){
  if(reduced())return;
  const e=['✨','🔮','🌙','🦋','⭐'];
  for(let i=0;i<26;i++){
    const s=document.createElement('span');s.className='fall';
    s.textContent=e[i%e.length];s.style.left=Math.random()*95+'vw';
    s.style.animationDelay=Math.random()*.8+'s';
    document.body.appendChild(s);setTimeout(()=>s.remove(),3200);
  }
}
function setTheme(t){document.documentElement.dataset.theme=t;store.set('mir-theme',t);$('themeBtn').textContent=t==='dark'?'☀️ Light':'🌙 Dark'}
function setSound(on){soundOn=on;store.set('mir-sound',on?'1':'0');$('soundBtn').textContent=on?'🔊 Sound on':'🔇 Sound off'}
const say=t=>$('msg').textContent=t;
const fmt=s=>Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
function hud(){
  $('hm').textContent=moves;$('hp').textContent=matched+'/8';$('ht').textContent=fmt(secs);
  $('hb').textContent=best[mode]?best[mode]:'-';
}
function place(t){
  t.el.style.setProperty('--c',t.slot%4);t.el.style.setProperty('--r',t.slot/4|0);
  t.btn.setAttribute('aria-label',t.done||t.up?t.sym+' tile':'Hidden tile, row '+((t.slot/4|0)+1)+', column '+(t.slot%4+1));
}
function newGame(){
  clearInterval(timer);
  moves=0;matched=0;secs=0;sel=[];busy=false;started=false;over=false;glimpsed=false;
  $('result').style.display='none';$('glimpse').disabled=false;
  const syms=shuffle(POOL).slice(0,8),deck=shuffle([...syms,...syms]),board=$('board');
  board.innerHTML='';
  tiles=deck.map((sym,slot)=>{
    const el=document.createElement('div');el.className='tile';
    el.innerHTML='<button class="card"><span class="face back"></span><span class="face front">'+sym+'</span></button>';
    const t={sym,slot,el,btn:el.firstChild,up:false,done:false};
    t.btn.onclick=()=>flip(t);board.appendChild(el);place(t);return t;
  });
  say(MODES[mode].blurb);hud();
}
function startTimer(){
  if(started)return;started=true;
  timer=setInterval(()=>{if(!over){secs++;$('ht').textContent=fmt(secs)}},1000);
}
function setUp(t,up){t.up=up;t.btn.classList.toggle('up',up);place(t)}
function flip(t){
  if(busy||over||t.up||t.done)return;
  startTimer();setUp(t,true);sfx('flip');sel.push(t);
  if(sel.length===2){moves++;hud();check()}
}
async function check(){
  busy=true;const [a,b]=sel;sel=[];
  if(a.sym===b.sym){
    await wait(380);
    a.done=b.done=true;a.el.classList.add('done');b.el.classList.add('done');place(a);place(b);
    matched++;sfx('match');say(['Nice find! ✨','A perfect pair! 🌟','You’re getting it! 🔮'][Math.random()*3|0]);hud();
    if(matched===8)return finish();
    busy=false;return;
  }
  sfx('miss');say('Not a match. Remember them!');
  await wait(850);
  setUp(a,false);setUp(b,false);
  const n=MODES[mode].swaps;
  if(n){
    await wait(300);say('The mirage shifts… 🌫️');
    drift(n);sfx('drift');await wait(reduced()?100:750);
  }
  busy=false;
}
function drift(n){
  for(let k=0;k<n;k++){
    const pool=shuffle(tiles.filter(t=>!t.done));
    if(pool.length<2)break;
    const [a,b]=pool;
    [a.slot,b.slot]=[b.slot,a.slot];place(a);place(b);
    a.el.classList.add('sw');b.el.classList.add('sw');
    setTimeout(()=>{a.el.classList.remove('sw');b.el.classList.remove('sw')},900);
  }
}
async function glimpse(){
  if(busy||over||sel.length||glimpsed)return;
  glimpsed=true;$('glimpse').disabled=true;moves+=3;hud();startTimer();busy=true;
  const open=tiles.filter(t=>!t.done);
  open.forEach(t=>setUp(t,true));say('Memorize quickly! 🔮');tone(740,.2);
  await wait(1500);
  open.forEach(t=>setUp(t,false));say('Now find the pairs.');busy=false;
}
function finish(){
  over=true;clearInterval(timer);
  const th=MODES[mode].th,stars=moves<=th[0]?3:moves<=th[1]?2:1;
  let extra='';
  if(!best[mode]||moves<best[mode]){extra=best[mode]?' New best! 🏅':'';best[mode]=moves;store.set('mir-best',JSON.stringify(best))}
  say('The mirage fades. You found every pair! 🎉');hud();
  $('stars').textContent='★'.repeat(stars)+'☆'.repeat(3-stars);
  $('rt').textContent=moves+' moves in '+fmt(secs);
  $('rp').textContent=(stars===3?'Flawless memory!':stars===2?'Sharp eyes!':'You made it through. Try again for more stars!')+extra;
  $('result').style.display='block';
  confetti();sfx('win');
  $('result').scrollIntoView({behavior:reduced()?'auto':'smooth',block:'nearest'});
}
$('glimpse').onclick=glimpse;$('newBtn').onclick=newGame;
document.querySelectorAll('.seg button').forEach(btn=>btn.onclick=()=>{
  mode=btn.dataset.m;
  document.querySelectorAll('.seg button').forEach(x=>x.setAttribute('aria-pressed',x===btn));
  newGame();
});
$('themeBtn').onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
$('soundBtn').onclick=()=>{setSound(!soundOn);tone(660,.1)};
setTheme(store.get('mir-theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'));
setSound(store.get('mir-sound')!=='0');
newGame();
