# TICKET-004: Improve CLI Interface for Scan-Context Feature

## Description
Enhance the user experience of the `--scan-context` flag by making it more discoverable and intuitive. Currently, the scan-context feature is implemented but could benefit from improvements in how users interact with it.

## Problem Statement
The current implementation has the following limitations:
1. The `--scan-context` flag is not prominently featured in the help text
2. Users may not discover this powerful feature without reading documentation
3. The scan only triggers automatically in specific conditions (existing files in current directory)
4. No option to re-scan after initial setup or to update existing context
5. Limited feedback during the scanning process

## Proposed Solution
1. Make scan-context more prominent in CLI help and documentation
2. Add a standalone mode for scanning existing projects
3. Provide better progress indicators during scanning
4. Allow context updates/merging for existing CLAUDE.md files
5. Add options to customize what gets scanned

## Acceptance Criteria
- [x] Update help text to prominently feature --scan-context with examples
- [x] Add `ccsetup scan` subcommand for standalone context scanning
- [x] Implement progress bar or detailed status during repository scan
- [x] Add `--update-context` flag to merge new context with existing CLAUDE.md
- [x] Add `--scan-depth` option to control scanning depth for large repos
- [x] Add `--scan-ignore` option to exclude patterns from scanning
- [x] Provide clear success/failure messages with actionable next steps
- [x] Add validation to ensure scan results are meaningful before applying
- [x] Create interactive mode for scan configuration
- [x] Add dry-run support for context scanning to preview changes

## Technical Implementation
### 1. Enhanced CLI Structure
```bash
# Current usage
ccsetup . --scan-context

# New subcommand approach
ccsetup scan                    # Scan current directory
ccsetup scan /path/to/project   # Scan specific directory
ccsetup scan --update           # Update existing context
ccsetup scan --depth 3          # Limit scan depth
ccsetup scan --ignore "*.test.js,dist/*"  # Ignore patterns
```

### 2. Interactive Scan Configuration
```bash
$ ccsetup scan
🔍 Repository Context Scanner

Would you like to:
1) Full scan - Analyze entire repository
2) Quick scan - Common files only
3) Custom scan - Configure what to scan
> 

Scanning options:
- [ ] Dependencies and package files
- [ ] Source code patterns
- [ ] Documentation files
- [ ] Configuration files
- [ ] Test files
```

### 3. Progress Indicators
```bash
🔍 Scanning repository...
├── Analyzing project structure... ✓
├── Detecting frameworks... ✓ (React, Express)
├── Parsing dependencies... ✓ (127 packages)
├── Identifying patterns... ⏳
└── Generating context... 

Progress: ████████░░ 80% | 234/292 files
```

### 4. Context Update Flow
```bash
$ ccsetup scan --update
📄 Existing CLAUDE.md detected

Current context sections:
✓ Project Overview
✓ Tech Stack
✗ Key Commands (outdated)
✗ Project Structure (new directories found)

Would you like to:
1) Replace all context
2) Update outdated sections only
3) Merge and review changes
4) Cancel
> 
```

## Example User Flows

### New Project Setup with Scan
```bash
$ npx ccsetup my-app
📁 Creating Claude Code project...
🔍 Would you like to scan for additional context? (Y/n): Y

Scanning...
✓ Found: TypeScript configuration
✓ Found: ESLint rules
✓ Found: Docker setup
✓ Found: GitHub Actions

Generated 15 lines of project context.
✅ Project created with enhanced context!
```

### Standalone Scan for Existing Project
```bash
$ ccsetup scan
🔍 Scanning current repository...

Detected:
- Python 3.9+ project with Django 4.2
- PostgreSQL database with migrations
- Redis for caching
- Celery for async tasks
- pytest for testing

📝 Generated comprehensive context (47 lines)

Would you like to:
1) Save to new CLAUDE.md
2) Update existing CLAUDE.md
3) Copy to clipboard
4) Preview and edit
> 
```

### Update Existing Context
```bash
$ ccsetup scan --update
📄 Analyzing existing CLAUDE.md...

Changes detected:
+ New dependency: stripe (v3.0.0)
+ New command: npm run migrate
~ Updated structure: /src/payments added
- Removed: Legacy /src/billing directory

Preview changes? (Y/n): Y
[Shows diff view]

Apply updates? (Y/n): Y
✅ CLAUDE.md updated with latest project context!
```

## Benefits
- Increased discoverability of context scanning feature
- Better user experience with clear feedback
- More control over what gets scanned
- Ability to keep context up-to-date as project evolves
- Reduced setup time for Claude Code in existing projects
- More accurate AI assistance due to better context

## Priority
High

## Status
Done

## Dependencies
- Existing RepositoryScanner module
- Existing ContextGenerator module
- CLI argument parser
- Interactive prompt library (@inquirer/prompts)

## Notes
- Consider caching scan results for large repositories
- Add support for monorepo detection and handling
- Could extend to support context profiles (e.g., "frontend-only", "backend-only")
- Ensure backward compatibility with existing --scan-context flag

## Implementation Summary

The scan-context CLI improvements have been successfully implemented following the Feature Development Workflow:

### Files Created
1. **bin/scan.js** - Standalone scan subcommand with comprehensive argument parsing
2. **lib/progressReporter.js** - Detailed progress feedback system with phase tracking
3. **lib/contextMerger.js** - Intelligent context merging with change detection
4. **lib/scanConfig.js** - Interactive scan configuration with preset modes

### Files Modified
1. **bin/create-project.js** - Added subcommand detection and enhanced help text
2. **package.json** - Added missing dependencies (clipboardy, @inquirer/prompts)

### Key Features Implemented
- **Standalone `ccsetup scan` command** with full functionality
- **Enhanced help text** with ⭐ indicators and detailed examples
- **Progress indicators** showing real-time scanning phases and statistics
- **Context update/merge** capability with intelligent change detection
- **Scan customization** via --depth and --ignore options
- **Interactive configuration** with Full, Quick, Minimal, and Custom modes
- **Multiple output formats** (md, json, clipboard)
- **Dry-run support** for previewing changes
- **Backward compatibility** with existing --scan-context flag

### Quality Assurance Results
- ✅ All acceptance criteria met
- ✅ Comprehensive error handling implemented
- ✅ Security measures in place (path validation, input sanitization)
- ✅ Performance optimizations (depth limiting, file count limits)
- ✅ Excellent user experience with clear feedback

### Minor Issues Addressed
- Added missing dependencies to package.json
- Implemented proper path validation
- Added comprehensive error handling

### Future Enhancements
- Unit and integration tests need to be written
- Configuration persistence for reuse
- Caching layer for large repositories
- Plugin architecture for custom scanners

The implementation significantly improves the discoverability and usability of the scan-context feature, making it easier for users to leverage ccsetup's powerful repository analysis capabilities.