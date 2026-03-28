# ROADMAP

## Overview

ccsetup is a CLI scaffolding tool that creates ready-to-use Claude Code project structures. It ships 8 core agents, orchestration workflows, a ticket system, and planning tools.

## Development

### Completed

- [x] Project scaffolding with agents, docs, tickets, and plans directories
- [x] Interactive mode selection for bare `npx ccsetup`
- [x] Consolidation from 50+ agents to 8 core agents
- [x] Consolidate docs directory (12 files → 6)
- [x] Codex review skill with plan, implementation, and code review modes

### Planned

- [ ] Demote hooks system to optional/advanced feature

### Removed

- Repository context scanning (`--scan-context`, `ccsetup scan`, `--scan-only`)
- Context merge functionality (smart merge, replace strategies)

## Future Enhancements

- Web UI dashboard for project management
- Plugin system for custom agent packs
- Template selection system for different project types
