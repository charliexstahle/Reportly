"use client";

import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import Link from "next/link";
import { useState, useRef } from "react";
import confetti from "canvas-confetti";
import NumberFlow from "@number-flow/react";
import { RainbowButton } from "@/components/ui/rainbow-button";

interface PricingPlan {
  name: string;
  price: string;
  yearlyPrice: string;
  period: string;
  features: string[];
  description: string;
  buttonText: string;
  href: string;
  isPopular: boolean;
}

interface PricingProps {
  plans: PricingPlan[];
  title?: string;
  description?: string;
}

// EXAMPLE plan array showing the relevant new feature on the Professional plan
// and removing placeholders from the Enterprise plan.
const samplePlans: PricingPlan[] = [
  {
    name: "Free",
    price: "0",
    yearlyPrice: "0",
    period: "month",
    features: [
      "Basic script library",
      "Version history",
      "Community forum support",
    ],
    description: "Perfect for hobby projects or small experiments.",
    buttonText: "Get Started",
    href: "/start-free",
    isPopular: false,
  },
  {
    name: "Professional",
    price: "10",
    yearlyPrice: "8",
    period: "month",
    features: [
      "Unlimited projects",
      "Advanced analytics",
      "Priority support",
      "Access to beta features",
      "Enhanced data visualizations", // <-- New relevant feature
    ],
    description: "For growing teams that need more power and flexibility.",
    buttonText: "Get Started",
    href: "/start-pro",
    isPopular: true, // Middle plan is popular
  },
  {
    name: "Enterprise",
    price: "20",
    yearlyPrice: "16",
    period: "month",
    features: [
      "Custom integrations",
      "Multi-team support",
      "24/7 phone support",
      // Removed "Dedicated account manager" and "Team analytics dashboard"
    ],
    description: "Best for large organizations with complex needs.",
    buttonText: "Upgrade",
    href: "/contact-sales",
    isPopular: false,
  },
];

export function Pricing({
  plans = samplePlans,
  title = "SQL Script Management & Reporting",
  description = "Advanced tool for script storage, version control, and dynamic report generation from CSV/XLSX inputs.",
}: PricingProps) {
  const [isMonthly, setIsMonthly] = useState(true);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const switchRef = useRef<HTMLButtonElement>(null);

  const handleToggle = (checked: boolean) => {
    setIsMonthly(!checked);
    if (checked && switchRef.current) {
      const rect = switchRef.current.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      confetti({
        particleCount: 50,
        spread: 60,
        origin: {
          x: x / window.innerWidth,
          y: y / window.innerHeight,
        },
        colors: [
          "hsl(var(--primary))",
          "hsl(var(--accent))",
          "hsl(var(--secondary))",
          "hsl(var(--muted))",
        ],
        ticks: 200,
        gravity: 1.2,
        decay: 0.94,
        startVelocity: 30,
        shapes: ["circle"],
      });
    }
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-4 overflow-hidden">
      {/* Heading Section */}
      <div className="text-center space-y-2 mb-4">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h2>
        <p className="text-muted-foreground text-base sm:text-lg leading-relaxed whitespace-pre-line">
          {description}
        </p>
      </div>

      {/* Toggle Switch */}
      <div className="flex justify-center items-center mb-8">
        <Label className="mr-2 text-sm font-medium">
          Pay Annually <span className="text-primary">(Save 20%)</span>
        </Label>
        <Switch
          ref={switchRef as any}
          checked={!isMonthly}
          onCheckedChange={handleToggle}
          className="relative"
        />
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 items-end">
        {plans.map((plan) => (
          <motion.div
            key={plan.name}
            style={{
              // Keep transform origin at bottom center so it expands upward
              transformOrigin: "bottom center",
            }}
            initial={{ opacity: 0, y: 20, scale: 1 }}
            whileInView={
              isDesktop
                ? {
                    opacity: 1,
                    y: 0,
                    scale: plan.isPopular ? 1.03 : 1, // Reduced scale from 1.05 to 1.03
                  }
                : { opacity: 1, y: 0 }
            }
            viewport={{ once: true }}
            transition={{
              duration: 0.8,
              type: "spring",
              stiffness: 100,
              damping: 30,
            }}
            className={cn(
              "relative overflow-hidden rounded-2xl border p-4 bg-background h-full flex flex-col",
              plan.isPopular ? "border-primary border-2" : "border-border"
            )}
          >
            {/* Popular Badge */}
            {plan.isPopular && (
              <div className="absolute top-0 right-0 flex items-center bg-primary py-1 px-2 rounded-bl-xl rounded-tr-xl shadow-md">
                <Star className="h-4 w-4 text-primary-foreground" />
                <span className="ml-1 text-sm font-semibold text-primary-foreground">
                  Popular
                </span>
              </div>
            )}

            <div className="flex flex-col flex-grow">
              {/* Header */}
              <div className="text-center">
                <p className="text-sm font-semibold text-muted-foreground">
                  {plan.name}
                </p>
                <div className="mt-4 flex items-center justify-center gap-x-1">
                  <span className="text-4xl font-bold tracking-tight text-foreground">
                    <NumberFlow
                      value={
                        isMonthly ? Number(plan.price) : Number(plan.yearlyPrice)
                      }
                      format={{
                        style: "currency",
                        currency: "USD",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }}
                      formatter={(value) => `$${value}`}
                      transformTiming={{
                        duration: 500,
                        easing: "ease-out",
                      }}
                      willChange
                      className="font-variant-numeric: tabular-nums"
                    />
                  </span>
                  {plan.period !== "Next 3 months" && (
                    <span className="text-xs font-semibold leading-6 tracking-wide text-muted-foreground">
                      / {plan.period}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {isMonthly ? "billed monthly" : "billed annually"}
                </p>
              </div>

              {/* Features */}
              <ul className="mt-4 space-y-2 text-sm">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-left">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Subtle Divider with increased padding */}
              <hr className="my-6 border-border/30" />

              {/* Footer with increased top spacing */}
              <div className="mt-auto flex flex-col gap-4">
                {/* Button */}
                {plan.name === "Professional" ? (
                  <Link href={plan.href} passHref className="block">
                    <RainbowButton className="w-full">
                      Get Started
                    </RainbowButton>
                  </Link>
                ) : (
                  <Link
                    href={plan.href}
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "w-full gap-2 text-base font-semibold tracking-tight transform-gpu ring-offset-current transition-all duration-300 ease-out hover:ring-2 hover:ring-primary hover:ring-offset-1 hover:bg-primary hover:text-primary-foreground",
                      plan.isPopular
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-foreground"
                    )}
                  >
                    {plan.buttonText.toLowerCase() === "contact sales"
                      ? "Upgrade"
                      : plan.buttonText}
                  </Link>
                )}

                {/* Description Below Button with increased top spacing */}
                <p className="text-xs text-muted-foreground text-center">
                  {plan.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
