# ccsetup

[![npm version](https://img.shields.io/npm/v/ccsetup.svg)](https://www.npmjs.com/package/ccsetup)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/marcia-ong/ccsetup/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm downloads](https://img.shields.io/npm/dm/ccsetup.svg)](https://www.npmjs.com/package/ccsetup)

Quick setup for Claude Code projects with 50+ built-in agents, orchestration workflows, and planning tools.

## Quick Start

```bash
# Create new project
npx ccsetup my-project

# Setup in current directory
npx ccsetup .

# Global installation (optional)
npm install -g ccsetup
```

## Core Features

✨ **50+ Specialized Agents** - Expert agents for every development need  
🔄 **Agent Orchestration** - Pre-defined workflows for systematic task execution  
📋 **Task Management** - Built-in ticket system and planning tools  
📁 **Claude Code Integration** - Automatic .claude directory setup  
🎯 **Interactive Setup** - Choose agents during installation or browse later

## What You Get

```
my-project/
├── CLAUDE.md          # Project instructions for Claude
├── agents/            # 50+ specialized AI agents
├── docs/              # Documentation & workflows
│   ├── ROADMAP.md     # Development roadmap
│   └── agent-orchestration.md
├── tickets/           # Task tracking system
├── plans/             # Planning documents
└── .claude/           # Claude Code directory
```

## Usage Examples

```bash
# Interactive agent selection
npx ccsetup my-project --agents

# Include all agents
npx ccsetup my-project --all-agents

# Browse mode - explore agents later
npx ccsetup my-project --browse-agents

# Preview without creating files
npx ccsetup my-project --dry-run
```

## Agent Orchestration Workflows

Pre-configured workflows that coordinate multiple agents:

- **Feature Development**: Researcher → Planner → Coder → Checker
- **Bug Fix**: Researcher → Coder → Checker
- **API Development**: Planner → Backend → Frontend → Checker
- **UI Components**: Frontend → Shadcn → Checker
- **Quality Assurance**: Full testing and validation pipeline

[Learn more about workflows →](docs/agent-orchestration.md)

## Documentation

- 📖 [Command Line Options](docs/cli-usage.md)
- 🤖 [Available Agents](template/agents/README.md)
- 🔄 [Agent Orchestration](docs/agent-orchestration.md)
- 🎯 [Interactive Setup Guide](docs/setup-guide.md)
- 📋 [Ticket System](docs/ticket-system.md)
- 🔧 [Conflict Resolution](docs/conflict-resolution.md)
- 🚀 [Getting Started with Claude Code](docs/getting-started.md)

## Quick Tips

1. **After setup**: Read CLAUDE.md and docs/ROADMAP.md
2. **Start working**: Use appropriate agents for your tasks
3. **Track progress**: Create tickets in the tickets/ directory
4. **Plan features**: Use the planner agent for complex tasks

## Credits

Born from discussions in TechOverflow with [vichannnnn](https://github.com/vichannnnn) and [nasdin](https://github.com/nasdin).

Agent collection from [wshobson/agents](https://github.com/wshobson/agents).

## License

MIT