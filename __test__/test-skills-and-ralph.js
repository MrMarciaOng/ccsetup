const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TEMPLATE_DIR = path.join(ROOT, 'template');
const SKILLS_DIR = path.join(TEMPLATE_DIR, '.claude', 'skills');
const RALPH_SCRIPTS_DIR = path.join(TEMPLATE_DIR, 'scripts', 'ralph');
const HOOKS_DIR = path.join(TEMPLATE_DIR, 'hooks', 'workflow-selector');

describe('Skills — Template File Structure', () => {
  test('skills directory exists with prd and ralph', () => {
    expect(fs.existsSync(SKILLS_DIR)).toBe(true);
    const skills = fs.readdirSync(SKILLS_DIR);
    expect(skills).toContain('prd');
    expect(skills).toContain('ralph');
  });

  test('each skill has a SKILL.md file', () => {
    expect(fs.existsSync(path.join(SKILLS_DIR, 'prd', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(SKILLS_DIR, 'ralph', 'SKILL.md'))).toBe(true);
  });
});

describe('Skills — /prd SKILL.md', () => {
  let content;

  beforeAll(() => {
    content = fs.readFileSync(path.join(SKILLS_DIR, 'prd', 'SKILL.md'), 'utf8');
  });

  test('has valid frontmatter with name and description', () => {
    expect(content).toMatch(/^---\nname: prd\n/);
    expect(content).toMatch(/description: ".+"/);
  });

  test('includes codebase reconnaissance step', () => {
    expect(content).toContain('## Step 1: Codebase Reconnaissance');
    expect(content).toContain('Detect Tech Stack');
    expect(content).toContain('Detect Quality Checks');
    expect(content).toContain('Scan Architecture');
    expect(content).toContain('Read Project Context');
  });

  test('scans for multiple language ecosystems', () => {
    expect(content).toContain('package.json');
    expect(content).toContain('tsconfig.json');
    expect(content).toContain('requirements.txt');
    expect(content).toContain('go.mod');
    expect(content).toContain('Cargo.toml');
    expect(content).toContain('Gemfile');
    expect(content).toContain('composer.json');
  });

  test('detects quality checks dynamically', () => {
    expect(content).toContain('tsconfig.json');
    expect(content).toContain('eslint');
    expect(content).toContain('jest');
    expect(content).toContain('vitest');
    expect(content).toContain('Do not hardcode');
  });

  test('includes Tech Context section in PRD structure', () => {
    expect(content).toContain('### 2. Tech Context');
    expect(content).toContain('Quality gates');
    expect(content).toContain('Relevant existing code');
  });

  test('includes codebase-informed clarifying questions', () => {
    expect(content).toContain('Codebase-Informed Questions');
    expect(content).toContain('Skip questions the codebase already answers');
  });

  test('example PRD includes Tech Context section', () => {
    expect(content).toContain('## Tech Context');
    expect(content).toContain('prisma/schema.prisma');
    expect(content).toContain('src/components/ui/Badge.tsx');
  });

  test('references real file paths in example stories', () => {
    expect(content).toContain('`prisma/schema.prisma`');
    expect(content).toContain('`src/components/TaskCard.tsx`');
    expect(content).toContain('PATCH `/api/tasks/[id]`');
  });

  test('checklist includes reconnaissance and codebase-aware items', () => {
    expect(content).toContain('Ran codebase reconnaissance');
    expect(content).toContain('Tech Context section reflects actual project stack');
    expect(content).toContain('Quality criteria match what the project actually uses');
    expect(content).toContain('User stories reference real file paths');
  });

  test('output location is tasks/', () => {
    expect(content).toContain('`tasks/`');
    expect(content).toContain('prd-[feature-name].md');
  });
});

describe('Skills — /ralph SKILL.md', () => {
  let content;

  beforeAll(() => {
    content = fs.readFileSync(path.join(SKILLS_DIR, 'ralph', 'SKILL.md'), 'utf8');
  });

  test('has valid frontmatter with name and description', () => {
    expect(content).toMatch(/^---\nname: ralph\n/);
    expect(content).toMatch(/description: ".+"/);
  });

  test('includes codebase reconnaissance step', () => {
    expect(content).toContain('## Step 1: Codebase Reconnaissance');
    expect(content).toContain('Detect quality commands');
    expect(content).toContain('Scan relevant files');
  });

  test('reads Tech Context from PRD when available', () => {
    expect(content).toContain('If PRD has a Tech Context section');
    expect(content).toContain('no need to re-scan');
  });

  test('prd.json schema includes qualityChecks field', () => {
    expect(content).toContain('"qualityChecks"');
    expect(content).toContain('"typecheck"');
    expect(content).toContain('"lint"');
    expect(content).toContain('"test"');
  });

  test('documents qualityChecks as exact commands', () => {
    expect(content).toContain('exact commands to run');
    expect(content).toContain('npm run typecheck');
    expect(content).toContain('npm run lint');
    expect(content).toContain('Be exact');
  });

  test('story notes are pre-populated with file hints', () => {
    expect(content).toContain('Pre-populate with **file hints**');
    expect(content).toContain('Relevant files:');
  });

  test('does not hardcode quality criteria', () => {
    expect(content).toContain('Do **not** hardcode');
    expect(content).toContain('use what the project actually has');
  });

  test('example output includes qualityChecks and file-aware notes', () => {
    expect(content).toContain('"qualityChecks":');
    expect(content).toContain('"npx tsc --noEmit"');
    expect(content).toContain('Relevant files: prisma/schema.prisma');
    expect(content).toContain('src/components/TaskCard.tsx (extend)');
  });

  test('conversion rules include qualityChecks and notes', () => {
    expect(content).toContain('**qualityChecks**: Populated from detected project commands');
    expect(content).toContain('**notes**: Pre-populate with relevant file paths');
  });

  test('checklist includes new fields', () => {
    expect(content).toContain('`qualityChecks` populated with exact commands');
    expect(content).toContain('Story `notes` pre-populated with relevant file paths');
    expect(content).toContain('Story quality criteria match what `qualityChecks` contains');
  });
});

describe('Ralph — Agent Instructions (CLAUDE.md)', () => {
  let content;

  beforeAll(() => {
    content = fs.readFileSync(path.join(RALPH_SCRIPTS_DIR, 'CLAUDE.md'), 'utf8');
  });

  test('mentions subagent and checker verification', () => {
    expect(content).toContain('Spawn a reviewer subagent');
    expect(content).toContain('checker subagent');
    expect(content).toContain('subagent_type: "checker"');
  });

  test('reads qualityChecks from prd.json', () => {
    expect(content).toContain('qualityChecks');
    expect(content).toContain('exact commands');
    expect(content).toContain('Do not guess commands');
  });

  test('reads story notes for file hints', () => {
    expect(content).toContain("Read the story's `notes` field for file hints");
  });

  test('has verification instructions with acceptance criteria check', () => {
    expect(content).toContain('## Verification — Spawn a Reviewer Subagent');
    expect(content).toContain('APPROVED');
    expect(content).toContain('CHANGES_REQUESTED');
    expect(content).toContain('Maximum 3 review cycles');
  });

  test('commits only after reviewer approves', () => {
    expect(content).toContain('Commit only after reviewer APPROVES');
    expect(content).toContain('If reviewer approves: commit');
  });

  test('progress report includes review results', () => {
    expect(content).toContain('Review result:');
    expect(content).toContain('Review cycles:');
    expect(content).toContain('Reviewer catches');
  });

  test('has fallback for missing qualityChecks', () => {
    expect(content).toContain('qualityChecks` is missing');
    expect(content).toContain('fall back to detecting commands');
  });

  test('still has stop condition with COMPLETE signal', () => {
    expect(content).toContain('<promise>COMPLETE</promise>');
  });
});

describe('Ralph — Shell Script (ralph.sh)', () => {
  let content;

  beforeAll(() => {
    content = fs.readFileSync(path.join(RALPH_SCRIPTS_DIR, 'ralph.sh'), 'utf8');
  });

  test('script is executable', () => {
    const stats = fs.statSync(path.join(RALPH_SCRIPTS_DIR, 'ralph.sh'));
    const isExecutable = (stats.mode & 0o111) !== 0;
    expect(isExecutable).toBe(true);
  });

  test('supports --tool flag with amp and claude options', () => {
    expect(content).toContain('--tool)');
    expect(content).toContain('TOOL="amp"');
    expect(content).toContain('"amp"');
    expect(content).toContain('"claude"');
  });

  test('supports --model flag', () => {
    expect(content).toContain('--model)');
    expect(content).toContain('MODEL=');
  });

  test('defaults to 10 max iterations', () => {
    expect(content).toContain('MAX_ITERATIONS=10');
  });

  test('archives previous runs when branch changes', () => {
    expect(content).toContain('Archive previous run if branch changed');
    expect(content).toContain('ARCHIVE_DIR');
    expect(content).toContain('mkdir -p "$ARCHIVE_FOLDER"');
  });

  test('checks for COMPLETE signal to exit', () => {
    expect(content).toContain('<promise>COMPLETE</promise>');
    expect(content).toContain('Ralph completed all tasks');
  });

  test('initializes progress.txt if missing', () => {
    expect(content).toContain('Initialize progress file');
    expect(content).toContain('Ralph Progress Log');
  });

  test('uses claude --dangerously-skip-permissions for autonomous mode', () => {
    expect(content).toContain('--dangerously-skip-permissions');
  });
});

describe('Workflow Selector Hook', () => {
  let content;

  beforeAll(() => {
    content = fs.readFileSync(path.join(HOOKS_DIR, 'index.js'), 'utf8');
  });

  test('has environment variable toggle at the top', () => {
    expect(content).toContain('process.env.CCSETUP_WORKFLOW');
    expect(content).toContain("enabled !== '1'");
    expect(content).toContain('process.exit(0)');
  });

  test('exits silently with empty JSON when disabled', () => {
    const lines = content.split('\n');
    const exitIndex = lines.findIndex(l => l.includes('process.exit(0)'));
    const jsonOutputIndex = lines.findIndex(l => l.includes("console.log('{}')") && lines.indexOf(l) < exitIndex);
    expect(jsonOutputIndex).toBeGreaterThan(-1);
    expect(jsonOutputIndex).toBeLessThan(exitIndex);
  });

  test('env var check happens before any expensive operations', () => {
    const exitIndex = content.indexOf('process.exit(0)');
    const classIndex = content.indexOf('class WorkflowSelector');
    expect(exitIndex).toBeLessThan(classIndex);
  });

  test('output message asks Claude to check with user', () => {
    expect(content).toContain('Ask the user');
    expect(content).toContain('proceed normally with Claude Code\'s default behavior');
  });

  test('supports both "1" and "true" as enabled values', () => {
    expect(content).toContain("enabled !== '1'");
    expect(content).toContain("enabled.toLowerCase() !== 'true'");
  });

  test('hook is disabled by default (env var must be explicitly set)', () => {
    const result = execSync(
      `echo '{"prompt":"add a new feature"}' | node ${path.join(HOOKS_DIR, 'index.js')}`,
      { encoding: 'utf8', env: { ...process.env, CCSETUP_WORKFLOW: undefined } }
    ).trim();
    expect(result).toBe('{}');
  });

  test('hook produces output when CCSETUP_WORKFLOW=1 and prompt is empty', () => {
    const result = execSync(
      `echo '{"prompt":""}' | node ${path.join(HOOKS_DIR, 'index.js')}`,
      { encoding: 'utf8', env: { ...process.env, CCSETUP_WORKFLOW: '1' } }
    ).trim();
    expect(result).toBe('{}');
  });
});

describe('Template CLAUDE.md — Documentation', () => {
  let content;

  beforeAll(() => {
    content = fs.readFileSync(path.join(TEMPLATE_DIR, 'CLAUDE.md'), 'utf8');
  });

  test('documents skills section', () => {
    expect(content).toContain('## Skills (Slash Commands)');
    expect(content).toContain('/prd');
    expect(content).toContain('/ralph');
  });

  test('documents ralph autonomous loop', () => {
    expect(content).toContain('## Ralph');
    expect(content).toContain('ralph.sh');
    expect(content).toContain('--tool claude');
  });

  test('documents workflow selector as optional', () => {
    expect(content).toContain('## Workflow Selector Hook (Optional)');
    expect(content).toContain('CCSETUP_WORKFLOW=1');
    expect(content).toContain('--install-hooks');
  });

  test('project structure includes skills and scripts', () => {
    expect(content).toContain('skills/');
    expect(content).toContain('scripts/');
    expect(content).toContain('ralph/');
  });
});

describe('README.md — Documentation', () => {
  let content;

  beforeAll(() => {
    content = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  });

  test('documents skills in project structure', () => {
    expect(content).toContain('skills/');
    expect(content).toContain('/prd and /ralph slash commands');
  });

  test('documents ralph section with usage examples', () => {
    expect(content).toContain('## Ralph');
    expect(content).toContain('--tool claude');
    expect(content).toContain('--model opus');
    expect(content).toContain('checker subagent');
  });

  test('documents workflow selector as optional with env var', () => {
    expect(content).toContain('Workflow Selector Hook (Optional)');
    expect(content).toContain('CCSETUP_WORKFLOW=1');
    expect(content).toContain('--install-hooks');
  });

  test('ralph workflow steps are documented', () => {
    expect(content).toContain('/prd');
    expect(content).toContain('/ralph');
    expect(content).toContain('ralph.sh');
  });
});
