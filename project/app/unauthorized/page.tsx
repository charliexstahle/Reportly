"use client";

import React, { useRef, useState, useEffect } from "react";
import { useScroll, useTransform, motion, MotionValue } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { Glow } from "@/components/ui/glow";
import Image from "next/image";
import { StarBorder } from "@/components/ui/star-border"; // Import the updated lines version
import { Mockup } from "@/components/ui/mockup";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { useTheme } from "next-themes";

/* ---------------------------------------
   PAGE COMPONENT
---------------------------------------- */
export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col">
      <ContainerScroll titleComponent={<HeroHeader />}>
        <HeroMockup />
      </ContainerScroll>
    </div>
  );
}

/* ---------------------------------------
   HERO HEADER
---------------------------------------- */
function HeroHeader() {
  return (
    <div className="flex flex-col items-center text-center space-y-6 px-4">
      {/* Badge Animation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Badge
          variant="outline"
          className="gap-2 flex items-center before:content-[''] before:inline-block before:w-2 before:h-2 before:rounded-full before:bg-blue-500 -mt-4"
        >
          <span className="text-muted-foreground">Professional Reporting Tools</span>
          <a href="/pricing" className="flex items-center gap-1">
            Discover More
          </a>
        </Badge>
      </motion.div>

      {/* Title Animation */}
      <motion.h1
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-3xl sm:text-4xl font-bold leading-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent"
      >
        Revolutionize Your Reporting
      </motion.h1>

      {/* Subheading Animation */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="max-w-[550px] text-base sm:text-lg leading-relaxed text-muted-foreground"
      >
        Reportly offers a powerful script library, intuitive editor, seamless version control,
        and collaborative tools to empower your team and streamline your workflow.
      </motion.p>

      {/* CTA Buttons Animation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="flex justify-center gap-4"
      >
        <RainbowButton className="h-11 px-8 font-medium">
          <a href="/pricing">Get Started</a>
        </RainbowButton>
        <Button variant="outline" size="lg" asChild>
          <a href="https://github.com/charliexstahle/Reportly" className="flex items-center gap-2">
            <Icons.gitHub className="h-5 w-5" />
            GitHub
          </a>
        </Button>
      </motion.div>
    </div>
  );
}

/* ---------------------------------------
   HERO MOCKUP
---------------------------------------- */
function HeroMockup() {
  // Add mounted state to avoid hydration mismatch
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = theme === "system" ? resolvedTheme : theme;
  // Determine image source based on theme
  const imageSrc = currentTheme === "light" ? "https://i.imgur.com/8sNgPto.png" : "https://i.imgur.com/DmandkK.png";

  if (!mounted) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.8 }}
      className="relative w-full h-auto mt-4"
    >
      {/* 
        StarBorder wrapped around Mockup for the animated outline effect
        Added margin to create space for the animated border
      */}
      <div className="w-full flex justify-center">
        <StarBorder className="inline-block p-1">
          <Mockup type="responsive" className="overflow-hidden">
            <Image
              src={imageSrc}
              alt="UI Components Preview"
              width={1248}
              height={765}
              className="w-full h-auto object-cover rounded-md"
              priority
            />
          </Mockup>
        </StarBorder>
      </div>
    </motion.div>
  );
}

/* ---------------------------------------
   CONTAINER SCROLL (3D scroll-based effect)
---------------------------------------- */
function ContainerScroll({
  titleComponent,
  children,
}: {
  titleComponent: React.ReactNode;
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end end"],
  });

  // More exaggerated transforms: scale from 1.1->1 (desktop), 0.65->0.9 (mobile)
  const scaleDimensions = () => (isMobile ? [0.65, 0.9] : [1.1, 1]);
  // Rotate from 40° at start to 0° at end
  const rotate = useTransform(scrollYProgress, [0, 1], [40, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], scaleDimensions());

  return (
    <div
      ref={containerRef}
      className="min-h-[120vh] flex items-start justify-center relative p-4 md:p-10"
    >
      <div
        className="w-full relative mt-4 md:mt-6"
        style={{ perspective: "1000px" }}
      >
        <HeaderContainer>{titleComponent}</HeaderContainer>
        <Card rotate={rotate} scale={scale}>
          {children}
        </Card>
      </div>
    </div>
  );
}

function HeaderContainer({ children }: { children: React.ReactNode }) {
  return (
    <motion.div className="max-w-5xl mx-auto text-center">
      {children}
    </motion.div>
  );
}

/* ---------------------------------------
   CARD (3D + Glow)
---------------------------------------- */
function Card({
  rotate,
  scale,
  children,
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        boxShadow:
          "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003",
      }}
      className="relative max-w-5xl mx-auto w-full mt-4 shadow-2xl"
    >
      {/* Optional Glow with pointer-events-none */}
      <Glow
        variant="top"
        className="pointer-events-none animate-slow-fade-in-pulse absolute -top-16 left-1/2 transform -translate-x-1/2 z-0"
        style={{ opacity: 0.7 }}
      />
      <div className="relative h-auto w-full overflow-visible">
        {children}
      </div>
    </motion.div>
  );
}
