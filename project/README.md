# Reportly - Modern Report Generation Application

Reportly is a powerful report generation platform that allows users to create, design, and export professional reports with ease.

## Features

- Report design and generation
- SQL script management
- Plan tiers with different usage limits
- Subscription management via Stripe
- User authentication via Supabase
- Usage tracking for reports and storage

## Deployment Guide

### Prerequisites

- Vercel account (or another preferred hosting platform)
- Supabase project
- Stripe account
- Domain name (for production deployment)

### Local Development Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Copy `.env.example` to `.env.local` and fill in the required environment variables
4. Run the development server:
   ```
   npm run dev
   ```

### Database Setup

1. Make sure you've created a Supabase project
2. Apply migrations to your Supabase database:
   ```
   npx supabase db push
   ```

### Stripe Integration Setup

1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Stripe Dashboard
3. Add the required environment variables to your deployment platform:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
4. After deploying your application, initialize Stripe products:
   ```
   npx tsx scripts/init-stripe-products.ts
   ```
5. Configure webhooks in the Stripe Dashboard to point to your deployed application:
   - Endpoint: `https://yourdomain.com/api/stripe-webhook`
   - Events to listen for: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

### Production Deployment

#### Using Vercel (Recommended)

1. Create a new project in Vercel
2. Link to your GitHub repository
3. Configure environment variables in Vercel project settings
4. Deploy the application

#### Manual Deployment

1. Build the application:
   ```
   npm run build
   ```
2. Deploy the `out` directory to your hosting provider

## Environment Variables

See `.env.example` for a list of required environment variables.

## License

[MIT](LICENSE)