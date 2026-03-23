# TICKET-009: Implement Web UI Dashboard Similar to aitmpl.com

## Description
Create a web-based UI dashboard for ccsetup that provides visual template browsing, project management, analytics, and health check capabilities similar to aitmpl.com. This will complement the CLI with a modern web interface for enhanced user experience and project monitoring.

## Problem Statement
Currently, ccsetup is CLI-only, which limits:
1. Visual browsing and discovery of templates
2. Project monitoring and analytics capabilities
3. Real-time health checks and diagnostics
4. User engagement and ease of use for non-CLI users
5. Ability to manage multiple projects from one interface

## Proposed Solution
Build a web UI that provides:
1. Visual template marketplace/browser
2. Project dashboard with analytics
3. Real-time monitoring of Claude Code sessions
4. System health checks and diagnostics
5. Project management interface
6. Template preview and documentation viewer

## Acceptance Criteria
- [ ] Create web server module for ccsetup
- [ ] Implement template browsing UI with filtering/search
- [ ] Add project dashboard with session analytics
- [ ] Create health check interface with diagnostics
- [ ] Build project management capabilities
- [ ] Add real-time monitoring for active sessions
- [ ] Implement template preview and documentation viewer
- [ ] Create REST API for dashboard data
- [ ] Add authentication for multi-user support
- [ ] Support both local and remote access modes
- [ ] Create responsive design for mobile access
- [ ] Add `ccsetup ui` command to launch dashboard

## Technical Implementation

### 1. Architecture Overview
```
ccsetup-ui/
├── server/
│   ├── index.js           # Express server
│   ├── api/               # REST API endpoints
│   │   ├── templates.js
│   │   ├── projects.js
│   │   ├── analytics.js
│   │   └── health.js
│   ├── websocket/         # Real-time updates
│   └── middleware/        # Auth, logging, etc
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Templates.jsx
│   │   │   ├── Analytics.jsx
│   │   │   └── HealthCheck.jsx
│   │   ├── components/
│   │   └── services/
│   └── public/
└── shared/
    └── types/
```

### 2. Dashboard Features

#### Template Browser
```jsx
// Visual template marketplace
<TemplateBrowser>
  <FilterBar categories={['Agents', 'Commands', 'MCPs']} />
  <SearchBox placeholder="Search templates..." />
  <TemplateGrid>
    <TemplateCard
      icon="🤖"
      title="Strategic Planner"
      description="AI agent for planning"
      tags={['planning', 'architecture']}
      installs={1234}
      rating={4.8}
    />
  </TemplateGrid>
</TemplateBrowser>
```

#### Analytics Dashboard
```jsx
// Real-time session monitoring
<AnalyticsDashboard>
  <MetricCards>
    <MetricCard title="Active Sessions" value={12} trend="+5%" />
    <MetricCard title="Commands Run" value={456} />
    <MetricCard title="Agents Used" value={89} />
  </MetricCards>
  
  <SessionChart data={sessionHistory} />
  <AgentUsageChart data={agentUsage} />
  <CommandFrequency data={commandStats} />
</AnalyticsDashboard>
```

#### Health Check Interface
```jsx
// System diagnostics
<HealthCheck>
  <SystemStatus>
    <StatusItem name="Claude API" status="healthy" latency="120ms" />
    <StatusItem name="File System" status="healthy" usage="45%" />
    <StatusItem name="Dependencies" status="warning" outdated={3} />
  </SystemStatus>
  
  <DiagnosticTools>
    <TestRunner />
    <DependencyChecker />
    <PerformanceProfiler />
  </DiagnosticTools>
</HealthCheck>
```

### 3. API Endpoints
```javascript
// Template API
GET /api/templates
GET /api/templates/:id
GET /api/templates/search?q=:query
POST /api/templates/install

// Analytics API
GET /api/analytics/sessions
GET /api/analytics/usage
GET /api/analytics/commands
WS /api/analytics/stream

// Health API
GET /api/health/status
GET /api/health/diagnostics
POST /api/health/run-check

// Project API
GET /api/projects
GET /api/projects/:id
POST /api/projects/create
PUT /api/projects/:id/config
```

