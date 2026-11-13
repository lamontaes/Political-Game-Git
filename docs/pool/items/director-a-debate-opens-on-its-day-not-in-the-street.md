---
id: director-a-debate-opens-on-its-day-not-in-the-street
title: 'A debate opens on its day, never "out and about" in the street'
area: director
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by: opus-lr
pr: #9034
after:
blocked-on:
lead: words
model: opus
effort: medium
root: design-life-record
source: Fable A, rule 13, Nov 13, 2026, from Playtester P3's item 8 (North Hyde Park, Vermont); filed by the Life records builder opus-lr
checked: opus-lr 2026-11-13
merged-at: 2026-11-13T08:16:41.005Z
---

**What.** Fable A, Nov 13, rule 13: "a debate opens in the room it is held in, never from a street stop." Playtester P3, North Hyde Park, Vermont (seed a6b481a5-c6c9-432b-8cca-c0463c518da8), February 25: "First thing on February 25th, out and about, you stop to talk with Kevin Garcia." and the moderator's welcome to the North Hyde Park Register debate came after it. Seen: the opening narration of the debate the player sits for.

**Cause.** Found in code: a scene's first line is its arrival, chosen by the setting kind alone (`src/director/scene.ts`, `{ part: "arrival", kind }`). `debate-sitting`'s setting is `public` until the debate stage has a picture (its own note), so it drew the street's "out and about" arrival.

**Fix.** A situation type may say `arrivesBy: "day"` (`src/director/scheduling.ts`): its opening is the day alone, from the day-words, and its lead says who is there and why. `debate-sitting` says it, as Fable A ruled at 07:05Z ("1(b), saying only the day, is enough; no debate-room setting for now").

**Time box.** 2 hours, Opus.

**Rules.** No new lines: the day is the day-words' own, and the lead is the bank's.

**Done when.** `debate-sitting.test.ts`, in a drawn place where the player sits for a debate, checks the sitting opens on the day alone and that the next line names the debate. A second session, on main, sits for a debate and sees it open on its day with the moderator, never "out and about".

**Waits on.** Nothing.

**Files.** src/director/scene.ts, src/director/scheduling.ts, src/director/data/situation-types.json, src/director/debate-sitting.test.ts

**Notes.** Built by the Life records builder (opus-lr), Nov 13. P3's items 9 (the "nice speech" lines on a rival's ad) and 10 (the moderator as informant) are traced on #8928 at 06:59Z and 07:33Z and are not this item.
