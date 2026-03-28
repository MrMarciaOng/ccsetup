#!/bin/bash
# codex-review.sh — Review plans, implementations, or code changes via Codex CLI
# Usage: codex-review.sh [plan-file-or--] [--model <model>]
#   No arguments: reviews git changes (code review)
#   With plan file: reviews plan, or plan+implementation if git changes exist
#
# Exit codes:
#   0 = success
#   1 = codex CLI not installed / nothing to review
#   2 = auth/API error
#   3 = timeout

set -euo pipefail

PLAN_FILE=""
PLAN_CONTENT=""
DIFF_CONTENT=""
MODEL="${CODEX_REVIEW_MODEL:-}"
TIMEOUT=120
MAX_DIFF_CHARS=50000

if command -v timeout &>/dev/null; then
  TIMEOUT_CMD="timeout"
elif command -v gtimeout &>/dev/null; then
  TIMEOUT_CMD="gtimeout"
else
  TIMEOUT_CMD=""
fi

while [[ $# -gt 0 ]]; do
  case $1 in
    --model)
      MODEL="$2"
      shift 2
      ;;
    --model=*)
      MODEL="${1#*=}"
      shift
      ;;
    -)
      PLAN_FILE="-"
      shift
      ;;
    *)
      if [[ -z "$PLAN_FILE" ]]; then
        PLAN_FILE="$1"
      fi
      shift
      ;;
  esac
done

# Check prerequisites
if ! command -v codex &>/dev/null; then
  echo "Error: codex CLI is not installed. Install it with: npm install -g @openai/codex" >&2
  exit 1
fi

# Read plan content (optional — only when a plan file is provided)
if [[ "$PLAN_FILE" == "-" ]]; then
  PLAN_CONTENT=$(cat)
elif [[ -n "$PLAN_FILE" && -f "$PLAN_FILE" ]]; then
  PLAN_CONTENT=$(cat "$PLAN_FILE")
elif [[ -n "$PLAN_FILE" ]]; then
  echo "Error: Plan file not found: $PLAN_FILE" >&2
  exit 1
fi

