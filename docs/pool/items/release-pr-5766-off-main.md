---
id: release-pr-5766-off-main
title: "PR #5766 merged into branch claude/speed-date-parse, not main, while its item core-speed-date-parse-callers read done: confirm the work reached main through #5381 and prove it with the git log and the test"
area: release
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added by the acting CTO, Oct 22 merge sample
claimed-at:
---

**What.** PR #5766 (branch claude/speed-date-callers) was merged on 2026-10-21T00:40Z with its base set to claude/speed-date-parse, the branch of PR #5381, not main. Its pool item core-speed-date-parse-callers was marked done with pr #5381 at that moment, although nothing had reached main. A merge into a side branch counts for nothing: the game, the release build and every other session read main alone. On 2026-10-22T03:04Z #5381 itself merged into main (merge commit 8ec9297a2b), and compare main...92cc09f567 (the #5766 merge commit) now reads ahead 0, behind, so the work should be on main through that merge. This item verifies that landing rather than trusting it, and corrects the item if the proof fails.

**Rules.** Wire to the world: a change counts only on main, so a PR merged into another PR's branch is not landed until that branch's PR merges to main, and its item stays in-pr until the git log shows it there. Never loosen or skip a test: the callers' test is run on main as it is, not on the side branch. Ask why: if the git log shows the commit on main but the diff is missing, the merger's base-branch slip is reported in Notes, not papered over.

**Done when.** The builder shows, in the PR body, (1) `git log --oneline main | grep -c 92cc09f` or `git merge-base --is-ancestor 92cc09f567511b265621b1865f7c8565807ee73a main` returning true on current main, (2) `git diff main -- src/core2/closeness.ts src/core2/modules/news.ts src/core2/work-pay-period.ts src/core2/modules/work.ts src/core2/births-check.ts` against the #5766 head showing no missing hunks from the callers' change, (3) `npx vitest run src/core2/dates-civil-day.test.ts` passing on main (3 tests) and the civilDay plus makeIsoDate lines of `npm run speed:year -- --seed m7b --exclusive` together under 1 percent, as the parent item required, and (4) core-speed-date-parse-callers's `pr:` corrected to the PR that actually carried it to main (#5381, with #5766 named in Notes). If any check fails, the item core-speed-date-parse-callers goes back to in-pr and a PR from the claude/speed-date-callers tip to main is opened.

**Files.** src/core2/births-check.ts, src/core2/closeness.ts, src/core2/modules/news.ts, src/core2/work-pay-period.ts, src/core2/modules/work.ts, src/core2/dates-civil-day.test.ts, docs/pool/items/core-speed-date-parse-callers.md, .agents/skills/merger/SKILL.md, .claude/skills/merger/SKILL.md, .agents/skills/pr-fixer/SKILL.md, .claude/skills/pr-fixer/SKILL.md, .agents/skills/session-start/SKILL.md, .claude/skills/session-start/SKILL.md, .github/PULL_REQUEST_TEMPLATE.md, AGENTS.md, docs/pool/README.md

**Notes.** Found in the acting CTO's Oct 22 merge sample. The files list is `pulls/5766/files` less the pool item files and release declarations it carried. The merger skill should also gain one line, in the same PR or a follow-up: before merging, check `baseRefName` is main; a stacked PR merges only after its base PR has merged, and its item is marked done only then.
