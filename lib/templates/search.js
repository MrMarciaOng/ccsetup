class TemplateSearch {
  constructor(templates = []) {
    this.templates = templates;
  }
  
  setTemplates(templates) {
    this.templates = templates;
    return this;
  }
  
  search(query, options = {}) {
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return new TemplateSearch(this.templates);
    }
    
    const {
      fields = ['name', 'description', 'tags', 'examples'],
      caseSensitive = false,
      exactMatch = false,
      minScore = 0,
      fuzzy = false,
      fuzzyThreshold = 0.6
    } = options;
    
    const searchQuery = caseSensitive ? query.trim() : query.toLowerCase().trim();
    const searchResults = [];
    
    for (const template of this.templates) {
      const score = this.calculateScore(template, searchQuery, fields, {
        caseSensitive,
        exactMatch,
        fuzzy,
        fuzzyThreshold
      });
      
      if (score >= minScore) {
        searchResults.push({
          template,
          score,
          matches: this.getMatches(template, searchQuery, fields, caseSensitive)
        });
      }
    }
    
    const sortedResults = searchResults
      .sort((a, b) => b.score - a.score)
      .map(result => ({
        ...result.template,
        _searchScore: result.score,
        _searchMatches: result.matches
      }));
    
    return new TemplateSearch(sortedResults);
  }
  
  calculateScore(template, query, fields, options) {
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    for (const field of fields) {
      const fieldValue = this.getFieldValue(template, field);
      if (!fieldValue) continue;
      
      const fieldWeight = this.getFieldWeight(field);
      maxPossibleScore += fieldWeight;
      
      const fieldScore = this.scoreField(fieldValue, query, options);
      totalScore += fieldScore * fieldWeight;
    }
    
    return maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;
  }
  
  getFieldValue(template, field) {
    if (field === 'tags' && Array.isArray(template.tags)) {
      return template.tags.join(' ');
    }
    if (field === 'examples' && Array.isArray(template.examples)) {
      return template.examples.join(' ');
    }
    return template[field] || '';
  }
  
  getFieldWeight(field) {
    const weights = {
      name: 3,
      description: 2,
      tags: 1.5,
      examples: 1,
      subcategory: 1,
      category: 0.5
    };
    return weights[field] || 1;
  }
  
  scoreField(fieldValue, query, options) {
    if (!fieldValue || typeof fieldValue !== 'string') {
      return 0;
    }
    
    const text = options.caseSensitive ? fieldValue : fieldValue.toLowerCase();
    
    if (options.exactMatch) {
      return text === query ? 1 : 0;
    }
    
    if (options.fuzzy) {
      return this.fuzzyMatch(text, query, options.fuzzyThreshold);
    }
    
    if (text.includes(query)) {
      if (text === query) return 1;
      if (text.startsWith(query)) return 0.9;
      if (text.endsWith(query)) return 0.8;
      
      const queryLength = query.length;
      const textLength = text.length;
      return 0.5 + (queryLength / textLength) * 0.3;
    }
    
    const words = query.split(/\s+/);
    const matchedWords = words.filter(word => text.includes(word));
    
    if (matchedWords.length > 0) {
      return (matchedWords.length / words.length) * 0.4;
    }
    
    return 0;
  }
  
  fuzzyMatch(text, query, threshold) {
    const distance = this.levenshteinDistance(text, query);
    const maxLength = Math.max(text.length, query.length);
    const similarity = 1 - (distance / maxLength);
    
    return similarity >= threshold ? similarity : 0;
  }
  
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  getMatches(template, query, fields, caseSensitive) {
    const matches = [];
    const searchQuery = caseSensitive ? query : query.toLowerCase();
    
    for (const field of fields) {
      const fieldValue = this.getFieldValue(template, field);
      if (!fieldValue) continue;
      
      const text = caseSensitive ? fieldValue : fieldValue.toLowerCase();
      
      if (text.includes(searchQuery)) {
        const startIndex = text.indexOf(searchQuery);
        matches.push({
          field,
          value: fieldValue,
          matchStart: startIndex,
          matchEnd: startIndex + searchQuery.length,
          matchText: fieldValue.substring(startIndex, startIndex + searchQuery.length)
        });
      }
    }
    
    return matches;
  }
  
  searchByName(query, options = {}) {
    return this.search(query, { ...options, fields: ['name'] });
  }
  
  searchByDescription(query, options = {}) {
    return this.search(query, { ...options, fields: ['description'] });
  }
  
  searchByTags(query, options = {}) {
    return this.search(query, { ...options, fields: ['tags'] });
  }
  
  searchByMultipleTerms(terms, options = {}) {
    if (!Array.isArray(terms) || terms.length === 0) {
      return new TemplateSearch(this.templates);
    }
    
    const {
      matchMode = 'any',
      ...searchOptions
    } = options;
    
    if (matchMode === 'all') {
      let results = this.templates;
      for (const term of terms) {
        results = new TemplateSearch(results).search(term, searchOptions).getResults();
      }
      return new TemplateSearch(results);
    } else {
      const allResults = new Map();
      
      for (const term of terms) {
        const termResults = this.search(term, searchOptions).getResults();
        for (const result of termResults) {
          const existingResult = allResults.get(result.id);
          if (existingResult) {
            existingResult._searchScore = Math.max(
              existingResult._searchScore || 0,
              result._searchScore || 0
            );
          } else {
            allResults.set(result.id, result);
          }
        }
      }
      
      const combinedResults = Array.from(allResults.values())
        .sort((a, b) => (b._searchScore || 0) - (a._searchScore || 0));
      
      return new TemplateSearch(combinedResults);
    }
  }
  
  highlight(text, query, options = {}) {
    if (!text || !query) return text;
    
    const {
      caseSensitive = false,
      highlightTag = 'mark',
      className = 'search-highlight'
    } = options;
    
    const searchText = caseSensitive ? text : text.toLowerCase();
    const searchQuery = caseSensitive ? query : query.toLowerCase();
    
    if (!searchText.includes(searchQuery)) {
      return text;
    }
    
    const startTag = className 
      ? `<${highlightTag} class="${className}">`
      : `<${highlightTag}>`;
    const endTag = `</${highlightTag}>`;
    
    const regex = new RegExp(
      this.escapeRegExp(query),
      caseSensitive ? 'g' : 'gi'
    );
    
    return text.replace(regex, `${startTag}$&${endTag}`);
  }
  
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  getSuggestions(query, options = {}) {
    const {
      maxSuggestions = 5,
      minLength = 2,
      includePartialMatches = true
    } = options;
    
    if (!query || query.length < minLength) {
      return [];
    }
    
    const suggestions = new Set();
    const queryLower = query.toLowerCase();
    
    for (const template of this.templates) {
      if (template.name && template.name.toLowerCase().startsWith(queryLower)) {
        suggestions.add(template.name);
      }
      
      if (template.tags && Array.isArray(template.tags)) {
        for (const tag of template.tags) {
          if (tag.toLowerCase().startsWith(queryLower)) {
            suggestions.add(tag);
          }
        }
      }
      
      if (includePartialMatches) {
        if (template.description && template.description.toLowerCase().includes(queryLower)) {
          const words = template.description.split(/\s+/);
          for (const word of words) {
            if (word.toLowerCase().startsWith(queryLower) && word.length >= minLength) {
              suggestions.add(word);
            }
          }
        }
      }
      
      if (suggestions.size >= maxSuggestions) {
        break;
      }
    }
    
    return Array.from(suggestions).slice(0, maxSuggestions);
  }
  
  getResults() {
    return [...this.templates];
  }
  
  getCount() {
    return this.templates.length;
  }
  
  first() {
    return this.templates.length > 0 ? this.templates[0] : null;
  }
  
  isEmpty() {
    return this.templates.length === 0;
  }
  
  sortByRelevance() {
    const sorted = [...this.templates].sort((a, b) => {
      const scoreA = a._searchScore || 0;
      const scoreB = b._searchScore || 0;
      return scoreB - scoreA;
    });
    
    return new TemplateSearch(sorted);
  }
  
  static createFromCatalog(catalog) {
    const templates = catalog?.agents || [];
    return new TemplateSearch(templates);
  }
}

module.exports = TemplateSearch;