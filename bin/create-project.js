#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const RepositoryScanner = require('../lib/scanner');
const ContextGenerator = require('../lib/contextGenerator');
const ContextMerger = require('../lib/contextMerger');
const ProgressReporter = require('../lib/progressReporter');
const TemplateCatalog = require('../lib/templates/catalog');
const TemplateFilter = require('../lib/templates/filter');
const TemplateSearch = require('../lib/templates/search');

// Parse CLI arguments
const args = process.argv.slice(2);

// Handle scan subcommand
if (args[0] === 'scan') {
  require('./scan.js');
  return;
}

const flags = {
  force: false,
  dryRun: false,
  help: false,
  allAgents: false,
  noAgents: false,
  agents: false,
  browseAgents: false,
  browse: false,
  scanContext: false,
  scanOnly: false,
  prompt: null
};

let projectName = '.';

// Process arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--force' || arg === '-f') {
    flags.force = true;
  } else if (arg === '--dry-run' || arg === '-d') {
    flags.dryRun = true;
  } else if (arg === '--help' || arg === '-h') {
    flags.help = true;
  } else if (arg === '--all-agents') {
    flags.allAgents = true;
  } else if (arg === '--no-agents') {
    flags.noAgents = true;
  } else if (arg === '--agents') {
    flags.agents = true;
  } else if (arg === '--browse-agents') {
    flags.browseAgents = true;
  } else if (arg === '--browse') {
    flags.browse = true;
  } else if (arg === '--scan-context') {
    flags.scanContext = true;
  } else if (arg === '--scan-only') {
    flags.scanOnly = true;
  } else if (arg === '--install-hooks') {
    flags.installHooks = true;
  } else if (!arg.startsWith('-')) {
    projectName = arg;
  }
}

// Show help if requested
if (flags.help) {
  console.log(`
Usage: ccsetup [project-name] [options]
       ccsetup scan [path] [options]

Commands:
  ccsetup              Interactive mode - choose full setup or scan-only
  ccsetup <name>       Create a new Claude Code project
  ccsetup scan         Advanced repository scanning (see 'ccsetup scan --help')

Options:
  --scan-only          Skip project setup, only scan and create/update CLAUDE.md ⭐
  --force, -f          Skip all prompts and overwrite existing files
  --dry-run, -d        Show what would be done without making changes
  --agents             Interactive agent selection mode
  --all-agents         Include all agents without prompting
  --no-agents          Skip agent selection entirely
  --browse-agents      Copy all agents to /agents folder for browsing
  --browse             Enhanced template browsing and selection interface
  --scan-context       Scan repository and add context to CLAUDE.md
  --help, -h           Show this help message

Advanced:
  --install-hooks      Install workflow selection hook to .claude/hooks (optional, power users only)

Quick Start:
  npx ccsetup              # Interactive mode - choose what to do
  npx ccsetup --scan-only  # Just scan and create CLAUDE.md ⭐
  npx ccsetup my-project   # Full project setup

Scan-Only Mode ⭐:
  Perfect for existing projects! Analyzes your codebase and creates/updates
  CLAUDE.md with project context without modifying your project structure.
  
Examples:
  ccsetup --scan-only           # Scan current directory only
  ccsetup . --scan-only         # Same as above
  ccsetup --scan-only --force   # Skip confirmation prompts
  ccsetup --scan-only --dry-run # Preview what would happen

Full Setup Examples:
  ccsetup                      # Interactive setup in current directory
  ccsetup my-project           # Create in new directory
  ccsetup . --scan-context     # Full setup with context scanning
  ccsetup my-app --all-agents  # Include all agents automatically
`);
  process.exit(0);
}

// Validate project name
function validateProjectName(name) {
  // Check for path traversal attempts
  if (name.includes('..') || path.isAbsolute(name)) {
    throw new Error('Invalid project name: Path traversal or absolute paths are not allowed');
  }
  
  // Check for invalid characters
  const invalidChars = /[<>:"|?*\0]/;
  if (invalidChars.test(name)) {
    throw new Error('Invalid project name: Contains invalid characters');
  }
  
  return true;
}

async function scanRepositoryForContext(projectPath) {
  try {
    const progressReporter = new ProgressReporter();
    console.log('🔍 Scanning repository for project context...');
    
    const scanner = new RepositoryScanner(projectPath);
    const scanResults = await scanner.scan(progressReporter);
    
    const contextGenerator = new ContextGenerator(scanResults);
    const context = contextGenerator.generate();
    const structuredSections = contextGenerator.generateStructuredSections();
    
    console.log('\n📊 Detected project details:');
    if (context.overview) {
      console.log(`   ${context.overview}`);
    }
    
    if (context.techStack && context.techStack.frameworks && context.techStack.frameworks.length > 0) {
      console.log(`   Framework: ${context.techStack.frameworks.join(', ')}`);
    }
    
    if (context.commands && Object.keys(context.commands).length > 0) {
      const totalCommands = Object.values(context.commands).reduce((sum, cmds) => sum + cmds.length, 0);
      console.log(`   Commands: ${totalCommands} available scripts`);
    }
    
    if (context.patterns && Object.keys(context.patterns).length > 0) {
      const totalPatterns = Object.values(context.patterns).reduce((sum, patterns) => sum + patterns.length, 0);
      console.log(`   Patterns: ${totalPatterns} detected architectural patterns`);
    }
    
    return {
      scanResults,
      contextGenerator,
      structuredSections,
      formattedContext: contextGenerator.formatForClaude()
    };
  } catch (error) {
    console.warn(`⚠️  Repository scanning failed: ${error.message}`);
    console.log('   Continuing with standard setup...\n');
    return null;
  }
}

async function previewAndConfirmContext(formattedContext) {
  console.log('\n📝 Generated context preview:');
  console.log('━'.repeat(60));
  console.log(formattedContext);
  console.log('━'.repeat(60));
  
  // Use inquirer instead of readline prompt
  const selectModule = await import('@inquirer/select');
  const select = selectModule.default;
  const response = await select({
    message: 'Would you like to add this context to CLAUDE.md?',
    choices: [
      { name: 'Yes', value: 'y' },
      { name: 'No', value: 'n' },
      { name: 'Edit', value: 'edit' }
    ],
    default: 'y'
  });
  return response;
}

async function shouldScanRepository() {
  console.log('\n🔍 Existing project files detected.');
  // Use inquirer instead of readline prompt
  const confirmModule = await import('@inquirer/confirm');
  const confirm = confirmModule.default;
  const response = await confirm({
    message: 'Would you like to scan the repository to add project context to CLAUDE.md?',
    default: true
  });
  return response;
}

async function mergeContextIntelligently(existingContent, repositoryContext, strategy = 'smart') {
  try {
    // Handle replace strategy
    if (strategy === 'replace') {
      console.log('   Replacing with new scan results...');
      // Get template and apply context
      const templatePath = path.join(__dirname, '..', 'template', 'CLAUDE.md');
      let template = '';
      if (fs.existsSync(templatePath)) {
        template = fs.readFileSync(templatePath, 'utf8');
      } else {
        template = `# Claude Code Project Instructions

## Project Overview
[Project description will be added here]

## Key Objectives
[Project objectives will be added here]

## Additional Notes
[Any other important information for Claude to know about this project]
`;
      }
      return await applyContextToTemplate(template, repositoryContext, 'append');
    }
    
    // Use structured sections for intelligent merge, fall back to formatted context
    let contextToMerge = repositoryContext.formattedContext;
    
    if (repositoryContext.structuredSections && 
        typeof repositoryContext.structuredSections === 'object' && 
        Object.keys(repositoryContext.structuredSections).length > 0) {
      contextToMerge = repositoryContext.structuredSections;
      console.log('   📊 Using intelligent merge with structured sections');
    } else {
      console.log('   📝 Using fallback merge with formatted content');
    }
    const merger = new ContextMerger(existingContent, contextToMerge);
    const changes = merger.getChangesSummary();
    
    if (!changes.hasChanges) {
      console.log('   ✅ Context is already up to date');
      return existingContent;
    }
    
    console.log('\n   📊 Merge Analysis:');
    if (changes.added > 0) console.log(`     + ${changes.added} new sections`);
    if (changes.modified > 0) console.log(`     ~ ${changes.modified} updated sections`);
    if (changes.unchanged > 0) console.log(`     ✓ ${changes.unchanged} preserved sections`);
    
    const mergedContent = await merger.merge(strategy);
    
    if (typeof mergedContent === 'string') {
      const existingHeader = merger.extractHeaderContent();
      return existingHeader + '\n\n' + mergedContent;
    }
    
    return mergedContent;
  } catch (error) {
    // Re-throw specific errors that should stop the process
    if (error.message === 'Interactive merge cancelled' || 
        error.message === 'Missing required dependency') {
      throw error;
    }
    
    console.warn(`   ⚠️  Merge failed: ${error.message}`);
    console.log('   📝 Falling back to simple append...');
    
    // Fall back to formatted context for simple append
    const newContext = repositoryContext.formattedContext;
    const additionalNotesMarker = '## Additional Notes';
    const additionalNotesIdx = existingContent.indexOf(additionalNotesMarker);
    
    if (additionalNotesIdx === -1) {
      return existingContent.trimEnd() + '\n\n' + additionalNotesMarker + '\n\n' + newContext.trim() + '\n';
    } else {
      const insertIdx = existingContent.indexOf('\n', additionalNotesIdx) + 1;
      return existingContent.substring(0, insertIdx) + '\n' + newContext.trim() + '\n' + existingContent.substring(insertIdx);
    }
  }
}

async function applyContextToTemplate(templateContent, repositoryContext, conflictStrategy) {
  const contextContent = repositoryContext.formattedContext;
  const additionalNotesMarker = '## Additional Notes';
  const placeholderContent = '[Any other important information for Claude to know about this project]';
  
  if (templateContent.includes(additionalNotesMarker)) {
    if (templateContent.includes(placeholderContent)) {
      return templateContent.replace(placeholderContent, contextContent.trim());
    } else {
      const sections = templateContent.split(additionalNotesMarker);
      if (sections.length >= 2) {
        return sections[0] + additionalNotesMarker + contextContent + '\n';
      }
    }
  }
  
  return templateContent + contextContent;
}

// Validate conflicting flags
function validateFlags() {
  // Scan-only conflicts
  if (flags.scanOnly) {
    const conflictingFlags = [];
    if (flags.allAgents) conflictingFlags.push('--all-agents');
    if (flags.noAgents) conflictingFlags.push('--no-agents');
    if (flags.browseAgents) conflictingFlags.push('--browse-agents');
    if (flags.browse) conflictingFlags.push('--browse');
    if (flags.agents) conflictingFlags.push('--agents');
    
    if (conflictingFlags.length > 0) {
      console.error(`Error: --scan-only cannot be used with ${conflictingFlags.join(', ')}`);
      console.log('Tip: --scan-only skips all agent-related operations');
      process.exit(1);
    }
  }
  
  // Existing validations
  if (flags.allAgents && flags.noAgents) {
    console.error('Error: Cannot use --all-agents and --no-agents together');
    process.exit(1);
  }

  if (flags.browseAgents && (flags.allAgents || flags.noAgents || flags.agents || flags.browse)) {
    console.error('Error: --browse-agents cannot be used with other agent flags');
    process.exit(1);
  }
  
  if (flags.browse && (flags.allAgents || flags.noAgents || flags.browseAgents)) {
    console.error('Error: --browse cannot be used with other agent flags except --agents');
    process.exit(1);
  }
}

validateFlags();

// Validate the project name
if (projectName !== '.') {
  try {
    validateProjectName(projectName);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

const targetDir = path.resolve(process.cwd(), projectName);
const templateDir = path.join(__dirname, '..', 'template');

// Create readline interface only if needed
let rl = null;
if (!flags.force && !flags.dryRun) {
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

function prompt(question) {
  if (!rl) {
    throw new Error('Readline interface not initialized');
  }
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase().trim());
    });
  });
}

