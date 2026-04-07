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



water-me
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
