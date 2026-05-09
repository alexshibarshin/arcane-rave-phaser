#!/usr/bin/env bash
# ralph-loop.sh — Autonomous multi-agent task executor for Pi coding agent
#
# Runs through pending tasks in a feature folder, executing each with
# Worker → Reviewer loop (up to 3 iterations per task).
#
# Usage:
#   ./ralph-loop.sh --feature inventory-system
#   ./ralph-loop.sh --feature inventory-system --init
#   ./ralph-loop.sh --feature inventory-system --init --mark-completed 01-task-auth
#   ./ralph-loop.sh --feature inventory-system --mark-completed 01-task-auth,02-task-db
#   ./ralph-loop.sh --feature inventory-system --dry-run
#   ./ralph-loop.sh --feature inventory-system --project-root /custom/path

set -euo pipefail

# === Defaults ===
WORKER_MODEL="deepseek/deepseek-v4-pro"
REVIEWER_MODEL="deepseek/deepseek-v4-pro"
MAX_ITERATIONS=3
TIMEOUT_SEC=3600

# === Globals ===
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT=""
FEATURE_SLUG=""
FEATURE_DIR=""
STATE_FILE=""

DRY_RUN=false
DO_INIT=false
MARK_COMPLETED=""

RUNNER_MJS="$SCRIPT_DIR/pi-runner.mjs"
WORKER_PROMPT_TMPL="$SCRIPT_DIR/prompts/worker.md"
REVIEWER_PROMPT_TMPL="$SCRIPT_DIR/prompts/reviewer.md"

# Coprocess tracking
PI_RUNNER_PID=""
INTERRUPTED=false

# === Logging ===
log_info()  { echo "  $*"; }
log_success() { echo "✅ $*"; }
log_error()  { echo "❌ $*" >&2; }
log_warn()   { echo "⚠️  $*" >&2; }

# === Help ===
usage() {
  cat <<'EOF'
Usage: ./ralph-loop.sh [OPTIONS]

Options:
  --feature SLUG            Feature slug (e.g., inventory-system)
  --project-root PATH       Project root directory (default: auto-detect via .git or parent of script)
  --init                    Create .task-state.json from task files
  --mark-completed TASKS    Mark tasks as completed (comma-separated, e.g. 01-task-auth,02-task-db)
  --dry-run                 Show what would be executed without running
  -h, --help                Show this help

Examples:
  ./ralph-loop.sh --feature inventory-system --init
  ./ralph-loop.sh --feature inventory-system --mark-completed 01-task-auth
  ./ralph-loop.sh --feature inventory-system
  cd docs/features/inventory-system && ../../ralph-loop.sh
EOF
}

# === Argument Parsing ===
parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --feature) FEATURE_SLUG="$2"; shift 2 ;;
      --project-root) PROJECT_ROOT="$2"; shift 2 ;;
      --init) DO_INIT=true; shift ;;
      --mark-completed) MARK_COMPLETED="$2"; shift 2 ;;
      --dry-run) DRY_RUN=true; shift ;;
      --help|-h) usage; exit 0 ;;
      *) log_error "Unknown option: $1"; usage; exit 1 ;;
    esac
  done
}

# === Project Root Detection ===
find_project_root() {
  if [ -n "$PROJECT_ROOT" ]; then
    [ -d "$PROJECT_ROOT" ] || { log_error "Project root not found: $PROJECT_ROOT"; exit 1; }
    return 0
  fi

  local dir="$SCRIPT_DIR"
  while [ "$dir" != "/" ]; do
    if [ -d "$dir/.git" ] || [ -f "$dir/.git" ]; then
      PROJECT_ROOT="$dir"
      return 0
    fi
    dir="$(dirname "$dir")"
  done

  # Fallback: parent of script directory
  PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
  log_info "No .git found on parent chain. Using parent of script directory as project root: $PROJECT_ROOT"
}

