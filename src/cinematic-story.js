const chapters=[
 {id:'connect',label:'การเชื่อมต่อ',title:'ทุกอาคาร<br>มีเรื่องราว',body:'พลังงานที่ไหลเวียน อากาศที่เราหายใจ และผู้คนที่เคลื่อนไหว ทุกอย่างเชื่อมถึงกัน',note:'มองอาคารผ่านสิ่งที่เกิดขึ้นภายใน',action:'เริ่มชมเรื่องราว',kind:'play'},
 {id:'building',label:'ภาพรวม',title:'มองเห็น<br>ทั้งอาคาร',body:'เมื่อทุกระบบอยู่ในภาพเดียว ทีมอาคารจึงเข้าใจว่าอะไรเกิดขึ้น ที่ไหน และกระทบใคร',note:'จากข้อมูลที่แยกกัน สู่ Digital Twin เดียว',action:'สำรวจอาคาร',kind:'overview'},
 {id:'comfort',label:'ผู้คนและพื้นที่',title:'พื้นที่ที่เข้าใจ<br>ผู้ใช้งาน',body:'ห้องประชุมเริ่มมีคนมากขึ้น เซนเซอร์อ่านคุณภาพอากาศ ก่อนส่งต่อให้ระบบปรับอากาศตอบสนอง',note:'Occupancy → Air Quality → HVAC',action:'ดูระบบภายใน',kind:'comfort'},
 {id:'plant',label:'รู้เหตุและตอบสนอง',title:'เมื่อสิ่งเล็ก ๆ<br>เปลี่ยนไป',body:'ค่า Chiller เปลี่ยนจากภาวะปกติ ภาพของอุปกรณ์ พื้นที่ปลายทาง และทีมที่ต้องดูแลจึงเชื่อมเป็นเหตุการณ์เดียว',note:'สถานการณ์จำลอง · Chiller 03',action:'สำรวจห้องเครื่อง',kind:'plant'},
 {id:'command',label:'ศูนย์ควบคุม',title:'จากการมองเห็น<br>สู่การลงมือทำ',body:'เลือกเหตุ รับดำเนินการ และติดตามผลจนปิดงาน ทุกระบบสะท้อนสถานะเดียวกันที่ Command Center',note:'หนึ่งศูนย์กลาง สำหรับทุกระบบในอาคาร',action:'เปิด Command Center',kind:'command'}
];
export function mountCinematicStory({onProgress,onExit,onPlayState}){
 const root=document.createElement('main');root.id='cinematicStory';root.hidden=true;root.setAttribute('aria-label','เรื่องราว Mockup Building');
 root.innerHTML=chapters.map((c,i)=>`<section class="story-section" id="story-${c.id}" aria-labelledby="story-title-${i}"><div class="story-copy"><p class="story-kicker">${String(i+1).padStart(2,'0')} / ${String(chapters.length).padStart(2,'0')} <span>${c.label}</span></p><${i===0?'h1':'h2'} id="story-title-${i}">${c.title}</${i===0?'h1':'h2'}></div><div class="story-note"><span>${c.note}</span><p>${c.body}</p><button data-story-action="${c.kind}">${c.action}<span aria-hidden="true">↗</span></button></div></section>`).join('')+`<nav class="story-position" aria-label="บทของเรื่องราว">${chapters.map((c,i)=>`<button data-story-index="${i}" aria-label="ไปบท ${i+1}: ${c.label}"><span>${c.label}</span><i></i></button>`).join('')}</nav><div class="story-scroll-hint">เลื่อนเพื่อชมเรื่องราว <span>↓</span></div>`;
 document.body.append(root);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const sections=[...root.querySelectorAll('.story-section')];let active=false,playing=false,startTime=0,startScroll=0,frame=0,scrollQueued=false;
 function progress(){
  scrollQueued=false;if(!active)return;
  const y=scrollY,h=innerHeight;
  let index=0;for(let i=0;i<sections.length;i++){if(y+h*.45>=sections[i].offsetTop)index=i;}
  const section=sections[index],p=Math.max(0,Math.min(1,(y+h*.45-section.offsetTop)/section.offsetHeight));
  root.querySelectorAll('[data-story-index]').forEach((b,i)=>{b.classList.toggle('active',i===index);b.setAttribute('aria-current',i===index?'step':'false');});
  document.body.dataset.storyStep=String(index);onProgress(index,p);
 }
 function queueProgress(){if(!scrollQueued){scrollQueued=true;requestAnimationFrame(progress);}}
 function stop(){if(!playing)return;playing=false;cancelAnimationFrame(frame);onPlayState(false);}
 function tick(now){
  if(!playing||!active)return;
  if(!startTime)startTime=now;
  const t=Math.min(1,(now-startTime)/120000),end=root.scrollHeight-innerHeight;
  if(reduced){const step=Math.min(4,Math.floor(t*5));scrollTo({top:sections[step].offsetTop,behavior:'instant'});}else scrollTo({top:startScroll+(end-startScroll)*t,behavior:'instant'});
  if(t===1){stop();return;}frame=requestAnimationFrame(tick);
 }
 function play(){if(playing){stop();return;}playing=true;startTime=0;startScroll=scrollY;onPlayState(true);frame=requestAnimationFrame(tick);}
 root.addEventListener('click',e=>{
  const nav=e.target.closest('[data-story-index]');if(nav){stop();sections[Number(nav.dataset.storyIndex)].scrollIntoView({behavior:reduced?'instant':'smooth'});return;}
  const b=e.target.closest('[data-story-action]');if(!b)return;
  if(b.dataset.storyAction==='play')play();else{stop();onExit(b.dataset.storyAction);}
 });
 addEventListener('scroll',queueProgress,{passive:true});addEventListener('resize',queueProgress);
 addEventListener('wheel',stop,{passive:true});addEventListener('touchstart',stop,{passive:true});
 addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(e.key))stop();});
 return {play,stop,start(){active=true;root.hidden=false;scrollTo({top:0,behavior:'instant'});progress();},hide(){stop();active=false;root.hidden=true;},get playing(){return playing;}};
}
