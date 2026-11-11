---
id: core-speed-agreement-kept
title: "Every campaign event reads every guest's stance on every plank again, though most stances have not moved since the last event"
area: core
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: speed-lead
pr:
after:
blocked-on:
model: opus
effort: medium
root: rc5-full-detail-every-day
lead: speed
branch: speed/agreement-kept
source: written by the speed lead from the Nov 11 profile (#7365)
---

**What.** In South Hooksett, New Hampshire (key 3371220, seed s8333), the election year spends most of its time in campaign events: 1,287 events in year 4, each weighing about 1,000 people (`whoComes`) and moving about 130 listeners (`reach`). Each weighing reads the person's agreement with the candidate's platform (`agreementWith`, src/core2/modules/views.ts), one stance per plank, so year 4 makes 1.9 million agreement reads and 21.5 million stance reads. Between two events most of those people's stances have not moved, so the same agreement is worked out again and again. Seen: the game running; a Week in an election year takes less time, so a country's year comes nearer the two-minute bar.

**Cause.** Measured: South Hooksett, New Hampshire (3371220), seed s8333, main 972d0800, a run with call counters: year 4 `agreementWith` 1,900,909 calls, `viewOn` 21,549,382, `holdEvent` 1,287, people weighed 1,284,440; CPU profile of year 4: `viewOn` 75 s and `agreementWith` 50 s of 757 s profiled. `agreementWith` in src/core2/modules/views.ts reads `viewOn` for every plank on every call.

**Fix.** Keep each person's agreement with a platform, keyed by the platform's planks and the person's lean, until something it reads changes: the person's stance rows (written in the views engine's `onEvent`, removed in `forgetOnReturn` in src/core2/modules/counted-demotion.ts) or their hearer group's stance (written in `hearAsGroups` in src/core2/hearer-groups.ts). Each of those writers bumps a version (`agreementInputsMoved`). Keep it in play only (`bookkeeping()` off), drop it at each month's turn, and register it as a derived cache so a restore clears it. The opening records a first read writes stay written, so a later read finds them as it would.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Speed: a country's year runs under two minutes in every year, and a speed cut changes nothing the simulation decides, so the records proof is identical. No dice: no draw is added; every agreement is the same number the full read gives. One model, two tiers: counted voters keep reading their groups by the same rule; only the full person's repeated read is kept.

**Done when.** A second session, not the builder, runs the four-year world for South Hooksett, New Hampshire (key 3371220, seed s8333) on main and on the branch, one process at a time: every year's records digest is identical, and year 4 is faster on the branch in alternating pairs. The same session plays a drawn place to an election in the running game and sees rival events held and the count come out as on main.

**Waits on.** Nothing.

**Files.** src/core2/modules/views.ts, src/core2/hearer-groups.ts, src/core2/modules/counted-demotion.ts
