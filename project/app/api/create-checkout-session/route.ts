import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createCheckoutSession, getOrCreateStripeCustomer } from '@/lib/stripe';

export async function POST(req: Request) {
  try {
    const { planTier, userId, successUrl, cancelUrl } = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user details for Stripe customer
    const { data: user, error: userError } = await supabase
      .from('user_settings')
      .select('email, full_name')
      .eq('user_id', userId)
      .single();
      
    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Create or get Stripe customer
    const customerId = await getOrCreateStripeCustomer(
      userId,
      user.email || '',
      user.full_name || undefined
    );
    
    // Create checkout session
    const session = await createCheckoutSession(
      customerId,
      planTier,
      successUrl || `${req.headers.get('origin')}/settings`,
      cancelUrl || `${req.headers.get('origin')}/pricing`
    );
    
    return NextResponse.json({
      url: session.url,
      sessionId: session.id
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}