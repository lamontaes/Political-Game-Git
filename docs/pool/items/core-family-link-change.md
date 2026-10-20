---
id: core-family-link-change
title: "A core call adds and ends a partner link between two people, and the births engine reads the couples that result"
area: core
kind: feature
priority: 2
size: M
status: claimed
claimed-by: claude/pool-family-link
pr: #4961
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T01:46:14.350Z
---

**What.** The Core API needs to add or end a partner link between two living adults while the world runs. PR #4961 supplies that call, dated facts and family events, and a births-engine reader that takes up the new couple. The household prerequisite is now on main and its release-note conflict is resolved. Complete the ownership review for the People reader before landing the remaining Core API change, preserving the existing branch and tests.

**Rules.** Wire to the world: the births engine reads the partnership event by its actual link record, rather than leaving an unused family fact. One rule, all 56 places: require eligible generated-world cases with a printed place and seed. Core owns state and API types; People owns the renewal reader and must land or agree to that part.

**Done when.** In a played world drawn from all 56 places, forming and ending a partnership updates both people and their dated link records, the owning People reader takes up the new couple, all required cases are exercised, and changed-file checks pass with the ownership agreement recorded.

**Files.** src/core2/state.ts, src/core2/types.ts, src/core2/family-link-change.test.ts, src/core2/modules/renewal.ts

**Notes.** TODO

**Built Oct 17 (claude/family-link-change, stacked on claude/household-membership).** `api.setPartnersV1({ personIds, together, source })` (src/core2/state.ts) adds a `partner` link between two single living adults, or ends the one between them. Each person's relatives and past facts record it with the date (`family:partner`, `family:former-partner`), and the event `family.partnered` or `family.separated` is emitted. The births engine's reader of the event is not in this PR: it is People-area code (`src/core2/modules/renewal.ts`), moved out after the Oct 20 send-back to the pool item `people-births-reads-family-partnered`, with the finished change on branch `claude/births-reads-partnered` (`coupleFromLink`, and an `onEvent` for `family.partnered` that opens and reviews the couple). Where the two live is the caller's business: move them into one household first (`changeHouseholdV1`), then link them. A couple needs a mother (a woman among the two), as the births engine has always required. Left: the `kinOf` cache in moves.ts keys on the number of links, so ending one link and forming another between two reads would go unseen. The test is src/core2/family-link-change.test.ts.

Sent back 2026-10-17 from PR #4961 (branch claude/family-link-change): Morning check: this stack inherits household-change.test.ts from #4948, where if (third) and if (lone) silently omit the split-household and ended-lease cases. Merge the corrected Core prerequisite first so all three required operations are exercised, then merge main here and validate the remaining family-link diff. Also record People-area agreement for the renewal.ts reader change, or have that owning area land it through its own PR.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #4961 (branch claude/family-link-change): Morning check after resolving the Markdown conflict and landing the household prerequisite: this Core-area PR still edits the People-owned births engine src/core2/modules/renewal.ts. Its body acknowledges that ownership but records no People-area agreement or owning-area prerequisite PR. Land the renewal reader through its owning area or record that agreement, while keeping the Core API and its required tests intact.; finish on that branch, merge main into it first.

Oct 20 (claude/family-link-change): sent back for editing People-owned `renewal.ts` with no People agreement. The change to `renewal.ts` is out of this PR and the test no longer asserts the births engine's couple row; the Core API (`setPartnersV1`), the two events and the record on both people stay, with their tests.
