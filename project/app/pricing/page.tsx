"use client";

import React, { useEffect, useState } from "react";
import { Pricing } from "@/components/ui/pricing";
import { supabase } from "@/lib/supabaseClient";
import { PlanFeature, UserSettings } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function PricingPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);

  // Fetch plans from the database
  useEffect(() => {
    async function fetchPlans() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('plan_features')
          .select('*')
          .eq('is_published', true)
          .order('monthly_price_usd', { ascending: true });

        if (error) {
          console.error('Error fetching plans:', error);
          return;
        }

        if (data) {
          // Format the data for the Pricing component
          const formattedPlans = data.map((plan: PlanFeature) => ({
            name: plan.plan_tier.charAt(0).toUpperCase() + plan.plan_tier.slice(1),
            price: plan.monthly_price_usd.toString(),
            yearlyPrice: (plan.monthly_price_usd * 10).toString(), // 2 months free
            period: "month",
            features: Array.isArray(plan.features) ? plan.features : [],
            description: plan.description,
            buttonText: plan.plan_tier === 'free' ? "Get Started" : 
                        plan.plan_tier === 'enterprise' ? "Contact Sales" : "Upgrade",
            href: plan.plan_tier === 'free' ? "/auth/register" : 
                  plan.plan_tier === 'enterprise' ? "/contact" : "#",
            isPopular: plan.plan_tier === 'professional',
            planTier: plan.plan_tier // Add this for the checkout handler
          }));

          setPlans(formattedPlans);
        }
      } catch (error) {
        console.error('Error in fetching plans:', error);
      } finally {
        setLoading(false);
      }
    }

    // If the user is logged in, fetch their settings
    async function fetchUserSettings() {
      if (user?.id) {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (!error && data) {
          setUserSettings(data);
        }
      }
    }

    fetchPlans();
    fetchUserSettings();
  }, [user?.id]);

  // Handle subscription checkout
  const handleSubscribe = async (planTier: string) => {
    if (!user) {
      // Redirect to login if not authenticated
      router.push('/auth/login');
      return;
    }

    try {
      setCheckoutLoading(true);
      
      // Call the checkout API endpoint
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planTier,
          userId: user.id,
          successUrl: `${window.location.origin}/settings?subscription=success`,
          cancelUrl: `${window.location.origin}/pricing?subscription=canceled`,
        }),
      });

      const { url, error } = await response.json();
      
      if (error) {
        console.error('Checkout error:', error);
        return;
      }
      
      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error initiating checkout:', error);
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Customize plan buttons based on user's current subscription
  const getCustomizedPlans = () => {
    if (!userSettings || !plans.length) return plans;
    
    return plans.map(plan => {
      // If this is the user's current plan
      if (userSettings.plan_tier === plan.planTier) {
        return {
          ...plan,
          buttonText: "Current Plan",
          buttonDisabled: true,
        };
      }
      
      // If this is a downgrade
      if ((plan.planTier === 'free' && userSettings.plan_tier !== 'free') ||
          (plan.planTier === 'professional' && userSettings.plan_tier === 'enterprise')) {
        return {
          ...plan,
          buttonText: "Downgrade",
          onClick: () => handleSubscribe(plan.planTier),
        };
      }
      
      // If this is an upgrade
      if ((plan.planTier === 'professional' && userSettings.plan_tier === 'free') ||
          (plan.planTier === 'enterprise' && userSettings.plan_tier !== 'enterprise')) {
        return {
          ...plan,
          buttonText: "Upgrade",
          onClick: () => handleSubscribe(plan.planTier),
        };
      }
      
      return plan;
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-4">Simple, transparent pricing</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Choose the perfect plan for your reporting needs. All plans include access to our core reporting features.
        </p>
      </div>

      {checkoutLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-background/80 z-50">
          <div className="bg-card p-6 rounded-lg shadow-lg flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p>Preparing checkout...</p>
          </div>
        </div>
      )}

      <Pricing plans={getCustomizedPlans()} />
      
      <div className="mt-16 text-center">
        <h3 className="text-xl font-semibold mb-4">Need a custom plan?</h3>
        <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
          We offer tailored solutions for larger teams with specific requirements. Contact our sales team to discuss your needs.
        </p>
        <Button variant="outline" asChild>
          <a href="mailto:sales@reportly.com">Contact Sales</a>
        </Button>
      </div>
    </div>
  );
}
