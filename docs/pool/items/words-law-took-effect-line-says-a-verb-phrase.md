---
id: words-law-took-effect-line-says-a-verb-phrase
title: 'A resident''s line says a law''s policy name as if it were a noun: "Allow retail electric choice took effect"'
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
source: "Builder T53, Nov 14, 2026, played a sitting member's month at Nashville, Illinois (1751700), world seed 22a232c8ce8c09977327c98c7cdad11aabae1b8cdaa8b3974bf0a306dc975c96, with the fix for the law-reached-street scene skipped on #9045"
model: opus
effort: medium
root: rc10-screens-keep-own-facts
---

**What.** The law-reached-street scene now plays, and its statement reads "Allow retail electric choice took effect, and I'm the one living with it." The `{law}` slot is the bill catalog's policy name, which is an action ("allow retail electric choice", "raise minimum wage"), so every line that says `{law} took effect` reads as broken English for those names. A player meets it in the first line of the scene. Seen: the first line of the scene when a resident meets a sitting member after a law reaches them, on 2025-02-03 in Nashville, Illinois.

**Cause.** Found in code: `src/director/purpose-scene.ts` sets `facts.law` from `lawName(series)`, which returns `questionName(series) ?? storyTopicName(topic)`, and `questionName` returns the catalog row's `policy` text, written as a verb phrase (`src/english/policy-names.ts` line 55). The line `scene-talk.state-tell.law-took-effect-and-i-m-the-one-living-with-it` assumes a noun phrase ("the paid family leave law").

**Fix.** Give the slot a noun form for a verb-phrase policy name ("the retail electric choice law", "the minimum wage increase"), kept beside the catalog row (a `noun` field) so one place says it, and have `lawName` return it for lines that need a noun; or word the line so it takes either form ("They {law}, and I'm the one living with it"). Check every `{law}` and `{about}` line in `data/english/parts/scene-talk.json` and the journal's law lines against the new form.

**Time box.** 2 hours, one Opus session at medium effort. When it runs out, push what is found, set the state honestly with a one-line note, and stop.

**Rules.** Words from banks through one picker; no hand-written player text; one rule, all 56 places.

**Done when.** A second session, not the builder, plays a sitting member's month at Nashville, Illinois (seed above) in the running game and sees the law-reached-street statement as a sentence a person would say, then does the same in two other drawn places, each named with its seed.

**Waits on.** Nothing.

**Files.** src/director/purpose-scene.ts, src/english/policy-names.ts, data/english/parts/scene-talk.json
