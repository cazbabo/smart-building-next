import './style.css';
import {sections,places} from './long-story.js';
import {storyTelemetry} from './story-state.js';
const $=s=>document.querySelector(s);
const mark='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="m16 3 12 7v13l-12 6L4 23V10Z" fill="#C7FF3D" stroke="currentColor" stroke-width="1.4"/><path d="m4 10 12 7 12-7M16 17v12" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
const phase=i=>i<2?'The city today':i===2?'Phase 1':i<6?'Phase 2':'Phase 3';
$('#app').innerHTML=`<a class="skip" href="#overview">Skip to story</a><header class="site-header"><a class="brand" href="#overview">${mark}<span>City Intelligence</span></a><nav aria-label="Presentation phases"><a href="#foundation">01 Data</a><a href="#iot">02 IoT</a><a href="#ai">03 AI</a></nav><button id="fullscreen" aria-label="Enter fullscreen">⛶</button></header>
<main class="experience-grid"><aside class="visual-column" aria-label="City visualization"><div class="visual-stage"><div class="view-heading"><span class="live-dot"></span><b id="view-title">The city today</b><span id="mode-label">Illustrative 3D city</span></div><div class="city-view" id="city-view"><img id="city-poster" src="/city-intelligence-civic.webp" width="1600" height="1200" alt="A civic district with a command center, municipal hall, hospital, school, industry, energy, park and flood gate"><div id="city-canvas"></div><div class="map-names" aria-hidden="true"><span class="name-command">CDP Command Center</span><span class="name-civic">Civic administration</span><span class="name-water">Water & flood prevention</span></div><div id="loading" role="status">Preparing the 3D city…</div></div><div class="scene-readout" aria-label="Illustrative city activity"><div><span id="activity-label">City in motion</span><strong id="activity-value">A living district</strong><p id="activity-copy">Traffic moves. Wind turbines turn. Scroll to connect the city.</p></div><div class="activity-symbol" aria-hidden="true"><i></i><i></i><i></i></div><div class="scene-progress"><span id="chapter-fill"></span></div></div><div class="view-controls"><button id="explore">Explore 3D city</button><button id="motion-toggle" aria-pressed="false">Pause animation</button><button id="home" hidden>Reset view</button><span id="view-instruction">Scroll the page to follow the story.</span></div><p class="view-note">Illustrative experience using mock data. Not connected to live systems.</p></div></aside>
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
 current=chosen.id;document.body.dataset.chapter=current;
 const s=sections.find(x=>x.id===current),a=activity[current],data=storyTelemetry(current,chapterProgress);
 $('#view-title').textContent=s.phase;$('#activity-label').textContent=a[0];
 $('#activity-value').textContent=current==='flood'?`${data.level.toFixed(2)} m`:current==='ai'?`1.60 m → ${data.forecast.toFixed(2)} m`:a[1];
 $('#activity-copy').textContent=a[2];$('#chapter-fill').style.width=`${chapterProgress*100}%`;
 scene?.setStage(current,chapterProgress);
 document.querySelectorAll('.site-header nav a').forEach(a=>a.setAttribute('aria-current',a.hash===`#${current}`?'step':'false'));
}

let pending=false;addEventListener('scroll',()=>{if(!pending){pending=true;requestAnimationFrame(()=>{pending=false;syncSection();});}},{passive:true});addEventListener('resize',syncSection);
function showPlace(id,opener){const p=places[id];if(!p)return;activePlace=id;lastOpener=opener||document.activeElement;$('#place-title').textContent=p.name;$('#detail-copy').innerHTML=`<h3>Data source</h3><p>${p.source}</p><h3>What the platform does</h3><p>${p.work}</p><h3>How the team uses it</h3><p>${p.outcome}</p>`;$('#place-detail').showModal();}
$('#close-detail').onclick=()=>{$('#place-detail').close();lastOpener?.focus();};
$('#place-detail').addEventListener('cancel',()=>lastOpener?.focus());
document.addEventListener('click',e=>{const b=e.target.closest('[data-place]');if(b)showPlace(b.dataset.place,b);});
function setExplore(value){explore=value;scene?.setExplore(value);document.body.classList.toggle('exploring',value);$('#explore').textContent=value?'Return to the story':'Explore 3D city';$('#home').hidden=!value;$('#view-instruction').textContent=value?'Drag to rotate. Click a building to inspect it.':'Scroll the page to follow the story.';if(!value)scene?.home();}
$('#motion-toggle').onclick=()=>{paused=!paused;scene?.setPaused(paused);document.body.classList.toggle('motion-paused',paused);$('#motion-toggle').textContent=paused?'Resume animation':'Pause animation';$('#motion-toggle').setAttribute('aria-pressed',String(paused));};
$('#explore').onclick=()=>setExplore(!explore);$('#home').onclick=()=>scene?.home();$('#focus-place').onclick=()=>{$('#place-detail').close();setExplore(true);scene?.focus(activePlace);};
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('#announcement').textContent='Fullscreen is unavailable in this browser.';}};
addEventListener('keydown',e=>{if(e.key==='Escape'&&explore&&!$('#place-detail').open)setExplore(false);});
async function init(){if(matchMedia('(max-width: 800px)').matches){$('#loading').hidden=true;$('#explore').hidden=true;$('#focus-place').hidden=true;$('#motion-toggle').hidden=true;$('#mode-label').textContent='Lightweight city view';return;}
 try{const {mountCivicScene}=await import('./civic-scene.js');scene=await mountCivicScene($('#city-canvas'),{onLabels:labels=>{for(const [id,[x,y]] of Object.entries(labels)){const label=$(`.name-${id}`);label.style.left=`${x}%`;label.style.top=`${y}%`;label.style.bottom='auto';}},onSelect:id=>showPlace(id),onReady:ready=>{$('#loading').hidden=true;$('#city-poster').hidden=ready;$('#explore').hidden=!ready;$('#motion-toggle').hidden=!ready;$('#focus-place').hidden=!ready;$('#mode-label').textContent=ready?'Interactive 3D model':'Static preview · 3D unavailable';$('#city-view').classList.toggle('static-preview',!ready);$('.map-names').hidden=!ready;}});syncSection();scene.setStage(current,chapterProgress);}catch(e){console.error('3D unavailable',e);$('#loading').hidden=true;$('#explore').hidden=true;$('#focus-place').hidden=true;$('#motion-toggle').hidden=true;$('#mode-label').textContent='Static preview · 3D unavailable';$('.map-names').hidden=true;}}
syncSection();init();