# Gather git diff (silently skips if git unavailable or not in a repo)
gather_git_diff() {
  if ! command -v git &>/dev/null; then return; fi
  if ! git rev-parse --is-inside-work-tree &>/dev/null 2>&1; then return; fi

  DIFF_CONTENT=$(git diff HEAD 2>/dev/null || true)

  if [[ -z "$DIFF_CONTENT" ]]; then
    DIFF_CONTENT=$(git diff HEAD~1..HEAD 2>/dev/null || true)
  fi

  # Fallback for initial commit (no HEAD yet) or staged-only changes
  if [[ -z "$DIFF_CONTENT" ]]; then
    DIFF_CONTENT=$(git diff --cached 2>/dev/null || true)
  fi

  if [[ -n "$DIFF_CONTENT" && ${#DIFF_CONTENT} -gt $MAX_DIFF_CHARS ]]; then
    DIFF_CONTENT="${DIFF_CONTENT:0:$MAX_DIFF_CHARS}

[... diff truncated at ${MAX_DIFF_CHARS} characters ...]"
  fi
}

gather_git_diff

# Must have at least a plan or git changes to review
if [[ -z "$PLAN_CONTENT" && -z "$DIFF_CONTENT" ]]; then
  echo "Error: No plan file or git changes found. Nothing to review." >&2
  echo "Usage: codex-review.sh [plan-file-or--] [--model <model>]" >&2
  exit 1
fi

CMD_ARGS=()
if [[ -n "$MODEL" ]]; then
  CMD_ARGS+=(--model "$MODEL")
fi

# Build prompt based on available inputs
if [[ -n "$PLAN_CONTENT" && -n "$DIFF_CONTENT" ]]; then
  # Implementation review: validate code changes against the plan
  REVIEW_PROMPT="You are a senior architect reviewing an implementation against its plan. Validate that the code changes correctly fulfill the plan requirements.

## Plan

$PLAN_CONTENT

---

## Implementation (git diff)

$DIFF_CONTENT

---

Provide a structured review covering:

## Plan Compliance
- Which plan requirements are correctly implemented?
- Which plan requirements are missing or incomplete?
- Any divergence from the planned approach?

## Acceptance Criteria
- For each acceptance criterion in the plan, is it met by the implementation?
- List any unmet criteria explicitly

## Code Quality
- Are there bugs or logic errors in the implementation?
- Security concerns in the changed code?
- Performance issues?

## Suggestions
- Specific issues to fix before merging
- Missing tests or validation
- Improvements to better match the plan

Be direct and specific. Reference exact file paths and line ranges from the diff."

elif [[ -n "$PLAN_CONTENT" ]]; then
  # Plan review: architectural review of the plan itself
  REVIEW_PROMPT="You are a senior architect reviewing this plan. Provide a structured review covering:

## Architecture Review
- Are the technical choices sound?
- Are there simpler alternatives?
- Any missing dependencies or integration concerns?

## Risk Assessment
- What could go wrong?
- What edge cases are unhandled?
- Any security or performance concerns?

## Suggestions
- Specific improvements with rationale
- Missing acceptance criteria
- Implementation order concerns

Be direct and specific. Reference exact sections of the plan.

---

Plan to review:

$PLAN_CONTENT"

else
  # Code review: standalone review of git changes
  REVIEW_PROMPT="You are a senior engineer performing a code review. Review the following code changes for quality, correctness, and best practices.

## Code Changes (git diff)

$DIFF_CONTENT

---

Provide a structured review covering:

## Bugs and Correctness
- Logic errors or incorrect behavior
- Missing null/error handling
- Off-by-one errors or boundary conditions

## Security
- Injection vulnerabilities
- Exposed secrets or credentials
- Missing input validation

## Performance
- Unnecessary computations or allocations
- Inefficient patterns
- Missing caching opportunities

## Code Quality
- Naming and readability
- Adherence to existing code conventions
- Dead code or unnecessary complexity

## Suggestions
- Specific improvements with rationale
- Missing tests
- Documentation gaps

Be direct and specific. Reference exact file paths and line ranges from the diff."
fi

# Run codex exec with timeout (if available)
# Temporarily disable exit-on-error to capture the actual exit code before
# checking it. Using "if ! OUTPUT=$(cmd)" sets $? to 0 inside the then-block
# (the negated result), making timeout detection (exit 124) impossible.
set +e
if [[ -n "$TIMEOUT_CMD" ]]; then
  OUTPUT=$($TIMEOUT_CMD "${TIMEOUT}s" codex exec ${CMD_ARGS[@]+"${CMD_ARGS[@]}"} "$REVIEW_PROMPT" 2>&1)
else
  OUTPUT=$(codex exec ${CMD_ARGS[@]+"${CMD_ARGS[@]}"} "$REVIEW_PROMPT" 2>&1)
fi
EXIT_CODE=$?
set -e

if [[ $EXIT_CODE -ne 0 ]]; then
  if [[ $EXIT_CODE -eq 124 ]]; then
    echo "Error: Codex review timed out after ${TIMEOUT}s. Try a shorter plan or increase TIMEOUT." >&2
    exit 3
  fi

  if echo "$OUTPUT" | grep -qi "login\|log in\|sign in\|authenticate first"; then
    echo "Error: Codex CLI requires login. Run 'codex login' first." >&2
    exit 2
  fi

  if echo "$OUTPUT" | grep -qi "auth\|unauthorized\|api.key\|invalid.*key\|forbidden\|permission denied"; then
    echo "Error: Codex authentication failed. Check your OpenAI API key." >&2
    echo "$OUTPUT" >&2
    exit 2
  fi

  if echo "$OUTPUT" | grep -qi "rate.limit\|too many requests\|429\|quota\|exceeded.*limit"; then
    echo "Error: Rate limited by OpenAI API. Wait a moment and try again." >&2
    echo "$OUTPUT" >&2
    exit 2
  fi

  if echo "$OUTPUT" | grep -qi "network\|connect\|ECONNREFUSED\|ENOTFOUND\|DNS\|resolve\|unreachable\|timed out"; then
    echo "Error: Network error. Check your internet connection." >&2
    echo "$OUTPUT" >&2
    exit 2
  fi

  if echo "$OUTPUT" | grep -qi "model.*not found\|does not exist\|invalid.*model\|unknown model"; then
    echo "Error: Invalid model '${MODEL:-default}'. Check available models with 'codex --help'." >&2
    echo "$OUTPUT" >&2
    exit 2
  fi

  echo "Error: Codex review failed (exit code $EXIT_CODE)" >&2
  echo "$OUTPUT" >&2
  exit 2
fi

echo "$OUTPUT"
