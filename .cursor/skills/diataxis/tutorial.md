# Tutorial mode

A tutorial is a **lesson**. The reader is a learner who follows you and ends with a small working result they built themselves. Success is measured by whether they can finish without help.

## Rules

1. **Promise a concrete outcome in the opening paragraph.** "By the end of this tutorial you will have a running X that does Y." If you cannot fill that template, the page is not a tutorial.
2. **Hold the reader's hand.** Every step that can fail must include the exact command, file path, expected output, and what to do if the output differs.
3. **Use second person and imperative mood.** "Run `npm install`." Not "Users should run `npm install`."
4. **Use present tense.** "The script writes a file" — not "will write."
5. **Do not explain trade-offs, history, or alternative approaches.** A tutorial is not the place. Link to an explanation page if the reader is likely to wonder.
6. **Do not branch.** No "if you are on Windows do X, otherwise Y" detours longer than two lines. Pick the supported path; link out for variants.
7. **Show the result after each step that produces visible output** — terminal output, file contents, screenshot, or a single-line "you should now see…" cue.
8. **End with a "What you built" recap and pointers** to the next tutorial, the relevant how-tos, and reference docs.

## Template

````mdx
---
title: <Verb-first title — what the reader builds>
description: <One sentence: who this is for and what they will have at the end.>
docType: tutorial
---

# <Title>

In this tutorial you will <build / configure / publish> <X>. By the end you will have <concrete artifact>.

## Before you start

You need:

- <Prerequisite 1, with version>
- <Prerequisite 2>
- <Account / credential, if any>

## Step 1 — <Verb the reader does>

<One short paragraph of context, no more.>

```bash
<exact command>
```

You should see:

```text
<expected output>
```

## Step 2 — <Verb the reader does>

…

## What you built

You now have <artifact>. It does <X>.

## Where to go next

- To <accomplish related task>, see [<how-to title>](/how-tos/<slug>).
- For the full <thing> options, see [<reference title>](/references/<slug>).
- To understand <why this design>, read [<explanation title>](/explanation/<slug>).
````

## Common defects

- **No artifact.** If the reader finishes and has nothing they can keep, it is a feature tour or an explanation, not a tutorial. Reclassify.
- **Branching choices.** "Choose A or B based on your needs" pushes the reader into decisions they cannot make yet. Pick one for them.
- **Hidden prerequisites.** Steps that fail without warning destroy trust. List every prerequisite up front.
- **Why this works essays.** Cut them. Link to an explanation page instead.
- **Reference dumps.** Long flag tables belong in reference. Link out.

## Examples of good and bad opens

**Good:** "In this tutorial you will create a new chat room application using Pear. By the end you will have a peer-to-peer chat that runs without a server."

**Bad:** "Pear is a peer-to-peer runtime. This tutorial covers how Pear works and shows some examples." (This is explanation pretending to be a tutorial.)

**Bad:** "Run the following commands to set up Pear." (This is a how-to with no learning arc.)
