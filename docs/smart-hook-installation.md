# Smart Hook Installation

## Overview

ccsetup's hook installation system is designed to be intelligent and non-destructive, respecting any existing customizations you may have made to your hooks or settings.

## Key Features

### 1. Non-Destructive Installation
The CLI will never overwrite your existing files without explicit permission. It always:
- Detects existing hook files
- Checks for existing hook configurations
- Provides clear options when conflicts are found
- Creates backups before any replacements

### 2. Intelligent Conflict Resolution

#### When Hook File Already Exists
If `.claude/hooks/workflow-selector/index.js` already exists, you'll see:

```
⚠️  Workflow-selector hook already exists.
How would you like to proceed?

❯ 📋 Keep existing - Preserve your customizations
  🔄 Update - Replace with latest version
  👀 Compare - View differences first
  ❌ Skip - Cancel hook installation
```

**Options explained:**
- **Keep existing**: Your file remains untouched
- **Update**: Creates a timestamped backup before replacing
- **Compare**: Shows file stats to help you decide
- **Skip**: Cancels the installation

#### When Hooks Already Configured
If `settings.json` already has UserPromptSubmit hooks:

```
⚠️  Existing UserPromptSubmit hooks detected in settings.json
How would you like to add the workflow hook?

❯ ➕ Add to existing - Preserve current hooks and add workflow hook
  🔄 Replace all - Replace existing hooks with workflow hook
  ❌ Skip - Don't modify hooks configuration
```

**Options explained:**
- **Add to existing**: Appends workflow hook to your existing hooks
- **Replace all**: Creates backup, then replaces all hooks
- **Skip**: Leaves settings.json unchanged

### 3. Duplicate Detection
The system automatically detects if the workflow hook is already configured and skips installation with a friendly message:
```
✅ Workflow hook already configured in settings.json
```

### 4. Backup Creation
When replacing files, backups are automatically created:
- Hook file: `index.js.backup-[timestamp]`
- Settings: `settings.json.backup-[timestamp]`

## Installation Scenarios

### Fresh Installation
No existing hooks or settings:
- Hook file is copied directly
- Settings.json is created/updated
- No prompts needed

### Updating Existing Setup
Existing hooks with customizations:
- Prompts for each conflict
- Preserves customizations by default
- Creates backups when replacing

### Re-running Installation
Hook already properly configured:
- Detects existing configuration
- Skips redundant operations
- Confirms everything is set up

## Best Practices

1. **Review Before Replacing**: Use the "Compare" option to check file details
2. **Keep Backups**: Don't delete backup files immediately
3. **Test After Changes**: Verify hooks work after installation
4. **Customize Safely**: Edit hook files knowing updates won't overwrite without permission

## Command Line Usage

```bash
# Install hooks (smart detection)
npx ccsetup --install-hooks

# Force installation (still prompts for conflicts)
npx ccsetup --install-hooks --force

# Dry run (preview without changes)
npx ccsetup --install-hooks --dry-run
```

## Technical Details

### Hook Detection Logic
```javascript
// Checks if hook command already exists
const hookExists = settings.hooks.UserPromptSubmit.some(hookConfig => 
  hookConfig.hooks && hookConfig.hooks.some(hook => 
    hook.type === 'command' && 
    hook.command === workflowHookCommand
  )
);
```

### Backup Naming
```javascript
// Timestamp-based unique backups
const backupFile = originalFile + '.backup-' + Date.now();
```

## Troubleshooting

### Hook Not Installing
- Check if `.claude` directory exists
- Verify you're in the project root
- Look for existing hook configuration

### Backups Accumulating
- Safe to delete old backups after verifying new setup
- Keep recent backups until confirmed working

### Settings.json Corrupted
- Look for `.backup-[timestamp]` files
- Restore from most recent backup
- Re-run installation

## Summary

The smart hook installation system ensures:
- ✅ Your customizations are never lost
- ✅ You have full control over changes
- ✅ Backups protect against mistakes
- ✅ Duplicate installations are prevented
- ✅ Clear communication throughout the process

This approach respects your work while providing easy updates and installations.