---
id: laws-congress-holds-two-questions-for-one-federal-wage-rule
title: "Congress holds two yes-or-no questions for the one federal minimum wage rule, and a test has been red at every place since"
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
model: opus
effort: medium
root: none
source: Fable B, Nov 15, 2026, from a red in the gate of #9452 that is also red on the clean train and on main
---

**What.** At the federal level two platform questions stand for one rule. The states' question `us-policy-positions:labor-workforce.raise-minimum-wage` is read at the federal level as the series `us-federal-positions:labor-commerce.raise-federal-minimum-wage`, and since Nov 11 that federal series is a platform question of its own as well. So Congress's members hold two views on one decision, its filers weigh the one rule twice, and the drafting menu for Congress lists it twice under Labor. The test src/core2/canonical-policy-topics.test.ts ("Two labels must not count as two policy decisions") fails at every place tried, on main at fa34439db8 and on the train at 32a994212b. Seen: Politics, a member of Congress drafting a bill, the Labor list, where the federal minimum wage question appears twice.

**Cause.** Found in code: `PLATFORM_QUESTIONS` (src/core2/campaign-data.ts, `axisOf`) is every key of the two axis files. Pull request #8752 (Nov 11) added data/research/campaigns/federal-issue-axes-2026.json, which holds the federal label, while the states' label was already routed to that same federal series by `policySeriesAtLevel` (src/core2/policy-answers.ts). `levelMayDecide` (src/core2/modules/world-legislating.ts) reads only the question's own scope, so it admits both at the federal level. Measured on the train at Lino Lakes, Minnesota (seed 046d2235-27df-4daa-a680-423d6f24d0d7): 19 federal topics over 18 series, and `billCatalog(api, "federal", "US")` lists both `question:us-federal-positions:labor-commerce.raise-federal-minimum-wage` and `question:us-policy-positions:labor-workforce.raise-minimum-wage` under Labor. The test fails "expected 18 to be 19" at Beverly, New Jersey (GOLDEN_PATH_SEED=24c9274f034bcffc), Remsen, New York (aaaa1111bbbb2222) and Plevna, Montana (0123456789abcdef).

**Fix.** One label per rule at each level, decided by the data and not by a list of names.

1. In `questionForLevel` (src/core2/modules/world-legislating.ts), a question is not a level's own when its series at that level is a different key that is itself a platform question. At the federal level that leaves Congress its own label, whose direction was measured from roll calls, and the states' label stays the states'.
2. The drafting menu (`billCatalog`, src/core2/bill-catalog.ts) offers a question only where `levelMayDecide` admits it, so the Labor list for Congress shows the rule once.
3. The test asserts today that the states' label is among Congress's topics. That line follows the old design and changes with the fix; the laws lead says so in the pull request before it is edited (skill pinned-tests, rule 5), and the test is pinned to two named places while it is open.

**Time box.** 2 hours.

**Rules.** One rule, all 56 places: the check is on the series and the level, never on the wage question by name. Replace, never layer: one label per rule at a level, not a second list of labels to skip. A view that computes its own version of a fact is a duplicate: a member's view on the rule is one view.

**Done when.** A second session, on the train or on main once it is there, starts the bench at a place it draws and writes down with its seed, opens dev mode's Bills panel with Congress as the body and reads the Labor list: the federal minimum wage question is there once. src/core2/canonical-policy-topics.test.ts passes at two named places and fails at both with the new check taken out.

**Waits on.** Nothing.

**Files.** src/core2/modules/world-legislating.ts (`questionForLevel`, `levelMayDecide`); src/core2/bill-catalog.ts (`billCatalog`); src/core2/campaign-data.ts (`axisOf`, read only); src/core2/canonical-policy-topics.test.ts

**Notes.** Not measured: whether a session of Congress has filed two bills on the one rule in a played year. The filers loop over the platform questions, so it can.
