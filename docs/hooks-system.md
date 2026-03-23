# Hooks System Documentation

## Overview

ccsetup includes a powerful hooks system that enhances Claude Code with intelligent workflow detection and automation. The hooks integrate seamlessly with Claude Code's pre-hook functionality to analyze your prompts and configure optimal development workflows.

## Available Hooks

### 1. Workflow Selection Hook

The workflow selection hook is an AI-powered system that:
- Analyzes your prompts using Claude's language understanding
- Detects the type of task (feature, bug fix, refactoring, etc.)
- Suggests the appropriate workflow and agent sequence
- Adapts to your project's custom workflows

[→ Detailed Setup Guide](workflow-hook-setup.md)

## Key Features

### AI-Powered Intelligence

The hooks system uses Claude Code's AI capabilities in two ways:

1. **Workflow Loading** - Intelligently extracts workflows from your `agent-orchestration.md`
2. **Workflow Selection** - Analyzes your prompts to suggest the best workflow

### Flexible Format Support

The system understands various documentation formats:
- Numbered lists: `1. **Agent** → Description`
- Bullet points: `- **Agent** → Description`
- Arrow notation: `Agent → Agent → Agent`
- Mixed formats and custom styles

### Robust Fallback System

When Claude AI isn't available, the system falls back to:
- Enhanced keyword matching with weighted scoring
- Comprehensive pattern recognition
- Default workflow configurations

## How It Works

### 1. Smart Installation
```bash
# Install hooks in existing Claude Code project
npx ccsetup --install-hooks

# Or during project creation
npx ccsetup my-project
```

The installation is intelligent and non-destructive:
- **Detects existing hooks** - Won't overwrite your customizations
- **Creates backups** - Timestamps all replaced files
- **Merges configurations** - Adds to existing hooks when possible
- **Avoids duplicates** - Skips if already configured

[→ Smart Installation Details](smart-hook-installation.md)

### 2. Workflow Detection Process

```
User Prompt → Hook Analysis → Workflow Selection → Agent Configuration
     ↓              ↓                  ↓                    ↓
"Fix login"   AI Analysis      Bug Fix Workflow    researcher→coder→checker
```

### 3. Example Interactions

**Bug Fix:**
```
You: "Users can't login on mobile devices"
Hook: Detected Bug Fix workflow
      Agents: researcher → coder → checker
```

**Feature Development:**
```
You: "Add real-time notifications"
Hook: Detected Feature Development workflow
      Agents: researcher → planner → coder → checker
```

**Custom Workflow:**
```
You: "Implement blockchain payment system"
Hook: Detected Blockchain Development workflow
      Agents: planner → blockchain → checker
```

## Configuration

### Settings Location
`.claude/settings.json`

### Hook Configuration
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

### Customization Options

1. **Add Custom Workflows** - Edit `docs/agent-orchestration.md`
2. **Modify Keywords** - Update the workflow selector's keyword mappings
3. **Change Priorities** - Adjust workflow selection weights
4. **Add New Hooks** - Create additional hooks for other events

## Technical Details

### Workflow Loading (`loadWorkflows`)
- [→ Technical Implementation](../LOAD_WORKFLOWS_IMPROVEMENTS.md)
- Uses `claude --print` for intelligent extraction
- Falls back to enhanced regex parsing
- Supports multiple documentation formats

### Workflow Selection (`selectWorkflow`)
- [→ Technical Implementation](../WORKFLOW_SELECTOR_IMPROVEMENTS.md)
- AI-powered prompt analysis
- Weighted keyword matching fallback
- Context-aware workflow suggestion

## Benefits

1. **Faster Development** - Start with the right workflow immediately
2. **Consistency** - Follow established patterns automatically
3. **Intelligence** - AI understands complex requests
4. **Flexibility** - Adapts to your documentation style
5. **Reliability** - Multiple fallback mechanisms

## Troubleshooting

### Hook Not Triggering
1. Check `.claude/settings.json` exists and is valid JSON
2. Verify hook file exists at `.claude/hooks/workflow-selector/index.js`
3. Ensure Claude Code is reading from the project directory

### Wrong Workflow Selected
1. Review keywords in your prompt
2. Check `docs/agent-orchestration.md` for workflow definitions
3. Consider customizing keyword weights

### Performance Issues
1. The hook runs quickly (typically <100ms)
2. If slow, check if Claude CLI is accessible
3. Fallback to keyword matching is instant

## Future Enhancements

- **Learning System** - Track and improve selection accuracy
- **Workflow Chains** - Support multi-phase workflows
- **Custom Hooks** - Additional automation opportunities
- **Performance Caching** - Cache extracted workflows
- **Hot Reload** - Auto-update on documentation changes

## Related Documentation

- [Workflow Hook Setup Guide](workflow-hook-setup.md)
- [Agent Orchestration Guide](agent-orchestration.md)
- [Getting Started with Claude Code](getting-started.md)