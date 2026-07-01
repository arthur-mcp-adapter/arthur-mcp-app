# Claude Code Agents

This directory contains specialist agent definitions for Claude Code. Keep this index updated whenever an agent is added, renamed, or removed.

## How To Use This Directory

- Use the specialist whose scope matches the task.
- Read the relevant agent file before relying on its guidance.
- Keep all agent documentation in English.
- Treat these agents as project context, not as a replacement for reading the current code.
- Treat permissions as a mandatory part of every feature. Any new page, tab, API endpoint, integration, credential surface, settings panel, or user action must explicitly reuse an existing permission or add a new permission across backend, frontend, role presets, UI gates, tests, and documentation.

## Available Specialists

| Agent | File | Use When |
|---|---|---|
| `backend-test-engineer` | `.claude/agents/backend-test-engineer.md` | Writing, reviewing, debugging, and improving backend tests for NestJS services, controllers, guards, repositories, DTOs, and API/e2e flows. |
| `cloud-expert` | `.claude/agents/cloud-expert.md` | Designing or reviewing AWS, GCP, or Azure architecture; cloud security; managed services; cost control; Well-Architected reviews. |
| `compliance-counsel` | `.claude/agents/compliance-counsel.md` | Reviewing software licenses, dependency obligations, attribution, distribution risk, contributor policies, and compliance/legal notes. |
| `developer-advocate` | `.claude/agents/developer-advocate.md` | Creating developer quickstarts, demos, examples, launch content, DX reviews, and community feedback loops. |
| `devops-expert` | `.claude/agents/devops-expert.md` | Creating or reviewing CI/CD, GitHub Actions, deploy automation, infrastructure scripts, monitoring, logging, or operational workflows. |
| `docker-compose-expert` | `.claude/agents/docker-compose-expert.md` | Writing, reviewing, or debugging Docker Compose files, service dependencies, networks, volumes, environment variables, and healthchecks. |
| `docker-expert` | `.claude/agents/docker-expert.md` | Writing, reviewing, or debugging Dockerfiles, multi-stage builds, image size, container security, and production image practices. |
| `frontend-test-engineer` | `.claude/agents/frontend-test-engineer.md` | Writing, reviewing, debugging, and improving frontend tests for React pages, feature components, hooks, API client behavior, routing, permissions, i18n, forms, and user-visible flows with Vitest and React Testing Library. |
| `gof-expert` | `.claude/agents/gof-expert.md` | Choosing, reviewing, naming, or refactoring toward Gang of Four design patterns without over-engineering. |
| `nestjs-expert` | `.claude/agents/nestjs-expert.md` | Creating, reviewing, or refactoring NestJS modules, controllers, services, DTOs, guards, interceptors, persistence, authentication, and tests. |
| `oss-scout` | `.claude/agents/opensource-expert.md` | Researching, comparing, or choosing open source libraries, frameworks, and tools using current project health signals. |
| `product-owner` | `.claude/agents/project-owner.md` | Writing user stories, acceptance criteria, product specs, backlog prioritization, MVP scope, and requirements documentation. |
| `react-frontend-engineer` | `.claude/agents/react-frontend-engineer.md` | Implementing, debugging, refactoring, and testing React/TypeScript frontend features using Feature-Driven Architecture, Atomic Design, controlled barrel exports, hooks, forms, routes, API integration, i18n, and state. |
| `render-expert` | `.claude/agents/render-expert.md` | Configuring, optimizing, or debugging Render.com deployments, `render.yaml`, environment variables, health checks, and service setup. |
| `software-architect` | `.claude/agents/software-architect.md` | Designing or reviewing architecture, module boundaries, data modeling, integration strategy, cross-cutting patterns, and technical roadmap decisions. |
| `software-engineer` | `.claude/agents/software-engineer.md` | Implementing, debugging, refactoring, and testing full-stack features across frontend, backend, persistence, and documentation. |
| `solid-expert` | `.claude/agents/solid-expert.md` | Reviewing responsibilities, interfaces, dependency direction, substitutability, extensibility, and maintainability against SOLID principles. |
| `system-tutor` | `.claude/agents/system-tutor.md` | Creating user-facing tutorials, walkthroughs, section guides, onboarding paths, and product explanations for Arthur MCP. |
| `ui-expert` | `.claude/agents/ui-expert.md` | Creating, redesigning, or reviewing React, TypeScript, and MUI UI components/pages in the project's "openclaw" style while respecting Feature-Driven Architecture, Atomic Design, and barrel exports. |
| `ux-analyst` | `.claude/agents/ux-analyst.md` | Auditing user journeys, usability, onboarding, friction points, empty/error/loading states, and user-facing flows while respecting frontend feature boundaries and shared UI conventions. |
| `vercel-expert` | `.claude/agents/vercel-expert.md` | Configuring, optimizing, or debugging Vercel deployments, `vercel.json`, environment variables, domains, previews, and frontend hosting. |
| `tool-instructor` | `.claude/agents/tool-instructor.md` | Writing user-facing copy: tooltips, helper text, empty states, error messages, onboarding guides, and in-app documentation for Arthur MCP. |
| `naming-expert` | `.claude/agents/naming-expert.md` | Naming variables, functions, components, routes, API endpoints, DB columns, MCP tools, prompts, and UI labels — consistently and clearly across the full stack. |

## Suggested Routing

- Product scope, backlog, or acceptance criteria: `product-owner`.
- Backend unit, integration, guard, repository, DTO, or e2e tests: `backend-test-engineer`.
- Frontend component, page, hook, API client, permission, routing, i18n, or form tests: `frontend-test-engineer`.
- Software licenses, dependency obligations, attribution, or compliance risk: `compliance-counsel`.
- Developer adoption, demos, examples, quickstarts, launch content, or DX feedback: `developer-advocate`.
- React/TypeScript frontend implementation, Feature-Driven Architecture, Atomic Design, barrel exports, hooks, forms, routes, state, or API integration: `react-frontend-engineer`.
- Frontend implementation, visual polish, shared UI composition, Atomic Design, or openclaw component review: `ui-expert`.
- Flow quality before shipping a user-facing feature, including journey fit across pages, features, and shared UI: `ux-analyst`.
- Backend API/module work: `nestjs-expert`.
- Gang of Four design pattern choice, naming, or misuse review: `gof-expert`.
- SOLID responsibility, interface, substitutability, or dependency direction review: `solid-expert`.
- Docker image work: `docker-expert`.
- Local or production Compose orchestration: `docker-compose-expert`.
- Render deployment: `render-expert`.
- Vercel deployment: `vercel-expert`.
- Cloud architecture or provider choice: `cloud-expert`.
- CI/CD and operations: `devops-expert`.
- Library/tool selection: `oss-scout`.
- User-facing copy, tooltips, empty states, or onboarding instructions: `tool-instructor`.
- Tutorials, section explanations, user manuals, or product education: `system-tutor`.
- Naming a variable, component, route, tool, or any identifier: `naming-expert`.
- Full-stack implementation or bug fixing: `software-engineer`.
- Architecture, module boundaries, data model direction, or cross-cutting decisions: `software-architect`.
- Permission model changes or feature permission gaps: coordinate `software-architect`, `software-engineer`, `nestjs-expert`, `react-frontend-engineer`, and `backend-test-engineer` as needed.
