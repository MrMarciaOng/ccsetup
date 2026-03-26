# Claude Code Project Instructions

## Project Overview

[Brief description of your project goes here]

## Key Objectives

- [Objective 1]
- [Objective 2]
- [Objective 3]

## Project Structure

```
.
├── CLAUDE.md          # This file - project instructions for Claude
├── .claude/
│   ├── agents/        # 8 core agents (backend, blockchain, checker, coder, frontend, planner, researcher, shadcn)
│   ├── skills/        # /prd, /ralph, and /codex-review slash commands
│   └── hooks/         # Workflow selector and codex-review hooks
├── agents/            # Documentation only — see .claude/agents/ for active agents
├── scripts/
│   ├── ralph/         # Autonomous agent loop (ralph.sh + agent instructions)
│   └── codex-review/  # Codex CLI architectural review script
├── docs/              # Project documentation
├── plans/             # Project plans and architectural documents
└── tickets/           # Task tickets and issues
```

## Development Guidelines

### Code Style

- Follow existing code conventions in the project
- Use consistent naming patterns
- Maintain clean, readable code

### Testing

- Run tests before committing changes
- Add tests for new functionality
- Ensure all tests pass

### Git Workflow

- Create descriptive commit messages
- Keep commits focused and atomic
- Review changes before committing

## Common Commands

```bash
# Add your common project commands here
# npm install
# npm run dev
# npm test
```

## Important Context

[Add any project-specific context, dependencies, or requirements here]

## Agents

8 core agents are pre-installed in `.claude/agents/`. See @agents/README.md for the full list and instructions for adding custom agents.

## Skills (Slash Commands)

- **/prd** — Scans the codebase, then generates a structured PRD with real file paths and auto-detected quality criteria. Saves to `tasks/prd-[feature-name].md`.
- **/ralph** — Converts a PRD into `scripts/ralph/prd.json` for autonomous execution with quality checks and file hints per story.
- **/codex-review** — Gets a second-opinion architectural review of a plan file from Codex CLI. Iterates up to 3 times, refining the plan based on feedback.

## Ralph — Autonomous Agent Loop

Ralph implements user stories from a PRD one at a time in a loop, with subagent verification after each story.

```bash
./scripts/ralph/ralph.sh                          # Default: 10 iterations with amp
./scripts/ralph/ralph.sh --tool claude             # Use Claude Code
./scripts/ralph/ralph.sh --tool claude --model opus 20  # Specify model + iterations
```

Typical workflow: `/prd` → `/ralph` → `./scripts/ralph/ralph.sh`

## Agent Orchestration

See @docs/agent-orchestration.md for detailed workflow patterns on how to chain agents effectively.

## Workflow Selector Hook (Optional)

An optional hook that suggests agent workflows based on your prompt. Claude will ask before applying.

To activate after installation:
```bash
export CCSETUP_WORKFLOW=1
```

When unset, the hook is inactive and Claude uses its default behavior. Install the hook with `npx ccsetup --install-hooks`.

## Codex Review Hook (Optional)

An optional hook that suggests running `/codex-review` when a plan file is modified. Triggers on the `Stop` event.

To activate:
```bash
export CCSETUP_CODEX_REVIEW=1
```

When unset, the hook is inactive and produces no output.

## Tickets

See @tickets/README.md for ticket format and management approach

## Plans

See @plans/README.md for planning documents and architectural decisions

## Development Context

- See @docs/ROADMAP.md for current status and next steps
- Task-based development workflow with tickets in `/tickets` directory
- Use `/plans` directory for architectural decisions and implementation roadmaps

## Important Instructions

- Ask clarifying questions when requirements are unclear
- Self-documenting code — no code comments
- For complex features, consider creating a plan document in `/plans` before implementing

## Additional Notes

[Any other important information for Claude to know about this project]
