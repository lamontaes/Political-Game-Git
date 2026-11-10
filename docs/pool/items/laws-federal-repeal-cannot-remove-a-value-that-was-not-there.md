---
id: laws-federal-repeal-cannot-remove-a-value-that-was-not-there
title: "Repealing a law at a body that had no value before leaves a value on the books: 9 of 40 repeals in Congress (Marion, Mississippi)"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: legislation
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 2, "Every law in dev mode's list, tried at four bodies")
---

**What.** A repeal cannot put a body back to having no law of its own. Measured in the law sweep in Marion, Mississippi (seed 7df73e53cd67): every one of the 223 repeals passed, and at the town, county and state the old value was on the books two weeks later. In Congress 31 of 40 went straight back to the old value. The other 9 repeals passed too, but those laws had no federal value before the first bill, and a bill can set a value but cannot remove one, so a value stayed where there had been none. The audit does not list which nine laws. Read in code: an amount section of a bill always carries a number, the enacting step always writes that number as a new law row, and dev mode's Repeal introduces a bill with the value 0. So a federal 0 now stands where the level used to be silent, and anything that reads "the federal value" finds one. Fix it at the cause for every body and every amount law: a repeal of a value the body itself set, where it had none before, ends that body's row, so the level is silent again and the next level's law governs as it did before.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: a repeal returns any body, at any level and in any place, to exactly the law it had before, including having none. An effect is a read, not a record: every engine that reads the law at that level must see no value after the repeal, not a zero. Replace, never layer: the repeal ends the row the bill wrote and does not stack a second row on top to cancel it. Owner, November 7, quoted by the audit: "these should all be able to be reversed."

**Done when.** A second session, not the builder, runs this in the running game. Start the bench (`OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" npm run bench`, play at `/play`) with the Place field empty so the place is a drawn place, and write down the place and seed the title shows. In dev mode's Bills panel on the Government screen pick Congress as the Body, a Sponsor and a Law that Congress may pass and that shows no federal value in force; note what dev mode's law list shows for it at each level. Set a Value, press Introduce, tick Chair hears the bill, set the Margin wide enough to clear the Senate's 60-vote rule and the Executive to Signs, and press Pass. Run two weeks in the Run panel and confirm the federal value is in force. Then press Repeal for the same law, Pass it the same way and run two more weeks. Dev mode's law list must show the federal level with no value, exactly as before the first bill, and the governing law for the town must be the same row as before, by record id (screenshot of the list before, between and after). Do the same once at a state legislature and once at a town or county board for a law that body had no value on. Then the named repro in Marion, Mississippi, seed 7df73e53cd67: all 40 repeals in Congress return to what stood before, where 31 did. A test in a drawn place sets and repeals a value at a level that had none and fails if any row is in force there afterward. The owner plays it: he repeals a law Congress passed and the law page reads as it did before Congress acted.

**Files.** src/core2/bill-catalog.ts (`provisionFor`, line 129), src/core2/modules/legislature.ts (the `law-amount` branch of `enact`, lines 6104 to 6111), src/bench/dev-mode.ts (`introduce`, line 735), src/bench/ui/dev-bills.mjs (the Repeal control, lines 134 to 146), src/core2/laws-in-force.ts, scripts/dev-tests/law-run.ts

**Notes.** From the Fable audit, Pillar 2, "Every repeal passed." Measured: the counts. The cause is the audit's reading, confirmed on main Nov 10: `provisionFor` builds a `law-amount` section with a required amount and no way to say "none"; `enact` calls `enactLaw` with `value: provision.value`; the dev Bills panel's Repeal sends `value: 0`; and the crew's harness does the same (`law-run.ts` repeals with `before ? before.value : 0`). Law rows already carry an `endDate` (`src/core2/laws-starting.ts`), and one reader honors it (`rowInForce` in `src/core2/laws-death-taxes.ts`), so ending a row is a kept idea, though the wage question also ends a level's own wage by writing a 0 row (`endOwnWage` in `src/core2/question-wages.ts`, line 126). Whether a federal 0 changes any payment or decision was not measured; the audit reports only that a value stayed. The audit also followed four passed state laws past the next January 1 and found the passed values stayed in force. Related: `law-levels-death-tax-zero-restoration` (claimed; estate and inheritance tax after a zero), `laws-three-answers-to-what-is-the-law-now` (the lookups must agree on an ended row), `laws-income-tax-flatten-sponsor-rate` (open). There is no Repeal button outside dev mode; that is a screens item from the same pillar, not this one.
