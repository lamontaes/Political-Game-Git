---
id: tests-law-wiring-taxes-grant-bill-held-in-committee
title: "law-wiring-taxes: all ten sponsors' grant bills are held in committee at Smyrna, Tennessee"
area: laws
lead: laws
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
source: found by the tax-wiring thread, Nov 14 (CI on PR #9147, first head)
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** At Smyrna, Tennessee (4769420) with GOLDEN_PATH_SEED=4de36d9af2e68446f6dd555c7dd0394d6aa5d1f0, src/core2/law-wiring-taxes.test.ts fails with "a state bill changing the grant passed: expected undefined to be defined". Seen: the state's local income tax grant bill on the bill paper, which ends as failed on the day it is introduced.

**Cause.** Found in code: src/core2/modules/legislature.ts `committeeSeats` picks the chamber's committee and chair by seniority alone (the same chair for every bill, whatever its subject; registered stopgap SG-GOV-committee-structure), and `committeeStage` has that chair hear a bill only when `chairPosition.total + hearingTrait >= 0`, the chair's own stance on the bill's question plus the chair's hold-hearing lean; the floor votes that members cast do not enter it. Measured: at Smyrna, Tennessee seed 4de36d9af2e68446f6dd555c7dd0394d6aa5d1f0 the lower chamber has 99 members; the test's ten bills (seats 001 to 010) each end `failed` with `failedOn` equal to their introduced date, 2025-08-17, so one chair's own view buried all ten. That is by the chair's own view, not by a rule against the sponsor. On the clean train the same seed fails earlier, at "laws with no applied record after play" (the growth cap, fixed in PR #9147), so the red is on the train too.

**Fix.** In the test, put the grant bill in front of the chair the way a sponsor does: if the committee holds it, record the chair's agreement through the sponsor's reply path that `committeeStage` already reads (`replies` row `hearing:<bill id>`) or the chair's `hear` choice, and name that in the evidence; do not weaken the assertion that a state bill passed. Separately, the one-chair-for-every-subject stopgap is the game-side cause and is owned by its own replacement item, not this one.

**Time box.** 3 hours for one Sonnet session; push what passes and stop.

**Rules.** No dice; the body's own records decide who is heard. Pin the test to named places with fixed seeds.

**Done when.** A second session replays it: at Smyrna, Tennessee (seed above) in dev mode, a state bill changing the local income tax grant is drafted by a member the committee hears, passes, and appears on the bill paper as enacted. src/core2/law-wiring-taxes.test.ts passes at that place and seed in about two minutes.

**Waits on.** Nothing.

**Files.** src/core2/law-wiring-taxes.test.ts

**Notes.** Filed on the tax-wiring thread.
