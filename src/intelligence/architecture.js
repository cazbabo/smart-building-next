import * as T from 'three';
const mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.55,...extra});
export function architecture({box,cyl,tree,colors}){
 const P={teal:mat('#157d87',{metalness:.4,roughness:.24}),blue:mat('#376c99',{metalness:.4,roughness:.26}),aqua:mat('#62bbbd',{metalness:.3,roughness:.23}),cream:mat('#f5e5c6'),white:mat('#f8f4e8'),sand:mat('#d5b582'),mint:mat('#9ec8b1'),peach:mat('#dba887'),slate:mat('#3e6775'),path:mat('#dcc99e'),pool:mat('#36b7be',{metalness:.23,roughness:.22}),grass:mat('#6f9958'),leaf:mat('#77a859')};
 const glass=[P.teal,P.blue,P.aqua];
 function line(g,points,r,material){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));const m=new T.Mesh(new T.TubeGeometry(curve,Math.max(16,points.length*3),r,6,false),material);m.castShadow=true;g.add(m);return m;}
 function oval(g,rx,rz,h,y,material,x=0,z=0){const a=cyl(g,1,h,x,y,z,material,32);a.scale.set(rx,1,rz);return a;}
 function rounded(g,rx,rz,h,y,material){const r=.65,shape=new T.Shape();shape.moveTo(-rx+r,-rz);shape.lineTo(rx-r,-rz);shape.quadraticCurveTo(rx,-rz,rx,-rz+r);shape.lineTo(rx,rz-r);shape.quadraticCurveTo(rx,rz,rx-r,rz);shape.lineTo(-rx+r,rz);shape.quadraticCurveTo(-rx,rz,-rx,rz-r);shape.lineTo(-rx,-rz+r);shape.quadraticCurveTo(-rx,-rz,-rx+r,-rz);const geometry=new T.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false,curveSegments:4,steps:1});geometry.rotateX(-Math.PI/2);const m=new T.Mesh(geometry,material);m.position.y=y-h/2;m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
 function sculpted(g,x,z,rx,rz,floors,kind=0){
  const t=new T.Group();t.position.set(x,.55,z);g.add(t);const h=floors*2.35;const floorShape=kind===1?rounded:oval;
  oval(t,rx+1.5,rz+1.5,.45,.2,P.cream);oval(t,rx+1,rz+1,2.4,1.55,glass[kind%3]);oval(t,rx+1.65,rz+1.65,.3,2.9,P.white);
  const profiles=[];
  for(let f=0;f<=floors;f++){const u=f/floors,twist=kind===1?u*.58:kind===2?-.18+u*.32:0;const waist=kind===0?1-.30*Math.sin(u*Math.PI):kind===1?1-.26*u:1-.22*Math.sin(u*Math.PI*1.3);const dx=kind===0?Math.sin(u*Math.PI)*1.7:kind===2?u*u*1.5:0;const ring=new T.Group();ring.position.set(dx,3+f*2.35,0);ring.rotation.y=twist;t.add(ring);floorShape(ring,rx*waist+.12,rz*waist+.12,.13,0,P.white);
   profiles.push({x:dx,y:3+f*2.35,twist,rx:rx*waist,rz:rz*waist});
   if(f<floors){floorShape(ring,rx*waist,rz*waist,2.20,1.17,glass[kind%3]);for(let k=0;k<16;k++){const a=k*Math.PI/8;box(ring,.075,2.2,.075,Math.cos(a)*rx*waist,1.17,Math.sin(a)*rz*waist,P.slate);}}
  }
  // Continuous exterior ribs make the change of silhouette readable.
  for(const a of [Math.PI*.2,Math.PI*.72,Math.PI*1.2,Math.PI*1.72]){line(t,profiles.map(p=>[p.x+Math.cos(a+p.twist)*(p.rx+.15),p.y+.15,Math.sin(a+p.twist)*(p.rz+.15)]),.15,kind===1?P.sand:P.white);}
  const top=profiles.at(-1);const crown=new T.Group();crown.position.set(top.x,top.y+.18,0);crown.rotation.y=top.twist;t.add(crown);oval(crown,top.rx+.4,top.rz+.4,.28,0,P.cream);oval(crown,top.rx-.4,top.rz-.4,.12,.2,P.grass);oval(crown,top.rx*.52,top.rz*.5,.2,.36,P.pool,0,.1);
  for(const a of [0,Math.PI]){const xx=Math.cos(a)*(top.rx-.8);oval(crown,.6,.6,.4,.5,P.leaf,xx,-.6);}
  line(crown,Array.from({length:33},(_,i)=>[Math.cos(i/32*Math.PI*2)*(top.rx+.1),.7,Math.sin(i/32*Math.PI*2)*(top.rz+.1)]),.055,P.sand);
  if(kind===1)cyl(crown,.065,3,0,1.8,0,P.slate,8);
  box(t,2,1.9,.12,0,1.45,rz+1.02,P.slate);box(t,3.8,.16,2,0,2.6,rz+1.3,P.white);
  return t;
 }
 function villa(g,x,z,color=P.mint,scale=1){const t=new T.Group();t.position.set(x,.55,z);t.scale.setScalar(scale);g.add(t);
  box(t,7.3,.35,7.1,0,.05,0,P.cream);box(t,5.8,2.5,4.5,0,1.5,-.6,color);box(t,3.5,2.25,3.6,-.7,3.9,-.9,P.white);box(t,6.15,.2,4.85,0,2.87,-.6,P.white);box(t,3.95,.22,4.0,-.7,5.15,-.9,P.sand);
  for(const dx of [-1.8,0,1.8]){box(t,1.35,1.7,.08,dx,1.48,1.7,P.teal);box(t,.065,1.7,.1,dx,1.48,1.77,P.white);}box(t,2.9,1.6,.09,-.7,3.85,.94,P.blue);
  box(t,2.9,.1,1.7,1.6,.37,2.3,P.pool);for(let i=0;i<4;i++)box(t,.15,1.9,.15,-2.8+i*.9,1.37,2.55,P.sand);box(t,3,.12,1.4,-1.4,2.36,2.1,P.sand);
  box(t,2,.16,1.35,-.7,5.33,-1,P.grass);tree(t,2.7,-2.5,.7);return t;
 }
 function terrace(g,x,z,levels,color=P.peach){const t=new T.Group();t.position.set(x,.5,z);g.add(t);for(let f=0;f<levels;f++){const w=10-f*1.35,d=7-f*.6,y=.5+f*2.5;box(t,w,2.45,d,0,y+1,z?0:0,color);box(t,w+.55,.18,d+.7,0,y+2.25,0,P.white);for(let xx=-w/2+1;xx<w/2;xx+=1.8)box(t,1.2,1.55,.1,xx,y+1.05,d/2+.06,P.teal);box(t,w*.66,.12,1,0,y+2.4,d/2-.5,P.grass);for(let xx=-w/2+.7;xx<w/2;xx+=2.4)oval(t,.42,.32,.4,y+2.62,P.leaf,xx,d/2-.5);}
  box(t,11,.3,8.6,0,.2,0,P.cream);return t;}
 function garden(g){box(g,23,.12,12,0,.48,0,P.grass).renderOrder=-5;
  const pond=new T.Shape();pond.moveTo(-8,0);pond.bezierCurveTo(-8,-5,-2,-5,0,-2);pond.bezierCurveTo(2,0,8,-3,8,1);pond.bezierCurveTo(8,5,2,5,0,3);pond.bezierCurveTo(-3,1,-7,5,-8,0);
  const mesh=new T.Mesh(new T.ShapeGeometry(pond,24),P.pool);mesh.rotation.x=-Math.PI/2;mesh.position.y=.68;mesh.renderOrder=-4;g.add(mesh);
  const loop=Array.from({length:49},(_,i)=>{const a=i/48*Math.PI*2;return [Math.cos(a)*(9.5+.4*Math.sin(a*3)),.68,Math.sin(a)*5.0];});line(g,loop,.43,P.path);
  line(g,[[-11,.7,-2],[-6,.7,-2.5],[0,.7,-4],[5,.7,-3],[11,.7,-4]],.4,P.path);
  box(g,1.65,.22,7.8,1,.91,0,P.sand);for(const x of [.25,1.75])line(g,[[x,1.7,-4],[x,2.1,0],[x,1.7,4]],.05,P.white);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;tree(g,Math.cos(a)*10.7,Math.sin(a)*5.65,.65+(i%3)*.12);}
  for(const [x,z] of [[-5,4],[7,-4]]){oval(g,1.2,1.2,.2,.7,P.cream,x,z);for(let i=0;i<5;i++)box(g,.1,1.8,.1,x-1+i*.5,1.55,z,P.sand);box(g,2.5,.15,1.8,x,2.5,z,P.white);}
 }
 function boat(g,x,z,angle=0){const b=new T.Group();b.position.set(x,.42,z);b.rotation.y=angle;g.add(b);const hull=new T.Mesh(new T.SphereGeometry(1,12,8),P.white);hull.scale.set(.75,.32,1.8);b.add(hull);box(b,.85,.5,1.2,0,.45,.1,P.cream);box(b,.7,.08,.8,0,.75,.15,P.blue);return b;}
 return {sculpted,villa,terrace,garden,boat,P,line,oval};
}
