import { Button } from "@/components/ui/button";
import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react";
import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="relative h-full min-h-[calc(100vh-8rem)] w-full overflow-hidden rounded-xl">
      <ShaderGradientCanvas
        style={{ position: "absolute", inset: 0 }}
        pixelDensity={1}
        fov={45}
        className="size-full rounded-xl pointer-events-none"
      >
        <ShaderGradient
          animate="on"
          brightness={0.8}
          cAzimuthAngle={180}
          cDistance={3.59}
          cPolarAngle={90}
          cameraZoom={1}
          color1="#ff3355"
          color2="#c746db"
          color3="#31d8e1"
          envPreset="city"
          grain="on"
          lightType="3d"
          positionX={-1.4}
          positionY={0}
          positionZ={0}
          range="disabled"
          rangeEnd={40}
          rangeStart={0}
          reflection={0.1}
          rotationX={0}
          rotationY={10}
          rotationZ={50}
          shader="defaults"
          type="plane"
          uAmplitude={1}
          uDensity={2.8}
          uFrequency={5.5}
          uSpeed={0.4}
          uStrength={1.8}
          uTime={0}
          wireframe={false}
        />
      </ShaderGradientCanvas>
      <div className="relative z-10 flex flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-white drop-shadow-md md:text-4xl">
          Company Compass
        </h1>
        <p className="max-w-md text-sm text-white/90 drop-shadow">
          Explore knowledge areas, problems, projects, and people.
        </p>

        <Button asChild>
          <Link to="/login">Get started</Link>
        </Button>
      </div>
    </div>
  );
}
