# How-to guide mode

A how-to guide is a **recipe** for solving a specific real-world problem. The reader already knows the basics — they have a goal and need the shortest reliable path to it.

## Rules

1. **Title states the goal as a task.** "How to <verb> <object>." If you cannot phrase the title that way, the page is probably reference or explanation.
2. **Open with one sentence stating who the guide is for and what they will accomplish.** "This guide shows you how to <X> when you already have <Y>."
3. **Assume working knowledge.** Do not re-teach the basics. Link to a tutorial if a foundation is needed.
4. **Steps must be ordered, numbered, and minimal.** No motivational interludes between steps.
5. **State preconditions explicitly** (versions, permissions, files, environment variables) before step 1.
6. **Use second person, imperative, present tense.** Same voice as tutorials.
7. **Cover the realistic variations** the reader is likely to hit (one OS detour, one auth variant), but resist branching into a tree.
8. **End with verification** — how the reader confirms they succeeded — and links to related how-tos and reference.
9. **Do not explain *why*.** Link to an explanation page if the design choice is non-obvious.

## Template

````mdx
---
title: How to <verb> <object>
description: <One sentence: the goal and the precondition.>
docType: how-to
---

# How to <verb> <object>

This guide shows you how to <goal> when you already have <precondition>.

## Before you begin

You need:

- <Tool / version>
- <Permission / access>
- <Existing artifact, if any>

## Steps

1. <Imperative verb>. <One line of context if essential.>

   ```bash
   <command>
   ```

2. <Imperative verb>.

   ```bash
   <command>
   ```

3. <Imperative verb>.

## Verify

Run:

```bash
<verification command>
```

You should see <expected outcome>.

## Troubleshooting

- **<Symptom>.** <Cause and fix in one sentence.>
- **<Symptom>.** <Cause and fix in one sentence.>

## Related

- [How to <related task>](/how-tos/<slug>)
- [<Reference page>](/references/<slug>)
````

## Common defects

- **Tutorial drift.** A how-to that opens with "In this tutorial…" or includes long context. Tighten the open and cut context.
- **Reference drift.** A how-to that lists every flag of a command. Move flags to reference; keep only the ones used in the steps.
- **Explanation drift.** A how-to that justifies each design decision in prose. Cut or link out.
- **Bag of tips.** A page titled "How to use X" is too broad. Split into specific goals: "How to migrate X", "How to back up X", "How to monitor X".
- **No verification step.** The reader cannot tell if it worked. Always include a confirmation.

## Examples of good and bad opens

**Good:** "This guide shows you how to publish a Pear application to a private hyperdrive when you already have a working app and a hyperdrive key."

**Bad:** "Publishing Pear apps is an important part of the workflow. This guide will help you understand and execute the publishing process." (Padding, no goal.)

**Bad:** "How to use Pear" (Too broad. Split.)
