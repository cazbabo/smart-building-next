// The presentation's side panels, for screens wide enough to have sides. On a
// wide screen the city, fitted between the header and the text band, left a
// third of the width empty; filling it with anything decorative would have
// been clutter. These two say what the model is doing:
//
// - Live signals: readings arriving from around the city, newest on top, each
//   with a time. What they say follows the chapter - separate systems, then
//   routed to the command center, then sensors, the flood alert, the forecast.
// - Connected systems: the seven sources and how many are joined up. It sits
//   at 0 / 7 while the story is about separate systems, counts up while the
//   Data chapter plays and the routes connect on the model, and stays at 7 / 7.
//   It also carries the only key to what the lime and pink on the model mean.
//
// Every value is illustrative, like the rest of the page. The panels carry no
// information the band does not, so they are hidden from assistive technology.
import {storyTelemetry} from './story-state.js';

const SYSTEMS=['GIS maps','CCTV events','Water level','Building systems','Energy meters','Service records','Traffic'];

// [title, detail, tone]. Detail may read the chapter's telemetry.
const CITY=[
 ['Water level','Gauge W-03 · 1.20 m'],
 ['Road camera','CCTV C-17 · traffic moving'],
 ['Solar field','Energy · 420 kW'],
 ['Hospital','Building systems · normal'],
 ['Air quality','PM2.5 · 18 µg/m³'],
 ['Service request','Civic · streetlight reported'],
 ['Bus route 12','Transport · on schedule'],
 ['Industry meter','Works · within range'],
];
const tag=(list,suffix,tone)=>list.map(([a,b])=>[a,`${b} · ${suffix}`,tone]);
const FEEDS={
 overview:CITY.map(([a,b])=>[a,b]),
 fragmented:[
  ['Water level','Water team only · 1.20 m and rising'],
  ['Road camera','Traffic team only · access road in use'],
  ['Incident report','Email thread · no shared record'],
  ['Hospital','Facilities only · normal'],
  ['Service request','Civic desk only · open'],
  ['Solar field','Energy team only · 420 kW'],
 ],
 foundation:tag(CITY,'→ command center','lime'),
 iot:[
  ['Water sensor','W-03 · 1.20 m · 12 s ago','lime'],
  ['Air sensor','A-07 · PM2.5 18 µg/m³ · 30 s ago','lime'],
  ['Energy meter','E-02 · 420 kW · 20 s ago','lime'],
  ['Weather station','Rain 4 mm/h · 8 s ago','lime'],
  ['Device health','128 of 132 sensors online'],
  ['Water sensor','W-05 · 0.94 m · 15 s ago','lime'],
 ],
 flood:[
  ['Water level',t=>`Gauge W-03 · ${t.level.toFixed(2)} m`,t=>t.level>1.4?'pink':'lime'],
  ['Road camera','CCTV C-17 · vehicles on access road'],
  ['Threshold','Warning line · 1.40 m','pink'],
  ['Response team','Notified · verifying on site'],
  ['Flood gates','Barrier 2 · raising','lime'],
  ['Route review','Access road · alternative proposed'],
 ],
 priorities:[
  ['Transport','Congestion · Route 12 corridor','lime'],
  ['Air quality','PM2.5 · industrial zone','lime'],
  ['Energy','Unusual load · hospital block','lime'],
  ['Service request','Streetlight · assigned to civic works','lime'],
  ['Water level','Gauge W-03 · 1.60 m','pink'],
  ['School','Campus report · resolved','lime'],
 ],
 ai:[
  ['Forecast',t=>`30 min · ${t.forecast.toFixed(2)} m`,'pink'],
  ['Recommendation','Review the exposed access road','pink'],
  ['Operator','Reviewing · decision pending'],
  ['Water level','Gauge W-03 · 1.60 m','lime'],
  ['Rainfall','Upstream · 6 mm/h','lime'],
  ['Resources','Response team on standby'],
 ],
 roadmap:[
  ['Phase 1','Data Consolidation · 7 systems connected','lime'],
  ['Phase 2','IoT Data Integration · 128 sensors','lime'],
  ['Phase 3','AI-Powered Intelligence · forecasts','pink'],
  ['Command center','One shared operational view','lime'],
 ],
};
const SUMMARY={
 overview:'each system on its own',fragmented:'each team sees a part',foundation:'joining the command center',
 iot:'plus 128 field sensors',flood:'one shared incident',priorities:'serving every district',
 ai:'feeding the forecast',roadmap:'one foundation',
};
const ROWS=6,EVERY=2.2;

