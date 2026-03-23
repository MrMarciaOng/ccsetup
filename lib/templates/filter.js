class TemplateFilter {
  constructor(templates = []) {
    this.templates = templates;
  }
  
  setTemplates(templates) {
    this.templates = templates;
    return this;
  }
  
  byCategory(category) {
    if (!category || category === 'all') {
      return new TemplateFilter(this.templates);
    }
    
    const filtered = this.templates.filter(template => {
      if (category === 'agents') {
        return template.category === 'agents';
      }
      return template.subcategory === category;
    });
    
    return new TemplateFilter(filtered);
  }
  
  byTags(tags) {
    if (!tags || tags.length === 0) {
      return new TemplateFilter(this.templates);
    }
    
    const normalizedTags = tags.map(tag => tag.toLowerCase());
    const filtered = this.templates.filter(template => {
      if (!template.tags || template.tags.length === 0) {
        return false;
      }
      
      return normalizedTags.some(tag => 
        template.tags.some(templateTag => 
          templateTag.toLowerCase().includes(tag)
        )
      );
    });
    
    return new TemplateFilter(filtered);
  }
  
  byExactTags(tags) {
    if (!tags || tags.length === 0) {
      return new TemplateFilter(this.templates);
    }
    
    const normalizedTags = tags.map(tag => tag.toLowerCase());
    const filtered = this.templates.filter(template => {
      if (!template.tags || template.tags.length === 0) {
        return false;
      }
      
      return normalizedTags.every(tag => 
        template.tags.some(templateTag => 
          templateTag.toLowerCase() === tag
        )
      );
    });
    
    return new TemplateFilter(filtered);
  }
  
  byAnyTag(tags) {
    if (!tags || tags.length === 0) {
      return new TemplateFilter(this.templates);
    }
    
    const normalizedTags = tags.map(tag => tag.toLowerCase());
    const filtered = this.templates.filter(template => {
      if (!template.tags || template.tags.length === 0) {
        return false;
      }
      
      return normalizedTags.some(tag => 
        template.tags.some(templateTag => 
          templateTag.toLowerCase() === tag
        )
      );
    });
    
    return new TemplateFilter(filtered);
  }
  
  byAllTags(tags) {
    if (!tags || tags.length === 0) {
      return new TemplateFilter(this.templates);
    }
    
    const normalizedTags = tags.map(tag => tag.toLowerCase());
    const filtered = this.templates.filter(template => {
      if (!template.tags || template.tags.length === 0) {
        return false;
      }
      
      return normalizedTags.every(tag => 
        template.tags.some(templateTag => 
          templateTag.toLowerCase() === tag
        )
      );
    });
    
    return new TemplateFilter(filtered);
  }
  
  combine(filters = {}) {
    let result = this.templates;
    
    if (filters.category) {
      result = new TemplateFilter(result).byCategory(filters.category).getResults();
    }
    
    if (filters.tags && filters.tags.length > 0) {
      const tagMode = filters.tagMode || 'any';
      if (tagMode === 'all') {
        result = new TemplateFilter(result).byAllTags(filters.tags).getResults();
      } else if (tagMode === 'exact') {
        result = new TemplateFilter(result).byExactTags(filters.tags).getResults();
      } else {
        result = new TemplateFilter(result).byAnyTag(filters.tags).getResults();
      }
    }
    
    if (filters.subcategories && filters.subcategories.length > 0) {
      result = result.filter(template => 
        filters.subcategories.includes(template.subcategory)
      );
    }
    
    return new TemplateFilter(result);
  }
  
  getResults() {
    return [...this.templates];
  }
  
  getCount() {
    return this.templates.length;
  }
  
  getCategories() {
    const categories = new Set();
    this.templates.forEach(template => {
      if (template.category) {
        categories.add(template.category);
      }
    });
    return Array.from(categories).sort();
  }
  
  getSubcategories() {
    const subcategories = new Set();
    this.templates.forEach(template => {
      if (template.subcategory) {
        subcategories.add(template.subcategory);
      }
    });
    return Array.from(subcategories).sort();
  }
  
  getAllTags() {
    const tags = new Set();
    this.templates.forEach(template => {
      if (template.tags && Array.isArray(template.tags)) {
        template.tags.forEach(tag => tags.add(tag.toLowerCase()));
      }
    });
    return Array.from(tags).sort();
  }
  
  getTagsByFrequency() {
    const tagCounts = {};
    this.templates.forEach(template => {
      if (template.tags && Array.isArray(template.tags)) {
        template.tags.forEach(tag => {
          const normalizedTag = tag.toLowerCase();
          tagCounts[normalizedTag] = (tagCounts[normalizedTag] || 0) + 1;
        });
      }
    });
    
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));
  }
  
  sortBy(field, direction = 'asc') {
    const sorted = [...this.templates].sort((a, b) => {
      let valueA = a[field];
      let valueB = b[field];
      
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }
      
      if (valueA < valueB) {
        return direction === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    
    return new TemplateFilter(sorted);
  }
  
  limit(count) {
    return new TemplateFilter(this.templates.slice(0, count));
  }
  
  offset(count) {
    return new TemplateFilter(this.templates.slice(count));
  }
  
  paginate(page, pageSize) {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return new TemplateFilter(this.templates.slice(start, end));
  }
  
  isEmpty() {
    return this.templates.length === 0;
  }
  
  first() {
    return this.templates.length > 0 ? this.templates[0] : null;
  }
  
  last() {
    return this.templates.length > 0 ? this.templates[this.templates.length - 1] : null;
  }
  
  find(predicate) {
    return this.templates.find(predicate);
  }
  
  some(predicate) {
    return this.templates.some(predicate);
  }
  
  every(predicate) {
    return this.templates.every(predicate);
  }
  
  static createFromCatalog(catalog) {
    const templates = catalog?.agents || [];
    return new TemplateFilter(templates);
  }
}

module.exports = TemplateFilter;