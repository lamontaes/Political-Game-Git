---
id: dev-mode-work-requirement-reach-shows-no-dollars
title: "A Medicaid work requirement shows the people it ended coverage for, with $0, though it cut the clinic's sales 36%"
area: laws
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
source: Laws thread's dev-mode gap list from the three industry-law traces and the Account lead's industry report (/mnt/project-files/laws/reports/dev-mode-gaps-from-industry-traces.md); filed on the lead's ruling, Nov 16, 2026, under the owner's rule of Nov 16 that whatever a session traces by script dev mode should show
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** Dev mode's reach for a Medicaid work requirement names 19 people and 512 counted whose coverage ended, with no dollars. On the books it cut the town clinic's sales 36% at West Union, Ohio, because Medicaid stopped paying its share of their care. The money it stopped is recorded under nothing. Seen: dev mode's bill card and the law page's reach for the work requirement.

**Cause.** Measured: West Union, Ohio (3984294), seed ilt-west-union, 365 days against the same world with no law (stores-health-services.md finding 5). Found in code: the work requirement's reach rows in src/core2/law-reach/group-b.ts record coverage ended with no amount; the Medicaid share no longer paid to the clinic is not written under the law's id.

**Fix.** Where the coverage engine stops paying Medicaid's share of a person's care because the work requirement ended their coverage, it writes that share under the requirement's law id as the reach amount (group-b.ts), so `lawReach` shows the dollars. The bill card shows the care no longer paid.

**Time box.** 3 hours for one Sonnet session at medium effort.

**Rules.** Every effect can be triggered from the game's own code in dev mode and its effect seen and traced there: this item is the trace a script needed. Wire to the world: the fix reads the reach and trace records the engines already keep and adds no second reader.

**Done when.** A second session, in dev mode in the running game at a place and seed it chose, passes a Medicaid work requirement, advances three months and opens the bill card: it shows the people whose coverage ended and the dollars of care Medicaid no longer paid for them, matching the clinic's lost Medicaid sales by record id.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/group-b.ts, src/core2/law-reach/group-b.test.ts (new)