### 4. CLI Integration
```bash
# Launch UI dashboard
$ ccsetup ui [--port 3000] [--open]

Starting ccsetup dashboard...
✅ Dashboard running at http://localhost:3000
Opening in browser...

# Run in background
$ ccsetup ui --daemon
✅ Dashboard started in background (PID: 12345)

# Stop dashboard
$ ccsetup ui --stop
✅ Dashboard stopped
```

### 5. Real-time Monitoring
```javascript
// WebSocket integration for live updates
class SessionMonitor {
  constructor() {
    this.sessions = new Map();
    this.io = socketIO(server);
  }
  
  trackCommand(sessionId, command) {
    this.sessions.get(sessionId).commands.push({
      command,
      timestamp: Date.now(),
      status: 'running'
    });
    
    this.io.emit('command:start', { sessionId, command });
  }
  
  trackAgent(sessionId, agent, task) {
    this.io.emit('agent:active', { sessionId, agent, task });
  }
}
```

### 6. UI Components Design
```
┌─────────────────────────────────────────────┐
│  ccsetup Dashboard                    [User] │
├─────────────────────────────────────────────┤
│ 📊 Overview  📦 Templates  📈 Analytics  🔧  │
├─────────────────────────────────────────────┤
│                                             │
│  Active Projects                            │
│  ┌─────────────┐ ┌─────────────┐           │
│  │ my-api      │ │ react-app   │           │
│  │ 3 sessions  │ │ 1 session   │           │
│  │ ● Running   │ │ ○ Idle      │           │
│  └─────────────┘ └─────────────┘           │
│                                             │
│  Quick Stats                                │
│  ├─ Commands Today: 145                     │
│  ├─ Agents Used: 23                         │
│  └─ Success Rate: 98.5%                     │
│                                             │
│  Recent Activity                            │
│  10:23 AM - Planner agent completed task   │
│  10:15 AM - Running npm test                │
│  10:12 AM - Coder agent started            │
└─────────────────────────────────────────────┘
```

## Example User Flows

### Launching Dashboard
```bash
$ ccsetup ui --open

🚀 Starting ccsetup dashboard...
📡 Server running on http://localhost:3000
🌐 Opening in default browser...

Dashboard Features:
- Template Browser: Browse and install templates
- Analytics: Monitor your Claude Code usage
- Health Check: System diagnostics and optimization
- Project Manager: Manage multiple projects

Press Ctrl+C to stop the dashboard
```

### Using Template Browser
1. Open dashboard → Templates tab
2. Filter by category or search
3. Click template for details
4. Preview template content
5. Click "Install" → Select project
6. Template added to project

### Monitoring Active Session
1. Start coding with Claude Code
2. Dashboard shows real-time:
   - Commands being executed
   - Agents currently active
   - Files being modified
   - Error/success status
3. Click session for detailed logs
4. Export analytics data

## Benefits
- **Visual Interface**: Easier template discovery and management
- **Real-time Monitoring**: Track Claude Code sessions live
- **Analytics**: Understand usage patterns and productivity
- **Health Monitoring**: Proactive system maintenance
- **Accessibility**: Opens ccsetup to non-CLI users
- **Project Management**: Handle multiple projects efficiently

## Technical Stack
- **Backend**: Node.js, Express, Socket.IO
- **Frontend**: React, TailwindCSS, Recharts
- **Database**: SQLite for local storage
- **Build**: Vite for fast development
- **UI Library**: shadcn/ui components

## Priority
High

## Status
Todo

## Dependencies
- TICKET-008 (Template selection system)
- Express.js for web server
- React for UI framework
- Socket.IO for real-time updates
- SQLite for local data storage

## Notes
- Consider electron wrapper for desktop app version
- Could add cloud sync for multi-device access
- Template ratings/reviews for future enhancement
- Integration with VS Code extension possible
- Consider Progressive Web App (PWA) support

## Implementation Phases
1. **Phase 1**: Basic web server and template browser
2. **Phase 2**: Analytics and monitoring
3. **Phase 3**: Health checks and diagnostics
4. **Phase 4**: Advanced features (auth, cloud sync)

## Related
- Complements CLI interface
- Enhances TICKET-008 template system
- Inspired by aitmpl.com dashboard features