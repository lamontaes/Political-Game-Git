# Astra: screen work

> **History.** This describes the old engine or a process that ended in October 2026. Don't follow it; read `AGENTS.md`, `ARCHITECTURE.md` and `docs/README.md`.

The character screen is built and the owner approved its screenshot in chat.
The next requested screen is the person card, with the same large figure at the side.

## Owner direction in this chat

Build the UX as layouts and controls that the game's records can populate.
Mockups are visual direction, not literal feature specifications. Preserve the
current Kit 13 borders, corners, fonts and controls. Do not copy extra mockup
chevrons or decorations. Never hard-code a sample character or room behind the
portrait. Artwork is supplied by the game, or the slot remains clear.

## Work

- Options: draft PR #4289 updated. Compact layout, real fullscreen control,
  Continue, and Quit to title. The clock handoff was fixed. Browser checks passed.
- Character: draft PR #4291 ready for the CTO. Record-driven portrait and grouped
  details; optional background and portrait fields; household names open person
  cards. The generated-world browser check and null-artwork contract check pass.
- Next: person card with a large side figure, then the remaining Order 1 screens.

No PR was merged. The director and English engine remain with Words.

## Checks and review

Only changed-file checks and focused browser journeys are run. Owner screenshots
use the requested full window. A read-only helper reviewed the Options PR text
under the civic-reports skill and returned PASS; no implementation was delegated.
Model and effort are inherited from the current Codex session; usage is not
visible. The report needed one revision for evidence and verification wording.
