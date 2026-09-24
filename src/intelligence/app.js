import './style.css';
import {sections,places} from './long-story.js';
import {storyTelemetry} from './story-state.js';
import {startPresentation} from './present.js';
import {createSidePanels} from './side-panels.js';
const $=s=>document.querySelector(s);
const mark='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="m16 3 12 7v13l-12 6L4 23V10Z" fill="#C7FF3D" stroke="currentColor" stroke-width="1.4"/><path d="m4 10 12 7 12-7M16 17v12" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
const phase=i=>i<2?'The city today':i===2?'Phase 1':i<6?'Phase 2':'Phase 3';
$('#app').innerHTML=`<a class="skip" href="#overview">Skip to story</a><header class="site-header"><a class="brand" href="#overview">${mark}<span>City Intelligence</span></a><nav aria-label="Presentation phases"><a href="#foundation">01 Data</a><a href="#iot">02 IoT</a><a href="#ai">03 AI</a></nav><button id="fullscreen" aria-label="Enter fullscreen">⛶</button></header>
<section class="hero" id="hero"><div class="hero-copy"><span class="hero-eyebrow">City Intelligence</span><h2 class="hero-title">From data to<br>a city in sync.</h2><p class="hero-line">One picture of the city, built from the systems that already run it.</p><div class="hero-actions"><a class="hero-start" href="#overview">Start the story <span>&darr;</span></a><button class="hero-explore" id="hero-explore">Explore the 3D city</button></div></div></section><main class="experience-grid"><aside class="visual-column" aria-label="City visualization"><div class="visual-stage"><div class="view-heading"><span class="live-dot"></span><b id="view-title">The city today</b><span id="mode-label">Illustrative 3D city</span></div><div class="city-view" id="city-view"><div id="nightfall"></div><img id="city-poster" src="/city-intelligence-civic.jpg" width="1600" height="1200" alt="A civic district with a command center, municipal hall, hospital, school, industry, energy, park and flood gate"><div id="city-canvas"></div><div class="map-names" aria-hidden="true">${Object.entries(places).map(([id,p])=>`<span class="name-${id}">${p.name}</span>`).join('')}</div><div id="loading" role="status">Preparing the 3D city…</div></div><div class="scene-readout" aria-label="Illustrative city activity"><div><span id="activity-label">City in motion</span><strong id="activity-value">A living district</strong><p id="activity-copy">Traffic moves. Wind turbines turn. Scroll to connect the city.</p></div><div class="activity-symbol" aria-hidden="true"><i></i><i></i><i></i></div><div class="scene-progress"><span id="chapter-fill"></span></div></div><div class="view-controls"><button id="explore">Explore 3D city</button><button id="motion-toggle" aria-pressed="false">Pause animation</button><button id="home" hidden>Reset view</button></div><p class="view-note"><span id="view-instruction">Scroll the page to follow the story.</span><span class="view-sep">·</span>Illustrative experience using mock data. Not connected to live systems.</p></div></aside>
<div class="narrative-column">${sections.map((s,i)=>`<section class="story-section" id="${s.id}" aria-labelledby="title-${s.id}"><div class="section-phase"><span>${String(i+1).padStart(2,'0')} / 08</span>${s.phase}</div><h1 id="title-${s.id}">${s.title.replaceAll('\n','<br>')}</h1><p class="section-intro">${s.intro}</p>${['foundation','iot','ai'].includes(s.id)?`<div class="phase-band"><span>${phase(i)}</span><b>${s.id==='foundation'?'Connect existing data':s.id==='iot'?'See field conditions':'Anticipate and recommend'}</b></div>`:''}<ol class="story-points">${s.points.map(([head,body],j)=>`<li><span>${String(j+1).padStart(2,'0')}</span><div><h2>${head}</h2><p>${body}</p></div></li>`).join('')}</ol>${s.id==='priorities'?`<div class="district-list">${Object.entries(places).map(([id,p])=>`<button data-place="${id}">${p.name}<span>+</span></button>`).join('')}</div>`:''}<div class="takeaway">${s.takeaway}</div>${i<7?`<a class="next-section" href="#${sections[i+1].id}">Continue to ${sections[i+1].phase}<span>↓</span></a>`:'<a class="next-section" href="#overview">Restart the story<span>↑</span></a>'}</section>`).join('')}</div></main>
<footer class="page-footer"><span>City Intelligence Platform</span><span>Data Consolidation → IoT Data Integration → AI-Powered Intelligence</span><a href="#overview">Back to top ↑</a></footer>
<dialog id="place-detail" aria-labelledby="place-title"><button id="close-detail" aria-label="Close details">×</button><span class="detail-eyebrow">How this solution works</span><h2 id="place-title"></h2><div id="detail-copy"></div><button id="focus-place">View this district in 3D</button><small>Illustrative workflow. No live device control.</small></dialog><div id="announcement" role="status" class="sr"></div>`;
let side=null,scene=null,current='overview',activePlace='civic',explore=false,lastOpener=null,chapterProgress=0,paused=false,presentation=null;
const compact=matchMedia('(max-width: 800px)');
// A desktop screen presents the story a chapter at a time (present.js); a phone
// keeps the scrolling page, which is what a phone is good at, and ?scroll keeps
// it anywhere - for reading at a desk rather than presenting.
const presenting=!compact.matches&&!new URLSearchParams(location.search).has('scroll');
const HINT=presenting?'Scroll, use the arrow keys or a clicker to move through the story.':'Scroll the page to follow the story.';
compact.addEventListener('change',()=>{if(presenting===compact.matches)location.reload();});
const elements=[...document.querySelectorAll('.story-section')];
// Scroll drives solution state, not camera position or canvas size.
const activity={
 overview:['City in motion','A living district','Traffic moves. Wind turbines turn. Next, the city connects.'],
 fragmented:['Disconnected systems','Separate signals','Water, transport and facilities each hold part of the picture.'],
 foundation:['Phase 1 · Data','Connecting the city','Lime data streams join existing systems to the command center.'],
 iot:['Phase 2 · IoT','1.20 m','Sensor markers appear above the places being monitored.'],
 flood:['Flood response','1.20 m','The simulated water level rises and the flood gates respond.'],
 priorities:['Connected services','10 city districts','Select a district to see its data, workflow and responsible team.'],
 ai:['Phase 3 · AI','1.60 m → 1.90 m','Pink marks the forecast area. The team reviews the next action.'],
 roadmap:['From data to decisions','Data → IoT → AI','A shared foundation, expanded one useful capability at a time.']
};
// The story's state is the chapter, how far into it the scene has played, and
// how much of the dark opening is still on screen. The scrolling page works it
// out from the scroll position; the presentation derives it from the step it is
// on and plays the chapter itself. Both hand it to applyState.
function syncSection(){
 if(presentation)return;
 let chosen=elements[0];const line=innerHeight*.40;
 for(const el of elements){if(el.getBoundingClientRect().top<=line)chosen=el;else break;}
 const rect=chosen.getBoundingClientRect();
 const progress=Math.max(0,Math.min(1,(line-rect.top)/rect.height));
 // How far the opening has scrolled away: 1 while the hero holds the frame, 0
 // once the story owns it.
 const hero=$('#hero'),over=hero?Math.max(0,Math.min(1,-hero.getBoundingClientRect().top/Math.max(1,hero.offsetHeight))):1;
 applyState(chosen.id,progress,1-over);
}
function applyState(id,progress,night){
 chapterProgress=progress;
 const over=1-night;
 document.documentElement.style.setProperty('--night',night.toFixed(3));
 document.documentElement.style.setProperty('--hero',(1-Math.min(1,over*1.6)).toFixed(3));
 // The night layer lives inside the city view, which is fixed behind the whole
 // page on desktop but sits below the hero in the compact layout - so there the
 // dark treatment put white type on the pale page. The opening stays light at
 // that width and the stage never enters its hero state.
 const opening=night>.5&&!compact.matches;
 document.body.dataset.stage=opening?'hero':'story';
 scene?.setCentred(opening);scene?.setNight(night);
 const turned=id!==current;
 current=id;document.body.dataset.chapter=current;
 // The readout rewrites itself every frame during flood and AI, so it is the
 // change of chapter that animates, not the change of text.
 if(turned){const box=$('.scene-readout');box.classList.remove('turned');void box.offsetWidth;box.classList.add('turned');}
 const s=sections.find(x=>x.id===current),a=activity[current],data=storyTelemetry(current,chapterProgress);
 $('#view-title').textContent=s.phase;$('#activity-label').textContent=a[0];
 $('#activity-value').textContent=current==='flood'?`${data.level.toFixed(2)} m`:current==='ai'?`1.60 m → ${data.forecast.toFixed(2)} m`:a[1];
 $('#activity-copy').textContent=a[2];$('#chapter-fill').style.width=`${chapterProgress*100}%`;
 scene?.setStage(current,chapterProgress);
 side?.update(current,chapterProgress);
 document.querySelectorAll('.site-header nav a').forEach(a=>a.setAttribute('aria-current',a.hash===`#${current}`?'step':'false'));
}

