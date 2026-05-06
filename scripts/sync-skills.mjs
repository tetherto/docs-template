#!/usr/bin/env node
/**
 * sync-skills.mjs
 *
 * Pull `.cursor/skills/` from the docs-template repo into the current repo so
 * org-wide doc skills (diataxis, google-tech-writing, docs-frontmatter,
 * docs-review) stay in sync without copy-paste drift.
 *
 * Defaults are tuned for `tetherto/docs-template`. Override with flags or env
 * vars for forks.
 *
 * Usage from a consumer repo:
 *
 *   # default: clone main from tetherto/docs-template
 *   npx --package=tiged@2 -- tiged tetherto/docs-template/.cursor/skills .cursor/skills --force
 *
 *   # or, with this script (same defaults, more controllable):
 *   node scripts/sync-skills.mjs
 *   node scripts/sync-skills.mjs --ref=v1.2.0
 *   node scripts/sync-skills.mjs --repo=myorg/my-docs-template --ref=main
 *   node scripts/sync-skills.mjs --dest=.cursor/skills --dry-run
 *
 * Inside docs-template itself this script is a no-op safeguard: it refuses to
 * overwrite the source of truth.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, cpSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';

const DEFAULTS = {
  repo: process.env.DOCS_SKILLS_REPO ?? 'tetherto/docs-template',
  ref: process.env.DOCS_SKILLS_REF ?? 'main',
  src: process.env.DOCS_SKILLS_SRC ?? '.cursor/skills',
  dest: process.env.DOCS_SKILLS_DEST ?? '.cursor/skills',
};

const TEMPLATE_PACKAGE_NAMES = [
  '@tether/docs-site',
  '@tetherto/docs-template',
  '@tether/docs-template',
];

const TEMPLATE_REMOTE_PATTERNS = [
  /[/:]tetherto\/docs-template(?:\.git)?$/i,
  /[/:]tether\/docs-template(?:\.git)?$/i,
];

function parseArgs(argv) {
  const out = { ...DEFAULTS, dryRun: false, force: false, help: false };
  for (const arg of argv.slice(2)) {
    if (arg === '--help' || arg === '-h') out.help = true;
    else if (arg === '--dry-run') out.dryRun = true;
    else if (arg === '--force') out.force = true;
    else if (arg.startsWith('--repo=')) out.repo = arg.slice('--repo='.length);
    else if (arg.startsWith('--ref=')) out.ref = arg.slice('--ref='.length);
    else if (arg.startsWith('--src=')) out.src = arg.slice('--src='.length);
    else if (arg.startsWith('--dest=')) out.dest = arg.slice('--dest='.length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return out;
}

function printHelp() {
  console.log(`sync-skills — pull .cursor/skills/ from a docs-template repo

Options:
  --repo=<owner/name>   Source repo (default: ${DEFAULTS.repo})
  --ref=<branch|tag>    Git ref (default: ${DEFAULTS.ref})
  --src=<path>          Path inside source repo (default: ${DEFAULTS.src})
  --dest=<path>         Local destination (default: ${DEFAULTS.dest})
  --dry-run             Print actions without writing
  --force               Overwrite local destination even if it has uncommitted changes
  --help                This text

Env equivalents: DOCS_SKILLS_REPO, DOCS_SKILLS_REF, DOCS_SKILLS_SRC, DOCS_SKILLS_DEST.
`);
}

function readPackageName() {
  const pkgPath = resolve(process.cwd(), 'package.json');
  if (!existsSync(pkgPath)) return null;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    return typeof pkg.name === 'string' ? pkg.name : null;
  } catch {
    return null;
  }
}

function readGitOriginUrl() {
  const result = spawnSync(
    'git',
    ['config', '--get', 'remote.origin.url'],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) return null;
  const url = result.stdout?.trim();
  return url || null;
}

function hasUncommittedChanges(relativePath) {
  const result = spawnSync(
    'git',
    ['status', '--porcelain', '--', relativePath],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) return false;
  return result.stdout.trim().length > 0;
}

function isInsideDocsTemplate() {
  const name = readPackageName();
  if (name && TEMPLATE_PACKAGE_NAMES.includes(name)) return true;

  const remote = readGitOriginUrl();
  if (remote && TEMPLATE_REMOTE_PATTERNS.some((re) => re.test(remote))) return true;

  return false;
}

function runCloneShallow(repo, ref, intoDir) {
  const url = `https://github.com/${repo}.git`;
  const result = spawnSync(
    'git',
    ['clone', '--depth=1', '--branch', ref, url, intoDir],
    { stdio: 'inherit' },
  );
  if (result.error) {
    if (result.error.code === 'ENOENT') {
      throw new Error('git binary not found on PATH; install git first.');
    }
    throw new Error(`git clone failed: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(
      `git clone failed (exit ${result.status}) for ${repo}#${ref}. ` +
      `--ref must be a branch or tag (commit SHAs are not accepted by ` +
      `git clone --branch; use the tiged flow for SHA pinning).`,
    );
  }
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  if (isInsideDocsTemplate()) {
    console.error(
      'sync-skills: refusing to run inside docs-template itself (this repo is the source of truth).',
    );
    process.exit(2);
  }

  const cwd = process.cwd();
  const destAbs = resolve(cwd, args.dest);

  console.log(`sync-skills: ${args.repo}#${args.ref}:${args.src} → ${args.dest}`);

  if (args.dryRun) {
    console.log('sync-skills: dry-run, no changes written.');
    return;
  }

  const tmp = mkdtempSync(join(tmpdir(), 'docs-skills-'));
  try {
    runCloneShallow(args.repo, args.ref, tmp);

    const srcAbs = resolve(tmp, args.src);
    if (!existsSync(srcAbs)) {
      throw new Error(
        `Source path "${args.src}" not found in ${args.repo}#${args.ref}.`,
      );
    }

    if (existsSync(destAbs)) {
      if (!args.force && hasUncommittedChanges(args.dest)) {
        throw new Error(
          `${args.dest} has uncommitted changes. ` +
          `Commit or stash them, or rerun with --force.`,
        );
      }
      rmSync(destAbs, { recursive: true, force: true });
    }
    cpSync(srcAbs, destAbs, { recursive: true });
    console.log(`sync-skills: wrote ${args.dest}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

try {
  main();
} catch (err) {
  console.error(`sync-skills: ${err.message}`);
  process.exit(1);
}
