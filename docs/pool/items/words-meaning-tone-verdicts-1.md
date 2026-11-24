---
id: words-meaning-tone-verdicts-1
title: "Meaning-and-tone verdicts for the 150 most-heard lines, five rules"
area: words
kind: bug
priority: 2
size: M
status: in-pr
claimed-by:
pr: 8271
blocked-on:
lead: words
source: CTO, Nov 10 5:48 p.m. (step 2), once the verdict store (#8206) was on main; heard counts from three drawn places (Englewood, Colorado; Aunu'u, American Samoa; Brooksville, Mississippi)
---

**What.** The 150 lines players hear most in a year (from three drawn places, 657 lines heard) are judged by a session that did not write them against five of the owner's rules a program cannot check: no-explaining, no-literary-phrasing, commitment-names-who-what-why, stake-is-named and reply-second-move-follows-the-first. 137 pass at once; the 13 that fail are rewritten in place from the facts their scene already holds, judged again, and rewritten again until all 150 pass. The reply pairs the rewrites join are judged too, and the picker reads those verdicts.

**Rules.** Each rewrite cites the rule it answers; only slots the scene already uses; no line the owner graded good is removed; American English.

**Done when.** The store holds 150 good verdicts and 0 bad for each of the five rules; `npm run words:grade` shows no new pull and no silent spot; english-parts-banks, the English guards, verdict-store, line-rules and liked-lines-kept pass.

**Time box.** 3 hours for one session.

**Files.** data/english/parts/scene-talk.json, data/english/judged/
