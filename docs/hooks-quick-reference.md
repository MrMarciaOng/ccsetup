# Hooks Quick Reference

## Installation

```bash
# New project with hooks
npx ccsetup my-project

# Add to existing Claude Code project
npx ccsetup --install-hooks
```

## How It Works

1. **You type**: "Fix the login bug"
2. **AI analyzes**: Understands this is a bug fix
3. **Suggests workflow**: Bug Fix → researcher → coder → checker
4. **You proceed**: With the right agents in the right order

## Supported Workflows

| Your Prompt Contains | Detected Workflow | Agents Used |
|---------------------|------------------|-------------|
| fix, bug, error, broken | Bug Fix | researcher → coder → checker |
| add, create, implement, feature | Feature Development | researcher → planner → coder → checker |
| refactor, improve, optimize | Refactoring | researcher → planner → coder → checker |
| api, endpoint, REST | API Development | planner → backend → frontend → checker |
| ui, component, frontend | UI Component | frontend → shadcn → checker |
| test, QA, quality | QA | researcher → checker → coder → checker |
| blockchain, smart contract, web3 | Blockchain | planner → blockchain → checker |

## Customization

### Add Custom Workflow
Edit `docs/agent-orchestration.md`:
```markdown
### 7. Data Pipeline Workflow
**Purpose**: Build data processing pipelines

**Flow**:
1. **Data Engineer** → Design pipeline
2. **Backend** → Implement processing
3. **Checker** → Validate data flow
```

### Modify Keywords
Edit `.claude/hooks/workflow-selector/index.js`:
```javascript
data_pipeline: {
  keywords: ['pipeline', 'etl', 'data', 'transform'],
  weight: 2
}
```

## Troubleshooting

**Not working?**
1. Check `.claude/settings.json` exists
2. Verify hook file is in `.claude/hooks/workflow-selector/`
3. Ensure Claude Code is running from project root

**Wrong workflow?**
- Be more specific in your prompt
- Check keyword mappings
- Customize weights for your project

## Advanced Features

- **AI Workflow Extraction**: Reads your custom workflows from docs
- **Intelligent Matching**: Understands context, not just keywords
- **Fallback System**: Works even without Claude CLI
- **Format Flexible**: Supports various documentation styles