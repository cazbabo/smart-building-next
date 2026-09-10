// Offline Three.js vector rendering; no browser or live page involved.
import fs from 'node:fs';
import * as T from 'three';
import {createCivicCity} from '../src/intelligence/civic-model.js';

class Element{constructor(name){this.name=name;this.attrs={};this.childNodes=[];this.style={};}setAttribute(k,v){this.attrs[k]=v;}appendChild(c){this.childNodes.push(c);return c;}removeChild(c){this.childNodes.splice(this.childNodes.indexOf(c),1);}get firstChild(){return this.childNodes[0];}serialize(){return `<${this.name} ${Object.entries(this.attrs).map(([k,v])=>`${k}="${v}"`).join(' ')}>${this.childNodes.map(c=>c.serialize()).join('')}</${this.name}>`;}}
globalThis.document={createElementNS:(_,name)=>new Element(name)};
const {SVGRenderer}=await import('three/addons/renderers/SVGRenderer.js');
const scene=new T.Scene(),city=createCivicCity();scene.add(city.root);scene.add(new T.AmbientLight(0xaaaaaa));const sun=new T.DirectionalLight(0xfff8f1,.65);sun.position.set(-40,85,45);scene.add(sun);
const camera=new T.OrthographicCamera(-79,79,59.25,-59.25,.1,400);const target=new T.Vector3(-17,7,0);camera.position.copy(target).add(new T.Vector3(102,100,102));camera.lookAt(target);
const renderer=new SVGRenderer();renderer.setSize(1600,1200);renderer.setQuality('high');renderer.render(scene,camera);renderer.domElement.setAttribute('xmlns','http://www.w3.org/2000/svg');fs.writeFileSync('/tmp/city-intelligence-civic.svg',renderer.domElement.serialize());
console.log('Rendered city poster');
