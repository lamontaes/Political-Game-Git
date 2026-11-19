---
id: tests-asked-mutual-draws-after-century-cut
title: "asked-mutual-no-against-record is pinned to seed 07 until the century's per-seed opening cost comes down; then it draws its world"
area: words
kind: cleanup
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play-first
model: sonnet
effort: medium
root: none
source: Fixer (playtest crew), Nov 19 09:50Z, CTO 7005598394 on #9747
---

**What.** `src/director/asked-mutual-no-against-record.test.ts` was re-pinned on Nov 19 from seed d4 to 07 (The Plains, Ohio) for the landing of #10135. After the history from 1925, nobody at d4 asks after someone the player saw lately within 120 days. Over nine seeds the case came up at four on the train (18, e5, 07, c3) and five on main.
Seen: train 0e7ea9db, nine 120-day staged worlds, about 55 s each.

**Cause.** The test is pinned to one seed. Any change to who meets whom can move the case off it, and it has moved off twice (Nov 16 and Nov 19). A drawn version takes about 400 s, because the century adds about 4 s for every new world seed it opens.

**Fix.** Once Speed's cut to the century's per-seed opening cost lands, replace the pin with the eight-draw loop on branch `claude/project-thread-4e8sw5-asked-mutual-draws` at commit dbeb7f7b. It draws `<GOLDEN_PATH_SEED or "asked-mutual">:<n>` for n from 0 to 7, checks the first draw where the case comes up, and names the draws passed over. Its limit is set from the measured time after the cut.

**Time box.** 1 hour, one Sonnet session at medium.

**Rules.** No pin without a CTO line; a test draws and waits (skill drawn-place-tests). Every assertion stays as it is.

**Done when.** The test draws its world, passes at its default base and at three fresh `GOLDEN_PATH_SEED` values, names the draws it passed over, and runs within its limit. A second session runs it on the train and sees it green.

**Waits on.** Speed's cut to the century's per-seed opening cost (CTO 7005164629 on #9747).

**Files.** src/director/asked-mutual-no-against-record.test.ts

**Notes.**
