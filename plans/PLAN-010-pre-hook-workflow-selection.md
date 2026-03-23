# PLAN-010: Pre-Hook Workflow Selection Implementation

## Executive Summary
This plan outlines the implementation of a sophisticated pre-hook system for ccsetup that automatically analyzes user prompts and selects appropriate workflows from the agent orchestration guide. The system will enhance Claude Code's ability to follow structured workflows without requiring explicit user instructions.

## Objectives
- [ ] Create a pre-hook system that executes before agent selection
- [ ] Implement intelligent prompt analysis with 90%+ accuracy
- [ ] Support clarification dialogues for ambiguous prompts
- [ ] Generate structured metadata for Claude Code execution
- [ ] Maintain backward compatibility with existing CLI functionality

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     User Input (Prompt)                      │
└────────────────────────────┬───────────────────────────────┘
                             │
┌─────────────────────────────v───────────────────────────────┐
│                      Hook Executor                           │
│  - Load hooks configuration                                  │
│  - Execute workflow-selector hook                            │
│  - Handle hook failures gracefully                           │
└────────────────────────────┬───────────────────────────────┘
                             │
┌─────────────────────────────v───────────────────────────────┐
│                    Workflow Parser                           │
│  - Parse agent-orchestration.md                              │
│  - Extract workflow definitions                              │
│  - Cache parsed workflows                                    │
└────────────────────────────┬───────────────────────────────┘
                             │
┌─────────────────────────────v───────────────────────────────┐
│                    Prompt Analyzer                           │
│  - Pattern matching against workflows                        │
│  - Confidence scoring                                        │
│  - Ambiguity detection                                       │
└────────────────────────────┬───────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │ Confidence < 0.5?│
                    └────────┬────────┘
                             │ Yes
┌─────────────────────────────v───────────────────────────────┐
│                 Clarification Engine                         │
│  - Generate clarifying questions                             │
│  - Interactive user dialogue                                 │
│  - Re-analyze with additional context                       │
└────────────────────────────┬───────────────────────────────┘
                             │
┌─────────────────────────────v───────────────────────────────┐
│                   Workflow Selector                          │
│  - Select appropriate workflow                               │
│  - Map to agent sequence                                     │
│  - Generate execution plan                                   │
└────────────────────────────┬───────────────────────────────┘
                             │
┌─────────────────────────────v───────────────────────────────┐
│                  Metadata Generator                          │
│  - Format workflow information                               │
│  - Generate todo items                                       │
│  - Create instructions                                       │
└─────────────────────────────────────────────────────────────┘
```

### Module Structure

```
ccsetup/
├── lib/
│   └── hooks/
│       ├── index.js                    # Hook system entry point
│       ├── executor.js                 # Hook execution engine
│       └── workflow-selector/
│           ├── index.js                # Hook entry point
│           ├── parser.js               # Orchestration parser
│           ├── analyzer.js             # Prompt analyzer
│           ├── clarification.js        # User dialogue
│           ├── selector.js             # Workflow selection
│           └── metadata-generator.js   # Output formatting
├── hooks/
│   └── config/
│       └── hooks.json                  # Hook configuration
└── bin/
    └── create-project.js               # Integration point
```

## Implementation Phases

### Phase 1: Core Infrastructure (8 hours)

#### 1.1 Hook System Foundation (2 hours)
```javascript
// lib/hooks/index.js
class HookSystem {
  constructor() {
    this.hooks = new Map();
    this.config = this.loadConfig();
  }
  
  loadConfig() {
    const configPath = path.join(process.cwd(), '.ccsetup/hooks.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    return { 'pre-hooks': {}, 'post-hooks': {} };
  }
  
  async executePreHook(hookName, context) {
    const hook = this.hooks.get(hookName);
    if (!hook || !this.config['pre-hooks'][hookName]?.enabled) {
      return null;
    }
    
    try {
      return await hook.execute(context);
    } catch (error) {
      console.error(`Hook ${hookName} failed:`, error);
      return null; // Graceful degradation
    }
  }
}
```

#### 1.2 Workflow Parser (3 hours)
```javascript
// lib/hooks/workflow-selector/parser.js
class WorkflowParser {
  constructor() {
    this.cache = null;
    this.cacheTime = null;
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  }
  
