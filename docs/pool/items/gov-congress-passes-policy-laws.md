---
id: gov-congress-passes-policy-laws
title: "Congress passes policy laws in the world, not only its budget"
area: gov
lead: laws
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on: gov-congress-passes-policy-laws-part-1-question-list-from-data, gov-congress-passes-policy-laws-part-2-stances-on-questions, gov-congress-passes-policy-laws-part-3-law-reaches-resident
source: owner, Oct 29 voice note on the governing brief
claimed-at:
after:
standard: 2
model: sonnet
effort: medium
root: rc1-world-outside-town
checked: fable 2026-11-10
branch: claude/pool-gov-congress-passes-policy-laws
---

**What.** In three played years Congress passed no policy bill in any world; it adopted only its budget. The owner, Oct 29: "No, laws need to work federally." The president's desk signs or vetoes like any executive's. Federal laws must pass through the same legislature engine on Congress's real session calendar, with members deciding from their own reasons, and reach the town through the law store like state and local laws do. Measured Nov 9 in Caño Martín Peña, Puerto Rico (seed 50fe2d1143af): Congress introduced five bills in the year (two on the minimum wage, one on a Medicaid work rule, one on an income tax and one budget), the Senate none, against 130 bills in the whole world. In Marion, Mississippi (seed 7df73e53cd67) with every vote forced, all 40 bills Congress may pass failed at 219 to 216 and 52 to 48 and all 40 passed at 233 to 202 and 65 to 35, so the 60-vote rule is in force. This item folds in `gov-federal-questions-admitted` and, in this redo, the stance work of `gov-federal-questions-answers-stances`; the work is three parts. Seen: a federal bill passing both chambers, signed on the president's desk, and a federal law reaching a resident (owner, Oct 29: laws need to work federally).

**Cause.** Design: owner voice note Oct 29 ("laws need to work federally", `docs/coordination/OWNER-DECISIONS.md`, Oct 29 21:40 UTC) and the plan `docs/reports/world-governing-plan-2026-10-29.md` (units C1 to C3; the C2 research merged as #6887 in `data/research/campaigns/federal-questions-2026.json`). Found in code: `src/core2/modules/world-legislating.ts` still calls `api.stopgap("SG-GOV-federal-proposal-coverage")` (line 1240) and `src/core2/data/legislature/federal-answers.json` holds two questions.

**Fix.** Do the three parts in order: Congress reads one source of federal law and files on a question list from data (part 1); every federal question has a cited answer and every member and the President holds a stance on it (part 2); a played year shows Congress enacting a policy law that reaches a named resident (part 3). Delete the `SG-GOV-federal-proposal-coverage` call and marker and mark the row resolved (never deleted) once only questions with a standing answer, members' stances and an effect reader are admitted.

**Time box.** 2 hours for one Sonnet session, the closing check once the three parts are done. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** One engine per mechanic: Congress uses the same `draftBill`, committee and floor engine as every chamber, with the 60 percent cloture row already in data. No dice: what passes follows members' positions, party and the president's desk, never a rate. Wire to the world: a federal law reaches named people through law-reach. An effect is a read, not a record. One rule, all 56 places.

**Done when.** A second session plays a year from a drawn place (named with its seed, not chosen by the builder) and sees Congress enact at least one policy law by law record id, signed or vetoed at the president's desk, and one named person in the town reached by it through law-reach; all three parts are merged and seen. A test in a played year names the place and seed, the session, bill and law record ids.

**Waits on.** The three parts: gov-congress-passes-policy-laws-part-1-question-list-from-data, gov-congress-passes-policy-laws-part-2-stances-on-questions, gov-congress-passes-policy-laws-part-3-law-reaches-resident.

**Files.** src/core2/modules/world-legislating.ts, src/core2/modules/legislature.ts, src/core2/data/legislature/congress-sessions.json, src/core2/data/legislature/federal-answers.json, data/research/campaigns/federal-questions-2026.json, src/core2/world-legislating.test.ts

**Notes.** Filed by the CTO, Oct 29, from the owner's voice note on the governing brief (OWNER-DECISIONS, Oct 29 21:40 UTC). Read: OWNER-DECISIONS, DECISION-REGISTER, the governing brief's four research notes; searched the pool for twins.

Oct 29 (laws lead): mapped read-only; the plan is docs/reports/world-governing-plan-2026-10-29.md (units C1, C2, C3; about 8-13 builder hours). No admitted federal question yet has a reader in the town and a real path through 60 Senate votes; the C2 research (Oct 29) finds one. gov-federal-questions-admitted has the same test file, stopgap and done-when and should fold into this item.

Oct 29 (laws lead): gov-federal-questions-admitted is folded in here (CTO ruling, Oct 29 22:40). Carried from it: only a question with a standing answer, members' stances and an effect reader is admitted; delete the api.stopgap('SG-GOV-federal-proposal-coverage') call and its marker and mark the row resolved (never deleted); the proof is src/core2/world-legislating-federal.test.ts, a played year in a place drawn from all 56 on a seed the builder did not choose, by session, bill and law record ids. Its own earlier parts, gov-federal-questions-money-readers and gov-federal-questions-rule-readers, stay as they are.

Nov 2, 01:50 UTC (laws lead, HANDOFF, set back to open): C2 (the federal questions research) merged as #6887 (data/research/campaigns/federal-questions-2026.json). Next: C1 (Congress reads one source of federal law and files on a question list from data) and C3 (stance readers read the C2 rows; a played-year test shows Congress enacting a policy law that reaches a named town resident), per docs/reports/world-governing-plan-2026-10-29.md, after the world-governing units U2 and U3.

Nov 10, Fable audit: measured on main as of Nov 9 in a played year in Caño Martín Peña, Puerto Rico (seed 50fe2d1143af; docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 3, "Washington"): Congress runs the full bill process but introduced five bills in the year, two on the minimum wage, one on a Medicaid work rule, one on an income tax and one budget, and the Senate introduced none. In the same year 130 bills were introduced in the whole world: 111 in the home legislature, 14 in the player's own municipal board and 5 in Congress. So Congress now files a few policy bills and still barely acts; this item's done-when (one policy law enacted, signed or vetoed, reaching a named person) is not shown met by that year. The audit's law sweep in Marion, Mississippi (seed 7df73e53cd67) adds that with every vote forced, all 40 bills Congress may pass failed at 219 to 216 and 52 to 48 and all 40 passed at 233 to 202 and 65 to 35, so the Senate's 60-vote rule is in force. The audit did not measure how many of the five bills passed, and did not record who held each chamber over a long run. The other two parts of the audit's "Washington barely acts" finding have evidence on `nation-president-orders-by-series` (the President weighs one executive order) and `justice-federal-case-stream` (the federal courts hear no cases).

Released (2026-11-11): umbrella that waits on its three parts. Continue on branch claude/pool-gov-congress-passes-policy-laws.
