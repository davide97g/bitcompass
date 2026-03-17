# Monorepo Turborepo Restructure Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the BitCompass repo into a Turborepo monorepo with `apps/webapp` (current root app) and `packages/bitcompass-cli` (unchanged).

**Architecture:** Move all webapp source, config, and asset files into `apps/webapp/`. Replace the root `package.json` with a workspace root. Add `turbo.json` to orchestrate `build`, `dev`, `lint`, and `test` across packages. Bun manages workspaces via its native `workspaces` field.

**Tech Stack:** Turborepo ^2, Bun 1.3.10 (workspace manager), Vite (webapp build, unchanged), TypeScript

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `apps/webapp/` | New home for all webapp source/config |
| Move   | `src/` → `apps/webapp/src/` | Webapp source code |
| Move   | `public/` → `apps/webapp/public/` | Static assets |
| Move   | `supabase/` → `apps/webapp/supabase/` | Supabase config/migrations |
| Move   | `index.html` → `apps/webapp/index.html` | Vite entrypoint |
| Move   | `vite.config.ts` → `apps/webapp/vite.config.ts` | Vite config |
| Move   | `tsconfig.json` → `apps/webapp/tsconfig.json` | Root TS config |
| Move   | `tsconfig.app.json` → `apps/webapp/tsconfig.app.json` | App TS config |
| Move   | `tsconfig.node.json` → `apps/webapp/tsconfig.node.json` | Node TS config |
| Move   | `tailwind.config.ts` → `apps/webapp/tailwind.config.ts` | Tailwind config |
| Move   | `postcss.config.js` → `apps/webapp/postcss.config.js` | PostCSS config |
| Move   | `eslint.config.js` → `apps/webapp/eslint.config.js` | ESLint config |
| Move   | `components.json` → `apps/webapp/components.json` | shadcn/ui config |
| Move   | `vercel.json` → `apps/webapp/vercel.json` | Vercel SPA rewrite rule |
| Move   | `vitest.config.ts` → `apps/webapp/vitest.config.ts` | Vitest config |
| Move   | `package.json` → `apps/webapp/package.json` | Webapp deps (modified: rename + remove sonar:fetch) |
| Replace | `package.json` (root) | New workspace root package.json |
| Create | `turbo.json` | Turborepo pipeline |
| Modify | `.gitignore` | Add `.turbo` |
| No change | `packages/bitcompass-cli/` | Entire CLI package is untouched |
| Stay   | `README.md`, `CLAUDE.md`, `docs/`, `.gitignore` | Repo-level files remain at root |

---

## Task 1: Move webapp files into `apps/webapp/`

**Files:**
- Create: `apps/webapp/` (directory)
- Move: all webapp files listed in the file map above

- [ ] **Step 1: Create the `apps/webapp/` directory**

```bash
mkdir -p apps/webapp
```

- [ ] **Step 2: Move webapp source and asset directories**

```bash
git mv src apps/webapp/src
git mv public apps/webapp/public
git mv supabase apps/webapp/supabase
```

- [ ] **Step 3: Move HTML entrypoint**

```bash
git mv index.html apps/webapp/index.html
```

- [ ] **Step 4: Move build/tool config files**

```bash
git mv vite.config.ts apps/webapp/vite.config.ts
git mv tsconfig.json apps/webapp/tsconfig.json
git mv tsconfig.app.json apps/webapp/tsconfig.app.json
git mv tsconfig.node.json apps/webapp/tsconfig.node.json
git mv tailwind.config.ts apps/webapp/tailwind.config.ts
git mv postcss.config.js apps/webapp/postcss.config.js
git mv eslint.config.js apps/webapp/eslint.config.js
git mv components.json apps/webapp/components.json
git mv vercel.json apps/webapp/vercel.json
git mv vitest.config.ts apps/webapp/vitest.config.ts
```

- [ ] **Step 5: Move the webapp package.json**

```bash
git mv package.json apps/webapp/package.json
```

- [ ] **Step 6: Verify the moves**

```bash
ls apps/webapp/
```

