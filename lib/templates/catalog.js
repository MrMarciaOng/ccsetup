const fs = require('fs');
const path = require('path');
const MetadataExtractor = require('./metadata-extractor');

class TemplateCatalog {
  constructor() {
    this.cache = null;
    this.cacheTimestamp = null;
    this.cacheValidityMs = 5 * 60 * 1000; // 5 minutes
  }
  
  async load(forceRefresh = false) {
    if (!forceRefresh && this.isCacheValid()) {
      return this.cache;
    }
    
    try {
      const metadataPath = path.join(__dirname, 'metadata/agents.json');
      
      if (fs.existsSync(metadataPath) && !forceRefresh) {
        const content = fs.readFileSync(metadataPath, 'utf8');
        this.cache = JSON.parse(content);
        this.cacheTimestamp = Date.now();
        return this.cache;
      }
      
      console.log('Generating fresh catalog from agent templates...');
      const catalog = MetadataExtractor.generateCatalogFromAgents();
      
      MetadataExtractor.saveCatalogToFile(catalog, metadataPath);
      
      this.cache = catalog;
      this.cacheTimestamp = Date.now();
      
      return this.cache;
    } catch (error) {
      console.error('Error loading template catalog:', error.message);
      
      return {
        agents: [],
        categories: {},
        stats: {
          totalAgents: 0,
          categories: 0,
          lastUpdated: new Date().toISOString(),
          error: error.message
        }
      };
    }
  }
  
  isCacheValid() {
    return this.cache && 
           this.cacheTimestamp && 
           (Date.now() - this.cacheTimestamp) < this.cacheValidityMs;
  }
  
  async getTemplates(category = null, tags = [], searchQuery = null) {
    const catalog = await this.load();
    let templates = catalog.agents || [];
    
    if (category && category !== 'all') {
      if (category === 'agents') {
        // Already filtered to agents
      } else {
        templates = templates.filter(t => t.subcategory === category);
      }
    }
    
    if (tags && tags.length > 0) {
      templates = templates.filter(t => 
        tags.some(tag => t.tags.includes(tag.toLowerCase()))
      );
    }
    
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      templates = templates.filter(t => {
        const searchableText = [
          t.name,
          t.description,
          ...t.tags,
          ...t.examples
        ].join(' ').toLowerCase();
        
        return searchableText.includes(query);
      });
    }
    
    return templates;
  }
  
  async getTemplate(id) {
    const catalog = await this.load();
    return catalog.agents.find(agent => agent.id === id);
  }
  
  async getCategories() {
    const catalog = await this.load();
    return catalog.categories || {};
  }
  
  async getStats() {
    const catalog = await this.load();
    return catalog.stats || {};
  }
  
  async searchTemplates(query, options = {}) {
    const {
      category = null,
      tags = [],
      limit = 50,
      sortBy = 'name'
    } = options;
    
    let templates = await this.getTemplates(category, tags, query);
    
    if (sortBy === 'name') {
      templates.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'category') {
      templates.sort((a, b) => {
        const categoryCompare = a.subcategory.localeCompare(b.subcategory);
        return categoryCompare !== 0 ? categoryCompare : a.name.localeCompare(b.name);
      });
    }
    
    return templates.slice(0, limit);
  }
  
  async validateTemplate(template) {
    const requiredFields = ['id', 'name', 'category', 'description'];
    const validation = {
      valid: true,
      errors: [],
      warnings: []
    };
    
    for (const field of requiredFields) {
      if (!template[field]) {
        validation.valid = false;
        validation.errors.push(`Missing required field: ${field}`);
      }
    }
    
    if (template.category !== 'agents') {
      validation.warnings.push(`Unexpected category: ${template.category}`);
    }
    
    if (!template.files || template.files.length === 0) {
      validation.valid = false;
      validation.errors.push('Template must specify at least one file');
    }
    
    if (template.files) {
      const templateDir = path.join(__dirname, '../../template/.claude/agents');
      for (const file of template.files) {
        const filePath = path.join(templateDir, file);
        if (!fs.existsSync(filePath)) {
          validation.valid = false;
          validation.errors.push(`Template file not found: ${file}`);
        }
      }
    }
    
    if (!template.tags || template.tags.length === 0) {
      validation.warnings.push('Template has no tags - may be hard to discover');
    }
    
    return validation;
  }
  
  async refreshCatalog() {
    console.log('Refreshing template catalog...');
    
    const catalog = MetadataExtractor.generateCatalogFromAgents();
    const metadataPath = path.join(__dirname, 'metadata/agents.json');
    
    const saved = MetadataExtractor.saveCatalogToFile(catalog, metadataPath);
    
    if (saved) {
      this.cache = catalog;
      this.cacheTimestamp = Date.now();
      console.log(`Catalog refreshed: ${catalog.stats.totalAgents} agents processed`);
      return catalog;
    } else {
      throw new Error('Failed to save refreshed catalog');
    }
  }
  
  async getCatalogBySubcategory() {
    const catalog = await this.load();
    const result = {};
    
    for (const agent of catalog.agents) {
      if (!result[agent.subcategory]) {
        result[agent.subcategory] = [];
      }
      result[agent.subcategory].push(agent);
    }
    
    Object.keys(result).forEach(category => {
      result[category].sort((a, b) => a.name.localeCompare(b.name));
    });
    
    return result;
  }
  
  async getTagCloud() {
    const catalog = await this.load();
    const tagCounts = {};
    
    for (const agent of catalog.agents) {
      for (const tag of agent.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
    
    const sortedTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));
    
    return sortedTags;
  }
  
  static createInstance() {
    return new TemplateCatalog();
  }
}

module.exports = TemplateCatalog;