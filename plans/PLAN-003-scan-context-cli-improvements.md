# PLAN-003: Enhanced Scan-Context CLI Interface Implementation

## Executive Summary
This plan outlines the implementation strategy for improving the scan-context CLI interface in ccsetup, making it more discoverable, user-friendly, and feature-rich. The improvements include adding a standalone `ccsetup scan` subcommand, enhanced progress indicators, context update capabilities, and customization options.

## Objectives
- [ ] Create standalone `ccsetup scan` subcommand for independent context scanning
- [ ] Enhance help text to prominently feature scan-context functionality
- [ ] Implement detailed progress indicators during repository scanning
- [ ] Add context update/merge capabilities for existing CLAUDE.md files
- [ ] Provide scan customization options (depth, ignore patterns)
- [ ] Create interactive scan configuration mode
- [ ] Maintain backward compatibility with existing --scan-context flag

## Architecture

### Module Structure
```
ccsetup/
├── bin/
│   ├── create-project.js    # Main CLI entry (modify)
│   └── scan.js              # New standalone scan command
├── lib/
│   ├── scanner/             # Existing scanner modules
│   ├── contextGenerator.js  # Existing (enhance)
│   ├── contextMerger.js     # New module for merging contexts
│   ├── progressReporter.js  # New module for progress feedback
│   └── scanConfig.js        # New module for scan configuration
└── package.json            # Update with new dependencies
```

### CLI Command Structure
```bash
# Main command (existing)
ccsetup [project-name] [options]

# New subcommand
ccsetup scan [path] [options]
  Options:
    --update        Update existing CLAUDE.md
    --depth <n>     Limit scan depth
    --ignore <patterns>  Exclude patterns
    --dry-run       Preview changes
    --interactive   Interactive configuration
    --format <type> Output format (md, json, clipboard)
```

## Implementation Phases

### Phase 1: CLI Infrastructure and Subcommand Setup (2-3 hours)

#### 1.1 Create bin/scan.js
```javascript
#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');
const ScanCommand = require('../lib/commands/scan');

program
  .name('ccsetup scan')
  .description('Scan repository and generate Claude Code context')
  .argument('[path]', 'Path to scan', '.')
  .option('--update', 'Update existing CLAUDE.md')
  .option('--depth <number>', 'Maximum scan depth', parseInt, 5)
  .option('--ignore <patterns>', 'Comma-separated ignore patterns')
  .option('--dry-run', 'Preview changes without applying')
  .option('--interactive', 'Interactive scan configuration')
  .option('--format <type>', 'Output format (md, json, clipboard)', 'md')
  .action(async (scanPath, options) => {
    const command = new ScanCommand();
    await command.execute(scanPath, options);
  });

program.parse();
```

#### 1.2 Update bin/create-project.js
```javascript
// Add subcommand detection
if (args[0] === 'scan') {
  require('./scan');
  return;
}

// Enhanced help text
const helpText = `
Usage: ccsetup [project-name] [options]
       ccsetup scan [path] [options]

Commands:
  ccsetup <name>    Create a new Claude Code project
  ccsetup scan      Scan repository for context (see 'ccsetup scan --help')

Options:
  --force, -f       Skip all prompts and overwrite existing files
  --dry-run, -d     Show what would be done without making changes
  --agents          Interactive agent selection mode
  --all-agents      Include all agents without prompting
  --no-agents       Skip agent selection entirely
  --browse-agents   Copy all agents to /agents folder for browsing
  --scan-context    Scan repository and add context to CLAUDE.md ⭐
  --help, -h        Show this help message

Context Scanning:
  The --scan-context flag analyzes your existing project to automatically
  populate CLAUDE.md with project-specific information including:
  • Tech stack and frameworks
  • Project structure
  • Available commands
  • Architectural patterns

Examples:
  ccsetup                      # Create in current directory
  ccsetup my-project           # Create in new directory
  ccsetup . --scan-context     # Create with automatic context scanning ⭐
  ccsetup scan                 # Scan current directory (standalone)
  ccsetup scan --update        # Update existing CLAUDE.md with new context
  ccsetup scan --interactive   # Configure what to scan interactively
