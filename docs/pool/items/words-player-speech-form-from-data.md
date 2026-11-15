---
id: words-player-speech-form-from-data
title: "The speech the player builds takes its form from data: how many clicks, which kinds of parts, and the speaker's own life as parts"
area: words
kind: feature
priority: 3
size: L
status: open
claimed-by:
pr:
after: words-player-speech-through-planner
blocked-on:
source: owner Nov 15 02:39Z (relayed): every speech follows the click rule, no single format, a President's speech anywhere from 5 to 20 clicks; Words lead, Nov 15 (answers on the player-speech design)
lead: words
standard: 2
model: opus
effort: medium
root: none
---

**What.** Step 1 (words-player-speech-through-planner) put the player's campaign speech through the planner but kept a greeting, one click per point the speech's row plans, and a close. The owner's rule is that every speech is built one part a click and no speech has one format, a President's anywhere from 5 to 20 clicks. Seen: a player's speech can be a short stump speech, a long address, or something in between; the parts on offer are not only a stand but, where the record has something to say, a person by name, what I did, who I am against, a promise, the people left out, and the parts from the speaker's own life (work, home, children, school, the town's changes).

**Cause.** Found in code: src/director/speech-builder.ts `stagesOf` returns a greeting, `outlineOf(kind).points` parts and a close, and `offer` offers only questions from `pointCandidates` (src/director/speech-outline.ts); the form is the same for every kind and every speaker and no part kind but a stand exists. The parts from the speaker's own life were removed in step 1 with data/english/parts/speech-stages.json (list: /mnt/project-files/words-lead/speeches/personal-parts-removed.md).

**Fix.** Read the form from `speech-outlines.json` per kind: the part kinds a kind may offer, in what order, and the range of clicks (the record sets where in it a speech lands: an address of a President long, a stump speech short). Add the part kinds to the planner as blocks any speaker can use, each offered only where the speaker's record gives it something to say (`pointCandidates` becomes `partCandidates`), each written back on Give as a stand is now. The Words lead writes the blocks for the personal and area parts from the record list. Extend `speechBegin` to every kind the planner has a row for (the President's address, a governor's, a mayor's).

**Time box.** 6 hours.

**Rules.** Replace, never layer: `stagesOf` and the one-kind candidate list are replaced, not kept beside the new form. No hand-written player text. Every length and count in a parameter row with its spread.

**Done when.** A second session plays a new life in a drawn place to a campaign and gives a speech that is not four short parts: reads a speech of a different length and different part kinds from another speaker's, and a President's speech of five or more clicks from the same engine, each part on the screen the words said.

**Waits on.** words-player-speech-through-planner merged.

**Files.** src/director/speech-builder.ts, src/director/speech-outline.ts, src/director/data/speech-outlines.json, src/bench/campaign.ts
