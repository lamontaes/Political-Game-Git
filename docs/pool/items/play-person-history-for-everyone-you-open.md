---
id: play-person-history-for-everyone-you-open
title: "Every person you open has a history: View person tells the past the engines ran for them, not only for family"
area: play
lead: play-first
kind: bug
priority: 1
size: M
status: claimed
claimed-by: play-first/play-person-history-for-everyone-you-open
pr:
after:
blocked-on:
milestone: play-first
source: owner, Oct 29 playtest of v0.64.0 (to the CTO)
claimed-at: 2026-10-29T17:10:15.130Z
---

**What.** The owner opened profiles in v0.64.0 and said: "nobody has any record. I still don't see anybody's history being simulated when you open their profiles." The card's History section (from `screens-person-history`, merged Oct 28) shows only to family, a housemate or someone with a tie, and reads facts drawn once at the start (birth, school stages, a partner, a tenure summary) rather than the years the engines ran before the start (the one history from the player's birth year, ruled Oct 28). So an official, a neighbor or a coworker shows no past at all, and family shows a thin one. A person the player opens is filled in at that moment (two-level population), so from then on they must carry a past from the same history every engine reads: where they lived and moved, schooling, jobs held, partners and children, offices held and elections run, deaths in the family. The card tells it oldest first in words from the bank.

**Time box.** 4 hours, Sonnet; if the engine side runs long, split into `-a` (the card reads the pre-start history for every filled-in person) and `-b` (fill-in writes the coarse past for a counted person who had none).

**You will see.** Click anyone, an official, a neighbor or a coworker, and their card tells their life: where they lived, school, jobs, family, offices.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Rules.** The simulation is the one layer: the card reads the one history (`preStartHistory`, the durable log) and never makes up a line. Two-level population: a person is filled in when the player opens them and the filled-in past must match the records already kept (a business's books, an office's holders). No hand-written player text in code: lines come from `data/english/parts/person-history.json`, Review: words. Ask why: every line names its record id.

**Done when.** In the played world (`buildBenchWorld`) of a drawn place (place and seed named), `card-history.test.ts` opens three people with no tie to the player (an official, a neighbor, a coworker or classmate) and finds at least four dated history lines each, every one on a record id from the pre-start history or the durable log; screenshots of two of those cards at 1440×900 land in `docs/play-first/shots`. The owner plays it: he clicks anyone and reads their life.

**Files.** src/bench/card.ts, src/core2/pre-start.ts, src/core2/state.ts, data/english/parts/person-history.json, src/bench/card-history.test.ts

**Notes.** Filed by the CTO, Oct 29. Prior: OWNER-DECISIONS Oct 28 00:15 ("Click a person to View person, and that is where their history shows... it doesn't have any history"), Oct 28 14:50 (history from the birth year), Oct 27 ("history is simulated before the start date, no hotfix"); engine map lines 7, 8 and 13. Read: OWNER-DECISIONS (Oct 29), LAW; searched: person history, profile, view person, pre-start.
