class ContextGenerator {
  constructor(scanResults) {
    this.scanResults = scanResults;
  }

  generate() {
    return {
      overview: this.generateOverview(),
      techStack: this.generateTechStack(),
      commands: this.generateCommands(),
      structure: this.generateStructure(),
      patterns: this.generatePatterns(),
      context: this.generateImportantContext()
    };
  }

  generateOverview() {
    const { projectType, purpose, frameworks } = this.scanResults;
    
    if (purpose) {
      return purpose;
    }
    
    let overview = `This is a ${projectType || 'Unknown'} project`;
    
    if (frameworks && frameworks.length > 0) {
      overview += ` using ${frameworks.join(', ')}`;
    }
    
    overview += '.';
    
    return overview;
  }

  generateTechStack() {
    const techStack = {
      languages: [],
      frameworks: [],
      databases: [],
      devTools: [],
      testing: [],
      deployment: []
    };

    // All results now come from Claude Code
    if (this.scanResults.projectType) {
      techStack.languages.push(this.scanResults.projectType);
    }
    
    if (this.scanResults.frameworks && Array.isArray(this.scanResults.frameworks)) {
      techStack.frameworks.push(...this.scanResults.frameworks);
    }
    
    if (this.scanResults.dependencies) {
      if (this.scanResults.dependencies.runtime) {
        const dbPackages = ['mysql', 'postgresql', 'mongodb', 'redis', 'sqlite'];
        
        for (const dep of this.scanResults.dependencies.runtime) {
          if (dbPackages.some(db => dep.toLowerCase().includes(db))) {
            techStack.databases.push(dep);
          }
        }
      }
      
      if (this.scanResults.dependencies.dev) {
        const devToolPackages = ['eslint', 'prettier', 'webpack', 'rollup', 'vite'];
        
        for (const dep of this.scanResults.dependencies.dev) {
          if (devToolPackages.some(tool => dep.toLowerCase().includes(tool))) {
            techStack.devTools.push(dep);
          }
        }
      }
    }
    
    if (this.scanResults.patterns) {
      if (this.scanResults.patterns.testing) {
        techStack.testing.push(...this.scanResults.patterns.testing);
      }
      
      if (this.scanResults.patterns.deployment) {
        techStack.deployment.push(...this.scanResults.patterns.deployment);
      }
    }

    techStack.languages = [...new Set(techStack.languages)];
    techStack.frameworks = [...new Set(techStack.frameworks)];
    techStack.databases = [...new Set(techStack.databases)];
    techStack.devTools = [...new Set(techStack.devTools)];
    techStack.testing = [...new Set(techStack.testing)];
    techStack.deployment = [...new Set(techStack.deployment)];

    return techStack;
  }

  generateCommands() {
    const commands = {};
    
    // All results now come from Claude Code
    if (this.scanResults.commands && Array.isArray(this.scanResults.commands)) {
      commands.available = this.scanResults.commands.map(cmd => ({
        name: cmd.command,
        description: cmd.description,
        command: cmd.command
      }));
    }
    
    return commands;
  }

  generateStructure() {
    const structure = {
      overview: '',
      keyDirectories: []
    };

    if (this.scanResults.structure && Array.isArray(this.scanResults.structure)) {
      structure.keyDirectories = this.scanResults.structure.map(dir => ({
        name: dir.path,
        purpose: dir.purpose
      }));
      
      if (structure.keyDirectories.length > 0) {
        structure.overview = `Project organized into ${structure.keyDirectories.length} key directories`;
      }
    }

    return structure;
  }

  generatePatterns() {
    const patterns = {
      architecture: [],
      testing: [],
      deployment: []
    };

    if (this.scanResults.patterns) {
      if (this.scanResults.patterns.architecture) {
        patterns.architecture = this.scanResults.patterns.architecture.map(name => ({
          name,
          description: `${name} pattern detected`
        }));
      }
      
      if (this.scanResults.patterns.testing) {
        patterns.testing = this.scanResults.patterns.testing.map(name => ({
          name,
          description: `${name} testing framework`
        }));
      }
      
      if (this.scanResults.patterns.deployment) {
        patterns.deployment = this.scanResults.patterns.deployment.map(name => ({
          name,
          description: `${name} deployment method`
        }));
      }
    }

    return patterns;
  }

