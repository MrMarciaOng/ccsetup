const TemplateFilter = require('../../lib/templates/filter');
const TemplateCatalog = require('../../lib/templates/catalog');

describe('Template Filter System', () => {
  let agents;
  let filter;
  
  beforeAll(async () => {
    const catalog = TemplateCatalog.createInstance();
    const data = await catalog.load();
    agents = data.agents;
  });
  
  beforeEach(() => {
    filter = new TemplateFilter(agents);
  });
  
  describe('Category Filtering', () => {
    test('should filter by category correctly', () => {
      const devFilter = filter.byCategory('development');
      const results = devFilter.getResults();

      expect(results.length).toBeGreaterThan(0);
      results.forEach(agent => {
        expect(agent.subcategory).toBe('development');
      });

      console.log(`✅ Found ${results.length} development agents`);
    });
    
    test('should return all agents for "all" category', () => {
      const allFilter = filter.byCategory('all');
      const results = allFilter.getResults();
      
      expect(results.length).toBe(agents.length);
    });
    
    test('should return empty for non-existent category', () => {
      const nonExistentFilter = filter.byCategory('non-existent');
      const results = nonExistentFilter.getResults();
      
      expect(results.length).toBe(0);
    });
    
    test('should get all subcategories', () => {
      const subcategories = filter.getSubcategories();
      
      expect(subcategories.length).toBeGreaterThan(0);
      
      console.log('📂 Subcategories:', subcategories);
    });
  });
  
  describe('Tag Filtering', () => {
    test('should filter by single tag (any mode)', () => {
      const apiFilter = filter.byTags(['api']);
      const results = apiFilter.getResults();
      
      expect(results.length).toBeGreaterThan(0);
      results.forEach(agent => {
        expect(agent.tags.some(tag => tag.toLowerCase().includes('api'))).toBeTruthy();
      });
      
      console.log(`✅ Found ${results.length} agents with 'api' tag`);
    });
    
    test('should filter by multiple tags (any mode)', () => {
      const multiTagFilter = filter.byTags(['frontend', 'api']);
      const results = multiTagFilter.getResults();
      
      expect(results.length).toBeGreaterThan(0);
      results.forEach(agent => {
        const hasAnyTag = agent.tags.some(tag => 
          tag.toLowerCase().includes('frontend') || tag.toLowerCase().includes('api')
        );
        expect(hasAnyTag).toBeTruthy();
      });
    });
    
    test('should filter by exact tags', () => {
      const exactFilter = filter.byExactTags(['development']);
      const results = exactFilter.getResults();
      
      expect(results.length).toBeGreaterThan(0);
      results.forEach(agent => {
        expect(agent.tags.some(tag => tag.toLowerCase() === 'development')).toBeTruthy();
      });
    });
    
    test('should filter by all tags (must have all)', () => {
      const allTagsFilter = filter.byAllTags(['development', 'implementation']);
      const results = allTagsFilter.getResults();
      
      results.forEach(agent => {
        expect(agent.tags.some(tag => tag.toLowerCase() === 'development')).toBeTruthy();
        expect(agent.tags.some(tag => tag.toLowerCase() === 'implementation')).toBeTruthy();
      });
    });
    
    test('should get tag frequency analysis', () => {
      const tagsByFreq = filter.getTagsByFrequency();
      
      expect(tagsByFreq.length).toBeGreaterThan(0);
      tagsByFreq.forEach(tagInfo => {
        expect(tagInfo).toHaveProperty('tag');
        expect(tagInfo).toHaveProperty('count');
        expect(tagInfo.count).toBeGreaterThan(0);
      });
      
      // Tags should be sorted by frequency (descending)
      for (let i = 1; i < tagsByFreq.length; i++) {
        expect(tagsByFreq[i].count).toBeLessThanOrEqual(tagsByFreq[i-1].count);
      }
      
      console.log('🏷️  Top 5 tags by frequency:', tagsByFreq.slice(0, 5));
    });
  });
  
  describe('Combined Filtering', () => {
    test('should combine category and tag filters', () => {
      const combinedFilter = filter.combine({
        category: 'frontend',
        tags: ['ui'],
        tagMode: 'any'
      });
      
      const results = combinedFilter.getResults();
      
      results.forEach(agent => {
        expect(agent.subcategory).toBe('frontend');
        expect(agent.tags.some(tag => tag.toLowerCase().includes('ui'))).toBeTruthy();
      });
    });
    
    test('should handle complex filter combinations', () => {
      const complexFilter = filter.combine({
        category: 'backend',
        tags: ['api', 'database'],
        tagMode: 'any',
        subcategories: ['backend', 'database']
      });
      
      const results = complexFilter.getResults();
      
      results.forEach(agent => {
        expect(['backend', 'database']).toContain(agent.subcategory);
      });
    });
  });
  
  describe('Sorting and Pagination', () => {
    test('should sort by name', () => {
      const sorted = filter.sortBy('name', 'asc');
      const results = sorted.getResults();
      
      for (let i = 1; i < results.length; i++) {
        expect(results[i].name.localeCompare(results[i-1].name)).toBeGreaterThanOrEqual(0);
      }
    });
    
    test('should sort by category', () => {
      const sorted = filter.sortBy('subcategory', 'asc');
      const results = sorted.getResults();
      
      for (let i = 1; i < results.length; i++) {
        expect(results[i].subcategory.localeCompare(results[i-1].subcategory)).toBeGreaterThanOrEqual(0);
      }
    });
    
    test('should limit results', () => {
      const limited = filter.limit(5);
      const results = limited.getResults();

      expect(results.length).toBeLessThanOrEqual(5);
    });
    
    test('should paginate results', () => {
      const pageSize = 10;
      const page1 = filter.paginate(1, pageSize);
      const page2 = filter.paginate(2, pageSize);
      
      const results1 = page1.getResults();
      const results2 = page2.getResults();
      
      expect(results1.length).toBeLessThanOrEqual(pageSize);
      expect(results2.length).toBeLessThanOrEqual(pageSize);
      
      // Ensure no overlap
      const ids1 = results1.map(a => a.id);
      const ids2 = results2.map(a => a.id);
      
      ids1.forEach(id => {
        expect(ids2).not.toContain(id);
      });
    });
  });
  
  describe('Utility Methods', () => {
    test('should detect empty results', () => {
      const emptyFilter = filter.byCategory('non-existent');
      expect(emptyFilter.isEmpty()).toBe(true);

      const nonEmptyFilter = filter.byCategory('development');
      expect(nonEmptyFilter.isEmpty()).toBe(false);
    });
    
    test('should get first and last items', () => {
      const sortedFilter = filter.sortBy('name');
      const first = sortedFilter.first();
      const last = sortedFilter.last();
      
      expect(first).toBeDefined();
      expect(last).toBeDefined();
      expect(first.id).not.toBe(last.id);
    });
    
    test('should find items with predicate', () => {
      const plannerAgent = filter.find(agent => agent.name.toLowerCase().includes('planner'));
      
      expect(plannerAgent).toBeDefined();
      expect(plannerAgent.name.toLowerCase()).toContain('planner');
    });
    
    test('should test conditions with some/every', () => {
      const hasDevAgents = filter.some(agent => agent.tags.includes('development'));
      expect(hasDevAgents).toBe(true);
      
      const allHaveNames = filter.every(agent => agent.name && agent.name.length > 0);
      expect(allHaveNames).toBe(true);
    });
  });
  
  describe('Performance', () => {
    test('should handle large filter operations efficiently', () => {
      const startTime = Date.now();
      
      // Perform many filter operations
      for (let i = 0; i < 100; i++) {
        filter.byCategory('frontend').byTags(['ui']).sortBy('name').getResults();
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      expect(totalTime).toBeLessThan(1000); // 1 second for 100 operations
      
      console.log(`⚡ 100 filter operations completed in ${totalTime}ms`);
    });
  });
});
