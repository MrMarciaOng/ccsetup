'use strict';

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const TEMPLATE_DIR = path.join(ROOT, 'template');
const SCRIPT_PATH = path.join(TEMPLATE_DIR, 'scripts', 'codex-review', 'codex-review.sh');
const HOOK_PATH = path.join(TEMPLATE_DIR, 'hooks', 'codex-review', 'index.js');
const SKILL_PATH = path.join(TEMPLATE_DIR, '.claude', 'skills', 'codex-review', 'SKILL.md');
const BIN = path.join(ROOT, 'bin', 'create-project.js');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'codex-review-test-'));
}

function cleanup(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Helper: write a fake executable script
function writeFakeExec(filePath, body) {
  fs.writeFileSync(filePath, `#!/bin/bash\n${body}\n`);
  fs.chmodSync(filePath, '755');
}

// Helper: spawn the hook with controlled cwd/env and piped stdin
function runHook(cwd, envOverrides = {}) {
  return spawnSync('node', [HOOK_PATH], {
    cwd,
    env: { ...process.env, ...envOverrides },
    input: '{}',
    encoding: 'utf8',
    timeout: 5000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
describe('Script Prerequisite Checking', () => {
  test('exits with code 1 when codex CLI is not installed', () => {
    const tmpDir = makeTempDir();
    try {
      // Use absolute path to bash so spawnSync can find it even with restricted PATH.
      // Set PATH to tmpDir only — no codex binary exists there.
      const result = spawnSync('/bin/bash', [SCRIPT_PATH, 'plan.md'], {
        env: { ...process.env, PATH: tmpDir },
        encoding: 'utf8',
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('codex CLI is not installed');
    } finally {
      cleanup(tmpDir);
    }
  });

  test('exits with code 1 when no plan file and no git changes', () => {
    // Use a clean git repo so the parent repo's changes don't leak in
    const tmpDir = makeGitRepo({ withChanges: false });
    try {
      writeFakeExec(path.join(tmpDir, 'codex'), 'echo "ok"; exit 0');
      const result = spawnSync('bash', [SCRIPT_PATH], {
        cwd: tmpDir,
        env: { ...process.env, PATH: `${tmpDir}:${process.env.PATH}` },
        encoding: 'utf8',
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toMatch(/nothing to review/i);
    } finally {
      cleanup(tmpDir);
    }
  });

  test('exits with code 1 when plan file does not exist', () => {
    const tmpDir = makeTempDir();
    try {
      writeFakeExec(path.join(tmpDir, 'codex'), 'echo "ok"; exit 0');
      const result = spawnSync('bash', [SCRIPT_PATH, '/tmp/no-such-plan-file.md'], {
        env: { ...process.env, PATH: `${tmpDir}:${process.env.PATH}` },
        encoding: 'utf8',
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toMatch(/not found/i);
    } finally {
      cleanup(tmpDir);
    }
  });

  test('accepts --model flag and runs successfully', () => {
    const tmpDir = makeTempDir();
    try {
      const planFile = path.join(tmpDir, 'plan.md');
      fs.writeFileSync(planFile, '# Test Plan');
      // Fake timeout: pass through to the next command
      writeFakeExec(path.join(tmpDir, 'timeout'), 'shift; exec "$@"');
      writeFakeExec(path.join(tmpDir, 'codex'), 'echo "review output"; exit 0');

      const result = spawnSync('bash', [SCRIPT_PATH, planFile, '--model', 'o3-mini'], {
        env: { ...process.env, PATH: `${tmpDir}:${process.env.PATH}` },
        encoding: 'utf8',
      });
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('review output');
    } finally {
      cleanup(tmpDir);
    }
  });

  test('accepts CODEX_REVIEW_MODEL env var and runs successfully', () => {
    const tmpDir = makeTempDir();
    try {
      const planFile = path.join(tmpDir, 'plan.md');
      fs.writeFileSync(planFile, '# Test Plan');
      writeFakeExec(path.join(tmpDir, 'timeout'), 'shift; exec "$@"');
      writeFakeExec(path.join(tmpDir, 'codex'), 'echo "review output"; exit 0');

      const result = spawnSync('bash', [SCRIPT_PATH, planFile], {
        env: {
          ...process.env,
          PATH: `${tmpDir}:${process.env.PATH}`,
          OPENAI_API_KEY: 'test-key',
          CODEX_REVIEW_MODEL: 'gpt-4o',
        },
        encoding: 'utf8',
      });
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('review output');
    } finally {
      cleanup(tmpDir);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Hook Plan Detection Logic', () => {
  test('outputs {} and exits 0 when CCSETUP_CODEX_REVIEW is not set', () => {
    const tmpDir = makeTempDir();
    try {
      const result = runHook(tmpDir, { CCSETUP_CODEX_REVIEW: '' });
      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe('{}');
    } finally {
      cleanup(tmpDir);
    }
  });

  test('outputs {} when CCSETUP_CODEX_REVIEW is "false"', () => {
    const tmpDir = makeTempDir();
    try {
      const plansDir = path.join(tmpDir, 'plans');
      fs.mkdirSync(plansDir);
      fs.writeFileSync(path.join(plansDir, 'plan.md'), '# Plan');

      const result = runHook(tmpDir, { CCSETUP_CODEX_REVIEW: 'false' });
      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe('{}');
    } finally {
      cleanup(tmpDir);
    }
  });

  test('outputs {} when no recent plan files and no git changes exist', () => {
    // Use a clean git repo so the parent repo's changes don't leak in
    const tmpDir = makeGitRepo({ withChanges: false });
    try {
      const result = runHook(tmpDir, { CCSETUP_CODEX_REVIEW: '1' });
      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe('{}');
    } finally {
      cleanup(tmpDir);
    }
  });

  test('detects recently modified files in plans/ directory', () => {
    const tmpDir = makeTempDir();
    try {
      const plansDir = path.join(tmpDir, 'plans');
      fs.mkdirSync(plansDir);
      fs.writeFileSync(path.join(plansDir, 'my-plan.md'), '# My Plan');

      const result = runHook(tmpDir, { CCSETUP_CODEX_REVIEW: '1' });
      expect(result.status).toBe(0);

      const output = JSON.parse(result.stdout.trim());
      expect(output).toHaveProperty('message');
      expect(output.message).toContain('codex-review');
      expect(output.message).toContain('my-plan.md');
    } finally {
      cleanup(tmpDir);
    }
  });

  test('detects *plan*.md files in root directory', () => {
    const tmpDir = makeTempDir();
    try {
      fs.writeFileSync(path.join(tmpDir, 'feature-plan.md'), '# Feature Plan');

      const result = runHook(tmpDir, { CCSETUP_CODEX_REVIEW: '1' });
      expect(result.status).toBe(0);

      const output = JSON.parse(result.stdout.trim());
      expect(output).toHaveProperty('message');
      expect(output.message).toContain('feature-plan.md');
    } finally {
      cleanup(tmpDir);
    }
  });

  test('ignores non-plan .md files in root directory', () => {
    // Use a clean git repo so the parent repo's changes don't leak in
    const tmpDir = makeGitRepo({ withChanges: false });
    try {
      fs.writeFileSync(path.join(tmpDir, 'README.md'), '# Readme');

      const result = runHook(tmpDir, { CCSETUP_CODEX_REVIEW: '1' });
      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe('{}');
    } finally {
      cleanup(tmpDir);
    }
  });

  test('outputs suggestion message when env var is "true"', () => {
    const tmpDir = makeTempDir();
    try {
      const plansDir = path.join(tmpDir, 'plans');
      fs.mkdirSync(plansDir);
      fs.writeFileSync(path.join(plansDir, 'impl-plan.md'), '# Plan');

      const result = runHook(tmpDir, { CCSETUP_CODEX_REVIEW: 'true' });
      expect(result.status).toBe(0);

      const output = JSON.parse(result.stdout.trim());
      expect(output.message).toMatch(/codex-review/);
    } finally {
      cleanup(tmpDir);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Skill File Validation', () => {
  test('skill file exists at expected template path', () => {
    expect(fs.existsSync(SKILL_PATH)).toBe(true);
  });

  test('skill file has valid YAML frontmatter with name and description', () => {
    const content = fs.readFileSync(SKILL_PATH, 'utf8');
    expect(content).toMatch(/^---/);
    expect(content).toMatch(/name:\s*codex-review/);
    expect(content).toMatch(/description:/);
  });

  test('skill documents 3-iteration maximum', () => {
    const content = fs.readFileSync(SKILL_PATH, 'utf8');
    // Both "3" and "iter" (iteration/iterations) must appear
    expect(content).toMatch(/3/);
    expect(content.toLowerCase()).toMatch(/iter/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Integration with Project Setup', () => {
  let testOutputDir;

  beforeEach(() => {
    testOutputDir = makeTempDir();
  });

  afterEach(() => {
    cleanup(testOutputDir);
  });

  function createProject(name) {
    execSync(`node ${BIN} ${name} --force --all-agents`, {
      cwd: testOutputDir,
      encoding: 'utf8',
      timeout: 30000,
      env: { ...process.env, FORCE_COLOR: '0' },
    });
    return path.join(testOutputDir, name);
  }

  test('codex-review.sh is copied to scripts/codex-review/', () => {
    const projDir = createProject('test-codex-project');
    expect(
      fs.existsSync(path.join(projDir, 'scripts', 'codex-review', 'codex-review.sh'))
    ).toBe(true);
  });

  test('codex-review skill is copied to .claude/skills/codex-review/', () => {
    const projDir = createProject('test-codex-project');
    expect(
      fs.existsSync(path.join(projDir, '.claude', 'skills', 'codex-review', 'SKILL.md'))
    ).toBe(true);
  });

  test('codex-review hook is copied to .claude/hooks/codex-review/', () => {
    const projDir = createProject('test-codex-project');
    expect(
      fs.existsSync(path.join(projDir, '.claude', 'hooks', 'codex-review', 'index.js'))
    ).toBe(true);
  });

  test('settings.json includes Stop hook for codex-review', () => {
    const projDir = createProject('test-codex-project');
    const settingsPath = path.join(projDir, '.claude', 'settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

    expect(settings.hooks).toHaveProperty('Stop');
    const hasCodexReview = settings.hooks.Stop.some(
      entry =>
        entry.hooks &&
        entry.hooks.some(h => h.command && h.command.includes('codex-review'))
    );
    expect(hasCodexReview).toBe(true);
  });

  test('existing agents are unaffected (no regression)', () => {
    const projDir = createProject('test-codex-project');
    const agentsDir = path.join(projDir, '.claude', 'agents');
    const agents = fs
      .readdirSync(agentsDir)
      .filter(f => f.endsWith('.md') && f !== 'README.md');
    expect(agents).toHaveLength(8);
  });

  test('existing skills are unaffected (no regression)', () => {
    const projDir = createProject('test-codex-project');
    const skillsDir = path.join(projDir, '.claude', 'skills');
    // Should have at least the codex-review skill plus others
    const skills = fs.readdirSync(skillsDir);
    expect(skills).toContain('codex-review');
    expect(skills.length).toBeGreaterThan(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Script Error Handling', () => {
  test('exits with code 2 on codex auth error', () => {
    const tmpDir = makeTempDir();
    try {
      const planFile = path.join(tmpDir, 'plan.md');
      fs.writeFileSync(planFile, '# Test Plan');
      // Pass-through timeout so we reach the codex auth check
      writeFakeExec(path.join(tmpDir, 'timeout'), 'shift; exec "$@"');
      // Fake codex that prints auth error output and exits non-zero
      writeFakeExec(
        path.join(tmpDir, 'codex'),
        'echo "Error: unauthorized - invalid API key" >&2; exit 1'
      );

      const result = spawnSync('bash', [SCRIPT_PATH, planFile], {
        env: { ...process.env, PATH: `${tmpDir}:${process.env.PATH}` },
        encoding: 'utf8',
      });
      expect(result.status).toBe(2);
      expect(result.stderr).toMatch(/authentication failed/i);
    } finally {
      cleanup(tmpDir);
    }
  });

  test('exits with code 3 on timeout', () => {
    const tmpDir = makeTempDir();
    try {
      const planFile = path.join(tmpDir, 'plan.md');
      fs.writeFileSync(planFile, '# Test Plan');
      writeFakeExec(path.join(tmpDir, 'codex'), 'echo "ok"; exit 0');
      // Fake timeout that exits 124 (the standard timeout expiry code)
      writeFakeExec(path.join(tmpDir, 'timeout'), 'exit 124');

      const result = spawnSync('bash', [SCRIPT_PATH, planFile], {
        env: { ...process.env, PATH: `${tmpDir}:${process.env.PATH}` },
        encoding: 'utf8',
      });
      expect(result.status).toBe(3);
      expect(result.stderr).toMatch(/timed out/i);
    } finally {
      cleanup(tmpDir);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper: create a temp git repo with an initial commit and optional uncommitted change
function makeGitRepo({ withChanges = false } = {}) {
  const tmpDir = makeTempDir();
  execSync('git init', { cwd: tmpDir, stdio: 'pipe' });
  execSync('git config user.email "test@test.com"', { cwd: tmpDir, stdio: 'pipe' });
  execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'pipe' });
  fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'initial content');
  execSync('git add . && git commit -m "init"', { cwd: tmpDir, stdio: 'pipe' });
  if (withChanges) {
    fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'modified content');
  }
  return tmpDir;
}

describe('Script Auto-Detection (plan + git diff)', () => {
  test('code review mode: no plan + git changes → exit 0', () => {
    const tmpDir = makeGitRepo({ withChanges: true });
    try {
      writeFakeExec(path.join(tmpDir, 'codex'), 'echo "code review output"; exit 0');
      writeFakeExec(path.join(tmpDir, 'timeout'), 'shift; exec "$@"');

      const result = spawnSync('bash', [SCRIPT_PATH], {
        cwd: tmpDir,
        env: { ...process.env, PATH: `${tmpDir}:${process.env.PATH}` },
        encoding: 'utf8',
      });
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('code review output');
    } finally {
      cleanup(tmpDir);
    }
  });

  test('implementation review mode: plan + git changes → exit 0', () => {
    const tmpDir = makeGitRepo({ withChanges: true });
    try {
      const planFile = path.join(tmpDir, 'plan.md');
      fs.writeFileSync(planFile, '# My Plan\n## Acceptance Criteria\n- Do the thing');
      writeFakeExec(path.join(tmpDir, 'codex'), 'echo "implementation review output"; exit 0');
      writeFakeExec(path.join(tmpDir, 'timeout'), 'shift; exec "$@"');

      const result = spawnSync('bash', [SCRIPT_PATH, planFile], {
        cwd: tmpDir,
        env: { ...process.env, PATH: `${tmpDir}:${process.env.PATH}` },
        encoding: 'utf8',
      });
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('implementation review output');
    } finally {
      cleanup(tmpDir);
    }
  });

  test('plan review mode: plan + no git changes → exit 0', () => {
    const tmpDir = makeGitRepo({ withChanges: false });
    try {
      const planFile = path.join(tmpDir, 'plan.md');
      fs.writeFileSync(planFile, '# My Plan');
      writeFakeExec(path.join(tmpDir, 'codex'), 'echo "plan review output"; exit 0');
      writeFakeExec(path.join(tmpDir, 'timeout'), 'shift; exec "$@"');

      const result = spawnSync('bash', [SCRIPT_PATH, planFile], {
        cwd: tmpDir,
        env: { ...process.env, PATH: `${tmpDir}:${process.env.PATH}` },
        encoding: 'utf8',
      });
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('plan review output');
    } finally {
      cleanup(tmpDir);
    }
  });

  test('exits 1 when no plan and no git repo', () => {
    const tmpDir = makeTempDir();
    try {
      writeFakeExec(path.join(tmpDir, 'codex'), 'echo "ok"; exit 0');

      const result = spawnSync('bash', [SCRIPT_PATH], {
        cwd: tmpDir,
        env: { ...process.env, PATH: `${tmpDir}:${process.env.PATH}` },
        encoding: 'utf8',
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toMatch(/nothing to review/i);
    } finally {
      cleanup(tmpDir);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Hook Suggestion Modes', () => {
  test('suggests implementation review when plan + git changes exist', () => {
    const tmpDir = makeGitRepo({ withChanges: true });
    try {
      const plansDir = path.join(tmpDir, 'plans');
      fs.mkdirSync(plansDir);
      fs.writeFileSync(path.join(plansDir, 'my-plan.md'), '# Plan');

      const result = runHook(tmpDir, { CCSETUP_CODEX_REVIEW: '1' });
      expect(result.status).toBe(0);

      const output = JSON.parse(result.stdout.trim());
      expect(output).toHaveProperty('message');
      expect(output.message).toMatch(/validate/i);
      expect(output.message).toContain('my-plan.md');
    } finally {
      cleanup(tmpDir);
    }
  });

  test('suggests code review when only git changes exist (no plan)', () => {
    const tmpDir = makeGitRepo({ withChanges: true });
    try {
      const result = runHook(tmpDir, { CCSETUP_CODEX_REVIEW: '1' });
      expect(result.status).toBe(0);

      const output = JSON.parse(result.stdout.trim());
      expect(output).toHaveProperty('message');
      expect(output.message).toMatch(/code review/i);
    } finally {
      cleanup(tmpDir);
    }
  });

  test('suggests plan review when only plan exists (no git changes)', () => {
    const tmpDir = makeGitRepo({ withChanges: false });
    try {
      const plansDir = path.join(tmpDir, 'plans');
      fs.mkdirSync(plansDir);
      fs.writeFileSync(path.join(plansDir, 'my-plan.md'), '# Plan');

      const result = runHook(tmpDir, { CCSETUP_CODEX_REVIEW: '1' });
      expect(result.status).toBe(0);

      const output = JSON.parse(result.stdout.trim());
      expect(output).toHaveProperty('message');
      expect(output.message).toMatch(/second opinion/i);
    } finally {
      cleanup(tmpDir);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Skill File Validation (updated)', () => {
  test('skill documents all three review modes', () => {
    const content = fs.readFileSync(SKILL_PATH, 'utf8').toLowerCase();
    expect(content).toContain('plan review');
    expect(content).toContain('implementation review');
    expect(content).toContain('code review');
  });

  test('skill documents auto-detection behavior', () => {
    const content = fs.readFileSync(SKILL_PATH, 'utf8').toLowerCase();
    expect(content).toContain('auto-detect');
  });
});
