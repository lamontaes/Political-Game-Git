---
id: pool-check-red-stub-items
title: "The seven reported pool stubs now have complete specifications"
area: core
kind: cleanup
priority: 3
size: S
status: done
claimed-by:
pr: #5813
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The original pool-format finding listed seven items, not eight: core-speed-journal-bigint, core-speed-year-over-limit-dense-town, people-births-age-shape-narrow, people-leave-parents-home, words-past-public-and-archive-renderings, world-jobs-counted-retiree-income, world-jobs-quit-rate-jolts. These items now have complete What, Rules, Done when and Files sections. The original missing-specification finding is resolved, with a clean main pool check recorded below.

**Rules.** Look before you ask: read each item's Notes and its PR before rewording, and keep what the owner or the author already decided.

**Done when.** npm run pool -- --check exits clean on main, shown by running it in a test of the pool tooling or by the command output pasted in the PR body, with each listed item now naming a standing rule, a played world or drawn place proof, and at least one file path.

**Files.** docs/pool/items

**Notes.** Found by a session running the pool check.

Oct 21 (claude): filled on main in the commit that adds this note. people-leave-parents-home, words-past-public-and-archive-renderings and world-jobs-counted-retiree-income had TODO shells; their What, Rules, Done when and Files are now written from their titles, their PRs' changed files (#4959, #5704, #5455) and their send-back notes, which are kept as they were. core-speed-journal-bigint, people-births-age-shape-narrow and world-jobs-quit-rate-jolts had a What of two sentences, now split into three with no change of meaning. core-speed-year-over-limit-dense-town's Done when now names the played world. `npm run pool -- --check` then prints "pool index is current" and exits 0. A CTO can mark this done.

Sent back 2026-10-21 from PR #5813 (branch claude/pool-check-item-count): The eight-to-seven arithmetic corrects the length of the named list, but the new title and What still claim those seven items currently make pool --check fail on main. I ran the check here on clean published main faa435588b: it reports only elections-counted-ballots-nan-faith (Rules must name a standing rule with at least 6 words after it saying how it applies), none of the seven named items. Make this an explicitly dated historical list correction or reconcile the active cleanup text with current diagnostics. Also the first-line pool marker would automatically complete pool-check-red-stub-items even though the body explicitly leaves its cleanup unfinished; use truthful notes-only routing that returns null or meet the actual cleanup acceptance. This PR opened 2026-10-21T15:15:56Z after the table cutoff, so include the required Done when evidence table for its actual scope. The declaration is present despite the body wording; a missing gate line is not the objection. No full local gate pass or cleanup completion is claimed.; finish on that branch, merge main into it first.

Merger verification Oct 22: reviewed all seven named items on main; each names its standing rule, its profile/test/played-world or record proof, and file paths. `npm run pool -- --check` printed "pool index is current" and exited 0 at main commits 27410ea9c95d810d593edaf8c563b4c2623fb91c and 52a529c37ab0b0a210ac80e622a18086f1688ac1. This completes the original formatting finding, not the gameplay or performance work tracked in those seven items.
