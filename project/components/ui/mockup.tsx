import React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

//
// Main Mockup Container
//
const mockupVariants = cva(
  // Fixed to make sure content doesn't bleed outside while still allowing the StarBorder to be visible
  "flex relative z-10 overflow-hidden shadow-lg", 
  {
    variants: {
      type: {
        // Use a single corner radius for each variant to avoid multiple rectangles
        mobile: "rounded-[48px] max-w-[350px]",
        responsive: "rounded-md",
      },
    },
    defaultVariants: {
      type: "responsive",
    },
  }
);

export interface MockupProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof mockupVariants> {}

// The main mockup component
const Mockup = React.forwardRef<HTMLDivElement, MockupProps>(
  ({ className, type, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(mockupVariants({ type, className }))}
      {...props}
    />
  )
);
Mockup.displayName = "Mockup";

//
// Optional Inner Frame
//
const frameVariants = cva(
  // Removed extra border & corner radius to prevent stacked rectangles.
  // If you want a subtle background, keep "bg-accent/5" or remove it entirely.
  // Kept overflow-hidden so the image stays clipped to the frame shape.
  "flex relative z-10 overflow-hidden", 
  {
    variants: {
      size: {
        small: "p-2",
        large: "p-4",
      },
    },
    defaultVariants: {
      size: "small",
    },
  }
);

export interface MockupFrameProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof frameVariants> {}

// The optional frame component
const MockupFrame = React.forwardRef<HTMLDivElement, MockupFrameProps>(
  ({ className, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(frameVariants({ size, className }))}
      {...props}
    />
  )
);
MockupFrame.displayName = "MockupFrame";

export { Mockup, MockupFrame };
