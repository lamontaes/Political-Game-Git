---
id: dev-mode-bodies-without-game-code
title: "Bodies and actions dev mode cannot reach for want of game code: courts and judges, school boards, appointments"
area: play
kind: research
priority: 3
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-dev-mode-bodies-without-game-code
pr: #8675
after:
blocked-on:
lead: play-first
model: sonnet
effort: low
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at: 2026-11-11T06:02:58.780Z
branch: claude/pool-dev-mode-bodies-without-game-code
---

**What.** Dev mode drives bills at every legislative body, bribes and runs. It cannot reach courts and judges (verdicts, sentencing), school boards (a body with its own bills and members) or appointments and confirmations (an executive naming an official, a body confirming) because the game has no code to attach to. Each needs its own engine item before dev mode can drive it, and none gets a dev-only write. This item only files the missing pool items; it builds no engine.

**Cause.** Design: docs/ROADMAP.md ("Courts come after early access"). The dev scene list returns "No game code to attach to" for a scene with no recipe (`src/bench/dev-mode.ts` line 1359). Appointments already have docs/pool/items/office-appointments.md and docs/pool/items/gov-appointment-record-names-appointee.md; no item names school boards or court verdicts as a dev control.

**Fix.** Search docs/pool/items first. Write one pool item each for school boards and for court verdicts, naming the engine that must exist and the dev control it enables, and cite the two existing appointment items. No engine is built here.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic: each missing body becomes data rows the existing body engine reads, not a second engine. Look before you ask: search the pool before filing, and add evidence to a match instead of a twin.

**Done when.** A second session searches docs/pool/items and finds one item for school boards, one for court verdicts and the two appointment items cited in this item's Notes, each naming its engine and the dev control it enables. In a drawn place's dev scene list it sees the cause for each missing body named in those items.

**Waits on.** Nothing.

**Files.** docs/pool/items, src/bench/dev-mode.ts

**Notes.** TODO

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 06:02 UTC) on branch claude/pool-dev-mode-bodies-without-game-code.