`;
```

### Phase 2: Enhanced Help Text and Documentation (1-2 hours)

#### 2.1 Update Help Documentation
- Add prominent ⭐ indicators for scan features
- Include dedicated "Context Scanning" section
- Add more examples showing scan usage
- Create man page style documentation

#### 2.2 Update README.md
```markdown
## Context Scanning

ccsetup includes powerful repository scanning capabilities to automatically
understand your project structure and populate CLAUDE.md with relevant context.

### Quick Start
```bash
# Scan during project setup
npx ccsetup my-project --scan-context

# Standalone scanning
npx ccsetup scan

# Update existing context
npx ccsetup scan --update

# Interactive configuration
npx ccsetup scan --interactive
```

### What Gets Scanned
- Project type and language detection
- Framework and library identification  
- Build tools and scripts
- Project structure analysis
- Code patterns and conventions
```

### Phase 3: Progress Indicators and Feedback (2-3 hours)

#### 3.1 Create lib/progressReporter.js
```javascript
const ora = require('ora');
const chalk = require('chalk');

class ProgressReporter {
  constructor() {
    this.spinner = null;
    this.startTime = Date.now();
    this.filesScanned = 0;
    this.totalFiles = 0;
  }

  start(message = 'Scanning repository...') {
    this.spinner = ora({
      text: message,
      spinner: 'dots'
    }).start();
  }

  updateProgress(current, total, phase) {
    this.filesScanned = current;
    this.totalFiles = total;
    
    const percentage = Math.round((current / total) * 100);
    const progressBar = this.createProgressBar(percentage);
    
    this.spinner.text = `${phase} ${progressBar} ${percentage}% | ${current}/${total} files`;
  }

  createProgressBar(percentage) {
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;
    return chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  }

  phase(phaseName, details = '') {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    this.spinner.text = `${phaseName}... ${details} (${elapsed}s)`;
  }

  success(message) {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
    this.spinner.succeed(`${message} (completed in ${duration}s)`);
  }

  fail(message) {
    this.spinner.fail(message);
  }
}
```

#### 3.2 Integrate Progress Reporting
```javascript
// In scanner/index.js
async scan(progressReporter) {
  const phases = [
    { name: 'Analyzing project structure', weight: 20 },
    { name: 'Detecting frameworks', weight: 20 },
    { name: 'Parsing dependencies', weight: 20 },
    { name: 'Identifying patterns', weight: 20 },
    { name: 'Generating context', weight: 20 }
  ];

  for (const [index, phase] of phases.entries()) {
    progressReporter.phase(phase.name);
    await this[phase.method]();
    progressReporter.updateProgress(index + 1, phases.length, phase.name);
  }
}
```

### Phase 4: Context Update/Merge Functionality (3-4 hours)