  generateImportantContext() {
    const context = [];

    if (this.scanResults.frameworks && this.scanResults.frameworks.length > 0) {
      context.push(`Primary frameworks: ${this.scanResults.frameworks.join(', ')}`);
    }

    if (this.scanResults.patterns && this.scanResults.patterns.architecture && this.scanResults.patterns.architecture.length > 0) {
      context.push(`Architecture: ${this.scanResults.patterns.architecture.join(', ')}`);
    }

    const hasDatabases = this.scanResults.dependencies && 
      this.scanResults.dependencies.runtime &&
      this.scanResults.dependencies.runtime.some(dep => 
        ['mysql', 'postgresql', 'mongodb', 'redis', 'sqlite'].some(db => 
          dep.toLowerCase().includes(db)
        )
      );
    
    if (hasDatabases) {
      context.push('Uses database connectivity');
    }

    if (this.scanResults.patterns && this.scanResults.patterns.deployment && this.scanResults.patterns.deployment.includes('Docker')) {
      context.push('Containerized with Docker');
    }

    return context;
  }

  formatForClaude() {
    const generated = this.generate();
    const sections = [];

    sections.push('\n## Additional Notes\n');

    if (generated.overview) {
      sections.push('### Project Overview');
      sections.push(generated.overview);
      sections.push('');
    }

    const techStack = generated.techStack;
    if (Object.values(techStack).some(arr => arr.length > 0)) {
      sections.push('### Tech Stack');
      
      if (techStack.languages.length > 0) {
        sections.push(`- **Languages**: ${techStack.languages.join(', ')}`);
      }
      if (techStack.frameworks.length > 0) {
        sections.push(`- **Frameworks**: ${techStack.frameworks.join(', ')}`);
      }
      if (techStack.databases.length > 0) {
        sections.push(`- **Databases**: ${techStack.databases.join(', ')}`);
      }
      if (techStack.devTools.length > 0 && techStack.devTools.length <= 8) {
        sections.push(`- **Dev Tools**: ${techStack.devTools.join(', ')}`);
      }
      if (techStack.testing.length > 0) {
        sections.push(`- **Testing**: ${techStack.testing.join(', ')}`);
      }
      if (techStack.deployment.length > 0) {
        sections.push(`- **Deployment**: ${techStack.deployment.join(', ')}`);
      }
      sections.push('');
    }

    const commands = generated.commands;
    if (commands.available && commands.available.length > 0) {
      sections.push('### Key Commands');
      
      for (const cmd of commands.available.slice(0, 10)) {
        sections.push(`- \`${cmd.command}\` - ${cmd.description}`);
      }
      
      sections.push('');
    }

    const structure = generated.structure;
    if (structure.keyDirectories.length > 0) {
      sections.push('### Project Structure');
      
      for (const dir of structure.keyDirectories.slice(0, 8)) {
        sections.push(`- \`${dir.name}\` - ${dir.purpose}`);
      }
      sections.push('');
    }

    const patterns = generated.patterns;
    const allPatterns = [
      ...patterns.architecture,
      ...patterns.testing,
      ...patterns.deployment
    ];
    
    if (allPatterns.length > 0) {
      sections.push('### Architecture & Patterns');
      for (const pattern of allPatterns.slice(0, 8)) {
        sections.push(`- **${pattern.name}**: ${pattern.description}`);
      }
      sections.push('');
    }

    if (generated.context.length > 0) {
      sections.push('### Important Context');
      for (const item of generated.context) {
        sections.push(`- ${item}`);
      }
      sections.push('');
    }

    const scanInfo = this.scanResults;
    if (scanInfo.scanDate) {
      sections.push('### Scan Information');
      sections.push(`- Analyzed using Claude Code AI`);
      sections.push(`- Last scanned: ${new Date(scanInfo.scanDate).toLocaleString()}`);
      sections.push('');
    }

    return sections.join('\n');
  }
}

module.exports = ContextGenerator;