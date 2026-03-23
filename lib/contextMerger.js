const fs = require('fs');
const path = require('path');
const AIMergeHelper = require('./aiMergeHelper');

class ContextMerger {
  constructor(existingContent, newContent) {
    this.existingContent = existingContent || '';
    this.newContent = newContent || '';
    this.aiHelper = new AIMergeHelper();
    
    try {
      this.isNewContentStructured = this.isStructuredContent(newContent);
      this.isExistingContentStructured = this.isStructuredContent(existingContent);
      
      if (this.isExistingContentStructured) {
        this.existingSections = this.parseStructuredSections(existingContent);
      } else {
        this.existingSections = this.parseMarkdownSections(this.existingContent);
      }
      
      if (this.isNewContentStructured) {
        this.newSections = this.parseStructuredSections(newContent);
      } else {
        this.newSections = this.parseMarkdownSections(this.newContent);
      }
    } catch (error) {
      console.warn(`Warning: Failed to parse content sections: ${error.message}`);
      // Fallback to simple string parsing
      this.existingSections = this.parseMarkdownSections(this.existingContent);
      this.newSections = this.parseMarkdownSections(this.newContent);
      this.isNewContentStructured = false;
      this.isExistingContentStructured = false;
    }
  }

  isStructuredContent(content) {
    return typeof content === 'object' && content !== null && !Array.isArray(content);
  }

