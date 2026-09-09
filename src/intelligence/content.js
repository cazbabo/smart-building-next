export const chapters = [
 {name:'A living city',title:'Every city has\na story in its data.',copy:'Movement. Energy. Water. People. A living network of signals, waiting to become a shared understanding.',note:'Start with the city you already have.',focus:'all',span:136,length:1.3},
 {name:'The disconnect',title:'The data exists.\nThe connection\nis missing.',copy:'Seven valuable systems. Different update times. Separate views of the same city. An incident can be visible to one team and invisible to another.',note:'Fragmented information delays shared awareness.',focus:'all',span:136,length:1.6},
 {name:'One connected platform',title:'Bring the pieces\ninto perspective.',copy:'Connect existing systems through one governed data platform. Give every source a shared location, asset and operational context.',note:'Connect existing systems. Preserve their value.',focus:'hub',span:112,length:1.5},
 {name:'01 / Data foundation',title:'Start with what\nyou already know.',copy:'Turn existing GIS, asset records and events into an Operational Digital Twin. See current status, explore relationships and revisit what happened.',note:'An operational view, not a physics simulation.',focus:'office',span:112,length:1.6},
 {name:'02 / IoT visibility',title:'Fill the gaps.\nSee the change.',copy:'Add sensors where information is missing. Bring field conditions, device health and data freshness into the same operational picture.',note:'Every new device serves a defined information gap.',focus:'water',span:112,length:1.6},
 {name:'One platform. Five priorities.',title:'Connected data.\nPractical action.',copy:'Move between five operational priorities, all connected to the same city and the same foundation.',note:'Scroll to follow each use case.',focus:'water',span:83,length:4.6},
 {name:'03 / AI intelligence',title:'See what is.\nAnticipate\nwhat comes next.',copy:'Compare current conditions with an illustrative forecast. Detect unusual patterns and bring recommended actions to the people responsible.',note:'AI recommends. People review and decide.',focus:'water',span:112,length:2.2},
 {name:'The way forward',title:'A connected city.\nA clearer way\nforward.',copy:'Connect existing data. See every situation. Scale from IoT to AI.',note:'Start with a priority. Measure progress. Expand with purpose.',focus:'all',span:136,length:1.3},
];
export const useCases=[
 {id:'water',name:'Flood & response',title:'See rising risk.\nCoordinate earlier.',copy:'Rainfall and water-level readings meet road and terrain context. One shared incident helps teams review a safer access route.',source:'Water level + weather + GIS',process:'Locate the rising-water alert and assess exposed roads.',action:'Review the recommended response route.',metric:'Water level',unit:'m',baseline:'0.82 m normal range',focus:'water'},
 {id:'traffic',name:'Traffic monitoring',title:'Keep the city\nmoving together.',copy:'Combine corridor density, camera event metadata and road context. Give the operations team a clear view of the blockage and an alternate route.',source:'Road sensors + camera metadata + GIS',process:'Correlate congestion and the incident location.',action:'Review the alternate route before coordinating traffic teams.',metric:'Traffic density',unit:'',baseline:'Normal → congested corridor',focus:'traffic'},
 {id:'air',name:'Air quality',title:'Make the invisible\nunderstandable.',copy:'Connect station readings with weather, wind and time. A district heatmap shows where conditions are changing and where to investigate.',source:'PM2.5 stations + wind + historical readings',process:'Compare the affected area with its earlier readings.',action:'Ask the environmental team to investigate the elevated zone.',metric:'PM2.5',unit:'µg/m³',baseline:'18 µg/m³ earlier reading',focus:'park'},
 {id:'energy',name:'Energy & buildings',title:'Find the exception.\nFocus the effort.',copy:'Compare a building’s current demand with its operating schedule and historical baseline. Highlight the exception for an operational review.',source:'Energy meters + BMS + operating schedule',process:'Compare current demand with a 420 kW illustrative baseline.',action:'Request inspection; the cause is not yet confirmed.',metric:'Building demand',unit:'kW',baseline:'420 kW historical baseline',focus:'office'},
 {id:'safety',name:'Public safety',title:'One incident.\nOne shared response.',copy:'Bring CCTV event metadata, location and workflow into one record. Follow the handover from open, to assigned, to resolved.',source:'CCTV event metadata + GIS + incident workflow',process:'Link evidence, ownership and the response timeline.',action:'Coordinate the assigned team and record the resolution.',metric:'Incident status',unit:'',baseline:'Open → Assigned → Resolved',focus:'hub'},
];
export const assetInfo={
 water:{name:'Water-level station',type:'Environment / Waterway',source:'Water level, rainfall and observation time.',process:'The platform attaches each reading to its waterway asset, checks freshness and compares it with a demo warning threshold.',action:'Review the exposed road and coordinate a response using the incident record.',focus:'water'},
 traffic:{name:'Connected corridor',type:'Mobility / Road network',source:'Road sensor density and camera event metadata.',process:'Combine observations with GIS road segments and the active incident.',action:'Review an alternate route and coordinate the responsible team.',focus:'traffic'},
 park:{name:'Environmental station',type:'Environment / Riverside park',source:'PM2.5, weather, wind and historical observations.',process:'Compare readings over time and display their geographic context. Area shading is illustrative, not a dispersion model.',action:'Investigate the elevated zone and communicate the observed conditions.',focus:'park'},
 office:{name:'Workplace district',type:'Energy / Connected buildings',source:'Smart meter readings, building systems and operating schedules.',process:'Compare current power demand with the building’s historical baseline.',action:'Request an inspection of the exception without assuming a root cause.',focus:'office'},
 hub:{name:'Operations pavilion',type:'Platform / Shared operations',source:'GIS, CCTV metadata, traffic, BMS, environmental systems, incidents and manual records.',process:'Integrate and normalize priority data, apply access and quality rules, then link assets and events by location.',action:'Give teams a shared record to review, assign and resolve incidents.',focus:'hub'},
 residence:{name:'Residential quarter',type:'City / Asset registry',source:'Existing GIS and asset records.',process:'Place buildings and service assets into one location-aware registry.',action:'Understand nearby assets and teams when an event occurs.',focus:'residence'},
};
export const clamp=x=>Math.max(0,Math.min(1,x));
export const totalLength=chapters.reduce((sum,c)=>sum+c.length,0);
export function stateAt(progress){
 const p=clamp(progress);let offset=0,index=7,local=1;
 for(let i=0;i<chapters.length;i++){const width=chapters[i].length/totalLength;if(p<offset+width||i===7){index=i;local=clamp((p-offset)/width);break;}offset+=width;}
 const useIndex=index===5?Math.min(4,Math.floor(local*5)):0;
 const u=index===5?clamp(local*5-useIndex):0;
 const flood=index===5&&useIndex===0?u:index===6?.5:0;
 return {p,index,local,useIndex,u,connected:index>=2,water: +(0.82+flood*.88).toFixed(2),rain:Math.round(flood*48),flood,forecast:index===6?clamp((local-.2)/.5):0,air:index===5&&useIndex===2?Math.round(18+u*30):18,energy:index===5&&useIndex===3?Math.round(420+u*128):420,traffic:index===5&&useIndex===1?(u>.55?'High':u>.2?'Medium':'Low'):'Low',incident:index===5&&useIndex===4?(u>.78?'Resolved':u>.33?'Assigned':'Open'):'Open',focus:index===5?useCases[useIndex].focus:chapters[index].focus};
}
export function chapterProgress(index){return chapters.slice(0,index).reduce((s,c)=>s+c.length,0)/totalLength;}
export function useProgress(index){return chapterProgress(5)+chapters[5].length/totalLength*((index+.08)/5);}

