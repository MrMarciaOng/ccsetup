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
- `.codex/skills/` for project-local Codex skills (`prd`, `ralph`, `codex-review`)
- `docs/codex-setup.md` inside the generated project for project-local guidance

## Notes

- Codex setup in `ccsetup` is project-local: the generated project contains `AGENTS.md`, `.codex/skills/`, and Codex-oriented docs.
- Claude-oriented `--agents` and `--browse` flows remain specific to Claude agent setup.
