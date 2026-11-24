---
id: lives-husk-relative-illness-never-reaches-the-house
title: "A relative's serious illness reaches the house only if the relative is already a full person"
area: core
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
model: opus
effort: medium
root: rc3-thin-life-record
source: Account lead thread, relative-news carry #9124, Nov 14, 2026
checked: s3 2026-11-14
---

**What.** In a played year the player's house never hears that a relative who lives elsewhere has fallen seriously ill, so the illness talk (`illness-news`) has nothing to say; only a relative who is already a full person can reach it. Seen: the Journal and the talk at home in a played life when a relative elsewhere falls ill.

**Cause.** Measured: `node --import tsx scripts/words/relative-news-rate.ts --seed fam-b --draws 3 --days 730` shows it; in three drawn places (San Isidro TX fam-b:0 92ca3f7f, North Vacherie LA fam-b:1 4dad0344, Spearman TX fam-b:2 8d798c07; two years each from Jan 22, 2025; `scripts/words/relative-news-rate.ts`), 19 relatives of the house's adults lived outside it and the world's logs held 156, 164 and 146 `life.death` events, 0 `health.serious-illness` events and 1 `justice.imprisoned` event (not a relative's). `hearBookedDay` in `src/core2/modules/health.ts` begins a husk's illness unseen ("the onset is private") and builds the husk only on the day they die, so no onset event exists for the household to hear.

**Fix.** Design: when a husk who is kin to a full person falls ill, emit the onset the household hears (a circle-visibility event naming the kin), or build the husk at onset when a full person's family record names them. The ruling on which is the lives lead's; either must run through the existing health module and cost nothing in a year's speed bar.

**Time box.** 3 hours, Opus medium.

**Rules.** Lives skill: a husk stays minimal until met; no dice; speed bar.

**Done when.** In three drawn places, San Isidro TX, North Vacherie LA and Spearman TX (seed fam-b, draws 0 to 2, two years), an onset among the house's kin outside it reaches the house as an event the `illness-news` talk tells from, by record id; `npm run speed:year` holds within 20%. A second session, on main, plays a life where a relative elsewhere falls ill and hears the house tell it in the running game.

**Waits on.** Nothing.

**Files.** src/core2/modules/health.ts, src/director/conversation.ts, scripts/words/relative-news-rate.ts

**Notes.** Filed on the #9124 branch (claude/words-carry-8959-family-news). Counts in /mnt/project-files/words-lead/8959/rate.md.
