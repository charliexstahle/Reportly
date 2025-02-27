"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRightIcon } from "lucide-react";
import { Mockup, MockupFrame } from "@/components/ui/mockup";
import { Glow } from "@/components/ui/glow";
import Image from "next/image";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface HeroAction {
  text: string;
  href: string;
  icon?: React.ReactNode;
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
}

interface HeroProps {
  badge?: {
    text: string;
    action: {
      text: string;
      href: string;
    };
  };
  title: string;
  description: string;
  actions: HeroAction[];
  image: {
    light: string;
    dark: string;
    alt: string;
  };
}

export function HeroSection({
  badge,
  title,
  description,
  actions,
  image,
}: HeroProps) {
  const { resolvedTheme } = useTheme();
  const imageSrc = resolvedTheme === "light" ? image.light : image.dark;

  return (
    <section
      className={cn(
        "bg-background text-foreground",
        "py-2 sm:py-4 md:py-6 px-4",
        "fade-bottom overflow-hidden pb-0",
        "animate-slide-in-from-bottom"
      )}
    >
      <div className="mx-auto flex max-w-container flex-col gap-8 pt-6 sm:pt-10">
        <div className="flex flex-col items-center gap-4 text-center sm:gap-6">
          {/* Badge */}
          {badge && (
            <Badge 
              variant="outline" 
              className="animate-slide-in-from-top delay-100 opacity-0 gap-2"
            >
              <span className="text-muted-foreground">{badge.text}</span>
              <a href="/pricing" className="flex items-center gap-1">
                {badge.action.text}
                <ArrowRightIcon className="h-3 w-3" />
              </a>
            </Badge>
          )}

          {/* Title */}
          <h1 className="relative z-10 inline-block animate-scale-in delay-200 opacity-0 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-xl font-semibold leading-tight text-transparent drop-shadow-2xl sm:text-3xl sm:leading-tight md:text-4xl md:leading-tight">
            {title}
          </h1>

          {/* Description */}
          <p className="text-xs relative z-10 max-w-[550px] animate-fade-in delay-300 opacity-0 font-medium text-muted-foreground sm:text-base">
            {description}
          </p>

          {/* Actions */}
          <div className="relative z-10 flex animate-scale-in delay-400 opacity-0 justify-center gap-4">
            {actions.map((action, index) => (
              <Button key={index} variant={action.variant} size="lg" asChild>
                <a href={action.href} className="flex items-center gap-2">
                  {action.icon}
                  {action.text}
                </a>
              </Button>
            ))} 
          </div>

          {/* Image with Glow */}
          <div className="relative pt-8">
            <MockupFrame className="animate-float-up delay-600 opacity-0" size="small">
              <Mockup type="responsive">
                <Image
                  src={imageSrc}
                  alt={image.alt}
                  width={1248}
                  height={765}
                  priority
                />
              </Mockup>
            </MockupFrame>
            <Glow variant="top" className="animate-slow-fade-in-pulse delay-700 opacity-0" style={{ opacity: 0.5 }} />
          </div>
        </div>
      </div>
    </section>
  );
}
