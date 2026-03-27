# PLAN-009: Template Selection System Implementation Plan

## Executive Summary

This plan implements a comprehensive template selection system similar to aitmpl.com for ccsetup, transforming it from a simple boilerplate generator into a powerful template marketplace. The system will provide categorized browsing, filtering, search, and selective installation of agents, commands, MCPs, and project templates.

Based on analysis of the existing codebase, ccsetup already has:
- 8 core agent templates with frontmatter metadata
- Robust interactive selection using inquirer 
- Strong file copying and conflict resolution
- Template discovery and validation functions
- Natural categorization patterns emerging from existing agents

## Requirements

### Functional Requirements
1. **Template Catalog System**: Structured metadata for all templates with categories, tags, descriptions, and dependencies
2. **Interactive Selection UI**: Enhanced CLI interface for browsing and selecting templates
3. **Filtering & Search**: Category-based filtering and text-based search capabilities  
4. **Selective Installation**: Install only chosen templates with dependency resolution
5. **Browse Mode**: Standalone browsing without installation (`ccsetup browse`)
6. **Template Preview**: Detailed descriptions and usage examples
7. **Backward Compatibility**: Maintain existing functionality while adding new features

### Non-Functional Requirements
1. **Performance**: Fast template discovery and installation
2. **Usability**: Intuitive interface matching existing UX patterns
3. **Extensibility**: Easy addition of new template categories
4. **Maintainability**: Clean separation of catalog and installation logic

## Architecture

### 1. Template Catalog Structure
```
lib/templates/
├── catalog.js              # Template catalog management
├── metadata/               # Template metadata storage
│   ├── agents.json         # Agent metadata
│   ├── commands.json       # Command metadata  
│   ├── mcps.json          # MCP metadata
│   └── templates.json     # Project template metadata
├── installer.js           # Template installation logic
├── validator.js           # Template validation
└── browser.js             # Browse mode functionality

template/
├── agents/                 # Existing agent templates
├── commands/              # New command templates
├── mcps/                  # New MCP templates
└── project-templates/     # New project templates
```

### 2. Template Metadata Format
```javascript
{
  "id": "agent-planner",
  "name": "Strategic Planner Agent", 
  "category": "agents",
  "description": "AI agent specialized in breaking down complex problems and creating implementation roadmaps",
  "tags": ["planning", "architecture", "roadmap", "strategy"],
  "version": "1.0.0",
  "dependencies": [],
  "files": ["planner.md"],
  "author": "ccsetup",
  "examples": [
    "Breaking down feature implementations",
    "Creating technical roadmaps", 
    "Architectural planning"
  ],
  "tools": ["Read", "Grep", "Glob", "TodoWrite"],
  "workflows": ["Feature Development", "Refactoring"]
}
```

### 3. Enhanced CLI Architecture
```javascript
// Enhanced argument structure
const flags = {
  force: false,
  dryRun: false,
  help: false,
  browse: false,        // New: Browse mode
  category: null,       // New: Filter by category
  tags: [],            // New: Filter by tags
  search: null,        // New: Search query
  info: null,          // New: Show template info
  add: null,           // New: Add specific template
  // ... existing flags
};
```

## Implementation Phases

### Phase 1: Foundation (Template Catalog System)
**Duration**: 2-3 days
**Dependencies**: None

#### Tasks:
1. **Create template metadata extractor** (`lib/templates/metadata-extractor.js`)
   - Parse existing agent frontmatter to generate metadata
   - Identify natural categories from existing templates
   - Extract tags from descriptions and tools

2. **Build template catalog** (`lib/templates/catalog.js`)
   - Template discovery and loading
   - Metadata caching and validation
   - Category and tag management

3. **Generate initial metadata files**
   - Extract metadata from 8 core agents
   - Create structured JSON metadata files
   - Validate metadata completeness

**Deliverables**:
- Template catalog system
- Metadata for all existing agents
- Template discovery functionality

