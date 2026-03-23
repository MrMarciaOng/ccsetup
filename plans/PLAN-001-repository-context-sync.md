# PLAN-001: Repository Context Sync Implementation

## Executive Summary
Implement Claude Code repository scanning feature for ccsetup to automatically populate CLAUDE.md with project-specific context when setting up in existing projects.

## Objectives
- [ ] Add --scan-context flag to enable repository scanning
- [ ] Detect and analyze project structure, tech stack, and conventions
- [ ] Generate contextual content for CLAUDE.md
- [ ] Integrate seamlessly with existing setup flow

## Architecture

### Module Structure
```
bin/
├── create-project.js       # Main CLI (existing, minimal changes)
└── lib/
    ├── scanner/
    │   ├── index.js        # Scanner orchestration
    │   ├── projectDetector.js    # Project type detection
    │   ├── fileAnalyzer.js       # File content analysis
    │   └── patterns.js           # Detection patterns
    ├── contextGenerator.js   # Generate CLAUDE.md content
    └── claudeInterface.js    # Claude Code CLI wrapper
```

### Data Flow
1. User runs `ccsetup . --scan-context`
2. System detects existing files
3. Prompts user for scan permission
4. RepositoryScanner analyzes project
5. ContextGenerator creates content
6. Preview shown to user
7. Content integrated into CLAUDE.md
8. Normal setup flow continues

### Core Components

#### RepositoryScanner
```javascript
class RepositoryScanner {
  constructor(projectPath, options = {}) {
    this.projectPath = projectPath;
    this.options = {
      maxFiles: 1000,
      timeout: 30000,
      respectGitignore: true,
      ...options
    };
  }

  async scan() {
    const projectType = await this.detectProjectType();
    const structure = await this.analyzeStructure();
    const dependencies = await this.extractDependencies();
    const commands = await this.extractCommands();
    const patterns = await this.detectPatterns();
    
    return {
      projectType,
      structure,
      dependencies,
      commands,
      patterns,
      scanDate: new Date().toISOString()
    };
  }
}
```

#### ContextGenerator
```javascript
class ContextGenerator {
  constructor(scanResults) {
    this.scanResults = scanResults;
  }

  generate() {
    return {
      overview: this.generateOverview(),
      techStack: this.generateTechStack(),
      commands: this.generateCommands(),
      structure: this.generateStructure(),
      context: this.generateImportantContext()
    };
  }

  formatForClaude() {
    // Format content for CLAUDE.md Additional Notes section
  }
}
```

## Implementation Phases

### Phase 1: Foundation (Tasks 1-4)
1. **Create module structure** - Set up lib/ directory with scanner modules
2. **Implement RepositoryScanner** - Core scanning logic with project detection
3. **Implement ContextGenerator** - Content generation from scan results  
4. **Implement ClaudeInterface** - CLI interaction wrapper (optional for MVP)

### Phase 2: CLI Integration (Tasks 5-7)
5. **Add CLI flag** - Extend argument parsing for --scan-context
6. **Integrate main flow** - Hook scanning into existing setup flow
7. **Add user prompts** - Interactive scanning consent and preview

### Phase 3: Template Enhancement (Tasks 8-9)
8. **Enhance CLAUDE.md template** - Add dynamic content placeholders
9. **Implement template population** - Replace placeholders with generated content

### Phase 4: Robustness (Tasks 10-14)
10. **Error handling** - Comprehensive failure scenarios
11. **Project detection** - Support multiple languages and frameworks
12. **Tech stack extraction** - Parse manifest files for dependencies
13. **Command extraction** - Extract npm scripts, Makefile commands
14. **Structure analysis** - Directory patterns and conventions

### Phase 5: Testing & Documentation (Tasks 15-17)
15. **Test suite** - Unit and integration tests
16. **Documentation** - Update help and README
17. **Integration testing** - Verify compatibility with existing features

## Risk Analysis & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Scanner performance on large repos | High | Medium | Add timeout, file count limits, .gitignore respect |
| Claude Code CLI changes breaking interface | Medium | Low | Graceful degradation, version checking |
| Complex project structures not detected correctly | Medium | Medium | Extensive testing, fallback to manual input |
| Template placeholder conflicts | Low | Low | Use unique placeholder syntax |
| Memory usage with large scan results | Medium | Low | Stream processing, result truncation |

## Success Metrics

### Functional Requirements
- [ ] Successfully detects 90% of common project types (Node.js, Python, Go, Rust, Java)
- [ ] Generates meaningful context for projects with package.json
- [ ] Integrates seamlessly with existing setup flow
- [ ] Handles errors gracefully without breaking setup

### User Experience Requirements  
- [ ] Scanning completes within 30 seconds for typical projects
- [ ] Generated context is immediately useful for Claude
- [ ] Preview allows user to make informed decisions
- [ ] Setup flow remains intuitive with new feature

### Technical Requirements
- [ ] No breaking changes to existing functionality
- [ ] Memory usage remains reasonable for large projects
- [ ] Compatible with existing conflict resolution
- [ ] Maintains backward compatibility

## Future Enhancements

1. **Advanced Pattern Detection** - Recognize architectural patterns (MVC, microservices)
2. **Multi-language Support** - Extend beyond current languages
3. **Claude Code Integration** - Direct API integration vs CLI spawning
4. **Caching System** - Cache scan results for repeated setups
5. **Custom Templates** - Project-type-specific CLAUDE.md templates
6. **Configuration File** - .ccsetup.json for project-specific scanning rules