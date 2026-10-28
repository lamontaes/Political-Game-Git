---
id: laws-justice-handgun-age-no-refused-sale
title: "Handgun-age law refuses no sale in a small drawn town, failing the justice family test"
area: laws
kind: bug
priority: 2
size: S
status: in-pr
claimed-by:
pr: #6012
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The justice family test fails on clean main in Skanee, Michigan (2674120), seed 1d3152b7aae80d2d9733320a04fa4fdad4b61fb6: with the handgun purchase age raised, no handgun sale is refused, so the law moves no money there ('refused sales: expected 0 to be greater than 0'). Sales before the limit do happen in the same run, so the town has buyers; the raised age either reaches nobody under it who would buy, or the refusal path posts nothing. The laws lead found it in its gate on Oct 24 and confirmed it on main with the same seed. Either the engine misses a refusal it should record, or the test needs a town where a buyer under the age exists.

**Rules.** No dice: whether a would-be buyer under the age is refused must come from the buyers the town holds and the law in force, never a roll; one rule, all 56 places: the fix may not skip a place, only draw again when the town has no buyer under the age, naming it.

**Done when.** src/core2/law-wiring-justice.test.ts passes on seed 1d3152b7aae80d2d9733320a04fa4fdad4b61fb6 and on two fresh random seeds, each named in the PR body; the PR says which it was (a refusal the engine missed, by file and line, or a town with no buyer under the age, redrawn with the reason named). **On screen.** Nothing yet: it would show on Politics → Issues and Government, and nothing there reads it.

**Files.** src/core2/law-wiring-justice.test.ts

**Notes.** TODO

Sent back 2026-10-26 from PR #6003 (branch claude/handgun-age-refused-sale): Current-main integration conflicts in src/core2/law-wiring-justice.test.ts; the new redraw checks absence of refusal output instead of independently establishing that no young buyer purchase was due, so an eligible buyer with a missed refusal could be redrawn.; finish on that branch, merge main into it first.

Oct 26 (claude/handgun-age-refused-sale): superseded by #6012 (on main as 7294bedcb2, "Justice test: eligibility from the engine's opening census"); PR #6003 closed; CTO to mark done. The send-back's ask is what main does: `lacking()` in src/core2/law-wiring-justice.test.ts reads the public safety engine's opening census, so a town with no "counted gun buyers 18 to 20" in gun homes is redrawn by name before play, and a town that has them must show a refused-sale group above one after play. It was a town with no buyer under the age. On main with seed 1d3152b7aae80d2d9733320a04fa4fdad4b61fb6, draw 0 is Skanee, Michigan (2674120), "lacks counted gun homes with a child, counted gun buyers 18 to 20", and draw 1 is Fish Lake, Indiana (1823386), which passes with refusals (applied|us-policy-positions:justice-public-safety.raise-handgun-purchase-age|group:jurisdiction_51efca41a5e5eb18:town:adults:income-0:other:18-29:not-working). Fresh seed 21990c8fbfb437da6394aa6dc4622c25859a6c3d passes in Americus, Georgia (1302116). Fresh seed eb81c495bc8ed3e43bed9ac06ef771bd09701246 draws Doña Ana, New Mexico (3521110): its handgun refusals are recorded, but it fails on child-access prevention (no storage-duty group above one; see gov-household-firearm-storage-extra-duty), and its second case fails in Martin, Nebraska on restored voters (tests-law-wiring-justice-restore-vote-burton).

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): already built (#6012).
