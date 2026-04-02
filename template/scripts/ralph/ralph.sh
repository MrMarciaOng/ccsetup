#!/bin/bash
# Ralph Wiggum - Long-running AI agent loop
# Usage: ./ralph.sh [--tool claude|codex] [--model <model>] [max_iterations]
#   --tool claude -> runs instructions from CLAUDE.md with Claude Code
#   --tool codex  -> runs instructions from CODEX.md with Codex CLI

set -e
set -o pipefail

sanitize_script_output() {
  perl -pe 's/\r/\n/g'
}

append_rendered_output() {
  local text="$1"

  if [[ -n "${RENDERED_OUTPUT_FILE:-}" ]]; then
    printf '%s' "$text" >> "$RENDERED_OUTPUT_FILE"
  fi
}

format_claude_stream_line() {
  local line="$1"
  local text=""
  local tool_name=""
  local event_type=""

  text=$(printf '%s\n' "$line" | jq -r '
    if .delta?.text? then .delta.text
    elif .content_block?.text? then .content_block.text
    elif .message?.content? then [.message.content[]? | select(.type? == "text") | .text] | join("")
    elif .content? then [.content[]? | select(.type? == "text") | .text] | join("")
    else empty end
  ' 2>/dev/null)

  if [[ -n "$text" ]]; then
    append_rendered_output "$text"
    printf '%s' "$text"
    return
  fi

  event_type=$(printf '%s\n' "$line" | jq -r '.type? // empty' 2>/dev/null)
  tool_name=$(printf '%s\n' "$line" | jq -r '.content_block?.name? // .delta?.name? // .name? // empty' 2>/dev/null)

  case "$event_type" in
    content_block_start)
      if [[ -n "$tool_name" ]]; then
        append_rendered_output "[claude] tool: $tool_name"$'\n'
        echo "[claude] tool: $tool_name"
      fi
      ;;
    message_stop)
      append_rendered_output $'\n'
      echo ""
      ;;
    *)
      ;;
  esac
}

format_codex_stream_line() {
  local line="$1"
  local text=""
  local event_type=""
  local exec_cmd=""

  text=$(printf '%s\n' "$line" | jq -r '
    if .delta? and (.delta | type == "string") then .delta
    elif .message? and (.message | type == "string") then .message
    elif .content? and (.content | type == "string") then .content
    elif .text? and (.text | type == "string") then .text
    elif .last_agent_message? and (.last_agent_message | type == "string") then .last_agent_message
    else empty end
  ' 2>/dev/null)

  if [[ -n "$text" ]]; then
    append_rendered_output "$text"
    printf '%s' "$text"
    return
  fi

  event_type=$(printf '%s\n' "$line" | jq -r '.event? // .type? // empty' 2>/dev/null)
  exec_cmd=$(printf '%s\n' "$line" | jq -r '.command? // .cmd? // empty' 2>/dev/null)

  case "$event_type" in
    exec_command_begin|exec_command)
      if [[ -n "$exec_cmd" ]]; then
        append_rendered_output "[codex] command: $exec_cmd"$'\n'
        echo "[codex] command: $exec_cmd"
      fi
      ;;
    task_complete|completed)
      append_rendered_output $'\n'
      echo ""
      ;;
    *)
      ;;
  esac
}

run_native_stream() {
  local tool="$1"
  local output_file="$2"
  local prompt_file="$3"
  shift 3
  local cmd=("$@")

  : > "$output_file"

  if [[ "$tool" == "claude" ]]; then
    "${cmd[@]}" < "$prompt_file" 2>&1 | while IFS= read -r line || [[ -n "$line" ]]; do
      printf '%s\n' "$line" >> "$output_file"
      format_claude_stream_line "$line"
    done
  else
    "${cmd[@]}" < "$prompt_file" 2>&1 | while IFS= read -r line || [[ -n "$line" ]]; do
      printf '%s\n' "$line" >> "$output_file"
      format_codex_stream_line "$line"
    done
  fi
}

run_pty_fallback() {
  local output_file="$1"
  local prompt_file="$2"
  shift 2
  local quoted_cmd=""
  local arg=""

  : > "$output_file"

  for arg in "$@"; do
    quoted_cmd+=" $(printf '%q' "$arg")"
  done

  script -q -F "$output_file" bash -lc "${quoted_cmd# } < $(printf '%q' "$prompt_file")" | sanitize_script_output
}

