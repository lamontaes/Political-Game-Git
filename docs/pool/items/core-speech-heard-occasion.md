---
id: core-speech-heard-occasion
title: "A heard speech says what it was given at (campaign, meeting remark, hearing)"
area: core
kind: feature
priority: 3
size: S
status: merged
standard: 2
claimed-by: claude/pool-core-speech-heard-occasion
pr: #8497
after:
blocked-on:
model: sonnet
effort: medium
root: design-life-record
lead: words
source: added with npm run pool -- add
claimed-at: 2026-11-11T02:24:38.141Z
checked: fable 2026-11-10
merged-at: 2026-11-12T19:56:39.179Z
---

**What.** The item's title is the whole request: a heard speech says what it was given at (campaign, meeting remark, hearing). Every section of the original draft said TODO, so nobody has said who reads the occasion, which record carries it, or what changes for the player when it is there. src/core2/modules/speech.ts and src/core2/modules/news.ts carry no occasion field today, and docs/design/life-record.md does not mention speeches heard. This item stays unbuilt until the cause is found: someone must name the reader of a speech's occasion (a journal line, a card, a scene, a stance) first.

**Cause.** Found in code: `SpeechInput` in src/core2/modules/speech.ts (line 42) carries the speaker, the place, the topic, the wished change and the audience, and nothing that says where or at what the speech was given, so `deliverSpeech` (line 141) writes `speech.heard` with no occasion. Each of its eight callers knows the occasion and does not pass it: a campaign event (src/core2/modules/campaigns.ts line 4302), the legislature's floor (src/core2/modules/legislature.ts lines 4350 and 5067), a public meeting (src/core2/modules/meetings.ts line 457), a party event (src/core2/modules/parties.ts line 850), a printed or broadcast statement (src/core2/modules/press.ts line 4036), and an official's day (src/core2/office-day-acts.ts line 699 and src/core2/office-day-state.ts line 1070). The reader that needs it is words-speech-occasion-read: a listener's journal line or scene saying it was a rally, a hearing or a council meeting speech.

**Fix.** Add an occasion to `SpeechInput`: the record id of the event the speech was given at (the campaign event row, the meeting, the sitting, the story) and its kind, read from that record, never typed in. Have each of the eight callers pass the record it already holds, and write both as facts of `speech.heard`. A speech with no event behind it carries none. Add no new table: the occasion is a fact on the record `deliverSpeech` already writes.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: an occasion nobody reads is an unregistered placeholder. No hand-written player text: any line that names the occasion comes from the English engine's banks. Look before you ask: search OWNER-DECISIONS.md, DECISION-REGISTER.md, prior-rulings and LAW.md before filing a question.

**Done when.** A second session, not the builder, plays a year in a drawn place of the played world (buildBenchWorld, place and seed named), opens three `speech.heard` records given at three kinds of occasion in dev mode's Trace and sees each carry the occasion's record id and kind, and each id opens the event it names. A test in src/core2 gives a speech through two callers and reads the two occasions. words-speech-occasion-read can then be built.

**Waits on.** Nothing.

**Files.** src/core2/modules/speech.ts, src/core2/modules/news.ts, docs/design/life-record.md

**Notes.** TODO Released from idle draft #5217 by the CTO, Oct 26.

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/political-game-pool-udtiwn` (2026-10-20). Cleared from the front matter and kept here.