# === Feature Directory Detection ===
find_feature_dir() {
  if [ -n "$FEATURE_SLUG" ]; then
    local candidate="$PROJECT_ROOT/docs/features/$FEATURE_SLUG"
    if [ -d "$candidate" ]; then
      FEATURE_DIR="$candidate"
      return 0
    fi
    log_error "Feature directory not found: $candidate"
    return 1
  fi

  # Auto-detect from current working directory
  if [ -f "design-spec.md" ]; then
    FEATURE_DIR="$(pwd)"
    return 0
  fi

  log_error "Cannot determine feature folder. Use --feature SLUG or run from feature directory."
  return 1
}

validate_feature_dir() {
  [ -f "$FEATURE_DIR/design-spec.md" ] || { log_error "Missing design-spec.md in $FEATURE_DIR"; exit 1; }
  STATE_FILE="$FEATURE_DIR/.task-state.json"

  local count
  count=$(find "$FEATURE_DIR" -maxdepth 1 -name '[0-9][0-9]-task-*.md' | wc -l | tr -d ' ')
  [ "$count" -gt 0 ] || { log_error "No task files found (expected NN-task-*.md)"; exit 1; }
}

list_task_files() {
  find "$FEATURE_DIR" -maxdepth 1 -name '[0-9][0-9]-task-*.md' -exec basename {} .md \; | sort
}

# === JSON Helpers (node) ===
json_keys() {
  node -e "
    const j = JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'));
    console.log(Object.keys(j).join('\n'));
  " "$1" 2>&1
}

json_get() {
  node -e "
    const j = JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'));
    const keys = process.argv[2].split('.');
    let val = j;
    for (const k of keys) { if (val == null) break; val = val[k]; }
    if (val === null || val === undefined) process.stdout.write('');
    else if (typeof val === 'string') process.stdout.write(val);
    else process.stdout.write(JSON.stringify(val));
  " "$1" "$2" 2>&1
}

json_set() {
  node -e "
    const fs = require('fs');
    const j = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
    const keys = process.argv[2].split('.');
    let val = process.argv[3];
    // Parse JSON values
    if (val === 'null' || val === '') val = null;
    else if (val === 'true') val = true;
    else if (val === 'false') val = false;
    else if (val === '[]') val = [];
    else if (val.startsWith('{') || val.startsWith('[')) {
      try { val = JSON.parse(val); } catch {}
    }

    let obj = j;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in obj)) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = val;
    fs.writeFileSync(process.argv[1], JSON.stringify(j, null, 2) + '\n');
  " "$1" "$2" "$3" 2>&1
}

# --- State File Management ---

init_state() {
  local tasks
  tasks=$(list_task_files)

  node -e "
    const fs = require('fs');
    const path = require('path');
    const featureDir = process.argv[1];
    const stateFile = process.argv[2];
    const tasks = process.argv.slice(3);

    const state = {};
    for (const task of tasks) {
      const filePath = path.join(featureDir, task + '.md');
      const content = fs.readFileSync(filePath, 'utf8');

      // Parse ## Blocked By — extract task IDs from each line
      const blockedBy = [];
      const blockMatch = content.match(/## Blocked By\s*\n([\s\S]*?)(?=\n##|\n\Z)/);
      if (blockMatch) {
        const lines = blockMatch[1].split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (/^(none|нет|no)$/i.test(trimmed)) break;
          // Extract all NN-task-* patterns from the line
          const found = trimmed.match(/\b(\d{2}-task-[\w-]+)\b/g);
          if (found) {
            for (const id of found) {
              if (!blockedBy.includes(id)) blockedBy.push(id);
            }
          }
        }
      }

      state[task] = {
        status: 'pending',
        iteration: 0,
        blockedBy,
        startedAt: null,
        completedAt: null,
        reviewFeedback: null,
        summary: null,
        gitCommit: null
      };
    }
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2) + '\n');
  " "$FEATURE_DIR" "$STATE_FILE" $tasks 2>&1

  log_success ".task-state.json created with $(echo "$tasks" | wc -l | tr -d ' ') tasks"
}

