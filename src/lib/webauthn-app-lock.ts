/**
 * WebAuthn app lock: client-only credential creation and verification.
 * Storage keys and helpers for Company Compass biometric lock (Face ID / Touch ID).
 */

export const CRED_KEY = "company_compass_webauthn_cred_id";
export const SESSION_KEY = "company_compass_unlocked";

const RP_NAME = "Company Compass";
const TIMEOUT_MS = 60000;

function bufferToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

export function hasStoredCredential(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return typeof localStorage.getItem(CRED_KEY) === "string";
  } catch {
    return false;
  }
}

export function isUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

export function setUnlocked(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, "true");
  } catch {
    // ignore
  }
}

export function removeCredential(): void {
  try {
    localStorage.removeItem(CRED_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

function isWebAuthnSupported(): boolean {
  return typeof window !== "undefined" && typeof navigator?.credentials?.create === "function";
}

/**
 * Create a WebAuthn credential and store its id in localStorage. Sets session unlocked on success.
 */
export async function createCredential(): Promise<void> {
  if (!isWebAuthnSupported()) {
    throw new DOMException("Biometrico non supportato su questo dispositivo.", "NotSupportedError");
  }
  const hostname = window.location.hostname || "localhost";
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: RP_NAME, id: hostname },
      user: {
        id: crypto.getRandomValues(new Uint8Array(16)),
        name: "user",
        displayName: RP_NAME,
      },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      authenticatorSelection: { userVerification: "required", residentKey: "preferred" },
      timeout: TIMEOUT_MS,
    },
  })) as PublicKeyCredential | null;
  if (!cred) {
    throw new DOMException("Registrazione annullata", "NotAllowedError");
  }
  localStorage.setItem(CRED_KEY, bufferToBase64(cred.rawId));
  setUnlocked();
}

/**
 * Verify with existing credential and set session unlocked on success.
 */
export async function verifyCredential(): Promise<void> {
  if (!isWebAuthnSupported()) {
    throw new DOMException("Biometrico non supportato su questo dispositivo.", "NotSupportedError");
  }
  const credId = localStorage.getItem(CRED_KEY);
  if (!credId) {
    throw new Error("Nessuna credential salvata");
  }
  const result = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ id: base64ToBuffer(credId), type: "public-key" }],
      userVerification: "required",
      timeout: TIMEOUT_MS,
    },
  });
  if (!result) {
    throw new DOMException("Accesso biometrico negato", "NotAllowedError");
  }
  setUnlocked();
}

export function getWebAuthnErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Accesso biometrico negato. Riprova o rimuovi il blocco biometrico.";
    }
    if (error.name === "NotSupportedError") {
      return "Biometrico non supportato su questo dispositivo.";
    }
    return error.message || "Errore WebAuthn";
  }
  return error instanceof Error ? error.message : "Errore sconosciuto";
}
