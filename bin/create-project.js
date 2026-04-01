#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const TemplateCatalog = require('../lib/templates/catalog');
const TemplateFilter = require('../lib/templates/filter');
const TemplateSearch = require('../lib/templates/search');

// Parse CLI arguments
const args = process.argv.slice(2);

const flags = {
  force: false,
  dryRun: false,
  help: false,
  allAgents: false,
  noAgents: false,
  agents: false,
  browseAgents: false,
  browse: false,
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

Commands:
  ccsetup              Interactive mode
  ccsetup <name>       Create a new Claude Code project

Options:
  --force, -f          Skip all prompts and overwrite existing files
  --dry-run, -d        Show what would be done without making changes
  --agents             Interactive agent selection mode
  --all-agents         Include all agents without prompting
  --no-agents          Skip agent selection entirely
  --browse-agents      Copy all agents to /agents folder for browsing
  --browse             Enhanced template browsing and selection interface
  --help, -h           Show this help message

Advanced:
  --install-hooks      Install workflow selection hook to .claude/hooks (optional, power users only)

Examples:
  npx ccsetup              # Interactive setup in current directory
  npx ccsetup my-project   # Create in new directory
  npx ccsetup my-app --all-agents  # Include all agents automatically
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

// Validate conflicting flags
function validateFlags() {
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
const VALID_AI_PROVIDERS = new Set(['claude', 'codex', 'both']);

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

function includesClaude(provider) {
  return provider === 'claude' || provider === 'both';
}

function includesCodex(provider) {
  return provider === 'codex' || provider === 'both';
}

function getEnvBoolean(name) {
  const value = process.env[name];
  if (value == null || value === '') return null;

  const normalized = value.toLowerCase().trim();
  if (['1', 'true', 'yes', 'y'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n'].includes(normalized)) return false;
  return null;
}

function getConfiguredAiProvider() {
  const envValue = process.env.CCSETUP_AI_PROVIDER;
  if (!envValue) return null;

  const normalized = envValue.toLowerCase().trim();
  if (!VALID_AI_PROVIDERS.has(normalized)) {
    throw new Error(`Invalid CCSETUP_AI_PROVIDER value: ${envValue}`);
  }

  return normalized;
}

async function selectAiProvider() {
  const envProvider = getConfiguredAiProvider();
  if (envProvider) {
    return envProvider;
  }

  if (flags.force || flags.dryRun) {
    return 'claude';
  }

  const selectModule = await import('@inquirer/select');
  const select = selectModule.default;

  return select({
    message: 'Which AI setup would you like to generate for this project?',
    choices: [
      {
        name: 'Claude Code',
        value: 'claude',
        description: 'Copy CLAUDE.md and the .claude project setup'
      },
      {
        name: 'Codex CLI',
        value: 'codex',
        description: 'Copy AGENTS.md plus project-local Codex skills'
      },
      {
        name: 'Both',
        value: 'both',
        description: 'Copy both Claude Code and Codex project assets'
      }
    ],
    default: 'claude'
  });
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
    
    // Copy .claude/settings.json
    const settingsSrc = path.join(templateClaudeDir, 'settings.json');
    const settingsDest = path.join(claudeDir, 'settings.json');
    if (fs.existsSync(settingsSrc)) {
      if (!fs.existsSync(settingsDest)) {
        if (!dryRun) {
          fs.copyFileSync(settingsSrc, settingsDest);
        }
        createdItems.push('.claude/settings.json');
        if (dryRun) {
          console.log('  ✨ Would copy: .claude/settings.json');
        }
      } else {
        skippedItems.push('.claude/settings.json');
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
    
    // Copy .claude/skills/ directory (recursively)
    const templateSkillsDir = path.join(templateClaudeDir, 'skills');
    if (fs.existsSync(templateSkillsDir)) {
      const claudeSkillsDir = path.join(claudeDir, 'skills');
      const skillDirs = fs.readdirSync(templateSkillsDir).filter(d => {
        return fs.statSync(path.join(templateSkillsDir, d)).isDirectory();
      });

      for (const skillName of skillDirs) {
        const skillSrcDir = path.join(templateSkillsDir, skillName);
        const skillDestDir = path.join(claudeSkillsDir, skillName);
        const skillFile = path.join(skillSrcDir, 'SKILL.md');

        if (fs.existsSync(skillFile)) {
          if (!fs.existsSync(path.join(skillDestDir, 'SKILL.md'))) {
            if (!dryRun) {
              fs.mkdirSync(skillDestDir, { recursive: true });
              fs.copyFileSync(skillFile, path.join(skillDestDir, 'SKILL.md'));
            }
            createdItems.push(`.claude/skills/${skillName}/SKILL.md`);
            if (dryRun) {
              console.log(`  ✨ Would copy: .claude/skills/${skillName}/SKILL.md`);
            }
          } else {
            skippedItems.push(`.claude/skills/${skillName}/SKILL.md`);
          }
        }
      }
    }

    // Copy template/hooks/ to .claude/hooks/ (all hook directories)
    const templateHooksDir = path.join(templateDir, 'hooks');
    if (fs.existsSync(templateHooksDir)) {
      const claudeHooksDir = path.join(claudeDir, 'hooks');
      const hookDirs = fs.readdirSync(templateHooksDir).filter(d => {
        return fs.statSync(path.join(templateHooksDir, d)).isDirectory();
      });

      for (const hookName of hookDirs) {
        const hookSrcDir = path.join(templateHooksDir, hookName);
        const hookDestDir = path.join(claudeHooksDir, hookName);
        const hookFile = path.join(hookSrcDir, 'index.js');

        if (fs.existsSync(hookFile)) {
          if (!fs.existsSync(path.join(hookDestDir, 'index.js'))) {
            if (!dryRun) {
              fs.mkdirSync(hookDestDir, { recursive: true });
              fs.copyFileSync(hookFile, path.join(hookDestDir, 'index.js'));
            }
            createdItems.push(`.claude/hooks/${hookName}/index.js`);
            if (dryRun) {
              console.log(`  ✨ Would copy: .claude/hooks/${hookName}/index.js`);
            }
          } else {
            skippedItems.push(`.claude/hooks/${hookName}/index.js`);
          }
        }
      }
    }

    // Copy selected agents to .claude/agents
    const templateAgentsDir = path.join(templateDir, '.claude', 'agents');
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

async function initializeCodexDirectory(conflictStrategy, dryRun) {
  const codexDir = path.join(targetDir, '.codex');
  const skillsDir = path.join(codexDir, 'skills');
  const templateCodexDir = path.join(templateDir, '.codex');
  const createdItems = [];
  const skippedItems = [];

  function copyCodexFile(src, dest, relativePath) {
    if (!fs.existsSync(src)) {
      return;
    }

    if (!fs.existsSync(dest)) {
      if (!dryRun) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
      }
      createdItems.push(relativePath);
      if (dryRun) {
        console.log(`  ✨ Would copy: ${relativePath}`);
      }
      return;
    }

    if (conflictStrategy === 'overwrite') {
      if (!dryRun) {
        fs.copyFileSync(src, dest);
      }
      if (dryRun) {
        console.log(`  ♻️  Would replace: ${relativePath}`);
      }
      createdItems.push(relativePath);
      return;
    }

    if (conflictStrategy === 'rename') {
      const ext = path.extname(dest);
      const baseName = path.basename(dest, ext);
      const dirName = path.dirname(dest);
      let newDest = path.join(dirName, `${baseName}-ccsetup${ext}`);
      let counter = 1;
      while (fs.existsSync(newDest)) {
        newDest = path.join(dirName, `${baseName}-ccsetup-${counter}${ext}`);
        counter++;
      }
      if (!dryRun) {
        fs.copyFileSync(src, newDest);
      }
      createdItems.push(path.relative(targetDir, newDest));
      if (dryRun) {
        console.log(`  📄 Would create: ${path.relative(targetDir, newDest)}`);
      }
      return;
    }

    skippedItems.push(relativePath);
    if (dryRun) {
      console.log(`  ⏭️  Would skip: ${relativePath}`);
    }
  }

  try {
    if (!fs.existsSync(codexDir)) {
      if (!dryRun) {
        fs.mkdirSync(codexDir, { recursive: true });
      }
      createdItems.push('.codex/');
      if (dryRun) {
        console.log('  📁 Would create directory: .codex/');
      }
    } else {
      skippedItems.push('.codex/');
    }

    if (!fs.existsSync(skillsDir)) {
      if (!dryRun) {
        fs.mkdirSync(skillsDir, { recursive: true });
      }
      createdItems.push('.codex/skills/');
      if (dryRun) {
        console.log('  📁 Would create directory: .codex/skills/');
      }
    } else {
      skippedItems.push('.codex/skills/');
    }

    const templateSkillsDir = path.join(templateCodexDir, 'skills');
    if (fs.existsSync(templateSkillsDir)) {
      const skillDirs = fs.readdirSync(templateSkillsDir, { withFileTypes: true }).filter(entry => entry.isDirectory());
      for (const entry of skillDirs) {
        const srcDir = path.join(templateSkillsDir, entry.name);
        const skillFileSrc = path.join(srcDir, 'SKILL.md');

        if (!fs.existsSync(skillFileSrc)) {
          continue;
        }

        const destDir = path.join(skillsDir, entry.name);
        const skillFileDest = path.join(destDir, 'SKILL.md');

        if (!fs.existsSync(destDir)) {
          if (!dryRun) {
            fs.mkdirSync(destDir, { recursive: true });
          }
          createdItems.push(`.codex/skills/${entry.name}/`);
          if (dryRun) {
            console.log(`  📁 Would create directory: .codex/skills/${entry.name}/`);
          }
        }

        copyCodexFile(skillFileSrc, skillFileDest, `.codex/skills/${entry.name}/SKILL.md`);
      }
    }

    return { createdItems, skippedItems };
  } catch (error) {
    throw new Error(`Failed to initialize .codex directory: ${error.message}`);
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
  const agentsDir = path.join(templateDir, '.claude', 'agents');
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
  if (flags.installHooks) return 'install-hooks';
  if (flags.agents) return 'agents-only';
  return 'full';
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

    if (!flags.force && !flags.dryRun && rl) {
      rl.close();
      rl = null;
    }

    const aiProvider = await selectAiProvider();
    
    // Handle --agents and --browse flags for agent selection only
    if (flags.agents || flags.browse) {
      if (!includesClaude(aiProvider)) {
        console.log('Claude agent selection is only available for Claude Code setup.');
        console.log('Re-run full setup to generate Codex assets.\n');
        process.exit(0);
      }

      console.log('🤖 Interactive Agent Selection\n');

      if (aiProvider === 'both') {
        console.log('This step configures Claude Code agents only. Codex assets are created during full setup.\n');
      }
      
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

    if (!flags.force && !flags.dryRun && !rl) {
      rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
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
    const claudeStatus = includesClaude(aiProvider) ? checkClaudeCode() : {
      isInstalled: false,
      hasClaudeDir: false,
      hasClaudeCodeFile: false
    };
    if (includesClaude(aiProvider) && projectName === '.') {
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
    const projectLabel = aiProvider === 'both'
      ? 'Claude Code + Codex'
      : aiProvider === 'codex'
        ? 'Codex'
        : 'Claude Code';
    console.log(`${flags.dryRun ? 'Would create' : 'Creating'} ${projectLabel} project in ${safeTargetDir}...`);

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
      const newDirClaudeStatus = includesClaude(aiProvider) ? checkClaudeCode() : { isInstalled: true };
      if (includesClaude(aiProvider) && !flags.dryRun && !newDirClaudeStatus.isInstalled) {
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
    'AGENTS.md': [],
    'agents': [],
    'codex': [],
    'docs': [],
    'plans': [],
    'tickets': []
  };
  
  // Store conflict strategies per category
  const conflictStrategies = {
    'CLAUDE.md': 'skip',
    'AGENTS.md': 'skip',
    'agents': 'skip',
    'codex': 'skip',
    'docs': 'skip',
    'plans': 'skip',
    'tickets': 'skip'
  };

  // Get available agents for selection
  const availableAgents = getAvailableAgents();
  let selectedAgentFiles = [];
  

  // Determine which agents to include
  if (!includesClaude(aiProvider)) {
    selectedAgentFiles = [];
    console.log('\n⏭️  Skipping Claude agents for Codex-only setup');
  } else if (flags.noAgents) {
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
          name: '📚 Copy All Agents - Get all 8 agents to explore',
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
    selectedAgentFiles = availableAgents.map(a => a.file).filter(validateAgentFile); // Include all for dry-run preview
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

        if (path.basename(src) === '.codex') {
          return; // Don't process .codex directory in regular template scan
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
        if (
          (!includesClaude(aiProvider) && relativePath === 'CLAUDE.md') ||
          (!includesCodex(aiProvider) && relativePath === 'AGENTS.md') ||
          (!includesCodex(aiProvider) && relativePath === path.join('docs', 'codex-setup.md'))
        ) {
          return;
        }

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
          } else if (relativePath === 'AGENTS.md') {
            conflictsByCategory['AGENTS.md'].push(relativePath);
          } else if (relativePath.startsWith('agents/')) {
            conflictsByCategory['agents'].push(relativePath);
          } else if (relativePath.startsWith('.codex/')) {
            conflictsByCategory['codex'].push(relativePath);
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

  function scanCodexConflicts() {
    if (!includesCodex(aiProvider)) {
      return;
    }

    const templateCodexDir = path.join(templateDir, '.codex');
    if (!fs.existsSync(templateCodexDir)) {
      return;
    }

    function walk(srcDir, relBase = '.codex') {
      const entries = fs.readdirSync(srcDir, { withFileTypes: true });
      for (const entry of entries) {
        const src = path.join(srcDir, entry.name);
        const relativePath = path.join(relBase, entry.name);
        const dest = path.join(targetDir, relativePath);

        if (entry.isDirectory()) {
          walk(src, relativePath);
          continue;
        }

        if (fs.existsSync(dest)) {
          fileConflicts.push(relativePath);
          conflictsByCategory['codex'].push(relativePath);
        }
      }
    }

    walk(templateCodexDir);
  }

  scanCodexConflicts();

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
          { key: 'AGENTS.md', name: 'AGENTS.md', emoji: '🧭' },
          { key: 'agents', name: 'Agents', emoji: '🤖' },
          { key: 'codex', name: 'Codex', emoji: '🧠' },
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
            
            if (strategy === 'overwrite' && (category.key === 'CLAUDE.md' || category.key === 'AGENTS.md')) {
              // Use inquirer instead of readline prompt
              const confirmModule = await import('@inquirer/confirm');
              const confirm = confirmModule.default;
              const shouldOverwrite = await confirm({
                message: `⚠️  Are you sure you want to overwrite ${category.key}? This will lose your project instructions!`,
                default: false
              });
              if (!shouldOverwrite) {
                conflictStrategies[category.key] = 'skip';
                console.log(`Keeping existing ${category.key}`);
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
          } else if (item.relativePath === 'AGENTS.md') {
            strategy = conflictStrategies['AGENTS.md'];
          } else if (item.relativePath.startsWith('agents/')) {
            strategy = conflictStrategies['agents'];
          } else if (item.relativePath.startsWith('.codex/')) {
            strategy = conflictStrategies['codex'];
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
              fs.copyFileSync(item.src, item.dest);
              console.log(`  ♻️  Replaced: ${item.relativePath}`);
            } else {
              console.log(`  ♻️  Would replace: ${item.relativePath}`);
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
            
            fs.copyFileSync(item.src, item.dest);
          } else {
            console.log(`  ✨ Would copy: ${item.relativePath}`);
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

  // Initialize provider-specific directories
  let claudeInitResult = null;
  let codexInitResult = null;
  if (includesClaude(aiProvider)) {
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
  }

  if (includesCodex(aiProvider)) {
    console.log(`\n🔧 ${fs.existsSync(path.join(targetDir, '.codex')) ? 'Updating' : 'Initializing'} .codex directory structure...`);
    codexInitResult = await initializeCodexDirectory(conflictStrategies['codex'], flags.dryRun);
    if (codexInitResult.createdItems.length > 0) {
      console.log(`  ✅ Created ${codexInitResult.createdItems.length} items in .codex directory`);
    }
  }

  console.log(`\n✅ ${projectLabel} project ${flags.dryRun ? 'would be ' : ''}created successfully!`);
  
  // Show summary of what happened
  if (fileConflicts.length > 0 || copiedCount > 0 || selectedAgentFiles.length > 0 || claudeInitResult || codexInitResult) {
    console.log('\n📊 Summary:');
    if (copiedCount > 0) console.log(`  ✨ ${copiedCount} new files ${flags.dryRun ? 'would be' : ''} copied`);
    if (skippedCount > 0) console.log(`  ⏭️  ${skippedCount} existing files ${flags.dryRun ? 'would be' : ''} kept unchanged`);
    if (renamedCount > 0) console.log(`  📄 ${renamedCount} template files ${flags.dryRun ? 'would be' : ''} saved with -ccsetup suffix`);
    if (overwrittenCount > 0) console.log(`  ♻️  ${overwrittenCount} files ${flags.dryRun ? 'would be' : ''} replaced with template versions`);
    if (includesClaude(aiProvider) && !flags.noAgents && !flags.dryRun) {
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
    if (codexInitResult && codexInitResult.createdItems.length > 0) {
      console.log(`  🧠 ${codexInitResult.createdItems.length} items created in .codex directory`);
    }
  }
  
  if (!flags.dryRun) {
    console.log('\nNext steps:');
    if (projectName !== '.') {
      // Escape project name to prevent command injection
      const escapedProjectName = JSON.stringify(projectName);
      console.log(`  cd ${escapedProjectName}`);
      const finalClaudeStatus = includesClaude(aiProvider) ? checkClaudeCode() : { isInstalled: true };
      if (includesClaude(aiProvider) && !finalClaudeStatus.isInstalled) {
        console.log('  claude init    # Initialize Claude Code in the project');
      }
    }
    if (includesClaude(aiProvider)) {
      console.log('  1. Edit CLAUDE.md to add your project-specific instructions');
    }
    if (includesCodex(aiProvider)) {
      console.log(`  ${includesClaude(aiProvider) ? '2' : '1'}. Edit AGENTS.md to add your Codex project instructions`);
      console.log(`  ${includesClaude(aiProvider) ? '3' : '2'}. Review docs/codex-setup.md for Codex setup guidance`);
    }
    console.log(`  ${includesClaude(aiProvider) && includesCodex(aiProvider) ? '4' : includesCodex(aiProvider) ? '3' : '2'}. Update docs/ROADMAP.md with your project goals`);
    console.log(`  ${includesClaude(aiProvider) && includesCodex(aiProvider) ? '5' : includesCodex(aiProvider) ? '4' : '3'}. Update docs/agent-orchestration.md to define agent workflows`);
    console.log(`  ${includesClaude(aiProvider) && includesCodex(aiProvider) ? '6' : includesCodex(aiProvider) ? '5' : '4'}. Start creating tickets in the tickets/ directory`);
    
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
    
    if (includesCodex(aiProvider)) {
      console.log('\n🧠 Codex skills copied to .codex/skills/');
      console.log('  Use them from this project alongside AGENTS.md and docs/codex-setup.md');
    }

    // Ask user if they want the workflow selector hook
    if (includesClaude(aiProvider) && setupMode === 'full' && !flags.dryRun) {
      const claudeDir = path.join(targetDir, '.claude');
      if (fs.existsSync(claudeDir)) {
        try {
          let wantHook = false;

          if (!flags.force) {
            const confirmModule = await import('@inquirer/confirm');
            const confirm = confirmModule.default;

            wantHook = await confirm({
              message: 'Enable workflow selector hook? (suggests agent workflows per prompt, controlled via CCSETUP_WORKFLOW env var)',
              default: false
            });
          }

          if (wantHook) {
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
              console.log('  📝 To activate, set the environment variable:');
              console.log('     export CCSETUP_WORKFLOW=1');
              console.log('  💡 The hook suggests workflows and asks before applying them');
            }
          } else {
            console.log('  ⏭️  Skipped workflow selector hook');
            console.log('  💡 You can install it later with: npx ccsetup --install-hooks');
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
