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
      context: this.generateImportantContext(),
      patterns: this.generatePatterns()
    };
  }

  generateStructuredSections() {
    const timestamp = new Date().toISOString();
    const sections = {};

    sections['Project Overview'] = {
      content: this.generateOverview(),
      metadata: {
        type: 'text',
        source: 'scan',
        mergeable: true,
        mergeStrategy: 'preserve-user',
        timestamp
      }
    };

    const techStack = this.generateTechStack();
    sections['Tech Stack'] = {
      content: {
        language: techStack.language || [],
        runtime: this.getRuntime(),
        frameworks: techStack.frameworks || [],
        databases: techStack.databases || [],
        tools: techStack.tools || [],
        dependencies: techStack.runtime || []
      },
      metadata: {
        type: 'list',
        source: 'scan',
        mergeable: true,
        mergeStrategy: 'union',
        timestamp
      }
    };

    const commands = this.generateCommands();
    sections['Key Commands'] = {
      content: commands,
      metadata: {
        type: 'commands',
        source: 'scan',
        mergeable: true,
        mergeStrategy: 'smart',
        timestamp
      }
    };

    const structure = this.generateStructure();
    sections['Project Structure'] = {
      content: structure,
      metadata: {
        type: 'list',
        source: 'scan',
        mergeable: true,
        mergeStrategy: 'smart',
        timestamp
      }
    };

    const patterns = this.generatePatterns();
    if (patterns && Object.keys(patterns).length > 0) {
      sections['Architecture & Patterns'] = {
        content: patterns,
        metadata: {
          type: 'list',
          source: 'scan',
          mergeable: true,
          mergeStrategy: 'union',
          timestamp
        }
      };
    }

    const context = this.generateImportantContext();
    if (context && context.length > 0) {
      sections['Important Context'] = {
        content: context,
        metadata: {
          type: 'list',
          source: 'scan',
          mergeable: true,
          mergeStrategy: 'union',
          timestamp
        }
      };
    }

    sections['Scan Information'] = {
      content: {
        scanDate: new Date(this.scanResults.scanDate).toLocaleString(),
        duration: `${this.scanResults.scanTimeMs}ms`,
        filesAnalyzed: this.scanResults.structure?.totalFiles || 0
      },
      metadata: {
        type: 'text',
        source: 'scan',
        mergeable: false,
        mergeStrategy: 'preserve-user',
        timestamp
      }
    };

    return sections;
  }

  generateOverview() {
    const { projectType, structure } = this.scanResults;
    
    if (!projectType || !projectType.primary) {
      return 'This project structure could not be automatically detected.';
    }

    const primary = projectType.primary;
    const framework = projectType.framework;
    
    let overview = `This is a ${primary.type}`;
    
    if (framework && framework.name) {
      overview += ` project using ${framework.name}`;
    }
    
    if (primary.type === 'nodejs') {
      overview += ' application';
    } else if (primary.type === 'python') {
      overview += ' application';
    } else if (['react', 'vue', 'angular'].includes(primary.type)) {
      overview += ' web application';
    }
    
    overview += '.';
    
    if (structure && structure.totalFiles) {
      overview += ` The project contains ${structure.totalFiles} files`;
      if (structure.directories && structure.directories.length > 0) {
        overview += ` organized across ${structure.directories.length} directories`;
      }
      overview += '.';
    }
    
    return overview;
  }

  generateTechStack() {
    const techStack = {
      runtime: [],
      language: [],
      frameworks: [],
      databases: [],
      tools: []
    };

    const { projectType, dependencies } = this.scanResults;
    
    if (projectType && projectType.language) {
      techStack.language.push(this.capitalizeFirst(projectType.language));
    }
    
    if (projectType && projectType.framework) {
      techStack.frameworks.push(projectType.framework.name);
    }
    
    if (dependencies) {
      if (dependencies.frameworks && dependencies.frameworks.length > 0) {
        dependencies.frameworks.forEach(fw => {
          if (!techStack.frameworks.includes(fw.name)) {
            techStack.frameworks.push(fw.name);
          }
        });
      }
      
      if (dependencies.runtime && dependencies.runtime.length > 0) {
        const majorDeps = dependencies.runtime
          .filter(dep => this.isMajorDependency(dep.name))
          .slice(0, 8)
          .map(dep => `${dep.name} ${dep.version}`);
        techStack.runtime.push(...majorDeps);
      }
    }
    
    const patterns = this.scanResults.patterns;
    if (patterns) {
      if (patterns.database && patterns.database.length > 0) {
        techStack.databases.push(...patterns.database);
      }
    }
    
    if (projectType && projectType.buildTools && projectType.buildTools.length > 0) {
      techStack.tools.push(...projectType.buildTools);
    }
    
    return techStack;
  }

  generateCommands() {
    const { commands } = this.scanResults;
    if (!commands) return {};
    
    const organizedCommands = {};
    
    Object.keys(commands).forEach(category => {
      if (commands[category] && commands[category].length > 0) {
        organizedCommands[category] = commands[category].map(cmd => ({
          command: cmd.name,
          description: cmd.description || cmd.script || 'No description available'
        }));
      }
    });
    
    return organizedCommands;
  }

  generateStructure() {
    const { structure } = this.scanResults;
    if (!structure || !structure.keyFiles) return [];
    
    const importantItems = [];
    
    structure.keyFiles
      .filter(file => file.importance && file.importance > 5)
      .slice(0, 10)
      .forEach(file => {
        importantItems.push({
          path: file.path,
          type: file.type,
          description: this.describeStructureItem(file)
        });
      });
    
    if (structure.directories) {
      const keyDirectories = structure.directories
        .filter(dir => this.isImportantDirectory(dir.name))
        .slice(0, 8);
        
      keyDirectories.forEach(dir => {
        if (!importantItems.some(item => item.path === dir.path)) {
          importantItems.push({
            path: dir.path,
            type: 'directory',
            description: this.describeDirectory(dir.name)
          });
        }
      });
    }
    
    return importantItems.sort((a, b) => {
      const order = ['directory', 'file'];
      return order.indexOf(a.type) - order.indexOf(b.type);
    });
  }

  generateImportantContext() {
    const context = [];
    const { projectType, patterns, dependencies, structure } = this.scanResults;
    
    if (patterns && patterns.authentication && patterns.authentication.length > 0) {
      context.push(`Authentication: ${patterns.authentication.join(', ')}`);
    }
    
    if (patterns && patterns.database && patterns.database.length > 0) {
      context.push(`Database: ${patterns.database.join(', ')}`);
    }
    
    if (patterns && patterns.api && patterns.api.length > 0) {
      context.push(`API: ${patterns.api.join(', ')}`);
    }
    
    if (patterns && patterns.testing && patterns.testing.length > 0) {
      context.push(`Testing: ${patterns.testing.join(', ')}`);
    }
    
    if (patterns && patterns.deployment && patterns.deployment.length > 0) {
      context.push(`Deployment: ${patterns.deployment.join(', ')}`);
    }
    
    if (this.hasEnvironmentFiles()) {
      context.push('Environment variables configured (see .env.example or .env.template)');
    }
    
    if (dependencies && dependencies.development && dependencies.development.length > 0) {
      const devTools = dependencies.development
        .filter(dep => this.isImportantDevTool(dep.name))
        .map(dep => dep.name)
        .slice(0, 5);
      if (devTools.length > 0) {
        context.push(`Development tools: ${devTools.join(', ')}`);
      }
    }
    
    return context;
  }

  generatePatterns() {
    const { patterns } = this.scanResults;
    if (!patterns) return {};
    
    const organizedPatterns = {};
    
    Object.keys(patterns).forEach(category => {
      if (patterns[category] && patterns[category].length > 0) {
        organizedPatterns[category] = patterns[category];
      }
    });
    
    return organizedPatterns;
  }

  formatForClaude() {
    try {
      const sections = this.generateStructuredSections();
      let formatted = '\n## Additional Notes\n\n';
    
    if (sections['Project Overview'] && sections['Project Overview'].content) {
      formatted += `### Project Overview\n${sections['Project Overview'].content}\n\n`;
    }
    
    if (sections['Tech Stack'] && sections['Tech Stack'].content) {
      const techStack = sections['Tech Stack'].content;
      formatted += '### Tech Stack\n';
      
      if (techStack.language && techStack.language.length > 0) {
        formatted += `- **Language**: ${techStack.language.join(', ')}\n`;
      }
      
      if (techStack.runtime) {
        formatted += `- **Runtime**: ${techStack.runtime}\n`;
      }
      
      if (techStack.frameworks && techStack.frameworks.length > 0) {
        formatted += `- **Framework**: ${techStack.frameworks.join(', ')}\n`;
      }
      
      if (techStack.databases && techStack.databases.length > 0) {
        formatted += `- **Database**: ${techStack.databases.join(', ')}\n`;
      }
      
      if (techStack.tools && techStack.tools.length > 0) {
        formatted += `- **Build Tools**: ${techStack.tools.join(', ')}\n`;
      }
      
      if (techStack.dependencies && techStack.dependencies.length > 0) {
        formatted += `- **Key Dependencies**: ${techStack.dependencies.slice(0, 5).join(', ')}\n`;
      }
      
      formatted += '\n';
    }
    
    if (sections['Key Commands'] && sections['Key Commands'].content && Object.keys(sections['Key Commands'].content).length > 0) {
      const commands = sections['Key Commands'].content;
      formatted += '### Key Commands\n';
      
      ['dev', 'build', 'test', 'deploy', 'other'].forEach(category => {
        if (commands[category] && commands[category].length > 0) {
          commands[category].forEach(cmd => {
            formatted += `- \`${cmd.command}\` - ${cmd.description}\n`;
          });
        }
      });
      
      formatted += '\n';
    }
    
    if (sections['Project Structure'] && sections['Project Structure'].content && sections['Project Structure'].content.length > 0) {
      const structure = sections['Project Structure'].content;
      formatted += '### Project Structure\n';
      structure.forEach(item => {
        const prefix = item.type === 'directory' ? '📁' : '📄';
        formatted += `- ${prefix} \`/${item.path}\` - ${item.description}\n`;
      });
      formatted += '\n';
    }
    
    if (sections['Architecture & Patterns'] && sections['Architecture & Patterns'].content && Object.keys(sections['Architecture & Patterns'].content).length > 0) {
      const patterns = sections['Architecture & Patterns'].content;
      formatted += '### Architecture & Patterns\n';
      
      if (patterns.architecture && patterns.architecture.length > 0) {
        formatted += `- **Architecture**: ${patterns.architecture.join(', ')}\n`;
      }
      
      if (patterns.authentication && patterns.authentication.length > 0) {
        formatted += `- **Authentication**: ${patterns.authentication.join(', ')}\n`;
      }
      
      if (patterns.api && patterns.api.length > 0) {
        formatted += `- **API Style**: ${patterns.api.join(', ')}\n`;
      }
      
      formatted += '\n';
    }
    
    if (sections['Important Context'] && sections['Important Context'].content && sections['Important Context'].content.length > 0) {
      const context = sections['Important Context'].content;
      formatted += '### Important Context\n';
      context.forEach(ctx => {
        formatted += `- ${ctx}\n`;
      });
      formatted += '\n';
    }
    
    if (sections['Scan Information'] && sections['Scan Information'].content) {
      const scanInfo = sections['Scan Information'].content;
      formatted += `### Scan Information\n`;
      formatted += `- Scanned on: ${scanInfo.scanDate}\n`;
      formatted += `- Scan duration: ${scanInfo.duration}\n`;
      if (scanInfo.filesAnalyzed) {
        formatted += `- Files analyzed: ${scanInfo.filesAnalyzed}\n`;
      }
    }
    
    return formatted;
    } catch (error) {
      console.warn(`Warning: Error formatting context for Claude: ${error.message}`);
      // Fallback to basic context generation
      const basicContext = this.generate();
      return `\n## Additional Notes\n\nProject Type: ${basicContext.overview || 'Unknown'}\n\nError occurred during detailed context generation. Please run scan again.\n`;
    }
  }

  getRuntime() {
    const { projectType } = this.scanResults;
    
    if (projectType && projectType.primary) {
      switch (projectType.primary.type) {
        case 'nodejs':
          return 'Node.js';
        case 'python':
          return 'Python';
        case 'go':
          return 'Go';
        case 'rust':
          return 'Rust';
        case 'java':
          return 'Java (JVM)';
        case 'csharp':
          return '.NET';
        case 'php':
          return 'PHP';
        case 'ruby':
          return 'Ruby';
        default:
          return projectType.language || 'Unknown';
      }
    }
    
    return 'Unknown';
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  isMajorDependency(depName) {
    const majorPackages = [
      'express', 'react', 'vue', 'angular', 'next', 'nuxt',
      'typescript', 'babel', 'webpack', 'vite', 'rollup',
      'eslint', 'prettier', 'jest', 'cypress', 'playwright',
      'tailwindcss', 'sass', 'less', 'styled-components',
      'prisma', 'mongoose', 'sequelize', 'typeorm',
      'graphql', 'apollo', 'socket.io', 'passport',
      'jsonwebtoken', 'bcrypt', 'axios', 'lodash'
    ];
    
    return majorPackages.some(pkg => depName.includes(pkg)) ||
           depName.startsWith('@types/') ||
           depName.startsWith('@nestjs/') ||
           depName.startsWith('@angular/') ||
           depName.startsWith('@storybook/');
  }

  isImportantDevTool(depName) {
    const devTools = [
      'typescript', 'babel', 'webpack', 'vite', 'rollup', 'parcel',
      'eslint', 'prettier', 'jest', 'vitest', 'cypress', 'playwright',
      'storybook', 'nodemon', 'concurrently', 'rimraf'
    ];
    
    return devTools.some(tool => depName.includes(tool));
  }

  hasEnvironmentFiles() {
    const { structure } = this.scanResults;
    if (!structure || !structure.keyFiles) return false;
    
    return structure.keyFiles.some(file => {
      const fileName = file.name || file.path || '';
      return fileName.includes('.env') || 
             fileName.includes('environment') ||
             fileName.includes('config');
    });
  }

  isImportantDirectory(dirName) {
    const important = [
      'src', 'lib', 'app', 'components', 'pages', 'routes',
      'controllers', 'models', 'views', 'services', 'utils',
      'middleware', 'config', 'public', 'assets', 'static',
      'tests', 'test', '__tests__', 'spec', 'e2e',
      'docs', 'documentation', 'scripts', 'tools'
    ];
    
    return important.includes(dirName.toLowerCase());
  }

  describeStructureItem(file) {
    switch (file.type) {
      case 'package-manager':
        return 'Package manager configuration and dependencies';
      case 'containerization':
        return 'Docker configuration for containerized deployment';
      case 'build':
        return 'Build system configuration and scripts';
      case 'documentation':
        return 'Project documentation and guides';
      case 'configuration':
        return 'Application configuration files';
      case 'environment':
        return 'Environment variables and settings';
      case 'testing':
        return 'Test configuration and setup';
      case 'directory':
        return this.describeDirectory(file.name || file.path || 'unknown');
      default:
        return 'Project file';
    }
  }

  describeDirectory(dirName) {
    const descriptions = {
      src: 'Source code directory',
      lib: 'Library code and utilities',
      app: 'Main application code',
      components: 'Reusable UI components',
      pages: 'Page components and routing',
      routes: 'API routes and handlers',
      controllers: 'Request controllers (MVC pattern)',
      models: 'Data models and schemas',
      views: 'View templates and components',
      services: 'Business logic and services',
      utils: 'Utility functions and helpers',
      middleware: 'Express/API middleware',
      config: 'Configuration files',
      public: 'Static public assets',
      assets: 'Application assets (images, fonts, etc.)',
      static: 'Static files served directly',
      tests: 'Test files and test utilities',
      test: 'Test files and test utilities',
      '__tests__': 'Jest test files',
      spec: 'Specification and test files',
      e2e: 'End-to-end test files',
      docs: 'Documentation files',
      scripts: 'Build and utility scripts',
      tools: 'Development tools and utilities'
    };
    
    return descriptions[dirName.toLowerCase()] || `${dirName} directory`;
  }
}

module.exports = ContextGenerator;