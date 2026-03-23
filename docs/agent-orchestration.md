# Agent Orchestration

Standard workflows for chaining agents on complex tasks. Always end with **Checker**.

## Workflows

### Feature Development
researcher → planner → coder → checker

### Bug Fix
researcher → coder → checker

### Refactoring
researcher → planner → coder → checker

### API Development
planner → backend → frontend (optional) → checker

### UI Component
frontend → shadcn (if React) → checker

### Blockchain
planner → blockchain → checker

### QA
researcher → checker → coder (fix issues) → checker

## Rules

1. Use **Researcher** first for non-trivial tasks
2. Use **Planner** before implementing complex features
3. Execute agents sequentially — complete each step before the next
4. Always finish with **Checker** for validation
5. Track progress with TodoWrite
6. Update ROADMAP.md and tickets after completing workflows
