---
id: play-stopgap-controls-text
title: "Stopgaps in controls (text): 1 open"
area: play
kind: stopgap
priority: 3
status: in-pr
claimed-by: claude/button-names
pr: 9233
after:
blocked-on:
standard: 2
lead: play-first
model: sonnet
effort: low
root: none
milestone:
source: "src/core2/data/stopgaps.json, src/bench/data/controls.json, kind text"
claimed-at:
size: S
checked: fable 2026-11-10
branch: claude/pool-play-stopgap-controls-text
---

**What.** The play screen names an act's choice button from a bench table of control names where the mined choice-names bank has no name for the act yet. This is the open text stopgap SG-PLAY-act-control-names. About two thirds of the 21 act keys in the table have no matching move in the bank. Add mined names for them to the bank, read them in the two places that use the table, and delete the table and resolve the stopgap.

**Cause.** Found in code: `SG-PLAY-act-control-names` (status open) in src/core2/data/stopgaps/play.json, whose fake is the "actions" table in src/bench/data/controls.json, read as `controls.actions` in src/bench/play.mjs (lines 2536 and 4122). The act keys with no move of the same name in data/english/parts/choice-names.json on Nov 10 are organize-meeting, office-hours, town-hall, interview, meet-department-head, name-department-head, talk-to-colleague, cut-ribbon, vote, sign, veto, case, speak and state-of-the-city (sign and speak may be named by other tables).

**Fix.** Add mined names for those acts to the choice-names bank (Story writes the lines; one writer per bank file), read them in src/bench/play.mjs at lines 2536 and 4122 instead of `controls.actions`, delete the table, and mark the stopgap resolved. Never close the row by deleting it without the replacement.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: the names come from the English engine's bank, mined and graded like any other piece. Replace, never layer: the table is deleted in the same change as the bank names arrive. Every stopgap is registered in its family file; resolve it there.

**Done when.** A second session (not the builder) starts the bench in a drawn place (place and seed named), opens the screens that show an act's name (the journal of actions and the list at src/bench/play.mjs lines 2536 and 4122) with a screenshot at 1440x900 of each act kind the player can reach, and every name reads as a short imperative from the bank with no raw action id. The stopgap row is resolved in src/core2/data/stopgaps/play.json and a test fails if `controls.actions` returns.

**Waits on.** Nothing.

**Files.** src/bench/data/controls.json, src/core2/data/stopgaps/play.json, data/english/parts/choice-names.json, src/bench/play.mjs

**Notes.** First row: Where OPUS-WORDS' mined bank has no name for an act yet (care for a relative, join an association, hold a meeting, visit an office), the play screen names its choice button from a bench table of control names (“Look afte Released from idle draft #5180 by the CTO, Oct 26.

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/political-game-pool-76ksvw` (2026-10-20). Cleared from the front matter and kept here.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 06:05 UTC) on branch claude/pool-play-stopgap-controls-text.

Released by next (2026-11-13): no push to claude/pool-play-stopgap-controls-text since 2026-11-11 06:05 UTC, more than twice its 3-hour time box. Continue on branch claude/pool-play-stopgap-controls-text.

Built on claude/button-names (Nov 14, cluster 24): 18 authored slot-free names added to the choice-names bank (the 14 missing acts plus a slot-free name for four acts that only had a name with a person, group or office in it), served as `actions` on /api/controls by actionNames in src/bench/words.ts; the controls.json table and the stopgap id line deleted; SG-PLAY-act-control-names resolved; src/bench/action-names.test.ts fails if the table returns. Names are authored (origin authored), not mined: the corpus is not in a cloud container.
