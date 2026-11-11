---
id: gov-failure-to-elect-by-place
title: "When an election fails to fill an office, the holdover and repeat election follow each place's own law"
area: gov
kind: research
priority: 3
size: S
status: dropped
claimed-by:
pr:
blocked-on: gov-failure-to-elect-by-place-part-1-holdover-rows-a-to-m, gov-failure-to-elect-by-place-part-2-holdover-rows-n-to-z-and-territories
source: added with npm run pool -- add
after:
lead: governing
standard: 2
model: sonnet
effort: low
root: rc9-place-facts-one-default
checked: fable 2026-11-10
---

**What.** When an election fails to fill an office, the holdover and repeat election follow a family estimate, not each place's own law. The voting module uses `holdover.json`'s family defaults for what happens when no one is elected, because no place has a researched failure-to-elect row. Research each of the 56 places' rule per office family (holdover, appointment or repeat election and its timing), cite it, and read it in the same function. The national contingent election (House by state delegation, Senate for vice president) is already built in `src/core2/contingent-election.ts` and handled in the voting module, so it is no longer part of this item. The work is two parts. Closes the stopgap `SG-GOV-empty-race-law`.

**Cause.** Found in code: `src/core2/modules/voting.ts` reads `src/core2/data/offices/holdover.json` (family defaults, read by `holdoverRule` in `src/core2/office-holdover.ts`); marker `SG-GOV-empty-race-law`.

**Fix.** Add a cited failure-to-elect row per place and office family to `holdover.json` in two halves, read in the same function; resolve the stopgap when all 56 are cited.

**Time box.** 2 hours for one sonnet session to hand out the parts and check them in; each part carries its own time box.

**Rules.** Research before building: each row cites statute or constitution. One rule, all 56 places: rules live in data per place and office family. The chain is the acceptance: an empty race leads to a recorded holdover or a dated repeat election.

**Done when.** A second session plays a one-year world (`buildBenchWorld`, a drawn place and seed named) with an uncontested-and-empty race and sees the holdover record by id as that place's row says; `src/core2/voting.test.ts` checks one place's holdover and one place's repeat election date.

**Waits on.** The two parts: gov-failure-to-elect-by-place-part-1-holdover-rows-a-to-m, gov-failure-to-elect-by-place-part-2-holdover-rows-n-to-z-and-territories.

**Files.** src/core2/modules/voting.ts, src/core2/data/offices/holdover.json, src/core2/office-holdover.ts, src/core2/data/stopgaps/gov.json, src/core2/voting.test.ts

**Notes.** Oct 20 (pool feeder): made from the open stopgap row SG-GOV-empty-race-law.

**Notes (pool redo, Nov 10).** The draft sorting counted a third part, the national contingent election. Checked on main: `src/core2/contingent-election.ts` and `src/core2/data/elections/contingent-election.json` exist, the voting module handles a `contingent-election` work item, and `src/core2/world-races.test.ts` covers it, so that part was not created. Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). Each place's holdover rule for an unfilled office; the family default already seats someone and no player reads the section.
