# Explanation mode

Explanation is **understanding**. The reader steps back from the keyboard and wants to know *why* the system is the way it is — the model, the trade-offs, the history, the alternatives that were rejected. The reader does not need to act after reading.

## Rules

1. **The page answers a question, not a task.** Good titles are nouns and questions: "How replication works", "Why Pear chose hypercore", "Trade-offs of P2P discovery". Avoid "How to…" titles in this mode.
2. **Open with the question and the audience.** "This page explains *why* we use X. Read it if you are deciding whether to adopt X or wondering about its limits."
3. **Discursive prose is allowed and welcome.** Explanation is the only Diataxis mode where long-form paragraphs and analogies are appropriate.
4. **Discuss alternatives and trade-offs.** Naming the alternatives the team rejected is often the most useful part of an explanation page.
5. **Do not include step-by-step instructions.** If the reader asks "how do I do this?" after reading, link them to a how-to.
6. **Do not duplicate reference content.** Do not list every parameter. Describe the *shape* of the API and link to reference for facts.
7. **Cite sources where useful** — RFCs, papers, prior art, internal design docs. Make the reasoning checkable.
8. **End with "Where to go next"** that points to a tutorial, how-to, or reference based on what the reader will likely do next.

## Template

```mdx
---
title: <Question or noun phrase>
description: <One sentence: what this page helps the reader understand.>
docType: explanation
---

<!-- file path: content/docs/explanation/<slug>.mdx -->

# <Title>

This page explains <topic>. Read it if you are <audience signal>.

## The short version

<Two- or three-sentence summary of the answer. Readers should be able to stop here if they only need the headline.>

## <Section: the model>

<Discursive prose explaining the conceptual model.>

## <Section: trade-offs and alternatives>

<What we picked, what we did not, and why.>

## <Section: limits and open questions>

<Honest accounting of where the design is incomplete.>

## Where to go next

- To try it, follow [<tutorial>](/tutorials/<slug>).
- To do <related task>, see [<how-to>](/how-tos/<slug>).
- For exhaustive details, see [<reference>](/references/<slug>).
```

## Common defects

- **Sales pitch.** Explanation should be honest, not promotional. Name the trade-offs.
- **How-to disguise.** If the page contains numbered steps the reader is expected to run, move them to a how-to.
- **Reference dump.** If the page lists every option, move that to reference and keep only the conceptual map here.
- **Unbounded scope.** "About X" pages tend to grow into everything. Split when the page exceeds ~1500 words or covers more than one question.
- **No links out.** Explanation that does not point to actions leaves the reader stranded.

## Examples of good and bad opens

**Good:** "This page explains why Pear uses Hypercore for storage rather than a traditional database. Read it if you are evaluating Pear or wondering about durability guarantees."

**Bad:** "Pear is awesome and here is everything about it." (No question, no audience, no trade-offs.)

**Bad:** "How replication works: 1. Open a feed. 2. Append blocks. 3. Sync." (Steps belong in a how-to. Use prose to describe the model.)
