# Merging and Conflict Resolution

## Merge Strategies

When updating an existing CLAUDE.md via `ccsetup scan --update`:

### Smart Merge (default)

Preserves your customizations while adding newly detected information. Handles section-by-section merging with type-aware logic for tech stacks, commands, lists, and project structure.

```bash
ccsetup scan --update
ccsetup scan --update --merge-strategy smart
```

### Replace

Full replacement with new scan results.

```bash
ccsetup scan --update --merge-strategy replace
```

## AI-Enhanced Features

When Claude Code CLI is installed, merge operations get:
- **Conflict analysis** — what's different, which version is more complete, recommended resolution
- **Content merging** — intelligently combines content, preserves customizations, removes duplicates

Uses `claude --print` internally. Falls back gracefully if Claude Code isn't available.

## File Conflict Resolution

When running ccsetup in a directory with existing files:

| Option | Effect |
|--------|--------|
| **skip (s)** | Keep existing files unchanged |
| **rename (r)** | Save templates with `-ccsetup` suffix for comparison |
| **overwrite (o)** | Replace with template versions |

Conflicts are grouped by category (CLAUDE.md, agents, docs, plans, tickets).

### Recommended Workflows

**Adding to existing project:**
```bash
npx ccsetup .          # skip customized files, rename new ones for comparison
```

**Updating templates:**
```bash
npx ccsetup . --dry-run  # preview first
npx ccsetup .            # then apply
```

**Fresh start:**
```bash
npx ccsetup . --force    # overwrite all
```

### Manual Merging After Rename

```bash
diff CLAUDE.md CLAUDE-ccsetup.md    # compare versions
# merge what you need, then clean up:
rm *-ccsetup.md
```
