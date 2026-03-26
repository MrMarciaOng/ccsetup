---
name: ralph
description: "Convert PRDs to prd.json format for the Ralph autonomous agent system. Use when you have an existing PRD and need to convert it to Ralph's JSON format. Triggers on: convert this prd, turn this into ralph format, create prd.json from this, ralph json."
---

# Ralph PRD Converter

Converts existing PRDs to the prd.json format that Ralph uses for autonomous execution. Scans the codebase to populate quality checks, file hints, and story notes automatically.

---

## The Job

1. **Scan the codebase** to detect quality commands and relevant file paths
2. Read the PRD (markdown file or text) — check for a Tech Context section first
3. Convert to `scripts/ralph/prd.json` with codebase-informed stories
4. Initialize `scripts/ralph/progress.txt` if it doesn't exist

**Important:** Do NOT start implementing. Just create the prd.json.

---

## Step 1: Codebase Reconnaissance

Before converting, silently scan the project using Claude Code tools.

### If PRD has a Tech Context section
The improved `/prd` skill generates a Tech Context section with stack, quality gates, and relevant file paths. If present, use it directly — no need to re-scan.

### If PRD has no Tech Context section
Scan manually:

**Detect quality commands** — Read `package.json` scripts, config files, Makefiles:
- Look for: `typecheck`, `tsc`, `check-types` → record the exact script (e.g., `npm run typecheck`)
- Look for: `lint`, `eslint`, `biome check` → record exact script (e.g., `npm run lint`)
- Look for: `test`, `vitest`, `jest`, `pytest` → record exact script (e.g., `npm test`)
- Look for: `build` → record exact script (e.g., `npm run build`)

**Scan relevant files** — Use Glob to find files related to each user story:
- Database: `**/schema.prisma`, `**/models/**`, `**/migrations/**`
- API: `**/api/**`, `**/routes/**`, `**/app/**/route.*`
- Components: `**/components/**`
- Utilities: `**/hooks/**`, `**/utils/**`, `**/lib/**`

These become `notes` on each story — giving Ralph file-level hints for where to work.

---

## Step 2: Output Format

```json
{
  "project": "[Project Name]",
  "branchName": "ralph/[feature-name-kebab-case]",
  "description": "[Feature description from PRD title/intro]",
  "qualityChecks": {
    "typecheck": "npm run typecheck",
    "lint": "npm run lint",
    "test": "npm test",
    "build": "npm run build"
  },
  "userStories": [
    {
      "id": "US-001",
      "title": "[Story title]",
      "description": "As a [user], I want [feature] so that [benefit]",
      "acceptanceCriteria": [
        "Criterion 1",
        "Criterion 2",
        "Typecheck passes",
        "Lint passes"
      ],
      "priority": 1,
      "passes": false,
      "notes": "Relevant files: prisma/schema.prisma, src/app/api/tasks/route.ts"
    }
  ]
}
```

### The `qualityChecks` field

This is **new and critical**. It tells Ralph the exact commands to run, so each iteration doesn't have to guess. Only include checks that actually exist in the project:

```json
"qualityChecks": {
  "typecheck": "npm run typecheck",
  "lint": "npm run lint"
}
```

If a project has no typecheck, don't include it. If it uses `make check`, use that. Be exact.

### The `notes` field

Pre-populate with **file hints** from your codebase scan — relevant files the story will likely touch or extend:

```
"notes": "Relevant files: prisma/schema.prisma (Task model), src/components/TaskCard.tsx (extend with badge)"
```

This gives each Ralph iteration a head start instead of scanning the codebase from scratch.

---

## Story Size: The Number One Rule

**Each story must be completable in ONE Ralph iteration (one context window).**

Ralph spawns a fresh instance per iteration with no memory of previous work. If a story is too big, the LLM runs out of context before finishing and produces broken code.

### Right-sized stories:
- Add a database column and migration
- Add a UI component to an existing page
- Update a server action with new logic
- Add a filter dropdown to a list

### Too big (split these):
- "Build the entire dashboard" — Split into: schema, queries, UI components, filters
- "Add authentication" — Split into: schema, middleware, login UI, session handling
- "Refactor the API" — Split into one story per endpoint or pattern

**Rule of thumb:** If you cannot describe the change in 2-3 sentences, it is too big.

---

## Story Ordering: Dependencies First

Stories execute in priority order. Earlier stories must not depend on later ones.

**Correct order:**
1. Schema/database changes (migrations)
2. Server actions / backend logic
3. UI components that use the backend
4. Dashboard/summary views that aggregate data

**Wrong order:**
1. UI component (depends on schema that does not exist yet)
2. Schema change

---

## Acceptance Criteria: Must Be Verifiable

Each criterion must be something Ralph can CHECK, not something vague.

### Good criteria (verifiable):
- "Add `status` column to tasks table with default 'pending'"
- "Filter dropdown has options: All, Active, Completed"
- "Clicking delete shows confirmation dialog"

### Bad criteria (vague):
- "Works correctly"
- "User can do X easily"
- "Good UX"
- "Handles edge cases"

### Quality criteria — use what the project actually has

Append the quality checks detected in Step 1. Examples:

- Project has typecheck + lint → append `"Typecheck passes"`, `"Lint passes"`
- Project has only tests → append `"Tests pass"`
- Project has a build step → append `"Build passes"`

Do **not** hardcode "Typecheck passes" if the project has no typecheck.

### For stories that change UI, also include:
```
"Verify in browser using dev-browser skill"
```

---

## Conversion Rules

