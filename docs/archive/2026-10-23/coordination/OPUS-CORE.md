# OPUS-CORE builder sessions

> **History.** This describes the old engine or a process that ended in October 2026. Don't follow it; read `AGENTS.md`, `ARCHITECTURE.md` and `docs/README.md`.

The pillar's own status file is `core.md`; this file holds the builder sessions the CTO assigns under OPUS-CORE.

## The world has a past

Branch `core/the-world-has-a-past`, draft PR #4190 to `main`. Owner, Oct 14: "When you generate into a world, the entire history starts on the day you generate." Ruled the same evening in `OWNER-DECISIONS.md` ("The world has a past", "Public figures are known", "The player's own context").

### What the owner can play now

A new world opens with a year behind it. The news has stories from the year before day one, and the player has already heard most of them. Every law carries who passed it, when, by what vote, who sponsored and who signed it. Every officeholder won an election against a named challenger, made campaign promises, and has a voting record that voters weigh at the next election. Everyone knows the president, vice president, governor, senators, member of Congress and mayor without having met them. The player's family has a story: where the parents met and when, how they get along, where the family came from, who works where, and a few moments the player remembers. The words for all of it come from the English engine once the words session adds them; until then the records exist and the dossier lists them raw.

### Checklist

- [x] Laws have histories: enactment date, body, session, vote by chamber, sponsor, signer, amendments, per enactment (`past-laws.ts`).
- [x] Elections happened: the prior election for every elected seat covering the town, with both candidates, votes, the town's voter groups and the winner's promises (`past-elections.ts`).
- [x] Prior-term voting records in the record engine's votes; the voting engine weighs them (measured through the November 2026 election).
- [x] News archive: the year before day one as news stories, heard by the news engine's own delivery rule (`past-news.ts`).
- [x] Public figures known: public tier on the knowledge records plus the campaigns engine's heard-of impression (`past-public.ts`).
- [x] The player's own context: household histories in the deep past, rebuilt the same at fill-in (`past-family.ts`).
- [x] Drift across seeds; build time and heap measured; golden path with no accepted regression.

### Needs from other sessions

- **Press session:** a news-archive story kind (stopgap `SG-CORE-past-archive-kind`; pool item `gov-stopgap-past-news-missing-record`).
- **Words:** renderings for `household:*` past facts, `public:*` knowledge and the `archive:*` story kinds (pool item `words-past-fact-renderings`).
- Done Oct 15: the person card reads `publicKnowledgeOf` for a public figure the viewer has not met (`knownCard`, `publicKnowledge`). Dropped, not needed: a pointer from each law row to its history. `lawHistory(api, lawId)` already resolves it, and the opening-day `effectiveDate` on carried rows is read by the law engine's in-force rule, so it stays.

### Open stopgaps

`SG-CORE-past-undated-law-age`, `SG-CORE-past-named-only`, `SG-CORE-past-archive-kind`, `SG-CORE-past-no-deaths-closures`, `SG-CORE-past-territory-ballots`.

### Sub-agents

One Sonnet Explore agent (read-only) mapped the dossier, news and knowledge readers at the start.

## One model, two tiers

Branch `core/one-model-two-tiers`, draft PR #4172 to `main`. Design: `docs/design/one-model-two-tiers.md`.

### What the owner can play now

A town opens at its real Census size when it is smaller than 10,000 people: Cade, Louisiana opens with its 1,710. A law reaches the town's people by the hundreds: a state income tax act in Cade reaches 757 working adults, 713 of them counted, and their withholding follows it. People leave a state that raises its taxes; Louisiana ends that year 13,431 people smaller than without the act. Someone the player meets is built from their group and the employer's books, and returns to the counts after 180 days out of the player's life. A small town's year runs in 42 to 75 seconds instead of 130 to 190.

### Checklist

- [x] Counted groups (place, district, household kind, income band, housing, age band, work) replace per-person counted records; members are packed columns (`counted-groups.ts`).
- [x] Same reads, scaled: withholding from the law in force, rent and mortgage from each group's account with arrears, retirement at the Social Security level in force (`counted-money.ts`, `residents.ts`).
- [x] `reachOf`: people and dollars a rule touches, both tiers, by group (`counted-reach.ts`), read by law reach.
- [x] Districts: households placed into the state House districts the town splits into.
- [x] Moves from causes: every group weighs every state monthly; other states at a coarse grain by age (`modules/counted-moves.ts`); regional population follows.
- [x] Fill-in from the group and the employer's books; demotion after a long while out of the player's life (`modules/counted-demotion.ts`).
- [x] A town opens at its Census size below 10,000; relatives of a town with no county record live elsewhere in the state.
- [x] Proof year (Cade, Louisiana, seed `549bdf97…`), speed and heap before and after, golden path green.

### Needs from other sessions

- Done Oct 15: a state act enacted in play now stands against a rate the data scheduled for a later date; only a later enactment replaces it (`laws-in-force.ts`, `src/core2/law-enacted-over-scheduled.test.ts`). The Dennisville county treasurer race (seed `den-check`) draws no out-of-state filer; the sample id is gone.
- **Hook confirmations:** the `budgets.ts`, `budgets-treasury.ts`, `housing.ts`, `regional.ts`, `world-transfer.ts` and `births-counted.ts` hooks are tracked as pool item `core-confirm-counted-hooks`; counted workers' quits and hires reading the groups (business audit defects 2, 4, 7, 8) stay with the world line.
- **CTO:** carry the four owner questions in the PR body into `OWNER-DECISIONS.md`; rule on keeping packed counted rows against the MEMORY-FLAT regenerate-from-seed ruling.

### Open stopgaps

`SG-CORE-counted-person-views`, `SG-CORE-counted-unkeyed-money`, `SG-CORE-district-placement`, `SG-CORE-filled-unplaced-income`, and the owner decisions `SG-CORE-owner-decision-town-size`, `-town-districts`, `-fill-in-outside-kin`, `-demotion-days`.

### Next

(7) A kept approval measure per official, read from the groups like any view; (10) records indexed by person across both tiers; re-amounting the opening's retirement awards to full people (`SG-GOV-opening-award-level`).

### Sub-agents

One Haiku Explore agent (read-only) searched for place-level age tables. No sub-agent wrote code.
