---
id: tests-law-reach-group-b-medicaid-need-finds-no-town-in-forty-draws
title: "The group B Medicaid cases draw forty towns and find none with covered named adults at some seeds"
area: laws
kind: bug
priority: 3
size: S
status: merged
standard: 2
claimed-by:
pr: #9339
blocked-on:
source: "found by the Account lead's group B case check at other seeds, Nov 14"
claimed-at:
after:
lead: account-lead
model: opus
effort: medium
root: rc2-done-from-records
checked: sonnet 2026-11-14
---

**What.** The `Medicaid expansion and its work requirement` cases of `src/core2/law-reach-group-b.test.ts` throw `no town with an employed adult and medicaid in forty draws` at some seeds, so their two cases are skipped by the setup, not run. A policy proved by nothing would pass unseen. Seen: the cases run at any drawn seed, or the need names a real subject and is satisfied by the first towns drawn.

**Cause.** Measured: `GOLDEN_PATH_SEED=417579cd3bdb490fcecb42150921c0f0c56548b72dfcd7c571c7a8e63d2242d6 npx vitest run src/core2/law-reach-group-b.test.ts -t "Medicaid expansion"` at place Bonanza GA (1309272) and thirty-nine other drawn places: none has both named adults the expansion covers and named adults the work requirement then reaches. Found in code: `build` in `src/core2/law-reach-group-b.test.ts` requires `covers(...)` (named residents only) for both policies; in a two-level town most adults are counted, so a named covered adult is rare.

**Fix.** The Medicaid describe is pinned to South Fork Estates, Texas (place 4868966) at seed 0123, where named covered adults exist, and restores the drawn seed for the cases after it (`MEDICAID_SEED`, `MEDICAID_PLACE`). No draw loop; if that place ever lacks the subject the case fails by name. Whether drawn towns should hold more named covered adults is a world question, not filed here.

**Time box.** 2 hours for one Opus session at medium effort. When it runs out, write what was seen in the item and stop.

**Rules.** Wire to the world: the fix goes through the engines a played world uses and a case that fails for its own reason stays failing until fixed, never loosened or skipped; one rule, all 56 places: the cases keep drawing places and name each place and seed.

**Done when.** A second session, not the builder, runs `npx vitest run src/core2/law-reach-group-b.test.ts` on main at the drawn place and seed named in the item and sees the named case run and pass with its assertions unchanged, with the record ids it writes named.

**Waits on.** Nothing.

**Files.** src/core2/law-reach-group-b.test.ts; src/core2/modules/budgets.ts

**Notes.** Found while finding the cause of the pension, reserve and balanced-budget cases.
