# .claude Directory

This directory contains Claude Code configuration and project-specific resources.

## Structure

- **agents/** - Project-specific AI agents with custom prompts
- **commands/** - Custom slash commands (created as needed)
- **settings.json** - Shared project settings (created as needed)
- **settings.local.json** - Personal settings (git-ignored, created as needed)

## Agents

The `agents/` directory contains specialized AI agents for your project. These agents are automatically available in Claude Code and can be invoked using the Task tool.

To add a new agent:
1. Create a markdown file in the `agents/` directory
2. Follow the agent template structure
3. The agent will be automatically available in Claude Code

## Learn More

For more information about Claude Code configuration, visit:
https://docs.anthropic.com/claude-code/