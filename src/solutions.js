import * as THREE from 'three';
import {box,cylinder,tree,desk,pipe,room,palette as p,mat} from './model-kit.js';

export function createSolutionScene(key){
 const group=new THREE.Group();group.name=`Solution_${key}`;
 const nodes=[],flows=[],moving=[],screens=[],incidentMeshes=[];
 const node=(label,sub,pos,stage)=>nodes.push({label,sub,pos,stage});
 const route=(points,color=0x4ecbd3)=>{
  const curve=pipe(group,points,color,.045);
  for(let i=0;i<3;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.11,6,4),new THREE.MeshBasicMaterial({color}));group.add(m);flows.push({mesh:m,curve,offset:i/3});}
 };
 room(group,25,18,key!=='command');
 const equipment=(x,z,label)=>{const g=new THREE.Group();g.position.set(x,0,z);group.add(g);box(g,[2,2.7,1.4],[0,1.35,0],p.white);box(g,[1.75,2.3,.08],[0,1.4,.74],p.dark);box(g,[.7,.43,.07],[0,2,.81],p.cyan);for(let j=0;j<5;j++)box(g,[1.3,.05,.03],[0,.45+j*.19,.8],p.stone);return g;};
 const meeting=(x,z)=>{
  box(group,[6.2,.15,2.6],[x,.85,z],p.wood);
  for(const dx of [-2.5,-.8,.8,2.5])for(const dz of [-2,2]){box(group,[.65,.13,.7],[x+dx,.5,z+dz],p.dark);box(group,[.65,.6,.12],[x+dx,.86,z+dz+Math.sign(dz)*.33],p.dark);cylinder(group,.06,.45,[x+dx,.23,z+dz]);}
  box(group,[4.7,2.4,.14],[x,2.1,z-3.3],p.dark);box(group,[4.4,2.1,.02],[x,2.1,z-3.2],p.blue);
  for(const dx of [-2,0,2])box(group,[.55,.035,.4],[x+dx,.96,z],p.dark);
 };
 if(key==='command'){
   // Operations room: a six-system video wall and two rows of staffed consoles.
   box(group,[24.8,.035,17.7],[0,.04,0],p.dark).renderOrder=-19;
   box(group,[25,6.6,.35],[0,3.3,-8.7],p.dark).renderOrder=-9;
   const systems=['energy','comfort','workspace','security','parking','plant'];
   systems.forEach((system,index)=>{
    const x=(index%3-1)*7.2,y=index<3?4.95:2.25;
    box(group,[6.8,2.45,.22],[x,y,-8.42],p.dark).renderOrder=-8;
    const screen=box(group,[6.5,2.18,.04],[x,y,-8.28],mat(0x183f53,{emissive:0x11374a,emissiveIntensity:.35}));screen.renderOrder=-7;
    const status=box(group,[.2,.16,.035],[x-2.9,y+.78,-8.22],p.cyan.clone());
    const bars=[];
    for(let j=0;j<9;j++){const height=.3+((j*7+index*3)%11)*.1;bars.push(box(group,[.34,height,.025],[x-2.2+j*.52,y-.75+height/2,-8.21],p.cyan.clone()));}
    box(group,[5.7,.025,.02],[x,y-.8,-8.2],p.blue);
    for(let j=0;j<3;j++)box(group,[.7,.035,.02],[x-2.4+j*1.1,y+.76,-8.19],p.white);
    status.renderOrder=-6;bars.forEach(b=>b.renderOrder=-6);screens.push({system,screen,status,bars});
   });
   for(const x of [-6,0,6])for(const z of [-2,4]){
    desk(group,x,z);box(group,[1.05,.57,.1],[x+.7,1.17,z-.32],p.dark);box(group,[.91,.44,.03],[x+.7,1.17,z-.25],p.blue);
    const torso=cylinder(group,.23,.55,[x,1.03,z+1],p.blue,8);torso.scale.z=.65;
    const head=new THREE.Mesh(new THREE.SphereGeometry(.18,10,8),p.stone);head.position.set(x,1.5,z+1);group.add(head);
    box(group,[.12,.55,.18],[x-.22,.65,z+.75],p.dark);box(group,[.12,.55,.18],[x+.22,.65,z+.75],p.dark);
   }
   for(const x of [-10.8,10.8]){equipment(x,-4.5);box(group,[1.5,2.8,1.6],[x,1.4,-4.5],p.dark);for(let j=0;j<7;j++){box(group,[1.25,.2,.04],[x,.4+j*.32,-3.65],p.stone);box(group,[.12,.07,.05],[x+.43,.43+j*.32,-3.6],p.cyan);}}
   for(const x of [-11,11])tree(group,x,0,6.7,.9);
   route([[-10,1.3,-4],[0,.12,-5],[6,.12,4],[6,1.4,4]]);
   node('Video Wall · 6 ระบบ','One view of the building',[0,6.7,-8],0);
   node('รับเหตุพร้อมบริบท','Incident correlation',[-6,1.8,-2],1);
   node('ควบคุมและมอบหมาย','Operator console',[6,1.8,4],2);
   node('ติดตามจนปิดงาน','Operations log',[-6,1.8,4],3);
 }else if(key==='energy'){
   // Open rooftop + switchgear connected by the energy path.
   for(const x of [-8,-3])for(const z of [-4,0,4]){
    const solar=box(group,[4,.15,2.6],[x,1.4,z],p.blue);solar.rotation.x=-.2;
    for(let col=-1.5;col<2;col+=.75)box(group,[.024,.02,2.4],[x+col,1.52,z],p.white);
    for(const dx of [-1.7,1.7])box(group,[.1,1.1,2],[x+dx,.7,z],p.dark);
   }
   equipment(3,-5);equipment(8,-5);equipment(8,2);
   for(let i=0;i<3;i++)box(group,[.5,.25,.06],[2.4+i*.6,1.2,-4.22],p.cyan);
   route([[-7,1.8,1],[-3,2,6],[3,2,6],[3,2,-4]]);route([[3,2,-4],[6,3,-3],[8,2,-4]]);route([[8,2,-4],[10,2,0],[8,2,3]]);
   node('แผงพลังงานแสงอาทิตย์','Solar · 74 kW',[-7,2.3,-1],0);node('อินเวอร์เตอร์','DC → AC',[3,3.1,-5],0);node('มิเตอร์หลัก','Grid · 212 kW',[8,3.1,-5],1);node('ควบคุมโหลด','Demand control',[8,3.1,3],2);
 }else if(key==='comfort'||key==='workspace'||key==='overview'){
   meeting(-5,0);
   for(const x of [3.5,8])for(const z of [-3.5,2.7])desk(group,x,z);
   // Glass partition with mullions; low walls preserve the dollhouse view.
   for(const z of [-6,-3,0,3,6])box(group,[.07,2.4,2.8],[.3,1.2,z],mat(0x9bbbc1,{transparent:true,opacity:.28,depthWrite:false}));
   tree(group,10,0,-6,.7);tree(group,-10,0,6,.8);
   equipment(8,-6.5);
   // Ceiling duct and individually modeled grilles.
   box(group,[19,.52,.8],[-1,4,-5.3],p.white);
   for(const x of [-7,-2,4,9]){
    box(group,[.65,.44,8],[x,3.9,-1.5],p.white);
    for(const z of [-1,2]){box(group,[1.2,.12,1.1],[x,3.58,z],p.dark);for(let j=0;j<4;j++)box(group,[1.1,.035,.065],[x,3.5,z-.4+j*.24],p.white);}
   }
   box(group,[.45,.5,.1],[-8,1.6,-3.15],p.cyan);
   if(key==='comfort'){
    route([[8,3.7,-6],[-7,4.4,-5],[-7,3.8,1],[-7,1.6,1]]);route([[-7,1.6,1],[-4,1.6,5],[8,2,-6]],0xe0b17d);
    node('ตรวจคุณภาพอากาศ','CO₂ · 612 ppm',[-8,2.2,-3],0);node('เครื่องปรับอากาศ AHU','Fresh air + Cooling',[8,3.3,-6],2);node('จ่ายลมตามความต้องการ','VAV · 68%',[-2,4.4,2],2);node('พื้นที่ใช้งาน','24 people',[-5,1.2,3],1);
   }else{
    box(group,[.4,.55,.15],[.55,1.7,3.4],p.cyan);
    for(const x of [3.5,8])for(const z of [-3.5,2.7])box(group,[.35,.08,.35],[x,2.6,z],p.cyan);
    route([[8,2.7,3],[3,2.7,3],[.6,2,3.4],[-5,1.3,0]]);
    node('ห้องประชุมอัจฉริยะ','Booking + Occupancy',[-5,1.5,0],0);node('เซนเซอร์พื้นที่ทำงาน','Presence sensor',[8,3,-3],1);node('เตรียมห้องอัตโนมัติ','Lighting · HVAC · AV',[.6,2.4,3.4],2);node('แพลตฟอร์มอาคาร','Connected systems',[8,3.3,-6],3);
   }
 }else if(key==='security'){
   box(group,[7,1.1,2],[-6,.55,-3.5],p.wood);box(group,[7.2,.15,2.2],[-6,1.2,-3.5],p.edge);box(group,[1,.7,.1],[-6,1.6,-3.5],p.dark);
   for(const x of [-1,1,3,5]){box(group,[.4,1.1,2.4],[x,.55,1],p.dark);box(group,[.34,.07,.4],[x,1.14,1.6],p.cyan);if(x<5){const gate=box(group,[1.35,.65,.1],[x+.87,.72,1],mat(0x86c6ce,{transparent:true,opacity:.55}));moving.push({mesh:gate,kind:'gate'});}}
   for(const x of [5,9]){box(group,[3,3.2,.18],[x,1.6,-8.7],p.dark);box(group,[2.6,2.9,.08],[x,1.5,-8.5],p.stone);box(group,[.035,2.9,.1],[x,1.5,-8.4],p.dark);box(group,[.55,.28,.1],[x,3.4,-8.5],p.cyan);}
   cylinder(group,.12,4,[-10,2,5]);box(group,[.45,.4,1],[-10,4.1,5],p.white);cylinder(group,.13,.2,[-10,4.1,5.55],p.dark).rotation.x=Math.PI/2;
   tree(group,10,0,5,1.2);tree(group,-10,0,-6,1);
   route([[-6,1.6,-3],[0,1.5,4],[2,1.4,1],[6,1.5,-6]]);
   node('ลงทะเบียนผู้มาติดต่อ','Visitor QR',[-6,2,-3],0);node('ตรวจสิทธิ์เข้าออก','Access control',[2,1.8,1],1);node('เลือกชั้นที่อนุญาต','Destination · L8',[7,3.7,-8],2);node('กล้องเชื่อมเหตุการณ์','CCTV · Event timeline',[-10,4.5,5],3);
 }else if(key==='parking'){
   const asphalt=mat(0x56666d);box(group,[24.7,.025,17.6],[0,.02,0],asphalt);
   for(const x of [-9,-5,-1,3,7])for(const z of [-5,5]){
    for(const dx of [-1.7,1.7])box(group,[.06,.03,4.8],[x+dx,.055,z],p.white);
    box(group,[3.4,.03,.06],[x,.055,z-2.4],p.white);
    if(z===-5||x===-5){box(group,[2.6,.7,4],[x,.6,z],x===3?p.white:p.blue);box(group,[2.3,.7,2],[x,1.23,z-.1],p.glass);for(const dx of [-1.25,1.25])for(const dz of [-1.3,1.3])cylinder(group,.38,.22,[x+dx,.4,z+dz],p.dark).rotation.z=Math.PI/2;}
   }
   for(const x of [3,7]){box(group,[.7,1.5,.5],[x,.75,7.6],p.white);box(group,[.45,.55,.1],[x,1.1,7.9],p.cyan);pipe(group,[[x+.4,1,8],[x+1,.6,8],[x+.7,.2,7]],0x1f323b,.055);}
   box(group,[.6,1.2,.6],[-10,.6,0],p.white);const barrier=box(group,[4,.13,.15],[-7.9,1.3,0],p.red);moving.push({mesh:barrier,kind:'barrier'});
   route([[-10,.15,0],[-2,.15,0],[7,.15,0],[7,.15,4.8]]);
   node('อ่านป้ายทะเบียน','LPR · Vehicle entry',[-10,2,0],0);node('นำทางช่องจอด','Available bay',[0,1.8,4],1);node('ชาร์จรถไฟฟ้า','EV · Load balancing',[7,2.1,7],2);node('จบการเดินทาง','Exit + Billing',[-5,1.8,-5],3);
 }else if(key==='plant'){
   for(const x of [-7,0,7]){
    box(group,[5.5,.25,4],[x,.15,0],p.dark);
    for(const z of [-.9,1]){const shell=cylinder(group,.68,4.7,[x,1.1,z],p.blue,20);shell.rotation.z=Math.PI/2;for(const dx of [-2.2,2.2])cylinder(group,.75,.18,[x+dx,1.1,z],p.stone,16).rotation.z=Math.PI/2;}
    box(group,[2,1.2,1.2],[x,2.2,0],p.white);box(group,[.7,.6,.1],[x+.2,2.25,.7],p.dark);const light=box(group,[.5,.35,.03],[x+.2,2.3,.77],p.cyan.clone());if(x===7)incidentMeshes.push(light);
    pipe(group,[[x,1.2,-1],[x,3.4,-2.2],[x,3.4,-5.5]],0x559dbd,.15);
    pipe(group,[[x,1.1,1],[x,2.8,3],[x,2.8,5.5]],0xba8873,.15);
    for(const z of [-5.5,5.5]){cylinder(group,.5,.8,[x,.55,z],p.dark);box(group,[1.2,.25,1.2],[x,.1,z],p.stone);pipe(group,[[x,.7,z],[x,2.8,z],[x+1,2.8,z]],z<0?0x559dbd:0xba8873,.15);}
   }
   pipe(group,[[-10,3.4,-5.5],[0,3.4,-5.5],[10,3.4,-5.5]],0x559dbd,.2);pipe(group,[[-10,2.8,5.5],[0,2.8,5.5],[10,2.8,5.5]],0xba8873,.2);
   equipment(-10,-7);route([[7,2.8,0],[7,3.6,-5.5],[0,3.6,-5.5],[0,2.8,0]],0xe5b284);
   node('Chiller 03','ตรวจสภาพเครื่อง',[7,3,0],0);node('วิเคราะห์ความผิดปกติ','ΔT · 9.8°C',[7,4,-5],1);node('วงจรน้ำเย็น','Supply / Return',[0,3.3,5.5],2);node('ระบบสำรอง','Chiller 02',[0,3,0],3);
 }
 const focus=new THREE.Mesh(new THREE.RingGeometry(.8,1,32),new THREE.MeshBasicMaterial({color:0x69d8dd,side:THREE.DoubleSide,transparent:true,opacity:.65,depthWrite:false}));focus.rotation.x=-Math.PI/2;group.add(focus);
 function setStage(stage){const active=nodes.find(n=>n.stage===stage)||nodes.at(-1);focus.position.set(active.pos[0],.09,active.pos[2]);moving.forEach(o=>{if(o.kind==='gate')o.mesh.rotation.y=stage>=1?1.2:0;else o.mesh.rotation.z=stage>=1?-.85:0;});}
 function animate(time,reduced){flows.forEach(f=>f.mesh.position.copy(f.curve.getPointAt(((reduced?0:time*.09)+f.offset)%1)));}
 function setIncident(snapshot){
  const colors={critical:0xe6857e,warning:0xe8bd72,normal:0x72d9bd};
  screens.forEach(({system,status,bars})=>{const issue=snapshot.records.find(r=>r.system===system&&r.status!=='resolved');const color=colors[issue?issue.severity:'normal'];status.material.color.setHex(color);bars.forEach(b=>b.material.color.setHex(color));});
  incidentMeshes.forEach(m=>{const issue=snapshot.records.find(r=>r.system===key&&r.status!=='resolved');m.material.color.setHex(colors[issue?issue.severity:'normal']);});
 }
 return {group,nodes,setStage,animate,setIncident};
}
