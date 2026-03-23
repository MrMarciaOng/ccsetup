# Template Catalog System

The template catalog system provides a powerful foundation for browsing, filtering, and selecting from ccsetup's collection of 50+ agent templates. This system implements Phase 1 of the template selection feature as outlined in PLAN-009.

## Overview

The template catalog system consists of:
- **Metadata Extraction**: Automatically extracts metadata from agent frontmatter
- **Template Catalog**: Provides filtering, search, and discovery capabilities  
- **Category Management**: Organizes templates into logical categories
- **Caching**: Efficient caching for fast template discovery

## Components

### MetadataExtractor (`metadata-extractor.js`)
- Parses agent frontmatter to extract metadata
- Automatically categorizes agents based on content analysis
- Generates tags from descriptions and tools
- Creates structured metadata JSON files

### TemplateCatalog (`catalog.js`)
- Template discovery and loading
- Filtering by category, tags, and search queries
- Template validation
- Caching for performance

### Generated Metadata (`metadata/agents.json`)
- Contains metadata for all 52 agents
- Organized by categories: Development, Backend, Planning, AI/ML, etc.
- Includes tags, tools, examples, and workflows for each agent

## Usage

### Basic Catalog Operations
```javascript
const { TemplateCatalog } = require('./lib/templates');

const catalog = new TemplateCatalog();

// Load all templates
const data = await catalog.load();

// Get templates by category
const planningAgents = await catalog.getTemplates('planning');
const frontendAgents = await catalog.getTemplates('frontend');

// Filter by tags
const testingAgents = await catalog.getTemplates(null, ['testing']);

// Search templates
const reactAgents = await catalog.searchTemplates('react');

// Get categories
const categories = await catalog.getCategories();
```

### Template Filtering
```javascript
// Multiple filters can be combined
const templates = await catalog.getTemplates(
  'development',    // category
  ['frontend', 'ui'], // tags
  'react'           // search query
);

// Advanced search with options
const results = await catalog.searchTemplates('API', {
  category: 'backend',
  tags: ['api'],
  limit: 10,
  sortBy: 'name'
});
```

### Template Validation
```javascript
// Validate a template
const validation = await catalog.validateTemplate(template);
if (!validation.valid) {
  console.log('Errors:', validation.errors);
  console.log('Warnings:', validation.warnings);
}
```

## Categories

The system automatically categorizes agents into:

- **Planning & Architecture** (8 agents) - Strategic planning and system design
- **Development & Implementation** (26 agents) - Code implementation and development
- **Frontend Development** (13 agents) - UI/UX and frontend frameworks
- **Backend Development** (2 agents) - API design and server-side development
- **Quality Assurance & Testing** (9 agents) - Testing and code review
- **Security & Auditing** (5 agents) - Security analysis and auditing
- **DevOps & Infrastructure** (2 agents) - Deployment and infrastructure
- **Database & Data** (3 agents) - Database management and data analysis
- **AI & Machine Learning** (5 agents) - AI/ML development and operations
- **Mobile Development** (1 agent) - Mobile app development
- **General Purpose** (4 agents) - Utility and general-purpose agents

## Popular Tags

Most common tags across all templates:
- `development` (35 agents)
- `implementation` (35 agents) 
- `ml`, `ai` (19 agents each)
- `performance` (19 agents)
- `frontend`, `ui` (13 agents each)
- `backend`, `api` (9 agents each)
- `testing` (9 agents)

## Scripts

### Generate Metadata
```bash
npm run metadata:generate
```
Scans all agent templates and generates fresh metadata.

### Test Catalog
```bash
npm run catalog:test
```
Runs comprehensive tests of catalog functionality.

### Demo System
```bash
node scripts/demo-template-selection.js
```
Demonstrates browsing, filtering, and search capabilities.

## Data Structure

Each template has the following metadata:
```json
{
  "id": "agent-planner",
  "name": "Strategic Planner Agent",
  "category": "agents",
  "subcategory": "planning",
  "description": "Strategic planning specialist...",
  "tags": ["planning", "architecture", "roadmap"],
  "tools": ["Read", "Grep", "Glob", "TodoWrite"],
  "version": "1.0.0",
  "dependencies": [],
  "files": ["planner.md"],
  "author": "ccsetup",
  "examples": ["Breaking down feature implementations"],
  "workflows": ["Feature Development", "Refactoring"]
}
```

## Performance

- **Caching**: 5-minute cache validity for fast repeated access
- **Lazy Loading**: Metadata loaded only when needed
- **Efficient Filtering**: Fast category and tag-based filtering
- **Search Optimization**: Text search across name, description, tags, and examples

## Future Enhancements

Phase 1 provides the foundation for:
- Interactive CLI template selection (Phase 2)
- Browse command implementation (Phase 3)
- Additional template categories (Phase 4)
- Template marketplace features (Future)

## Files

- `metadata-extractor.js` - Extracts metadata from agent templates
- `catalog.js` - Main catalog class with filtering and search
- `index.js` - Public API exports
- `metadata/agents.json` - Generated metadata for all agents
- `README.md` - This documentation

The template catalog system provides a robust foundation for the enhanced template selection system outlined in PLAN-009.