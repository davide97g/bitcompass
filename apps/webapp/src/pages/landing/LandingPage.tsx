import "./landing.css";
import { LandingNav } from "./components/LandingNav";
import { HeroSection } from "./components/HeroSection";
import { EditorLogos } from "./components/EditorLogos";
import { CommandTabs } from "./components/CommandTabs";
import { FeatureGrid } from "./components/FeatureGrid";
import { WorkflowSection } from "./components/WorkflowSection";
import { FooterSection } from "./components/FooterSection";

export default function LandingPage() {
  return (
    <div className="landing-page min-h-screen">
      <LandingNav />
      <HeroSection />
      <EditorLogos />
      <CommandTabs />
      <FeatureGrid />
      <WorkflowSection />
      <FooterSection />
    </div>
  );
}
