#!/bin/bash

# This script helps deploy your Reportly application
# It will print instructions for configuring necessary environment variables

echo "==== Reportly Deployment Helper ===="
echo ""
echo "Follow these steps to deploy your application:"
echo ""

echo "1. SUPABASE SETUP"
echo "-----------------"
echo "Make sure to set these environment variables on your deployment platform:"
echo "  - NEXT_PUBLIC_SUPABASE_URL"
echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "  - SUPABASE_SERVICE_ROLE_KEY (for admin operations)"
echo ""

echo "2. STRIPE SETUP"
echo "--------------"
echo "Create a Stripe account at https://stripe.com"
echo "After creating your account, set these environment variables:"
echo "  - STRIPE_SECRET_KEY"
echo "  - STRIPE_WEBHOOK_SECRET (create this in the Stripe Dashboard)"
echo ""
echo "For each pricing tier, add these environment variables:"
echo "  - STRIPE_PROFESSIONAL_PRICE_ID"
echo "  - STRIPE_ENTERPRISE_PRICE_ID"
echo ""

echo "3. INIT PRODUCTS IN STRIPE"
echo "------------------------"
echo "After deploying your application, run this command to initialize your products in Stripe:"
echo "  npx tsx scripts/init-stripe-products.js"
echo ""

echo "4. CONFIGURE STRIPE WEBHOOKS"
echo "--------------------------"
echo "In the Stripe dashboard, set up a webhook endpoint pointing to:"
echo "  https://[your-domain]/api/stripe-webhook"
echo ""
echo "Make sure to listen for these events:"
echo "  - checkout.session.completed"
echo "  - customer.subscription.updated"
echo "  - customer.subscription.deleted"
echo ""

echo "5. DEPLOY YOUR APPLICATION"
echo "------------------------"
echo "Push your code to your deployment platform (Vercel, Netlify, etc.)"
echo "  - Make sure all environment variables are set"
echo "  - Run Supabase migrations before deployment"
echo ""

echo "Good luck with your deployment!"