const path = require('path');
const fs = require('fs');
const ProjectDetector = require('./projectDetector');
const FileAnalyzer = require('./fileAnalyzer');

class RepositoryScanner {
  constructor(projectPath, options = {}) {
    this.projectPath = path.resolve(projectPath);
    this.options = {
      maxFiles: 1000,
      timeout: 30000,
      respectGitignore: true,
      maxFileSize: 1024 * 1024, // 1MB
      maxDepth: options.maxDepth || options.depth || 5,
      ignorePatterns: this.parseIgnorePatterns(options.ignorePatterns || options.ignore),
      ...options
    };
    this.projectDetector = new ProjectDetector(this.projectPath);
    this.fileAnalyzer = new FileAnalyzer(this.projectPath, this.options);
  }

  parseIgnorePatterns(patterns) {
    if (!patterns) return [];
    if (typeof patterns === 'string') {
      return patterns.split(',').map(p => p.trim()).filter(Boolean);
    }
    if (Array.isArray(patterns)) {
      return patterns.map(p => String(p).trim()).filter(Boolean);
    }
    return [];
  }

  shouldIgnorePath(filePath) {
    const relativePath = path.relative(this.projectPath, filePath);
    const depth = relativePath.split(path.sep).length;
    
    if (depth > this.options.maxDepth) {
      return true;
    }

    for (const pattern of this.options.ignorePatterns) {
      try {
        const minimatch = require('minimatch');
        if (minimatch(relativePath, pattern)) {
          return true;
        }
      } catch (error) {
        if (relativePath.includes(pattern)) {
          return true;
        }
      }
    }

    return false;
  }

  async scan(progressReporter = null) {
    const startTime = Date.now();
    
    try {
      if (progressReporter) {
        progressReporter.start('Scanning repository...');
      }

      let projectType, structure, dependencies, commands, patterns;

      if (progressReporter) {
        progressReporter.phase('Analyzing project structure');
        structure = await this.analyzeStructure();
        progressReporter.phaseComplete('Analyzing project structure', `${structure.totalFiles || 0} files`);

        progressReporter.phase('Detecting project type');
        projectType = await this.detectProjectType();
        progressReporter.phaseComplete('Detecting project type', projectType?.primary?.type || 'unknown');

        progressReporter.phase('Extracting dependencies');
        dependencies = await this.extractDependencies();
        const depCount = dependencies?.runtime?.length || 0;
        progressReporter.phaseComplete('Extracting dependencies', `${depCount} packages`);

        progressReporter.phase('Extracting commands');
        commands = await this.extractCommands();
        const cmdCount = Object.values(commands || {}).reduce((sum, cmds) => sum + cmds.length, 0);
        progressReporter.phaseComplete('Extracting commands', `${cmdCount} scripts`);

        progressReporter.phase('Detecting patterns');
        patterns = await this.detectPatterns();
        const patternCount = Object.values(patterns || {}).reduce((sum, patterns) => sum + patterns.length, 0);
        progressReporter.phaseComplete('Detecting patterns', `${patternCount} patterns`);
      } else {
        [projectType, structure, dependencies, commands, patterns] = await Promise.all([
          this.detectProjectType(),
          this.analyzeStructure(),
          this.extractDependencies(),
          this.extractCommands(),
          this.detectPatterns()
        ]);
      }

      const scanTime = Date.now() - startTime;
      
      const results = {
        projectType,
        structure,
        dependencies,
        commands,
        patterns,
        scanDate: new Date().toISOString(),
        scanTimeMs: scanTime,
        projectPath: this.projectPath
      };

      if (progressReporter) {
        progressReporter.success('Repository scan completed');
      }

      return results;
    } catch (error) {
      if (progressReporter) {
        progressReporter.fail(`Repository scan failed: ${error.message}`);
      }
      throw new Error(`Repository scan failed: ${error.message}`);
    }
  }

  async detectProjectType() {
    return await this.projectDetector.detect();
  }

  async analyzeStructure() {
    return await this.fileAnalyzer.analyzeStructure();
  }

  async extractDependencies() {
    return await this.fileAnalyzer.extractDependencies();
  }

  async extractCommands() {
    return await this.fileAnalyzer.extractCommands();
  }

  async detectPatterns() {
    return await this.fileAnalyzer.detectPatterns();
  }

  isValidProject() {
    try {
      const stats = fs.statSync(this.projectPath);
      return stats.isDirectory();
    } catch (error) {
      return false;
    }
  }

  static async quickScan(projectPath) {
    const scanner = new RepositoryScanner(projectPath, {
      maxFiles: 100,
      timeout: 10000
    });
    return await scanner.scan();
  }
}

module.exports = RepositoryScanner;