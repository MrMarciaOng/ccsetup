#!/bin/bash
# codex-review.sh — Get an architectural review of a plan file from Codex CLI
# Usage: codex-review.sh <plan-file-or--> [--model <model>]
#
# Exit codes:
#   0 = success
#   1 = codex CLI not installed
#   2 = auth/API error
#   3 = timeout

set -euo pipefail

PLAN_FILE=""
MODEL="${CODEX_REVIEW_MODEL:-}"
TIMEOUT=120

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

# Read plan content
if [[ "$PLAN_FILE" == "-" ]]; then
  PLAN_CONTENT=$(cat)
elif [[ -n "$PLAN_FILE" && -f "$PLAN_FILE" ]]; then
  PLAN_CONTENT=$(cat "$PLAN_FILE")
else
  echo "Error: No plan file provided or file not found: $PLAN_FILE" >&2
  echo "Usage: codex-review.sh <plan-file-or--> [--model <model>]" >&2
  exit 1
fi

MODEL_FLAG=""
if [[ -n "$MODEL" ]]; then
  MODEL_FLAG="--model $MODEL"
fi

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

# Run codex exec with timeout (if available)
# Temporarily disable exit-on-error to capture the actual exit code before
# checking it. Using "if ! OUTPUT=$(cmd)" sets $? to 0 inside the then-block
# (the negated result), making timeout detection (exit 124) impossible.
set +e
if [[ -n "$TIMEOUT_CMD" ]]; then
  OUTPUT=$($TIMEOUT_CMD "${TIMEOUT}s" codex exec $MODEL_FLAG "$REVIEW_PROMPT" 2>&1)
else
  OUTPUT=$(codex exec $MODEL_FLAG "$REVIEW_PROMPT" 2>&1)
fi
EXIT_CODE=$?
set -e

if [[ $EXIT_CODE -ne 0 ]]; then
  if [[ $EXIT_CODE -eq 124 ]]; then
    echo "Error: Codex review timed out after ${TIMEOUT}s" >&2
    exit 3
  fi
  # Check for auth errors in the output
  if echo "$OUTPUT" | grep -qi "auth\|unauthorized\|api.key\|invalid.*key"; then
    echo "Error: Codex authentication failed. Check your API key configuration." >&2
    echo "$OUTPUT" >&2
    exit 2
  fi
  echo "Error: Codex review failed" >&2
  echo "$OUTPUT" >&2
  exit 2
fi

echo "$OUTPUT"