function normalizeConflictStrategy(input) {
  const normalized = input.toLowerCase().trim();
  
  // Accept abbreviations and variations
  if (normalized === 's' || normalized === 'skip' || normalized === '1') return 'skip';
  if (normalized === 'r' || normalized === 'rename' || normalized === '2') return 'rename';
  if (normalized === 'o' || normalized === 'overwrite' || normalized === '3') return 'overwrite';
  
  return null;
}

// Function to validate agent files for security
function validateAgentFile(file) {
  // Ensure the file is just a basename without directory separators
  const basename = path.basename(file);
  if (file !== basename) {
    return false;
  }
  // Additional validation: ensure it's a markdown file
  if (!file.endsWith('.md')) {
    return false;
  }
  // Reject files with suspicious patterns
  if (file.includes('..') || file.includes('./') || file.includes('\\')) {
    return false;
  }
  return true;
}

// Function to check if Claude Code is installed
function checkClaudeCode() {
  const claudeDir = path.join(targetDir, '.claude');
  const claudeCodeFile = path.join(targetDir, 'claude_code.txt');
  const hasClaudeDir = fs.existsSync(claudeDir);
  const hasClaudeCodeFile = fs.existsSync(claudeCodeFile);
  
  return {
    isInstalled: hasClaudeDir || hasClaudeCodeFile,
    hasClaudeDir: hasClaudeDir,
    hasClaudeCodeFile: hasClaudeCodeFile
  };
}

// Function to initialize .claude directory structure
async function initializeClaudeDirectory(selectedAgentFiles, conflictStrategy, dryRun) {
  const claudeDir = path.join(targetDir, '.claude');
  const claudeAgentsDir = path.join(claudeDir, 'agents');
  const templateClaudeDir = path.join(templateDir, '.claude');
  
  const createdItems = [];
  const skippedItems = [];
  
  try {
    // Create .claude directory
    if (!fs.existsSync(claudeDir)) {
      if (!dryRun) {
        fs.mkdirSync(claudeDir, { recursive: true });
      }
      createdItems.push('.claude/');
      if (dryRun) {
        console.log('  📁 Would create directory: .claude/');
      }
    } else {
      skippedItems.push('.claude/');
    }
    
    // Create .claude/agents directory
    if (!fs.existsSync(claudeAgentsDir)) {
      if (!dryRun) {
        fs.mkdirSync(claudeAgentsDir, { recursive: true });
      }
      createdItems.push('.claude/agents/');
      if (dryRun) {
        console.log('  📁 Would create directory: .claude/agents/');
      }
    } else {
      skippedItems.push('.claude/agents/');
    }
    
    // Copy .claude/README.md
    const claudeReadmeSrc = path.join(templateClaudeDir, 'README.md');
    const claudeReadmeDest = path.join(claudeDir, 'README.md');
    if (fs.existsSync(claudeReadmeSrc)) {
      if (!fs.existsSync(claudeReadmeDest)) {
        if (!dryRun) {
          fs.copyFileSync(claudeReadmeSrc, claudeReadmeDest);
        }
        createdItems.push('.claude/README.md');
        if (dryRun) {
          console.log('  ✨ Would copy: .claude/README.md');
        }
      } else {
        if (conflictStrategy === 'overwrite') {
          if (!dryRun) {
            fs.copyFileSync(claudeReadmeSrc, claudeReadmeDest);
          }
          if (dryRun) {
            console.log('  ♻️  Would replace: .claude/README.md');
          }
        } else if (conflictStrategy === 'rename') {
          const ext = path.extname(claudeReadmeDest);
          const baseName = path.basename(claudeReadmeDest, ext);
          const dirName = path.dirname(claudeReadmeDest);
          let newDest = path.join(dirName, `${baseName}-ccsetup${ext}`);
          let counter = 1;
          while (fs.existsSync(newDest)) {
            newDest = path.join(dirName, `${baseName}-ccsetup-${counter}${ext}`);
            counter++;
          }
          if (!dryRun) {
            fs.copyFileSync(claudeReadmeSrc, newDest);
          }
          const relativePath = path.relative(claudeDir, newDest);
          createdItems.push(relativePath);
          if (dryRun) {
            console.log(`  📄 Would create: ${relativePath}`);
          } else {
            console.log(`  📄 Created: ${relativePath}`);
          }
        } else {
          skippedItems.push('.claude/README.md');
          if (dryRun) {
            console.log('  ⏭️  Would skip: .claude/README.md');
          }
        }
      }
    }
    
    // Copy .claude/agents/README.md
    const agentsReadmeSrc = path.join(templateClaudeDir, 'agents', 'README.md');
    const agentsReadmeDest = path.join(claudeAgentsDir, 'README.md');
    if (fs.existsSync(agentsReadmeSrc)) {
      if (!fs.existsSync(agentsReadmeDest)) {
        if (!dryRun) {
          fs.copyFileSync(agentsReadmeSrc, agentsReadmeDest);
        }
        createdItems.push('.claude/agents/README.md');
        if (dryRun) {
          console.log('  ✨ Would copy: .claude/agents/README.md');
        }
      } else {
        if (conflictStrategy === 'overwrite') {
          if (!dryRun) {
            fs.copyFileSync(agentsReadmeSrc, agentsReadmeDest);
          }
          if (dryRun) {
            console.log('  ♻️  Would replace: .claude/agents/README.md');
          }
        } else if (conflictStrategy === 'rename') {
          const ext = path.extname(agentsReadmeDest);
          const baseName = path.basename(agentsReadmeDest, ext);
          const dirName = path.dirname(agentsReadmeDest);
          let newDest = path.join(dirName, `${baseName}-ccsetup${ext}`);
          let counter = 1;
          while (fs.existsSync(newDest)) {
            newDest = path.join(dirName, `${baseName}-ccsetup-${counter}${ext}`);
            counter++;
          }
          if (!dryRun) {
            fs.copyFileSync(agentsReadmeSrc, newDest);
          }
          const relativePath = path.relative(claudeDir, newDest);
          createdItems.push(relativePath);
          if (dryRun) {
            console.log(`  📄 Would create: ${relativePath}`);
          } else {
            console.log(`  📄 Created: ${relativePath}`);
          }
        } else {
          skippedItems.push('.claude/agents/README.md');
          if (dryRun) {
            console.log('  ⏭️  Would skip: .claude/agents/README.md');
          }
        }
      }
    }
    
    // Copy selected agents to .claude/agents
    const templateAgentsDir = path.join(templateDir, 'agents');
    let copiedAgents = 0;
    let skippedAgents = 0;
    
    for (const agentFile of selectedAgentFiles) {
      // Validate agent file before processing
      if (!validateAgentFile(agentFile)) {
        console.warn(`⚠️  Skipping invalid agent file: ${agentFile}`);
        continue;
      }
      
      // Use basename to ensure safety
      const safeAgentFile = path.basename(agentFile);
      const agentSrc = path.join(templateAgentsDir, safeAgentFile);
      const agentDest = path.join(claudeAgentsDir, safeAgentFile);
      
      // Additional validation: ensure source is within template directory
      const normalizedAgentSrc = path.normalize(agentSrc);
      const normalizedTemplateAgentsDir = path.normalize(templateAgentsDir);
      if (!normalizedAgentSrc.startsWith(normalizedTemplateAgentsDir)) {
        console.warn(`⚠️  Skipping agent file outside template directory: ${agentFile}`);
        continue;
      }
      
      if (fs.existsSync(agentSrc)) {
        if (!fs.existsSync(agentDest)) {
          if (!dryRun) {
            fs.copyFileSync(agentSrc, agentDest);
          }
          copiedAgents++;
          createdItems.push(`.claude/agents/${safeAgentFile}`);
          if (dryRun) {
            console.log(`  ✨ Would copy: .claude/agents/${safeAgentFile}`);
          }
        } else {
          if (conflictStrategy === 'overwrite') {
            if (!dryRun) {
              fs.copyFileSync(agentSrc, agentDest);
            }
            copiedAgents++;
            if (dryRun) {
              console.log(`  ♻️  Would replace: .claude/agents/${safeAgentFile}`);
            }
          } else if (conflictStrategy === 'rename') {
            const ext = path.extname(agentDest);
            const baseName = path.basename(agentDest, ext);
            const dirName = path.dirname(agentDest);
            let newDest = path.join(dirName, `${baseName}-ccsetup${ext}`);
            let counter = 1;
            while (fs.existsSync(newDest)) {
              newDest = path.join(dirName, `${baseName}-ccsetup-${counter}${ext}`);
              counter++;
            }
            if (!dryRun) {
              fs.copyFileSync(agentSrc, newDest);
            }
            copiedAgents++;
            const relativePath = path.relative(claudeDir, newDest);
            createdItems.push(relativePath);
            if (dryRun) {
              console.log(`  📄 Would create: ${relativePath}`);
            } else {
              console.log(`  📄 Created: ${relativePath}`);
            }
          } else {
            skippedAgents++;
            skippedItems.push(`.claude/agents/${safeAgentFile}`);
            if (dryRun) {
              console.log(`  ⏭️  Would skip: .claude/agents/${safeAgentFile}`);
            }
          }
        }
      }
    }
    
    return {
      createdItems,
      skippedItems,
      copiedAgents,
      skippedAgents
    };
    
  } catch (error) {
    throw new Error(`Failed to initialize .claude directory: ${error.message}`);
  }
}

