const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class AIAgentSelector {
  constructor(scanResults, agentMetadata) {
    this.scanResults = scanResults;
    this.agentMetadata = agentMetadata;
    this.hasClaudeCode = this.checkClaudeCode();
  }

  checkClaudeCode() {
    try {
      execSync('which claude', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  async recommendAgents(maxRecommendations = 5) {
    if (!this.hasClaudeCode || !this.scanResults) {
      return null;
    }

    const projectContext = this.buildProjectContext();
    const agentList = this.getAgentSummary();

    const prompt = `Analyze this project and recommend the ${maxRecommendations} most relevant agents:

PROJECT DETAILS:
${projectContext}

AVAILABLE AGENTS:
${agentList}

Based on the project type, tech stack, and structure, recommend exactly ${maxRecommendations} agents that would be most valuable.
For each agent, provide:
1. Agent name (exact match from list)
2. Why it's recommended (one sentence)
3. Priority: HIGH, MEDIUM, or LOW

Format as JSON array: [{"name": "agent-name", "reason": "why", "priority": "HIGH"}]`;

    try {
      const response = execSync(
        `claude --print "${prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], maxBuffer: 1024 * 1024 }
      ).trim();

      return this.parseRecommendations(response);
    } catch (error) {
      return null;
    }
  }

  buildProjectContext() {
    const context = [];
    
    if (this.scanResults.projectType) {
      context.push(`Type: ${this.scanResults.projectType}`);
    }
    
    if (this.scanResults.languages && this.scanResults.languages.length > 0) {
      context.push(`Languages: ${this.scanResults.languages.join(', ')}`);
    }
    
    if (this.scanResults.frameworks && this.scanResults.frameworks.length > 0) {
      context.push(`Frameworks: ${this.scanResults.frameworks.join(', ')}`);
    }
    
    if (this.scanResults.dependencies) {
      const deps = Object.keys(this.scanResults.dependencies).slice(0, 10);
      if (deps.length > 0) {
        context.push(`Key dependencies: ${deps.join(', ')}`);
      }
    }
    
    if (this.scanResults.structure) {
      const dirs = Object.keys(this.scanResults.structure).filter(dir => !dir.startsWith('.'));
      context.push(`Structure: ${dirs.join(', ')}`);
    }

    return context.join('\n');
  }

  getAgentSummary() {
    return this.agentMetadata.agents
      .map(agent => `- ${agent.name}: ${agent.purpose}`)
      .join('\n');
  }

  parseRecommendations(response) {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return null;
      
      const recommendations = JSON.parse(jsonMatch[0]);
      
      // Validate and enhance recommendations
      return recommendations
        .filter(rec => rec.name && rec.reason)
        .map(rec => ({
          name: rec.name,
          reason: rec.reason,
          priority: rec.priority || 'MEDIUM',
          agent: this.agentMetadata.agents.find(a => a.name === rec.name)
        }))
        .filter(rec => rec.agent);
    } catch {
      return null;
    }
  }

  async getWorkflowBasedRecommendations() {
    if (!this.hasClaudeCode) return null;

    const workflows = [
      { name: 'api-development', agents: ['backend', 'api-documenter', 'database-optimizer'] },
      { name: 'frontend-development', agents: ['frontend', 'shadcn', 'performance-engineer'] },
      { name: 'full-stack', agents: ['backend', 'frontend', 'database-admin', 'deployment-engineer'] },
      { name: 'data-science', agents: ['data-scientist', 'ml-engineer', 'python-pro'] },
      { name: 'devops', agents: ['deployment-engineer', 'cloud-architect', 'terraform-specialist'] }
    ];

    const prompt = `Based on this project context, which development workflow best matches?

${this.buildProjectContext()}

Choose ONE from: ${workflows.map(w => w.name).join(', ')}
Output only the workflow name.`;

    try {
      const workflow = execSync(
        `claude --print "${prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
      ).trim().toLowerCase();

      const matched = workflows.find(w => w.name === workflow);
      if (matched) {
        return {
          workflow: matched.name,
          agents: matched.agents.map(name => 
            this.agentMetadata.agents.find(a => a.name === name)
          ).filter(Boolean)
        };
      }
    } catch {
      return null;
    }
  }
}

module.exports = AIAgentSelector;