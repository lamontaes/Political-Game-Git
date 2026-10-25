---
id: laws-work-requirement-counts-owners-as-idle
title: "Medicaid's work requirement counts a business owner as working no hours"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The Medicaid work requirement ends coverage for expansion adults who work fewer than the required hours a month, and it reads each named person's hours from their work commitments only (`src/core2/law-reach/group-b-people.ts:156` and `:180`). An owner who runs their own business has no work commitment there, so the requirement reads them as working no hours and ends their coverage. In Montgomery, Michigan (2655220, world seed 5bc87ba8c575d498bfcfbac8353c3cae24df7a433ca9e816da727ccfaff83c9e), the health-schools family test's named example of coverage ended is the town newspaper's owner, `person:press:outlet:newspaper:0:jurisdiction_707bd06376948157:owner:0` (found by the laws lead, Oct 25). The assistance work requirement reads the same hours, so it likely has the same gap; check it in the same change.

**Rules.** No dice: whether a person meets the requirement follows from the hours the world records for them, never from a chance. One model, two tiers: counted owners and named owners are read by the same rule. Estimate, never UNKNOWN: where an owner's hours are not recorded, use a sourced average for owners of that kind of business, marked as an estimate.

**Done when.** An owner's hours at their own business count toward the work requirement's hours, read from a recorded source (the business's records or a sourced owner-hours parameter), and in a played world (`buildBenchWorld`, Montgomery, Michigan, seed above, and a random place named in the PR) the newspaper owner keeps coverage while an adult with no job and no business still loses it, both named by record id; the health-schools family test passes on its named seed.

**Files.** src/core2/law-reach/group-b-people.ts, src/core2/law-reach/group-b.ts

**Notes.** From the laws lead's health-schools PR review, Oct 25. Self-employment counts toward the federal requirement (Pub. L. 119-21 sec. 71119; recalled, not checked here), so the researcher confirms the statute's terms.
