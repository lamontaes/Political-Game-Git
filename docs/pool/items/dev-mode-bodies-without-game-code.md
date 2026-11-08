---
id: dev-mode-bodies-without-game-code
title: "Bodies and actions dev mode cannot reach for want of game code: courts and judges, school boards, appointments"
area: play
kind: research
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Dev mode drives bills at every legislative body, bribes and runs. The game has no code to attach to for courts and judges (verdicts, sentencing), school boards (a body with its own bills and members), or appointments and confirmations (an executive naming an official, a body confirming). Each needs its own engine item before dev mode can drive it, and none gets a dev-only write.

**Rules.** One engine per mechanic: each missing body becomes data rows the existing body engine reads, not a second engine.

**Done when.** Each of the three has a pool item naming the engine it belongs in, with the dev control it enables, checked by searching docs/pool/items; the list is quoted in a drawn place's dev panel.

**Files.** docs/pool/items

**Notes.** TODO