#### 4.1 Create lib/contextMerger.js
```javascript
const diff = require('diff');
const chalk = require('chalk');

class ContextMerger {
  constructor(existingContext, newContext) {
    this.existing = this.parseContext(existingContext);
    this.new = this.parseContext(newContext);
    this.changes = [];
  }

  parseContext(content) {
    // Parse markdown sections into structured data
    const sections = {};
    const sectionRegex = /^##\s+(.+)$/gm;
    // ... parsing logic
    return sections;
  }

  detectChanges() {
    const changes = {
      added: [],
      modified: [],
      removed: []
    };

    // Compare sections
    for (const [key, value] of Object.entries(this.new)) {
      if (!this.existing[key]) {
        changes.added.push({ section: key, content: value });
      } else if (this.existing[key] !== value) {
        changes.modified.push({
          section: key,
          diff: diff.createPatch(key, this.existing[key], value)
        });
      }
    }

    // Check for removed sections
    for (const key of Object.keys(this.existing)) {
      if (!this.new[key]) {
        changes.removed.push({ section: key });
      }
    }

    return changes;
  }

  async interactiveMerge() {
    const changes = this.detectChanges();
    const choices = [];

    if (changes.added.length > 0) {
      choices.push({
        name: `Add ${changes.added.length} new sections`,
        value: 'add-all',
        sections: changes.added
      });
    }

    if (changes.modified.length > 0) {
      for (const mod of changes.modified) {
        choices.push({
          name: `Update ${mod.section}`,
          value: `update-${mod.section}`,
          diff: mod.diff
        });
      }
    }

    // Show diff preview and let user select changes
    const selected = await this.promptForChanges(choices);
    return this.applyChanges(selected);
  }

  generateDiff() {
    const changes = this.detectChanges();
    let output = '';

    for (const add of changes.added) {
      output += chalk.green(`+ ${add.section}\n`);
    }

    for (const mod of changes.modified) {
      output += chalk.yellow(`~ ${mod.section}\n`);
      output += mod.diff + '\n';
    }

    for (const rem of changes.removed) {
      output += chalk.red(`- ${rem.section}\n`);
    }

    return output;
  }
}
```

### Phase 5: Scan Customization Options (2-3 hours)

#### 5.1 Update Scanner Options
```javascript
// In scanner/index.js
class RepositoryScanner {
  constructor(projectPath, options = {}) {
    this.projectPath = projectPath;
    this.options = {
      maxDepth: options.depth || 5,
      ignorePatterns: this.parseIgnorePatterns(options.ignore),
      respectGitignore: options.respectGitignore !== false,
      maxFiles: options.maxFiles || 1000,
      timeout: options.timeout || 30000,
      ...options
    };
  }

  parseIgnorePatterns(patterns) {
    if (!patterns) return [];
    if (typeof patterns === 'string') {
      return patterns.split(',').map(p => p.trim());
    }
    return patterns;
  }

  shouldIgnore(filePath) {
    // Check gitignore
    if (this.options.respectGitignore && this.gitignore.ignores(filePath)) {
      return true;
    }

    // Check custom ignore patterns
    for (const pattern of this.options.ignorePatterns) {
      if (minimatch(filePath, pattern)) {
        return true;
      }
    }

    // Check depth
    const depth = filePath.split(path.sep).length;
    if (depth > this.options.maxDepth) {
      return true;
    }

    return false;
  }
}
```

### Phase 6: Interactive Scan Configuration (2-3 hours)

#### 6.1 Create lib/scanConfig.js
```javascript
const inquirer = require('@inquirer/prompts');

class ScanConfigurator {
  async configure() {
    const scanMode = await inquirer.select({
      message: 'Choose scan mode:',
      choices: [
        { name: 'Full Scan - Analyze entire repository', value: 'full' },
        { name: 'Quick Scan - Common files only', value: 'quick' },
        { name: 'Custom Scan - Configure what to scan', value: 'custom' }
      ]
    });

    if (scanMode === 'custom') {
      return await this.customConfiguration();
    }

    return this.getPresetConfig(scanMode);
  }

  async customConfiguration() {
    const options = await inquirer.checkbox({
      message: 'Select what to scan:',
      choices: [
        { name: 'Dependencies and package files', value: 'dependencies', checked: true },
        { name: 'Source code patterns', value: 'patterns', checked: true },
        { name: 'Documentation files', value: 'docs', checked: true },
        { name: 'Configuration files', value: 'config', checked: true },
        { name: 'Test files', value: 'tests', checked: false }
      ]
    });

    const depth = await inquirer.number({
      message: 'Maximum directory depth to scan:',
      default: 5,
      min: 1,
      max: 10
    });

    const customIgnore = await inquirer.input({
      message: 'Additional ignore patterns (comma-separated):',
      default: ''
    });

    return {
      scanOptions: options,
      depth,
      ignore: customIgnore
    };
  }

  getPresetConfig(mode) {
    const presets = {
      full: {
        scanOptions: ['dependencies', 'patterns', 'docs', 'config', 'tests'],
        depth: 10,
        ignore: ''
      },
      quick: {
        scanOptions: ['dependencies', 'patterns'],
        depth: 3,
        ignore: 'test/**,tests/**,__tests__/**'
      }
    };

    return presets[mode];
  }
}
```

