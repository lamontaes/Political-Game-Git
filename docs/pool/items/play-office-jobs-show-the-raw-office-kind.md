---
id: play-office-jobs-show-the-raw-office-kind
title: 'An officeholder''s job shows its record kind: the President''s card says "president, US" and the cabinet desk lists "Eric Thornton · us-house"'
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
after:
blocked-on:
lead: play-first
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
checked: fable
source: Playtester P2, Nov 13 (Chalan Laulau, Northern Mariana Islands, seed fe27aa8b-db0e-4fc8-aff9-fc871d441c15)
---

**What.** On main 596d5127, an Advanced start in Chalan Laulau, Northern Mariana Islands (seed fe27aa8b-db0e-4fc8-aff9-fc871d441c15) as President Steven McCoy. Three things a player reads on the first two days:

- **The You card.** Under the name it reads "president, US". Jobs and study reads "PRESIDENT / US / PAY $1,095.89 per day / HOURS 0 per day".
- **The cabinet desk on January 22.** Every post's list names each choice as "Andrea Owen · us-senate" and "Juan Sweet · us-house".
- **Picture.** Taken at 1440x900 on the walk (the You card's Jobs and study tab and the desk's first four posts); a session on the bench sees the same on day 3 of that seed.

The dropped item `play-talk-who-legislator-raw-office-kind` saw the same raw kind in the talk box ("legislature-lower at Florida treasury"). Its twin `screens-talk-who-in-a-sentence` fixed only the talk box. Seen: the You card (Who you are and Jobs and study) of any officeholder whose seat is their job, and the President's cabinet desk.

**Cause.** Found in code:

- **The job record.** `seat` in `src/core2/modules/official-pay.ts` (line 266) starts every officeholder's salaried post with `title: row.officeKind`, the office's record kind, and a payer organization ("US", a state treasury).
- **The one reader.** `personWorkOf` (`src/core2/person-work.ts`) already tells a seat's own job as its office, by the office's `title`. The card uses it for other people (`src/bench/card.ts` line 1590) and so does Travel (`src/bench/places.ts`).
- **Two views read the raw job instead:**
  - The player's own card (`src/bench/card.ts` line 150, `title: job.title`, `employer: employer?.name`).
  - The nominations view (`src/bench/office.ts` line 733, `job: job.title`).
- **The hours.** An office post's `hoursDaily: 0` shows as "0 per day".

**Fix.** Both views read `personWorkOf` for a seat's job, the way card.ts line 1590 does: the office's title, then its government's proper name. The hours row is left out for a seat's own job, whose hours the record does not keep. The record's `title` is set from the office row's title where the offices table has one, so no other reader meets the kind. Nothing else changes.

**Time box.** 2 hours

**Rules.** No hand-written player text: the words are the office record's own title and the government's proper name, through the one reader. A view that computes or stores its own version of a fact is a duplicate (owner, Oct 28). One rule, all 56 places: every office's post reads the same way.

**Done when.** A new test in src/bench builds a drawn world and checks two views for every seated official on the cabinet list and for the player as a council member and as President: neither view's job carries an office kind (a value of `officeKind`). A second session then sees, on the bench on main, a drawn Advanced start as President with the card and the cabinet desk in words (screenshot with the place and seed).

**Waits on.** Nothing.

**Files.** src/bench/card.ts, src/bench/office.ts, src/core2/modules/official-pay.ts, src/core2/person-work.ts

**Notes.** Labels (the Hours row) need Fable A's review (Review: words).
