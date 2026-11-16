---
id: opening-adults-cash-pinned-place
title: "The opening adults' cash test draws its town at run time, and in two territory towns 19 resident adults hold nothing"
area: world
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: T54
pr:
after:
blocked-on:
root: none
lead: money
model: opus
effort: medium
source: "T54's trace for #9597, Nov 16 00:50Z (the Account lead's order of 00:30Z: every related red explained, and an item for each that stays red; a run-time draw is pinned, as for counted-weight-release)"
---

**What.** `src/core2/opening-adults-cash.test.ts` draws its town from a random seed unless `GOLDEN_PATH_SEED` is set. It drew Leloaloa, American Samoa (seed 6682f9f6c16ebcfb) in the #9597 run and Tutu, U.S. Virgin Islands (seed 722c036a9cce0bae) on the clean Train, and failed at both: 19 of 65 and 19 of 67 resident adults hold nothing, against at most about 25%. Replayed by seed, both are red the same way on the Train (ef708196), before #9117 (058294ec), on main's merge base (892427ec), and Leloaloa 80 folds back (e50ed212, the #9435 fold), and on #9597 with the opening-savings fix. No fold of this Train made them red. Seen: the test's own message.

**Cause.** Found in code and by person id, on #9657 (be1b38c0). All 19 at each town are officials made by the executive engine, not residents left without a wallet. (1) 17 are the territory's cabinet, `person:cabinet:US-AS:<department>:0` and `person:cabinet:US-VI:<department>:0` (budget, revenue, transportation, corrections, labor, environment, public safety, commerce, general services, military, agriculture, education, attorney general, secretary of state, treasurer and two more), living elsewhere in the territory. `fillInCabinetPerson` (src/core2/modules/executive.ts) fills them in with `fillInIdentity` and a treasury job (`job:public:state:<department>:<id>`, $262.86 a day), but they have no officials row, so official pay's `seat` never runs `keepHousehold`, and nothing calls `giveLivingCost` (src/core2/official-living.ts), the one step that gives an official from elsewhere a household cost and the savings a family at their pay keeps. Staff (`staff.ts`), press staff (`press-staff.ts`) and seated officials (`official-pay.ts`) all call it; the cabinet does not. They hold 0 on day 0, day 1 and Feb 2, and $4,471.47 on Mar 2 from their first monthly pay (one, transportation, still 0). (2) 2 are the town's filing officers, `person:filing-officer:<town>:municipalOffice` and `:countyOffice`, made by `seatDrawnOfficer` (executive.ts), which also never calls `giveLivingCost`, and whose payroll is "city" or "county": a territory has only federal and state governments in the budgets (`governments(api)` at Leloaloa: organization:treasury:US, organization:treasury:US-AS), so no employer is found and they hold no job and no pay at all. A state town has the same 17-odd cabinet and the same officers, but many more resident adults, so the share likely stays under the floor (not measured); a small territory town crosses it. The test leaves out `official:` ids but not `person:cabinet:` or `person:filing-officer:` ids.

**Fix.** This item pins the test at both towns. The fix is its own item, officials-from-elsewhere-open-with-no-savings.

**Time box.** 3 hours, Opus, medium.

**Rules.** One rule, all 56 places: the test names its towns and seeds in its file and draws none at run time, and a re-pin states the old premise and needs the lead's yes.

**Done when.** The test runs at Leloaloa AS and Tutu VI with the seeds above, written in the file, and the trace names, by person id, the opening step that leaves those adults with nothing, with its fix or its own item. A second session sees in the running game, at a drawn territory town it names with its seed, that resident adults hold cash as the survey's share says.

**Waits on.** Nothing.

**Files.** src/core2/opening-adults-cash.test.ts.
