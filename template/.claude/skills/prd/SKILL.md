---
name: prd
description: "Generate a Product Requirements Document (PRD) for a new feature. Use when planning a feature, starting a new project, or when asked to create a PRD. Triggers on: create a prd, write prd for, plan this feature, requirements for, spec out."
---

# PRD Generator

Create detailed Product Requirements Documents that are clear, actionable, and grounded in the actual codebase.

---

## The Job

1. **Scan the codebase** to understand tech stack, architecture, and existing patterns
2. Receive a feature description from the user
3. Ask 3-5 **codebase-informed** clarifying questions (with lettered options)
4. Generate a structured PRD that references real files, components, and patterns
5. Save to `tasks/prd-[feature-name].md`

**Important:** Do NOT start implementing. Just create the PRD.

---

## Step 1: Codebase Reconnaissance

Before asking the user anything, silently scan the project using Claude Code tools:

### Detect Tech Stack
Use Glob and Read to find and inspect:
- `package.json`, `tsconfig.json`, `next.config.*` (Node/TypeScript/Next.js)
- `requirements.txt`, `pyproject.toml`, `setup.py` (Python)
- `go.mod` (Go)
- `Cargo.toml` (Rust)
- `Gemfile` (Ruby)
- `composer.json` (PHP)

Record: language, framework, package manager, key dependencies.

### Detect Quality Checks
From the config files found above, identify:
- **Typecheck**: `tsconfig.json` exists → "Typecheck passes"
- **Linter**: `eslint`, `biome`, `ruff`, `golangci-lint` in deps or config → "Lint passes"
- **Test framework**: `jest`, `vitest`, `pytest`, `go test` → "Tests pass"
- **Build**: check `scripts` in package.json for `build`, `check`, etc.

These become the **default quality criteria** appended to every user story.

### Scan Architecture
Use Glob to map the project structure:
- `src/**/*.{ts,tsx,js,jsx,py,go,rs}` — source file layout
- `**/schema.prisma`, `**/migrations/**`, `**/models/**` — database layer
- `**/api/**`, `**/routes/**`, `**/app/**/route.*` — API endpoints
- `**/components/**` — UI components
- `**/hooks/**`, `**/utils/**`, `**/lib/**` — shared utilities

### Read Project Context
- Read `CLAUDE.md` (root and any nested) for project instructions and conventions
- Read existing PRDs in `tasks/prd-*.md` for format consistency
- Read `docs/ROADMAP.md` if it exists for current priorities

### Build Context Summary
Compile findings into an internal context block (do not show to user):
```
Tech: [framework] + [language] + [key deps]
Quality: [typecheck] [lint] [test] [build commands]
DB: [ORM/schema location]
API: [routing pattern, e.g., "Next.js App Router at app/api/"]
UI: [component library, e.g., "shadcn/ui in src/components/ui/"]
Existing patterns: [key files and conventions discovered]
```

---

## Step 2: Clarifying Questions

Ask only critical questions where the initial prompt is ambiguous. **Tailor questions to what you found in the codebase** — don't ask about tech stack if you already know it.

Focus on:

- **Problem/Goal:** What problem does this solve?
- **Core Functionality:** What are the key actions?
- **Scope/Boundaries:** What should it NOT do?
- **Success Criteria:** How do we know it's done?

### Format Questions Like This:

```
1. What is the primary goal of this feature?
   A. Improve user onboarding experience
   B. Increase user retention
   C. Reduce support burden
   D. Other: [please specify]

2. Who is the target user?
   A. New users only
   B. Existing users only
   C. All users
   D. Admin users only

3. What is the scope?
   A. Minimal viable version
   B. Full-featured implementation
   C. Just the backend/API
   D. Just the UI
```

This lets users respond with "1A, 2C, 3B" for quick iteration.

### Codebase-Informed Questions

If your scan revealed relevant context, weave it into the questions:

