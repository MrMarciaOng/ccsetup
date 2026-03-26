# ccsetup

[![npm version](https://img.shields.io/npm/v/ccsetup.svg)](https://www.npmjs.com/package/ccsetup)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

One-command setup for Claude Code projects. Creates a ready-to-use project structure with 8 core agents, orchestration workflows, ticket system, and planning tools.

## Quick Start

```bash
# Interactive mode
npx ccsetup

# Create new project
npx ccsetup my-project

# Setup in current directory
npx ccsetup .
```

## What You Get

```
my-project/
├── CLAUDE.md              # Project instructions for Claude
├── CONTRIBUTING.md        # Contribution guidelines
├── GEMINI.md              # Gemini setup (optional)
├── .claude/
│   ├── agents/            # 8 core agents
│   ├── skills/            # /prd and /ralph slash commands
│   └── settings.json
├── agents/
│   └── README.md          # Agent documentation
├── scripts/
│   └── ralph/             # Autonomous agent loop
├── docs/
│   ├── ROADMAP.md         # Development roadmap
│   └── agent-orchestration.md
├── tickets/               # Task tracking
└── plans/                 # Planning documents
```

### Core Agents

backend, blockchain, checker, coder, frontend, planner, researcher, shadcn

### Skills (Slash Commands)

- **/prd** — Scans your codebase (tech stack, quality gates, architecture), then generates a structured PRD with real file paths and auto-detected quality criteria
- **/ralph** — Converts a PRD into `prd.json` format for autonomous execution, with exact quality check commands and file hints per story

## Key Options

```bash
npx ccsetup my-project --agents        # Interactive agent selection
npx ccsetup my-project --all-agents    # Include all agents
npx ccsetup my-project --no-agents     # Skip agent selection entirely
npx ccsetup . --scan-context           # Scan existing project for context
npx ccsetup --scan-only                # Only scan and update CLAUDE.md
npx ccsetup my-project --dry-run       # Preview without creating files
npx ccsetup my-project --force         # Skip prompts, overwrite existing
npx ccsetup my-project --browse        # Enhanced template browsing UI
npx ccsetup --install-hooks            # Install workflow selection hooks (advanced)
```

### Repository Scanning

Scan existing projects to auto-generate CLAUDE.md context:

```bash
ccsetup scan                           # Scan current directory
ccsetup scan --update                  # Update existing CLAUDE.md
ccsetup scan --update --merge-strategy replace       # Replace CLAUDE.md entirely
```

Detects languages, frameworks, project structure, and commands from package.json/Makefile/Docker Compose.

## Agent Workflows

Pre-configured multi-agent workflows:

- **Feature Development**: Researcher → Planner → Coder → Checker
- **Bug Fix**: Researcher → Coder → Checker
- **API Development**: Planner → Backend → Frontend → Checker
- **UI Components**: Frontend → Shadcn → Checker

See [docs/agent-orchestration.md](docs/agent-orchestration.md) for details.

## Ralph — Autonomous Agent Loop

Ralph is an autonomous coding agent that implements user stories from a PRD one at a time, with built-in subagent verification.

### Workflow

1. **Create a PRD** — Use `/prd` in Claude Code to generate a codebase-aware PRD
2. **Convert to Ralph format** — Use `/ralph` to generate `scripts/ralph/prd.json` with quality checks and file hints
3. **Run Ralph** — Launch the autonomous loop:

```bash
# Default: 10 iterations using amp
./scripts/ralph/ralph.sh

# Use Claude Code instead of amp
./scripts/ralph/ralph.sh --tool claude

# Specify model and max iterations
./scripts/ralph/ralph.sh --tool claude --model opus 20

# Quick run with sonnet
./scripts/ralph/ralph.sh --tool claude --model sonnet 5
```

### What happens each iteration

1. Reads `prd.json` and picks the next incomplete story
2. Reads story `notes` for file hints (pre-populated by `/ralph`)
3. Implements the story
4. Runs exact quality check commands from `prd.json` (`qualityChecks` field)
5. Spawns a **checker subagent** to independently verify the implementation against acceptance criteria
6. If reviewer approves → commits. If not → fixes and re-verifies (up to 3 cycles)
7. Updates `prd.json` (`passes: true`) and appends to `progress.txt`
8. Exits when all stories pass, or after max iterations

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `--tool amp\|claude` | `amp` | Which AI tool to use |
| `--model opus\|sonnet\|haiku` | (default) | Model selection (Claude only) |
| `[number]` | `10` | Max iterations |

### Archiving

Ralph auto-archives previous runs when the branch changes. Archives are saved to `scripts/ralph/archive/YYYY-MM-DD-feature-name/`.

## Documentation

- [Agent Orchestration](docs/agent-orchestration.md)
- [Available Agents](template/agents/README.md)
- [Ticket System](docs/ticket-system.md)

## Credits

Born from discussions in TechOverflow with [vichannnnn](https://github.com/vichannnnn), [MrMarciaOng](https://github.com/MrMarciaOng), and [nasdin](https://github.com/nasdin).

Agent collection from [wshobson/agents](https://github.com/wshobson/agents).

## License

MIT
