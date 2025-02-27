# Deploying Reportly with a Business Domain

This guide will walk you through deploying your Reportly application to a live website with a custom domain, which is essential for Stripe integration.

## 1. Domain Registration

1. **Register a domain name** for your business through a registrar like Namecheap, GoDaddy, or Google Domains
   - Choose a professional domain name like `reportly.com` or `yourcompany-reports.com`
   - Make sure the domain is available and fits your brand

## 2. Vercel Deployment Setup

Vercel is recommended for deploying Next.js applications with minimal configuration.

1. **Create a Vercel account**:
   - Go to [vercel.com](https://vercel.com) and sign up
   - Connect your GitHub account

2. **Import your Reportly repository**:
   - Click "New Project" in the Vercel dashboard
   - Select your Reportly repository
   - Configure the project:
     - Framework preset: Next.js
     - Root directory: `project` (if your code is in a subdirectory)
   
3. **Configure environment variables**:
   - In the project settings, add all required environment variables:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_value
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_value
     SUPABASE_SERVICE_ROLE_KEY=your_value
     STRIPE_SECRET_KEY=your_value
     STRIPE_WEBHOOK_SECRET=your_value
     ```

4. **Connect your domain**:
   - In Vercel project settings, go to "Domains"
   - Add your custom domain
   - Follow Vercel's instructions to update your DNS settings
   - Configure SSL (Vercel handles this automatically)

## 3. Database Migration

1. **Apply Supabase migrations**:
   - Set your Supabase credentials:
     ```bash
     export SUPABASE_ACCESS_TOKEN=your_access_token
     export SUPABASE_PROJECT_ID=your_project_id
     ```
   - Run the migration script:
     ```bash
     ./scripts/deploy-migrations.sh production
     ```

## 4. Stripe Integration Setup

1. **Update Stripe webhook endpoint**:
   - In the Stripe dashboard, go to Developers > Webhooks
   - Add an endpoint with your production URL:
     ```
     https://yourdomain.com/api/stripe-webhook
     ```
   - Select these events:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`

2. **Initialize Stripe products**:
   - Install dependencies if needed:
     ```bash
     npm install dotenv
     ```
   - Run the initialization script:
     ```bash
     npx tsx scripts/init-stripe-products.ts
     ```
   - Copy the generated product/price IDs and update your environment variables

## 5. Testing the Live Site

1. **Verify Supabase connection**:
   - Test authentication
   - Check database queries

2. **Test subscription flows**:
   - Create a test user
   - Subscribe to a plan using Stripe's test cards
   - Verify subscription status updates
   - Test usage limits

3. **Configure Stripe to production mode** (when ready):
   - Update your API keys from test to live mode
   - Update webhook endpoints
   - Ensure your domain has proper SSL certification

## 6. Domain Email Setup (Optional but Recommended)

For a professional business presence:

1. Set up business email with your domain (e.g., support@yourdomain.com)
2. Configure SPF, DKIM, and DMARC records for proper email delivery
3. Set up email forwarding or integrate with a service like Google Workspace

## Need More Help?

For personalized deployment assistance, contact your developer or IT team. For questions about specific aspects:

- **Vercel deployment**: [Vercel Support](https://vercel.com/support)
- **Supabase**: [Supabase Documentation](https://supabase.com/docs)
- **Stripe integration**: [Stripe Support](https://support.stripe.com)