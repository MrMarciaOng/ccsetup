'use strict';

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const SCRIPT_PATH = path.join(ROOT, 'template', 'scripts', 'codex-review', 'codex-review.sh');

const CODEX_IN_PATH = (() => {
  try {
    execSync('command -v codex', { encoding: 'utf8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
})();

const API_KEY_SET = !!(process.env.OPENAI_API_KEY || process.env.CODEX_API_KEY);

const CAN_RUN = CODEX_IN_PATH && API_KEY_SET;

if (!CAN_RUN) {
  const reasons = [];
  if (!CODEX_IN_PATH) reasons.push('codex CLI not in PATH');
  if (!API_KEY_SET) reasons.push('no OPENAI_API_KEY or CODEX_API_KEY set');
  console.log(`\n⏭  Skipping Codex integration tests: ${reasons.join(', ')}\n`);
}

const describeIntegration = CAN_RUN ? describe : describe.skip;

const SAMPLE_PLAN = `# Feature Plan: Add User Notifications

## Overview
Add a notification system that alerts users when their tasks are updated.

## Technical Approach
- Use WebSocket connections for real-time delivery
- Store notifications in PostgreSQL with a notifications table
- Add a NotificationService class to handle creation and delivery
- Frontend: React component with a bell icon and dropdown

## Implementation Steps
1. Create database migration for notifications table
2. Build NotificationService with create/read/markRead methods
3. Set up WebSocket server alongside existing HTTP server
4. Add React NotificationBell component
5. Wire up end-to-end: service -> WebSocket -> UI

## Acceptance Criteria
- Users receive notifications within 2 seconds of task update
- Notifications persist across page refreshes
- Users can mark notifications as read
- Bell icon shows unread count badge
`;

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'codex-integration-'));
}

function cleanup(dir) {
  if (dir && fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
describeIntegration('Codex CLI Integration Tests', () => {
  jest.setTimeout(120_000);

  let tmpDir;
  let planFile;

  beforeAll(() => {
    tmpDir = makeTempDir();
    planFile = path.join(tmpDir, 'feature-plan.md');
    fs.writeFileSync(planFile, SAMPLE_PLAN);
  });

  afterAll(() => {
    cleanup(tmpDir);
  });

  // ── Test 1: E2E script invocation ──────────────────────────────────────────
  test('produces structured review output from a plan file', () => {
    const result = spawnSync('bash', [SCRIPT_PATH, planFile], {
      encoding: 'utf8',
      timeout: 120_000,
    });

    expect(result.status).toBe(0);
    expect(result.stdout.length).toBeGreaterThan(0);

    const output = result.stdout.toLowerCase();
    const hasReviewContent =
      output.includes('architecture') ||
      output.includes('risk') ||
      output.includes('suggest');
    expect(hasReviewContent).toBe(true);
  });

  // ── Test 2: Model override ─────────────────────────────────────────────────
  test('accepts --model flag and produces valid output', () => {
    const result = spawnSync('bash', [SCRIPT_PATH, planFile, '--model', 'o3-mini'], {
      encoding: 'utf8',
      timeout: 120_000,
    });

    expect(result.status).toBe(0);
    expect(result.stdout.length).toBeGreaterThan(0);
  });

  // ── Test 3: Stdin pipe ─────────────────────────────────────────────────────
  test('accepts plan content via stdin pipe', () => {
    const result = spawnSync('bash', [SCRIPT_PATH, '-'], {
      input: SAMPLE_PLAN,
      encoding: 'utf8',
      timeout: 120_000,
    });

    expect(result.status).toBe(0);
    expect(result.stdout.length).toBeGreaterThan(0);
  });

  // ── Test 4: Skill flow simulation ──────────────────────────────────────────
  test('review output references plan content (skill flow simulation)', () => {
    const skillDir = makeTempDir();
    try {
      const plansDir = path.join(skillDir, 'plans');
      fs.mkdirSync(plansDir);
      const skillPlanFile = path.join(plansDir, 'notification-plan.md');
      fs.writeFileSync(skillPlanFile, SAMPLE_PLAN);

      const result = spawnSync('bash', [SCRIPT_PATH, skillPlanFile], {
        encoding: 'utf8',
        timeout: 120_000,
      });

      expect(result.status).toBe(0);

      const output = result.stdout.toLowerCase();
      const referencesPlan =
        output.includes('notification') ||
        output.includes('websocket') ||
        output.includes('database');
      expect(referencesPlan).toBe(true);
    } finally {
      cleanup(skillDir);
    }
  });
});
