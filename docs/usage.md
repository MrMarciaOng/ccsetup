# Usage Guide

## Quick Start

```bash
# Create new project
npx ccsetup my-project

# Set up in current directory
npx ccsetup .

# Interactive mode
npx ccsetup
```

Then initialize Claude Code:

```bash
cd my-project
claude init
claude
```

## CLI Options

```bash
ccsetup [project-name] [options]
```

| Option | Description |
|--------|-------------|
| `--force, -f` | Skip prompts, overwrite existing files |
| `--dry-run, -d` | Preview without changes |
| `--agents` | Interactive agent selection |
| `--all-agents` | Include all agents |
| `--no-agents` | Skip agent selection |
| `--browse-agents` | Copy all agents for browsing |
| `--install-hooks` | Install workflow hooks |
| `--scan-context` | Scan codebase and generate CLAUDE.md |
| `--scan-only` | Scan without boilerplate |
| `--help, -h` | Show help |

## Agent Selection

During setup you choose one of:

- **Browse Mode** — copies all agents to `/agents` for later review
- **Select Agents** — interactive picker for specific agents
- **Skip** — no agents included

Core agents: planner, coder, checker, researcher. Add specialized agents (backend, frontend, blockchain, shadcn) based on your stack.

## File Conflict Resolution

When existing files are detected:

| Option | Effect |
|--------|--------|
| **skip (s)** | Keep existing files unchanged |
| **rename (r)** | Save templates with `-ccsetup` suffix |
| **overwrite (o)** | Replace with template versions |

Files are grouped by category (CLAUDE.md, agents, docs, plans, tickets) so you can handle each group differently.

## Project Structure

```
my-project/
├── CLAUDE.md          # Project instructions for Claude
├── agents/            # Specialized AI agents
├── docs/
│   ├── ROADMAP.md     # Project goals and progress
│   └── agent-orchestration.md  # Workflow patterns
├── plans/             # Architecture and implementation plans
└── tickets/           # Task tracking
```

## Post-Setup

1. Customize `CLAUDE.md` with project-specific commands and standards
2. Define goals in `docs/ROADMAP.md`
3. Create your first ticket in `tickets/`
4. Start with: `"Read CLAUDE.md to understand this project"`

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `CCSETUP_FORCE` | Enable force mode |
| `CCSETUP_NO_COLOR` | Disable colored output |
| `CCSETUP_DEBUG` | Enable debug logging |

## Exit Codes

`0` success, `1` general error, `2` invalid arguments, `3` file operation error, `130` user cancelled.
