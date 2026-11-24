---
id: release-main-red-press-comment-probe-strangers
title: "The press-comment probes expect two strangers and fail where the probe reporter is close to the member"
area: release
kind: bug
priority: 1
size: S
status: merged
standard: 2
claimed-by: claude/red-main-press-comment-probe-strangers
pr: #8983
after:
blocked-on:
lead: words
model: opus
effort: low
root: none
source: Red desk, Nov 13 (Fable A on #8928, comment 6840590053)
merged-at: 2026-11-13T03:45:43.797Z
---

**What.** `src/director/press-comment-variants.test.ts` fails on clean main at GOLDEN_PATH_SEED=32d25706d5cdbd72 (Butteville, Oregon, 4110100, attempt 10): the hand-made probe that expects the plain call between a town reporter and a member gets friendly, because in that world the reporter the probe picked is close to the member (closeness 0.36). The game is right: a close reporter's call is friendlier. Seen: the probes check one record at a time from a call between two strangers.

**Cause.** Found in code: the test picks its probe reporter with `best(staff("local"), ...)` by temper alone, and `chooseVariant` in src/director/arc-variant.ts reads the pair's tie as its own `closeness` read, so a reporter with a tie to the member carries friendliness into every probe that assumes none.

**Fix.** Test only: the probe reporter is drawn from the town's local reporters with no tie to the member, by the same temper rule; a town whose every reporter has a tie is passed over by name and the next place is drawn. No assertion changes.

**Time box.** 1 hour

**Rules.** One rule, all 56 places: the test keeps drawing places and names each one passed over. No assertion is loosened; the probes keep their one-record-at-a-time premise.

**Done when.** A second session runs press-comment-variants.test.ts on main at GOLDEN_PATH_SEED=32d25706d5cdbd72 and at a fresh seed, each naming its drawn place, and the probes print plain, friendly, scandal and national as the records give.

**Waits on.** Nothing.

**Files.** src/director/press-comment-variants.test.ts
