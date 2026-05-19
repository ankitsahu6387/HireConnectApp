# Hire Connect Frontend

Hire Connect is an Angular job portal frontend for candidates and employers. Candidates can browse jobs and manage applications, while employers can post jobs, view applicants, manage subscriptions, and review analytics.

## Tech Stack

- Angular 21
- TypeScript
- Tailwind CSS
- RxJS
- Jest

## Features

- Login, registration, OTP flows, and JWT-based sessions
- Google and GitHub OAuth login
- Public job dashboard with search filters
- Job details and application flow
- Candidate dashboard for submitted applications
- Employer dashboard for posted jobs
- Job posting, editing, and deletion
- Notifications page with unread counts
- User profile page
- Analytics page
- Subscription and payment integration

## Prerequisites

- Node.js
- npm
- Backend API running at `http://localhost:8080`

## Installation

```bash
npm install
```

## Run Locally

```bash
npm start / ng serve
```

Then open:

```text
http://localhost:4200
```

## Build

```bash
npm run build
```

The production build is created in the Angular `dist/` output folder.

## Tests

```bash
npm test
```

Runs Jest tests with coverage.

```bash
npm run test:watch
```

Runs Jest in watch mode.

## Environment

The API URL is configured in:

```text
src/environments/environment.ts
```

Default configuration:

```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080'
};
```

Change `apiUrl` if your backend uses a different URL.

## Important Routes

- `/jobs` - public job dashboard
- `/job/:id` - job details
- `/login` - login page
- `/register` or `/signup` - registration page
- `/my-applications` - candidate dashboard
- `/my-jobs` - employer dashboard
- `/post-job` - create a job post
- `/notifications` - user notifications
- `/profile` - user profile
- `/analytics` - analytics
- `/subscription` - subscription page
