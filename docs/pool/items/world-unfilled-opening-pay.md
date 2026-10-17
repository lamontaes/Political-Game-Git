---
id: world-unfilled-opening-pay
title: "An employer may raise pay for an opening nobody takes"
area: world
kind: feature
priority: 3
size: S
status: done
claimed-by: claude/unfilled-opening-pay
pr: #4838
after:
blocked-on:
source: "owner, Oct 16"
claimed-at: 2026-10-16T21:47:12.386Z
---

**What.** An opening nobody takes may be offered higher pay by its employer, read from the employer's own books and traits, with no cap: "if they can't afford it they can't afford it; if they're stubborn they might not do it" (owner, Oct 16). Calibrate against real wage growth for open positions.

**Rules.** No dice; an effect is a read: the raise reads the employer's money and traits. Nothing in the simulation is a locked number.

**Done when.** A one-year played world in a drawn place (`buildBenchWorld`) shows an opening left unfilled for months whose offered pay rose, by employer and opening record id, with the employer's books showing it could pay; a test names the place and seed.

**Files.** src/core2/modules/jobs.ts

**Notes.** Ruling in OWNER-DECISIONS.md, Oct 16 evening.
