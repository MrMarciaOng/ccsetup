---
name: codex-review
description: "Get a second-opinion architectural review of a plan from Codex CLI. Runs up to 3 feedback iterations. Triggers on: codex review, second opinion, review this plan, codex feedback."
---

# Codex Review — Second-Opinion Plan Review

Get an architectural review of your most recent plan from OpenAI's Codex CLI. Iterates up to 3 times, refining the plan based on feedback.

---

## The Job

1. Find the most recently modified plan file (or accept a path argument)
2. Read the plan content
3. Call `scripts/codex-review/codex-review.sh` to get a Codex review
4. Present the feedback in a structured format
5. Update the plan based on feedback, then re-review
6. Repeat for up to 3 iterations (or until the user is satisfied)

**Important:** This skill requires the `codex` CLI to be installed (`npm install -g @openai/codex`) and an OpenAI API key configured.

---

## Step 1: Find the Plan

If the user provides a path argument, use that file.

Otherwise, find the most recently modified plan file:
1. Use Glob to search for `plans/**/*.md` and `*plan*.md`
2. Sort by modification time (most recent first)
3. Use the most recent file

If no plan file is found, ask the user which file to review.

---

## Step 2: Review Loop (max 3 iterations)

For each iteration:

### 2a. Get Review

Run the review script using the Bash tool:

```bash
bash scripts/codex-review/codex-review.sh <plan-file-path>
```

To override the model, set `CODEX_REVIEW_MODEL` env var or pass `--model`:

```bash
bash scripts/codex-review/codex-review.sh <plan-file-path> --model o3-mini
```

### 2b. Present Feedback

Show the user the review output with an iteration counter:

```
## Codex Review (Iteration 1/3)

[review output]

---
Would you like me to update the plan based on this feedback and run another review?
```

### 2c. Update Plan

If the user wants to continue:
1. Read the current plan content
2. Apply the suggested improvements using the Edit tool
3. Increment the iteration counter
4. Go to 2a for the next review

If the user is satisfied, stop iterating.

---

## Step 3: Final Summary

After all iterations (or when the user stops):

```
## Review Complete (3/3 iterations)

### Changes Made
- [bullet list of improvements applied]

### Remaining Suggestions (not applied)
- [any suggestions the user chose to skip]
```

---

## Error Handling

Handle script exit codes:
- **Exit 1** — codex CLI not installed. Tell the user: "Install Codex CLI with `npm install -g @openai/codex`"
- **Exit 2** — Auth error. Tell the user: "Check your OpenAI API key configuration"
- **Exit 3** — Timeout. Tell the user: "Review timed out. Try a shorter plan or run again"

---

## Checklist

Before running:
- [ ] Plan file exists and has content
- [ ] `codex` CLI is available (the script checks this)
- [ ] Present iteration count clearly (1/3, 2/3, 3/3)
- [ ] After each iteration, ask user before continuing
- [ ] Stop after 3 iterations or user satisfaction
