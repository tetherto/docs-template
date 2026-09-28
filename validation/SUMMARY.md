# Validation System Summary

## What's Been Built

Modular PR validation checks living in `/validation` on the `doc-pr-checks` branch.

### Working Checks

1. **no-debug-instrumentation** ✅
   - Catches Cursor debug mode fetch calls
   - Tested and working
   - Would have caught the production bug

2. **docs-deprecated-apis** ✅  
   - Parses CHANGELOG.md + changelog-archive for deprecations
   - Extracts 59 functions, 4 packages, 22 classes automatically
   - No hardcoded terms - reads real changelog patterns
   - Tested and working

3. **no-personal-paths** ✅
   - Prevents `/Users/username` style paths in docs/code
   - Protects privacy and ensures portability
   - Tested and working

4. **docs-stale-references** ⚠️
   - Finds non-existent functions/classes mentioned in docs
   - Requires source repo configured
   - Needs real repo path to test fully

### Structure

```
validation/
├── README.md           # Full documentation
├── SUMMARY.md          # This file
├── config.yaml         # Repo paths, deprecated terms
├── package.json        # Dependencies (js-yaml)
├── run-all.mjs         # Orchestrator
├── checks/
│   ├── no-debug-instrumentation.mjs
│   ├── docs-deprecated-apis.mjs
│   └── docs-stale-references.mjs
└── test-fixtures/
    ├── README.md
    ├── bad-debug-code.tsx
    └── deprecated-apis.md
```

## Quick Test

```bash
cd validation

# First time setup
cp config.example.yaml config.yaml
# Edit config.yaml with your local paths

npm install
npm test  # Should fail with violations (good!)
```

## Next Steps

1. **config.yaml is git-ignored** - Your local paths never get committed

2. **Test against real repos**:
   ```bash
   node run-all.mjs /path/to/target-repo
   ```

3. **Add more checks** as needed:
   - Broken internal links
   - Missing code examples
   - Inconsistent terminology
   - etc.

## Adding New Checks

Just create `checks/my-check.mjs`:

```javascript
export const checkName = 'my-check';

export async function run(targetPath) {
  // Your logic
  return {
    passed: true/false,
    violations: []  // or skipped: true
  };
}
```

The runner auto-discovers it.

## Key Design Decisions

- **Modular**: Each check is independent
- **Config-driven**: `config.yaml` for cross-repo setup
- **Test fixtures**: Prove checks work before running on real code
- **No CI requirement**: Can run manually forever
- **Branch-based**: Lives on `doc-pr-checks`, never needs to merge
