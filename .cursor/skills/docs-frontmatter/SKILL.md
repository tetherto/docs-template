---
name: docs-frontmatter
description: >-
  Enforces the SEO frontmatter contract from @tetherto/docs-seo-schema on
  every MDX page in content/docs. Required description, recommended docType
  matching the directory and Diataxis mode, optional ogImage, schemaType,
  noIndex, and lastModified. Use when authoring or editing MDX, when the
  build emits [@tetherto/docs-seo] warnings, or when the user asks to fix
  frontmatter, SEO metadata, or social cards.
---

# Docs frontmatter

Every MDX page under `content/docs/**` must satisfy the schema in `@tetherto/docs-seo-schema` (see [`packages/docs-seo-schema/src/index.ts`](../../../packages/docs-seo-schema/src/index.ts)). This skill is the rulebook.

## The schema (authoritative)

```yaml
---
title: <string — page title; rendered in <h1>, sidebar, breadcrumbs>
description: <string, REQUIRED — non-empty after trim, used for meta, OG, JSON-LD>
docType: tutorial | how-to | reference | explanation | page | faq | getting-started
schemaType: TechArticle | APIReference | WebPage  # optional; inferred from path/docType if omitted
ogImage: /path/to/image.png | https://...           # optional override; defaults to generated OG WebP
noIndex: true | false                                # optional; excludes from sitemap, sets robots noindex
lastModified: 2026-04-01                              # optional; sitemap lastmod and JSON-LD dates
---
```

The schema is enforced at MDX compile time by `tetherSeoFrontmatterSchema`. Builds also emit `[@tetherto/docs-seo]` console warnings for missing optional fields, deduped per page.

- `DOCS_SEO_QUIET_GENERATED=1` silences only the warnings for fields with sensible auto-generated / inferred defaults (`ogImage`, `schemaType`, `lastModified`). Recommended when the site uses the Takumi OG prebuild and the `fumadocs-mdx` `lastModified` plugin.
- `DOCS_SEO_SILENT=1` silences ALL warnings (including required-`description`). Use sparingly.

## Required: `description`

- **Always provide it.** Empty or missing description fails the schema and breaks meta tags, Open Graph, Twitter cards, and JSON-LD.
- **One sentence, 100–155 characters** is ideal for search snippets. Stay under 200 — longer descriptions get truncated by Google and most OG renderers, and the truncation point is not under our control.
- **State who and what.** "<Who this is for> <what they will learn or look up>." Avoid restating the title.
- Do not end with the project name; the layout adds that.

**Good:**
> Walks first-time Pear users through creating a peer-to-peer chat application end to end.

**Bad:**
> A page about chat. *(useless)*
>
> This page is the official documentation page for the chat tutorial in the Pear documentation, where users can learn... *(filler, over the cap)*

## Strongly recommended: `docType`

`docType` ties the page to a Diataxis mode and drives JSON-LD inference. Set it explicitly even though it is optional, so reviewers can trust it.

The `docType` value **must match the directory** the file lives in:

| Directory under `content/docs/` | `docType` |
|---|---|
| `tutorials/` | `tutorial` |
| `how-tos/` | `how-to` |
| `references/` | `reference` |
| `explanation/` | `explanation` |
| `getting-started/` | `getting-started` |
| `faqs/` | `faq` |
| top-level landing pages | `page` |

If the directory and the content disagree, the page is in the wrong place. Apply the [`diataxis`](../diataxis/SKILL.md) skill to reclassify before fixing frontmatter.

### `docType` → inferred `schemaType`

When `schemaType` is omitted, the build infers JSON-LD `@type` from `docType` and the path:

| `docType` | Inferred `schemaType` |
|---|---|
| `tutorial`, `how-to`, `getting-started` | `TechArticle` |
| `reference` | `APIReference` |
| `explanation`, `faq`, `page` | `WebPage` |

Set `schemaType` explicitly only when you want to override the inference (rare).

## Optional but useful

### `ogImage`

- Leave **unset** by default. The Takumi prebuild generates a per-page WebP at `public/og/docs/<slug>/image.webp` and `getPageImage()` resolves it automatically.
- Set `ogImage` only to override with a custom illustration. Use a **site-relative path** (`/og/custom/foo.png`) or an absolute URL. Relative paths are normalized as static assets — no trailing slash before the extension.
- Required size: **1200×630**.

