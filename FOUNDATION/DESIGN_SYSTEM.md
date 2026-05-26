# Evernest Design System Overlay

Inherits from:
- `/Users/TonyWan/Codex Projects/AI-OS/docs/systems/dashboard-philosophy.md`

## Design Intent

Evernest should feel emotionally calming, operationally capable, and cognitively lightweight.

References:

- OpenAI: clarity, restraint, directness
- Apple Health: personal health-adjacent calm
- Linear: operational precision
- Airbnb: approachable coordination
- Headspace: warmth and emotional safety

## Non-Negotiables

- Mobile-first layout.
- Accessible contrast, hit targets, labels, focus states, and keyboard paths.
- No harsh medical styling, alarmist color usage, or hospital-dashboard density.
- No decorative clutter that competes with care tasks.
- Reusable components over one-off screen styling.
- Icons should use `lucide-react` on web unless the design system changes.

## Existing Tokens

Current useful tokens live in `src/styles.css`:

- background, foreground, card, primary, secondary, muted
- sage, sand, blush, sky
- `phone-shell`, `card-soft`, `hairline`, `grad-hero`, `grad-warm`

These should be promoted into a shared package only after the production app structure exists.

## Component Rules

- Screen-level components compose; they should not define domain rules.
- Repeated card, action row, profile selector, permission badge, and status chip patterns should be extracted before the same pattern appears a third time.
- Destructive or privacy-sensitive actions require clear confirmation and plain-language impact.
- Medical-adjacent copy must describe logging, organizing, sharing, or coordinating. It must not diagnose, recommend treatment, or imply clinical judgment.

