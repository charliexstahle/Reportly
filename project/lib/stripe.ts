import Stripe from 'stripe';
import { PlanFeature } from './types';

// Initialize Stripe with secret key (will be set from environment variables in production)
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16', // Use the latest API version available
});

// Map our internal plan tiers to Stripe product/price IDs
// These will be populated with actual IDs after setting up products in Stripe dashboard
const PLAN_PRICE_MAPPING: Record<string, string> = {
  'free': '', // Free tier doesn't need a Stripe price ID
  'professional': process.env.STRIPE_PROFESSIONAL_PRICE_ID || '',
  'enterprise': process.env.STRIPE_ENTERPRISE_PRICE_ID || '',
};

/**
 * Initialize Stripe products and prices based on our plan features
 * This should be run once during initial setup or when updating plans
 */
export async function initializeStripeProducts(planFeatures: PlanFeature[]) {
  // Skip free tier
  const paidPlans = planFeatures.filter(plan => plan.plan_tier !== 'free' && plan.is_published);
  
  for (const plan of paidPlans) {
    // Create or update product in Stripe
    const product = await stripe.products.create({
      name: `Reportly ${plan.plan_tier.charAt(0).toUpperCase() + plan.plan_tier.slice(1)} Plan`,
      description: plan.description,
      metadata: {
        plan_tier: plan.plan_tier,
      },
    });
    
    // Create price for the product
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(plan.monthly_price_usd * 100), // Convert to cents
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: {
        plan_tier: plan.plan_tier,
      },
    });
    
    console.log(`Created Stripe product and price for ${plan.plan_tier} tier:`, {
      product_id: product.id,
      price_id: price.id,
    });
    
    // Store these IDs in your environment variables or database
  }
}

/**
 * Create a Stripe Checkout session for subscription purchase
 */
export async function createCheckoutSession(
  customerId: string, 
  planTier: string,
  successUrl: string,
  cancelUrl: string
) {
  const priceId = PLAN_PRICE_MAPPING[planTier];
  
  if (!priceId) {
    throw new Error(`No Stripe price ID found for plan tier: ${planTier}`);
  }
  
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: {
      plan_tier: planTier,
    },
  });
  
  return session;
}

/**
 * Create or get a Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string
) {
  // First, check if the customer already exists
  // In a real app, you'd store Stripe customer IDs in your database
  // and look them up here
  
  // For this example, we'll just create a new customer each time
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      userId,
    },
  });
  
  return customer.id;
}

/**
 * Webhook handler for Stripe events
 */
export async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const planTier = session.metadata?.plan_tier;
      const customerId = session.customer as string;
      
      // Handle successful checkout - update user subscription in your database
      console.log('Subscription created:', { planTier, customerId });
      break;
    }
    
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      // Handle subscription updates
      break;
    }
    
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      // Handle subscription cancellations
      break;
    }
  }
}

export default stripe;