- Found a database schema → "I see you have a `users` table with [fields]. Should this feature extend that table or create a new one?"
- Found existing components → "You already have a `DataTable` component in `src/components/ui/`. Should this feature reuse it?"
- Found API patterns → "Your API routes follow [pattern]. Should this feature add new routes under the same structure?"

Skip questions the codebase already answers. If the tech stack is clear, don't ask "What framework are you using?"

---

## Step 3: PRD Structure

Generate the PRD with these sections:

### 1. Introduction/Overview
Brief description of the feature and the problem it solves.

### 2. Tech Context
Auto-generated from your codebase scan. Include:
- **Stack:** Language, framework, key dependencies
- **Quality gates:** Which checks apply (typecheck, lint, test, build)
- **Relevant existing code:** File paths and patterns the feature should build on

This section helps implementers (human or AI) understand the codebase without re-scanning.

### 3. Goals
Specific, measurable objectives (bullet list).

### 4. User Stories
Each story needs:
- **Title:** Short descriptive name
- **Description:** "As a [user], I want [feature] so that [benefit]"
- **Acceptance Criteria:** Verifiable checklist of what "done" means

Each story should be small enough to implement in one focused session.

**Format:**
```markdown
### US-001: [Title]
**Description:** As a [user], I want [feature] so that [benefit].

**Acceptance Criteria:**
- [ ] Specific verifiable criterion
- [ ] Another criterion
- [ ] {auto-detected quality checks from Step 1}
- [ ] **[UI stories only]** Verify in browser using dev-browser skill
```

**Important:**
- Acceptance criteria must be verifiable, not vague. "Works correctly" is bad. "Button shows confirmation dialog before deleting" is good.
- **For any story with UI changes:** Always include "Verify in browser using dev-browser skill" as acceptance criteria.
- **Quality criteria are auto-appended** based on Step 1 detection. Do not hardcode "Typecheck passes" — use whatever the project actually has.
- **Reference real file paths** when a story modifies or extends existing code (e.g., "Add column to schema in `prisma/schema.prisma`").

### 5. Functional Requirements
Numbered list of specific functionalities:
- "FR-1: The system must allow users to..."
- "FR-2: When a user clicks X, the system must..."

Be explicit and unambiguous.

### 6. Non-Goals (Out of Scope)
What this feature will NOT include. Critical for managing scope.

### 7. Design Considerations (Optional)
- UI/UX requirements
- Link to mockups if available
- **Existing components to reuse** (reference actual paths found in scan, e.g., "`src/components/ui/DataTable.tsx`")

### 8. Technical Considerations
- Known constraints or dependencies
- Integration points with existing systems (reference actual files/modules)
- Performance requirements
- **Dependency order:** Which stories must be completed before others (schema → backend → UI)

### 9. Success Metrics
How will success be measured?
- "Reduce time to complete X by 50%"
- "Increase conversion rate by 10%"

### 10. Open Questions
Remaining questions or areas needing clarification.

---

## Writing for AI Agents and Junior Developers

The PRD reader may be a junior developer or an autonomous AI agent (like Ralph). Therefore:

- Be explicit and unambiguous
- Reference actual file paths, not abstract descriptions
- Provide enough detail to understand purpose and core logic
- Number requirements for easy reference
- Use concrete examples where helpful
- Include the quality gates the project actually uses, not generic ones

---

## Output

- **Format:** Markdown (`.md`)
- **Location:** `tasks/`
- **Filename:** `prd-[feature-name].md` (kebab-case)

---

## Example PRD

