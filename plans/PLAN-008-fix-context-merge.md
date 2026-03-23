# PLAN-008: Fix Context Merge Functionality

## Executive Summary
This plan addresses the critical architectural mismatch between ContextGenerator and ContextMerger that prevents intelligent content merging in the scan features. We'll implement a structured content generation system and enhanced merge capabilities to deliver true intelligent merging.

## Problem Analysis

### Current State
1. **ContextGenerator** produces template-replacement format under "Additional Notes"
2. **ContextMerger** expects flat section-based content for comparison
3. Merge strategy only preserves/appends, doesn't intelligently combine
4. Users frustrated that scan doesn't merge findings properly

### Root Causes
- Architectural mismatch in content format expectations
- Merge logic treats sections as atomic units
- No content-type awareness for intelligent merging
- Lack of conflict resolution mechanisms

## Solution Architecture

### Core Components

#### 1. Structured Content Model
```javascript
{
  sections: {
    'Project Overview': {
      content: 'API service for user management',
      metadata: {
        type: 'text',
        source: 'scan',
        mergeable: false,
        timestamp: '2024-01-15T10:00:00Z'
      }
    },
    'Tech Stack': {
      content: ['Node.js', 'Express', 'PostgreSQL'],
      metadata: {
        type: 'list',
        source: 'scan',
        mergeable: true,
        mergeStrategy: 'union'
      }
    },
    'Key Commands': {
      content: [
        { cmd: 'npm start', desc: 'Start the server', category: 'runtime' },
        { cmd: 'npm test', desc: 'Run tests', category: 'testing' }
      ],
      metadata: {
        type: 'commands',
        source: 'scan',
        mergeable: true,
        mergeStrategy: 'smart'
      }
    }
  }
}
```

#### 2. Merge Strategies
- **union**: Combine lists, removing duplicates
- **smart**: Content-type specific merging
- **preserve-user**: Keep user content, only add new
- **update-scan**: Replace scan-generated content only
- **interactive**: Prompt user for conflicts

## Implementation Phases

### Phase 1: Restructure Content Generation (4 hours)

#### Tasks
1. Create `generateStructuredSections()` method in ContextGenerator
2. Implement content type detection and metadata assignment
3. Maintain backward compatibility with existing `formatForClaude()`
4. Add unit tests for structured generation

#### Implementation Details
```javascript
// contextGenerator.js
class ContextGenerator {
  generateStructuredSections() {
    const sections = {};
    
    // Project Overview
    sections['Project Overview'] = {
      content: this.generateProjectOverview(),
      metadata: {
        type: 'text',
        source: 'scan',
        mergeable: false,
        timestamp: new Date().toISOString()
      }
    };
    
    // Tech Stack - as array for merging
    const techStack = this.detectTechStack();
    sections['Tech Stack'] = {
      content: techStack.technologies,
      metadata: {
        type: 'list',
        source: 'scan',
        mergeable: true,
        mergeStrategy: 'union'
      }
    };
    
    // Commands - structured for deduplication
    const commands = this.extractCommands();
    sections['Key Commands'] = {
      content: commands.map(cmd => ({
        cmd: cmd.command,
        desc: cmd.description,
        category: cmd.category || 'general'
      })),
      metadata: {
        type: 'commands',
        source: 'scan',
        mergeable: true,
        mergeStrategy: 'smart'
      }
    };
    
    return sections;
  }
  
  // Backward compatibility
  formatForClaude() {
    const sections = this.generateStructuredSections();
    return this.convertSectionsToMarkdown(sections);
  }
}
```

### Phase 2: Build Intelligent Merge Engine (5 hours)

#### Tasks
1. Enhance ContextMerger to handle structured sections
2. Implement content-type specific merge logic
3. Create merge strategy handlers
4. Add conflict detection and resolution

#### Implementation Details
```javascript
// contextMerger.js
class ContextMerger {
  constructor(existingContent, newContent, options = {}) {
    this.existingSections = this.parseToSections(existingContent);
    this.newSections = typeof newContent === 'object' ? 
      newContent : this.parseToSections(newContent);
    this.strategy = options.strategy || 'smart';
    this.conflicts = [];
  }
  
  merge() {
    const mergedSections = {};
    const allSectionKeys = new Set([
      ...Object.keys(this.existingSections),
      ...Object.keys(this.newSections)
    ]);
    
    for (const key of allSectionKeys) {
      const existing = this.existingSections[key];
      const newSection = this.newSections[key];
      
      if (!existing) {
        // New section
        mergedSections[key] = newSection;
      } else if (!newSection) {
        // Keep existing
        mergedSections[key] = existing;
      } else {
        // Merge needed
        mergedSections[key] = this.mergeSection(key, existing, newSection);
      }
    }
    
    return mergedSections;
  }
  
  mergeSection(key, existing, newSection) {
    const metadata = newSection.metadata || {};
    
    if (!metadata.mergeable) {
      return this.handleNonMergeable(key, existing, newSection);
    }
    
    switch (metadata.type) {
      case 'list':
        return this.mergeList(existing, newSection);
      case 'commands':
        return this.mergeCommands(existing, newSection);
      case 'dependencies':
        return this.mergeDependencies(existing, newSection);
      default:
        return this.mergeText(existing, newSection);
    }
  }
  
  mergeList(existing, newSection) {
    const existingItems = Array.isArray(existing.content) ? 
      existing.content : [existing.content];
    const newItems = Array.isArray(newSection.content) ? 
      newSection.content : [newSection.content];
    
    const merged = [...new Set([...existingItems, ...newItems])];
    
    return {
      content: merged,
      metadata: { ...newSection.metadata, merged: true }
    };
  }
  
  mergeCommands(existing, newSection) {
    const existingCmds = existing.content || [];
    const newCmds = newSection.content || [];
    
    // Create command map for deduplication
    const cmdMap = new Map();
    
    // Add existing commands
    existingCmds.forEach(cmd => {
      const key = typeof cmd === 'string' ? cmd : cmd.cmd;
      cmdMap.set(key, cmd);
    });
    
    // Merge new commands
    newCmds.forEach(cmd => {
      const key = typeof cmd === 'string' ? cmd : cmd.cmd;
      if (!cmdMap.has(key)) {
        cmdMap.set(key, cmd);
      } else {
        // Update description if more detailed
        const existing = cmdMap.get(key);
        if (cmd.desc && (!existing.desc || cmd.desc.length > existing.desc.length)) {
          cmdMap.set(key, cmd);
        }
      }
    });
    
    return {
      content: Array.from(cmdMap.values()),
      metadata: { ...newSection.metadata, merged: true }
    };
  }
}
```

