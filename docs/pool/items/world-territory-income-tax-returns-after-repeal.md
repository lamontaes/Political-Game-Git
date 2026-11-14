---
id: world-territory-income-tax-returns-after-repeal
title: "A territory's income tax comes back after the lower level repeals it, because the federal mandate row still says yes"
area: laws
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "asked for by the Account lead on the group B test setup fix, Nov 14"
claimed-at:
after:
lead: account-lead
model: opus
effort: medium
root: rc2-done-from-records
checked: sonnet 2026-11-14
---

**What.** In a territory whose income tax is the federal mandate (Northern Mariana Islands, Guam), a bill repealing the territory's own income tax writes a zero row, and the policy question stays in force at the federal level, so the applied rows are not ended and, at one seed, the tax stood at 37 percent again forty days later. Seen: a played repeal in a territory either keeps the tax at zero with its rows ended, or says on the Money screen that the federal rate still applies.

**Cause.** Measured: place Chalan Kanoa III, Northern Mariana Islands (territory:MP:chalan-kanoa-iii), seed bfd059855410cc31f890ce53854520bd0b9a916bda7c090436ff27f39bfc819a GOLDEN_PATH_PLACE_KEY=territory:MP:chalan-kanoa-iii`on the city-income-tax case: after the repeal the state level shows 0,`yesLevels(api, key)`holds one row,`law:US:federal:us-policy-positions:fiscal.adopt-income-tax:general:mandate`, and 83 applied rows stay open; 40 days later the level's rate was 37 again. Found in code: `endReplaced`in`src/core2/law-reach/host.ts`ends rows only when no level says yes, and`reassertStandingLaws` re-runs the handlers of every yes level.

**Fix.** Design: decide whether a territory may repeal an income tax the federal act mandates (probably not, so the repeal bill should be refused at filing as a restatement of a mandate) or whether the mandate row should stop at the territory; then make the engine do it once, in `questionSettled` or the host.

**Time box.** 2 hours for one Opus session at medium effort. When it runs out, write what was seen in the item and stop.

**Rules.** Wire to the world: the fix goes through the engines a played world uses and a case that fails for its own reason stays failing until fixed, never loosened or skipped; one rule, all 56 places: the cases keep drawing places and name each place and seed.

**Done when.** A second session, not the builder, runs `npx vitest run src/core2/law-reach-group-b.test.ts` on main in a drawn place and seed it names (buildBenchWorld not needed, the test builds the world) and sees the named cases pass with their assertions unchanged, with the record ids each case writes named.

**Waits on.** The group B setup fix folding.

**Files.** src/core2/law-reach-group-b.test.ts; src/core2/law-reach/group-b-money.ts

**Notes.** Found while fixing tests-law-reach-group-b-fails-in-setup.
