# DeliVeri - Delivery Verification Platform

A modern delivery verification and management platform that connects restaurants with their suppliers, streamlining the receipt verification process and improving supply chain transparency.

## Features

### For Restaurants
- **Dashboard** - Overview of delivery status, pending verifications, and recent activity
- **Delivery Management** - Track incoming deliveries and their verification status
- **Receipt Upload & Verification** - Upload and verify delivery receipts with AI-powered extraction
- **Supplier Management** - Manage supplier relationships and view supplier details
- **Analytics** - Insights into delivery patterns, issues, and supplier performance
- **Restaurant Profile** - Manage restaurant information and settings

### For Suppliers
- **Supplier Dashboard** - Overview of orders, deliveries, and performance metrics
- **Incoming Orders** - View and manage orders from connected restaurants
- **Outgoing Deliveries** - Track delivery status and history
- **Delivery Issues** - Monitor and resolve delivery discrepancies
- **Product Catalog** - Manage product listings and pricing
- **Connected Restaurants** - View and manage restaurant relationships
- **Supplier Analytics** - Performance metrics and business insights

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Authentication**: Clerk
- **Backend**: Supabase (PostgreSQL + Storage + Edge Functions)
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Animations**: Framer Motion

## Getting Started

### Prerequisites

- Node.js 18+ (recommended: use [nvm](https://github.com/nvm-sh/nvm))
- npm or bun package manager
- Supabase account
- Clerk account

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
```

### Installation

```bash
# Clone the repository
git clone https://github.com/Qilun1/deliveri.git

# Navigate to the project directory
cd delivery-verified

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run build:dev` | Build for development |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |

## Project Structure

```
src/
├── components/     # Reusable UI components
│   ├── layout/     # Layout components (AppLayout, Sidebar, etc.)
│   ├── onboarding/ # Onboarding flow components
│   └── ui/         # shadcn/ui components
├── contexts/       # React context providers
├── data/           # Static data and constants
├── hooks/          # Custom React hooks
├── lib/            # Utility functions and configurations
├── pages/          # Page components
│   ├── auth/       # Authentication pages
│   ├── dashboard/  # Dashboard pages
│   └── supplier/   # Supplier-specific pages
├── test/           # Test files
└── types/          # TypeScript type definitions
```

## Database

This project uses Supabase as the backend. The database schema includes tables for:
- Users and authentication
- Restaurants and suppliers
- Deliveries and delivery items
- Receipt storage and verification

Run migrations from the `supabase/` directory to set up your database schema.

## License

This project is private and proprietary.

## Contributing

This is a collaborative project. Please coordinate with the team before making significant changes.