## Technical Details

### New Dependencies
```json
{
  "dependencies": {
    "commander": "^11.0.0",
    "ora": "^6.0.0",
    "chalk": "^5.0.0",
    "diff": "^5.0.0",
    "clipboardy": "^3.0.0"
  }
}
```

### API Design
```javascript
// Standalone scan API
const scanner = new RepositoryScanner(path, options);
const results = await scanner.scan(progressReporter);
const context = contextGenerator.generate(results);

// Update API
const merger = new ContextMerger(existingContent, newContext);
const merged = await merger.interactiveMerge();

// Configuration API
const configurator = new ScanConfigurator();
const config = await configurator.configure();
```

## User Experience Flows

### Quick Scan Flow
```
$ ccsetup scan
🔍 Scanning current directory...
├── Analyzing project structure... ✓
├── Detecting frameworks... ✓ (React, Express)
├── Parsing dependencies... ✓ (127 packages)
├── Identifying patterns... ✓
└── Generating context... ✓

✅ Scan complete! (2.3s)

📊 Detected:
- Node.js/TypeScript project
- React frontend with Express backend
- Jest testing framework
- Docker deployment

Would you like to:
1) Save to CLAUDE.md
2) Copy to clipboard
3) Preview full context
> 
```

### Update Flow
```
$ ccsetup scan --update
📄 Found existing CLAUDE.md

Analyzing changes...
+ 3 new dependencies
~ 2 updated sections
- 0 removed sections

Preview changes? (Y/n): Y

[Diff view shown]

Apply updates? (Y/n): Y
✅ CLAUDE.md updated successfully!
```

### Interactive Configuration Flow
```
$ ccsetup scan --interactive
🔍 Repository Scanner Configuration

Choose scan mode:
> Full Scan - Analyze entire repository
  Quick Scan - Common files only
  Custom Scan - Configure what to scan

Select what to scan:
[x] Dependencies and package files
[x] Source code patterns
[x] Documentation files
[ ] Configuration files
[ ] Test files

Maximum directory depth: 5
Additional ignore patterns: vendor/,cache/

Starting scan with custom configuration...
```

## Risk Analysis & Mitigation

| Risk | Impact | Mitigation Strategy |
|------|--------|-------------------|
| Breaking existing --scan-context | High | Maintain full backward compatibility, extensive testing |
| Performance on large repos | Medium | Implement depth limits, file count limits, progress feedback |
| Complex merge conflicts | Medium | Provide clear diff views, selective merging, rollback option |
| User confusion with options | Low | Clear help text, sensible defaults, interactive mode |
| Invalid scan results | Low | Validation before applying, dry-run mode, preview option |

## Success Metrics
- [ ] All existing --scan-context functionality preserved
- [ ] Standalone scan command functional
- [ ] Progress indicators provide meaningful feedback
- [ ] Context updates work without data loss
- [ ] Interactive mode guides users effectively
- [ ] Performance acceptable on repos with 10k+ files
- [ ] Error messages are clear and actionable
- [ ] Documentation is comprehensive

## Implementation Timeline
- Phase 1: 2-3 hours (CLI infrastructure)
- Phase 2: 1-2 hours (Documentation)
- Phase 3: 2-3 hours (Progress indicators)
- Phase 4: 3-4 hours (Update/merge)
- Phase 5: 2-3 hours (Customization)
- Phase 6: 2-3 hours (Interactive mode)
- Testing: 2-3 hours

**Total estimate: 14-21 hours**

## Testing Strategy
1. **Unit tests** for each new module
2. **Integration tests** for CLI commands
3. **Manual testing** on various project types
4. **Performance testing** on large repositories
5. **User acceptance testing** with example workflows
6. **Regression testing** for existing functionality