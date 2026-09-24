import {sections,places,present} from './long-story.js';
// Presentation mode. On a desktop screen the story is a sequence of composed
// scenes rather than a long page: the opening, then one chapter per screen. A
// scrolling page never came to rest on a composition - stopped anywhere, it
// showed half a chapter with its heading cut by the header - and while the text
// scrolled, the city and its furniture stood still, so it read as a document
// with a picture beside it rather than as a story being told.
//
// One wheel gesture, one key, one swipe or one clicker press is one step.
// Presenter clickers send PageUp/PageDown, so they work with no setup. Arriving
// at a chapter, the camera flies to its frame and the chapter then plays itself:
// the routes connect, the water rises and the gates lift, the forecast grows.
// Stepping back shows the previous chapter already played. The chapter is in the
// URL, so a link opens on it and a reload keeps the place.
const STEPS=['opening',...sections.map(s=>s.id)];
// Seconds each chapter takes to play once the camera is there. The ones with
// nothing to play finish at once.
const PLAY={foundation:3.8,iot:2.2,flood:5.2,ai:4.4};
const CAMERA_LEAD=.55,NIGHT_FADE=.9,CARD_OUT=.22;

// A chapter is laid out like a film frame: the city fills the screen and the
// words sit in a band along the bottom - the title and a short lede on the
// left, the three points spread across the right. Each point has a numbered pin
// on the model, so the text says where on the city it is about instead of
// leaving the audience to connect a list on one side to a picture on the other.
function band(index){
 const s=sections[index],brief=present[s.id];
 const right=s.id==='priorities'
  ?`<div class="band-districts">${Object.entries(places).filter(([id])=>id!=='command').map(([id,p])=>`<button data-place="${id}">${p.name}<span>+</span></button>`).join('')}</div>`
  :`<ol class="band-points">${s.points.map(([head,body],j)=>`<li data-pin="${j}"><em>${j+1}</em><h2>${head.replace(/^\d+\.\s*/,'')}</h2><p>${body}</p></li>`).join('')}</ol>`;
 return `<div class="band-lead">
   <div class="section-phase"><span>${String(index+1).padStart(2,'0')} / 08</span>${s.phase}</div>
   <h1 id="present-title">${s.title.replaceAll('\n','<br>')}</h1>
   <p class="band-brief">${brief.brief}</p>
  </div>
  <div class="band-side">${right}<p class="band-takeaway">${s.takeaway}</p></div>`;
}

