const ContextMerger = require('../../lib/contextMerger');

// Test the merge behavior
const existingContent = `# Claude Code Project Instructions

## Project Overview
My existing project description

## Tech Stack  
- Original tech stack info

## Additional Notes
[Original placeholder text]
`;

const newContent = `
## Additional Notes

### Project Overview  
This is a nodejs application. The project contains 4 files.

### Tech Stack
- **Language**: Javascript

### Key Commands
- npm run start - Start the application  
- npm run test - Run test suite

### Scan Information
- Scanned on: 8/1/2025, 12:45:40 AM
- Scan duration: 5ms
- Files analyzed: 4
`;

console.log('=== TESTING CONTEXT MERGER ===\n');

const merger = new ContextMerger(existingContent, newContent);

console.log('EXISTING SECTIONS:');
console.log(JSON.stringify(merger.existingSections, null, 2));

console.log('\nNEW SECTIONS:');
console.log(JSON.stringify(merger.newSections, null, 2));

console.log('\n=== CHANGES DETECTED ===');
const changes = merger.detectChanges();
console.log('Changes:', changes);

console.log('\n=== SMART MERGE RESULT ===');
const merged = merger.smartMerge('smart');
console.log(merged);
