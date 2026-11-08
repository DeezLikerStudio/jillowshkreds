(() => {
'use strict';
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
const W=360,H=640,S=48,GRAVITY=.55,JUMP=-13;
const skins=[{name:'Краджил',src:'red.png'},{name:'Сиджил',src:'blue.png'},{name:'Желджил',src:'yellow.png'}];
let skin=0,player,platforms=[],bonuses=[],enemies=[],shots=[],score=0,best=Number(localStorage.getItem('jellyBest')||0),camera=0,playing=false,last=0,keys={left:false,right:false},nextId=0,fireCooldown=0;
const images=skins.map(s=>{const image=new Image();image.onload=()=>{if(player&&!playing)draw()};image.src=s.src;return image});
$('best').textContent=best;
const rand=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function updateHUD(){$('score').textContent=Math.floor(score);$('best').textContent=best}
function platformX(p){return p.type==='moving'?clamp(p.baseX+Math.sin(p.phase)*45,4,W-p.w-4):p.baseX}
function addPlatform(y,previousX){
 const n=++nextId,w=rand(66,106),x=clamp(previousX+rand(-100,100),6,W-w-6),difficulty=Math.min(1,score/1800),r=Math.random();
 // The main route is made exclusively of permanent platforms. Temporary,
 // moving and breakable platforms are optional alternatives on the same floor.
 const p={id:n,x,baseX:x,y,w,type:'normal',phase:0,active:true,timer:0,color:['#87c9a8','#f2b178','#df9ab3','#8fbddd'][n%4]};platforms.push(p);
 if(n>6&&n%3===0){
  const type=r<.35?'moving':r<.60?'break':r<.82?'vanish':difficulty>.3?'explode':'vanish';
  const extraW=rand(62,88),extraX=x<W/2?W-extraW-8:8;
  platforms.push({id:'extra-'+n,x:extraX,baseX:extraX,y:y+8,w:extraW,type,phase:rand(0,6),active:true,timer:0,color:'#b19ac9'});
 }
 if(n>4&&n%7===0){const kind=['spring','trampoline','propeller','jet','rocket'][Math.floor((n/7-1)%5)];bonuses.push({platform:p,kind,taken:false})}
 if(n>8&&n%10===0){const kind=['monster','ufo','hole','trap'][Math.floor((n/10-1)%4)];enemies.push({kind,x:clamp(x+rand(-30,65),12,W-50),y:y-rand(75,110),vx:kind==='ufo'?.9:kind==='monster'?.55:0,alive:true,phase:rand(0,6)})}
 return p;
}
function reset(){score=0;camera=0;nextId=0;fireCooldown=0;keys.left=keys.right=false;player={x:156,y:550,vx:0,vy:0,face:1,power:null,powerTime:0};platforms=[{id:0,x:125,baseX:125,y:610,w:110,type:'normal',phase:0,active:true,timer:0,color:'#87c9a8'}];bonuses=[];enemies=[];shots=[];let y=610,x=125;for(let i=0;i<18;i++){y-=rand(64,93);x=addPlatform(y,x).baseX}updateHUD()}
function start(){reset();$('overlay').classList.add('hidden');playing=true;last=0;requestAnimationFrame(frame)}
function gameOver(){if(!playing)return;playing=false;best=Math.max(best,Math.floor(score));localStorage.setItem('jellyBest',best);$('title').textContent='Попробуем ещё?';$('message').textContent=`Счёт: ${Math.floor(score)}. Рекорд: ${best}.`;$('start').textContent='Заново';$('overlay').classList.remove('hidden');updateHUD()}
function jump(v=JUMP){player.vy=v}
function bonusRect(b){return{x:platformX(b.platform)+b.platform.w/2-14,y:b.platform.y-25,w:28,h:25}}
function overlap(a,b){return a.x+a.w>b.x&&a.x<b.x+b.w&&a.y+a.h>b.y&&a.y<b.y+b.h}
function shoot(targetX,targetY){if(!playing||fireCooldown>0)return;const x=player.x+S/2,y=player.y+8,dx=targetX==null?0:targetX-x,dy=targetY==null?-1:targetY+camera-y,length=Math.hypot(dx,dy)||1;shots.push({x,y,vx:dx/length*10,vy:dy/length*10,life:100});fireCooldown=12}
function step(dt){
 fireCooldown=Math.max(0,fireCooldown-dt);let speed=4.5;player.vx=((keys.right?1:0)-(keys.left?1:0))*speed;if(player.vx)player.face=Math.sign(player.vx);player.x+=player.vx*dt;if(player.x<-S)player.x=W;if(player.x>W)player.x=-S;
 platforms.forEach(p=>{p.phase+=dt*.025;p.x=platformX(p);if(p.timer>0){p.timer-=dt;if(p.timer<=0)p.active=false}});
 const oldBottom=player.y+S;if(player.powerTime>0){player.powerTime-=dt;player.vy=player.power==='propeller'?-10:player.power==='rocket'?-19:-15;if(player.powerTime<=0){player.powerTime=0;player.power=null;player.vy=-5}}else player.vy=Math.min(player.vy+GRAVITY*dt,18);player.y+=player.vy*dt;
 // A platform below the visible screen must never rescue an off-screen player.
 if(player.y>=camera+H){gameOver();return}
 if(player.vy>=0){for(const p of platforms){if(!p.active||p.y>=camera+H)continue;if(oldBottom<=p.y&&player.y+S>=p.y&&player.x+S-7>p.x&&player.x+7<p.x+p.w){player.y=p.y-S;if(p.type==='break'){p.active=false;break}jump();if(p.type==='vanish')p.timer=22;if(p.type==='explode')p.timer=12;break}}}
 const box={x:player.x+6,y:player.y+6,w:S-12,h:S-8};
 for(const b of bonuses){if(b.taken||!b.platform.active)continue;const r=bonusRect(b);if(overlap(box,r)){b.taken=true;if(b.kind==='spring')jump(-19);else if(b.kind==='trampoline')jump(-22);else{player.power=b.kind;player.powerTime=b.kind==='jet'?105:b.kind==='rocket'?85:80;player.vy=-10}}}
 for(const shot of shots){shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;shot.life-=dt}shots=shots.filter(s=>s.life>0&&s.y>camera-60&&s.y<camera+H+60&&s.x>-20&&s.x<W+20);
 for(const e of enemies){if(!e.alive)continue;e.phase+=dt*.035;e.x+=e.vx*dt;if(e.x<5||e.x>W-50)e.vx*=-1;const hit={x:e.x+3,y:e.y+3,w:38,h:32};if(e.kind!=='hole'){for(const shot of shots){if(shot.life>0&&overlap({x:shot.x-4,y:shot.y-4,w:8,h:8},hit)){shot.life=0;e.alive=false;break}}}if(!e.alive)continue;if(overlap(box,hit)){if(e.kind==='monster'&&player.vy>0&&oldBottom<=e.y+14){e.alive=false;jump(-14)}else if(player.powerTime>0&&e.kind!=='hole'&&e.kind!=='trap'){e.alive=false}else gameOver()}}
 if(player.y<camera+220){const d=camera+220-player.y;camera-=d;score+=d*.12;addPlatforms()}updateHUD();
}
function addPlatforms(){let top=platforms.reduce((a,b)=>a.y<b.y?a:b);while(top.y>camera-280)top=addPlatform(top.y-rand(64,93),top.baseX);platforms=platforms.filter(p=>p.y<camera+H+180);bonuses=bonuses.filter(b=>b.platform.y<camera+H+180);enemies=enemies.filter(e=>e.y<camera+H+180);}
function rounded(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill()}
function line(points,color,width=2){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke()}
function drawPlatform(p){if(!p.active)return;const x=p.x,y=p.y,c=p.type==='moving'?'#70b8cb':p.type==='break'?'#ca9684':p.type==='vanish'?'#b19ac9':p.type==='explode'?'#e68170':p.color;rounded(x,y,p.w,14,7,'#886d6b');rounded(x,y,p.w,11,6,c);rounded(x+6,y+2,Math.max(1,p.w-12),3,2,'#ffffff88');if(p.type==='break')line([[x+p.w*.45,y+2],[x+p.w*.52,y+6],[x+p.w*.46,y+10]],'#845e55',1.5);if(p.type==='moving'){ctx.fillStyle='#fff';ctx.font='10px sans-serif';ctx.fillText('↔',x+p.w/2-5,y+9)}if(p.type==='vanish'){ctx.fillStyle='#fff8';for(let k=14;k<p.w-5;k+=15)ellipse(x+k,y+6,2,2,'#fff9')}if(p.type==='explode'){ctx.fillStyle='#fff';ctx.font='bold 10px sans-serif';ctx.fillText('!',x+p.w/2-2,y+9)}}
function drawBonus(b){if(b.taken||!b.platform.active)return;const {x,y}=bonusRect(b);ctx.save();ctx.translate(x,y);
 if(b.kind==='spring'){rounded(3,21,22,4,2,'#9c5961');line([[7,20],[20,17],[7,14],[20,11],[7,8],[20,5]],'#e47577',2.5);rounded(4,2,20,5,2,'#f5c177')}
 if(b.kind==='trampoline'){rounded(1,8,26,7,4,'#ec8d8d');line([[6,16],[9,23],[13,17],[18,23],[22,16]],'#79616a',2);rounded(2,22,24,3,2,'#79616a')}
 if(b.kind==='propeller'){rounded(6,10,16,13,6,'#e8a86a');line([[14,10],[14,5]],'#775b62',2);ellipse(9,4,8,2,'#df7a83');ellipse(20,4,8,2,'#80bec8')}
 if(b.kind==='jet'){rounded(5,5,18,19,5,'#88b5c0');rounded(8,8,12,9,3,'#d5eef0');rounded(3,11,4,12,2,'#687b8d');rounded(21,11,4,12,2,'#687b8d');ellipse(9,24,3,4,'#f2a660');ellipse(19,24,3,4,'#f2a660')}
 if(b.kind==='rocket'){ellipse(14,12,8,12,'#df8587');ellipse(14,10,3,3,'#d6f2ee');line([[8,17],[3,23],[9,22]],'#9c6876',3);line([[20,17],[25,23],[19,22]],'#9c6876',3);ellipse(14,24,3,4,'#f4c36c')}ctx.restore()}
function drawEnemy(e){if(!e.alive)return;const x=e.x,y=e.y;if(e.kind==='hole'){ellipse(x+22,y+18,21,15,'#726486');ellipse(x+22,y+18,15,10,'#342e46');ellipse(x+17,y+12,4,2,'#ad99bd');return}if(e.kind==='ufo'){ellipse(x+22,y+21,22,9,'#a68aba');ellipse(x+22,y+15,12,9,'#9ed3d0');ellipse(x+18,y+12,4,2,'#fff9');ellipse(x+11,y+22,2,2,'#f9d27a');ellipse(x+33,y+22,2,2,'#f9d27a');return}if(e.kind==='trap'){rounded(x+2,y+22,40,10,4,'#9b7680');for(let i=0;i<4;i++){ctx.fillStyle='#e9d3c1';ctx.beginPath();ctx.moveTo(x+4+i*10,y+24);ctx.lineTo(x+9+i*10,y+10);ctx.lineTo(x+14+i*10,y+24);ctx.fill()}return}ellipse(x+22,y+20,21,17,'#c77991');ellipse(x+15,y+17,5,6,'#fff9');ellipse(x+29,y+17,5,6,'#fff9');ellipse(x+16,y+18,2,3,'#544352');ellipse(x+30,y+18,2,3,'#544352');line([[x+16,y+27],[x+22,y+30],[x+28,y+27]],'#774657',2);line([[x+7,y+8],[x+3,y+2]],'#c77991',4);line([[x+37,y+8],[x+41,y+2]],'#c77991',4)}
function drawPlayer(){const image=images[skin];ctx.save();ctx.translate(player.x+S/2,player.y+S/2);ctx.scale(player.face,1);if(player.powerTime>0){ellipse(0,26,7,10,'#ffc47a');ellipse(0,25,3,6,'#fff2b7')}if(image.complete&&image.naturalWidth){const crop=skin===0?{x:121,y:162,w:1038,h:947}:{x:0,y:0,w:image.naturalWidth,h:image.naturalHeight};const scale=Math.min(S/crop.w,S/crop.h),w=crop.w*scale,h=crop.h*scale;ctx.drawImage(image,crop.x,crop.y,crop.w,crop.h,-w/2,S/2-h,w,h)}ctx.restore()}
function draw(){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#f9d8d0');g.addColorStop(1,'#d4e6db');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.save();ctx.translate(0,-camera);const top=Math.floor(camera/90)*90;for(let y=top;y<camera+H;y+=90){ellipse(35+((Math.abs(y/90)*47)%280),y+30,3,3,'#ffffff80')}platforms.forEach(drawPlatform);bonuses.forEach(drawBonus);enemies.forEach(drawEnemy);shots.forEach(s=>ellipse(s.x,s.y,4,4,'#fff4d6'));drawPlayer();ctx.restore()}
function frame(t){if(!playing){draw();return}const dt=last?Math.min((t-last)/16.667,2):1;last=t;step(dt);draw();if(playing)requestAnimationFrame(frame)}
$('start').addEventListener('click',start);$('skin').addEventListener('click',()=>{skin=(skin+1)%skins.length;$('skinName').textContent=skins[skin].name;$('skin').setAttribute('aria-label','Сменить скин. Сейчас: '+skins[skin].name);if(!playing)draw()});
document.querySelectorAll('[data-key]').forEach(b=>{const k=b.dataset.key;b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);b.classList.add('pressed');if(k==='shoot')shoot();else keys[k]=true});const up=()=>{b.classList.remove('pressed');if(k!=='shoot')keys[k]=false};b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',up)});
canvas.addEventListener('pointerdown',e=>{if(!playing)return;const r=canvas.getBoundingClientRect();shoot((e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height)});
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowleft','arrowright',' ','a','d'].includes(k))e.preventDefault();if(k==='arrowleft'||k==='a')keys.left=true;if(k==='arrowright'||k==='d')keys.right=true;if(k===' '&&!e.repeat)shoot()});window.addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(k==='arrowleft'||k==='a')keys.left=false;if(k==='arrowright'||k==='d')keys.right=false});window.addEventListener('blur',()=>{keys.left=keys.right=false});if(window.Telegram?.WebApp){window.Telegram.WebApp.ready();window.Telegram.WebApp.expand()}reset();draw();
})();
