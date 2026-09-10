import * as T from 'three';
import {storyTelemetry} from './story-state.js';
const clamp = x => Math.max(0, Math.min(1, x));
const smooth = x => { const t = clamp(x); return t * t * (3 - 2 * t); };
export function createCivicMotion({root,locations,rotors,vehicles,waterSurface,gates,risk,warning}) {
 const flow = new T.Group(); flow.name = 'Connected data'; root.add(flow);
 const lime = new T.MeshBasicMaterial({color:'#C7FF3D'}),pink = new T.MeshBasicMaterial({color:'#F05BB5'});
 const channels=[],packets=[],beacons=[];
 const bead = new T.SphereGeometry(.30,8,6);
 for(const [index,id] of ['civic','hospital','school','water','industry','energy','transit'].entries()) {
  const [x,y,z]=locations[id];
  const curve = new T.CatmullRomCurve3([new T.Vector3(x,y+1,z),new T.Vector3(x-9,y+6,z),new T.Vector3(-46,11,z*.35),new T.Vector3(-60,10,1)]);
  const geometry=new T.TubeGeometry(curve,60,.085,5,false);
  const line=new T.Mesh(geometry,new T.MeshBasicMaterial({color:index%3===0?'#F05BB5':'#C7FF3D',transparent:true,opacity:.65,depthWrite:false})); flow.add(line);channels.push(line);
  for(let j=0;j<3;j++){const mesh=new T.Mesh(bead,index%3===0?pink:lime);flow.add(mesh);packets.push({mesh,curve,offset:j/3+index*.07});}
 }
 const sensorLayer=new T.Group();sensorLayer.name='IoT coverage';root.add(sensorLayer);
 for(const [id,[x,y,z]] of Object.entries(locations)) {
  if(id==='command')continue;
  const marker=new T.Group();marker.position.set(x+5,y+2,z);sensorLayer.add(marker);
  const core=new T.Mesh(new T.OctahedronGeometry(.65),lime);marker.add(core);
  const ring=new T.Mesh(new T.TorusGeometry(1.15,.055,5,32),lime);ring.rotation.x=Math.PI/2;marker.add(ring);
  beacons.push({marker,core,ring,base:y+2});
 }
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
 return {setStage,update,channels,packets,beacons,flow};
}
