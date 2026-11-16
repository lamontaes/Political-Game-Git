---
id: words-state-workers-never-say-who-they-work-for-in-any-reachable-talk
title: "A state, District or territory worker says who they work for in a talk the player can reach"
area: words
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Account lead thread, Nov 16, 2026: the route replay for #9521 (11 places, 40 to 120 days, 17 places in all) never produced "the state", "the District" or "the territory"
checked:
---

**What.** The employer-name table says a state worker works for "the state", "the District" or "the territory", but in no played route did any person say it. The Travel place "State Offices" is staffed by people who are not treasury employers, and a town's own people who work for a government treasury only said village, county, town, parish, borough, township and city. Seen: a state, District or territory worker says who they work for in a talk the player reaches.

**Cause.** Measured: the 11-place route replay (`npx tsx scripts/dev-tests/p25-route.ts <place> <seed> 40`, places and seeds in the played file), at the 11 places of #9521 (seeds named in `/mnt/project-files/words-lead/padding/employer-wording-played.md`) the world holds 20 to 283 filled-in people per place whose employer is a government treasury (161, 88, 166, 20, 173, 282, 283, 229, 151, 108 and 37 by place; local and state treasuries together, the split by level was not counted). A talk can name an employer only when the person is asked, and the asking happens at home, not at the places Travel lists, so a player reaches state workers' employer only by meeting them at home. Not yet traced which Travel place or home talk would name a state employer; the first step is that trace.

**Fix.** Trace which route a player takes to meet a state, District or territory worker (their home, a Travel place, a state official's office) and which talk there asks where they work. Where none exists, add the talk through the existing "where do you work" ask rather than a new one, and show the wording said in a played file. Do not delete the table rows (lead's ruling, Nov 16): a row with a worse fallback ("the government of Nevada") is not a line.

**Time box.** 2 hours, Sonnet, medium.

**Rules.** Follow the standing rules "One rule, all 56 places" and "Replace, never layer".

**Done when.** A second session sees, in the running game, at a named place and seed for each of a state, the District (DC) and a territory (Guam or American Samoa), a played file from a route the player's own presses reach shows a state, District or territory worker saying who they work for, once, in the talk's own word; or the file says no route reaches one and why.

**Waits on.** Nothing. #9521 holds the wording table.

**Files.** `data/english/said-as.json` (governmentInTalk), `src/director/employer-in-talk.ts`, `src/director/conversation.ts`.

**Notes.** Also open, from the same replay: the world builds both a "District of Columbia" treasury and a "City of Washington Dc" municipal government; real DC has one government, so "the city" for DC is a data question for the world's government list.
