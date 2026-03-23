# PLAN-004: Selective Scan-Context Setup Feature Implementation

## Executive Summary
This plan outlines the implementation strategy for adding a selective scan-context only mode to ccsetup. Users will be able to run `npx ccsetup` and choose to only scan their repository and create/update CLAUDE.md without creating any boilerplate structure. This feature addresses the needs of existing projects that want to add Claude Code context without modifying their project structure.

## Objectives
- [ ] Enable users to select "Scan context only" when running `npx ccsetup`
- [ ] Skip all boilerplate creation in scan-only mode
- [ ] Preserve existing project structure completely
- [ ] Create or update CLAUDE.md with repository context
- [ ] Add `--scan-only` flag for direct access
- [ ] Maintain backward compatibility with all existing functionality
- [ ] Provide clear user feedback throughout the process

## Architecture

### Integration Strategy
```
npx ccsetup
    |
    v
[Parse Flags & Args]
    |
    v
[Setup Mode Selection] <-- NEW
    |
    ├─> scan-only mode -----> [scanOnlyMode()] -----> [Exit]
    |
    └─> full mode -----> [Existing flow continues...]
```

### Module Structure
```
bin/
├── create-project.js    # Modified with mode selection
└── scan.js             # Existing standalone scan (unchanged)

lib/
├── scanner/            # Reused for scanning
├── contextGenerator.js # Reused for context generation
├── contextMerger.js    # Reused for CLAUDE.md updates
└── progressReporter.js # Reused for feedback
```

### Key Functions
1. **selectSetupMode()** - Interactive mode selection
2. **scanOnlyMode()** - Dedicated scan-only workflow
3. **getClaudeMdTemplate()** - Retrieve CLAUDE.md template
4. **validateScanOnlyEnvironment()** - Pre-scan validation

## Implementation Phases

### Phase 1: Setup Mode Selection Infrastructure (2-3 hours)

#### 1.1 Add Flag Support
```javascript
// In flag processing section (after line 19)
const flags = {
  force: false,
  dryRun: false,
  help: false,
  allAgents: false,
  noAgents: false,
  agents: false,
  browseAgents: false,
  scanContext: false,
  scanOnly: false  // NEW
};

// In argument processing loop (around line 41)
} else if (arg === '--scan-only') {
  flags.scanOnly = true;
```

#### 1.2 Create Mode Selection Function
```javascript
// Add after imports, before main()
async function selectSetupMode() {
  // Direct flag handling
  if (flags.scanOnly) return 'scan-only';
  if (flags.agents) return 'agents-only';
  if (flags.force || flags.browseAgents || flags.allAgents || flags.noAgents) return 'full';
  
  // Skip selection if already in a specific mode
  if (projectName !== '.' || flags.scanContext) return 'full';
  
  // Interactive selection for bare 'npx ccsetup'
  console.log('Welcome to ccsetup!\n');
  
  // Dynamic import for ESM module
  const selectModule = await import('@inquirer/select');
  const select = selectModule.default;
  
  const mode = await select({
    message: 'What would you like to do?',
    choices: [
      {
        name: 'Full Setup - Create complete Claude Code project structure',
        value: 'full',
        description: 'Creates agents, docs, tickets, and plans directories with boilerplate'
      },
      {
        name: 'Scan Context Only - Add context to CLAUDE.md without changing project structure',
        value: 'scan-only',
        description: 'Analyzes your code and creates/updates CLAUDE.md only'
      }
    ]
  });
  
  return mode;
}
```

#### 1.3 Modify Main Function Entry
```javascript
async function main() {
  try {
    // ... existing validation code ...
    
    // Add mode selection early (around line 625, before agent selection)
    const setupMode = await selectSetupMode();
    
    if (setupMode === 'scan-only') {
      // Close readline if open
      if (rl) {
        rl.close();
        rl = null;
      }
      await scanOnlyMode();
      return;
    }
    
    // Continue with existing full setup flow...
```

### Phase 2: Implement Scan-Only Mode (3-4 hours)

