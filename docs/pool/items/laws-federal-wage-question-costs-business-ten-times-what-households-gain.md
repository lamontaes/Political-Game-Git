---
id: laws-federal-wage-question-costs-business-ten-times-what-households-gain
title: "The yes-or-no wage question in Congress costs businesses $308,500 and households gain $30,500 (Marion, Mississippi)"
area: laws
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 2, "Every law in dev mode's list, tried at four bodies")
checked: fable 2026-11-10
---

**What.** Under the yes-or-no wage question in Congress most of what businesses lose goes somewhere other than workers. Measured in the Nov 9 law sweep in Marion, Mississippi (seed 7df73e53cd67), 180 days after passing, against a twin world with no bill: businesses $308,500 lower, households $30,500 higher, governments $194,000 higher and $82,000 gone to the outside. The question rode as a rider on 33 of the 40 bills Congress passed in the sweep, and 18 of the 40 show this one change, the same to within two dollars. For context the audit measured a clean raise of the minimum wage from $7.25 to $10.88: passed by the Mississippi House, households ended $18,200 higher and businesses $14,100 lower; passed by Congress, households ended $4,200 lower, businesses $28,000 lower and governments $15,200 higher. The audit did not trace the question's result to a payer or to code. Seen: a wrong-sized money result on the Metrics tab after a federal wage law (businesses lose ten times what households gain).

**Cause.** Measured: no payment goes the wrong way; the audit's four totals mix the town with the whole country and with twin noise. A twin probe on main d604b3494b in Marion, Mississippi (2845160, world seed 7df73e53cd67) enacted `us-federal-positions:labor-commerce.raise-federal-minimum-wage` yes the day after the opening, with no bill and so no rider, ran 180 days against the same world with no law, and summed the cash journal by owner kind and reason. Employers in town end $283,473 lower. That is wages to workers: named payroll +$51,804 (18 percent over a $287,770 base) and counted workers' pay about +$179,000 (`residents`, from +$48,792 to -$130,495). Then employer payroll tax +$43,286 and sales tax +$35,410. Then $211,870 more bought from outside. Outside costs follow sales: each firm buys its booked cost share of what it takes in, and whatever it doesn't buy locally it buys outside (`src/core2/modules/residents.ts`, line 1066). Outside sales rose $133,204. Last, one firm enters in the treated world only ($171,203 startup loan, $57,681 entry), which is twin divergence, not the law. Households in town keep little of their raise because they spend it. Counted households also pay $353,220 more in employer-plan premiums (base $284,612), because the plan holders are a fixed top share ranked by employer size then pay (`holdersToday`, `src/core2/modules/coverage.ts` line 164), and a floor that lifts many wages to one level reorders who holds a plan. Governments' totals cannot be read as the town's: every treasury, the federal one included, is placed in the town, and the federal treasury took $4.44 billion more in `treasury-tax` from the country tier's higher national wages. The $15.00 versus $17.00 question in the item: the federal question sets `federalMinimumWageTargetMinor`, $17.00, through `holdFederalWage` (`src/core2/question-wages.ts`, line 168).

**Fix.** Nothing in the wage engine. Proposed: the CTO closes the item. If the owner wants the money split shown, the work is in the twin tools, not the engines. `scripts/dev-tests/law-run.ts` should sum the journal by owner kind and reason, split into the town's own accounts and the rest (a government's treasury by its level, not by its place), and run the control from the same world state at the bill's day, so firm entry does not diverge. The probe used for this note is the method: wrap `api.postJournal`, key each posting by the owner's kind, place and the entry's reason, and diff the two worlds.

**Time box.** 3 hours for one Sonnet session, only for the twin tool change if the CTO keeps the item.

**Rules.** The chain is the acceptance: the floor is followed from the law row to a named worker's raised pay, to the employer that paid it, and to the taxes on it, by record id. Ask why: the proof names, by record, where each of the $308,500 went, and governments gaining more than the workers did is a defect until its cause is named. One model, two tiers: counted workers below the floor are raised by the same rule as full people, times their count. Sliding scales and causes: an employer's higher costs for goods from outside come from a price that moved for a recorded reason, never a fixed markup.

**Done when.** The CTO closes the item. If it is kept for the tool, a second session runs the changed `scripts/dev-tests/law-run.ts` in Marion, Mississippi (seed 7df73e53cd67) and one drawn place (named with its seed) on the federal wage question, and sees the town's employers, households and own governments split by reason, with one named worker's pay before and after by job record id, and no firm entering in one world only.

**Waits on.** Nothing.

**Files.** src/core2/question-wages.ts (`holdFederalWage`, line 168; `holdRaisedWage`, line 189; `setLevelWage`, line 42), src/core2/law-reach/group-a-wages.ts (`federalMinimumWage`, line 27; `raiseMinimumWage`, line 32), src/core2/data/laws/reach-group-a-parameters.json, src/core2/wage-floor.ts, src/core2/modules/employer-taxes.ts, scripts/dev-tests/law-run.ts

**Notes.** From the Fable audit, Pillar 2. Measured: the four totals, from bills that carried the wage question as a rider, in one town; the two clean $7.25 to $10.88 raises and their labels. Not traced: the wage question's payer and code. The audit: "I did not trace the pension, transit or wage-question results", and "Treat the other results as true of Marion, Mississippi until repeated." The minimum wage was repeated in LaGrange, Wyoming, where "the wage raise I set was too small to show anything." One thing on main, Nov 10, does not match the audit's account and needs checking before any fix: the audit says the rider was "a yes on raising the minimum wage" and that the question "sets $15.00", but in `question-wages.ts` the federal question (`us-federal-positions:labor-commerce.raise-federal-minimum-wage`) sets `federalMinimumWageTargetMinor`, which is 1700 ($17.00), while $15.00 (`stateMinimumWageTargetMinor`, 1500) is what the states' question (`us-policy-positions:labor-workforce.raise-minimum-wage`) sets, and `holdRaisedWage` skips a yes at the federal level. So either Congress passed the states' question and something other than `holdRaisedWage` moved the money, or the floor was $17.00. The first step is to read the rider's question key and the wage row in force in the repro. The rider itself is `gov-riders-added-when-every-vote-is-forced`. Related: `jobs-low-wage-factor-every-employer` (open), `gov-fiscal-note-reads-counted-jobs` (open), `gov-federal-questions-rule-readers` (open; says the federal minimum wage already has a reader). Also from the audit: a repeal lowers the floor but leaves raised pay where it is (`src/core2/wage-floor.ts:171`), which it calls how real pay behaves.

Nov 11 (cause finder for Fable B): ran a labeled twin probe in Marion on main d604b3494b (federal wage question, 180 days, enacted directly, so no rider). Employers' loss is wages, payroll and sales tax, inputs bought outside as their sales grew, and one firm's entry in one world only. Households spend most of the raise, and counted households pay more plan premiums as the holder ranking reorders. The federal treasury's $4.44 billion is the whole country's wages, which is why the audit's government total looked large. No wrong-way payment.
