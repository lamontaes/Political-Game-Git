---
id: prices-web-dearer-electricity-bills-none-ashton
title: "With the web's electricity price raised, Ashton, Idaho bills no household for electricity"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: m0-m2
source: Laws thread, changed-file tests for the web price trace, Nov 15, 2026 (red on Train 32a99421 without that change)
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** In Ashton, Idaho, the same world bills households for electricity at the web's normal factor. When the web's electricity price factor is raised by a tenth, it bills none in the same 75 days. A dearer price should mean bigger bills, not no bills. Seen: the town's electricity receipts in dev mode's household money.

**Cause.** Needs cause. Measured: `WEB_PRICES_SEED=056520284c241460 npx vitest run src/core2/prices-web.test.ts -t "electricity bills"` on Train 32a994212b441a0e1a3d95d2029a50a70bcefb71 fails at Ashton, Idaho. The base run bills households of different pay. The run with `energy.electricity-price` at 1.1 writes no `price:…:electricity:` receipt (`expected 0 to be greater than 0`, `dearer.size`).

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Opus session at medium effort to find the cause.

**Rules.** Sliding scales and causes: a higher price moves a bill by degrees and never switches billing off. Pinned tests: the case is replayed at its named seed, not redrawn.

**Done when.** A second session replays the test at seed 056520284c241460 on the train and it passes. It then runs the test at a place drawn from all 56 with buildBenchWorld, names the place and seed, and sees the dearer world bill the same households more, by receipt id. The cause is written here.

**Waits on.** Nothing.

**Files.** src/core2/prices-web.test.ts
