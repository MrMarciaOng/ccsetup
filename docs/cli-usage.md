# Command Line Options

## Usage

```bash
ccsetup [project-name] [options]
```

## Options

### Core Options

- `--force, -f` - Skip all prompts and overwrite existing files
- `--dry-run, -d` - Show what would be done without making changes
- `--help, -h` - Show help message

### Agent Selection Options

- `--agents` - Interactive agent selection mode
- `--all-agents` - Include all agents without prompting
- `--no-agents` - Skip agent selection entirely
- `--browse-agents` - Copy all agents to /agents folder for browsing

## Examples

### Basic Usage

```bash
# Create in current directory
ccsetup

# Create in new directory
ccsetup my-project

# Force overwrite in current directory
ccsetup . --force
```

### Agent Selection

```bash
# Interactive selection
ccsetup my-app --agents

# Include all agents
ccsetup my-app --all-agents

# Browse agents later
ccsetup my-app --browse-agents

# Skip agents
ccsetup my-app --no-agents
```

### Preview Mode

```bash
# See what would be created
ccsetup my-app --dry-run

# Preview with all agents
ccsetup my-app --dry-run --all-agents
```

### Advanced Usage

```bash
# CI/CD pipeline setup
ccsetup . --force --all-agents

# Minimal setup
ccsetup my-app --no-agents

# Preview available agents only
ccsetup --agents
```

## Conflict Resolution

When existing files are detected, ccsetup offers three options:

1. **skip (s)** - Keep your existing files
2. **rename (r)** - Save template files with -ccsetup suffix
3. **overwrite (o)** - Replace with template versions

Files are grouped by category:
- CLAUDE.md (project instructions)
- Agents (AI agent files)
- Documentation (docs/ folder)
- Plans (plans/ folder)
- Tickets (tickets/ folder)

## Environment Variables

- `CCSETUP_FORCE` - Set to "true" to enable force mode
- `CCSETUP_NO_COLOR` - Disable colored output
- `CCSETUP_DEBUG` - Enable debug logging

## Exit Codes

- `0` - Success
- `1` - General error
- `2` - Invalid arguments
- `3` - File operation error
- `130` - User cancelled (Ctrl+C)