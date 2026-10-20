# Merge audit, October 20, 2026 (early morning)

Three reviewers read the diffs of the 55 PRs the four merger lanes merged late on October 19. Below, "passes" means the PR's own claim.

**Result:** 24 good, 28 with concerns, 3 bad. The code is mostly real and wired into the game. The merging process is the problem.

## Process problems

- **PRs merged after the merger itself sent them back, with no new commit:** #4886, #4968, #4976.
- **Merged into another PR's branch, not main:** #4984 (its code reached main later through #5044; #5019 is still open and superseded).
- **No check record:** checks were queued or canceled at merge on nearly every PR, merges landed seconds after a main merge, and only #4885 has a merger comment naming the checks it ran.
- New merger rules went to all four lanes on October 20. The base must be main, a send-back never merges without a new fixing commit, and the changed-file checks run again after merging main. Each merge gets one comment naming its checks. Narrowed tests, unexplained timeouts, hand-written player text, old-engine imports, duplicated pool sections and false claims are sent back.

## Fixes to make (pool item `release-merge-audit-oct20-fixes`)

Bad:

1. **#4968 (fixed in #5509):** news.test.ts and office-proof.test.ts still return early or recheck the empty selection. Draw places with bounded retries until one has a county and a state office, assert the feature, fail on exhaustion; keep the no-county case as its own test; put the governor test timeout back near 240,000 ms or state why.
2. **#4976:** law-reach-group-a/b tests still return when the subject is absent. Redraw until a town has a legislator or a private school and run the filing, reach and closure assertions; correct the pool note that claims every site is fixed.
3. **#4886 / #4903:** counted-deaths-opening.test.ts uses a random seed and a loose floor (deaths at least half of expected) and fails on small towns. Pin seed 140bb7872bc46f5202d12ae8c4c52ca2364da2da170593f43aeb7f7810bd5366 (Centennial, Wyoming) as a regression case and make the check statistically sound.
4. **#4984:** close #5019 as superseded; fix the stopgap row's line number for SG-WORLD-department-government.

Rule breaks that reached main:

5. **#5226:** nine hand-written journal lines are marked `origin: authored`, `shippable: true`. Set them to not shippable until graded, and make the test require the partners-met and parent-job lines.
6. **#5093, #5097:** src/core2/town-workplaces.ts and src/core2/work-schedules.ts import types from src/simulation (the old engine). Move the types into core2; remove the dangling town-employment-mix.ts line from tsconfig.node.json; close #5084 (duplicate, carried in by #5097).
7. **#5016, #4972:** pool items with pasted-twice sections (world-corporate-office-staff-never-paid, world-utility-staff-never-paid, people-press-turnover-no-leavers-no-openings). Remove the duplicates.
8. **#5314, #5294:** owner and date notes added to data citations and stopgap text. Remove them (owner notes must not ship).

Weak tests and overclaims:

9. **#4939:** living-costs test narrowed to households that earn; jobless households' arrears retry daily and grow forever. Add a bound or write-off and a test for it; measure a dense-town year; close #4937 (duplicate).
10. **#5129 (fixed in #5511):** agreement-jobs-free.test.ts is nearly vacuous and its `jobIdsNamed` lost braces, so it never recurses. Fix the braces, assert named jobs exist, build with `twoLevel: true`, and reproduce the "Invalid relocation" crash the body reported.
11. **#4928:** hire test asserts at least one half; make it both halves. Explain or revert the threefold timeouts; run the full residents.test.ts.
12. **#5016, #5033, #5008, #5020:** tests that loop over flows or rows and pass when there are none. Assert the rows exist first.
13. **#5286:** one grade makes a piece always win, contradicting its own note. Require several grades or keep variety; release note to impact none until grades exist.
14. **#5027 (measured in #5516):** rewrites opening wages and hours (up to 20 percent) before opening capital is set, while saying no paycheck changes. Run a before and after on opening capital, credit and treasury reserve in three or four places.
15. **#5278:** businessEnergyCostYear copies the price-law table; share one rule and test it equals twelve months of the settlement. Decide on purpose that employers without books never organize.
16. **#4871:** the governor's commute power is reachable only by a player governor and has no screen; relabel the release note and add a pool item for computer governors acting on clemency.
17. **Release notes that misstate the change.** #5218 says two states but changes 51 House and 30 legislative rows, and 22 House rows still use the flat estimate. #4863 describes a drift engine that no longer exists. #4948 says nothing changes in the game, but partial moves now hand lease payers to those who stay. #5021's body describes edits that landed in #5266. #5322 says each island opens at its real population, but the sample caps at 10,000. For #5258, no screen offers the act yet.
18. **Data to verify:** #5230 Connecticut property-tax due dates (believed July 1 and January 1 by statute); #5274 Michigan row tagged SOURCED though its rule differs for primary-electing cities; #5033 regenerate town-business-books.generated.ts from the script and check the three IRS values.
19. **Stale text.** SG-WORLD-credit-island-deposits (#5254) still says islands carry no county code; add a territory test. Fix the SG-CORE-territory-places replacement text (#5322). #5032 still refers to the deleted build-place-lookup-data.ts. The people-partnership-rates-check item (#5040) is still blocked on an empty shell. #5334's item should be blocked on a design call, not open. Restore the pr link on #5101.
