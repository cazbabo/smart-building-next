// The digital twin. SuperMap iClient3D for WebGL - a build of Cesium, loaded as
// a global by digital-twin.html from public/vendor/supermap3d (see
// scripts/copy-supermap.mjs) - streams a 3D city as S3M tiles from SuperMap
// iServer, and the City Intelligence story is told on it, chapter by chapter.
//
// The city is SuperMap's public 3D-CBD demo scene unless the page is pointed at
// another iServer realspace service: digital-twin.html?scene=<service url>.
// The story is placed on the demo scene, so any other scene shows the city alone.
import './style.css';
import {CHAPTERS} from './story.js';
import {dataLayer} from './data-layer.js';

const C = window.Cesium;
const DEMO = 'https://iserver.supermap.io/iserver/services/3D-CBD/rest/realspace';
const SCENE = (new URLSearchParams(location.search).get('scene') || DEMO).replace(/\/+$/, '');
const story = SCENE === DEMO;
// iClient3D finds the iServer root by looking for "/iserver" in a layer's URL,
// and on the demo the host name, iserver.supermap.io, matches first. Host names
// are case-insensitive, so the SDK is given the host in capitals.
const sdkUrl = url => url.replace(/^(https?:\/\/)([^/]+)/i, (m, scheme, host) => scheme + host.toUpperCase());
const $ = id => document.getElementById(id);
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

const viewer = new C.Viewer('twin', {
  animation: false, timeline: false, baseLayerPicker: false, geocoder: false, homeButton: false,
  sceneModePicker: false, navigationHelpButton: false, infoBox: false, selectionIndicator: false,
  fullscreenButton: false, imageryProvider: false,
});
const scene = viewer.scene;
// No base map: the city's own ground is the map, and past its edge the globe
// takes the page colour.
scene.globe.baseColor = C.Color.fromCssColorString('#241B3D');
scene.backgroundColor = C.Color.fromCssColorString('#15112A');
window.twin = {viewer};

function setSource(text, state) {
  $('source-text').textContent = text;
  $('source').className = 'tw-source ' + (state || '');
}
function fail(message) {
  $('loading').classList.add('error');
  $('loading-text').innerHTML = `${message} <a href="">Try again</a>`;
  setSource('SuperMap iServer unavailable', 'error');
}

// Every layer the service publishes, from its data listing.
async function loadCity() {
  const res = await fetch(`${SCENE}/datas.json`);
  if (!res.ok) throw new Error(`${res.status} from ${SCENE}/datas.json`);
  const names = (await res.json()).map(d => d.name);
  let loaded = 0;
  const count = () => `SuperMap iServer · ${SCENE.split('/services/')[1]?.split('/')[0] || 'scene'} · ${loaded} / ${names.length} layers`;
  setSource(count());
  const layers = await Promise.all(names.map(name =>
    scene.addS3MTilesLayerByScp(sdkUrl(`${SCENE}/datas/${encodeURIComponent(name)}/config`), {name}).then(
      layer => { loaded++; setSource(count()); return layer; },
      error => { console.warn(`SuperMap layer ${name} did not load`, error); return null; })));
  window.twin.layers = layers;
  if (!loaded) throw new Error('no layer loaded');
  setSource(count(), 'live');
  return names;
}

// The camera stands where a chapter says and looks the way it says.
function fly([lon, lat, height, heading, pitch], duration = 2.6) {
  const view = {
    destination: C.Cartesian3.fromDegrees(lon, lat, height),
    orientation: {heading: C.Math.toRadians(heading), pitch: C.Math.toRadians(pitch), roll: 0},
  };
  if (still || !duration) viewer.camera.setView(view);
  else viewer.camera.flyTo({...view, duration});
}

// Another scene: fly to the position its first layer's cache config gives.
async function frameScene(name) {
  const xml = await (await fetch(`${SCENE}/datas/${encodeURIComponent(name)}/config`)).text();
  const read = tag => parseFloat(xml.match(new RegExp(`<sml:${tag}>([^<]+)<`))?.[1]);
  const lon = read('X'), lat = read('Y');
  if (Number.isFinite(lon) && Number.isFinite(lat)) fly([lon, lat - .012, 1200, 0, -35], 0);
}

// Chapters.
let chapter = -1, layer = null;
const dots = CHAPTERS.map((c, i) => {
  const li = document.createElement('li'), b = document.createElement('button');
  b.setAttribute('aria-label', `${c.tag}: ${c.name}`);
  b.addEventListener('click', () => go(i));
  li.append(b);
  $('dots').append(li);
  return b;
});
function go(i, duration) {
  i = Math.max(0, Math.min(CHAPTERS.length - 1, i));
  if (i === chapter) return;
  chapter = i;
  const c = CHAPTERS[i];
  $('tag').textContent = c.tag;
  $('name').textContent = c.name;
  $('title').textContent = c.title;
  $('copy').textContent = c.copy;
  dots.forEach((b, k) => b.setAttribute('aria-current', k === i ? 'step' : 'false'));
  $('prev').disabled = i === 0;
  $('next').textContent = i === CHAPTERS.length - 1 ? 'Start again' : 'Next';
  history.replaceState(null, '', i ? `#${c.id}` : location.pathname + location.search);
  layer?.setStage(i);
  fly(c.view, duration);
}
$('prev').addEventListener('click', () => go(chapter - 1));
$('next').addEventListener('click', () => go(chapter === CHAPTERS.length - 1 ? 0 : chapter + 1));
addEventListener('keydown', e => {
  if (e.target.closest?.('input,textarea') || e.altKey || e.metaKey || e.ctrlKey) return;
  if (e.key === 'ArrowRight' || e.key === 'PageDown') go(chapter + 1);
  if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(chapter - 1);
});

// The chips follow the data layer's clock.
function furniture() {
  const data = layer.level(1), iot = layer.level(2), ai = layer.level(3);
  $('count').style.opacity = (data * (1 - ai)).toFixed(3);
  $('count-value').textContent = `${layer.connected()} / 7`;
  $('count-iot').style.opacity = iot.toFixed(3);
  $('card').classList.toggle('on', layer.recommend());
}

if (story) {
  layer = dataLayer(viewer, $('labels'));
  scene.postRender.addEventListener(furniture);
  const start = CHAPTERS.findIndex(c => `#${c.id}` === location.hash);
  go(Math.max(0, start), 0);
} else {
  $('story').hidden = true;
  $('note').textContent = 'Your SuperMap iServer scene · drag to look around';
}

loadCity().then(names => {
  // Adding the layers moves the camera; put it back where the story stands.
  if (story) fly(CHAPTERS[chapter].view, 0);
  else frameScene(names[0]);
  // Give the first tiles a moment to arrive before the city is shown.
  setTimeout(() => $('loading').classList.add('done'), 1200);
}, error => {
  console.error(error);
  fail('The 3D city could not be loaded from SuperMap iServer.');
});
