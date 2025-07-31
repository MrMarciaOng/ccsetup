# Ticket System Guide

## Overview

The ccsetup ticket system provides a structured way to track tasks, bugs, and features in your Claude Code project.

## Ticket Structure

Each ticket is a markdown file in the `/tickets` directory with this format:

```markdown
# TICKET-XXX: [Title]

## Description
[Detailed description of the task]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Priority
High/Medium/Low

## Status
Todo/In Progress/Done

## Notes
[Any additional context or notes]
```

## Creating Tickets

### Manual Creation

1. Create a new file in `/tickets`
2. Follow naming convention: `TICKET-XXX-brief-description.md`
3. Use the template structure above

### Using Claude

Ask Claude to create tickets:

```
"Create a ticket for implementing user authentication"
"Break down the payment feature into separate tickets"
"Create a bug ticket for the login timeout issue"
```

## Ticket Lifecycle

### 1. Creation (Todo)

New tickets start with:
- Empty checkboxes in acceptance criteria
- Status: Todo
- Clear description and requirements

### 2. In Progress

When work begins:
- Update Status to "In Progress"
- Check off completed criteria as you go
- Add notes about implementation decisions

### 3. Completion (Done)

When finished:
- All acceptance criteria checked
- Status: Done
- Add summary of changes

Example completed ticket:

```markdown
# TICKET-001: Add User Authentication

## Description
Implement JWT-based authentication for the API

## Acceptance Criteria
- [x] Create auth endpoints (login, logout, refresh)
- [x] Implement JWT token generation
- [x] Add auth middleware
- [x] Create user model
- [x] Add password hashing

## Priority
High

## Status
Done

## Summary
Implemented complete JWT authentication system with:
- Bearer token authentication
- Refresh token rotation
- Secure password hashing with bcrypt
- Rate limiting on auth endpoints

## Notes
Used jsonwebtoken library for JWT handling
Added 15-minute access token expiry
Refresh tokens stored in httpOnly cookies
```

## Ticket Types

### Feature Tickets

```markdown
# TICKET-002: Add Shopping Cart

## Description
Implement shopping cart functionality with add/remove items and persistence

## Acceptance Criteria
- [ ] Add to cart endpoint
- [ ] Remove from cart endpoint
- [ ] Update quantity endpoint
- [ ] Cart persistence in database
- [ ] Cart summary calculation
```

### Bug Tickets

```markdown
# TICKET-003: Fix Login Timeout

## Description
Users are being logged out after 5 minutes instead of the expected 30 minutes

## Reproduction Steps
1. Log in to the application
2. Wait 5 minutes
3. Try to access protected route
4. User is logged out

## Expected Behavior
Session should last 30 minutes

## Acceptance Criteria
- [ ] Identify root cause
- [ ] Fix token expiry time
- [ ] Add tests for session duration
- [ ] Verify fix in staging
```

### Refactoring Tickets

```markdown
# TICKET-004: Refactor Database Queries

## Description
Optimize database queries in the product service for better performance

## Acceptance Criteria
- [ ] Profile current query performance
- [ ] Implement query optimization
- [ ] Add database indexes
- [ ] Verify performance improvements
```

## Best Practices

### 1. Ticket Granularity

- Keep tickets focused on single features/fixes
- Break large features into multiple tickets
- Each ticket should be completable in 1-3 days

### 2. Clear Acceptance Criteria

- Make criteria specific and testable
- Include edge cases
- Define "done" clearly

### 3. Priority Guidelines

- **High**: Blocking issues, critical features
- **Medium**: Important but not blocking
- **Low**: Nice-to-have, minor improvements

### 4. Ticket Relationships

Link related tickets:

```markdown
## Related Tickets
- Depends on: TICKET-001
- Blocks: TICKET-005
- Related to: TICKET-003
```

## Using with Claude

### Creating Tickets

```
"Create a ticket for adding email notifications"
"Generate tickets for the e-commerce checkout flow"
```

### Working on Tickets

```
"Show me TICKET-001"
"Work on TICKET-002 using the coder agent"
"Update TICKET-003 status to in progress"
```

### Ticket Reviews

```
"Review all open tickets"
"Show me high priority tickets"
"Which tickets are blocking others?"
```

## Integration with Workflows

Tickets integrate with agent orchestration:

1. **Planning Phase**: Planner agent creates tickets
2. **Implementation**: Coder agent works on tickets
3. **Review**: Checker agent validates ticket completion
4. **Documentation**: Update ticket with summary

## Ticket Templates

### Epic Template

For large features spanning multiple tickets:

```markdown
# EPIC-001: User Management System

## Overview
Complete user management with roles and permissions

## Child Tickets
- [ ] TICKET-010: User CRUD operations
- [ ] TICKET-011: Role management
- [ ] TICKET-012: Permission system
- [ ] TICKET-013: User profile UI
- [ ] TICKET-014: Admin dashboard

## Success Criteria
All child tickets completed and integrated
```

### Research Ticket

For investigation tasks:

```markdown
# TICKET-020: Research Payment Providers

## Objective
Evaluate payment provider options for the platform

## Research Areas
- [ ] Stripe capabilities and pricing
- [ ] PayPal integration requirements
- [ ] Regional payment methods
- [ ] PCI compliance requirements

## Deliverables
- Comparison matrix
- Recommendation document
- Implementation estimate
```

## Ticket Metrics

Track progress with:

- Open vs Closed tickets
- Average completion time
- Tickets by priority
- Blocked tickets

Ask Claude: "Show me ticket metrics" or "How many open high-priority tickets do we have?"