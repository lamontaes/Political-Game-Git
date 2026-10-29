# Merge first (CTO's list; mergers read this before every merge)

Current as of 2026-10-29, 18:10 UTC (CTO, the owner's second account). This replaces the Oct 27 and Oct 28 lists; the crew is the owner's smaller crew of Oct 29 (`OWNER-DECISIONS.md`, Oct 29 16:30).

**Two mergers.** Merger 0 takes even PR numbers, Merger 1 odd ones. Either takes any line below when the other is busy. Each merge is pinned to the head you checked.

**Rules for every line** (`.agents/rules/smart-and-look-first.md`, `merger` skill):

- You are not the session that wrote the PR. Run the changed-file checks on the merged result and try once to break the claim on another drawn place or seed.
- Read every workflow on main (Release, Deterministic validation, M0 guards, Every place nightly), not only Release. A red that reproduces on clean main never blocks a PR; it belongs to the red-main fixer.
- Send back only for a defect a player would meet, a standing-rule break, or a claim the checks disprove. Fix one-step paperwork (a `Pool item:` line, a release declaration, a prettier run, a spelling hit) in the merge yourself and say so. Every send-back is SMART: the one defect, the check that shows it fixed, a time box.
- A green, mergeable PR merges within the hour it goes green. A PR stacked on another merges right after its base.
- **Never merge a PR marked OWNER VISUAL CHECK** (the people swap, art intake) until the owner says yes on it. Nobody merges their own PR.
- Never use a scheduling tool and never edit anything under `.git`. On a send-back, comment on the PR (starting `Merger <N>:`) and message the author session named in `docs/coordination/CREW.md`; questions for the owner go to the CTO (owner, Oct 29).

## The order

0. **Red main:** any PR whose line 1 is `Touches pool item: release-main-red-standing` (the red-main fixer), ahead of everything.
1. **Words and director** (the owner's words session): #6764 (replies fit what you said), #6762 (twelve more record kinds in News), then every new words or director PR as it goes green. (#6759, #6765 and #6770 merged.)
2. **The lane** (play-first): #6772 (anyone's history on their card), then `play-faces-show-the-moment-a-menu-opens` and the history fill-in as they open. (#6768 and #6771 merged.) Scrolling inside a panel under the gold scroller is the ruled replacement for paging (CTO, Oct 29), and the creator's step Back and Continue stay.
3. **Laws:** #6763 (civic family; sent back for a flaky new test, the laws session has it), then the background-record PRs as they open. (#6760 and #6766 merged.)
4. **Older ready PRs:** #6050 (someone the player's age in every town) and #5150. Merge main in, rerun the checks, merge if green; if main already does what the PR does, comment so and the CTO closes it. (#6091, #6411, #5056 and #5695 closed by the CTO.)
5. **People pack v3** (`people-pack-v3`): **hold** for the owner's look. Read it, run its checks and comment what you find, but do not merge.

Drafts are not yours; the CTO closes the stale ones. When a line is merged or sent back, comment `Merge-first: <PR> done` on the PR; the CTO removes the line on the next pass.
