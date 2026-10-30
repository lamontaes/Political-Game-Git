---
id: dev-mode-records-proof
title: "Dev mode keeps a records proof, so two builds' runs of the same seed and place can be shown to keep the same records"
area: core
kind: feature
priority: 2
size: S
status: claimed
claimed-by: speed/dev-records-proof
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-29T22:59:38.603Z
---

**What.** A speed change must never change what the simulation decides, and until now the only check was speed:year's four-number fingerprint (date, people count, job count, money held), which misses any changed decision that leaves those totals alone. The owner, Oct 29, in the speed lead's session: 'That needs to be built into the advanced mode... a dev mode where you can be anybody, make anything happen in the simulation... trace why things happen', and 'if it's not developed in the game records proof, then you can go ahead and develop that and go ahead and merge whatever you need'.

**Rules.** Replace, never layer: the proof replaces speed:year's old fingerprint. Read-only screens spend no game time and create no facts. One rule, all 56 places: the test draws its place and seed and names them.

**Done when.** src/bench/dev-proof.ts digests every core table and every installed engine's tables at a date; dev mode's POST proof/save and POST proof/compare save and compare a run, naming each differing table and its first differing record with that record's trace; speed:year's year fingerprint is the proof's digest and --same-records names the tables that differ; dev-proof.test.ts shows two runs of a drawn seed and place keep identical proofs and one changed person is named by table and id.

**Files.** src/bench/dev-proof.ts, src/bench/dev-api.ts, scripts/speed-years/run.ts, scripts/speed-years/compare.ts

**Notes.** TODO
