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
}

module.exports = AIMergeHelper;