### Phase 2: Enhanced Selection Interface
**Duration**: 3-4 days 
**Dependencies**: Phase 1

#### Tasks:
1. **Enhance template selection UI** (modify `create-project.js`)
   - Multi-category selection interface
   - Template preview and details display
   - Enhanced visual formatting with categories

2. **Implement filtering system** (`lib/templates/filter.js`)
   - Category-based filtering
   - Tag-based filtering
   - Combined filter logic

3. **Add search functionality** (`lib/templates/search.js`)
   - Text-based search across name, description, tags
   - Fuzzy search capabilities
   - Search result ranking

**Deliverables**:
- Enhanced interactive selection UI
- Filtering and search capabilities
- Improved template discovery UX

### Phase 3: Browse Mode & Commands
**Duration**: 2-3 days
**Dependencies**: Phase 2

#### Tasks:
1. **Create browse command** (`bin/browse.js`)
   - Standalone template browsing
   - Category and tag filtering
   - Template information display

2. **Implement template info command**
   - Detailed template descriptions
   - Usage examples and workflows
   - Dependency information

3. **Add template installation commands**
   - `ccsetup add <template>` for individual templates
   - Dependency resolution and installation
   - Conflict handling

**Deliverables**:
- `ccsetup browse` command
- `ccsetup info <template>` command  
- `ccsetup add <template>` command

### Phase 4: Template Categories & Expansion
**Duration**: 2-3 days
**Dependencies**: Phase 3

#### Tasks:
1. **Create command templates** (`template/commands/`)
   - Build analyzer command
   - Dependency checker command
   - Test runner enhancements

2. **Create MCP templates** (`template/mcps/`)
   - Database MCP configurations
   - API integration MCPs
   - File system MCPs

3. **Create project templates** (`template/project-templates/`)
   - Express.js API template
   - React SPA template
   - Full-stack templates

**Deliverables**:
- Command template category
- MCP template category
- Project template category

### Phase 5: Advanced Features & Polish
**Duration**: 2-3 days
**Dependencies**: Phase 4

#### Tasks:
1. **Template validation system** (`lib/templates/validator.js`)
   - Metadata validation
   - File existence checking
   - Dependency compatibility

2. **Installation optimization**
   - Parallel template installation
   - Progress indicators
   - Error handling and rollback

3. **Documentation and testing**
   - Comprehensive documentation
   - Unit tests for new functionality
   - Integration testing

**Deliverables**:
- Template validation system
- Optimized installation process
- Complete documentation and tests

## Technical Implementation Details

### 1. Template Metadata Extraction
```javascript
// lib/templates/metadata-extractor.js
class MetadataExtractor {
  static extractFromAgent(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const frontmatter = this.parseFrontmatter(content);
    
    return {
      id: `agent-${frontmatter.name}`,
      name: this.formatName(frontmatter.name),
      category: 'agents',
      description: frontmatter.description,
      tags: this.extractTags(frontmatter),
      tools: frontmatter.tools || [],
      files: [path.basename(filePath)],
      // ... additional metadata
    };
  }
  
  static generateCatalog() {
    const agentsDir = path.join(__dirname, '../../template/agents');
    const agents = fs.readdirSync(agentsDir)
      .filter(file => file.endsWith('.md') && file !== 'README.md')
      .map(file => this.extractFromAgent(path.join(agentsDir, file)));
    
    return { agents };
  }
}
```

### 2. Enhanced Selection Interface
```javascript
// Enhanced selectAgents function in create-project.js
async function selectTemplatesEnhanced(availableTemplates) {
  const categories = ['All', 'Agents', 'Commands', 'MCPs', 'Templates'];
  let selectedCategory = 'All';
  let searchQuery = '';
  
  while (true) {
    const filtered = filterTemplates(availableTemplates, {
      category: selectedCategory,
      search: searchQuery
    });
    
    const choices = buildTemplateChoices(filtered);
    
    const selection = await multiselect({
      message: `Select templates (${filtered.length} available)`,
      choices: choices,
      instructions: {
        up: 'Move up',
        down: 'Move down', 
        space: 'Toggle selection',
        enter: 'Confirm',
        '?': 'Show help'
      }
    });
    
    if (await confirm('Continue with installation?')) {
      return selection;
    }
  }
}
```

