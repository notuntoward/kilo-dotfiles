#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

function usage() {
  console.log(`Usage: node obsidian-relink.mjs --vault <vault-root> [options]

Point a vault's plugin entry at a plugin checkout. The vault path is required;
this script never searches for a vault.

Options:
  -v, --vault <path>    Vault root (the directory containing .obsidian)
  -s, --source <path>   Plugin checkout (default: current directory)
  -n, --name <folder>   Link folder name (default: existing link name, else manifest id)
  -h, --help            Show this help

Environment:
  OBSIDIAN_VAULT        Used when --vault is omitted

Examples:
  node obsidian-relink.mjs --vault ~/obsidian/Main
  node obsidian-relink.mjs --vault ~/obsidian/Main --source ~/repos/obsidian-perplexity-saver
`);
}

function parseArgs(argv) {
  const out = {
    vault: process.env.OBSIDIAN_VAULT,
    source: process.cwd(),
    name: undefined,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = () => {
      const next = argv[++i];
      if (!next) fail(`${arg} requires a value`);
      return next;
    };

    switch (arg) {
      case "-h":
      case "--help":
        usage();
        process.exit(0);
      case "-v":
      case "--vault":
        out.vault = value();
        break;
      case "-s":
      case "--source":
        out.source = value();
        break;
      case "-n":
      case "--name":
        out.name = value();
        break;
      default:
        fail(`unknown argument: ${arg}`);
    }
  }

  if (!out.vault) {
    fail("--vault is required (or set OBSIDIAN_VAULT). This script never searches for a vault.");
  }
  return out;
}

function realDir(label, input) {
  try {
    return fs.realpathSync(path.resolve(input));
  } catch (error) {
    fail(`${label} is not accessible: ${input} (${error.message})`);
  }
}

function isDirectoryLink(target) {
  const stat = fs.lstatSync(target);
  if (stat.isSymbolicLink()) return true;
  try {
    fs.readlinkSync(target);
    return true;
  } catch {
    return false;
  }
}

function removeDirectoryLink(target) {
  try {
    fs.unlinkSync(target);
    return;
  } catch {
    // Windows directory symlinks and junctions need rmdir, which removes the
    // reparse point without following it.
  }
  fs.rmdirSync(target);
}

function validateName(name) {
  if (!name || name === "." || name === ".." || /[\\/]/.test(name)) {
    fail(`invalid link folder name: ${JSON.stringify(name)}`);
  }
  return name;
}

const args = parseArgs(process.argv.slice(2));

const source = realDir("source", args.source);
const manifestPath = path.join(source, "manifest.json");
if (!fs.existsSync(manifestPath)) {
  fail(`manifest.json not found in ${source}`);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
} catch (error) {
  fail(`could not parse ${manifestPath}: ${error.message}`);
}
if (!manifest.id) {
  fail(`${manifestPath} has no "id" field`);
}
validateName(manifest.id);

const bundlePath = path.join(source, "main.js");
if (!fs.existsSync(bundlePath)) {
  fail(`main.js is missing at ${bundlePath}. Run the production build first.`);
}

const vault = realDir("vault", args.vault);
const dotObsidian = path.join(vault, ".obsidian");
let vaultStat;
try {
  vaultStat = fs.statSync(dotObsidian);
} catch {
  fail(`${vault} is not an Obsidian vault: ${dotObsidian} is missing`);
}
if (!vaultStat.isDirectory()) {
  fail(`${vault} is not an Obsidian vault: ${dotObsidian} is not a directory`);
}

const pluginsDir = path.join(dotObsidian, "plugins");
fs.mkdirSync(pluginsDir, { recursive: true });

const existingMatches = [];
for (const entry of fs.readdirSync(pluginsDir, { withFileTypes: true })) {
  const candidate = path.join(pluginsDir, entry.name);
  try {
    if (fs.realpathSync(candidate) === source) existingMatches.push(entry.name);
  } catch {
    // Broken link or unreadable entry; ignore.
  }
}

if (existingMatches.length > 1) {
  console.warn(`warning: multiple vault entries point at ${source}: ${existingMatches.join(", ")}`);
}

const linkName = validateName(args.name ?? existingMatches[0] ?? manifest.id);
const linkPath = path.join(pluginsDir, linkName);

if (fs.existsSync(linkPath) || fs.lstatSync(linkPath, { throwIfNoEntry: false })) {
  if (!isDirectoryLink(linkPath)) {
    fail(`${linkPath} is a real file or directory, not a link. Move it away first; refusing to delete plugin contents.`);
  }

  let current;
  try {
    current = fs.realpathSync(linkPath);
  } catch {
    current = "(broken link)";
  }

  if (current === source) {
    console.log(`${linkName} already points to ${source}. Nothing to do.`);
    process.exit(0);
  }

  console.log(`Replacing ${linkName}: ${current} -> ${source}`);
  removeDirectoryLink(linkPath);
}

const linkType = process.platform === "win32" ? "junction" : "dir";
try {
  fs.symlinkSync(source, linkPath, linkType);
} catch (error) {
  fail(`could not create ${linkType} at ${linkPath}: ${error.message}`);
}

const resolved = fs.realpathSync(linkPath);
if (resolved !== source) {
  fail(`link verification failed: ${linkPath} -> ${resolved}, expected ${source}`);
}
if (!fs.existsSync(path.join(linkPath, "main.js"))) {
  fail(`main.js is not visible through ${linkPath}`);
}

console.log(`OK: ${manifest.id}`);
console.log(`  Vault    : ${vault}`);
console.log(`  Link     : ${linkPath}`);
console.log(`  Points to: ${source}`);
console.log(`  Bundle   : ${bundlePath}`);
console.log("");
console.log(`Reload '${manifest.id}' in Obsidian to pick up the new main.js.`);
