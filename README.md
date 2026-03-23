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
├── .claude/
│   ├── agents/            # 8 core agents
│   └── settings.json
├── docs/
│   ├── ROADMAP.md         # Development roadmap
│   └── agent-orchestration.md
├── tickets/               # Task tracking
└── plans/                 # Planning documents
```

### Core Agents

backend, blockchain, checker, coder, frontend, planner, researcher, shadcn

## Key Options

```bash
npx ccsetup my-project --agents        # Interactive agent selection
npx ccsetup my-project --all-agents    # Include all agents
npx ccsetup . --scan-context           # Scan existing project for context
npx ccsetup --scan-only                # Only scan and update CLAUDE.md
npx ccsetup my-project --dry-run       # Preview without creating files
npx ccsetup my-project --force         # Skip prompts, overwrite existing
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

## Documentation

- [Agent Orchestration](docs/agent-orchestration.md)
- [Available Agents](template/agents/README.md)
- [Ticket System](docs/ticket-system.md)

## Credits

Born from discussions in TechOverflow with [vichannnnn](https://github.com/vichannnnn), [MrMarciaOng](https://github.com/MrMarciaOng), and [nasdin](https://github.com/nasdin).

Agent collection from [wshobson/agents](https://github.com/wshobson/agents).

## License

MIT
