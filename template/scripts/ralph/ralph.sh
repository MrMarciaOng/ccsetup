#!/bin/bash
# Ralph Wiggum - Long-running AI agent loop
# Usage: ./ralph.sh [--tool claude|codex] [--model <model>] [max_iterations]
#   --tool claude -> runs instructions from CLAUDE.md with Claude Code
#   --tool codex  -> runs instructions from CODEX.md with Codex CLI

set -e

# Parse arguments
TOOL="claude"
MODEL=""
MAX_ITERATIONS=10

while [[ $# -gt 0 ]]; do
  case $1 in
    --tool)
      TOOL="$2"
      shift 2
      ;;
    --tool=*)
      TOOL="${1#*=}"
      shift
      ;;
    --model)
      MODEL="$2"
      shift 2
      ;;
    --model=*)
      MODEL="${1#*=}"
      shift
      ;;
    *)
      # Assume it's max_iterations if it's a number
      if [[ "$1" =~ ^[0-9]+$ ]]; then
        MAX_ITERATIONS="$1"
      fi
      shift
      ;;
  esac
done

# Validate tool choice
if [[ "$TOOL" != "claude" && "$TOOL" != "codex" ]]; then
  echo "Error: Invalid tool '$TOOL'. Must be 'claude' or 'codex'."
  exit 1
fi
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRD_FILE="$SCRIPT_DIR/prd.json"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"
ARCHIVE_DIR="$SCRIPT_DIR/archive"
LAST_BRANCH_FILE="$SCRIPT_DIR/.last-branch"
CLAUDE_PROMPT_FILE="$SCRIPT_DIR/CLAUDE.md"
CODEX_PROMPT_FILE="$SCRIPT_DIR/CODEX.md"

if ! command -v jq &>/dev/null; then
  echo "Error: jq is required for Ralph. Install jq and try again."
  exit 1
fi

if [[ "$TOOL" == "claude" ]]; then
  if ! command -v claude &>/dev/null; then
    echo "Error: claude CLI is not installed. Install Claude Code and try again."
    exit 1
  fi
else
  if ! command -v codex &>/dev/null; then
    echo "Error: codex CLI is not installed. Install it with: npm install -g @openai/codex"
    exit 1
  fi
fi

# Archive previous run if branch changed
if [ -f "$PRD_FILE" ] && [ -f "$LAST_BRANCH_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  LAST_BRANCH=$(cat "$LAST_BRANCH_FILE" 2>/dev/null || echo "")
  
  if [ -n "$CURRENT_BRANCH" ] && [ -n "$LAST_BRANCH" ] && [ "$CURRENT_BRANCH" != "$LAST_BRANCH" ]; then
    # Archive the previous run
    DATE=$(date +%Y-%m-%d)
    # Strip "ralph/" prefix from branch name for folder
    FOLDER_NAME=$(echo "$LAST_BRANCH" | sed 's|^ralph/||')
    ARCHIVE_FOLDER="$ARCHIVE_DIR/$DATE-$FOLDER_NAME"
    
    echo "Archiving previous run: $LAST_BRANCH"
    mkdir -p "$ARCHIVE_FOLDER"
    [ -f "$PRD_FILE" ] && cp "$PRD_FILE" "$ARCHIVE_FOLDER/"
    [ -f "$PROGRESS_FILE" ] && cp "$PROGRESS_FILE" "$ARCHIVE_FOLDER/"
    echo "   Archived to: $ARCHIVE_FOLDER"
    
    # Reset progress file for new run
    echo "# Ralph Progress Log" > "$PROGRESS_FILE"
    echo "Started: $(date)" >> "$PROGRESS_FILE"
    echo "---" >> "$PROGRESS_FILE"
  fi
fi

# Track current branch
if [ -f "$PRD_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  if [ -n "$CURRENT_BRANCH" ]; then
    echo "$CURRENT_BRANCH" > "$LAST_BRANCH_FILE"
  fi
fi

# Initialize progress file if it doesn't exist
if [ ! -f "$PROGRESS_FILE" ]; then
  echo "# Ralph Progress Log" > "$PROGRESS_FILE"
  echo "Started: $(date)" >> "$PROGRESS_FILE"
  echo "---" >> "$PROGRESS_FILE"
fi

MODEL_DISPLAY="${MODEL:-default}"
PROMPT_FILE="$CLAUDE_PROMPT_FILE"
if [[ "$TOOL" == "codex" ]]; then
  PROMPT_FILE="$CODEX_PROMPT_FILE"
fi

echo "Starting Ralph - Tool: $TOOL - Model: $MODEL_DISPLAY - Max iterations: $MAX_ITERATIONS"
echo "Instruction file: $(basename "$PROMPT_FILE")"

for i in $(seq 1 $MAX_ITERATIONS); do
  echo ""
  echo "==============================================================="
  echo "  Ralph Iteration $i of $MAX_ITERATIONS ($TOOL${MODEL:+ - $MODEL})"
  echo "==============================================================="

  # Run the selected tool with the ralph prompt
  if [[ "$TOOL" == "claude" ]]; then
    # Claude Code: use --dangerously-skip-permissions for autonomous operation, --print for output
    MODEL_FLAG=""
    if [[ -n "$MODEL" ]]; then
      MODEL_FLAG="--model $MODEL"
    fi
    OUTPUT=$(claude $MODEL_FLAG --dangerously-skip-permissions --chrome --print < "$CLAUDE_PROMPT_FILE" 2>&1 | tee /dev/stderr) || true
  else
    CMD_ARGS=()
    if [[ -n "$MODEL" ]]; then
      CMD_ARGS+=(--model "$MODEL")
    fi
    OUTPUT=$(codex exec ${CMD_ARGS[@]+"${CMD_ARGS[@]}"} "$(<"$CODEX_PROMPT_FILE")" 2>&1 | tee /dev/stderr) || true
  fi
  
  # Check for completion signal
  if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    echo ""
    echo "Ralph completed all tasks!"
    echo "Completed at iteration $i of $MAX_ITERATIONS"
    exit 0
  fi
  
  echo "Iteration $i complete. Continuing..."
  sleep 2
done

echo ""
echo "Ralph reached max iterations ($MAX_ITERATIONS) without completing all tasks."
echo "Check $PROGRESS_FILE for status."
exit 1
