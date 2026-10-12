# FIXER: Standby bug fixer

Only FIXER writes this file. See "The team" in `AGENTS.md` and `docs/coordination/BOARD.md`.

- **Owns:** Nothing of its own; works only on bugs the CTO assigns.
- **Branch:** one branch per bug, fixer/<short-name>.
- **Model:** Sonnet, high (Opus for a genuinely hard bug): bounded fixes, faster and cheaper.
- **Starts from:** Main's current red checks.

## What the owner can play now

Nothing yet.

## Checklist

An order of work, not a ceiling: when it's done, keep going into this area's next roadmap items.

- [ ] **Main's red checks first.** The release build failing; the two instruction-file tests red because the Codex and Claude skill folders drifted; the speed map needing main merged in (#3975).
  - Verified by: Each check green on main.
- [ ] **Assigned bugs.** Bugs from your evening playtests and checker failures; one bug per PR; no refactoring; inside a pillar's folders only with that pillar told.
  - Verified by: A test that fails before the fix and passes after.
  - Needs: The owning pillar

## Needs from other sessions

None yet.

## Log

Newest first: one line per event (what changed, the measured result, what's next).
