import { cn } from "@/lib/utils"
import { ElementType, ComponentPropsWithoutRef, useEffect, useState } from "react"
import { useTheme } from "next-themes"

/**
 * StarBorderProps: allows you to pass in a custom `as` element,
 * a color, speed, etc.
 */
interface StarBorderProps<T extends ElementType> {
  as?: T
  color?: string
  speed?: string
  className?: string
  children: React.ReactNode
}

/**
 * StarBorder: Renders a component with animated star-like border effect
 */
export function StarBorder<T extends ElementType = "div">({
  as,
  className,
  color, // Remove default value
  speed = "4s",
  children,
  ...props
}: StarBorderProps<T> & Omit<ComponentPropsWithoutRef<T>, keyof StarBorderProps<T>>) {
  const Component = as || "div";
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // Define theme-based colors - only use passed color if explicitly set
  const lineColor = color ?? (resolvedTheme === 'dark' ? '#ffffff' : '#000000');
  const glowIntensity = resolvedTheme === 'dark' ? '0 0 8px' : '0 0 6px';

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Component 
      className={cn(
        "relative inline-block p-3 rounded-xl", // Increased border radius
        className
      )} 
      {...props}
    >
      {/* Static border - acts as a container */}
      <div className="absolute inset-0 rounded-xl border border-neutral-300/30 dark:border-neutral-700/30 pointer-events-none overflow-hidden">
        {/* Animated highlights - only rendered client-side */}
        {mounted && (
          <>
            {/* Top edge highlight */}
            <div 
              className="absolute h-[2px] w-[45%] top-0 rounded-full animate-border-flow-right"
              style={{
                background: `linear-gradient(to right, transparent, ${lineColor}88, transparent)`,
                boxShadow: `${glowIntensity} ${lineColor}`,
                opacity: 0.8,
              }}
            ></div>
            
            {/* Right edge highlight */}
            <div 
              className="absolute h-[45%] w-[2px] right-0 rounded-full animate-border-flow-down"
              style={{
                background: `linear-gradient(to bottom, transparent, ${lineColor}88, transparent)`,
                boxShadow: `${glowIntensity} ${lineColor}`,
                opacity: 0.8,
              }}
            ></div>
            
            {/* Bottom edge highlight */}
            <div 
              className="absolute h-[2px] w-[45%] bottom-0 rounded-full animate-border-flow-left"
              style={{
                background: `linear-gradient(to left, transparent, ${lineColor}88, transparent)`,
                boxShadow: `${glowIntensity} ${lineColor}`,
                opacity: 0.8,
              }}
            ></div>
            
            {/* Left edge highlight */}
            <div 
              className="absolute h-[45%] w-[2px] left-0 rounded-full animate-border-flow-up"
              style={{
                background: `linear-gradient(to top, transparent, ${lineColor}88, transparent)`,
                boxShadow: `${glowIntensity} ${lineColor}`,
                opacity: 0.8,
              }}
            ></div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Create animation styles at runtime */}
      {mounted && <StarBorderAnimation speed={speed} color={color} />}
    </Component>
  )
}

/**
 * Dynamically inject the animation styles for better control
 */
function StarBorderAnimation({ speed = "4s", color }) {  // Remove default color here too
  useEffect(() => {
    // Only add animation if it doesn't exist
    if (!document.querySelector('#star-border-animation-style')) {
      const style = document.createElement('style');
      style.id = 'star-border-animation-style';
      
      // Modify the keyframe animations to stay within bounds
      style.innerHTML = `
        @keyframes border-flow-right {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        
        @keyframes border-flow-down {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(300%); }
        }
        
        @keyframes border-flow-left {
          0% { transform: translateX(300%); }
          100% { transform: translateX(-100%); }
        }
        
        @keyframes border-flow-up {
          0% { transform: translateY(300%); }
          100% { transform: translateY(-100%); }
        }
        
        .animate-border-flow-right {
          animation: border-flow-right ${speed} linear infinite;
        }
        
        .animate-border-flow-down {
          animation: border-flow-down ${speed} linear infinite;
          animation-delay: ${parseInt(speed) * 0.25}s;
        }
        
        .animate-border-flow-left {
          animation: border-flow-left ${speed} linear infinite;
          animation-delay: ${parseInt(speed) * 0.5}s;
        }
        
        .animate-border-flow-up {
          animation: border-flow-up ${speed} linear infinite;
          animation-delay: ${parseInt(speed) * 0.75}s;
        }
      `;
      
      document.head.appendChild(style);
    }
  }, [speed, color]);
  
  return null;
}
