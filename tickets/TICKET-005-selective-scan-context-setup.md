# TICKET-005: Add Selective Scan-Context Setup Option

## Description
Enable users to run `npx ccsetup` and select only the scan-context feature without creating the full boilerplate structure. This allows existing projects to quickly add context to their CLAUDE.md file without modifying their project structure.

## Problem Statement
Currently, when users run `npx ccsetup`, they must go through the entire setup process including:
1. Creating/checking directories (docs, plans, tickets, agents)
2. Selecting agents
3. Handling file conflicts
4. Only then getting the option to scan context

For existing projects that only want to scan and generate context for their CLAUDE.md, this full process is overwhelming and unnecessary.

## Proposed Solution
Add a new option in the initial setup flow that allows users to:
1. Choose "Scan context only" as a setup mode
2. Skip all boilerplate creation steps
3. Go directly to repository scanning
4. Generate or update CLAUDE.md with context only

## Acceptance Criteria
- [x] Add initial setup mode selection when running `npx ccsetup`
- [x] Create "Scan context only" option that skips boilerplate creation
- [x] Preserve existing file structure when in scan-only mode
- [x] Allow creation of CLAUDE.md if it doesn't exist
- [x] Support updating existing CLAUDE.md with context
- [x] Provide clear feedback about what will/won't be created
- [x] Maintain backward compatibility with existing flags
- [x] Add `--scan-only` flag for direct access to this mode
- [x] Ensure graceful handling when run in empty directories
- [x] Update help text to reflect new option

## Technical Implementation

### 1. Setup Mode Selection
```bash
$ npx ccsetup
Welcome to ccsetup! 

What would you like to do?
1) Full Setup - Create complete Claude Code project structure
2) Scan Context Only - Add context to CLAUDE.md without changing project structure

Choose an option: 2

🔍 Scan Context Only Mode
This will analyze your repository and create/update CLAUDE.md with project context.
No other files or directories will be created or modified.

Continue? (Y/n): Y
```

### 2. Direct Flag Access
```bash
# Skip interactive selection
npx ccsetup --scan-only
npx ccsetup . --scan-only
```

### 3. Flow Diagram
```
npx ccsetup
    |
    v
[Setup Mode Selection]
    |
    ├─> Full Setup (existing flow)
    |
    └─> Scan Context Only
           |
           v
        [Check for existing files]
           |
           v
        [Scan repository]
           |
           v
        [Generate context]
           |
           v
        [Create/Update CLAUDE.md only]
```

### 4. Implementation Changes

#### Update bin/create-project.js
```javascript
// Add new flag
flags.scanOnly = args.includes('--scan-only');

// Add setup mode selection
async function selectSetupMode() {
  if (flags.scanOnly) return 'scan-only';
  if (flags.force || flags.dryRun) return 'full';
  
  const mode = await select({
    message: 'What would you like to do?',
    choices: [
      { name: 'Full Setup - Create complete Claude Code project structure', value: 'full' },
      { name: 'Scan Context Only - Add context to CLAUDE.md without changing project structure', value: 'scan-only' }
    ]
  });
  
  return mode;
}

// Main flow modification
async function main() {
  const setupMode = await selectSetupMode();
  
  if (setupMode === 'scan-only') {
    await scanOnlyMode();
    return;
  }
  
  // Existing full setup flow...
}

// New scan-only mode
async function scanOnlyMode() {
  console.log('\n🔍 Scan Context Only Mode');
  console.log('This will analyze your repository and create/update CLAUDE.md with project context.');
  console.log('No other files or directories will be created or modified.\n');
  
  if (!flags.force) {
    const confirm = await prompt('Continue? (Y/n): ');
    if (confirm.toLowerCase() === 'n') {
      console.log('Setup cancelled.');
      return;
    }
  }
  
  // Scan repository
  const scanResults = await scanRepositoryForContext(targetDir);
  if (!scanResults) {
    console.log('❌ Repository scanning failed.');
    return;
  }
  
  // Preview and confirm
  const confirmResult = await previewAndConfirmContext(scanResults.formattedContext);
  if (confirmResult === 'n' || confirmResult === 'no') {
    console.log('✅ Setup cancelled.');
    return;
  }
  
  // Check for existing CLAUDE.md
  const claudeMdPath = path.join(targetDir, 'CLAUDE.md');
  const exists = fs.existsSync(claudeMdPath);
  
  if (exists) {
    // Update existing
    const existingContent = fs.readFileSync(claudeMdPath, 'utf8');
    const merger = new ContextMerger(existingContent, scanResults.formattedContext);
    const merged = await merger.interactiveMerge();
    fs.writeFileSync(claudeMdPath, merged);
    console.log('✅ CLAUDE.md updated with project context!');
  } else {
    // Create new
    const template = getClaudeMdTemplate();
    const enhanced = await applyContextToTemplate(template, scanResults.formattedContext);
    fs.writeFileSync(claudeMdPath, enhanced);
    console.log('✅ CLAUDE.md created with project context!');
  }
  
  console.log('\nNext steps:');
  console.log('1. Review and customize CLAUDE.md for your project');
  console.log('2. Run `ccsetup` for full setup if you need agents and project structure');
  console.log('3. Use `ccsetup scan --update` to refresh context anytime');
}
```