### Phase 3: Interactive Conflict Resolution (3 hours)

#### Tasks
1. Implement conflict detection logic
2. Create interactive prompts for resolution
3. Add preview capabilities
4. Build rollback mechanism

#### Implementation Details
```javascript
// Interactive resolution
async function resolveConflicts(conflicts) {
  const resolutions = [];
  
  for (const conflict of conflicts) {
    console.log(`\n📝 Conflict in section: ${conflict.section}`);
    console.log('Existing:', conflict.existing);
    console.log('New:', conflict.new);
    
    const choice = await select({
      message: 'How would you like to resolve this?',
      choices: [
        { value: 'keep', name: 'Keep existing' },
        { value: 'replace', name: 'Replace with new' },
        { value: 'merge', name: 'Merge both' },
        { value: 'edit', name: 'Edit manually' }
      ]
    });
    
    resolutions.push({
      section: conflict.section,
      resolution: choice,
      customValue: choice === 'edit' ? await input({
        message: 'Enter custom value:'
      }) : null
    });
  }
  
  return resolutions;
}
```

### Phase 4: Integration & Testing (4 hours)

#### Tasks
1. Update bin/scan.js to use new merge system
2. Update bin/create-project.js to replace smartAppendContext
3. Create comprehensive test suite
4. Add integration tests

#### Test Scenarios
```javascript
// Test cases
describe('ContextMerger', () => {
  test('merges tech stack lists correctly', () => {
    const existing = {
      'Tech Stack': {
        content: ['Node.js', 'Express'],
        metadata: { type: 'list', mergeable: true }
      }
    };
    
    const newContent = {
      'Tech Stack': {
        content: ['Node.js', 'PostgreSQL', 'Redis'],
        metadata: { type: 'list', mergeable: true }
      }
    };
    
    const merger = new ContextMerger(existing, newContent);
    const result = merger.merge();
    
    expect(result['Tech Stack'].content).toEqual([
      'Node.js', 'Express', 'PostgreSQL', 'Redis'
    ]);
  });
  
  test('deduplicates commands intelligently', () => {
    // Test command merging
  });
  
  test('preserves user customizations', () => {
    // Test user content preservation
  });
});
```

### Phase 5: User Experience Polish (2 hours)

#### Tasks
1. Add detailed merge report showing changes
2. Implement dry-run mode for preview
3. Create backup before merge
4. Add progress indicators

#### Merge Report Example
```
📊 Merge Report
================
✅ Tech Stack: Added 2 new items (PostgreSQL, Redis)
✅ Commands: Added 3 new commands
⚠️  Dependencies: 2 conflicts resolved by user
✅ Project Overview: Preserved existing
📝 Backup saved: CLAUDE.md.backup.1704453600000
```

## Risk Analysis & Mitigation

### Risks
1. **Data Loss**: User content could be overwritten
   - **Mitigation**: Automatic backups, dry-run mode
   
2. **Breaking Changes**: Existing integrations might fail
   - **Mitigation**: Maintain backward compatibility APIs
   
3. **Complex Conflicts**: Users overwhelmed by choices
   - **Mitigation**: Smart defaults, clear explanations
   
4. **Performance**: Large files might be slow
   - **Mitigation**: Streaming parser, progress indicators

## Success Metrics
1. **Functional**: Tech stack properly merges in 100% of cases
2. **Performance**: Merge completes in <2s for typical files
3. **UX**: 90% of merges require no user intervention
4. **Quality**: Zero data loss incidents

## Timeline & Delivery
- **Week 1**: Phases 1-2 (Core functionality)
- **Week 2**: Phases 3-5 (Polish and integration)
- **Total Effort**: 18-20 hours

## Incremental Delivery
1. **MVP** (Phase 1-2): Basic intelligent merging
2. **Enhanced** (Phase 3-4): Conflict resolution and integration
3. **Polished** (Phase 5): Full UX and reporting