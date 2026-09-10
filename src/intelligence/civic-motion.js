import * as T from 'three';
import {storyTelemetry} from './story-state.js';
const clamp = x => Math.max(0, Math.min(1, x));
const smooth = x => { const t = clamp(x); return t * t * (3 - 2 * t); };
export function createCivicMotion({root,locations,rotors,vehicles,waterSurface,gates,risk,warning}) {
 const flow = new T.Group(); flow.name = 'Connected data'; root.add(flow);
 // The brand layer is information drawn over the city, not lit surface in it, so
 // it opts out of tone mapping. ACES is right for the architecture and wrong
 // here: at exposure 1.08 it renders #C7FF3D as #BBD254 and #F05BB5 as #D34BA2,
 // which left the lime on the canvas a different colour from the lime on the
 // buttons beside it. Unlit materials lose nothing by skipping the curve.
 const lime = new T.MeshBasicMaterial({color:'#C7FF3D',toneMapped:false}),pink = new T.MeshBasicMaterial({color:'#F05BB5',toneMapped:false});
 const channels=[],packets=[],beacons=[],advice=[];
 const bead = new T.SphereGeometry(.44,10,8);
 for(const [index,id] of ['civic','hospital','school','water','industry','energy','transit'].entries()) {
  const [x,y,z]=locations[id];
  const curve = new T.CatmullRomCurve3([new T.Vector3(x,y+1,z),new T.Vector3(x-9,y+6,z),new T.Vector3(-46,11,z*.35),new T.Vector3(-60,10,1)]);
  // Radius is world units and the city is ~99 across, so at the chapter framings
  // (span 70 to 116 on a canvas around 1100 wide) one unit is roughly ten pixels.
  // At .085 the routes drew under two pixels wide and the connected city - the
  // whole point of Phase 1 - was not visible on screen at all.
  const geometry=new T.TubeGeometry(curve,60,.24,6,false);
  const line=new T.Mesh(geometry,new T.MeshBasicMaterial({color:index%3===0?'#F05BB5':'#C7FF3D',transparent:true,opacity:.85,depthWrite:false,toneMapped:false})); flow.add(line);channels.push(line);
  for(let j=0;j<3;j++){const mesh=new T.Mesh(bead,index%3===0?pink:lime);flow.add(mesh);packets.push({mesh,curve,offset:j/3+index*.07});}
  // The AI chapter has to show the command center answering, not only that it
  // was fed. Larger pink beads run the same routes the other way, so the
  // recommendation is seen leaving for the districts that sent the readings.
  for(let j=0;j<2;j++){const mesh=new T.Mesh(bead,pink);mesh.scale.setScalar(1.7);flow.add(mesh);advice.push({mesh,curve,offset:j/2+index*.13});}
 }
 const sensorLayer=new T.Group();sensorLayer.name='IoT coverage';root.add(sensorLayer);
 for(const [id,[x,y,z]] of Object.entries(locations)) {
  if(id==='command')continue;
  const marker=new T.Group();marker.position.set(x+5,y+2,z);sensorLayer.add(marker);
  const core=new T.Mesh(new T.OctahedronGeometry(.65),lime);marker.add(core);
  const ring=new T.Mesh(new T.TorusGeometry(1.15,.095,6,32),lime);ring.rotation.x=Math.PI/2;marker.add(ring);
  beacons.push({marker,core,ring,base:y+2});
 }
 // Something has to mark the processing itself, between the readings arriving
 // and the advice going back out.
 const [cx,cy,cz]=locations.command;
 const think=new T.Mesh(new T.TorusGeometry(3.4,.26,8,44),new T.MeshBasicMaterial({color:'#F05BB5',transparent:true,opacity:.9,depthWrite:false,toneMapped:false}));
 think.rotation.x=Math.PI/2;think.position.set(cx,cy+2.4,cz);think.name='AI processing';root.add(think);
 let stage='overview',targetProgress=0,progress=0;
 function setStage(id,p=0){stage=id;targetProgress=clamp(p);}
 function update(time,dt=1/60,instant=false){
  progress=instant?targetProgress:T.MathUtils.damp(progress,targetProgress,7,dt);
  const state=storyTelemetry(stage,progress);
  const strength=stage==='foundation'?.12+.88*smooth(progress):1;
  flow.visible=state.connected;
  for(const line of channels)line.geometry.setDrawRange(0,Math.floor(line.geometry.index.count*strength/3)*3);
  for(const item of packets){const t=(time*.12+item.offset)%1;item.mesh.visible=t<=strength;item.mesh.position.copy(item.curve.getPointAt(t));}
  sensorLayer.visible=state.sensors;
  // Advice only flows while the forecast chapter is on screen.
  const advising=stage==='ai';
  think.visible=advising;
  if(advising){const pulse=1+Math.sin(time*2.1)*.11;think.scale.set(pulse,pulse,1);think.rotation.z=time*.5;}
  for(const item of advice){
   item.mesh.visible=advising;
   if(advising)item.mesh.position.copy(item.curve.getPointAt(1-(time*.17+item.offset)%1));
  }
  for(const [i,b] of beacons.entries()){b.marker.position.y=b.base+Math.sin(time*1.2+i)*.22;b.core.rotation.y=time*.35;b.ring.rotation.z=time*.2;}
  for(const [i,rotor] of rotors.entries())rotor.rotation.z=time*(.4+i*.06);
  for(const [i,car] of vehicles.entries()){const u=(time*(.022+(i%3)*.002)+i/vehicles.length)%1;
   // A car may carry its own route - the elevated expressway does - and only
   // the ones without one follow the central road rectangle below.
   const route=car.userData.route;
   if(route){const [rx,ry,rz,ra]=route(u);car.position.set(rx,ry,rz);car.rotation.y=ra;continue;}
   const perimeter=108,d=u*perimeter;let x,z,a;
   if(d<31){x=-17+d;z=-10;a=0;}else if(d<54){x=14;z=-10+d-31;a=-Math.PI/2;}else if(d<85){x=14-(d-54);z=13;a=Math.PI;}else{x=-17;z=13-(d-85);a=Math.PI/2;}
   // Vehicles follow the central road rectangle and remain outside district platforms.
   car.position.set(x,.45,z);car.rotation.y=a;
  }
  const levelY=.62+(state.level-1.2)*3.5;
  waterSurface.position.y=instant?levelY:T.MathUtils.damp(waterSurface.position.y,levelY,5,dt);
  const incident=['flood','ai'].includes(stage);
  const lift=stage==='flood'?smooth((progress-.45)/.55):stage==='ai'?1:0;
  for(const gate of gates)gate.position.y=1.5+lift*.9;
  risk.visible=incident;warning.visible=incident;
  const size=stage==='ai'?1+smooth(progress)*.35:.8+smooth(progress)*.2;
  risk.scale.set(size,size,1);risk.position.y=2.6;risk.material.opacity=stage==='ai'?.19:.10;
  warning.position.y=6.5;warning.rotation.y=time*.35;
  return state;
 }
 return {setStage,update,channels,packets,beacons,advice,think,flow};
}
