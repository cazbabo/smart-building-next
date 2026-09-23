import * as T from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {Pass} from 'three/addons/postprocessing/Pass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
// Post-processing: ground-truth ambient occlusion for the contact the bakes
// cannot cover (kit buildings against each other, cars, anything that moves),
// and bloom for the night opening, where the video wall, the data routes and
// the motes should glow against the dark.
//
// Two things the stock pipeline gets wrong for this page, and how they are held:
// - A composer tone-maps once, at the end, so the materials marked
//   toneMapped:false - the brand lime and pink, the dashboard - would come out
//   ACES-shifted, a different lime from the button beside the canvas. The scene
//   is instead rendered into targets flagged the way three flags an XR target,
//   which makes every material tone-map in its own shader exactly as it does
//   when drawing straight to the screen; the last pass then converts to sRGB
//   and nothing else.
// - The canvas is transparent over the page's night layer. Every pass here
//   carries alpha through: GTAO multiplies it by one, bloom adds light over
//   empty sky as glow, the copy passes do not blend.
//
// - Bloom is selective. After tone mapping a white roof is as bright as a lit
//   screen, so a luminance threshold blew the city hall and the command plinth
//   out into glare. Only what emits light - the video wall, consoles, lamps, the
//   data routes, the motes - is drawn into a half-resolution glow buffer, with
//   everything else drawn black so it still hides what is behind it, and only
//   the halo is added back. It runs in the night opening alone.
//
// Quality steps down, never up, if frames arrive slowly: 2 is AO and bloom,
// 1 drops AO and the pixel ratio, 0 renders straight to the canvas with no
// post-processing at all, exactly as the page did before any of this. ?fx=
// high|low|off pins a level for a presenter who knows their machine.

/** GTAO that leaves translucent and self-lit surfaces out of its depth and
 *  normals: the forecast plane and the data routes are overlays, not solids,
 *  and letting them occlude darkened whole districts under them. */
class SolidGTAOPass extends GTAOPass {
 _overrideVisibility(){
  super._overrideVisibility();
  const cache=this._visibilityCache;
  this.scene.traverse(o=>{
   if(!o.isMesh&&!o.isPoints||!o.visible)return;
   const m=o.material;
   if(o.isPoints||m.transparent||m.toneMapped===false||/^(screen|light)/.test(m.name??'')){o.visible=false;cache.push(o);}
  });
 }
}

const glows=m=>m.toneMapped===false||/^(screen|light)/.test(m.name??'');

/** The scene with only light-emitting surfaces in colour and everything else
 *  black: the source the bloom blurs. */
class GlowPass extends Pass {
 constructor(scene,camera){super();this.scene=scene;this.camera=camera;this.needsSwap=false;this.black=new T.MeshBasicMaterial({color:0});}
 render(renderer,writeBuffer,readBuffer){
  const swapped=[],hidden=[];
  this.scene.traverse(o=>{
   if(!o.isMesh||!o.visible||glows(o.material))return;
   if(o.material.transparent){o.visible=false;hidden.push(o);}
   else{swapped.push([o,o.material]);o.material=this.black;}
  });
  const colour=renderer.getClearColor(new T.Color()),alpha=renderer.getClearAlpha();
  renderer.setClearColor(0,0);renderer.setRenderTarget(readBuffer);renderer.clear();
  renderer.render(this.scene,this.camera);
  renderer.setClearColor(colour,alpha);
  for(const [o,m] of swapped)o.material=m;
  for(const o of hidden)o.visible=true;
 }
}

/** Adds the halo to the frame, and lets it raise alpha over empty sky so the
 *  glow reads against the page's night layer behind the canvas. */
