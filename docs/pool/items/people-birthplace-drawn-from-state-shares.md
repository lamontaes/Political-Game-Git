---
id: people-birthplace-drawn-from-state-shares
title: "Everyone in town is recorded as born there: draw each person's birthplace from their state's shares"
area: people
kind: bug
priority: 2
size: M
status: in-pr
standard: 2
root: none
claimed-by: civic-roles-builder
pr: 9538
after:
blocked-on:
lead: lives
source: "Civic roles builder, Nov 14 to 15, stopgap cluster 29 part 3 (SG-HIST-birthplace-is-home)"
model: opus
effort: medium
---

**What.** Every person the opening makes is recorded as born in the town they live in now, so a played town has nobody from another state or abroad except the few the moves pass brings because a parent lives elsewhere: 0 of 476 residents in Portsmouth NH, Selma NC and Woodlawn KY (seeds lrborn01 to 03) were born elsewhere by the record. In the 2019 to 2023 American Community Survey (table B05002) about 58% of Americans live in the state they were born in, from about 27% in Nevada to 77% in Louisiana. Seen: a person's card and life record say where they were born; in Edgar, Wisconsin (5522550), seed edgar-petition-1, every resident's says Edgar or a Wisconsin town.

**Cause.** Found in code: `src/core2/opening-people.ts` gives every person the birthplace fact `input.birthplaceJurisdictionId ?? input.homeJurisdictionId`, and no caller passes a birthplace (SG-HIST-birthplace-is-home). A resident the opening's families do not reach, and a person made to hold a role, gets `person:birth` naming where they live when opened (`bornWhere`, src/core2/modules/people.ts, SG-PEOPLE-role-people-have-no-past).

**Fix.** One birthplace record per person, drawn once as seeded generation of who exists (src/core2/person-birthplace.ts): their state's B05002 shares (born in the state, another state, Puerto Rico, the island areas, abroad to American parents, foreign-born), held to their citizenship (a noncitizen was born abroad). Born in the state: where their family of origin lived (opening-kin.ts). A child: where their parent lived that day, after the moves pass. Anyone else (no family record): drawn before the moves pass, so one born outside is brought from there. Every reader (the card, the life record, the moves pass) reads that one record through `bornIn`. The conversation's answer about home is left on its own read, because no player can reach it (item words-where-are-you-from-reads-where-they-live). Delete SG-HIST-birthplace-is-home and the opening's default.

**Time box.** 3 hours, Opus.

**Rules.** One rule, all 56 places: the shares are a per-state table keyed by postal code. Estimate, never UNKNOWN: the record is ESTIMATED with the B05002 source. No dice: the draw says who exists, never what anyone does.

**Done when.** In a pinned played town, every grown resident has one birthplace record, the share born in their state is within three binomial spreads of the survey's, and each resident born in another state is brought by a move that names that record and told on their card as born in a town of that state, never their own. A second session, on main in a drawn place it names with its seed, opens the cards of several residents and sees some born in another state or abroad.

**Waits on.** Nothing.

**Files.** src/core2/person-birthplace.ts (new), src/core2/opening-kin.ts, src/core2/population.ts, src/core2/opening-people.ts, src/core2/past-moves.ts, src/core2/modules/people.ts, src/bench/card.ts, src/core2/data/stopgaps/hist.json, src/core2/data/life/remembered.json

**Notes.** Filed by hand by the civic roles builder, Nov 15. A birth abroad has no place record to name, so the card says the year only ("Born in {year}."), an existing line; a line naming a birth abroad is for the Words lead to ask for if wanted.
