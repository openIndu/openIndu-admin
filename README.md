# openIndu Admin

> **Language:** English | [中文](README_ZH.md)

## What is it?

openIndu Admin is the unified management dashboard for the [openIndu](https://openindu.com) open industrial automation ecosystem platform. It provides authenticated users (with role-based access) a centralized interface for content management, user administration, knowledge base operations, and system monitoring.

## Tech Stack

| Layer          | Technology                       |
| -------------- | -------------------------------- |
| Framework      | React 18                         |
| Language       | TypeScript 5.6                   |
| Build Tool     | Vite 6                           |
| Styling        | Tailwind CSS 4 + shadcn/ui       |
| Routing        | React Router 7                   |
| Data Fetching  | TanStack React Query 5           |
| HTTP Client    | Axios                            |
| Maps           | react-simple-maps                |
| Unit Testing   | Vitest                           |
| E2E Testing    | Playwright                       |

## Quick Start

### Prerequisites

- Node.js 20+
- npm
- Running [openIndu Backend](https://github.com/openIndu/openIndu-backend) (API on `localhost:8004`)

### Development

```bash
# 1. Clone the repo
git clone https://github.com/openIndu/openIndu-admin.git
cd openIndu-admin

# 2. Install dependencies
npm install

# 3. Start dev server (port 3001)
npm run dev
```

The dev server proxies `/api` requests to `http://localhost:8004` automatically.

### Build for Production

```bash
npm run build    # Output to dist/
npm run preview  # Preview production build
```

Copy `.env.example` to `.env` for local overrides. Real credentials must never
be committed; `.env` variants are ignored by Git.

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow. Please
report vulnerabilities through GitHub's private vulnerability reporting flow
as described in [SECURITY.md](SECURITY.md), rather than a public issue.

### Docker

```bash
docker build -t openindu-admin .
docker run -p 3001:80 openindu-admin
```

## Project Structure

```
openIndu-admin/
├── src/
│   ├── app/
│   │   ├── App.tsx         # Root component
│   │   ├── routes.tsx      # Route definitions
│   │   ├── pages/          # Page components
│   │   └── components/     # Shared UI components
│   ├── api/
│   │   └── index.ts        # API client (Axios instance)
│   ├── store/
│   │   └── auth.ts         # Auth state management
│   ├── lib/
│   │   └── clientIdentity.ts  # Client fingerprinting
│   ├── styles/
│   │   └── index.css       # Global styles (Tailwind)
│   └── main.tsx            # Application entry point
├── e2e/                    # Playwright E2E tests
├── public/                 # Static assets
├── Dockerfile
├── nginx.conf              # Nginx config (Docker)
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
└── package.json
```

## License

[Apache-2.0](LICENSE)
