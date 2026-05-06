---
name: diataxis
description: >-
  Classifies documentation pages into the four Diataxis modes (tutorial,
  how-to, reference, explanation) and enforces the structure, voice, and
  scope of each. Use when authoring, reviewing, or refactoring docs in
  content/docs/**, when the user mentions Diataxis, tutorials, how-to guides,
  reference, or explanation, or when frontmatter docType is set or missing.
---

# Diataxis

Diataxis is a documentation framework that splits docs into four modes based on what the reader needs *right now*. Mixing two modes in one page is the most common documentation defect this skill exists to prevent.

| Mode | Reader's need | Reader's question | Voice |
|---|---|---|---|
| Tutorial | Learning by doing | "Teach me." | Confident, hand-holding, present tense |
| How-to guide | Solving a specific task | "Show me how." | Direct, imperative, goal-focused |
| Reference | Looking up facts | "Tell me." | Austere, neutral, complete |
| Explanation | Understanding context | "Help me think about this." | Discursive, analytical |

Source: [diataxis.fr](https://diataxis.fr).

## Step 1 — Classify the page

Before writing or reviewing, decide which mode the page is in. Use this decision tree, **in order**:

1. Is the reader expected to **follow concrete steps and finish with a working artifact they did not have before**?
   - **Yes, and they are new to the system** → **Tutorial**
   - **Yes, but they already know the system and want to accomplish a specific goal** → **How-to**
2. Is the reader looking up **facts about an API, schema, CLI, config, or behaviour** with no narrative arc?
   → **Reference**
3. Is the reader trying to **understand why something works the way it does**, the trade-offs, or the historical context, with no concrete steps required?
   → **Explanation**

If two answers feel correct, the page is doing two jobs and must be split.

### Mapping to this template's directory and frontmatter

| Diataxis mode | `content/docs/` directory | `docType` value (from `@tetherto/docs-seo-schema`) |
|---|---|---|
| Tutorial | `tutorials/` | `tutorial` |
| How-to guide | `how-tos/` | `how-to` |
| Reference | `references/` | `reference` |
| Explanation | `explanation/` | `explanation` |
| Onboarding orientation | `getting-started/` | `getting-started` |
| FAQ | `faqs/` | `faq` |
| Generic landing/index | top-level `index.mdx` | `page` |

`getting-started`, `faq`, and `page` are template-specific helpers, not Diataxis modes. Treat them as follows:

- `getting-started` is a **tutorial** in spirit. Apply tutorial rules.
- `faq` answers concrete questions. Apply how-to rules per answer.
- `page` (landing pages) should orient readers toward the four real modes; do not pack content here.

## Step 2 — Apply the mode-specific rules

Read only the file for the mode you are working on:

- Tutorial → [tutorial.md](tutorial.md)
- How-to guide → [how-to.md](how-to.md)
- Reference → [reference.md](reference.md)
- Explanation → [explanation.md](explanation.md)

If you are reviewing several pages in one session, read each mode file once at the start and keep it in context.

## Step 3 — Run the universal Diataxis checklist

Apply this to every page regardless of mode:

- [ ] The page has exactly **one** Diataxis mode. No tutorial-style narrative inside reference. No how-to checklist inside explanation. No conceptual essay inside a tutorial.
- [ ] The directory under `content/docs/` matches the mode (see table above).
- [ ] `docType` in frontmatter matches the directory and the actual content.
- [ ] The opening paragraph signals the mode to the reader (for example, a tutorial opens with "In this tutorial you will…", a how-to opens with "This guide shows you how to…", a reference opens with a one-line factual summary, an explanation opens with the question it answers).
- [ ] Cross-links point to the right mode for follow-up: tutorials link to how-tos and reference, how-tos link to reference, reference links to explanation, explanation links to tutorials and how-tos. Avoid linking like-to-like in long chains.
- [ ] Content from another mode that crept in is either removed, inlined as a single short sentence, or extracted to a sibling page in the correct directory and linked.

## Step 4 — Report findings

When reviewing, output findings using the [tiered severity](../docs-review/SKILL.md) the rest of the suite uses:

- **must-fix**: page is in the wrong directory or `docType`, or mixes two modes in a way that confuses the reader.
- **consider**: a section belongs in another mode and should be split out, or cross-links go to the wrong mode.
- **nit**: opening paragraph does not signal the mode, headings do not match the mode's voice.

## Anti-patterns

- A "tutorial" that is really a feature tour — readers do not finish with a working artifact. Reclassify as explanation or split.
- A "how-to" with motivation, history, and trade-offs woven through — move that prose into a sibling explanation.
- A "reference" page that teaches — move teaching content into a tutorial; keep reference dry.
- An "explanation" with copy-pasteable steps — extract the steps into a how-to.
- Calling everything "Getting started" — only the **first** orientation page is `getting-started`. Subsequent learning material is tutorial; subsequent task material is how-to.

## When the user asks you to write a new page

1. Ask (or infer) the Diataxis mode using Step 1.
2. Place the file in the directory from Step 1's table.
3. Set `docType` in frontmatter (see [`docs-frontmatter`](../docs-frontmatter/SKILL.md)).
4. Open the relevant mode file and follow its template.
5. Run the universal checklist before finishing.

## When the user asks you to review or refactor docs

1. Classify each page (Step 1).
2. For each page, run the mode-specific rules and the universal checklist.
3. Group findings by file and severity.
4. Hand off to [`docs-review`](../docs-review/SKILL.md) if the user asked for a full audit (Diataxis + Google style + frontmatter).
