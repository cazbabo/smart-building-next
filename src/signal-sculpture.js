import * as THREE from 'three';
export function createSignalSculpture(basic=false){
 const group=new THREE.Group();group.name='BuildingSignals';const particles=[];
 const lime=new THREE.Color(0xb0d233),ice=new THREE.Color(0xe7f3c7);
 for(let i=0;i<52;i++){
  const u=i/51,a=(u-.5)*Math.PI*1.4;
  const points=[];
  for(let j=0;j<7;j++){
   const t=j/6;
   points.push(new THREE.Vector3(Math.sin(a+t*2.2)* (6+Math.sin(t*Math.PI)*6)+(1-t)*-10,17-t*35,Math.cos(a+t*2.2)*(6+Math.sin(t*Math.PI)*4)));
  }
  const curve=new THREE.CatmullRomCurve3(points);
  const color=lime.clone().lerp(ice,u*.75);
  if(basic){const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(30)),new THREE.LineBasicMaterial({color,transparent:true,opacity:.55}));group.add(line);}
  else{
   group.add(new THREE.Mesh(new THREE.TubeGeometry(curve,36,.028,5,false),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.68})));
   group.add(new THREE.Mesh(new THREE.TubeGeometry(curve,30,.105,4,false),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.045,depthWrite:false,blending:THREE.AdditiveBlending})));
  }
  const dot=new THREE.Mesh(new THREE.SphereGeometry(.13,6,4),new THREE.MeshBasicMaterial({color:0xeaf6c8}));group.add(dot);particles.push({dot,curve,offset:u});
 }
 function update(time,progress,reduced){group.rotation.y=-.4+progress*.9+(reduced?0:Math.sin(time*.12)*.1);group.rotation.z=-.18+progress*.12;particles.forEach(p=>p.dot.position.copy(p.curve.getPointAt((p.offset+(reduced?0:time*.065))%1)));}
 return {group,update};
}
