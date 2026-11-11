---
id: gov-congress-passes-policy-laws-part-3-law-reaches-resident
title: "A federal policy law is enacted and reaches a named resident"
area: gov
kind: wiring
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after: gov-congress-passes-policy-laws-part-1-question-list-from-data, gov-congress-passes-policy-laws-part-2-stances-on-questions
blocked-on:
lead: laws
model: opus
effort: high
root: rc8-law-judged-by-paperwork
source: split from gov-congress-passes-policy-laws in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Show Congress enacting a policy law in a played year and reaching a resident. With parts 1 and 2 in place, bills on the federal questions pass both chambers through the 60-vote rule, reach the president's desk, are signed or vetoed, and an enacted law reaches a named person of the town through law-reach. The proof is a test in a played year that names the place and seed and the session, bill and law record ids. Feeds: gov-congress-passes-policy-laws.

**Cause.** Design: owner voice note Oct 29 ("laws need to work federally", `docs/coordination/OWNER-DECISIONS.md`) and `docs/reports/world-governing-plan-2026-10-29.md` unit C3; no played year on main shows one federal policy law enacted.

**Fix.** Run a played year with parts 1 and 2 on, find where a federal policy bill stops short of enactment (vote counts, cloture, the desk) and fix it at that engine; confirm the signed law's provision is read by law-reach into one named person's record.

**Time box.** 6 hours for one opus session.

**Rules.** One engine per mechanic: the same legislature engine and law-reach as every law. No dice. Wire to the world: a federal law reaches named people through law-reach. The chain is the acceptance: bill, vote, desk, law in force, the person reached.

**Done when.** A second session plays a year from a drawn place (named with its seed, not chosen by the builder) and sees Congress enact a policy law by law record id, signed or vetoed at the president's desk, and one named person in the town reached by it through law-reach; a test in `src/core2/world-legislating-federal.test.ts` names the place, seed and record ids.

**Waits on.** gov-congress-passes-policy-laws-part-1-question-list-from-data and gov-congress-passes-policy-laws-part-2-stances-on-questions.

**Files.** src/core2/modules/world-legislating.ts, src/core2/modules/legislature.ts, src/core2/law-reach, src/core2/world-legislating-federal.test.ts (new)