  async parseOrchestrationGuide() {
    if (this.cache && Date.now() - this.cacheTime < this.CACHE_DURATION) {
      return this.cache;
    }
    
    const filePath = path.join(__dirname, '../../../docs/agent-orchestration.md');
    const content = fs.readFileSync(filePath, 'utf8');
    
    const workflows = {
      featureDevelopment: {
        name: 'Feature Development Workflow',
        agents: ['researcher', 'planner', 'coder', 'checker'],
        triggers: this.extractTriggers(content, 'Feature Development'),
        steps: this.extractSteps(content, 'Feature Development')
      },
      bugFix: {
        name: 'Bug Fix Workflow',
        agents: ['researcher', 'coder', 'checker'],
        triggers: this.extractTriggers(content, 'Bug Fix'),
        steps: this.extractSteps(content, 'Bug Fix')
      },
      // ... other workflows
    };
    
    this.cache = workflows;
    this.cacheTime = Date.now();
    return workflows;
  }
  
  extractTriggers(content, workflowName) {
    // Parse markdown to extract trigger patterns
    const sectionRegex = new RegExp(`### When to use ${workflowName}.*?(?=###|$)`, 's');
    const section = content.match(sectionRegex)?.[0] || '';
    const triggers = [];
    
    // Extract bullet points as triggers
    const bulletRegex = /- (.+)/g;
    let match;
    while ((match = bulletRegex.exec(section)) !== null) {
      triggers.push(match[1].trim());
    }
    
    return triggers;
  }
}
```

#### 1.3 Basic Prompt Analysis (3 hours)
```javascript
// lib/hooks/workflow-selector/analyzer.js
class PromptAnalyzer {
  constructor(workflows) {
    this.workflows = workflows;
    this.patterns = this.buildPatterns();
  }
  
  buildPatterns() {
    return {
      featureDevelopment: [
        /\b(add|implement|create|build)\s+\w+\s+(feature|functionality|system)/i,
        /\bnew\s+(feature|component|module|service)/i,
        /\b(develop|design)\s+\w+/i
      ],
      bugFix: [
        /\b(fix|resolve|debug|repair)\s+\w*\s*(bug|issue|error|problem)/i,
        /\b(not\s+working|broken|fails?|crash)/i,
        /\berror\s+(when|during|while)/i
      ],
      refactoring: [
        /\b(refactor|improve|optimize|clean\s*up)\s+\w*\s*code/i,
        /\b(performance|optimization|restructure)/i,
        /\bmake\s+\w+\s+(better|cleaner|faster)/i
      ],
      // ... patterns for other workflows
    };
  }
  
  analyzePrompt(prompt) {
    const results = [];
    
    for (const [workflowType, patterns] of Object.entries(this.patterns)) {
      let score = 0;
      let matches = 0;
      
      for (const pattern of patterns) {
        if (pattern.test(prompt)) {
          matches++;
          score += this.calculatePatternScore(pattern, prompt);
        }
      }
      
      if (matches > 0) {
        results.push({
          workflow: workflowType,
          score: score / patterns.length,
          matches: matches
        });
      }
    }
    
    return results.sort((a, b) => b.score - a.score);
  }
}
```

### Phase 2: Advanced Analysis (6 hours)

#### 2.1 Confidence Scoring (2 hours)
```javascript
// lib/hooks/workflow-selector/analyzer.js (extended)
class PromptAnalyzer {
  calculateConfidence(prompt, workflowMatches) {
    let confidence = 0;
    
    // Base confidence from pattern matching
    if (workflowMatches.length > 0) {
      confidence = workflowMatches[0].score;
    }
    
    // Adjust for ambiguity
    const ambiguityScore = this.calculateAmbiguity(prompt, workflowMatches);
    confidence *= (1 - ambiguityScore);
    
    // Boost for specific keywords
    const specificityBoost = this.calculateSpecificity(prompt);
    confidence = Math.min(1.0, confidence + specificityBoost);
    
    return confidence;
  }
  