Expected output includes: `src`, `public`, `supabase`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `tailwind.config.ts`, `postcss.config.js`, `eslint.config.js`, `components.json`, `vercel.json`, `vitest.config.ts`, `package.json`

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: move webapp files into apps/webapp"
```

---

## Task 2: Update `apps/webapp/package.json`

**Files:**
- Modify: `apps/webapp/package.json`

Two changes only: rename the package and remove `sonar:fetch` (which moves to the root).

- [ ] **Step 1: Update the `name` field and remove `sonar:fetch`**

Open `apps/webapp/package.json` and:
1. Change `"name": "bitcompass"` → `"name": "@bitcompass/webapp"`
2. Remove the `"sonar:fetch": "npx sonarflow fetch"` line from `scripts`

All other content (dependencies, devDependencies, remaining scripts) stays exactly as-is.

- [ ] **Step 2: Verify the changes**

```bash
cat apps/webapp/package.json | grep -E '"name"|sonar'
```

Expected: shows `"@bitcompass/webapp"`, no `sonar:fetch` line.

- [ ] **Step 3: Commit**

```bash
git add apps/webapp/package.json
git commit -m "chore: rename webapp package to @bitcompass/webapp"
```

---

## Task 3: Create the workspace root `package.json`

**Files:**
- Create: `package.json` (root)

- [ ] **Step 1: Create the root `package.json`**

Create `/package.json` with this exact content:

```json
{
  "name": "bitcompass-monorepo",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "packageManager": "bun@1.3.10",
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "test": "turbo test",
    "sonar:fetch": "bunx sonarflow fetch"
  },
  "devDependencies": {
    "turbo": "^2"
  }
}
```

- [ ] **Step 2: Verify**

```bash
cat package.json
```

Expected: valid JSON with `workspaces`, `packageManager`, `scripts`, and `turbo` devDependency.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add workspace root package.json"
```

---

## Task 4: Create `turbo.json`

**Files:**
- Create: `turbo.json` (root)

- [ ] **Step 1: Create `turbo.json`**

Create `/turbo.json` with this exact content:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {
      "outputs": []
    }
  }
}
```

- [ ] **Step 2: Verify**

```bash
cat turbo.json
```

Expected: valid JSON matching the content above.

- [ ] **Step 3: Commit**

```bash
git add turbo.json
git commit -m "chore: add turbo.json pipeline config"
```

---

## Task 5: Update `.gitignore`

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add `.turbo` to `.gitignore`**

Append `.turbo` to the end of `.gitignore`:

```
.turbo
```

- [ ] **Step 2: Verify**

```bash
grep '\.turbo' .gitignore
```

Expected: `.turbo`

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: add .turbo to .gitignore"
```

---

## Task 6: Install dependencies and verify the monorepo

**Files:**
- Regenerated: `bun.lock` (root — replaces `bun.lockb`)

- [ ] **Step 1: Install from the root**

```bash
bun install
```

Expected: Bun resolves all workspaces (`apps/webapp`, `packages/bitcompass-cli`), installs deps, and generates a `bun.lock` at the root. No errors.

- [ ] **Step 2: Verify workspace packages are linked**

```bash
bun pm ls
```

Expected: lists `@bitcompass/webapp` and `bitcompass` (CLI) as workspace packages.

- [ ] **Step 3: Verify turbo can discover packages**

```bash
bunx turbo ls
```

Expected: lists both `@bitcompass/webapp` and `bitcompass` as packages.

- [ ] **Step 4: Run build from root**

```bash
bun run build
```

Expected: Turborepo runs `build` for both packages. The webapp Vite build completes successfully (output in `apps/webapp/dist/`). The CLI TypeScript build completes (output in `packages/bitcompass-cli/dist/`).

- [ ] **Step 5: Run lint from root**

```bash
bun run lint
```

Expected: Turborepo runs `lint` for both packages. No errors.

- [ ] **Step 6: Run tests from root**

```bash
bun run test
```

Expected: Turborepo runs `test` across packages. All tests pass.

- [ ] **Step 7: Verify webapp dev server starts**

```bash
cd apps/webapp && bun run dev
```

Expected: Vite dev server starts on `http://localhost:5173`. Ctrl+C to stop.

- [ ] **Step 8: Commit the lockfile**

```bash
git add bun.lock
git commit -m "chore: regenerate bun.lock for monorepo workspace"
```

---

## Post-migration notes

- **Vercel deployment:** In the Vercel project settings, set `rootDirectory` to `apps/webapp`. The `vercel.json` SPA rewrite rule is now at `apps/webapp/vercel.json` and will be picked up automatically once `rootDirectory` is configured.
- **Supabase CLI:** Run `supabase` commands from `apps/webapp/` (e.g., `cd apps/webapp && supabase db push`).
- **`packages/bitcompass-cli/bun.lock`:** The CLI's standalone lockfile at `packages/bitcompass-cli/bun.lock` is superseded by the root `bun.lock`. It can be deleted and gitignored, but this is optional since the constraint was no source code changes (the lockfile is not source code).
