---
id: justice-discrimination-complaint
title: "A refused applicant's complaint reaches the justice engine as a civil complaint record the commission hears"
area: world
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after: world-hiring-discrimination-ban-refusal
lead: governing
model: opus
effort: high
root: rc8-law-judged-by-paperwork
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** A refused applicant can bring a civil complaint that the justice engine records and a commission hears. In the justice engine a `ComplaintRow` is bound to a crime (crimeId, reporter, prosecutor office); add a second kind on the same complaints table, `civil`, carrying the law row id (the discrimination reach row in the law-reach records), the respondent employer, the applicant and the refusal's job-change record id from world-hiring-discrimination-ban-refusal, with an index by refusal. Whether the applicant files is their own choice through the shared chooser: their traits, whether they learned why they were refused (the law reason on the job-change record), their money and time. The enforcer named in the law row (the human rights commission) weighs the complaint by reading the refusal record's recorded reasons and the law's penalty; where the reasons cite a protected trait it orders back pay (the applicant's wage times the days they stayed jobless, from the seeker spell) and a civil fine, both paid on the journal from the employer. Seen: a refused applicant's complaint, which pays back pay and a fine the player reads on the person's card and the bill card for the ban (owner, Oct 24 and Oct 26).

**Cause.** Design: docs/coordination/OWNER-DECISIONS.md, "Employer passing over an applicant (#5102)" (owner, Oct 19): the owner's traits and views are read against the applicant's record with the reasons recorded, and a discrimination ban refuses a decision whose recorded reasons cite a protected trait; the registered stopgap SG-GOV-REACH-A-discrimination (src/core2/data/stopgaps/gov.json, status open) says no complaint is brought. Found in code: `ComplaintRow` (src/core2/modules/justice.ts, line 77) has no civil kind.

**Fix.** Add the `civil` kind to the complaints table and an index by refusal. The applicant's filing is a shared-chooser decision. The commission reads the refusal's reasons and the law's penalty and, where the reasons cite a protected trait, orders back pay and a fine on the journal from the employer to the applicant and the commission's government. The fine comes from the law row where it carries one, else from a registered ESTIMATED parameter sourced to EEOC resolution figures. Tell the finding through the English engine. Narrow the employer half of SG-GOV-REACH-A-discrimination.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the commission reads the refusal's reasons and the law row at the moment it decides, and the employer's payment is read from the journal. No dice: the finding follows the recorded reasons; the fine and damages come from the law row's penalty and the applicant's own lost pay, and real settlement rates only check totals. Wire to the world: the fine moves money from the employer to the commission's government and the damages to the applicant, on the journal. Ask why: the finding cites the refusal record, the reasons and the law row by id. One rule, all 56 places: where the place's law has no ban, no complaint can be upheld, and nothing names a place. Replace, never layer: the employer half of SG-GOV-REACH-A-discrimination is narrowed in the same change. No hand-written player text: the finding is told through the English engine.

**Done when.** A second session, not the builder, runs a one-year played world (`buildBenchWorld`) in a drawn place with the ban and a seed the builder did not choose, both named. A refused applicant's civil complaint id reaches the justice engine with the refusal's job-change record id, the commission's finding cites the reasons, and the fine and back pay appear on the journal by record id, read by the employer's books. A test shows the same refusal in a place without the ban producing no upheld complaint. Nothing on screen reads it yet; it would show on News.

**Waits on.** world-hiring-discrimination-ban-refusal (the refusal record).

**Files.** src/core2/modules/justice.ts, src/core2/modules/jobs.ts, src/core2/law-reach/group-a-records.ts, src/core2/data/stopgaps/gov.json, src/core2/justice-discrimination-complaint.test.ts (new)

**Notes.** Split from world-sale-eligibility-reads (an L item) on Oct 19; the owner's ruling is in docs/coordination/OWNER-DECISIONS.md, "Employer passing over an applicant (#5102)": the owner's traits and views read against the applicant's record, with the reasons recorded; a discrimination ban refuses a decision whose recorded reasons cite a protected trait. Stopgap SG-GOV-REACH-A-discrimination.

Oct 20 (pool feeder): spec written; after world-hiring-discrimination-ban-refusal (which itself waits on world-hiring-bias-reasons and the employer attitude table). CTO call recorded in the report: back pay plus a fine; the fine amount comes from the law row where it carries one, else a registered ESTIMATED parameter sourced to EEOC resolution figures by the builder.
