const fs = require('fs');
const path = require('path');

class MetadataExtractor {
  static parseFrontmatter(content) {
    const lines = content.split('\n');
    
    if (lines[0] !== '---') {
      return null;
    }
    
    const frontmatter = {};
    let inFrontmatter = true;
    let lineIndex = 1;
    
    while (lineIndex < lines.length && inFrontmatter) {
      const line = lines[lineIndex];
      if (line === '---') {
        inFrontmatter = false;
      } else if (line.includes(':')) {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();
        frontmatter[key.trim()] = value;
      }
      lineIndex++;
    }
    
    return frontmatter;
  }
  
  static extractTagsFromContent(frontmatter) {
    const tags = [];
    
    if (frontmatter.tools) {
      const tools = frontmatter.tools.split(',').map(t => t.trim().toLowerCase());
      tags.push(...tools);
    }
    
    if (frontmatter.description) {
      const desc = frontmatter.description.toLowerCase();
      
      if (desc.includes('planning') || desc.includes('roadmap') || desc.includes('architecture')) {
        tags.push('planning', 'architecture');
      }
      if (desc.includes('implement') || desc.includes('code') || desc.includes('develop')) {
        tags.push('development', 'implementation');
      }
      if (desc.includes('test') || desc.includes('qa') || desc.includes('quality')) {
        tags.push('testing', 'qa');
      }
      if (desc.includes('security') || desc.includes('audit')) {
        tags.push('security');
      }
      if (desc.includes('frontend') || desc.includes('ui') || desc.includes('react')) {
        tags.push('frontend', 'ui');
      }
      if (desc.includes('backend') || desc.includes('api') || desc.includes('server')) {
        tags.push('backend', 'api');
      }
      if (desc.includes('database') || desc.includes('sql')) {
        tags.push('database');
      }
      if (desc.includes('performance') || desc.includes('optimization')) {
        tags.push('performance');
      }
      if (desc.includes('mobile') || desc.includes('ios') || desc.includes('android')) {
        tags.push('mobile');
      }
      if (desc.includes('devops') || desc.includes('deployment') || desc.includes('ci/cd')) {
        tags.push('devops', 'deployment');
      }
      if (desc.includes('blockchain') || desc.includes('web3') || desc.includes('smart contract')) {
        tags.push('blockchain', 'web3');
      }
      if (desc.includes('ml') || desc.includes('machine learning') || desc.includes('ai')) {
        tags.push('ml', 'ai');
      }
    }
    
    return [...new Set(tags)];
  }
  
  static categorizeAgent(name, description, tags) {
    const nameLower = name.toLowerCase();
    const descLower = description.toLowerCase();
    
    if (nameLower.includes('planner') || nameLower.includes('architect') || 
        descLower.includes('planning') || descLower.includes('architecture')) {
      return 'planning';
    }
    
    if (nameLower.includes('coder') || nameLower.includes('developer') || 
        descLower.includes('implement') || descLower.includes('code')) {
      return 'development';
    }
    
    if (nameLower.includes('checker') || nameLower.includes('test') || nameLower.includes('qa') ||
        descLower.includes('testing') || descLower.includes('quality') || descLower.includes('review')) {
      return 'qa';
    }
    
    if (nameLower.includes('frontend') || nameLower.includes('ui') || 
        descLower.includes('frontend') || descLower.includes('react') || descLower.includes('vue')) {
      return 'frontend';
    }
    
    if (nameLower.includes('backend') || nameLower.includes('api') || 
        descLower.includes('backend') || descLower.includes('server') || descLower.includes('api')) {
      return 'backend';
    }
    
    if (nameLower.includes('security') || nameLower.includes('audit') ||
        descLower.includes('security') || descLower.includes('audit')) {
      return 'security';
    }
    
    if (nameLower.includes('devops') || nameLower.includes('deploy') ||
        descLower.includes('devops') || descLower.includes('deployment') || descLower.includes('infrastructure')) {
      return 'devops';
    }
    
    if (nameLower.includes('database') || nameLower.includes('sql') ||
        descLower.includes('database') || descLower.includes('sql')) {
      return 'database';
    }
    
    if (nameLower.includes('blockchain') || nameLower.includes('web3') ||
        descLower.includes('blockchain') || descLower.includes('web3') || descLower.includes('smart contract')) {
      return 'blockchain';
    }
    
    if (nameLower.includes('ml') || nameLower.includes('ai') || nameLower.includes('data') ||
        descLower.includes('machine learning') || descLower.includes('data science') || descLower.includes('ai')) {
      return 'ai-ml';
    }
    
    if (nameLower.includes('mobile') || descLower.includes('mobile') || 
        descLower.includes('ios') || descLower.includes('android')) {
      return 'mobile';
    }
    
    return 'general';
  }
  
  static formatName(name) {
    return name.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ') + ' Agent';
  }
  