mark_tasks_completed() {
  local IFS=','; local tasks=($MARK_COMPLETED); unset IFS
  for task in "${tasks[@]}"; do
    task=$(echo "$task" | xargs)  # trim whitespace
    [ -z "$task" ] && continue

    local current
    current=$(json_get "$STATE_FILE" "$task.status")
    if [ "$current" = "null" ] || [ -z "$current" ]; then
      log_warn "Task not in state file: $task"
      continue
    fi

    json_set "$STATE_FILE" "$task.status" "completed"
    json_set "$STATE_FILE" "$task.completedAt" "\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\""
    log_info "Marked completed: $task"
  done
}

# --- Topological Sort (next ready task) ---
find_next_ready() {
  node -e "
    const state = JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'));
    const tasks = Object.keys(state).sort();

    for (const task of tasks) {
      if (state[task].status !== 'pending') continue;

      const blockedBy = state[task].blockedBy || [];
      const allDepsDone = blockedBy.every(dep =>
        state[dep] && state[dep].status === 'completed'
      );

      if (allDepsDone) {
        console.log(task);
        process.exit(0);
      }
    }
    process.exit(1);
  " "$STATE_FILE" 2>&1
}

count_tasks_by_status() {
  node -e "
    const state = JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'));
    const tasks = Object.keys(state);
    let completed = 0, failed = 0, pending = 0, inProgress = 0;
    for (const t of tasks) {
      const s = state[t].status;
      if (s === 'completed') completed++;
      else if (s === 'failed') failed++;
      else if (s === 'in_progress') inProgress++;
      else pending++;
    }
    console.log(JSON.stringify({completed, failed, pending, inProgress, total: tasks.length}));
  " "$STATE_FILE" 2>&1
}

# --- Git Helpers ---
git_dirty() {
  [ -n "$(git status --porcelain 2>/dev/null)" ]
}

git_last_commit_msg() {
  git log -1 --format='%s' 2>/dev/null || echo ""
}

git_last_commit_hash() {
  git log -1 --format='%h' 2>/dev/null || echo ""
}

# --- Prompt Building ---
build_worker_prompt() {
  local task_slug="$1"; local feedback="${2:-}"
  local task_path="$FEATURE_DIR/${task_slug}.md"

  local prompt
  prompt=$(cat "$WORKER_PROMPT_TMPL")
  prompt="${prompt//\{\{TASK_PATH\}\}/$task_path}"

  if [ -n "$feedback" ]; then
    prompt+=$'\n\n⚠️ Предыдущая попытка не прошла ревью. Фидбэк ревьюера:\n'
    prompt+="$feedback"$'\n\nИсправь указанные проблемы.'
  fi

  printf '%s' "$prompt"
}

build_reviewer_prompt() {
  local task_slug="$1"
  local task_path="$FEATURE_DIR/${task_slug}.md"

  local prompt
  prompt=$(cat "$REVIEWER_PROMPT_TMPL")
  prompt="${prompt//\{\{TASK_PATH\}\}/$task_path}"
  prompt="${prompt//\{\{TASK_SLUG\}\}/$task_slug}"

  printf '%s' "$prompt"
}

# --- RPC Runner ---
run_pi_session() {
  local role="$1"; local model="$2"; local prompt="$3"

  node "$RUNNER_MJS" \
    --role "$role" \
    --model "$model" \
    --timeout "$TIMEOUT_SEC" \
    --prompt "$prompt"
}

# --- SIGINT Handler ---
cleanup() {
  if [ -n "$PI_RUNNER_PID" ] && kill -0 "$PI_RUNNER_PID" 2>/dev/null; then
    kill -TERM "$PI_RUNNER_PID" 2>/dev/null || true
    (
      sleep 5
      kill -KILL "$PI_RUNNER_PID" 2>/dev/null || true
    ) &
  fi
  # Kill child processes
  jobs -p | xargs kill -TERM 2>/dev/null || true
}

on_interrupt() {
  INTERRUPTED=true
  echo ""
  log_warn "Interrupted. Cleaning up..."
  cleanup
}

