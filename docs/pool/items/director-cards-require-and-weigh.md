---
id: director-cards-require-and-weigh
title: "A scene's card gates on facts and weighs by reads: a no on record takes the ask out and moves the next door up, and the family's reaction plays only with something real to say"
area: director
kind: feature
priority: 1
size: L
status: claimed
standard: 2
claimed-by: claude/story-board-weights
pr:
after: director-board-picks-a-few
blocked-on:
model: opus
effort: medium
root: rc6-scenes-repeat
lead: director
source: 'Story lead''s director board design, Nov 16, 2026 (docs/design/director-board.md), build plan item 5; owner''s grades of the scene list on #9750 (CTO, Nov 17 00:39Z): on the street stop, "This one happens way too often in a super unrealistic way."; on office hours, "This one also happens way too much."; on the partner''s reaction after filing, "this happens like every time"; on the vote-once-cast and law-reaches scenes, "i have never seen consequences". CTO''s ruling: "Frequency is the director''s job. Street stops, office-hours visits and the partner''s reaction fire far too often. Each needs a cause on record and a cooldown, and the board picks a few."'
---

**What.** The board (director-board-picks-a-few) weighs every candidate by the amount felt alone, and a no on record changes nothing: a party's chair asks again the day after the player turned them down, and a third ask after two noes is staged as readily as the first. The family's reaction to an evening sitting plays after every late meeting, whatever the household's own records say. The design's card fields, `requires`, `excludes` and `weights` (docs/design/director-board.md, section 2), with a no read back as an `ended:` fact (section 3), let each card gate on yes-or-no facts and weigh by the arc-variant reads, so a no takes that scene out and moves a different door up, never announced.
Seen: after the player tells a party's chair no, the chair does not come back that season, a friend's cause invitation weighs more, and the family's reaction to a late sitting comes only when the household has a young child at home while the player works.

**Cause.** Design: docs/design/director-board.md, section 2 (the card's four fields), section 3 (a no as a record, read as a string) and section 6 item 5. Found in code: `pickFromBoard` and `scheduleMoment` in src/director/board.ts read no fact of a card's own; `readOf` and `pullOf` in src/director/arc-variant.ts are private to `chooseVariant`; the reply index (`repliesByPlayer`, src/director/relation-facts.ts `indexReply`) is read only by `passedBetween`.

**Fix.** Situation-type and circumstance rows take `requires`, `excludes`, `weights` and `pull` (src/director/card-facts.ts). Facts: `ended:<typeKey>:<ending>` (the same counterpart, or `:any`), read from the reply index within `scheduling.endedDays`; `stake:<any|money|time|worked|gave>`, read with family-stake.ts `stakeOf` (no second read). The board's default exclusion is two refusals of the same scene by the person to the same asker (`scheduling.noesBeforeExcluded`, director-two-noes-no-third-ask), read with `passedBetween`. Weights read with `readNamed` and `pullOf`, exported from arc-variant.ts and used by `chooseVariant` too. Rows: `party-recruit` excludes `ended:party-recruit:not-this-time`; `cause-invite` weighs `declined-party` (a new history read); `family-absence` requires `stake:any`. Dev mode's director's day names the new cuts.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes and say so. Seen: the board view shows a no's cut and the next door's weight by record id.

**Rules.** No dice: facts gate and amounts weigh, nothing is rolled. One rule, all 56 places. Replace, never layer: one grammar of reads for variants and cards. Nudge, never explicit: no line says what was avoided.

**Done when.** A second session, on main at a drawn place and seed it did not choose, forces a party's ask in dev mode, says no in the scene, and sees in dev mode's director's day the chair's next ask cut ("An earlier answer on record rules it out") and a cause invitation's score read up by `declined-party` with the reply's record id; a season on, after a second no, the next ask is cut ("The player already said no to this twice"). `src/director/board-cards.test.ts` passes on a fresh draw.

**Waits on.** Nothing.

**Files.** src/director/card-facts.ts (new), src/director/board.ts, src/director/arc-variant.ts, src/director/scheduling.ts, src/director/circumstance.ts, src/director/ledger.ts, src/director/data/situation-types.json, src/director/data/arc-variants.json, src/bench/dev-views/director-day.ts, src/director/board-cards.test.ts (new), docs/design/director-board.md (new)

**Notes.** Nov 17. Built on claude/story-board-weights, stacked on #9841.
