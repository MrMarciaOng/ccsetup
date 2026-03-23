# AI-Enhanced Merge Features

## Overview

ccsetup uses Claude Code commands to provide intelligent merge suggestions and conflict resolution when updating CLAUDE.md files.

## Merge Strategies

There are two merge strategies:

### 1. Smart Merge (default)

Preserves your customizations while adding newly detected information. Handles section-by-section merging with type-aware logic for tech stacks, commands, lists, and project structure.

```bash
ccsetup scan --update
ccsetup scan --update --merge-strategy smart
```

### 2. Replace

Full replacement with new scan results. Creates a brand new CLAUDE.md from your current codebase.

```bash
ccsetup scan --update --merge-strategy replace
```

## AI Features

### Conflict Analysis

For conflicting sections during interactive review, AI provides:
- What's different between versions
- Which version is more complete
- Whether merging both would be beneficial
- A recommended resolution

### AI-Powered Content Merging

When you select "Merge both" during interactive review, AI intelligently combines content by:
- Preserving user customizations
- Adding new information
- Removing duplicates
- Maintaining formatting

## How It Works

- Uses `claude --print` command for AI analysis
- Falls back gracefully if Claude Code isn't installed
- All AI features are optional enhancements

## Requirements

- Claude Code CLI installed (optional but recommended)
- No additional configuration needed
