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
│   ├── skills/            # /prd, /ralph, and /codex-review slash commands
│   └── settings.json
├── agents/
│   └── README.md          # Agent documentation
├── scripts/
│   ├── ralph/             # Autonomous agent loop
│   └── codex-review/      # Codex CLI review script
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
- **/codex-review** — Reviews plans, validates implementations against plans, or reviews code changes via Codex CLI. Auto-detects mode from context, up to 3 iterative rounds

## Key Options

```bash
npx ccsetup my-project --agents        # Interactive agent selection
npx ccsetup my-project --all-agents    # Include all agents
npx ccsetup my-project --no-agents     # Skip agent selection entirely
npx ccsetup my-project --dry-run       # Preview without creating files
npx ccsetup my-project --force         # Skip prompts, overwrite existing
npx ccsetup my-project --browse        # Enhanced template browsing UI
npx ccsetup --install-hooks            # Install workflow selection hooks (advanced)
```

## Agent Workflows

Pre-configured multi-agent workflows:

- **Feature Development**: Researcher → Planner → Coder → Checker
- **Bug Fix**: Researcher → Coder → Checker
- **API Development**: Planner → Backend → Frontend → Checker
- **UI Components**: Frontend → Shadcn → Checker

See [docs/agent-orchestration.md](docs/agent-orchestration.md) for details.

### Workflow Selector Hook (Optional)

An optional hook that analyzes your prompts and suggests the best agent workflow for the task. Claude will ask before applying the suggestion.

**During setup**, you'll be asked if you want to install it. You can also install it later:

```bash
npx ccsetup --install-hooks
```

**To activate**, set the environment variable:

```bash
export CCSETUP_WORKFLOW=1
```

When active, the hook suggests workflows like "Feature Development: Researcher → Planner → Coder → Checker" and asks if you'd like to follow it. When the env var is unset, the hook exits silently and Claude uses its default behavior.

## Codex Review — Plan, Implementation, and Code Review

Get a second opinion from OpenAI's Codex CLI. The script auto-detects what to review:

| Context | Review Mode |
|---------|-------------|
| Plan file, no code changes | **Plan review** — architectural soundness |
| Plan file + git changes | **Implementation review** — validates code against the plan |
| No plan file, git changes | **Code review** — bugs, security, quality |

### Usage

```
/codex-review                              # Auto-detect from context
/codex-review plans/my-feature-plan.md     # Review a specific plan
```

### What happens

1. Detects available context (plan file and/or git changes)
2. Sends to Codex CLI with a mode-appropriate review prompt
3. Presents structured feedback (architecture, compliance, risks, suggestions)
4. Asks if you want to apply fixes and re-review
5. Repeats for up to 3 iterations

### Direct script usage

```bash
# Plan review (no git changes)
./scripts/codex-review/codex-review.sh plans/my-plan.md

# Implementation review (plan + git changes auto-detected)
./scripts/codex-review/codex-review.sh plans/my-plan.md

# Code review (no plan, just git changes)
./scripts/codex-review/codex-review.sh

# Override the model
./scripts/codex-review/codex-review.sh plans/my-plan.md --model o3-mini

# From stdin
cat plans/my-plan.md | ./scripts/codex-review/codex-review.sh -
```

### Prerequisites

1. **Codex CLI installed:** `npm install -g @openai/codex`
2. **Authenticated:** `codex login` or set `OPENAI_API_KEY`

### Codex Review Hook (Optional)

An optional hook that suggests running `/codex-review` when plan files are modified or code changes are detected. Triggers on the `Stop` event.

**To activate:**

```bash
export CCSETUP_CODEX_REVIEW=1
```

When unset, the hook is inactive and produces no output.

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