// Function to parse agent frontmatter
function parseAgentFrontmatter(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    if (lines[0] !== '---') {
      return null;
    }
    
    let name = '';
    let description = '';
    let inFrontmatter = true;
    let lineIndex = 1;
    
    while (lineIndex < lines.length && inFrontmatter) {
      const line = lines[lineIndex];
      if (line === '---') {
        inFrontmatter = false;
      } else if (line.startsWith('name:')) {
        name = line.substring(5).trim();
      } else if (line.startsWith('description:')) {
        description = line.substring(12).trim();
      }
      lineIndex++;
    }
    
    return { name, description };
  } catch (error) {
    return null;
  }
}

// Function to get available agents
function getAvailableAgents() {
  const agentsDir = path.join(templateDir, 'agents');
  const agents = [];
  
  try {
    const files = fs.readdirSync(agentsDir);
    for (const file of files) {
      if (file.endsWith('.md') && file !== 'README.md') {
        const filePath = path.join(agentsDir, file);
        const metadata = parseAgentFrontmatter(filePath);
        if (metadata && metadata.name) {
          agents.push({
            file,
            name: metadata.name,
            description: metadata.description || 'No description available'
          });
        }
      }
    }
  } catch (error) {
    console.error('Warning: Could not read agents directory:', error.message);
  }
  
  return agents.sort((a, b) => a.name.localeCompare(b.name));
}

// Install Claude Code hooks
async function installClaudeHooks() {
  console.log('\n🪝 Installing Claude Code Workflow Selection Hook...\n');
  
  const claudeDir = path.join(process.cwd(), '.claude');
  const hooksDir = path.join(claudeDir, 'hooks');
  const settingsFile = path.join(claudeDir, 'settings.json');
  
  // Check if .claude directory exists
  if (!fs.existsSync(claudeDir)) {
    console.error('❌ Error: .claude directory not found.');
    console.log('\n💡 Please run "claude init" first to initialize Claude Code in this directory.\n');
    return;
  }
  
  try {
    // Create hooks directory
    if (!fs.existsSync(hooksDir)) {
      fs.mkdirSync(hooksDir, { recursive: true });
      console.log('✅ Created .claude/hooks directory');
    }
    
    // Copy workflow-selector hook
    const hookSourceDir = path.join(templateDir, 'hooks', 'workflow-selector');
    const hookDestDir = path.join(hooksDir, 'workflow-selector');
    
    if (!fs.existsSync(hookSourceDir)) {
      console.error('❌ Error: Hook source files not found in template.');
      return;
    }
    
    // Check if hook already exists
    const hookFile = path.join(hookSourceDir, 'index.js');
    const destFile = path.join(hookDestDir, 'index.js');
    let shouldCopyHook = true;
    
    if (fs.existsSync(destFile)) {
      console.log('⚠️  Workflow-selector hook already exists.');
      const selectModule = await import('@inquirer/select');
      const select = selectModule.default;
      
      const action = await select({
        message: 'How would you like to proceed?',
        choices: [
          {
            name: '📋 Keep existing - Preserve your customizations',
            value: 'keep',
            description: 'Keep your existing hook file unchanged'
          },
          {
            name: '🔄 Update - Replace with latest version',
            value: 'replace',
            description: 'Replace with the latest hook (backup will be created)'
          },
          {
            name: '👀 Compare - View differences first',
            value: 'compare',
            description: 'Compare existing and new versions before deciding'
          },
          {
            name: '❌ Skip - Cancel hook installation',
            value: 'skip',
            description: 'Skip installing the hook file'
          }
        ]
      });
      
      if (action === 'skip') {
        console.log('⏭️  Skipped hook file installation');
        shouldCopyHook = false;
      } else if (action === 'keep') {
        console.log('✅ Keeping existing hook file');
        shouldCopyHook = false;
      } else if (action === 'compare') {
        // Show comparison
        console.log('\n📄 Existing hook file summary:');
        const existingContent = fs.readFileSync(destFile, 'utf8');
        const existingLines = existingContent.split('\n').length;
        console.log(`   Lines: ${existingLines}`);
        console.log(`   Size: ${fs.statSync(destFile).size} bytes`);
        console.log(`   Modified: ${fs.statSync(destFile).mtime.toLocaleString()}`);
        
        const confirmModule = await import('@inquirer/confirm');
        const confirm = confirmModule.default;
        const shouldReplace = await confirm({
          message: 'Replace with new version?',
          default: false
        });
        
        if (shouldReplace) {
          // Create backup
          const backupFile = destFile + '.backup-' + Date.now();
          fs.copyFileSync(destFile, backupFile);
          console.log(`✅ Created backup: ${path.basename(backupFile)}`);
          shouldCopyHook = true;
        } else {
          shouldCopyHook = false;
        }
      } else if (action === 'replace') {
        // Create backup
        const backupFile = destFile + '.backup-' + Date.now();
        fs.copyFileSync(destFile, backupFile);
        console.log(`✅ Created backup: ${path.basename(backupFile)}`);
        shouldCopyHook = true;
      }
    }
    
    // Create workflow-selector directory if needed
    if (!fs.existsSync(hookDestDir)) {
      fs.mkdirSync(hookDestDir, { recursive: true });
    }
    
    // Copy hook file if needed
    if (shouldCopyHook) {
      fs.copyFileSync(hookFile, destFile);
      console.log('✅ Installed workflow-selector hook');
    }
    
    // Update settings.json
    let settings = {};
    if (fs.existsSync(settingsFile)) {
      const content = fs.readFileSync(settingsFile, 'utf8');
      try {
        settings = JSON.parse(content);
      } catch (e) {
        console.warn('⚠️  Warning: Could not parse existing settings.json, creating new one');
      }
    }
    
    // Add hook configuration intelligently
    if (!settings.hooks) {
      settings.hooks = {};
    }
    
    // Check if UserPromptSubmit hooks already exist
    const workflowHookCommand = "node $CLAUDE_PROJECT_DIR/.claude/hooks/workflow-selector/index.js";
    let hookExists = false;
    
    if (settings.hooks.UserPromptSubmit && Array.isArray(settings.hooks.UserPromptSubmit)) {
      // Check if our hook is already configured
      hookExists = settings.hooks.UserPromptSubmit.some(hookConfig => 
        hookConfig.hooks && hookConfig.hooks.some(hook => 
          hook.type === 'command' && hook.command === workflowHookCommand
        )
      );
      
      if (hookExists) {
        console.log('✅ Workflow hook already configured in settings.json');
      } else {
        // Ask user how to proceed
        const selectModule = await import('@inquirer/select');
        const select = selectModule.default;
        
        console.log('\n⚠️  Existing UserPromptSubmit hooks detected in settings.json');
        const action = await select({
          message: 'How would you like to add the workflow hook?',
          choices: [
            {
              name: '➕ Add to existing - Preserve current hooks and add workflow hook',
              value: 'add',
              description: 'Keep all existing hooks and add the workflow hook'
            },
            {
              name: '🔄 Replace all - Replace existing hooks with workflow hook',
              value: 'replace',
              description: 'Replace all existing hooks (backup will be created)'
            },
            {
              name: '❌ Skip - Don\'t modify hooks configuration',
              value: 'skip',
              description: 'Keep settings.json unchanged'
            }
          ]
        });
        
        if (action === 'add') {
          // Add our hook to existing array
          settings.hooks.UserPromptSubmit.push({
            "matcher": ".*",
            "hooks": [
              {
                "type": "command",
                "command": workflowHookCommand
              }
            ]
          });
          console.log('✅ Added workflow hook to existing hooks');
        } else if (action === 'replace') {
          // Backup existing settings
          const backupFile = settingsFile + '.backup-' + Date.now();
          fs.writeFileSync(backupFile, JSON.stringify(settings, null, 2));
          console.log(`✅ Created settings backup: ${path.basename(backupFile)}`);
          
          // Replace with our hook
          settings.hooks.UserPromptSubmit = [
            {
              "matcher": ".*",
              "hooks": [
                {
                  "type": "command",
                  "command": workflowHookCommand
                }
              ]
            }
          ];
          console.log('✅ Replaced existing hooks with workflow hook');
        } else {
          console.log('⏭️  Skipped settings.json modification');
          return;
        }
      }
    } else {
      // No existing UserPromptSubmit hooks, safe to add
      settings.hooks.UserPromptSubmit = [
        {
          "matcher": ".*",
          "hooks": [
            {
              "type": "command",
              "command": workflowHookCommand
            }
          ]
        }
      ];
      console.log('✅ Added workflow hook configuration');
    }
    
    // Write updated settings only if we made changes
    if (!hookExists) {
      fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
      console.log('✅ Updated .claude/settings.json');
    }
    
    // Copy agent-orchestration.md if it doesn't exist
    const orchestrationSource = path.join(templateDir, 'docs', 'agent-orchestration.md');
    const orchestrationDest = path.join(process.cwd(), 'docs', 'agent-orchestration.md');
    
    if (!fs.existsSync(orchestrationDest) && fs.existsSync(orchestrationSource)) {
      const docsDir = path.join(process.cwd(), 'docs');
      if (!fs.existsSync(docsDir)) {
        fs.mkdirSync(docsDir, { recursive: true });
      }
      fs.copyFileSync(orchestrationSource, orchestrationDest);
      console.log('✅ Copied agent-orchestration.md to docs/');
    }
    
    console.log('\n🎉 Workflow selection hook installed successfully!\n');
    console.log('The hook will:');
    console.log('  • Analyze your prompts to determine task type');
    console.log('  • Suggest appropriate workflows (Feature Development, Bug Fix, etc.)');
    console.log('  • Generate relevant todo items');
    console.log('  • Guide agent selection based on the task\n');
    console.log('📝 Note: The hook reads workflows from docs/agent-orchestration.md');
    console.log('💡 You can disable the hook by editing .claude/settings.json\n');
    
  } catch (error) {
    console.error('❌ Error installing hooks:', error.message);
  }
}

// Setup mode selection function
async function selectSetupMode() {
  // Direct flag handling
  if (flags.installHooks) return 'install-hooks';
  if (flags.scanOnly) return 'scan-only';
  if (flags.agents) return 'agents-only';
  if (flags.force || flags.browseAgents || flags.allAgents || flags.noAgents) return 'full';
  
  // Skip selection if already in a specific mode
  if (projectName !== '.' || flags.scanContext) return 'full';
  
  // Interactive selection for bare 'npx ccsetup'
  console.log('Welcome to ccsetup! 🎉\n');
  console.log('This tool helps you set up and maintain your Claude Code project.');
  console.log('Let\'s analyze your repository and create the perfect CLAUDE.md file.\n');
  
  // Check if CLAUDE.md exists to provide context
  const claudeMdExists = fs.existsSync(path.join(process.cwd(), 'CLAUDE.md'));
  if (claudeMdExists) {
    console.log('📋 Existing CLAUDE.md detected in this directory.\n');
  } else {
    console.log('📄 No CLAUDE.md found. Let\'s create one!\n');
  }
  
  // Dynamic import for ESM module
  const selectModule = await import('@inquirer/select');
  const select = selectModule.default;
  
  const mode = await select({
    message: claudeMdExists ? 
      'CLAUDE.md exists. How would you like to proceed?' : 
      'What would you like to do?',
    choices: claudeMdExists ? [
      {
        name: 'Smart Merge - Keep my content, add new findings',
        value: 'scan-smart',
        description: 'Preserves your customizations while adding newly detected information'
      },
      {
        name: 'Replace - Fresh scan, replace existing',
        value: 'scan-replace',
        description: 'Creates a brand new CLAUDE.md from your current codebase'
      },
      {
        name: 'Full Setup - Add agents and project structure',
        value: 'full',
        description: 'Creates the complete Claude Code boilerplate structure with agents, docs, tickets, and plans'
      }
    ] : [
      {
        name: '🚀 Quick Start - Just create CLAUDE.md',
        value: 'scan-smart',
        description: 'Scans your code and creates CLAUDE.md with project context'
      },
      {
        name: '🏗️  Full Setup - Complete Claude Code structure',
        value: 'full',
        description: 'Creates CLAUDE.md plus agents, docs, tickets, and plans'
      }
    ]
  });
  
  return mode;
}

