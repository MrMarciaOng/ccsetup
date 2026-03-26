const TemplateSearch = require('../../lib/templates/search');
const TemplateCatalog = require('../../lib/templates/catalog');

describe('Template Search System', () => {
  let agents;
  let search;
  
  beforeAll(async () => {
    const catalog = TemplateCatalog.createInstance();
    const data = await catalog.load();
    agents = data.agents;
  });
  
  beforeEach(() => {
    search = new TemplateSearch(agents);
  });
  
  describe('Basic Search', () => {
    test('should find agents by name', () => {
      const results = search.searchByName('planner', { minScore: 0.01 }).getResults();

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name.toLowerCase()).toContain('planner');

      console.log(`✅ Found ${results.length} agents with 'planner' in name`);
    });

    test('should find agents by description', () => {
      const results = search.searchByDescription('frontend', { minScore: 0.01 }).getResults();

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].description.toLowerCase()).toContain('frontend');
    });

    test('should find agents by tags', () => {
      const results = search.searchByTags('api', { minScore: 0.01 }).getResults();

      expect(results.length).toBeGreaterThan(0);
      const tagsText = results[0].tags.join(' ').toLowerCase();
      expect(tagsText).toContain('api');
    });

    test('should return empty results for non-existent terms', () => {
      const results = search.search('nonexistentterm123', { minScore: 0.01 }).getResults();
      expect(results.length).toBe(0);
    });

    test('should handle empty search queries', () => {
      const results = search.search('').getResults();
      expect(results.length).toBe(agents.length);
    });
  });
  
  describe('Advanced Search', () => {
    test('should perform multi-field search', () => {
      const results = search.search('development', {
        fields: ['name', 'description', 'tags']
      }).getResults();
      
      expect(results.length).toBeGreaterThan(0);
      results.forEach(agent => {
        const searchText = [agent.name, agent.description, ...agent.tags].join(' ').toLowerCase();
        expect(searchText).toContain('development');
      });
    });
    
    test('should rank results by relevance', () => {
      const results = search.search('frontend', { minScore: 0.01 }).getResults();

      expect(results.length).toBeGreaterThan(0);

      results.forEach(agent => {
        expect(agent._searchScore).toBeDefined();
        expect(agent._searchScore).toBeGreaterThan(0);
      });

      for (let i = 1; i < results.length; i++) {
        expect(results[i]._searchScore).toBeLessThanOrEqual(results[i-1]._searchScore);
      }

      console.log('🎯 Search scores:', results.slice(0, 3).map(a => a.name + ': ' + a._searchScore.toFixed(3)));
    });
    
    test('should handle case insensitive search', () => {
      const upperResults = search.search('FRONTEND').getResults();
      const lowerResults = search.search('frontend').getResults();
      
      expect(upperResults.length).toBe(lowerResults.length);
      expect(upperResults.map(a => a.id)).toEqual(lowerResults.map(a => a.id));
    });
    
    test('should support exact match search', () => {
      const exactResults = search.search('Frontend Agent', {
        exactMatch: true
      }).getResults();
      
      const partialResults = search.search('Frontend Agent', {
        exactMatch: false
      }).getResults();
      
      expect(exactResults.length).toBeLessThanOrEqual(partialResults.length);
    });
    
    test('should support fuzzy search', () => {
      const fuzzyResults = search.search('fronted', {
        fuzzy: true,
        fuzzyThreshold: 0.7
      }).getResults();
      
      expect(fuzzyResults.length).toBeGreaterThan(0);
      
      console.log(`🔍 Fuzzy search for 'fronted' found ${fuzzyResults.length} results`);
    });
    
    test('should support minimum score threshold', () => {
      const allResults = search.search('development').getResults();
      const highScoreResults = search.search('development', {
        minScore: 0.5
      }).getResults();
      
      expect(highScoreResults.length).toBeLessThanOrEqual(allResults.length);
      highScoreResults.forEach(agent => {
        expect(agent._searchScore).toBeGreaterThanOrEqual(0.5);
      });
    });
  });
  
  describe('Multi-term Search', () => {
    test('should search by multiple terms (any mode)', () => {
      const results = search.searchByMultipleTerms(['frontend', 'backend'], {
        matchMode: 'any',
        minScore: 0.01
      }).getResults();

      expect(results.length).toBeGreaterThan(0);

      results.forEach(agent => {
        const searchText = [agent.name, agent.description, ...agent.tags].join(' ').toLowerCase();
        const hasAnyTerm = searchText.includes('frontend') || searchText.includes('backend');
        expect(hasAnyTerm).toBeTruthy();
      });
    });

    test('should search by multiple terms (all mode)', () => {
      const results = search.searchByMultipleTerms(['development', 'implementation'], {
        matchMode: 'all',
        minScore: 0.01
      }).getResults();

      results.forEach(agent => {
        const searchText = [agent.name, agent.description, ...agent.tags].join(' ').toLowerCase();
        expect(searchText.includes('development')).toBeTruthy();
        expect(searchText.includes('implementation')).toBeTruthy();
      });
    });
  });
  
  describe('Search Performance', () => {
    test('should search efficiently', () => {
      const startTime = Date.now();
      
      // Perform many searches
      for (let i = 0; i < 100; i++) {
        search.search('development').getResults();
        search.search('frontend').getResults();
        search.search('api').getResults();
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      expect(totalTime).toBeLessThan(2000); // 2 seconds for 300 searches
      
      console.log(`⚡ 300 searches completed in ${totalTime}ms`);
    });
    
    test('should handle fuzzy search efficiently', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 50; i++) {
        search.search('developmnt', { fuzzy: true }).getResults();
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      expect(totalTime).toBeLessThan(3000); // 3 seconds for 50 fuzzy searches
      
      console.log(`⚡ 50 fuzzy searches completed in ${totalTime}ms`);
    });
  });
  
  describe('Edge Cases', () => {
    test('should handle special characters in search', () => {
      const results = search.search('C++').getResults();
      
      // Should not throw errors
      expect(Array.isArray(results)).toBe(true);
    });
    
    test('should handle very long search queries', () => {
      const longQuery = 'a'.repeat(1000);
      const results = search.search(longQuery, { minScore: 0.01 }).getResults();

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
    
    test('should handle null and undefined inputs gracefully', () => {
      expect(() => search.search(null)).not.toThrow();
      expect(() => search.search(undefined)).not.toThrow();
      
      const results = search.search(null).getResults();
      expect(results.length).toBe(agents.length);
    });
  });
});
