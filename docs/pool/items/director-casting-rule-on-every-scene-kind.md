---
id: director-casting-rule-on-every-scene-kind
title: "A scene goes only to someone who could be in it: no floor scene for a 17-year-old, no parent who lives with you 'stopping in' (Blodgett Landing, New Hampshire; Ninnekah, Oklahoma)"
area: director
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/pool-director-casting-rule-on-every-scene-kind
pr: #8451
after:
blocked-on:
model: opus
effort: high
root: rc6-scenes-repeat
lead: director
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 4, root cause 6)
checked: fable 2026-11-10
claimed-at: 2026-11-11T02:03:05.471Z
branch: claude/pool-director-casting-rule-on-every-scene-kind
---

**What.** A scene goes to whoever its cause record names or whoever heard of it, and nothing asks whether that person could be in that scene. In the audit's browser play (Blodgett Landing, New Hampshire, a 17-year-old, ten weeks, no seed kept) a legislator "comes down the aisle to find you", the mother who lives with the player "stops in at the house", and an aunt "has come to say goodbye" at a door the player knocks on. On Nov 10's main (8ac2262853) with the scene tool: in Ninnekah, Oklahoma (seed 3dac8ffb3f3c) the 17-year-old's father, who lives in his household, is met "on the street" and the narration says he "called your office"; in Tesuque, New Mexico (seed 8a5d1fba28fc) and Odessa, Washington (seed fd7e212758b7) the mother in the player's own household "is at your door" and "comes to the house". Seen: scenes stop casting someone who could not be there, such as a floor scene for a 17-year-old or a parent who lives with you "stopping in".

**Cause.** Found in code: `recordAddressResponse` (`src/director/address-response.ts` line 52) names the player's household as witnesses of the governor's answer; `playerHolds` (`src/director/circumstance.ts` line 313) passes "heard-it" on the witness list alone; `circumstancePicks` (line 617) never reads the row's place or the player's age; `composeScene` (`src/director/scene.ts` line 75) words the arrival from the setting and a name only. Of 44 circumstance rows, 14 take "anyone". Measured: seeds 3dac8ffb3f3c, 8a5d1fba28fc, fd7e212758b7.

**Fix.** Every situation type and circumstance row declares who may receive it (age band by record, office held or sought, tie to the cause, where the player is, where the other person lives) as data. The director refuses a cast that breaks the rule, and a refused cause goes to the journal or to the next person with a reason. The arrival and opening lines read the same facts, so nobody who lives with the player "comes to the house".

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the receive rule is data on each situation type and circumstance row, read the same way in every place, and any age it uses comes from a record the place keeps (the voting-age row, the office's own age rule, school enrollment), never a typed number or a named town. No dice: a refused cast falls to the next person the records give a reason, or to a journal line, never to a roll. No hand-written player text: the arrival and opening lines stay bank pieces, held back by facts (`excludesFacts`, per the words-engine skill), not rewritten in code. Scene standard rule 2: every role is cast from the world, and a role that can't be filled means the scene does not fire. Owner, Nov 8, 2026: "There's lots of irrelevant scenes popping up."

**Done when.** A second session starts the bench (`npm run bench`, play at /play), begins a new game with the Place field empty so it is a drawn place, writes down the place and seed, and plays a 17-year-old for one year with dev mode's Run, opening every scene that stops play and taking a screenshot of each first line. It runs the crew's scene tool on the same seed (`node --max-old-space-size=6144 --import tsx scripts/dialogue-batch/scene-year.ts --seed <seed> --out <file>`), which logs every scene with its kind, cast, setting and cause record id. From the played scenes and that log it fills one list by kind: the kind, who received it (age, office held or sought, household), who came and where they live, and the rule row that allowed the cast. The list has zero casts outside the rule. It then does the same on the audit's seeds 3dac8ffb3f3c, 8a5d1fba28fc and fd7e212758b7 and must see: no person in the player's household "comes to the house", "is at your door" or "stops in"; no line says "your office" to someone who holds none; no scene set at a seat reaches a person with no seat. A second played year as a seated state legislator (Advanced, Play as) still gets the governor's-answer scene in the chamber. Scenes from circumstance may not show in the scene tool (see Notes), so those kinds are judged from the browser play. A director test fails when a situation type or a circumstance row has no receive rule. The owner plays it: as a 17-year-old he is never walked up to in a chamber, and his mother at home is simply there, not arriving.

**Waits on.** Nothing.

**Files.** src/director/circumstance.ts, src/director/data/circumstances.json, src/director/data/situation-types.json, src/director/scheduling.ts, src/director/scene.ts, src/director/address-response.ts, data/english/parts/scene-words.json, data/english/parts/scene-talk.json

**Notes.** From the Fable audit, Pillar 4 ("What a player sees" and "The gap and its root cause") and root cause 6. The audit's play: Blodgett Landing, New Hampshire, a random world in the browser, a 17-year-old girl the game named Ray Kent, ten weeks of Day and Week, seven scenes; no seed was kept.

Nov 10 re-run on main (commit 8ac2262853) with scripts/dialogue-batch/scene-year.ts, one year each. Ninnekah, Oklahoma, seed 3dac8ffb3f3c (place key 4052100): household at the start is Jonathan Ellis 57, Janice Ellis 56, Devin 15, Robert 17 (the player), Aidan 17, Alexandra 34, Michelle 29; on 2026-11-30 the kind cause-invite, cause record cause.shared:2026-11-30:person_4178fca1eea2b98f:person_4178fda1eea2bb42:cause:us-policy-positions:justice-public-safety.stand-your-ground, narrates "you run into Jonathan Ellis on the street" and then "Jonathan Ellis called your office about firearms and weapons rules all week. Today there's a knock at your door." Tesuque, New Mexico, seed 8a5d1fba28fc (place key 3577040): household Erica Reyes 45, David Reyes 47, Christian 17; "Erica Reyes is at your door" (2026-11-21), "Erica Reyes comes to the house" (2027-08-01), "David Reyes comes to the house" (2027-09-13). Odessa, Washington, seed fd7e212758b7 (place key 5350745): "Hannah Robertson comes to the house" (2026-12-02), her own home.

Not verified: I did not replay the Blodgett Landing scenes, and I did not trace in a run why a 17-year-old got the hallway scene; the code path above is read only. The scene tool advances the world with `advanceCore`, and the words-engine skill says scenes from circumstance are cast only for the played person and a run advanced that way sees none; no circumstance kind fired in my three tool years, so the hallway and street kinds need the browser.

Related: play-bench-reads-voting-age-row (open; the one voting-age row), director-scenes-from-circumstance and director-circumstance-counted-cast-filled-in (open; the producer this rule sits in), director-cap-on-scene-repeats and director-no-scene-without-a-purpose (filed with this one).

Claimed by next for opus-5251 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 02:03 UTC) on branch claude/pool-director-casting-rule-on-every-scene-kind.