  calculateAmbiguity(prompt, workflowMatches) {
    let ambiguity = 0;
    
    // Multiple high-scoring workflows indicate ambiguity
    if (workflowMatches.length > 1) {
      const topScore = workflowMatches[0].score;
      const secondScore = workflowMatches[1]?.score || 0;
      
      if (secondScore > topScore * 0.8) {
        ambiguity += 0.3;
      }
    }
    
    // Vague language patterns
    const vaguePatterns = [
      /\b(something|stuff|things?|it|that)\b/i,
      /\b(maybe|perhaps|possibly|might)\b/i,
      /\bmake\s+\w+\s+better\b/i
    ];
    
    for (const pattern of vaguePatterns) {
      if (pattern.test(prompt)) {
        ambiguity += 0.2;
      }
    }
    
    return Math.min(1.0, ambiguity);
  }
}
```

#### 2.2 Clarification Engine (2 hours)
```javascript
// lib/hooks/workflow-selector/clarification.js
const inquirer = require('inquirer');

class ClarificationEngine {
  constructor(analyzer) {
    this.analyzer = analyzer;
  }
  
  async requestClarification(prompt, analysis) {
    const questions = this.generateQuestions(prompt, analysis);
    
    if (questions.length === 0) {
      return null;
    }
    
    console.log('\n🤔 I need some clarification to select the best workflow:');
    
    const answers = await inquirer.prompt(questions);
    
    // Combine original prompt with clarification
    const clarifiedContext = this.buildClarifiedContext(prompt, answers);
    
    return clarifiedContext;
  }
  
  generateQuestions(prompt, analysis) {
    const questions = [];
    
    // Multiple workflow matches
    if (analysis.workflowMatches.length > 1 && analysis.confidence < 0.7) {
      questions.push({
        type: 'list',
        name: 'workflowType',
        message: 'Which type of task best describes what you want to do?',
        choices: analysis.workflowMatches.slice(0, 3).map(match => ({
          name: this.getWorkflowDescription(match.workflow),
          value: match.workflow
        }))
      });
    }
    
    // Missing specifics
    if (!this.hasSpecificTarget(prompt)) {
      questions.push({
        type: 'input',
        name: 'targetComponent',
        message: 'What specific component or area should I focus on?',
        validate: input => input.length > 0 || 'Please provide a specific target'
      });
    }
    
    // Requirements clarification
    if (analysis.confidence < 0.5) {
      questions.push({
        type: 'input',
        name: 'requirements',
        message: 'Could you provide more details about the desired outcome?'
      });
    }
    
    return questions;
  }
}
```

#### 2.3 Enhanced Workflow Selection (2 hours)
```javascript
// lib/hooks/workflow-selector/selector.js
class WorkflowSelector {
  constructor(parser, analyzer) {
    this.parser = parser;
    this.analyzer = analyzer;
  }
  
  async selectWorkflow(prompt, clarification = null) {
    const workflows = await this.parser.parseOrchestrationGuide();
    
    // Analyze prompt (with clarification if provided)
    const fullPrompt = clarification 
      ? `${prompt} ${clarification.requirements || ''} ${clarification.targetComponent || ''}`
      : prompt;
    
    const analysis = this.analyzer.analyzePrompt(fullPrompt);
    const confidence = this.analyzer.calculateConfidence(fullPrompt, analysis.workflowMatches);
    
    // Override with explicit workflow selection from clarification
    if (clarification?.workflowType) {
      return this.buildWorkflowResult(
        workflows[clarification.workflowType],
        clarification.workflowType,
        1.0, // Full confidence with explicit selection
        analysis
      );
    }
    
    // Select based on analysis
    if (analysis.workflowMatches.length > 0 && confidence > 0.5) {
      const selectedType = analysis.workflowMatches[0].workflow;
      return this.buildWorkflowResult(
        workflows[selectedType],
        selectedType,
        confidence,
        analysis
      );
    }
    
    // Fallback to general workflow
    return this.buildGeneralWorkflow(prompt, analysis);
  }
  
