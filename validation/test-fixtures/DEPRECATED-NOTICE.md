# Test Fixtures Note

The `deprecated-apis.md` fixture was created before the check was rewritten.

**Current implementation:**
- Parses real CHANGELOG.md and changelog-archive files
- Extracts deprecated APIs automatically (no hardcoding)
- Found 59 functions, 4 packages, 22 classes from actual changelogs

**The fixture is no longer needed** for testing deprecation detection, since the check now uses real changelog data. It remains as an example of what violations look like.

To test the real check:
```bash
node checks/docs-deprecated-apis.mjs /path/to/docs
```

It will parse the configured source repo's changelogs and detect real deprecated usage.
