const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const BIN = path.join(ROOT, 'bin', 'create-project.js');
const TEMPLATE_DIR = path.join(ROOT, 'template');
const AGENTS_DIR = path.join(TEMPLATE_DIR, '.claude', 'agents');
const TEST_OUTPUT = path.join(__dirname, 'test-output');

function run(args, opts = {}) {
  const cmd = `node ${BIN} ${args}`;
  return execSync(cmd, {
    cwd: opts.cwd || ROOT,
    encoding: 'utf8',
    timeout: 30000,
    env: { ...process.env, FORCE_COLOR: '0' },
    ...opts,
  });
}

function cleanup(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

beforeEach(() => {
  cleanup(TEST_OUTPUT);
  fs.mkdirSync(TEST_OUTPUT, { recursive: true });
});

afterAll(() => {
  cleanup(TEST_OUTPUT);
});

describe('Template Source Verification', () => {
  test('template/.claude/agents/ has exactly 8 core agents', () => {
    const agents = fs.readdirSync(AGENTS_DIR)
      .filter(f => f.endsWith('.md') && f !== 'README.md');
    expect(agents).toHaveLength(8);
  });

  test('agent names match README listing', () => {
    const expected = [
      'backend.md', 'blockchain.md', 'checker.md', 'coder.md',
      'frontend.md', 'planner.md', 'researcher.md', 'shadcn.md',
    ];
    const actual = fs.readdirSync(AGENTS_DIR)
      .filter(f => f.endsWith('.md') && f !== 'README.md')
      .sort();
    expect(actual).toEqual(expected.sort());
  });

  test('template has expected base files', () => {
    expect(fs.existsSync(path.join(TEMPLATE_DIR, 'CLAUDE.md'))).toBe(true);
    expect(fs.existsSync(path.join(TEMPLATE_DIR, '.claude', 'settings.json'))).toBe(true);
    expect(fs.existsSync(path.join(TEMPLATE_DIR, 'docs', 'ROADMAP.md'))).toBe(true);
    expect(fs.existsSync(path.join(TEMPLATE_DIR, 'docs', 'agent-orchestration.md'))).toBe(true);
    expect(fs.existsSync(path.join(TEMPLATE_DIR, 'tickets', 'README.md'))).toBe(true);
    expect(fs.existsSync(path.join(TEMPLATE_DIR, 'plans', 'README.md'))).toBe(true);
  });
});

describe('CLI Help & Flag Parsing', () => {
  test('--help shows usage information', () => {
    const output = run('--help');
    expect(output).toContain('Usage: ccsetup');
    expect(output).toContain('--scan-only');
    expect(output).toContain('--force');
    expect(output).toContain('--dry-run');
    expect(output).toContain('--agents');
    expect(output).toContain('--all-agents');
  });

  test('conflicting flags --all-agents and --no-agents exits with error', () => {
    expect(() => {
      run('test-proj --all-agents --no-agents', { stdio: 'pipe' });
    }).toThrow();
  });

  test('conflicting flags --scan-only and --all-agents exits with error', () => {
    expect(() => {
      run('--scan-only --all-agents', { stdio: 'pipe' });
    }).toThrow();
  });
});

describe('Project Name Validation', () => {
  test('rejects path traversal attempts', () => {
    expect(() => {
      run('../evil-project --force --dry-run', { stdio: 'pipe' });
    }).toThrow();
  });

  test('rejects names with invalid characters', () => {
    expect(() => {
      run('"project<name" --force --dry-run', { stdio: 'pipe' });
    }).toThrow();
  });
});

describe('Project Creation (--dry-run)', () => {
  test('dry-run creates no files', () => {
    try {
      run('dry-run-project --force --dry-run --all-agents', { cwd: TEST_OUTPUT });
    } catch {
      // dry-run may exit with non-zero
    }

    expect(fs.existsSync(path.join(TEST_OUTPUT, 'dry-run-project'))).toBe(false);
  });
});

describe('Project Creation (--force)', () => {
  test('creates project with expected structure and agents', () => {
    run('full-project --force --all-agents', { cwd: TEST_OUTPUT });

    const projDir = path.join(TEST_OUTPUT, 'full-project');

    expect(fs.existsSync(path.join(projDir, 'CLAUDE.md'))).toBe(true);
    expect(fs.existsSync(path.join(projDir, '.claude'))).toBe(true);
    expect(fs.existsSync(path.join(projDir, '.claude', 'settings.json'))).toBe(true);
    expect(fs.existsSync(path.join(projDir, 'docs'))).toBe(true);
    expect(fs.existsSync(path.join(projDir, 'docs', 'ROADMAP.md'))).toBe(true);
    expect(fs.existsSync(path.join(projDir, 'docs', 'agent-orchestration.md'))).toBe(true);
    expect(fs.existsSync(path.join(projDir, 'tickets'))).toBe(true);
    expect(fs.existsSync(path.join(projDir, 'plans'))).toBe(true);

    const agentsDir = path.join(projDir, '.claude', 'agents');
    expect(fs.existsSync(agentsDir)).toBe(true);
    const agents = fs.readdirSync(agentsDir)
      .filter(f => f.endsWith('.md') && f !== 'README.md');
    expect(agents).toHaveLength(8);
  });

  test('--no-agents skips agent files', () => {
    run('no-agents-project --force --no-agents', { cwd: TEST_OUTPUT });

    const agentsDir = path.join(TEST_OUTPUT, 'no-agents-project', '.claude', 'agents');
    if (fs.existsSync(agentsDir)) {
      const agents = fs.readdirSync(agentsDir)
        .filter(f => f.endsWith('.md') && f !== 'README.md');
      expect(agents).toHaveLength(0);
    }
  });
});

describe('Scan Subcommand', () => {
  test('scan --help shows scan-specific usage', () => {
    const output = run('scan --help');
    expect(output).toContain('--update');
    expect(output).toContain('--merge-strategy');
    expect(output).toContain('--dry-run');
  });
});

describe('Package Metadata', () => {
  test('package.json description matches actual agent count', () => {
    const pkg = require(path.join(ROOT, 'package.json'));
    expect(pkg.description).not.toContain('50+');
    expect(pkg.description).toContain('8');
  });

  test('package.json bin points to existing file', () => {
    const pkg = require(path.join(ROOT, 'package.json'));
    const binPath = path.join(ROOT, pkg.bin.ccsetup);
    expect(fs.existsSync(binPath)).toBe(true);
  });
});
