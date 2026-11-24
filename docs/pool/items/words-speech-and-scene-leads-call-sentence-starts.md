---
id: words-speech-and-scene-leads-call-sentence-starts
title: "Speech stages and scene leads capitalize a slot that opens a sentence"
area: words
kind: bug
priority: 3
size: S
status: open
standard: 2
after:
blocked-on:
lead: words
model: sonnet
effort: low
root: none
source: Account lead, Nov 15 (withdrawal of #9358)
---

**What.** Two surfaces fill a slot that opens a sentence without the capital the talk surfaces give it. The speech line "Not everything tonight is a complaint. {issue} in {place} is getting better" gets a lowercased topic. The scene leads such as "Your legs give out and the cup slips. {other} catches you." get a relation phrase ("your daughter") when the one in the room is kin. Not yet seen in play: five lives of 90 days and a staged rescue (North Ridgeville OH, seed r1; River Point OR, seed r2) did not play either line. Seen: in a campaign or local speech that says a part of town is getting better, and in a scene's opening narration when kin is in the room.

**Cause.** Found in code: scene talk and talk call `sentenceStarts` (src/english/said-as.ts) on the composed line (src/english/scene-talk-words.ts, src/director/conversation.ts); src/english/speech-stage-words.ts and src/english/scene-words.ts capitalize only the line's first letter. speech-builder.ts lowercases the area name for `{issue}`; scene.ts `who()` gives a relation phrase for kin.

**Fix.** Call `sentenceStarts` on the rendered text in speech-stage-words.ts and scene-words.ts, the same one function, in place of each one's first-letter capital. No second capitalizer.

**Time box.** 1 hour for one session.

**Rules.** Replace, never layer: the one `sentenceStarts`, no copy.

**Done when.** A second session, on main, plays a drawn place until one of the two lines is said with a lowercase fill (or stages its cause through the scene's own engine), names the place and seed, and reads the capital.

**Waits on.** Nothing.

**Files.** src/english/speech-stage-words.ts, src/english/scene-words.ts
