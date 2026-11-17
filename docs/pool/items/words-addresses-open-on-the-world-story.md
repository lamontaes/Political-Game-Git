---
id: words-addresses-open-on-the-world-story
title: "The President's address opens on the world's story (the economy's run, a disaster, a scandal) in its own order, and argues its points instead of announcing them"
area: words
kind: feature
priority: 1
size: L
status: in-pr
standard: 2
claimed-by: Story builder (claude/story-addresses)
pr: 9831
after:
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Owner, Nov 14, 15 and 16 on the opening address, through the Story lead (Story thread #9750, part 4)
---

**What.** Every address follows one skeleton, greeting, a past office, one point, "now I'll go do it", whatever the world went through. The owner wants a warning address where the economy has been bad, a proud one where it has been good, and points argued, not announced.
Seen: Fryeburg, Maine (2326875), seed base1:0, "I came to this job from serving as Governor" and "now I'll go do it" on main c5808caa0b.

**Cause.** Found in code: src/director/speech-outline.ts `planSpeech` reads the speaker's stands and the kind row's fixed `sections` from src/director/data/speech-outlines.json and nothing of what the world went through; the opening-speech bank's `story-open` and `story-turn` pieces were read by no code; pieces saying "plainly", "on the books", "now I'll go do it" and "I came to this job from serving as" were playable.

**Fix.** A story reader (src/director/address-story.ts `storyOf`) reads the macro months' run over four years, the year's disasters and a bribe reported in the speaker's body; each is a story row in src/director/data/opening-address.json with a gate, a weight and its own section order, said by its own story-open and story-turn pieces after the greeting. The owner's named faults become the enforced line rule address-argues-not-announces and the caught pieces are deleted.

**Time box.** 6 hours, one Opus session at medium effort.

**Rules.** No dice: the story is the highest weight times the record's amount, ties by name, never a roll. No hand-written player text: every sentence is a bank piece the Story lead signs before the PR leaves draft.

**Done when.** A second session starts three new games at a drawn place each (Place field empty), writes down the place and seed, and sees the President's address open on that world's story right after the greeting (a warning where prices outran pay, a proud one where pay outran prices), in a different order of sections between a warning and a proud address, with no "plainly", "on the books", "now I'll go do it" or "I came to this job from serving as" in any address, and dev mode shows each story sentence's record.

**Waits on.** Nothing.

**Files.** src/director/address-story.ts, src/director/speech-outline.ts, src/director/data/opening-address.json, src/director/data/speech-outlines.json, data/english/parts/opening-speech.json, data/english/line-rules.json, src/english/composed-checks.ts

**Notes.** Built on claude/story-addresses. The presidency keeps no past holders (offices.ts `pastTerms`: "The federal executive keeps its real record ... with no earlier terms invented"), so a string of same-party Presidents or the first of a party in a long while cannot be said from the record; that story waits on a past for the office. Corruption is recorded only among the played town's officials, so the scandal story is a local head's.
