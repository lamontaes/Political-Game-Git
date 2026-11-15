---
id: world-estate-will-is-read-at-death
title: "A will is read on the day probate closes, so a beneficiary who died meanwhile takes nothing and no will is made after the death"
area: world
kind: bug
priority: 3
size: S
status: in-pr
claimed-by: claude/project-thread-8y55c8
pr: #9405
after:
blocked-on:
source: Found while building world-estate-heirs-are-fixed-at-death, Nov 15 2026
lead: laws-effects
standard: 2
model: opus
effort: medium
root: none
---

**What.** A person's will is worked out when probate closes, 270 days after the death, not on the day they died. A beneficiary who died in those days is simply dropped and the others take more, and whether the decedent made a will at all is decided with their age on the closing day. Seen: the heir's Money and Journal screens, which show a bequest 270 days after the death, with the sum and the giver; a dead beneficiary's children are not paid at all. Guards: the estate fix that records intestate heirs at death (world-estate-heirs-are-fixed-at-death) must not be undone.

**Cause.** Found in code: `distribute` in src/core2/estates.ts calls `willOf(api, person)` when probate closes. `willOf` asks `leanedYes` about the decedent's traits and age on `api.state.date`, then `closenessShares` keeps only `livingKin` on that day. Nothing about the will is recorded at the death. At Dennis, Massachusetts (2516740, seed 9b87fa9d713b54ecc27f071016da6e4ecd4f220b5f459bbd5c86bc14e9fc9f97) the decedent person_03634905b108cb06 had a will whose seven beneficiaries were read at the close on 2025-10-18.

**Fix.** At the death, call `willOf` once and record the bequests (person and weight) on the probate row that world-estate-heirs-are-fixed-at-death already writes. At close a bequest to someone who has died goes to that person's own living children, split equally (representation, as for intestate heirs); a share no one takes goes to the other beneficiaries. Reuse that item's `takersAtClose`; do not write a second walker.

**Time box.** 3 hours.

**Rules.** No dice: `willOf` stays a trait and age decision, read once on the day of death. One model, two tiers: the counted estate path pays at the death and already reads the same day. Wire to the world: the inheritance tax reads each taker's relation to the decedent.

**Done when.** At a place and seed named in the PR body, a decedent with a will whose beneficiary dies in probate has that share paid to the beneficiary's children, by transfer record id. A second session sees it in the running game.

**Waits on.** Nothing.

**Files.** src/core2/estates.ts, src/core2/estates-played-heirs.test.ts (new cases)
