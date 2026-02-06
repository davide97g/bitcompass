# How to create custom alerts in your project using crazy-alerts

Use the crazy-alerts npm package to show overlay alerts (success, failure, celebration, urgent) from the terminal or CI on macOS.

# How to create custom alerts in your project using crazy-alerts

**crazy-alerts** is a macOS-only CLI that shows full-screen overlay alerts from the terminal. Overlays are native Swift and work during screen sharing. Use it for visible/audible feedback (e.g. CI success/failure, deploy done, break reminder).

## Requirements

- **macOS** (Darwin) only
- **Node.js** ≥ 14
- **Swift** (Xcode or Xcode Command Line Tools)

## Install

**Globally** (recommended for CLI use):

```bash
npm install -g crazy-alerts
```

Then run any command directly, e.g. `confetti`, `ambulance "Build failed"`.

**In your project** (no global install): add as dependency and run via npm scripts or node:

```bash
npm install crazy-alerts
# Then:
node node_modules/.bin/ambulance-run.js "Your message"
# Or add scripts in package.json and use:
npm run confetti -- --duration=8
npm run ambulance -- "Message"
```

## When to use which alert

- **Success / celebration**: `confetti`, `checkmark`, `rocket`, `clap`
- **Failure / urgency**: `ambulance "short description"`, `siren`, `danger`, `fire`, `klaxon`, `strobe`
- **Neutral / info**: `reminder`, `pill`, `banner`, `typewriter`, `countdown`, `dnd`, `pomodoro`, `rainbow`, `matrix`, `explosion`

## Quick examples

```bash
# Success
confetti
checkmark "Build passed"
rocket "Shipped!"

# Failure / urgent
ambulance "Tests failed"
siren "Server down"
fire "Deploy failed"

# Info
countdown 5 "Launch"
banner "Build in progress..."
reminder "Drink water"
```

## Conventions

- On **script/agent success**: run `confetti` or `checkmark "Done"`.
- On **script/agent failure**: run `ambulance "short reason"` (e.g. `ambulance "Tests failed"`).
- Keep messages short. Use env vars for overrides (e.g. `*_DURATION`, `*_MESSAGE`) when needed.
- **Platform**: macOS only; scripts exit with an error on other OS.

## All commands

`ambulance`, `confetti`, `siren`, `checkmark`, `countdown`, `fire`, `klaxon`, `danger`, `strobe`, `rocket`, `clap`, `rainbow`, `banner`, `pill`, `dnd`, `pomodoro`, `reminder`, `typewriter`, `matrix`, `explosion`.

Each supports optional `[message]` and env vars like `*_MESSAGE`, `*_DURATION`, `*_FONT_SIZE`. See the package README and USAGE.md for full options.
