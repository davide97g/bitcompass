# File Tree Visualization — Design Spec

## Context

The BitCompass webapp currently displays rules, skills, commands, and solutions as card grids on the Compass Project detail page. Users cannot visualize how these items map to their actual project folder structure (e.g., `.cursor/rules/`, `.cursor/skills/`). This makes it hard to understand what gets written to disk when pulling content.

**Goal:** Add a VS Code Explorer-style file tree tab to the project detail page that shows items in their simulated folder structure with an inline preview panel. Additionally, add email/password auth for E2E testing and set up Playwright tests.

## Design

### 1. File Tree Tab (CompassProjectDetailPage)

**Location:** New "Files" tab on the existing project detail page, alongside the current "Overview" content.

**Layout:** Split resizable pane using `react-resizable-panels` (already in deps via `@/components/ui/resizable.tsx`).

```
+---------------------------+--------------------------------------+
| Explorer         .cursor  |  auth-pattern.mdc      rule  always  |
|---------------------------|  Tech: React  TypeScript  Supabase   |
| v rules              [3]  |  v1.2 | Updated 2 days ago           |
|   > auth-pattern.mdc  *   |--------------------------------------|
|     error-handling.mdc    |                                      |
|     testing-rules.mdc     |  Authentication and authorization    |
| v skills             [2]  |  patterns for the project.           |
|     tdd.md                |                                      |
|     debugging.md          |  ## Rules                            |
| > commands           [1]  |  - Always use JWT tokens...          |
| > documentation      [2]  |  - Store refresh tokens server-side  |
|---------------------------|                                      |
| SPECIAL FILES             |  +----------------------------------+|
|   * CLAUDE.md             |  | bitcompass rules pull abc-123  📋||
|   * .cursorrules          |  +----------------------------------+|
|---------------------------|                                      |
| 3 rules 2 skills 1 cmd   |                                      |
+---------------------------+--------------------------------------+
```

### 2. Component Architecture

**New files under `apps/webapp/src/components/file-tree/`:**

| Component | Purpose |
|-----------|---------|
| `FileTreeView.tsx` | Top-level container: `ResizablePanelGroup` with tree + preview panels |
| `FileTreeSidebar.tsx` | Left panel: folder tree + special files + stats footer |
| `FileTreeFolder.tsx` | Single collapsible folder (chevron, icon, label, count) |
| `FileTreeFileItem.tsx` | Single file row (icon, filename, selected state) |
| `FileTreePreview.tsx` | Right panel: header, metadata, markdown body, pull command |
| `FileTreeEmptyState.tsx` | No-selection state |
| `use-file-tree.ts` | Hook: builds `FileTree` from `Rule[]` + project config |
| `file-tree-constants.ts` | Types, color maps, editor paths, kind subfolders (ported from CLI) |

**`file-tree-constants.ts` must define** (ported from `packages/bitcompass-cli/src/auth/project-config.ts` and `types.ts`):
- `EditorProvider` type: `'cursor' | 'claudecode' | 'vscode' | 'antigrativity'`
- `EDITOR_BASE_PATHS`: `{ cursor: '.cursor/', claudecode: '.claude/', vscode: '.vscode/', antigrativity: '.antigrativity/' }`
- `KIND_SUBFOLDERS`: `{ rule: 'rules', skill: 'skills', command: 'commands', solution: 'documentation' }`
- `SPECIAL_FILE_TARGETS`: `{ 'claude.md': { path: 'CLAUDE.md', ... }, 'agents.md': { path: 'AGENTS.md', ... }, ... }` (mirrors CLI)
- `KIND_COLORS`: color maps per kind for tree icons, badges, and folder styling
- Extract `CARD_KIND_CLASSES` from `CompassProjectDetailPage.tsx` into this shared module

### 3. Data Flow

**Input:** `Rule[]` (all project rules, unpaginated) + `project.config` (editor setting)

**New hook** in `use-rules.ts`:
```ts
useProjectRulesAll(projectId) → { data: Rule[], isLoading }
```
Fetches all rules for a project without pagination (cap at 500). If the project has more than 500 items, show a truncation notice in the tree footer: "Showing 500 of {total} items".

**Tree building** in `use-file-tree.ts`:
1. Safely parse `project.config` (typed as `Record<string, unknown> | null`): extract `config?.editor` as string, validate it's a known `EditorProvider`, default to `'cursor'` if missing/invalid
2. Look up `EDITOR_BASE_PATHS[editor]` → e.g. `.cursor/`
3. Partition rules by `kind` into folders
4. Separate rules with `special_file_target` into special files list
5. Derive filenames using existing `ruleDownloadBasename(title, id)` from `@/lib/utils` + extension (`.mdc` for rules, `.md` for others). For duplicate filenames, append `-{first6charsOfId}`
6. For special files: use `SPECIAL_FILE_TARGETS[target].path`
7. Return `FileTree` object (memoized)

