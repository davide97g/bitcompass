# Improvement & UI/UX Priority Plan

Priority order for CLI, MCP, and Webapp improvements. Tackle in order by tier; within a tier, order is suggested but flexible.

---

## P0 – Do First (high impact, unblocks others)

| # | Area | Item | Why first |
|---|------|------|-----------|
| 1 | **Webapp** | Copy buttons on CLI page code blocks | Same pattern as MCP page; quick win, improves docs usage. |
| 2 | **CLI** | `bitcompass` (no args) → show short welcome + "Run bitcompass --help" | First thing new users see; sets expectations. |
| 3 | **CLI** | Validate `log` date format (YYYY-MM-DD) and show clear error | Prevents confusing failures when dates are wrong. |
| 4 | **Webapp** | Persist sidebar collapsed state in `localStorage` | One-line change, better UX for returning users. |

---

## P1 – High Impact, Core UX

| # | Area | Item | Why |
|---|------|------|-----|
| 5 | **CLI** | `--no-color` / `NO_COLOR` support | Scripts and CI need plain text; standard practice. |
| 6 | **CLI** | Consistent exit codes (e.g. 1 = error, 2 = not found / bad args) | Enables scripting and clearer failure handling. |
| 7 | **MCP** | Use real CLI version in `serverInfo` (from package.json) | Correct version in Cursor; no code complexity. |
| 8 | **Webapp** | Breadcrumbs on detail pages (e.g. Rules > &lt;title&gt;) | Easier navigation and context. |
| 9 | **Webapp** | Rules list: persist filters/search in URL (`?kind=&q=`) | Shareable links, back/forward works. |
| 10 | **Webapp** | Empty states with CTA (e.g. "Publish your first rule" + link to CLI/MCP) | Guides new users when there's no data. |

---

## P2 – Strong Value, Moderate Effort

| # | Area | Item | Why |
|---|------|------|-----|
| 11 | **CLI** | Table or aligned columns for `rules list` / `solutions list` (with TTY or `--table`) | Much easier to scan than plain lines. |
| 12 | **CLI** | Subcommand examples in `--help` (e.g. for `rules pull`, `log`) | Faster discovery without opening docs. |
| 13 | **MCP** | Richer tool descriptions (when to use, what's returned) | AI uses the right tool more often. |
| 14 | **Webapp** | Group sidebar nav (Knowledge / Tools / Create & Assistant) | Clearer structure as the app grows. |
| 15 | **Webapp** | Rule detail: show "Pull to project" CLI command with copy button | Bridges web and CLI. |
| 16 | **Webapp** | Assistant: suggested prompt chips on first load | Lower friction for first use. |

---

## P3 – Polish and Scale

| # | Area | Item | Why |
|---|------|------|-----|
| 17 | **CLI** | Search flow: allow "list only" / no forced selection | Better for browse-then-pull workflows. |
| 18 | **CLI** | Step-wise spinner for `log` (analyzing → pushing) | Clear progress for longer runs. |
| 19 | **MCP** | Add short `summary` in list/search JSON (e.g. "Found 5 rules") | AI can answer "how many?" without parsing full payload. |
| 20 | **Webapp** | Skeleton loaders instead of generic "Loading…" | Feels faster and more polished. |
| 21 | **Webapp** | Create entry: stepper (Step 1 of 3) + clearer validation | Fewer dead-ends and support questions. |
| 22 | **Webapp** | Pagination or "Load more" for rules/activity logs | Keeps UI fast as data grows. |

---

## P4 – Later / When Needed

| # | Area | Item | Why |
|---|------|------|-----|
| 23 | **CLI** | Login callback: optional "Copy: bitcompass whoami" on success page | Nice extra, not blocking. |
| 24 | **Webapp** | Lazy-load heavy routes (Assistant, Create) | Helps initial load; do when bundle size matters. |
| 25 | **Webapp** | Command palette (e.g. "/" or "?") for search/navigation | Power users; implement after P1–P3. |
| 26 | **All** | Shared terminology / glossary (rules vs solutions vs skills) | Good when you have more content and contributors. |

---

## Suggested Execution Order

- **This week:** P0 (items 1–4).
- **Next:** P1 (items 5–10).
- **Then:** Pick from P2 by area (e.g. finish CLI 11–12, then MCP 13, then Webapp 14–16).
- **Ongoing:** P3 and P4 as you have time and as usage grows.

---

## Full Context (original proposal)

The items above were derived from a broader improvement and UI/UX proposal covering:

- **CLI:** Output and readability, discovery and help, interactive flows, login and auth UX, robustness.
- **MCP:** Tool UX for the AI, capabilities and prompts, developer experience.
- **Webapp:** Global layout and navigation, CLI/MCP docs pages, rules and solutions, create entry and assistant, login and onboarding, accessibility and polish, performance.

For full rationale and detailed suggestions per area, refer to the conversation that produced this plan.