  buildWorkflowResult(workflow, type, confidence, analysis) {
    return {
      type: type,
      name: workflow.name,
      agents: workflow.agents,
      steps: workflow.steps,
      confidence: confidence,
      analysis: analysis
    };
  }
}
```

### Phase 3: CLI Integration (5 hours)

#### 3.1 Hook Integration Point (2 hours)
```javascript
// bin/create-project.js (modifications)
const { HookSystem } = require('../lib/hooks');

async function createProject(projectName, flags) {
  // ... existing code ...
  
  // Initialize hook system
  const hookSystem = new HookSystem();
  
  // Execute pre-hook if user provided a prompt
  let preHookResult = null;
  if (flags.prompt || process.env.CLAUDE_USER_PROMPT) {
    const userPrompt = flags.prompt || process.env.CLAUDE_USER_PROMPT;
    
    preHookResult = await hookSystem.executePreHook('workflow-selector', {
      prompt: userPrompt,
      projectName: projectName,
      flags: flags
    });
    
    if (preHookResult && preHookResult.confidence > 0.7) {
      console.log(`\n🎯 Selected ${preHookResult.workflow.name}`);
      console.log('📋 Workflow plan:');
      preHookResult.todoItems.forEach((item, i) => {
        console.log(`   ${i + 1}. ${item}`);
      });
      console.log('');
    }
  }
  
  // ... continue with agent selection ...
  
  // Pre-select agents if hook provided them
  if (preHookResult?.workflow?.agents) {
    selectedAgentFiles = preHookResult.workflow.agents.map(agent => 
      `${agent}.md`
    );
  }
}
```

#### 3.2 Metadata Generation (2 hours)
```javascript
// lib/hooks/workflow-selector/metadata-generator.js
class MetadataGenerator {
  generateMetadata(workflow, prompt, analysis) {
    return {
      workflow: {
        type: workflow.type,
        name: workflow.name,
        agents: workflow.agents,
        description: workflow.description || this.getDefaultDescription(workflow.type)
      },
      instructions: this.generateInstructions(workflow, prompt),
      todoItems: this.generateTodoItems(workflow, prompt, analysis),
      confidence: analysis.confidence,
      intent: {
        primaryAction: analysis.primaryAction,
        targetComponent: analysis.targetComponent,
        ambiguityScore: analysis.ambiguityScore
      }
    };
  }
  
  generateInstructions(workflow, prompt) {
    const steps = [];
    
    workflow.agents.forEach((agent, index) => {
      const step = this.getAgentInstruction(agent, workflow.type, prompt);
      steps.push(`${index + 1}. ${step}`);
    });
    
    return steps.join('\n');
  }
  
