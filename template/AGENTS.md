# Codex Project Instructions

## Project Overview

[Brief description of your project goes here]

## Primary Working Files

- `AGENTS.md` — project-specific guidance for Codex
- `.codex/skills/` — project-local Codex skills for this project (`prd`, `ralph`, `codex-review`)
- `docs/codex-setup.md` — Codex setup notes for this repo
- `docs/ROADMAP.md` — project goals and status
- `tickets/` — task tracking
- `plans/` — implementation and architecture plans

## Working Expectations

- Read this file before making changes.
- Check `docs/ROADMAP.md` and relevant tickets before starting non-trivial work.
- Prefer small, reviewable changes.
- Run the project quality checks before finishing.

## Repo Workflow

- Use plans in `plans/` for larger features.
- Track implementation work in `tickets/`.
- Use `scripts/codex-review/codex-review.sh` when you want a second-opinion review from Codex CLI.
- Use `scripts/ralph/ralph.sh --tool codex` for Ralph runs through Codex CLI.

## Codex Skills

This project ships project-local Codex skills in `.codex/skills/`, mirroring the Claude skill set:

- `prd`
- `ralph`
- `codex-review`

Keep these skills in the repository alongside `AGENTS.md` and the project docs.

## Project Conventions

- Update this file when you discover project-wide rules that future Codex sessions should know.
- Keep project-specific conventions here, and put reusable workflow guidance into project-local skills.