#### 2.1 Create Scan-Only Mode Function
```javascript
async function scanOnlyMode() {
  console.log('\n🔍 Scan Context Only Mode');
  console.log('This will analyze your repository and create/update CLAUDE.md with project context.');
  console.log('No other files or directories will be created or modified.\n');
  
  // Validate environment
  const validation = await validateScanOnlyEnvironment();
  if (!validation.valid) {
    console.error(`❌ ${validation.message}`);
    if (validation.suggestion) {
      console.log(`💡 ${validation.suggestion}`);
    }
    return;
  }
  
  // Confirmation prompt (unless --force)
  if (!flags.force && !flags.dryRun) {
    // Create readline interface if needed
    if (!rl) {
      rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
    }
    
    const confirm = await prompt('Continue? (Y/n): ');
    if (confirm.toLowerCase() === 'n') {
      console.log('Setup cancelled.');
      if (rl) rl.close();
      return;
    }
  }
  
  // Perform repository scan
  let repositoryContext = null;
  try {
    repositoryContext = await scanRepositoryForContext(targetDir);
  } catch (error) {
    console.error('❌ Repository scanning failed:', error.message);
    if (rl) rl.close();
    return;
  }
  
  if (!repositoryContext) {
    console.log('❌ Unable to generate context from repository.');
    console.log('💡 Tip: Make sure you\'re in a valid project directory.');
    if (rl) rl.close();
    return;
  }
  
  // Preview and confirm context
  if (!flags.force && !flags.dryRun) {
    const confirmResult = await previewAndConfirmContext(repositoryContext.formattedContext);
    if (confirmResult === 'n' || confirmResult === 'no') {
      console.log('✅ Setup cancelled.');
      if (rl) rl.close();
      return;
    }
  }
  
  // Handle CLAUDE.md creation/update
  const claudeMdPath = path.join(targetDir, 'CLAUDE.md');
  const exists = fs.existsSync(claudeMdPath);
  
  try {
    if (exists) {
      // Update existing CLAUDE.md
      console.log('\n📄 Updating existing CLAUDE.md...');
      
      if (!flags.dryRun) {
        const existingContent = fs.readFileSync(claudeMdPath, 'utf8');
        
        // Create backup
        const backupPath = `${claudeMdPath}.backup-${Date.now()}`;
        fs.writeFileSync(backupPath, existingContent);
        console.log(`📦 Backup created: ${path.basename(backupPath)}`);
        
        // Use ContextMerger
        const merger = new ContextMerger(existingContent, repositoryContext.formattedContext);
        const merged = await merger.merge({
          strategy: 'preserve-existing',
          interactive: !flags.force
        });
        
        fs.writeFileSync(claudeMdPath, merged, 'utf8');
        console.log('✅ CLAUDE.md updated with project context!');
      } else {
        console.log('  Would update: CLAUDE.md (dry-run mode)');
      }
    } else {
      // Create new CLAUDE.md
      console.log('\n📄 Creating CLAUDE.md...');
      
      if (!flags.dryRun) {
        const template = await getClaudeMdTemplate();
        const enhanced = await applyContextToTemplate(template, repositoryContext.formattedContext, 'append');
        fs.writeFileSync(claudeMdPath, enhanced, 'utf8');
        console.log('✅ CLAUDE.md created with project context!');
      } else {
        console.log('  Would create: CLAUDE.md (dry-run mode)');
      }
    }
    
    // Show next steps
    console.log('\nNext steps:');
    console.log('1. Review and customize CLAUDE.md for your specific needs');
    console.log('2. Add project-specific instructions and guidelines');
    if (!exists) {
      console.log('3. Run `npx ccsetup` for full setup if you need agents and project structure');
    }
    console.log(`${exists ? '3' : '4'}. Use \`ccsetup scan --update\` to refresh context anytime`);
    
  } catch (error) {
    console.error('❌ Error handling CLAUDE.md:', error.message);
    if (exists && !flags.dryRun) {
      console.log('💡 Your original CLAUDE.md is safe. Check for backup files if needed.');
    }
  } finally {
    if (rl) rl.close();
  }
}
```

#### 2.2 Create Helper Functions
```javascript
// Validate scan-only environment
async function validateScanOnlyEnvironment() {
  // Check directory exists and is accessible
  try {
    await fs.promises.access(targetDir, fs.constants.R_OK | fs.constants.W_OK);
  } catch (error) {
    return {
      valid: false,
      message: 'Cannot access target directory',
      suggestion: 'Check directory permissions'
    };
  }
  
  // Check if directory is empty (warning only)
  const files = await fs.promises.readdir(targetDir);
  const hasFiles = files.some(f => !f.startsWith('.') && f !== 'node_modules');
  
  if (!hasFiles && projectName === '.') {
    console.log('⚠️  Warning: Current directory appears to be empty.');
    console.log('   Scan results may be limited.\n');
  }
  
  return { valid: true };
}

