bash
```
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
