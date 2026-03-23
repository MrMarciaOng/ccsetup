# Agents Directory

This directory is for documentation only. All active agents live in `.claude/agents/`.

## Available Core Agents

These 8 agents are pre-installed in `.claude/agents/`:

- **backend** - Backend development specialist for API design, database architecture, and server-side optimization
- **blockchain** - Blockchain and Web3 expert for smart contracts, DeFi protocols, and blockchain architecture
- **checker** - Quality assurance and code review specialist for testing, security analysis, and validation
- **coder** - Expert software developer for implementing features, fixing bugs, and optimizing code
- **frontend** - Frontend development specialist for UI/UX, responsive design, and modern web frameworks
- **planner** - Strategic planning specialist for breaking down complex problems and creating implementation roadmaps
- **researcher** - Research specialist for both online sources and local codebases, gathering comprehensive information
- **shadcn** - shadcn/ui component library expert for building beautiful, accessible React interfaces

## Adding Custom Agents

To add a custom agent, create a `.md` file in `.claude/agents/` with this structure:

```markdown
---
name: agent-name
description: When this agent should be invoked
---

System prompt defining the agent's role and capabilities
```

## Agent Workflows

See `docs/agent-orchestration.md` for recommended multi-agent workflows.
