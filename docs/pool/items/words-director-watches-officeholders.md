---
id: words-director-watches-officeholders
title: "An officeholder's records fire scenes: an address is a speech scene, a signing brings staff and press, and some endings open a game screen"
area: people
kind: feature
priority: 2
size: M
status: blocked
claimed-by: claude/political-game-pool-yucp92-bb
pr: #5180
blocked-on: Words line: the item text is an empty shell and the scenes need sentences worded by the English engine and a director producer for officeholder records
source: added with npm run pool -- add
claimed-at: 2026-10-20T02:31:57.448Z
---

**What.** An officeholder's records should open scenes: an address is a speech scene, a bill signing brings staff and press into the room, and some endings open a game screen. Today the director watches filings, hearings and laws reaching a person but not the office-day act record. Have the director read the act record and the signing record and stage the scene from them.

**Rules.** An effect is a read, not a record: the director reads the office-day act and signing records. No hand-written player text: the English engine words each scene. No dice: who attends follows the officeholder's staff and relationships.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place, seed named in the PR body), a controlled officeholder's state-of-the-city act yields a speech scene and a bill signing yields a scene with staff and press, each citing the act or signing record id; a test in src/director covers both.

**Files.** src/director/office-scene.ts, src/core2/modules/office-day.ts

**Notes.** Spec written by the docs cleanup pool-todo-shells-need-spec-oct19b; the Words session builds it.
