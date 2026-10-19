---
id: world-counted-reads-person-callers-rest
title: "Business, candidacy and fill-in stop calling residentPerson, so core-counted-views-delete can delete the views"
area: world
kind: wiring
priority: 2
size: M
status: claimed
claimed-by: claude/political-game-pool-8defjq
pr:
blocked-on:
after: world-counted-reads-person-callers
source: added with npm run pool -- add
claimed-at: 2026-10-19T18:57:26.003Z
---

**What.** Business (owner and founder reads), candidacy (a counted voter's reasons) and the fill-in check in `state.ts` read a counted person's name, place, birth date, traits, cash and living cost from the columns through `residentFacts` instead of building a person record with `residentPerson`. The play does not change. Only the shared chooser's counted-person source and the fill-in husk keep `residentPerson`.

**Rules.** One model, two tiers: a counted person is read with the same rule as a full person. Replace, never layer: each `residentPerson` call is replaced, not kept beside the new read. Wire to the world: the owner draw, founding and candidacy reasons are unchanged in play.

**Done when.** In the played world (`buildBenchWorld`, a drawn place with its seed named in the PR body), the business, candidacy and fill-in tests pass, and `grep -rn "residentPerson(" src/core2` finds only the chooser's counted-person source in `residents.ts` and the fill-in husk in `state.ts`.

**Files.** src/core2/modules/business.ts, src/core2/modules/candidacy.ts, src/core2/state.ts, src/core2/modules/residents.ts

**Notes.** Stacked on world-counted-reads-person-callers (#5080). core-counted-views-delete still needs the credit household builder (`peopleOf`) and the chooser source moved to columns.
