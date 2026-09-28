# Setup Instructions

## First Time Setup

1. **Copy the example config:**
   ```bash
   cd validation
   cp config.example.yaml config.yaml
   ```

2. **Edit `config.yaml` with your local paths:**
   ```bash
   # Use your editor of choice
   nano config.yaml
   # or
   code config.yaml
   ```

   Update these sections:
   ```yaml
   source_repo:
     path: /your/actual/path/to/fork-mdk-prv
   
   validation_sources:
     # Arrays allow multiple sources (useful for monorepos or multiple projects)
     changelog_archives:
       - /your/actual/path/to/fork-mdk-prv/docs/reference/changelog-archive
     
     backend_workers:
       - /your/actual/path/to/fork-mdk-prv/backend/workers
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Test it works:**
   ```bash
   npm test
   ```

## Why Two Config Files?

- **`config.example.yaml`** 
  - Checked into git
  - Contains placeholder paths
  - Safe to share publicly

- **`config.yaml`**
  - Git-ignored (in `.gitignore`)
  - Contains your actual local paths
  - **Never committed** - protects your username/directory structure

## If You Accidentally Commit config.yaml

```bash
# Remove from git but keep locally
git rm --cached validation/config.yaml
git commit -m "Remove personal config"

# Make sure .gitignore has it
echo "config.yaml" >> validation/.gitignore
```

## Updating Your Config

Just edit `config.yaml` directly. Changes are local-only and never pushed to git.
