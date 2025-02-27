// This script initializes Stripe products based on the pricing plans in your database
import { createClient } from '@supabase/supabase-js';
import { initializeStripeProducts } from '../lib/stripe';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('Missing STRIPE_SECRET_KEY environment variable');
    process.exit(1);
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing required Supabase environment variables');
    process.exit(1);
  }

  try {
    console.log('Connecting to Supabase...');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('Fetching plan features from database...');
    const { data: planFeatures, error } = await supabase
      .from('plan_features')
      .select('*')
      .eq('is_published', true);

    if (error) {
      console.error('Error fetching plan features:', error);
      process.exit(1);
    }

    if (!planFeatures || planFeatures.length === 0) {
      console.log('No plans found in database');
      process.exit(0);
    }

    console.log(`Found ${planFeatures.length} plans. Creating Stripe products...`);
    await initializeStripeProducts(planFeatures);
    console.log('Stripe products created successfully!');

    // Output the instructions for next steps
    console.log('\nNext steps:');
    console.log('1. Copy the Stripe product and price IDs shown above');
    console.log('2. Set them as environment variables in your deployment platform:');
    console.log('   - STRIPE_PROFESSIONAL_PRICE_ID');
    console.log('   - STRIPE_ENTERPRISE_PRICE_ID');
    console.log('3. If you have Stripe CLI installed, test the webhook:');
    console.log('   stripe listen --forward-to localhost:3000/api/stripe-webhook');

  } catch (error) {
    console.error('Error initializing Stripe products:', error);
    process.exit(1);
  }
}

main();