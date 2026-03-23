# PLAN-007: Complete Scan-Only Feature (TICKET-005)

## Executive Summary
This plan addresses the completion of TICKET-005 (Selective Scan-Context Setup) given the critical merge functionality blocker. We propose a pragmatic approach that delivers immediate value while setting up for future enhancements.

## Current State Analysis

### Completed Features (80%)
- ✅ --scan-only flag implementation
- ✅ Interactive mode selection
- ✅ scanOnlyMode() core workflow
- ✅ Empty directory handling
- ✅ Help text updates
- ✅ Flag validation

### Critical Blocker
- ❌ ContextMerger expects section-based content but receives template-replacement format
- ❌ No intelligent merging occurs - only append/preserve
- ❌ Structure mismatch between template and user files

## Strategic Options

### Option A: Quick Fix for Immediate Completion (Recommended)
Implement a smart append strategy that works within current constraints.

**Approach:**
1. Accept the architectural limitation temporarily
2. Implement intelligent content appending to "Additional Notes" section
3. Create clear user communication about update behavior
4. Ensure existing content is never lost

**Timeline:** 2-4 hours

### Option B: Full Architecture Fix
Address the merge issues comprehensively within TICKET-005.

**Approach:**
1. Rewrite ContextGenerator to produce structured sections
2. Enhance ContextMerger with intelligent strategies
3. Implement conflict resolution UI
4. Full testing suite

**Timeline:** 6-9 hours

## Recommended Implementation Plan (Option A)

### Phase 1: Smart Append Implementation (1-2 hours)

#### 1.1 Modify scanOnlyMode() function
```javascript
// In bin/create-project.js, modify lines 790-810
if (exists) {
  const existingContent = fs.readFileSync(claudeMdPath, 'utf8');
  
  // Create backup first
  const backupPath = `${claudeMdPath}.backup.${Date.now()}`;
  fs.writeFileSync(backupPath, existingContent);
  console.log(`📦 Backup created: ${path.basename(backupPath)}`);
  
  // Use smart append instead of broken merge
  const updatedContent = await smartAppendContext(existingContent, scanResults.formattedContext);
  fs.writeFileSync(claudeMdPath, updatedContent);
  
  console.log('✅ CLAUDE.md updated with new project context!');
  console.log('💡 Tip: Your existing content is preserved. New context added to Additional Notes section.');
}
```

#### 1.2 Create smartAppendContext helper
```javascript
async function smartAppendContext(existingContent, newContext) {
  // Extract content between markers if it exists
  const startMarker = '<!-- SCAN CONTEXT START -->';
  const endMarker = '<!-- SCAN CONTEXT END -->';
  
  // Remove old scan context if present
  let cleanContent = existingContent;
  const startIdx = cleanContent.indexOf(startMarker);
  const endIdx = cleanContent.indexOf(endMarker);
  
  if (startIdx !== -1 && endIdx !== -1) {
    cleanContent = cleanContent.substring(0, startIdx) + 
                   cleanContent.substring(endIdx + endMarker.length);
  }
  
  // Find or create Additional Notes section
  const additionalNotesIdx = cleanContent.indexOf('## Additional Notes');
  
  if (additionalNotesIdx === -1) {
    // Add new section at end
    return cleanContent + '\n\n## Additional Notes\n\n' + 
           startMarker + '\n' + newContext + '\n' + endMarker;
  } else {
    // Insert after section header
    const insertIdx = cleanContent.indexOf('\n', additionalNotesIdx) + 1;
    return cleanContent.substring(0, insertIdx) + 
           '\n' + startMarker + '\n' + newContext + '\n' + endMarker + 
           cleanContent.substring(insertIdx);
  }
}
```

### Phase 2: Enhanced User Communication (30 mins)

#### 2.1 Update confirmation prompts
```javascript
if (exists) {
  console.log('\n📋 Existing CLAUDE.md detected!');
  console.log('The scan will:');
  console.log('  • Preserve all your existing content');
  console.log('  • Update the Additional Notes section with new findings');
  console.log('  • Create an automatic backup');
  
  const confirm = await confirm({
    message: 'Continue with smart update?',
    default: true
  });
  
  if (!confirm) {
    console.log('✅ Update cancelled.');
    return;
  }
}
```

#### 2.2 Add post-update guidance
```javascript
console.log('\nNext steps:');
console.log('1. Review the updated Additional Notes section in CLAUDE.md');
console.log('2. Move any important context to appropriate sections');
console.log('3. Delete the backup file once satisfied: ' + path.basename(backupPath));
console.log('4. Run `ccsetup scan` anytime to refresh context');
```

### Phase 3: Validation & Edge Cases (1 hour)

#### 3.1 Handle malformed CLAUDE.md files
- Add try-catch around file operations
- Validate markdown structure before modification
- Provide clear error messages

#### 3.2 Handle large files
- Check file size before processing
- Warn if > 1MB
- Implement streaming for very large files

#### 3.3 Permission handling
- Check write permissions before starting
- Provide clear error messages
- Suggest solutions (sudo, chmod)

### Phase 4: Testing Strategy (30 mins)

#### 4.1 Manual test scenarios
1. Fresh CLAUDE.md creation
2. Update existing CLAUDE.md with Additional Notes
3. Update existing CLAUDE.md without Additional Notes
4. Multiple consecutive updates
5. Malformed file handling
6. Permission denied scenarios

#### 4.2 Create test script
```javascript
// __test__/scan-only-integration.test.js
const testScenarios = [
  'empty-directory',
  'existing-claude-md',
  'malformed-claude-md',
  'no-permissions',
  'large-file'
];
```

## Risk Analysis

### Risks with Option A
| Risk | Impact | Mitigation |
|------|--------|------------|
| Content duplication | Low | Marker-based replacement |
| User confusion | Medium | Clear communication |
| Backup accumulation | Low | Cleanup instructions |

### Dependencies
- No new dependencies required
- Uses existing libraries
- Works with current architecture

## Success Metrics
1. Users can successfully update CLAUDE.md without errors
2. Existing content is never lost
3. New context is clearly delineated
4. Backup provides safety net
5. Clear user communication throughout

## Future Enhancement Path
1. Complete Option A for immediate release
2. Create TICKET-006 implementation with full architecture fix
3. Migrate users seamlessly with backwards compatibility
4. Deprecate marker-based approach in favor of true merge

## Implementation Checklist
- [ ] Implement smartAppendContext function
- [ ] Update scanOnlyMode with new logic
- [ ] Add enhanced user communication
- [ ] Create automatic backup system
- [ ] Handle edge cases and errors
- [ ] Test all scenarios
- [ ] Update documentation
- [ ] Update ticket status

## Conclusion
Option A provides a pragmatic solution that delivers immediate value while maintaining code quality and user safety. The approach acknowledges current architectural limitations while providing a clear upgrade path for future enhancements.