// Validate scan-only environment
async function validateScanOnlyEnvironment() {
  // Check directory exists and is accessible
  try {
    await fs.promises.access(targetDir, fs.constants.R_OK | fs.constants.W_OK);
  } catch (error) {
    let message = 'Cannot access target directory';
    let suggestion = 'Check directory permissions';
    
    if (error.code === 'ENOENT') {
      message = 'Target directory does not exist';
      suggestion = 'Create the directory first or check the path';
    } else if (error.code === 'EACCES') {
      message = 'Permission denied accessing target directory';
      suggestion = 'Run with appropriate permissions or use sudo';
    } else if (error.code === 'ENOTDIR') {
      message = 'Target path is not a directory';
      suggestion = 'Specify a valid directory path';
    }
    
    return {
      valid: false,
      message,
      suggestion
    };
  }
  
  // Check if CLAUDE.md exists and is writable
  const claudeMdPath = path.join(targetDir, 'CLAUDE.md');
  if (fs.existsSync(claudeMdPath)) {
    try {
      await fs.promises.access(claudeMdPath, fs.constants.R_OK | fs.constants.W_OK);
    } catch (error) {
      return {
        valid: false,
        message: 'Cannot access existing CLAUDE.md file',
        suggestion: 'Check file permissions or run with appropriate access rights'
      };
    }
  }
  
  // Check if directory is empty (warning only)
  const files = await fs.promises.readdir(targetDir);
  const hasFiles = files.some(f => !f.startsWith('.') && f !== 'node_modules');
  
  if (!hasFiles && projectName === '.') {
    console.log('⚠️  Warning: Current directory appears to be empty.');
    console.log('   Scan results may be limited.\n');
  }
  
  return { valid: true };
}

// Get CLAUDE.md template
async function getClaudeMdTemplate() {
  const templatePath = path.join(__dirname, '..', 'template', 'CLAUDE.md');
  try {
    return await fs.promises.readFile(templatePath, 'utf8');
  } catch (error) {
    // Fallback to minimal template
    return `# Claude Code Project Instructions

## Project Overview
[Project description will be added here]

## Key Objectives
[Project objectives will be added here]

## Additional Notes
[Any other important information for Claude to know about this project]
`;
  }
}

// Scan-only mode implementation
async function scanOnlyMode(defaultMergeStrategy = 'smart') {
  console.log('\n🔍 Repository Scan Mode\n');
  
  // Provide context based on merge strategy
  switch (defaultMergeStrategy) {
    case 'smart':
      console.log('Smart Merge Mode');
      console.log('Intelligently merges new findings with your existing CLAUDE.md');
      console.log('Preserves your customizations while adding newly detected information\n');
      break;
    case 'replace':
      console.log('Replace Mode');
      console.log('Creates a brand new CLAUDE.md from your current codebase');
      console.log('Perfect for: Starting fresh or major project restructuring\n');
      break;
  }
  
  console.log('This will analyze your repository and update CLAUDE.md with:');
  console.log('  • Project structure and organization');
  console.log('  • Technology stack and dependencies');
  console.log('  • Available commands and scripts');
  console.log('  • Architectural patterns detected');
  console.log('  • Important context for Claude\n');
  
  // Validate environment
  const validation = await validateScanOnlyEnvironment();
  if (!validation.valid) {
    console.error(`❌ ${validation.message}`);
    if (validation.suggestion) {
      console.log(`💡 ${validation.suggestion}`);
    }
    return;
  }
  
  // Confirmation prompt (unless --force)
  if (!flags.force && !flags.dryRun) {
    // Create readline interface if needed
    if (!rl) {
      rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
    }
    
    // Use inquirer instead of readline prompt
    const confirmModule = await import('@inquirer/confirm');
    const confirm = confirmModule.default;
    const shouldContinue = await confirm({
      message: 'Continue?',
      default: true
    });
    if (!shouldContinue) {
      console.log('Setup cancelled.');
      if (rl) rl.close();
      return;
    }
  }
  
  // Check if directory has meaningful files
  const files = await fs.promises.readdir(targetDir);
  const hasFiles = files.some(f => !f.startsWith('.') && f !== 'node_modules');
  
  // Perform repository scan
  let repositoryContext = null;
  try {
    repositoryContext = await scanRepositoryForContext(targetDir);
  } catch (error) {
    console.error('❌ Repository scanning failed:', error.message);
    if (rl) rl.close();
    return;
  }
  
  if (!repositoryContext) {
    // Handle empty directory case
    if (!hasFiles && projectName === '.') {
      console.log('📝 Since the directory is empty, would you like to:');
      console.log('1) Create a minimal CLAUDE.md with basic template');
      console.log('2) Cancel and run full setup instead');
      
      // Use inquirer instead of readline prompt
      const selectModule = await import('@inquirer/select');
      const select = selectModule.default;
      const choice = await select({
        message: 'Choose an option:',
        choices: [
          { name: '1) Continue with minimal context', value: '1' },
          { name: '2) Cancel and run full setup instead', value: '2' }
        ]
      });
      
      if (choice === '2') {
        console.log('\n💡 Run `npx ccsetup` without --scan-only for full project setup.');
        if (rl) rl.close();
        return;
      }
      
      // Continue with minimal context
      repositoryContext = {
        formattedContext: `
## Additional Notes

This project directory was empty when scanned. 
Please update this file with relevant project information as you develop.

### Getting Started
- Add project description above
- Define key objectives
- Document important conventions
- Update as the project evolves
`
      };
    } else {
      console.log('❌ Unable to generate context from repository.');
      console.log('💡 Tip: Make sure you\'re in a valid project directory.');
      if (rl) rl.close();
      return;
    }
  }
  
  // Preview and confirm context
  if (!flags.force && !flags.dryRun) {
    const confirmResult = await previewAndConfirmContext(repositoryContext.formattedContext);
    if (confirmResult === 'n' || confirmResult === 'no') {
      console.log('✅ Setup cancelled.');
      if (rl) rl.close();
      return;
    }
  }
  
  // Handle CLAUDE.md creation/update
  const claudeMdPath = path.join(targetDir, 'CLAUDE.md');
  const exists = fs.existsSync(claudeMdPath);
  let backupPath = null;
  let mergeStrategy = 'smart'; // Default merge strategy
  
  try {
    if (exists) {
      // Update existing CLAUDE.md
      if (!flags.force && !flags.dryRun) {
        console.log('\n📋 Existing CLAUDE.md detected!');
        
        // Use the default merge strategy if provided
        if (defaultMergeStrategy === 'replace') {
          console.log('This will replace your existing CLAUDE.md with a fresh scan.');
          console.log('   Your current content will be backed up first.');
          const confirmModule = await import('@inquirer/confirm');
          const confirm = confirmModule.default;
          const shouldProceed = await confirm({
            message: 'Proceed with replacement?',
            default: false
          });
          if (!shouldProceed) {
            console.log('Cancelled.');
            if (rl) rl.close();
            return;
          }
          mergeStrategy = 'replace';
        } else {
          console.log('The scan will:');
          console.log('  • Preserve all your existing content');
          console.log('  • Add new findings from the scan');
          console.log('  • Create an automatic backup');

          const confirmModule = await import('@inquirer/confirm');
          const confirm = confirmModule.default;
          const shouldContinue = await confirm({
            message: 'Continue with smart merge?',
            default: true
          });
          if (!shouldContinue) {
            console.log('Update cancelled.');
            if (rl) rl.close();
            return;
          }
          mergeStrategy = 'smart';
        }
      } else {
        mergeStrategy = defaultMergeStrategy;
      }
      
      console.log('\n📄 Updating existing CLAUDE.md...');
      
      if (!flags.dryRun) {
        // Check file size before processing
        const stats = fs.statSync(claudeMdPath);
        if (stats.size > 1024 * 1024) { // 1MB
          console.warn('⚠️  Warning: CLAUDE.md is large (>1MB). Processing may take longer.');
        }
        
        let existingContent;
        try {
          existingContent = fs.readFileSync(claudeMdPath, 'utf8');
        } catch (error) {
          throw new Error(`Failed to read existing CLAUDE.md: ${error.message}`);
        }
        
        // Validate content
        if (!existingContent) {
          console.warn('⚠️  Warning: Existing CLAUDE.md appears to be empty.');
        }
        
        // Create backup first
        backupPath = `${claudeMdPath}.backup.${Date.now()}`;
        try {
          fs.writeFileSync(backupPath, existingContent);
          console.log(`📦 Backup created: ${path.basename(backupPath)}`);
        } catch (error) {
          throw new Error(`Failed to create backup: ${error.message}`);
        }
        
        // Use intelligent merge with backup
        let updatedContent;
        try {
          updatedContent = await mergeContextIntelligently(existingContent, repositoryContext, mergeStrategy);
        } catch (mergeError) {
          if (mergeError.message === 'Interactive merge cancelled') {
            console.log('💾 Your original CLAUDE.md is unchanged.');
            console.log(`📦 Scan results backup: ${path.basename(backupPath)}`);
            if (rl) rl.close();
            return;
          } else if (mergeError.message === 'Missing required dependency') {
            console.error('Please install missing dependencies and try again.');
            if (rl) rl.close();
            return;
          }
          throw mergeError;
        }
        
        try {
          fs.writeFileSync(claudeMdPath, updatedContent, 'utf8');
        } catch (error) {
          // Restore from backup if write fails
          try {
            fs.writeFileSync(claudeMdPath, existingContent, 'utf8');
            console.error('❌ Failed to update CLAUDE.md. Original content restored.');
          } catch (restoreError) {
            console.error('❌ Critical: Failed to update AND restore CLAUDE.md!');
            console.error(`💾 Your content is safe in: ${path.basename(backupPath)}`);
          }
          throw new Error(`Failed to write updated content: ${error.message}`);
        }
        
        console.log('✅ CLAUDE.md updated successfully!\n');
        
        // Provide feedback based on merge strategy used
        if (mergeStrategy === 'smart') {
          console.log('   Smart merge completed');
          console.log('   - Your customizations preserved');
          console.log('   - New findings integrated');
        } else if (mergeStrategy === 'replace') {
          console.log('   Replace completed');
          console.log('   - New CLAUDE.md generated from current codebase');
        }
        
        console.log(`   📦 Backup saved: ${path.basename(backupPath)}`);
        console.log('   💡 Review the updated content and delete backup when satisfied');
      } else {
        console.log('  Would update: CLAUDE.md (dry-run mode)');
      }
    } else {
      // Create new CLAUDE.md
      console.log('\n📄 Creating CLAUDE.md...');
      
      if (!flags.dryRun) {
        const template = await getClaudeMdTemplate();
        const enhanced = await applyContextToTemplate(template, repositoryContext, 'append');
        fs.writeFileSync(claudeMdPath, enhanced, 'utf8');
        console.log('✅ CLAUDE.md created with project context!');
      } else {
        console.log('  Would create: CLAUDE.md (dry-run mode)');
      }
    }
    
    // Show next steps
    console.log('\nNext steps:');
    console.log('1. Review the updated Additional Notes section in CLAUDE.md');
    console.log('2. Move any important context to appropriate sections');
    if (exists && backupPath && !flags.dryRun) {
      console.log(`3. Delete the backup file once satisfied: ${path.basename(backupPath)}`);
      console.log('4. Run `ccsetup scan` anytime to refresh context');
    } else if (exists) {
      console.log('3. Run `ccsetup scan` anytime to refresh context');
    } else {
      console.log('3. Add project-specific instructions and guidelines');
      console.log('4. Run `npx ccsetup` for full setup if you need agents and project structure');
      console.log('5. Run `ccsetup scan` anytime to refresh context');
    }
    
  } catch (error) {
    console.error('❌ Error handling CLAUDE.md:', error.message);
    if (exists && !flags.dryRun) {
      console.log('💡 Your original CLAUDE.md is safe. Check for backup files if needed.');
    }
  } finally {
    if (rl) rl.close();
  }
}