export function startPresentation({apply,blocked,reduced,announce,pins}){
 document.documentElement.classList.add('presenting');document.body.classList.add('presenting');
 const stage=document.createElement('div');stage.id='present';
 stage.innerHTML=`<article class="present-card" aria-labelledby="present-title" tabindex="-1"></article>`;
 // Back and Next sit top right, where the eye goes when a scene has been read.
 const nav=document.createElement('div');nav.className='present-nav';
 nav.innerHTML=`<span class="present-hint">Space or →</span><button class="card-back" aria-label="Previous chapter">←</button><button class="card-next"><b></b><span>→</span></button>`;
 const rail=document.createElement('nav');rail.className='present-rail';rail.setAttribute('aria-label','Chapters');
 rail.innerHTML=STEPS.map((id,i)=>`<button data-go="${i}" aria-label="${i?`${String(i).padStart(2,'0')} ${sections[i-1].phase}`:'Opening'}"><span>${i?`${String(i).padStart(2,'0')} · ${sections[i-1].phase}`:'Opening'}</span></button>`).join('');
 document.querySelector('.experience-grid').append(stage,nav,rail);
 // The controls and the fine print live in the canvas's layer, which the band
 // covers; they move into the band's so they stay on top and clickable.
 stage.append(document.querySelector('.view-controls'),document.querySelector('.view-note'));
 // Hovering a point lights its pin, and the other way round.
 stage.addEventListener('pointerover',e=>{const li=e.target.closest('[data-pin]');pins.highlight(li?+li.dataset.pin:-1);});
 stage.addEventListener('pointerleave',()=>pins.highlight(-1));
 const cardEl=stage.firstElementChild;
 let fadeTop=0;
 new ResizeObserver(()=>{fadeTop=stage.offsetTop+parseFloat(getComputedStyle(stage).paddingTop)*.45;}).observe(stage);

 let step=0,night=1,nightTarget=1,nightFrom=1,nightStart=0,chapter='overview',progress=0;
 let arrived=0,playFrom=0,playing=false,frame=0,swap=0;
 const motionless=()=>reduced.matches;

 function render(){apply(chapter,progress,night);}
 // Everything here runs off the clock, not the frame count, so a machine that
 // renders slowly still fades and plays in the same time.
 function loop(now){
  frame=0;
  let busy=false;
  if(night!==nightTarget){
   const u=motionless()?1:Math.min(1,(now-nightStart)/1000/NIGHT_FADE);
   night=nightFrom+(nightTarget-nightFrom)*(u*u*(3-2*u));
   if(u>=1)night=nightTarget;
   busy=night!==nightTarget;
  }
  if(playing){
   const seconds=PLAY[chapter]??0,t=(now-arrived)/1000-CAMERA_LEAD;
   if(motionless()||!seconds)progress=1;
   else{const u=Math.max(0,Math.min(1,t/seconds));progress=playFrom+(1-playFrom)*(u*u*(3-2*u));}
   playing=progress<1;busy||=playing;
  }
  render();
  if(busy)frame=requestAnimationFrame(loop);
 }
 function kick(){if(!frame)frame=requestAnimationFrame(loop);}

 function showCard(index,direction){
  clearTimeout(swap);
  cardEl.style.setProperty('--dir',direction);
  if(index<0){cardEl.classList.add('leaving');pins.set([]);return;}
  const next=sections[index+1];
  nav.querySelector('.card-back').dataset.go=index;
  const button=nav.querySelector('.card-next');button.dataset.go=index+2;
  button.querySelector('b').textContent=next?`Next · ${next.phase}`:'Back to the start';
  button.querySelector('span').textContent=next?'→':'↺';
  // Pins drop in once the camera has arrived, not while it is still flying.
  pins.set([]);
  const drop=()=>pins.set(present[sections[index].id].pins);
  clearTimeout(showCard.pin);showCard.pin=setTimeout(drop,motionless()?0:(CAMERA_LEAD+.35)*1000);
  const place=()=>{
   cardEl.innerHTML=band(index);cardEl.classList.remove('leaving','arrive');
   void cardEl.offsetWidth;cardEl.classList.add('arrive');
  };
  if(motionless()||!cardEl.innerHTML){place();return;}
  cardEl.classList.add('leaving');swap=setTimeout(place,CARD_OUT*1000);
 }

 function go(target,{instant=false}={}){
  target=Math.max(0,Math.min(STEPS.length-1,target));
  if(target===step&&!instant)return;
  const direction=target>=step?1:-1;step=target;
  nightFrom=night;nightStart=performance.now();
  // The opening shows the city as it is, before the story has touched it.
  if(step===0){nightTarget=1;chapter='overview';progress=0;playing=false;showCard(-1,direction);}
  else{
   nightTarget=0;chapter=STEPS[step];
   // Forward, a chapter plays from the start once the camera is there; back,
   // it is shown already played, the way it was left.
   progress=direction>0&&!instant?0:1;playFrom=progress;playing=progress<1;arrived=performance.now();
   showCard(step-1,direction);
  }
  if(instant)night=nightTarget;
  rail.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-current',i===step?'step':'false'));
  history.replaceState(null,'',step?`#${STEPS[step]}`:location.pathname+location.search);
  announce(step?`${sections[step-1].phase}. ${sections[step-1].title.replace('\n',' ')}`:'Opening');
  render();kick();
 }

 // Wheel: one gesture is one step. A trackpad keeps sending momentum for a
 // second or more after the fingers lift, and one flick first ran five
 // chapters. After a step the wheel is treated as coasting until either it goes
 // quiet or a delta comes in larger than the ones before it: momentum only ever
 // decays, so a push that grows is a new gesture. Timing uses each event's own
 // timestamp, which a busy main thread does not stretch.
 let wheelSum=0,lastWheel=-1e9,lockedUntil=0,coasting=false;
 const recent=[];
 addEventListener('wheel',e=>{
  if(blocked())return;
  e.preventDefault();
  const now=e.timeStamp,gap=now-lastWheel;lastWheel=now;
  const delta=e.deltaMode===1?e.deltaY*32:e.deltaY,size=Math.abs(delta);
  const before=recent.length?Math.max(...recent):0;
  recent.push(size);if(recent.length>4)recent.shift();
  if(coasting){if(gap>300||size>before*1.25+2)coasting=false;else return;}
  if(now<lockedUntil)return;
  if(gap>300)wheelSum=0;
  wheelSum+=delta;
  if(Math.abs(wheelSum)<40)return;
  go(step+Math.sign(wheelSum));wheelSum=0;lockedUntil=now+650;coasting=true;
 },{passive:false});

 addEventListener('keydown',e=>{
  if(blocked()||e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey)return;
  const on=e.target.closest?.('button,a,input,textarea,select');
  const k=e.key;
  const next=['ArrowDown','ArrowRight','PageDown'].includes(k)||(k===' '&&!e.shiftKey&&!on);
  const back=['ArrowUp','ArrowLeft','PageUp'].includes(k)||(k===' '&&e.shiftKey&&!on);
  if(next){e.preventDefault();go(step+1);}
  else if(back){e.preventDefault();go(step-1);}
  else if(k==='Home'){e.preventDefault();go(0);}
  else if(k==='End'){e.preventDefault();go(STEPS.length-1);}
  else if(/^[0-8]$/.test(k)&&!on){go(+k);}
 });

 let touchY=null;
 addEventListener('touchstart',e=>{touchY=e.touches[0].clientY;},{passive:true});
 addEventListener('touchend',e=>{
  if(touchY===null||blocked())return;
  const dy=touchY-e.changedTouches[0].clientY;touchY=null;
  if(Math.abs(dy)>50)go(step+Math.sign(dy));
 },{passive:true});

 // Buttons that name a step, and every in-page link, move the presentation
 // instead of scrolling a page that no longer scrolls.
 document.addEventListener('click',e=>{
  const button=e.target.closest('[data-go]');
  if(button){e.preventDefault();go(+button.dataset.go%STEPS.length);return;}
  const link=e.target.closest('a[href^="#"]');
  if(!link)return;
  const index=STEPS.indexOf(link.hash.slice(1));
  if(index>=0){
   e.preventDefault();go(index);
   if(link.classList.contains('skip'))cardEl.focus({preventScroll:true});
  }
 });
 addEventListener('hashchange',()=>{const i=STEPS.indexOf(location.hash.slice(1));if(i>=0)go(i);});

 const start=STEPS.indexOf(location.hash.slice(1));
 if(start>0)go(start,{instant:true});
 else{rail.firstElementChild.setAttribute('aria-current','step');render();}
 return {
  /** Re-applies the state, after Explore has had the camera. */
  refresh(){render();},
  get step(){return step;},
  /** The top of the text band, which labels on the model keep clear of. */
  // Measured from where the fade above the band is still light enough to read
  // a pin through, not from the text itself.
  get bandTop(){return fadeTop;},
  /** The top of the band's text, which pins keep clear of. */
  get textTop(){return stage.offsetTop+cardEl.offsetTop-18;},
 };
}
