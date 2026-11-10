---
id: people-protected-traits-on-record-part-3-tenant-pick-reasons
title: "A tenant decision records reasons the same way"
area: people
kind: wiring
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after: people-protected-traits-on-record-part-1-race-on-record
blocked-on:
lead: laws
model: opus
effort: high
root: design-one-model-two-tiers
source: split from people-protected-traits-on-record in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** A landlord's tenant pick should weigh the landlord's own traits and views against an applicant's record and record the reasons, as the hire pick does. Today rentals have one town landlord organization and no person weighs an applicant. The reasons are saved on the decision so a refused or passed-over applicant can be explained. Feeds: people-protected-traits-on-record-part-4-ban-refuses.

**Cause.** Found in code: src/core2/modules/housing.ts (lines 665 to 667, stopgap SG-WORLD-housing-landlord) gives rentals one town landlord organization (landlordId), and no decision-maker weighs a tenant.

**Fix.** Give the rental owner a decision-maker whose traits and views are weighed against the applicant's recorded race or sex when a household takes a rental, and record the reasons.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: seeded generation of who exists may assign race from shares, but a pass-over comes only from the decision-maker's recorded traits and views, never a roll. One model, two tiers: counted groups carry the same shares and the same decision rule times their count. One rule, all 56 places: shares come from each place's Census data, estimated with a labeled median where a place has none. Ask why: a refused decision records the law and the reason it cited.

**Done when.** A second session plays a year of buildBenchWorld in a drawn place (seed named) and sees a tenant decision record its reasons citing the landlord's traits against an applicant's recorded race or sex, by decision record id.

**Waits on.** people-protected-traits-on-record-part-1-race-on-record, and world-housing-landlord-owners (which gives each rental a recorded owner who decides; this part adds the weighing of a tenant to that owner's decision and builds no second owner).

**Files.** src/core2/modules/housing.ts, src/core2/types.ts, src/core2/law-wiring-rights-env.test.ts
