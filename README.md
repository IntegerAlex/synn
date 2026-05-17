# Synn 

![Synn Header](public/logo.png) <!-- Update with actual banner if available -->

> A comprehensive Git interface and repository intelligence platform powered by GitHub APIs.

Synn has evolved from a simple repository visualization tool into a fully-featured Git interface. By deeply integrating with GitHub's infrastructure and APIs, Synn allows developers to explore, analyze, and understand codebases in a visually immersive, highly interactive environment.

---

## 🚀 Key Features

### 🌐 Deep GitHub Integration
Synn acts as a first-class client for your GitHub repositories. Authenticate securely via Clerk and instantly sync your public and private repositories, branches, commits, pull requests, and issues without manual cloning.

### 📊 Advanced Repository Dashboard
Navigate your projects through a stunning, full-page grid layout. 
- **Smart Filtering:** Toggle between all, public, and private repositories.
- **Dynamic Sorting:** Order by recent updates, star count, or alphabetically.
- **Instant Search:** Search across repository names, descriptions, and owners instantly.

### 🌳 Immersive Git Visualization
Understand complex branch histories at a glance.
- Interactive, zoomable graph visualization powered by Cytoscape.js.
- Visual mapping of merge commits, branch offshoots, and tags.
- Dynamic highlighting of active branches and commit paths.

### 💻 Deep Code Exploration
Go beyond surface-level metrics and dive into the code.
- **File Explorer:** Browse the complete repository tree for any branch or commit.
- **Rich Diff Viewer:** Analyze semantic diffs, side-by-side changes, and token-level modifications.
- **File History:** Track the evolution of individual files over time.

### 📈 Insights & Intelligence
Gain a macro view of project health and team dynamics.
- Track commit activity and contributor statistics over time.
- Integrated tracking of GitHub Issues and Pull Requests.

### 🛡️ Enterprise-Grade Admin & Audit
Built-in security and telemetry for complete oversight.
- **Live Access Logs:** Track user authentication, repository access, and system events.
- **API Tracing:** Monitor backend requests, latencies, and status codes.
- **Anomaly Detection:** Automated alerts for suspicious activity or unauthorized access patterns.
- Password-gated admin dashboard with CSV export capabilities.

---

## 🛠️ Technology Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS & Lucide Icons
- **State Management:** Zustand
- **Data Fetching & Caching:** TanStack Query
- **Authentication:** Clerk
- **Database:** Neon Serverless Postgres + Drizzle ORM
- **Visualization:** Cytoscape.js

---

## 📦 Getting Started

### Prerequisites
- Node.js 18+ (or compatible environment like Bun/pnpm)
- Neon Serverless Postgres (or compatible database)
- Clerk Account (for authentication)
- GitHub OAuth App (configured via Clerk)

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/synn.git
cd synn
```

### 2. Install dependencies
```bash
npm install
# or
pnpm install
```

### 3. Environment Configuration
Copy the example environment file and fill in your credentials.

```bash
cp .env.example .env
```
Ensure you provide your **Database URL** and **Clerk API Keys**. Refer to the inline comments in `.env.example` for guidance.

### 4. Database Setup
Run the Drizzle migrations to set up your Neon Postgres schema.

```bash
npm run db:push
# or appropriate migration script depending on your package.json
```

### 5. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

---

## 🏗️ Architecture
Synn utilizes a robust frontend-heavy architecture, shifting the visualization load to the client (Cytoscape/React) while relying on Next.js API routes as a secure proxy to GitHub APIs. 

For more details on the system design, check out our [ARCHITECTURE.md](./ARCHITECTURE.md) (if applicable).

---

## 🛡️ Security

Security is a core focus of Synn. All API keys and sensitive operations are proxied through secure backend routes. Rate limiting, fingerprinting, and automated anomaly detection protect the platform against abuse. 

Please see [SECURITY.md](./SECURITY.md) for our vulnerability reporting guidelines.

---

## 📜 License & Credits

© 2026 Synn. All rights reserved. 
- Created by [Akshat Kotpalliwar](https://www.akshatkotpalliwar.in/)
- Supported by [GOSSORG](https://www.gossorg.in/)
