# ExamBuddy — Quiz Practice and Question Bank Management

A React and TypeScript quiz application with subject-based practice, progress tracking, question imports, and an administration interface. The interface also uses the name **ExamHelp**.

**Stack:** React 19 · TypeScript · Vite 8 · Express 5 · PostgreSQL

## Features

- Multiple-choice practice with scores and answer explanations.
- Quiz progress saved through an Express API.
- Question imports from JSON, CSV, and text.
- Visit, submission, and import analytics.
- Light and dark themes.

## Architecture

```text
React interface → /api HTTP endpoints → Express → PostgreSQL
```

The filename `src/lib/firebase.ts` is historical: the current module implements HTTP requests and polling, not a Firebase client. `server/db.mjs` creates PostgreSQL tables when the API starts.

## Local development

Use Node.js 22.12+ and PostgreSQL. Create an empty local database named `exambuddy` and configure your own database credentials.

```bash
git clone https://github.com/ChalanaGimhanaX/ExamBuddy.git
cd ExamBuddy
npm ci
```

Copy `.env.example` to `.env`, then start the API with explicit environment loading:

```bash
node --env-file=.env server/index.mjs
```

The API defaults to port `3001`. `npm run dev:api` also starts it, but expects configuration in the process environment.

The frontend uses relative `/api` URLs. For local development, add the following `server` option to the existing `defineConfig` object in `vite.config.ts`:

```ts
server: {
  proxy: {
    '/api': 'http://localhost:3001',
  },
},
```

In a second terminal:

```bash
npm run dev
```

Open the address printed by Vite. The database starts without a question bank; a sample import template is in `src/data/seedData.ts`.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Quiz practice |
| `/admin` | Prototype admin login |
| `/admin/dashboard` | Imports and analytics |
| `GET /api/health` | API health |
| `GET/PUT /api/question-bank` | Read and save questions |
| `GET/PUT /api/analytics` | Read and save analytics |
| `GET/PUT /api/quiz-progress/:visitorId` | Read and save progress |

## Current limitations

This is a learning and portfolio prototype. The admin check runs in browser code and its session is stored in local storage. The API does not currently enforce server-side authentication or authorization on its data endpoints. Do not expose the write endpoints or use real student records until those controls are implemented.

Visitor context is collected for analytics; use synthetic data for demonstrations. Deployment configuration does not establish production readiness.

## Development checks

```bash
npm run lint
npm run build
```

These are verification commands, not a claim that checks pass. API integration tests also require a running local PostgreSQL database.

## Code guide

- `src/pages/`: quiz and administration screens.
- `src/components/`: import interface.
- `src/utils/`: parsing, scoring, progress, and visitor helpers.
- `src/data/seedData.ts`: sample question import data.
- `server/`: Express routes, database schema, and persistence.

## Author

[Chalana Gimhana](https://github.com/ChalanaGimhanaX)
