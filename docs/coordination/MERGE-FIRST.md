# Merge first (CTO's list; mergers read this before every merge)

Current as of 2026-10-30, 03:05 UTC (CTO, the owner's second account). This replaces the Oct 27 and Oct 28 lists; the crew is the owner's smaller crew of Oct 29 (`OWNER-DECISIONS.md`, Oct 29 16:30).

**Two mergers.** Merger 0 takes even PR numbers, Merger 1 odd ones. Either takes any line below when the other is busy. Each merge is pinned to the head you checked.

**Rules for every line** (`.agents/rules/smart-and-look-first.md`, `merger` skill):

- You are not the session that wrote the PR. Run the changed-file checks on the merged result and try once to break the claim on another drawn place or seed.
- Read every workflow on main (Release, Deterministic validation, M0 guards, Every place nightly), not only Release. A red that reproduces on clean main never blocks a PR; it belongs to the red-main fixer.
- Send back only for a defect a player would meet, a standing-rule break, or a claim the checks disprove. Fix one-step paperwork (a `Pool item:` line, a release declaration, a prettier run, a spelling hit) in the merge yourself and say so. Every send-back is SMART: the one defect, the check that shows it fixed, a time box.
- A green, mergeable PR merges within the hour it goes green. A PR stacked on another merges right after its base.
- **Never merge a PR marked OWNER VISUAL CHECK** (art intake) until the owner says yes on it; people pack v4 has his yes (Oct 29, 19:20 UTC). Nobody merges their own PR.
- Never use a scheduling tool and never edit anything under `.git`. On a send-back, comment on the PR (starting `Merger <N>:`) and message the author session named in `docs/coordination/CREW.md`; questions for the owner go to the CTO (owner, Oct 29).

## The order

0. **Red main:** any PR whose line 1 is `Touches pool item: release-main-red-standing` (the red-main fixer), ahead of everything.
1. **The menu redesign (CTO, owner Oct 29 22:45), a stack; merge in this order, each right after its base:** #6846 (Issues) → #6855 (Money) → #6857 (Who you are) → #6859 (Your life, Jobs) → #6868 (Campaigns) → #6873 (Parties) → #6881 (Budgets; Review: words for `properName`) → #6883 (Guide) → #6885 (People without closeness marks) → #6892 (timeline lines without the year; Review: words) → #6900 (Patch notes, one release at a time). #6844, #6846, #6855, #6857 and #6859 are merged; main's playerMayFile gate (#6882) is merged into the rest of the stack (Oct 30 03:40). Each one's own diff is small once its base lands.
2. **The lane's menus** (stacked on #6844, independent of line 1): #6861 (Calendar), #6875 (Journal), #6879 (Travel); and #6850 (territory law words), #6843 (bill screens). Where one conflicts with line 1 in `play.css` or `play.mjs`, keep both sides.
3. **People before the lane:** #6856 (the family drawn in a plated living room) before #6870 (the room clickable after a story), whose check needs #6856.
4. **Governing (phase A):** #6836 → #6838; #6882 (File for it only where the player may run; the Campaigns redesign already reads its `playerMayFile`); #6854 (the first local race is the place's own body); #6853, #6860, #6867, #6869, #6872, #6874, #6876, #6849 as they pass their checkers.
5. **Words:** #6831 → #6837; #6840 (swearing in); #6851; #6824 when its bank conflicts are fixed.
6. **Speed:** #6863, then the journal overflow fix and #6880 (the causes fold, ruled Oct 30 03:05) as they open.

Drafts are not yours; the CTO closes the stale ones. When a line is merged or sent back, comment `Merge-first: <PR> done` on the PR; the CTO removes the line on the next pass.