const MixShader={
 uniforms:{tDiffuse:{value:null},tBloom:{value:null}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
 fragmentShader:`uniform sampler2D tDiffuse;uniform sampler2D tBloom;varying vec2 vUv;
  void main(){vec4 base=texture2D(tDiffuse,vUv);vec3 halo=texture2D(tBloom,vUv).rgb;
   gl_FragColor=vec4(base.rgb+halo,max(base.a,max(halo.r,max(halo.g,halo.b))));}`,
};

/** OutputPass for a buffer that is already tone-mapped: sRGB, nothing else. */
class DisplayPass extends OutputPass {
 render(renderer,writeBuffer,readBuffer,delta,mask){
  const mapping=renderer.toneMapping;renderer.toneMapping=T.NoToneMapping;
  super.render(renderer,writeBuffer,readBuffer,delta,mask);
  renderer.toneMapping=mapping;
 }
}

const PINNED={high:2,low:1,off:0};
export function createPost(renderer,scene,camera){
 const pinned=PINNED[new URLSearchParams(location.search).get('fx')];
 let level=pinned??2,composer=null,glow=null,gtao=null,bloom=null,mix=null,width=1,height=1;
 const ratio=()=>Math.min(devicePixelRatio,level===2?2:level===1?1.5:1.25);
 function build(){
  composer?.dispose();glow?.dispose();composer=null;glow=null;gtao=null;bloom=null;mix=null;
  renderer.setPixelRatio(ratio());renderer.setSize(width,height,false);
  // Readable from devtools while presenting: the level in use and the median
  // gap between rendered frames the guard last measured.
  document.documentElement.dataset.fx=level;
  if(level===0)return;
  const size=renderer.getDrawingBufferSize(new T.Vector2());
  const target=new T.WebGLRenderTarget(size.x,size.y,{type:T.HalfFloatType,samples:4});
  composer=new EffectComposer(renderer,target);
  for(const rt of [composer.renderTarget1,composer.renderTarget2]){rt.isXRRenderTarget=true;rt.texture.colorSpace=T.LinearSRGBColorSpace;}
  composer.setPixelRatio(ratio());composer.setSize(width,height);
  composer.addPass(new RenderPass(scene,camera));
  if(level===2){
   gtao=new SolidGTAOPass(scene,camera,size.x,size.y);
   gtao.updateGtaoMaterial({radius:1.4,distanceExponent:1.6,thickness:1.2,scale:1,samples:12});
   gtao.updatePdMaterial({lumaPhi:10,depthPhi:2,normalPhi:3,radius:6,rings:2,samples:12});
   gtao.blendIntensity=.75;
   composer.addPass(gtao);
  }
  // The glow buffer: half resolution, its own composer, tone-mapped the same way.
  glow=new EffectComposer(renderer,new T.WebGLRenderTarget(size.x>>1,size.y>>1,{type:T.HalfFloatType}));
  for(const rt of [glow.renderTarget1,glow.renderTarget2]){rt.isXRRenderTarget=true;rt.texture.colorSpace=T.LinearSRGBColorSpace;}
  glow.renderToScreen=false;glow.setPixelRatio(ratio()*.5);glow.setSize(width,height);
  glow.addPass(new GlowPass(scene,camera));
  bloom=new UnrealBloomPass(new T.Vector2(size.x>>1,size.y>>1),0,.55,0);
  glow.addPass(bloom);
  mix=new ShaderPass(MixShader);
  // The bloom pass keeps the halo alone, before blending it over its input, in
  // its first horizontal target; that is what is added, so a lit surface is not
  // counted twice and the dashboard keeps its colours.
  mix.uniforms.tBloom.value=bloom.renderTargetsHorizontal[0].texture;
  mix.enabled=false;
  composer.addPass(mix);
  composer.addPass(new DisplayPass());
 }
 // Frame pacing. The page renders at most every other display frame, so a
 // healthy machine shows ~33 ms between rendered frames; sustained gaps well
 // past that mean the GPU is the bottleneck.
 let lastFrame=0,gaps=[],windowStart=0,settleUntil=performance.now()+1500;
 function pace(now){
  if(pinned!==undefined||level===0)return;
  if(now<settleUntil||!lastFrame){lastFrame=now;return;}
  gaps.push(now-lastFrame);lastFrame=now;
  // A window of time, not of frames: on the machine this is for, 45 frames
  // took most of a minute, so a frame-count window never reached a verdict.
  windowStart||=now;
  if(gaps.length<6||now-windowStart<2000)return;
  windowStart=0;
  const sorted=[...gaps].sort((a,b)=>a-b),median=sorted[sorted.length>>1];
  gaps=[];
  document.documentElement.dataset.fxFrame=Math.round(median);
  if(median>52){level--;settleUntil=now+1500;lastFrame=0;gaps=[];windowStart=0;build();console.info(`City Intelligence: effects stepped down to level ${level}`);}
 }
 build();
 return {
  get level(){return level;},
  setSize(w,h){width=w;height=h;build();},
  /** Draws a frame; `night` is how much of the dark opening is on screen. */
  render(night,animating){
   if(animating)pace(performance.now());else lastFrame=0;
   if(!composer){renderer.render(scene,camera);return;}
   const glowing=night>.02;
   if(mix){
    mix.enabled=glowing;
    if(glowing){bloom.strength=.85*night;glow.render();mix.uniforms.tBloom.value=bloom.renderTargetsHorizontal[0].texture;}
   }
   composer.render();
  },
 };
}