### `noIndex`

- Set `noIndex: true` for drafts, internal-only pages, or content excluded from search.
- The build excludes the page from the sitemap and emits `<meta name="robots" content="noindex">`.

### `lastModified`

- Set when content changes materially (not for typo fixes).
- Accepts an ISO date string (`2026-04-01`) or a JS Date.
- Drives sitemap `<lastmod>` and JSON-LD `datePublished` / `dateModified` on `WebPage`, `TechArticle`, and `APIReference` graphs.

## Tiered severity for review

| Label | Trigger |
|---|---|
| **must-fix** | `description` missing or empty (schema failure). `docType` does not match directory. `ogImage` points to a non-existent path. `noIndex` accidentally set on a public page. |
| **consider** | `docType` missing on a page where it would help (any page under a Diataxis directory). `lastModified` not bumped on a substantively edited page. `description` over 200 chars or under 60. |
| **nit** | `description` restates the title. `schemaType` set redundantly to the inferred value. |

## Workflow

### When creating a new MDX page

1. Decide the Diataxis mode (run [`diataxis`](../diataxis/SKILL.md) Step 1 if unsure).
2. Place the file in the matching directory.
3. Fill the frontmatter using this template:

   ```yaml
   ---
   title: <Page title>
   description: <One sentence, 100–155 chars, who + what.>
   docType: <tutorial | how-to | reference | explanation | getting-started | faq | page>
   ---
   ```

4. Add `lastModified` if the content has a meaningful publish date.
5. Add `ogImage` only if you have a custom asset.
6. Run the build (`npm run dev` or `npm run build`); resolve any `[@tetherto/docs-seo]` warnings.

### When reviewing existing MDX

1. Open the page; read frontmatter first.
2. Check description (required), docType (matches directory), ogImage (path resolves), noIndex (intentional?), lastModified (current?).
3. Group findings by file with the severity labels above.
4. For must-fix issues, propose the corrected frontmatter as a code block.

### When the build emits `[@tetherto/docs-seo]` warnings

Each warning identifies the page slug and the missing field. Address them in this order:

1. **Missing description** — must-fix; schema will fail.
2. **Missing docType** — consider; add to match directory.
3. **Missing ogImage** — usually fine (auto-generated). Add only if you want a custom social card.
4. **Missing schemaType** — usually fine (inferred). Add only to override.
5. **Missing lastModified** — add when the page has a meaningful update.

If a site uses the Takumi OG prebuild and the `fumadocs-mdx` `lastModified` plugin, prefer `DOCS_SEO_QUIET_GENERATED=1` over `DOCS_SEO_SILENT=1` so `description` warnings stay loud. Use `DOCS_SEO_SILENT=1` only when the warnings are temporarily noisy, never as a fix.

## Example: full frontmatter for each docType

### Tutorial

```yaml
---
title: Build a peer-to-peer chat with Pear
description: Walks first-time Pear users through creating a peer-to-peer chat application end to end, from project init to first message.
docType: tutorial
lastModified: 2026-04-15
---
```

### How-to

```yaml
---
title: How to publish a Pear app to a private hyperdrive
description: Steps to publish a working Pear application to a private hyperdrive when you already have a hyperdrive key.
docType: how-to
lastModified: 2026-03-20
---
```

### Reference

```yaml
---
title: pear run
description: Reference for the pear run CLI command, including arguments, options, environment variables, and exit codes.
docType: reference
schemaType: APIReference
lastModified: 2026-04-10
---
```

### Explanation

```yaml
---
title: Why Pear uses Hypercore for storage
description: Explains the trade-offs behind choosing Hypercore over a traditional database for Pear's append-only storage layer.
docType: explanation
lastModified: 2026-02-01
---
```

## Reference

- Schema source: [`packages/docs-seo-schema/src/index.ts`](../../../packages/docs-seo-schema/src/index.ts)
- Warn helper: `warnMissingSeoFrontmatterFields` in the same file
- Build-time merge: [`source.config.ts`](../../../source.config.ts)
- Per-page metadata pipeline: [`src/lib/seo-config.ts`](../../../src/lib/seo-config.ts)
- Diataxis classification: [`diataxis`](../diataxis/SKILL.md)
