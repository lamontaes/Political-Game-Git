---
id: laws-work-requirement-pays-households-more
title: "A work requirement for assistance leaves households $94,000 better off, paid by the United States treasury (Marion, Mississippi)"
area: laws
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 2, "Every law in dev mode's list, tried at four bodies")
model: opus
effort: high
root: rc8-law-judged-by-paperwork
---

**What.** A work requirement for assistance is meant to limit who draws a benefit, and in the game it pays households more. Measured in Marion, Mississippi (seed 7df73e53cd67): a county work requirement for assistance, passed with no rider and compared with a twin world with no bill, left households $94,000 higher. A further twin run traced the money to its payer: the United States treasury, $134,000 lower. The state version did the same. The sweep ran 120 days for local bodies and 180 for the state. In LaGrange, Wyoming (seed 63355aee286d) the county work requirement moved almost nothing, so the wrong-way result is not everywhere. The audit traced the result to the treasury that pays and no further; the code behind it is not traced. Find why turning the requirement on raises what the treasury pays out, and fix it at the cause for every assistance program the requirement touches, so that while it is law the adults it reaches draw only for its time limit and nobody draws more than they did without it.

**Cause.** Measured: Marion, Mississippi, seed 7df73e53cd67: a county work requirement for assistance left households $94,000 higher and the United States treasury $134,000 lower (the state version did the same). Suspect, not shown: the `assistance-time-limit` case in `src/core2/law-reach/group-b.ts` (line 526) calls `payFoodAid` again outside the monthly close that `runBenefitPrograms` also runs.

**Fix.** Check whether the extra payFoodAid pays twice, fix so turning the requirement on never raises benefits.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** The chain is the acceptance: the rule is followed from the law row to the benefit payment that changed, to the named person it reached, and back to the treasury that paid, by record id. Ask why: the proof says, by record, why each household's benefit rose or fell, and a rise under a limit is a defect until its cause is named. One model, two tiers: counted households lose or keep the benefit by the same rule as full people, times their count. One rule, all 56 places: the result must point the same way in every place that has people the requirement reaches. Owner, November 8, quoted by the audit: "when it finds these errors or finds that these laws don't pass, I want them fixed. I don't just want a report of everything that was broken."

**Done when.** A second session, not the builder, runs the twin check through dev mode's own law control in the running game. Start the bench (`OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" npm run bench`, play at `/play`) with the Place field empty so the place is a drawn place, and write down the place and seed the title shows; redraw until the place has a county board that may pass the law, the starting law answers no, and people in the place draw food assistance. In dev mode's Bills panel on the Government screen pick the county board as the Body, a Sponsor, the Law (work requirement for assistance) and the Answer Yes, press Introduce, set the Margin to 3 and the Executive to Signs, and press Pass. The bill page must show one section and no rider (screenshot). Run 120 days in the Run panel. Start a second game on the same place and seed, pass nothing and run the same 120 days. Compare every cash account in the two worlds: full people in town, counted households, businesses, each government's treasury and the outside account. Households must end no higher than in the twin, and the treasury that pays the benefit must end no lower, with each difference named by the payment's own label and the households that lost the benefit named by record id. Repeat at the state legislature for 180 days. Then the same check as a named repro in Marion, Mississippi, seed 7df73e53cd67, where households ended $94,000 higher and the United States treasury $134,000 lower. The script pair `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" node --max-old-space-size=4500 --import tsx scripts/dev-tests/law-run.ts <seed> county work-requirement-for-assistance 120` (one heavy run at a time) must point the same way, and a test on a drawn place fails when households end higher. The owner plays it: he passes a work requirement and the people it reaches draw less, not more, and he can see who.

**Waits on.** Nothing. gov-riders-added-when-every-vote-is-forced is done, so a forced bill leaves clean; check the bill page shows one section.

**Files.** src/core2/law-reach/group-b.ts (`assistanceTimeLimit`, line 259; the `assistance-time-limit` case, line 526; `payFoodAid`, line 970; `runBenefitPrograms`, line 1029), src/core2/data/laws/reach-group-b.json (the policy row, line 79), src/core2/law-reach/group-b-money.ts, scripts/dev-tests/law-run.ts

**Notes.** From the Fable audit, Pillar 2, "Some results point the wrong way (measured; the first traced to its payer)". Measured: the two totals and the payer, in one town; the LaGrange repeat. The audit says of all six wrong-way results: "I traced the work requirement and the Wyoming income tax to the treasury that pays, and no further", and "Treat the other results as true of Marion, Mississippi until repeated." Read on main, Nov 10, not measured and not shown to be the cause: when the law changes, the `assistance-time-limit` case calls `payFoodAid` again for the active food aid row, outside the treasury's monthly close, and the monthly close (`runBenefitPrograms`) also reruns it; whether the extra run pays a second time is the first thing to check. The harness and dev mode both add riders when votes are forced (`gov-riders-added-when-every-vote-is-forced`); this bill was clean, and the checker must confirm the same of theirs. Related: `laws-reach-b-snap-benefit` (open), `laws-federal-benefits-on-a-line-the-federal-budget-lacks` (open; the federal treasury's food benefits are paid on a line its budget lacks), `laws-work-requirement-counts-owners-as-idle` and `outcome-web-snap-stopped-heads-still-paid` (both done). Before a twin pair, read the drawn place's starting law, as `.agents/skills/dev-tester/SKILL.md` says: if the requirement is already in force the pair is not a pair.
