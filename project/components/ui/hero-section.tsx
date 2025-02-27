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
        // Reduced vertical padding: from py-4 sm:py-8 md:py-10 -> py-2 sm:py-4 md:py-6
        "py-2 sm:py-4 md:py-6 px-4",
        "fade-bottom overflow-hidden"
      )}
    >
      {/* Reduced top padding from pt-4 -> pt-2 or removed entirely */}
      <div className="mx-auto flex max-w-container flex-col gap-4 pt-2 sm:gap-6">
        <div className="flex flex-col items-center gap-2 text-center sm:gap-4">
          {/* Badge */}
          {badge && (
            <Badge
              asChild
              variant="outline"
              className="animate-appear gap-2 hover:bg-accent cursor-pointer"
            >
              <a href={badge.action.href} className="flex items-center gap-2">
                <span className="text-muted-foreground">{badge.text}</span>
                {badge.action.text}
                <ArrowRightIcon className="h-3 w-3" />
              </a>
            </Badge>
          )}

          {/* Title - smaller sizes: from text-2xl sm:text-3xl md:text-4xl -> text-xl sm:text-2xl md:text-3xl */}
          <h1 className="relative z-10 inline-block animate-appear bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-xl font-semibold leading-tight text-transparent drop-shadow-2xl sm:text-2xl sm:leading-tight md:text-3xl md:leading-tight">
            {title}
          </h1>

          {/* Description - smaller or consistent with subheading: from text-xs sm:text-sm -> text-sm sm:text-base */}
          <p className="relative z-10 max-w-[550px] animate-appear font-medium text-muted-foreground opacity-0 delay-100 text-sm sm:text-base">
            {description}
          </p>

          {/* Actions */}
          <div className="relative z-10 flex animate-appear justify-center gap-4 opacity-0 delay-300">
            <div className="relative z-10 flex animate-appear justify-center gap-4 opacity-0 delay-300">
              {actions.map((action, index) => (
                <Button key={index} variant={action.variant} size="lg" asChild>
                  <a href={action.href} className="flex items-center gap-2">
                    {action.icon}
                    {action.text}
                  </a>
                </Button>
              ))}
            </div>
          </div>

          {/* Image with Glow */}
          {/* Reduced top padding from pt-4 -> pt-2 to move image up */}
          <div className="relative pt-2">
            <MockupFrame className="animate-appear opacity-0 delay-700" size="small">
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
            <Glow variant="top" className="animate-appear-zoom opacity-0 delay-1000" />
          </div>
        </div>
      </div>
    </section>
  );
}
