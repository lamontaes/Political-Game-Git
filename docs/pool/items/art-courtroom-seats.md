---
id: art-courtroom-seats
title: "ART-5 audience and jury seats in courtrooms (#3442)"
area: art
kind: feature
priority: 2
status: done
claimed-by: claude/session21-art5-courtrooms
pr: #3442
blocked-on:
milestone:
source: "open PR #3442"
claimed-at: 2026-10-15T22:41:33.331Z
---

**What.** PR #3442 (branch claude/session21-art5-courtrooms) adds spectator pews and twelve jury chair anchors to the courtroom backdrops so a trial scene can seat people where the room has seats. It is not a draft, and it was sent back on 2026-10-15 for a code conflict with main in `src/presentation/backdrop-anchors.test.ts`. Merge main into the branch with a plain merge, resolve the test file, re-run the anchor tests and leave the PR mergeable. The player would notice a trial or hearing scene where the jury, the lawyers and the audience sit in the room's real seats.

**Rules.** An effect is a read, not a record: the seat anchors are read by the scene stager (`src/bench/staging.ts`) when it seats a trial, so an anchor nobody reads does not count; Replace, never layer: any old courtroom placement that the anchors replace is deleted in the same change, counted in the PR body; One rule, all 56 places: the courtroom anchors are art data used for any place's court, with no place named; Placeholders: any asset or anchor not final is a registered stopgap; Speed: anchors are looked up per scene, with no scan of all backdrops.

**Done when.** The branch merges clean with main (plain merge, never force), `src/presentation/backdrop-anchors.test.ts` and the scene staging tests pass, and a staged trial in a drawn place (name it and the seed) seats twelve jurors and the audience on the anchors, shown in a full-window screenshot at 1672x941 merged on the owner's yes. Include the release declaration in `docs/release/changes/`. The owner plays it: sits through a court scene and sees a full jury box and pews.

**Files.** src/presentation/backdrop-anchors.test.ts (on the PR branch as of 2026-10-15), src/bench/staging.ts, src/bench/backdrop-places.ts, art/backdrops/

**Notes.** Read the PR body and any CTO comment first.
Sent back 2026-10-15 from PR #3442 (branch claude/session21-art5-courtrooms): code conflict with main in src/presentation/backdrop-anchors.test.ts; finish on that branch, merge main into it first.
