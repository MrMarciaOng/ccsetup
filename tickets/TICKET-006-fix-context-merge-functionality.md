# TICKET-006: Fix Context Merge Functionality for Scan Features

## Description
The current implementation of context merging in both `ccsetup scan` and `ccsetup --scan-only` doesn't properly merge findings with existing CLAUDE.md files. Instead of intelligently combining content, it essentially appends new content or preserves existing content without true merging. This ticket addresses the critical issues identified during QA of TICKET-005.

## Problem Statement
1. **Architecture Mismatch**: ContextGenerator produces content formatted for template replacement (with "Additional Notes" section), while ContextMerger expects flat section-based content
2. **No Intelligent Merging**: The 'preserve-existing' strategy only adds new sections but doesn't merge overlapping content
3. **User Feedback**: "The scan feature is not really working well, after scanning it should use Claude code command to try merge its finding with the existing Claude.md"

## Current Behavior vs Expected Behavior

### Current (Broken)
```
Existing CLAUDE.md:
- Project Overview: "My API project"
- Tech Stack: "Node.js, Express"

Scan Results:
- Tech Stack: "Node.js, Express, PostgreSQL, Redis"
- New Commands: "npm run migrate"

After "Merge":
- Project Overview: "My API project" (unchanged)
- Tech Stack: "Node.js, Express" (unchanged - PostgreSQL, Redis NOT added)
- Additional Notes: [Entire scan result dumped here]
```

### Expected
```
After Merge:
- Project Overview: "My API project"
- Tech Stack: "Node.js, Express, PostgreSQL, Redis" (intelligently merged)
- New Commands section added with "npm run migrate"
- Scan metadata preserved
```

## Proposed Solution

### 1. Restructure Content Generation
Create a new method in ContextGenerator that produces structured sections:
```javascript
class ContextGenerator {
  generateStructuredSections() {
    return {
      'Project Overview': {
        content: this.generateOverview(),
        metadata: { source: 'scan', timestamp: new Date() }
      },
      'Tech Stack': {
        content: this.generateTechStack(),
        metadata: { mergeable: true, type: 'list' }
      },
      // ... other sections
    };
  }
}
```

### 2. Implement Smart Merge Strategies
```javascript
const mergeStrategies = {
  'preserve-user': {
    description: 'Keep all user content, only add completely new sections',
    handler: preserveUserStrategy
  },
  'smart-merge': {
    description: 'Intelligently combine overlapping content',
    handler: smartMergeStrategy
  },
  'update-scan-sections': {
    description: 'Update only auto-generated sections, preserve user sections',
    handler: updateScanSectionsStrategy
  },
  'interactive': {
    description: 'Ask user for each conflict',
    handler: interactiveMergeStrategy
  }
};
```

### 3. Enhance ContextMerger
```javascript
class ContextMerger {
  async intelligentMerge(existingContent, newSections, options = {}) {
    const existingSections = this.parseIntoSections(existingContent);
    const conflicts = this.detectConflicts(existingSections, newSections);
    
    if (conflicts.length > 0 && !options.force) {
      return await this.resolveConflicts(conflicts, options.strategy);
    }
    
    return this.mergeSections(existingSections, newSections, options.strategy);
  }
  
  detectConflicts(existing, new) {
    // Detect overlapping sections with different content
    // Categorize by conflict type (addition, modification, deletion)
  }
  
  async resolveConflicts(conflicts, strategy) {
    if (strategy === 'interactive') {
      return await this.interactiveResolve(conflicts);
    }
    return this.applyStrategy(conflicts, strategy);
  }
}
```

### 4. Interactive Conflict Resolution
```javascript
async interactiveResolve(conflicts) {
  for (const conflict of conflicts) {
    console.log(`\nConflict in section: ${conflict.section}`);
    console.log('Current:', conflict.existing);
    console.log('New:', conflict.new);
    
    const choice = await select({
      message: 'How would you like to resolve this?',
      choices: [
        { name: 'Keep existing', value: 'keep' },
        { name: 'Use new', value: 'replace' },
        { name: 'Merge both', value: 'merge' },
        { name: 'Edit manually', value: 'edit' }
      ]
    });
    
    conflict.resolution = choice;
  }
}
```

### 5. Claude Code CLI Integration (Optional Enhancement)
```javascript
async function useClaudeForIntelligentMerge(existing, new) {
  // Create a prompt for Claude to merge the content
  const prompt = `
    Please intelligently merge these two CLAUDE.md contents:
    
    EXISTING:
    ${existing}
    
    NEW SCAN RESULTS:
    ${new}
    
    Preserve user customizations while incorporating new findings.
    Output valid CLAUDE.md format.
  `;
  
  // Use Claude API or CLI to get merged result
  const merged = await claudeAPI.complete(prompt);
  return merged;
}
```

