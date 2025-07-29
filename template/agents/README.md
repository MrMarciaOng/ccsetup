# Agents Directory

This directory contains specialized AI agents for Claude Code, designed to enhance development workflows with domain-specific expertise.

## Credits

This collection includes:
- **8 original agents** created for ccsetup
- **44 specialized agents** from [wshobson/agents](https://github.com/wshobson/agents) - an amazing collection of Claude Code subagents

## Available Agents (52 total)

### Original ccsetup Agents
These 8 agents were created specifically for the ccsetup boilerplate:

- **[backend](backend.md)** - Backend development specialist for API design, database architecture, and server-side optimization
- **[blockchain](blockchain.md)** - Blockchain and Web3 expert for smart contracts, DeFi protocols, and blockchain architecture
- **[checker](checker.md)** - Quality assurance and code review specialist for testing, security analysis, and validation
- **[coder](coder.md)** - Expert software developer for implementing features, fixing bugs, and optimizing code
- **[frontend](frontend.md)** - Frontend development specialist for UI/UX, responsive design, and modern web frameworks
- **[planner](planner.md)** - Strategic planning specialist for breaking down complex problems and creating implementation roadmaps
- **[researcher](researcher.md)** - Research specialist for both online sources and local codebases, gathering comprehensive information
- **[shadcn](shadcn.md)** - shadcn/ui component library expert for building beautiful, accessible React interfaces

### wshobson/agents Collection (44 agents)

The following 44 specialized agents are from the excellent [wshobson/agents](https://github.com/wshobson/agents) repository:

#### Development & Architecture
- **[backend-architect](backend-architect.md)** - Design RESTful APIs, microservice boundaries, and database schemas
- **[frontend-developer](frontend-developer.md)** - Build React components, implement responsive layouts, and handle client-side state management
- **[mobile-developer](mobile-developer.md)** - Develop React Native or Flutter apps with native integrations
- **[graphql-architect](graphql-architect.md)** - Design GraphQL schemas, resolvers, and federation
- **[architect-review](architect-review.md)** - Reviews code changes for architectural consistency and patterns

#### Language Specialists
- **[python-pro](python-pro.md)** - Write idiomatic Python code with advanced features and optimizations
- **[golang-pro](golang-pro.md)** - Write idiomatic Go code with goroutines, channels, and interfaces
- **[rust-pro](rust-pro.md)** - Write idiomatic Rust with ownership patterns, lifetimes, and trait implementations
- **[c-pro](c-pro.md)** - Write efficient C code with proper memory management and system calls
- **[cpp-pro](cpp-pro.md)** - Write idiomatic C++ code with modern features, RAII, smart pointers, and STL algorithms
- **[javascript-pro](javascript-pro.md)** - Master modern JavaScript with ES6+, async patterns, and Node.js APIs
- **[sql-pro](sql-pro.md)** - Write complex SQL queries, optimize execution plans, and design normalized schemas

#### Infrastructure & Operations
- **[devops-troubleshooter](devops-troubleshooter.md)** - Debug production issues, analyze logs, and fix deployment failures
- **[deployment-engineer](deployment-engineer.md)** - Configure CI/CD pipelines, Docker containers, and cloud deployments
- **[cloud-architect](cloud-architect.md)** - Design AWS/Azure/GCP infrastructure and optimize cloud costs
- **[database-optimizer](database-optimizer.md)** - Optimize SQL queries, design efficient indexes, and handle database migrations
- **[database-admin](database-admin.md)** - Manage database operations, backups, replication, and monitoring
- **[terraform-specialist](terraform-specialist.md)** - Write advanced Terraform modules, manage state files, and implement IaC best practices
- **[incident-responder](incident-responder.md)** - Handles production incidents with urgency and precision
- **[network-engineer](network-engineer.md)** - Debug network connectivity, configure load balancers, and analyze traffic patterns
- **[dx-optimizer](dx-optimizer.md)** - Developer Experience specialist that improves tooling, setup, and workflows

#### Quality & Security
- **[code-reviewer](code-reviewer.md)** - Expert code review for quality, security, and maintainability
- **[security-auditor](security-auditor.md)** - Review code for vulnerabilities and ensure OWASP compliance
- **[test-automator](test-automator.md)** - Create comprehensive test suites with unit, integration, and e2e tests
- **[performance-engineer](performance-engineer.md)** - Profile applications, optimize bottlenecks, and implement caching strategies
- **[debugger](debugger.md)** - Debugging specialist for errors, test failures, and unexpected behavior
- **[error-detective](error-detective.md)** - Search logs and codebases for error patterns, stack traces, and anomalies
- **[search-specialist](search-specialist.md)** - Expert web researcher using advanced search techniques and synthesis

#### Data & AI
- **[data-scientist](data-scientist.md)** - Data analysis expert for SQL queries, BigQuery operations, and data insights
- **[data-engineer](data-engineer.md)** - Build ETL pipelines, data warehouses, and streaming architectures
- **[ai-engineer](ai-engineer.md)** - Build LLM applications, RAG systems, and prompt pipelines
- **[ml-engineer](ml-engineer.md)** - Implement ML pipelines, model serving, and feature engineering
- **[mlops-engineer](mlops-engineer.md)** - Build ML pipelines, experiment tracking, and model registries
- **[prompt-engineer](prompt-engineer.md)** - Optimizes prompts for LLMs and AI systems

#### Specialized Domains
- **[api-documenter](api-documenter.md)** - Create OpenAPI/Swagger specs and write developer documentation
- **[payment-integration](payment-integration.md)** - Integrate Stripe, PayPal, and payment processors
- **[quant-analyst](quant-analyst.md)** - Build financial models, backtest trading strategies, and analyze market data
- **[risk-manager](risk-manager.md)** - Monitor portfolio risk, R-multiples, and position limits
- **[legacy-modernizer](legacy-modernizer.md)** - Refactor legacy codebases and implement gradual modernization
- **[context-manager](context-manager.md)** - Manages context across multiple agents and long-running tasks

#### Business & Marketing
- **[business-analyst](business-analyst.md)** - Analyze metrics, create reports, and track KPIs
- **[content-marketer](content-marketer.md)** - Write blog posts, social media content, and email newsletters
- **[sales-automator](sales-automator.md)** - Draft cold emails, follow-ups, and proposal templates
- **[customer-support](customer-support.md)** - Handle support tickets, FAQ responses, and customer emails

## Usage

### Installation

When using ccsetup, agents can be:
1. **Selected interactively** during setup (curated list of 8 agents)
2. **Copied in browse mode** (all 52 agents copied to /agents folder)
3. **Included automatically** with --all-agents flag

To activate agents, copy them to `~/.claude/agents/`:
```bash
# Example: Activate the code-reviewer agent
cp agents/code-reviewer.md ~/.claude/agents/

# Activate multiple agents
cp agents/{python-pro,test-automator,security-auditor}.md ~/.claude/agents/
```

### Invoking Agents

#### Automatic Invocation
Claude Code will automatically delegate to the appropriate agent based on the task context.

#### Explicit Invocation
Mention the agent by name in your request:
```
"Use the code-reviewer to check my recent changes"
"Have the security-auditor scan for vulnerabilities"
"Get the performance-engineer to optimize this bottleneck"
```

## Agent Format

Each agent follows this structure:
```markdown
---
name: agent-name
description: When this agent should be invoked
tools: tool1, tool2  # Optional - defaults to all tools
---

System prompt defining the agent's role and capabilities
```

## Common Agent Workflows

### Feature Development
```
planner → coder → checker
```

### API Development
```
backend-architect → backend → api-documenter → checker
```

### Frontend Development
```
frontend → shadcn → checker
```

### Full Stack Development
```
planner → backend-architect → backend → frontend → checker
```

### Bug Fixing
```
researcher → debugger → coder → checker
```

### Performance Optimization
```
performance-engineer → database-optimizer → coder → checker
```

### Security Review
```
security-auditor → code-reviewer → coder (for fixes) → checker
```

## Tips for Using Agents

1. **Let Claude Code choose** - Often Claude will automatically select the right agent
2. **Be specific** - The more specific your request, the better the agent selection
3. **Combine agents** - Many tasks benefit from multiple agents working together
4. **Review agent output** - Agents provide specialized expertise but should be reviewed
5. **Iterate** - Use agent feedback to refine your approach

## Contributing

To add a new agent:
1. Create a new `.md` file in this directory
2. Follow the agent format (frontmatter + system prompt)
3. Use lowercase, hyphen-separated names
4. Write clear descriptions for when the agent should be used

## Learn More

- [ccsetup Documentation](https://github.com/MrMarciaOng/ccsetup)
- [wshobson/agents Repository](https://github.com/wshobson/agents)
- [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code)
- [Subagents Documentation](https://docs.anthropic.com/en/docs/claude-code/sub-agents)