export function createSidePanels(host,{paused}){
 const left=document.createElement('aside'),right=document.createElement('aside');
 left.className='side-panel side-feed';right.className='side-panel side-systems';
 for(const el of [left,right])el.setAttribute('aria-hidden','true');
 left.innerHTML='<h3><i></i>Live signals</h3><ol></ol><p class="side-note">Illustrative mock data</p>';
 right.innerHTML=`<h3>Connected systems</h3>
  <div class="side-count"><strong><b>0</b><span> / 7</span></strong><em></em></div>
  <ul>${SYSTEMS.map(name=>`<li>${name}<u></u></li>`).join('')}</ul>
  <p class="side-extra" hidden></p>
  <div class="side-legend"><span><i class="lime"></i>Data</span><span><i class="pink"></i>Alert · AI</span></div>`;
 host.append(left,right);
 const list=left.querySelector('ol'),rows=[...right.querySelectorAll('li')];

 // A clock that starts at the page's illustrative 14:32 and runs in real time.
 const origin=Date.now(),base=(14*3600+32*60+8)*1000;
 const clock=offset=>new Date(base+Date.now()-origin-offset*1000).toISOString().slice(11,19);

 let chapter=null,state=null,next=0,timer=0,shown=[];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function entry(index,age){
  const pool=FEEDS[chapter]??FEEDS.overview,[title,detail,tone]=pool[index%pool.length];
  return {index,time:clock(age),title,detail,tone};
 }
 // Rows are built when one arrives; after that only the live values - the
 // water level, the forecast - are written in place. Rebuilding the list every
 // frame while a chapter played restarted the arrival animation each time.
 let live=[];
 function paint(fresh){
  list.innerHTML=shown.map((e,i)=>`<li${i===0&&fresh?' class="fresh"':''}><time>${e.time}</time><b>${e.title}</b><small></small></li>`).join('');
  live=[...list.children].map((li,i)=>({li,e:shown[i],small:li.querySelector('small')}));
  refresh();
 }
 function refresh(){
  for(const {li,e,small} of live){
   const detail=typeof e.detail==='function'?e.detail(state):e.detail;
   const tone=typeof e.tone==='function'?e.tone(state):e.tone;
   if(small.textContent!==detail)small.textContent=detail;
   li.classList.toggle('lime',tone==='lime');li.classList.toggle('pink',tone==='pink');
  }
 }
 function tick(){
  timer=setTimeout(tick,EVERY*1000);
  if(paused()||reduced.matches||document.hidden)return;
  shown=[entry(next++,0),...shown].slice(0,ROWS);paint(true);
 }
 function restart(){
  // A new chapter fills the list at once, spaced back in time, then streams.
  const pool=FEEDS[chapter]??FEEDS.overview;
  const n=Math.min(ROWS,pool.length);
  // Newest first: the highest index is on top, so the next arrival is the one
  // that follows it round the pool, never a repeat of the row beneath.
  shown=Array.from({length:n},(_,i)=>entry(n-1-i,i*EVERY*1.7));next=n;paint(false);
  clearTimeout(timer);timer=setTimeout(tick,EVERY*1000);
 }

 return {
  update(id,progress){
   state=storyTelemetry(id,progress);
   if(id!==chapter){chapter=id;restart();}
   else refresh();
   // 0 while the story is about separate systems, counting up as the Data
   // chapter's routes connect, then all seven.
   const connected=id==='overview'||id==='fragmented'?0:id==='foundation'?Math.round(progress*SYSTEMS.length):SYSTEMS.length;
   right.querySelector('.side-count b').textContent=connected;
   right.querySelector('.side-count em').textContent=SUMMARY[id]??'';
   right.classList.toggle('all',connected===SYSTEMS.length);
   rows.forEach((row,i)=>{
    const on=i<connected;row.classList.toggle('on',on);
    row.querySelector('u').textContent=on?'connected':id==='fragmented'?'separate':'standalone';
   });
   const extra=right.querySelector('.side-extra');
   const note=id==='ai'?['pink','AI forecast · active']:['iot','flood','priorities','ai','roadmap'].includes(id)?['lime','IoT sensors · 128 of 132 online']:null;
   extra.hidden=!note;if(note){extra.className=`side-extra ${note[0]}`;extra.textContent=note[1];}
  },
 };
}
