import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createCredential,
  getWebAuthnErrorMessage,
  hasStoredCredential,
  isUnlocked,
  removeCredential,
  setUnlocked,
  verifyCredential,
} from "@/lib/webauthn-app-lock";
import { Fingerprint, Lock, ShieldCheck, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type AppLockState = "checking" | "setup" | "locked" | "unlocked" | "error";

interface AppLockProps {
  children: React.ReactNode;
}

export function AppLock({ children }: AppLockProps) {
  const [state, setState] = useState<AppLockState>("checking");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const runCheck = useCallback(() => {
    const hasCred = hasStoredCredential();
    const unlocked = isUnlocked();
    if (!hasCred && unlocked) {
      setState("unlocked");
      return;
    }
    if (!hasCred) {
      setState("setup");
      return;
    }
    if (unlocked) {
      setState("unlocked");
      return;
    }
    setState("locked");
  }, []);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  useEffect(() => {
    if (state !== "locked") return;
    let cancelled = false;
    const run = async () => {
      try {
        await verifyCredential();
        if (!cancelled) setState("unlocked");
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(getWebAuthnErrorMessage(err));
          setState("error");
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [state]);

  const handleSetup = useCallback(async () => {
    setState("checking");
    setErrorMessage("");
    try {
      await createCredential();
      setState("unlocked");
    } catch (err) {
      setErrorMessage(getWebAuthnErrorMessage(err));
      setState("error");
    }
  }, []);

  const handleSkip = useCallback(() => {
    setUnlocked();
    setState("unlocked");
  }, []);

  const handleRetry = useCallback(async () => {
    setState("locked");
    setErrorMessage("");
  }, []);

  const handleRemoveLock = useCallback(() => {
    removeCredential();
    setState("unlocked");
  }, []);

  if (state === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background dark:bg-zinc-950" aria-busy>
        <span className="sr-only">Verifica blocco app</span>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (state === "unlocked") {
    return <>{children}</>;
  }

  if (state === "setup") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 dark:bg-zinc-950">
        <Card className="w-full max-w-md border-border shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Fingerprint className="h-7 w-7 text-primary" aria-hidden />
            </div>
            <CardTitle className="text-xl">Configura Face ID / Touch ID</CardTitle>
            <CardDescription>
              Aggiungi un ulteriore livello di sicurezza. Dopo il login potrai sbloccare l’app con il biometrico.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              La credential resta sul dispositivo; non viene salvata sui nostri server.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 sm:flex-row">
            <Button
              className="flex-1"
              onClick={() => void handleSetup()}
              aria-label="Configura Face ID o Touch ID"
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              Configura biometrico
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleSkip}
              aria-label="Salta per ora"
            >
              Salta per ora
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (state === "locked") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 dark:bg-zinc-950" aria-busy>
        <span className="sr-only">Sblocco in corso</span>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Sblocco con Face ID / Touch ID…</p>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 dark:bg-zinc-950">
        <Card className="w-full max-w-md border-border shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-7 w-7 text-destructive" aria-hidden />
            </div>
            <CardTitle className="text-xl">Sblocco non riuscito</CardTitle>
            <CardDescription className="text-left">{errorMessage}</CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" onClick={() => void handleRetry()} aria-label="Riprova sblocco">
              <Lock className="mr-2 h-4 w-4" />
              Riprova
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleRemoveLock}
              aria-label="Rimuovi blocco biometrico"
            >
              Rimuovi blocco biometrico
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return null;
}
