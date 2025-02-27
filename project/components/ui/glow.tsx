import React from "react";
import { cn } from "@/lib/utils";
import { cva, VariantProps } from "class-variance-authority";

const glowVariants = cva("absolute w-full", {
  variants: {
    variant: {
      top: "top-0",
      above: "-top-[128px]",
      bottom: "bottom-0",
      below: "-bottom-[128px]",
      center: "top-[50%]",
    },
  },
  defaultVariants: {
    variant: "top",
  },
});

// Added subtle pulsing animation to the glow
const Glow = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof glowVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(glowVariants({ variant }), className)}
    {...props}
  >
    <div
      className={cn(
        "absolute left-1/2 h-[256px] w-[60%] -translate-x-1/2 scale-[2.5] rounded-[50%] sm:h-[512px]",
        variant === "center" && "-translate-y-1/2",
        // Further reduced glow intensity for a subtler effect
        "bg-[radial-gradient(ellipse_at_center,_hsla(210,100%,50%,0.45)_10%,_hsla(210,100%,50%,0)_60%)] dark:bg-[radial-gradient(ellipse_at_center,_hsla(31,97%,72%,0.35)_10%,_hsla(31,97%,72%,0)_60%)]",
        "animate-pulse-slow"
      )}
    />
    <div
      className={cn(
        "absolute left-1/2 h-[128px] w-[40%] -translate-x-1/2 scale-[2] rounded-[50%] sm:h-[256px]",
        variant === "center" && "-translate-y-1/2",
        // Further reduced glow intensity for a subtler effect
        "bg-[radial-gradient(ellipse_at_center,_hsla(210,100%,40%,0.3)_10%,_hsla(210,100%,50%,0)_60%)] dark:bg-[radial-gradient(ellipse_at_center,_hsla(27,96%,61%,0.2)_10%,_hsla(27,96%,61%,0)_60%)]",
        "animate-pulse-slow"
      )}
    />
  </div>
));
Glow.displayName = "Glow";

export { Glow };
