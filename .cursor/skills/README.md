# Docs skills

Cursor [Agent Skills](https://docs.cursor.com/agent/skills) that enforce our documentation standards on every repo that uses this template. The skills are the source of truth for **what good docs look like at Tether** and are intended to be shared, versioned, and updated centrally from `docs-template`.

## What's in here

| Skill | Purpose |
|---|---|
| [`diataxis/`](./diataxis/) | Classifies each MDX page as tutorial, how-to, reference, or explanation, enforces the structure and voice of each, and aligns with the `docType` enum in `@tetherto/docs-seo-schema`. |
| [`google-tech-writing/`](./google-tech-writing/) | Applies Google's developer documentation style guide: active voice, second person, present tense, sentence-case headings, defined acronyms, banned filler ("easy", "simple", "just"), tiered severity for review. |
| [`docs-frontmatter/`](./docs-frontmatter/) | Enforces the SEO frontmatter contract from `@tetherto/docs-seo-schema`: required `description`, recommended `docType` matching directory, and optional `ogImage`, `noIndex`, and `lastModified`. |
| [`docs-review/`](./docs-review/) | Orchestrates the three skills above against a file list or PR diff and emits a single tiered report (must-fix / consider / nit). |

All four are **project-level** skills — placed under `.cursor/skills/` so Cursor picks them up automatically for anyone working in the repo.

## How Cursor discovers them

Cursor reads project skills from `.cursor/skills/` in the workspace root. No installation step is required for users of a repo that contains this directory; the skills are visible to the agent the moment the repo is opened.

If you want these skills available across every project on your machine (in addition to the project-level pickup above), symlink them into `~/.cursor/skills/`. Run from the root of a checked-out copy of `docs-template` so `$PWD` resolves to the right location:

```bash
# from the docs-template repo root
ln -s "$PWD/.cursor/skills/diataxis"            ~/.cursor/skills/diataxis
ln -s "$PWD/.cursor/skills/google-tech-writing" ~/.cursor/skills/google-tech-writing
ln -s "$PWD/.cursor/skills/docs-frontmatter"    ~/.cursor/skills/docs-frontmatter
ln -s "$PWD/.cursor/skills/docs-review"         ~/.cursor/skills/docs-review
```

Project-level skills in any repo's `.cursor/skills/` take precedence over personal skills with the same name, so the symlinks are a safety net for repos that have not yet adopted the template.

## Sharing across the org

`docs-template` is the single source of truth. Consumer repos pick up skills via one of three flows. Pick the one that matches your team's update cadence.

### Option A — One-shot copy (`tiged` / `degit`)

Best for: new repos, occasional manual re-syncs, no need to track upstream changes.

```bash
# from the consumer repo root
npx --package=tiged@2 -- tiged tetherto/docs-template/.cursor/skills .cursor/skills --force
```

Pin a tag or commit:

```bash
npx --package=tiged@2 -- tiged tetherto/docs-template/.cursor/skills#v1.2.0 .cursor/skills --force
```

### Option B — `npm run sync-skills` (recommended)

Best for: repos that want a documented, reproducible sync command in their own `package.json`.

The template ships [`scripts/sync-skills.mjs`](../../scripts/sync-skills.mjs) and an `npm run sync-skills` entry. Copy both into your consumer repo (or call the script via `tiged` once and commit it). Then:

```bash
# default: pulls latest main from tetherto/docs-template
npm run sync-skills

# pin to a tag
npm run sync-skills -- --ref=v1.2.0

# point at a fork
npm run sync-skills -- --repo=myorg/my-docs-template --ref=main

# preview without writing
npm run sync-skills -- --dry-run
```

Environment variables also work (`DOCS_SKILLS_REPO`, `DOCS_SKILLS_REF`). The script refuses to run inside `docs-template` itself, so it cannot clobber the source of truth.

### Option C — `git subtree` (history-preserving)

Best for: teams that want upstream history merged into their repo and clean conflict resolution when both sides edit a skill.

First-time set-up in the consumer repo:

```bash
git remote add docs-template https://github.com/tetherto/docs-template.git
git subtree add --prefix=.cursor/skills docs-template main --squash
```

Subsequent updates:

```bash
git fetch docs-template
git subtree pull --prefix=.cursor/skills docs-template main --squash
```

Send local improvements back upstream:

```bash
git subtree push --prefix=.cursor/skills docs-template feature/<your-improvement>
# then open a PR in docs-template
```

## Update workflow (org-wide)

1. Open a PR against [`tetherto/docs-template`](https://github.com/tetherto/docs-template) modifying the relevant skill under `.cursor/skills/`.
2. Tag a release (`v1.x.y`) when the change is ready to roll out.
3. Consumer repos run their sync command (Option A / B) or `git subtree pull` (Option C), pinning to the new tag if they want stable rollout.
4. To detect drift in CI, run `npm run sync-skills` followed by `git diff --exit-code .cursor/skills/`. The diff returns non-zero when local skills differ from the upstream ref, which fails the build (optional, opinionated). `--dry-run` only logs the planned action; it does not perform a comparison on its own.

## Authoring conventions for skills in this directory

Anyone editing skills here should keep them tight and predictable so the agent can rely on them across many repos:

- **One concern per skill.** Cross-link instead of duplicating.
- **Top-level `SKILL.md` under 500 lines.** Push depth into sibling `.md` files (progressive disclosure).
- **Third-person, specific descriptions** in YAML frontmatter — the agent reads only the description until the skill is invoked.
- **Tiered severity** (must-fix / consider / nit) wherever the skill produces review output, so `docs-review` can aggregate cleanly.
- **No time-sensitive content** ("by August 2025…"); use a "deprecated patterns" section if needed.
- **Match the schema and directory layout of this template.** Mode-to-directory tables in `diataxis/SKILL.md` and the `docType` enum in `@tetherto/docs-seo-schema` must stay aligned.

## Reference

- [Cursor Agent Skills documentation](https://docs.cursor.com/agent/skills)
- [Diataxis framework](https://diataxis.fr)
- [Google developer documentation style guide](https://developers.google.com/style)
- [Google technical writing courses](https://developers.google.com/tech-writing)
- Schema source: [`packages/docs-seo-schema/src/index.ts`](../../packages/docs-seo-schema/src/index.ts)