// Sections arrive rather than appear. Once revealed they stay revealed: a
// section that faded out again on the way back up would fight the reader.
if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
 const revealer=new IntersectionObserver(entries=>{
  for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('revealed');revealer.unobserve(entry.target);}
 },{rootMargin:'-10% 0px -18% 0px'});
 for(const el of elements)revealer.observe(el);
}else for(const el of elements)el.classList.add('revealed');
let pending=false;addEventListener('scroll',()=>{if(!pending){pending=true;requestAnimationFrame(()=>{pending=false;syncSection();});}},{passive:true});addEventListener('resize',syncSection);
// The model carries a label per district. Ten of them will not all fit at every
// camera angle, so they are placed in order of importance and any that would
// land on one already down is dropped for this frame. Sizes are estimated from
// the text rather than measured: reading layout back per frame would stall the
// render loop, and a few pixels of slack is enough for a keep-out test.
const LABEL_ORDER=['command','water','civic','hospital','energy','industry','transit','school','housing','tourism'];
// The collision test below answers "do these overlap", which is not the same
// question as "are ten of these at once louder than the chapter being read".
// Solid plum chips are heavy, and ten of them competed with the narrative in
// every chapter that was not about all ten districts. Each chapter now names the
// places its text actually mentions; Explore still shows the full set.
const CHAPTER_LABELS={
 overview:  ['command','civic','water','transit'],
 fragmented:['water','transit','command'],
 foundation:['command','civic','hospital','water','energy'],
 iot:       ['water','energy','industry','command'],
 flood:     ['water','command'],
 priorities:LABEL_ORDER,          // this chapter is about every district
 ai:        ['command','water','transit'],
 roadmap:   ['command'],
};
// Chapter framings for the presentation: the city centred above the band, each
// holding the places its pins point at. [look x, y, z, span]
const PRESENT_FRAMES={
 overview:  [-14,3,2,126],
 fragmented:[-18,4,8,120],
 foundation:[-26,6,2,126],
 iot:       [-8,4,0,118],
 flood:     [-24,6,10,122],
 priorities:[-14,3,2,126],
 ai:        [-24,6,8,126],
 roadmap:   [-16,4,2,128],
};
// The presentation's numbered pins, one per point of the chapter on screen.
const pinEls=[0,1,2].map(i=>{const el=document.createElement('span');el.className='present-pin';el.textContent=i+1;el.hidden=true;el.setAttribute('aria-hidden','true');return el;});
let pinOn=[false,false,false];
const pins={
 points:[],
 set(points){pins.points=points??[];pinOn=[0,1,2].map(i=>!!points?.[i]);scene?.setPins(points);pinEls.forEach((el,i)=>{el.classList.remove('drop');if(pinOn[i]){void el.offsetWidth;el.style.animationDelay=`${i*.12}s`;el.classList.add('drop');}});},
 highlight(i){pinEls.forEach((el,j)=>el.classList.toggle('hot',j===i));document.querySelectorAll('.band-points [data-pin]').forEach((li,j)=>li.classList.toggle('hot',j===i));},
};
function placeLabels(labels){
 const view=$('#city-view'),vw=view.clientWidth||1,vh=view.clientHeight||1;
 // The narrative scrolls over the right of the same canvas and sits above the
 // labels, so a label left under it is unreadable. Districts on that side hang
 // their label to the left of the marker instead, and only one that still will
 // not clear the text is dropped. The limit is the narrative's own left edge
 // less part of the scrim's 260px ramp, not the column edge: a chip that lands
 // inside the ramp is washed pale long before the text begins.
 // In the presentation the text is a band along the bottom instead: nothing
 // stands to the right, and labels must stay above the band.
 const column=presentation?101:innerWidth>800?($('.narrative-column').offsetLeft-165)/vw*100:101;
 // bandTop is in page pixels; the view starts below the header.
 const pinFloor=presentation?(presentation.textTop-$('.visual-column').offsetTop)/vh*100:104;
 const floor=presentation?(presentation.bandTop-$('.visual-column').offsetTop)/vh*100-1:104;
 // The chapter heading floats over the top-left of the same stage. A label
 // landing on it made both unreadable, so it is seeded as already taken. Its
 // width is the heading's own - a constant generous enough for the longest
 // chapter name swallowed the command center's label at narrower viewports -
 // and offsetLeft/offsetWidth are already relative to the same box the labels
 // are placed in, so this costs no more layout than the two reads above.
 const head=presentation?$('.scene-readout'):$('.view-heading');
 const taken=[[0,0,(head.offsetLeft+head.offsetWidth+10)/vw*100,(head.offsetTop+head.offsetHeight+8)/vh*100]];
 // The side panels, when the screen is wide enough to show them.
 if(side)for(const panel of document.querySelectorAll('.side-panel')){
  if(!panel.offsetWidth)continue;
  const r=panel.getBoundingClientRect(),v=view.getBoundingClientRect();
  taken.push([(r.left-v.left-8)/vw*100,(r.top-v.top-8)/vh*100,(r.right-v.left+8)/vw*100,(r.bottom-v.top+8)/vh*100]);
 }
 // Pins go down first: a pin is what a point on screen is about, a district
 // name only context, so a name that would cover a pin gives way.
 for(const [i,pin] of pinEls.entries()){
  const spot=labels[`pin${i}`];
  pin.hidden=!spot||!pinOn[i]||spot[1]>pinFloor||spot[1]<2;
  if(pin.hidden)continue;
  pin.style.left=`${spot[0]}%`;pin.style.top=`${spot[1]}%`;
  const rx=20/vw*100,ry=20/vh*100;
  taken.push([spot[0]-rx,spot[1]-ry,spot[0]+rx,spot[1]+ry]);
 }
 const allowed=explore?null:CHAPTER_LABELS[current]??LABEL_ORDER;
 for(const id of LABEL_ORDER){
  const label=$(`.name-${id}`),spot=labels[id];
  if(!label)continue;
  if(allowed&&!allowed.includes(id)){label.hidden=true;continue;}
  if(!spot){label.hidden=true;continue;}
  const [x,y]=spot;
  const w=(label.textContent.length*6.4+22)/vw*100,h=27/vh*100;
  const left=x+w/2>column-1;
  // A chip normally sits over its marker. The command center is above the city
  // rather than in it, so its marker lands at the very top of the frame and the
  // chip was drawn off the canvas into the header - present in the DOM, never
  // readable. Those hang under the marker instead of being lost.
  const top=y-h<0?y+1:y-h;
  const box=left?[x-w-1,top,x-1,top+h]:[x-w/2,top,x+w/2,top+h];
  const clash=taken.some(o=>box[0]<o[2]&&box[2]>o[0]&&box[1]<o[3]&&box[3]>o[1]);
  label.hidden=clash||box[0]<-4||box[2]>column-1||box[1]<0||box[3]>floor;
  if(label.hidden)continue;
  taken.push(box);
  label.style.left=`${left?x-1:x}%`;label.style.top=`${top}%`;label.style.bottom='auto';
  label.style.transform=left?'translate(-100%,0)':'translate(-50%,0)';
 }
}
function showPlace(id,opener){const p=places[id];if(!p)return;activePlace=id;lastOpener=opener||document.activeElement;$('#place-title').textContent=p.name;$('#detail-copy').innerHTML=`<h3>Data source</h3><p>${p.source}</p><h3>What the platform does</h3><p>${p.work}</p><h3>How the team uses it</h3><p>${p.outcome}</p>`;$('#place-detail').showModal();}
$('#close-detail').onclick=()=>{$('#place-detail').close();lastOpener?.focus();};
$('#place-detail').addEventListener('cancel',()=>lastOpener?.focus());
document.addEventListener('click',e=>{const b=e.target.closest('[data-place]');if(b)showPlace(b.dataset.place,b);});
function setExplore(value){explore=value;scene?.setExplore(value);document.body.classList.toggle('exploring',value);$('#explore').textContent=value?'Return to the story':'Explore 3D city';$('#home').hidden=!value;$('#view-instruction').textContent=value?'Drag to rotate. Click a building to inspect it.':HINT;if(!value){scene?.home();presentation?.refresh();}}
$('#motion-toggle').onclick=()=>{paused=!paused;scene?.setPaused(paused);document.body.classList.toggle('motion-paused',paused);$('#motion-toggle').textContent=paused?'Resume animation':'Pause animation';$('#motion-toggle').setAttribute('aria-pressed',String(paused));};
$('#explore').onclick=()=>setExplore(!explore);$('#hero-explore').onclick=()=>{setExplore(true);};$('#home').onclick=()=>scene?.home();$('#focus-place').onclick=()=>{$('#place-detail').close();setExplore(true);scene?.focus(activePlace);};
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('#announcement').textContent='Fullscreen is unavailable in this browser.';}};
addEventListener('keydown',e=>{if(e.key==='Escape'&&explore&&!$('#place-detail').open)setExplore(false);});
async function init(){if(compact.matches){$('#loading').hidden=true;$('#explore').hidden=true;$('#focus-place').hidden=true;$('#motion-toggle').hidden=true;$('#mode-label').textContent='Lightweight city view';return;}
 try{const {mountCivicScene}=await import('./civic-scene.js');scene=await mountCivicScene($('#city-canvas'),{onLabels:labels=>placeLabels(labels),onSelect:id=>showPlace(id),onReady:ready=>{$('#loading').hidden=true;$('#city-poster').hidden=ready;$('#explore').hidden=!ready;$('#motion-toggle').hidden=!ready;$('#focus-place').hidden=!ready;$('#mode-label').textContent=ready?'Interactive 3D model':'Static preview · 3D unavailable';$('#city-view').classList.toggle('static-preview',!ready);$('.map-names').hidden=!ready;}});if(presentation){presentLayout();scene.setPins(pins.points);presentation.refresh();}else syncSection();scene.setStage(current,chapterProgress);}catch(e){console.error('3D unavailable',e);$('#loading').hidden=true;$('#explore').hidden=true;$('#focus-place').hidden=true;$('#motion-toggle').hidden=true;$('#mode-label').textContent='Static preview · 3D unavailable';$('.map-names').hidden=true;}}
