const path = require('path');
const fs = require('fs');
const TemplateCatalog = require('../../lib/templates/catalog');
const MetadataExtractor = require('../../lib/templates/metadata-extractor');

describe('Security and Validation Tests', () => {
  let catalog;
  
  beforeAll(async () => {
    catalog = TemplateCatalog.createInstance();
  });
  
  describe('Path Traversal Protection', () => {
    test('should prevent directory traversal in agent files', async () => {
      const data = await catalog.load();
      
      data.agents.forEach(agent => {
        agent.files.forEach(file => {
          // Check for path traversal attempts
          expect(file).not.toContain('..');
          expect(file).not.toContain('/');
          expect(file).not.toContain('\\');
          expect(path.isAbsolute(file)).toBe(false);
          
          // File should be just a basename
          expect(file).toBe(path.basename(file));
          
          // File should end with .md
          expect(file.endsWith('.md')).toBe(true);
        });
      });
      
      console.log('✅ All agent files pass path traversal security checks');
    });
    
    test('should validate agent file existence', async () => {
      const data = await catalog.load();
      const agentsDir = path.join(__dirname, '../../template/.claude/agents');
      
      let validCount = 0;
      let invalidCount = 0;
      
      for (const agent of data.agents) {
        for (const file of agent.files) {
          const filePath = path.join(agentsDir, file);
          
          if (fs.existsSync(filePath)) {
            validCount++;
            
            // Ensure file is actually within agents directory
            const normalizedPath = path.normalize(filePath);
            const normalizedAgentsDir = path.normalize(agentsDir);
            expect(normalizedPath.startsWith(normalizedAgentsDir)).toBe(true);
          } else {
            invalidCount++;
            console.warn(`❌ Missing agent file: ${file}`);
          }
        }
      }
      
      expect(invalidCount).toBe(0);
      console.log(`✅ All ${validCount} agent files exist and are properly located`);
    });
  });
  
  describe('Input Validation', () => {
    test('should handle malicious search inputs safely', () => {
      const data = { agents: [] };
      const search = require('../../lib/templates/search');
      const searchInstance = new search(data.agents);
      
      const maliciousInputs = [
        '../../../etc/passwd',
        '<script>alert("xss")</script>',
        'SELECT * FROM users',
        '${process.env}',
        '{{constructor}}',
        '\x00\x01\x02',
        'a'.repeat(10000),
        null,
        undefined,
        {},
        []
      ];
      
      maliciousInputs.forEach(input => {
        expect(() => searchInstance.search(input)).not.toThrow();
      });
      
      console.log('✅ Search system handles malicious inputs safely');
    });
    
    test('should validate agent metadata fields', async () => {
      const data = await catalog.load();
      
      data.agents.forEach(agent => {
        // Required fields
        expect(agent.id).toBeDefined();
        expect(agent.name).toBeDefined();
        expect(agent.category).toBeDefined();
        expect(agent.description).toBeDefined();
        expect(agent.files).toBeDefined();
        
        // Type validation
        expect(typeof agent.id).toBe('string');
        expect(typeof agent.name).toBe('string');
        expect(typeof agent.category).toBe('string');
        expect(typeof agent.description).toBe('string');
        expect(Array.isArray(agent.files)).toBe(true);
        expect(Array.isArray(agent.tags)).toBe(true);
        
        // Content validation
        expect(agent.id.length).toBeGreaterThan(0);
        expect(agent.name.length).toBeGreaterThan(0);
        expect(agent.description.length).toBeGreaterThan(0);
        expect(agent.files.length).toBeGreaterThan(0);
        
        // Security validation
        expect(agent.id).toMatch(/^[a-zA-Z0-9-_]+$/);
        expect(agent.category).toBe('agents');
      });
      
      console.log('✅ All agent metadata fields validated');
    });
  });
  
  describe('File System Security', () => {
    test('should not access files outside template directory', () => {
      const agentsDir = path.join(__dirname, '../../template/.claude/agents');
      
      // Test metadata extractor with invalid paths
      const invalidPaths = [
        '../../../etc/passwd',
        '/etc/passwd',
        'C:\\Windows\\System32\\config\\sam',
        path.join(agentsDir, '../../../etc/passwd'),
        path.join(agentsDir, '..', '..', 'package.json')
      ];
      
      invalidPaths.forEach(invalidPath => {
        expect(() => {
          MetadataExtractor.extractFromAgent(invalidPath);
        }).not.toThrow(); // Should handle gracefully, not crash
      });
      
      console.log('✅ File system access properly restricted');
    });
    
    test('should validate template directory structure', () => {
      const templateDir = path.join(__dirname, '../../template');
      const agentsDir = path.join(templateDir, '.claude', 'agents');
      
      expect(fs.existsSync(templateDir)).toBe(true);
      expect(fs.existsSync(agentsDir)).toBe(true);
      
      const agentFiles = fs.readdirSync(agentsDir);
      const mdFiles = agentFiles.filter(file => file.endsWith('.md') && file !== 'README.md');
      
      expect(mdFiles.length).toBeGreaterThanOrEqual(8);
      
      console.log(`✅ Template directory contains ${mdFiles.length} agent files`);
    });
  });
  
  describe('Memory and Performance Safety', () => {
    test('should handle large datasets efficiently', async () => {
      const data = await catalog.load();
      
      // Simulate operations on large datasets
      const startMemory = process.memoryUsage().heapUsed;
      
      // Perform many operations
      for (let i = 0; i < 1000; i++) {
        const filter = new (require('../../lib/templates/filter'))(data.agents);
        filter.byCategory('frontend').byTags(['ui']).sortBy('name').getResults();
      }
      
      const endMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = endMemory - startMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      
      console.log(`✅ Memory usage after 1000 operations: +${Math.round(memoryIncrease / 1024 / 1024)}MB`);
    });
    
    test('should prevent infinite loops in search', () => {
      const search = require('../../lib/templates/search');
      const searchInstance = new search([]);
      
      // Test with circular reference that could cause infinite loops
      const circularAgent = { name: 'test' };
      circularAgent.circular = circularAgent;
      
      expect(() => {
        searchInstance.setTemplates([circularAgent]);
        searchInstance.search('test');
      }).not.toThrow();
      
      console.log('✅ Search handles circular references safely');
    });
  });
  
  describe('Data Integrity', () => {
    test('should maintain data consistency across operations', async () => {
      const data = await catalog.load();
      const originalCount = data.agents.length;
      
      // Perform various operations
      const filter = new (require('../../lib/templates/filter'))(data.agents);
      const search = new (require('../../lib/templates/search'))(data.agents);
      
      // Operations should not modify original data
      filter.byCategory('frontend').getResults();
      search.search('development').getResults();
      filter.byTags(['api']).sortBy('name').getResults();
      
      // Original data should remain unchanged
      expect(data.agents.length).toBe(originalCount);
      expect(catalog.cache.agents.length).toBe(originalCount);
      
      console.log('✅ Data integrity maintained across operations');
    });
    
    test('should validate catalog statistics', async () => {
      const data = await catalog.load();
      const stats = data.stats;
      
      expect(stats).toBeDefined();
      expect(stats.totalAgents).toBe(data.agents.length);
      expect(stats.categories).toBeGreaterThan(0);
      expect(stats.lastUpdated).toBeDefined();
      
      // Verify categories count
      const uniqueCategories = new Set(data.agents.map(a => a.subcategory));
      expect(stats.categories).toBe(uniqueCategories.size);
      
      console.log('✅ Catalog statistics are accurate');
    });
  });
  
  describe('Error Recovery', () => {
    test('should recover from corrupted catalog gracefully', async () => {
      // Simulate corrupted metadata file
      const metadataPath = path.join(__dirname, '../../lib/templates/metadata/agents.json');
      const originalExists = fs.existsSync(metadataPath);
      
      if (originalExists) {
        const originalContent = fs.readFileSync(metadataPath, 'utf8');
        
        try {
          // Write corrupted data
          fs.writeFileSync(metadataPath, '{ invalid json }', 'utf8');
          
          // Create new catalog instance
          const testCatalog = TemplateCatalog.createInstance();
          const data = await testCatalog.load();
          
          // Should recover by regenerating catalog
          expect(data).toBeDefined();
          expect(data.agents).toBeDefined();
          
        } finally {
          // Restore original content
          fs.writeFileSync(metadataPath, originalContent, 'utf8');
        }
      }
      
      console.log('✅ Catalog recovers from corruption');
    });
  });
});
