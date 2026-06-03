import fs from "fs";
import path from "path";
import zlib from "zlib";

const ROOT = path.resolve(process.cwd());
const OUTPUT = path.join(ROOT, "strangerlink-download.zip");

const INCLUDE_DIRS = [
  "artifacts",
  "lib",
  "scripts",
];
const INCLUDE_ROOT_FILES = [
  "package.json",
  "pnpm-workspace.yaml",
  "pnpm-lock.yaml",
  "tsconfig.json",
  "tsconfig.base.json",
  "render.yaml",
  "README.md",
];

const EXCLUDE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  ".cache",
  "attached_assets",
  ".local",
  ".agents",
]);
const EXCLUDE_FILES = new Set([
  "strangerlink-download.zip",
  "strangerlink-project.tar.gz",
  "strangerlink-github.tar.gz",
]);
const EXCLUDE_EXTS = new Set([".tsbuildinfo", ".map"]);

function collectFiles(dir, base = "") {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    if (EXCLUDE_FILES.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    const entryPath = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath, entryPath));
    } else {
      if (EXCLUDE_EXTS.has(path.extname(entry.name))) continue;
      results.push({ fullPath, entryPath });
    }
  }
  return results;
}

const files = [];
for (const dir of INCLUDE_DIRS) {
  files.push(...collectFiles(path.join(ROOT, dir), dir));
}
for (const f of INCLUDE_ROOT_FILES) {
  const fullPath = path.join(ROOT, f);
  if (fs.existsSync(fullPath)) files.push({ fullPath, entryPath: f });
}

// ZIP builder
function crc32(buf) {
  let crc = 0xffffffff;
  const table = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[i] = c;
    }
    return t;
  })();
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(n) { const b = Buffer.alloc(2); b.writeUInt16LE(n, 0); return b; }
function u32(n) { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0, 0); return b; }

const localHeaders = [];
const centralHeaders = [];
let offset = 0;

const outParts = [];

for (const { fullPath, entryPath } of files) {
  const data = fs.readFileSync(fullPath);
  const compressed = zlib.deflateRawSync(data, { level: 6 });
  const crc = crc32(data);
  const nameBytes = Buffer.from(entryPath, "utf8");
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  const local = Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    u16(20),         // version needed
    u16(0),          // flags
    u16(8),          // deflate
    u16(dosTime), u16(dosDate),
    u32(crc),
    u32(compressed.length),
    u32(data.length),
    u16(nameBytes.length),
    u16(0),          // extra length
    nameBytes,
    compressed,
  ]);

  centralHeaders.push(Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x01, 0x02]),
    u16(20),         // version made by
    u16(20),         // version needed
    u16(0),          // flags
    u16(8),          // deflate
    u16(dosTime), u16(dosDate),
    u32(crc),
    u32(compressed.length),
    u32(data.length),
    u16(nameBytes.length),
    u16(0),          // extra length
    u16(0),          // comment length
    u16(0),          // disk start
    u16(0),          // internal attr
    u32(0),          // external attr
    u32(offset),     // local header offset
    nameBytes,
  ]));

  outParts.push(local);
  offset += local.length;
}

const centralDir = Buffer.concat(centralHeaders);
const eocd = Buffer.concat([
  Buffer.from([0x50, 0x4b, 0x05, 0x06]),
  u16(0), u16(0),
  u16(centralHeaders.length),
  u16(centralHeaders.length),
  u32(centralDir.length),
  u32(offset),
  u16(0),
]);

fs.writeFileSync(OUTPUT, Buffer.concat([...outParts, centralDir, eocd]));
const size = fs.statSync(OUTPUT).size;
console.log(`✅ Created: ${path.basename(OUTPUT)} (${(size / 1024).toFixed(0)} KB, ${files.length} files)`);