$('#view-instruction').textContent=HINT;
if(presenting){
 // Pins get their own layer over the band, the same box as the city view, so
 // a point low in the frame stays crisp over the band's fade instead of washed
 // out under it; they only have to keep clear of the band's text.
 const pinLayer=document.createElement('div');pinLayer.className='present-pins';pinLayer.append(...pinEls);document.body.append(pinLayer);document.addEventListener('pointerover',e=>{const pin=e.target.closest?.('.present-pin');if(pin)pins.highlight(pinEls.indexOf(pin));else if(!e.target.closest?.('[data-pin]'))pins.highlight(-1);});}
// The panels take the sides of a wide screen, so there the city fits a little
// less tightly; below that width there are no panels and it can fill more.
const panelsFit=matchMedia('(min-width: 1760px) and (min-height: 761px)');
function presentLayout(){scene?.setLayout({bias:0,lift:.05,fit:panelsFit.matches?.72:.67,frames:PRESENT_FRAMES});}
if(presenting){side=createSidePanels(document.querySelector('.experience-grid'),{paused:()=>paused});panelsFit.addEventListener('change',presentLayout);}
if(presenting)presentation=startPresentation({
 pins,
 apply:applyState,
 blocked:()=>explore||$('#place-detail').open,
 reduced:matchMedia('(prefers-reduced-motion: reduce)'),
 announce:text=>{$('#announcement').textContent=text;},
});
syncSection();init();
