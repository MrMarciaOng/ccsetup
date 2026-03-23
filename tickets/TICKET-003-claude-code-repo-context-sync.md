# TICKET-003: Add Claude Code Repository Context Sync

## Description
Enhance ccsetup to leverage Claude Code's repository scanning capabilities when setting up in existing projects. When ccsetup detects existing files in a repository, it should offer to invoke Claude Code commands to scan the repository and automatically populate the CLAUDE.md file with project-specific context.

## Problem Statement
Currently, when ccsetup is run in an existing project, it creates a generic CLAUDE.md file that lacks project-specific context. Users must manually update the "Additional Notes" section with relevant project information. This misses an opportunity to leverage Claude Code's ability to understand codebases.

## Proposed Solution
1. When ccsetup detects existing files in the repository
2. Check if Claude Code is available
3. Offer to scan the repository for context
4. Use the gathered context to populate CLAUDE.md with:
   - Detected project type and tech stack
   - Key architectural patterns found
   - Important files and directories
   - Existing commands from package.json/Makefile/etc
   - Project-specific conventions detected

## Acceptance Criteria
- [x] Detect when running ccsetup in a non-empty directory
- [x] Check for Claude Code availability in the system
- [x] Prompt user: "Would you like Claude Code to scan your repository to add project context to CLAUDE.md?"
- [x] If yes, invoke Claude Code commands to analyze:
  - [x] Project structure and file types
  - [x] Package managers and dependencies
  - [x] Build tools and scripts
  - [x] Code patterns and conventions
- [x] Generate contextual content for CLAUDE.md "Additional Notes" section
- [x] Show preview of generated context before adding
- [x] Allow user to edit/approve before writing to CLAUDE.md
- [x] Handle cases where Claude Code is not installed gracefully

## Technical Implementation
- [x] Add new option flag: `--scan-context` to enable repo scanning
- [x] Create scanning module that interfaces with Claude Code CLI
- [x] Parse common project files:
  - [x] package.json, package-lock.json
  - [x] requirements.txt, Pipfile
  - [x] go.mod, Cargo.toml
  - [x] Makefile, Dockerfile
  - [x] .env.example
  - [x] README files
- [x] Generate structured context summary
- [x] Update CLAUDE.md template system to support dynamic sections

## Example User Flow
```bash
$ npx ccsetup .
📁 Detected existing project files.
🤖 Would you like Claude Code to scan your repository to understand the project context? (Y/n): Y

🔍 Scanning repository...
✓ Detected: Node.js project with TypeScript
✓ Found: Express API with PostgreSQL
✓ Build scripts: dev, build, test, lint
✓ Key patterns: MVC architecture, JWT auth

📝 Generated context preview:
----------------------------------------
## Additional Notes

### Project Overview
This is a Node.js/TypeScript REST API using Express framework with PostgreSQL database.

### Tech Stack
- Runtime: Node.js 18+
- Language: TypeScript 4.9
- Framework: Express 4.x
- Database: PostgreSQL with Prisma ORM
- Testing: Jest with supertest
- Authentication: JWT with refresh tokens

### Key Commands
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to dist/
- `npm test` - Run Jest test suite
- `npm run migrate` - Run Prisma migrations

### Project Structure
- `/src/controllers` - Route handlers following MVC pattern
- `/src/services` - Business logic layer
- `/src/models` - Prisma schema and types
- `/src/middleware` - Express middleware (auth, validation)
- `/tests` - Jest test files

### Important Context
- API uses bearer token authentication
- All endpoints require auth except /auth/login and /auth/register
- Database migrations in /prisma/migrations
- Environment variables documented in .env.example
----------------------------------------

Would you like to add this context to CLAUDE.md? (Y/n/edit): 
```

## Priority
High

## Status
Done

## Implementation Summary
The repository context sync feature has been successfully implemented with the following components:

### Core Modules Created
- **RepositoryScanner** (`bin/lib/scanner/index.js`) - Main scanning orchestration class
- **ProjectDetector** (`bin/lib/scanner/projectDetector.js`) - Detects project types and frameworks  
- **FileAnalyzer** (`bin/lib/scanner/fileAnalyzer.js`) - Analyzes manifest files for dependencies
- **Patterns** (`bin/lib/scanner/patterns.js`) - Architecture and convention pattern definitions
- **ContextGenerator** (`bin/lib/contextGenerator.js`) - Generates formatted context for CLAUDE.md

### Features Implemented
- **Multi-language Detection**: Supports Node.js, Python, Go, Rust, Java, C#, PHP, Ruby, Swift, Kotlin, Dart, Elixir
- **Framework Recognition**: Identifies 50+ frameworks including React, Vue, Angular, Express, Django, Flask, Spring Boot, etc.
- **Pattern Detection**: Recognizes architectural patterns (MVC, Microservices, Serverless), testing frameworks, deployment platforms
- **Command Extraction**: Parses npm scripts, Makefile targets, Docker Compose commands
- **Smart Context Generation**: Creates comprehensive project context with tech stack, commands, structure, and patterns
- **CLI Integration**: Added --scan-context flag with interactive prompts and preview functionality
- **Error Handling**: Graceful degradation when scanning fails or times out

### CLI Integration
- Added `--scan-context` flag support
- Interactive scanning prompts when existing files detected
- Context preview with user approval workflow
- Automatic CLAUDE.md enhancement with generated context
- Dry-run mode support for testing

### Test Results
Successfully tested on the ccsetup project itself:
- Detected Node.js project correctly
- Identified testing frameworks (Jest, Mocha)
- Extracted npm scripts
- Generated comprehensive context for CLAUDE.md
- Completed scan in ~15ms with 59 files analyzed

## Benefits
- Better initial context for Claude Code in existing projects
- Reduces manual setup time
- Ensures important project details aren't missed
- Improves Claude's understanding from first interaction
- Makes ccsetup more valuable for existing projects

## Notes
- Should be optional to avoid forcing users to wait for scanning
- Consider caching scan results for large repositories
- Could extend to support other AI coding assistants in future
- Scan should respect .gitignore patterns