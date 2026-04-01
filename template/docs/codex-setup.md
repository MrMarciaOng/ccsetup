# Codex Setup

## Overview

This project can be used with Codex CLI as well as Claude Code.

The Codex-facing project instructions live in `AGENTS.md`.

## Project-Local Skills

Project-local Codex skills are stored in:

```text
.codex/skills/
```

The project-local skill set mirrors the Claude template:

- `prd`
- `ralph`
- `claude-review`
- `secops`

Keep these files in the project so Codex has project-specific workflow context alongside `AGENTS.md`.

## Suggested Workflow

1. Read `AGENTS.md`
2. Review `docs/ROADMAP.md`
3. Check relevant tickets and plans
4. Implement the change
5. Run the quality checks
6. Use `scripts/claude-review/claude-review.sh` for review when useful

## Codex Ralph Loop

Run Ralph with Codex like this:

```bash
./scripts/ralph/ralph.sh --tool codex
```

Optional variations:

```bash
./scripts/ralph/ralph.sh --tool codex --model gpt-5
./scripts/ralph/ralph.sh --tool codex --model gpt-5 5
```

When `--tool codex` is selected, Ralph:

1. Loads instructions from `scripts/ralph/CODEX.md`
2. Reads `scripts/ralph/prd.json`
3. Implements one story per iteration
4. Updates `scripts/ralph/progress.txt`
5. Stops when Codex outputs `<promise>COMPLETE</promise>` or the max iteration count is reached

Typical flow:

1. Run `/prd`
2. Run `/ralph`
3. Run `./scripts/ralph/ralph.sh --tool codex`
4. Run `./scripts/claude-review/claude-review.sh` if you want a cross-model review