## Example User Flows

### Existing Project - Scan Only
```bash
$ cd my-existing-project
$ npx ccsetup

Welcome to ccsetup!

What would you like to do?
> Scan Context Only - Add context to CLAUDE.md without changing project structure

🔍 Scan Context Only Mode
This will analyze your repository and create/update CLAUDE.md with project context.
No other files or directories will be created or modified.

Continue? (Y/n): Y

🔍 Scanning repository...
✅ Repository scan completed in 1.2s

📊 Detected project details:
   Node.js/TypeScript REST API
   Framework: Express.js, Prisma ORM
   Commands: 12 available scripts
   Patterns: MVC architecture, JWT auth

📝 Generated context preview:
[Shows context...]

Would you like to add this context to CLAUDE.md? (Y/n): Y
✅ CLAUDE.md created with project context!

Next steps:
1. Review and customize CLAUDE.md for your project
2. Run `ccsetup` for full setup if you need agents and project structure
3. Use `ccsetup scan --update` to refresh context anytime
```

### Direct Flag Usage
```bash
$ npx ccsetup --scan-only
🔍 Scan Context Only Mode
[Same flow as above, but skips mode selection]
```

### Empty Directory Handling
```bash
$ mkdir new-project && cd new-project
$ npx ccsetup --scan-only

🔍 Scan Context Only Mode
⚠️  Warning: Current directory is empty. 

Would you like to:
1) Create a minimal CLAUDE.md with basic template
2) Cancel and run full setup instead

Choose an option: 2
✅ Setup cancelled. Run `npx ccsetup` for full project setup.
```

## Benefits
- Minimal intrusion for existing projects
- Quick way to add Claude Code context without restructuring
- Clear separation of concerns (context vs. structure)
- Better user experience for different use cases
- Reduces friction for adoption in established projects

## Priority
High

## Status
✅ Completed - All acceptance criteria met with smart append implementation

## Dependencies
- Existing scanner modules
- Existing context generation
- ContextMerger from TICKET-004
- Interactive prompt libraries

## Notes
- Consider adding more granular options in interactive mode
- Could cache mode selection for repeated use
- Future enhancement: Remember user preferences
- Ensure this integrates well with the standalone `ccsetup scan` command

## Implementation Summary

The selective scan-context setup feature has been **fully implemented** following the Feature Development Workflow and PLAN-007 (Option A: Smart Append Strategy).

### Completed Features
- ✅ Added `--scan-only` flag support with direct access
- ✅ Created interactive mode selection for bare `npx ccsetup` command
- ✅ Implemented complete `scanOnlyMode()` function with smart append strategy
- ✅ Added `smartAppendContext()` helper function with marker-based content management
- ✅ Enhanced user communication with clear prompts and feedback
- ✅ Automatic backup creation before updates
- ✅ Graceful handling of empty directories
- ✅ Updated help text with prominent --scan-only documentation
- ✅ Added flag validation to prevent conflicts
- ✅ Comprehensive error handling and edge case management
- ✅ Clear "Next steps" guidance including backup cleanup

### Smart Append Implementation
Instead of using the broken ContextMerger, the implementation now:
1. Uses HTML comment markers (<!-- SCAN CONTEXT START/END -->) to delineate scan content
2. Intelligently replaces previous scan results while preserving user content
3. Creates or updates the "Additional Notes" section
4. Maintains clean formatting and structure
5. Provides automatic backups for safety

### User Experience Enhancements
- Clear confirmation prompts explaining what will happen
- Detailed feedback during the process
- Helpful next steps guidance
- Backup file references for safety
- Dry-run mode support

### Technical Improvements
- Input validation for all operations
- Proper error handling with fallback recovery
- Permission checking before file operations
- Clean content formatting with proper whitespace handling
- Backward compatibility maintained

### Status
✅ **COMPLETED** - All acceptance criteria met with smart append workaround for merge issues.

The feature is now fully functional and provides a seamless experience for users who want to scan their repository and update CLAUDE.md without creating the full boilerplate structure. The smart append approach ensures existing content is never lost while new context is cleanly integrated.

### Implementation Notes
- The "Interactive Setup" option shown in early design was not implemented in the final version
- The actual implementation includes more robust error handling and validation than originally planned
- Console messages and user prompts were refined during implementation for better UX
- The implementation is more feature-complete than the original specification