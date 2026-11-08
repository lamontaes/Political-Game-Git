---
id: people-what-people-say-about-a-person
title: "What people say about a person: tagged quotes, kept as records and read by the You and person screens"
area: people
kind: feature
priority: 2
size: L
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The approved You and person-card screens (owner, Nov 7, items 52 to 54) show 'What people say about me/her': short quotes from people who know the person, each under a gold tag that names what it says about them ("Can't let a loss go"). The game keeps no record of what a person says about another, so the Fixer's screens (#7357, #7358) leave the section out. Build the record: a quote a speaker's traits, tie and what they saw produce about a subject, with its tag drawn from the subject's recorded temperament or record, kept for the player and the people they deal with only (two-level population), through the director and English engine banks.

**Rules.** One engine per mechanic: the director and English engine produce the line, never a screen. No hand-written player text; no dice: the speaker's traits, tie and the subject's records decide the quote. Tags change with time and with how much each speaker matters (owner, Nov 7, item 53). A quote needs a speaker the viewer knows; an issue tag only when the subject is known for it at that scale. Chain: the record, the quote, the tag, both screens, by record id.

**Done when.** A played-world year (buildBenchWorld, a drawn place and seed) shows quotes about the player on You and about a known person on their card, each with its tag, each from a named speaker's record; the section stays out where nobody has a quote; the screens read the one record.

**Files.** src/director, src/english, data/english, src/bench/card.ts, src/bench/play.mjs

**Notes.** TODO
