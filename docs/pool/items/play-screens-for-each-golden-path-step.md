---
id: play-screens-for-each-golden-path-step
title: "Screens for each golden path step."
area: play
kind: feature
priority: 2
status: done
claimed-by: claude/negotiate-screen
pr: #4818
blocked-on:
milestone:
source: "docs/coordination/play.md line 134 (unchecked checklist line)"
claimed-at: 2026-10-16T20:38:59.320Z
---

**What.** Checked against main on Oct 16: Most screens exist (campaign rows, election night, ordinance drafting, the meeting vote, what changed) and `path-check.ts` reports the furthest step. Missing: the person card, a negotiation screen (`seatAct` allows only "draft"), and a browser spec per screen. Next: A negotiate act and screen, then a browser spec per screen. The player would see it as a choice among people, never a form.

**Rules.** An effect is a read, not a record: each screen shows records an engine wrote and spends no game time; No hand-written player text: every sentence is worded by the English engine and every label is a control name; Replace, never layer: no old stand-in screen is kept beside a new one; This is a game, not a spreadsheet: the screens present the golden path only, with no extra forms; Wire to the world: each step moves votes, laws, money or people in a generated world; One rule, all 56 places: no place named in code; Speed: screens read indexes, with no world scan.

**Done when.** In a drawn place (buildBenchWorld, seed named in the PR body) `path-check.ts` reports step 7 with a non-empty `bill.deals`, shown by the bill id, and a browser spec walks the negotiation screen. The owner plays it: A negotiate act and screen, then a browser spec per screen.

**Files.** src/bench/play.mjs, src/bench/campaign.ts, src/bench/legislature.ts, src/bench/reached.ts, src/bench/path-check.ts

**Notes.** Checklist line from play.md; verify against main before starting.
