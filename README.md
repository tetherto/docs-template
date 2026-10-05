# Tether.to documentation template site

[This site](https://github.com/tetherto/docs-template.git) is the official documentation and single source of truth for the `tether.io` Documentation guild:

- Source code and content of the docs website
- Automation scripts for the integration between the codebase and the documentation

The site is a **static export** from a Next.js + [Fumadocs](https://fumadocs.dev) app (`output: 'export'`). SEO behavior is implemented with workspace packages under `@tether/docs-*` (see below).

## Table of contents

- [Installation](#installation)
- [Monorepo packages (`packages/`)](#monorepo-packages-packages)
  - [Using these packages from another repository](#using-these-packages-from-another-repository)
- [SEO and frontmatter](#seo-and-frontmatter)
- [Environment variables](#environment-variables)
- [Open Graph images (Takumi, static hosting)](#open-graph-images-takumi-static-hosting)
- [Development](#development)
  - [Vale linting](#vale-linting)
- [Maintainers](#maintainers)
- [Build](#build)
- [Repository layout](#repository-layout)

## Installation

Prerequisites:

- Node.js >= 22.22.0
- `npm` >= 10.9.2

Install dependencies:

```bash
npm install
```

**`postinstall`** runs **fumadocs-mdx**, which generates **`.source/`** (gitignored). Run install after clone and after editing [`source.config.ts`](source.config.ts).

### Environment file

Copy the example file and fill in values (Next.js reads `.env.local` automatically):

```bash
cp env.example .env.local
```

See [`env.example`](env.example) for all variables. **Required** for production SEO:

- **`NEXT_PUBLIC_DOCS_ORIGIN`** — public docs URL for canonical and social metadata ([`seo-config.ts`](src/lib/seo-config.ts)); optional for local dev (defaults to `http://localhost:3001`)

**Optional — Inkeep:** set **`NEXT_PUBLIC_INKEEP_API_KEY`** only when you want [Inkeep](https://inkeep.com) for **search** (replacing the Fumadocs default dialog) and the **chat** widget. If it is unset, the app uses Fumadocs' default search and hides Inkeep-specific UI ([`provider.tsx`](src/app/provider.tsx), [`layout.tsx`](src/app/layout.tsx), [`page-actions.tsx`](src/components/page-actions.tsx)).

> [!NOTE]
> `npm run prebuild` runs `tsx` outside Next.js, so **`DOCS_OG_*`** and **`SKIP_OG_BUILD`** are not read from `.env.local` unless you export them in your shell or set them in CI.

## Monorepo packages (`packages/`)

| Package | Role |
|--------|------|
| `@tether/docs-seo-schema` | Zod `tetherSeoFrontmatterSchema`: **required** `description`; optional `noIndex`, `ogImage`, `schemaType`, `docType`, `lastModified`. Exports `warnMissingSeoFrontmatterFields`, `DOCS_SEO_WARN_PREFIX`. |
| `@tether/docs-seo-core` | `getPageSeoState` (canonical, `ogImage` override, `PageSeoState` with `slugs` / `seoAuditFields`), `buildJsonLdGraph`, `inferJsonLdType`. Root-relative **`ogImage`** paths are turned into absolute URLs **without** applying doc `trailingSlash` (so `/asset.png` does not become `/asset.png/`). |
| `@tether/docs-seo-next` | `buildDocsMetadata`, `buildDocsSitemap`, `buildDocsRobots`, `DocsJsonLd`; re-exports core/schema SEO helpers. |
| `@tether/docs-seo-og` | `getPageImage` (URL layout), Takumi **prebuild** (`@tether/docs-seo-og/build`), optional Route Handler (`@tether/docs-seo-og/handler`); re-exports `warnMissingSeoFrontmatterFields`. |

The main app must **not** import `@tether/docs-seo-og/handler` in pages that ship to the static bundle; Takumi is only used at **prebuild** time or in a server Route Handler.

### Using these packages from another repository

`@tetherto/docs-seo-*` is published to **GitHub Packages**, not the public npm registry. Consumers install it like any normal npm dependency (`@tetherto/docs-seo-next: ^1.1.0`) once `npm` is pointed at the right registry and authenticated with a personal access token.

#### 1. Configure `.npmrc`

Add an `.npmrc` to the consumer repo so the `@tetherto` scope is fetched from GitHub Packages and the token is read from a `GITHUB_TOKEN` environment variable:

```ini
@tetherto:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Commit this file. It contains no secret — only the variable reference.

#### 2. Generate a personal access token

Create a **classic** PAT at https://github.com/settings/tokens/new with these scopes:

- **`read:packages`** — required, to download `@tetherto/*` from GitHub Packages
- **`repo`** — required if any of the source repositories that publish those packages are private (otherwise GitHub returns `403` even with the right scope)

Important: **set an expiration on the token.** Tokens that never expire are rejected by the registry. Pick the shortest expiration that fits your workflow; you'll be regenerating it.

After creating the token, if the `tetherto` organization uses SSO, click **"Configure SSO"** next to the token in the tokens list and authorize it for the org. Without that step the registry returns `403` even with the right scopes.

A fine-grained personal access token also works, scoped to the `tetherto` resource owner with **Packages read** repository permission. Same expiration requirement applies.

#### 3. Save the token locally

Add `GITHUB_TOKEN=ghp_yourTokenHere` to a gitignored `.env` (or `.env.local`) file. Keep it readable only by you (`chmod 600 .env`). Never commit the token.

#### 4. Verify before installing

Quick sanity check:

```bash
set -a && . ./.env && set +a
npm whoami --registry=https://npm.pkg.github.com   # should print your GitHub username
npm view @tetherto/docs-seo-schema version --registry=https://npm.pkg.github.com
```

If `npm whoami` prints your username but the second command returns HTTP 403, the token authenticates but lacks `read:packages` (and/or SSO authorization).

#### 5. Install

```bash
set -a && . ./.env && set +a
npm install
```

CI sets `GITHUB_TOKEN` directly from secrets (e.g. the built-in `secrets.GITHUB_TOKEN` for org-internal workflows, or a PAT secret for cross-org reads) — no `.env` file involved.

#### Notes for the consumer's `package.json`

- Add the packages you actually import (`@tetherto/docs-seo-next`, `@tetherto/docs-seo-og`, `@tetherto/docs-seo-schema`); transitive `@tetherto/*` deps resolve automatically.
- Sources are TypeScript and shipped as-is, so set `transpilePackages` in **Next.js** to include every `@tetherto/docs-seo-*` package you import.
- Install **peer dependencies** (`fumadocs-core`, `next`, `react`, `zod` for schema, etc.) to versions compatible with each package's `peerDependencies`.

## SEO and frontmatter

Extended fields are merged in [`source.config.ts`](source.config.ts) via `tetherSeoFrontmatterSchema`. **`description`** is **required** (non-empty after trim) on every docs page for meta tags, Open Graph / Twitter, and JSON-LD. Other fields are optional:

- **`noIndex`** (boolean): exclude from sitemap and set `robots` to noindex.
- **`ogImage`** (string): absolute URL or site-relative path override for Open Graph / Twitter images (relative paths are normalized as static assets, not doc routes—no stray trailing slash before the file extension).
- **`schemaType`**: `TechArticle` \| `APIReference` \| `WebPage` for JSON-LD `@type`.
- **`docType`**: `tutorial` \| `how-to` \| `reference` \| `explanation` \| `page` \| `faq` \| `getting-started` (influences inferred JSON-LD when `schemaType` is omitted).
- **`lastModified`**: string or date for sitemap `lastmod` and, when set, JSON-LD `datePublished` / `dateModified` on **`WebPage`**, **`TechArticle`**, and **`APIReference`** graphs.

Per-page metadata, sitemap, robots, and JSON-LD share the same logic through [`src/lib/seo-config.ts`](src/lib/seo-config.ts) and `@tether/docs-seo-next`.

During `next build` / dev, `getPageSeoState` and `buildDocsMetadata` emit **`[@tether/docs-seo]`** `console.warn` lines for missing optional fields (`ogImage`, `schemaType`, `docType`, `lastModified`, and empty `description` if it bypasses MDX validation). Warnings are deduplicated per page per Node process. Two env knobs control them:

- **`DOCS_SEO_SILENT=1`** — silence ALL warnings (including the required-`description` warning). Use sparingly.
- **`DOCS_SEO_QUIET_GENERATED=1`** — silence only the warnings for fields that have sensible auto-generated/inferred defaults (`ogImage`, `schemaType`, `lastModified`). `description` and `docType` warnings stay loud because neither has a useful default. Recommended when you opt into the Takumi OG prebuild + the `fumadocs-mdx` `lastModified` plugin.

The same helpers are re-exported from `@tether/docs-seo-schema`, `@tether/docs-seo-core`, `@tether/docs-seo-next`, and `@tether/docs-seo-og` (`warnMissingSeoFrontmatterFields`).

### Notes for the SEO OG images

When using the SEO OG packages from a remote docs site:
- Clone with submodules (or after clone: git submodule update --init --recursive) so src/lib/docs-template is populated
- Run `npm install` so workspaces link the @tetherto/docs-seo-* packages from the submodule
- Run `npm run build `(or whatever runs prebuild) so `generate-takumi-og.tsx` runs and fills public/og/docs/... for each page
- CI / deploy, either:
    - Checkout with submodules (same as local), or
    - Keep using GITHUB_TOKEN / GitHub App flow from the README to install from GitHub Packages if the submodule isn't used in that environment
- Consider adding a fallback, such as /og-default.webp if the per-page OG files are missing

## Environment variables

Full template with comments: [`env.example`](env.example).

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_DOCS_ORIGIN` | **Yes** (production) | Site origin for `metadataBase`, canonicals, and absolute `og:image` / Twitter URLs. Defaults to `http://localhost:3001` when unset. |
| `NEXT_PUBLIC_INKEEP_API_KEY` | No | Inkeep CXKit API key. If set, replaces Fumadocs default search with Inkeep and enables the Inkeep chat widget; if unset, default Fumadocs search is used. |
| `NEXT_PUBLIC_DOCS_PUBLISHER_LOGO_URL` | No | HTTPS logo for JSON-LD publisher / `Organization`. |
| `SKIP_OG_BUILD` | No | Set to `1` to use static OG fallback instead of per-page `public/og/docs/**` URLs in metadata. |
| `DOCS_OG_SITE_LABEL` | No | Takumi `site` label during OG prebuild (default `Tether`). |
| `DOCS_OG_CONCURRENCY` | No | Parallelism for OG prebuild (default `3`). |
| `DOCS_SEO_SILENT` | No | Set to `1` to turn off ALL `[@tether/docs-seo]` console warnings (including required-`description` checks). |
| `DOCS_SEO_QUIET_GENERATED` | No | Set to `1` to silence only the warnings for fields with auto-generated / inferred defaults (`ogImage`, `schemaType`, `lastModified`). Keeps `description` and `docType` warnings live. |

## Open Graph images (Takumi, static hosting)

Because static export cannot use dynamic OG Route Handlers, images are **generated before `next build`** and written under `public/og/docs/.../image.webp`, matching the URLs returned by `getPageImage()`.

- **`npm run build`** and **`npm run build:static`** automatically run **`prebuild`**, which executes `tsx scripts/generate-takumi-og.mts`
- Run the generator alone: **`npm run build:og`**
- Replace [`public/og-default.png`](public/og-default.png) with a proper **1200×630** asset if you rely on the `SKIP_OG_BUILD` fallback

**Git note:** this template **gitignores** `public/og/docs/` (see [`.gitignore`](.gitignore)). CI and local **`npm run build`** must run **`prebuild`** so those WebP files exist before static export. To vendor generated images instead: stop ignoring that directory and commit the files.

## Development

### Vale linting

Vale is available for local documentation linting. Run `vale sync` before linting so Vale downloads the configured package styles into the gitignored `styles/` package directories.

Install the Vale CLI first (see the [Vale install guide][vale-install] for other platforms):

```bash
# macOS (Homebrew)
brew install vale
```

Use the project vocabulary to check custom spelling. For example, Tether should pass, while Tehtr should fail.

Run Vale against a single file:

```bash
vale sync
vale README.md
```

Run Vale against a single folder:

```bash
vale sync
vale content/docs
```

Run Vale against the entire repo:

```bash
vale sync
vale .
```

Vale can be added to CI as an advisory check, but do not configure it to fail CI. The current rule set has too many false positives for a hard gate.

Check broken links:

```bash
npm run check-links
```

Dev server (port 3001):

```bash
npm run dev
```

For local dev without generating OG files, you can use:

```bash
SKIP_OG_BUILD=1 npm run dev
```

## Maintainers

### Using Vale in downstream CI

This repository provides an opinionated Vale configuration. To use in downstream documentation repositories either:

- **Lint against the shared config** — call this repository's reusable workflow with `central_config: true`. It checks out this template beside the downstream repository and lints against the central [`.vale.ini`](.vale.ini) and [`styles/`](styles/), advisory by default (`fail_on_error: false`).
- **Lint against your own config, on the shared rules** — call the reusable workflow with `config_path` pointing at a `.vale.ini` in the downstream repository. The template is still checked out beside it at `.tether-vale-source`, so that file can set `StylesPath = .tether-vale-source/styles` and choose which Tether rules apply and at what level, without copying any rule. Use this when a repository needs a different alert floor from the central one.
- **Lint against a fully custom config** — keep a local `.vale.ini` and styles in the downstream repository and run Vale in that repository's own CI (the [Vale linting](#vale-linting) setup above covers the CLI).

The reusable workflow's self-lint mode (`central_config: false` and no `config_path`) is reserved for this template: it uses the local `.vale.ini` and always fails the job on errors, so it isn't a configuration path for downstream repositories.

Add a workflow like this to the downstream repository. The example pins to a reviewed commit SHA for a reproducible gate; see the tradeoff with tracking a branch below.

```yaml
name: Vale documentation lint

on:
  pull_request:
    paths:
      - "**/*.md"
      - "**/*.mdx"

jobs:
  vale:
    # Keep the workflow ref AND docs_template_ref on the same ref (SHA or branch).
    uses: tetherto/docs-template/.github/workflows/vale-docs.yml@<reviewed-commit-sha>
    permissions:
      contents: read
      pull-requests: read
    with:
      central_config: true     # lint against this template's central .vale.ini
      # Or, instead of central_config, your own file on the shared rules:
      # config_path: .vale.ini
      docs_template_ref: <reviewed-commit-sha>
      # Optional — exclude generated, vendored, cached, or build-output files
      # (comma-separated globs):
      files_ignore: "path/to/generated/**,**/vendor/**"
      # Optional — defaults to "*.md,**/*.md,*.mdx,**/*.mdx" (comma-separated):
      # filepaths: "*.md,**/*.md,*.mdx,**/*.mdx"
      fail_on_error: false
      # Optional — set false to keep findings out of the diff view and show
      # them only in the job summary and the check's annotation list:
      # inline_annotations: true
```

Choose how closely the downstream gate tracks this template:

- **Pin to a reviewed commit SHA** — reproducible: the workflow and the Vale config it loads never change until you bump the ref deliberately. Use the **same** SHA for both the `uses:` ref and `docs_template_ref` so they always move together.
- **Track a branch like `@main`** — always current: the downstream repository picks up config changes automatically, at the cost of a gate that can shift under you between runs (a style tweak here can turn a green check red without any change on your side). Set `docs_template_ref` to the same branch.

The workflow runs a pinned Vale release directly and prints each alert as a GitHub annotation through [`.github/vale/github-annotations.tmpl`](.github/vale/github-annotations.tmpl). The job is the only check that reports: findings appear inline on the pull request diff and the job summary lists every one of them. GitHub shows at most ten inline annotations per level per step, so the summary is the complete view. No `checks: write` permission is needed.

Then choose how findings gate CI with `fail_on_error`:

- **`false` (default)** — advisory: Vale reports findings but the job stays green. Recommended, because Vale has too many false positives for a hard CI gate, and a red check that reviewers learn to ignore weakens every check that is meant to block.
- **`true`** — hard gate: Vale errors fail the job. Set this only after the downstream repository has cleaned up or accepted the rule set.

Either way a Vale run that cannot complete (a broken config or rule, exit code 2) fails the job, because then nothing was checked.

Synced package styles such as Google, `proselint`, and `write-good` are generated by `vale sync` during the workflow run. Do not commit those generated package directories to downstream repositories.

## Build

Set **`NEXT_PUBLIC_DOCS_ORIGIN`** for production; add **`NEXT_PUBLIC_INKEEP_API_KEY`** only if you use Inkeep instead of default Fumadocs search (see [`env.example`](env.example)).

Static export:

```bash
npm run build
```

or:

```bash
npm run build:static
```

Next.js writes the static site to the **`out/`** directory (not `dist/`).

Serve the export locally after `npm run build`:

```bash
npm run serve
```

This serves the **`out/`** directory (Next.js static export output).

## Repository layout

- `src`: Next.js app and UI
- `content/docs`: MDX documentation content
- `packages`: workspace packages (`@tether/docs-seo-*`)
- `public`: static assets; **`public/og/docs/**`** holds prebuilt OG WebP files after `prebuild`
- `examples`: runnable DOCS code samples for snippets and tooling
- `scripts`: automation (including [`scripts/generate-takumi-og.mts`](scripts/generate-takumi-og.mts))
- [`env.example`](env.example): environment variable template (SEO required for prod; Inkeep optional)
- [`REVIEW-CHECKLIST.md`](REVIEW-CHECKLIST.md): optional manual QA checklist for SEO / static export (stage it if you want it in the repo)
- **`.source/`** (gitignored, not in git): Fumadocs MDX output; created by **`npm install`** / **`npm run postinstall`**. Regenerate after changing [`source.config.ts`](source.config.ts)

> [!NOTE]
> Repository structure may evolve as automation and content organization mature.

<!-- Reference-style link definitions can avoid Vale linting false positives -->

[vale-install]: https://vale.sh/docs/vale-cli/installation/
