---
id: gov-office-has-no-lever-for-a-sick-constituent
title: "An official has nothing on record to do for a constituent who is sick or caring for someone sick"
area: gov
kind: feature
priority: 3
size: M
status: open
standard: 2
root: none
claimed-by:
pr:
after:
blocked-on:
lead: laws
source: "Account lead, Nov 15 22:52Z, after the civic roles builder traced the sick office-hours case"
model: opus
effort: medium
---

**What.** When a resident with a serious illness at home brings it to office hours, the official can only say no: nothing on record lets an office get a family coverage, pay a medical bill or arrange care. The rent case has rent help to put a household first for, and the custody case has the referral that grants a visit, but illness has no act. Seen: in every sick office-hours visit, where the player's only replies are to ask and to say the office cannot help.

**Cause.** Found in code: the coverage engine (`review` in src/core2/modules/coverage.ts) sets each household's plan on the 1st of every month from employment and age, and Medicaid coverage comes from the expansion law's reach (`recordCoverage` in src/core2/law-reach/group-b-money.ts) with no enrollment step, so there is nothing an office's request would move. No engine keeps a record an official could write for a sick constituent (a hardship fund, a charity-care referral, a home-care slot).

**Fix.** Ruled by the Account lead, Nov 15: no new record now. When a real mechanism is chosen (a town hardship line paid like rent help, or a hospital's charity care read from its own books), it is built in the engine that pays it, and the office-hours sick case gains a promise that writes to it.

**Time box.** 4 hours, Opus.

**Rules.** Wire to the world: the act must move money or a service to the household, read by the engine that pays it. No dice.

**Done when.** In a played world built with buildBenchWorld at a named place and seed, a sick office-hours visit offers a promise whose ending writes a record another engine reads by record id, and the household's bills or care change on the next month's record. A second session sees it in a drawn place it names with its seed.

**Waits on.** The lead's choice of mechanism.

**Files.** src/core2/modules/coverage.ts, src/core2/modules/constituent-cases.ts, src/director/data/arc-variants.json

**Notes.** Filed by hand by the civic roles builder, Nov 15.
