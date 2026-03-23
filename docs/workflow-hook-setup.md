# Workflow Selection Hook Setup

This guide shows how to install a pre-hook in Claude Code that automatically suggests workflows based on your prompts.

## What It Does

The hook:
1. Reads workflows from `docs/agent-orchestration.md`
2. Checks available agents in `.claude/agents/`
3. Suggests appropriate workflow based on keywords in your prompt

## Installation Steps

### 1. Create Hook Directory

```bash
mkdir -p .claude/hooks/workflow-selector
```

### 2. Copy Hook File

Copy the `workflow-selector/index.js` file to `.claude/hooks/workflow-selector/index.js`

### 3. Update Settings

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

## How It Works

When you type a prompt like:
- "Fix the login bug" → Suggests Bug Fix workflow
- "Add user authentication" → Suggests Feature Development workflow
- "Refactor the API" → Suggests Refactoring workflow

The hook outputs a JSON with:
- Suggested workflow name
- List of agents to use (filtered by what's available in `.claude/agents/`)
- A message describing the suggestion

## Example Output

```json
{
  "workflow": "Bug Fix",
  "agents": ["researcher", "coder", "checker"],
  "message": "Suggested workflow: Bug Fix with agents: researcher → coder → checker"
}
```

## Customization

- Edit keyword matching in `selectWorkflow()` function
- Add new workflows to `docs/agent-orchestration.md`
- The hook automatically picks up changes

## Disabling

To disable, either:
1. Set `"enabled": false` in the hook configuration
2. Remove the hook entry from `.claude/settings.json`