#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const RepositoryScanner = require('../lib/scanner');
const ContextGenerator = require('../lib/contextGenerator');
const ProgressReporter = require('../lib/progressReporter');
const ContextMerger = require('../lib/contextMerger');
const ScanConfigurator = require('../lib/scanConfig');

const args = process.argv.slice(2);
const flags = {
  help: false,
  update: false,
  dryRun: false,
  interactive: false,
  depth: 5,
  ignore: null,
  format: 'md',
  mergeStrategy: 'smart'
};

let scanPath = '.';

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--help' || arg === '-h') {
    flags.help = true;
  } else if (arg === '--update') {
    flags.update = true;
  } else if (arg === '--dry-run') {
    flags.dryRun = true;
  } else if (arg === '--interactive') {
    flags.interactive = true;
  } else if (arg === '--depth') {
    flags.depth = parseInt(args[i + 1], 10);
    i++;
  } else if (arg === '--ignore') {
    flags.ignore = args[i + 1];
    i++;
  } else if (arg === '--format') {
    flags.format = args[i + 1];
    i++;
  } else if (arg === '--merge-strategy') {
    const strategy = args[i + 1];
    const validStrategies = ['smart', 'replace'];
    if (validStrategies.includes(strategy)) {
      flags.mergeStrategy = strategy;
    } else {
      console.error(`Error: Invalid merge strategy '${strategy}'. Valid options: ${validStrategies.join(', ')}`);
      process.exit(1);
    }
    i++;
  } else if (!arg.startsWith('-')) {
    scanPath = arg;
  }
}

if (flags.help) {
  console.log(`
Usage: ccsetup scan [path] [options]

Scan repository and generate Claude Code context

Arguments:
  path                      Path to scan (default: current directory)

Options:
  --update                  Update existing CLAUDE.md with new context
  --depth <number>          Maximum directory depth to scan (default: 5)
  --ignore <patterns>       Comma-separated ignore patterns
  --dry-run                 Preview changes without applying them
  --interactive             Interactive scan configuration
  --format <type>           Output format: md, json, clipboard (default: md)
  --merge-strategy <type>   Merge strategy: smart, replace (default: smart)
  --help, -h                Show this help message

Examples:
  ccsetup scan                            # Scan current directory
  ccsetup scan ./my-project               # Scan specific directory
  ccsetup scan --update                   # Update existing CLAUDE.md
  ccsetup scan --depth 3                  # Limit scan depth
  ccsetup scan --ignore "test/**,*.log"   # Exclude patterns
  ccsetup scan --dry-run                  # Preview what would be scanned
  ccsetup scan --interactive              # Configure scan interactively
  ccsetup scan --format clipboard         # Copy results to clipboard
  ccsetup scan --merge-strategy replace   # Replace existing CLAUDE.md entirely

The scan command analyzes your project to generate contextual information
for Claude Code, including tech stack, project structure, available commands,
and architectural patterns.
`);
  process.exit(0);
}

