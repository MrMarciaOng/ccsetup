class ScanConfigurator {
  constructor() {
    this.presets = {
      full: {
        name: 'Full Scan',
        description: 'Analyze entire repository with comprehensive detection',
        scanOptions: ['dependencies', 'patterns', 'docs', 'config', 'tests'],
        depth: 10,
        ignore: '',
        maxFiles: 5000
      },
      quick: {
        name: 'Quick Scan',
        description: 'Fast scan focusing on common files and patterns',
        scanOptions: ['dependencies', 'patterns'],
        depth: 3,
        ignore: 'test/**,tests/**,__tests__/**,*.test.*,*.spec.*',
        maxFiles: 1000
      },
      minimal: {
        name: 'Minimal Scan',
        description: 'Basic project detection only',
        scanOptions: ['dependencies'],
        depth: 2,
        ignore: 'test/**,tests/**,__tests__/**,node_modules/**,dist/**,build/**',
        maxFiles: 500
      }
    };
  }

  async configure() {
    try {
      const { select } = await import('@inquirer/select');
      
      console.log('🔍 Repository Scanner Configuration\n');
      
      const scanMode = await select({
        message: 'Choose scan mode:',
        choices: [
          {
            name: `${this.presets.full.name} - ${this.presets.full.description}`,
            value: 'full'
          },
          {
            name: `${this.presets.quick.name} - ${this.presets.quick.description}`,
            value: 'quick'
          },
          {
            name: `${this.presets.minimal.name} - ${this.presets.minimal.description}`,
            value: 'minimal'
          },
          {
            name: 'Custom Scan - Configure what to scan manually',
            value: 'custom'
          }
        ]
      });

      if (scanMode === 'custom') {
        return await this.customConfiguration();
      }

      const preset = this.presets[scanMode];
      console.log(`\n✅ Selected ${preset.name}`);
      console.log(`   Depth: ${preset.depth} levels`);
      console.log(`   Max files: ${preset.maxFiles}`);
      if (preset.ignore) {
        console.log(`   Ignoring: ${preset.ignore}`);
      }
      
      return {
        depth: preset.depth,
        ignore: preset.ignore,
        maxFiles: preset.maxFiles,
        scanOptions: preset.scanOptions
      };
    } catch (error) {
      console.log('⚠️  Interactive configuration not available. Using default settings.');
      return this.getDefaultConfig();
    }
  }

  async customConfiguration() {
    try {
      const { checkbox, input, number } = await import('@inquirer/prompts');
      
      const scanOptions = await checkbox({
        message: 'Select what to scan:',
        choices: [
          { name: 'Dependencies and package files', value: 'dependencies', checked: true },
          { name: 'Code patterns and architecture', value: 'patterns', checked: true },
          { name: 'Documentation files', value: 'docs', checked: true },
          { name: 'Configuration files', value: 'config', checked: true },
          { name: 'Test files and directories', value: 'tests', checked: false },
          { name: 'Build and deployment files', value: 'build', checked: false }
        ]
      });

      const depth = await number({
        message: 'Maximum directory depth to scan:',
        default: 5,
        min: 1,
        max: 20
      });

      const maxFiles = await number({
        message: 'Maximum number of files to analyze:',
        default: 1000,
        min: 100,
        max: 10000
      });

      const customIgnore = await input({
        message: 'Additional ignore patterns (comma-separated):',
        default: ''
      });

      console.log('\n✅ Custom configuration created');
      console.log(`   Scan options: ${scanOptions.join(', ')}`);
      console.log(`   Depth: ${depth} levels`);
      console.log(`   Max files: ${maxFiles}`);
      if (customIgnore) {
        console.log(`   Ignoring: ${customIgnore}`);
      }

      return {
        depth,
        ignore: customIgnore,
        maxFiles,
        scanOptions
      };
    } catch (error) {
      console.log('\n⚠️  Interactive prompts not available. Using default configuration.');
      return this.getDefaultConfig();
    }
  }

  getDefaultConfig() {
    return {
      depth: 5,
      ignore: '',
      maxFiles: 1000,
      scanOptions: ['dependencies', 'patterns', 'docs', 'config']
    };
  }

  getPresetConfig(mode) {
    return this.presets[mode] || this.getDefaultConfig();
  }

  validateConfig(config) {
    const errors = [];
    
    if (!config.depth || config.depth < 1 || config.depth > 20) {
      errors.push('Depth must be between 1 and 20');
    }
    
    if (!config.maxFiles || config.maxFiles < 100 || config.maxFiles > 10000) {
      errors.push('Max files must be between 100 and 10000');
    }
    
    if (!Array.isArray(config.scanOptions) || config.scanOptions.length === 0) {
      errors.push('At least one scan option must be selected');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  applyConfigToScanner(config, scannerOptions = {}) {
    const validation = this.validateConfig(config);
    if (!validation.isValid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    return {
      ...scannerOptions,
      maxDepth: config.depth,
      maxFiles: config.maxFiles,
      ignorePatterns: config.ignore ? config.ignore.split(',').map(p => p.trim()) : [],
      scanOptions: config.scanOptions
    };
  }

  showConfigSummary(config) {
    console.log('\n📋 Scan Configuration Summary:');
    console.log(`   Mode: ${config.name || 'Custom'}`);
    console.log(`   Max depth: ${config.depth} levels`);
    console.log(`   Max files: ${config.maxFiles}`);
    console.log(`   Scan options: ${config.scanOptions.join(', ')}`);
    if (config.ignore) {
      console.log(`   Ignore patterns: ${config.ignore}`);
    }
    console.log('');
  }
}

module.exports = ScanConfigurator;