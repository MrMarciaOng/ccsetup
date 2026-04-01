# Codex Setup

## Overview

`ccsetup` can generate Codex-oriented project assets in addition to the existing Claude Code setup.

During full setup, users can choose:

- `Claude`
- `Codex`
- `Both`

## Generated Codex Assets

When Codex support is selected, `ccsetup` can generate:

- `AGENTS.md` for Codex-facing project instructions
- `.codex/README.md` for project-local Codex directory guidance
- `.codex/skills/` for project-local Codex skills (`prd`, `ralph`, `claude-review`, `secops`)
- `docs/codex-setup.md` inside the generated project for project-local guidance

## Notes

- Codex setup in `ccsetup` is project-local: the generated project contains `AGENTS.md`, `.codex/README.md`, `.codex/skills/`, and Codex-oriented docs.
- Claude-oriented `--agents` and `--browse` flows remain specific to Claude agent setup.

## Codex Ralph Loop

Generated projects include `scripts/ralph/ralph.sh`, which supports Codex directly:

```bash
./scripts/ralph/ralph.sh --tool codex
./scripts/ralph/ralph.sh --tool codex --model gpt-5
./scripts/ralph/ralph.sh --tool codex --model gpt-5 5
```

When `--tool codex` is selected, Ralph runs the instructions in `scripts/ralph/CODEX.md` against `scripts/ralph/prd.json` and records progress in `scripts/ralph/progress.txt`.
