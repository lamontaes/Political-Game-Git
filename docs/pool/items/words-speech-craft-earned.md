---
id: words-speech-craft-earned
title: "Crafted devices in a speech (a list of three, a contrast, a callback) are earned by the speaker's recorded speaking experience"
area: words
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Today any speaker in a public-address register may use a crafted device (contrast, three-part list, quotation, callback; `SPEECH_DEVICES` in `src/english/speech-registers.ts`) because the register admits it, whatever their record shows. Make a device earned: a speaker is given only the devices their recorded speaking experience supports, so a first-time council commenter speaks plainly and a veteran floor speaker may build a contrast or a callback. The only caller that passes a register today is `src/english/english-newscast.ts` (press-briefing), so the first build adds a `speakerSpeakingRecordIds` field to `CompositionContext` in `src/english/english-composition.ts` (records of addresses the speaker has given, from saved records, never memory), gates `conditionProblems` on it per device, and adds the producer that reads the speaker's recorded addresses and passes them in.

**Rules.** An effect is a read: the experience records are read at the moment a line is composed, and the line's sourceRecordIds include them. No dice: what a speaker has given decides which devices they may use, never a fixed share (the corpus shares in the register cards stay checks on totals). Sliding scales and causes: more recorded addresses admit more devices, in an order the register cards give, with no single cutoff. No hand-written player text: the device parts stay in the authored banks. OWNER DECISION: what counts as an address (floor speech, briefing, town hall, rally) and how many earn each device is the owner's call; build the simplest version and register an owner-decision stopgap.

**Done when.** In a played world (`buildBenchWorld`) in a place drawn from all 56 (name and seed in the PR body), a press secretary with no recorded briefings gives a briefing with no crafted device, and the same speaker after a recorded run of briefings gives lines that use at least one device, shown by the speaker's address record ids in `sourceRecordIds` and a test in `src/english` beside the newscast tests; existing English tests pass.

**Files.** src/english/english-composition.ts, src/english/english-newscast.ts, src/english/speech-registers.ts

**Notes.** Spec written Oct 20 by claude/speech-craft-spec from the title; it was a TODO shell. Words-line work (AGENTS.md assigns it to an Opus session).

**What a build attempt found (Oct 20, claude/speech-craft).** `line()` in `src/english/english-newscast.ts` composes the only register-bearing lines, for an anchor or reporter named only as packet slots (`anchor`, `reporter`), with no speaker person id; no record of addresses given exists anywhere in `src`. So the first build needs two new things the item does not yet name: a speaker id on the composition context (the press secretary, a member on the floor) and a record written each time that person gives an address (the floor speech, briefing and town hall producers in the director). Build the record first, then the gate.
