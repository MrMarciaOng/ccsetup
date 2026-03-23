#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Simple workflow selector that reads from agent-orchestration.md
class WorkflowSelector {
  constructor() {
    this.workflows = this.loadWorkflows();
    this.availableAgents = this.getAvailableAgents();
  }

  loadWorkflows() {
    const orchestrationPath = path.join(process.cwd(), 'docs', 'agent-orchestration.md');
    
    if (!fs.existsSync(orchestrationPath)) {
      return this.getDefaultWorkflows();
    }

    try {
      // First try to use Claude to extract workflows intelligently
      const workflows = this.loadWorkflowsWithClaude(orchestrationPath);
      if (workflows && Object.keys(workflows).length > 0) {
        return workflows;
      }
    } catch (error) {
      // Claude extraction failed, continue with regex
    }

    // Fallback to regex-based extraction
    return this.loadWorkflowsWithRegex(orchestrationPath);
  }

  loadWorkflowsWithClaude(orchestrationPath) {
    const { execSync } = require('child_process');
    
    try {
      const content = fs.readFileSync(orchestrationPath, 'utf8');
      
      const extractPrompt = `
Extract all workflows from this agent orchestration document.

For each workflow, identify:
1. The workflow name
2. The sequence of agents used
3. The purpose/description

Return ONLY a JSON object with this structure:
{
  "workflow_key": {
    "name": "Workflow Name",
    "agents": ["agent1", "agent2", "agent3"],
    "purpose": "Brief description"
  }
}

Document content:
${content}

Extract all workflows and return valid JSON only.
`;

      const claudeResult = execSync(
        `claude --print "${extractPrompt.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], maxBuffer: 1024 * 1024 * 10 }
      );

      // Parse the JSON result
      const parsed = JSON.parse(claudeResult);
      
      // Validate and normalize the workflows
      const workflows = {};
      for (const [key, workflow] of Object.entries(parsed)) {
        if (workflow.name && Array.isArray(workflow.agents) && workflow.agents.length > 0) {
          // Normalize agent names (remove "agent" suffix, lowercase)
          const normalizedAgents = workflow.agents.map(agent => 
            agent.toLowerCase().replace(/\s*agent\s*$/, '').trim()
          );
          
          workflows[key] = {
            name: workflow.name,
            agents: normalizedAgents,
            purpose: workflow.purpose || ''
          };
        }
      }
      
      return workflows;
    } catch (error) {
      // Claude extraction failed
      return null;
    }
  }

  loadWorkflowsWithRegex(orchestrationPath) {
    try {
      const content = fs.readFileSync(orchestrationPath, 'utf8');
      const workflows = {};
      
      // Enhanced regex patterns for better extraction
      const workflowSections = this.extractWorkflowSections(content);
      
      for (const section of workflowSections) {
        const workflow = this.parseWorkflowSection(section);
        if (workflow) {
          const key = workflow.name.toLowerCase().replace(/\s+/g, '_');
          workflows[key] = workflow;
        }
      }
      
      // If no workflows found, return defaults
      return Object.keys(workflows).length > 0 ? workflows : this.getDefaultWorkflows();
    } catch (error) {
      return this.getDefaultWorkflows();
    }
  }

  extractWorkflowSections(content) {
    const sections = [];
    
    // Split by workflow headers
    const workflowRegex = /### \d+\.\s+(.+?)\s+Workflow([\s\S]*?)(?=### \d+\.|## |$)/g;
    let match;
    
    while ((match = workflowRegex.exec(content)) !== null) {
      sections.push({
        name: match[1].trim(),
        content: match[2].trim()
      });
    }
    
    return sections;
  }

  parseWorkflowSection(section) {
    const workflow = {
      name: section.name,
      agents: []
    };
    
    // Look for the Flow section
    const flowMatch = section.content.match(/\*\*Flow\*\*:?\s*([\s\S]*?)(?=\*\*|###|$)/);
    if (!flowMatch) return null;
    
    const flowContent = flowMatch[1];
    
    // Extract agents from various formats
    const agents = this.extractAgentsFromFlow(flowContent);
    
    if (agents.length > 0) {
      workflow.agents = agents;
      return workflow;
    }
    
    return null;
  }

  extractAgentsFromFlow(flowContent) {
    const agents = [];
    const lines = flowContent.split('\n');
    
    for (const line of lines) {
      // Pattern 1: "1. **Agent Name** → Description"
      let match = line.match(/^\d+\.\s*\*\*([^*→]+?)(?:\s+Agent)?\*\*/);
      
      // Pattern 2: "- Agent Name: Description"
      if (!match) {
        match = line.match(/^[-•]\s*\*\*([^*:]+?)(?:\s+Agent)?\*\*/);
      }
      
      // Pattern 3: "Agent Name →"
      if (!match) {
        match = line.match(/^\s*([A-Za-z\s]+?)\s*(?:Agent\s*)?→/);
      }
      
      if (match) {
        const agent = match[1].toLowerCase()
          .replace(/\s*agent\s*$/, '')
          .trim();
        
        if (agent && !agents.includes(agent) && agent.length > 0) {
          agents.push(agent);
        }
      }
    }
    
    return agents;
  }

  getDefaultWorkflows() {
    return {
      feature_development: {
        name: 'Feature Development',
        agents: ['researcher', 'planner', 'coder', 'checker']
      },
      bug_fix: {
        name: 'Bug Fix',
        agents: ['researcher', 'coder', 'checker']
      },
      refactoring: {
        name: 'Refactoring',
        agents: ['researcher', 'planner', 'coder', 'checker']
      },
      api_development: {
        name: 'API Development',
        agents: ['planner', 'backend', 'frontend', 'checker']
      },
      ui_component: {
        name: 'UI Component',
        agents: ['frontend', 'shadcn', 'checker']
      },
      blockchain: {
        name: 'Blockchain Development',
        agents: ['planner', 'blockchain', 'checker']
      },
      qa: {
        name: 'QA',
        agents: ['researcher', 'checker', 'coder', 'checker']
      }
    };
  }

  getAvailableAgents() {
    const agentsDir = path.join(process.cwd(), '.claude', 'agents');
    
    if (!fs.existsSync(agentsDir)) {
      return [];
    }
    
    try {
      return fs.readdirSync(agentsDir)
        .filter(file => file.endsWith('.md'))
        .map(file => file.replace('.md', '').toLowerCase());
    } catch (error) {
      return [];
    }
  }

  async selectWorkflow(prompt) {
    const { execSync } = require('child_process');
    
    try {
      // First, let's use Claude to analyze the prompt and understand the task type
      const analyzePrompt = `
Analyze this user prompt and determine the most appropriate workflow type.
User prompt: "${prompt}"

Available workflows:
${Object.entries(this.workflows).map(([key, workflow]) => 
  `- ${workflow.name}: uses agents [${workflow.agents.join(', ')}]`
).join('\n')}

Consider:
1. What type of task is this? (feature, bug fix, refactoring, API work, UI work, testing, etc.)
2. What agents would be most helpful?
3. Match to the most appropriate workflow

Respond with ONLY the workflow key (e.g., 'feature_development', 'bug_fix', etc.)
`;

      // Use Claude to analyze the prompt
      const claudeAnalysis = execSync(
        `claude --print "${analyzePrompt.replace(/"/g, '\\"')}"`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
      ).trim().toLowerCase().replace(/['"]/g, '');

      // Validate the response is a valid workflow key
      if (this.workflows[claudeAnalysis]) {
        return this.workflows[claudeAnalysis];
      }

      // If Claude's response isn't valid, fall back to enhanced keyword matching
      return this.enhancedKeywordMatching(prompt);
      
    } catch (error) {
      // If Claude command fails, fall back to enhanced keyword matching
      console.error('Claude analysis failed, using keyword matching:', error.message);
      return this.enhancedKeywordMatching(prompt);
    }
  }

