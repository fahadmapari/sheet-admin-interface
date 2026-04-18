<img width="1919" height="938" alt="image" src="https://github.com/user-attachments/assets/3b3ecd97-ff12-48ad-9334-ec8433ed0f34" />

# Sheet Admin

A Next.js admin application for managing tour products, built for travel operations teams. Google Sheets is the primary data store, with MongoDB handling workflow state and notifications.

## What It Does

Sheet Admin provides a web interface to view, edit, and manage tour product data stored in a shared Google Sheets document ("NET RATES"). It adds a structured workflow layer on top of raw spreadsheet data — with batch assembly tracking, export tools, shareable links, and role-based access control.

## Features

### Product Management
- Browse all tour products in a paginated, filterable data table (70+ fields per product)
- Inline editing of any product field, written back directly to Google Sheets
- Column grouping and custom display name mapping
- Filter products by destination, supplier, type, and other attributes
- Virtual scrolling for performance with large datasets

### Written Products
- Dedicated view for products that have been written/described
- Per-product detail pages with full field editing

### Assembly Workflow
- Kanban-style board for batch management
- Batches move through stages: **In Review → 2nd Review → Buying Price → Selling Price → Ready for Upload → Uploaded**
- Stage-based email notifications — users subscribe to receive alerts when batches enter specific stages

### Dashboard
- Summary statistics and counts across the product catalog
- Charts powered by Recharts

### Export
- Export filtered product sets to a new Google Sheets spreadsheet in the signed-in user's Google Drive

### Shareable Links
- Generate time-limited public links to share product selections externally
- Manage active and expired links, with copy-to-clipboard support

### Sources
- Track and manage product data sources

### Settings (Admin)
- **Access Control**: Manage the email allowlist and promote users to admin
- **Column Groups**: Configure how columns are grouped in the product table
- **Column Mapping**: Customize display names for spreadsheet columns
- **Spreadsheet**: Share the configured Google Sheets document directly from the UI

### Live Presence
- See which other users are currently active in the app via real-time presence avatars in the header

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Auth | NextAuth.js + Google OAuth |
| Primary data store | Google Sheets API v4 |
| Secondary data store | MongoDB |
| UI components | shadcn/ui + Radix UI |
| Styling | Tailwind CSS |
| Data fetching | SWR |
| Tables | TanStack Table + TanStack Virtual |
| Charts | Recharts |
| Forms | React Hook Form + Zod |

## Getting Started

### Prerequisites

- Node.js 18+
- A Google Cloud project with the Sheets API and Drive API enabled
- A Google OAuth 2.0 client (for user sign-in)
- A Google Service Account (for automation)
- A MongoDB database
- Access to the "NET RATES" Google Sheets document

### Environment Variables

Create a `.env.local` file:

```env
MONGODB_URI=
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
SPREADSHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
```

> **Note:** `GOOGLE_PRIVATE_KEY` must be stored with literal `\n` characters. The app replaces them at runtime.

### Install and Run

```bash
npm install
npm run dev       # http://localhost:3000
npm run build
npm run start
npm run lint
```

### First Sign-In

The first user to attempt sign-in seeds the access control list with the configured admin email. Additional users must be added via **Settings → Access**.

## Access Control

- All routes require an active session.
- Allowed emails are stored in MongoDB (`accesscontrol` collection).
- Admins can manage the allowlist and grant/revoke admin privileges from the Settings page.
- Each allowed user must have access to the shared Google Sheets document.

## Data Model

**Google Sheets** stores the canonical product data across 70 columns (A–BR), mapped to the `TourProduct` type. Row 1 is the header; product rows start at row 2. Row indices are always 1-based.

**MongoDB** stores:
- `assemblybatches` — assembly workflow state
- `notifications` — in-app notifications
- `notificationsubscriptions` — per-user stage subscriptions
- `accesscontrol` — email allowlist and admin list