// The guided story explains the operational situation first; technical detail is optional.
const plainChapters=[
 ['See how a city\nworks together.','Follow one city from disconnected information to coordinated action. Scroll to see how data, sensors and AI help its teams.'],
 ['A rising river.\nSeparate views.','The water team sees a warning. The traffic team sees a road. Neither sees the whole situation yet.'],
 ['Connect the data.\nShare the picture.','Bring existing maps, camera events and sensor readings together, so teams can understand the same incident.'],
 ['See the asset.\nSee its history.','Put buildings, devices and events on one shared map. Check their status and look back at earlier observations.'],
 ['Measure what\nyou cannot see.','Add sensors where readings are missing. Check water, air, traffic and energy, with a timestamp and device-health status.'],
 ['One city.\nFive ways to help.','Follow five everyday situations, from the first signal to the next human decision.'],
 ['Could this road\nflood next?','Compare today’s water level with an illustrative 30-minute forecast. The platform suggests actions; a person reviews them.'],
 ['Start with data.\nGrow with purpose.','Connect existing systems first. Add sensors where needed. Introduce AI when the information is ready.'],
];
plainChapters.forEach(([title,copy],i)=>Object.assign(chapters[i],{title,copy}));
export const simpleCases=[
 {title:'Water is rising.\nWhich road is at risk?',copy:'See the water level, the nearby road and the response route together.',problem:'Heavy rain raises the water level.',see:'Show the nearby road and the water warning together.',act:'Review a safer route for the response team.'},
 {title:'Traffic is building.\nWhere is the blockage?',copy:'Locate congestion and the reported incident, then review another route.',problem:'Traffic slows around a road incident.',see:'Show the blockage and affected road segments.',act:'Review an alternate route with the traffic team.'},
 {title:'Air quality changes.\nWhich area needs attention?',copy:'Compare the latest reading with earlier conditions and locate the affected zone.',problem:'A station reports higher PM2.5.',see:'Show where readings rose and how they changed.',act:'Ask the environmental team to investigate.'},
 {title:'One building uses\nmore energy than usual.',copy:'Compare its current demand with its normal pattern before requesting an inspection.',problem:'Demand rises above the building’s baseline.',see:'Compare current demand with normal consumption.',act:'Request an inspection. The cause is not confirmed.'},
 {title:'An incident opens.\nWho is responding?',copy:'Keep the event, its location and the assigned team in one shared record.',problem:'An incident is reported in a public area.',see:'Link the location, camera event and assigned team.',act:'Track the handover through to resolution.'},
];
simpleCases.forEach((c,i)=>Object.assign(useCases[i],{title:c.title,copy:c.copy}));
