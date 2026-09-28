# PR Validation Checks

Validation checks for MDK repositories. Prevents common issues from reaching production.

## Quick Start

```bash
# From the validation folder
cd validation

# First time setup
cp config.example.yaml config.yaml
# Edit config.yaml with your local paths

# Install dependencies
npm install

# Test the checks work
npm test  # Runs against test-fixtures/, should fail with violations

# Validate a target repo
node run-all.mjs /path/to/target-repo
```

## Available Checks

### 1. [No Debug Instrumentation](./checks/no-debug-instrumentation.mjs) 🔥 HIGH PRIORITY

Prevents debug logging code from shipping to production.

**Detects:**
- `fetch()` calls to `127.0.0.1` debug endpoints
- `X-Debug-Session-Id` headers
- Debug session IDs in payloads
- Agent log region markers

**Why:** Debug instrumentation committed to source causes:
- Failed network requests on live sites
- Browser permission prompts ("access to apps")
- Console errors
- Performance overhead

**Example violation:**
```typescript
fetch('http://127.0.0.1:7362/ingest/abc123', {
  headers: { 'X-Debug-Session-Id': '3b7f4a' },
  body: JSON.stringify({ sessionId: '3b7f4a', ... })
});
```

### 2. [Deprecated API References](./checks/docs-deprecated-apis.mjs) 🔥 HIGH PRIORITY

Prevents documentation from referencing deprecated APIs by **parsing CHANGELOG.md and archived changelogs**.

**How it works:**
1. Reads `CHANGELOG.md` at repo root
2. Reads all files in `changelog-archive/`
3. Parses deprecation patterns:
   - Markdown tables with old → new mappings
   - "renamed to" / "replaced by" / "removed" text
   - Code examples showing `// 0.0.1` vs `// 0.2.0`
4. Extracts deprecated functions, packages, classes, paths
5. Scans docs for any usage of those old identifiers

**Configuration:** Requires `config.yaml`:
```yaml
source_repo:
  path: /path/to/fork-mdk-prv  # Where CHANGELOG.md lives

validation_sources:
  changelog_archive: /path/to/changelog-archive
```

**Real data from changelog:**
- Found 59 deprecated functions (e.g., `startAppNode`, `initType`)
- Found 4 deprecated packages (e.g., `@tetherto/mdk-ork`)
- Found 22 deprecated classes (e.g., `ORKManager`, `ChartContainer`)

**Why:** When APIs change, docs lag behind and confuse users with non-existent functions.

**Example from real changelog:**
```js
// ❌ Old (0.4.x):
const { startAppNode } = require('@tetherto/mdk-app-node')

// ✅ New (0.5.0):
const { startGateway } = require('@tetherto/mdk-gateway')
```

If docs still mention `startAppNode`, this check catches it.

### 3. [No Personal Paths](./checks/no-personal-paths.mjs) 🔥 HIGH PRIORITY

Prevents hardcoded personal filesystem paths from being committed to the repository.

**Detects:**
- `/Users/username/...` (macOS)
- `/home/username/...` (Linux)
- `C:\Users\username\...` (Windows)

