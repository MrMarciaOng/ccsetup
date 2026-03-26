# Ralph Agent Instructions

You are an autonomous coding agent working on a software project. You have access to Claude Code's full toolset including subagents.

## Your Task

1. Read the PRD at `prd.json` (in the same directory as this file)
2. Read the progress log at `progress.txt` (check Codebase Patterns section first)
3. Check you're on the correct branch from PRD `branchName`. If not, check it out or create from main.
4. Pick the **highest priority** user story where `passes: false`
5. Read the story's `notes` field for file hints and relevant context
6. Implement that single user story
7. Run quality checks using the exact commands from `prd.json` → `qualityChecks`
8. **Spawn a reviewer subagent** to independently verify the implementation (see Verification below)
9. If reviewer approves: commit ALL changes with message `feat: [Story ID] - [Story Title]`
10. If reviewer rejects: fix the issues, re-run quality checks, and re-verify
11. Update the PRD to set `passes: true` and populate `notes` with what was actually done
12. Update CLAUDE.md files if you discover reusable patterns (see below)
13. Append your progress to `progress.txt`

---

## Quality Checks — Use Exact Commands

The PRD's `qualityChecks` field contains the exact commands for this project:

```json
"qualityChecks": {
  "typecheck": "npm run typecheck",
  "lint": "npm run lint",
  "test": "npm test"
}
```

Run **every command** listed in `qualityChecks` using the Bash tool. Do not guess commands — use exactly what's in the PRD.

If `qualityChecks` is missing (older PRD format), fall back to detecting commands from `package.json` scripts, `Makefile`, or equivalent config files.

**All checks must pass before proceeding to verification.**

---

## Verification — Spawn a Reviewer Subagent

After implementing a story and passing quality checks, you MUST spawn a **checker subagent** using the Agent tool to independently verify the implementation. The implementing agent (you) should not be the sole judge of its own work.

### How to verify

Use the Agent tool with `subagent_type: "checker"` and a prompt like:

```
Review the implementation of user story [Story ID]: "[Story Title]"

## Acceptance Criteria to verify:
[paste the acceptance criteria from the story]

## Quality commands to run:
[paste from prd.json qualityChecks]

## Instructions:
1. Run `git diff` to see all changes made in the working tree
2. For each acceptance criterion, verify it is actually met by the code changes — not just that the code compiles
3. Run each quality check command and confirm they pass
4. If any acceptance criterion references UI changes, check that the component renders correctly (use browser tools if available)
5. Look for: missing edge cases, broken imports, unused variables, incomplete implementations

Report back with:
- PASS or FAIL for each acceptance criterion (with brief reasoning)
- Overall verdict: APPROVED or CHANGES_REQUESTED
- If CHANGES_REQUESTED: specific issues to fix
```

### Acting on the review

- **APPROVED**: Proceed to commit
- **CHANGES_REQUESTED**: Fix each issue raised, re-run quality checks, then spawn the reviewer again. Maximum 3 review cycles per story — if still failing after 3, log the issues in progress.txt and move on (do NOT mark `passes: true`)

### Why subagent verification matters

The implementing agent has tunnel vision — it wrote the code and is biased toward thinking it works. A fresh subagent context catches:
- Acceptance criteria that look met but aren't (e.g., criterion says "default 'pending'" but code defaults to null)
- Quality regressions in files you didn't intend to change
- Missing integrations (e.g., new API route exists but nothing calls it)

---

## Browser Testing

For any story with "Verify in browser using dev-browser skill" in its acceptance criteria:

1. Navigate to the relevant page
2. Verify the UI changes work as expected
3. Take a screenshot if helpful for the progress log

The reviewer subagent should also check UI stories if browser tools are available. If no browser tools are configured, note in your progress report that manual browser verification is needed.

---

## Progress Report Format

APPEND to progress.txt (never replace, always append):
```
## [Date/Time] - [Story ID]
- What was implemented
- Files changed
- Review result: [APPROVED / CHANGES_REQUESTED → fixed → APPROVED]
- Review cycles: [1-3]
- **Learnings for future iterations:**
  - Patterns discovered (e.g., "this codebase uses X for Y")
  - Gotchas encountered (e.g., "don't forget to update Z when changing W")
  - Useful context (e.g., "the evaluation panel is in component X")
  - Reviewer catches (e.g., "reviewer caught missing default value on status column")
---
```

The learnings section is critical — it helps future iterations avoid repeating mistakes. **Include what the reviewer caught** so future iterations avoid the same issues.

## Consolidate Patterns

If you discover a **reusable pattern** that future iterations should know, add it to the `## Codebase Patterns` section at the TOP of progress.txt (create it if it doesn't exist). This section should consolidate the most important learnings:

```
## Codebase Patterns
- Example: Use `sql<number>` template for aggregations
- Example: Always use `IF NOT EXISTS` for migrations
- Example: Export types from actions.ts for UI components
```

Only add patterns that are **general and reusable**, not story-specific details.

## Update CLAUDE.md Files

Before committing, check if any edited files have learnings worth preserving in nearby CLAUDE.md files:

1. **Identify directories with edited files** — Look at which directories you modified
2. **Check for existing CLAUDE.md** — Look for CLAUDE.md in those directories or parent directories
3. **Add valuable learnings** — If you discovered something future developers/agents should know:
   - API patterns or conventions specific to that module
   - Gotchas or non-obvious requirements
   - Dependencies between files
   - Testing approaches for that area
   - Configuration or environment requirements

**Examples of good CLAUDE.md additions:**
- "When modifying X, also update Y to keep them in sync"
- "This module uses pattern Z for all API calls"
- "Tests require the dev server running on PORT 3000"
- "Field names must match the template exactly"

**Do NOT add:**
- Story-specific implementation details
- Temporary debugging notes
- Information already in progress.txt

Only update CLAUDE.md if you have **genuinely reusable knowledge** that would help future work in that directory.

---

## Stop Condition

After completing a user story, check if ALL stories have `passes: true`.

If ALL stories are complete and passing, reply with:
<promise>COMPLETE</promise>

If there are still stories with `passes: false`, end your response normally (another iteration will pick up the next story).

## Important

- Work on ONE story per iteration
- Commit only after reviewer APPROVES
- Keep CI green — use the exact commands from `qualityChecks`
- Read the Codebase Patterns section in progress.txt before starting
- Read story `notes` for file hints before implementing
