const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class ClaudeInterface {
  constructor(projectPath) {
    this.projectPath = projectPath;
  }

  /**
   * Check if Claude Code CLI is available
   */
  async isAvailable() {
    try {
      await execAsync('claude --version');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Scan repository using Claude Code CLI
   */
  async scanRepository() {
    const isAvailable = await this.isAvailable();
    if (!isAvailable) {
      throw new Error('Claude Code CLI is not available. Please install it first: npm install -g @anthropic-ai/claude-code');
    }

    console.log('🤖 Using Claude Code to analyze your repository...');
    
    try {
      // Use Claude Code to analyze the repository
      const projectInfo = await this.analyzeProject();
      const dependencies = await this.analyzeDependencies();
      const structure = await this.analyzeStructure();
      const commands = await this.analyzeCommands();
      const patterns = await this.analyzePatterns();
      
      return {
        projectType: projectInfo.language || 'Unknown',
        frameworks: projectInfo.frameworks || [],
        purpose: projectInfo.description || '',
        structure: structure.directories || [],
        dependencies: dependencies,
        commands: commands.scripts || [],
        patterns: patterns,
        scanDate: new Date().toISOString(),
        scanMethod: 'claude-code'
      };
    } catch (error) {
      throw new Error(`Claude Code analysis failed: ${error.message}`);
    }
  }

  /**
   * Analyze project type and frameworks
   */
  async analyzeProject() {
    const prompt = `Analyze this project and tell me:
1. The main programming language
2. Key frameworks being used
3. A one-sentence description of what this project does

Respond in this exact JSON format:
{
  "language": "the main language",
  "frameworks": ["framework1", "framework2"],
  "description": "one sentence description"
}`;

    const result = await this.executeCommand(prompt);
    return this.parseJsonResponse(result);
  }

  /**
   * Analyze project dependencies
   */
  async analyzeDependencies() {
    const prompt = `List the key dependencies in this project. Look at package.json, requirements.txt, go.mod, etc.

Respond in this exact JSON format:
{
  "runtime": ["dep1", "dep2"],
  "dev": ["devDep1", "devDep2"]
}`;

    const result = await this.executeCommand(prompt);
    const parsed = this.parseJsonResponse(result);
    return {
      runtime: parsed.runtime || [],
      dev: parsed.dev || []
    };
  }

  /**
   * Analyze project structure
   */
  async analyzeStructure() {
    const prompt = `List the most important directories in this project and their purpose.

Respond in this exact JSON format:
{
  "directories": [
    {"path": "/src", "purpose": "source code"},
    {"path": "/tests", "purpose": "test files"}
  ]
}`;

    const result = await this.executeCommand(prompt);
    return this.parseJsonResponse(result);
  }

  /**
   * Analyze available commands
   */
  async analyzeCommands() {
    const prompt = `List all available commands from package.json scripts, Makefile, or other sources.

Respond in this exact JSON format:
{
  "scripts": [
    {"command": "npm run dev", "description": "start development server"},
    {"command": "npm test", "description": "run tests"}
  ]
}`;

    const result = await this.executeCommand(prompt);
    return this.parseJsonResponse(result);
  }

  /**
   * Analyze patterns and tools
   */
  async analyzePatterns() {
    const prompt = `Identify architectural patterns, testing tools, and deployment methods used.

Respond in this exact JSON format:
{
  "architecture": ["MVC", "REST API"],
  "testing": ["Jest", "unit tests"],
  "deployment": ["Docker", "CI/CD"]
}`;

    const result = await this.executeCommand(prompt);
    return this.parseJsonResponse(result);
  }

  /**
   * Execute Claude Code command
   */
  async executeCommand(prompt) {
    // Create a temporary file to store the prompt to avoid shell escaping issues
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    const tmpFile = path.join(os.tmpdir(), `claude-prompt-${Date.now()}.txt`);
    fs.writeFileSync(tmpFile, prompt);
    
    try {
      const command = `cat "${tmpFile}" | claude --print`;
      
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.projectPath,
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        timeout: 60000 // 60 second timeout
      });

      // Clean up temp file
      fs.unlinkSync(tmpFile);

      if (stderr && !stderr.includes('Warning')) {
        throw new Error(`Claude Code error: ${stderr}`);
      }

      return stdout;
    } catch (error) {
      // Clean up temp file on error
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
      throw error;
    }
  }

  /**
   * Parse JSON from Claude's response
   */
  parseJsonResponse(response) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // If no JSON found, return empty object
      console.warn('Could not parse JSON from Claude response');
      return {};
    } catch (error) {
      console.warn('JSON parsing failed:', error.message);
      return {};
    }
  }
}

module.exports = ClaudeInterface;