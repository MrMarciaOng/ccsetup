const TemplateCatalog = require('../../lib/templates/catalog');
const TemplateFilter = require('../../lib/templates/filter');
const TemplateSearch = require('../../lib/templates/search');

describe('Enhanced Selection Interface Integration', () => {
  let catalog;
  let agents;
  
  beforeAll(async () => {
    catalog = TemplateCatalog.createInstance();
    const data = await catalog.load();
    agents = data.agents;
  });
  
  describe('Integration Flow', () => {
    test('should integrate catalog, filter, and search systems', async () => {
      // Load catalog
      const data = await catalog.load();
      expect(data.agents.length).toBeGreaterThanOrEqual(8);

      const filter = TemplateFilter.createFromCatalog(data);
      expect(filter.getCount()).toBe(data.agents.length);

      const search = TemplateSearch.createFromCatalog(data);
      expect(search.getCount()).toBe(data.agents.length);
      
      console.log('✅ All systems integrate properly');
    });
    
    test('should simulate search & filter workflow', async () => {
      const data = await catalog.load();
      
      // 1. Start with all agents
      let currentResults = data.agents;
      expect(currentResults.length).toBeGreaterThanOrEqual(8);
      
      // 2. Search for "frontend"
      const search = new TemplateSearch(currentResults);
      currentResults = search.search('frontend').getResults();
      expect(currentResults.length).toBeGreaterThan(0);
      console.log(`🔍 Search for 'frontend': ${currentResults.length} results`);
      
      // 3. Filter by UI tag
      const filter = new TemplateFilter(currentResults);
      currentResults = filter.byTags(['ui']).getResults();
      console.log(`🏷️  Filter by 'ui' tag: ${currentResults.length} results`);
      
      // 4. Sort by name
      const sortedFilter = new TemplateFilter(currentResults);
      currentResults = sortedFilter.sortBy('name').getResults();
      
      // Verify workflow produces valid results
      expect(currentResults.length).toBeGreaterThan(0);
      currentResults.forEach(agent => {
        const searchText = [agent.name, agent.description, ...agent.tags].join(' ').toLowerCase();
        expect(searchText).toContain('frontend');
        expect(agent.tags.some(tag => tag.toLowerCase().includes('ui'))).toBeTruthy();
      });
      
      console.log('✅ Search & Filter workflow completed');
    });
    
    test('should simulate category browse workflow', async () => {
      const data = await catalog.load();
      
      // 1. Get categories
      const catalogByCategory = await catalog.getCatalogBySubcategory();
      const categories = Object.keys(catalogByCategory);
      expect(categories.length).toBeGreaterThan(0);
      
      const firstCategory = categories[0];
      const categoryAgents = catalogByCategory[firstCategory] || [];
      expect(categoryAgents.length).toBeGreaterThan(0);

      const selectedAgents = categoryAgents.slice(0, 3);
      expect(selectedAgents.length).toBeLessThanOrEqual(3);

      selectedAgents.forEach(agent => {
        expect(agent.subcategory).toBe(firstCategory);
      });

      console.log(`📂 Category browse: Found ${categoryAgents.length} ${firstCategory} agents, selected ${selectedAgents.length}`);
    });
    
    test('should simulate tag browse workflow', async () => {
      const data = await catalog.load();
      
      // 1. Get tag cloud
      const tagCloud = await catalog.getTagCloud();
      expect(tagCloud.length).toBeGreaterThan(0);
      
      // 2. Select popular tags
      const popularTags = tagCloud.slice(0, 5).map(t => t.tag);
      expect(popularTags.length).toBe(5);
      
      // 3. Filter by selected tags
      const filter = new TemplateFilter(data.agents);
      const taggedAgents = filter.byTags(popularTags).getResults();
      expect(taggedAgents.length).toBeGreaterThan(0);
      
      console.log(`🏷️  Tag browse: Selected ${popularTags.length} tags, found ${taggedAgents.length} agents`);
    });
  });
  
  describe('Selection Modes', () => {
    test('should support simple list selection mode', async () => {
      const data = await catalog.load();
      
      // Simulate simple checkbox selection
      const allAgents = data.agents;
      const selectCount = Math.min(allAgents.length, 5);
      const selectedIds = allAgents.slice(0, selectCount).map(a => a.id);

      const selectedAgents = allAgents.filter(a => selectedIds.includes(a.id));
      expect(selectedAgents.length).toBe(selectCount);
      
      console.log(`📋 Simple selection: Selected ${selectedAgents.length} agents`);
    });
    
    test('should validate agent files exist', async () => {
      const data = await catalog.load();
      
      // Check that all agent files exist
      let validCount = 0;
      for (const agent of data.agents) {
        const validation = await catalog.validateTemplate(agent);
        if (validation.valid) {
          validCount++;
        } else {
          console.warn(`❌ Invalid agent: ${agent.name}`, validation.errors);
        }
      }
      
      expect(validCount).toBe(data.agents.length);
      console.log(`✅ All ${validCount} agents have valid files`);
    });
  });
  
  describe('Performance Integration', () => {
    test('should handle complete enhanced selection workflow efficiently', async () => {
      const startTime = Date.now();
      
      // 1. Load catalog
      const data = await catalog.load();
      
      // 2. Multiple search operations
      const search = new TemplateSearch(data.agents);
      search.search('development').getResults();
      search.search('frontend').getResults();
      search.search('api').getResults();
      
      // 3. Multiple filter operations
      const filter = new TemplateFilter(data.agents);
      filter.byCategory('frontend').getResults();
      filter.byTags(['api', 'backend']).getResults();
      filter.combine({ category: 'qa', tags: ['testing'] }).getResults();
      
      // 4. Complex combined operations
      const complexResults = new TemplateFilter(data.agents)
        .byCategory('backend')
        .byTags(['api'])
        .sortBy('name')
        .limit(10)
        .getResults();
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      expect(totalTime).toBeLessThan(3000); // 3 seconds for full workflow
      expect(complexResults.length).toBeLessThanOrEqual(10);
      
      console.log(`⚡ Complete enhanced selection workflow: ${totalTime}ms`);
    });
  });
  
  describe('Error Handling', () => {
    test('should handle catalog loading failures gracefully', async () => {
      // Simulate catalog with empty agents
      const emptyData = { agents: [], categories: {}, stats: { totalAgents: 0 } };
      
      const filter = TemplateFilter.createFromCatalog(emptyData);
      expect(filter.getCount()).toBe(0);
      expect(filter.isEmpty()).toBe(true);
      
      const search = TemplateSearch.createFromCatalog(emptyData);
      expect(search.getCount()).toBe(0);
      expect(search.isEmpty()).toBe(true);
    });
    
    test('should handle invalid search queries', () => {
      const search = new TemplateSearch(agents);
      
      // Test various invalid inputs
      expect(() => search.search(null)).not.toThrow();
      expect(() => search.search(undefined)).not.toThrow();
      expect(() => search.search('')).not.toThrow();
      expect(() => search.search('   ')).not.toThrow();
      
      const results = search.search(null).getResults();
      expect(results.length).toBe(agents.length);
    });
    
    test('should handle invalid filter operations', () => {
      const filter = new TemplateFilter(agents);
      
      // Test invalid inputs
      expect(() => filter.byCategory(null)).not.toThrow();
      expect(() => filter.byTags(null)).not.toThrow();
      expect(() => filter.byTags([])).not.toThrow();
      
      const results = filter.byCategory(null).getResults();
      expect(results.length).toBe(agents.length);
    });
  });
  
  describe('Backward Compatibility', () => {
    test('should maintain compatibility with existing agent selection', async () => {
      const data = await catalog.load();
      
      // Simulate traditional agent selection by converting to file list
      const selectCount = Math.min(data.agents.length, 5);
      const selectedAgents = data.agents.slice(0, selectCount);
      const agentFiles = selectedAgents.map(agent => agent.files[0]).filter(Boolean);

      expect(agentFiles.length).toBe(selectCount);
      agentFiles.forEach(file => {
        expect(file.endsWith('.md')).toBe(true);
        expect(file).not.toContain('/');
        expect(file).not.toContain('\\');
      });
      
      console.log('✅ Backward compatibility maintained');
    });
  });
});
