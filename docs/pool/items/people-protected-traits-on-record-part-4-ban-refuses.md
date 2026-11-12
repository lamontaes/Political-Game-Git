---
id: people-protected-traits-on-record-part-4-ban-refuses
title: "With the discrimination ban in force the same decision is refused"
area: laws
kind: wiring
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after: people-protected-traits-on-record-part-2-hire-pick-reasons, people-protected-traits-on-record-part-3-tenant-pick-reasons
blocked-on:
lead: laws
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
source: split from people-protected-traits-on-record in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** The ban on discrimination in housing and work reaches nobody until a decision can cite a protected trait. Once the hire and tenant picks record reasons that cite one, a ban in force must refuse a decision whose reasons cite it, recorded by lawApplied. Until then the ban is an open stopgap and its matrix row cannot be graded. Feeds: people-protected-traits-on-record

**Cause.** Found in code: stopgap SG-GOV-REACH-A-discrimination (src/core2/data/stopgaps/gov.json, line 1394) stays open because no decision cites a protected trait; src/core2/law-wiring-rights-env.test.ts is the rights family's test.

**Fix.** Have the discrimination ban's reader refuse a tenant decision whose recorded reasons cite a protected trait, record it with lawApplied, and mark what is left of SG-GOV-REACH-A-discrimination resolved. The hiring half is world-hiring-discrimination-ban-refusal, which narrows that stopgap to rentals; do not build it here.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: seeded generation of who exists may assign race from shares, but a pass-over comes only from the decision-maker's recorded traits and views, never a roll. One model, two tiers: counted groups carry the same shares and the same decision rule times their count. One rule, all 56 places: shares come from each place's Census data, estimated with a labeled median where a place has none. Ask why: a refused decision records the law and the reason it cited.

**Done when.** A second session plays a year of buildBenchWorld in a drawn place (seed named) with the discrimination ban in force and sees the same kind of decision that passed someone over without the ban refused with it, recorded by lawApplied and named by record id in src/core2/law-wiring-rights-env.test.ts; the matrix grades the ban's systems and money links from those records.

**Waits on.** people-protected-traits-on-record-part-3-tenant-pick-reasons (the tenant decision's recorded reasons) and world-hiring-discrimination-ban-refusal (the hiring half and the stopgap narrowed to rentals).

**Files.** src/core2/law-wiring-rights-env.test.ts, src/core2/data/stopgaps/gov.json, src/core2/modules/jobs.ts, src/core2/modules/housing.ts
