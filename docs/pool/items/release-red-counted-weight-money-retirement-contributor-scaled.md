---
id: release-red-counted-weight-money-retirement-contributor-scaled
title: "counted-weight-money: an opening retirement contributor's flow scales 1.186 in a town of one-household records, where it must be 1 (Breckenridge Hills, Missouri)"
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
root: design-one-model-two-tiers
lead: money
model: opus
effort: medium
source: "found by T54 tracing #9117's reds against the Train, Nov 15"
---

**What.** In a town whose counted records each stand for one household, every residents flow must be paid exactly once per record, so `flowScale` reads 1 for every flow. One opening retirement contributor's flow reads 1.186, so that household's retirement money is paid about 19% over what its record holds, and the money test fails on the clean Train. Seen: in dev mode, the residents' retirement payments on a drawn town's first of the month run above what its households' records hold.

**Cause.** Measured: on the Train at ff9703d7, `CWM_SEED=5528f06248931cabab3c3869c39e3fdca3481838e326c5d223962a3c17735fb7 CWM_KEY=2908164 npx vitest run src/core2/counted-weight-money.test.ts` (Breckenridge Hills, Missouri, place 2908164, that seed) fails: `residents:retirement:opening-retirement-contributor:21a976184e94bb0f|2025-02-01|1|residents:jurisdiction_a980c358f4f6a9ab: expected 1.1859757125634414 to be 1`. The same assertion fails at Ingalls, Indiana (1836342, seed 206d721903b443d55d567c966b5c4a2c45a5cbaa8a6d424d68a8bed52af7b094) with 1.0504. `flowScale` (src/core2/counted-money.ts) weighs a flow's parts by the households they name; a retirement contributor's parts likely name a household whose weight or members changed after the opening (a counted part death, `countedPartDeath`, or the Social Security raise's reach, both folded Nov 14 and 15). Not yet traced to the line.

**Fix.** Needs cause. First step: at the pinned seed, print the flow's parts and each named household's weight and members on Feb 1, and find which part's weight is not 1.

**Time box.** 2 hours for one Opus session at medium effort. When it runs out, write what was read here and stop.

**Rules.** One model, two tiers: a counted record is paid times its weight and no more. The books balance. Never loosen the test or re-pin it to pass.

**Done when.** The pinned command above passes on the Train head, and the counted-weight-money test passes at a drawn place a second session names with its seed, every flow's scale reading 1 by record id in a town of one-household records.

**Waits on.** Nothing.

**Files.** src/core2/counted-money.ts; src/core2/counted-weight-money.test.ts
