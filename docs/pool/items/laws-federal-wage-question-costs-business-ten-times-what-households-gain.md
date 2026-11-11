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
model: opus
effort: high
root: rc8-law-judged-by-paperwork
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 2, "Every law in dev mode's list, tried at four bodies")
checked: fable 2026-11-10
---

**What.** Under the yes-or-no wage question in Congress most of what businesses lose goes somewhere other than workers. Measured in the Nov 9 law sweep in Marion, Mississippi (seed 7df73e53cd67), 180 days after passing, against a twin world with no bill: businesses $308,500 lower, households $30,500 higher, governments $194,000 higher and $82,000 gone to the outside. The question rode as a rider on 33 of the 40 bills Congress passed in the sweep, and 18 of the 40 show this one change, the same to within two dollars. For context the audit measured a clean raise of the minimum wage from $7.25 to $10.88: passed by the Mississippi House, households ended $18,200 higher and businesses $14,100 lower; passed by Congress, households ended $4,200 lower, businesses $28,000 lower and governments $15,200 higher. The audit did not trace the question's result to a payer or to code. Seen: a wrong-sized money result on the Metrics tab after a federal wage law (businesses lose ten times what households gain).

**Cause.** Needs cause. Measured: Marion, Mississippi, seed 7df73e53cd67, the four totals above. Not traced: the payer or the code. One thing on main does not match the audit's account and must be checked first: the audit says the rider was "a yes on raising the minimum wage" that "sets $15.00", but in src/core2/question-wages.ts the federal question sets `federalMinimumWageTargetMinor` (1700, $17.00, in src/core2/data/laws/reach-group-a-parameters.json) through `holdFederalWage` (line 168), while $15.00 (`stateMinimumWageTargetMinor`, 1500) is what the states' question sets through `holdRaisedWage` (line 189), which skips a yes at the federal level. So either Congress passed the states' question and something other than `holdRaisedWage` moved the money, or the floor was $17.00. Read the rider's question key and the wage row in force in the repro first. The rider itself is gov-riders-added-when-every-vote-is-forced.

**Fix.** None until the cause is found.

**Time box.** 10 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** The chain is the acceptance: the floor is followed from the law row to a named worker's raised pay, to the employer that paid it, and to the taxes on it, by record id. Ask why: the proof names, by record, where each of the $308,500 went, and governments gaining more than the workers did is a defect until its cause is named. One model, two tiers: counted workers below the floor are raised by the same rule as full people, times their count. Sliding scales and causes: an employer's higher costs for goods from outside come from a price that moved for a recorded reason, never a fixed markup.

**Done when.** A second session, not the builder, runs the twin check through dev mode's own law control in the running game. Start the bench (`OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" npm run bench`, play at `/play`) with the Place field empty so the place is a drawn place, write down the place and seed, and redraw until the federal starting law answers no and workers in the place earn below the floor the question sets. In dev mode's Bills panel pick Congress as the Body, a Sponsor, the yes-or-no question on raising the minimum wage and the Answer Yes, press Introduce, tick Chair hears the bill, set the Margin wide enough to clear the Senate's 60-vote rule and the Executive to Signs, and press Pass; the bill page must show one section and no rider (screenshot). Run 180 days. Start a second game on the same place and seed, pass nothing and run the same 180 days, and compare every cash account in the two worlds (full people in town, counted households, businesses, each government's treasury and the outside account). What businesses end lower by is accounted for label by label: wages paid to named and counted workers below the floor, the payroll and income tax on those wages, and purchases whose price moved for a named reason; households gain the larger part of what businesses pay in wages, and governments no more than the tax the law's rates take from the extra pay. One raised worker is named by record id with the pay before and after. Then the same check as a named repro in Marion, Mississippi, seed 7df73e53cd67. The script pair `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" node --max-old-space-size=4500 --import tsx scripts/dev-tests/law-run.ts <seed> federal minimum-wage 180` (one heavy run at a time) must point the same way, and a test on a drawn place fails when governments gain more than households.

**Waits on.** Nothing.

**Files.** src/core2/question-wages.ts (`holdFederalWage`, line 168; `holdRaisedWage`, line 189; `setLevelWage`, line 42), src/core2/law-reach/group-a-wages.ts (`federalMinimumWage`, line 27; `raiseMinimumWage`, line 32), src/core2/data/laws/reach-group-a-parameters.json, src/core2/wage-floor.ts, src/core2/modules/employer-taxes.ts, scripts/dev-tests/law-run.ts

**Notes.** From the Fable audit, Pillar 2. Measured: the four totals, from bills that carried the wage question as a rider, in one town; the two clean $7.25 to $10.88 raises and their labels. Not traced: the wage question's payer and code. The audit: "I did not trace the pension, transit or wage-question results", and "Treat the other results as true of Marion, Mississippi until repeated." The minimum wage was repeated in LaGrange, Wyoming, where "the wage raise I set was too small to show anything." One thing on main, Nov 10, does not match the audit's account and needs checking before any fix: the audit says the rider was "a yes on raising the minimum wage" and that the question "sets $15.00", but in `question-wages.ts` the federal question (`us-federal-positions:labor-commerce.raise-federal-minimum-wage`) sets `federalMinimumWageTargetMinor`, which is 1700 ($17.00), while $15.00 (`stateMinimumWageTargetMinor`, 1500) is what the states' question (`us-policy-positions:labor-workforce.raise-minimum-wage`) sets, and `holdRaisedWage` skips a yes at the federal level. So either Congress passed the states' question and something other than `holdRaisedWage` moved the money, or the floor was $17.00. The first step is to read the rider's question key and the wage row in force in the repro. The rider itself is `gov-riders-added-when-every-vote-is-forced`. Related: `jobs-low-wage-factor-every-employer` (open), `gov-fiscal-note-reads-counted-jobs` (open), `gov-federal-questions-rule-readers` (open; says the federal minimum wage already has a reader). Also from the audit: a repeal lowers the floor but leaves raised pay where it is (`src/core2/wage-floor.ts:171`), which it calls how real pay behaves.
