# Getting Started with Claude Code

## Quick Setup

After installing your project with ccsetup:

```bash
# 1. Navigate to your project
cd my-project

# 2. Initialize Claude Code (if needed)
claude init

# 3. Start Claude Code
claude
```

## First Steps in Claude

### 1. Orient Claude to Your Project

Start with these commands:

```
"Read CLAUDE.md to understand this project"
"What agents are available in the agents directory?"
"Show me the workflow guide in docs/agent-orchestration.md"
"What's in the ROADMAP?"
```

### 2. Understand the Workflow

```
"Explain the feature development workflow"
"How do I use the ticket system?"
"Show me how agent orchestration works"
```

### 3. Start Your First Task

```
"Create a ticket for [your feature]"
"Use the planner agent to design [your feature]"
"Help me implement [specific functionality]"
```

## Project Structure Walkthrough

### CLAUDE.md
Your project's instruction manual for Claude. Customize it with:
- Project-specific commands
- Coding standards
- Architecture decisions
- Important context

### agents/
Specialized AI assistants:
- **planner** - Designs solutions and architectures
- **coder** - Implements features
- **checker** - Reviews and tests code
- **researcher** - Investigates and gathers information

### docs/
- **ROADMAP.md** - Project goals and progress
- **agent-orchestration.md** - Workflow patterns

### tickets/
Track tasks with markdown files:
- Create tickets for features/bugs
- Track progress with checkboxes
- Document implementation decisions

### plans/
Strategic documents:
- Architecture designs
- Implementation strategies
- Technical decisions

## Common Workflows

### Feature Development

```
You: "I need to add user authentication"

Claude: "I'll help you add authentication. Let me start with the feature development workflow:
1. First, I'll use the researcher agent to understand your current setup
2. Then the planner agent will design the auth system  
3. The coder agent will implement it
4. Finally, the checker agent will validate everything"
```

### Bug Fixing

```
You: "Users can't log in after 5 minutes"

Claude: "I'll investigate this login issue using the bug fix workflow:
1. Researcher agent will analyze the problem
2. Coder agent will implement the fix
3. Checker agent will verify the solution"
```

### Code Review

```
You: "Review the payment module I just wrote"

Claude: "I'll use the checker agent to review your payment module for:
- Code quality and best practices
- Security vulnerabilities  
- Test coverage
- Performance issues"
```

## Essential Commands

### File Operations
```
"Show me the contents of [file]"
"Create a new file at [path]"
"Update [file] with [changes]"
```

### Agent Usage
```
"Use the planner agent to design [feature]"
"Have the coder agent implement [task]"
"Run the checker agent on [code]"
```

### Ticket Management
```
"Create a ticket for [task]"
"Show me all open tickets"
"Update TICKET-001 to in progress"
```

### Project Navigation
```
"What files are in the src directory?"
"Search for [term] in the codebase"
"Show me recent changes"
```

## Customizing Your Setup

### 1. Update CLAUDE.md

Add project-specific information:

```markdown
## Project Commands
- `npm run dev` - Start development server
- `npm test` - Run test suite
- `npm run build` - Build for production

## Architecture Notes
- We use PostgreSQL for the database
- API follows REST principles
- Frontend is React with TypeScript
```

### 2. Define Your Roadmap

Edit docs/ROADMAP.md:

```markdown
## Development

### Phase 1: MVP
- [ ] User authentication
- [ ] Basic CRUD operations
- [ ] Payment integration

### Phase 2: Enhancement  
- [ ] Advanced search
- [ ] Real-time notifications
- [ ] Analytics dashboard
```

### 3. Create Initial Tickets

Start with high-level tickets:

```
"Create tickets for the MVP features in our roadmap"
"Break down the authentication feature into subtasks"
```

## Best Practices

### 1. Always Plan First
Use the planner agent before implementing complex features.

### 2. Track Everything
Create tickets for all non-trivial tasks.

### 3. Follow Workflows
Use the appropriate orchestration workflow for your task type.

### 4. Regular Reviews
Use the checker agent frequently to maintain code quality.

### 5. Document Decisions
Update plans/ with architectural decisions and rationales.

## Pro Tips

### Batch Operations
```
"Read all files in the models directory"
"Update all test files to use the new API"
```

### Context Building
```
"Analyze the authentication flow in our app"
"Summarize how our payment system works"
```

### Efficient Workflows
```
"Create a plan for refactoring the user service, then create tickets for each step"
```

## Troubleshooting

### Claude Doesn't Understand the Project

1. Ensure CLAUDE.md is comprehensive
2. Have Claude read key files:
   ```
   "Read package.json, tsconfig.json, and src/index.ts"
   ```

### Agents Not Working

1. Check agents are in the correct directory
2. Verify with:
   ```
   "List all available agents"
   "Show me the contents of agents/planner.md"
   ```

### Workflow Confusion

Review the orchestration guide:
```
"Explain each workflow in docs/agent-orchestration.md"
"Which workflow should I use for adding a new API endpoint?"
```

## Next Steps

1. **Customize CLAUDE.md** with your project specifics
2. **Create your first ticket** for a real task
3. **Try a complete workflow** from planning to implementation
4. **Explore all agents** to understand their capabilities
5. **Build your roadmap** with concrete goals

Remember: Claude Code gets more powerful as you provide more context and use the structured workflows!