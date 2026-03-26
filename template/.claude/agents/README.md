# Claude Code Agents

This directory contains project-specific AI agents that extend Claude Code's capabilities.

## Using Agents

Agents in this directory are automatically available in Claude Code. You can invoke them using the Task tool by specifying the agent type.

## Agent Structure

Each agent should be a markdown file with the following structure:

```markdown
---
name: agent-name
description: Brief description of what this agent does
---

# Agent Name

## Purpose
[What this agent does]

## Capabilities
- [Capability 1]
- [Capability 2]

## Instructions
[Detailed instructions for the agent]
```

## Available Agents

Agents will be listed here as they are added to this directory.

## Creating Custom Agents

To create a custom agent:
1. Create a new `.md` file in this directory
2. Add the frontmatter with name and description
3. Define the agent's purpose, capabilities, and instructions
4. The agent will be immediately available in Claude Code

For more information about agents, see the main project's `agents/` directory.