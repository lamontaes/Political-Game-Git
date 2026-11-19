---
id: story-lines-home-bank6a-celebration-baby-moving
title: "A family celebration, a visit to see the new baby and a goodbye before a move play again as scenes"
area: words
kind: feature
priority: 1
size: M
status: open
standard: 2
claimed-by: claude/story-lines-home-bank6a-2
pr:
after:
blocked-on:
lead: story
model: sonnet
effort: medium
root: none
source: CTO, Nov 18 13:47Z on the Story thread (issue 9750), pre-office order step 2, home life (bank 6a); patterns B6-04 and B6-05 (docs/story/scene-patterns.json)
checked:
---

**What.** Three home scenes the cut of Nov 17 left silent are written again:

- a wedding or a new job is marked at home, and a relative asks the player a favor (`celebration`);
- a visitor comes to see the player's new baby (`new-baby`);
- a friend or relative moving away says goodbye (`moving-goodbye`).

Each stages from a record the engines already write. Seen: the life events of a new life before office.

**Cause.** Design: the lines were written before Nov 15 and deleted by the cut (`docs/current.json`, replaced list, Nov 17), so `src/director/scene-talk.test.ts` listed the three keys in `CUT_PURPOSES`.

**Fix.** Write the three scenes in `data/english/parts/scene-talk.json` from their patterns, placed by the facts their packets set:

- the honoree, the spouse and the position for a celebration;
- the baby, the partner and the visitor's hometown for a new baby;
- the destination, the reason and the companion for a move.

Slots stay where a line is about the fact, and short lines carry the rest. The three keys leave `CUT_PURPOSES`. `last-day` waits on its packet (see Notes).

**Time box.** 3 hours.

**Rules.** No hand-written player text in code: every line is a bank row. Narration says what is seen or what a record holds, never a want or a reason. The player says only what they chose (scene-standard rule 12).

**Done when.** A second session, in a drawn place and seed in the running game (dev mode allowed), meets a celebration, a new-baby visit and a moving goodbye, each from its record; scene-talk.test.ts passes; every new reply pair and narration has a verdict.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json, src/director/scene-talk.test.ts

**Notes.** Nov 19 (Story): a Sonnet helper wrote 435 rows from probes at Hancock NY and Ringwood NJ. The lead had them cut to 235 for slot padding. A fresh Haiku reader judged 206 pairs, every plant caught. The lead read 37 narrations and deleted one ("after the long trip"). Engine gaps the writer found:

- `last-day` has no school or job facts (composeBinding, src/director/purpose-scene.ts, and `MEETING_TYPES` in src/director/meeting-facts.ts);
- `birthFacts` and `celebrationFacts` take no `nearNamed`;
- a casual job's employer reads as the outside market in `celebrationFacts`.
