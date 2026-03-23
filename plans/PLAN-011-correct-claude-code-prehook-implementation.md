# PLAN-011: Correct Claude Code Pre-Hook Implementation

## Executive Summary
The current implementation incorrectly adds a `--prompt` flag to ccsetup's CLI instead of creating actual Claude Code pre-hooks that run when users interact with Claude. This plan corrects the implementation to install pre-hooks into user projects that Claude Code will execute.

## Problem Analysis

### Current (Incorrect) Implementation
- Pre-hook system exists in ccsetup's `/lib/hooks/` directory
- Only works during project setup via `--prompt` flag
- Does NOT install hooks into user projects
- Users get no benefit after initial setup

### Correct Implementation
- Pre-hooks should be copied to user's project
- Claude Code executes them when processing user prompts
- Provides ongoing workflow guidance, not just during setup

## Implementation Strategy

### Phase 1: Remove Incorrect Implementation

1. **Remove --prompt flag from CLI**
   - Remove flag parsing in `bin/create-project.js`
   - Remove pre-hook execution during setup
   - Remove agent pre-selection based on prompt
   - Clean up related console outputs

2. **Remove lib/hooks directory**
   - This was for ccsetup's use, not for user projects
   - Keep the code as we'll move it to template

### Phase 2: Create Template Pre-Hook Structure

1. **Move hooks to template directory**
   ```
   template/
   ├── .ccsetup/
   │   └── hooks.json          # Hook configuration
   ├── hooks/
   │   └── workflow-selector/
   │       ├── index.js        # Main hook entry
   │       ├── parser.js       # Parse agent-orchestration.md
   │       ├── analyzer.js     # Analyze user prompts
   │       ├── selector.js     # Select workflows
   │       ├── clarification.js # Handle ambiguous prompts
   │       └── metadata-generator.js # Generate output
   ```

2. **Create proper hooks.json**
   ```json
   {
     "pre-hooks": {
       "workflow-selector": {
         "script": "hooks/workflow-selector/index.js",
         "enabled": true,
         "description": "Automatically selects workflow based on user prompt"
       }
     }
   }
   ```

### Phase 3: Update CLAUDE.md Template

Add pre-hook instructions to `template/CLAUDE.md`:

```markdown
## Pre-Hook Configuration

This project includes a workflow selection pre-hook that automatically:
1. Analyzes your prompts to determine task type
2. Selects the appropriate workflow from agent-orchestration.md
3. Creates initial todos and execution plan

When you give me a task, I will:
- Use the pre-hook to identify the workflow
- Follow the agent sequence (e.g., researcher → planner → coder → checker)
- Create todos to track progress
- Execute the workflow systematically

The pre-hook is configured in `.ccsetup/hooks.json` and can be disabled if needed.
```

### Phase 4: Fix Hook Implementation

1. **Update hook to work in user projects**
   - Fix relative paths to find agent-orchestration.md
   - Ensure it works from project root
   - Handle missing dependencies gracefully

2. **Simplify hook interface**
   - Remove dependency on ccsetup's lib structure
   - Make it standalone and portable
   - Include necessary utilities directly

### Phase 5: Update Project Setup

1. **Copy hooks during setup**
   - Add hooks to the list of template directories to copy
   - Ensure proper file permissions
   - Handle conflicts appropriately

2. **Make hooks optional**
   - Add `--no-hooks` flag for users who don't want pre-hooks
   - Or use existing `--minimal` flag logic

## File Structure Changes

### Remove:
- `/lib/hooks/` (entire directory)
- `--prompt` flag handling in CLI
- Pre-hook execution in `createProject()`

### Add:
- `/template/hooks/` (moved from lib)
- `/template/.ccsetup/hooks.json`
- Pre-hook instructions in `/template/CLAUDE.md`

### Modify:
- `bin/create-project.js` - Remove prompt handling
- Help text - Remove --prompt documentation

## Implementation Steps

1. **Backup current implementation** (in case we need reference)
2. **Remove incorrect implementation** from CLI
3. **Move hook files** to template directory
4. **Update paths** in hook code for user project context
5. **Create hooks.json** configuration
6. **Update CLAUDE.md** with pre-hook instructions
7. **Test** in a new project to ensure hooks execute

## Success Criteria

- [ ] No `--prompt` flag in ccsetup CLI
- [ ] Hooks are copied to user projects during setup
- [ ] `.ccsetup/hooks.json` exists in generated projects
- [ ] CLAUDE.md includes pre-hook instructions
- [ ] Claude Code can execute the pre-hooks
- [ ] Workflow selection works when users interact with Claude

## Risk Mitigation

- Test hooks work without ccsetup dependencies
- Ensure graceful fallback if hooks fail
- Document how to disable hooks if needed
- Keep implementation simple and maintainable

## Timeline

- Phase 1: 30 minutes (removal)
- Phase 2: 1 hour (restructuring)
- Phase 3: 30 minutes (documentation)
- Phase 4: 1 hour (fixes)
- Phase 5: 30 minutes (integration)
- Testing: 30 minutes

Total: ~4 hours