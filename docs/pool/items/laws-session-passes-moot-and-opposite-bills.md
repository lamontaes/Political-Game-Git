---
id: laws-session-passes-moot-and-opposite-bills
title: "A state session passes bills that restate the law in force and bills that undo each other the same day (Illinois: 36 laws on 28 questions, 13 changing nothing)"
area: laws
lead: laws-effects
kind: bug
priority: 2
size: M
status: done
claimed-by: claude/laws-session-moot-bills
pr: #6336
blocked-on:
source: laws-and-effects lead, Oct 27 (laws-in-force-every-question's played-world test)
claimed-at: 2026-10-27T11:13:25.181Z
---

**What.** In the played-world test of `laws-in-force-every-question` (Carol Stream, Illinois, 1711332, world seed c98d47988a779f6e27d4db38cd288d9dce7a8cc6a54b44e9d5bfa3b346c565ff), the Illinois session passed 36 laws on 28 of its 58 policy questions, all taking effect January 1, 2026: 23 flip the starting answer and 13 restate the law already in force (the clean electricity standard passed four times, by HB 10, HB 16, HB 30 and SB 16). Paid family leave passed both ways the same day (SB 2 sets it, SB 16 ends it). In Del Monte Forest, California (0618590), 47 laws on questions took effect January 1, 2026. Members' filings check the law in force only when they file (`needsChange`, `src/core2/modules/world-legislating.ts:1380` and the state session's own check), so several members file one question, and the floor week passes each bill without reading what an earlier bill this session already enacted.

**Rules.** No dice and sliding scales: a bill dies, merges or is withdrawn because the law it would make is already enacted or pending, read from the law rows at the floor, never by a fixed rate. Research calibrates the count: real sessions' number of major policy changes checks the total, it never picks a bill. One rule, all 56 places.

**Done when.** In a played year (buildBenchWorld, every module installed) in three places drawn from all 56 on seeds the builder did not choose, named in the PR body, no law passed in play sets the value already in force or pending at its level on the day it passes, no two laws on one question at one level take effect the same day with opposite values, and the PR body lists each drawn state's count of starting answers changed in the session beside a researched count of major policy changes per state session, with its source.

**Time box.** 3 hours, the laws-and-effects lead or one Sonnet helper.

**Files.** src/core2/modules/world-legislating.ts, src/core2/modules/legislature.ts

**Notes.** Filed by the laws-and-effects lead, Oct 27. Measured from the test's log: of Illinois' 36 state laws, 23 change the starting answer and 13 match it. The floor's weekly calendar (#6226) takes up the same filings it did before plus bills drafted later, so the duplicates predate it; whether it raised the count is part of this item.
