---
name: docs-review
description: >-
  Runs a full documentation review by orchestrating the diataxis,
  google-tech-writing, and docs-frontmatter skills against a set of MDX or
  Markdown files (or a PR diff) and returns a single tiered report
  (must-fix / consider / nit). Use when the user asks to "review docs",
  "audit a docs page", "check this PR", or runs a docs review on changed
  files.
---

# Docs review

This skill is the orchestrator for the docs review suite. It runs three sub-skills against the same input and produces one combined report.

Sub-skills it composes:

1. [`diataxis`](../diataxis/SKILL.md) — page is in the right Diataxis mode and directory.
2. [`google-tech-writing`](../google-tech-writing/SKILL.md) — prose follows Google's style guide.
3. [`docs-frontmatter`](../docs-frontmatter/SKILL.md) — frontmatter satisfies `@tetherto/docs-seo-schema`.

## When to apply this skill

- The user asks to "review", "audit", or "check" docs.
- A PR touches files under `content/docs/**`, `**/*.mdx`, `**/*.md`, or `README.md`.
- The user references multiple docs files at once and asks for feedback.
- Pre-merge gate before publishing a docs change.

If the user asks for *only* style review, *only* Diataxis classification, or *only* frontmatter cleanup, skip this orchestrator and apply the specific skill directly.

## Input shapes this skill handles

- **A single file path.** Review that file end-to-end.
- **A list of file paths.** Review each, then aggregate.
- **A PR or branch reference** (e.g. "review PR #42", "review the changes on this branch"). Resolve the changed files first (via `gh` or `git diff --name-only`), filter to docs files, and treat as a list.
- **A diff or pasted MDX block.** Review the visible content as a single page; flag if the file location is unknown (Diataxis classification needs the path).

## Workflow

Track progress with this checklist; complete every step before reporting.

```
Review progress:
- [ ] Step 1: Resolve the file list
- [ ] Step 2: Read each file (frontmatter + body)
- [ ] Step 3: Apply diataxis classification per file
- [ ] Step 4: Apply google-tech-writing rules per file
- [ ] Step 5: Apply docs-frontmatter checks per file
- [ ] Step 6: Aggregate findings, dedupe, sort by severity
- [ ] Step 7: Emit the report (see template below)
```

### Step 1 — Resolve the file list

If given a PR or branch:

```bash
git diff --name-only <base>..HEAD -- 'content/docs/**' '**/*.mdx' '**/*.md'
```

Or, with `gh`:

```bash
gh pr diff <number> --name-only | grep -E '\.(mdx?|md)$'
```

If the user pasted a single file or block, treat it as a one-file list.

### Step 2 — Read each file

Read the **whole** file. Do not skim. Frontmatter and body must be in context together because Diataxis mode and `docType` are checked against directory and content simultaneously.

### Step 3 — Diataxis pass

For each file:

1. Classify (Step 1 of [`diataxis`](../diataxis/SKILL.md)).
2. Read the relevant mode file under `diataxis/` (tutorial.md, how-to.md, reference.md, or explanation.md).
3. Apply the universal Diataxis checklist.
4. Record findings tagged `[diataxis]`.

### Step 4 — Google tech writing pass

For each file:

