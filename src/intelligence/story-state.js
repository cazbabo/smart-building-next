const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{const t=clamp(x);return t*t*(3-2*t);};
export function storyTelemetry(id, progress = 0) {
 const p = smooth(progress);
 const level = id === 'flood' ? 1.2 + .4 * p : ['ai','priorities','roadmap'].includes(id) ? 1.6 : 1.2;
 return {level, forecast: id === 'ai' ? level + .3 * p : null, connected: !['overview','fragmented'].includes(id), sensors: ['iot','flood','priorities','ai','roadmap'].includes(id)};
}
