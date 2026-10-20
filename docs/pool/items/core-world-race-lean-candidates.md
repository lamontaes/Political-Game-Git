---
id: core-world-race-lean-candidates
title: "Territory and district races the town doesn't vote in use fictional candidates with records, not each party's typical candidate (SG-GOV-world-race-lean)"
area: core
kind: stopgap
priority: 3
size: M
status: blocked
claimed-by: claude/political-game-pool-yucp92-l
pr:
blocked-on: core-race-candidates-with-records-house
source: added with npm run pool -- add
claimed-at: 2026-10-20T00:40:47.937Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Looked at Oct 20 (claude/political-game-pool-3xfqef-6), released unbuilt. The row is SG-GOV-world-race-lean (`world-races.ts`, line 827): races the town does not vote in use each party's typical candidate, and a legislative district with no read result uses the state's vote at a typical margin. The replacement is two things at L size: fictional candidates with records and campaigns for every seat (the people engines' who-runs, seeded generation of who exists), and each legislative district's own 2024 result as sourced data. A builder splits it first: one item for candidates with records for the House seats, one for the legislative-district results data.
