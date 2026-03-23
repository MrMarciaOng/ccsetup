# AI-Enhanced Merge Features

## Overview

ccsetup now uses Claude Code commands to provide intelligent merge suggestions and conflict resolution when updating CLAUDE.md files. This makes the merge process smarter and more context-aware.

## Features

### 1. 🤖 AI Strategy Recommendation

When an existing CLAUDE.md is detected, Claude analyzes both files and recommends the best merge strategy:

```
📋 Existing CLAUDE.md detected!
🤖 AI Recommendation: 🧠 Smart Merge - Intelligently combine sections
```

**Strategies AI might recommend:**
- **🧠 Smart Merge** - When content is complementary
- **👀 Interactive** - When there are important conflicts
- **🔄 Fresh Scan** - When existing content is outdated
- **🛡️ Preserve** - When existing content is well-maintained

### 2. 📊 AI Conflict Analysis

For each conflicting section, AI provides:

```
═══════════════════════════════════════════════════════════
📋 Conflict in section: Tech Stack
───────────────────────────────────────────────────────────

📄 Your current content:
   - **Frontend**: React, TypeScript
   - **State**: Redux
   - **Styling**: CSS Modules

🔍 New content from scan:
   - **Frontend**: React, TypeScript
   - **Build**: Vite
   - **Styling**: Tailwind CSS

🤖 AI Analysis:
   Both versions include React and TypeScript. Existing has Redux and CSS Modules.
   New scan found Vite and Tailwind CSS. The new version appears more complete.
   Merging both would create a comprehensive tech stack list.
   💡 Recommendation: 🤝 Merge both
───────────────────────────────────────────────────────────
```

### 3. 🤝 AI-Powered Content Merging

When you select "Merge both", AI intelligently combines content:

**Before:**
```markdown
## Tech Stack (Existing)
- **Frontend**: React, TypeScript
- **State**: Redux

## Tech Stack (New Scan)
- **Frontend**: React, TypeScript
- **Build**: Vite
```

**After AI Merge:**
```markdown
## Tech Stack
- **Frontend**: React, TypeScript
- **State**: Redux
- **Build**: Vite
```

### 4. 📑 AI Section Ordering

AI optimizes section order for better Claude Code comprehension:

```
🤖 Using AI-optimized section order
```

Sections are reordered based on:
- Logical flow for AI understanding
- Dependencies between sections
- Importance for project context

## How It Works

### Technology Stack
- Uses `claude --print` command for AI analysis
- Falls back gracefully if Claude Code isn't installed
- All AI features are optional enhancements

### AI Prompts Used

1. **Strategy Analysis**
   - Analyzes file sizes and content quality
   - Considers user customizations
   - Evaluates scan completeness

2. **Conflict Analysis**
   - Identifies differences
   - Assesses completeness
   - Provides merge recommendations

3. **Content Merging**
   - Preserves user customizations
   - Adds new information
   - Removes duplicates
   - Maintains formatting

## Usage Examples

### Basic Scan with AI
```bash
cd existing-project
ccsetup --scan-only
```

### Interactive Merge with AI
```bash
ccsetup . --scan-context
```

### Full Setup with AI
```bash
ccsetup .
```

## Benefits

1. **Smarter Decisions** - AI helps choose the best merge strategy
2. **Better Context** - Understand what changed and why
3. **Cleaner Merges** - AI combines content intelligently
4. **Time Saving** - Automated analysis and recommendations
5. **Graceful Fallback** - Works without Claude Code too

## Requirements

- Claude Code CLI installed (optional but recommended)
- Works with all merge strategies (smart, interactive, overwrite)
- No additional configuration needed

## Privacy & Security

- AI only analyzes CLAUDE.md content
- No sensitive code is sent to AI
- All processing happens locally via Claude Code CLI
- Can be disabled by not having Claude Code installed

## Troubleshooting

### AI features not working?
1. Check if Claude Code is installed: `which claude`
2. Verify Claude Code works: `claude --version`
3. AI features automatically disable if not available

### Getting unexpected recommendations?
- AI considers multiple factors (file size, content quality, customizations)
- You can always override AI recommendations
- Use `--force` to skip all prompts

## Future Enhancements

- Custom merge rules via configuration
- Learning from user choices
- Multi-file conflict resolution
- Project-type specific strategies