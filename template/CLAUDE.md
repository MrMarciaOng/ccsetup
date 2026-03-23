# Claude Code Project Instructions

## Project Overview

[Brief description of your project goes here]

## Key Objectives

- [Objective 1]
- [Objective 2]
- [Objective 3]

## Project Structure

```
.
├── CLAUDE.md          # This file - project instructions for Claude
├── .claude/
│   └── agents/        # 8 core agents (backend, blockchain, checker, coder, frontend, planner, researcher, shadcn)
├── agents/            # Documentation only — see .claude/agents/ for active agents
├── docs/              # Project documentation
├── plans/             # Project plans and architectural documents
└── tickets/           # Task tickets and issues
```

## Development Guidelines

### Code Style

- Follow existing code conventions in the project
- Use consistent naming patterns
- Maintain clean, readable code

### Testing

- Run tests before committing changes
- Add tests for new functionality
- Ensure all tests pass

### Git Workflow

- Create descriptive commit messages
- Keep commits focused and atomic
- Review changes before committing

## Common Commands

```bash
# Add your common project commands here
# npm install
# npm run dev
# npm test
```

## Important Context

[Add any project-specific context, dependencies, or requirements here]

## Agents

8 core agents are pre-installed in `.claude/agents/`. See @agents/README.md for the full list and instructions for adding custom agents.

## Agent Orchestration

See @docs/agent-orchestration.md for detailed workflow patterns on how to chain agents effectively.

## Tickets

See @tickets/README.md for ticket format and management approach

## Plans

See @plans/README.md for planning documents and architectural decisions

## Development Context

- See @docs/ROADMAP.md for current status and next steps
- Task-based development workflow with tickets in `/tickets` directory
- Use `/plans` directory for architectural decisions and implementation roadmaps

## Important Instructions

- Ask clarifying questions when requirements are unclear
- Self-documenting code — no code comments
- For complex features, consider creating a plan document in `/plans` before implementing

## Additional Notes

[Any other important information for Claude to know about this project]