  enhancedKeywordMatching(prompt) {
    const promptLower = prompt.toLowerCase();
    
    // Score each workflow based on keyword matches
    const scores = {};
    
    // Define keyword weights for each workflow
    const workflowKeywords = {
      bug_fix: {
        keywords: ['fix', 'bug', 'error', 'issue', 'broken', 'crash', 'fail', 'debug', 'problem', 'wrong'],
        weight: 2
      },
      refactoring: {
        keywords: ['refactor', 'improve', 'optimize', 'clean', 'restructure', 'reorganize', 'simplify', 'enhance'],
        weight: 2
      },
      api_development: {
        keywords: ['api', 'endpoint', 'rest', 'graphql', 'backend', 'server', 'route', 'request', 'response'],
        weight: 2
      },
      ui_component: {
        keywords: ['ui', 'component', 'frontend', 'react', 'vue', 'interface', 'button', 'form', 'page', 'view'],
        weight: 2
      },
      qa: {
        keywords: ['test', 'qa', 'quality', 'testing', 'unit', 'integration', 'e2e', 'coverage', 'assert'],
        weight: 2
      },
      feature_development: {
        keywords: ['add', 'create', 'implement', 'build', 'develop', 'feature', 'new', 'functionality'],
        weight: 1
      },
      blockchain: {
        keywords: ['blockchain', 'smart contract', 'web3', 'ethereum', 'solidity', 'defi', 'crypto', 'wallet'],
        weight: 3
      }
    };
    
    // Calculate scores for each workflow
    Object.entries(workflowKeywords).forEach(([workflow, config]) => {
      scores[workflow] = 0;
      config.keywords.forEach(keyword => {
        if (promptLower.includes(keyword)) {
          scores[workflow] += config.weight;
        }
      });
    });
    
    // Find the workflow with the highest score
    let bestWorkflow = 'feature_development';
    let highestScore = 0;
    
    Object.entries(scores).forEach(([workflow, score]) => {
      if (score > highestScore && this.workflows[workflow]) {
        highestScore = score;
        bestWorkflow = workflow;
      }
    });
    
    return this.workflows[bestWorkflow] || this.workflows.feature_development || Object.values(this.workflows)[0];
  }

  filterAgentsByAvailability(agents) {
    if (this.availableAgents.length === 0) {
      return agents; // Return all if we can't check
    }
    
    return agents.filter(agent => this.availableAgents.includes(agent));
  }
}

// Main execution - reads from stdin as Claude Code provides
if (require.main === module) {
  let inputData = '';
  
  process.stdin.on('data', (chunk) => {
    inputData += chunk;
  });
  
  process.stdin.on('end', async () => {
    try {
      const input = JSON.parse(inputData);
      const prompt = input.prompt || '';
      
      if (!prompt) {
        console.log('{}');
        return;
      }
      
      const selector = new WorkflowSelector();
      const workflow = await selector.selectWorkflow(prompt);
      const agents = selector.filterAgentsByAvailability(workflow.agents);
      
      // Output suggestion
      const output = {
        workflow: workflow.name,
        agents: agents,
        message: `Suggested workflow: ${workflow.name} with agents: ${agents.join(' → ')}`
      };
      
      console.log(JSON.stringify(output));
    } catch (error) {
      // Silent fail - just return empty
      console.log('{}');
    }
  });
}

module.exports = WorkflowSelector;