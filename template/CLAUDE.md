# Claude Code Project Instructions

## Project Overview

[Brief description of your project goes here]

## Key Objectives

- [Objective 1]
- [Objective 2]
- [Objective 3]

## Project Structure

```
.
├── CLAUDE.md          # This file - project instructions for Claude
├── .claude/
│   ├── agents/        # 8 core agents (backend, blockchain, checker, coder, frontend, planner, researcher, shadcn)
│   ├── skills/        # /prd, /ralph, and /codex-review slash commands
│   └── hooks/         # Workflow selector and codex-review hooks
├── agents/            # Documentation only — see .claude/agents/ for active agents
├── scripts/
│   ├── ralph/         # Autonomous agent loop (ralph.sh + Claude/Codex instructions)
│   └── codex-review/  # Codex CLI review script (plans, implementations, code changes)
├── docs/              # Project documentation
├── plans/             # Project plans and architectural documents
└── tickets/           # Task tickets and issues
```

## Development Guidelines

### Code Style

- Follow existing code conventions in the project
- Use consistent naming patterns
- Maintain clean, readable code

### Testing

- Run tests before committing changes
- Add tests for new functionality
- Ensure all tests pass

### Git Workflow

- Create descriptive commit messages
- Keep commits focused and atomic
- Review changes before committing

## Common Commands

```bash
# Add your common project commands here
# npm install
# npm run dev
# npm test
```

## Important Context

[Add any project-specific context, dependencies, or requirements here]

## Agents

8 core agents are pre-installed in `.claude/agents/`. See @agents/README.md for the full list and instructions for adding custom agents.

## Skills (Slash Commands)

- **/prd** — Scans the codebase, then generates a structured PRD with real file paths and auto-detected quality criteria. Saves to `tasks/prd-[feature-name].md`.
- **/ralph** — Converts a PRD into `scripts/ralph/prd.json` for autonomous execution with quality checks and file hints per story.
- **/codex-review** — Reviews plans, validates implementations against plans, or reviews code changes. Auto-detects what to review based on context. Iterates up to 3 times.
- **/secops** — **NEVER install packages without running this first.** Scans dependencies for vulnerabilities using OSV Scanner. Use before any `pip`, `npm`, `cargo`, `gem`, or other package manager install.

## Ralph — Autonomous Agent Loop

Ralph implements user stories from a PRD one at a time in a loop, with subagent verification after each story.

```bash
./scripts/ralph/ralph.sh                          # Default: 10 iterations with Claude Code
./scripts/ralph/ralph.sh --tool claude            # Use Claude Code explicitly
./scripts/ralph/ralph.sh --tool codex             # Use Codex CLI
./scripts/ralph/ralph.sh --tool claude --model opus 20  # Specify model + iterations
```

Typical workflow: `/prd` → `/ralph` → `./scripts/ralph/ralph.sh`

Prerequisites: `jq` plus the CLI for whichever runner you use (`claude` by default, or `codex` for `--tool codex`).

## Agent Orchestration

See @docs/agent-orchestration.md for detailed workflow patterns on how to chain agents effectively.

## Workflow Selector Hook (Optional)

An optional hook that suggests agent workflows based on your prompt. Claude will ask before applying.

To activate after installation:
```bash
export CCSETUP_WORKFLOW=1
```

When unset, the hook is inactive and Claude uses its default behavior. Install the hook with `npx ccsetup --install-hooks`.

## Codex Review Hook (Optional)

An optional hook that suggests running `/codex-review` when a plan file or `scripts/ralph/prd.json` is modified, or when code changes are detected. Triggers on the `Stop` event.

To activate:
```bash
export CCSETUP_CODEX_REVIEW=1
```

When unset, the hook is inactive and produces no output.

## Tickets

See @tickets/README.md for ticket format and management approach

## Plans

See @plans/README.md for planning documents and architectural decisions

## Development Context

- See @docs/ROADMAP.md for current status and next steps
- Task-based development workflow with tickets in `/tickets` directory
- Use `/plans` directory for architectural decisions and implementation roadmaps

## Important Instructions

- Ask clarifying questions when requirements are unclear
- Self-documenting code — no code comments
- For complex features, consider creating a plan document in `/plans` before implementing

## Additional Notes

[Any other important information for Claude to know about this project]

---

# 🔒 CRITICAL SECURITY - OSV-Scanner Requirement

> **MANDATORY SECOPS POLICY**: All dependency installations MUST be scanned with `osv-scanner` BEFORE installation. **NEVER install packages without scanning first. No exceptions.**

### Security Workflow - ALWAYS Follow This Order

**BEFORE installing ANY dependencies:**

1. **Query the OSV API to check the package before installing:**

   ```bash
   curl -s -X POST "https://api.osv.dev/v1/query" \
     -H "Content-Type: application/json" \
     -d '{"package": {"name": "PACKAGE_NAME", "ecosystem": "ECOSYSTEM"}, "version": "VERSION"}'
   ```

   | Package Manager | Ecosystem |
   |---|---|
   | pip | `PyPI` |
   | npm/yarn/pnpm | `npm` |
   | cargo | `crates.io` |
   | go get | `Go` |
   | gem | `RubyGems` |
   | composer | `Packagist` |
   | nuget | `NuGet` |
   | maven | `Maven` |

   - Empty `{}` = no known vulnerabilities → proceed
   - Response contains `vulns` = **STOP**. Report to user, suggest safe version.

2. **Prepare the lockfile for scanning:**

   ```bash
   osv-scanner scan -r .

   # Or specific lockfile:
   osv-scanner scan -L requirements.txt
   osv-scanner scan -L package-lock.json
   osv-scanner scan -L Cargo.lock
   osv-scanner scan -L go.sum
   ```

3. **Review the scan results:**

   - ❌ **If vulnerabilities are found:** STOP - Do NOT install. Report findings to the user and discuss mitigation options.
   - ✅ **If scan is clean:** Proceed with installation.

4. **Only after clean scan, install dependencies.**

5. **After installation, rescan the entire project:**

   ```bash
   osv-scanner scan -r .
   ```

### Critical Rules

1. **NEVER bypass osv-scanner** - This is a security requirement, not a suggestion
2. **NEVER install packages without scanning first** - No exceptions
3. **NEVER ignore osv-scanner warnings** - Always report vulnerabilities to the user
4. **ALWAYS rescan after installation** - Verify the installed state is secure

### Reporting Format

When vulnerabilities are found, present them clearly and block installation:

```
⚠️ Found 2 vulnerabilities — installation blocked pending review:

CRITICAL: lodash@4.17.20
  - GHSA-35jh-r3h4-6jhm: Prototype Pollution
  - Fix: upgrade to 4.17.21

HIGH: axios@0.21.1
  - CVE-2021-3749: SSRF
  - Fix: upgrade to 0.21.2

Upgrade affected packages?
```

Use `/secops` for the full workflow including lockfile generation and vulnerability ignoring.