1. **Each user story becomes one JSON entry**
2. **IDs**: Sequential (US-001, US-002, etc.)
3. **Priority**: Based on dependency order, then document order
4. **All stories**: `passes: false`
5. **notes**: Pre-populate with relevant file paths from codebase scan
6. **branchName**: Derive from feature name, kebab-case, prefixed with `ralph/`
7. **qualityChecks**: Populated from detected project commands (Step 1)
8. **Quality criteria on stories**: Match what `qualityChecks` contains

---

## Splitting Large PRDs

If a PRD has big features, split them:

**Original:**
> "Add user notification system"

**Split into:**
1. US-001: Add notifications table to database
2. US-002: Create notification service for sending notifications
3. US-003: Add notification bell icon to header
4. US-004: Create notification dropdown panel
5. US-005: Add mark-as-read functionality
6. US-006: Add notification preferences page

Each is one focused change that can be completed and verified independently.

---

## Example

**Input PRD with Tech Context:**
```markdown
# PRD: Task Status Feature

## Tech Context
- **Stack:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **DB:** Prisma with PostgreSQL (`prisma/schema.prisma`)
- **UI:** shadcn/ui in `src/components/ui/`
- **Quality gates:** Typecheck (`tsc --noEmit`), Lint (`eslint`), Tests (`vitest`)
- **Relevant code:**
  - Task model: `prisma/schema.prisma`
  - Task list: `src/components/TaskList.tsx`
  - Task card: `src/components/TaskCard.tsx`
  - Badge: `src/components/ui/Badge.tsx`
  - API: `src/app/api/tasks/`

## User Stories
### US-001: Add status field to database ...
### US-002: Display status badge on task cards ...
### US-003: Add status toggle ...
### US-004: Filter tasks by status ...
```

**Output prd.json:**
```json
{
  "project": "TaskApp",
  "branchName": "ralph/task-status",
  "description": "Task Status Feature - Track task progress with status indicators",
  "qualityChecks": {
    "typecheck": "npx tsc --noEmit",
    "lint": "npm run lint",
    "test": "npx vitest run"
  },
  "userStories": [
    {
      "id": "US-001",
      "title": "Add status field to tasks table",
      "description": "As a developer, I need to store task status in the database.",
      "acceptanceCriteria": [
        "Add status column: 'pending' | 'in_progress' | 'done' (default 'pending')",
        "Generate and run migration successfully",
        "Typecheck passes",
        "Lint passes"
      ],
      "priority": 1,
      "passes": false,
      "notes": "Relevant files: prisma/schema.prisma (Task model)"
    },
    {
      "id": "US-002",
      "title": "Display status badge on task cards",
      "description": "As a user, I want to see task status at a glance.",
      "acceptanceCriteria": [
        "Each task card shows colored status badge",
        "Badge colors: gray=pending, blue=in_progress, green=done",
        "Typecheck passes",
        "Lint passes",
        "Verify in browser using dev-browser skill"
      ],
      "priority": 2,
      "passes": false,
      "notes": "Relevant files: src/components/TaskCard.tsx (extend), src/components/ui/Badge.tsx (reuse with color variants)"
    },
    {
      "id": "US-003",
      "title": "Add status toggle to task list rows",
      "description": "As a user, I want to change task status directly from the list.",
      "acceptanceCriteria": [
        "Each row has status dropdown or toggle",
        "Changing status saves immediately via PATCH /api/tasks/[id]",
        "UI updates without page refresh",
        "Typecheck passes",
        "Lint passes",
        "Verify in browser using dev-browser skill"
      ],
      "priority": 3,
      "passes": false,
      "notes": "Relevant files: src/components/TaskList.tsx, src/app/api/tasks/[id]/route.ts"
    },
    {
      "id": "US-004",
      "title": "Filter tasks by status",
      "description": "As a user, I want to filter the list to see only certain statuses.",
      "acceptanceCriteria": [
        "Filter dropdown: All | Pending | In Progress | Done",
        "Filter persists in URL params",
        "Typecheck passes",
        "Lint passes",
        "Tests pass",
        "Verify in browser using dev-browser skill"
      ],
      "priority": 4,
      "passes": false,
      "notes": "Relevant files: src/components/TaskList.tsx (add filter dropdown)"
    }
  ]
}
```

---

## Archiving Previous Runs

**Before writing a new prd.json, check if there is an existing one from a different feature:**

1. Read the current `prd.json` if it exists
2. Check if `branchName` differs from the new feature's branch name
3. If different AND `progress.txt` has content beyond the header:
   - Create archive folder: `archive/YYYY-MM-DD-feature-name/`
   - Copy current `prd.json` and `progress.txt` to archive
   - Reset `progress.txt` with fresh header

**The ralph.sh script handles this automatically** when you run it, but if you are manually updating prd.json between runs, archive first.

---

## Checklist Before Saving

Before writing prd.json, verify:

- [ ] Ran codebase reconnaissance or read PRD's Tech Context (Step 1)
- [ ] `qualityChecks` populated with exact commands from the project
- [ ] **Previous run archived** (if prd.json exists with different branchName, archive it first)
- [ ] Each story is completable in one iteration (small enough)
- [ ] Stories are ordered by dependency (schema → backend → UI)
- [ ] Story quality criteria match what `qualityChecks` contains (not hardcoded)
- [ ] UI stories have "Verify in browser using dev-browser skill" as criterion
- [ ] Acceptance criteria are verifiable (not vague)
- [ ] Story `notes` pre-populated with relevant file paths
- [ ] No story depends on a later story