### 3. Browse Command Implementation
```javascript
// bin/browse.js
#!/usr/bin/env node

const TemplateCatalog = require('../lib/templates/catalog');
const TemplateBrowser = require('../lib/templates/browser');

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);
  
  const catalog = await TemplateCatalog.load();
  const browser = new TemplateBrowser(catalog);
  
  if (options.info) {
    await browser.showTemplateInfo(options.info);
  } else {
    await browser.browse(options);
  }
}

main().catch(console.error);
```

### 4. Template Installation System
```javascript
// lib/templates/installer.js
class TemplateInstaller {
  async installTemplate(template, targetDir, options = {}) {
    // Validate template and dependencies
    await this.validateTemplate(template);
    
    // Check for conflicts
    const conflicts = await this.checkConflicts(template, targetDir);
    if (conflicts.length > 0) {
      await this.handleConflicts(conflicts, options.conflictStrategy);
    }
    
    // Install template files
    await this.copyTemplateFiles(template, targetDir);
    
    // Install dependencies
    if (template.dependencies.length > 0) {
      await this.installDependencies(template.dependencies, targetDir);
    }
    
    // Run setup hooks
    await this.runSetupHooks(template, targetDir);
  }
  
  async installDependencies(dependencies, targetDir) {
    for (const dep of dependencies) {
      const depTemplate = await TemplateCatalog.getTemplate(dep);
      await this.installTemplate(depTemplate, targetDir);
    }
  }
}
```

## Risk Analysis

### High Risk
| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing functionality | High | Comprehensive testing, backward compatibility checks |
| Performance degradation with many templates | Medium | Lazy loading, caching, efficient filtering |

### Medium Risk  
| Risk | Impact | Mitigation |
|------|--------|------------|
| Complex dependency resolution | Medium | Simple dependency model initially, validate cycles |
| UI complexity overwhelming users | Medium | Progressive disclosure, good defaults |

### Low Risk
| Risk | Impact | Mitigation |
|------|--------|------------|
| Template metadata maintenance | Low | Automated extraction, validation tools |
| Cross-platform compatibility | Low | Use existing patterns, test on multiple platforms |

## Success Metrics

### Technical Metrics
- Template discovery time < 100ms for 100+ templates
- Installation time within 20% of current performance
- Zero breaking changes to existing functionality
- 90%+ test coverage for new features

### User Experience Metrics
- Intuitive template selection (< 3 steps to select templates)
- Effective filtering (find relevant templates in < 30 seconds)
- Clear template information (understand template purpose immediately)
- Smooth installation process (minimal user intervention required)

### Feature Adoption Metrics
- Browse mode usage
- Template category distribution
- Search query patterns
- User feedback and feature requests

## Backward Compatibility Strategy

1. **Preserve existing flags**: All current CLI flags continue to work
2. **Maintain existing workflows**: Current agent selection process remains unchanged
3. **Graceful degradation**: New features degrade gracefully if dependencies missing
4. **Progressive enhancement**: New features enhance rather than replace existing ones

## Future Enhancements

1. **Template Marketplace**
   - Community template submissions
   - Template ratings and reviews
   - Online template registry

2. **Advanced Features**
   - Template versioning and updates
   - Template customization during installation
   - Template conflict resolution strategies

3. **Integration Features**
   - IDE extensions for template management
   - CI/CD integration for template updates
   - Template analytics and usage tracking

This implementation plan provides a comprehensive roadmap for transforming ccsetup into a powerful template selection and management system while maintaining its existing strengths and ensuring backward compatibility.