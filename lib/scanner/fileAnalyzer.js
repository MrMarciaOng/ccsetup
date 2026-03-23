const fs = require('fs');
const path = require('path');
const patterns = require('./patterns');

class FileAnalyzer {
  constructor(projectPath, options = {}) {
    this.projectPath = projectPath;
    this.options = options;
    this.gitignorePatterns = this.loadGitignore();
  }

  loadGitignore() {
    const gitignorePath = path.join(this.projectPath, '.gitignore');
    const patterns = ['node_modules/', '.git/', 'dist/', 'build/', '*.log'];
    
    try {
      if (fs.existsSync(gitignorePath)) {
        const content = fs.readFileSync(gitignorePath, 'utf8');
        const gitPatterns = content
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('#'));
        patterns.push(...gitPatterns);
      }
    } catch (error) {
      console.warn('Warning: Could not read .gitignore file');
    }
    
    return patterns;
  }

  shouldIgnore(filePath) {
    if (!this.options.respectGitignore) return false;
    
    const relativePath = path.relative(this.projectPath, filePath);
    return this.gitignorePatterns.some(pattern => {
      if (pattern.endsWith('/')) {
        return relativePath.startsWith(pattern.slice(0, -1));
      }
      return relativePath.includes(pattern) || relativePath.endsWith(pattern);
    });
  }

  async analyzeStructure() {
    const structure = {
      directories: [],
      keyFiles: [],
      fileTypes: {},
      totalFiles: 0,
      totalSize: 0
    };

    await this.walkDirectory(this.projectPath, structure, 0);
    
    structure.keyFiles = this.identifyKeyFiles(structure.directories);
    
    return structure;
  }

  async walkDirectory(dirPath, structure, depth) {
    if (depth > 10 || structure.totalFiles > this.options.maxFiles) return;
    
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const relativePath = path.relative(this.projectPath, fullPath);
        
        if (this.shouldIgnore(fullPath)) continue;
        
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
          structure.directories.push({
            path: relativePath,
            name: item,
            depth
          });
          await this.walkDirectory(fullPath, structure, depth + 1);
        } else if (stats.isFile()) {
          structure.totalFiles++;
          structure.totalSize += stats.size;
          
          const ext = path.extname(item);
          structure.fileTypes[ext] = (structure.fileTypes[ext] || 0) + 1;
          
          if (stats.size < this.options.maxFileSize) {
            this.analyzeFile(fullPath, relativePath, structure);
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read directory ${dirPath}: ${error.message}`);
    }
  }

  analyzeFile(filePath, relativePath, structure) {
    const fileName = path.basename(filePath);
    
    if (patterns.KEY_FILES.includes(fileName.toLowerCase()) ||
        patterns.CONFIG_FILES.some(pattern => fileName.match(pattern))) {
      structure.keyFiles.push({
        path: relativePath,
        name: fileName,
        type: this.categorizeFile(fileName)
      });
    }
  }

  categorizeFile(fileName) {
    const name = fileName.toLowerCase();
    
    if (name.includes('package.json')) return 'package-manager';
    if (name.includes('dockerfile')) return 'containerization';
    if (name.includes('docker-compose')) return 'containerization';
    if (name.includes('makefile')) return 'build';
    if (name.includes('readme')) return 'documentation';
    if (name.includes('license')) return 'legal';
    if (name.includes('changelog')) return 'documentation';
    if (name.includes('config') || name.includes('settings')) return 'configuration';
    if (name.includes('env')) return 'environment';
    if (name.includes('test') || name.includes('spec')) return 'testing';
    
    return 'other';
  }

  identifyKeyFiles(directories) {
    const keyFiles = [];
    const importantPaths = [
      'src', 'lib', 'app', 'components', 'pages', 'routes', 
      'controllers', 'models', 'views', 'services', 'utils',
      'tests', 'test', '__tests__', 'spec', 'specs',
      'docs', 'documentation', 'config', 'configurations'
    ];
    
    for (const dir of directories) {
      if (importantPaths.includes(dir.name.toLowerCase())) {
        keyFiles.push({
          path: dir.path,
          name: dir.name,
          type: 'directory',
          importance: this.calculateImportance(dir.name)
        });
      }
    }
    
    return keyFiles.sort((a, b) => b.importance - a.importance);
  }

  calculateImportance(dirName) {
    const importance = {
      src: 10, lib: 9, app: 8, components: 7, pages: 6,
      controllers: 8, models: 7, views: 6, services: 7,
      tests: 5, docs: 4, config: 3
    };
    
    return importance[dirName.toLowerCase()] || 1;
  }

  async extractDependencies() {
    const dependencies = {
      runtime: [],
      development: [],
      system: [],
      frameworks: []
    };

    await this.extractFromPackageJson(dependencies);
    await this.extractFromRequirementsTxt(dependencies);
    await this.extractFromGoMod(dependencies);
    await this.extractFromCargoToml(dependencies);
    await this.extractFromPomXml(dependencies);
    
    return dependencies;
  }

  async extractFromPackageJson(dependencies) {
    const packagePath = path.join(this.projectPath, 'package.json');
    
    try {
      if (fs.existsSync(packagePath)) {
        const content = fs.readFileSync(packagePath, 'utf8');
        const pkg = JSON.parse(content);
        
        if (pkg.dependencies) {
          for (const [name, version] of Object.entries(pkg.dependencies)) {
            dependencies.runtime.push({ name, version, type: 'npm' });
            if (patterns.FRAMEWORK_PACKAGES[name]) {
              dependencies.frameworks.push({
                name: patterns.FRAMEWORK_PACKAGES[name],
                package: name,
                version
              });
            }
          }
        }
        
        if (pkg.devDependencies) {
          for (const [name, version] of Object.entries(pkg.devDependencies)) {
            dependencies.development.push({ name, version, type: 'npm' });
          }
        }
      }
    } catch (error) {
      console.warn('Warning: Could not parse package.json');
    }
  }

  async extractFromRequirementsTxt(dependencies) {
    const reqPath = path.join(this.projectPath, 'requirements.txt');
    
    try {
      if (fs.existsSync(reqPath)) {
        const content = fs.readFileSync(reqPath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
        
        for (const line of lines) {
          const match = line.match(/^([a-zA-Z0-9_-]+)([>=<~!]+.+)?$/);
          if (match) {
            dependencies.runtime.push({
              name: match[1],
              version: match[2] || 'latest',
              type: 'pip'
            });
          }
        }
      }
    } catch (error) {
      console.warn('Warning: Could not parse requirements.txt');
    }
  }

  async extractFromGoMod(dependencies) {
    const goModPath = path.join(this.projectPath, 'go.mod');
    
    try {
      if (fs.existsSync(goModPath)) {
        const content = fs.readFileSync(goModPath, 'utf8');
        const requireRegex = /require\s+([^\s]+)\s+([^\s]+)/g;
        let match;
        
        while ((match = requireRegex.exec(content)) !== null) {
          dependencies.runtime.push({
            name: match[1],
            version: match[2],
            type: 'go'
          });
        }
      }
    } catch (error) {
      console.warn('Warning: Could not parse go.mod');
    }
  }

  async extractFromCargoToml(dependencies) {
    const cargoPath = path.join(this.projectPath, 'Cargo.toml');
    
    try {
      if (fs.existsSync(cargoPath)) {
        const content = fs.readFileSync(cargoPath, 'utf8');
        const depSection = content.match(/\[dependencies\]([\s\S]*?)(?=\[|$)/);
        
        if (depSection) {
          const lines = depSection[1].split('\n').filter(line => line.trim() && !line.startsWith('#'));
          for (const line of lines) {
            const match = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*["']([^"']+)["']/);
            if (match) {
              dependencies.runtime.push({
                name: match[1],
                version: match[2],
                type: 'cargo'
              });
            }
          }
        }
      }
    } catch (error) {
      console.warn('Warning: Could not parse Cargo.toml');
    }
  }

  async extractFromPomXml(dependencies) {
    const pomPath = path.join(this.projectPath, 'pom.xml');
    
    try {
      if (fs.existsSync(pomPath)) {
        const content = fs.readFileSync(pomPath, 'utf8');
        const depRegex = /<groupId>([^<]+)<\/groupId>\s*<artifactId>([^<]+)<\/artifactId>\s*<version>([^<]+)<\/version>/g;
        let match;
        
        while ((match = depRegex.exec(content)) !== null) {
          dependencies.runtime.push({
            name: `${match[1]}:${match[2]}`,
            version: match[3],
            type: 'maven'
          });
        }
      }
    } catch (error) {
      console.warn('Warning: Could not parse pom.xml');
    }
  }

  async extractCommands() {
    const commands = {
      build: [],
      dev: [],
      test: [],
      deploy: [],
      other: []
    };

    await this.extractFromPackageJsonScripts(commands);
    await this.extractFromMakefile(commands);
    await this.extractFromDockerfile(commands);
    
    return commands;
  }

  async extractFromPackageJsonScripts(commands) {
    const packagePath = path.join(this.projectPath, 'package.json');
    
    try {
      if (fs.existsSync(packagePath)) {
        const content = fs.readFileSync(packagePath, 'utf8');
        const pkg = JSON.parse(content);
        
        if (pkg.scripts) {
          for (const [name, script] of Object.entries(pkg.scripts)) {
            const category = this.categorizeCommand(name);
            commands[category].push({
              name: `npm run ${name}`,
              script,
              description: this.describeCommand(name, script)
            });
          }
        }
      }
    } catch (error) {
      console.warn('Warning: Could not extract npm scripts');
    }
  }

  async extractFromMakefile(commands) {
    const makefilePath = path.join(this.projectPath, 'Makefile');
    
    try {
      if (fs.existsSync(makefilePath)) {
        const content = fs.readFileSync(makefilePath, 'utf8');
        const targetRegex = /^([a-zA-Z0-9_-]+):/gm;
        let match;
        
        while ((match = targetRegex.exec(content)) !== null) {
          const target = match[1];
          if (target !== '.PHONY') {
            const category = this.categorizeCommand(target);
            commands[category].push({
              name: `make ${target}`,
              description: `Execute make target: ${target}`
            });
          }
        }
      }
    } catch (error) {
      console.warn('Warning: Could not parse Makefile');
    }
  }

  async extractFromDockerfile(commands) {
    const dockerfilePath = path.join(this.projectPath, 'Dockerfile');
    const composePath = path.join(this.projectPath, 'docker-compose.yml');
    
    if (fs.existsSync(dockerfilePath)) {
      commands.deploy.push({
        name: 'docker build .',
        description: 'Build Docker image from Dockerfile'
      });
    }
    
    if (fs.existsSync(composePath)) {
      commands.dev.push({
        name: 'docker-compose up',
        description: 'Start development environment with Docker Compose'
      });
      commands.deploy.push({
        name: 'docker-compose up -d',
        description: 'Deploy with Docker Compose in detached mode'
      });
    }
  }

  categorizeCommand(commandName) {
    const name = commandName.toLowerCase();
    
    if (name.includes('build') || name.includes('compile')) return 'build';
    if (name.includes('dev') || name.includes('start') || name.includes('serve')) return 'dev';
    if (name.includes('test') || name.includes('spec')) return 'test';
    if (name.includes('deploy') || name.includes('publish') || name.includes('release')) return 'deploy';
    
    return 'other';
  }

  describeCommand(name, script) {
    const descriptions = {
      start: 'Start the application',
      dev: 'Start development server',
      build: 'Build the application for production',
      test: 'Run test suite',
      lint: 'Run code linting',
      format: 'Format code',
      deploy: 'Deploy the application'
    };
    
    return descriptions[name] || `Execute: ${script}`;
  }

  async detectPatterns() {
    const detectedPatterns = {
      architecture: [],
      authentication: [],
      database: [],
      api: [],
      testing: [],
      deployment: []
    };

    await this.detectArchitecturePatterns(detectedPatterns);
    await this.detectAuthPatterns(detectedPatterns);
    await this.detectDatabasePatterns(detectedPatterns);
    await this.detectApiPatterns(detectedPatterns);
    await this.detectTestingPatterns(detectedPatterns);
    await this.detectDeploymentPatterns(detectedPatterns);
    
    return detectedPatterns;
  }

  async detectArchitecturePatterns(patterns) {
    const directories = fs.readdirSync(this.projectPath).filter(item => {
      const fullPath = path.join(this.projectPath, item);
      return fs.statSync(fullPath).isDirectory() && !this.shouldIgnore(fullPath);
    });
    
    if (directories.includes('controllers') && directories.includes('models') && directories.includes('views')) {
      patterns.architecture.push('MVC (Model-View-Controller)');
    }
    
    if (directories.includes('components') || directories.includes('containers')) {
      patterns.architecture.push('Component-based architecture');
    }
    
    if (directories.includes('services') || directories.includes('domain')) {
      patterns.architecture.push('Service-oriented architecture');
    }
    
    if (directories.includes('microservices') || fs.existsSync(path.join(this.projectPath, 'docker-compose.yml'))) {
      patterns.architecture.push('Microservices architecture');
    }
  }

  async detectAuthPatterns(patterns) {
    const authKeywords = ['jwt', 'auth', 'passport', 'oauth', 'session'];
    const packagePath = path.join(this.projectPath, 'package.json');
    
    try {
      if (fs.existsSync(packagePath)) {
        const content = fs.readFileSync(packagePath, 'utf8');
        const pkg = JSON.parse(content);
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        
        for (const dep of Object.keys(allDeps)) {
          if (authKeywords.some(keyword => dep.toLowerCase().includes(keyword))) {
            if (dep.includes('jwt')) patterns.authentication.push('JWT (JSON Web Tokens)');
            if (dep.includes('passport')) patterns.authentication.push('Passport.js authentication');
            if (dep.includes('oauth')) patterns.authentication.push('OAuth integration');
            if (dep.includes('session')) patterns.authentication.push('Session-based authentication');
          }
        }
      }
    } catch (error) {
      console.warn('Warning: Could not detect auth patterns');
    }
  }

  async detectDatabasePatterns(patterns) {
    const dbKeywords = {
      'mongodb': 'MongoDB',
      'mongoose': 'MongoDB with Mongoose ODM',
      'mysql': 'MySQL',
      'postgres': 'PostgreSQL',
      'prisma': 'Prisma ORM',
      'sequelize': 'Sequelize ORM',
      'typeorm': 'TypeORM',
      'redis': 'Redis'
    };
    
    const packagePath = path.join(this.projectPath, 'package.json');
    
    try {
      if (fs.existsSync(packagePath)) {
        const content = fs.readFileSync(packagePath, 'utf8');
        const pkg = JSON.parse(content);
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        
        for (const [keyword, description] of Object.entries(dbKeywords)) {
          if (allDeps[keyword] || Object.keys(allDeps).some(dep => dep.includes(keyword))) {
            patterns.database.push(description);
          }
        }
      }
    } catch (error) {
      console.warn('Warning: Could not detect database patterns');
    }
  }

  async detectApiPatterns(patterns) {
    const apiKeywords = {
      'express': 'Express.js REST API',
      'fastify': 'Fastify API framework',
      'koa': 'Koa.js API framework',
      'graphql': 'GraphQL API',
      'apollo': 'Apollo GraphQL',
      'swagger': 'Swagger/OpenAPI documentation',
      'axios': 'HTTP client with Axios',
      'fetch': 'Fetch API usage'
    };
    
    const packagePath = path.join(this.projectPath, 'package.json');
    
    try {
      if (fs.existsSync(packagePath)) {
        const content = fs.readFileSync(packagePath, 'utf8');
        const pkg = JSON.parse(content);
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        
        for (const [keyword, description] of Object.entries(apiKeywords)) {
          if (allDeps[keyword] || Object.keys(allDeps).some(dep => dep.includes(keyword))) {
            patterns.api.push(description);
          }
        }
      }
    } catch (error) {
      console.warn('Warning: Could not detect API patterns');
    }
  }

  async detectTestingPatterns(patterns) {
    const testKeywords = {
      'jest': 'Jest testing framework',
      'mocha': 'Mocha testing framework',
      'chai': 'Chai assertion library',
      'cypress': 'Cypress end-to-end testing',
      'playwright': 'Playwright browser testing',
      'supertest': 'API testing with Supertest',
      'testing-library': 'React Testing Library',
      'enzyme': 'Enzyme React testing'
    };
    
    const packagePath = path.join(this.projectPath, 'package.json');
    
    try {
      if (fs.existsSync(packagePath)) {
        const content = fs.readFileSync(packagePath, 'utf8');
        const pkg = JSON.parse(content);
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        
        for (const [keyword, description] of Object.entries(testKeywords)) {
          if (allDeps[keyword] || Object.keys(allDeps).some(dep => dep.includes(keyword))) {
            patterns.testing.push(description);
          }
        }
      }
    } catch (error) {
      console.warn('Warning: Could not detect testing patterns');
    }
  }

  async detectDeploymentPatterns(patterns) {
    if (fs.existsSync(path.join(this.projectPath, 'Dockerfile'))) {
      patterns.deployment.push('Docker containerization');
    }
    
    if (fs.existsSync(path.join(this.projectPath, 'docker-compose.yml'))) {
      patterns.deployment.push('Docker Compose orchestration');
    }
    
    if (fs.existsSync(path.join(this.projectPath, '.github'))) {
      patterns.deployment.push('GitHub Actions CI/CD');
    }
    
    if (fs.existsSync(path.join(this.projectPath, 'vercel.json'))) {
      patterns.deployment.push('Vercel deployment');
    }
    
    if (fs.existsSync(path.join(this.projectPath, 'netlify.toml'))) {
      patterns.deployment.push('Netlify deployment');
    }
    
    if (fs.existsSync(path.join(this.projectPath, 'serverless.yml'))) {
      patterns.deployment.push('Serverless framework');
    }
  }
}

module.exports = FileAnalyzer;