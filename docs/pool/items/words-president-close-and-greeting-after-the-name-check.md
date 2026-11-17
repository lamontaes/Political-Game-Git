---
id: words-president-close-and-greeting-after-the-name-check
title: "The President's address still ends on a bare thanks and greets with stray lines once the Vice President name-checks are gone"
area: words
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Story lead's read of #9840, Nov 17 (the addresses' follow-ups)
---

**What.** #9840 deleted the governor's and local head's bare sign-off closes and every greeting that names the Vice President with nothing after it. The President's bare closes ("Thank you, {vice-president-addressed}, and God bless America.") remain, and some greetings left read oddly.
Seen: Big Lake, Alaska (0207070), seed press-1117:0, "It's a good sign that Speaker Harold Griffith came out for this, and I mean to make the most of it." at claude/story-addresses-unit4.

**Cause.** Found in code: data/english/parts/opening-speech.json, the `close` pieces for inaugural and state-of-the-union that require only `vice-president-addressed` or `speaker-addressed`, and the `salutation` cores that remain after the deletion, read by src/director/opening-story.ts `composeBlocks`.

**Fix.** Delete the President's bare sign-off closes and give the address a close from its points where it asks for no new law (a `last-point` pair as the local addresses have); the Story lead rereads the remaining greeting cores (including the twelve by kind drafted in #9840) and deletes the ones that claim something no record holds.

**Time box.** 3 hours, one Opus session at medium effort.

**Rules.** No hand-written player text: every new close is a bank piece the Story lead signs before the PR leaves draft.

**Done when.** A second session starts three new games at a drawn place each, writes down the place and seed, and sees the President's address close on what is in front of Congress from its points, and greet with no line that claims something the record does not hold.

**Waits on.** Nothing.

**Files.** data/english/parts/opening-speech.json, src/director/speech-outline.ts

**Notes.** Filed from the addresses thread (#9840). The composed check address-topics-turned also reads a creed paragraph followed by the first point as a turn missed (Trenton, North Dakota (3879460), seed press-1117:2); the check may need to skip a paragraph that makes no point.
