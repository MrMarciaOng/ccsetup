# .codex Directory

This directory contains Codex project-local configuration and reusable workflow context.

## Structure

- **skills/** - Project-local Codex skills for planning, execution, review, and dependency security

## Skills

The `skills/` directory contains project-specific Codex skills that are available when working in this repository.

Current skills:

- `prd`
- `ralph`
- `claude-review`
- `secops`

## Notes

- Codex skill coverage mirrors the Claude template where the feature maps cleanly to Codex.
- Claude-specific agents, hooks, and `.claude/settings.json` wiring do not have direct `.codex` equivalents.
