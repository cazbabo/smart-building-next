// Drops attributes the scene never samples (TANGENT: the material has no normal
// map) and repacks the binary chunk so the removed data actually leaves the file.
const MAGIC = 0x46546c67, JSON_CHUNK = 0x4e4f534a, BIN_CHUNK = 0x004e4942;

export function readGlb(buffer) {
 if (buffer.readUInt32LE(0) !== MAGIC) throw new Error('not a GLB');
 let offset = 12, json = null, bin = null;
 while (offset < buffer.length) {
  const length = buffer.readUInt32LE(offset), type = buffer.readUInt32LE(offset + 4);
  const body = buffer.subarray(offset + 8, offset + 8 + length);
  if (type === JSON_CHUNK) json = JSON.parse(body.toString('utf8'));
  else if (type === BIN_CHUNK) bin = body;
  offset += 8 + length;
 }
 return {json, bin};
}

export function writeGlb({json, bin}) {
 const jsonChunk = Buffer.from(JSON.stringify(json), 'utf8');
 const jsonPad = (4 - jsonChunk.length % 4) % 4;
 const binPad = (4 - bin.length % 4) % 4;
 const parts = [], header = Buffer.alloc(12);
 const total = 12 + 8 + jsonChunk.length + jsonPad + 8 + bin.length + binPad;
 header.writeUInt32LE(MAGIC, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(total, 8);
 parts.push(header);
 const jsonHead = Buffer.alloc(8);
 jsonHead.writeUInt32LE(jsonChunk.length + jsonPad, 0); jsonHead.writeUInt32LE(JSON_CHUNK, 4);
 parts.push(jsonHead, jsonChunk, Buffer.alloc(jsonPad, 0x20));
 const binHead = Buffer.alloc(8);
 binHead.writeUInt32LE(bin.length + binPad, 0); binHead.writeUInt32LE(BIN_CHUNK, 4);
 parts.push(binHead, bin, Buffer.alloc(binPad));
 return Buffer.concat(parts, total);
}

export function stripAttributes(buffer, drop = ['TANGENT']) {
 const {json, bin} = readGlb(buffer);
 for (const mesh of json.meshes ?? []) {
  for (const primitive of mesh.primitives) {
   for (const name of drop) delete primitive.attributes[name];
  }
 }
 // Keep only accessors still referenced, then only the bufferViews they need.
 const usedAccessors = new Set();
 for (const mesh of json.meshes ?? []) {
  for (const primitive of mesh.primitives) {
   for (const index of Object.values(primitive.attributes)) usedAccessors.add(index);
   if (primitive.indices !== undefined) usedAccessors.add(primitive.indices);
  }
 }
 const accessorMap = new Map(), accessors = [];
 (json.accessors ?? []).forEach((accessor, index) => {
  if (!usedAccessors.has(index)) return;
  accessorMap.set(index, accessors.length); accessors.push(accessor);
 });
 const viewMap = new Map(), views = [], chunks = [];
 let cursor = 0;
 for (const accessor of accessors) {
  const source = accessor.bufferView;
  if (source === undefined || viewMap.has(source)) continue;
  const view = json.bufferViews[source];
  const start = view.byteOffset ?? 0;
  const body = bin.subarray(start, start + view.byteLength);
  const pad = (4 - cursor % 4) % 4;
  if (pad) { chunks.push(Buffer.alloc(pad)); cursor += pad; }
  chunks.push(body);
  viewMap.set(source, views.length);
  views.push({...view, buffer: 0, byteOffset: cursor, byteLength: view.byteLength});
  cursor += view.byteLength;
 }
 for (const accessor of accessors) {
  if (accessor.bufferView !== undefined) accessor.bufferView = viewMap.get(accessor.bufferView);
 }
 for (const mesh of json.meshes ?? []) {
  for (const primitive of mesh.primitives) {
   for (const [name, index] of Object.entries(primitive.attributes)) {
    primitive.attributes[name] = accessorMap.get(index);
   }
   if (primitive.indices !== undefined) primitive.indices = accessorMap.get(primitive.indices);
  }
 }
 json.accessors = accessors;
 json.bufferViews = views;
 const packed = Buffer.concat(chunks, cursor);
 json.buffers = [{byteLength: packed.length}];
 return writeGlb({json, bin: packed});
}
