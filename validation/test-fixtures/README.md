# Test Fixtures

Example code that demonstrates what the validation checks catch.

## bad-debug-code.tsx

Contains Cursor debug mode instrumentation that was accidentally shipped to production in mdk-docs.

**What it contains:**
- `fetch()` to `127.0.0.1:7362/ingest/...`
- `X-Debug-Session-Id` header
- Debug session payload with `sessionId`

**Test it:**
```bash
node ../checks/no-debug-instrumentation.mjs .
```

Should exit with code 1 and report violations.

## Purpose

These fixtures verify that:
1. Checks actually detect the patterns they're designed to catch
2. New check logic works before running against real repos
3. There's a historical record of what issues we've had

When adding a new check, add a corresponding test fixture with bad code.
