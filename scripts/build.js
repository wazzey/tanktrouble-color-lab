// Builds the extension from extension/.
//
//   bun run build        public build: dist/TankTrouble-Color-Lab/ (for Load unpacked), its zip and the Web Store zip
//   bun run build:dev    DEV build (owner tools, readable code, "(DEV)" name and icons) into DEV_OUT from .env, or dist/dev
//   bun run dev          the DEV build again on every change in extension/
//
// The public zip is reproducible: the same commit always gives the same bytes.

import { watch } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { zipSync } from "fflate";

const ROOT = path.resolve(import.meta.dir, "..");
const SOURCE = path.join(ROOT, "extension");
const FOLDER = "TankTrouble-Color-Lab";
const SCRIPTS = ["content.js", "bridge.js", "background.js"];
const isDev = process.argv.includes("--dev");

const listFiles = async (dir) => {
  const files = [];
  for (const entry of await readdir(path.join(SOURCE, dir), { withFileTypes: true })) {
    const relative = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(relative)));
    } else if (entry.isFile()) {
      files.push(relative);
    }
  }
  return files;
};

const readManifest = async () => {
  const manifest = JSON.parse(await readFile(path.join(SOURCE, "manifest.json"), "utf8"));
  if (!isDev) {
    return manifest;
  }
  const devIcons = (icons) =>
    Object.fromEntries(Object.entries(icons).map(([size, file]) => [size, file.replace("/icon", "/dev")]));
  manifest.name += " (DEV)";
  manifest.action.default_title += " (DEV)";
  manifest.icons = devIcons(manifest.icons);
  manifest.action.default_icon = devIcons(manifest.action.default_icon);
  return manifest;
};

const readFiles = async () => {
  const result = await Bun.build({
    entrypoints: SCRIPTS.map((name) => path.join(SOURCE, name)),
    target: "browser",
    format: "iife",
    minify: !isDev,
    sourcemap: isDev ? "inline" : "none",
    define: { DEV_BUILD: String(isDev) },
  });
  if (!result.success) {
    throw new AggregateError(result.logs, "The build failed");
  }
  const files = {};
  for (const output of result.outputs) {
    files[path.basename(output.path)] = Buffer.from(await output.arrayBuffer());
  }
  files["manifest.json"] = Buffer.from(JSON.stringify(await readManifest(), null, 2) + "\n");
  const iconPrefix = isDev ? "icons/dev" : "icons/icon";
  for (const file of await listFiles("icons")) {
    if (file.startsWith(iconPrefix)) {
      files[file] = await readFile(path.join(SOURCE, file));
    }
  }
  for (const file of await listFiles("art")) {
    files[file] = await readFile(path.join(SOURCE, file));
  }
  return files;
};

const writeFolder = async (folder, files) => {
  for (const [name, data] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(folder, name)), { recursive: true });
    await writeFile(path.join(folder, name), data);
  }
};

// Every file is stamped with the time of the commit being built, so rebuilding never changes the zip
const getBuildTime = () => {
  const git = Bun.spawnSync(["git", "log", "-1", "--format=%ct"], { cwd: ROOT });
  const seconds = Number(git.stdout.toString().trim());
  return git.success && seconds ? new Date(seconds * 1000) : new Date("2026-01-01T00:00:00Z");
};

const writeZip = async (file, files, prefix) => {
  const mtime = getBuildTime();
  const entries = {};
  for (const name of Object.keys(files).sort()) {
    entries[prefix + name] = [files[name], { mtime, level: 9 }];
  }
  const zip = zipSync(entries);
  await writeFile(file, zip);
  return new Bun.CryptoHasher("sha256").update(zip).digest("hex");
};

const buildDev = async () => {
  const out = process.env.DEV_OUT || path.join(ROOT, "dist", "dev");
  await writeFolder(out, await readFiles());
  console.log(`Built the DEV build into ${out}`);
};

const buildPublic = async () => {
  const files = await readFiles();
  const { version } = JSON.parse(files["manifest.json"]);
  const dist = path.join(ROOT, "dist");
  await rm(dist, { recursive: true, force: true });
  await writeFolder(path.join(dist, FOLDER), files);
  const zip = path.join(dist, `${FOLDER}-v${version}.zip`);
  const storeZip = path.join(dist, `${FOLDER}-v${version}-webstore.zip`);
  const sha256 = await writeZip(zip, files, FOLDER + "/");
  await writeZip(storeZip, files, "");
  console.log(`Built ${path.relative(ROOT, zip)} (${Object.keys(files).length} files)`);
  console.log(`SHA-256: ${sha256}`);
  if (process.env.GITHUB_OUTPUT) {
    await writeFile(
      process.env.GITHUB_OUTPUT,
      `version=${version}\nzip=${zip}\nsha256=${sha256}\nstore_zip=${storeZip}\n`,
      { flag: "a" },
    );
  }
};

if (!isDev) {
  await buildPublic();
} else if (process.argv.includes("--watch")) {
  await buildDev();
  let timer = 0;
  watch(SOURCE, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => buildDev().catch((error) => console.error(error.message)), 200);
  });
  console.log("Watching extension/ for changes");
} else {
  await buildDev();
}
