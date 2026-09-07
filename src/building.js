import * as THREE from 'three';
import {box,cylinder,tree,palette as p,mat} from './model-kit.js';
// Terraced office architecture. Structural slabs and facade are actual geometry.
export function createPremiumBuilding(){
 const group=new THREE.Group();group.name='ONE_TerracedOffice';
 const base=new THREE.Group();group.add(base);
 box(base,[37,.5,29],[0,0,0],p.stone);box(base,[38,.25,30],[0,-.4,0],p.dark);
 for(let i=0;i<3;i++)box(base,[15-i*2,.18,2.1],[1,.12+i*.17,14.5-i*.7],p.edge);
 box(base,[29,5,20],[0,2.7,0],p.glass);
 box(base,[30,.35,21],[0,5.3,0],p.edge);
 // Double-height lobby arcade with bronze reveals and illuminated reception.
 for(let x=-13;x<=13;x+=3.25){box(base,[.15,4.8,.4],[x,2.7,10.1],p.dark);box(base,[2.95,.08,.22],[x+1.5,4.85,10.2],p.warm);}
 box(base,[12,.23,4],[1,4.6,11.5],p.edge);
 for(const x of [-4.7,6.7])cylinder(base,.09,4.4,[x,2.3,13.1],p.dark);
 box(base,[3,3.7,.2],[1,2.2,10.23],p.dark);box(base,[2.7,3.4,.1],[1,2.2,10.4],p.glass);
 const gold=mat(0xc9baa0,{metalness:.5,roughness:.3});
 // Two restrained setbacks make the sky gardens part of the silhouette.
 for(let i=0;i<8;i++){
   const y=5.6+i*3.65, upper=i>=4, w=upper?23.5:28, d=upper?17:20, x=upper?1.5:0;
   box(group,[w+.9,.28,d+.9],[x,y,0],p.edge);
   box(group,[w,3.35,d],[x,y+1.83,0],p.glass);
   box(group,[w,.28,.1],[x,y+3.32,d/2+.04],gold);
   // Regular curtain-wall bays, subtle warm horizontal interior reflection.
   for(let n=0;n<=14;n++){
    const xx=x-w/2+n*w/14;
    box(group,[.085,3.43,.24],[xx,y+1.85,d/2+.08],gold);
    if(n<14 && (n+i)%4===0)box(group,[w/14-.18,.07,.08],[xx+w/28,y+.7,d/2+.13],p.warm);
   }
   for(const side of [-1,1])for(let n=0;n<=10;n++)box(group,[.2,3.43,.075],[x+side*(w/2+.03),y+1.85,-d/2+n*d/10],gold);
   // Rear elevation is modeled as well so Explore is complete.
   for(let n=0;n<=10;n++)box(group,[.09,3.43,.16],[x-w/2+n*w/10,y+1.85,-d/2],p.dark);
   if(i===4){
    box(group,[30,.35,22],[0,y-.06,0],p.edge);
    for(const xx of [-12,-8,-4,0,4,8,12]){box(group,[3,.55,1.45],[xx,y+.32,10],p.dark);tree(group,xx,y+.6,10,.78);}
    for(let z=-8;z<=7;z+=4)tree(group,-13,y+.2,z,.7);
    for(const side of [-1,1])box(group,[.07,.7,21],[side*14.8,y+.65,0],p.glass);
   }
 }
 // Expressive vertical stone blade gives the facade a clear focal point.
 box(group,[1.2,29.5,.6],[-9,20.2,10.3],p.edge);
 box(group,[.14,29.1,.15],[-8.3,20.2,10.65],gold);
 const roof=35.0;
 box(group,[25,.4,19],[1.5,roof,0],p.edge);
 box(group,[9,2.2,5],[4,roof+1.3,-4],p.dark);
 for(let x=.5;x<8;x+=.7)box(group,[.12,2.2,.2],[x,roof+1.3,-1.4],gold);
 for(const x of [-6,-1,4,9])for(const z of [2,6]){
  cylinder(group,.065,1.8,[x,roof+.95,z],p.dark,8);
  const panel=box(group,[4.5,.12,3],[x,roof+1.9,z],mat(0x294c65,{metalness:.7,roughness:.18}));panel.rotation.x=-.14;
  for(let t=-1;t<=1;t++)box(group,[4.4,.012,.024],[x,roof+2,z+t],p.blue);
 }
 for(const x of [-11,12])for(const z of [-6,0,6]){box(group,[1.4,.5,2],[x,roof+.4,z],p.dark);tree(group,x,roof+.6,z,.6);}
 // Landscape and reflecting water provide scale without an enclosing city.
 const water=mat(0x6194a2,{metalness:.55,roughness:.16});box(base,[8,.04,4],[-11,.29,11.4],water);
 for(const [x,z] of [[-16,-10],[-16,-3],[-16,5],[16,-9],[16,-2],[16,7],[11,12]]){box(base,[2.5,.4,2.5],[x,.45,z],p.dark);tree(base,x,.65,z,1.2);}
 return {group};
}
