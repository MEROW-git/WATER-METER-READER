<h1 align="center">💧 Water Meter Management System</h1>

<p align="center">
  A modern web-based system for managing water meter readings, assignments, and reporting workflows.
</p>

---

## Overview

This project provides a complete solution for handling water meter operations:

- Admins can upload and manage reading lists
- Staff can input and track meter readings
- System automatically organizes data and generates reports

## 📂 Project Structure

---

```bash
water-meter-management-system/
│
├── 📄 README.md
│   └── Project overview and setup instructions
│
├── 🚀 app/                               # Primary React frontend (active application)
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/                  # Layout components (e.g., MainLayout)
│   │   │   └── ui/                      # Reusable UI components (shadcn/ui)
│   │   │
│   │   ├── context/                     # Global state management (AuthContext, etc.)
│   │   ├── hooks/                       # Custom React hooks
│   │   ├── lib/                         # Utilities, API clients, helpers
│   │   │
│   │   ├── pages/
│   │   │   ├── admin/                   # Admin dashboard & management pages
│   │   │   └── staff/                   # Staff workflows (reading entry, records)
│   │   │
│   │   ├── types/                       # TypeScript type definitions
│   │   ├── App.tsx                      # Root React component
│   │   ├── main.tsx                     # Application entry point
│   │   └── index.css                    # Global styles
│   │
│   ├── package.json                     # Frontend dependencies
│   ├── vite.config.ts                   # Vite configuration
│   ├── tailwind.config.js               # Tailwind CSS configuration
│   └── index.html                       # HTML template
│
└── ⚙️ water-meter-system/               # Full-stack implementation
    │
    ├── backend/                         # Node.js + Express API server
    │   ├── middleware/                  # Auth, error handling, rate limiting
    │   ├── prisma/                      # Database schema, migrations, seed data
    │   ├── routes/                      # API endpoints and controllers
    │   ├── uploads/                     # Uploaded files storage
    │   ├── package.json                 # Backend dependencies
    │   └── server.js                    # Server entry point
    │
    ├── frontend/                        # Alternative React frontend
    │   ├── src/                         # Mirrors structure of app/src/
    │   ├── package.json
    │   └── ⚙️ config files              # Build & styling configs
    │
    ├── 📘 PROJECT_SUMMARY.md            # Detailed project documentation
    ├── 📄 README.md                     # Setup and usage guide
    ├── 🛠️ setup.sh                     # Environment setup script
    └── ▶️ start.sh                      # Start frontend + backend
```
---

## Main Features

- Role-based login for admin and staff users
- Reading list and assignment management
- Meter record entry and reading history
- Report and activity tracking
- Excel import workflow for meter data

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Node.js
- Express
- PostgreSQL / Prisma

## Getting Started

Clone the repository and install dependencies inside the project folders you want to run.

Example:

```bash
cd app
npm install
npm run dev
```

For the fuller backend/frontend setup, see:

- `water-meter-system/README.md`
- `app/README.md`

## Notes

- Do not commit `.env` files or secret keys.
- If you use Supabase, make sure Row Level Security policies are configured before production use.
