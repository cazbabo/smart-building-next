// Offline Three.js vector rendering; no browser or live page involved.
import fs from 'node:fs';
import * as T from 'three';
import {createCity} from '../src/intelligence/model.js';
import {stateAt} from '../src/intelligence/content.js';
class Element{constructor(name){this.name=name;this.attrs={};this.childNodes=[];this.style={};}setAttribute(k,v){this.attrs[k]=v;}appendChild(c){this.childNodes.push(c);return c;}removeChild(c){this.childNodes.splice(this.childNodes.indexOf(c),1);}get firstChild(){return this.childNodes[0];}serialize(){return `<${this.name} ${Object.entries(this.attrs).map(([k,v])=>`${k}="${v}"`).join(' ')}>${this.childNodes.map(c=>c.serialize()).join('')}</${this.name}>`;}}
globalThis.document={createElementNS:(_,name)=>new Element(name)};
const {SVGRenderer}=await import('three/addons/renderers/SVGRenderer.js');
const scene=new T.Scene(),city=createCity();city.update(stateAt(0));scene.add(city.root);scene.add(new T.AmbientLight(0xaaaaaa));const sun=new T.DirectionalLight(0xfff8f1,.65);sun.position.set(-40,85,45);scene.add(sun);
const camera=new T.OrthographicCamera(-74,74,51,-51,.1,400);const target=new T.Vector3(0,10,0);camera.position.set(84,94,84);camera.lookAt(target);
const renderer=new SVGRenderer();renderer.setSize(1600,1100);renderer.setQuality('high');renderer.render(scene,camera);renderer.domElement.setAttribute('xmlns','http://www.w3.org/2000/svg');fs.writeFileSync('/tmp/city-intelligence-poster.svg',renderer.domElement.serialize());
console.log('Rendered city poster');
