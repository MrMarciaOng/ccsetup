const { execFileSync } = require('child_process');

class AIMergeHelper {
  constructor() {
    this.hasClaudeCode = this.checkClaudeCode();
  }

  checkClaudeCode() {
    try {
      execFileSync('which', ['claude'], { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  async analyzeConflict(conflict) {
    if (!this.hasClaudeCode) {
      return null;
    }

    const prompt = `You are helping merge changes in a CLAUDE.md file. Analyze these two versions and suggest the best approach:

Section: ${conflict.sectionName}

EXISTING CONTENT:
${this.formatContent(conflict.existing)}

NEW CONTENT FROM SCAN:
${this.formatContent(conflict.new)}

Provide a brief analysis (max 3 sentences) explaining:
1. What's different between the versions
2. Which version appears more complete/accurate
3. Whether merging both would be beneficial

End with one of these recommendations: KEEP_EXISTING, USE_NEW, MERGE_BOTH, or SKIP`;

    try {
      const analysis = execFileSync(
        'claude', ['--print', prompt],
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], maxBuffer: 1024 * 1024, timeout: 30000 }
      ).trim();

      return this.parseAnalysis(analysis);
    } catch (error) {
      console.warn('   ⚠️  AI analysis unavailable, falling back to manual selection');
      return null;
    }
  }

  async generateMergedContent(conflict) {
    if (!this.hasClaudeCode) {
      return null;
    }

    const prompt = `Merge these two versions of content intelligently, preserving important information from both:

Section: ${conflict.sectionName}

EXISTING:
${this.formatContent(conflict.existing)}

NEW:
${this.formatContent(conflict.new)}

Create a merged version that:
- Preserves user customizations from EXISTING
- Adds new information from NEW
- Removes duplicates
- Maintains proper formatting

Output only the merged content, no explanations.`;

    try {
      const merged = execFileSync(
        'claude', ['--print', prompt],
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], maxBuffer: 1024 * 1024, timeout: 30000 }
      ).trim();

      return merged;
    } catch (error) {
      return null;
    }
  }

  async suggestSectionOrder(sections) {
    if (!this.hasClaudeCode || Object.keys(sections).length < 3) {
      return null;
    }

    const sectionNames = Object.keys(sections).join(', ');
    const prompt = `Given these sections in a CLAUDE.md file: ${sectionNames}

Suggest the optimal order for these sections to maximize clarity for Claude Code.
Output only a comma-separated list of section names in the recommended order.`;

    try {
      const order = execFileSync(
        'claude', ['--print', prompt],
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 30000 }
      ).trim();

      return order.split(',').map(s => s.trim()).filter(s => sections[s]);
    } catch {
      return null;
    }
  }

  formatContent(section) {
    if (typeof section === 'string') {
      return section;
    } else if (section.content) {
      if (typeof section.content === 'string') {
        return section.content;
      } else if (Array.isArray(section.content)) {
        return section.content.join('\n');
      } else if (typeof section.content === 'object') {
        return JSON.stringify(section.content, null, 2);
      }
    }
    return String(section);
  }

  parseAnalysis(analysis) {
    const recommendation = analysis.match(/\b(KEEP_EXISTING|USE_NEW|MERGE_BOTH|SKIP)\b/);
    
    return {
      analysis: analysis.replace(/\b(KEEP_EXISTING|USE_NEW|MERGE_BOTH|SKIP)\b/g, '').trim(),
      recommendation: recommendation ? recommendation[1].toLowerCase().replace('_', '-') : null
    };
  }

  async analyzeMergeStrategy(existingContent, newContent) {
    if (!this.hasClaudeCode) {
      return null;
    }

    const prompt = `Analyze this CLAUDE.md merge scenario and recommend a strategy:

EXISTING FILE (${existingContent.length} chars):
${existingContent.substring(0, 500)}...

NEW SCAN RESULTS (${newContent.length} chars):
${typeof newContent === 'string' ? newContent.substring(0, 500) : JSON.stringify(newContent).substring(0, 500)}...

Based on the content, recommend ONE of these strategies:
- SMART: Intelligent section-by-section merge
- INTERACTIVE: User chooses for each conflict
- OVERWRITE: Replace with new scan
- PRESERVE: Keep existing content

Consider: content quality, user customizations, scan completeness.
Output only the strategy name.`;

    try {
      const strategy = execFileSync(
        'claude', ['--print', prompt],
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 30000 }
      ).trim().toLowerCase();

      const validStrategies = ['smart', 'interactive', 'overwrite', 'preserve'];
      return validStrategies.includes(strategy) ? strategy : null;
    } catch {
      return null;
    }
  }
}

module.exports = AIMergeHelper;