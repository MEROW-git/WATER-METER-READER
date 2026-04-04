# Water Meter Reading Management System

A comprehensive web-based system for managing water meter readings with role-based access control, Excel import capabilities, and assignment management.

## Features

### Authentication & Security
- JWT-based authentication with bcrypt password hashing
- Role-based access control (Admin & Staff)
- Protected API routes
- Password reset functionality

### Admin Features
- **Dashboard**: Overview statistics, progress tracking, recent activity
- **User Management**: Create, edit, activate/deactivate staff users
- **Excel Upload**: Drag-and-drop Excel file import with automatic parsing
- **List Management**: View, hide, archive, delete reading lists
- **Assignment Management**: Assign locations to staff (single, bulk, or all-at-once)
- **Reports**: Staff performance tracking, activity logs

### Staff Features
- **My Records**: View assigned meter records with filters
- **Quick Entry Form**: Fast data entry with keyboard shortcuts
- **Reading Validation**: Ensures new reading >= old reading
- **History**: View completed readings with statistics

## Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT + bcrypt
- **File Upload**: Multer
- **Excel Parsing**: xlsx

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: React Context
- **HTTP Client**: Axios
- **Routing**: React Router DOM

## Project Structure

```
water-meter-system/
├── backend/
│   ├── middleware/
│   │   ├── auth.js          # JWT authentication middleware
│   │   └── errorHandler.js  # Global error handling
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── seed.js          # Seed data (admin & staff users)
│   ├── routes/
│   │   ├── auth.js          # Authentication routes
│   │   ├── users.js         # User management routes
│   │   ├── lists.js         # Reading list routes
│   │   ├── records.js       # Meter record routes
│   │   ├── assignments.js   # Assignment routes
│   │   └── reports.js       # Report routes
│   ├── uploads/             # Uploaded Excel files
│   ├── .env                 # Environment variables
│   ├── package.json
│   └── server.js            # Main server entry
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── layout/
    │   │   │   └── MainLayout.tsx
    │   │   └── ui/           # shadcn/ui components
    │   ├── context/
    │   │   └── AuthContext.tsx
    │   ├── lib/
    │   │   ├── api.ts        # API client
    │   │   └── utils.ts      # Utility functions
    │   ├── pages/
    │   │   ├── admin/        # Admin pages
    │   │   │   ├── Dashboard.tsx
    │   │   │   ├── Users.tsx
    │   │   │   ├── Upload.tsx
    │   │   │   ├── Lists.tsx
    │   │   │   ├── Assignments.tsx
    │   │   │   └── Reports.tsx
    │   │   ├── staff/        # Staff pages
    │   │   │   ├── MyRecords.tsx
    │   │   │   ├── EnterReading.tsx
    │   │   │   └── History.tsx
    │   │   └── Login.tsx
    │   ├── types/
    │   │   └── index.ts      # TypeScript types
    │   ├── App.tsx
    │   └── main.tsx
    ├── .env
    └── package.json
```

## Setup Instructions

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

### 1. Database Setup

Create a PostgreSQL database:

```sql
CREATE DATABASE water_meter_db;
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Set up environment variables
# Edit .env file with your database credentials:
DATABASE_URL="postgresql://username:password@localhost:5432/water_meter_db?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
PORT=5000

# Run Prisma migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Seed database with sample users
npm run prisma:seed
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Set up environment variables
# Edit .env file:
VITE_API_URL=http://localhost:5000/api

# Start development server
npm run dev
```

### 4. Running the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## Default Login Credentials

| Role   | Username | Password  |
|--------|----------|-----------|
| Admin  | admin    | admin123  |
| Staff  | staff1   | staff123  |
| Staff  | staff2   | staff123  |
| Staff  | staff3   | staff123  |

## Excel File Format

The system expects Excel files with the following columns:

| Column      | Required | Description                    |
|-------------|----------|--------------------------------|
| meter_id    | Yes      | Unique meter identifier        |
| customer    | Yes      | Customer name                  |
| Location ID | Yes      | Location for assignment        |
| Name_ID     | No       | Customer ID                    |
| St          | No       | Street address                 |
| village     | No       | Village/area name              |
| Date        | No       | Reading date                   |
| old_read    | No       | Previous reading               |
| new_read    | No       | Current reading (empty = pending) |
| Text34      | No       | Additional notes               |

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password

### Users (Admin only)
- `GET /api/users` - List all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `PATCH /api/users/:id/status` - Activate/deactivate user
- `POST /api/users/:id/reset-password` - Reset password
- `DELETE /api/users/:id` - Delete user

### Lists
- `GET /api/lists` - List all reading lists
- `GET /api/lists/:id` - Get list details
- `POST /api/lists/upload` - Upload Excel file
- `PATCH /api/lists/:id/hide` - Hide/unhide list
- `PATCH /api/lists/:id/archive` - Archive list
- `PATCH /api/lists/:id/reopen` - Reopen list
- `DELETE /api/lists/:id` - Delete list

### Records
- `GET /api/records` - List records (with filters)
- `GET /api/records/:id` - Get record details
- `GET /api/records/pending/me` - Get pending records for current user
- `GET /api/records/completed/me` - Get completed records for current user
- `PATCH /api/records/:id/new-read` - Update reading
- `GET /api/records/locations/:listId` - Get locations for list

### Assignments (Admin only)
- `POST /api/assignments/location` - Assign single location
- `POST /api/assignments/bulk-location` - Assign multiple locations
- `POST /api/assignments/assign-all-to-staff` - Assign all locations
- `POST /api/assignments/reassign` - Reassign locations
- `DELETE /api/assignments/location` - Remove assignment

### Reports (Admin only)
- `GET /api/reports/dashboard` - Dashboard statistics
- `GET /api/reports/list-progress` - List progress
- `GET /api/reports/staff-progress` - Staff progress
- `GET /api/reports/location-progress/:listId` - Location progress
- `GET /api/reports/activity-logs` - Activity logs

## Business Rules

1. **Staff Access**: Staff can only see records assigned to them
2. **Admin Access**: Admins can see all records and manage the system
3. **Reading Validation**: New reading cannot be lower than old reading
4. **Auto-Complete**: When a record gets a new_read value, it's marked as completed
5. **Hidden Lists**: Hidden lists are not visible to staff
6. **Assignment**: Records are assigned by Location ID
7. **Bulk Assignment**: Admin can assign all locations from a list to one staff at once

## Keyboard Shortcuts (Staff Entry Form)

- `Enter` - Save reading and move to next record
- `Tab` - Navigate between fields

## Development

### Adding New Features

1. **Backend**: Add routes in appropriate route file
2. **Frontend**: Create page components in `src/pages/`
3. **Types**: Update types in `src/types/index.ts`
4. **API**: Add API functions in `src/lib/api.ts`

### Database Migrations

```bash
# Create new migration
npx prisma migrate dev --name migration_name

# Reset database
npx prisma migrate reset

# Generate client
npx prisma generate
```

## License

MIT License
