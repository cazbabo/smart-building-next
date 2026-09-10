// Minimal PNG decode/encode. Only what the atlas recolour needs, no dependencies.
import zlib from 'node:zlib';

const CHANNELS = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4};

export function decodePng(buffer) {
 const width = buffer.readUInt32BE(16), height = buffer.readUInt32BE(20);
 const depth = buffer[24], colorType = buffer[25];
 if (depth !== 8) throw new Error(`unsupported bit depth ${depth}`);
 let idat = [], palette = null, trns = null, offset = 8;
 while (offset < buffer.length) {
  const length = buffer.readUInt32BE(offset), type = buffer.toString('ascii', offset + 4, offset + 8);
  const body = buffer.subarray(offset + 8, offset + 8 + length);
  if (type === 'IDAT') idat.push(body);
  else if (type === 'PLTE') palette = body;
  else if (type === 'tRNS') trns = body;
  offset += 12 + length;
 }
 const raw = zlib.inflateSync(Buffer.concat(idat));
 const channels = CHANNELS[colorType], stride = width * channels;
 const flat = Buffer.alloc(height * stride);
 let previous = Buffer.alloc(stride), position = 0;
 for (let y = 0; y < height; y++) {
  const filter = raw[position++];
  const line = Buffer.from(raw.subarray(position, position + stride)); position += stride;
  for (let x = 0; x < stride; x++) {
   const a = x >= channels ? line[x - channels] : 0, b = previous[x];
   const c = x >= channels ? previous[x - channels] : 0;
   if (filter === 1) line[x] = (line[x] + a) & 255;
   else if (filter === 2) line[x] = (line[x] + b) & 255;
   else if (filter === 3) line[x] = (line[x] + ((a + b) >> 1)) & 255;
   else if (filter === 4) {
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    line[x] = (line[x] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
   }
  }
  line.copy(flat, y * stride); previous = line;
 }
 // Normalise every colour type to RGBA so callers only handle one shape.
 const rgba = Buffer.alloc(width * height * 4);
 for (let i = 0; i < width * height; i++) {
  let r, g, b, a = 255;
  if (colorType === 3) {
   const index = flat[i];
   r = palette[index * 3]; g = palette[index * 3 + 1]; b = palette[index * 3 + 2];
   if (trns && index < trns.length) a = trns[index];
  } else if (colorType === 0) { r = g = b = flat[i]; }
  else if (colorType === 4) { r = g = b = flat[i * 2]; a = flat[i * 2 + 1]; }
  else if (colorType === 2) { r = flat[i * 3]; g = flat[i * 3 + 1]; b = flat[i * 3 + 2]; }
  else { r = flat[i * 4]; g = flat[i * 4 + 1]; b = flat[i * 4 + 2]; a = flat[i * 4 + 3]; }
  rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = a;
 }
 return {width, height, rgba};
}

export function encodePng({width, height, rgba}) {
 const raw = Buffer.alloc(height * (width * 4 + 1));
 for (let y = 0; y < height; y++) {
  raw[y * (width * 4 + 1)] = 0;
  rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
 }
 const chunk = (type, data) => {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0); head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(Buffer.concat([head.subarray(4), data])) >>> 0, 0);
  return Buffer.concat([head, data, crc]);
 };
 const ihdr = Buffer.alloc(13);
 ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
 ihdr[8] = 8; ihdr[9] = 6;
 return Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, {level: 9})), chunk('IEND', Buffer.alloc(0)),
 ]);
}