stream_progress_updates() {
  local child_pid="$1"
  local progress_file="$2"
  local last_size="${3:-0}"
  local idle_seconds=0
  local current_size=0

  while kill -0 "$child_pid" 2>/dev/null; do
    if [[ -f "$progress_file" ]]; then
      current_size=$(wc -c < "$progress_file" 2>/dev/null || echo 0)

      if (( current_size < last_size )); then
        last_size=0
      fi

      if (( current_size > last_size )); then
        echo ""
        echo "[ralph] progress.txt updated:"
        tail -c +"$((last_size + 1))" "$progress_file" | sed 's/^/[progress] /'
        last_size=$current_size
        idle_seconds=0
      else
        idle_seconds=$((idle_seconds + 2))
      fi
    else
      idle_seconds=$((idle_seconds + 2))
    fi

    if (( idle_seconds >= 20 )); then
      echo "[ralph] still running... waiting for tool output or progress.txt updates"
      idle_seconds=0
    fi

    sleep 2
  done

  if [[ -f "$progress_file" ]]; then
    local final_size
    final_size=$(wc -c < "$progress_file" 2>/dev/null || echo 0)
    if (( final_size < last_size )); then
      last_size=0
    fi
    if (( final_size > last_size )); then
      echo ""
      echo "[ralph] progress.txt updated:"
      tail -c +"$((last_size + 1))" "$progress_file" | sed 's/^/[progress] /'
    fi
  fi
}

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

if [[ -f "$PROGRESS_FILE" ]]; then
  echo "Progress log: $PROGRESS_FILE"
fi

for i in $(seq 1 $MAX_ITERATIONS); do
  echo ""
  echo "==============================================================="
  echo "  Ralph Iteration $i of $MAX_ITERATIONS ($TOOL${MODEL:+ - $MODEL})"
  echo "==============================================================="

  # Run the selected tool with the ralph prompt
  OUTPUT_FILE=$(mktemp)
  RENDERED_OUTPUT_FILE=$(mktemp)
  PROGRESS_SIZE_BEFORE=$(wc -c < "$PROGRESS_FILE" 2>/dev/null || echo 0)
  EXIT_CODE=0

  if [[ "$TOOL" == "claude" ]]; then
    # Prefer structured stream output for readable live logs, with PTY fallback for stubborn buffering.
    STREAM_CMD=(
      claude
      --dangerously-skip-permissions
      --chrome
      --print
      --output-format stream-json
      --include-partial-messages
    )
    FALLBACK_CMD=(claude --dangerously-skip-permissions --chrome --print)
    if [[ -n "$MODEL" ]]; then
      STREAM_CMD+=(--model "$MODEL")
      FALLBACK_CMD+=(--model "$MODEL")
    fi
    (
      if ! run_native_stream "$TOOL" "$OUTPUT_FILE" "$CLAUDE_PROMPT_FILE" "${STREAM_CMD[@]}"; then
        echo ""
        echo "[ralph] native stream mode failed; retrying with PTY fallback"
        run_pty_fallback "$OUTPUT_FILE" "$CLAUDE_PROMPT_FILE" "${FALLBACK_CMD[@]}"
      fi
    ) &
  else
    STREAM_CMD=(codex exec --json)
    FALLBACK_CMD=(codex exec)
    if [[ -n "$MODEL" ]]; then
      STREAM_CMD+=(--model "$MODEL")
      FALLBACK_CMD+=(--model "$MODEL")
    fi
    (
      if ! run_native_stream "$TOOL" "$OUTPUT_FILE" "$CODEX_PROMPT_FILE" "${STREAM_CMD[@]}"; then
        echo ""
        echo "[ralph] native stream mode failed; retrying with PTY fallback"
        run_pty_fallback "$OUTPUT_FILE" "$CODEX_PROMPT_FILE" "${FALLBACK_CMD[@]}"
      fi
    ) &
  fi

  TOOL_PID=$!
  stream_progress_updates "$TOOL_PID" "$PROGRESS_FILE" "$PROGRESS_SIZE_BEFORE" &
  MONITOR_PID=$!

  wait "$TOOL_PID" || EXIT_CODE=$?
  wait "$MONITOR_PID" || true
  OUTPUT=$(cat "$OUTPUT_FILE" "$RENDERED_OUTPUT_FILE")
  rm -f "$OUTPUT_FILE"
  rm -f "$RENDERED_OUTPUT_FILE"
  
  # Check for completion signal
  if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    echo ""
    echo "Ralph completed all tasks!"
    echo "Completed at iteration $i of $MAX_ITERATIONS"
    exit 0
  fi
  
  if [[ "$EXIT_CODE" -ne 0 ]]; then
    echo "Iteration $i exited with status $EXIT_CODE. Continuing..."
  else
    echo "Iteration $i complete. Continuing..."
  fi
  sleep 2
done

echo ""
echo "Ralph reached max iterations ($MAX_ITERATIONS) without completing all tasks."
echo "Check $PROGRESS_FILE for status."
exit 1