  parseMarkdownSections(content) {
    const sections = {};
    const lines = content.split('\n');
    let currentSection = null;
    let currentContent = [];

    for (const line of lines) {
      const headerMatch = line.match(/^(##)\s+(.+)$/);
      if (headerMatch) {
        const [, hashes, title] = headerMatch;
        
        if (currentSection) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        
        currentSection = title.trim();
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }
    }

    if (currentSection) {
      sections[currentSection] = currentContent.join('\n').trim();
    }

    return sections;
  }

  parseStructuredSections(structuredContent) {
    if (!this.isStructuredContent(structuredContent)) {
      return {};
    }
    
    const sections = {};
    
    for (const [sectionName, sectionData] of Object.entries(structuredContent)) {
      if (sectionData && typeof sectionData === 'object' && sectionData.content) {
        sections[sectionName] = {
          content: sectionData.content,
          metadata: sectionData.metadata || {},
          type: sectionData.type || 'text'
        };
      } else if (typeof sectionData === 'string') {
        sections[sectionName] = {
          content: sectionData,
          metadata: {},
          type: 'text'
        };
      }
    }
    
    return sections;
  }

  mergeSection(sectionName, existingSection, newSection, strategy = 'smart') {
    if (!existingSection) {
      return newSection;
    }
    
    if (!newSection) {
      return existingSection;
    }

    const existingData = this.isStructuredContent(existingSection) ? existingSection : { content: existingSection, type: 'text' };
    const newData = this.isStructuredContent(newSection) ? newSection : { content: newSection, type: 'text' };

    switch (strategy) {
      case 'smart':
        return this.mergeWithSmartLogic(existingData, newData, sectionName);
      case 'replace':
        return newData;
      default:
        return this.mergeWithSmartLogic(existingData, newData, sectionName);
    }
  }

  mergeWithSmartLogic(existing, newData, sectionName) {
    if (sectionName === 'Tech Stack') {
      return this.mergeTechStack(existing, newData);
    } else if (sectionName === 'Key Commands') {
      return this.mergeCommands(existing, newData);
    } else if (sectionName === 'Project Structure' && existing.type === 'tree' && newData.type === 'tree') {
      return this.mergeProjectStructure(existing, newData);
    } else if (existing.type === 'list' || newData.type === 'list') {
      return this.mergeList(existing, newData);
    }
    
    if (newData.metadata && newData.metadata.scanGenerated && 
        (!existing.metadata || !existing.metadata.userGenerated)) {
      return newData;
    }
    
    return existing;
  }

  mergeList(existing, newData) {
    let existingItems = [];
    let newItems = [];

    if (Array.isArray(existing.content)) {
      existingItems = existing.content;
    } else if (typeof existing.content === 'string') {
      existingItems = this.parseListFromString(existing.content);
    }

    if (Array.isArray(newData.content)) {
      newItems = newData.content;
    } else if (typeof newData.content === 'string') {
      newItems = this.parseListFromString(newData.content);
    }

    const combined = [...existingItems];
    for (const item of newItems) {
      if (!this.listContainsItem(combined, item)) {
        combined.push(item);
      }
    }

    return {
      content: combined,
      type: 'list',
      metadata: { ...existing.metadata, ...newData.metadata }
    };
  }

  parseListFromString(content) {
    return content.split('\n')
      .map(line => line.replace(/^[-*+]\s*/, '').trim())
      .filter(line => line.length > 0);
  }

  listContainsItem(list, item) {
    const itemStr = typeof item === 'string' ? item : JSON.stringify(item);
    return list.some(existing => {
      const existingStr = typeof existing === 'string' ? existing : JSON.stringify(existing);
      return existingStr.toLowerCase().includes(itemStr.toLowerCase()) || 
             itemStr.toLowerCase().includes(existingStr.toLowerCase());
    });
  }

  mergeCommands(existing, newData) {
    const existingCommands = this.parseCommands(existing.content);
    const newCommands = this.parseCommands(newData.content);
    
    const merged = { ...existingCommands };
    
    for (const [command, description] of Object.entries(newCommands)) {
      if (!merged[command]) {
        merged[command] = description;
      } else if (description.length > merged[command].length) {
        merged[command] = description;
      }
    }
    
    const commandList = Object.entries(merged).map(([cmd, desc]) => `- \`${cmd}\` - ${desc}`);
    
    return {
      content: commandList.join('\n'),
      type: 'commands',
      metadata: { ...existing.metadata, ...newData.metadata }
    };
  }

  parseCommands(content) {
    const commands = {};
    if (typeof content === 'string') {
      const lines = content.split('\n');
      for (const line of lines) {
        const match = line.match(/^[-*+]?\s*`([^`]+)`\s*[-–—]\s*(.+)$/);
        if (match) {
          commands[match[1]] = match[2];
        }
      }
    } else if (typeof content === 'object' && content.content) {
      return this.parseCommands(content.content);
    }
    return commands;
  }

  mergeTechStack(existing, newData) {
    const existingStack = this.parseTechStack(existing.content);
    const newStack = this.parseTechStack(newData.content);
    
    const merged = { ...existingStack };
    
    for (const [category, technologies] of Object.entries(newStack)) {
      if (!merged[category]) {
        merged[category] = technologies;
      } else {
        const existingTechs = Array.isArray(merged[category]) ? merged[category] : [merged[category]];
        const newTechs = Array.isArray(technologies) ? technologies : [technologies];
        
        const combinedTechs = [...existingTechs];
        for (const tech of newTechs) {
          if (!this.listContainsItem(combinedTechs, tech)) {
            combinedTechs.push(tech);
          }
        }
        merged[category] = combinedTechs;
      }
    }
    
    let content = '';
    for (const [category, technologies] of Object.entries(merged)) {
      content += `### ${category}\n`;
      const techList = Array.isArray(technologies) ? technologies : [technologies];
      for (const tech of techList) {
        content += `- ${tech}\n`;
      }
      content += '\n';
    }
    
    return {
      content: content.trim(),
      type: 'tech-stack',
      metadata: { ...existing.metadata, ...newData.metadata }
    };
  }

  parseTechStack(content) {
    const stack = {};
    if (typeof content === 'string') {
      const lines = content.split('\n');
      let currentCategory = null;
      
      for (const line of lines) {
        const categoryMatch = line.match(/^###\s+(.+)$/);
        if (categoryMatch) {
          currentCategory = categoryMatch[1].trim();
          stack[currentCategory] = [];
        } else if (currentCategory && line.match(/^[-*+]\s+(.+)$/)) {
          const tech = line.replace(/^[-*+]\s+/, '').trim();
          stack[currentCategory].push(tech);
        }
      }
    } else if (typeof content === 'object' && content.content) {
      return this.parseTechStack(content.content);
    }
    return stack;
  }

  mergeProjectStructure(existing, newData) {
    return {
      content: newData.content,
      type: 'tree',
      metadata: { 
        ...existing.metadata, 
        ...newData.metadata,
        lastUpdated: new Date().toISOString()
      }
    };
  }

  detectChanges() {
    const changes = {
      added: [],
      modified: [],
      removed: [],
      unchanged: []
    };

    const normalizedExisting = this.normalizeSections(this.existingSections);
    const normalizedNew = this.normalizeSections(this.newSections);

    const newSectionKeys = Object.keys(normalizedNew);
    const existingSectionKeys = Object.keys(normalizedExisting);

    for (const sectionKey of newSectionKeys) {
      if (!normalizedExisting[sectionKey]) {
        changes.added.push({
          section: sectionKey,
          content: normalizedNew[sectionKey]
        });
      } else if (!this.sectionsEqual(normalizedExisting[sectionKey], normalizedNew[sectionKey])) {
        changes.modified.push({
          section: sectionKey,
          oldContent: normalizedExisting[sectionKey],
          newContent: normalizedNew[sectionKey]
        });
      } else {
        changes.unchanged.push({
          section: sectionKey,
          content: normalizedExisting[sectionKey]
        });
      }
    }

    for (const sectionKey of existingSectionKeys) {
      if (!normalizedNew[sectionKey]) {
        changes.removed.push({
          section: sectionKey,
          content: normalizedExisting[sectionKey]
        });
      }
    }

    return changes;
  }

  normalizeSections(sections) {
    const normalized = {};
    for (const [key, value] of Object.entries(sections)) {
      if (this.isStructuredContent(value)) {
        normalized[key] = value;
      } else {
        normalized[key] = { content: value, type: 'text' };
      }
    }
    return normalized;
  }

  sectionsEqual(section1, section2) {
    if (typeof section1 === 'string' && typeof section2 === 'string') {
      return section1.trim() === section2.trim();
    }
    
    if (this.isStructuredContent(section1) && this.isStructuredContent(section2)) {
      return JSON.stringify(section1.content) === JSON.stringify(section2.content);
    }
    
    return false;
  }

  generateDiff() {
    const changes = this.detectChanges();
    let output = '';

    if (changes.added.length > 0) {
      output += '📋 New Sections:\n';
      for (const add of changes.added) {
        output += `+ ${add.section}\n`;
      }
      output += '\n';
    }

    if (changes.modified.length > 0) {
      output += '📝 Modified Sections:\n';
      for (const mod of changes.modified) {
        output += `~ ${mod.section}\n`;
      }
      output += '\n';
    }

    if (changes.removed.length > 0) {
      output += '🗑️  Sections That Would Be Removed:\n';
      for (const rem of changes.removed) {
        output += `- ${rem.section}\n`;
      }
      output += '\n';
    }

    if (changes.unchanged.length > 0) {
      output += `✓ ${changes.unchanged.length} sections unchanged\n\n`;
    }

    return output;
  }

  async interactiveMerge() {
    try {
      const normalizedExisting = this.normalizeSections(this.existingSections);
      const normalizedNew = this.normalizeSections(this.newSections);
      
      const mergedSections = {};
      const allSectionNames = new Set([
        ...Object.keys(normalizedExisting),
        ...Object.keys(normalizedNew)
      ]);

      const conflicts = [];
      
      // First pass: identify conflicts
      for (const sectionName of allSectionNames) {
        const existingSection = normalizedExisting[sectionName];
        const newSection = normalizedNew[sectionName];
        
        if (existingSection && newSection && !this.sectionsEqual(existingSection, newSection)) {
          conflicts.push({
            sectionName,
            existing: existingSection,
            new: newSection
          });
        } else if (!existingSection && newSection) {
          // New section - auto-accept
          mergedSections[sectionName] = newSection;
        } else if (existingSection && !newSection) {
          // Section only in existing - preserve
          mergedSections[sectionName] = existingSection;
        } else {
          // Sections are equal
          mergedSections[sectionName] = existingSection;
        }
      }

      // Interactive resolution for conflicts
      if (conflicts.length > 0) {
        console.log(`\n🔍 Found ${conflicts.length} section(s) with conflicts:\n`);
        
        // Dynamic import for inquirer
        const selectModule = await import('@inquirer/select');
        const select = selectModule.default;
        
        for (const conflict of conflicts) {
          console.log(`\n${'═'.repeat(60)}`);
          console.log(`📋 Conflict in section: ${conflict.sectionName}`);
          console.log(`${'─'.repeat(60)}\n`);
          
          console.log('📄 Your current content:');
          console.log(this.formatSectionForDisplay(conflict.existing, '   '));
          
          console.log('\n🔍 New content from scan:');
          console.log(this.formatSectionForDisplay(conflict.new, '   '));
          console.log(`\n${'─'.repeat(60)}`);
          
          // Get AI suggestion if Claude Code is available
          const aiSuggestion = await this.aiHelper.analyzeConflict(conflict);
          if (aiSuggestion && aiSuggestion.analysis) {
            console.log('\n🤖 AI Analysis:');
            console.log(`   ${aiSuggestion.analysis}`);
            if (aiSuggestion.recommendation) {
              const recommendations = {
                'keep-existing': '✅ Keep existing',
                'use-new': '🔄 Use new',
                'merge-both': '🤝 Merge both',
                'skip': '❌ Skip'
              };
              console.log(`   💡 Recommendation: ${recommendations[aiSuggestion.recommendation] || aiSuggestion.recommendation}`);
            }
            console.log(`${'─'.repeat(60)}`);
          }
          
          const choice = await select({
            message: `How would you like to handle this section?`,
            choices: [
              { 
                name: '✅ Keep mine - Use my existing content', 
                value: 'keep',
                description: 'Your current content will be preserved unchanged'
              },
              { 
                name: '🔄 Use new - Replace with scan results', 
                value: 'replace',
                description: 'Replace your content with the newly scanned information'
              },
              { 
                name: '🤝 Merge both - Combine intelligently', 
                value: 'merge',
                description: 'Attempts to preserve your content while adding new findings'
              },
              { 
                name: '❌ Skip - Don\'t include this section', 
                value: 'skip',
                description: 'Remove this section entirely from the file'
              }
            ]
          });
          
          switch (choice) {
            case 'keep':
              mergedSections[conflict.sectionName] = conflict.existing;
              break;
            case 'replace':
              mergedSections[conflict.sectionName] = conflict.new;
              break;
            case 'merge':
              // Try AI-powered merge first
              const aiMerged = await this.aiHelper.generateMergedContent(conflict);
              if (aiMerged) {
                console.log('\n🤖 Using AI-generated merge...');
                mergedSections[conflict.sectionName] = {
                  content: aiMerged,
                  type: 'text',
                  metadata: { aiMerged: true }
                };
              } else {
                // Fallback to rule-based merge
                mergedSections[conflict.sectionName] = this.mergeSection(
                  conflict.sectionName,
                  conflict.existing,
                  conflict.new,
                  'smart'
                );
              }
              break;
            case 'skip':
              // Don't include this section
              break;
          }
        }
      }

      if (conflicts.length === 0) {
        console.log('✅ No conflicts found - all new sections will be added automatically.\n');
      }

      return await this.reconstructContent(mergedSections);
    } catch (error) {
      // Handle specific error cases
      if (error.message && error.message.includes('User force closed')) {
        console.log('\n❌ Interactive merge cancelled by user.');
        console.log('💡 Tip: Your CLAUDE.md remains unchanged. Run the command again when ready.\n');
        throw new Error('Interactive merge cancelled');
      } else if (error.code === 'MODULE_NOT_FOUND') {
        console.error('\n❌ Required module @inquirer/select not found.');
        console.log('💡 Please run: npm install @inquirer/select\n');
        throw new Error('Missing required dependency');
      } else {
        console.warn(`\n⚠️  Interactive merge encountered an error: ${error.message}`);
        console.log('Falling back to smart merge...\n');
        return this.smartMerge('smart');
      }
    }
  }

  formatSectionForDisplay(section, indent = '') {
    const maxLines = 10;
    let content = '';
    
    if (typeof section === 'string') {
      content = section;
    } else if (section.content) {
      content = this.extractContent(section);
    }
    
    const lines = content.split('\n');
    const displayLines = lines.slice(0, maxLines).map(line => indent + line);
    
    if (lines.length > maxLines) {
      return displayLines.join('\n') + `\n${indent}... (${lines.length - maxLines} more lines)`;
    }
    return displayLines.join('\n');
  }

  async smartMerge(strategy = 'smart') {
    try {
      const normalizedExisting = this.normalizeSections(this.existingSections);
      const normalizedNew = this.normalizeSections(this.newSections);
      
      const mergedSections = {};
      const allSectionNames = new Set([
        ...Object.keys(normalizedExisting),
        ...Object.keys(normalizedNew)
      ]);

      for (const sectionName of allSectionNames) {
        const existingSection = normalizedExisting[sectionName];
        const newSection = normalizedNew[sectionName];
        
        mergedSections[sectionName] = this.mergeSection(
          sectionName,
          existingSection,
          newSection,
          strategy
        );
      }

      return await this.reconstructContent(mergedSections);
    } catch (error) {
      console.warn(`Warning: Smart merge failed: ${error.message}`);
      // Fallback to simple content replacement
      if (this.isNewContentStructured && this.newContent.formatForClaude) {
        return this.newContent.formatForClaude();
      }
      return this.newContent || this.existingContent;
    }
  }

  async merge(strategy = 'smart') {
    if (strategy === 'interactive') {
      return await this.interactiveMerge();
    }
    if (strategy === 'replace') {
      return this.smartMerge('replace');
    }
    return this.smartMerge('smart');
  }

  shouldUpdateSection(sectionName, oldContent, newContent) {
    const autoUpdateSections = [
      'Tech Stack',
      'Key Commands',
      'Project Structure',
      'Architecture & Patterns',
      'Scan Information'
    ];

    return autoUpdateSections.includes(sectionName);
  }

  async reconstructContent(sections) {
    // Always return markdown for CLI integration unless explicitly requested otherwise
    if (this.isNewContentStructured && this.preserveStructuredFormat) {
      return this.reconstructStructuredContent(sections);
    } else {
      return await this.reconstructMarkdown(sections);
    }
  }

  reconstructStructuredContent(sections) {
    const structured = {};
    for (const [sectionName, sectionData] of Object.entries(sections)) {
      if (this.isStructuredContent(sectionData)) {
        structured[sectionName] = sectionData;
      } else {
        structured[sectionName] = {
          content: sectionData,
          type: 'text',
          metadata: {}
        };
      }
    }
    return structured;
  }

  async reconstructMarkdown(sections) {
    let content = '';
    
    const sectionOrder = [
      'Project Overview',
      'Tech Stack',
      'Key Commands',
      'Project Structure',
      'Architecture & Patterns',
      'Important Context',
      'Scan Information'
    ];

    const usedSections = new Set();

    for (const sectionName of sectionOrder) {
      if (sections[sectionName]) {
        const sectionContent = this.extractContent(sections[sectionName]);
        content += `## ${sectionName}\n${sectionContent}\n\n`;
        usedSections.add(sectionName);
      }
    }

    for (const [sectionName, sectionData] of Object.entries(sections)) {
      if (!usedSections.has(sectionName)) {
        const sectionContent = this.extractContent(sectionData);
        content += `## ${sectionName}\n${sectionContent}\n\n`;
      }
    }

    return content.trim();
  }

  extractContent(sectionData) {
    if (typeof sectionData === 'string') {
      return sectionData;
    } else if (this.isStructuredContent(sectionData) && sectionData.content) {
      const content = sectionData.content;
      
      if (Array.isArray(content)) {
        return content.map(item => {
          if (typeof item === 'object' && item.path && item.description) {
            const prefix = item.type === 'directory' ? '📁' : '📄';
            return `- ${prefix} \`/${item.path}\` - ${item.description}`;
          } else if (typeof item === 'object' && item.command && item.description) {
            return `- \`${item.command}\` - ${item.description}`;
          }
          return `- ${item}`;
        }).join('\n');
      } else if (typeof content === 'object') {
        // Handle structured objects like tech stack, commands
        let result = '';
        for (const [key, value] of Object.entries(content)) {
          if (key === 'scanDate' || key === 'duration' || key === 'filesAnalyzed') {
            // Special handling for scan information
            if (key === 'scanDate') result += `- Scanned on: ${value}\n`;
            else if (key === 'duration') result += `- Scan duration: ${value}\n`;
            else if (key === 'filesAnalyzed') result += `- Files analyzed: ${value}\n`;
          } else if (Array.isArray(value) && value.length > 0) {
            result += `- **${key.charAt(0).toUpperCase() + key.slice(1)}**: ${value.join(', ')}\n`;
          } else if (typeof value === 'string' && value.length > 0) {
            result += `- **${key.charAt(0).toUpperCase() + key.slice(1)}**: ${value}\n`;
          } else if (typeof value === 'object') {
            // Handle nested objects (like commands grouped by category)
            for (const [subKey, subValue] of Object.entries(value)) {
              if (Array.isArray(subValue)) {
                subValue.forEach(item => {
                  if (typeof item === 'object' && item.command && item.description) {
                    result += `- \`${item.command}\` - ${item.description}\n`;
                  }
                });
              }
            }
          }
        }
        return result.trim();
      }
      return String(content);
    }
    return '';
  }

  async updateFile(filePath, strategy = 'smart', dryRun = false) {
    const mergedContent = await this.merge(strategy);
    
    if (dryRun) {
      console.log('\n📄 Merged content preview:');
      console.log('━'.repeat(60));
      if (this.isStructuredContent(mergedContent)) {
        console.log(JSON.stringify(mergedContent, null, 2));
      } else {
        console.log(mergedContent);
      }
      console.log('━'.repeat(60));
      return mergedContent;
    }

    if (this.isStructuredContent(mergedContent)) {
      return mergedContent;
    }

    const existingHeader = this.extractHeaderContent();
    const fullContent = existingHeader + '\n\n' + mergedContent;

    fs.writeFileSync(filePath, fullContent, 'utf8');
    return fullContent;
  }

  extractHeaderContent() {
    const lines = this.existingContent.split('\n');
    const headerLines = [];
    
    for (const line of lines) {
      if (line.match(/^##\s+/)) {
        break;
      }
      headerLines.push(line);
    }
    
    return headerLines.join('\n').trim();
  }

  hasConflicts() {
    const changes = this.detectChanges();
    return changes.modified.length > 0 || changes.removed.length > 0;
  }

  getChangesSummary() {
    const changes = this.detectChanges();
    return {
      added: changes.added.length,
      modified: changes.modified.length,
      removed: changes.removed.length,
      unchanged: changes.unchanged.length,
      hasChanges: changes.added.length > 0 || changes.modified.length > 0 || changes.removed.length > 0
    };
  }

  static async mergeContextIntoFile(filePath, newContext, options = {}) {
    const { strategy = 'smart', dryRun = false, backup = true } = options;
    
    let existingContent = '';
    if (fs.existsSync(filePath)) {
      existingContent = fs.readFileSync(filePath, 'utf8');
      
      if (backup && !dryRun) {
        const backupPath = `${filePath}.backup.${Date.now()}`;
        fs.writeFileSync(backupPath, existingContent, 'utf8');
        console.log(`📋 Created backup: ${path.basename(backupPath)}`);
      }
    }

    const merger = new ContextMerger(existingContent, newContext);
    return await merger.updateFile(filePath, strategy, dryRun);
  }
}

module.exports = ContextMerger;