trap on_interrupt INT TERM

# --- Single Task Execution ---
run_task() {
  local task_slug="$1"
  local iteration=0
  local feedback=""

  log_info "── $task_slug ──"

  # Check git clean
  if git_dirty; then
    log_error "Working tree is dirty before starting $task_slug. Commit or stash changes first."
    return 1
  fi

  json_set "$STATE_FILE" "$task_slug.status" "in_progress"
  json_set "$STATE_FILE" "$task_slug.startedAt" "\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\""

  while [ $iteration -lt $MAX_ITERATIONS ]; do
    iteration=$((iteration + 1))
    json_set "$STATE_FILE" "$task_slug.iteration" "$iteration"

    if [ "$INTERRUPTED" = true ]; then
      json_set "$STATE_FILE" "$task_slug.status" "pending"
      return 1
    fi

    # === Worker ===
    local worker_prompt
    worker_prompt=$(build_worker_prompt "$task_slug" "$feedback")
    local worker_result worker_status worker_text

    printf "  [iter %d/%d] Worker" "$iteration" "$MAX_ITERATIONS"

    # Run worker in background so we can show spinner
    local worker_tmp
    worker_tmp=$(mktemp)
    (
      run_pi_session "worker" "$WORKER_MODEL" "$worker_prompt" > "$worker_tmp" 2>/dev/null
    ) &
    PI_RUNNER_PID=$!

    # Spinner while worker runs
    local spinner_chars="⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
    local spinner_idx=0
    while kill -0 "$PI_RUNNER_PID" 2>/dev/null; do
      printf "\r  [iter %d/%d] Worker %s" "$iteration" "$MAX_ITERATIONS" "${spinner_chars:spinner_idx:1}"
      spinner_idx=$(( (spinner_idx + 1) % ${#spinner_chars} ))
      sleep 0.1
    done
    wait "$PI_RUNNER_PID" 2>/dev/null || true
    PI_RUNNER_PID=""

    if [ "$INTERRUPTED" = true ]; then
      json_set "$STATE_FILE" "$task_slug.status" "pending"
      printf "\r  [iter %d/%d] Interrupted\n" "$iteration" "$MAX_ITERATIONS"
      rm -f "$worker_tmp"
      return 1
    fi

    printf "\r  [iter %d/%d] Worker done. " "$iteration" "$MAX_ITERATIONS"

    worker_result=$(cat "$worker_tmp")
    rm -f "$worker_tmp"

    worker_status=$(echo "$worker_result" | node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).status || 'error')" 2>/dev/null || echo "error")
    worker_text=$(echo "$worker_result" | node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).text || '')" 2>/dev/null || echo "")

    if [ "$worker_status" = "timeout" ]; then
      log_warn "Worker timed out"
      feedback="Worker timed out. Please simplify or split the task."
      continue
    fi

    if [ "$worker_status" = "error" ]; then
      log_warn "Worker error"
      feedback="Worker encountered an error and did not complete."
      continue
    fi

    # === Reviewer ===
    local reviewer_prompt
    reviewer_prompt=$(build_reviewer_prompt "$task_slug")

    printf "Reviewer"

    local reviewer_tmp
    reviewer_tmp=$(mktemp)
    (
      run_pi_session "reviewer" "$REVIEWER_MODEL" "$reviewer_prompt" > "$reviewer_tmp" 2>/dev/null
    ) &
    PI_RUNNER_PID=$!

    spinner_idx=0
    while kill -0 "$PI_RUNNER_PID" 2>/dev/null; do
      printf "\r  [iter %d/%d] Worker done. Reviewer %s" "$iteration" "$MAX_ITERATIONS" "${spinner_chars:spinner_idx:1}"
      spinner_idx=$(( (spinner_idx + 1) % ${#spinner_chars} ))
      sleep 0.1
    done
    wait "$PI_RUNNER_PID" 2>/dev/null || true
    PI_RUNNER_PID=""

    if [ "$INTERRUPTED" = true ]; then
      json_set "$STATE_FILE" "$task_slug.status" "pending"
      printf "\r  [iter %d/%d] Interrupted\n" "$iteration" "$MAX_ITERATIONS"
      rm -f "$reviewer_tmp"
      return 1
    fi

    local reviewer_exit=$?
    local reviewer_result
    reviewer_result=$(cat "$reviewer_tmp")
    rm -f "$reviewer_tmp"

    local verdict
    verdict=$(echo "$reviewer_result" | node -e "
      const r = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
      if (r.verdict) process.stdout.write(JSON.stringify(r.verdict));
      else process.stdout.write('null');
    " 2>/dev/null || echo "null")

    local reviewer_verdict
    reviewer_verdict=$(echo "$verdict" | node -e "
      const v = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
      process.stdout.write((v && v.verdict) || 'null');
    " 2>/dev/null || echo "null")

    if [ "$reviewer_verdict" = "PASS" ]; then
      # Verify commit was made
      local commit_hash commit_msg
      commit_hash=$(git_last_commit_hash)
      commit_msg=$(git_last_commit_msg)

      printf "\r  [iter %d/%d] %s\n" "$iteration" "$MAX_ITERATIONS" "✓ PASS"

      local summary
      summary=$(echo "$verdict" | node -e "
        const v = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
        process.stdout.write((v && v.summary) || '');
      " 2>/dev/null || echo "")

      if [ -z "$summary" ]; then
        summary="$commit_msg"
      fi

      log_success "$summary ($commit_hash)"

      json_set "$STATE_FILE" "$task_slug.status" "completed"
      json_set "$STATE_FILE" "$task_slug.completedAt" "\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\""
      json_set "$STATE_FILE" "$task_slug.summary" "\"$summary\""
      json_set "$STATE_FILE" "$task_slug.gitCommit" "\"$commit_hash\""
      json_set "$STATE_FILE" "$task_slug.reviewFeedback" "null"
      return 0
    fi

    # FAIL
    local fail_feedback
    fail_feedback=$(echo "$verdict" | node -e "
      const v = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
      process.stdout.write((v && v.feedback) || 'Reviewer rejected, no specific feedback.');
    " 2>/dev/null || echo "Reviewer rejected, no specific feedback.")

    printf "\r  [iter %d/%d] %s\n" "$iteration" "$MAX_ITERATIONS" "✗ FAIL"
    log_warn "$fail_feedback"

    feedback="$fail_feedback"
    json_set "$STATE_FILE" "$task_slug.reviewFeedback" "\"$fail_feedback\""
  done

  # Exhausted all iterations
  json_set "$STATE_FILE" "$task_slug.status" "failed"
  log_error "$task_slug failed after $MAX_ITERATIONS iterations"
  return 1
}

# === Dry Run ===
show_dry_run() {
  echo "Feature: ${FEATURE_SLUG:-$(basename "$FEATURE_DIR")}"
  echo ""

  local counts
  counts=$(count_tasks_by_status)
  local completed failed pending in_progress total
  completed=$(echo "$counts" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).completed))" 2>/dev/null)
  failed=$(echo "$counts" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).failed))" 2>/dev/null)
  pending=$(echo "$counts" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).pending))" 2>/dev/null)
  total=$(echo "$counts" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).total))" 2>/dev/null)

  printf "  %-25s %-12s %s\n" "Task" "Status" "Blocked by"
  printf "  %-25s %-12s %s\n" "-------------------------" "------------" "----------"

  local task_slugs
  task_slugs=$(json_keys "$STATE_FILE")

  local next=""
  while IFS= read -r task; do
    [ -z "$task" ] && continue
    local status blocked
    status=$(json_get "$STATE_FILE" "$task.status")
    blocked=$(json_get "$STATE_FILE" "$task.blockedBy")

    local emoji
    case "$status" in
      completed) emoji="✅ completed" ;;
      failed) emoji="❌ failed" ;;
      in_progress) emoji="⏳ in progress" ;;
      pending)
        # Check if ready
        local is_ready
        is_ready=$(node -e "
          const state = JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'));
          const task = process.argv[2];
          const deps = state[task].blockedBy || [];
          const ready = deps.every(d => state[d] && state[d].status === 'completed');
          process.stdout.write(ready ? 'yes' : 'no');
        " "$STATE_FILE" "$task" 2>/dev/null || echo "no")
        if [ "$is_ready" = "yes" ] && [ -z "$next" ]; then
          next="$task"
          emoji="→ pending"
        else
          emoji="  pending"
        fi
        ;;
      *) emoji="? $status" ;;
    esac

    local blocked_str
    blocked_str=$(echo "$blocked" | node -e "
      const b = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
      process.stdout.write(Array.isArray(b) && b.length > 0 ? b.join(', ') : '—');
    " 2>/dev/null || echo "—")

    printf "  %-25s %-12s %s\n" "$task" "$emoji" "$blocked_str"
  done <<< "$task_slugs"

  echo ""
  echo "  Total: $total | Completed: $completed | Failed: $failed | Pending: $pending"
  if [ -n "$next" ]; then
    echo "  Next ready: $next"
  fi
}

