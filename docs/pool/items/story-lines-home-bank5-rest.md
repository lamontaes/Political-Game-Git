---
id: story-lines-home-bank5-rest
title: "Coming home from prison and a job offer play again as scenes"
area: words
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/story-lines-home-bank5-rest
pr: 10063
after:
blocked-on:
lead: story
model: sonnet
effort: medium
root: none
source: CTO, Nov 18 13:47Z on the Story thread (issue 9750), pre-office order step 2, home life (bank 5); patterns B5-01 and B5-08 (docs/story/scene-patterns.json)
checked:
---

**What.** Two home scenes the cut of Nov 17 left silent are written again: a relative or housemate home from prison asks for a place to stay and for work, or the player comes home and is met (`return`), and an employer offers the player a job (`job-offer`). Both stage from records the justice and jobs engines already write, so only their lines were missing. Seen: a life before office, after a release or a layoff.

**Cause.** Design: the scenes' lines were written before Nov 15 and deleted by the cut (`docs/current.json`, replaced list, Nov 17), so `src/director/scene-talk.test.ts` listed `return` and `job-offer` in `CUT_PURPOSES`.

**Fix.** Write both scenes as rows in `data/english/parts/scene-talk.json` from patterns B5-01 and B5-08, placed by the facts their packets set: `away`, `child`, `job-lost` and `same-home` for the homecoming; `employer`, `position` and `deadline` for the offer. Both leave `CUT_PURPOSES`. The argument, the apology and the reconciliation get narration only and wait on story-quarrel-scenes-name-their-cause.

**Time box.** 3 hours.

**Rules.** No hand-written player text in code: every word of both scenes is a bank row, and a slot carries the fact the line is about, never padding. Wire to the world: each line is placed by a fact its packet sets from the justice, jobs or household record. The player says only what they chose, so no reply promises an act the engine does not record (scene-standard rule 12), and no new line says the pay aloud.

**Done when.** A second session, in a drawn place and seed in the running game (dev mode allowed), meets a homecoming after a release and a job offer after a layoff, each from its record; scene-talk.test.ts passes; every new reply pair and narration has a verdict.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json, src/director/scene-talk.test.ts

**Notes.** Nov 18 (Story): a Sonnet helper wrote the rows from probes at Rockville, IN (seed "p1", a release staged by hand) and Villas del Sol, PR (seed "j1", a layoff then an offer by the jobs engine). In a second round, the lead had the `{place}` padding, the full-name vocatives and the promised acts taken out of the homecoming. A fresh Haiku reader judged 833 pairs, every plant caught. The lead read 18 narrations and deleted two that gave a reason. Some kept job-offer state rows from before the cut still say the pay; that is for the Words lead.
