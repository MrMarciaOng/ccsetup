# ROADMAP

## Overview

ccsetup is a CLI scaffolding tool that creates ready-to-use Claude Code project structures. It ships 8 core agents, orchestration workflows, a ticket system, and planning tools. The scan-context feature auto-generates CLAUDE.md from existing codebases.

## Development

### Completed

- [x] Project scaffolding with agents, docs, tickets, and plans directories
- [x] Repository context scanning (`--scan-context`, `ccsetup scan`)
- [x] Standalone scan subcommand with progress indicators
- [x] Interactive mode selection for bare `npx ccsetup`
- [x] `--scan-only` flag for scan without boilerplate
- [x] Consolidation from 50+ agents to 8 core agents

### In Progress

- [ ] Fix context merge functionality
  - Implement intelligent merging instead of append/replace
  - See: /tickets/TICKET-006-fix-context-merge-functionality.md

### Planned

- [x] Simplify merge strategies (reduce from 5 to 2: smart merge + replace)
- [ ] Demote hooks system to optional/advanced feature
- [x] Consolidate docs directory (12 files → 6)

## Future Enhancements

- Web UI dashboard for project management
- Plugin system for custom agent packs
- Template selection system for different project types
