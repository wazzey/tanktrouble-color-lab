// Builds dist/TankTrouble-Color-Lab-v<version>.zip from the source in this repository (everything inside a
// TankTrouble-Color-Lab folder, for Load unpacked), and dist/TankTrouble-Color-Lab-v<version>-webstore.zip (the same
// files with manifest.json at the top, as the Chrome Web Store needs).
//
//   npm ci
//   npm run build            -> builds the zip and prints its SHA-256
//   npm run build -- --tag v1.4.2   -> also fails if the tag doesn't match manifest.json
//   npm run check            -> syntax-checks the scripts without building
//
// The build is repeatable: the same source always gives the same zip, byte for byte
// (pinned esbuild version, files in a fixed order, every file stamped with the same time).

import { readFile, writeFile, readdir, mkdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';
import { zipSync } from 'fflate';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src'); // the extension itself (what goes in the zip); the repository's top level is docs and tooling
const FOLDER = 'TankTrouble-Color-Lab'; // the folder inside the zip
const SCRIPTS = ['content.js', 'background.js', 'bridge.js'];
const MINIFY = ['content.js']; // the big one is minified; the small ones ship as written
const FILES = ['manifest.json', 'HOW TO INSTALL AND USE.txt', 'WHAT IT CHANGES AND PRIVACY.txt']; // (from src/; README.md comes from the top level)
const FOLDERS = ['icons', 'art'];
const ESBUILD = { minify: true, charset: 'ascii', legalComments: 'none', target: 'chrome110' }; // (content.js runs as a plain script in the page: no module wrapping)

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

async function listFiles(dir) {
  const out = [];
  for (const e of await readdir(path.join(SRC, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await listFiles(rel)));
    else if (e.isFile()) out.push(rel);
  }
  return out;
}

function checkSyntax(file) {
  execFileSync(process.execPath, ['--check', path.join(SRC, file)], { stdio: 'inherit' });
}

// every file gets the time of the commit being built (or a fixed date outside git), so rebuilding never changes the zip
function buildTime() {
  if (process.env.SOURCE_DATE_EPOCH) return new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000);
  try {
    return new Date(Number(execFileSync('git', ['log', '-1', '--format=%ct'], { cwd: ROOT }).toString().trim()) * 1000);
  } catch {
    return new Date('2026-01-01T00:00:00Z');
  }
}

async function main() {
  for (const f of SCRIPTS) checkSyntax(f);
  if (args.includes('--check')) {
    console.log('Syntax OK');
    return;
  }

  const manifest = JSON.parse(await readFile(path.join(SRC, 'manifest.json'), 'utf8'));
  const version = manifest.version;
  const tag = flag('--tag');
  if (tag && tag !== 'v' + version) throw new Error(`manifest.json says ${version} but the tag is ${tag}`);

  const files = {};
  for (const f of SCRIPTS) {
    const src = await readFile(path.join(SRC, f), 'utf8');
    if (MINIFY.includes(f)) {
      const { code } = await transform(src, ESBUILD);
      files[f] = Buffer.from(code, 'utf8');
    } else files[f] = Buffer.from(src, 'utf8');
  }
  for (const f of FILES) files[f] = await readFile(path.join(SRC, f));
  files['README.md'] = await readFile(path.join(ROOT, 'README.md'));
  for (const d of FOLDERS) for (const f of await listFiles(d)) files[f] = await readFile(path.join(SRC, f));

  const mtime = buildTime(),
    entries = {},
    storeEntries = {};
  for (const name of Object.keys(files).sort()) {
    entries[FOLDER + '/' + name] = [files[name], { mtime, level: 9 }];
    storeEntries[name] = [files[name], { mtime, level: 9 }];
  }
  const zip = zipSync(entries),
    storeZip = zipSync(storeEntries);

  await mkdir(path.join(ROOT, 'dist'), { recursive: true });
  const out = path.join(ROOT, 'dist', `${FOLDER}-v${version}.zip`);
  const storeOut = path.join(ROOT, 'dist', `${FOLDER}-v${version}-webstore.zip`);
  await writeFile(out, zip);
  await writeFile(storeOut, storeZip);
  const sha = createHash('sha256').update(zip).digest('hex');
  const storeSha = createHash('sha256').update(storeZip).digest('hex');
  const contentSha = createHash('sha256').update(files['content.js']).digest('hex');
  console.log(
    `Built ${path.relative(ROOT, out)} (${Object.keys(files).length} files, ${(zip.length / 1048576).toFixed(2)} MB)`,
  );
  console.log(`SHA-256 zip:        ${sha}`);
  console.log(`SHA-256 Web Store:  ${storeSha}  (${path.relative(ROOT, storeOut)})`);
  console.log(`SHA-256 content.js: ${contentSha}`);
  if (process.env.GITHUB_OUTPUT)
    await writeFile(
      process.env.GITHUB_OUTPUT,
      `zip=${out}\nsha256=${sha}\nstore_zip=${storeOut}\nstore_sha256=${storeSha}\n`,
      { flag: 'a' },
    );
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