  static extractFromAgent(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const frontmatter = this.parseFrontmatter(content);
      
      if (!frontmatter || !frontmatter.name) {
        return null;
      }
      
      const tags = this.extractTagsFromContent(frontmatter);
      const category = this.categorizeAgent(frontmatter.name, frontmatter.description || '', tags);
      
      return {
        id: `agent-${frontmatter.name}`,
        name: this.formatName(frontmatter.name),
        category: 'agents',
        subcategory: category,
        description: frontmatter.description || 'No description available',
        tags: tags,
        tools: frontmatter.tools ? frontmatter.tools.split(',').map(t => t.trim()) : [],
        version: '1.0.0',
        dependencies: [],
        files: [path.basename(filePath)],
        author: 'ccsetup',
        examples: this.extractExamplesFromDescription(frontmatter.description || ''),
        workflows: this.extractWorkflowsFromContent(content)
      };
    } catch (error) {
      console.warn(`Warning: Could not extract metadata from ${filePath}: ${error.message}`);
      return null;
    }
  }
  
  static extractExamplesFromDescription(description) {
    const examples = [];
    
    if (description.includes('planning')) {
      examples.push('Breaking down feature implementations', 'Creating technical roadmaps');
    }
    if (description.includes('implement') || description.includes('code')) {
      examples.push('Feature implementation', 'Bug fixes and optimizations');
    }
    if (description.includes('test') || description.includes('qa')) {
      examples.push('Test automation', 'Quality assurance reviews');
    }
    if (description.includes('frontend') || description.includes('ui')) {
      examples.push('UI component development', 'Responsive design implementation');
    }
    if (description.includes('backend') || description.includes('api')) {
      examples.push('API development', 'Server-side optimization');
    }
    
    return examples.length > 0 ? examples : ['General development tasks'];
  }
  
  static extractWorkflowsFromContent(content) {
    const workflows = [];
    
    if (content.includes('feature') || content.includes('implement')) {
      workflows.push('Feature Development');
    }
    if (content.includes('bug') || content.includes('fix')) {
      workflows.push('Bug Fix');
    }
    if (content.includes('refactor') || content.includes('optimization')) {
      workflows.push('Refactoring');
    }
    if (content.includes('test') || content.includes('qa')) {
      workflows.push('QA');
    }
    if (content.includes('api') || content.includes('backend')) {
      workflows.push('API Development');
    }
    if (content.includes('ui') || content.includes('frontend') || content.includes('component')) {
      workflows.push('UI Component');
    }
    if (content.includes('blockchain') || content.includes('web3') || content.includes('smart contract')) {
      workflows.push('Blockchain Development');
    }
    
    return workflows.length > 0 ? workflows : ['General'];
  }
  
  static generateCatalogFromAgents(agentsDir = null) {
    if (!agentsDir) {
      agentsDir = path.join(__dirname, '../../template/agents');
    }
    
    const agents = [];
    
    try {
      const files = fs.readdirSync(agentsDir);
      
      for (const file of files) {
        if (file.endsWith('.md') && file !== 'README.md') {
          const filePath = path.join(agentsDir, file);
          const metadata = this.extractFromAgent(filePath);
          
          if (metadata) {
            agents.push(metadata);
          }
        }
      }
    } catch (error) {
      console.error('Error generating catalog from agents:', error.message);
      return { agents: [] };
    }
    
    return {
      agents: agents.sort((a, b) => a.name.localeCompare(b.name)),
      categories: this.generateCategories(agents),
      stats: {
        totalAgents: agents.length,
        categories: [...new Set(agents.map(a => a.subcategory))].length,
        lastUpdated: new Date().toISOString()
      }
    };
  }
  
  static generateCategories(agents) {
    const categories = {};
    
    for (const agent of agents) {
      if (!categories[agent.subcategory]) {
        categories[agent.subcategory] = {
          name: agent.subcategory,
          displayName: this.formatCategoryName(agent.subcategory),
          count: 0,
          agents: []
        };
      }
      
      categories[agent.subcategory].count++;
      categories[agent.subcategory].agents.push(agent.id);
    }
    
    return categories;
  }
  
  static formatCategoryName(category) {
    const categoryNames = {
      'planning': 'Planning & Architecture',
      'development': 'Development & Implementation', 
      'qa': 'Quality Assurance & Testing',
      'frontend': 'Frontend Development',
      'backend': 'Backend Development',
      'security': 'Security & Auditing',
      'devops': 'DevOps & Infrastructure',
      'database': 'Database & Data',
      'blockchain': 'Blockchain & Web3',
      'ai-ml': 'AI & Machine Learning',
      'mobile': 'Mobile Development',
      'general': 'General Purpose'
    };
    
    return categoryNames[category] || category.charAt(0).toUpperCase() + category.slice(1);
  }
  
  static saveCatalogToFile(catalog, outputPath = null) {
    if (!outputPath) {
      outputPath = path.join(__dirname, 'metadata/agents.json');
    }
    
    try {
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(outputPath, JSON.stringify(catalog, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error('Error saving catalog to file:', error.message);
      return false;
    }
  }
}

module.exports = MetadataExtractor;