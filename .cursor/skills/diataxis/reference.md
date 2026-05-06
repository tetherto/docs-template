# Reference mode

Reference is **information** — austere, accurate, complete, and predictable in shape. The reader is not learning; they are looking up a fact. Treat reference like a dictionary entry, not an article.

## Rules

1. **Mirror the structure of the thing being described.** API reference follows the API. CLI reference follows command groups. Config reference follows the config schema.
2. **One entity per page or per heading** (function, command, type, option, event). Do not interleave.
3. **Open with a one-line factual summary.** "`pear run` runs a Pear application from a key or path." No marketing, no tutorial framing.
4. **Use neutral, declarative voice.** "Returns a Promise." Not "You will get a Promise back."
5. **Be exhaustive about the thing being described.** Every parameter, every flag, every return shape, every error code. If you skip something, say why.
6. **Be ruthlessly consistent.** Same heading order, same field names, same code-block style across every entry. Inconsistency is the main defect of reference docs.
7. **Examples are minimal and illustrative**, not pedagogical. One short example per entity is enough; link to a tutorial or how-to for full walk-throughs.
8. **No motivation, no rationale, no history.** Move that to an explanation page and link.
9. **Link out** to how-tos for tasks and to explanation for design rationale.
10. **Keep the prose deletable.** If a sentence does not describe behaviour, signature, or constraint, cut it.

## Standard sections per entity

For each function, method, command, event, type, or option, use the same section order. Pick one of the schemas below and stay with it across the page.

### Function or method

````mdx
## `name(args)` { #name }

<One-line factual description.>

### Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `arg1` | `string` | Yes | <one line> |
| `arg2` | `Options` | No | <one line> |

### Returns

`Promise<Result>` — <one line>.

### Throws

- `ErrorName` — <when>.

### Example

```ts
const result = await name('foo')
```
````

### CLI command

````mdx
## `pear <command>` { #pear-command }

<One-line factual description.>

### Synopsis

```text
pear <command> [options] <args>
```

### Arguments

| Name | Required | Description |

### Options

| Flag | Type | Default | Description |

### Exit codes

| Code | Meaning |

### Example

```bash
pear <command> ...
```
````

### Configuration option

````mdx
## `optionName` { #optionname }

- **Type:** `string`
- **Default:** `"foo"`
- **Required:** No
- **Since:** `1.4.0`

<One- to two-sentence factual description, including units, valid range, and side effects.>

### Example

```json
{ "optionName": "bar" }
```
````

## Frontmatter

```yaml
---
title: <Entity, package, or surface name>
description: <One sentence: what this reference page covers and for whom.>
docType: reference
schemaType: APIReference
---
```

## Common defects

- **Tutorial in disguise.** Long narrative around each entry. Cut it; link to a tutorial.
- **Inconsistent shape.** Some functions have a Returns section, others do not; parameter tables have different columns. Pick one schema and apply it to every entity.
- **Missing fields.** No type, no default, no error list. Reference must be exhaustive.
- **Editorial commentary.** "This is a powerful function." Delete.
- **Nested examples that grow into stories.** Trim to the smallest illustrative snippet.
- **Cross-mode links missing.** Reference should always link out to how-tos for tasks and explanation for design.

## Examples of good and bad opens

**Good:** "`pear run <key>` starts a Pear application identified by `<key>`. It returns the process exit code."

**Bad:** "Running Pear apps is one of the most powerful features. With `pear run` you can…" (Marketing, not reference.)
