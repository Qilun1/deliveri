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
- **AI**: Google Gemini (receipt extraction)
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Animations**: Framer Motion

## Getting Started

### Prerequisites

- Node.js 18+ (recommended: use [nvm](https://github.com/nvm-sh/nvm))
- npm, yarn, or bun package manager
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local development)
- A [Supabase](https://supabase.com) account (free tier works)
- A [Clerk](https://clerk.com) account (free tier works)
- A [Google AI Studio](https://makersuite.google.com/app/apikey) API key (for receipt extraction)

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/Qilun1/deliveri.git
cd deliveri

# Install dependencies
npm install
```

### 2. Set Up Supabase

#### Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL** and **anon/public key** from Settings > API

#### Run Database Migrations

```bash
# Link to your Supabase project
npx supabase link --project-ref YOUR_PROJECT_REF

# Run all migrations to set up the database schema
npx supabase db push
```

#### Set Up Storage Bucket

1. Go to Storage in your Supabase dashboard
2. Create a bucket named `receipt-images`
3. Set it to **private** (not public)
4. Add RLS policies for user-scoped access (see `SECURITY_AUDIT.md` for policy examples)

### 3. Set Up Clerk

1. Go to [clerk.com](https://clerk.com) and create a new application
2. Note your **Publishable Key** from the API Keys section
3. **(Important)** Create a JWT template for Supabase:
   - Go to JWT Templates in Clerk dashboard
   - Create a new template named `supabase`
   - Use the Supabase template or configure claims to include `sub` (user ID)

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Supabase (client-side safe)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Clerk (client-side safe - publishable key only!)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

> **Security Note**: Never put secret keys (starting with `sk_`) in this file. The `VITE_` prefix exposes values to the browser.

### 5. Set Up Edge Function Secrets

The app uses Supabase Edge Functions for server-side operations. Set these secrets:

```bash
# Clerk secret key (for account deletion)
npx supabase secrets set CLERK_SECRET_KEY=sk_live_...

# Gemini API key (for receipt extraction)
npx supabase secrets set GEMINI_API_KEY=your_gemini_api_key
```

### 6. Deploy Edge Functions

```bash
# Deploy all edge functions
npx supabase functions deploy extract-receipt
npx supabase functions deploy delete-account
```

### 7. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Available Scripts

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
deliveri/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── layout/       # Layout components (AppLayout, Sidebar, etc.)
│   │   ├── onboarding/   # Onboarding flow components
│   │   ├── receipt/      # Receipt upload and verification components
│   │   └── ui/           # shadcn/ui components
│   ├── contexts/         # React context providers (Auth, Theme, UserRole)
│   ├── data/             # Static data and mock data
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility functions and configurations
│   ├── pages/            # Page components
│   │   ├── auth/         # Login and signup pages
│   │   ├── dashboard/    # Dashboard pages
│   │   └── supplier/     # Supplier-specific pages
│   ├── test/             # Test files
│   └── types/            # TypeScript type definitions
├── supabase/
│   ├── functions/        # Edge Functions (serverless)
│   │   ├── delete-account/
│   │   └── extract-receipt/
│   └── migrations/       # Database migrations
└── public/               # Static assets
```

## Database Schema

The database includes tables for:

| Table | Purpose |
|-------|---------|
| `users` | User profiles linked to Clerk auth |
| `restaurants` | Restaurant information |
| `suppliers` | Supplier information |
| `deliveries` | Delivery records |
| `delivery_items` | Individual items in each delivery |
| `metrotukku_products` | Product catalog |

All tables use Row Level Security (RLS) to ensure users can only access their own data.

## Security

This project follows security best practices:

- **Row Level Security (RLS)** on all database tables
- **JWT verification** via Supabase gateway
- **Secret keys** stored only in Edge Function secrets (never client-side)
- **Clerk authentication** for secure user management

See `SECURITY_AUDIT.md` for a detailed security review.

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy

### Netlify

1. Push your code to GitHub
2. Import the project in [Netlify](https://netlify.com)
3. Set build command: `npm run build`
4. Set publish directory: `dist`
5. Add environment variables
6. Deploy

## Troubleshooting

### "Missing Supabase environment variables"
Make sure your `.env` file exists and contains valid `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

### "No auth token available - RLS policies may block access"
This means the Clerk JWT isn't being passed to Supabase. Check:
1. You're signed in
2. The `supabase` JWT template exists in Clerk
3. The template is properly configured

### Receipt extraction not working
Ensure `GEMINI_API_KEY` is set in Supabase Edge Function secrets:
```bash
npx supabase secrets set GEMINI_API_KEY=your_key
npx supabase functions deploy extract-receipt
```

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
