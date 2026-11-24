# How to write a bank spec (read fully before writing)

Game: "Our Civic Duty", a whole-life political RPG. Owner: Lamontae. Code (read-only): `/private/tmp/claude-501/-Users-lamontae-political-game-play/bfcf1e40-4e58-48da-95f6-4ac0d96685c0/scratchpad/main-wt` (detached at origin/main). DO NOT edit code. Write only spec files in `/Users/lamontae/political-game-play/cto-notes/specs/`.

Purpose: each spec is handed to a Codex team. Codex invents new systems and guesses when a brief is vague. Your spec must make that impossible: name the EXISTING code it plugs into (file:line, found by actually reading the code), what it must NOT build, and exactly what "done" looks like in a played game.

## Project rules every spec must obey (owner's standing rules)

- Emergent, not authored: build systems that can produce outcomes; never script specific events or fixed scenario lists. The simulation decides; history only calibrates.
- Zero dice: no random rolls decide outcomes. Choices come from people's records, traits, relationships and conditions. Seeded variety for presentation only.
- One system per job: extend the existing engine for that domain; never a parallel copy. One rule for all 50 states, D.C. and the territories; no single-place special cases (Lexington etc.).
- Nothing blank or "unknown": unread values are estimated from similar places in the game and marked estimated. No official source required.
- Real data calibrates the start only; the world then drifts.
- Things happen only when they matter (paydays, session days, meeting dates, events reaching people), never a daily tick over everyone. Saves store state and meaningful events, not daily logs.
- Depth is optional for the player; background simulation handles what the player doesn't play.
- Everything modular and changeable by law where a government could change it.
- Player-facing words: plain American English, no developer jargon, no citations in play. Scenes are composed by Session 4's scene system (situation reader → participants → English engine lines → choices → write-back); specs never add authored dialogue banks.
- Personality is the lens (how people react), life decides the side (which view they hold). 97-trait system; traits are one reason among many.
- No fixed percentages deciding behavior ("30% of people will…"); behavior comes from each person.

## Owner decisions from Oct 5 night (bind these)

Council journey is the golden path: 18-year-old → meets people → files at the clerk's office (a conversation that teaches the campaign) → campaigns by meeting people → election night → council → proposes an ordinance written on the bill paper → negotiates → vote as a played moment → town visibly changes → people bring it up → next election runs on the record. 1.0 = every office up to President; legislative and executive tracks built side by side.

- Signatures: a few played scenes, the rest background, where the place requires them.
- Campaign money scales like real life with the place; raised from people you know. You usually start alone; recruit friends, family, volunteers; hire a manager only if you can afford it.
- Election night: a scene with your people, results precinct by precinct.
- Losing: what carries forward depends on what the politician built (a movement carries a lot; most carry little).
- Meetings: only items that matter to you or the town play; rest summarized; player can choose to sit through more.
- Negotiation: everything tradeable: amend the bill, support their item, favors, endorsements, threats, public pressure.
- Constituents: often; player decides how their office handles them (self, delegate…); most simulated in background from the office's usual approach.
- Opinion: word of mouth and local paper at council; real polls higher up.
- Mayor: budget fights, appointments, vetoes, emergencies are scenes; budget numbers are a screen. Appointments: player picks depth (every appointee or just the top few).
- Legislature: committee seats, chairs and leadership races earned via relationships and seniority. Minority tools: delay, filibuster where rules allow, amendments, messaging votes, deals with moderates. Player chooses where to spend each week (capital or home); location changes who you meet.
- Scenes scale with responsibility; quiet days normal early.
- Corruption: anything real (bribes, kickbacks, steering contracts, cronies); caught ONLY via investigations, leaks, records, or people who turn on you. No detection roll.
- Lies: recorded; found out by anyone with contradicting facts; damage by who and their personality.
- Childhood light: 3–6 short sim-picked scenes ages 5–17, then 18.
- Local reporter knows you, calls for quotes, digs into your record, remembers how you treated them.
- Debates are played scenes, small races too. Speeches: you pick themes, promises and audience; English engine writes it in your voice; moment and crowd decide how it lands. Ads: positive or attack, target, message, pay for placement; can backfire.
- Endorsements are NOT transactional by default: people can just like you, or an outside power carries you (Chester Arthur and the Conkling machine). Anyone wanting something wants it for their own reasons.
- Party path: working up inside the party (precinct, county chair, state party) is its own path with real influence over who gets backed.
- Scandals: deny, apologize, attack the source, go quiet, resign; lands by what's provable, who's reporting, relationships.
- Lobbyists come as people (meetings, dinners, donations), want specific votes, remember.
- Citizen actions: vote, speak at meetings, petitions and ballot measures, protests and groups, volunteer, write officials.
- Appointed paths: someone who knows and trusts you can appoint you.
- Judge play: cases as scenes, rule within law and philosophy, appealed, reported, remembered.
- Family: meet a partner through the world; a few moments with your kids that shape them; rest background.
- Pace: council ~15–30 min per in-game year; governor or Congress ~1–2 h; President as long as you want.
- Economy visibility scales with office. Other places' politics reaches you through the news (national big stories, your state in more detail). Death look-back: story first (journal voice), then the record. Crowds: real people up front, a crowd sized by real turnout behind.
- Earlier approvals (Sept 28): poison pills, riders, attack ads, investigations (D-5); pardons and redistricting (D-6; Census neighborhood makeup used the way courts do, never shown on a person); career to elder statesman (D-4); favors from personality, never a % (D-2).

Also read: `/Users/lamontae/political-game-play/cto-notes/decision-register-2026-10-05.md` (search it for your topic) and on main `docs/GAME-CONSTITUTION.md` if present.

## Spec file format (one file per item: `specs/<id>-<slug>.md`)

```
# <Title>  (bank id <id>, phase <phase>)
## What the player experiences   (plain English, 4–8 sentences, no jargon; this is what the owner reads)
## Owner decisions this rests on   (bullets quoting the decisions above)
## Existing code it must use   (file:line + one line each on what it does today; you MUST have read these)
## What to change   (numbered parts, each one PR-sized, naming files/functions to extend)
## Must NOT build   (explicit list: parallel systems, dice, authored dialogue banks, place special cases, daily ticks…)
## Done when (proof in a played game)   (concrete: new game in a random place, what you see, what record changes; tests named)
## Depends on   (other teams' pieces, by session number if known)
## Open questions for the owner   (ONLY genuine choices not answered above; plain words, 2–4 options each; or "None")
```

Keep each spec under ~900 words. Be specific; if the code lacks something, say so plainly and say which existing module grows to hold it.
