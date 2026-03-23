# Hooks System

ccsetup includes an optional workflow-selection hook that analyzes prompts and suggests agent sequences.

## Installation

```bash
# Add to existing project
npx ccsetup --install-hooks

# Or during project creation
npx ccsetup my-project
```

Installation is non-destructive: detects existing hooks, creates backups, merges configurations, and skips duplicates.

## How It Works

1. Hook reads workflows from `docs/agent-orchestration.md`
2. AI analyzes your prompt (falls back to keyword matching)
3. Suggests appropriate workflow and agent sequence

```
You: "Fix the login bug"
Hook: Bug Fix workflow → researcher → coder → checker
```

## Configuration

Add to `.claude/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "node $CLAUDE_PROJECT_DIR/.claude/hooks/workflow-selector/index.js"
          }
        ]
      }
    ]
  }
}
```

## Keyword Mappings

| Prompt Keywords | Workflow | Agents |
|----------------|----------|--------|
| fix, bug, error | Bug Fix | researcher → coder → checker |
| add, create, feature | Feature Development | researcher → planner → coder → checker |
| refactor, optimize | Refactoring | researcher → planner → coder → checker |
| api, endpoint, REST | API Development | planner → backend → frontend → checker |
| ui, component | UI Component | frontend → shadcn → checker |
| test, QA | QA | researcher → checker → coder → checker |
| blockchain, web3 | Blockchain | planner → blockchain → checker |

## Conflict Handling

When hooks or settings already exist, the installer prompts:
- **Keep existing** — preserve your customizations
- **Update** — backup and replace with latest version
- **Add to existing** — append workflow hook alongside your hooks
- **Skip** — leave unchanged

Backups use timestamped filenames (e.g., `index.js.backup-1234567890`).

## Disabling

Set `"enabled": false` in the hook config, or remove the entry from `.claude/settings.json`.

## Troubleshooting

- Verify `.claude/settings.json` exists and is valid JSON
- Check hook file exists at `.claude/hooks/workflow-selector/index.js`
- Ensure Claude Code runs from project root
