---
id: story-cut-bank-lines-not-composed
title: "Delete the bank lines the English engine did not compose: the sixty deleted scene kinds, and every line with no insert in the rest"
area: words
kind: bug
priority: 1
size: L
status: in-pr
standard: 2
claimed-by: claude-story-cut-bank-lines
pr: 9999
after:
blocked-on:
lead: story
model: opus
effort: medium
root: none
source: owner, Nov 17, after playing v0.113.0; CTO order on issue #9750 (comment 6954612785); Story lead's KEPT and DELETED lists (comment 6955131279)
---

**What.** The owner hit a scene that opened "your partner comes to you with news," then "i have news for you they just put us out," with replies like "okay. how much. we'll manage." His words: "how is this still in the game."
Seen: in the owner's sitting on v0.113.0, Nov 17, in the eviction talk at home (`notice-home`).

**Cause.** Design: the owner's ruling, Nov 17, verbatim: "STOP TRYING TO MAKE SHIT SHINE JUST DELETE EVERYTHING THAT IT HASNT WRITTEN EBCAUSE THIS ISNT HELPING." (confirmed: "Yes, that's it. Go."). The banks under data/english/parts held whole stock sentences picked as they stand (4,918 in scene-talk alone by the Nov 16 recount) and the lines of 60 scene kinds the Story lead listed as not composed from records; tests/guards/english/line-inserts.test.ts let each bank keep its count through tests/guards/english/line-inserts-baseline.json.

**Fix.** Delete every use naming a purpose, move set or lead role of the 60 DELETED kinds in data/english/parts/scene-talk.json and scene-words.json (a part with no use left goes; data/english/scene-move-sets.json loses the sets that served only them). In every bank, delete each line of four words or more with no slot in braces that is not an action name or a piece of a sentence that always carries an insert (the guard's own rule), each line padding the listener's name, and each use that only followed a deleted piece. Delete the baseline and hold both counts at zero in the guard. Then `npm run words:verdicts`, `npm run words:rules` twice and `npm run words:grade`; remove deleted keys from the lists of line keys in tests.

**Time box.** 6 hours, one Opus session at medium.

**Rules.** Replace, never layer: no bare line is kept to fill a spot; a spot left with no line is listed in the pull request. No session edits the checks that judge it beyond removing references to deleted lines.

**Done when.** `npx vitest run tests/guards/english tests/english-parts-banks.test.ts` passes with every bank at zero lines without an insert and zero padded names; a second session plays the road to election day (filing, campaign, election night) at a drawn place and hears no stock line, with every step still reachable from the menus.

**Waits on.** The director's cut (branch claude/story-cut-director) for the kinds to stop staging; the third pull request for the tests of the deleted kinds.

**Files.** data/english/parts/*.json, data/english/scene-move-sets.json, data/english/judged, data/english/pulled.json, tests/guards/english/line-inserts.test.ts, tests/english-parts-banks.test.ts, tests/english-answerable-asks-baseline.json

**Notes.**
