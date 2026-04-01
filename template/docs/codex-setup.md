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
- `codex-review`

Keep these files in the project so Codex has project-specific workflow context alongside `AGENTS.md`.

## Suggested Workflow

1. Read `AGENTS.md`
2. Review `docs/ROADMAP.md`
3. Check relevant tickets and plans
4. Implement the change
5. Run the quality checks
6. Use `scripts/codex-review/codex-review.sh` for review when useful