```markdown
# PRD: Task Priority System

## Introduction

Add priority levels to tasks so users can focus on what matters most. Tasks can be marked as high, medium, or low priority, with visual indicators and filtering to help users manage their workload effectively.

## Tech Context

- **Stack:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **DB:** Prisma with PostgreSQL (`prisma/schema.prisma`)
- **UI:** shadcn/ui components in `src/components/ui/`
- **Quality gates:** Typecheck (`tsc --noEmit`), Lint (`eslint`), Tests (`vitest`)
- **Relevant code:**
  - Task model: `prisma/schema.prisma` (Task table)
  - Task list component: `src/components/TaskList.tsx`
  - Task card component: `src/components/TaskCard.tsx`
  - Existing badge component: `src/components/ui/Badge.tsx`
  - API routes: `src/app/api/tasks/`

## Goals

- Allow assigning priority (high/medium/low) to any task
- Provide clear visual differentiation between priority levels
- Enable filtering and sorting by priority
- Default new tasks to medium priority

## User Stories

### US-001: Add priority field to database
**Description:** As a developer, I need to store task priority so it persists across sessions.

**Acceptance Criteria:**
- [ ] Add `priority` enum ('high' | 'medium' | 'low', default 'medium') to Task model in `prisma/schema.prisma`
- [ ] Generate and run migration successfully
- [ ] Typecheck passes
- [ ] Lint passes

### US-002: Display priority indicator on task cards
**Description:** As a user, I want to see task priority at a glance so I know what needs attention first.

**Acceptance Criteria:**
- [ ] Extend `src/components/TaskCard.tsx` to show priority using existing `Badge` component from `src/components/ui/Badge.tsx`
- [ ] Badge colors: red=high, yellow=medium, gray=low
- [ ] Priority visible without hovering or clicking
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: Add priority selector to task edit
**Description:** As a user, I want to change a task's priority when editing it.

**Acceptance Criteria:**
- [ ] Priority dropdown in task edit modal using shadcn `Select` component
- [ ] Shows current priority as selected
- [ ] Saves via existing PATCH `/api/tasks/[id]` route
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Verify in browser using dev-browser skill

### US-004: Filter tasks by priority
**Description:** As a user, I want to filter the task list to see only high-priority items when I'm focused.

**Acceptance Criteria:**
- [ ] Add filter dropdown to `src/components/TaskList.tsx` with options: All | High | Medium | Low
- [ ] Filter persists in URL search params
- [ ] Empty state message when no tasks match filter
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Tests pass
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: Add `priority` field to Task model in `prisma/schema.prisma` ('high' | 'medium' | 'low', default 'medium')
- FR-2: Display colored priority badge on each task card via `Badge` component
- FR-3: Include priority selector in task edit modal using shadcn `Select`
- FR-4: Add priority filter dropdown to `TaskList` header
- FR-5: Sort by priority within each status column (high → medium → low)

## Non-Goals

- No priority-based notifications or reminders
- No automatic priority assignment based on due date
- No priority inheritance for subtasks

## Design Considerations

- Reuse existing `src/components/ui/Badge.tsx` with color variants
- Use shadcn `Select` for the filter and edit dropdowns (already in project deps)

## Technical Considerations

- Filter state managed via URL search params (Next.js `useSearchParams`)
- Priority stored in database, not computed
- **Dependency order:** US-001 (schema) → US-002 (display) → US-003 (edit) → US-004 (filter)

## Success Metrics

- Users can change priority in under 2 clicks
- High-priority tasks immediately visible at top of lists
- No regression in task list performance

## Open Questions

- Should priority affect task ordering within a column?
- Should we add keyboard shortcuts for priority changes?
```

---

## Checklist

Before saving the PRD:

- [ ] Ran codebase reconnaissance (Step 1)
- [ ] Tech Context section reflects actual project stack and quality gates
- [ ] Asked codebase-informed clarifying questions with lettered options
- [ ] Incorporated user's answers
- [ ] User stories reference real file paths where applicable
- [ ] User stories are small and specific (one focused session each)
- [ ] Quality criteria match what the project actually uses (not hardcoded)
- [ ] Functional requirements are numbered and unambiguous
- [ ] Non-goals section defines clear boundaries
- [ ] Saved to `tasks/prd-[feature-name].md`
