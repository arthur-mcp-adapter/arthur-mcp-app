# Contributing to Arthur MCP

Thanks for your interest in improving Arthur MCP. This guide covers how to get set up and submit changes.

## Project structure

This is a monorepo:
- Root — React/Vite frontend
- `api/` — NestJS backend (SQLite by default, MongoDB optional via `DATABASE` env var)

## Getting started

```bash
# Install dependencies (frontend + backend)
npm install
npm install --prefix api

# Run both frontend and backend in dev mode
npm run dev
```

Frontend only: `npm run start:dev`
Backend only: `npm run start:dev --prefix api`

## Before submitting a change

Run the checks relevant to what you touched:

```bash
# Frontend
npm run type-check
npm run test

# Backend
npm run test --prefix api
npm run test:e2e --prefix api
```

## Pull requests

1. Fork the repo and create a branch from `main`.
2. Keep changes focused — one concern per PR.
3. Make sure type-checking and tests pass.
4. Describe what changed and why in the PR description.
5. Link any related issue.

## Reporting bugs

Open a GitHub issue with steps to reproduce, expected vs. actual behavior, and relevant logs or screenshots.

## Code style

Follow the existing patterns in the file/module you're editing (naming, structure, error handling). Don't introduce new abstractions or refactor unrelated code as part of a bug fix or feature PR.
