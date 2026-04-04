# Water Meter Management System

This repository contains a water meter reading management project with admin and staff workflows for handling reading lists, assignments, and meter record entry.

## Project Overview

- `app/` contains the current React + TypeScript frontend application.
- `water-meter-system/` contains the broader project structure and supporting backend/frontend implementation files.

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
