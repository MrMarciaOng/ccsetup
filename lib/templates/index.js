const TemplateCatalog = require('./catalog');
const MetadataExtractor = require('./metadata-extractor');
const TemplateFilter = require('./filter');
const TemplateSearch = require('./search');

module.exports = {
  TemplateCatalog,
  MetadataExtractor,
  TemplateFilter,
  TemplateSearch,
  
  async createCatalog() {
    return TemplateCatalog.createInstance();
  },
  
  async refreshCatalog() {
    const catalog = TemplateCatalog.createInstance();
    return await catalog.refreshCatalog();
  },
  
  async getCatalogStats() {
    const catalog = TemplateCatalog.createInstance();
    return await catalog.getStats();
  },
  
  createFilter(templates) {
    return new TemplateFilter(templates);
  },
  
  createSearch(templates) {
    return new TemplateSearch(templates);
  },
  
  async searchTemplates(query, options = {}) {
    const catalog = TemplateCatalog.createInstance();
    const templates = await catalog.load();
    return new TemplateSearch(templates.agents || []).search(query, options);
  },
  
  async filterTemplates(filters = {}) {
    const catalog = TemplateCatalog.createInstance();
    const templates = await catalog.load();
    return new TemplateFilter(templates.agents || []).combine(filters);
  }
};