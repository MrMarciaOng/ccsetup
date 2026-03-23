const fs = require('fs');
const path = require('path');
const patterns = require('./patterns');

class ProjectDetector {
  constructor(projectPath) {
    this.projectPath = projectPath;
  }

  async detect() {
    const detectionResults = [];

    try {
      for (const [projectType, config] of Object.entries(patterns.PROJECT_TYPES)) {
        const confidence = await this.calculateConfidence(projectType, config);
        if (confidence > 0) {
          detectionResults.push({
            type: projectType,
            confidence,
            indicators: config.indicators.filter(indicator => 
              this.checkIndicator(indicator)
            )
          });
        }
      }

      detectionResults.sort((a, b) => b.confidence - a.confidence);
      
      const primaryType = detectionResults[0] || { type: 'unknown', confidence: 0, indicators: [] };
      const secondaryTypes = detectionResults.slice(1, 3);

      return {
        primary: primaryType,
        secondary: secondaryTypes,
        framework: await this.detectFramework(primaryType.type),
        language: await this.detectLanguage(),
        buildTools: await this.detectBuildTools()
      };
    } catch (error) {
      return {
        primary: { type: 'unknown', confidence: 0, indicators: [] },
        secondary: [],
        framework: null,
        language: 'unknown',
        buildTools: []
      };
    }
  }

  async calculateConfidence(projectType, config) {
    let confidence = 0;
    const maxConfidence = config.indicators.length * 10;

    for (const indicator of config.indicators) {
      if (this.checkIndicator(indicator)) {
        confidence += indicator.weight || 10;
      }
    }

    return Math.min(100, (confidence / maxConfidence) * 100);
  }

  checkIndicator(indicator) {
    const filePath = path.join(this.projectPath, indicator.file);
    
    try {
      if (indicator.type === 'file') {
        return fs.existsSync(filePath);
      } else if (indicator.type === 'directory') {
        const stats = fs.statSync(filePath);
        return stats.isDirectory();
      } else if (indicator.type === 'content') {
        if (!fs.existsSync(filePath)) return false;
        const content = fs.readFileSync(filePath, 'utf8');
        return indicator.pattern ? new RegExp(indicator.pattern).test(content) : true;
      }
    } catch (error) {
      return false;
    }
    
    return false;
  }

  async detectFramework(projectType) {
    const frameworkPatterns = patterns.FRAMEWORKS[projectType];
    if (!frameworkPatterns) return null;

    for (const [framework, indicators] of Object.entries(frameworkPatterns)) {
      let matches = 0;
      for (const indicator of indicators) {
        if (this.checkIndicator(indicator)) {
          matches++;
        }
      }
      if (matches > 0) {
        return { name: framework, confidence: (matches / indicators.length) * 100 };
      }
    }

    return null;
  }

  async detectLanguage() {
    const languageIndicators = {
      javascript: ['package.json', '*.js', '*.mjs'],
      typescript: ['tsconfig.json', '*.ts', '*.tsx'],
      python: ['requirements.txt', 'pyproject.toml', '*.py'],
      go: ['go.mod', 'go.sum', '*.go'],
      rust: ['Cargo.toml', 'Cargo.lock', '*.rs'],
      java: ['pom.xml', 'build.gradle', '*.java'],
      csharp: ['*.csproj', '*.sln'],
      php: ['composer.json', '*.php'],
      ruby: ['Gemfile', '*.rb'],
      cpp: ['CMakeLists.txt', '*.cpp', '*.cc', '*.cxx'],
      c: ['Makefile', '*.c', '*.h']
    };

    for (const [language, indicators] of Object.entries(languageIndicators)) {
      for (const indicator of indicators) {
        const fullPath = path.join(this.projectPath, indicator);
        if (fs.existsSync(fullPath)) {
          return language;
        }
      }
    }

    return 'unknown';
  }

  async detectBuildTools() {
    const buildTools = [];
    const buildToolPatterns = patterns.BUILD_TOOLS;

    for (const [tool, indicators] of Object.entries(buildToolPatterns)) {
      for (const indicator of indicators) {
        if (this.checkIndicator(indicator)) {
          buildTools.push(tool);
          break;
        }
      }
    }

    return buildTools;
  }
}

module.exports = ProjectDetector;