## Acceptance Criteria
- [x] ContextGenerator produces structured sections instead of template-replacement content
- [x] ContextMerger can parse both existing and new content into comparable sections
- [x] Smart merge strategies are implemented and selectable
- [x] Interactive conflict resolution works for overlapping sections
- [x] Tech stack, dependencies, and commands are intelligently merged (not replaced)
- [x] User customizations are preserved during merge
- [x] Backup is created before any merge operation
- [x] Clear feedback shows what was merged, added, or preserved
- [ ] Unit tests cover all merge scenarios
- [ ] Integration tests verify end-to-end merge functionality

## Technical Implementation

### Phase 1: Restructure Content Generation (4 hours)
- Modify ContextGenerator to produce structured sections
- Add metadata to track section sources and types
- Ensure backward compatibility with template replacement

### Phase 2: Implement Smart Merge Engine (6 hours)
- Create merge strategy handlers
- Implement conflict detection logic
- Build section comparison algorithms
- Handle different content types (lists, paragraphs, code blocks)

### Phase 3: Interactive Merge UI (3 hours)
- Build interactive conflict resolution interface
- Add preview functionality
- Implement edit capability for manual resolution

### Phase 4: Integration and Testing (4 hours)
- Update scanOnlyMode() to use new merge logic
- Update bin/scan.js to use new merge logic
- Create comprehensive test suite
- Test with various CLAUDE.md formats

### Phase 5: Claude Integration (Optional, 4 hours)
- Research Claude API/CLI integration options
- Implement natural language merge capability
- Add fallback for when Claude is unavailable

## Example User Flows

### Smart Merge Flow
```bash
$ npx ccsetup --scan-only

🔍 Scanning repository...
✅ Scan complete

📄 Existing CLAUDE.md detected
🔍 Analyzing differences...

Found 3 sections to update:
• Tech Stack: Found new technologies (PostgreSQL, Redis)
• Commands: Found 2 new commands
• Project Structure: Detected new directories

Merge strategy:
1) Smart merge - Intelligently combine content ← Recommended
2) Preserve existing - Only add new sections
3) Interactive - Review each change
4) Replace all - Use scan results only

Choose strategy (1-4): 1

🔄 Merging content...
✅ Tech Stack updated: Added PostgreSQL, Redis
✅ Commands merged: Added 2 new scripts
✅ Structure updated: Added /src/services, /migrations

📦 Backup saved: CLAUDE.md.backup-1234567890
✅ CLAUDE.md successfully updated!

Changes summary:
- Tech Stack: 2 items added
- Commands: 2 commands added  
- Structure: 2 directories added
- User sections: Preserved unchanged
```

## Benefits
- True intelligent merging instead of append/replace
- Preserves user customizations
- Reduces manual work after scanning
- Clear visibility into what changed
- Flexible merge strategies for different use cases

## Priority
Critical - This blocks the proper functioning of both scan features

## Status
In Progress - Core functionality complete, tests pending

## Implementation Summary
The interactive conflict resolution feature has been successfully implemented:

1. **ContextMerger.interactiveMerge()** - Added async method that:
   - Identifies conflicting sections between existing and new content
   - Presents each conflict to the user with preview
   - Offers choices: Keep existing, Use new, Merge both, Skip
   - Handles user selections and builds merged content

2. **CLI Integration**:
   - `scan.js` now accepts `--merge-strategy interactive`
   - `create-project.js` prompts users if they want interactive merge
   - Help text and examples updated

3. **Merge Strategies Available**:
   - `smart` - Intelligent automatic merging (default)
   - `union` - Combines content from both sources
   - `preserve-user` - Keeps existing, adds new sections only
   - `update-scan` - Updates scan-generated sections only
   - `interactive` - User reviews each conflict

The implementation allows users to review and resolve conflicts section by section, ensuring full control over how their CLAUDE.md is updated while maintaining the convenience of automated scanning.

## Dependencies
- ContextGenerator (needs modification)
- ContextMerger (needs rewrite)
- Interactive prompt libraries (existing)
- Unit test framework (for new tests)

## Notes
- This fix is critical for user satisfaction with scan features
- Consider implementing in phases, with basic smart merge first
- Claude integration is nice-to-have but not required for initial fix
- Ensure extensive testing with various CLAUDE.md formats