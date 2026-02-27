---
kind: solution
description: "Proteggere l'accesso all'app dopo il login con Face ID / Touch ID (WebAuthn app lock), senza server. Adattato per Company Compass (Supabase + React Router)."
globs: "*.tsx,*.ts"
alwaysApply: false
---

# Blocco biometrico (WebAuthn) per app lock – Company Compass

Proteggere l'accesso all'app dopo il login con Face ID / Touch ID su PWA, senza server. WebAuthn è usato solo per **app lock** (blocco app), non per il login iniziale.

**Contesto progetto:** Company Compass usa **Supabase** (Google OAuth) e **React Router**. L'area protetta è avvolta da `RequireAuth` e `AppLayout`; il menu utente è in `TopBar`.

## Architettura

- **Nessun server**: la credential WebAuthn è creata e verificata solo lato client; non si salva nulla su DB.
- **localStorage**: si salva solo l'ID della credential (base64 di `cred.rawId`) sotto la chiave `company_compass_webauthn_cred_id`.
- **sessionStorage**: dopo lo sblocco si imposta `company_compass_unlocked = "true"` per la sessione corrente (tab); al refresh si richiede di nuovo il biometrico se esiste una credential.

## Componente AppLock

Un wrapper `src/components/AppLock.tsx` avvolge il contenuto autenticato. Stati:

- **checking**: verifica se c'è credential e se la sessione è già sbloccata.
- **setup**: nessuna credential → proposta "Configura Face ID / Touch ID" con opzione "Salta per ora".
- **locked**: c'è credential e sessione non sbloccata → parte subito `navigator.credentials.get` (autenticazione).
- **unlocked**: mostra i children (es. `AppLayout`).
- **error**: utente nega / errore → messaggio + "Riprova" e "Rimuovi blocco biometrico".

## Chiavi di storage

```ts
const CRED_KEY = 'company_compass_webauthn_cred_id';
const SESSION_KEY = 'company_compass_unlocked';
```

## Registrazione (creazione credential)

```ts
const cred = await navigator.credentials.create({
  publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    rp: { name: "Company Compass", id: window.location.hostname },
    user: {
      id: crypto.getRandomValues(new Uint8Array(16)),
      name: "user",
      displayName: "Company Compass",
    },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }],
    authenticatorSelection: { userVerification: "required", residentKey: "preferred" },
    timeout: 60000,
  },
}) as PublicKeyCredential | null;
if (!cred) throw new Error("Registrazione annullata");
localStorage.setItem(CRED_KEY, bufferToBase64(cred.rawId));
sessionStorage.setItem(SESSION_KEY, "true");
```

- `userVerification: "required"` forza Face ID / Touch ID (o PIN).
- Si salva solo `cred.rawId`, non la chiave privata (resta nel dispositivo).

## Autenticazione (sblocco)

```ts
const credId = localStorage.getItem(CRED_KEY);
await navigator.credentials.get({
  publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    allowCredentials: [{ id: base64ToBuffer(credId), type: "public-key" }],
    userVerification: "required",
    timeout: 60000,
  },
});
sessionStorage.setItem(SESSION_KEY, "true");
```

## Utility base64 ↔ ArrayBuffer

```ts
function bufferToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function base64ToBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}
```

## Integrazione nel progetto

1. **App.tsx**  
   Avvolgere il layout protetto con `AppLock` **dopo** `RequireAuth`:
   ```tsx
   <Route element={
     <RequireAuth>
       <AppLock>
         <AppLayout />
       </AppLock>
     </RequireAuth>
   }>
   ```
   `AppLock` riceve `children` e li rende solo quando lo stato è `unlocked` (o `setup` con "Salta per ora").

2. **TopBar** (`src/components/layout/TopBar.tsx`)  
   Nel dropdown del menu utente (accanto a "Log out"):
   - Se non c'è `company_compass_webauthn_cred_id` in localStorage → voce "Attiva biometrico" che chiama la stessa `credentials.create` e salva l'ID.
   - Se c'è → voce "Rimuovi biometrico" che esegue `localStorage.removeItem("company_compass_webauthn_cred_id")` e `window.location.reload()`, così al prossimo accesso si torna in stato setup/senza blocco.

## Gestione errori

- `NotAllowedError`: utente annulla / nega → "Accesso biometrico negato" o "Registrazione annullata".
- `NotSupportedError`: dispositivo non supporta → "Biometrico non supportato su questo dispositivo".
- In stato error offrire "Riprova" (richiama `authenticate`) e "Rimuovi blocco biometrico" (rimuove credential e sblocca).

## File coinvolti

- `src/components/AppLock.tsx`: logica stati, registrazione, autenticazione e UI del lock (usa `CRED_KEY` e `SESSION_KEY` sopra).
- `src/App.tsx`: wrap di `AppLayout` con `<AppLock>` dentro `RequireAuth`.
- `src/components/layout/TopBar.tsx`: voci "Attiva biometrico" / "Rimuovi biometrico" nel menu utente (stesse chiavi localStorage).

## Note

- Funziona su HTTPS (e localhost). Su iOS Safari / PWA usa Face ID / Touch ID in modo nativo.
- La credential è legata al dominio (`rp.id: window.location.hostname`).
- Nessuna validazione lato server: è un layer aggiuntivo dopo il login Supabase/OAuth.
