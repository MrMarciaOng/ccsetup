const TemplateCatalog = require('../../lib/templates/catalog');
const MetadataExtractor = require('../../lib/templates/metadata-extractor');
const fs = require('fs');
const path = require('path');

describe('Template Catalog System', () => {
  let catalog;
  
  beforeEach(async () => {
    catalog = TemplateCatalog.createInstance();
  });
  
  describe('Catalog Loading', () => {
    test('should load catalog with all 8 core agents', async () => {
      const data = await catalog.load();

      expect(data).toBeDefined();
      expect(data.agents).toBeDefined();
      expect(Array.isArray(data.agents)).toBe(true);
      expect(data.agents.length).toBeGreaterThanOrEqual(8);

      console.log(`✅ Found ${data.agents.length} agents in catalog`);
    });
    
    test('should have proper agent structure', async () => {
      const data = await catalog.load();
      const agent = data.agents[0];
      
      expect(agent).toHaveProperty('id');
      expect(agent).toHaveProperty('name');
      expect(agent).toHaveProperty('category');
      expect(agent).toHaveProperty('subcategory');
      expect(agent).toHaveProperty('description');
      expect(agent).toHaveProperty('tags');
      expect(agent).toHaveProperty('files');
      
      expect(agent.category).toBe('agents');
      expect(Array.isArray(agent.tags)).toBe(true);
      expect(Array.isArray(agent.files)).toBe(true);
      expect(agent.files.length).toBeGreaterThan(0);
    });
    
    test('should validate all agent metadata', async () => {
      const data = await catalog.load();
      
      for (const agent of data.agents) {
        const validation = await catalog.validateTemplate(agent);
        
        if (!validation.valid) {
          console.warn(`❌ Agent ${agent.name} validation failed:`, validation.errors);
        }
        
        expect(validation.valid).toBe(true);
      }
      
      console.log(`✅ All ${data.agents.length} agents passed validation`);
    });
    
    test('should have cached results', async () => {
      const data1 = await catalog.load();
      const data2 = await catalog.load();
      
      expect(catalog.isCacheValid()).toBe(true);
      expect(data1).toBe(data2);
    });
    
    test('should refresh catalog when requested', async () => {
      const data1 = await catalog.load();
      const data2 = await catalog.load(true);
      
      expect(data1).not.toBe(data2);
      expect(data1.agents.length).toBe(data2.agents.length);
    });
  });
  
  describe('Category Organization', () => {
    test('should organize agents into categories', async () => {
      const data = await catalog.load();
      const categories = await catalog.getCategories();
      
      expect(categories).toBeDefined();
      expect(Object.keys(categories).length).toBeGreaterThan(0);
      
      console.log('📂 Categories found:', Object.keys(categories));
    });
    
    test('should have consistent subcategories', async () => {
      const data = await catalog.load();
      const subcategories = new Set();
      
      data.agents.forEach(agent => {
        subcategories.add(agent.subcategory);
      });
      
      expect(subcategories.size).toBeGreaterThan(0);
      
      console.log('📊 Subcategories:', Array.from(subcategories));
    });
    
    test('should have proper category counts', async () => {
      const categoryCatalog = await catalog.getCatalogBySubcategory();
      
      let totalAgents = 0;
      Object.values(categoryCatalog).forEach(agents => {
        totalAgents += agents.length;
        expect(agents.length).toBeGreaterThan(0);
      });
      
      const data = await catalog.load();
      expect(totalAgents).toBe(data.agents.length);
    });
  });
  
  describe('Tag System', () => {
    test('should have comprehensive tag cloud', async () => {
      const tagCloud = await catalog.getTagCloud();
      
      expect(Array.isArray(tagCloud)).toBe(true);
      expect(tagCloud.length).toBeGreaterThan(0);
      
      tagCloud.forEach(tagInfo => {
        expect(tagInfo).toHaveProperty('tag');
        expect(tagInfo).toHaveProperty('count');
        expect(tagInfo.count).toBeGreaterThan(0);
      });
      
      console.log('🏷️  Top 10 tags:', tagCloud.slice(0, 10));
    });
    
    test('should have meaningful tags', async () => {
      const data = await catalog.load();
      
      const allTags = new Set();
      data.agents.forEach(agent => {
        agent.tags.forEach(tag => allTags.add(tag));
      });

      expect(allTags.size).toBeGreaterThan(0);
    });
  });
  
  describe('Search Functionality', () => {
    test('should find agents by category', async () => {
      const devAgents = await catalog.getTemplates('development');

      expect(devAgents.length).toBeGreaterThan(0);
      devAgents.forEach(agent => {
        expect(agent.subcategory).toBe('development');
      });
    });
    
    test('should find agents by tags', async () => {
      const apiAgents = await catalog.getTemplates(null, ['api']);
      
      expect(apiAgents.length).toBeGreaterThan(0);
      apiAgents.forEach(agent => {
        expect(agent.tags.some(tag => tag.includes('api'))).toBeTruthy();
      });
    });
    
    test('should find agents by search query', async () => {
      const searchResults = await catalog.getTemplates(null, [], 'planning');
      
      expect(searchResults.length).toBeGreaterThan(0);
      searchResults.forEach(agent => {
        const searchText = [agent.name, agent.description, ...agent.tags].join(' ').toLowerCase();
        expect(searchText.includes('planning')).toBeTruthy();
      });
    });
  });
  
  describe('Performance', () => {
    test('should load catalog quickly', async () => {
      const startTime = Date.now();
      await catalog.load();
      const endTime = Date.now();
      
      const loadTime = endTime - startTime;
      expect(loadTime).toBeLessThan(5000); // 5 seconds max
      
      console.log(`⚡ Catalog loaded in ${loadTime}ms`);
    });
    
    test('should handle repeated searches efficiently', async () => {
      await catalog.load(); // Warm up
      
      const startTime = Date.now();
      
      for (let i = 0; i < 100; i++) {
        await catalog.getTemplates('frontend');
        await catalog.getTemplates(null, ['api']);
        await catalog.getTemplates(null, [], 'test');
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      expect(totalTime).toBeLessThan(1000); // 1 second for 300 searches
      
      console.log(`⚡ 300 searches completed in ${totalTime}ms`);
    });
  });
});
