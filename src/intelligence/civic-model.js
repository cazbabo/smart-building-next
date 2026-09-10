import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createCivicMotion} from './civic-motion.js';
import {KitPlacer} from './kenney-kit.js';
// Stable per-position variety: the same city must come back on every reload, and
// the offline poster has to match what the browser draws.
const hash=(...seed)=>{let h=0x9e3779b9;for(const v of seed)h=Math.imul(h^Math.round(v*16),0x27d4eb2d);h^=h>>>15;return (h>>>0)/4294967296;};
const pick=(list,...seed)=>list[Math.floor(hash(...seed)*list.length)%list.length];
const cube=new T.BoxGeometry(1,1,1),softCube=new RoundedBoxGeometry(1,1,1,2,.06),crownGeometry=new T.SphereGeometry(1,12,8);
const material=(color,more={})=>new T.MeshStandardMaterial({color,roughness:.65,...more});
export function createCivicCity(kit=null){
 const root=new T.Group(),assets={},locations={},overlays=new T.Group(),rotors=[],vehicles=[],gates=[];root.add(overlays);
 const placer=kit&&new KitPlacer(kit);
 const LANE=5.4;   // one road tile, in world units
 // Architecture uses real building materials. Lime and orchid are the site's
 // identity and stay on the layer that carries it - data routes, forecast
 // overlays and the command center's screens - so the city itself is never
 // painted in them.
 const p={white:material('#f2efe9'),stone:material('#d9d5cc'),edge:material('#bdb8ae'),glass:material('#54798a',{metalness:.38,roughness:.22}),blue:material('#5d7f99'),deep:material('#3b4148'),teal:material('#7f8f97'),road:material('#8c8c8e'),mark:material('#f4f3f0'),grass:material('#7ea05c'),leaf:material('#3f7043'),leaf2:material('#8fb865'),wood:material('#a8834f'),roof:material('#8f5a4a'),water:material('#3f8fa8',{metalness:.2,roughness:.28}),solar:material('#20344f',{metalness:.3,roughness:.27}),lime:material('#C7FF3D'),orchid:material('#C044D9'),warning:material('#edb64c')};
 function box(g,w,h,d,x,y,z,m=p.white){const a=new T.Mesh(cube,m);a.scale.set(w,h,d);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;g.add(a);return a;}
 function cylinder(g,r,h,x,y,z,m=p.stone,n=20){const a=new T.Mesh(new T.CylinderGeometry(r,r,h,n),m);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;g.add(a);return a;}
 function sphere(g,r,x,y,z,m=p.leaf,s=[1,1,1]){const a=new T.Mesh(new T.SphereGeometry(r,12,8),m);a.position.set(x,y,z);a.scale.set(...s);a.castShadow=true;g.add(a);return a;}
 function tube(g,points,r,m){const curve=new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v)));const a=new T.Mesh(new T.TubeGeometry(curve,24,r,6,false),m);g.add(a);return a;}
 function tree(g,x,z,s=1){
  if(placer){const model=pick(kit.group('trees'),g.position.x+x,g.position.z+z);
   placer.place(model,{owner:g,x,y:.5,z,scale:3.3*s/model.height,rotation:pick([0,1,2,3],g.position.x+x,g.position.z+z,7)*Math.PI/2});return;}
  cylinder(g,.11*s,1.5*s,x,.75*s+.6,z,p.wood,6);for(const [i,[dx,dy,dz,r]] of [[0,0,0,.85],[-.4,-.3,.2,.6],[.35,-.35,-.25,.62]].entries()){const a=new T.Mesh(crownGeometry,i===1?p.leaf2:p.leaf);a.position.set(x+dx*s,2.25*s+.5+dy*s,z+dz*s);a.scale.set(r*s,r*s*1.15,r*s);a.castShadow=true;g.add(a);}}
 function softBox(g,w,h,d,x,y,z,m=p.white){const a=new T.Mesh(softCube,m);a.scale.set(w,h,d);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;g.add(a);return a;}
 function grove(g,x,z,n,axis='x'){for(let i=0;i<n;i++)tree(g,x+(axis==='x'?i*2:0),z+(axis==='z'?i*2:0),.8+(i%3)*.12);}
 function district(id,x,z,w,d,label){const g=new T.Group();g.position.set(x,0,z);g.userData.asset=id;root.add(g);assets[id]=g;locations[id]=[x,6,z];g.name=label;softBox(g,w,.55,d,0,.05,0,p.white).renderOrder=-20;box(g,w-.5,.12,d-.5,0,.38,0,p.grass).renderOrder=-19;
  // Plant the platform margin. Each district's own content sits in the middle,
  // so the outer strip is otherwise bare lawn and reads as unbuilt ground.
  if(placer)for(const [ex,ez] of edgePlots(w,d))tree(g,ex,ez,.7+hash(x+ex,z+ez)*.55);
  return g;}
 // Positions around the platform edge, skipping the middle of each side so the
 // entrances the districts build there stay clear.
 function edgePlots(w,d){
  const plots=[],ix=w/2-1.5,iz=d/2-1.5;
  for(let t=-ix;t<=ix;t+=2.6){if(Math.abs(t)<w*.18)continue;plots.push([t,-iz],[t,iz]);}
  for(let t=-iz+2.6;t<iz;t+=2.6){if(Math.abs(t)<d*.2)continue;plots.push([-ix,t],[ix,t]);}
  return plots;
 }
 function windows(g,w,d,h,x=0,z=0,base=.6){for(let f=0;f<h;f++){const y=base+1.25+f*2.2;for(let xx=-w/2+.9;xx<w/2-.4;xx+=1.65){box(g,.95,1.15,.07,x+xx,y,z+d/2+.05,p.glass);box(g,.95,1.15,.07,x+xx,y,z-d/2-.05,p.glass);}for(let zz=-d/2+.9;zz<d/2-.4;zz+=1.65)for(const side of [-1,1])box(g,.07,1.15,.95,x+side*(w/2+.05),y,z+zz,p.glass);}}
 function block(g,w,d,floors,x=0,z=0,m=p.white){
  // With a kit loaded the generic slab becomes a cluster of Kenney buildings
  // filling the same rectangle, so every landmark around it keeps its position.
  if(placer){
   const nx=Math.max(1,Math.round(w/4.2)),nz=Math.max(1,Math.round(d/4.2));
   const stepX=w/nx,stepZ=d/nz,cell=Math.min(stepX,stepZ)*.92;
   const base=floors<=1&&w<9?'houses':'blocks';
   for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){
    // Local to the district group; the seed uses world position so the same
    // building never lands twice in the same spot across reloads.
    const lx=x+(i+.5-nx/2)*stepX,lz=z+(j+.5-nz/2)*stepZ;
    const wx=g.position.x+lx,wz=g.position.z+lz;
    const r=hash(wx,wz),r2=hash(wz,wx,3),r3=hash(wx,wz,7);
    // An even grid of same-sized buildings reads as a toy. Vary height, plan
    // size, colour and offset per plot, leave the odd plot open, and let a few
    // plots take a tower so the skyline is not one flat line.
    if(r<.11){tree(g,lx+(r2-.5)*stepX*.4,lz+(r-.5)*stepZ*.4,.85+r2*.5);continue;}
    const tower=r>.89&&floors>=2;
    const height=(floors*2.35)*(tower?1.9+r2:.72+r*.95)+1.1;
    const plan=cell*(.8+r2*.34);
    // Detailed stock reads at the front of a plot; the rest is low-detail so a
    // denser city does not cost proportionally more triangles.
    const key=tower?'towers':r3<.42?base:base==='houses'?'houses':'fill';
    const model=pick(kit.fit(key,height,plan),wx,wz);
    const px=lx+(r2-.5)*(stepX-plan)*.7,pz=lz+(r-.5)*(stepZ-plan)*.7;
    const turn=pick([0,1,2,3],wx,wz)*Math.PI/2;
    placer.place(model,{owner:g,x:px,y:.5,z:pz,scale:plan/model.footprint,rotation:turn,
     variant:Math.floor(r3*kit.variants)});
    // Awning or parasol against the streetward face of some frontages.
    if(r2>.62&&!tower){
     const trim=pick(kit.group('frontage'),wx,wz,13),reach=plan*.5+trim.depth*plan/trim.footprint*.4;
     placer.place(trim,{owner:g,x:px+Math.sin(turn)*reach,y:.5,z:pz+Math.cos(turn)*reach,
      scale:plan/trim.footprint*.8,rotation:turn,variant:Math.floor(r*kit.variants)});
    }
   }
   return;
  }
  softBox(g,w,floors*2.35,d,x,.65+floors*1.175,z,m);
  for(let f=0;f<floors;f++){
   const y=1.8+f*2.35;
   for(const side of [-1,1]){box(g,w-.8,1.55,.10,x,y,z+side*(d/2+.055),p.glass);box(g,.10,1.55,d-.8,x+side*(w/2+.055),y,z,p.glass);}
   for(let dx=-w/2+.6;dx<w/2;dx+=1.15)for(const side of [-1,1])box(g,.075,1.75,.17,x+dx,y,z+side*(d/2+.12),p.white);
   for(let dz=-d/2+.6;dz<d/2;dz+=1.25)for(const side of [-1,1])box(g,.17,1.75,.075,x+side*(w/2+.12),y,z+dz,p.white);
   softBox(g,w+.65,.18,d+.65,x,.82+(f+1)*2.35,z,p.white);
  }
  softBox(g,w+.8,.26,d+.8,x,.98+floors*2.35,z,p.white);
  // A planted terrace gives the roof a readable edge and scale.
  for(const side of [-1,1]){box(g,w+.35,.4,.15,x,1.24+floors*2.35,z+side*d/2,p.edge);box(g,w-1,.2,.5,x,1.23+floors*2.35,z+side*(d/2-.5),p.leaf);}
  box(g,2.1,1.8,.14,x,1.55,z+d/2+.16,p.deep);softBox(g,3.7,.16,2,x,2.65,z+d/2+.5,p.white);
 }

 function roof(g,w,d,x,y,z){
  if(placer)return;   // Kit buildings carry their own roof; a second one would float.
  const shape=new T.Shape();shape.moveTo(-w/2,0);shape.lineTo(0,1.65);shape.lineTo(w/2,0);shape.closePath();
  const geo=new T.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false,steps:1});geo.translate(0,0,-d/2);
  const a=new T.Mesh(geo,p.roof);a.position.set(x,y,z);a.castShadow=true;g.add(a);
 }

 function path(g,w,d,x,z){box(g,w,.07,d,x,.53,z,p.stone).renderOrder=-17;}
 // A connected road grid and layered, planted district platforms.
 softBox(root,89,1.5,67,0,-.9,0,p.white).renderOrder=-40;box(root,87,.16,65,0,-.1,0,p.road).renderOrder=-35;
 for(const x of [-17,14])for(let z=-29;z<31;z+=3)box(root,.12,.035,1.4,x,.08,z,p.mark).renderOrder=-30;
 for(const z of [-10,13])for(let x=-40;x<42;x+=3)box(root,1.4,.035,.12,x,.08,z,p.mark).renderOrder=-30;
 for(const x of [-17,14])for(const z of [-10,13])for(let i=0;i<5;i++){box(root,.3,.05,2.8,x-1+i*.5,.12,z+3,p.mark);box(root,2.8,.05,.3,x+3,.12,z-1+i*.5,p.mark);}
 const civic=district('civic',-2,1,25,18,'Civic administration');path(civic,22,14,0,0);
 block(civic,15,8,2,0,-1);
 for(const x of [-7.4,7.4])box(civic,.2,.7,8.4,x,6.0,-1,p.white);
 for(const z of [-5,3])box(civic,15,.7,.2,0,6.0,z,p.white);
 // Pediment, colonnade, dome and civic forecourt.
 for(let x=-6;x<=6;x+=1.5){cylinder(civic,.23,3.6,x,2.6,4,p.white,12);cylinder(civic,.35,.22,x,.87,4,p.stone,12);cylinder(civic,.32,.2,x,4.35,4,p.stone,12);}
 box(civic,14,.32,2,0,4.7,4,p.white);for(let i=0;i<4;i++)box(civic,14+i*.8,.15,1.6+i*.6,0,.7-i*.14,5.1,p.stone);
 cylinder(civic,3.1,1.6,0,6,-1,p.white,32);const dome=new T.Mesh(new T.SphereGeometry(3.15,32,16,0,Math.PI*2,0,Math.PI/2),p.stone);dome.position.set(0,6.8,-1);dome.scale.y=.83;civic.add(dome);cylinder(civic,.28,1.7,0,9.7,-1,p.white,12);sphere(civic,.37,0,10.7,-1,p.wood);
 for(let i=0;i<24;i++){const a=i*Math.PI/12;box(civic,.09,1.5,.09,Math.cos(a)*3.15,6.6,-1+Math.sin(a)*3.15,p.deep);}
 cylinder(civic,2.15,.22,0,9.25,-1,p.glass,32);
 box(civic,14,.16,.14,0,4.97,5.06,p.orchid);
 grove(civic,-10,-6,7,'z');grove(civic,10,-6,7,'z');locations.civic=[-2,11,1];
 const tourism=district('tourism',-30,-23,22,18,'Park and tourism');
 const pond=cylinder(tourism,6.7,.18,-1,.55,0,p.water,48);pond.scale.z=.76;pond.renderOrder=-18;
 tube(tourism,Array.from({length:41},(_,i)=>[Math.cos(i*Math.PI/20)*8,.66,Math.sin(i*Math.PI/20)*6]),.5,p.stone);
 grove(tourism,-9,-6,8);grove(tourism,-9,6,8);for(const x of [-9,9])grove(tourism,x,-3,4,'z');
 cylinder(tourism,.9,.22,-1,.7,0,p.white);tube(tourism,[[-1,.8,0],[-1,3.6,0],[-1.7,1.1,.3]],.065,p.white);block(tourism,4,3,1,6,-4);roof(tourism,4.4,3.5,6,3.72,-4);
 const industry=district('industry',-2,-23,25,18,'Industry');path(industry,22,15,0,0);block(industry,11,7,2,-4,1,p.stone);box(industry,12,.25,8,-4,6.0,1,p.deep);
 for(const x of [5,8]){cylinder(industry,1.5,4.3,x,2.6,2,p.white,24);sphere(industry,1.5,x,4.75,2,p.stone,[1,.4,1]);}
 for(const [x,h] of [[-6,10],[-2,12],[2,8]]){cylinder(industry,.6,h,x,h/2+.5,-5,p.stone,16);cylinder(industry,.63,.5,x,h*.8,-5,p.deep,16);}
 tube(industry,[[5,1.5,2],[5,1.5,-2],[-3,1.5,-2],[-3,4,0]],.18,p.teal);grove(industry,-10,7,11);locations.industry=[-2,13,-23];
 const energy=district('energy',29,-23,24,18,'Clean energy');block(energy,6,5,1,-7,3);for(let x=-3;x<=8;x+=3)for(let z=0;z<=5;z+=2.8){const panel=box(energy,2.6,.12,2,x,1.2,z,p.solar);panel.rotation.x=-.22;box(energy,.1,.8,1.2,x,.7,z,p.stone);for(let k=-1;k<=1;k++)box(energy,.025,.025,1.8,x+k*.7,1.4,z,p.glass);}
 for(const x of [-7,1,9]){cylinder(energy,.18,9,x,5,-5,p.white,12);const rotor=new T.Group();rotor.position.set(x,9.5,-5);energy.add(rotor);rotors.push(rotor);sphere(rotor,.35,0,0,0,p.white);for(let i=0;i<3;i++){const arm=new T.Group();arm.rotation.z=i*Math.PI*2/3;rotor.add(arm);softBox(arm,.28,3.6,.12,0,1.6,0,p.white);}}

 locations.energy=[29,12,-23];
 const hospital=district('hospital',29,1,24,18,'Hospital');path(hospital,20,14,0,0);block(hospital,11,7,3,-3,-1);block(hospital,6,11,2,5,0);box(hospital,3,.18,2,-3,1,5,p.white);box(hospital,3,.15,2,-3,3,5,p.teal);box(hospital,.3,1.6,.1,-3,6.4,2.6,p.white);box(hospital,1.2,.3,.12,-3,6.4,2.62,p.white);grove(hospital,-10,6,10);
 for(const x of [-6,-3,0]){box(hospital,1.3,.6,1.7,x,8.7,-2,p.stone);cylinder(hospital,.35,.08,x,9.05,-2,p.deep,12);}
 for(const x of [-8.3,2.3])box(hospital,.15,.55,7,x,8.8,-1,p.white);
 for(const z of [-4.4,2.4])box(hospital,10.6,.55,.15,-3,8.8,z,p.white);
 box(hospital,.45,2,.12,5,6.8,5.68,p.orchid);box(hospital,1.7,.45,.14,5,6.8,5.7,p.orchid);
 locations.hospital=[29,10,1];
 const school=district('school',29,24,24,17,'Education');block(school,10,4,2,-4,-4,p.white);roof(school,11,5,-4,6.0,-4);block(school,5,7,2,7,-1,p.white);roof(school,6,8,7,6.0,-1);
 const track=cylinder(school,5.4,.10,-3,.62,3,p.roof,48);track.scale.z=.65;const field=cylinder(school,4.3,.12,-3,.69,3,p.grass,48);field.scale.z=.65;box(school,6.8,.02,.045,-3,.77,3,p.white);box(school,.045,.02,4,-3,.77,3,p.white);for(const x of [-6.5,.5]){box(school,.07,1.2,1.8,x,1.35,3,p.white);box(school,.7,.07,1.8,x,1.95,3,p.white);}grove(school,-10,-6,8,'z');
 const transit=district('transit',-30,1,22,18,'Transport');path(transit,19,14,0,0);box(transit,13,.3,5,0,3.4,-2,p.blue);for(const x of [-5,0,5])box(transit,.18,3,.18,x,1.9,-2,p.white);box(transit,11,2.2,2,0,1.65,-5,p.white);windows(transit,11,2,1,0,-5);
 function bus(g,x,z){box(g,5,1.5,1.6,x,1.25,z,p.blue);box(g,4.1,.7,1.65,x,1.6,z,p.glass);box(g,5,.14,1.6,x,2.07,z,p.white);for(const dx of [-1.6,1.6])for(const dz of [-.8,.8]){const wheel=cylinder(g,.32,.15,x+dx,.65,z+dz,p.deep,10);wheel.rotation.x=Math.PI/2;}}
 bus(transit,-3,2);bus(transit,4,5);grove(transit,-9,-6,7,'z');
 const water=district('water',-2,24,25,17,'Water and disaster prevention');
 const waterSurface=box(water,22,.22,14,0,.62,0,p.water);waterSurface.renderOrder=-18;
 for(const x of [-9,-4.5,0,4.5,9]){box(water,.9,3,2.5,x,2.1,1,p.stone);box(water,1.8,.32,3.5,x,3.68,1,p.white);}
 box(water,22,.4,2.1,0,3.1,1,p.stone);for(let x=-8;x<=8;x+=4){gates.push(box(water,3.3,1.3,.2,x,1.5,1,p.deep));box(water,3,.1,5,x,.94,5,p.white).material=material('#c0e4e7',{transparent:true,opacity:.7});}
 box(water,23,.3,2,0,3.55,1,p.stone);tube(water,[[-11,4.3,.1],[11,4.3,.1]],.07,p.deep);tube(water,[[-11,4.3,1.9],[11,4.3,1.9]],.07,p.deep);locations.water=[-2,5,24];
 const housing=district('housing',-30,24,22,17,'Neighbourhood');for(const [x,z] of [[-5,-4],[4,-4],[-5,4],[4,4]]){block(housing,5,4,1,x,z,p.white);roof(housing,5.6,4.6,x,3.72,z);tree(housing,x+3,z,.8);}
 // The platform is a visible part of the city story.
 const command=new T.Group();command.position.set(-62,0,1);command.userData.asset='command';root.add(command);assets.command=command;locations.command=[-62,16,1];
 box(command,19,1.2,15,0,.6,0,p.white).renderOrder=-20;box(command,18,.2,14,0,1.3,0,p.stone);box(command,15,9,.65,0,12,-4,p.deep);box(command,14.2,8.2,.12,0,12,-3.63,p.glass);
 // Miniature dashboard, inset city map, chart bars and indicator tiles.
 box(command,13.3,7.4,.06,0,12,-3.52,p.deep);for(let i=0;i<4;i++){box(command,2.6,1.25,.08,-4.8+i*3.15,14.7,-3.44,p.glass);box(command,1.6,.25,.12,-4.8+i*3.15,14.7,-3.35,i===3?p.lime:p.white);}
 for(let x=0;x<5;x++)for(let z=0;z<3;z++)box(command,.95,.5+(x+z)%3*.4,.13,-5+x*1.3,10.3+z*.65,-3.4,(x+z)%2?p.teal:p.glass);
 for(let i=0;i<8;i++)box(command,.55,.7+(i%3)*.8,.12,1+i*.7,9.5+(i%3)*.4,-3.35,i%2?p.lime:p.teal);
 box(command,14,.3,3,0,3.3,0,p.white);for(const x of [-5,0,5]){box(command,2.7,1.7,.18,x,4.3,-.5,p.deep);box(command,2.3,1.35,.09,x,4.3,-.36,p.glass);box(command,.15,2.2,.15,x,2.2,0,p.deep);sphere(command,.4,x,3.8,2.4,p.deep);box(command,.65,1.1,.55,x,2.9,2.4,p.blue);box(command,1.1,.2,1,x,2.1,2.5,p.deep);}
 const sourceNodes=[];for(let i=0;i<6;i++){const x=-69+(i%3)*6,z=14+Math.floor(i/3)*5;const a=cylinder(root,2.8,.35,x,.15,z,p.white,6);a.renderOrder=-20;sourceNodes.push(a);cylinder(root,.65,.18,x,.45,z,i%2?p.glass:p.teal,8);}
 // Landscaped paths, seating and street hardware give the scene human scale.
 for(const [id,g] of Object.entries(assets)){if(id==='command')continue;for(const x of [-7,7]){softBox(g,1.6,.2,.55,x,1,7,p.wood);box(g,.12,.65,.45,x-.5,.7,7,p.deep);box(g,.12,.65,.45,x+.5,.7,7,p.deep);}}
 // Vehicles move individually along the road loop, so they stay real meshes
 // rather than instances. civic-motion.js drives the group and expects the car
 // to face +X; kit cars are modelled nose-along -Z, hence the quarter turn.
 for(let i=0;i<8;i++){
  const car=new T.Group();root.add(car);vehicles.push(car);
  if(placer){
   const model=pick(kit.group('cars'),i,i*7);
   const scale=2.6/model.depth,body=new T.Mesh(model.geometry,model.material);
   body.rotation.y=-Math.PI/2;body.scale.setScalar(scale);body.position.y=-model.base*scale;
   body.castShadow=true;car.add(body);continue;
  }
  softBox(car,2.3,.62,1.1,0,.35,0,i%3?p.white:p.orchid);softBox(car,1.15,.45,.94,-.15,.84,0,p.glass);
  for(const x of [-.75,.75])for(const z of [-.55,.55]){const w=cylinder(car,.24,.13,x,.13,z,p.deep,10);w.rotation.x=Math.PI/2;}
 }
 const risk=new T.Mesh(new T.PlaneGeometry(23,16),new T.MeshBasicMaterial({color:'#F05BB5',transparent:true,opacity:.24,side:T.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));risk.rotation.x=-Math.PI/2;risk.position.set(-2,4.45,22);overlays.add(risk);
 const warning=new T.Mesh(new T.OctahedronGeometry(.8),p.warning);warning.position.set(-2,6.5,24);overlays.add(warning);
 if(placer){
  // A roundabout where two ground streets meet, so the grid has one junction
  // that is not another right angle.
  placer.place(kit.get('roads/road-roundabout'),{owner:root,x:-17,y:.06,z:13,scale:LANE*.92,rotation:0});
 }

 // Street level. The road corridors between platforms carried nothing but paint,
 // which is most of why the city read as a model rather than a place.
 if(placer){
  const ROAD_Y=0;                                  // the road slab top, not the platforms
  const put=(model,px,pz,height,rotation)=>{
   if(!model)return;
   placer.place(model,{owner:root,x:px,y:ROAD_Y,z:pz,scale:height/model.height,rotation});
  };
  const parked=kit.group('cars');
  const kerb=(seed,px,pz,rotation)=>{
   const r=hash(...seed);
   if(r<.26)put(pick(kit.group('signals'),...seed),px,pz,4.3,rotation);
   else if(r<.58)put(pick(kit.group('lamps'),...seed),px,pz,5.2,rotation);
   else if(r<.68)put(pick(kit.group('clutter'),...seed),px,pz,1.7,rotation);
   else{const car=pick(parked,...seed);put(car,px,pz,car.height*(2.6/car.depth),rotation+Math.PI/2);}
  };
  for(const rx of [-17,14])for(let z=-27;z<30;z+=4.5){
   const side=hash(rx,z)<.5?-1:1;
   kerb([rx,z],rx+side*1.6,z,side>0?Math.PI/2:-Math.PI/2);
  }
  for(const rz of [-10,13])for(let x=-38;x<40;x+=4.5){
   const side=hash(x,rz,9)<.5?-1:1;
   kerb([x,rz,9],x,rz+side*1.6,side>0?Math.PI:0);
  }
 }
 placer?.build();
 const motion=createCivicMotion({root,locations,rotors,vehicles,waterSurface,gates,risk,warning});
 motion.setStage('overview');motion.update(0,0,true);root.updateMatrixWorld(true);
 return {root,assets,locations,setStage:motion.setStage,update:motion.update,motion,rotors,vehicles,waterSurface,gates};
}