// Get CLAUDE.md template
async function getClaudeMdTemplate() {
  const templatePath = path.join(__dirname, '..', 'template', 'CLAUDE.md');
  try {
    return await fs.promises.readFile(templatePath, 'utf8');
  } catch (error) {
    // Fallback to minimal template
    return `# Claude Code Project Instructions

## Project Overview
[Project description will be added here]

## Key Objectives
[Project objectives will be added here]

## Additional Notes
[Any other important information for Claude to know about this project]
`;
  }
}
```

### Phase 3: Update Help Text and Documentation (1 hour)

#### 3.1 Enhanced Help Text
```javascript
if (flags.help) {
  console.log(`
Usage: ccsetup [project-name] [options]
       ccsetup scan [path] [options]

Commands:
  ccsetup              Interactive mode - choose full setup or scan-only
  ccsetup <name>       Create a new Claude Code project
  ccsetup scan         Advanced repository scanning (see 'ccsetup scan --help')

Options:
  --scan-only      Skip project setup, only scan and create/update CLAUDE.md ⭐
  --force, -f      Skip all prompts and overwrite existing files
  --dry-run, -d    Show what would be done without making changes
  --agents         Interactive agent selection mode
  --all-agents     Include all agents without prompting
  --no-agents      Skip agent selection entirely
  --browse-agents  Copy all agents to /agents folder for browsing
  --scan-context   Scan repository and add context to CLAUDE.md
  --help, -h       Show this help message

Quick Start:
  npx ccsetup              # Interactive mode - choose what to do
  npx ccsetup --scan-only  # Just scan and create CLAUDE.md ⭐
  npx ccsetup my-project   # Full project setup

Scan-Only Mode:
  Perfect for existing projects! Analyzes your codebase and creates/updates
  CLAUDE.md with project context without modifying your project structure.
  
Examples:
  ccsetup --scan-only           # Scan current directory only
  ccsetup . --scan-only         # Same as above
  ccsetup --scan-only --force   # Skip confirmation prompts
  ccsetup --scan-only --dry-run # Preview what would happen

Full Setup Examples:
  ccsetup                      # Interactive setup in current directory
  ccsetup my-project           # Create in new directory
  ccsetup . --scan-context     # Full setup with context scanning
  ccsetup my-app --all-agents  # Include all agents automatically
`);
  process.exit(0);
}
```

### Phase 4: Edge Case and Error Handling (2 hours)

#### 4.1 Flag Validation
```javascript
// Add after flag processing
function validateFlags() {
  // Scan-only conflicts
  if (flags.scanOnly) {
    const conflictingFlags = [];
    if (flags.allAgents) conflictingFlags.push('--all-agents');
    if (flags.noAgents) conflictingFlags.push('--no-agents');
    if (flags.browseAgents) conflictingFlags.push('--browse-agents');
    if (flags.agents) conflictingFlags.push('--agents');
    
    if (conflictingFlags.length > 0) {
      console.error(`Error: --scan-only cannot be used with ${conflictingFlags.join(', ')}`);
      console.log('Tip: --scan-only skips all agent-related operations');
      process.exit(1);
    }
  }
  
  // Existing validations...
}
```

#### 4.2 Empty Directory Handling
```javascript
// In scanOnlyMode, after validation
if (!hasFiles && projectName === '.') {
  console.log('📝 Since the directory is empty, would you like to:');
  console.log('1) Create a minimal CLAUDE.md with basic template');
  console.log('2) Cancel and run full setup instead');
  
  const choice = await prompt('\nChoose an option (1/2): ');
  
  if (choice === '2') {
    console.log('\n💡 Run `npx ccsetup` without --scan-only for full project setup.');
    if (rl) rl.close();
    return;
  }
  
  // Continue with minimal context
  repositoryContext = {
    formattedContext: `
## Additional Notes

This project directory was empty when scanned. 
Please update this file with relevant project information as you develop.

### Getting Started
- Add project description above
- Define key objectives
- Document important conventions
- Update as the project evolves
`
  };
}
```

### Phase 5: Testing and Validation (2-3 hours)

#### Test Scenarios
1. **Basic scan-only flow**
   - Empty directory
   - Existing project without CLAUDE.md
   - Existing project with CLAUDE.md

2. **Flag combinations**
   - `--scan-only --force`
   - `--scan-only --dry-run`
   - `--scan-only` with conflicting flags

3. **Edge cases**
   - No write permissions
   - Corrupted CLAUDE.md
   - Very large repositories
   - Network file systems

4. **User experience**
   - Clear prompts and feedback
   - Error message clarity
   - Next steps guidance

## User Experience Flows

### Interactive Mode Selection
```
$ npx ccsetup

