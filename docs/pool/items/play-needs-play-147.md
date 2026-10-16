---
id: play-needs-play-147
title: "Needs from other sessions listed in play.md (line 147): 30 lines"
area: play
kind: wiring
priority: 2
status: in-pr
claimed-by: claude/play-147
pr: #4555
blocked-on:
milestone:
source: 'docs/coordination/play.md "Needs from other sessions" (line 147)'
claimed-at: 2026-10-16T02:47:27.090Z
---

**What.** This item holds 30 requests that the play session made of others, mixing crashes and defects (the two-level collapse failing on a housing lease for seed playtest-0712, a payroll arrears crash on 2027-03-20, a memory growth of about 1.9 GB over a year), missing exports (`applyOpeningSettings`, `castBallot`, a candidate name reader, `executiveDecision`), and the bench's gaps (rivals who never decide to run, a ballot the engine casts for the player, the director giving no moments in eight months). The asking session is gone. Walk the lines in order, verify each against main, close built ones with a commit, and split every unbuilt one into its own small pool item. The player would notice his ballot, his rivals and the director's scenes working.

**Rules.** Look before you ask: search docs/, the register and the pool for each line first; many are fixed, decided or already pool items; Wire to the world: a line closes only when another engine reads what it wrote in a played year, by record id; Speed: memory and time fixes are measured before and after against the 20% limit; Placeholders: SG-PLAY rows stay registered until replaced; An effect is a read, not a record: a handler whose mechanic is 'none' or 'records' is a placeholder, not a fix; One rule, all 56 places: repro seeds are only repros; fixes read data for all 56 places; Replace, never layer: closed lines are removed from `docs/coordination/play.md`.

**Done when.** Every one of the 30 lines in `docs/coordination/play.md` (Needs from other sessions, line 147) is struck with a commit or has a pool item id; for the player-facing ones (the ballot, rivals who run, director moments in eight months, the executive sign or veto) a drawn place and seed (named) shows the record id another engine read. Check by `npm run pool -- --check`. The owner plays it: casts his own ballot and sees rivals file against him.

**Files.** docs/coordination/play.md, src/bench/, src/core2/modules/candidacy.ts, src/director/scene.ts, src/core2/data/stopgaps.json

**Notes.** Overnight pool item 10: claim one list at a time. Verify.