  generateTodoItems(workflow, prompt, analysis) {
    const todos = [];
    
    // Base todos from workflow
    workflow.agents.forEach(agent => {
      const agentTasks = this.getAgentTasks(agent, workflow.type, analysis);
      todos.push(...agentTasks);
    });
    
    // Additional context-specific todos
    if (analysis.targetComponent) {
      todos.unshift(`Analyze ${analysis.targetComponent} component structure`);
    }
    
    if (analysis.requirements?.includes('test')) {
      todos.push('Create comprehensive test suite');
    }
    
    return todos;
  }
}
```

#### 3.3 Configuration Setup (1 hour)
```javascript
// Template for .ccsetup/hooks.json
{
  "pre-hooks": {
    "workflow-selector": {
      "enabled": true,
      "script": "node_modules/ccsetup/lib/hooks/workflow-selector/index.js",
      "description": "Automatically selects appropriate workflow based on user prompt",
      "config": {
        "confidenceThreshold": 0.5,
        "enableClarification": true,
        "cacheWorkflows": true,
        "cacheDuration": 300000
      }
    }
  },
  "post-hooks": {}
}
```

### Phase 4: Testing & Validation (4 hours)

#### 4.1 Unit Tests (2 hours)
```javascript
// __test__/hooks/workflow-selector.test.js
describe('WorkflowSelector', () => {
  describe('Prompt Analysis', () => {
    test('identifies feature development correctly', () => {
      const prompts = [
        'I need to add user authentication',
        'Implement payment processing system',
        'Create new dashboard component'
      ];
      
      prompts.forEach(prompt => {
        const result = analyzer.analyzePrompt(prompt);
        expect(result[0].workflow).toBe('featureDevelopment');
        expect(result[0].score).toBeGreaterThan(0.8);
      });
    });
    
    test('detects ambiguous prompts', () => {
      const prompt = 'Make the app better';
      const result = analyzer.analyzePrompt(prompt);
      const confidence = analyzer.calculateConfidence(prompt, result);
      
      expect(confidence).toBeLessThan(0.5);
    });
  });
  
  describe('Clarification', () => {
    test('generates appropriate questions for vague prompts', () => {
      const analysis = {
        workflowMatches: [],
        confidence: 0.2,
        ambiguityScore: 0.8
      };
      
      const questions = clarificationEngine.generateQuestions(
        'Fix the thing',
        analysis
      );
      
      expect(questions).toContainEqual(
        expect.objectContaining({
          name: 'targetComponent'
        })
      );
    });
  });
});
```

#### 4.2 Integration Tests (1 hour)
```javascript
// __test__/integration/hook-execution.test.js
describe('Hook Integration', () => {
  test('pre-hook executes and returns metadata', async () => {
    const hookSystem = new HookSystem();
    const result = await hookSystem.executePreHook('workflow-selector', {
      prompt: 'Add user authentication with JWT'
    });
    
    expect(result).toMatchObject({
      workflow: {
        type: 'featureDevelopment',
        agents: expect.arrayContaining(['researcher', 'planner'])
      },
      confidence: expect.any(Number),
      todoItems: expect.any(Array)
    });
  });
  
  test('gracefully handles hook failures', async () => {
    // Simulate hook error
    const hookSystem = new HookSystem();
    hookSystem.hooks.set('workflow-selector', {
      execute: () => { throw new Error('Hook failed'); }
    });
    
    const result = await hookSystem.executePreHook('workflow-selector', {});
    expect(result).toBeNull(); // Should return null on failure
  });
});
```

#### 4.3 Performance Testing (1 hour)
```javascript
// __test__/performance/hook-performance.test.js
describe('Performance', () => {
  test('hook execution completes within 100ms', async () => {
    const start = Date.now();
    
    const selector = new WorkflowSelector();
    await selector.selectWorkflow('Add payment processing');
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });
  
  test('workflow parsing uses cache effectively', async () => {
    const parser = new WorkflowParser();
    
    // First parse
    const start1 = Date.now();
    await parser.parseOrchestrationGuide();
    const duration1 = Date.now() - start1;
    
    // Second parse (should use cache)
    const start2 = Date.now();
    await parser.parseOrchestrationGuide();
    const duration2 = Date.now() - start2;
    
    expect(duration2).toBeLessThan(duration1 / 10);
  });
});
```

## Risk Analysis & Mitigation

| Risk | Impact | Likelihood | Mitigation Strategy |
|------|--------|------------|---------------------|
| False positive workflow selection | High | Medium | Conservative confidence thresholds, clarification dialogues |
| Performance degradation | Medium | Low | Caching, async execution, feature flags |
| Breaking existing CLI | High | Low | Graceful degradation, backward compatibility |
| Complex prompts misunderstood | Medium | Medium | Multi-layer analysis, user feedback loop |
| Hook system failures | Medium | Low | Try-catch wrapping, null returns, fallback to manual |

## Success Metrics
- ✅ Workflow selection accuracy > 90% for clear prompts
- ✅ Hook execution time < 100ms (excluding user interaction)
- ✅ Zero breaking changes to existing CLI functionality
- ✅ Clarification triggered for ambiguous prompts (confidence < 0.5)
- ✅ 100% test coverage for critical paths
- ✅ Successful integration with all 7 defined workflows

## Timeline
- **Total Estimated Time**: 23 hours
- **Phase 1**: 8 hours (Core Infrastructure)
- **Phase 2**: 6 hours (Advanced Analysis)
- **Phase 3**: 5 hours (CLI Integration)
- **Phase 4**: 4 hours (Testing & Validation)

## Dependencies
- Existing agent-orchestration.md structure
- inquirer package for interactive prompts
- Current CLI architecture in bin/create-project.js
- Template metadata extraction patterns

## Future Enhancements
1. Machine learning model for improved prompt understanding
2. User feedback loop to improve selection accuracy
3. Project-specific workflow customization
4. Integration with external NLP services
5. Workflow recommendation based on project analysis
6. Post-execution feedback collection

## Notes
- Leverage existing patterns from metadata-extractor.js for consistency
- Ensure hooks directory is included in npm package
- Consider adding telemetry for workflow selection accuracy
- Documentation should include examples for each workflow type
- Consider adding a --no-hooks flag for users who prefer manual selection