// Dynamic import for ESM module
async function importCheckbox() {
  try {
    const module = await import('@inquirer/checkbox');
    return module.default;
  } catch (error) {
    console.error('Error: Failed to load @inquirer/checkbox. Please ensure it is installed.');
    console.error('Run: npm install @inquirer/checkbox');
    process.exit(1);
  }
}

async function selectAgents(availableAgents) {
  const checkbox = await importCheckbox();
  
  // ANSI color codes
  const colors = {
    cyan: '\x1b[36m',
    yellow: '\x1b[33m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    reset: '\x1b[0m'
  };
  
  const choices = availableAgents.map(agent => ({
    name: `${colors.cyan}${colors.bold}${agent.name}${colors.reset}\n     ${colors.dim}${agent.description}${colors.reset}`,
    value: agent.file,
    checked: false
  }));
  
  console.log('\n🤖 Select agents to include in your Claude Code project\n');
  console.log(`${colors.dim}Use arrow keys to navigate, space to select/deselect, 'a' to toggle all${colors.reset}\n`);
  
  const selectedFiles = await checkbox({
    message: `${colors.bold}Choose your agents:${colors.reset}`,
    choices,
    pageSize: 10,
    loop: false
  });
  
  // Validate selected files to prevent path traversal
  const validatedFiles = selectedFiles.filter(file => {
    // Use centralized validation function
    if (!validateAgentFile(file)) {
      console.warn(`⚠️  Skipping invalid agent file: ${file}`);
      return false;
    }
    // Ensure it exists in available agents
    if (!availableAgents.some(agent => agent.file === file)) {
      console.warn(`⚠️  Skipping unknown agent file: ${file}`);
      return false;
    }
    return true;
  });
  
  return validatedFiles;
}

async function enhancedAgentSelection() {
  try {
    console.log('\n🔍 Loading template catalog...');
    const catalog = TemplateCatalog.createInstance();
    const templates = await catalog.load();
    
    if (!templates.agents || templates.agents.length === 0) {
      console.log('❌ No agents found in catalog. Falling back to basic selection.');
      return await selectAgents(getAvailableAgents());
    }
    
    console.log(`✅ Found ${templates.agents.length} agents in catalog\n`);
    
    // Import select for mode selection
    const selectModule = await import('@inquirer/select');
    const select = selectModule.default;
    
    const mode = await select({
      message: 'How would you like to browse and select agents?',
      choices: [
        {
          name: '🔍 Search & Filter - Find agents by keywords and categories',
          value: 'search',
          description: 'Use search and filtering to find exactly what you need'
        },
        {
          name: '📂 Browse by Category - Explore agents organized by type',
          value: 'category',
          description: 'Browse agents grouped by their specialization'
        },
        {
          name: '🏷️  Browse by Tags - Find agents with specific capabilities',
          value: 'tags',
          description: 'Explore agents based on their tags and features'
        },
        {
          name: '📋 Simple List - Traditional selection from all agents',
          value: 'simple',
          description: 'Classic checkbox selection from complete agent list'
        }
      ]
    });
    
    let selectedAgents = [];
    
    switch (mode) {
      case 'search':
        selectedAgents = await searchAndFilterSelection(templates.agents);
        break;
      case 'category':
        selectedAgents = await categoryBrowseSelection(templates.agents);
        break;
      case 'tags':
        selectedAgents = await tagBrowseSelection(templates.agents);
        break;
      case 'simple':
      default:
        selectedAgents = await simpleListSelection(templates.agents);
        break;
    }
    
    return selectedAgents.map(agent => agent.files[0]).filter(file => file && validateAgentFile(file));
    
  } catch (error) {
    console.warn(`⚠️  Enhanced selection failed: ${error.message}`);
    console.log('Falling back to basic agent selection...\n');
    return await selectAgents(getAvailableAgents());
  }
}

async function searchAndFilterSelection(agents) {
  const inputModule = await import('@inquirer/input');
  const input = inputModule.default;
  const selectModule = await import('@inquirer/select');
  const select = selectModule.default;
  const checkboxModule = await import('@inquirer/checkbox');
  const checkbox = checkboxModule.default;
  
  console.log('\n🔍 Search & Filter Mode\n');
  
  let currentResults = agents;
  const selectedAgents = [];
  
  while (true) {
    console.log(`\n📊 Current results: ${currentResults.length} agents`);
    
    const action = await select({
      message: 'What would you like to do?',
      choices: [
        { name: '🔍 Search by keyword', value: 'search' },
        { name: '📂 Filter by category', value: 'category' },
        { name: '🏷️  Filter by tags', value: 'tags' },
        { name: '📋 Select from current results', value: 'select' },
        { name: '🔄 Reset filters', value: 'reset' },
        { name: '✅ Finish selection', value: 'done' }
      ]
    });
    
    if (action === 'done') break;
    
    if (action === 'reset') {
      currentResults = agents;
      continue;
    }
    
    if (action === 'search') {
      const query = await input({
        message: 'Enter search terms:',
        validate: (input) => input.trim().length > 0 ? true : 'Please enter a search term'
      });
      
      const search = new TemplateSearch(currentResults);
      currentResults = search.search(query.trim()).getResults();
      console.log(`Found ${currentResults.length} agents matching "${query}"`);
      continue;
    }
    
    if (action === 'category') {
      const filter = new TemplateFilter(currentResults);
      const categories = filter.getSubcategories();
      
      if (categories.length === 0) {
        console.log('No categories available in current results.');
        continue;
      }
      
      const category = await select({
        message: 'Select category:',
        choices: [
          { name: 'All categories', value: 'all' },
          ...categories.map(cat => ({ name: cat, value: cat }))
        ]
      });
      
      currentResults = filter.byCategory(category).getResults();
      console.log(`Filtered to ${currentResults.length} agents in category "${category}"`);
      continue;
    }
    
    if (action === 'tags') {
      const filter = new TemplateFilter(currentResults);
      const tagCloud = filter.getTagsByFrequency();
      
      if (tagCloud.length === 0) {
        console.log('No tags available in current results.');
        continue;
      }
      
      const tags = await checkbox({
        message: 'Select tags to filter by:',
        choices: tagCloud.slice(0, 15).map(({ tag, count }) => ({
          name: `${tag} (${count})`,
          value: tag
        })),
        pageSize: 10
      });
      
      if (tags.length > 0) {
        currentResults = filter.byTags(tags).getResults();
        console.log(`Filtered to ${currentResults.length} agents with tags: ${tags.join(', ')}`);
      }
      continue;
    }
    
    if (action === 'select') {
      if (currentResults.length === 0) {
        console.log('No agents in current results to select from.');
        continue;
      }
      
      const choices = currentResults.map(agent => ({
        name: `${agent.name}\n     ${agent.description}`,
        value: agent,
        checked: selectedAgents.some(selected => selected.id === agent.id)
      }));
      
      const newSelections = await checkbox({
        message: `Select agents (${currentResults.length} available):`,
        choices,
        pageSize: 8
      });
      
      // Update selected agents
      selectedAgents.length = 0;
      selectedAgents.push(...newSelections);
      
      console.log(`Selected ${selectedAgents.length} agents`);
    }
  }
  
  return selectedAgents;
}

async function categoryBrowseSelection(agents) {
  const selectModule = await import('@inquirer/select');
  const select = selectModule.default;
  const checkboxModule = await import('@inquirer/checkbox');
  const checkbox = checkboxModule.default;
  
  console.log('\n📂 Category Browse Mode\n');
  
  const filter = new TemplateFilter(agents);
  const categoryCatalog = {};
  
  // Group agents by subcategory
  agents.forEach(agent => {
    if (!categoryCatalog[agent.subcategory]) {
      categoryCatalog[agent.subcategory] = [];
    }
    categoryCatalog[agent.subcategory].push(agent);
  });
  
  const categories = Object.keys(categoryCatalog).sort();
  
  if (categories.length === 0) {
    console.log('No categories found. Using simple selection.');
    return await simpleListSelection(agents);
  }
  
  console.log(`Found ${categories.length} categories:`);
  categories.forEach(cat => {
    console.log(`  📂 ${cat} (${categoryCatalog[cat].length} agents)`);
  });
  
  const selectedAgents = [];
  
  while (true) {
    const action = await select({
      message: `Select a category to browse (${selectedAgents.length} agents selected):`,
      choices: [
        ...categories.map(cat => ({
          name: `📂 ${cat} (${categoryCatalog[cat].length} agents)`,
          value: cat
        })),
        { name: '✅ Finish selection', value: 'done' }
      ]
    });
    
    if (action === 'done') break;
    
    const categoryAgents = categoryCatalog[action];
    const choices = categoryAgents.map(agent => ({
      name: `${agent.name}\n     ${agent.description}`,
      value: agent,
      checked: selectedAgents.some(selected => selected.id === agent.id)
    }));
    
    const selections = await checkbox({
      message: `Select agents from ${action}:`,
      choices,
      pageSize: 8
    });
    
    // Update selected agents for this category
    selectedAgents = selectedAgents.filter(agent => agent.subcategory !== action);
    selectedAgents.push(...selections);
    
    console.log(`Updated selection: ${selectedAgents.length} total agents selected`);
  }
  
  return selectedAgents;
}

async function tagBrowseSelection(agents) {
  const selectModule = await import('@inquirer/select');
  const select = selectModule.default;
  const checkboxModule = await import('@inquirer/checkbox');
  const checkbox = checkboxModule.default;
  
  console.log('\n🏷️  Tag Browse Mode\n');
  
  const filter = new TemplateFilter(agents);
  const tagCloud = filter.getTagsByFrequency();
  
  if (tagCloud.length === 0) {
    console.log('No tags found. Using simple selection.');
    return await simpleListSelection(agents);
  }
  
  console.log(`Found ${tagCloud.length} tags. Most popular:`);
  tagCloud.slice(0, 10).forEach(({ tag, count }) => {
    console.log(`  🏷️  ${tag} (${count} agents)`);
  });
  
  const selectedTags = await checkbox({
    message: 'Select tags to filter agents:',
    choices: tagCloud.map(({ tag, count }) => ({
      name: `${tag} (${count} agents)`,
      value: tag
    })),
    pageSize: 12
  });
  
  if (selectedTags.length === 0) {
    console.log('No tags selected. Using all agents.');
    return await simpleListSelection(agents);
  }
  
  const filteredAgents = filter.byTags(selectedTags).getResults();
  console.log(`\nFiltered to ${filteredAgents.length} agents with selected tags`);
  
  if (filteredAgents.length === 0) {
    console.log('No agents match the selected tags.');
    return [];
  }
  
  return await simpleListSelection(filteredAgents);
}

async function simpleListSelection(agents) {
  const checkboxModule = await import('@inquirer/checkbox');
  const checkbox = checkboxModule.default;
  
  console.log('\n📋 Simple List Selection\n');
  
  if (agents.length === 0) {
    console.log('No agents available for selection.');
    return [];
  }
  
  const choices = agents.map(agent => ({
    name: `${agent.name}\n     ${agent.description}`,
    value: agent,
    checked: false
  }));
  
  const selectedAgents = await checkbox({
    message: `Select agents (${agents.length} available):`,
    choices,
    pageSize: 10
  });
  
  return selectedAgents;
}

async function main() {
  try {
    // Ensure template directory exists
    if (!fs.existsSync(templateDir)) {
      throw new Error(`Template directory not found: ${templateDir}`);
    }


    // Add mode selection early (before agent selection)
    const setupMode = await selectSetupMode();
    
    if (setupMode === 'install-hooks') {
      // Install Claude Code hooks
      await installClaudeHooks();
      return;
    }
    
    if (setupMode === 'scan-only' || setupMode === 'scan-smart' || setupMode === 'scan-replace') {
      // Close readline if open
      if (rl) {
        rl.close();
        rl = null;
      }

      // Set appropriate flags based on mode
      flags.scanOnly = true;
      if (setupMode === 'scan-replace') {
        flags.mergeStrategy = 'replace';
      } else {
        flags.mergeStrategy = 'smart';
      }
      
      await scanOnlyMode(flags.mergeStrategy);
      return;
    }

    // Handle --agents and --browse flags for agent selection only
    if (flags.agents || flags.browse) {
      console.log('🤖 Interactive Agent Selection\n');
      
      let selectedAgentFiles = [];
      
      if (flags.browse) {
        // Use enhanced selection interface
        selectedAgentFiles = await enhancedAgentSelection();
      } else {
        // Use traditional selection
        const availableAgents = getAvailableAgents();
        
        if (availableAgents.length === 0) {
          console.log('No agents available for selection.');
          process.exit(0);
        }
        
        selectedAgentFiles = await selectAgents(availableAgents);
      }
      
      if (selectedAgentFiles.length === 0) {
        console.log('\n❌ No agents selected.');
      } else {
        // ANSI color codes
        const colors = {
          cyan: '\x1b[36m',
          green: '\x1b[32m',
          yellow: '\x1b[33m',
          bold: '\x1b[1m',
          dim: '\x1b[2m',
          reset: '\x1b[0m'
        };
        
        console.log(`\n${colors.green}${colors.bold}✅ You selected ${selectedAgentFiles.length} agent${selectedAgentFiles.length === 1 ? '' : 's'}:${colors.reset}\n`);
        
        // Show selected agents with descriptions
        if (flags.browse) {
          // For enhanced selection, we already have agent data
          console.log(`${colors.dim}Selected files: ${selectedAgentFiles.join(', ')}${colors.reset}\n`);
        } else {
          // For traditional selection, show agent details
          const availableAgents = getAvailableAgents();
          selectedAgentFiles.forEach(file => {
            const agent = availableAgents.find(a => a.file === file);
            if (agent) {
              console.log(`  ${colors.cyan}${colors.bold}${agent.name}${colors.reset}`);
              console.log(`     ${colors.dim}${agent.description}${colors.reset}\n`);
            }
          });
        }
        
        console.log(`${colors.yellow}${colors.bold}📝 Next Steps:${colors.reset}`);
        console.log(`${colors.dim}1. Make sure Claude Code is initialized: ${colors.reset}${colors.cyan}claude init${colors.reset}`);
        console.log(`${colors.dim}2. Run: ${colors.reset}${colors.cyan}npx ccsetup${colors.reset}`);
        console.log(`${colors.dim}3. Select the same agents when prompted${colors.reset}\n`);
      }
      
      process.exit(0);
    }

    // Additional path validation
    const normalizedTarget = path.normalize(targetDir);
    const normalizedCwd = path.normalize(process.cwd());
    
    // Ensure target is within or equal to cwd for safety
    if (projectName !== '.' && !normalizedTarget.startsWith(normalizedCwd)) {
      throw new Error('Target directory must be within the current working directory');
    }

    if (flags.dryRun) {
      console.log('🔍 DRY RUN MODE - No files will be created or modified\n');
    }

    // Check for Claude Code installation
    const claudeStatus = checkClaudeCode();
    if (projectName === '.') {
      if (flags.dryRun) {
        console.log('⚠️  Note: Claude Code detection skipped in dry-run mode for current directory\n');
      } else if (!claudeStatus.isInstalled && !claudeStatus.hasClaudeDir) {
        // Offer to create .claude directory
        if (flags.force) {
          console.log('📁 Creating .claude directory structure...\n');
        } else {
          console.log('⚠️  Claude Code not detected in this project.');
          console.log('ccsetup can create the .claude directory structure for you.\n');
          
          // Use inquirer instead of readline prompt since rl might be closed
          const confirmModule = await import('@inquirer/confirm');
          const confirm = confirmModule.default;
          const shouldCreate = await confirm({
            message: 'Would you like to create .claude directory?',
            default: true
          });
          if (!shouldCreate) {
            console.log('\nTo manually initialize Claude Code:');
            console.log('1. Install Claude Code CLI: https://docs.anthropic.com/claude-code/quickstart');
            console.log('2. Run \'claude init\' in your project directory');
            console.log('3. Then run \'npx ccsetup\' again\n');
            console.log('Aborting setup.');
            if (rl) rl.close();
            process.exit(0);
          }
          console.log('');
        }
      }
    }

    // Escape targetDir for safe display
    const safeTargetDir = targetDir.replace(/[^\w\s\-./\\:]/g, '');
    console.log(`${flags.dryRun ? 'Would create' : 'Creating'} Claude Code project in ${safeTargetDir}...`);

    if (projectName !== '.') {
      if (!fs.existsSync(targetDir)) {
        if (!flags.dryRun) {
          try {
            fs.mkdirSync(targetDir, { recursive: true });
          } catch (error) {
            if (error.code === 'EACCES') {
              throw new Error(`Permission denied: Cannot create directory ${targetDir}`);
            } else if (error.code === 'ENOSPC') {
              throw new Error('No space left on device');
            }
            throw error;
          }
        } else {
          console.log(`Would create directory: ${targetDir}`);
        }
      }

      // Check Claude Code in new directory after creation
      const newDirClaudeStatus = checkClaudeCode();
      if (!flags.dryRun && !newDirClaudeStatus.isInstalled) {
        console.log('\n⚠️  Note: Claude Code is not initialized in the new project directory.');
        console.log('After setup, remember to:');
        console.log(`1. cd ${JSON.stringify(projectName)}`);
        console.log('2. Run \'claude init\' to initialize Claude Code\n');
      }
    }

  const fileConflicts = [];
  const dirConflicts = [];
  const allItems = [];
  
  // Group conflicts by category
  const conflictsByCategory = {
    'CLAUDE.md': [],
    'agents': [],
    'docs': [],
    'plans': [],
    'tickets': []
  };
  
  // Store conflict strategies per category
  const conflictStrategies = {
    'CLAUDE.md': 'skip',
    'agents': 'skip',
    'docs': 'skip',
    'plans': 'skip',
    'tickets': 'skip'
  };

  // Get available agents for selection
  const availableAgents = getAvailableAgents();
  let selectedAgentFiles = [];
  

  // Determine which agents to include
  if (flags.noAgents) {
    selectedAgentFiles = [];
    console.log('\n⏭️  Skipping agent selection (--no-agents flag)');
  } else if (flags.browseAgents) {
    selectedAgentFiles = [];
    console.log('\n📚 Browse mode enabled - all agents will be copied to /agents folder');
    console.log('   You can manually copy desired agents to ~/.claude/agents later');
  } else if (flags.allAgents) {
    selectedAgentFiles = availableAgents.map(a => a.file).filter(validateAgentFile);
    console.log(`\n✅ Including all ${selectedAgentFiles.length} agents (--all-agents flag)`);
  } else if (!flags.dryRun) {
    // Interactive mode selection
    console.log('\n🤖 How would you like to set up agents for your Claude Code project?\n');
    console.log('Use arrow keys to navigate, Enter to select\n');
    
    // Close readline interface before using inquirer
    if (rl) {
      rl.close();
      rl = null;
    }
    
    // Import select for mode selection
    const selectModule = await import('@inquirer/select');
    const select = selectModule.default;
    
    const agentMode = await select({
      message: 'Would you like to include AI agents in your project?',
      choices: [
        {
          name: '✨ Select Agents - Choose specific agents for your needs',
          value: 'select',
          description: 'Interactive selection of agents based on your project'
        },
        {
          name: '🔍 Enhanced Selection - Advanced browsing with search and filters',
          value: 'enhanced',
          description: 'Use the enhanced interface with categories, tags, and search'
        },
        {
          name: '📚 Copy All Agents - Get all 50+ agents to explore',
          value: 'browse',
          description: 'Copies all agents to /agents folder for manual review'
        },
        {
          name: '⏭️  Skip Agents - Just set up the basic structure',
          value: 'skip',
          description: 'You can always add agents later'
        }
      ]
    });
    
    if (agentMode === 'browse') {
      flags.browseAgents = true;
      selectedAgentFiles = [];
      console.log('\n📚 Browse mode selected - all agents will be copied to /agents folder');
      console.log('   You can manually copy desired agents to ~/.claude/agents later');
    } else if (agentMode === 'skip') {
      flags.noAgents = true;
      selectedAgentFiles = [];
      console.log('\n⏭️  Skipping agent selection');
    } else if (agentMode === 'select') {
      // Interactive selection
      selectedAgentFiles = await selectAgents(availableAgents);
      console.log(`\n✅ Selected ${selectedAgentFiles.length} agent${selectedAgentFiles.length === 1 ? '' : 's'}`);
    } else if (agentMode === 'enhanced') {
      // Enhanced selection with catalog system
      selectedAgentFiles = await enhancedAgentSelection();
      console.log(`\n✅ Selected ${selectedAgentFiles.length} agent${selectedAgentFiles.length === 1 ? '' : 's'}`);
    }
    
    // Recreate readline interface after agent selection
    if (!flags.force && !flags.dryRun) {
      rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
    }
  } else {
    // In dry-run mode, show what would happen
    console.log(`\nWould prompt for agent selection mode`);
    console.log(`Would then prompt for agent selection from ${availableAgents.length} available agents`);
    selectedAgentFiles = availableAgents.map(a => a.file).filter(validateAgentFile); // Include all for scanning purposes
  }

  function scanTemplate(src, dest, relativePath = '', skipAgents = false) {
    try {
      // Validate paths to prevent traversal
      const normalizedSrc = path.normalize(src);
      const normalizedDest = path.normalize(dest);
      
      if (!normalizedSrc.startsWith(path.normalize(templateDir))) {
        throw new Error('Source path escapes template directory');
      }
      
      if (!normalizedDest.startsWith(path.normalize(targetDir))) {
        throw new Error('Destination path escapes target directory');
      }
      
      const exists = fs.existsSync(src);
      const stats = exists && fs.statSync(src);
      const isDirectory = exists && stats.isDirectory();
      
      if (isDirectory) {
        // Skip .claude directory as it will be handled separately
        if (path.basename(src) === '.claude') {
          return; // Don't process .claude directory in regular template scan
        }
        
        // Skip hooks directory - hooks should only be installed to .claude/hooks via --install-hooks
        if (path.basename(src) === 'hooks') {
          return; // Don't copy hooks to project root
        }
        
        // Skip agents directory if we're handling it separately
        if (skipAgents && path.basename(src) === 'agents') {
          // Only scan selected agents
          allItems.push({ 
            src, 
            dest, 
            type: 'directory',
            relativePath,
            exists: fs.existsSync(dest) 
          });
          
          if (fs.existsSync(dest)) {
            dirConflicts.push(relativePath || '.');
          }
          
          // In browse mode, add ALL agent files
          const agentFilesToProcess = flags.browseAgents 
            ? availableAgents.map(a => a.file).filter(validateAgentFile)
            : selectedAgentFiles;
          
          // Add agent files
          for (const agentFile of agentFilesToProcess) {
            // Additional validation before processing
            if (!validateAgentFile(agentFile)) {
              console.warn(`⚠️  Skipping invalid agent file: ${agentFile}`);
              continue;
            }
            
            // Ensure we're only dealing with basenames
            const safeAgentFile = path.basename(agentFile);
            const agentSrc = path.join(src, safeAgentFile);
            const agentDest = path.join(dest, safeAgentFile);
            const agentRelPath = path.join(relativePath, safeAgentFile);
            
            // Validate that the source path is within the template agents directory
            const normalizedAgentSrc = path.normalize(agentSrc);
            const normalizedTemplateAgentsDir = path.normalize(src);
            if (!normalizedAgentSrc.startsWith(normalizedTemplateAgentsDir)) {
              console.warn(`⚠️  Skipping agent file outside template directory: ${agentFile}`);
              continue;
            }
            
            if (fs.existsSync(agentSrc)) {
              allItems.push({
                src: agentSrc,
                dest: agentDest,
                type: 'file',
                relativePath: agentRelPath,
                exists: fs.existsSync(agentDest)
              });
              
              if (fs.existsSync(agentDest)) {
                fileConflicts.push(agentRelPath);
                conflictsByCategory['agents'].push(agentRelPath);
              }
            }
          }
          
          // Always include README.md
          const readmeSrc = path.join(src, 'README.md');
          const readmeDest = path.join(dest, 'README.md');
          if (fs.existsSync(readmeSrc)) {
            allItems.push({
              src: readmeSrc,
              dest: readmeDest,
              type: 'file',
              relativePath: path.join(relativePath, 'README.md'),
              exists: fs.existsSync(readmeDest)
            });
            
            if (fs.existsSync(readmeDest)) {
              const readmePath = path.join(relativePath, 'README.md');
              fileConflicts.push(readmePath);
              conflictsByCategory['agents'].push(readmePath);
            }
          }
          
          return; // Don't recurse into agents directory
        }
        
        allItems.push({ 
          src, 
          dest, 
          type: 'directory',
          relativePath,
          exists: fs.existsSync(dest) 
        });
        
        if (fs.existsSync(dest)) {
          dirConflicts.push(relativePath || '.');
        }
        
        fs.readdirSync(src).forEach(childItem => {
          scanTemplate(
            path.join(src, childItem), 
            path.join(dest, childItem),
            path.join(relativePath, childItem),
            skipAgents
          );
        });
      } else {
        allItems.push({ 
          src, 
          dest, 
          type: 'file',
          relativePath,
          exists: fs.existsSync(dest) 
        });
        
        if (fs.existsSync(dest)) {
          fileConflicts.push(relativePath);
          
          // Categorize the conflict
          if (relativePath === 'CLAUDE.md') {
            conflictsByCategory['CLAUDE.md'].push(relativePath);
          } else if (relativePath.startsWith('agents/')) {
            conflictsByCategory['agents'].push(relativePath);
          } else if (relativePath.startsWith('docs/')) {
            conflictsByCategory['docs'].push(relativePath);
          } else if (relativePath.startsWith('plans/')) {
            conflictsByCategory['plans'].push(relativePath);
          } else if (relativePath.startsWith('tickets/')) {
            conflictsByCategory['tickets'].push(relativePath);
          }
        }
      }
    } catch (error) {
      throw new Error(`Error scanning template: ${error.message}`);
    }
  }

  scanTemplate(templateDir, targetDir, '', true);

  // Handle repository scanning for context
  let repositoryContext = null;
  if (flags.scanContext || (!flags.dryRun && projectName === '.' && !flags.force)) {
    const hasExistingFiles = allItems.some(item => item.exists);
    
    if (hasExistingFiles || flags.scanContext) {
      if (flags.scanContext || (!flags.force && await shouldScanRepository())) {
        repositoryContext = await scanRepositoryForContext(targetDir);
        
        if (repositoryContext && !flags.dryRun) {
          const confirmResult = await previewAndConfirmContext(repositoryContext.formattedContext);
          
          if (confirmResult === 'n' || confirmResult === 'no') {
            repositoryContext = null;
            console.log('✅ Skipping context addition to CLAUDE.md');
          } else if (confirmResult === 'edit') {
            console.log('📝 Context editing not yet implemented. Using generated context as-is.');
          }
        }
      }
    }
  }

  // Handle force flag
  if (flags.force) {
    // Set all strategies to overwrite
    Object.keys(conflictStrategies).forEach(key => {
      conflictStrategies[key] = 'overwrite';
    });
    if (fileConflicts.length > 0 || dirConflicts.length > 0) {
      console.log('\n⚠️  Force mode enabled - existing files will be overwritten');
    }
  } else {
    // Show conflicts if not in force mode
    if (dirConflicts.length > 0) {
      console.log('\n⚠️  The following directories already exist:');
      dirConflicts.forEach(dir => console.log(`  - ${dir}/`));
    }

    if (fileConflicts.length > 0) {
      console.log('\n⚠️  File conflicts detected. You will be asked how to handle each category.');
      
      if (!flags.dryRun) {
        // Ask for resolution strategy for each category with conflicts
        const categories = [
          { key: 'CLAUDE.md', name: 'CLAUDE.md', emoji: '📄' },
          { key: 'agents', name: 'Agents', emoji: '🤖' },
          { key: 'docs', name: 'Documentation', emoji: '📚' },
          { key: 'plans', name: 'Plans', emoji: '📋' },
          { key: 'tickets', name: 'Tickets', emoji: '🎫' }
        ];
        
        for (const category of categories) {
          if (conflictsByCategory[category.key].length > 0) {
            console.log(`\n${category.emoji} ${category.name} conflicts:`);
            conflictsByCategory[category.key].forEach(file => console.log(`  - ${file}`));
            
            console.log('\nConflict resolution options:');
            console.log('  1) skip      (s) - Keep your existing files');
            console.log('  2) rename    (r) - Save template files with -ccsetup suffix');
            console.log('  3) overwrite (o) - Replace with template versions');
            
            // Use inquirer instead of readline prompt
            const selectModule = await import('@inquirer/select');
            const select = selectModule.default;
            const strategy = await select({
              message: `Your choice for ${category.name}:`,
              choices: [
                { name: '(s)kip - Keep your existing files', value: 'skip' },
                { name: '(r)ename - Create backups and use template versions', value: 'rename' },
                { name: '(o)verwrite - Replace with template versions', value: 'overwrite' }
              ],
              default: 'skip'
            });
            
            // Strategy will always be valid when using select, no need for validation
            
            if (strategy === 'overwrite' && category.key === 'CLAUDE.md') {
              // Use inquirer instead of readline prompt
              const confirmModule = await import('@inquirer/confirm');
              const confirm = confirmModule.default;
              const shouldOverwrite = await confirm({
                message: '⚠️  Are you sure you want to overwrite CLAUDE.md? This will lose your project instructions!',
                default: false
              });
              if (!shouldOverwrite) {
                conflictStrategies[category.key] = 'skip';
                console.log('Keeping existing CLAUDE.md');
                continue;
              }
            }
            
            conflictStrategies[category.key] = strategy;
          }
        }
      }
    }
  }

  console.log(`\n✨ ${flags.dryRun ? 'Would apply' : 'Applying'} conflict resolution strategies...`);
  
  let skippedCount = 0;
  let copiedCount = 0;
  let renamedCount = 0;
  let overwrittenCount = 0;
  
  for (const item of allItems) {
    try {
      if (item.type === 'directory') {
        if (!item.exists && !fs.existsSync(item.dest)) {
          if (!flags.dryRun) {
            fs.mkdirSync(item.dest, { recursive: true });
          } else {
            console.log(`  📁 Would create directory: ${item.relativePath || '.'}/`);
          }
        }
      } else {
        if (item.exists) {
          // Determine which category this file belongs to
          let strategy = 'skip'; // default
          if (item.relativePath === 'CLAUDE.md') {
            strategy = conflictStrategies['CLAUDE.md'];
          } else if (item.relativePath.startsWith('agents/')) {
            strategy = conflictStrategies['agents'];
          } else if (item.relativePath.startsWith('docs/')) {
            strategy = conflictStrategies['docs'];
          } else if (item.relativePath.startsWith('plans/')) {
            strategy = conflictStrategies['plans'];
          } else if (item.relativePath.startsWith('tickets/')) {
            strategy = conflictStrategies['tickets'];
          }
          
          if (strategy === 'skip') {
            skippedCount++;
            if (flags.dryRun) {
              console.log(`  ⏭️  Would skip: ${item.relativePath}`);
            }
            continue;
          } else if (strategy === 'rename') {
            const ext = path.extname(item.dest);
            const baseName = path.basename(item.dest, ext);
            const dirName = path.dirname(item.dest);
            let newDest = path.join(dirName, `${baseName}-ccsetup${ext}`);
            let counter = 1;
            while (fs.existsSync(newDest)) {
              newDest = path.join(dirName, `${baseName}-ccsetup-${counter}${ext}`);
              counter++;
            }
            if (!flags.dryRun) {
              fs.copyFileSync(item.src, newDest);
            }
            renamedCount++;
            console.log(`  📄 ${flags.dryRun ? 'Would create' : 'Created'}: ${path.relative(targetDir, newDest)}`);
          } else if (strategy === 'overwrite') {
            if (!flags.dryRun) {
              // Handle CLAUDE.md with context injection on overwrite
              if (item.relativePath === 'CLAUDE.md' && repositoryContext) {
                const templateContent = fs.readFileSync(item.src, 'utf8');
                const enhancedContent = await applyContextToTemplate(
                  templateContent, 
                  repositoryContext,
                  'append'
                );
                fs.writeFileSync(item.dest, enhancedContent, 'utf8');
                console.log(`  ♻️  Replaced CLAUDE.md with project context`);
              } else {
                fs.copyFileSync(item.src, item.dest);
                console.log(`  ♻️  Replaced: ${item.relativePath}`);
              }
            } else {
              if (item.relativePath === 'CLAUDE.md' && repositoryContext) {
                console.log(`  ♻️  Would replace: ${item.relativePath} (with project context)`);
              } else {
                console.log(`  ♻️  Would replace: ${item.relativePath}`);
              }
            }
            overwrittenCount++;
          }
        } else {
          if (!flags.dryRun) {
            // Ensure directory exists before copying file
            const destDir = path.dirname(item.dest);
            if (!fs.existsSync(destDir)) {
              fs.mkdirSync(destDir, { recursive: true });
            }
            
            // Handle CLAUDE.md with context injection
            if (item.relativePath === 'CLAUDE.md' && repositoryContext) {
              const templateContent = fs.readFileSync(item.src, 'utf8');
              const enhancedContent = await applyContextToTemplate(
                templateContent, 
                repositoryContext,
                'append'
              );
              fs.writeFileSync(item.dest, enhancedContent, 'utf8');
              console.log(`  ✨ Created CLAUDE.md with project context`);
            } else {
              fs.copyFileSync(item.src, item.dest);
            }
          } else {
            if (item.relativePath === 'CLAUDE.md' && repositoryContext) {
              console.log(`  ✨ Would copy: ${item.relativePath} (with project context)`);
            } else {
              console.log(`  ✨ Would copy: ${item.relativePath}`);
            }
          }
          copiedCount++;
        }
      }
    } catch (error) {
      if (error.code === 'EACCES') {
        throw new Error(`Permission denied: ${item.relativePath}`);
      } else if (error.code === 'ENOSPC') {
        throw new Error('No space left on device');
      } else if (error.code === 'EISDIR') {
        throw new Error(`Cannot overwrite directory with file: ${item.relativePath}`);
      }
      throw new Error(`Failed to process ${item.relativePath}: ${error.message}`);
    }
  }

  // Initialize .claude directory and copy agents
  let claudeInitResult = null;
  // Always initialize .claude directory structure (it will handle existing directories)
  console.log(`\n🔧 ${claudeStatus.hasClaudeDir ? 'Updating' : 'Initializing'} .claude directory structure...`);
  claudeInitResult = await initializeClaudeDirectory(selectedAgentFiles, conflictStrategies['agents'], flags.dryRun);
  
  if (claudeInitResult.createdItems.length > 0) {
    console.log(`  ✅ Created ${claudeInitResult.createdItems.length} items in .claude directory`);
  }
  if (claudeInitResult.copiedAgents > 0) {
    console.log(`  🤖 Copied ${claudeInitResult.copiedAgents} agents to .claude/agents`);
  }
  if (claudeInitResult.skippedAgents > 0) {
    console.log(`  ⏭️  Skipped ${claudeInitResult.skippedAgents} existing agents in .claude/agents`);
  }

  console.log(`\n✅ Claude Code project ${flags.dryRun ? 'would be' : ''} created successfully!`);
  
  // Show summary of what happened
  if (fileConflicts.length > 0 || copiedCount > 0 || selectedAgentFiles.length > 0 || claudeInitResult) {
    console.log('\n📊 Summary:');
    if (copiedCount > 0) console.log(`  ✨ ${copiedCount} new files ${flags.dryRun ? 'would be' : ''} copied`);
    if (skippedCount > 0) console.log(`  ⏭️  ${skippedCount} existing files ${flags.dryRun ? 'would be' : ''} kept unchanged`);
    if (renamedCount > 0) console.log(`  📄 ${renamedCount} template files ${flags.dryRun ? 'would be' : ''} saved with -ccsetup suffix`);
    if (overwrittenCount > 0) console.log(`  ♻️  ${overwrittenCount} files ${flags.dryRun ? 'would be' : ''} replaced with template versions`);
    if (!flags.noAgents && !flags.dryRun) {
      if (flags.browseAgents) {
        const agentCount = availableAgents.length;
        console.log(`  📚 ${agentCount} agent${agentCount === 1 ? '' : 's'} ${flags.dryRun ? 'would be' : ''} copied to /agents for browsing`);
      } else if (selectedAgentFiles.length > 0) {
        console.log(`  🤖 ${selectedAgentFiles.length} agent${selectedAgentFiles.length === 1 ? '' : 's'} ${flags.dryRun ? 'would be' : ''} included in /agents`);
        console.log(`  📝 Remember to update agent-orchestration.md with workflows for your agents`);
      }
    }
    if (claudeInitResult && claudeInitResult.createdItems.length > 0) {
      console.log(`  📁 ${claudeInitResult.createdItems.length} items created in .claude directory`);
    }
    if (repositoryContext && !flags.dryRun) {
      console.log(`  🔍 Project context automatically added to CLAUDE.md`);
    }
  }
  
  if (!flags.dryRun) {
    console.log('\nNext steps:');
    if (projectName !== '.') {
      // Escape project name to prevent command injection
      const escapedProjectName = JSON.stringify(projectName);
      console.log(`  cd ${escapedProjectName}`);
      const finalClaudeStatus = checkClaudeCode();
      if (!finalClaudeStatus.isInstalled) {
        console.log('  claude init    # Initialize Claude Code in the project');
      }
    }
    console.log('  1. Edit CLAUDE.md to add your project-specific instructions');
    console.log('  2. Update docs/ROADMAP.md with your project goals');
    console.log('  3. Update docs/agent-orchestration.md to define agent workflows');
    console.log('  4. Start creating tickets in the tickets/ directory');
    
    if (flags.browseAgents) {
      console.log('\n📚 Agent Browse Mode:');
      console.log('  - All available agents have been copied to the /agents folder');
      console.log('  - Browse through them to understand their capabilities');
      console.log('  - Copy desired agents to ~/.claude/agents to activate them');
      console.log('  - Example: cp agents/code-reviewer.md ~/.claude/agents/');
      console.log('  - Remember to update agent-orchestration.md with your custom workflows');
    }
    
    if (renamedCount > 0) {
      console.log('\n💡 Tip: Review the -ccsetup files to see template examples');
      console.log('   You can compare them with your existing files or copy sections you need');
    }
    
    // Install hooks as part of full setup
    if (setupMode === 'full' && !flags.dryRun) {
      console.log('\n🪝 Installing workflow selection hook...');
      
      // Check if .claude directory exists
      const claudeDir = path.join(targetDir, '.claude');
      if (fs.existsSync(claudeDir)) {
        try {
          // Create hooks directory
          const hooksDir = path.join(claudeDir, 'hooks');
          if (!fs.existsSync(hooksDir)) {
            fs.mkdirSync(hooksDir, { recursive: true });
          }
          
          // Copy workflow-selector hook
          const hookSourceDir = path.join(templateDir, 'hooks', 'workflow-selector');
          const hookDestDir = path.join(hooksDir, 'workflow-selector');
          
          if (fs.existsSync(hookSourceDir)) {
            if (!fs.existsSync(hookDestDir)) {
              fs.mkdirSync(hookDestDir, { recursive: true });
            }
            
            const hookFile = path.join(hookSourceDir, 'index.js');
            const destFile = path.join(hookDestDir, 'index.js');
            fs.copyFileSync(hookFile, destFile);
            
            // Update settings.json
            const settingsFile = path.join(claudeDir, 'settings.json');
            let settings = {};
            
            if (fs.existsSync(settingsFile)) {
              try {
                settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
              } catch (e) {
                // Start with empty settings
              }
            }
            
            if (!settings.hooks) {
              settings.hooks = {};
            }
            
            settings.hooks.UserPromptSubmit = [
              {
                "matcher": ".*",
                "hooks": [
                  {
                    "type": "command",
                    "command": "node $CLAUDE_PROJECT_DIR/.claude/hooks/workflow-selector/index.js"
                  }
                ]
              }
            ];
            
            fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
            console.log('  ✅ Workflow selection hook installed');
            console.log('  📝 Hook will analyze prompts and suggest appropriate workflows');
          }
        } catch (error) {
          console.warn('  ⚠️  Could not install workflow hook:', error.message);
        }
      }
    }
    
    console.log('\nHappy coding with Claude! 🎉');
  }
  
  } catch (error) {
    throw error;
  } finally {
    if (rl) {
      rl.close();
    }
  }
}

main().catch(err => {
  console.error('Error:', err.message || err);
  if (rl) {
    rl.close();
  }
  process.exit(1);
});