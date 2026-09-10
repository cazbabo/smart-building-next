import assert from 'node:assert/strict';
import {createCivicCity} from '../src/intelligence/civic-model.js';
import {storyTelemetry} from '../src/intelligence/story-state.js';
const city=createCivicCity();
const counts=()=>{let meshes=0,triangles=0;city.root.traverse(o=>{assert.ok([...o.position,...o.quaternion,...o.scale].every(Number.isFinite));if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});return {meshes,triangles};};
const baseline=counts();
// Ambient motion changes objects while identical timestamps preserve a paused scene.
city.setStage('overview',.2);city.update(2,.03,true);
const initialCar=city.vehicles[0].position.clone(),initialRotor=city.rotors[0].rotation.z;
city.update(4,.03,true);assert.ok(initialCar.distanceTo(city.vehicles[0].position)>1);assert.notEqual(initialRotor,city.rotors[0].rotation.z);
const pausedCar=city.vehicles[0].position.clone();city.update(4,.03,true);assert.deepEqual(city.vehicles[0].position,pausedCar);
// Scroll reveal and simulated water both reverse without allocating scene objects.
city.setStage('foundation',0);city.update(4,.03,true);const early=city.motion.channels[0].geometry.drawRange.count;
city.setStage('foundation',1);city.update(4,.03,true);assert.ok(city.motion.channels[0].geometry.drawRange.count>early);
city.setStage('flood',0);city.update(4,.03,true);const low=city.waterSurface.position.y;
city.setStage('flood',1);city.update(4,.03,true);assert.ok(city.waterSurface.position.y>low);assert.ok(city.gates[0].position.y>1.5);
assert.equal(storyTelemetry('flood',1).level,1.6);
assert.ok(Math.abs(storyTelemetry('ai',1).forecast-1.9)<1e-10);
city.setStage('flood',0);city.update(4,.03,true);assert.equal(city.waterSurface.position.y,low);assert.equal(city.gates[0].position.y,1.5);
for(const id of ['overview','fragmented','foundation','iot','flood','priorities','ai','roadmap'])for(const p of [0,.5,1]){city.setStage(id,p);city.update(7,.03,true);}
assert.deepEqual(counts(),baseline);

// The AI chapter has to show the answer coming back, not only the readings going in.
city.setStage('ai',1);city.update(2,.03,true);
const advising=city.motion.advice.map(a=>a.mesh.position.clone());
assert.ok(city.motion.think.visible,'processing ring shows in the AI chapter');
assert.ok(city.motion.advice.every(a=>a.mesh.visible),'advice runs in the AI chapter');
city.update(5,.03,true);
assert.ok(city.motion.advice.some((a,i)=>!a.mesh.position.equals(advising[i])),'advice moves');
// It runs the other way to the readings: toward the districts, away from the hub.
const hub=city.locations.command;
const near=p=>Math.hypot(p.x-hub[0],p.z-hub[2]);
city.setStage('ai',1);city.update(0,.03,true);
const first=city.motion.advice[0];
const start=near(first.mesh.position.clone());
city.update(1.2,.03,true);
assert.ok(near(first.mesh.position)>start,'advice travels away from the command center');
city.setStage('iot',1);city.update(2,.03,true);
assert.ok(!city.motion.think.visible,'processing ring is only in the AI chapter');
assert.ok(city.motion.advice.every(a=>!a.mesh.visible),'advice is only in the AI chapter');

city.setStage('overview',0);city.update(7,.03,true);assert.equal(city.motion.flow.visible,false);
console.log('PASS: ambient movement, pause determinism, progressive data, water/gate reversal, forecast consistency, stable geometry',baseline);
