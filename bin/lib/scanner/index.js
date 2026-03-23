const ClaudeInterface = require('../claudeInterface');

class RepositoryScanner {
  constructor(projectPath, options = {}) {
    this.projectPath = projectPath;
    this.options = options;
    this.claudeInterface = new ClaudeInterface(this.projectPath);
  }

  /**
   * Scan repository using ONLY Claude Code CLI
   */
  async scan() {
    // Check if Claude Code is available
    const isAvailable = await this.claudeInterface.isAvailable();
    
    if (!isAvailable) {
      throw new Error('Claude Code CLI is required but not found. Please install it first: npm install -g @anthropic-ai/claude-code');
    }

    console.log('✓ Claude Code detected, starting AI-powered analysis...');
    
    // Use Claude Code to scan the repository
    return await this.claudeInterface.scanRepository();
  }
}

module.exports = RepositoryScanner;