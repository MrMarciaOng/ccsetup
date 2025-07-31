# Interactive Setup Guide

## Overview

ccsetup provides an interactive setup process that guides you through creating a Claude Code project tailored to your needs.

## Setup Flow

### 1. Project Creation

When you run `npx ccsetup my-project`, you'll be prompted for:

- **Project location** - Where to create the project
- **Existing files** - How to handle conflicts if files exist
- **Agent selection** - Which agents to include

### 2. Agent Selection

You'll see three options:

```
🤖 How would you like to set up agents for your Claude Code project?

> Browse Mode - Copy all 50+ agents to /agents folder (explore later)
  Select Agents - Choose specific agents to include now
  Skip - Don't include any agents
```

#### Browse Mode

Perfect when you:
- Want to explore all available agents
- Prefer choosing agents as needed
- Don't want to be overwhelmed during setup

All agents are copied to `/agents` for later review.

#### Select Agents

Interactive selection from curated list:

```
🤖 Select agents to include in your Claude Code project

Use arrow keys to navigate, space to select/deselect, 'a' to toggle all

Choose your agents:
◯ backend - Backend development specialist
◯ blockchain - Web3 and smart contract expert
◯ checker - Quality assurance specialist
◯ coder - Expert software developer
◯ frontend - Frontend development specialist
◯ planner - Strategic planning specialist
◯ researcher - Research specialist
◯ shadcn - shadcn/ui component expert
```

### 3. File Conflict Resolution

If files already exist, you'll see:

```
⚠️  File conflicts detected. You will be asked how to handle each category.

📄 CLAUDE.md conflicts:
  - CLAUDE.md

Your choice for CLAUDE.md [s/r/o]:
```

Options:
- **s** (skip) - Keep existing files
- **r** (rename) - Add -ccsetup suffix to new files
- **o** (overwrite) - Replace with template

### 4. Claude Code Integration

If Claude Code isn't detected:

```
📋 Claude Code setup instructions:

To initialize Claude Code in your project:
1. Navigate to: /path/to/my-project
2. Run: claude init
```

## Post-Setup Steps

### 1. Initialize Claude Code

```bash
cd my-project
claude init  # If not already initialized
```

### 2. Review Project Files

1. **CLAUDE.md** - Customize with project-specific instructions
2. **docs/ROADMAP.md** - Define your project goals
3. **docs/agent-orchestration.md** - Understand workflows

### 3. Start Using Claude

```bash
claude

# First commands:
"Read CLAUDE.md to understand this project"
"What agents are available?"
"Show me the agent orchestration workflows"
```

### 4. Choose Your Workflow

Based on your task:
- Feature development → Feature workflow
- Bug fixing → Bug fix workflow
- New API → API development workflow
- UI work → UI component workflow

## Tips for Success

### Agent Selection

1. **Start minimal** - You can always add more agents later
2. **Core agents** - planner, coder, checker, researcher are essential
3. **Specialized agents** - Add based on your tech stack

### Browse Mode Workflow

```bash
# 1. Setup with browse mode
npx ccsetup my-project --browse-agents

# 2. Explore agents
cd my-project/agents
ls *.md

# 3. Read descriptions
cat python-pro.md

# 4. Copy to activate
cp python-pro.md ~/.claude/agents/
```

### Customization

After setup, customize:
- Update CLAUDE.md with your coding standards
- Add project-specific commands
- Define your git workflow
- Set testing requirements

## Common Patterns

### For New Projects

```bash
npx ccsetup my-app --agents
# Select: planner, coder, checker, researcher
# Plus any tech-specific agents
```

### For Existing Projects

```bash
npx ccsetup . --browse-agents
# Review agents gradually
# Add as needed
```

### For Teams

```bash
npx ccsetup team-project --all-agents
# Document which agents to use when
# Add to team onboarding docs
```

## Troubleshooting

### "Command not found"

Ensure you have Node.js 14+ installed.

### Permission Errors

Use `sudo` if needed, or check npm permissions.

### Conflicts with Existing Files

Use rename option (-r) to preserve both versions.