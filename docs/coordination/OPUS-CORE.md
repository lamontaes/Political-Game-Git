# OPUS-CORE builder sessions

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

- **Press session:** a news-archive story kind (stopgap `SG-CORE-past-archive-kind`).
- **OPUS-GOV:** a pointer from each law row to `law-history:<row id>`, and dropping the opening-day `effectiveDate` on carried and policy-answer rows now that the history holds the enactment (`laws.ts`).
- **OPUS-PEOPLE (words):** renderings for `household:*` past facts, `public:*` knowledge and the `archive:*` story kinds.
- **OPUS-PLAY:** the dossier reading `publicKnowledgeOf` for a public figure the viewer has not met.

### Open stopgaps

`SG-CORE-past-undated-law-age`, `SG-CORE-past-named-only`, `SG-CORE-past-archive-kind`, `SG-CORE-past-no-deaths-closures`, `SG-CORE-past-territory-ballots`.

### Sub-agents

One Sonnet Explore agent (read-only) mapped the dossier, news and knowledge readers at the start.