Welcome to ccsetup!

What would you like to do?
❯ Full Setup - Create complete Claude Code project structure
  Scan Context Only - Add context to CLAUDE.md without changing project structure

[User selects Scan Context Only]

🔍 Scan Context Only Mode
This will analyze your repository and create/update CLAUDE.md with project context.
No other files or directories will be created or modified.

Continue? (Y/n): _
```

### Direct Scan-Only Mode
```
$ npx ccsetup --scan-only

🔍 Scan Context Only Mode
This will analyze your repository and create/update CLAUDE.md with project context.
No other files or directories will be created or modified.

Continue? (Y/n): Y

🔍 Scanning repository...
├── Analyzing project structure... ✓ (2.3s)
├── Detecting project type... ✓ (nodejs)  
├── Parsing dependencies... ✓ (38 packages)
├── Extracting commands... ✓ (12 scripts)
└── Detecting patterns... ✓ (MVC, REST API)

✅ Repository scan completed (3.1s)

📊 Detected project details:
   Node.js/TypeScript REST API
   Framework: Express.js
   Testing: Jest, Supertest
   Database: PostgreSQL with Prisma ORM

📝 Generated context preview:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Shows context preview]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Would you like to add this context to CLAUDE.md? (Y/n/edit): Y

📄 Creating CLAUDE.md...
✅ CLAUDE.md created with project context!

Next steps:
1. Review and customize CLAUDE.md for your specific needs
2. Add project-specific instructions and guidelines
3. Run `npx ccsetup` for full setup if you need agents and project structure
4. Use `ccsetup scan --update` to refresh context anytime
```

## Risk Analysis & Mitigation

| Risk | Impact | Likelihood | Mitigation Strategy |
|------|--------|------------|-------------------|
| Breaking existing functionality | High | Low | Additive changes only, comprehensive testing |
| User confusion about modes | Medium | Medium | Clear descriptions, help text, examples |
| CLAUDE.md corruption | High | Low | Create backups, preview changes, atomic writes |
| Flag conflicts | Low | Medium | Validation with clear error messages |
| Performance on large repos | Medium | Low | Use existing limits and timeouts |
| Directory permission issues | Medium | Low | Pre-flight validation, clear errors |

## Success Metrics
- [ ] Mode selection appears for bare `npx ccsetup` command
- [ ] Scan-only mode creates/updates only CLAUDE.md
- [ ] No other files or directories modified in scan-only mode
- [ ] `--scan-only` flag works correctly
- [ ] All existing functionality remains intact
- [ ] Clear user feedback throughout the process
- [ ] Error handling covers all edge cases
- [ ] Help text clearly explains the feature

## Implementation Timeline
- Phase 1: 2-3 hours (Setup mode selection)
- Phase 2: 3-4 hours (Scan-only implementation)
- Phase 3: 1 hour (Documentation)
- Phase 4: 2 hours (Edge cases)
- Phase 5: 2-3 hours (Testing)

**Total estimate: 10-13 hours**

## Dependencies
- Existing scanner infrastructure
- ContextMerger from TICKET-004
- @inquirer/select for mode selection
- Existing validation and error handling patterns

## Future Enhancements
- Remember user's preferred mode
- Support for `.ccsetuprc` configuration
- Integration with CI/CD workflows
- Template selection for CLAUDE.md
- Batch processing multiple projects