**Types:**
```ts
interface TreeFolder {
  path: string;        // ".cursor/rules"
  label: string;       // "rules"
  kind: RuleKind;
  items: TreeFile[];
}

interface TreeFile {
  rule: Rule;
  filename: string;
  isSpecialFile: boolean;
}

interface FileTree {
  basePath: string;
  editor: EditorProvider;
  folders: TreeFolder[];
  specialFiles: TreeFile[];
  stats: Record<string, number>;
}
```

### 4. State Management & Loading

In `FileTreeView.tsx`:
- `selectedFileId: string | null` — which file is previewed
- `expandedFolders: Set<string>` — which folders are open (default: all non-empty)
- Panel sizes managed internally by `react-resizable-panels`

**Loading state:** While `useProjectRulesAll` is loading, show a skeleton in the tree panel (3-4 animated bars mimicking folder rows) and "Loading..." text in the preview panel. Use existing shadcn `Skeleton` component.

### 5. Color System

Reuses existing kind colors from `CARD_KIND_CLASSES`:
- **Rules:** sky (sky-400/500)
- **Skills:** violet (violet-400/500)
- **Commands:** amber (amber-400/500)
- **Solutions/Docs:** emerald (emerald-400/500)
- **Special files:** orange (orange-400/500)

### 6. Tab System

Modify `CompassProjectDetailPage.tsx`:
- Wrap existing content in `<TabsContent value="overview">`
- Add `<TabsContent value="files"><FileTreeView ... /></TabsContent>`
- Add top-level `<Tabs>` with `<TabsList>` containing Overview + Files triggers
- The existing inner kind-filter Tabs remain independent (Radix Tabs instances don't conflict)
- Add `TabsContent` to the import (currently only `Tabs, TabsList, TabsTrigger` are imported)

### 7. Email/Password Auth

**`use-auth.ts`** — add two new methods:
```ts
signInWithEmail(email, password) → Promise<void>
signUpWithEmail(email, password) → Promise<void>
```

**`LoginPage.tsx`** — add below Google button:
- "Or sign in with email" divider
- Email + password inputs
- Sign in / Sign up buttons
- Error display
- Conditionally rendered via `VITE_ENABLE_EMAIL_AUTH` env var

### 8. Playwright E2E Tests

**New files:**
```
apps/webapp/
  playwright.config.ts
  e2e/
    fixtures.ts          — authenticated page fixture
    helpers/auth.ts      — email/password login helper
    file-tree.spec.ts    — file tree tests
    login.spec.ts        — login tests
```

**Test cases for file-tree.spec.ts:**
1. Navigate to Files tab → tree panel visible
2. Folder expand/collapse → children appear/disappear
3. File selection → preview shows rule title + body
4. Preview metadata → kind badge, tech tags, pull command visible
5. Copy pull command → clipboard/toast works
6. Empty project → empty state message
7. Open detail link → navigates to `/rules/:id`

**Config:** Chromium only, base URL `http://localhost:5173`, web server via `bun run dev`.

## Files to Modify

| File | Change |
|------|--------|
| `apps/webapp/src/pages/CompassProjectDetailPage.tsx` | Add top-level tab system, import FileTreeView |
| `apps/webapp/src/hooks/use-rules.ts` | Add `useProjectRulesAll` hook |
| `apps/webapp/src/hooks/use-auth.ts` | Add `signInWithEmail`, `signUpWithEmail` |
| `apps/webapp/src/pages/LoginPage.tsx` | Add email/password form |

## Files to Create

| File | Purpose |
|------|---------|
| `apps/webapp/src/components/file-tree/*.tsx` | 6 components + 1 hook + 1 constants file |
| `apps/webapp/playwright.config.ts` | Playwright configuration |
| `apps/webapp/e2e/*.ts` | E2E test files |

## Reusable Existing Code

| What | Where |
|------|-------|
| `ResizablePanelGroup/Panel/Handle` | `@/components/ui/resizable.tsx` |
| `Tabs/TabsList/TabsTrigger/TabsContent` | `@/components/ui/tabs.tsx` |
| `Collapsible/CollapsibleTrigger/CollapsibleContent` | `@/components/ui/collapsible.tsx` |
| `ScrollArea` | `@/components/ui/scroll-area.tsx` |
| `MarkdownContent` | `@/components/ui/markdown-content.tsx` |
| `CodeBlockWithCopy` | `@/components/ui/code-block-with-copy.tsx` |
| `getTechStyle(tech)` | `@/lib/tech-styles.ts` |
| `CARD_KIND_CLASSES` | Extract from CompassProjectDetailPage.tsx → `file-tree-constants.ts` |
| `ruleDownloadBasename` | `@/lib/utils` (for filename derivation) |
| `Skeleton` | `@/components/ui/skeleton.tsx` (for loading states) |

## Verification

1. **Dev server:** `cd apps/webapp && bun run dev` → navigate to a Compass project → click Files tab
2. **Tree rendering:** Verify folders show with correct counts, expand/collapse works
3. **Preview:** Click a file → preview shows title, body, tech tags, pull command
4. **Resizing:** Drag the panel handle → panels resize correctly
5. **Email auth:** Set `VITE_ENABLE_EMAIL_AUTH=true` → email form appears on login page → can sign up and sign in
6. **E2E tests:** `cd apps/webapp && bunx playwright test` → all tests pass
