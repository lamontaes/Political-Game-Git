---
id: pins-21a-past-arrest-from-own-reliability
title: "A person's past arrest follows their own reliability, not only a national share against a seeded line"
area: world
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: lives
pr:
after:
blocked-on:
lead: lives
model: sonnet
effort: medium
root: none
source: The CTO's LIFT THE PINS line on the crew's thread (#9747, comments 6936897718 and 6936902133), family 21, the `past-justice.ts` row, Nov 17, 2026
---

**What.** Every person's past arrest was the same national cumulative share (Brame 2012) read against a seeded line, so a steady person and an unsteady one were arrested at the same rate and every town landed on the nation's share.
Seen: dev mode, a person's past, shows the arrest pull moved by their own reliability.

**Cause.** Found in code: `src/core2/past-justice.ts`, `pastArrestOf` (`pullBy` read only `arrestedBy(age)`).

**Fix.** The pull is the published curve times the person's own pull from their reliability trait (`pastArrestLogPerReliabilityLevel`, ESTIMATED). The published shares are the baseline at the trait's middle, fitted once. The seeded line stays: it is generation of who happened to be arrested.

**Time box.** 1 hour, Sonnet medium.

**Rules.** No dice in play: this is seeded generation of a past written when a person is opened. Replace, never layer.

**Done when.**

- `src/core2/past-justice-own-reliability.test.ts` passes and fails on old code (the less steady person is arrested no more often than the steadier one).
- `past-justice.test.ts` and the no-steering guard pass.
- A second session sees a steadier and a less steady adult of one town with different pasts in dev mode.

**Waits on.** Nothing.

**Files.** `src/core2/past-justice.ts`, `src/core2/data/past/parameters.json`, `src/core2/past-justice-own-reliability.test.ts`.

**Notes.** Nov 17 (Lives): only this row of family 21's 18 is in this pull request; the strength is quoted from memory of Moffitt and others (2011) and needs a researcher's check.
