---
id: play-needs-play-147
title: "Needs from other sessions listed in play.md (line 147): 30 lines"
area: play
kind: wiring
priority: 2
status: done
claimed-by: claude/play-147
pr: #4555
blocked-on:
milestone:
source: 'docs/archive/2026-10-23/coordination/play.md "Needs from other sessions" (line 147)'
claimed-at: 2026-10-16T02:47:27.090Z
---

**What.** This item holds 30 requests that the play session made of others, mixing crashes and defects (the two-level collapse failing on a housing lease for seed playtest-0712, a payroll arrears crash on 2027-03-20, a memory growth of about 1.9 GB over a year), missing exports (`applyOpeningSettings`, `castBallot`, a candidate name reader, `executiveDecision`), and the bench's gaps (rivals who never decide to run, a ballot the engine casts for the player, the director giving no moments in eight months). The asking session is gone. Walk the lines in order, verify each against main, close built ones with a commit, and split every unbuilt one into its own small pool item. The player would notice his ballot, his rivals and the director's scenes working.

**Rules.** Look before you ask: search docs/, the register and the pool for each line first; many are fixed, decided or already pool items; Wire to the world: a line closes only when another engine reads what it wrote in a played year, by record id; Speed: memory and time fixes are measured before and after against the 20% limit; Placeholders: SG-PLAY rows stay registered until replaced; An effect is a read, not a record: a handler whose mechanic is 'none' or 'records' is a placeholder, not a fix; One rule, all 56 places: repro seeds are only repros; fixes read data for all 56 places; Replace, never layer: closed lines are removed from `docs/archive/2026-10-23/coordination/play.md`.

**Done when.** Every one of the 30 lines in `docs/archive/2026-10-23/coordination/play.md` (Needs from other sessions, line 147) is struck with a commit or has a pool item id; for the player-facing ones (the ballot, rivals who run, director moments in eight months, the executive sign or veto) a drawn place and seed (named) shows the record id another engine read. Check by `npm run pool -- --check`. The owner plays it: casts his own ballot and sees rivals file against him.

**Files.** docs/archive/2026-10-23/coordination/play.md, src/bench/, src/core2/modules/candidacy.ts, src/director/scene.ts, src/core2/data/stopgaps.json

**Notes.** Overnight pool item 10: claim one list at a time. Verify.

**Triage (Oct 16, checked against main).** The first three lines (Oct 12 test failures, the stale stopgap line number and the desktop heap size) are stale: `two-level-elections.test.ts` and `recalls.test.ts` pass on main, and SG-PLAY-windows-package-allowed-to-fail is resolved. Struck, built on main: the world-settings export (`applyOpeningSettings` in `world-settings.ts`, SG-PLAY-world-settings-copy resolved); the home's dwelling kind (SG-PLAY-home-dwelling-kind resolved); doors and polls filling in households (SG-PLAY-doors-fill-in resolved); the player's ballot (`castBallot` is exported and the director's polling place casts through it); the executive sign or veto (`executiveDecision` is exported and the office day calls it); rivals who decide to run (the candidacy module calls `decideToRun` for each adult a contest reaches when it opens); the zero-dice allowlist (`npm run zero-dice` reports nothing new); the old-app UI and module hand-offs (the app is replaced).

Open, with an item: memory growth over a year (`core-m7-01-speed-and-memory`); world legislating's cost (`gov-stopgap-world-legislating-behavior`); keep playing after the controlled person dies, which still throws in `player-v1.ts` (`play-m5-03-keep-playing-as-someone-else`); the challenger name reader (`play-stopgap-results-assumed-data`); headlines, stance-question names and the unworded moments (the Words line, `words-unworded-moments`); the opening economy fallback for kin moves dated after day one (SG-PLAY-opening-economy-fallback stays registered). New items filed: `play-budget-line-names`, `play-territory-map-geometry`, `core-collapse-lease-unsupported`, `core-payroll-arrears-retry-crash`, `director-moments-for-a-new-adult`, `gov-filing-fee-and-file-line`. The Steam page needs the owner's price and date, and the title-screen art is the CTO's queue; neither is a build.