async function validateScanPath(scanPath) {
  const resolvedPath = path.resolve(scanPath);
  
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Path does not exist: ${scanPath}`);
  }
  
  const stats = fs.statSync(resolvedPath);
  if (!stats.isDirectory()) {
    throw new Error(`Path is not a directory: ${scanPath}`);
  }
  
  return resolvedPath;
}

async function scanRepository(projectPath, options = {}) {
  try {
    const progressReporter = new ProgressReporter();
    console.log(`\n🔍 Scanning repository: ${path.relative(process.cwd(), projectPath) || '.'}`);
    
    const scannerOptions = {
      maxDepth: options.depth || 5,
      respectGitignore: true,
      maxFiles: 1000,
      timeout: 30000
    };
    
    if (options.ignore) {
      scannerOptions.ignorePatterns = options.ignore.split(',').map(p => p.trim());
    }
    
    const scanner = new RepositoryScanner(projectPath, scannerOptions);
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
    throw new Error(`Repository scanning failed: ${error.message}`);
  }
}

async function handleOutput(context, format, dryRun = false) {
  const formattedContext = context.formattedContext;
  
  switch (format) {
    case 'json':
      const jsonOutput = JSON.stringify(context.contextGenerator.generate(), null, 2);
      if (dryRun) {
        console.log('\n📋 JSON Output Preview:');
        console.log(jsonOutput);
      } else {
        console.log(jsonOutput);
      }
      break;
      
    case 'clipboard':
      if (dryRun) {
        console.log('\n📋 Would copy to clipboard:');
        console.log('━'.repeat(60));
        console.log(formattedContext);
        console.log('━'.repeat(60));
      } else {
        try {
          const clipboardy = require('clipboardy');
          await clipboardy.write(formattedContext);
          console.log('\n📋 Context copied to clipboard!');
        } catch (error) {
          console.warn('⚠️  Failed to copy to clipboard. Install clipboardy package for clipboard support.');
          console.log('\n📋 Context output:');
          console.log('━'.repeat(60));
          console.log(formattedContext);
          console.log('━'.repeat(60));
        }
      }
      break;
      
    case 'md':
    default:
      console.log('\n📝 Generated context:');
      console.log('━'.repeat(60));
      console.log(formattedContext);
      console.log('━'.repeat(60));
      break;
  }
}

async function updateClaudeMd(projectPath, repositoryContext, dryRun = false) {
  const formattedContext = repositoryContext.formattedContext;
  const claudeFilePath = path.join(projectPath, 'CLAUDE.md');
  
  if (!fs.existsSync(claudeFilePath)) {
    console.log('\n⚠️  CLAUDE.md not found. Creating new file...');
    
    const templatePath = path.join(__dirname, '..', 'template', 'CLAUDE.md');
    let templateContent = '';
    
    if (fs.existsSync(templatePath)) {
      templateContent = fs.readFileSync(templatePath, 'utf8');
    } else {
      templateContent = `# Claude Code Project Instructions

## Project Overview
[Add your project description here]

## Development Guidelines
[Add your development guidelines here]

## Additional Notes
[Any other important information for Claude to know about this project]
`;
    }
    
    const additionalNotesMarker = '## Additional Notes';
    const placeholderContent = '[Any other important information for Claude to know about this project]';
    
    let enhancedContent;
    if (templateContent.includes(additionalNotesMarker)) {
      if (templateContent.includes(placeholderContent)) {
        enhancedContent = templateContent.replace(placeholderContent, formattedContext.trim());
      } else {
        const sections = templateContent.split(additionalNotesMarker);
        if (sections.length >= 2) {
          enhancedContent = sections[0] + additionalNotesMarker + formattedContext + '\n';
        } else {
          enhancedContent = templateContent + formattedContext;
        }
      }
    } else {
      enhancedContent = templateContent + formattedContext;
    }
    
    if (dryRun) {
      console.log(`\n📄 Would create CLAUDE.md with context`);
    } else {
      fs.writeFileSync(claudeFilePath, enhancedContent, 'utf8');
      console.log(`\n✅ Created CLAUDE.md with project context`);
    }
  } else {
    console.log('\n📄 Found existing CLAUDE.md');
    
    const existingContent = fs.readFileSync(claudeFilePath, 'utf8');
    
    // Try structured sections first, fall back to formatted context
    let contextToMerge = repositoryContext.formattedContext;
    let usingStructured = false;
    
    if (repositoryContext.structuredSections && 
        typeof repositoryContext.structuredSections === 'object' && 
        Object.keys(repositoryContext.structuredSections).length > 0) {
      contextToMerge = repositoryContext.structuredSections;
      usingStructured = true;
      console.log('   📊 Using intelligent merge with structured sections');
    } else {
      console.log('   📝 Using fallback merge with formatted content');
    }
    
    const merger = new ContextMerger(existingContent, contextToMerge);
    const changes = merger.getChangesSummary();
    
    if (!changes.hasChanges) {
      console.log('✅ Context is already up to date - no changes needed');
      return;
    }
    
    console.log('\n📊 Analyzing changes...');
    console.log(`+ ${changes.added} new sections`);
    console.log(`~ ${changes.modified} updated sections`);
    console.log(`- ${changes.removed} removed sections`);
    console.log(`✓ ${changes.unchanged} unchanged sections`);
    
    const strategyDescriptions = {
      'smart': 'Preserves user content while adding new findings intelligently',
      'replace': 'Replaces CLAUDE.md entirely with new scan results'
    };
    
    console.log(`\n🔄 Using merge strategy: ${flags.mergeStrategy}`);
    console.log(`   ${strategyDescriptions[flags.mergeStrategy]}`);
    
    if (dryRun) {
      console.log('\n📄 Would update CLAUDE.md with merged context:');
      console.log(merger.generateDiff());
      await merger.updateFile(claudeFilePath, flags.mergeStrategy, true);
    } else {
      console.log('\n📝 Preview changes:');
      console.log(merger.generateDiff());
      
      const backupPath = `${claudeFilePath}.backup.${Date.now()}`;
      fs.writeFileSync(backupPath, existingContent, 'utf8');
      console.log(`📦 Backup created: ${path.basename(backupPath)}`);
      
      const mergedContent = await merger.updateFile(claudeFilePath, flags.mergeStrategy, false);
      
      console.log('✅ CLAUDE.md updated successfully with intelligent merge!');
      console.log('\n📋 Merge Results:');
      if (changes.added > 0) console.log(`  + Added ${changes.added} new sections`);
      if (changes.modified > 0) console.log(`  ~ Updated ${changes.modified} sections using ${flags.mergeStrategy} strategy`);
      if (changes.unchanged > 0) console.log(`  ✓ Preserved ${changes.unchanged} existing sections`);
      console.log(`  📦 Backup available: ${path.basename(backupPath)}`);
    }
  }
}

async function main() {
  try {
    const resolvedPath = await validateScanPath(scanPath);
    let scanOptions = { ...flags };
    
    if (flags.interactive) {
      const configurator = new ScanConfigurator();
      const config = await configurator.configure();
      
      scanOptions = {
        ...flags,
        depth: config.depth,
        ignore: config.ignore,
        maxFiles: config.maxFiles
      };
      
      configurator.showConfigSummary(config);
    }
    
    if (flags.dryRun) {
      console.log('🔍 DRY RUN MODE - No files will be created or modified\n');
    }
    
    const context = await scanRepository(resolvedPath, scanOptions);
    
    await handleOutput(context, flags.format, flags.dryRun);
    
    if (flags.update) {
      await updateClaudeMd(resolvedPath, context, flags.dryRun);
    }
    
    if (!flags.update && !flags.dryRun && flags.format === 'md') {
      console.log('\n💡 To save this context to CLAUDE.md, run:');
      console.log('   ccsetup scan --update');
    }
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();