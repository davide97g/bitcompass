import { Link } from "react-router-dom";
import { ShaderGradientCanvas, ShaderGradient } from "@shadergradient/react";
import { Button } from "@/components/ui/button";

export default function WelcomePage() {
  return (
    <div className="fixed inset-0 h-screen w-screen">
      <ShaderGradientCanvas
        style={{ position: "absolute", inset: 0 }}
        pixelDensity={1}
        fov={45}
        className="h-full w-full"
      >
        <ShaderGradient
          animate="on"
          brightness={0.8}
          cAzimuthAngle={270}
          cDistance={0.5}
          cPolarAngle={180}
          cameraZoom={15.1}
          color1="#73bfc4"
          color2="#ff810a"
          color3="#8da0ce"
          envPreset="city"
          grain="on"
          lightType="env"
          positionX={-0.1}
          positionY={0}
          positionZ={0}
          range="disabled"
          rangeEnd={40}
          rangeStart={0}
          reflection={0.4}
          rotationX={0}
          rotationY={130}
          rotationZ={70}
          shader="defaults"
          type="sphere"
          uAmplitude={3.2}
          uDensity={0.8}
          uFrequency={5.5}
          uSpeed={0.3}
          uStrength={0.3}
          uTime={0}
          wireframe={false}
        />
      </ShaderGradientCanvas>

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-12">
        <h1
          className="animate-fade-in-slow text-5xl font-bold tracking-tight text-white drop-shadow-lg md:text-7xl"
          style={{ opacity: 0 }}
        >
          bitcompass
        </h1>
        <Link
          to="/"
          className="animate-fade-in-delayed inline-block"
          style={{ opacity: 0 }}
        >
          <Button
            size="lg"
            className="min-w-[180px] bg-white/95 px-8 py-6 text-base font-semibold text-foreground shadow-xl transition hover:bg-white"
            aria-label="Get started"
          >
            Get started
          </Button>
        </Link>
      </div>
    </div>
  );
}
