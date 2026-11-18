---
id: story-ask-support-second-round-moves-on
title: "The second round of a door ask or an ask after a speech moves the talk on"
area: words
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/story-ask-support-second-round
pr: 10142
after:
blocked-on:
lead: story
model: sonnet
effort: medium
root: none
source: Story lead's fresh-reader pass on the cut (#10063), Nov 18: the ask-support paths judged a rehash under the rule later-replies-move-the-talk-on
checked:
---

**What.** When the player asks a voter for support at the door, or someone asks after a speech, the second-round replies said the first-round stance again ("I'm with you on {cause}" after a yes). Seen: the door ask's and the speech ask's second round, after a press.

**Cause.** Measured: a fresh reader judged the ask-support paths a rehash (`npm run words:pairs -- --rule later-replies-move-the-talk-on` on the cut, #10063, then the review with planted rows). The second round reused the first-round agree and decline rows, and the decline-after-press rows restated the first answer.

**Fix.** Write second-round agree and decline rows after a press or an answer that give a reason or a condition (you listened; see who else runs; bring something I can hold you to), keeping each use's facts.

**Time box.** 2 hours.

**Rules.** The player says only what they chose: a reply never promises an act the engine does not record. Every line of four words or more carries an insert.

**Done when.** A second session, as a candidate in a drawn place, knocks on a door, is pressed and sees second-round replies that move on; a fresh reader finds no rehash beyond the planted row; the scene-talk test passes.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json

**Notes.** Nov 18 (Story): 19 rows added, 3 deleted; 16 paths and 38 pairs judged by fresh readers, every plant caught; one decline that padded the town reworded by the lead.
