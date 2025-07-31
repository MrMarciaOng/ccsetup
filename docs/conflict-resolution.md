# Conflict Resolution Guide

## Overview

When running ccsetup in a directory with existing files, the tool provides intelligent conflict resolution to protect your work while allowing flexibility in setup.

## How Conflicts are Detected

ccsetup checks for existing files that match template files:
- CLAUDE.md
- Agent files in agents/
- Documentation in docs/
- Plans in plans/
- Tickets in tickets/

## Conflict Resolution Options

### 1. Skip (s)

**What it does**: Keeps your existing files unchanged

**When to use**:
- You have customized files you want to preserve
- You're adding ccsetup to an existing project
- You want to manually merge changes later

**Example**:
```
Your choice for CLAUDE.md [s/r/o]: s
✓ Skipped CLAUDE.md (keeping existing)
```

### 2. Rename (r)

**What it does**: Creates new files with `-ccsetup` suffix

**When to use**:
- You want to compare template with your version
- You need reference files for manual merging
- You're unsure about overwriting

**Example**:
```
Your choice for CLAUDE.md [s/r/o]: r
✓ Created CLAUDE-ccsetup.md (kept original)
```

Result:
- `CLAUDE.md` - Your original file
- `CLAUDE-ccsetup.md` - Template version

### 3. Overwrite (o)

**What it does**: Replaces existing files with templates

**When to use**:
- You want fresh template files
- Your files are outdated or corrupted
- You're starting over with defaults

**Example**:
```
Your choice for CLAUDE.md [s/r/o]: o
⚠️  Overwriting CLAUDE.md
```

## File Categories

Conflicts are grouped by type for easier decisions:

### CLAUDE.md Files
Critical project instructions - ccsetup always warns before overwriting.

### Agent Files
```
🤖 Agent conflicts (3 files):
  - agents/planner.md
  - agents/coder.md
  - agents/checker.md

Your choice for agents [s/r/o]:
```

### Documentation Files
```
📚 Documentation conflicts (2 files):
  - docs/ROADMAP.md
  - docs/agent-orchestration.md

Your choice for documentation [s/r/o]:
```

## Strategies by Scenario

### Adding to Existing Project

```bash
npx ccsetup .
# Recommended: Skip existing, rename new
```

1. Skip CLAUDE.md if customized
2. Rename agents to compare versions
3. Skip or rename docs based on content

### Updating Templates

```bash
npx ccsetup . --dry-run
# Review changes, then:
npx ccsetup .
```

1. Rename important files first
2. Compare versions manually
3. Overwrite outdated files

### Fresh Start

```bash
npx ccsetup . --force
# Or manually choose overwrite for all
```

Overwrites all files with latest templates.

## Advanced Conflict Handling

### Batch Operations

Apply same choice to all conflicts in a category:

```
Your choice for agents [s/r/o]: r
✓ Renamed all 8 agent files
```

### Force Mode

Skip all prompts and overwrite:

```bash
npx ccsetup . --force
```

### Dry Run Preview

See conflicts without changes:

```bash
npx ccsetup . --dry-run

Would encounter conflicts:
  - CLAUDE.md (would prompt)
  - agents/planner.md (would prompt)
  - docs/ROADMAP.md (would prompt)
```

## Manual Merging

After using rename option:

### 1. Compare Files

```bash
# View differences
diff CLAUDE.md CLAUDE-ccsetup.md

# Or use your editor's compare feature
code --diff CLAUDE.md CLAUDE-ccsetup.md
```

### 2. Merge Changes

Copy useful sections from template:

```bash
# Extract specific sections
grep -A 10 "## Development Guidelines" CLAUDE-ccsetup.md
```

### 3. Clean Up

Remove renamed files after merging:

```bash
rm *-ccsetup.md
rm agents/*-ccsetup.md
```

## Best Practices

### 1. Always Preview First

```bash
npx ccsetup . --dry-run
```

### 2. Backup Important Files

```bash
cp CLAUDE.md CLAUDE.md.backup
```

### 3. Use Version Control

```bash
git add .
git commit -m "Before ccsetup update"
npx ccsetup .
```

### 4. Document Customizations

Keep notes about your customizations:

```markdown
<!-- CUSTOM: Added project-specific build commands -->
## Build Commands
npm run build:custom
```

## Troubleshooting

### "File exists" Error

Use conflict resolution or force mode:
```bash
npx ccsetup . --force
```

### Lost Customizations

Check for:
- Renamed files (*-ccsetup.md)
- Git history
- Editor backups

### Merge Conflicts in Git

After ccsetup with git:
```bash
git status
git diff
# Resolve conflicts in your editor
git add .
git commit
```

## Recovery Options

### From Renamed Files

```bash
# Restore from renamed
mv CLAUDE-ccsetup.md.backup CLAUDE.md
```

### From Git

```bash
# View previous version
git show HEAD~1:CLAUDE.md

# Restore file
git checkout HEAD~1 -- CLAUDE.md
```

### From Backups

Always backup before major changes:

```bash
# Create backup
tar -czf project-backup.tar.gz .

# Restore if needed
tar -xzf project-backup.tar.gz
```