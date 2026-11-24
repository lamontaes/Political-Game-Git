---
id: gov-city-employer-with-no-staff-gets-no-funded-positions
title: "A city government employer opened with no staff gets no positions when its administration line is raised"
area: gov
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
model: sonnet
effort: medium
root: none
source: found by opus-5234 on Nov 11, 2026, while fixing tests-government-staffing-ward-charter-no-employer (PR 8790)
---

**What.** In place 2338740 (seed 536e071228c4a081 of src/core2/law-wiring-government.test.ts, its ward-charter attempt), the city government place:2338740 has a $7.9 million administration line (fiscal 2024) and one town employer for it, organization_6bc7d636f796645d, with no staff at all, named or counted. Raising the line by its whole amount funded nothing: the staffing row budget-line:administration:organization_6bc7d636f796645d reads baseStaff 0 and positions 0, no `staff-funded` row is written, and no opening is posted, so the test fails with "administration staffing applied to an employer: expected 0 to be greater than 0". Seen: a raised administration line funds positions at the city's employer and the jobs engine hires into them, in a drawn place.

**Cause.** Found in code: src/core2/law-reach/group-a-staffing.ts sizes an employer's positions as its staff in place times the line's ratio to its base (`baseStaff * ratio`, around line 197), so an employer with no staff in place gets 0 at any ratio. The staffing round then posts openings from a template job (`staff[0]?.jobId ?? counted[0]?.id`, around line 312), which an employer with no staff does not have, so even a funded position could not be posted. Not traced: why the opening left a city government with a $7.9 million administration line and no staff (the opening's public employers in src/core2/opening-*).

**Fix.** None until the cause of the empty employer is traced: if the opening should have staffed it, fix the opening; if an employer may truly start empty, size its positions as the no-employer branch does (the added money over `publicPositionAnnualMinor`) and post the openings from the employer's own occupation rather than a held job.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: a raised line reaches the employer it pays and the people it hires, by record id. One rule, all 56 places: the place is drawn and named with its seed. Never weaken a test: the government law test keeps asserting the hire.

**Done when.** `GOLDEN_PATH_SEED=536e071228c4a081 npx vitest run src/core2/law-wiring-government.test.ts` passes, naming the hire on the administration line in place 2338740, and two more drawn places pass; then a second session in the running game, in a drawn place, raises the city's administration line with dev mode's budget controls, runs past the next monthly jobs review, and sees in Trace a person hired on that line at the city's employer, by record id.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/group-a-staffing.ts, src/core2/law-wiring-government.test.ts
