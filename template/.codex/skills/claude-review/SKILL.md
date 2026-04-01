---
name: claude-review
description: "Get a second-opinion review from Claude Code. Auto-detects: plan review, implementation review (plan + code changes), or code review (just changes). Runs up to 3 feedback iterations. Triggers on: claude review, second opinion, review this plan, review my code, review implementation, validate changes, claude feedback, code review."
---

# Claude Review — Plan, Implementation, and Code Review

Get a review from Claude Code. The script auto-detects what to review based on context:

- **Plan review** — when a plan file is provided and no git changes exist
- **Implementation review** — when a plan file is provided and git changes exist (validates code against the plan)
- **Code review** — when no plan file is provided but git changes exist

Iterates up to 3 times, refining based on feedback.

---

## The Job

1. Determine what to review based on user intent and context
2. Find a plan file if needed (or skip for pure code review)
3. Call the review script
4. Present feedback, iterate up to 3 times

**Important:** This skill requires the `claude` CLI to be installed and authenticated.

---

## Step 1: Determine Review Type

Based on user intent:
- User says "review this plan", "second opinion" -> find the plan file, pass it to the script
- User says "review my implementation", "validate changes", "does this match the plan" -> **find the plan file and pass it to the script** (the script auto-includes git diff when changes exist, producing an implementation review)
- User says "review my code", "code review" -> no plan file needed, run the script with no arguments

**IMPORTANT: For implementation reviews, you MUST pass the plan file path as an argument.** The script uses it to compare the plan against the git diff. Without the plan file, you get a standalone code review instead.

If ambiguous, check:
1. Is there a recent plan file in `plans/` or `*plan*.md`?
2. Are there git changes (`git diff HEAD`)?
3. If a plan file exists and git changes exist, pass the plan file — the script auto-detects implementation review mode
4. If unsure, ask the user

---

## Step 2: Find the Plan (if needed)

Skip this step for pure code reviews (no plan context).

If the user provides a path argument, use that file.

Otherwise, find the most recently modified plan file:
1. Use Glob to search for `plans/**/*.md` and `*plan*.md`
2. Sort by modification time (most recent first)
3. Use the most recent file

If no plan file is found and one is needed, ask the user which file to review.

---

## Step 3: Review Loop (max 3 iterations)

For each iteration:

### 3a. Get Review

Run the review script using the Bash tool:

```bash
# With a plan file (plan review or implementation review — auto-detected)
bash scripts/claude-review/claude-review.sh <plan-file-path>

# Without a plan file (code review of git changes)
bash scripts/claude-review/claude-review.sh

# Override model
bash scripts/claude-review/claude-review.sh [plan-file] --model sonnet
```

### 3b. Present Feedback

Show the user the review output with an iteration counter:

```
## Claude Review (Iteration 1/3)

[review output]

---
Would you like me to update the [plan/code] based on this feedback and run another review?
```

### 3c. Apply Changes

If the user wants to continue:

**For plan reviews:** Edit the plan file based on feedback, then re-review.

**For implementation/code reviews:** Fix the code based on feedback, then re-review (the git diff changes between iterations as code is updated).

If the user is satisfied, stop iterating.

---

## Step 4: Final Summary

After all iterations (or when the user stops):

```
## Review Complete (N/3 iterations)

### Changes Made
- [bullet list of improvements applied]

### Remaining Suggestions (not applied)
- [any suggestions the user chose to skip]
```

---

## Error Handling

Handle script exit codes:
- **Exit 1** — claude CLI not installed: "Install Claude Code and ensure `claude` is available on PATH"
- **Exit 1** — nothing to review: "No plan file or git changes found. Provide a plan file or make some code changes first."
- **Exit 2** — Auth error: "Check your Claude authentication configuration"
- **Exit 3** — Timeout: "Review timed out. Try a shorter plan or run again"

---

## Checklist

Before running:
- [ ] If reviewing a plan: plan file exists and has content
- [ ] If reviewing code: there are git changes to review
- [ ] `claude` CLI is available (the script checks this)
- [ ] Present iteration count clearly (1/3, 2/3, 3/3)
- [ ] After each iteration, ask user before continuing
- [ ] Stop after 3 iterations or user satisfaction
