---
id: story-address-anchor-person
title: "An address tells its problem through one resident's life, read from that person's own records"
area: words
kind: wiring
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: story
model: opus
effort: medium
root: none
source: "Owner's grading page 1, row P21 (docs/coordination/grading/2026-11-24-page-1-rows.md on claude/cto-playtest-nov23; the CTO's order 3, 7143874990 on #9750): the problem told through people's lives; the Story lead's ask to the Coordinator, Nov 24 20:57Z"
checked:
---

**What.** The owner's own version of the inaugural tells its problem through people ("rationing their insulin, and getting extorted"), but an address in the game can only state the problem in general terms. The address planner has no person the theme touches, so the stand comes with no life behind it, and every address on a theme sounds the same. He wants the problem told through one resident whose records show it: for health, someone sick, uninsured or paying for care; for wages, a worker near the floor. Seen: the President's address on the first evening, and a governor's or mayor's address.

**Cause.** Found in code: the address's packet, `addressFacts` on story/first-evening (src/director/address-telling.ts:90-190), carries the speaker's term, the oath, the theme, the disaster, the Vice President and the question's sides, and no resident. The records an anchor would come from already exist and are read elsewhere: a person's coverage (`coverageOf`, src/core2/modules/coverage.ts:110), a serious illness (`seriousIllnessOf`, src/core2/modules/health.ts:1435), care needed (`careNeedOf`, :1412), and a job's pay in the jobs engine. No reader joins a theme's policy area to the resident whose records show it.

**Fix.** Add one reader that takes the address's policy area and returns the resident whose own records show it most strongly: for health, an illness or care need with no coverage; for wages, the lowest pay among workers at the floor. Choose by the size of the burden on record, never by a roll. Where the strongest case is in the counted population, fill that person in, seeded from the world so the same person comes back, matching what the records say. Carry `anchor-name` and `anchor-town`, plus the touch as words (`anchor-touch`), each cited to the records it came from. The Story lead wires them into `addressFacts`, and W1 writes the lines.

**Time box.** 3 hours.

**Rules.** No dice: the anchor is the resident with the largest burden on record, never a random pick. One model, two tiers: a counted resident is filled in to match the records, so a clicked anchor is the same person the speech named. No hand-written player text: the name and town come from records and the touch from a bank.

**Done when.** In a played world at a drawn place, the first evening's address packet carries `anchor-name`, `anchor-town` and `anchor-touch`, each citing record ids that show the touch (coverage, illness, care need or pay). Opening that person's card shows the same facts. A second session sees an address name a resident and their trouble once W1's lines are in.

**Waits on.** Nothing. The packet code is on story/first-evening until it merges.

**Files.** src/director/address-telling.ts (new), src/core2/modules/coverage.ts, src/core2/modules/health.ts, src/core2/modules/jobs.ts

## Notes

Nov 24, 21:04Z (the Story lead): built for two themes on #10390 (5321fa01), in its new address-anchor reader. Health is a care need with no coverage (`careNeedOf` and `coverageOf`); wages is the lowest hourly pay. The reader picks from the town where the address is watched, by the largest burden on record and never a draw. Its facts are `anchor-name`, `anchor-first`, `anchor-town` and touch flags, each cited, proven in four drawn worlds. Three themes still need a burden reader in their own module, each for that module's owner: housing (a rent-burden reader), hard times and the safety net (a household-income or assistance reader per person, since the residents module's `householdIncome` is per counted household), and public safety (a person's crime exposure or victimization record, since the crime module keeps place-level months only). Each theme is added the day its reader exists.