**Why:** Personal paths:
- Expose usernames/personal info
- Break portability (won't work on other machines)
- Look unprofessional in documentation

**What to use instead:**
- Relative paths from repo root: `cd validation`
- Generic placeholders: `/path/to/repo`
- Environment variables: `$HOME`, `~/`

**Exclusions:**
- Test fixtures
- Code comments showing examples
- Config files with "IMPORTANT: Update" instructions

**Example violation:**
```bash
# ❌ Bad:
cd /Users/john/GitHub/myproject

# ✅ Good:
cd validation  # relative from repo root
# or
cd /path/to/myproject  # generic placeholder
```

### 4. [Stale Code References](./checks/docs-stale-references.mjs) 🔥 HIGH PRIORITY

Finds function/class names mentioned in docs that don't exist in the source code anymore.

**Configuration:** Requires `source_repo.path` in `config.yaml` to point at the actual codebase.

**Detects:**
- Functions referenced in docs but not defined in source
- Classes mentioned but not exported
- Renamed/deleted APIs still documented

**Why:** Catches renames and deletions that weren't reflected in docs.

---

## Configuration

**First time setup:**

```bash
cd validation
cp config.example.yaml config.yaml
# Edit config.yaml with your local paths
```

The `config.yaml` file is git-ignored and contains your local repo paths:

```yaml
# Where the source code lives
source_repo:
  path: /path/to/fork-mdk-prv
  branch: main

# Where changelogs/deprecated APIs are documented (arrays supported)
validation_sources:
  changelog_archives:
    - /path/to/fork-mdk-prv/docs/reference/changelog-archive
    - /path/to/another-repo/changelog-archive  # Optional: multiple sources
  
  backend_workers:
    - /path/to/fork-mdk-prv/backend/workers
    - /path/to/another-repo/workers  # Optional: multiple worker locations
```

**Why two files?**
- `config.example.yaml` - Checked into git, has placeholders
- `config.yaml` - Git-ignored, has your actual paths (never committed)

---

## Usage

### Quick Start

Run all checks against a repository:

```bash
cd /path/to/forked-docs-template/validation
node run-all.mjs /path/to/target-repo
```

### Run Individual Check

```bash
node checks/no-debug-instrumentation.mjs /path/to/target-repo
```

### Against Local Branch

```bash
# From the target repo
cd /path/to/target-repo

# Run checks (adjust path to validation folder)
node /path/to/validation/run-all.mjs .
```

### Against Remote PR

```bash
# Fetch and checkout a PR from GitHub
cd /path/to/target-repo
gh pr checkout 123

# Run validation
node /path/to/validation/run-all.mjs .
```

Or fetch manually:

```bash
cd /path/to/target-repo
git fetch origin pull/123/head:pr-123
git checkout pr-123

node /path/to/validation/run-all.mjs .
```

### Against Uncommitted Changes

The checks scan the entire working tree, including uncommitted changes:

```bash
# Make changes
cd /path/to/target-repo
# ... edit files ...

# Validate before committing
node /path/to/validation/run-all.mjs .
```

### Pre-commit Hook (Optional)

Add to `.git/hooks/pre-commit` in your target repo:

```bash
#!/bin/bash
# Adjust path to where you cloned the validation repo
VALIDATION_PATH="/path/to/validation"
node "$VALIDATION_PATH/run-all.mjs" .
if [ $? -ne 0 ]; then
  echo "❌ Validation checks failed. Commit aborted."
  exit 1
fi
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

---

## Testing the Checks

A test fixture with intentionally bad code demonstrates that checks work:

```bash
cd validation
node checks/no-debug-instrumentation.mjs test-fixtures/
```

Expected output:
```
❌ Debug instrumentation detected:
  Pattern: debug session ID header
    ./bad-debug-code.tsx: 16: 'X-Debug-Session-Id':'3b7f4a'
```

This proves the check would have caught the production issue.

---

## Adding New Checks

Create a new file in `checks/`:

```javascript
// checks/my-new-check.mjs
export const checkName = 'my-new-check';

export async function run(targetPath) {
  // Your validation logic here
  const violations = [];
  
  // ... scan for issues ...
  
  return {
    passed: violations.length === 0,
    violations: violations // Optional details
  };
}
```

The runner automatically discovers and executes all `.mjs` files in `checks/`.

---

## Repository Coverage

These checks can run against any MDK repository:

- **mdk-docs**
- **mdk-prv** 
- Any other Next.js/React codebase

---

## Exit Codes

- `0` - All checks passed
- `1` - One or more checks failed

Use in CI or pre-commit hooks to block bad code.

---

## Maintenance

- **Location:** `validation/` folder in this repo
- **Branch:** `doc-pr-checks` (does not need to merge)
- **Updates:** Add new checks to `checks/`, update this README

---

## Examples

### Validate staging branch

```bash
cd /path/to/repo
git checkout staging
node /path/to/validation/run-all.mjs .
```

### Validate before merging a PR

```bash
# Fetch the PR
cd /path/to/repo
gh pr checkout 456

# Run checks
node /path/to/validation/run-all.mjs .

# If passed, merge
gh pr merge 456
```

### Quick alias for repeated use

Add to your shell config (`~/.zshrc` or `~/.bashrc`):

```bash
alias validate-mdk='node /path/to/validation/run-all.mjs'
```

Then use:
```bash
cd /path/to/repo
validate-mdk .
```
