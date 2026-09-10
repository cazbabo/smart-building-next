import './style.css';
import {sections,places} from './long-story.js';
import {storyTelemetry} from './story-state.js';
const $=s=>document.querySelector(s);
const mark='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="m16 3 12 7v13l-12 6L4 23V10Z" fill="#C7FF3D" stroke="currentColor" stroke-width="1.4"/><path d="m4 10 12 7 12-7M16 17v12" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
const phase=i=>i<2?'The city today':i===2?'Phase 1':i<6?'Phase 2':'Phase 3';
$('#app').innerHTML=`<a class="skip" href="#overview">Skip to story</a><header class="site-header"><a class="brand" href="#overview">${mark}<span>City Intelligence</span></a><nav aria-label="Presentation phases"><a href="#foundation">01 Data</a><a href="#iot">02 IoT</a><a href="#ai">03 AI</a></nav><button id="fullscreen" aria-label="Enter fullscreen">⛶</button></header>
<section class="hero" id="hero"><div class="hero-copy"><span class="hero-eyebrow">City Intelligence</span><h2 class="hero-title">From data to<br>a city in sync.</h2><p class="hero-line">One picture of the city, built from the systems that already run it.</p><div class="hero-actions"><a class="hero-start" href="#overview">Start the story <span>&darr;</span></a><button class="hero-explore" id="hero-explore">Explore the 3D city</button></div></div></section><main class="experience-grid"><aside class="visual-column" aria-label="City visualization"><div class="visual-stage"><div class="view-heading"><span class="live-dot"></span><b id="view-title">The city today</b><span id="mode-label">Illustrative 3D city</span></div><div class="city-view" id="city-view"><div id="nightfall"></div><img id="city-poster" src="/city-intelligence-civic.png" width="1600" height="1200" alt="A civic district with a command center, municipal hall, hospital, school, industry, energy, park and flood gate"><div id="city-canvas"></div><div class="map-names" aria-hidden="true">${Object.entries(places).map(([id,p])=>`<span class="name-${id}">${p.name}</span>`).join('')}</div><div id="loading" role="status">Preparing the 3D city…</div></div><div class="scene-readout" aria-label="Illustrative city activity"><div><span id="activity-label">City in motion</span><strong id="activity-value">A living district</strong><p id="activity-copy">Traffic moves. Wind turbines turn. Scroll to connect the city.</p></div><div class="activity-symbol" aria-hidden="true"><i></i><i></i><i></i></div><div class="scene-progress"><span id="chapter-fill"></span></div></div><div class="view-controls"><button id="explore">Explore 3D city</button><button id="motion-toggle" aria-pressed="false">Pause animation</button><button id="home" hidden>Reset view</button><span id="view-instruction">Scroll the page to follow the story.</span></div><p class="view-note">Illustrative experience using mock data. Not connected to live systems.</p></div></aside>
<div class="narrative-column">${sections.map((s,i)=>`<section class="story-section" id="${s.id}" aria-labelledby="title-${s.id}"><div class="section-phase"><span>${String(i+1).padStart(2,'0')} / 08</span>${s.phase}</div><h1 id="title-${s.id}">${s.title.replaceAll('\n','<br>')}</h1><p class="section-intro">${s.intro}</p>${['foundation','iot','ai'].includes(s.id)?`<div class="phase-band"><span>${phase(i)}</span><b>${s.id==='foundation'?'Connect existing data':s.id==='iot'?'See field conditions':'Anticipate and recommend'}</b></div>`:''}<ol class="story-points">${s.points.map(([head,body],j)=>`<li><span>${String(j+1).padStart(2,'0')}</span><div><h2>${head}</h2><p>${body}</p></div></li>`).join('')}</ol>${s.id==='priorities'?`<div class="district-list">${Object.entries(places).map(([id,p])=>`<button data-place="${id}">${p.name}<span>+</span></button>`).join('')}</div>`:''}<div class="takeaway">${s.takeaway}</div>${i<7?`<a class="next-section" href="#${sections[i+1].id}">Continue to ${sections[i+1].phase}<span>↓</span></a>`:'<a class="next-section" href="#overview">Restart the story<span>↑</span></a>'}</section>`).join('')}</div></main>
<footer class="page-footer"><span>City Intelligence Platform</span><span>Data Consolidation → IoT Data Integration → AI-Powered Intelligence</span><a href="#overview">Back to top ↑</a></footer>
<dialog id="place-detail" aria-labelledby="place-title"><button id="close-detail" aria-label="Close details">×</button><span class="detail-eyebrow">How this solution works</span><h2 id="place-title"></h2><div id="detail-copy"></div><button id="focus-place">View this district in 3D</button><small>Illustrative workflow. No live device control.</small></dialog><div id="announcement" role="status" class="sr"></div>`;
let scene=null,current='overview',activePlace='civic',explore=false,lastOpener=null,chapterProgress=0,paused=false;
const elements=[...document.querySelectorAll('.story-section')];
// Scroll drives solution state, not camera position or canvas size.
const activity={
 overview:['City in motion','A living district','Traffic moves. Wind turbines turn. Scroll to connect the city.'],
 fragmented:['Disconnected systems','Separate signals','Water, transport and facilities each hold part of the picture.'],
 foundation:['Phase 1 · Data','Connecting the city','Lime data streams join existing systems to the command center.'],
 iot:['Phase 2 · IoT','1.20 m','Sensor markers appear above the places being monitored.'],
 flood:['Flood response','1.20 m','Scroll to raise the simulated water level and reveal the response.'],
 priorities:['Connected services','10 city districts','Select a district to see its data, workflow and responsible team.'],
 ai:['Phase 3 · AI','1.60 m → 1.90 m','Pink marks the forecast area. The team reviews the next action.'],
 roadmap:['From data to decisions','Data → IoT → AI','A shared foundation, expanded one useful capability at a time.']
};
function syncSection(){
 let chosen=elements[0];const line=innerHeight*.40;
 for(const el of elements){if(el.getBoundingClientRect().top<=line)chosen=el;else break;}
 const rect=chosen.getBoundingClientRect();chapterProgress=Math.max(0,Math.min(1,(line-rect.top)/rect.height));
// How far the opening has scrolled away: 1 while the hero holds the frame, 0
 // once the story owns it. Drives the night layer, the hero copy and whether the
 // stage furniture is on screen.
 const hero=$('#hero'),over=hero?Math.max(0,Math.min(1,-hero.getBoundingClientRect().top/Math.max(1,hero.offsetHeight))):1;
 const night=1-over;
 document.documentElement.style.setProperty('--night',night.toFixed(3));
 document.documentElement.style.setProperty('--hero',(1-Math.min(1,over*1.6)).toFixed(3));
 const opening=night>.5;
 document.body.dataset.stage=opening?'hero':'story';
 scene?.setCentred(opening);
 const turned=chosen.id!==current;
 current=chosen.id;document.body.dataset.chapter=current;
 // The readout rewrites itself every frame during flood and AI, so it is the
 // change of chapter that animates, not the change of text.
 if(turned){const box=$('.scene-readout');box.classList.remove('turned');void box.offsetWidth;box.classList.add('turned');}
 const s=sections.find(x=>x.id===current),a=activity[current],data=storyTelemetry(current,chapterProgress);
 $('#view-title').textContent=s.phase;$('#activity-label').textContent=a[0];
 $('#activity-value').textContent=current==='flood'?`${data.level.toFixed(2)} m`:current==='ai'?`1.60 m → ${data.forecast.toFixed(2)} m`:a[1];
 $('#activity-copy').textContent=a[2];$('#chapter-fill').style.width=`${chapterProgress*100}%`;
 scene?.setStage(current,chapterProgress);
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
function placeLabels(labels){
 const view=$('#city-view'),vw=view.clientWidth||1,vh=view.clientHeight||1;
 // The narrative scrolls over the right of the same canvas and sits above the
 // labels, so a label left under it is unreadable. Districts on that side hang
 // their label to the left of the marker instead, and only one that still will
 // not clear the text is dropped.
 const column=innerWidth>800?vw*.56/vw*100:101;
 const taken=[];
 const allowed=explore?null:CHAPTER_LABELS[current]??LABEL_ORDER;
 for(const id of LABEL_ORDER){
  const label=$(`.name-${id}`),spot=labels[id];
  if(!label)continue;
  if(allowed&&!allowed.includes(id)){label.hidden=true;continue;}
  if(!spot){label.hidden=true;continue;}
  const [x,y]=spot;
  const w=(label.textContent.length*6.4+22)/vw*100,h=27/vh*100;
  const left=x+w/2>column-1;
  const box=left?[x-w-1,y-h,x-1,y]:[x-w/2,y-h,x+w/2,y];
  const clash=taken.some(o=>box[0]<o[2]&&box[2]>o[0]&&box[1]<o[3]&&box[3]>o[1]);
  label.hidden=clash||box[0]<-4||box[2]>column-1||y<0||y>106;
  if(label.hidden)continue;
  taken.push(box);
  label.style.left=`${left?x-1:x}%`;label.style.top=`${y}%`;label.style.bottom='auto';
  label.style.transform=left?'translate(-100%,-100%)':'';
 }
}
function showPlace(id,opener){const p=places[id];if(!p)return;activePlace=id;lastOpener=opener||document.activeElement;$('#place-title').textContent=p.name;$('#detail-copy').innerHTML=`<h3>Data source</h3><p>${p.source}</p><h3>What the platform does</h3><p>${p.work}</p><h3>How the team uses it</h3><p>${p.outcome}</p>`;$('#place-detail').showModal();}
$('#close-detail').onclick=()=>{$('#place-detail').close();lastOpener?.focus();};
$('#place-detail').addEventListener('cancel',()=>lastOpener?.focus());
document.addEventListener('click',e=>{const b=e.target.closest('[data-place]');if(b)showPlace(b.dataset.place,b);});
function setExplore(value){explore=value;scene?.setExplore(value);document.body.classList.toggle('exploring',value);$('#explore').textContent=value?'Return to the story':'Explore 3D city';$('#home').hidden=!value;$('#view-instruction').textContent=value?'Drag to rotate. Click a building to inspect it.':'Scroll the page to follow the story.';if(!value)scene?.home();}
$('#motion-toggle').onclick=()=>{paused=!paused;scene?.setPaused(paused);document.body.classList.toggle('motion-paused',paused);$('#motion-toggle').textContent=paused?'Resume animation':'Pause animation';$('#motion-toggle').setAttribute('aria-pressed',String(paused));};
$('#explore').onclick=()=>setExplore(!explore);$('#hero-explore').onclick=()=>{setExplore(true);};$('#home').onclick=()=>scene?.home();$('#focus-place').onclick=()=>{$('#place-detail').close();setExplore(true);scene?.focus(activePlace);};
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('#announcement').textContent='Fullscreen is unavailable in this browser.';}};
addEventListener('keydown',e=>{if(e.key==='Escape'&&explore&&!$('#place-detail').open)setExplore(false);});
async function init(){if(matchMedia('(max-width: 800px)').matches){$('#loading').hidden=true;$('#explore').hidden=true;$('#focus-place').hidden=true;$('#motion-toggle').hidden=true;$('#mode-label').textContent='Lightweight city view';return;}
 try{const {mountCivicScene}=await import('./civic-scene.js');scene=await mountCivicScene($('#city-canvas'),{onLabels:labels=>placeLabels(labels),onSelect:id=>showPlace(id),onReady:ready=>{$('#loading').hidden=true;$('#city-poster').hidden=ready;$('#explore').hidden=!ready;$('#motion-toggle').hidden=!ready;$('#focus-place').hidden=!ready;$('#mode-label').textContent=ready?'Interactive 3D model':'Static preview · 3D unavailable';$('#city-view').classList.toggle('static-preview',!ready);$('.map-names').hidden=!ready;}});syncSection();scene.setStage(current,chapterProgress);}catch(e){console.error('3D unavailable',e);$('#loading').hidden=true;$('#explore').hidden=true;$('#focus-place').hidden=true;$('#motion-toggle').hidden=true;$('#mode-label').textContent='Static preview · 3D unavailable';$('.map-names').hidden=true;}}
syncSection();init();
