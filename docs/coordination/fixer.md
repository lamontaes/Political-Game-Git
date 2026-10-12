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
- [ ] **When no bug is assigned:** take open work from `BOARD.md` (write "Taking <item>" here first).
  - Verified by: That item's own test.

## Needs from other sessions

None yet.

## Log

Newest first: one line per event (what changed, the measured result, what's next).

- Oct 12 07:40 UTC: #3997, #3998 and #4000 (prettier pass over 19 docs files that failed `repository` on main) are merged. Main's skill-ops, Release and format checks should now be green; check the next main run. #3975 had main merged in at 00738a0e. Next: BOARD open work; note this workspace has no dependencies installed, so I can't run tests locally and rely on CI.
