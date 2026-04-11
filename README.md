# AiDamsole CRM — Frontend

React 18 + Vite + Tailwind CSS frontend for AiDamsole CRM.

## Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 3 (custom Damsole brand theme)
- **Data Fetching**: TanStack Query v5
- **HTTP Client**: Axios (with JWT interceptors)
- **Routing**: React Router v6
- **Charts**: Chart.js + react-chartjs-2
- **Real-time**: Socket.io client
- **Notifications**: react-hot-toast

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Start dev server

```bash
npm run dev
```

Frontend runs on **http://localhost:3000**

> Make sure the backend is running on port 5000

### 3. Build for production

```bash
npm run build
```

---

## Brand Theme

| Token | Value |
|-------|-------|
| Navy (Primary) | `#0D1B8E` |
| Red (Accent) | `#D32F2F` |
| Navy Dark | `#091466` |
| Navy Light | `#1a2db5` |
| Surface | `#f8f9fc` |

---

## Pages

| Path | Page | Access |
|------|------|--------|
| `/login` | Login | Public |
| `/dashboard` | Dashboard | All |
| `/clients` | Client CRM | All (dept-scoped) |
| `/projects` | Projects | All (dept-scoped) |
| `/tasks` | Tasks (Board + List) | All (dept-scoped) |
| `/departments` | Dept Management + RBAC | Admin only |
| `/team` | Team Members | Manager+ |
| `/reports` | Advanced Reports | All (scoped) |
| `/finance` | Invoices + Finance | Admin only |
| `/chat` | Real-time Chat | All |
| `/settings` | Profile & Security | All |

---

## Key Features

- **Role-aware UI** — Menus and data automatically filter by user role and department
- **Kanban Board** — Drag-free visual task board with status columns
- **Health Score Badges** — Live green/amber/red client health indicators
- **Real-time Chat** — Socket.io powered messaging with online status
- **Advanced Reports** — Financial, client performance, team, operational reports with Chart.js
- **Department RBAC** — Full cross-department isolation enforced at UI level
- **Responsive** — Mobile-first with collapsible sidebar

---

## Project Structure

```
frontend/
├── public/
│   └── logo.png
├── src/
│   ├── assets/
│   │   └── logo.png
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── Header.jsx
│   │   └── ui/
│   │       └── index.jsx        # All reusable components
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   └── SocketContext.jsx
│   ├── pages/
│   │   ├── auth/LoginPage.jsx
│   │   ├── dashboard/DashboardPage.jsx
│   │   ├── clients/ClientsPage.jsx
│   │   ├── projects/ProjectsPage.jsx
│   │   ├── tasks/TasksPage.jsx
│   │   ├── departments/DepartmentsPage.jsx
│   │   ├── reports/ReportsPage.jsx
│   │   ├── finance/FinancePage.jsx
│   │   ├── chat/ChatPage.jsx
│   │   ├── team/TeamPage.jsx
│   │   └── settings/SettingsPage.jsx
│   ├── services/
│   │   └── api.js               # All API calls
│   ├── utils/
│   │   └── helpers.js           # Formatters, color helpers
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```
