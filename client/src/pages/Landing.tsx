import { useEffect } from "react";
import { useLocation } from "react-router";
import { Hero } from "@/components/landing/Hero";
import { Navbar } from "@/components/landing/Navbar";
import { GradientPanel, HowItWorks, Intro, Tracks } from "@/components/landing/Sections";
import { Bento, FAQ, FinalCTA, Footer, RoleCarousel, Tips, WhyItWorks } from "@/components/landing/Sections2";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function Landing() {
  useDocumentTitle("Poise — AI Interview Practice & Feedback", { raw: true });
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const target = document.getElementById(hash.slice(1));
    if (target) requestAnimationFrame(() => target.scrollIntoView({ behavior: "smooth" }));
  }, [hash]);

  return (
    <div className="overflow-x-clip">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <Navbar />
      <main id="main">
        <Hero />
        <Intro />
        <GradientPanel />
        <Tracks />
        <HowItWorks />
        <Bento />
        <WhyItWorks />
        <RoleCarousel />
        <Tips />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
