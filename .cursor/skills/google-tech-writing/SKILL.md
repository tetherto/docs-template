---
name: google-tech-writing
description: >-
  Enforces Google's developer documentation style guide and technical writing
  principles when authoring or reviewing docs, MDX, Markdown, READMEs, release
  notes, comments, or commit messages. Covers active voice, second person,
  present tense, sentence-case headings, defined acronyms, short sentences,
  consistent terminology, parallel lists, banned filler words ("easy",
  "simple", "just"), and tiered severity for review feedback.
---

# Google tech writing

This skill applies Google's [developer documentation style guide](https://developers.google.com/style) and [technical writing](https://developers.google.com/tech-writing) principles to any prose the agent writes or reviews.

## When to apply this skill

- Writing or editing files under `content/docs/**`, `README.md`, `docs/**`, `*.mdx`, `*.md`.
- Reviewing a docs PR or pull-request description.
- Writing release notes, changelog entries, or substantial code comments.
- The user asks to "review", "audit", "tighten", or "rewrite" prose.

## Core rules — apply to every sentence

These are the rules with the highest cost-benefit ratio. Apply them automatically to anything you write or revise.

### 1. Voice and tense

- **Use active voice.** Subject performs the verb. "The server validates the token," not "The token is validated by the server."
- **Use present tense.** "The function returns a string," not "will return."
- **Use second person.** Address the reader as "you." Avoid "we" except for genuinely shared work ("we recommend"). Never "the user" when you mean "you."
- **Use the imperative for instructions.** "Run `npm install`," not "You should run `npm install`."

### 2. Sentence shape

- **One idea per sentence.** If a sentence has two clauses joined by "and" doing different work, split it.
- **Short sentences.** Aim for an average under 20 words. If a sentence is over 30, rewrite it.
- **Avoid ambiguous pronouns.** Replace "it", "this", "they" with the noun whenever the referent is more than one clause away.
  - Bad: "The cache flushes when the queue is empty. This is configurable."
  - Good: "The cache flushes when the queue is empty. The flush threshold is configurable."
- **Use "that" for restrictive clauses, "which" for non-restrictive (preceded by a comma).**

### 3. Word choice

- **Define every term on first use.** Acronyms get spelled out the first time they appear in a page; abbreviations get a one-line definition.
- **Use terms consistently.** Pick one term and use it throughout. Do not alternate between "API endpoint", "URL", "route", "path".
- **Cut filler words.** Banned in instructional prose: "easy", "simple", "simply", "just", "obviously", "of course", "merely", "basically", "actually". They condescend and add no information.
- **Cut hedges that hide uncertainty.** "Sort of", "kind of", "tends to", "may sometimes". Either it does or it does not; if it depends, say on what.
- **Prefer plain words.** "Use" over "utilize". "Help" over "facilitate". "Start" over "initiate". "Show" over "demonstrate".
- **Avoid "please" in instructions.** "Run the command," not "Please run the command."
- **Avoid "we" in reference docs.** Reference is impersonal. Use the API name as the subject.

### 4. Structure

- **Sentence-case headings.** "How to publish a build", not "How To Publish A Build". Proper nouns keep their capitalization.
- **Headings describe the content.** A reader scanning the table of contents should know what is in the section.
- **Lists for parallel items, tables for parallel comparisons.** Three or more items joined by "and" or "or" in prose almost always read better as a list.
- **Use parallel grammatical structure within a list.** Either every bullet starts with an imperative verb, or none do. Either every bullet ends with a period, or none do.
- **Top of page states audience and outcome.** The first paragraph tells the reader who the page is for, what they will know or be able to do after reading, and what knowledge it assumes.

### 5. Code, UI, and product names

- **Format inline code, file paths, env vars, commands, and identifiers in backticks.**
- **Bold UI elements** the user clicks or sees: "Click **Settings**, then **Profile**."
- **Use the official capitalization** of product, command, and brand names. Match casing from upstream docs.
- **Don't paraphrase error messages.** Quote them verbatim in code formatting.

### 6. Links

- **Link text describes the destination.** Not "click here" or "this page". "See [the publishing guide](…)".
- **Do not bury links inside long sentences.** Put them where the reader expects to act.

### 7. Inclusivity

- **Use gender-neutral language.** "They" for unknown singular. "Operator", "maintainer", "team" instead of gendered nouns.
- **Avoid culture-specific idioms** ("piece of cake", "low-hanging fruit") in docs read internationally.
- **Avoid "blacklist/whitelist", "master/slave"**, and similar pairs. Use "allowlist/denylist", "primary/replica".

## Tiered severity for review

When reviewing existing docs, classify each finding so the author knows what to do first. Use these labels in feedback:

| Label | Meaning | Examples |
|---|---|---|
| **must-fix** | Misleading, factually unclear, or violates inclusivity. Block merge. | Passive voice that hides who acts, ambiguous pronouns that could mean two things, undefined acronyms on first use, banned filler words in instructional sentences, broken links, wrong product casing. |
| **consider** | Style improvement that meaningfully helps readers. Strongly suggested. | Long sentences (>30 words) that could split, weak headings, missing audience statement at top of page, inconsistent terminology across sections. |
| **nit** | Cosmetic. Author may take or leave. | Heading title-case vs sentence-case for a single heading, oxford comma preference, link text that is acceptable but not ideal. |

Format each finding as:

```
- [must-fix] <file>:<line> — <one-sentence problem>. Suggested rewrite: "<…>"
- [consider] <file>:<line> — <one-sentence problem>. Suggested rewrite: "<…>"
- [nit]      <file>:<line> — <one-sentence note>.
```

Always provide a suggested rewrite for **must-fix** and **consider** unless the fix is obvious.

## Review workflow

When asked to review a docs page or diff:

1. Read the page top-to-bottom once for **audience and outcome** — does the first paragraph tell the reader who and what?
2. Read again, scanning for the [Core rules](#core-rules--apply-to-every-sentence). Use the [checklist](checklist.md) to avoid missing categories.
3. Group findings by file, then by severity (must-fix → consider → nit).
4. For each must-fix and consider, propose a rewrite.
5. Summarise at the end: total counts per severity, and the top three issues to address first.

## Worked examples

For before-and-after rewrites of common defects, see [examples.md](examples.md).

## Banned and preferred phrases (cheat sheet)

| Avoid | Prefer |
|---|---|
| "It is easy to…" | Cut. Show the steps. |
| "Simply run…" | "Run…" |
| "Just call…" | "Call…" |
| "Please note that…" | Cut, or "Note:" |
| "In order to…" | "To…" |
| "Utilize" | "Use" |
| "Leverage" | "Use" |
| "Functionality" | "Feature" or "behaviour" |
| "Obviously," | Cut. If it were obvious you would not be writing it. |
| "Basically," | Cut. |
| "The user should…" | "You…" |
| "We will now…" | Imperative: "Run…" / "Open…" |
| "Allows you to" | "Lets you" or rewrite as a direct verb |
| "Click here" (link text) | Describe the destination |

## Reference

- [Google developer documentation style guide](https://developers.google.com/style)
- [Google technical writing courses](https://developers.google.com/tech-writing)
- Project supplement: [checklist.md](checklist.md)
- Worked examples: [examples.md](examples.md)
