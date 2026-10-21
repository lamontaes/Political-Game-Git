---
id: pool-check-red-stub-items
title: "pool --check fails on main: eight stub items are missing required sections"
area: core
kind: cleanup
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** npm run pool -- --check reports errors on eight items: core-speed-journal-bigint, core-speed-year-over-limit-dense-town, people-births-age-shape-narrow, people-leave-parents-home, words-past-public-and-archive-renderings, world-jobs-counted-retiree-income and world-jobs-quit-rate-jolts. Their What, Rules, Done when or Files sections are stubs or too short for the item format. Each owner should fill in its own item, since the Rules and Done when lines are theirs to word.

**Rules.** Look before you ask: read each item's Notes and its PR before rewording, and keep what the owner or the author already decided.

**Done when.** npm run pool -- --check exits clean on main, shown by running it in a test of the pool tooling or by the command output pasted in the PR body, with each listed item now naming a standing rule, a played world or drawn place proof, and at least one file path.

**Files.** docs/pool/items

**Notes.** Found by a session running the pool check.

Oct 21 (claude): filled on main in the commit that adds this note. people-leave-parents-home, words-past-public-and-archive-renderings and world-jobs-counted-retiree-income had TODO shells; their What, Rules, Done when and Files are now written from their titles, their PRs' changed files (#4959, #5704, #5455) and their send-back notes, which are kept as they were. core-speed-journal-bigint, people-births-age-shape-narrow and world-jobs-quit-rate-jolts had a What of two sentences, now split into three with no change of meaning. core-speed-year-over-limit-dense-town's Done when now names the played world. `npm run pool -- --check` then prints "pool index is current" and exits 0. A CTO can mark this done.
