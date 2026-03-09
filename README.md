# CCF Automation

A Next.js application for automating CCF (Federal Drug Testing Custody and Control Form) management and processing.

## Features

- 🎨 **Modern UI** - Built with shadcn/ui components and the Cosmic Night theme
- 🌓 **Theme Toggle** - Switch between light and dark modes with persistent preferences
- 📊 **Database** - Prisma ORM with SQLite for local data persistence
- 🤖 **AI-Powered PDF Processing** - Google Generative AI extracts data from CCF form PDFs
- 📄 **PDF Storage** - Uploaded PDFs stored locally under `public/uploads`
- 📋 **CCF Records Dashboard** - View, search, filter, sort, and paginate CCF records
- ✏️ **Record Editing** - Full-screen modal for editing individual CCF records
- 📦 **Job Management** - Dedicated jobs page with pagination and filtering
- 📄 **Job Detail Pages** - View all CCF records for a specific job
- 📊 **CSV Export** - Export all CCF records for a job to CSV format
- 🔍 **Advanced Filtering** - Search and date range filters for jobs
- 🧩 **Type-Safe** - Full TypeScript support throughout the application
- ⚡ **Performance** - Next.js 16 with React 19 for optimal performance

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/)
- **React**: 19.2.0
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) with Cosmic Night theme
- **Database**: [Prisma](https://www.prisma.io/) with SQLite
- **AI/ML**: [Google Generative AI](https://ai.google.dev/) (Gemini models)
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm/yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ccf-automation
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up your environment variables:
```bash
cp .env.example .env
```

Add your environment variables (see `.env.example`):
```
DATABASE_URL="file:./dev.db"
GOOGLE_AI_STUDIO_KEY="your-google-ai-studio-api-key"
```

**Where to find these values:**
- **DATABASE_URL**: Use `file:./dev.db` for a local SQLite file (created in project root), or e.g. `file:./prisma/dev.db`
- **GOOGLE_AI_STUDIO_KEY**: Get from [Google AI Studio](https://aistudio.google.com/apikey)

4. Set up the database:
```bash
# Generate Prisma client and run migrations (creates SQLite DB)
pnpm prisma generate
pnpm prisma migrate dev
```

6. (Optional) Seed the database with dummy data:
```bash
pnpm db:seed
```

7. Run the development server:
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

```
ccf-automation/
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── upload/               # PDF upload endpoint
│   │   ├── ccf-forms/            # CCF records CRUD endpoints
│   │   │   └── [id]/             # Individual record endpoints
│   │   └── jobs/                 # Job-related endpoints
│   │       └── [jobKey]/         # Job records endpoint
│   ├── dashboard/                # Dashboard pages
│   │   ├── page.tsx              # CCF records dashboard
│   │   ├── jobs/                 # Jobs management
│   │   │   ├── page.tsx          # Jobs list page
│   │   │   └── [id]/             # Job detail pages
│   │   │       └── page.tsx      # Individual job view
│   │   └── ccf-forms/            # CCF form editing
│   │       └── [id]/edit/        # Edit form pages
│   ├── upload-forms/             # PDF upload page
│   ├── generated/                # Prisma generated client
│   ├── globals.css               # Global styles with theme variables
│   ├── layout.tsx                # Root layout with theme setup
│   └── page.tsx                  # Home/landing page
├── components/                   # React components
│   ├── ccf-records-table.tsx     # Main records table with filters and CSV export
│   ├── jobs-table.tsx            # Jobs list table with pagination and filters
│   ├── ccf-edit-modal.tsx        # Full-screen record editor
│   ├── job-edit-modal.tsx        # Job metadata editor
│   ├── navbar.tsx                # Navigation bar
│   ├── theme-toggle.tsx          # Light/dark mode toggle
│   └── ...
├── lib/                          # Utility functions
│   ├── db-helpers.ts             # Database operations
│   ├── google-ai.ts              # Google AI PDF extraction
│   ├── prisma.ts                 # Prisma client instance
│   └── utils.ts                  # Utility functions
├── prisma/                       # Prisma schema and migrations
│   ├── schema.prisma             # Database schema
│   └── seed.ts                   # Database seeding script
├── scripts/                      # Utility scripts
│   ├── delete-empty-jobs.ts     # Script to delete jobs with no forms
│   └── check-prisma-binaries.js  # Prisma binary checker
└── public/                       # Static assets
```

## Database Models

The application uses two main models:

- **CCFForm** - Federal Drug Testing Custody and Control Forms
  - Contains all form data including donor, client, collector, and MRO information
  - Client, Collector, and MRO data are stored as flattened fields (no foreign keys)
  - Includes `formUrl` field linking to the stored PDF (local path under `/uploads/`)
  - Supports human review tracking with `humanReviewed`, `humanReviewedAt`, and `humanReviewedBy` fields
  - Linked to jobs via `jobId` foreign key

- **Job** - Collection job groupings
  - Groups CCF forms by collection date, collector name, and client name
  - Unique constraint on `(collectionDate, collectorName, clientName)`
  - Includes optional metadata: `startTime`, `endTime`, `miles`
  - One-to-many relationship with CCFForm (one job can have many forms)

The schema is designed for flexibility and ease of use, with job grouping enabling efficient filtering and management of related forms.

## Theme System

The project uses the **Cosmic Night** theme from [tweakcn.com](https://tweakcn.com). The theme includes:

- Light and dark mode variants
- Custom color palette using OKLCH color space
- Consistent design tokens for spacing, shadows, and typography

### Theme Toggle

The theme toggle component (`components/theme-toggle.tsx`) allows users to switch between light and dark modes. The preference is saved to localStorage and persists across sessions.

## Available Scripts

- `pnpm dev` - Start the development server
- `pnpm build` - Build the application for production
- `pnpm start` - Start the production server
- `pnpm lint` - Run ESLint
- `pnpm db:seed` - Seed the database with dummy CCF form data
- `pnpm db:delete-empty-jobs` - Delete all jobs that have no associated forms

## Prisma Commands

- `pnpm prisma generate` - Generate Prisma Client
- `pnpm prisma migrate dev` - Create and apply migrations
- `pnpm prisma studio` - Open Prisma Studio (database GUI)
- `pnpm prisma db push` - Push schema changes to database
- `pnpm db:seed` - Run the seed script to populate database with test data

## Core Features

### PDF Upload & AI Data Extraction

The application allows users to upload CCF form PDFs which are automatically processed:

1. **Upload**: Users can upload PDF files via the `/upload-forms` page
2. **Storage**: PDFs are stored locally under `public/uploads`
3. **AI Extraction**: Google Generative AI (Gemini) extracts structured data from PDFs
4. **Database**: Extracted data is saved to the database with a link to the stored PDF

**API Endpoint**: `POST /api/upload`
- Accepts multipart form data with PDF files
- Returns array of processed form IDs

### CCF Records Dashboard

The dashboard (`/dashboard`) provides comprehensive record management:

- **Pagination**: Navigate through records with configurable page sizes
- **Search**: Search across specimen ID, donor name, employer, collector, and other fields
- **Filtering**: 
  - Filter by review status (Reviewed/Pending)
  - Filter by job (collection date + collector + client)
- **Sorting**: Sort by specimen ID, donor name, employer, collection date, created date, or review status
- **Record Viewing**: Click any record to navigate to the edit page
- **PDF Access**: Direct links to view stored PDFs
- **Job Actions**: When filtered by job, edit job metadata or export to CSV

**API Endpoint**: `GET /api/ccf-forms`
- Query parameters: `page`, `limit`, `sortBy`, `sortOrder`, `search`, `filterReviewed`, `jobKey`
- Special query: `?jobs=true` returns unique job definitions

### Job Management

Jobs are automatically identified as groups of CCF forms that share:
- Same collection date (same day)
- Same collector name
- Same client name

**Jobs Page** (`/dashboard/jobs`):
- View all jobs in a paginated table
- Search jobs by collector or client name
- Filter by date range (Date From/To)
- Click any job to view its detail page
- See job metadata: collection date, collector, client, form count, start/end time, miles

**Job Detail Pages** (`/dashboard/jobs/[id]`):
- View all CCF records for a specific job
- Edit job metadata (start time, end time, miles)
- Export all CCF records for the job to CSV
- Navigate back to jobs list

**CSV Export**:
- Export all CCF records for a job to CSV format
- Filename format: `{Collection Date}-{Employer Name}-{Collector}.csv`
- Includes all CCF fields with proper formatting:
  - First column: "CCF" (Specimen ID)
  - Second column: "Donor" (formatted as "FirstName LastName (LastFourSSN)")
  - Third column: "Date" (Collection Date)
  - Remaining fields in order

**API Endpoints**:
- `GET /api/jobs` - List jobs with pagination and filters
  - Query params: `page`, `limit`, `search`, `dateFrom`, `dateTo`
- `GET /api/jobs/[id]` - Get job details and associated forms
  - Accepts job ID (UUID) or jobKey format: `YYYY-MM-DD|collectorName|clientName`
- `PATCH /api/jobs/[id]` - Update job metadata (startTime, endTime, miles)

### Record Editing

Individual CCF records can be edited through a full-screen modal:

- **Access**: Click any record in the dashboard table
- **Fields**: All form fields are editable
- **Validation**: Form validation ensures data integrity
- **Save**: Changes are persisted immediately

**API Endpoint**: 
- `GET /api/ccf-forms/[id]` - Fetch single record
- `PATCH /api/ccf-forms/[id]` - Update record

### Database Seeding

The seed script (`prisma/seed.ts`) generates realistic dummy data for testing:

- Creates 50 CCF form records
- Includes job groupings (multiple forms with same date/collector/client)
- All records include PDF URLs for testing
- Mix of reviewed and pending records

**Usage**:
```bash
pnpm db:seed
```

### Database Maintenance

**Delete Empty Jobs**:
The script `scripts/delete-empty-jobs.ts` helps clean up jobs that have no associated forms:

```bash
pnpm db:delete-empty-jobs
```

This script will:
- Find all jobs in the database
- Identify jobs with 0 associated forms
- Show you which jobs will be deleted
- Delete only empty jobs (keeps all jobs with forms)
- Display a summary of remaining jobs

Useful for cleaning up after seeding and deleting test data.

## API Endpoints

### Upload
- `POST /api/upload` - Upload and process PDF files

### CCF Forms
- `GET /api/ccf-forms` - List forms with pagination, filtering, and sorting
  - Query params: `page`, `limit`, `sortBy`, `sortOrder`, `search`, `filterReviewed`, `jobKey`
  - Special: `?jobs=true` returns unique job definitions
- `GET /api/ccf-forms/[id]` - Get single form by ID
- `PATCH /api/ccf-forms/[id]` - Update form by ID

### Jobs
- `GET /api/jobs` - List jobs with pagination and filters
  - Query params: `page`, `limit`, `search`, `dateFrom`, `dateTo`
- `GET /api/jobs/[id]` - Get job details and associated forms
  - Accepts job ID (UUID) or jobKey format: `YYYY-MM-DD|collectorName|clientName`
- `PATCH /api/jobs/[id]` - Update job metadata
  - Body: `{ startTime?, endTime?, miles? }`

## Development

### Adding shadcn/ui Components

To add new shadcn/ui components:

```bash
pnpm dlx shadcn@latest add <component-name>
```

### Styling

The project uses Tailwind CSS v4 with the theme variables defined in `app/globals.css`. Use the theme variables in your components:

```tsx
<div className="bg-background text-foreground">
  <button className="bg-primary text-primary-foreground">
    Click me
  </button>
</div>
```

### Google AI Configuration

The application uses Google Generative AI (Gemini) for PDF data extraction. The model used is `gemini-2.5-flash` (configurable in `lib/google-ai.ts`).

**Key Files**:
- `lib/google-ai.ts` - AI extraction logic
- `lib/db-helpers.ts` - Database operations
- `app/api/upload/route.ts` - Upload endpoint

### Local PDF Storage

Uploaded PDFs are written to `public/uploads/` and referenced by path (e.g. `/uploads/filename.pdf`). Ensure the directory exists (it is created automatically on first upload).

**Key Files**:
- `app/api/upload/route.ts` - Handles PDF upload and local file write

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## License

Private project - All rights reserved
