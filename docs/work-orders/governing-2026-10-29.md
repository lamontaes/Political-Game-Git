# Lead order: governing, from winning a seat to running on your record (Oct 29, 2026)

Written by the CTO, Oct 29, 21:45 UTC, from the governing brief the owner read and answered tonight. The owner's go: "Yes. Well, yes, go ahead with both of those" (Oct 29, 21:40 UTC: start the governing lead on phase A, and assign the laws lead the world's governing). Rulings: `docs/coordination/OWNER-DECISIONS.md`, Oct 29 21:15 and 21:40 entries, and the four research notes beside this file.

## Who

- **Lead:** one Opus session, the governing lead (`docs/coordination/CREW.md`). It owns the player's path through governing end to end: the chain from a campaign that can win, through a first term, the executive desk and budget, to running on the record, then up the ladder to state legislator, governor, Congress and president. Skills: `lead-session`, `look-first`, `played-world-proof`, `wiring-audit` for the chain, `helper-checkout` for every helper.
- **Ultracode:** allowed by the owner for this job. Use it for two things: playing the path from New Game in many drawn places to find every break, and fixing breaks in parallel when they sit in separate engines. All of a session's agents share one machine, and played-world runs are heavy (three were killed for memory on Oct 29), so keep heavy runs to two or three at once and ask the CTO for extra sessions when you need more in parallel. Keep the review stage proportional: one or two reviewers for low-risk changes, three only for engine logic.
- **Builders build; checkers check (Oct 29):** you and your helpers run only the tests you write or change. Open each finished unit as its own PR, ready, and message the checker whose number is the PR number mod 5. Never run the full gate or typecheck in a helper.
- **Never:** merge your own PR, force-push, skip or loosen a test, use a scheduling tool, edit anything under `.git`.

## The goal

A new life, started from New Game in any of the 56 places, can win a seat, write a law, bargain for votes, pass it or lose it, see the town change because of it, hear people talk about it, and run again on that record, while the town, the county, the state and Washington keep governing around them through the same engines.

**Done means:** in five drawn places a played life reaches the next election on its own record; the golden-path checks for writing a bill (M3-01), negotiating (M3-02), laws changing the world (M3-04) and the executive (M3-05) have a test command in `docs/roadmap/features.json` and pass; and the owner plays it and says it works. The player runs for six offices only: city council, mayor, state legislator, governor, Congress and president (Oct 29).

## What is there today

Read the four notes in `docs/work-orders/governing-2026-10-29/` before anything: `01-rulings.md` (every ruling on governing, and what was never ruled), `02-engine.md` (how the engine governs, traced from code), `03-player.md` (what a player can click, from two played terms), `04-backlog.md` (every open pool item on the path, by step). In short:

- From New Game the player has never won a race. A door "yes" only raises recognition (`voting.ts` 929, 1041).
- From a bench Advanced start, drafting, the bill paper, deals per colleague, the vote-seeking scene, the meeting vote and the mayor's sign or veto all work, roughly.
- Missing for the player: swearing in, co-sponsors, starting a talk about your bill, a tally on the meeting panel, members drawn in the chamber, the budget, appointments, staff, any scene or story after your own law, and your record on the Campaigns screen.
- The engine is further along: one legislature engine and one law store for every level; budgets adopted by vote; vetoes and overrides; 87 of 89 laws reach named people. Favors are never collected (`obligationsOf` has no caller); attack ads never run (no caller passes `attackFilingId`).

## The phases, in order

Each phase ends with something the owner can play. One finished unit is one PR.

- **A. You can win.** A real campaign: a door "yes" is near-binding and the vote reads it (Oct 29); groups that back a candidate and send volunteers; raising money from named donors; hosting a forum; meeting the people you would represent; debates; an incumbent who comes home to campaign when a challenger gains. Pool `campaign-like-real-races` (now yours). Done when path-check from New Game wins a council seat in at least 7 of 10 drawn places, named with their seeds.
- **B. Your first term.** Swearing in (words' item `words-swearing-in-scene-and-speech`); Your office reads like the mocks (today's amount beside the new one, the body's name, money that reads like money); co-sponsors as promises, which can be vague and broken (Oct 29); asking a colleague about your bill whenever you choose; what colleagues told you plus your aide's estimate before a vote (Oct 29); the meeting with members drawn, the tally and the result (lane's `play-vote-and-bill-screens-redesign`); a journal that says what happened. Default stops in office: your bills, close votes, your desk and scenes, customizable, with a calendar of booked meetings, boards, lobbyists, expert dinners, speeches and appearances (Oct 29). Done when M3-01 and M3-02 pass in five drawn places.
- **C. The town changes and people notice.** A story on your bill and vote, a resident or constituent who brings your law up (words), what changed since your law on Your office, favors called in. Done when M3-04 passes and one of your laws reaches a named person who then brings it up to you.
- **D. The executive.** The desk at city hall, the budget as your stop (Oct 29: "Your character sends the budget without you"), appointments, an aide, overrides shown, emergencies declared from hazard records. Done when M3-05 passes and a mayor's year plays: sign, veto, appoint, adopt a budget.
- **E. Run on your record.** The Campaigns screen shows it; rivals' attack ads use it; budget, committee and override votes count on the record. Done when M4-06 is accepted in five drawn places.
- **F. Up the ladder.** State legislator, governor, Congress, president, on the same engines with new data rows and screens (Oct 29: "these all use the same engine. It shouldn't be that hard").

**First task, before phase A's building:** give M3-01, M3-02, M3-04 and M3-05 a real test command in `docs/roadmap/features.json` (they have none today), so done is checkable.

## Seams: who you talk to

- **Words** (`session_01J5HkKbts1QhKYPKVHcFASz`): every line and scene (swearing in, people bringing it up, speeches, debates, office-life scenes). Ask before building anything in `src/director`, `src/english` or `data/english`.
- **The lane** (`session_01S4WSHpJWHzmGsPvFQC9BCj`): every screen in `src/bench` (filing for six offices, the vote, meeting and bill screens). Ask before touching a file it is in.
- **The laws lead** (`session_01S4WSHq6yHHZL4YM5PwWATS`): the world's governing (every state and town legislating, Congress passing laws) and what a law does to people. You own the player's side; it owns the background and the effects.
- **People** (`session_01S4WSHrjSXRBi1MtqEkbXWF`): drawing council members in the chamber and city-hall settings.
- **Red main** (`session_01S4WSHrrBqcLiZGqutbhhF6`): any red you find on main that is not yours.

## Reporting

A `## Governing` block in `docs/coordination/LEADS-2026-10-24.md` every two hours, newest at top: the furthest step a played life reaches from New Game, with the place and seed, and what the owner can now play. Questions for the owner go to the CTO (`session_01S4WSHrFBAnJLwUcjDV8Vc3`) with the reading line. Grow the skills you use when you learn something (`skills:` PRs; the CTO merges them at once).
