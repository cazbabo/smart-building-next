import * as T from 'three';
import {architecture} from './architecture.js';
const cube=new T.BoxGeometry(1,1,1);
const M=(c,extra={})=>new T.MeshStandardMaterial({color:c,roughness:.55,...extra});
export function createCity(){
 const root=new T.Group(),buildings=new T.Group(),layers=new T.Group();root.add(buildings,layers);
 const colors={ivory:M('#f7f5f6'),stone:M('#d9d8c5'),glass:M('#517786',{metalness:.32,roughness:.27}),dark:M('#665e70'),bronze:M('#aa8a68',{metalness:.35,roughness:.45}),road:M('#697e85'),line:M('#ffffff'),green:M('#92ac7e'),leaf:M('#88a56a'),lime:M('#c7ff3d'),orchid:M('#c044d9'),water:M('#41b5c2',{metalness:.35,roughness:.18}),plum:M('#52205e'),warning:M('#f2b84b')};
 const assets={},originals=[],sensors=[],paths=[],silos=[],energyBars=[],tiles=[];
 function box(g,w,h,d,x,y,z,m=colors.ivory){const a=new T.Mesh(cube,m);a.scale.set(w,h,d);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;g.add(a);return a;}
 function cyl(g,r,h,x,y,z,m,segments=20){const a=new T.Mesh(new T.CylinderGeometry(r,r,h,segments),m);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;g.add(a);return a;}
 function asset(id,x,z){const g=new T.Group();g.position.set(x,0,z);g.userData.asset=id;buildings.add(g);if(!assets[id])assets[id]=g;return g;}
 function tile(g,w,d,x,z){let a=box(g,w,.65,d,x,.05,z,colors.ivory);a.renderOrder=-8;tiles.push(a);box(g,w-.35,.1,d-.35,x,.42,z,colors.stone).renderOrder=-7;}
 function tree(g,x,z,scale=1){cyl(g,.09,1.5,x,1.25,z,colors.bronze,5);let a=new T.Mesh(new T.SphereGeometry(.85,16,12),colors.leaf);a.position.set(x,2.3,z);a.scale.set(scale,1.3*scale,scale);a.castShadow=true;g.add(a);}
 function grove(g,x,z,n,axis='x'){for(let i=0;i<n;i++)tree(g,x+(axis==='x'?i*2.3:0),z+(axis==='z'?i*2.3:0),.8+(i%3)*.1);}
 function roofGarden(g,w,d,y){box(g,w,.18,d,0,y,0,colors.green);for(let i=0;i<3;i++){box(g,w/4,.4,1.2,-w/3+i*w/3,y+.25,-d/3,colors.stone);let a=new T.Mesh(new T.SphereGeometry(.6,8,5),colors.leaf);a.scale.x=2;a.position.set(-w/3+i*w/3,y+.65,-d/3);g.add(a);}}
 function tower(g,x,z,w,d,floors,variant=0){const t=new T.Group();t.position.set(x,.5,z);g.add(t);const h=floors*2.5;
  box(t,w+1.4,.6,d+1.4,0,.3,0,colors.ivory);for(let f=0;f<floors;f++)box(t,w-.4,2.28,d-.4,0,1.95+f*2.5,0,colors.glass);
  for(let f=0;f<=floors;f++)box(t,w+.3,.20,d+.3,0,.8+f*2.5,0,colors.ivory);
  for(let j=-w/2;j<=w/2+.01;j+=w/5){for(const dz of [-d/2,d/2])box(t,.14,h,.28,j,h/2+.7,dz,variant===1?colors.bronze:colors.ivory);}
  for(let k=-d/2;k<=d/2+.01;k+=d/4){for(const dx of [-w/2,w/2])box(t,.28,h,.12,dx,h/2+.7,k,variant===1?colors.bronze:colors.ivory);}
  box(t,w+.8,.45,d+.8,0,h+1,0,colors.ivory);roofGarden(t,w-.8,d-.8,h+1.25);
  box(t,w*.36,1.5,d*.32,w*.12,h+2,0,colors.stone);
  // Thin roof canopy and open columns produce an architectural crown.
  for(const dx of [-w*.38,w*.38])for(const dz of [-d*.36,d*.36])box(t,.16,1.9,.16,dx,h+2.2,dz,colors.bronze);
  box(t,w+.7,.22,d*.42,0,h+3.15,-d*.26,colors.ivory);
  // Recessed arrival lobby, entrance canopy and a planted terrace.
  box(t,w*.7,.16,2.1,0,2.45,d/2+.65,colors.ivory);
  for(const dx of [-w*.29,w*.29])box(t,.13,2.1,.13,dx,1.22,d/2+1.25,colors.bronze);
  box(t,1.8,1.9,.1,0,1.38,d/2+.04,colors.dark);
  box(t,.055,1.9,.12,0,1.38,d/2+.11,colors.bronze);
  for(let i=0;i<2;i++)box(t,w*.74,.14,1.1+i*.5,0,.25-i*.13,d/2+1,colors.stone);
  if(variant===1){for(let f=1;f<floors;f++){box(t,w+.65,.09,.65,0,.86+f*2.5,d/2+.1,colors.bronze);}}
  return t;
 }
 const A=architecture({box,cyl,tree,colors});
 // Chamfered presentation plinth, waterway and a connected street grid.
 const shape=new T.Shape();[[-48,-32],[-44,-36],[44,-36],[48,-32],[48,32],[44,36],[-44,36],[-48,32]].forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
 const geo=new T.ExtrudeGeometry(shape,{depth:1.3,bevelEnabled:true,bevelSize:.45,bevelThickness:.25,bevelSegments:2,steps:1});geo.rotateX(-Math.PI/2);
 const base=new T.Mesh(geo,colors.ivory);base.position.y=-1.8;base.receiveShadow=true;base.renderOrder=-30;root.add(base);
 box(root,95,.1,71,0,-.3,0,colors.road).renderOrder=-29;
 // Faceted terrain under the city, inspired by a landscaped island model.
 const rim=[[-48,-32],[-44,-36],[44,-36],[48,-32],[48,32],[44,36],[-44,36],[-48,32]];const cliffColors=['#7b9291','#a9ad95','#627c80','#bcc3a3'];
 const perimeter=[];for(let j=0;j<rim.length;j++){const a=rim[j],b=rim[(j+1)%rim.length];for(let i=0;i<4;i++)perimeter.push([a[0]+(b[0]-a[0])*i/4,a[1]+(b[1]-a[1])*i/4]);}
 for(let i=0;i<perimeter.length;i++){const [x,z]=perimeter[i],[nx,nz]=perimeter[(i+1)%perimeter.length];const depth=8+(i%3)*1.2;const positions=[x,-1.6,z,nx,-1.6,nz,(x+nx)*.48,-depth,(z+nz)*.48,x,-1.6,z,(x+nx)*.48,-depth,(z+nz)*.48,x*.94,-depth-.6,z*.94,nx,-1.6,nz,nx*.94,-8-((i+1)%3)*1.2-.6,nz*.94,(x+nx)*.48,-depth,(z+nz)*.48];const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();const cliff=new T.Mesh(geometry,M(cliffColors[i%4],{side:T.DoubleSide,flatShading:true}));cliff.renderOrder=-31;root.add(cliff);}

 for(const x of [-14,14]){box(root,.12,.02,69,x,.01,0,colors.line).renderOrder=-25;for(let z=-31;z<32;z+=3)box(root,.14,.025,1.3,x+1,.02,z,colors.line).renderOrder=-24;}
 for(const z of [-7,15]){box(root,94,.03,.13,0,.015,z,colors.line).renderOrder=-25;for(let x=-44;x<44;x+=3)box(root,1.2,.025,.13,x,.02,z+.8,colors.line).renderOrder=-24;}
 const water=asset('water',34,0);const waterSurface=box(water,12,.2,68,0,-.04,0,colors.water);waterSurface.renderOrder=-23;
 for(const x of [-6.4,6.4])box(water,.55,.7,69,x,.3,0,colors.ivory);
 for(let z=-31;z<33;z+=4)box(water,6,.025,.055,(z%3)-1,.075,z,colors.line);
 // Bridges, handrails and walking decks.
 for(const z of [-7,15]){box(root,18,.7,5,34,.75,z,colors.ivory);box(root,18,.06,3.5,34,1.15,z,colors.road);for(const dz of [-2.25,2.25]){box(root,18,.09,.09,34,2.2,z+dz,colors.bronze);for(let x=26;x<=42;x+=2)box(root,.09,1.1,.09,x,1.65,z+dz,colors.bronze);}}
 const office=asset('office',-29,-21);tile(office,25,23,0,0);A.sculpted(office,-5,-2,4,4.2,11,0);A.sculpted(office,6,3,3.3,3.5,8,1);grove(office,-9,9,8);
 // Stepped workplace campus with a deep planted terrace.
 const work=asset('office',0,-21);tile(work,22,23,0,0);A.sculpted(work,-4,-1,3.6,4.2,10,2);A.sculpted(work,5,3,2.7,3.1,7,1);grove(work,-8,9,7);
 const homes=asset('residence',-29,4);tile(homes,25,15,0,0);A.villa(homes,-6,0,A.P.mint,1.18);A.villa(homes,5,0,A.P.cream,1.18);grove(homes,-10,6,9);
 const publicG=asset('hub',0,3);tile(publicG,22,14,0,0);
 // Low civic pavilion: elliptical roof, glass drum, architectural colonnade.
 const drum=cyl(publicG,5.3,3.2,0,2.2,0,colors.glass,48);drum.scale.z=.68;
 for(let i=0;i<16;i++){const a=i*Math.PI/8;box(publicG,.16,3.7,.16,Math.cos(a)*5.4,2.35,Math.sin(a)*3.7,colors.ivory);}
 const roof=cyl(publicG,6.5,.34,0,4.4,0,colors.ivory,48);roof.scale.z=.73;
 const greenRoof=cyl(publicG,4.8,.08,0,4.62,0,colors.green,48);greenRoof.scale.z=.65;
 for(let i=0;i<3;i++)box(publicG,2,.12,1.1,-2+i*2,4.75,0,colors.glass);
 const park=asset('park',1,26);tile(park,25,14,0,0);A.garden(park);
 const res2=asset('residence',-30,26);tile(res2,23,14,0,0);A.villa(res2,-5,0,A.P.peach,1.2);A.villa(res2,5,0,A.P.mint,1.1);grove(res2,-9,5.7,8);
 // Riverside utility / public-service blocks, kept low for overlay legibility.
 const utility=asset('water',21,-20);tile(utility,9,23,0,0);box(utility,6,3.5,11,0,2.2,0,colors.ivory);box(utility,6.4,.25,11.4,0,4.1,0,colors.stone);for(let z=-4;z<=4;z+=2)box(utility,4.5,.15,1.1,0,4.3,z,colors.glass);grove(utility,-3,8,3);
 const promenade=asset('park',21,4);tile(promenade,9,14,0,0);grove(promenade,-2,-4,5,'z');
 const leisure=asset('residence',21,26);tile(leisure,9,14,0,0);const waterfront=A.terrace(leisure,0,-1,3,A.P.peach);waterfront.scale.x=.68;
 const far=asset('park',44,0);for(let z=-29;z<=31;z+=4)tree(far,0,z,.75);
 for(const z of [22,28]){box(root,4,.24,.7,30,.35,z,A.P.sand);A.boat(root,33,z,.15);A.boat(root,37,z+2,-.1);}
 // Shaded pocket squares and flower beds add scale along the waterfront.
 for(let z=-27;z<32;z+=8){box(root,1.7,.35,1,43,.45,z,A.P.cream);box(root,1.5,.15,.8,43,.7,z,A.P.grass);}
 const traffic=asset('traffic',14,6);
 for(let i=0;i<8;i++){const x=-41+i*8,z=-7;const g=new T.Group();g.position.set(x,.35,z);root.add(g);box(g,1.7,.45,.85,0,.22,0,i%3?colors.ivory:colors.orchid);box(g,.9,.32,.72,-.08,.58,0,colors.glass);originals.push({g,x,z});}
 for(let i=0;i<5;i++){const g=new T.Group();g.position.set(-14,.35,-27+i*12);g.rotation.y=Math.PI/2;root.add(g);box(g,1.7,.45,.85,0,.22,0,colors.ivory);box(g,.9,.32,.7,0,.58,0,colors.glass);}
 // Sensor hardware: poles, cabinets and restrained coverage rings.
 const locations={water:[27,1,5],traffic:[14,1,-7],park:[5,1,26],office:[-34,32,-23],hub:[0,5,3]};
 for(const [id,pos] of Object.entries(locations)){const g=new T.Group();g.position.set(...pos);g.userData.asset=id;layers.add(g);cyl(g,.12,2.8,0,1.3,0,colors.dark,8);box(g,.8,.5,.65,0,2.7,0,colors.ivory);cyl(g,.3,.16,0,3.05,0,colors.lime,16);
 const ring=new T.Mesh(new T.RingGeometry(1.2,1.38,40),new T.MeshBasicMaterial({color:'#a8e629',side:T.DoubleSide,transparent:true,opacity:.8,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.05;g.add(ring);sensors.push({id,g,ring});}
 // The seven source silos retain their district location as connections form.
 const siloPositions=[[-35,37,-22],[-11,11,1],[13,10,-7],[-2,26,-21],[0,12,4],[26,11,6],[-24,17,25]];
 for(let i=0;i<7;i++){const g=new T.Group();g.position.set(...siloPositions[i]);layers.add(g);box(g,4.4,.3,3.2,0,0,0,colors.ivory);box(g,3.8,.08,2.6,0,.2,0,colors.orchid);for(let j=0;j<3;j++)box(g,2.3,.12,.15,0,.3,-.8+j*.7,colors.ivory);silos.push(g);
 const points=[new T.Vector3(...siloPositions[i]),new T.Vector3(siloPositions[i][0],7,siloPositions[i][2]),new T.Vector3(0,7,3)];const curve=new T.CatmullRomCurve3(points);const path=new T.Mesh(new T.TubeGeometry(curve,20,.075,5,false),colors.lime);layers.add(path);paths.push(path);}
 const platform=new T.Group();platform.position.set(0,7,3);layers.add(platform);for(let i=0;i<3;i++){const m=colors.ivory.clone();m.transparent=true;m.opacity=.88;box(platform,13-i*1.5,.3,9-i,i*.1,i*1.5,0,m);box(platform,12-i*1.5,.07,.18,0,i*1.5+.2,3.8-i*.5,i===2?colors.orchid:colors.lime);}
 const floodM=new T.MeshBasicMaterial({color:'#8c81d5',transparent:true,opacity:.28,depthWrite:false,side:T.DoubleSide});const flood=box(layers,18,.08,21,25,1.25,4,floodM);const prediction=box(layers,26,.08,29,22,4,4,floodM.clone());prediction.material.opacity=.20;
 const route=new T.Group();layers.add(route);for(const [w,d,x,z] of [[1,26,14,2],[38,1,-4,-10],[1,9,-23,-6]])box(route,w,.07,d,x,1.32,z,colors.lime);
 const air=new T.Group();layers.add(air);for(let i=0;i<3;i++){const m=new T.MeshBasicMaterial({color:i===2?'#f2b84b':'#c044d9',transparent:true,opacity:.09+i*.03,side:T.DoubleSide,depthWrite:false});const disc=new T.Mesh(new T.CircleGeometry(5+i*3,48),m);disc.rotation.x=-Math.PI/2;disc.position.set(1,.85+i*.02,26);air.add(disc);}
 for(const [x,z,h] of [[-29,-21,35],[0,-21,30]]){const b=box(layers,1.4,1,1.4,x+8,h,z,colors.lime.clone());energyBars.push(b);}
 const warning= new T.Mesh(new T.OctahedronGeometry(.85),colors.warning);warning.position.set(25,5,5);layers.add(warning);
 const history=box(layers,24,.06,16,-29,.9,4,new T.MeshBasicMaterial({color:'#c044d9',transparent:true,opacity:.15,depthWrite:false}));
 // Contextual overlays use the same deterministic story state as the UI.
 const trafficLayer=new T.Group();layers.add(trafficLayer);const trafficMaterial=colors.lime.clone();
 for(let x=-30;x<20;x+=10)box(trafficLayer,8,.08,2,x,1.35,-7,trafficMaterial);
 const incident=new T.Mesh(new T.OctahedronGeometry(.8),colors.warning.clone());layers.add(incident);
 const rain=new T.Group();layers.add(rain);const rainMaterial=new T.LineBasicMaterial({color:'#a9b9d0',transparent:true,opacity:.5});
 for(let i=0;i<38;i++){const x=20+(i*7%17),z=-5+(i*11%23),y=7+(i%7);const geo=new T.BufferGeometry().setFromPoints([new T.Vector3(x,y,z),new T.Vector3(x-.15,y-1.4,z)]);rain.add(new T.Line(geo,rainMaterial));}
 const transient=[...silos,...paths,platform,flood,prediction,route,air,warning,history,trafficLayer,incident,rain,...energyBars];
 const fadeMaterials=[];transient.forEach(g=>g.traverse(o=>{if(o.material){o.material=o.material.clone();o.userData.baseOpacity=o.material.opacity;fadeMaterials.push(o);}}));
 const materialGroups=[];
 buildings.children.forEach(g=>{const cache=new Map();g.traverse(o=>{if(o.isMesh){const old=o.material;if(!cache.has(old)){const m=old.clone();cache.set(old,m);materialGroups.push({material:m,base:old.color.clone(),asset:g.userData.asset});}o.material=cache.get(old);}});});
 function update(s){
  const shouldFocus=[3,4,5,6].includes(s.index);
  materialGroups.forEach(({material,base,asset})=>material.color.copy(base).lerp(new T.Color('#f4f0f6'),shouldFocus && asset!==s.focus ? .12 : 0));
  waterSurface.position.y=-.04+s.flood*.38;
  rain.visible=s.flood>.12;
  trafficLayer.visible=s.index===5&&s.useIndex===1;trafficLayer.children.forEach(o=>o.material.color.set(s.traffic==='High'?'#e05262':s.traffic==='Medium'?'#f2b84b':'#a8e629'));
  incident.visible=s.index===5&&[1,4].includes(s.useIndex);
  incident.position.set(...(s.useIndex===4?[0,7,3]:[14,4,-7]));incident.material.color.set(s.incident==='Resolved'?'#a8e629':'#f2b84b');

  silos.forEach((g,i)=>{g.visible=s.index===1||s.index===2;g.scale.setScalar(s.index===2?1-.35*s.local:1);});
  paths.forEach((g,i)=>g.visible=s.index===2&&s.local>(i/10)||s.index===7);
  platform.visible=s.index===2||s.index===7;
  sensors.forEach(({g,ring},i)=>{g.visible=s.index!==1&&(s.index!==4||s.local>i*.13);ring.scale.setScalar(s.index===4?1+s.local*1.5:1);});
  flood.visible=s.flood>0;flood.scale.x=18*(.35+.65*s.flood);flood.material.opacity=.12+s.flood*.18;
  prediction.visible=s.index===6&&s.forecast>0;prediction.scale.x=26*(.5+.5*s.forecast);prediction.scale.z=29*(.4+.6*s.forecast);
  warning.visible=s.flood>.35||s.index===6;
  route.visible=(s.index===5&&[0,1].includes(s.useIndex)&&s.u>.4)||(s.index===6&&s.local>.6);
  air.visible=s.index===5&&s.useIndex===2;energyBars.forEach((b,i)=>{b.visible=s.index===5&&s.useIndex===3||s.index===6&&s.local>.8;b.scale.y=3+(i===0?(s.energy-420)/16:2);b.material.color.set(i===0?'#c044d9':'#c7ff3d');});
  history.visible=s.index===3;history.position.y= .9 + (s.local>.55?Math.sin(s.local*7)*.15:0);
  const phase=s.index===5?s.u:s.local;const edge=Math.min(1,phase/.13,(1-phase)/.10);fadeMaterials.forEach(o=>{o.material.transparent=edge<1||o.userData.baseOpacity<1;o.material.opacity=o.userData.baseOpacity*Math.max(0,edge);});
  originals.forEach(({g,x,z},i)=>{g.position.x=x+Math.sin(s.p*17+i)*1.8;g.position.z=z;});
 }
 root.updateMatrixWorld(true);return {root,assets,locations,update};
}
