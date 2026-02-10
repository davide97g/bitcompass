import ClickSpark from '@/components/ClickSpark';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { ShaderGradient, ShaderGradientCanvas } from '@shadergradient/react';
import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithGoogle, session } = useAuth();

  useEffect(() => {
    if (isSupabaseConfigured() && session) {
      const from = (location.state as { from?: string })?.from ?? '/topics';
      navigate(from, { replace: true });
    }
  }, [session, navigate, location.state]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    if (isSupabaseConfigured()) {
      await signInWithGoogle();
      // Supabase redirects to Google and back; onAuthStateChange will update session
    } else {
      setTimeout(() => navigate('/topics'), 800);
    }
    setIsLoading(false);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      {/* Fixed gradient background */}
      <div className="fixed inset-0 z-0">
        <ShaderGradientCanvas
          style={{ position: 'absolute', inset: 0 }}
          pixelDensity={1}
          fov={45}
          pointerEvents="none"
          className="h-full w-full"
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
            enableCameraUpdate={false}
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
      </div>

      <ClickSpark
        sparkColor='#fff'
        sparkSize={10}
        sparkRadius={15}
        sparkCount={8}
        duration={400}
      >
      <div className="relative z-10 w-full max-w-md animate-fade-in">
        {/* Soft panel: ambient organic style, sits on gradient */}
        <div className="relative w-full min-h-[480px] rounded-2xl border border-border bg-background/95 shadow-xl backdrop-blur-sm">
          <div className="relative z-10 flex flex-col p-8 pt-10 pb-10">
            {/* Logo and Title */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4 shadow-lg">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mb-2 text-foreground">Bitcompass</h1>
              <p className="text-muted-foreground">
                Your company's internal knowledge base
              </p>
            </div>

            <h2 className="text-lg font-semibold text-center mb-6 text-foreground">
              Sign in to your account
            </h2>

            <Button
              variant="outline"
              className="w-full h-12 text-base font-medium gap-3 bg-background hover:bg-muted border-border transition-colors duration-ui ease-out"
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              {isLoading ? 'Signing in...' : 'Continue with Google'}
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-6">
              Use your company Google account to sign in
            </p>

            {/* Footer */}
            <p className="text-xs text-center text-muted-foreground mt-8 pt-4 border-t border-border">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </ClickSpark>
    </div>
  );
}
