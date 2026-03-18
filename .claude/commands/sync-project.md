Help me sync this project with the linked Compass project.

Sync keeps local rules, skills, commands, and solutions in sync with the remote Compass project. This is a CLI operation.

## Options

Ask me what kind of sync I want:

- **Check only** — see what would change without applying: `bitcompass sync --check`
- **Interactive sync** — select items to pull/update: `bitcompass sync`
- **Full sync** — sync everything non-interactively: `bitcompass sync --all -y`
- **Sync with prune** — also remove items no longer in the project: `bitcompass sync --prune`

## Steps

1. Ask which sync mode I prefer.
2. Run the appropriate `bitcompass sync` command in the terminal.
3. After sync completes, verify the results by checking the output.
4. If there were errors, help me troubleshoot (e.g. not logged in → `bitcompass login`, no project linked → `bitcompass init`).
