const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const zip = fs.readFileSync('lenart-publish.zip');
const output = path.resolve('site');
let end = zip.length - 22;
while (end >= 0 && zip.readUInt32LE(end) !== 0x06054b50) end--;
if (end < 0) throw new Error('Invalid ZIP archive');
const count = zip.readUInt16LE(end + 10);
let cursor = zip.readUInt32LE(end + 16);
for (let n = 0; n < count; n++) {
  if (zip.readUInt32LE(cursor) !== 0x02014b50) throw new Error('Invalid ZIP directory');
  const method = zip.readUInt16LE(cursor + 10);
  const size = zip.readUInt32LE(cursor + 20);
  const nameLength = zip.readUInt16LE(cursor + 28);
  const extraLength = zip.readUInt16LE(cursor + 30);
  const commentLength = zip.readUInt16LE(cursor + 32);
  const offset = zip.readUInt32LE(cursor + 42);
  const name = zip.toString('utf8', cursor + 46, cursor + 46 + nameLength).replaceAll('\\', '/');
  const dest = path.resolve(output, name);
  if (!dest.startsWith(output + path.sep)) throw new Error('Unsafe archive path');
  if (name.endsWith('/')) fs.mkdirSync(dest, {recursive:true});
  else {
    const start = offset + 30 + zip.readUInt16LE(offset + 26) + zip.readUInt16LE(offset + 28);
    const compressed = zip.subarray(start, start + size);
    if (method !== 0 && method !== 8) throw new Error('Unsupported compression');
    fs.mkdirSync(path.dirname(dest), {recursive:true});
    fs.writeFileSync(dest, method === 0 ? compressed : zlib.inflateRawSync(compressed));
  }
  cursor += 46 + nameLength + extraLength + commentLength;
}
if (!fs.existsSync(path.join(output, 'index.html'))) throw new Error('Missing home page');
console.log(`Restored ${count} site files. Ready to publish.`);
