# Test: Personal Paths

This file contains examples of personal paths that should be caught.

## Bad Examples (should be caught)

Clone the repo:
```bash
git clone git@github.com:org/repo.git /Users/john/projects/repo
cd /Users/john/projects/repo
```

On Windows:
```bash
cd C:\Users\Alice\Documents\projects
```

On Linux:
```bash
cd /home/bob/workspace/myproject
```

## Good Examples (should NOT be caught)

Generic placeholders:
```bash
git clone git@github.com:org/repo.git /path/to/repo
cd /path/to/repo
```

Or relative from repo root:
```bash
cd validation
npm install
```

Or environment variables:
```bash
cd $HOME/projects/repo
cd ~/projects/repo
```

## Config Files (allowed with instructions)

```yaml
# IMPORTANT: Update these paths to match your local environment
source_repo:
  path: /Users/username/GitHub/repo  # Generic placeholder
```
