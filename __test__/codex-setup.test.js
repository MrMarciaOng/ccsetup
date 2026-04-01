const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const BIN = path.join(ROOT, 'bin', 'create-project.js');
const TEST_OUTPUT = path.join(__dirname, 'codex-setup-output');
function cleanup(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function createProject(name, env = {}) {
  execSync(`node ${BIN} ${name} --force --all-agents`, {
    cwd: TEST_OUTPUT,
    encoding: 'utf8',
    timeout: 30000,
    env: {
      ...process.env,
      FORCE_COLOR: '0',
      ...env,
    },
  });

  return path.join(TEST_OUTPUT, name);
}

beforeEach(() => {
  cleanup(TEST_OUTPUT);
  fs.mkdirSync(TEST_OUTPUT, { recursive: true });
});

afterAll(() => {
  cleanup(TEST_OUTPUT);
});

describe('AI Provider Setup', () => {
  test('force mode defaults to Claude setup', () => {
    const projDir = createProject('claude-default');

    expect(fs.existsSync(path.join(projDir, 'CLAUDE.md'))).toBe(true);
    expect(fs.existsSync(path.join(projDir, '.claude'))).toBe(true);
    expect(fs.existsSync(path.join(projDir, 'AGENTS.md'))).toBe(false);
    expect(fs.existsSync(path.join(projDir, '.codex'))).toBe(false);
  });

  test('codex mode creates AGENTS.md and .codex assets without .claude', () => {
    const projDir = createProject('codex-only', { CCSETUP_AI_PROVIDER: 'codex' });

    expect(fs.existsSync(path.join(projDir, 'AGENTS.md'))).toBe(true);
    expect(fs.existsSync(path.join(projDir, '.codex', 'README.md'))).toBe(true);
    expect(fs.existsSync(path.join(projDir, '.codex', 'install-skills.sh'))).toBe(false);
    expect(fs.existsSync(path.join(projDir, '.codex', 'skills', 'prd', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(projDir, '.codex', 'skills', 'ralph', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(projDir, '.codex', 'skills', 'claude-review', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(projDir, '.codex', 'skills', 'secops', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(projDir, '.codex', 'skills', 'project-workflow'))).toBe(false);
    expect(fs.existsSync(path.join(projDir, 'docs', 'codex-setup.md'))).toBe(true);
    expect(fs.existsSync(path.join(projDir, 'CLAUDE.md'))).toBe(false);
    expect(fs.existsSync(path.join(projDir, '.claude'))).toBe(false);
  });

  test('both mode creates Claude and Codex assets together', () => {
    const projDir = createProject('both-providers', { CCSETUP_AI_PROVIDER: 'both' });

    expect(fs.existsSync(path.join(projDir, 'CLAUDE.md'))).toBe(true);
    expect(fs.existsSync(path.join(projDir, '.claude', 'settings.json'))).toBe(true);
    expect(fs.existsSync(path.join(projDir, 'AGENTS.md'))).toBe(true);
    expect(fs.existsSync(path.join(projDir, '.codex', 'README.md'))).toBe(true);
    expect(fs.existsSync(path.join(projDir, '.codex', 'skills', 'prd', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(projDir, '.codex', 'skills', 'ralph', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(projDir, '.codex', 'skills', 'claude-review', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(projDir, '.codex', 'skills', 'secops', 'SKILL.md'))).toBe(true);
  });

  test('--agents exits early in codex mode without Claude agent flow', () => {
    const result = spawnSync('node', [BIN, 'codex-agents', '--agents'], {
      cwd: TEST_OUTPUT,
      encoding: 'utf8',
      env: {
        ...process.env,
        FORCE_COLOR: '0',
        CCSETUP_AI_PROVIDER: 'codex',
      },
      timeout: 30000,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Claude agent selection is only available for Claude Code setup.');
    expect(result.stdout).not.toContain('claude init');
  });

  test('--agents in both mode makes Claude-only scope explicit', () => {
    const result = spawnSync('node', [BIN, 'both-agents', '--agents'], {
      cwd: TEST_OUTPUT,
      encoding: 'utf8',
      env: {
        ...process.env,
        FORCE_COLOR: '0',
        CCSETUP_AI_PROVIDER: 'both',
      },
      input: '\u001b',
      timeout: 30000,
    });

    expect(result.stdout).toContain('This step configures Claude Code agents only.');
  });
});
