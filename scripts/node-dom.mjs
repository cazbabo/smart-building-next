// The pieces of the DOM that three's loaders reach for, so GLTFLoader can run
// under Node for the offline poster render and the scene tests. Nothing here
// decodes image data: the atlas only needs to exist as a texture object, since
// geometry and placement are what these callers measure.
export function installNodeDom() {
 globalThis.self ??= globalThis;

 globalThis.ProgressEvent ??= class ProgressEvent {
  constructor(type, init = {}) { Object.assign(this, {type}, init); }
 };

 class StubElement {
  constructor(tag) {
   this.tagName = tag; this.width = 1; this.height = 1;
   this.style = {}; this.listeners = {}; this.childNodes = []; this.attrs = {};
  }
  addEventListener(type, handler) { (this.listeners[type] ??= []).push(handler); }
  removeEventListener(type, handler) {
   this.listeners[type] = (this.listeners[type] ?? []).filter(entry => entry !== handler);
  }
  dispatch(type) { for (const handler of this.listeners[type] ?? []) handler({type, target: this}); }
  setAttribute(key, value) { this.attrs[key] = value; }
  getAttribute(key) { return this.attrs[key]; }
  appendChild(child) { this.childNodes.push(child); return child; }
  removeChild(child) { this.childNodes.splice(this.childNodes.indexOf(child), 1); }
  get firstChild() { return this.childNodes[0]; }
  // An <img> reports success as soon as it is pointed at a source.
  set src(value) { this._src = value; queueMicrotask(() => this.dispatch('load')); }
  get src() { return this._src; }
  serialize() {
   const attrs = Object.entries(this.attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
   return `<${this.tagName} ${attrs}>${this.childNodes.map(c => c.serialize()).join('')}</${this.tagName}>`;
  }
 }

 const create = tag => new StubElement(tag);
 globalThis.document ??= {
  createElementNS: (_namespace, tag) => create(tag),
  createElement: create,
 };
 globalThis.document.createElementNS ??= (_namespace, tag) => create(tag);
 globalThis.URL.createObjectURL ??= () => 'blob:stub';
 globalThis.URL.revokeObjectURL ??= () => {};
 return {StubElement};
}

/** Serves `origin`-prefixed URLs out of a local directory for three's FileLoader. */
export function serveDirectory(origin, directory, fs, path) {
 const realFetch = globalThis.fetch;
 globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input.url;
  if (url.startsWith(origin)) {
   return new Response(fs.readFileSync(path.join(directory, url.slice(origin.length))), {status: 200});
  }
  return realFetch(input, init);
 };
}