1. Read the body once for audience and outcome.
2. Apply the [Core rules](../google-tech-writing/SKILL.md#core-rules--apply-to-every-sentence) and the [checklist](../google-tech-writing/checklist.md).
3. For style fixes worth flagging, propose the rewrite.
4. Record findings tagged `[style]`.

### Step 5 — Frontmatter pass

For each file:

1. Apply the [`docs-frontmatter`](../docs-frontmatter/SKILL.md) workflow.
2. Verify `description` is present and well-shaped, `docType` matches directory, `ogImage`/`noIndex`/`lastModified` are correct.
3. Record findings tagged `[frontmatter]`.

### Step 6 — Aggregate

- Group findings by file.
- Within each file, sort by severity: **must-fix**, then **consider**, then **nit**.
- Within each severity bucket, sort by line number.
- Dedupe identical findings raised by more than one sub-skill (rare, but happens with terminology-vs-Diataxis overlap). Keep the most specific tag.

### Step 7 — Emit the report

Use the [report template](#report-template) below. Include counts, the top three issues, and per-file detail.

## Severity rubric (shared across all three sub-skills)

| Severity | Definition | Effect on merge |
|---|---|---|
| **must-fix** | Misleading, factually broken, fails the schema, violates inclusivity, or breaks the Diataxis contract (page in the wrong directory). | Block merge. |
| **consider** | Substantive style or structure improvement. The page works but is harder to read or maintain than it should be. | Strongly suggested; not blocking. |
| **nit** | Cosmetic preference. | Author may take or leave. |

When in doubt between **consider** and **nit**, ask: "Would a reader notice this?" If yes, it is **consider**.

## Report template

````markdown
# Docs review

**Files reviewed:** N
**Findings:** X must-fix, Y consider, Z nit

## Top three to address first

1. [<severity>][<tag>] <file>:<line> — <one-line problem>
2. [<severity>][<tag>] <file>:<line> — <one-line problem>
3. [<severity>][<tag>] <file>:<line> — <one-line problem>

## Per-file findings

### `content/docs/<path>.mdx`

**Diataxis mode:** <tutorial | how-to | reference | explanation | …>
**docType:** <value, or "missing">

#### must-fix

- [diataxis] line N — <problem>. Suggested action: <…>.
- [frontmatter] frontmatter — `description` missing. Suggested:
  ```yaml
  description: <…>
  ```

#### consider

- [style] line N — <problem>. Suggested rewrite: "<…>".

#### nit

- [style] line N — <note>.

### `content/docs/<other>.mdx`

…

## Summary

- <One-paragraph summary of the patterns seen across the review.>
- <Suggested follow-ups: e.g. "split <file> into a tutorial and a reference page", "add a glossary section to define <term>".>
````

## Worked example

For a tutorial page at `content/docs/tutorials/chat-app.mdx`, a typical condensed report:

```
# Docs review

Files reviewed: 1
Findings: 2 must-fix, 3 consider, 1 nit

## Top three to address first

1. [must-fix][frontmatter] content/docs/tutorials/chat-app.mdx — `description` is empty; schema fails.
2. [must-fix][diataxis] content/docs/tutorials/chat-app.mdx:120 — section "Why hypercore?" is explanation in a tutorial; split into explanation/why-hypercore.mdx.
3. [consider][style] content/docs/tutorials/chat-app.mdx:8 — opening paragraph does not promise a concrete artifact.

## Per-file findings

### content/docs/tutorials/chat-app.mdx

Diataxis mode: tutorial
docType: tutorial

#### must-fix
- [frontmatter] frontmatter — `description` empty. Suggested:
    description: Walks first-time Pear users through building a peer-to-peer chat app, from project init to first message.
- [diataxis] line 120 — "Why hypercore?" section is explanation in a tutorial. Move to content/docs/explanation/why-hypercore.mdx and link.

#### consider
- [style] line 8 — opening sentence is passive ("The reader will be guided…"). Rewrite: "In this tutorial you will build a peer-to-peer chat app."
- [style] line 45 — "simply run" — drop "simply".
- [style] line 78 — sentence is 41 words; split.

#### nit
- [style] line 102 — heading "How To Run The App" is title-case; prefer "How to run the app".

## Summary
The page is a real tutorial in spirit but mixes one explanation section and uses passive voice in the open. Splitting "Why hypercore?" out and tightening the open will fix the structural issues; the rest is style polish.
```

## Tips for keeping reviews useful

- **Do not list every nit if there are dozens.** Cap nits at five per file; tell the author there are more.
- **Always propose a rewrite for must-fix and consider** unless the fix is purely structural (split this page, move this section).
- **Do not duplicate findings across tags.** If a sentence is both passive and uses banned filler, list once with both issues mentioned.
- **Surface patterns in the Summary** when a defect repeats across the review — "passive voice throughout the tutorials section" is more useful than 20 individual line-level flags.

## Reference

- [`diataxis`](../diataxis/SKILL.md)
- [`google-tech-writing`](../google-tech-writing/SKILL.md)
- [`docs-frontmatter`](../docs-frontmatter/SKILL.md)
