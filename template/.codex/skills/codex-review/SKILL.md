---
name: codex-review
description: "Get a second-opinion review from Codex CLI. Auto-detects: plan review, implementation review (plan + code changes), or code review (just changes). Runs up to 3 feedback iterations. Triggers on: codex review, second opinion, review this plan, review my code, review implementation, validate changes, codex feedback, code review."
---

# Codex Review — Plan, Implementation, and Code Review

Get a review from OpenAI's Codex CLI. The script auto-detects what to review based on context:

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

**Important:** This skill requires the `codex` CLI to be installed (`npm install -g @openai/codex`) and an OpenAI API key configured.

---

## Step 1: Determine Review Type

Based on user intent:
- User says "review this plan", "second opinion" → find the plan file, pass it to the script
- User says "review my implementation", "validate changes", "does this match the plan" → **find the plan file and pass it to the script** (the script auto-includes git diff when changes exist, producing an implementation review)
- User says "review my code", "code review" → no plan file needed, run the script with no arguments

**Important:** For implementation reviews, you MUST pass the plan file path as an argument. The script uses it to compare the plan against the git diff. Without the plan file, you get a standalone code review instead.

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
bash scripts/codex-review/codex-review.sh <plan-file-path>

# Without a plan file (code review of git changes)
bash scripts/codex-review/codex-review.sh

# Override model
bash scripts/codex-review/codex-review.sh [plan-file] --model o3-mini
```

### 3b. Present Feedback

Show the user the review output with an iteration counter:

```
## Codex Review (Iteration 1/3)

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
- **Exit 1** — codex CLI not installed: "Install Codex CLI with `npm install -g @openai/codex`"
- **Exit 1** — nothing to review: "No plan file or git changes found. Provide a plan file or make some code changes first."
- **Exit 2** — Auth error: "Check your OpenAI API key configuration"
- **Exit 3** — Timeout: "Review timed out. Try a shorter plan or run again"

---

## Checklist

Before running:
- [ ] If reviewing a plan: plan file exists and has content
- [ ] If reviewing code: there are git changes to review
- [ ] `codex` CLI is available (the script checks this)
- [ ] Present iteration count clearly (1/3, 2/3, 3/3)
- [ ] After each iteration, ask user before continuing
- [ ] Stop after 3 iterations or user satisfaction