# === Main Loop ===
run_loop() {
  local counts
  counts=$(count_tasks_by_status)
  local pending
  pending=$(echo "$counts" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).pending))" 2>/dev/null)

  if [ "$pending" -eq 0 ]; then
    log_info "No pending tasks."
    return 0
  fi

  local started_total
  started_total=$(date +%s)

  while true; do
    local task_slug
    task_slug=$(find_next_ready) || break

    if ! run_task "$task_slug"; then
      # Task failed or interrupted
      if [ "$INTERRUPTED" = true ]; then
        return 1
      fi
      # Abort on first failure
      local failed_total
      failed_total=$(date +%s)
      echo ""
      echo "═══════════════════════════════════════════"
      log_error "Pipeline aborted: $task_slug failed."
      print_summary "$started_total" "$failed_total"
      exit 1
    fi
  done

  local ended_total
  ended_total=$(date +%s)
  echo ""
  echo "═══════════════════════════════════════════"
  print_summary "$started_total" "$ended_total"
}

print_summary() {
  local started="$1"; local ended="$2"
  local elapsed=$((ended - started))
  local mins=$((elapsed / 60))
  local secs=$((elapsed % 60))

  local counts
  counts=$(count_tasks_by_status)

  local completed failed pending
  completed=$(echo "$counts" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).completed))" 2>/dev/null)
  failed=$(echo "$counts" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).failed))" 2>/dev/null)
  pending=$(echo "$counts" | node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).pending))" 2>/dev/null)

  echo "✅ $completed completed, ❌ $failed failed, ⏳ $pending pending"
  echo "Total time: ${mins}m ${secs}s"

  if [ "$failed" -gt 0 ]; then
    exit 1
  fi
}

# === Main ===
main() {
  parse_args "$@"

  find_project_root
  cd "$PROJECT_ROOT" || { log_error "Cannot cd to $PROJECT_ROOT"; exit 1; }

  find_feature_dir || exit 1
  validate_feature_dir

  # --init
  if [ "$DO_INIT" = true ]; then
    init_state
  fi

  # Ensure state file exists
  if [ ! -f "$STATE_FILE" ]; then
    log_error ".task-state.json not found. Run with --init first."
    exit 1
  fi

  # --mark-completed
  if [ -n "$MARK_COMPLETED" ]; then
    mark_tasks_completed
  fi

  # --dry-run
  if [ "$DRY_RUN" = true ]; then
    show_dry_run
    exit 0
  fi

  # If only --init and/or --mark-completed, we're done
  if [ "$DO_INIT" = true ] && [ -n "$MARK_COMPLETED" ]; then
    echo ""
    show_dry_run
    exit 0
  fi
  if [ "$DO_INIT" = true ] && [ -z "$MARK_COMPLETED" ]; then
    exit 0
  fi

  # Run the loop
  show_dry_run
  echo ""
  run_loop
}

main "$@"
